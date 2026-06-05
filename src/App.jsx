import { useState, useEffect } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const LEVELS = [
  { name: "Beginner",   min: 0,     max: 999,      color: "#94a3b8" },
  { name: "Consistent", min: 1000,  max: 2999,     color: "#34d399" },
  { name: "Disciplined",min: 3000,  max: 5999,     color: "#60a5fa" },
  { name: "Warrior",    min: 6000,  max: 9999,     color: "#f59e0b" },
  { name: "Elite",      min: 10000, max: 14999,    color: "#f97316" },
  { name: "Prestige",   min: 15000, max: Infinity, color: "#a855f7" },
];
const LEVEL_ICONS = { Beginner:"🥉", Consistent:"🥈", Disciplined:"🥇", Warrior:"⚔️", Elite:"🔥", Prestige:"👑" };

function getLevel(xp) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[LEVELS.length - 1];
}
function getLevelProgress(xp) {
  const l = getLevel(xp);
  const range = l.max === Infinity ? 5000 : l.max - l.min + 1;
  return Math.min(((xp - l.min) / range) * 100, 100);
}
function pad(n) { return String(n).padStart(2, "0"); }
function dateStr(y, m, d) { return `${y}-${pad(m+1)}-${pad(d)}`; }
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

const today = new Date();
const todayStr = today.toISOString().split("T")[0];

// ── localStorage helpers ──────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const v = localStorage.getItem("fq_" + key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem("fq_" + key, JSON.stringify(value)); } catch {}
}

// ── food database ─────────────────────────────────────────────────────────────
const FOOD_DB = [
  { name: "Chicken Breast (100g)", cal: 165, p: 31, c: 0,  f: 3.6 },
  { name: "Brown Rice (100g)",     cal: 216, p: 4.5,c: 45, f: 1.8 },
  { name: "Banana",                cal: 89,  p: 1.1,c: 23, f: 0.3 },
  { name: "Protein Shake",         cal: 180, p: 30, c: 8,  f: 3   },
  { name: "Eggs (2 large)",        cal: 156, p: 12, c: 1.2,f: 11  },
  { name: "Oatmeal (1 cup)",       cal: 154, p: 6,  c: 27, f: 3   },
  { name: "Pizza (1 slice)",       cal: 285, p: 12, c: 36, f: 10  },
  { name: "Apple",                 cal: 95,  p: 0.5,c: 25, f: 0.3 },
  { name: "Greek Yogurt (170g)",   cal: 100, p: 17, c: 6,  f: 0.7 },
  { name: "Almonds (30g)",         cal: 174, p: 6,  c: 6,  f: 15  },
  { name: "Sweet Potato (100g)",   cal: 86,  p: 1.6,c: 20, f: 0.1 },
  { name: "Salmon (100g)",         cal: 208, p: 20, c: 0,  f: 13  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function FitQuest() {
  // persisted state
  const [calTarget, setCalTarget] = useState(() => load("calTarget", 2000));
  const [xp,        setXp]        = useState(() => load("xp", 0));
  const [shields,   setShields]   = useState(() => load("shields", 0));
  const [restDays,  setRestDays]  = useState(() => load("restDays", 0));
  const [days,      setDays]      = useState(() => load("days", {}));
  const [weightGoal,setWeightGoal]= useState(() => load("weightGoal", 80));

  // session-only state
  const [screen,       setScreen]       = useState("dashboard");
  const [calYear,      setCalYear]      = useState(today.getFullYear());
  const [calMonth,     setCalMonth]     = useState(today.getMonth());
  const [selectedDay,  setSelectedDay]  = useState(null);
  const [foods,        setFoods]        = useState(() => load("todayFoods_" + todayStr, []));
  const [quickAdd,     setQuickAdd]     = useState({ name: "", cal: "" });
  const [gymDone,      setGymDone]      = useState(() => load("gymDone_" + todayStr, false));
  const [weightInput,  setWeightInput]  = useState("");
  const [showCheckin,  setShowCheckin]  = useState(false);
  const [checkinDone,  setCheckinDone]  = useState(() => !!load("days", {})[todayStr]?.confirmed);
  const [settingsCal,  setSettingsCal]  = useState(() => load("calTarget", 2000));
  const [newWeightVal, setNewWeightVal] = useState("");
  const [newWeightDate,setNewWeightDate]= useState(todayStr);
  const [showFoodDB,   setShowFoodDB]   = useState(false);

  // ── persist on change ────────────────────────────────────────────────────
  useEffect(() => save("calTarget", calTarget), [calTarget]);
  useEffect(() => save("xp",        xp),        [xp]);
  useEffect(() => save("shields",   shields),   [shields]);
  useEffect(() => save("restDays",  restDays),  [restDays]);
  useEffect(() => save("days",      days),      [days]);
  useEffect(() => save("weightGoal",weightGoal),[weightGoal]);
  useEffect(() => save("todayFoods_" + todayStr, foods), [foods]);
  useEffect(() => save("gymDone_"   + todayStr, gymDone),[gymDone]);

  // ── derived ──────────────────────────────────────────────────────────────
  const todayCalories = foods.reduce((s, f) => s + f.cal, 0);
  const calLeft       = calTarget - todayCalories;
  const level         = getLevel(xp);
  const levelProg     = getLevelProgress(xp);

  function getDayStatus(key) {
    const day = days[key];
    if (!day || !day.confirmed) return "none";
    if (day.restDay) return day.calories < calTarget ? "rest" : "fail";
    if (day.gym && day.calories < calTarget * 0.9) return "perfect";
    if (day.gym && day.calories < calTarget)        return "success";
    return "fail";
  }
  function getDayColor(status) {
    return { success:"#22c55e", perfect:"#f59e0b", fail:"#ef4444", rest:"#3b82f6" }[status] || "transparent";
  }

  function computeStreak() {
    let streak = 0;
    const d = new Date(today);
    if (!days[todayStr]?.confirmed) d.setDate(d.getDate() - 1);
    while (true) {
      const key = d.toISOString().split("T")[0];
      const day = days[key];
      if (!day || !day.confirmed) break;
      const ok = day.restDay
        ? day.calories < calTarget
        : (day.gym && day.calories < calTarget);
      if (!ok) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  const streak = computeStreak();

  // ── actions ──────────────────────────────────────────────────────────────
  function handleCheckin() {
    const success = gymDone && todayCalories < calTarget;
    const newDay  = { gym: gymDone, calories: todayCalories, confirmed: true,
                      foods: [...foods], restDay: false, notes: "",
                      weight: weightInput ? parseFloat(weightInput) : null };
    setDays(prev => ({ ...prev, [todayStr]: newDay }));

    if (success) {
      setXp(x => x + 100);
      // award shield every 14 successful days
      const successCount = Object.values({ ...days, [todayStr]: newDay })
        .filter((_, i, arr) => {
          const k = Object.keys({ ...days, [todayStr]: newDay })[i];
          const s = getDayStatus(k);
          return s === "success" || s === "perfect";
        }).length;
      if (successCount % 14 === 0) setShields(s => Math.min(s + 1, 3));
      // award rest day every 5 consecutive gym days
      if (streak > 0 && (streak + 1) % 5 === 0) setRestDays(r => r + 1);
    } else if (!success && shields > 0) {
      setShields(s => s - 1);
    }
    setCheckinDone(true);
    setShowCheckin(false);
  }

  function addFoodFromDB(food) { setFoods(f => [...f, food]); setShowFoodDB(false); }
  function addQuickFood() {
    if (!quickAdd.name || !quickAdd.cal) return;
    setFoods(f => [...f, { name: quickAdd.name, cal: parseInt(quickAdd.cal), p:0, c:0, f:0 }]);
    setQuickAdd({ name: "", cal: "" });
  }
  function removeFood(i) { setFoods(f => f.filter((_, idx) => idx !== i)); }

  function addWeight() {
    if (!newWeightVal || !newWeightDate) return;
    const w = parseFloat(newWeightVal);
    setDays(prev => ({
      ...prev,
      [newWeightDate]: { ...(prev[newWeightDate] || { gym:false, calories:0, confirmed:false, foods:[], restDay:false, notes:"" }), weight: w }
    }));
    setNewWeightVal("");
  }

  const weightHistory = Object.entries(days)
    .filter(([, d]) => d.weight)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, weight: d.weight }));

  // ── nav ──────────────────────────────────────────────────────────────────
  const navItems = [
    { id:"dashboard", icon:"⚔️",  label:"Quest"    },
    { id:"calendar",  icon:"📅",  label:"Calendar" },
    { id:"food",      icon:"🍖",  label:"Food"     },
    { id:"weight",    icon:"⚖️",  label:"Weight"   },
    { id:"analytics", icon:"📊",  label:"Stats"    },
    { id:"settings",  icon:"⚙️",  label:"Settings" },
  ];

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#0a0a0f", minHeight:"100vh", color:"#e2e8f0",
                  fontFamily:"'Georgia',serif", display:"flex", flexDirection:"column",
                  maxWidth:480, margin:"0 auto", position:"relative" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ padding:"16px 16px 8px", borderBottom:"1px solid rgba(255,255,255,0.06)",
                    background:"#0a0a0f", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, fontWeight:900,
                          color:"#f59e0b", letterSpacing:2 }}>⚔ FITQUEST</div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12,
                          color:"#64748b", fontStyle:"italic" }}>Your Daily Quest Awaits</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:level.color,
                            fontWeight:600, letterSpacing:1 }}>{level.name.toUpperCase()}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#f59e0b" }}>
                {xp.toLocaleString()} XP
              </div>
            </div>
            <div style={{ width:40, height:40, borderRadius:"50%",
                          background:`radial-gradient(circle,${level.color}33,transparent)`,
                          border:`2px solid ${level.color}`, display:"flex",
                          alignItems:"center", justifyContent:"center", fontSize:18 }}>
              {LEVEL_ICONS[level.name]}
            </div>
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop:8 }}>
          <div className="progress-fill"
               style={{ width:`${levelProg}%`,
                        background:`linear-gradient(90deg,${level.color}88,${level.color})` }} />
        </div>
      </div>

      {/* Screen */}
      <div className="screen">
        {screen === "dashboard" && <Dashboard />}
        {screen === "calendar"  && <CalendarScreen />}
        {screen === "food"      && <FoodScreen />}
        {screen === "weight"    && <WeightScreen />}
        {screen === "analytics" && <AnalyticsScreen />}
        {screen === "settings"  && <SettingsScreen />}
      </div>

      {/* Bottom nav */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
                    width:"100%", maxWidth:480, background:"rgba(10,10,15,0.97)",
                    borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex",
                    justifyContent:"space-around", padding:"8px 4px 12px", zIndex:20 }}>
        {navItems.map(item => (
          <button key={item.id} className={`nav-btn ${screen===item.id?"active":""}`}
                  onClick={() => setScreen(item.id)}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ fontFamily:"'Cinzel',serif", fontSize:9, letterSpacing:0.5,
                           color: screen===item.id ? "#f59e0b" : "#475569" }}>{item.label}</span>
          </button>
        ))}
      </div>

      {showCheckin  && <CheckinModal />}
      {selectedDay  && <DayDetail />}
      {showFoodDB   && <FoodDBModal />}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════════════════════════════

  function Dashboard() {
    const calPct = Math.min((todayCalories / calTarget) * 100, 100);
    return (
      <div>
        {/* Streak card */}
        <div className="card" style={{ background:"linear-gradient(135deg,rgba(245,158,11,0.08),rgba(239,68,68,0.05))",
                                       border:"1px solid rgba(245,158,11,0.2)", textAlign:"center", padding:"24px 16px" }}>
          <div className="streak-fire">{streak > 0 ? "🔥" : "💀"}</div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:52, fontWeight:900,
                        color: streak>0 ? "#f59e0b" : "#ef4444", lineHeight:1, marginTop:4 }}>{streak}</div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:3,
                        color:"#94a3b8", marginTop:2 }}>DAY STREAK</div>
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:12 }}>
            {[0,1,2].map(i => (
              <span key={i} className="shield" style={{ opacity: i<shields ? 1 : 0.2 }}>🛡️</span>
            ))}
            <span style={{ fontFamily:"'Crimson Text',serif", fontSize:13,
                           color:"#64748b", alignSelf:"center" }}>shields</span>
          </div>
          {restDays > 0 && (
            <div style={{ marginTop:8, fontFamily:"'Crimson Text',serif", fontSize:13, color:"#3b82f6" }}>
              🔵 {restDays} Rest Day{restDays>1?"s":""} available
            </div>
          )}
        </div>

        {/* Calories */}
        <div className="card">
          <div className="section-title">Today's Calories</div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8 }}>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:28,
                            color: calLeft>=0 ? "#22c55e" : "#ef4444" }}>{todayCalories}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b" }}>consumed</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:20,
                            color: calLeft>=0 ? "#f59e0b" : "#ef4444" }}>{Math.abs(calLeft)}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b" }}>
                {calLeft>=0 ? "remaining" : "over target"}
              </div>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill"
                 style={{ width:`${calPct}%`,
                          background: calLeft>=0
                            ? "linear-gradient(90deg,#22c55e88,#22c55e)"
                            : "linear-gradient(90deg,#ef444488,#ef4444)" }} />
          </div>
          <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12,
                        color:"#475569", marginTop:6, textAlign:"center" }}>Target: {calTarget} cal/day</div>
        </div>

        {/* Gym toggle */}
        <div className="card" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div className="section-title" style={{ marginBottom:2 }}>Gym</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:16,
                          color: gymDone ? "#22c55e" : "#ef4444" }}>
              {gymDone ? "✓ Completed" : "✗ Not Done"}
            </div>
          </div>
          <button className={`toggle ${gymDone?"on":"off"}`} onClick={() => setGymDone(g => !g)} />
        </div>

        {/* CTA */}
        {!checkinDone ? (
          <button className="btn btn-gold" onClick={() => setShowCheckin(true)}
                  style={{ width:"100%", padding:"14px", fontSize:15 }}>
            ⚔️ Complete Today's Quest
          </button>
        ) : (
          <div className="card" style={{ textAlign:"center", border:"1px solid rgba(34,197,94,0.3)",
                                         background:"rgba(34,197,94,0.05)" }}>
            <div style={{ fontSize:28 }}>✅</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"#22c55e", marginTop:4 }}>Quest Complete!</div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b", marginTop:2 }}>
              {gymDone && todayCalories < calTarget ? "+100 XP earned" : "Day logged"}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
          {[
            { icon:"⚔️", val: xp.toLocaleString(), label:"Total XP",     color:"#f59e0b" },
            { icon:"🛡️", val: `${shields}/3`,        label:"Shields",     color:"#60a5fa" },
            { icon:"🔵", val: restDays,              label:"Rest Days",   color:"#3b82f6" },
          ].map(({ icon, val, label, color }) => (
            <div key={label} className="stat-box">
              <div style={{ fontSize:20 }}>{icon}</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color }}>{val}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#64748b" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function CalendarScreen() {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const monthNames  = ["January","February","March","April","May","June",
                         "July","August","September","October","November","December"];
    function prevMonth() { if (calMonth===0){setCalMonth(11);setCalYear(calYear-1);}else setCalMonth(calMonth-1); }
    function nextMonth() { if (calMonth===11){setCalMonth(0);setCalYear(calYear+1);}else setCalMonth(calMonth+1); }

    return (
      <div>
        <div className="card" style={{ background:"rgba(255,255,255,0.02)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <button className="btn btn-ghost" style={{ padding:"6px 12px" }} onClick={prevMonth}>◀</button>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, letterSpacing:2 }}>
              {monthNames[calMonth]} {calYear}
            </div>
            <button className="btn btn-ghost" style={{ padding:"6px 12px" }} onClick={nextMonth}>▶</button>
          </div>
          <div className="cal-grid" style={{ marginBottom:6 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} style={{ textAlign:"center", fontFamily:"'Cinzel',serif",
                                   fontSize:9, color:"#475569", letterSpacing:1 }}>{d}</div>
            ))}
          </div>
          <div className="cal-grid">
            {Array.from({ length: firstDay }).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_,i) => {
              const day    = i + 1;
              const key    = dateStr(calYear, calMonth, day);
              const status = getDayStatus(key);
              const isToday  = key === todayStr;
              const isFuture = key > todayStr;
              const dot = getDayColor(status);
              return (
                <div key={day}
                     className={`cal-day ${isToday?"today":""}`}
                     style={{ background: status==="none"
                                ? (isFuture?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.04)")
                                : dot + "22",
                              color: isFuture ? "#2d3748" : "#94a3b8" }}
                     onClick={() => !isFuture && setSelectedDay(key)}>
                  {status !== "none" && (
                    <div style={{ position:"absolute", inset:2, borderRadius:4,
                                  background: dot+"18" }} />
                  )}
                  <span style={{ position:"relative", zIndex:1 }}>{day}</span>
                  {status !== "none" && (
                    <div style={{ position:"absolute", bottom:2, left:"50%",
                                  transform:"translateX(-50%)", width:4, height:4,
                                  borderRadius:"50%", background: dot }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:16, justifyContent:"center" }}>
            {[["#22c55e","Success"],["#f59e0b","Perfect"],["#ef4444","Failed"],["#3b82f6","Rest"]].map(([c,l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:c }} />
                <span style={{ fontFamily:"'Crimson Text',serif", fontSize:12, color:"#64748b" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function FoodScreen() {
    return (
      <div>
        <div className="card" style={{ background:"linear-gradient(135deg,rgba(34,197,94,0.06),rgba(16,185,129,0.03))",
                                       border:"1px solid rgba(34,197,94,0.15)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:32,
                            color: calLeft>=0 ? "#22c55e" : "#ef4444" }}>{todayCalories}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b" }}>calories today</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, color:"#f59e0b" }}>{calTarget}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b" }}>daily target</div>
            </div>
          </div>
          <div className="progress-bar" style={{ marginTop:10 }}>
            <div className="progress-fill"
                 style={{ width:`${Math.min((todayCalories/calTarget)*100,100)}%`,
                          background: calLeft>=0
                            ? "linear-gradient(90deg,#22c55e88,#22c55e)"
                            : "linear-gradient(90deg,#ef444488,#ef4444)" }} />
          </div>
        </div>

        <div className="card">
          <div className="section-title">Quick Add</div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input className="input" placeholder="Food name" value={quickAdd.name}
                   onChange={e => setQuickAdd(q => ({ ...q, name:e.target.value }))} style={{ flex:2 }} />
            <input className="input" placeholder="Cal" type="number" value={quickAdd.cal}
                   onChange={e => setQuickAdd(q => ({ ...q, cal:e.target.value }))} style={{ flex:1 }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-gold"  onClick={addQuickFood}       style={{ flex:1 }}>+ Add</button>
            <button className="btn btn-ghost" onClick={() => setShowFoodDB(true)} style={{ flex:1 }}>📖 Database</button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Today's Log</div>
          {foods.length === 0 && (
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:14, color:"#475569",
                          textAlign:"center", padding:"16px 0", fontStyle:"italic" }}>
              No food logged yet
            </div>
          )}
          {foods.map((f, i) => (
            <div key={i} className="food-row">
              <div>
                <div style={{ fontFamily:"'Crimson Text',serif", fontSize:15 }}>{f.name}</div>
                {(f.p>0||f.c>0) && (
                  <div style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#475569" }}>
                    P:{f.p}g · C:{f.c}g · F:{f.f}g
                  </div>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"#f59e0b" }}>{f.cal}</span>
                <button onClick={() => removeFood(i)}
                        style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
            </div>
          ))}
          {foods.length > 0 && (
            <div style={{ display:"flex", justifyContent:"flex-end", paddingTop:10,
                          borderTop:"1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:"#f59e0b" }}>
                Total: {todayCalories} cal
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  function WeightScreen() {
    const lastWeight  = weightHistory.length > 0 ? weightHistory[weightHistory.length-1].weight : null;
    const firstWeight = weightHistory.length > 0 ? weightHistory[0].weight : null;
    const change      = lastWeight && firstWeight ? (lastWeight - firstWeight).toFixed(1) : null;
    const toGoal      = lastWeight ? (lastWeight - weightGoal).toFixed(1) : null;
    const maxW = weightHistory.length > 0 ? Math.max(...weightHistory.map(w => w.weight)) : 100;
    const minW = weightHistory.length > 0 ? Math.min(...weightHistory.map(w => w.weight)) : 0;
    const range = maxW - minW || 1;

    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          <div className="stat-box">
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, color:"#e2e8f0" }}>
              {lastWeight || "—"}
            </div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#64748b" }}>Current (kg)</div>
          </div>
          <div className="stat-box">
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, color:"#f59e0b" }}>{weightGoal}</div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#64748b" }}>Goal (kg)</div>
          </div>
          <div className="stat-box">
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:20,
                          color: toGoal<=0 ? "#22c55e" : "#f59e0b" }}>
              {toGoal !== null ? (toGoal>0?`-${toGoal}`:"✓") : "—"}
            </div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#64748b" }}>To Goal (kg)</div>
          </div>
        </div>

        {weightHistory.length > 1 && (
          <div className="card">
            <div className="section-title">Weight History</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:110, padding:"0 4px" }}>
              {weightHistory.slice(-14).map((w, i) => {
                const h = ((w.weight - minW) / range) * 70 + 10;
                const atGoal = w.weight <= weightGoal;
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <div style={{ fontFamily:"'Crimson Text',serif", fontSize:8, color:"#475569" }}>{w.weight}</div>
                    <div style={{ width:"100%", height:h, borderRadius:"3px 3px 0 0",
                                  background: atGoal
                                    ? "linear-gradient(to top,#22c55e88,#22c55e44)"
                                    : "linear-gradient(to top,#f59e0b88,#f59e0b44)",
                                  border:`1px solid ${atGoal?"#22c55e":"#f59e0b"}44` }} />
                    <div style={{ fontFamily:"'Crimson Text',serif", fontSize:7, color:"#374151" }}>
                      {w.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:8 }}>
              {[["#22c55e","At/below goal"],["#f59e0b","Above goal"]].map(([c,l]) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:8, height:8, background:c, borderRadius:2 }} />
                  <span style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#64748b" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="section-title">Log Weight</div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <input className="input" type="number" step="0.1" placeholder="Weight (kg)"
                   value={newWeightVal} onChange={e => setNewWeightVal(e.target.value)} style={{ flex:1 }} />
            <input className="input" type="date" value={newWeightDate}
                   onChange={e => setNewWeightDate(e.target.value)} style={{ flex:1 }} />
          </div>
          <button className="btn btn-gold" onClick={addWeight} style={{ width:"100%" }}>+ Log Weight</button>
        </div>

        {weightHistory.length > 0 && (
          <div className="card">
            <div className="section-title">Recent Entries</div>
            {[...weightHistory].reverse().slice(0,10).map((w,i) => (
              <div key={i} className="food-row">
                <span style={{ fontFamily:"'Crimson Text',serif", fontSize:14, color:"#94a3b8" }}>{w.date}</span>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:15,
                               color: w.weight<=weightGoal ? "#22c55e" : "#f59e0b" }}>
                  {w.weight} kg
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function AnalyticsScreen() {
    const confirmed   = Object.entries(days).filter(([,d]) => d.confirmed);
    const successDays = confirmed.filter(([k]) => ["success","perfect","rest"].includes(getDayStatus(k)));
    const gymCount    = confirmed.filter(([,d]) => d.gym).length;
    const rate        = confirmed.length > 0 ? Math.round((successDays.length/confirmed.length)*100) : 0;
    const avgCal      = confirmed.length > 0
      ? Math.round(confirmed.reduce((s,[,d]) => s+(d.calories||0), 0) / confirmed.length) : 0;

    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
          {[
            { label:"Success Rate",  val:`${rate}%`,           color:"#22c55e", icon:"📈" },
            { label:"Streak",        val:streak,               color:"#f59e0b", icon:"🔥" },
            { label:"Total Days",    val:confirmed.length,     color:"#60a5fa", icon:"📅" },
            { label:"Workouts",      val:gymCount,             color:"#a855f7", icon:"💪" },
          ].map(({ label, val, color, icon }) => (
            <div key={label} className="stat-box">
              <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:24, color, fontWeight:700 }}>{val}</div>
              <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12, color:"#64748b" }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title">Nutrition</div>
          {[
            ["Avg Daily Calories", avgCal,              "#f59e0b"],
            ["Daily Target",       calTarget,           "#60a5fa"],
            ["Avg Deficit",        Math.max(0,calTarget-avgCal), "#22c55e"],
          ].map(([l,v,c],i,arr) => (
            <div key={l} className="food-row" style={{ border: i===arr.length-1?"none":undefined }}>
              <span style={{ fontFamily:"'Crimson Text',serif", fontSize:14 }}>{l}</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:c }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-title">Achievements</div>
          {[
            { icon:"⚔️", name:"First Quest",    desc:"Complete your first day",    done: confirmed.length >= 1 },
            { icon:"🔥", name:"On Fire",         desc:"7-day streak",               done: streak >= 7 },
            { icon:"💯", name:"30-Day Warrior",  desc:"30-day streak",              done: streak >= 30 },
            { icon:"💪", name:"Gym Rat",         desc:"50 workouts",                done: gymCount >= 50 },
            { icon:"🌟", name:"Centurion",       desc:"100 successful days",        done: successDays.length >= 100 },
            { icon:"🛡️", name:"Shield Bearer",  desc:"Earn a streak shield",       done: shields > 0 || confirmed.length >= 14 },
          ].map(({ icon, name, desc, done }) => (
            <div key={name} className="food-row" style={{ opacity: done ? 1 : 0.35 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <span style={{ fontSize:22, filter: done?"none":"grayscale(1)" }}>{icon}</span>
                <div>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:13,
                                color: done?"#f59e0b":"#64748b" }}>{name}</div>
                  <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12, color:"#475569" }}>{desc}</div>
                </div>
              </div>
              {done && <span style={{ color:"#22c55e", fontSize:16 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function SettingsScreen() {
    return (
      <div>
        <div className="card">
          <div className="section-title">Daily Calorie Target</div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input className="input" type="number" value={settingsCal}
                   onChange={e => setSettingsCal(parseInt(e.target.value))} style={{ flex:1 }} />
            <button className="btn btn-gold" onClick={() => setCalTarget(settingsCal)}>Save</button>
          </div>
          <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12, color:"#475569", marginTop:6 }}>
            Current: {calTarget} cal/day
          </div>
        </div>

        <div className="card">
          <div className="section-title">Weight Goal</div>
          <input className="input" type="number" step="0.5" placeholder="Target weight (kg)"
                 value={weightGoal} onChange={e => setWeightGoal(parseFloat(e.target.value))} />
        </div>

        <div className="card">
          <div className="section-title">Progress</div>
          {[
            ["Total XP",       xp.toLocaleString(),  level.color],
            ["Level",          level.name,           level.color],
            ["Streak Shields", `${shields}/3`,       "#60a5fa"],
            ["Rest Days",      restDays,             "#3b82f6"],
          ].map(([l,v,c],i,arr) => (
            <div key={l} className="food-row" style={{ border: i===arr.length-1?"none":undefined }}>
              <span style={{ fontFamily:"'Crimson Text',serif", fontSize:14 }}>{l}</span>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:c }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="card" style={{ border:"1px solid rgba(239,68,68,0.2)" }}>
          <div className="section-title" style={{ color:"#ef4444" }}>Danger Zone</div>
          <button className="btn btn-red" style={{ width:"100%" }}
                  onClick={() => { if(window.confirm("Reset ALL data? This cannot be undone.")) {
                    localStorage.clear(); window.location.reload();
                  }}}>
            🗑️ Reset All Data
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODALS
  // ══════════════════════════════════════════════════════════════════════════

  function CheckinModal() {
    return (
      <div className="modal-overlay" onClick={() => setShowCheckin(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, color:"#f59e0b",
                        marginBottom:4, letterSpacing:1 }}>⚔️ Quest Log</div>
          <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b",
                        marginBottom:20, fontStyle:"italic" }}>Confirm today's progress</div>

          <div style={{ marginBottom:16 }}>
            <div className="section-title">Calories</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:28,
                          color: calLeft>=0 ? "#22c55e" : "#ef4444" }}>
              {todayCalories} / {calTarget}
            </div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:13, color:"#64748b" }}>
              {calLeft>=0 ? `${calLeft} remaining ✓` : `${Math.abs(calLeft)} over ✗`}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <div className="section-title">Gym</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontFamily:"'Crimson Text',serif", fontSize:15,
                             color: gymDone ? "#22c55e" : "#ef4444" }}>
                {gymDone ? "✓ Completed" : "✗ Not Done"}
              </span>
              <button className={`toggle ${gymDone?"on":"off"}`} onClick={() => setGymDone(g => !g)} />
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <div className="section-title">Weight (optional)</div>
            <input className="input" type="number" step="0.1" placeholder="e.g. 82.5 kg"
                   value={weightInput} onChange={e => setWeightInput(e.target.value)} />
          </div>

          <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:12,
                        marginBottom:20, border:"1px solid rgba(255,255,255,0.07)" }}>
            <div className="section-title">Result Preview</div>
            {gymDone && todayCalories < calTarget ? (
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"#22c55e" }}>
                ✓ Successful Day · +100 XP
              </div>
            ) : (
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"#ef4444" }}>
                ✗ Failed Day · {shields>0 ? `Shield activates (${shields-1} left)` : "Streak resets"}
              </div>
            )}
          </div>

          <button className="btn btn-gold" onClick={handleCheckin}
                  style={{ width:"100%", padding:"14px", fontSize:15 }}>
            Confirm Quest
          </button>
        </div>
      </div>
    );
  }

  function FoodDBModal() {
    const [search, setSearch] = useState("");
    const filtered = FOOD_DB.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    return (
      <div className="modal-overlay" onClick={() => setShowFoodDB(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, color:"#f59e0b",
                        marginBottom:12, letterSpacing:1 }}>📖 Food Database</div>
          <input className="input" placeholder="Search foods…" value={search}
                 onChange={e => setSearch(e.target.value)} style={{ marginBottom:12 }} />
          {filtered.map(food => (
            <div key={food.name} className="food-row" style={{ cursor:"pointer" }}
                 onClick={() => addFoodFromDB(food)}>
              <div>
                <div style={{ fontFamily:"'Crimson Text',serif", fontSize:15 }}>{food.name}</div>
                <div style={{ fontFamily:"'Crimson Text',serif", fontSize:11, color:"#475569" }}>
                  P:{food.p}g · C:{food.c}g · F:{food.f}g
                </div>
              </div>
              <span style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:"#f59e0b" }}>{food.cal} cal</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function DayDetail() {
    const day    = days[selectedDay] || {};
    const status = getDayStatus(selectedDay);
    const statusColor = getDayColor(status);
    const statusLabel = { success:"✓ Successful", perfect:"★ Perfect",
                          fail:"✗ Failed", rest:"🔵 Rest Day", none:"— No Data" }[status];
    return (
      <div className="day-detail">
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <button onClick={() => setSelectedDay(null)}
                  style={{ background:"none", border:"none", color:"#f59e0b",
                           fontSize:20, cursor:"pointer" }}>←</button>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, letterSpacing:1 }}>{selectedDay}</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:statusColor }}>{statusLabel}</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
          <div className="stat-box">
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:22,
                          color:(day.calories||0)<calTarget?"#22c55e":"#ef4444" }}>{day.calories||0}</div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12, color:"#64748b" }}>Calories</div>
          </div>
          <div className="stat-box">
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:22,
                          color:day.gym?"#22c55e":"#ef4444" }}>{day.gym?"✓":"✗"}</div>
            <div style={{ fontFamily:"'Crimson Text',serif", fontSize:12, color:"#64748b" }}>Gym</div>
          </div>
        </div>

        {day.weight && (
          <div className="card" style={{ marginBottom:12 }}>
            <div className="section-title">Weight</div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:24,
                          color:day.weight<=weightGoal?"#22c55e":"#f59e0b" }}>{day.weight} kg</div>
          </div>
        )}

        {day.foods && day.foods.length > 0 && (
          <div className="card">
            <div className="section-title">Food Log</div>
            {day.foods.map((f,i) => (
              <div key={i} className="food-row">
                <span style={{ fontFamily:"'Crimson Text',serif", fontSize:14 }}>{f.name}</span>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:"#f59e0b" }}>{f.cal}</span>
              </div>
            ))}
          </div>
        )}

        {status === "none" && (
          <div style={{ fontFamily:"'Crimson Text',serif", fontSize:14, color:"#475569",
                        textAlign:"center", padding:"40px 0", fontStyle:"italic" }}>
            No data recorded for this day.
          </div>
        )}
      </div>
    );
  }
}

// ── global CSS string ─────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #111; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  .nav-btn { background:none; border:none; cursor:pointer; display:flex; flex-direction:column;
             align-items:center; gap:2px; padding:6px 10px; border-radius:8px; transition:all 0.2s; }
  .nav-btn:hover  { background:rgba(255,255,255,0.05); }
  .nav-btn.active { background:rgba(245,158,11,0.12); }
  .screen { flex:1; overflow-y:auto; padding:16px; padding-bottom:90px; }
  .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
          border-radius:12px; padding:16px; margin-bottom:12px; }
  .btn { border:none; border-radius:8px; padding:10px 20px; cursor:pointer;
         font-family:'Cinzel',serif; font-size:13px; font-weight:600;
         transition:all 0.2s; letter-spacing:0.5px; }
  .btn-gold  { background:linear-gradient(135deg,#f59e0b,#d97706); color:#000; }
  .btn-gold:hover { transform:translateY(-1px); box-shadow:0 4px 20px rgba(245,158,11,0.4); }
  .btn-red   { background:rgba(239,68,68,0.15);  color:#ef4444; border:1px solid rgba(239,68,68,0.3); }
  .btn-ghost { background:rgba(255,255,255,0.06); color:#94a3b8; border:1px solid rgba(255,255,255,0.1); }
  .toggle { width:48px; height:26px; border-radius:13px; border:none; cursor:pointer;
            position:relative; transition:background 0.3s; }
  .toggle::after { content:''; position:absolute; top:3px; left:3px; width:20px; height:20px;
                   border-radius:50%; background:white; transition:transform 0.3s; }
  .toggle.on  { background:#22c55e; }
  .toggle.on::after { transform:translateX(22px); }
  .toggle.off { background:#374151; }
  .input { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
           border-radius:8px; padding:10px 14px; color:#e2e8f0;
           font-family:'Crimson Text',serif; font-size:15px; width:100%; outline:none; }
  .input:focus { border-color:rgba(245,158,11,0.5); }
  .progress-bar  { height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden; }
  .progress-fill { height:100%; border-radius:4px; transition:width 0.6s ease; }
  .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; }
  .cal-day { aspect-ratio:1; border-radius:6px; display:flex; align-items:center;
             justify-content:center; font-size:11px; cursor:pointer;
             font-family:'Crimson Text',serif; position:relative;
             border:1px solid transparent; transition:all 0.15s; }
  .cal-day:hover { border-color:rgba(245,158,11,0.3); }
  .cal-day.today { border-color:#f59e0b !important; box-shadow:0 0 8px rgba(245,158,11,0.3); }
  .streak-fire { font-size:28px; animation:flicker 1.5s infinite alternate; }
  @keyframes flicker { 0%{filter:brightness(1)} 100%{filter:brightness(1.3) drop-shadow(0 0 8px #f59e0b)} }
  .shield { font-size:20px; filter:drop-shadow(0 0 4px #60a5fa); }
  .section-title { font-family:'Cinzel',serif; font-size:11px; letter-spacing:2px;
                   color:#64748b; text-transform:uppercase; margin-bottom:8px; }
  .food-row { display:flex; align-items:center; justify-content:space-between;
              padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:100;
                   display:flex; align-items:flex-end; justify-content:center; }
  .modal { background:#111118; border:1px solid rgba(255,255,255,0.1);
           border-radius:20px 20px 0 0; padding:24px; width:100%;
           max-width:480px; max-height:80vh; overflow-y:auto; }
  .day-detail { position:fixed; inset:0; background:#0a0a0f; z-index:50;
                overflow-y:auto; padding:24px; }
  .stat-box { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
              border-radius:10px; padding:14px; text-align:center; }
`;
