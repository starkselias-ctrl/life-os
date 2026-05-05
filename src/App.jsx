import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useAuth, useUser, useSignIn, useSignUp } from "@clerk/clerk-react";

/* ── Void x Paper tokens ── */
const ACC    = "#5B8FFF";   // electric blue
const PINK   = "#E84393";   // urgent pink
const RED    = "#F05050";   // destructive red
const PURPLE = "#C87EFF";   // purple accent
const GOLD   = "#E0A040";   // gold accent
const GREEN  = "#22C97A";   // success green
const SURF   = "#13131E";   // elevated surface
const BORD   = "#1E1E30";   // default border
const BORD2  = "#2A2A3A";   // subtle border
const T1     = "#E0E8FF";   // primary text
const T2     = "#A0A8C0";   // secondary text

// Generic starter areas shown to every new user
const DEFAULT_AREAS = [
  { id:"work",     label:"Work",     sub:"Projects & clients", icon:"⌘" },
  { id:"personal", label:"Personal", sub:"Life admin",         icon:"⊙" },
  { id:"health",   label:"Health",   sub:"Body & mind",        icon:"◎" },
  { id:"finances", label:"Finances", sub:"Money & banking",    icon:"$" },
  { id:"creative", label:"Creative", sub:"Ideas & projects",   icon:"✦" },
  { id:"social",   label:"Social",   sub:"People & plans",     icon:"◈" },
  { id:"inbox",    label:"Inbox",    sub:"Unsorted capture",   icon:"⊕" },
];

// New users start with no tasks
const DEFAULT_TASKS = [];

const ICONS = ["⌘","✈","◎","$","⊙","✦","◈","⊕","♡","★","◆","▲","●","◐","⬡","⚡","✿","☀","♫","⚙","✎","⊞","⊟","⊠"];
const PRI = { high:{label:"Urgent",color:PINK}, med:{label:"Normal",color:ACC}, low:{label:"Later",color:"#636370"} };
const WEEK_DAYS = ["S","M","T","W","T","F","S"];
const TODAY_LONG  = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const today       = new Date();

// Area card themes — tint bg + matching accent
const AREA_THEMES = [
  {bg:"#0D1A35",accent:ACC,   border:"#1A2840"},
  {bg:"#1A0D35",accent:PURPLE,border:"#28154A"},
  {bg:"#2A1A05",accent:GOLD,  border:"#3A2510"},
  {bg:"#0A2E1A",accent:GREEN, border:"#103D24"},
  {bg:"#2E0D0D",accent:RED,   border:"#3D1A1A"},
  {bg:"#0A1A2E",accent:ACC,   border:"#10253A"},
  {bg:"#1A1A2A",accent:T2,    border:"#252535"},
  {bg:"#140D1A",accent:PURPLE,border:"#201528"},
];

function greet(){
  const now=new Date(), h=now.getHours(), day=now.getDay();
  const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  if(day===0||day===6) return `Happy ${days[day]}`;
  if(day===5) return h>=12?"TGIF":"Happy Friday";
  if(day===1&&h<12) return "Happy Monday";
  return h<12?"Good morning":h<17?"Good afternoon":"Good evening";
}

const EC = [
  {bg:"#0D1A35",border:ACC},
  {bg:"#2A1A05",border:GOLD},
  {bg:"#0A2E1A",border:GREEN},
  {bg:"#1A0D35",border:PURPLE},
  {bg:"#2E0D0D",border:RED},
];

const AI_SYS = `You are the AI brain of a personal life OS for Elias — Salesforce consultant who just relocated from Austin TX to Amsterdam. DAFT visa applicant, self-employed. Today: ${TODAY_LONG}.

You have access to web search. When the user asks about logistics, shipping, services, costs, routes, or anything requiring current real-world information — USE web search to find real options, real companies, real prices before responding.

Areas available: work, amsterdam, health, finances, personal, creative, social, inbox

Respond ONLY with valid JSON, no markdown, no explanation outside the JSON:
{
  "summary": "2-3 sentence plain english of what you found and recommend",
  "research": "Concrete findings: real company names, real price ranges, real timelines. Be specific. If you searched, share what you found.",
  "insight": "The single most important thing Elias should know or do first",
  "tasks": [
    {
      "text": "Parent task title — imperative, specific",
      "area": "area_id",
      "priority": "high|med|low",
      "due": "YYYY-MM-DD or empty",
      "time": "HH:MM or empty",
      "dur": 30,
      "notes": "key context for this task",
      "subtasks": [
        { "text": "Specific actionable subtask" },
        { "text": "Next step" }
      ]
    }
  ],
  "timeline": [
    { "week": "Week 1", "focus": "What to do this week" }
  ]
}

Rules:
- ALWAYS use web search for logistics, shipping, services, costs, local info, current events
- ONE goal = ONE parent task. If the user asks about one thing (e.g. shipping a bike), produce a single parent task with 4-8 sequential subtasks covering every step. Only create multiple parent tasks when there are genuinely separate, independent goals.
- Subtasks must be specific and sequential — the actual steps to complete the parent task
- Be opinionated — recommend the best option with the reason, don't just list everything
- Elias is in Amsterdam now. Austin TX is the origin for any shipping/moving tasks
- For shipping: research real carriers (uShip, Bikeflights, DSV, Seven Seas, ShipBikes.com etc)
- For financial/legal tasks in NL: reference real Dutch services
- Tasks must be actionable today, not vague
- summary, research, insight fields must be plain text only — no HTML, no markdown, no citation tags
`;

function stripTags(s){ return s ? s.replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim() : ""; }
function getArea(areas, id){ return areas.find(a=>a.id===id) || {id:"inbox",label:"Inbox",sub:"",icon:"⊕"}; }
function t2m(t){ if(!t) return null; const [h,m]=t.split(":").map(Number); return h*60+m; }
function fmt(t){ if(!t) return ""; const [h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function load(key,fb){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fb; }catch{ return fb; } }
function save(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch(e){ void e; } }

const gl = () => ({
  background:SURF,
  border:`0.5px solid ${BORD}`,
});

const MAX_W = 480;

const PAGE = {
  fontFamily:"-apple-system,'SF Pro Display',BlinkMacSystemFont,sans-serif",
  width:"100%",
  maxWidth:MAX_W,
  margin:"0 auto",
  minHeight:"100vh",
  background:"#0C0C14",
  overflowX:"hidden",
  overflowY:"auto",
  WebkitOverflowScrolling:"touch",
  position:"relative",
};

const TABBAR = {
  position:"fixed",bottom:0,
  left:"50%",transform:"translateX(-50%)",
  width:"100%",maxWidth:MAX_W,
  background:"#0E0E18",
  borderTop:`0.5px solid ${BORD}`,
  display:"flex",zIndex:100,
  paddingBottom:"calc(env(safe-area-inset-bottom) + 6px)",
  paddingTop:6,
};

const IS = {
  width:"100%",padding:"13px 16px",borderRadius:12,
  border:`0.5px solid ${BORD2}`,
  background:SURF,
  fontSize:15,fontFamily:"inherit",outline:"none",
  color:T1,boxSizing:"border-box",display:"block",
  transition:"border-color 0.15s",
};

const MUTED = "#3A3A60"; // text-muted token

// ─────────────────────────────────────────
// SVG ICON SYSTEM
// ─────────────────────────────────────────
const Icon = {
  grid:(sz=14)=>(
    <svg width={sz} height={sz} viewBox="0 0 14 14">
      <rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor"/>
      <rect x="8" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity=".4"/>
      <rect x="1" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity=".4"/>
      <rect x="8" y="8" width="5" height="5" rx="1.5" fill="currentColor" opacity=".4"/>
    </svg>
  ),
  clock:(sz=14)=>(
    <svg width={sz} height={sz} viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="7" y1="7" x2="7" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  spark:(sz=14)=>(
    <svg width={sz} height={sz} viewBox="0 0 14 14">
      <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5Z" fill="currentColor"/>
    </svg>
  ),
  chevronLeft:(sz=14)=>(
    <svg width={sz} height={sz} viewBox="0 0 14 14">
      <polyline points="9,2 5,7 9,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  checkCircle:(done)=>done?(
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="6.25" fill={GREEN} stroke="none"/>
      <polyline points="3.5,7 6,9.5 10.5,4.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ):(
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="6.25" fill="none" stroke="#2A2A40" strokeWidth="1.5"/>
    </svg>
  ),
  checkSquare:(done)=>done?(
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x=".75" y=".75" width="10.5" height="10.5" rx="2.5" fill={GREEN} stroke="none"/>
      <polyline points="2.5,6 5,8.5 9.5,3.5" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ):(
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x=".75" y=".75" width="10.5" height="10.5" rx="2.5" fill="none" stroke="#2A2A40" strokeWidth="1.5"/>
    </svg>
  ),
  pause:()=>(
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x="1.5" y="1" width="3" height="10" rx="1" fill="currentColor"/>
      <rect x="7.5" y="1" width="3" height="10" rx="1" fill="currentColor"/>
    </svg>
  ),
  stop:()=>(
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor"/>
    </svg>
  ),
  flame:(sz=12)=>(
    <svg width={sz} height={sz} viewBox="0 0 12 12">
      <path d="M6 1C4 3.5 1.5 5 1.5 8a4.5 4.5 0 009 0C10.5 5 8 3.5 6 1z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  recurring:()=>(
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d="M2 7A5 5 0 0112 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="10,4.5 12,7 9.5,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 7a5 5 0 01-10 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <polyline points="4,9.5 2,7 4.5,7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  play:()=>(
    <svg width="12" height="12" viewBox="0 0 12 12">
      <polygon points="2,1 11,6 2,11" fill="currentColor"/>
    </svg>
  ),
};

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const ProgressRing = memo(function ProgressRing({ pct, size=44, r=18, sw=4 }) {
  const circ=2*Math.PI*r;
  const offset=circ-Math.max(0,Math.min(1,pct/100))*circ;
  const c=size/2;
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#1A1A2A" strokeWidth={sw}/>
      <circle cx={c} cy={c} r={r} fill="none" stroke={ACC} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${c} ${c})`}/>
      <text x={c} y={c+4} textAnchor="middle" fill={T1} fontSize={10} fontWeight={700}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
});

const TabBar = memo(function TabBar({ tab, setTab, setView }) {
  const items = [
    {id:"home",     iconFn:(c)=><span style={{color:c}}>{Icon.grid(22)}</span>,  label:"Tasks"},
    {id:"schedule", iconFn:(c)=><span style={{color:c}}>{Icon.clock(22)}</span>, label:"Schedule"},
    {id:"ai",       iconFn:(c)=><span style={{color:c}}>{Icon.spark(22)}</span>, label:"AI"},
  ];
  return (
    <div style={TABBAR}>
      {items.map(v=>{
        const active=tab===v.id;
        const c=active?ACC:"#2A2A45";
        return (
          <button key={v.id} onClick={()=>{ setTab(v.id); setView(v.id); }}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              gap:3,paddingTop:4,background:"none",border:"none",cursor:"pointer",position:"relative"}}>
            {active&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
              width:44,height:40,borderRadius:10,background:"#0D1A35",zIndex:0}}/>}
            <span style={{position:"relative",zIndex:1,lineHeight:1}}>{v.iconFn(c)}</span>
            <span style={{position:"relative",zIndex:1,fontSize:10,fontWeight:active?700:500,color:c}}>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
});

const TaskRow = memo(function TaskRow({ t, onToggle, onOpen, onToggleSub }) {
  const [expanded, setExpanded] = useState(false);
  const subs    = t.subtasks||[];
  const subDone = subs.filter(s=>s.done).length;
  const hasSubs = subs.length>0;
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",minHeight:56}}>
        <button onClick={()=>onToggle(t.id)}
          style={{width:26,height:26,borderRadius:13,border:t.done?"none":`2px solid ${ACC}60`,
            background:t.done?GREEN:"transparent",flexShrink:0,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          {t.done && <span style={{color:"#fff",fontSize:13}}>✓</span>}
        </button>
        <div style={{flex:1,minWidth:0}} onClick={()=>onOpen(t.id)}>
          <div style={{fontSize:16,fontWeight:600,color:t.done?"rgba(255,255,255,0.3)":T1,
            textDecoration:t.done?"line-through":"none",lineHeight:1.3}}>{t.text}</div>
          {t.desc && !t.done && (
            <div style={{fontSize:12,color:T2,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.desc}</div>
          )}
          <div style={{display:"flex",gap:8,marginTop:4,alignItems:"center",flexWrap:"wrap"}}>
            {t.time && !t.done && <span style={{fontSize:11,color:T2}}>{fmt(t.time)}{t.dur?` · ${t.dur}m`:""}</span>}
            {t.priority==="high" && !t.done && <span style={{fontSize:11,fontWeight:700,color:PINK}}>Urgent</span>}
            {t.due && !t.done && <span style={{fontSize:11,color:T2}}>Due {t.due}</span>}
            {t.recurring && !t.done && <span style={{display:"flex",color:GOLD,lineHeight:1}}>{Icon.recurring()}</span>}
          </div>
          {hasSubs && !t.done && (
            <div style={{marginTop:6,height:2,borderRadius:1,background:"rgba(255,255,255,0.1)"}}>
              <div style={{height:2,borderRadius:1,transition:"width 0.3s",
                background:subDone===subs.length?GREEN:ACC,
                width:`${subs.length?subDone/subs.length*100:0}%`}}/>
            </div>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {hasSubs && !t.done && (
            <button onClick={e=>{e.stopPropagation();setExpanded(x=>!x);}}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
                color:ACC,padding:"4px 6px",borderRadius:8,display:"flex",alignItems:"center",gap:3}}>
              <span style={{fontSize:10}}>{subDone}/{subs.length}</span>
              <span style={{fontSize:12,transition:"transform 0.2s",display:"inline-block",transform:expanded?"rotate(90deg)":"rotate(0deg)"}}>›</span>
            </button>
          )}
          <span onClick={()=>onOpen(t.id)} style={{color:"rgba(255,255,255,0.2)",fontSize:16,cursor:"pointer"}}>›</span>
        </div>
      </div>
      {hasSubs && expanded && !t.done && (
        <div style={{marginLeft:58,marginRight:18,marginBottom:10,borderRadius:12,overflow:"hidden",border:`1px solid ${ACC}30`,background:`${ACC}0D`}}>
          {subs.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
              borderBottom:i<subs.length-1?`1px solid ${BORD}`:"none"}}>
              <button onClick={()=>onToggleSub(t.id,s.id)}
                style={{width:20,height:20,borderRadius:10,
                  border:s.done?"none":`1.5px solid ${ACC}60`,
                  background:s.done?GREEN:"transparent",
                  flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s.done && <span style={{color:"#fff",fontSize:10}}>✓</span>}
              </button>
              <span style={{fontSize:14,color:s.done?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.85)",
                textDecoration:s.done?"line-through":"none",flex:1,lineHeight:1.3}}>{s.text}</span>
            </div>
          ))}
          <button onClick={()=>onOpen(t.id)}
            style={{width:"100%",padding:"10px 14px",background:"none",border:"none",
              borderTop:`1px solid ${BORD}`,cursor:"pointer",
              fontSize:12,fontWeight:600,color:ACC,textAlign:"left"}}>
            + Add subtask / Edit →
          </button>
        </div>
      )}
    </div>
  );
});

const Sheet = memo(function Sheet({ children, onClose, tall, noBlur }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",
      alignItems:"flex-end",zIndex:200,
      ...(noBlur?{}:{backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}),
    }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#16161F",border:`0.5px solid ${BORD}`,borderBottom:"none",
        borderRadius:"18px 18px 0 0",padding:"12px 20px 44px",width:"100%",
        boxSizing:"border-box",maxHeight:tall?"93vh":"auto",overflowY:"auto"}}>
        <div style={{width:36,height:4,borderRadius:3,background:BORD,margin:"0 auto 20px"}}/>
        {children}
      </div>
    </div>
  );
});

const Lbl = memo(function Lbl({ children }) {
  return <div style={{fontSize:11,fontWeight:700,color:T2,letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{children}</div>;
});

const InfoCard = memo(function InfoCard({ color, label, text, bg, border }) {
  return (
    <div style={{background:bg,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${border}`}}>
      <div style={{fontSize:11,fontWeight:700,color,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontSize:14,lineHeight:1.5,color:"rgba(255,255,255,0.8)"}}>{text}</div>
    </div>
  );
});

const ConfirmDelete = memo(function ConfirmDelete({ name, onCancel, onConfirm }) {
  return (
    <Sheet onClose={onCancel}>
      <div style={{textAlign:"center",padding:"8px 0 20px"}}>
        <div style={{fontSize:40,marginBottom:12}}>⚠</div>
        <div style={{fontSize:20,fontWeight:800,color:T1,marginBottom:8}}>Delete area?</div>
        <div style={{fontSize:15,color:T2,lineHeight:1.5,marginBottom:24}}>
          All tasks in <strong style={{color:T1}}>{name}</strong> will move to Inbox.
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(255,255,255,0.1)",color:T2,fontSize:16,fontWeight:600,cursor:"pointer"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:PINK,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>Delete</button>
        </div>
      </div>
    </Sheet>
  );
});


const AreaMgrSheet = memo(function AreaMgrSheet({ show, onClose, editingArea, areaForm, setAreaForm, onSave, onDeleteRequest }) {
  if (!show) return null;
  return (
    <Sheet onClose={onClose} tall>
      <div style={{fontSize:20,fontWeight:800,color:T1,marginBottom:20}}>{editingArea?"Edit area":"New area"}</div>
      <Lbl>Icon</Lbl>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
        {ICONS.map(ic=>(
          <button key={ic} onClick={()=>setAreaForm(f=>({...f,icon:ic}))}
            style={{width:40,height:40,borderRadius:12,border:`2px solid ${areaForm.icon===ic?ACC:BORD}`,
              background:areaForm.icon===ic?`${ACC}20`:"rgba(255,255,255,0.07)",fontSize:18,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</button>
        ))}
      </div>
      <Lbl>Name</Lbl>
      <input placeholder="e.g. Golf, Travel…" value={areaForm.label}
        onChange={e=>setAreaForm(f=>({...f,label:e.target.value}))} style={{...IS,marginBottom:12}}/>
      <Lbl>Description</Lbl>
      <input placeholder="Short tagline" value={areaForm.sub}
        onChange={e=>setAreaForm(f=>({...f,sub:e.target.value}))} style={{...IS,marginBottom:24}}/>
      <div style={{display:"flex",gap:10}}>
        {editingArea&&editingArea.id!=="inbox"&&(
          <button onClick={onDeleteRequest}
            style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:`${PINK}15`,color:PINK,fontSize:15,fontWeight:700,cursor:"pointer"}}>Delete</button>
        )}
        <button onClick={onClose}
          style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(255,255,255,0.1)",color:T2,fontSize:15,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        <button onClick={onSave} disabled={!areaForm.label.trim()}
          style={{flex:2,padding:"14px 0",borderRadius:14,border:"none",
            background:areaForm.label.trim()?ACC:"rgba(255,255,255,0.08)",
            color:areaForm.label.trim()?"#fff":T2,fontSize:15,fontWeight:700,cursor:"pointer"}}>
          {editingArea?"Save":"Create area"}
        </button>
      </div>
    </Sheet>
  );
});

// ─────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────
const CLERK_ERRORS = {
  form_identifier_not_found:   "No account found with that email.",
  form_password_incorrect:     "Wrong password. Try again or use Email code.",
  form_param_format_invalid:   "Please enter a valid email address.",
  form_identifier_exists:      "An account with this email already exists.",
  too_many_requests:           "Too many attempts — wait a minute and try again.",
  form_code_incorrect:         "That code is wrong. Check your email and try again.",
  verification_code_not_found: "Code expired. Go back and request a new one.",
  already_verified:            "Email already verified — try signing in instead.",
  session_exists:              "You're already signed in.",
};

function clerkMsg(e) {
  const code = e?.errors?.[0]?.code;
  return CLERK_ERRORS[code] || e?.errors?.[0]?.message || "Something went wrong.";
}

function ErrCard({ msg, onDismiss }) {
  if(!msg) return null;
  return (
    <div style={{...gl(),borderRadius:14,padding:"14px 16px",marginBottom:14,
      border:`1px solid ${PINK}40`,background:`${PINK}12`,width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.9)",lineHeight:1.5,flex:1}}>{msg}</div>
        <button onClick={onDismiss}
          style={{background:"none",border:"none",color:T2,fontSize:16,cursor:"pointer",flexShrink:0,padding:0,lineHeight:1}}>×</button>
      </div>
    </div>
  );
}

function LoginScreen() {
  const { signIn, isLoaded:siLoaded, setActive:setSiActive } = useSignIn();
  const { signUp, isLoaded:suLoaded, setActive:setSuActive } = useSignUp();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [code,     setCode]     = useState("");
  const [method,   setMethod]   = useState("password");
  const [step,     setStep]     = useState("form"); // "form" | "verify" | "reset" | "reset-verify"
  const [isNew,    setIsNew]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [info,     setInfo]     = useState("");

  const ready = siLoaded && suLoaded;
  const clearErr = () => setErr("");

  // ── Password sign-in / sign-up ──
  async function handlePassword() {
    if(!ready||!email.trim()||!password.trim()) return;
    setLoading(true); setErr(""); setInfo("");
    try {
      const r = await signIn.create({ identifier:email, password });
      if(r.status==="complete") await setSiActive({ session:r.createdSessionId });
    } catch(e) {
      const ec=e.errors?.[0]?.code;
      if(ec==="form_identifier_not_found") {
        try {
          await signUp.create({ emailAddress:email, password });
          await signUp.prepareEmailAddressVerification({ strategy:"email_code" });
          setIsNew(true); setStep("verify");
        } catch(e2) { setErr(clerkMsg(e2)); }
      } else {
        setErr(clerkMsg(e));
      }
    }
    setLoading(false);
  }

  // ── Email code sign-in / sign-up ──
  async function handleSendCode() {
    if(!ready||!email.trim()) return;
    setLoading(true); setErr(""); setInfo("");
    try {
      await signIn.create({ strategy:"email_code", identifier:email });
      setIsNew(false); setStep("verify");
    } catch(e) {
      const ec=e.errors?.[0]?.code;
      if(ec==="form_identifier_not_found") {
        try {
          await signUp.create({ emailAddress:email });
          await signUp.prepareEmailAddressVerification({ strategy:"email_code" });
          setIsNew(true); setStep("verify");
        } catch(e2) { setErr(clerkMsg(e2)); }
      } else { setErr(clerkMsg(e)); }
    }
    setLoading(false);
  }

  // ── Verify code (sign-in or sign-up) ──
  async function handleVerify() {
    if(!ready||code.length!==6) return;
    setLoading(true); setErr("");
    try {
      if(isNew) {
        const r = await signUp.attemptEmailAddressVerification({ code });
        if(r.status==="complete") await setSuActive({ session:r.createdSessionId });
      } else {
        const r = await signIn.attemptFirstFactor({ strategy:"email_code", code });
        if(r.status==="complete") await setSiActive({ session:r.createdSessionId });
      }
    } catch(e) { setErr(clerkMsg(e)); }
    setLoading(false);
  }

  // ── Forgot password: send reset code ──
  async function handleForgot() {
    if(!ready||!email.trim()) { setErr("Enter your email first."); return; }
    setLoading(true); setErr(""); setInfo("");
    try {
      await signIn.create({ strategy:"reset_password_email_code", identifier:email });
      setStep("reset-verify"); setInfo("Reset code sent — check your email.");
    } catch(e) { setErr(clerkMsg(e)); }
    setLoading(false);
  }

  // ── Reset password: verify code + set new password ──
  const [newPw, setNewPw] = useState("");
  async function handleReset() {
    if(!ready||code.length!==6||!newPw.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await signIn.attemptFirstFactor({
        strategy:"reset_password_email_code", code, password:newPw
      });
      if(r.status==="complete") await setSiActive({ session:r.createdSessionId });
    } catch(e) { setErr(clerkMsg(e)); }
    setLoading(false);
  }

  const btnStyle = (active) => ({
    width:"100%",padding:"16px",borderRadius:16,border:"none",cursor:"pointer",
    fontSize:16,fontWeight:700,
    background:active&&!loading?ACC:"rgba(255,255,255,0.08)",
    color:active&&!loading?"#fff":T2,
  });

  return (
    <div style={{...PAGE,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px"}}>
      <div id="clerk-captcha"/>
      <div style={{fontSize:44,marginBottom:16}}>✦</div>
      <div style={{fontSize:28,fontWeight:800,color:T1,marginBottom:6,textAlign:"center"}}>Life OS</div>
      <div style={{fontSize:14,color:T2,marginBottom:28,textAlign:"center",lineHeight:1.5}}>
        Sign in or create an account
      </div>

      {info&&<div style={{...gl(),borderRadius:14,padding:"12px 16px",marginBottom:14,
        border:`1px solid ${ACC}40`,background:`${ACC}12`,width:"100%",
        fontSize:13,color:"rgba(255,255,255,0.9)"}}>
        {info}
      </div>}

      <ErrCard msg={err} onDismiss={clearErr}/>

      {step==="form" && (
        <>
          <div style={{...gl(),borderRadius:14,padding:4,display:"flex",marginBottom:20,width:"100%"}}>
            {[{id:"password",label:"Password"},{id:"code",label:"Email code"}].map(m=>(
              <button key={m.id} onClick={()=>{setMethod(m.id);clearErr();}}
                style={{flex:1,padding:"9px 0",borderRadius:11,border:"none",cursor:"pointer",
                  background:method===m.id?ACC:"transparent",
                  color:method===m.id?"#fff":T2,fontSize:14,fontWeight:700}}>
                {m.label}
              </button>
            ))}
          </div>

          <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&(method==="password"?handlePassword():handleSendCode())}
            placeholder="your@email.com" autoFocus
            style={{...IS,marginBottom:12,fontSize:16}}/>

          {method==="password" && (
            <div style={{position:"relative",width:"100%",marginBottom:8}}>
              <input type={showPw?"text":"password"} value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handlePassword()}
                placeholder="Password"
                style={{...IS,paddingRight:48}}/>
              <button onClick={()=>setShowPw(s=>!s)}
                style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                  background:"none",border:"none",color:T2,cursor:"pointer",fontSize:13,fontWeight:600}}>
                {showPw?"Hide":"Show"}
              </button>
            </div>
          )}

          {method==="password" && (
            <button onClick={handleForgot} disabled={loading}
              style={{width:"100%",padding:"12px",borderRadius:12,border:`1px solid ${BORD}`,
                background:"rgba(255,255,255,0.04)",color:T2,fontSize:14,fontWeight:600,
                cursor:"pointer",marginBottom:14,textAlign:"center"}}>
              Forgot password? Send reset code →
            </button>
          )}

          <button
            onClick={method==="password"?handlePassword:handleSendCode}
            disabled={!email.trim()||loading||!ready||(method==="password"&&!password.trim())}
            style={btnStyle(email.trim()&&(method==="code"||password.trim()))}>
            {loading?"Please wait…":method==="password"?"Sign in →":"Send code →"}
          </button>
        </>
      )}

      {step==="verify" && (
        <>
          <div style={{...gl(),borderRadius:14,padding:"10px 16px",marginBottom:20,
            display:"flex",alignItems:"center",gap:10,width:"100%"}}>
            <span style={{fontSize:12,color:isNew?GREEN:ACC,fontWeight:700}}>
              {isNew?"New account":"Welcome back"}
            </span>
            <span style={{fontSize:12,color:T2,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email}</span>
          </div>
          <div style={{fontSize:14,color:T2,marginBottom:16,textAlign:"center",lineHeight:1.6}}>
            Enter the 6-digit code sent to your email
          </div>
          <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
            onKeyDown={e=>e.key==="Enter"&&handleVerify()} placeholder="000000" maxLength={6} autoFocus
            style={{...IS,marginBottom:16,textAlign:"center",fontSize:28,letterSpacing:10,fontWeight:700}}/>
          <button onClick={handleVerify} disabled={code.length!==6||loading} style={btnStyle(code.length===6)}>
            {loading?"Verifying…":isNew?"Create account →":"Sign in →"}
          </button>
          <button onClick={()=>{setStep("form");setCode("");clearErr();}}
            style={{background:"none",border:"none",color:T2,fontSize:13,cursor:"pointer",marginTop:12}}>
            ← Back
          </button>
        </>
      )}

      {step==="reset-verify" && (
        <>
          <div style={{fontSize:14,color:T2,marginBottom:16,textAlign:"center",lineHeight:1.6}}>
            Enter the reset code from your email,<br/>then choose a new password.
          </div>
          <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="6-digit code" maxLength={6} autoFocus
            style={{...IS,marginBottom:12,textAlign:"center",fontSize:22,letterSpacing:8,fontWeight:700}}/>
          <div style={{position:"relative",width:"100%",marginBottom:16}}>
            <input type={showPw?"text":"password"} value={newPw}
              onChange={e=>setNewPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleReset()}
              placeholder="New password"
              style={{...IS,paddingRight:48}}/>
            <button onClick={()=>setShowPw(s=>!s)}
              style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",color:T2,cursor:"pointer",fontSize:13,fontWeight:600}}>
              {showPw?"Hide":"Show"}
            </button>
          </div>
          <button onClick={handleReset} disabled={code.length!==6||!newPw.trim()||loading}
            style={btnStyle(code.length===6&&newPw.trim())}>
            {loading?"Resetting…":"Set new password →"}
          </button>
          <button onClick={()=>{setStep("form");setCode("");setNewPw("");clearErr();}}
            style={{background:"none",border:"none",color:T2,fontSize:13,cursor:"pointer",marginTop:12}}>
            ← Back to sign in
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// BRAIN DUMP SHEET
// ─────────────────────────────────────────
function BrainDumpSheet({ onClose, onAddTasks, getToken }) {
  const [text,    setText]    = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [err,     setErr]     = useState("");

  async function submit() {
    if(!text.trim()) return;
    setLoading(true); setErr(""); setResult(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/brain-dump",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},
        body:JSON.stringify({prompt:text}),
      });
      if(!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setResult(data.tasks||[]);
    } catch(e) {
      setErr("Could not parse tasks. Try again.");
      console.error(e);
    }
    setLoading(false);
  }

  function addAll() {
    onAddTasks(result||[]);
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall noBlur>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <div style={{background:"#1A0D35",border:`0.5px solid ${PURPLE}`,borderRadius:8,
          padding:"4px 8px",display:"inline-flex",alignItems:"center",gap:4}}>
          <span style={{color:PURPLE,lineHeight:1,display:"flex"}}>{Icon.spark(9)}</span>
          <span style={{fontSize:9,fontWeight:600,color:PURPLE}}>AI</span>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:T1}}>Brain dump</span>
      </div>

      {/* Textarea */}
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder="Just type everything on your mind…"
        style={{...IS,minHeight:80,resize:"none",lineHeight:1.6,
          color:text?T1:"#4A4A70",marginBottom:12}}
        onFocus={e=>e.target.style.borderColor=ACC}
        onBlur={e=>e.target.style.borderColor=BORD2}/>

      {/* Error */}
      {err&&<div style={{fontSize:12,color:PINK,marginBottom:8}}>{err}</div>}

      {/* Result card or submit button */}
      {result ? (
        <>
          <div style={{background:"#0D1A35",border:`0.5px solid ${ACC}`,borderRadius:10,
            padding:"10px 12px",marginBottom:12}}>
            {loading ? (
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0"}}>
                <div className="ai-spinner" style={{width:16,height:16,borderWidth:2}}/>
                <span style={{fontSize:11,color:T2}}>Parsing your brain dump…</span>
              </div>
            ) : (
              <>
                <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:8}}>
                  <span style={{color:ACC,display:"flex"}}>{Icon.spark(9)}</span>
                  <span style={{fontSize:9,fontWeight:600,color:ACC}}>Tasks created</span>
                </div>
                {result.map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                    <div style={{width:5,height:5,borderRadius:3,background:ACC,flexShrink:0}}/>
                    <span style={{fontSize:11,color:"#A0B0E0"}}>{t}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          {!loading&&(
            <button onClick={addAll}
              style={{width:"100%",padding:"11px",borderRadius:9,border:"none",
                background:ACC,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
              Add all to Today
            </button>
          )}
        </>
      ) : (
        <button onClick={submit} disabled={!text.trim()||loading}
          style={{width:"100%",padding:"11px",borderRadius:9,border:"none",
            background:text.trim()&&!loading?ACC:"rgba(255,255,255,0.06)",
            color:text.trim()&&!loading?"#fff":T2,
            fontSize:13,fontWeight:600,cursor:"pointer"}}>
          {loading?"Parsing…":"Parse tasks"}
        </button>
      )}
    </Sheet>
  );
}

// ─────────────────────────────────────────
// CHANGE PASSWORD SHEET
// ─────────────────────────────────────────
function ChangePasswordSheet({ onClose }) {
  const { user } = useUser();
  const [cur,    setCur]    = useState("");
  const [next,   setNext]   = useState("");
  const [confirm,setConfirm]= useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [ok,      setOk]      = useState(false);

  async function handleChange() {
    if(!cur.trim()||!next.trim()) return;
    if(next!==confirm){ setErr("New passwords don't match."); return; }
    if(next.length<8){ setErr("Password must be at least 8 characters."); return; }
    setLoading(true); setErr("");
    try {
      await user.updatePassword({ currentPassword:cur, newPassword:next });
      setOk(true);
      setTimeout(onClose, 1500);
    } catch(e) {
      setErr(e.errors?.[0]?.message || "Could not update password.");
    }
    setLoading(false);
  }

  return (
    <Sheet onClose={onClose} tall={false}>
      <div style={{fontSize:20,fontWeight:800,color:T1,marginBottom:20}}>Change Password</div>
      {ok ? (
        <div style={{textAlign:"center",padding:"20px 0"}}>
          <div style={{fontSize:32,marginBottom:10}}>✓</div>
          <div style={{fontSize:16,fontWeight:700,color:GREEN}}>Password updated!</div>
        </div>
      ) : (
        <>
          {err&&<div style={{...gl(),borderRadius:12,padding:"12px 14px",marginBottom:14,
            border:`1px solid ${PINK}40`,background:`${PINK}12`,
            fontSize:13,color:"rgba(255,255,255,0.9)",lineHeight:1.5}}>{err}</div>}
          <Lbl>Current password</Lbl>
          <div style={{position:"relative",marginBottom:12}}>
            <input type={showCur?"text":"password"} value={cur} onChange={e=>setCur(e.target.value)}
              placeholder="Current password" style={{...IS,paddingRight:52}}/>
            <button onClick={()=>setShowCur(s=>!s)}
              style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",color:T2,cursor:"pointer",fontSize:13,fontWeight:600}}>
              {showCur?"Hide":"Show"}
            </button>
          </div>
          <Lbl>New password</Lbl>
          <div style={{position:"relative",marginBottom:12}}>
            <input type={showNew?"text":"password"} value={next} onChange={e=>setNext(e.target.value)}
              placeholder="New password (min 8 chars)" style={{...IS,paddingRight:52}}/>
            <button onClick={()=>setShowNew(s=>!s)}
              style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                background:"none",border:"none",color:T2,cursor:"pointer",fontSize:13,fontWeight:600}}>
              {showNew?"Hide":"Show"}
            </button>
          </div>
          <Lbl>Confirm new password</Lbl>
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleChange()}
            placeholder="Repeat new password" style={{...IS,marginBottom:24}}/>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose}
              style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",
                background:"rgba(255,255,255,0.08)",color:T2,fontSize:15,fontWeight:600,cursor:"pointer"}}>
              Cancel
            </button>
            <button onClick={handleChange} disabled={!cur||!next||!confirm||loading}
              style={{flex:2,padding:"14px 0",borderRadius:14,border:"none",cursor:"pointer",
                background:cur&&next&&confirm&&!loading?ACC:"rgba(255,255,255,0.08)",
                color:cur&&next&&confirm&&!loading?"#fff":T2,fontSize:15,fontWeight:700}}>
              {loading?"Updating…":"Update password"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

// ─────────────────────────────────────────
// PROFILE SHEET
// ─────────────────────────────────────────
function ProfileSheet({ onClose, onChangePw, onSignOut }) {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName||"");
  const [lastName,  setLastName]  = useState(user?.lastName||"");
  const [loading,   setLoading]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [err,       setErr]       = useState("");

  const email    = user?.primaryEmailAddress?.emailAddress||"";
  const initials = ((user?.firstName||"")[0]||(email[0]||"?")).toUpperCase();

  async function saveProfile() {
    setLoading(true); setErr(""); setSaved(false);
    try {
      await user.update({ firstName:firstName.trim(), lastName:lastName.trim() });
      setSaved(true);
      setTimeout(()=>setSaved(false),2000);
    } catch(e) {
      setErr(e.errors?.[0]?.message||"Could not update profile.");
    }
    setLoading(false);
  }

  return (
    <Sheet onClose={onClose} tall>
      <div style={{fontSize:20,fontWeight:800,color:T1,marginBottom:24}}>Profile</div>

      {/* Avatar */}
      <div style={{width:64,height:64,borderRadius:32,background:ACC,display:"flex",alignItems:"center",
        justifyContent:"center",fontSize:26,fontWeight:800,color:"#fff",margin:"0 auto 24px"}}>
        {initials}
      </div>

      {err&&<div style={{...gl(),borderRadius:12,padding:"12px 14px",marginBottom:14,
        border:`1px solid ${PINK}40`,background:`${PINK}12`,
        fontSize:13,color:"rgba(255,255,255,0.9)",lineHeight:1.5}}>{err}</div>}
      {saved&&<div style={{...gl(),borderRadius:12,padding:"12px 14px",marginBottom:14,
        border:"1px solid #34C75940",background:"#34C75912",
        fontSize:13,color:GREEN,fontWeight:600}}>Profile updated</div>}

      <Lbl>First name</Lbl>
      <input value={firstName} onChange={e=>setFirstName(e.target.value)}
        placeholder="First name" style={{...IS,marginBottom:12}}/>

      <Lbl>Last name</Lbl>
      <input value={lastName} onChange={e=>setLastName(e.target.value)}
        placeholder="Last name" style={{...IS,marginBottom:12}}/>

      <Lbl>Email</Lbl>
      <div style={{...IS,marginBottom:24,color:T2,cursor:"default",userSelect:"text"}}>{email}</div>

      <button onClick={saveProfile} disabled={loading}
        style={{width:"100%",padding:"15px",borderRadius:16,border:"none",cursor:"pointer",
          background:loading?  "rgba(255,255,255,0.08)":ACC,
          color:loading?T2:"#fff",fontSize:16,fontWeight:700,marginBottom:20}}>
        {loading?"Saving…":"Save changes"}
      </button>

      <div style={{height:1,background:BORD,marginBottom:16}}/>

      <button onClick={onChangePw}
        style={{width:"100%",padding:"14px 18px",borderRadius:14,border:`1px solid ${BORD}`,
          background:"rgba(255,255,255,0.04)",color:T1,fontSize:15,fontWeight:600,
          cursor:"pointer",textAlign:"left",marginBottom:10}}>
        Change password
      </button>
      <button onClick={onSignOut}
        style={{width:"100%",padding:"14px 18px",borderRadius:14,border:`1px solid ${PINK}30`,
          background:`${PINK}10`,color:PINK,fontSize:15,fontWeight:600,
          cursor:"pointer",textAlign:"left"}}>
        Sign out
      </button>
    </Sheet>
  );
}

// ─────────────────────────────────────────
// SUBTASK MODAL
// ─────────────────────────────────────────
function SubtaskModal({ initial, onAdd, onClose }) {
  const [text, setText] = useState(initial||"");
  const [dur,  setDur]  = useState(30);
  const [time, setTime] = useState("");
  const [due,  setDue]  = useState("");
  const [showTime, setShowTime] = useState(false);
  const [showDue,  setShowDue]  = useState(false);

  function confirm() {
    if(!text.trim()) return;
    onAdd({ id:uid(), text:text.trim(), done:false, dur:dur||30,
      time:showTime?time:"", due:showDue?due:"" });
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <div style={{fontSize:17,fontWeight:700,color:T1,marginBottom:20}}>Add subtask</div>

      <Lbl>Subtask</Lbl>
      <input value={text} onChange={e=>setText(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&confirm()} autoFocus
        placeholder="What needs to be done?"
        style={{...IS,marginBottom:16,fontSize:15}}/>

      <Lbl>Duration (min)</Lbl>
      <input type="number" value={dur} onChange={e=>setDur(+e.target.value)} placeholder="30"
        style={{...IS,marginBottom:16}}/>

      {showTime ? (
        <>
          <Lbl>Time</Lbl>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)}
            style={{...IS,marginBottom:8}}/>
          <button onClick={()=>{setShowTime(false);setTime("");}}
            style={{background:"none",border:"none",color:T2,fontSize:12,cursor:"pointer",marginBottom:14,padding:0}}>
            Remove time
          </button>
        </>
      ) : (
        <button onClick={()=>setShowTime(true)}
          style={{...gl(),borderRadius:10,padding:"10px 14px",border:`0.5px solid ${BORD2}`,
            background:"transparent",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",
            width:"100%",textAlign:"left",marginBottom:10}}>
          + Schedule a time
        </button>
      )}

      {showDue ? (
        <>
          <Lbl>Due date</Lbl>
          <input type="date" value={due} onChange={e=>setDue(e.target.value)}
            style={{...IS,marginBottom:8}}/>
          <button onClick={()=>{setShowDue(false);setDue("");}}
            style={{background:"none",border:"none",color:T2,fontSize:12,cursor:"pointer",marginBottom:20,padding:0}}>
            Remove due date
          </button>
        </>
      ) : (
        <button onClick={()=>setShowDue(true)}
          style={{...gl(),borderRadius:10,padding:"10px 14px",border:`0.5px solid ${BORD2}`,
            background:"transparent",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",
            width:"100%",textAlign:"left",marginBottom:20}}>
          + Add due date
        </button>
      )}

      <button onClick={confirm} disabled={!text.trim()}
        style={{width:"100%",padding:"15px",borderRadius:14,border:"none",
          background:text.trim()?ACC:"rgba(255,255,255,0.08)",
          color:text.trim()?"#fff":T2,fontSize:15,fontWeight:700,cursor:"pointer"}}>
        Add subtask
      </button>
    </Sheet>
  );
}

// ─────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────
export default function App() {
  const [areas,  setAreas]  = useState(()=>load("los_areas",  DEFAULT_AREAS));
  const [tasks,  setTasks]  = useState(()=>load("los_tasks",  DEFAULT_TASKS).map(t=>({subtasks:[],...t})));
  const [view,   setView]   = useState("home");
  const [tab,    setTab]    = useState("home");
  const [activeArea,   setActiveArea]  = useState(null);
  const [showDone,     setShowDone]    = useState(false);
  const [expandedArea, setExpandedArea] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  const [detailId,    setDetailId]    = useState(null);
  const [editForm,    setEditForm]    = useState(null);
  const [newT,        setNewT]        = useState({text:"",area:"inbox",priority:"med",due:"",time:"",dur:30,desc:"",notes:"",subtasks:[]});
  const [newSubText,  setNewSubText]  = useState("");   // add-subtask input in task detail
  const [newTSubText, setNewTSubText] = useState("");   // add-subtask input in new-task form
  const [newDay,      setNewDay]      = useState("today");
  const [showAreaMgr, setShowAreaMgr] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm,    setAreaForm]    = useState({label:"",sub:"",icon:"⊙"});
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [aiMode,    setAiMode]    = useState("brain");
  const [aiInput,   setAiInput]   = useState("");
  const [aiLoad,    setAiLoad]    = useState(false);
  const [aiErr,     setAiErr]     = useState("");
  const [messages,  setMessages]  = useState([]); // conversation thread

  // ── Clerk auth ──
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useAuth();
  const { user } = useUser();
  const displayName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "";
  const [syncEnabled,   setSyncEnabled]   = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [showChangePw,  setShowChangePw]  = useState(false);
  const [detailShowTime, setDetailShowTime] = useState(false);
  const [detailShowDue,  setDetailShowDue]  = useState(false);
  const [subDueEditId,   setSubDueEditId]   = useState(null);
  const [subTimeEditId,  setSubTimeEditId]  = useState(null);
  const [newTShowTime,   setNewTShowTime]   = useState(false);
  const [newTShowDue,    setNewTShowDue]    = useState(false);
  const [schedDate,      setSchedDate]      = useState(()=>new Date());
  const [schedViewMode,  setSchedViewMode]  = useState("day"); // "day" | "month"
  const [subModal,       setSubModal]       = useState({open:false,text:"",dur:30,time:"",due:"",ctx:"detail"});
  const [showBrainDump, setShowBrainDump] = useState(false);

  // ── Focus timer ──
  const [focusTaskId,   setFocusTaskId]   = useState(null);
  const [focusTimeLeft, setFocusTimeLeft] = useState(1500);
  const [focusRunning,  setFocusRunning]  = useState(false);
  const [focusSessions, setFocusSessions] = useState(0);
  const [focusStreak,   setFocusStreak]   = useState(0);
  const [focusTodayMin, setFocusTodayMin] = useState(0);

  const tasksRef      = useRef(tasks);
  const editFormRef   = useRef(editForm);
  const activeAreaRef = useRef(activeArea);
  const newTRef       = useRef(newT);
  const messagesRef   = useRef(messages);
  const getTokenRef   = useRef(getToken);
  const prevViewRef   = useRef("home");
  useEffect(()=>{ tasksRef.current      = tasks;    },[tasks]);
  useEffect(()=>{ editFormRef.current   = editForm; },[editForm]);
  useEffect(()=>{ activeAreaRef.current = activeArea; },[activeArea]);
  useEffect(()=>{ newTRef.current       = newT;     },[newT]);
  useEffect(()=>{ messagesRef.current   = messages; },[messages]);
  useEffect(()=>{ getTokenRef.current   = getToken; },[getToken]);

  // ── Persist to localStorage (offline cache) ──
  useEffect(()=>save("los_areas",areas),[areas]);
  useEffect(()=>save("los_tasks",tasks),[tasks]);

  // ── Load data from Neon on sign-in ──
  async function authFetch(url, opts={}){
    const token=await getTokenRef.current();
    return fetch(url,{...opts,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...(opts.headers||{})}});
  }

  useEffect(()=>{
    if(!isSignedIn||!userId) return;
    const lastId=localStorage.getItem("los_userid");
    const switched=lastId&&lastId!==userId;
    if(switched){
      localStorage.removeItem("los_areas");
      localStorage.removeItem("los_tasks");
    }
    localStorage.setItem("los_userid",userId);
    Promise.all([authFetch("/api/areas"),authFetch("/api/tasks")])
      .then(async([ar,tr])=>{
        if(!ar.ok) { console.error("areas load failed:",ar.status,await ar.text()); }
        if(!tr.ok) { console.error("tasks load failed:",tr.status,await tr.text()); }
        const aData = ar.ok ? await ar.json().catch(()=>[]) : [];
        const tData = tr.ok ? await tr.json().catch(()=>[]) : [];
        if(switched){
          setAreas(aData?.length ? aData : DEFAULT_AREAS);
          setTasks(tData?.length ? tData.map(t=>({subtasks:[],...t})) : []);
        } else {
          if(aData?.length) setAreas(aData);
          if(tData?.length) setTasks(tData.map(t=>({subtasks:[],...t})));
        }
      })
      .catch(e=>console.error("Data load network error:",e))
      .finally(()=>setSyncEnabled(true)); // always enable sync even on error
  },[isSignedIn,userId]);

  // ── Focus timer interval ──
  useEffect(()=>{
    if(!focusRunning) return;
    const id=setInterval(()=>{
      setFocusTimeLeft(t=>{
        if(t<=1){
          clearInterval(id);
          setFocusRunning(false);
          setFocusSessions(s=>s+1);
          setFocusTodayMin(m=>m+25);
          setFocusStreak(s=>s+1);
          setTasks(ts=>ts.map(t=>{
            if(t.id!==focusTaskId) return t;
            const subs=t.subtasks||[];
            return subs.length>0&&subs.every(s=>s.done)?{...t,done:true}:t;
          }));
          return 1500;
        }
        return t-1;
      });
    },1000);
    return ()=>clearInterval(id);
  },[focusRunning,focusTaskId]);

  // ── Debounced sync to Neon on change ──
  useEffect(()=>{
    if(!isSignedIn||!syncEnabled) return;
    const timer=setTimeout(()=>{
      authFetch("/api/areas",{method:"POST",body:JSON.stringify({areas})})
        .then(r=>{ if(!r.ok) r.text().then(t=>console.error("areas sync failed:",r.status,t)); })
        .catch(e=>console.error("areas sync error:",e));
    },800);
    return ()=>clearTimeout(timer);
  },[areas,isSignedIn,syncEnabled]);

  useEffect(()=>{
    if(!isSignedIn||!syncEnabled) return;
    const timer=setTimeout(()=>{
      authFetch("/api/tasks",{method:"POST",body:JSON.stringify({tasks})})
        .then(r=>{ if(!r.ok) r.text().then(t=>console.error("tasks sync failed:",r.status,t)); })
        .catch(e=>console.error("tasks sync error:",e));
    },800);
    return ()=>clearTimeout(timer);
  },[tasks,isSignedIn,syncEnabled]);

  const toggle    = useCallback((id)=>{
    setTasks(ts=>{
      const updated=ts.map(t=>t.id===id?{...t,done:!t.done}:t);
      const task=updated.find(t=>t.id===id);
      // If recurring and just marked done, reset after 2s
      if(task?.done&&task?.recurring){
        setTimeout(()=>setTasks(ts2=>ts2.map(t=>t.id===id?{...t,done:false,subtasks:(t.subtasks||[]).map(s=>({...s,done:false}))}:t)),2000);
      }
      return updated;
    });
  },[]);
  const delTask   = useCallback((id)=>{
    setTasks(ts=>ts.filter(t=>t.id!==id)); setDetailId(null); setEditForm(null);
    getTokenRef.current().then(token=>fetch(`/api/tasks?id=${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}}));
  },[]);
  const toggleSub = useCallback((taskId,subId)=>{
    setTasks(ts=>ts.map(t=>t.id===taskId
      ?{...t,subtasks:(t.subtasks||[]).map(s=>s.id===subId?{...s,done:!s.done}:s)}
      :t));
  },[]);

  const openDetail  = useCallback((id)=>{
    const t=tasksRef.current.find(x=>x.id===id);
    if(!t) return;
    setEditForm({...t});
    setDetailId(id);
    setDetailShowTime(!!(t.time||(t.dur&&t.dur!==30)));
    setDetailShowDue(!!t.due);
    setSubDueEditId(null);
    setSubTimeEditId(null);
    setView(v=>{ prevViewRef.current=v; return "task-detail"; });
  },[]);

  const saveDetail  = useCallback(()=>{
    const f=editFormRef.current;
    setTasks(ts=>ts.map(t=>t.id===f.id?{...f}:t));
    setDetailId(null); setEditForm(null);
    setView(prevViewRef.current||"home");
  },[]);

  const closeDetail = useCallback(()=>{
    setDetailId(null); setEditForm(null);
    setView(prevViewRef.current||"home");
  },[]);

  const addManual   = useCallback(()=>{
    const n=newTRef.current;
    if(!n.text.trim()) return;
    setTasks(ts=>[...ts,{...n,id:uid(),done:false,subtasks:n.subtasks||[]}]);
    const aa=activeAreaRef.current;
    setNewT({text:"",area:aa||"inbox",priority:"med",due:"",time:"",dur:30,desc:"",notes:""});
    setView(aa?"area":"home");
  },[]);

  const openNewArea  = useCallback(()=>{ setEditingArea(null); setAreaForm({label:"",sub:"",icon:"⊙"}); setShowAreaMgr(true); },[]);
  const openEditArea = useCallback((a)=>{ setEditingArea(a); setAreaForm({label:a.label,sub:a.sub,icon:a.icon}); setShowAreaMgr(true); },[]);
  const closeAreaMgr = useCallback(()=>setShowAreaMgr(false),[]);

  const saveArea = useCallback(()=>{
    setAreaForm(f=>{
      if(!f.label.trim()) return f;
      setEditingArea(ea=>{
        if(ea){
          setAreas(as=>as.map(a=>a.id===ea.id?{...a,...f}:a));
        } else {
          const id=f.label.toLowerCase().replace(/\s+/g,"-")+"-"+uid().slice(0,4);
          setAreas(as=>[...as,{id,label:f.label,sub:f.sub||f.label,icon:f.icon}]);
        }
        return ea;
      });
      setShowAreaMgr(false);
      return f;
    });
  },[]);

  const areaDeleteRequest = useCallback(()=>{
    setEditingArea(ea=>{ setConfirmDel(ea?.id); return ea; });
    setShowAreaMgr(false);
  },[]);

  const deleteArea = useCallback((id)=>{
    setTasks(ts=>ts.map(t=>t.area===id?{...t,area:"inbox"}:t));
    setAreas(as=>as.filter(a=>a.id!==id));
    setConfirmDel(null);
    setActiveArea(aa=>{ if(aa===id){ setView("home"); return null; } return aa; });
    getTokenRef.current().then(token=>fetch(`/api/areas?id=${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token}`}}));
  },[]);

  const runAI = useCallback(async()=>{
    const input=aiInput.trim(); const mode=aiMode;
    if(!input||aiLoad) return;
    const userMsg={id:uid(),role:"user",text:input};
    const history=messagesRef.current;
    setMessages(prev=>[...prev,userMsg]);
    setAiInput(""); setAiLoad(true); setAiErr("");
    try{
      // Build full conversation for the API
      const apiMsgs=[...history,userMsg].map(m=>({
        role:m.role,
        content:m.role==="user"
          ? (history.length===0&&mode==="email"
              ?`Extract all actions from this email and build tasks with subtasks:\n\n${m.text}`
              : history.length===0
              ?`${m.text}\n\nResearch this thoroughly using web search if needed. Build me tasks with detailed subtasks I can act on immediately.`
              : m.text)
          : m.text
      }));
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{
          "Content-Type":"application/json",
          "x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:2000,
          system:AI_SYS,
          tools:[{type:"web_search_20250305",name:"web_search"}],
          messages:apiMsgs,
        })
      });
      const d=await res.json();
      if(!res.ok){
        const msg=d?.error?.message||`API error ${res.status}`;
        if(res.status===429) throw new Error("Rate limit — wait 30s and try again");
        if(res.status===401) throw new Error("Invalid API key — check VITE_ANTHROPIC_KEY");
        throw new Error(msg);
      }
      const textBlock=d.content?.filter(b=>b.type==="text").pop();
      const raw=textBlock?.text||"";
      const cleaned=raw.replace(/```json|```/g,"").trim();
      const jsonMatch=cleaned.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No JSON found in response");
      const parsed=JSON.parse(jsonMatch[0]);
      const tasks=(parsed.tasks||[]).map(t=>({
        ...t,id:uid(),done:false,desc:t.notes||"",notes:"",
        subtasks:(t.subtasks||[]).map(s=>({id:uid(),text:s.text||s,done:false}))
      }));
      const assistantMsg={id:uid(),role:"assistant",text:raw,parsed,tasks,tasksAdded:false};
      setMessages(prev=>[...prev,assistantMsg]);
    }catch(e){
      setAiErr(e.message||"Something went wrong. Try again.");
      setMessages(prev=>prev.filter(m=>m.id!==userMsg.id));
      console.error(e);
    }
    setAiLoad(false);
  },[aiInput,aiMode,aiLoad]);

  const urgent    = useMemo(()=>tasks.filter(t=>t.priority==="high"&&!t.done),[tasks]);
  const scheduled = useMemo(()=>[...tasks].filter(t=>t.time&&!t.done).sort((a,b)=>t2m(a.time)-t2m(b.time)),[tasks]);
  const weekDates = useMemo(()=>Array.from({length:7},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()-today.getDay()+i); return d; }),[]);


  const detailToggle = useCallback(()=>{ toggle(detailId); closeDetail(); },[detailId,toggle,closeDetail]);
  const detailDelete = useCallback(()=>delTask(detailId),[detailId,delTask]);

  const sharedTab = <TabBar tab={tab} setTab={setTab} setView={setView}/>;
  const sharedAreaMgr = (
    <AreaMgrSheet
      show={showAreaMgr} onClose={closeAreaMgr} editingArea={editingArea}
      areaForm={areaForm} setAreaForm={setAreaForm} onSave={saveArea} onDeleteRequest={areaDeleteRequest}
    />
  );

  // ── Auth guards ──
  if(!isLoaded) return (
    <div style={{...PAGE,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="ai-spinner"/>
    </div>
  );
  if(!isSignedIn) return <LoginScreen/>;

  // ══════════════════════════════════
  // HOME
  // ══════════════════════════════════
  if(view==="home"){
    const totalOpen=tasks.filter(t=>!t.done).length;
    // Today's focus list: scheduled first, then urgent-only, deduplicated
    const scheduledIds = new Set(scheduled.map(t=>t.id));
    const pinnedToday  = tasks.filter(t=>t.pinToday&&!t.done&&!scheduledIds.has(t.id));
    const pinnedIds    = new Set(pinnedToday.map(t=>t.id));
    const todayTasks   = [
      ...scheduled,
      ...pinnedToday,
      ...urgent.filter(t=>!t.done&&!scheduledIds.has(t.id)&&!pinnedIds.has(t.id)),
    ];
    return (
    <div style={PAGE}>
      <div style={{position:"relative",zIndex:1,paddingBottom:110}}>

        {/* ── Header ── */}
        <div style={{padding:"52px 20px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            {/* Left: progress ring + greeting */}
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <ProgressRing pct={todayTasks.length>0?Math.round(todayTasks.filter(t=>t.done).length/todayTasks.length*100):0}/>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:T1,lineHeight:1.2}}>{greet()}{displayName?`, ${displayName}`:""}</div>
                <div style={{fontSize:10,color:MUTED,marginTop:3}}>{todayTasks.length} tasks · {todayTasks.filter(t=>!t.done).length} left today</div>
              </div>
            </div>
            {/* Right: account + add */}
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setShowProfile(true)}
                style={{padding:"6px 14px",borderRadius:20,background:"rgba(255,255,255,0.07)",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,color:T2}}>
                Account
              </button>
              <button onClick={()=>{ setNewT({text:"",area:"inbox",priority:"med",due:"",time:"",dur:30,desc:"",notes:"",subtasks:[]}); setView("new-task"); }}
                style={{width:46,height:46,borderRadius:23,background:ACC,border:"none",cursor:"pointer",fontSize:24,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
            </div>
          </div>

          {/* ── Brain dump button ── */}
          <button onClick={()=>setShowBrainDump(true)}
            style={{width:"100%",background:"#0D1A35",border:`0.5px solid ${ACC}`,borderRadius:10,
              padding:"11px 14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:16}}>
            <div style={{width:20,height:20,borderRadius:10,background:ACC,display:"flex",
              alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff",fontWeight:700,fontSize:14}}>+</div>
            <span style={{fontSize:11,fontWeight:500,color:ACC}}>Brain dump…</span>
          </button>

          {/* ── Today card with task list ── */}
          <div style={{...gl(),borderRadius:20,marginBottom:20,overflow:"hidden"}}>
            <div style={{padding:"12px 16px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:12,fontWeight:700,color:T1,letterSpacing:.5}}>Today</div>
              <div style={{display:"flex",gap:10}}>
                {urgent.length>0&&<span style={{fontSize:11,fontWeight:700,color:PINK}}>{urgent.length} urgent</span>}
                {scheduled.length>0&&<span style={{fontSize:11,fontWeight:700,color:ACC}}>{scheduled.length} scheduled</span>}
              </div>
            </div>
            {todayTasks.length>0 ? todayTasks.map((t,i)=>{
              const a=getArea(areas,t.area);
              return (
                <div key={t.id} style={{opacity:t.done?0.45:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,
                    padding:"9px 16px",background:i%2===0?SURF:"transparent",
                    borderRadius:i===0?"0":"none"}}>
                    {/* SVG circle checkbox */}
                    <button onClick={()=>toggle(t.id)}
                      style={{background:"none",border:"none",cursor:"pointer",padding:0,
                        display:"flex",alignItems:"center",flexShrink:0}}>
                      {Icon.checkCircle(t.done)}
                    </button>
                    {/* Task text + meta */}
                    <div style={{flex:1,minWidth:0}} onClick={()=>openDetail(t.id)}>
                      <div style={{fontSize:11,fontWeight:500,color:"#D0D8FF",
                        textDecoration:t.done?"line-through":"none",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.text}</div>
                      <div style={{fontSize:9,color:MUTED,marginTop:1}}>{a.label}</div>
                    </div>
                    {/* Tag pill */}
                    {t.priority==="high"&&!t.done&&(
                      <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:999,
                        background:"#2E0D0D",color:RED,flexShrink:0}}>Urgent</span>
                    )}
                    {t.time&&!t.done&&(
                      <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:999,
                        background:"#0D1A35",color:ACC,flexShrink:0}}>{fmt(t.time)}</span>
                    )}
                  </div>
                  {i<todayTasks.length-1&&<div style={{height:1,background:BORD,marginLeft:44}}/>}
                </div>
              );
            }) : (
              <div style={{padding:"16px 18px 18px",fontSize:13,color:T2}}>
                {totalOpen===0?"All caught up — nothing open today.":"No urgent or scheduled tasks."}
              </div>
            )}
          </div>
        </div>

        {/* ── Area grid with accordion ── */}
        <div style={{padding:"0 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <Lbl>My areas</Lbl>
            <button onClick={openNewArea} style={{fontSize:12,fontWeight:700,color:ACC,background:"none",border:"none",cursor:"pointer"}}>+ New</button>
          </div>

          {/* Expanded area — full width above the grid */}
          {expandedArea && (()=>{
            const ea=getArea(areas,expandedArea);
            const eaIdx=areas.findIndex(a=>a.id===expandedArea);
            const eaT=AREA_THEMES[eaIdx%AREA_THEMES.length];
            const eaOpen=tasks.filter(t=>t.area===expandedArea&&!t.done);
            return (
              <div style={{marginBottom:12}}>
                {/* Themed header — tap to collapse */}
                <div style={{background:eaT.bg,border:`0.5px solid ${eaT.border}`,borderBottom:"none",borderRadius:"18px 18px 0 0",padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
                  onClick={()=>{ setExpandedArea(null); setExpandedTask(null); }}>
                  <div style={{width:40,height:40,borderRadius:12,background:eaT.accent+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:eaT.accent}}>{ea.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:T1}}>{ea.label}</div>
                    <div style={{fontSize:12,color:T2}}>{eaOpen.length} open</div>
                  </div>
                  <span style={{color:eaT.accent,fontSize:18,display:"inline-block",transform:"rotate(90deg)"}}>›</span>
                </div>
                {/* Task list */}
                <div style={{...gl(),borderRadius:"0 0 20px 20px",overflow:"hidden",borderTop:"none"}}>
                  {eaOpen.length>0 ? eaOpen.map((t,i)=>{
                    const subs=t.subtasks||[];
                    const isExpT=expandedTask===t.id;
                    return (
                      <div key={t.id}>
                        {/* Task row — tap body to toggle subtasks */}
                        <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}
                          onClick={()=>setExpandedTask(et=>et===t.id?null:t.id)}>
                          <button onClick={e=>{ e.stopPropagation(); toggle(t.id); }}
                            style={{width:24,height:24,borderRadius:12,border:`2px solid ${eaT.accent}70`,background:"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          </button>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:15,fontWeight:600,color:T1,lineHeight:1.3}}>{t.text}</div>
                            {subs.length>0&&(
                              <div style={{fontSize:11,color:T2,marginTop:2}}>{subs.filter(s=>s.done).length}/{subs.length} subtasks</div>
                            )}
                            {t.time&&<div style={{fontSize:11,color:T2,marginTop:1}}>{fmt(t.time)}{t.dur?` · ${t.dur}m`:""}</div>}
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                            {subs.length>0&&(
                              <span style={{fontSize:13,color:eaT.accent,display:"inline-block",transition:"transform 0.2s",transform:isExpT?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                            )}
                            <span onClick={e=>{ e.stopPropagation(); openDetail(t.id); }}
                              style={{fontSize:13,color:"rgba(255,255,255,0.2)",cursor:"pointer",padding:"2px 4px"}}>⋯</span>
                          </div>
                        </div>
                        {/* Subtasks */}
                        {isExpT&&subs.length>0&&(
                          <div style={{marginLeft:52,marginRight:16,marginBottom:10,borderRadius:12,overflow:"hidden",border:`1px solid ${eaT.accent}25`,background:`${eaT.accent}0D`}}>
                            {subs.map((s,si)=>(
                              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:si<subs.length-1?`1px solid ${BORD}`:"none"}}>
                                <button onClick={()=>toggleSub(t.id,s.id)}
                                  style={{width:18,height:18,borderRadius:9,border:s.done?"none":`1.5px solid ${eaT.accent}60`,background:s.done?GREEN:"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {s.done&&<span style={{color:"#fff",fontSize:9}}>✓</span>}
                                </button>
                                <span style={{fontSize:13,color:s.done?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.85)",textDecoration:s.done?"line-through":"none",flex:1,lineHeight:1.3}}>{s.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {i<eaOpen.length-1&&<div style={{height:1,background:BORD,marginLeft:16}}/>}
                      </div>
                    );
                  }) : (
                    <div style={{padding:"20px 18px",textAlign:"center",color:T2,fontSize:13}}>All done in {ea.label} ✓</div>
                  )}
                  <button onClick={()=>{ setActiveArea(expandedArea); setView("area"); setShowDone(false); }}
                    style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderTop:`1px solid ${BORD}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:13,fontWeight:700,color:ACC}}>View all & completed</span>
                    <span style={{color:ACC,fontSize:14}}>›</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 2-column grid — non-expanded areas */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {areas.filter(a=>a.id!==expandedArea).map(a=>{
              const i=areas.findIndex(ar=>ar.id===a.id);
              const th=AREA_THEMES[i%AREA_THEMES.length];
              const at=tasks.filter(t=>t.area===a.id);
              const openC=at.filter(t=>!t.done).length;
              const doneC=at.filter(t=>t.done).length;
              const pct=at.length?Math.round(doneC/at.length*100):0;
              return (
                <div key={a.id}
                  style={{background:th.bg,border:`0.5px solid ${th.border}`,borderRadius:18,padding:"18px 16px",cursor:"pointer",position:"relative",minHeight:160,display:"flex",flexDirection:"column",justifyContent:"space-between"}}
                  onClick={()=>{ setExpandedArea(a.id); setExpandedTask(null); }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{width:44,height:44,borderRadius:12,background:th.accent+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:th.accent}}>{a.icon}</div>
                    <button onClick={e=>{ e.stopPropagation(); openEditArea(a); }}
                      style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,width:26,height:26,cursor:"pointer",fontSize:11,color:T2,display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:T2,marginBottom:4}}>{a.label}</div>
                    <div style={{fontSize:32,fontWeight:800,color:th.accent,lineHeight:1,marginBottom:10}}>{openC}</div>
                    <div style={{height:2,borderRadius:2,background:BORD}}>
                      <div style={{height:2,borderRadius:2,background:th.accent,width:`${pct}%`,transition:"width 0.4s"}}/>
                    </div>
                  </div>
                </div>
              );
            })}
            <div onClick={openNewArea}
              style={{borderRadius:22,padding:"20px 18px",cursor:"pointer",border:`2px dashed rgba(255,255,255,0.15)`,minHeight:170,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8}}>
              <div style={{width:46,height:46,borderRadius:14,background:"rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:T2}}>+</div>
              <div style={{fontSize:13,fontWeight:600,color:T2}}>New area</div>
            </div>
          </div>
        </div>
      </div>
      {sharedTab}
      {sharedAreaMgr}
      {confirmDel && <ConfirmDelete name={getArea(areas,confirmDel).label} onCancel={()=>setConfirmDel(null)} onConfirm={()=>deleteArea(confirmDel)}/>}
      {showProfile && !showChangePw && (
        <ProfileSheet
          onClose={()=>setShowProfile(false)}
          onChangePw={()=>setShowChangePw(true)}
          onSignOut={()=>{ signOut(); setShowProfile(false); }}
        />
      )}
      {showChangePw && <ChangePasswordSheet onClose={()=>{ setShowChangePw(false); setShowProfile(false); }}/>}
      {showBrainDump && (
        <BrainDumpSheet
          onClose={()=>setShowBrainDump(false)}
          getToken={getToken}
          onAddTasks={(taskTexts)=>{
            setTasks(ts=>[...ts,...taskTexts.map(text=>({
              id:uid(),text,area:"inbox",done:false,priority:"med",
              due:"",time:"",dur:30,desc:"",notes:"",subtasks:[],
            }))]);
          }}
        />
      )}
    </div>
  );}

  // ══════════════════════════════════
  // TASK DETAIL
  // ══════════════════════════════════
  if(view==="task-detail"){
    if(!detailId||!editForm) return null;
    const td=editForm;
    const tdArea=getArea(areas,td.area);
    const tdIdx=areas.findIndex(a=>a.id===td.area);
    const tdT=AREA_THEMES[tdIdx%AREA_THEMES.length];
    const tdSubs=td.subtasks||[];
    const tdSubDone=tdSubs.filter(s=>s.done).length;
    function toggleSubLocal(sid){
      setEditForm(f=>({...f,subtasks:f.subtasks.map(s=>s.id===sid?{...s,done:!s.done}:s)}));
    }
    return (
      <div style={PAGE}>
        <div style={{padding:"52px 20px 140px"}}>
          {/* Back nav */}
          <button onClick={closeDetail}
            style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",
              cursor:"pointer",color:ACC,marginBottom:20,padding:0}}>
            <span style={{color:ACC,display:"flex"}}>{Icon.chevronLeft(14)}</span>
            <span style={{fontSize:13,fontWeight:600,color:ACC}}>Back</span>
          </button>

          {/* Title */}
          <input value={td.text||""} onChange={e=>setEditForm(f=>({...f,text:e.target.value}))}
            style={{...IS,fontSize:17,fontWeight:700,marginBottom:12}}/>

          {/* Meta */}
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
            {td.due&&<span style={{fontSize:11,color:T2}}>Due {td.due}</span>}
            {td.time&&<span style={{fontSize:11,color:T2}}>{fmt(td.time)}{td.dur?` · ${td.dur}m`:""}</span>}
            {td.recurring&&(
              <span style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:GOLD}}>
                <span style={{display:"flex"}}>{Icon.recurring()}</span>
                {td.recurring.charAt(0).toUpperCase()+td.recurring.slice(1)}
              </span>
            )}
          </div>

          {/* Tag pills + Pin to Today */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20,alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:999,
              background:tdT.accent+"20",color:tdT.accent}}>{tdArea.label}</span>
            {td.priority==="high"&&(
              <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:999,
                background:"#2E0D0D",color:RED}}>Urgent</span>
            )}
            {td.priority==="med"&&(
              <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:999,
                background:"#0D1A35",color:ACC}}>Normal</span>
            )}
            {/* Pin to Today toggle */}
            <button onClick={()=>setEditForm(f=>({...f,pinToday:!f.pinToday}))}
              style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:999,cursor:"pointer",
                border:`0.5px solid ${td.pinToday?ACC:BORD2}`,
                background:td.pinToday?ACC+"20":"transparent",
                color:td.pinToday?ACC:T2}}>
              {td.pinToday?"★ In Today":"☆ Add to Today"}
            </button>
          </div>

          {/* Subtasks */}
          <div style={{marginBottom:20}}>
            <Lbl>Subtasks{tdSubs.length>0?` (${tdSubDone}/${tdSubs.length})`:""}</Lbl>
            {tdSubs.map(s=>(
              <div key={s.id} style={{background:SURF,borderRadius:8,padding:"8px 10px",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>toggleSubLocal(s.id)}
                    style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}>
                    {Icon.checkSquare(s.done)}
                  </button>
                  <span style={{fontSize:13,color:s.done?"rgba(255,255,255,0.3)":T2,
                    textDecoration:s.done?"line-through":"none",flex:1,lineHeight:1.3}}>{s.text}</span>
                  {s.due&&<span style={{fontSize:10,color:GOLD,flexShrink:0}}>{s.due}</span>}
                  {/* Time button */}
                  <button onClick={()=>{ setSubTimeEditId(id=>id===s.id?null:s.id); setSubDueEditId(null); }}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:10,
                      fontWeight:600,color:s.time?GOLD:T2,padding:"2px 4px",flexShrink:0}}>
                    {s.time?fmt(s.time):"+ time"}
                  </button>
                  {/* Date button */}
                  <button onClick={()=>{ setSubDueEditId(id=>id===s.id?null:s.id); setSubTimeEditId(null); }}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:10,
                      fontWeight:600,color:s.due?ACC:T2,padding:"2px 4px",flexShrink:0}}>
                    {s.due?s.due:"+ date"}
                  </button>
                  <button onClick={()=>setEditForm(f=>({...f,subtasks:f.subtasks.filter(sub=>sub.id!==s.id)}))}
                    style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:15,cursor:"pointer",padding:"0 2px",flexShrink:0}}>×</button>
                </div>
                {subTimeEditId===s.id&&(
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <input type="time" value={s.time||""}
                      onChange={e=>setEditForm(f=>({...f,subtasks:f.subtasks.map(sub=>sub.id===s.id?{...sub,time:e.target.value}:sub)}))}
                      style={{...IS,flex:1,padding:"7px 10px",fontSize:12}}/>
                    <input type="number" placeholder="min" value={s.dur||""}
                      onChange={e=>setEditForm(f=>({...f,subtasks:f.subtasks.map(sub=>sub.id===s.id?{...sub,dur:+e.target.value}:sub)}))}
                      style={{...IS,width:70,padding:"7px 10px",fontSize:12}}/>
                  </div>
                )}
                {subDueEditId===s.id&&(
                  <input type="date" value={s.due||""}
                    onChange={e=>setEditForm(f=>({...f,subtasks:f.subtasks.map(sub=>sub.id===s.id?{...sub,due:e.target.value}:sub)}))}
                    style={{...IS,marginTop:6,padding:"7px 10px",fontSize:12}}/>
                )}
              </div>
            ))}
            {/* Add subtask — opens modal */}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <input value={newSubText} onChange={e=>setNewSubText(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") setSubModal({open:true,text:newSubText,ctx:"detail"}); }}
                placeholder="Add a subtask…"
                style={{...IS,flex:1,padding:"9px 12px",fontSize:13}}/>
              <button onClick={()=>setSubModal({open:true,text:newSubText,ctx:"detail"})}
                style={{padding:"9px 14px",borderRadius:12,border:"none",
                  background:ACC,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                Add
              </button>
            </div>
            {subModal.open&&subModal.ctx==="detail"&&(
              <SubtaskModal
                initial={subModal.text}
                onClose={()=>{ setSubModal(s=>({...s,open:false})); setNewSubText(""); }}
                onAdd={sub=>{ setEditForm(f=>({...f,subtasks:[...f.subtasks,sub]})); setNewSubText(""); }}
              />
            )}
          </div>

          {/* Description + Notes */}
          <Lbl>Description</Lbl>
          <textarea value={td.desc||""} onChange={e=>setEditForm(f=>({...f,desc:e.target.value}))}
            placeholder="Add more context…"
            style={{...IS,resize:"none",minHeight:60,marginBottom:12,lineHeight:1.5}}/>
          <Lbl>Notes</Lbl>
          <textarea value={td.notes||""} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}
            placeholder="Links, references…"
            style={{...IS,resize:"none",minHeight:48,marginBottom:16,lineHeight:1.5}}/>

          {/* Area + Priority */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div>
              <Lbl>Area</Lbl>
              <select value={td.area||"inbox"} onChange={e=>setEditForm(f=>({...f,area:e.target.value}))} style={IS}>
                {areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Priority</Lbl>
              <select value={td.priority||"med"} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))} style={IS}>
                <option value="high">Urgent</option>
                <option value="med">Normal</option>
                <option value="low">Later</option>
              </select>
            </div>
          </div>

          {/* Time + Duration — collapsed by default */}
          {detailShowTime ? (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                <div><Lbl>Time</Lbl><input type="time" value={td.time||""} onChange={e=>setEditForm(f=>({...f,time:e.target.value}))} style={IS}/></div>
                <div><Lbl>Duration (min)</Lbl><input type="number" value={td.dur||""} onChange={e=>setEditForm(f=>({...f,dur:+e.target.value}))} style={IS}/></div>
              </div>
              <button onClick={()=>{setDetailShowTime(false);setEditForm(f=>({...f,time:"",dur:30}));}}
                style={{background:"none",border:"none",color:T2,fontSize:12,cursor:"pointer",marginBottom:14,padding:0}}>
                Remove time
              </button>
            </>
          ) : (
            <button onClick={()=>setDetailShowTime(true)}
              style={{...gl(),borderRadius:10,padding:"10px 14px",border:`0.5px solid ${BORD2}`,
                background:"transparent",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",
                width:"100%",textAlign:"left",marginBottom:10}}>
              + Add time &amp; duration
            </button>
          )}

          {/* Due date — collapsed by default */}
          {detailShowDue ? (
            <>
              <Lbl>Due date</Lbl>
              <input type="date" value={td.due||""} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))}
                style={{...IS,marginBottom:8}}/>
              <button onClick={()=>{setDetailShowDue(false);setEditForm(f=>({...f,due:""}));}}
                style={{background:"none",border:"none",color:T2,fontSize:12,cursor:"pointer",marginBottom:14,padding:0}}>
                Remove due date
              </button>
            </>
          ) : (
            <button onClick={()=>setDetailShowDue(true)}
              style={{...gl(),borderRadius:10,padding:"10px 14px",border:`0.5px solid ${BORD2}`,
                background:"transparent",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",
                width:"100%",textAlign:"left",marginBottom:14}}>
              + Add due date
            </button>
          )}

          {/* Recurring */}
          <Lbl>Repeats</Lbl>
          <div style={{...gl(),borderRadius:12,padding:4,display:"flex",marginBottom:20}}>
            {[{v:null,l:"Never"},{v:"daily",l:"Daily"},{v:"weekly",l:"Weekly"},{v:"monthly",l:"Monthly"}].map(opt=>(
              <button key={String(opt.v)} onClick={()=>setEditForm(f=>({...f,recurring:opt.v}))}
                style={{flex:1,padding:"8px 4px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
                  background:(td.recurring||null)===opt.v?ACC:"transparent",
                  color:(td.recurring||null)===opt.v?"#fff":T2}}>
                {opt.l}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <button onClick={()=>{ detailToggle(); }}
              style={{flex:1,padding:"13px",borderRadius:14,border:`0.5px solid ${td.done?GREEN:ACC}`,
                background:td.done?GREEN+"15":ACC+"15",color:td.done?GREEN:ACC,
                fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {td.done?"Undo":"Done"}
            </button>
            <button onClick={()=>detailDelete()}
              style={{flex:1,padding:"13px",borderRadius:14,border:`0.5px solid ${RED}40`,
                background:RED+"10",color:RED,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              Delete
            </button>
          </div>
          <button onClick={saveDetail}
            style={{width:"100%",padding:"15px",borderRadius:16,border:"none",background:ACC,
              color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>
            Save changes
          </button>
        </div>

        {/* Focus timer bar */}
        <div style={{position:"fixed",bottom:60,left:"50%",transform:"translateX(-50%)",
          width:"100%",maxWidth:MAX_W,background:SURF,borderTop:`0.5px solid ${BORD}`,
          padding:"12px 20px",display:"flex",alignItems:"center",gap:12,boxSizing:"border-box",zIndex:90}}>
          <span style={{color:T2,display:"flex"}}>{Icon.clock(18)}</span>
          <span style={{fontSize:15,fontWeight:700,color:T1}}>
            {String(Math.floor(focusTimeLeft/60)).padStart(2,"0")}:{String(focusTimeLeft%60).padStart(2,"0")}
          </span>
          <button onClick={()=>{
            setFocusTaskId(detailId);
            setFocusTimeLeft(1500);
            prevViewRef.current="task-detail";
            setView("focus");
          }}
            style={{marginLeft:"auto",padding:"9px 18px",borderRadius:20,border:"none",
              background:ACC,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Start focus
          </button>
        </div>
        {sharedTab}
      </div>
    );
  }

  // ══════════════════════════════════
  // FOCUS TIMER
  // ══════════════════════════════════
  if(view==="focus"){
    const focusTask=tasks.find(t=>t.id===focusTaskId);
    const mins=String(Math.floor(focusTimeLeft/60)).padStart(2,"0");
    const secs=String(focusTimeLeft%60).padStart(2,"0");
    const pct=((1500-focusTimeLeft)/1500)*100;
    const R=34, SZ=80, CIRC=2*Math.PI*R;
    const offset=CIRC-(pct/100)*CIRC;
    return (
      <div style={{...PAGE,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",padding:"40px 20px 90px",minHeight:"100vh"}}>
        <div style={{fontSize:9,fontWeight:700,color:MUTED,letterSpacing:"0.1em",
          textTransform:"uppercase",marginBottom:32}}>Focus mode</div>

        {/* Large progress ring */}
        <div style={{position:"relative",width:SZ,height:SZ,marginBottom:20}}>
          <svg width={SZ} height={SZ}>
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none" stroke="#1A1A2A" strokeWidth={5}/>
            <circle cx={SZ/2} cy={SZ/2} r={R} fill="none" stroke={ACC} strokeWidth={5}
              strokeDasharray={CIRC} strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${SZ/2} ${SZ/2})`}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:18,fontWeight:700,color:T1}}>
            {mins}:{secs}
          </div>
        </div>

        {/* Task chip */}
        {focusTask&&(
          <div style={{background:SURF,border:`0.5px solid ${BORD}`,borderRadius:20,
            padding:"6px 16px",fontSize:11,color:T2,marginBottom:32,
            maxWidth:"75%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center"}}>
            {focusTask.text}
          </div>
        )}

        {/* Controls */}
        <div style={{display:"flex",gap:16,marginBottom:40}}>
          <button onClick={()=>setFocusRunning(r=>!r)}
            style={{width:56,height:56,borderRadius:28,background:SURF,
              border:`0.5px solid ${BORD}`,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",color:T2}}>
            {focusRunning?Icon.pause():Icon.play()}
          </button>
          <button onClick={()=>{ setFocusRunning(false); setFocusTimeLeft(1500); setView(prevViewRef.current||"home"); }}
            style={{width:56,height:56,borderRadius:28,background:`${RED}15`,
              border:`0.5px solid ${RED}40`,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",color:RED}}>
            {Icon.stop()}
          </button>
        </div>

        {/* Streak stats */}
        <div style={{display:"flex",gap:10,width:"100%",maxWidth:320}}>
          {[
            {label:"Sessions",value:focusSessions,   icon:Icon.clock(14)},
            {label:"Today",   value:`${focusTodayMin}m`,icon:Icon.clock(14)},
            {label:"Streak",  value:focusStreak,     icon:Icon.flame(14)},
          ].map(s=>(
            <div key={s.label} style={{flex:1,background:SURF,border:`0.5px solid ${BORD}`,
              borderRadius:12,padding:"10px 8px",textAlign:"center"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:4,color:T2}}>
                {s.icon}
              </div>
              <div style={{fontSize:18,fontWeight:800,color:T1}}>{s.value}</div>
              <div style={{fontSize:9,color:MUTED,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>
        {sharedTab}
      </div>
    );
  }

  // ══════════════════════════════════
  // AREA DETAIL
  // ══════════════════════════════════
  if(view==="area" && activeArea) {
    const a    = getArea(areas, activeArea);
    const open = tasks.filter(t=>t.area===activeArea&&!t.done);
    const done = tasks.filter(t=>t.area===activeArea&&t.done);
    return (
      <div style={PAGE}>
        <div style={{position:"relative",zIndex:1,paddingBottom:110}}>
          <div style={{padding:"52px 20px 20px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
              <button onClick={()=>{ setView("home"); setTab("home"); }}
                style={{width:36,height:36,borderRadius:12,...gl(),border:"none",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T1}}>‹</button>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:600,color:T2,letterSpacing:1,textTransform:"uppercase"}}>{a.sub}</div>
                <div style={{fontSize:28,fontWeight:800,color:T1,letterSpacing:-0.8,lineHeight:1.1}}>{a.label}</div>
              </div>
              <button onClick={()=>openEditArea(a)} style={{width:44,height:44,borderRadius:14,background:`${ACC}20`,border:`1px solid ${ACC}35`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:ACC,cursor:"pointer"}}>{a.icon}</button>
            </div>
            <div style={{...gl(),borderRadius:16,padding:"14px 18px",display:"flex"}}>
              {[{v:open.length,l:"Open"},{v:done.length,l:"Done"},{v:tasks.filter(t=>t.area===activeArea&&t.priority==="high"&&!t.done).length,l:"Urgent",c:PINK}].map((s,i)=>(
                <div key={s.l} style={{flex:1,textAlign:"center",borderRight:i<2?`1px solid ${BORD}`:"none"}}>
                  <div style={{fontSize:26,fontWeight:800,color:s.c||T1,lineHeight:1}}>{s.v}</div>
                  <div style={{fontSize:11,color:T2,marginTop:2}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{padding:"0 20px"}}>
            {open.length>0 ? (
              <div style={{...gl(),borderRadius:20,overflow:"hidden",marginBottom:10}}>
                {open.map((t,i)=>(
                  <div key={t.id}>
                    <TaskRow t={t} onToggle={toggle} onOpen={openDetail} onToggleSub={toggleSub}/>
                    {i<open.length-1 && <div style={{height:1,background:BORD,marginLeft:58}}/>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{...gl(),borderRadius:20,padding:"40px 24px",textAlign:"center",marginBottom:10}}>
                <div style={{fontSize:36,marginBottom:8}}>✓</div>
                <div style={{fontSize:18,fontWeight:700,color:T1}}>All done</div>
                <div style={{fontSize:14,color:T2,marginTop:4}}>Nothing left in {a.label}</div>
              </div>
            )}
            {done.length>0 && (
              <div style={{...gl(),borderRadius:20,overflow:"hidden",marginBottom:10}}>
                <button onClick={()=>setShowDone(s=>!s)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:"none",border:"none",cursor:"pointer",minHeight:44}}>
                  <span style={{fontSize:12,fontWeight:700,color:T2,textTransform:"uppercase",letterSpacing:0.8}}>Completed ({done.length})</span>
                  <span style={{fontSize:14,color:T2}}>{showDone?"▾":"▸"}</span>
                </button>
                {showDone && done.map((t,i)=>(
                  <div key={t.id}>
                    <TaskRow t={t} onToggle={toggle} onOpen={openDetail} onToggleSub={toggleSub}/>
                    {i<done.length-1 && <div style={{height:1,background:BORD,marginLeft:58}}/>}
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>{ setNewT({text:"",area:activeArea,priority:"med",due:"",time:"",dur:30,desc:"",notes:"",subtasks:[]}); setView("new-task"); }}
              style={{width:"100%",padding:"15px",borderRadius:16,border:"none",background:ACC,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>
              + Add to {a.label}
            </button>
            {a.id!=="inbox" && (
              <button onClick={()=>setConfirmDel(activeArea)} style={{width:"100%",padding:"13px",borderRadius:16,border:"none",background:"transparent",color:PINK,fontSize:14,fontWeight:600,cursor:"pointer",marginTop:8}}>
                Delete this area
              </button>
            )}
          </div>
        </div>
        {sharedTab}
          {sharedAreaMgr}
        {confirmDel && <ConfirmDelete name={getArea(areas,confirmDel).label} onCancel={()=>setConfirmDel(null)} onConfirm={()=>deleteArea(confirmDel)}/>}
      </div>
    );
  }

  // ══════════════════════════════════
  // SCHEDULE
  // ══════════════════════════════════
  if(view==="schedule") {
    const sdStr    = schedDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const isToday  = schedDate.toDateString()===today.toDateString();
    const sdLabel  = schedDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
    function moveDay(n){ setSchedDate(d=>{ const nd=new Date(d); nd.setDate(nd.getDate()+n); return nd; }); }
    function moveMon(n){ setSchedDate(d=>{ const nd=new Date(d); nd.setMonth(nd.getMonth()+n); return nd; }); }

    // Day view items: timed tasks/subtasks matching the selected date
    const HOURS=Array.from({length:17},(_,i)=>i+6);
    const DS=6*60,DE=22*60,PX=1.55,TH=(DE-DS)*PX;
    const now=new Date(),nm=now.getHours()*60+now.getMinutes();
    const np=(isToday&&nm>=DS&&nm<=DE)?(nm-DS)*PX:null;
    const dayItems=[];
    for(const t of tasks){
      if(t.time&&!t.done&&(t.due===sdStr||(!t.due&&isToday)))
        dayItems.push({...t,_type:"task"});
      for(const s of (t.subtasks||[])){
        if(s.time&&!s.done&&(s.due===sdStr||(!s.due&&isToday)))
          dayItems.push({...s,dur:s.dur||30,_type:"subtask",_parentId:t.id,_parentText:t.text});
      }
    }
    dayItems.sort((a,b)=>t2m(a.time)-t2m(b.time));

    // Month view helpers
    const yr=schedDate.getFullYear(), mo=schedDate.getMonth();
    const firstWD=new Date(yr,mo,1).getDay();
    const daysInMo=new Date(yr,mo+1,0).getDate();
    const monthCells=Array.from({length:firstWD+daysInMo},(_,i)=>
      i<firstWD?null:new Date(yr,mo,i-firstWD+1)
    );
    const weeks=[];
    for(let i=0;i<monthCells.length;i+=7) weeks.push(monthCells.slice(i,i+7));
    // Dot counts per day
    const tasksByDate={};
    for(const t of tasks){
      if(t.due) tasksByDate[t.due]=(tasksByDate[t.due]||0)+1;
    }

    return (
      <div style={PAGE}>
        <div style={{position:"relative",zIndex:1,paddingBottom:110}}>
          <div style={{padding:"52px 20px 16px"}}>

            {/* View toggle */}
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:20,fontWeight:800,color:T1,flex:1,letterSpacing:-0.5}}>Schedule</div>
              <div style={{...gl(),borderRadius:10,padding:3,display:"flex"}}>
                {[{v:"day",l:"Day"},{v:"month",l:"Month"}].map(m=>(
                  <button key={m.v} onClick={()=>setSchedViewMode(m.v)}
                    style={{padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
                      background:schedViewMode===m.v?ACC:"transparent",
                      color:schedViewMode===m.v?"#fff":T2}}>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <button onClick={()=>schedViewMode==="day"?moveDay(-1):moveMon(-1)}
                style={{...gl(),border:`0.5px solid ${BORD}`,borderRadius:10,width:36,height:36,
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T1,fontSize:16}}>
                ‹
              </button>
              <div style={{flex:1,textAlign:"center"}}>
                <div style={{fontSize:14,fontWeight:700,color:T1}}>
                  {schedViewMode==="day"
                    ? sdLabel
                    : schedDate.toLocaleDateString("en-US",{month:"long",year:"numeric"})}
                </div>
                {isToday&&schedViewMode==="day"&&<div style={{fontSize:10,color:ACC,fontWeight:600}}>Today</div>}
              </div>
              <button onClick={()=>schedViewMode==="day"?moveDay(1):moveMon(1)}
                style={{...gl(),border:`0.5px solid ${BORD}`,borderRadius:10,width:36,height:36,
                  cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T1,fontSize:16}}>
                ›
              </button>
              {!isToday&&<button onClick={()=>setSchedDate(new Date())}
                style={{padding:"6px 10px",borderRadius:10,border:`0.5px solid ${ACC}`,
                  background:`${ACC}15`,color:ACC,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                Today
              </button>}
            </div>

            {/* Week strip (day view only) */}
            {schedViewMode==="day"&&(
              <div style={{...gl(),borderRadius:16,padding:"10px 6px",display:"flex",marginBottom:16}}>
                {weekDates.map((d,i)=>{
                  const isSel=d.toDateString()===schedDate.toDateString();
                  const isTd=d.toDateString()===today.toDateString();
                  const ds=d.toLocaleDateString("en-CA");
                  const hasTasks=!!(tasksByDate[ds]);
                  return (
                    <div key={i} onClick={()=>setSchedDate(new Date(d))}
                      style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer"}}>
                      <div style={{fontSize:9,fontWeight:600,color:T2,textTransform:"uppercase"}}>{WEEK_DAYS[d.getDay()]}</div>
                      <div style={{width:30,height:30,borderRadius:15,
                        background:isSel?ACC:"transparent",
                        border:isTd&&!isSel?`1.5px solid ${ACC}`:"none",
                        display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                        <span style={{fontSize:14,fontWeight:isSel?700:500,color:isSel?"#fff":T1}}>{d.getDate()}</span>
                        {hasTasks&&!isSel&&<div style={{position:"absolute",bottom:2,width:4,height:4,borderRadius:2,background:ACC}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{padding:"0 20px"}}>
            {/* ── DAY VIEW ── */}
            {schedViewMode==="day"&&(
              <>
                <div style={{...gl(),borderRadius:18,padding:"14px 0 14px 14px",overflow:"hidden"}}>
                  <div style={{display:"flex",gap:4}}>
                    <div style={{width:48,flexShrink:0,position:"relative",height:TH}}>
                      {HOURS.map(h=>(
                        <div key={h} style={{position:"absolute",top:(h*60-DS)*PX-6,fontSize:10,fontWeight:500,color:T2,textAlign:"right",width:44,lineHeight:1}}>
                          {h===12?"noon":h<12?`${h}am`:`${h-12}pm`}
                        </div>
                      ))}
                    </div>
                    <div style={{flex:1,position:"relative",height:TH,marginRight:14}}>
                      {HOURS.map(h=>(<div key={h} style={{position:"absolute",top:(h*60-DS)*PX,left:0,right:0,height:0.5,background:"rgba(255,255,255,0.06)"}}/>))}
                      {np!==null&&(
                        <div style={{position:"absolute",top:np,left:0,right:0,zIndex:5,display:"flex",alignItems:"center"}}>
                          <div style={{width:8,height:8,borderRadius:4,background:ACC,marginLeft:-4,flexShrink:0,border:"2px solid #0D0D0F"}}/>
                          <div style={{flex:1,height:1.5,background:ACC}}/>
                        </div>
                      )}
                      {dayItems.map((item,idx)=>{
                        const top=(t2m(item.time)-DS)*PX;
                        const h=Math.max((item.dur||30)*PX,item._type==="subtask"?36:42);
                        const ec=EC[idx%EC.length];
                        const endMin=t2m(item.time)+(item.dur||30);
                        const endStr=`${Math.floor(endMin/60)}:${String(endMin%60).padStart(2,"0")}`;
                        const isSub=item._type==="subtask";
                        return (
                          <div key={item.id} onClick={()=>openDetail(isSub?item._parentId:item.id)}
                            style={{position:"absolute",top,left:isSub?10:0,right:0,height:h,
                              background:isSub?"#2A1A05":ec.bg,
                              borderLeft:`3px solid ${isSub?GOLD:ec.border}`,
                              borderRadius:"0 10px 10px 0",padding:"5px 10px",overflow:"hidden",cursor:"pointer"}}>
                            <div style={{fontSize:isSub?10:12,fontWeight:700,color:T1,lineHeight:1.2,marginBottom:1}}>
                              {isSub?"↳ ":""}{item.text}
                            </div>
                            {isSub&&<div style={{fontSize:9,color:GOLD,marginBottom:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item._parentText}</div>}
                            <div style={{fontSize:9,color:T2}}>{fmt(item.time)} – {fmt(endStr)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {dayItems.length===0&&(
                  <div style={{textAlign:"center",padding:"28px 0",color:T2,fontSize:13}}>
                    Nothing scheduled{isToday?" today":" for this day"}.<br/>
                    Open a task or subtask and add a time to schedule it.
                  </div>
                )}
              </>
            )}

            {/* ── MONTH VIEW ── */}
            {schedViewMode==="month"&&(
              <div style={{...gl(),borderRadius:18,overflow:"hidden"}}>
                {/* Day headers */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`0.5px solid ${BORD}`}}>
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
                    <div key={d} style={{textAlign:"center",padding:"10px 0",fontSize:10,fontWeight:700,color:T2}}>{d}</div>
                  ))}
                </div>
                {/* Calendar weeks */}
                {weeks.map((week,wi)=>(
                  <div key={wi} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",
                    borderBottom:wi<weeks.length-1?`0.5px solid ${BORD}`:"none"}}>
                    {Array.from({length:7},(_,di)=>{
                      const d=week[di];
                      if(!d) return <div key={di}/>;
                      const ds=d.toLocaleDateString("en-CA");
                      const isSel=d.toDateString()===schedDate.toDateString();
                      const isTd=d.toDateString()===today.toDateString();
                      const count=tasksByDate[ds]||0;
                      const isOtherMo=d.getMonth()!==mo;
                      return (
                        <div key={di} onClick={()=>{ setSchedDate(new Date(d)); setSchedViewMode("day"); }}
                          style={{padding:"8px 4px",textAlign:"center",cursor:"pointer",
                            background:isSel?`${ACC}20`:"transparent"}}>
                          <div style={{width:28,height:28,borderRadius:14,margin:"0 auto",
                            background:isTd?ACC:"transparent",
                            border:isSel&&!isTd?`1.5px solid ${ACC}`:"none",
                            display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <span style={{fontSize:13,fontWeight:isTd||isSel?700:400,
                              color:isTd?"#fff":isOtherMo?"rgba(255,255,255,0.2)":T1}}>
                              {d.getDate()}
                            </span>
                          </div>
                          {count>0&&(
                            <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3}}>
                              {Array.from({length:Math.min(count,3)},(_,i)=>(
                                <div key={i} style={{width:4,height:4,borderRadius:2,background:ACC}}/>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {sharedTab}
      </div>
    );
  }

  // ══════════════════════════════════
  // AI
  // ══════════════════════════════════
  if(view==="ai"){
    function addMsgTasks(msg){
      setTasks(ts=>[...ts,...msg.tasks]);
      setMessages(prev=>prev.map(m=>m.id===msg.id?{...m,tasksAdded:true}:m));
    }
    const hasConvo=messages.length>0;
    return (
    <div style={{...PAGE,display:"flex",flexDirection:"column"}}>
      {/* ── Fixed header ── */}
      <div style={{padding:"52px 20px 12px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:26,fontWeight:800,color:T1,letterSpacing:-0.5}}>AI Assistant</div>
          {hasConvo&&(
            <button onClick={()=>{ setMessages([]); setAiInput(""); setAiErr(""); }}
              style={{fontSize:12,fontWeight:700,color:T2,background:"rgba(255,255,255,0.08)",border:"none",borderRadius:20,padding:"6px 14px",cursor:"pointer"}}>
              New ↺
            </button>
          )}
        </div>
        {/* Mode toggle — shown only before first message */}
        {!hasConvo&&(
          <div style={{...gl(),borderRadius:14,padding:4,display:"flex",marginTop:16}}>
            {[{id:"brain",label:"✦ Brain dump"},{id:"email",label:"✉ Email"}].map(m=>(
              <button key={m.id} onClick={()=>setAiMode(m.id)}
                style={{flex:1,padding:"9px 0",borderRadius:11,border:"none",background:aiMode===m.id?ACC:"transparent",color:aiMode===m.id?"#fff":T2,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Conversation thread ── */}
      <div style={{flex:1,overflowY:"auto",padding:"0 20px",paddingBottom:160}}>
        {/* Empty state */}
        {!hasConvo&&!aiLoad&&(
          <div style={{paddingTop:20,color:T2,fontSize:14,lineHeight:1.7}}>
            {aiMode==="brain"
              ? "Type anything — a goal, a problem, a question. I'll research it and build tasks."
              : "Paste a full email. I'll extract every action and build tasks with subtasks."}
          </div>
        )}

        {/* Messages */}
        {messages.map(m=>(
          <div key={m.id} style={{marginBottom:16}}>
            {m.role==="user"?(
              /* User bubble */
              <div style={{display:"flex",justifyContent:"flex-end"}}>
                <div style={{maxWidth:"80%",background:ACC,borderRadius:"18px 18px 4px 18px",padding:"12px 16px"}}>
                  <div style={{fontSize:14,color:"#fff",lineHeight:1.5}}>{m.text}</div>
                </div>
              </div>
            ):(
              /* Assistant response */
              <div>
                {m.parsed?.summary&&(
                  <div style={{...gl(),borderRadius:16,padding:"14px 16px",marginBottom:8,fontSize:14,color:"rgba(255,255,255,0.9)",lineHeight:1.6}}>
                    {stripTags(m.parsed.summary)}
                  </div>
                )}
                {m.parsed?.research&&<InfoCard color="#FF9F0A" label="Options found" text={stripTags(m.parsed.research)} bg="rgba(255,159,10,0.12)" border="rgba(255,159,10,0.25)"/>}
                {m.parsed?.insight&&<InfoCard color={ACC} label="Key insight" text={stripTags(m.parsed.insight)} bg={`${ACC}15`} border={`${ACC}35`}/>}
                {m.parsed?.timeline?.length>0&&(
                  <div style={{...gl(),borderRadius:16,padding:"14px 16px",marginBottom:8}}>
                    <Lbl>Timeline</Lbl>
                    {m.parsed.timeline.map((w,i)=>(
                      <div key={i} style={{display:"flex",gap:12,marginBottom:i<m.parsed.timeline.length-1?8:0}}>
                        <div style={{fontSize:11,color:ACC,minWidth:68,paddingTop:2,fontWeight:700}}>{w.week}</div>
                        <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",flex:1,lineHeight:1.4}}>{w.focus}</div>
                      </div>
                    ))}
                  </div>
                )}
                {m.tasks?.length>0&&(
                  <div style={{...gl(),borderRadius:16,overflow:"hidden",marginBottom:8}}>
                    <div style={{padding:"12px 16px 8px",fontSize:11,fontWeight:700,color:T2,textTransform:"uppercase",letterSpacing:1}}>
                      Tasks to add
                    </div>
                    {m.tasks.map((t,i)=>{
                      const a=getArea(areas,t.area);
                      return (
                        <div key={t.id}>
                          <div style={{padding:"10px 16px"}}>
                            <div style={{fontSize:14,fontWeight:600,color:T1,lineHeight:1.3,marginBottom:3}}>{t.text}</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${ACC}20`,color:ACC}}>{a.label}</span>
                              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:PRI[t.priority]?.color+"20",color:PRI[t.priority]?.color}}>{PRI[t.priority]?.label}</span>
                              {t.subtasks?.length>0&&<span style={{fontSize:10,color:T2}}>{t.subtasks.length} subtasks</span>}
                            </div>
                          </div>
                          {i<m.tasks.length-1&&<div style={{height:1,background:BORD,marginLeft:16}}/>}
                        </div>
                      );
                    })}
                    <div style={{padding:"10px 16px",borderTop:`1px solid ${BORD}`}}>
                      {m.tasksAdded?(
                        <div style={{fontSize:13,fontWeight:700,color:GREEN}}>✓ Added to your tasks</div>
                      ):(
                        <button onClick={()=>addMsgTasks(m)}
                          style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:ACC,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                          Add {m.tasks.length} task{m.tasks.length>1?"s":""}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator inline in thread */}
        {aiLoad&&(
          <div style={{...gl(),borderRadius:16,padding:"20px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:16}}>
            <div className="ai-spinner" style={{flexShrink:0,width:28,height:28,borderWidth:2}}/>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:T1,marginBottom:2}}>Working on it…</div>
              <div style={{fontSize:12,color:T2}}>Searching the web and building tasks</div>
            </div>
          </div>
        )}

        {/* Error */}
        {aiErr&&(
          <div style={{...gl(),borderRadius:16,padding:"14px 16px",marginBottom:16,border:`1px solid ${PINK}40`,background:`${PINK}12`}}>
            <div style={{fontSize:13,fontWeight:700,color:PINK,marginBottom:4}}>Something went wrong</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,0.75)",lineHeight:1.5,marginBottom:10}}>{aiErr}</div>
            <button onClick={()=>setAiErr("")} style={{fontSize:12,fontWeight:700,color:PINK,background:`${PINK}20`,border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>Dismiss</button>
          </div>
        )}
      </div>

      {/* ── Fixed input bar at bottom ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#111116",borderTop:`1px solid ${BORD}`,padding:"12px 16px",paddingBottom:"calc(env(safe-area-inset-bottom) + 72px)"}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <textarea value={aiInput} onChange={e=>setAiInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); runAI(); } }}
            placeholder={hasConvo?"Follow up…":aiMode==="brain"?"Type a goal, problem, brain dump…":"Paste email here…"}
            rows={1}
            style={{...IS,flex:1,resize:"none",minHeight:44,maxHeight:120,padding:"11px 14px",fontSize:15,lineHeight:1.5,overflowY:"auto"}}/>
          <button onClick={runAI} disabled={!aiInput.trim()||aiLoad}
            style={{width:44,height:44,borderRadius:22,border:"none",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
              background:aiInput.trim()&&!aiLoad?ACC:"rgba(255,255,255,0.08)",
              color:aiInput.trim()&&!aiLoad?"#fff":T2}}>↑</button>
        </div>
      </div>

      {sharedTab}
    </div>
  );}

  // ══════════════════════════════════
  // NEW TASK
  // ══════════════════════════════════
  if(view==="new-task") return (
    <div style={PAGE}>
      <div style={{padding:"52px 20px 60px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <button onClick={()=>setView(activeArea?"area":"home")}
            style={{width:36,height:36,borderRadius:12,...gl(),border:"none",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T1}}>×</button>
          <div style={{fontSize:20,fontWeight:800,color:T1}}>New Task</div>
          <div style={{width:36}}/>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          {["today","tomorrow","later"].map(d=>(
            <button key={d} onClick={()=>setNewDay(d)}
              style={{padding:"9px 18px",borderRadius:20,border:"none",background:newDay===d?ACC:"rgba(255,255,255,0.09)",color:newDay===d?"#fff":T2,fontSize:15,fontWeight:700,cursor:"pointer",textTransform:"capitalize"}}>
              {d.charAt(0).toUpperCase()+d.slice(1)}
            </button>
          ))}
        </div>
        <Lbl>Area</Lbl>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:22}}>
          {areas.map(a=>(
            <button key={a.id} onClick={()=>setNewT(n=>({...n,area:a.id}))}
              style={{padding:"7px 15px",borderRadius:20,border:`1.5px solid ${newT.area===a.id?ACC:BORD}`,background:newT.area===a.id?`${ACC}20`:"rgba(255,255,255,0.07)",color:newT.area===a.id?ACC:T1,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
        <Lbl>Priority</Lbl>
        <div style={{display:"flex",gap:8,marginBottom:22}}>
          {Object.entries(PRI).map(([k,v])=>(
            <button key={k} onClick={()=>setNewT(n=>({...n,priority:k}))}
              style={{flex:1,padding:"10px 0",borderRadius:14,border:`1.5px solid ${newT.priority===k?v.color:BORD}`,background:newT.priority===k?`${v.color}20`:"rgba(255,255,255,0.07)",color:newT.priority===k?v.color:T2,fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {v.label}
            </button>
          ))}
        </div>
        <Lbl>Title</Lbl>
        <input autoFocus placeholder="What needs doing?" value={newT.text} onChange={e=>setNewT(n=>({...n,text:e.target.value}))}
          style={{...IS,marginBottom:10,fontSize:17,fontWeight:600}}/>
        <Lbl>Description</Lbl>
        <textarea placeholder="More context (optional)" value={newT.desc||""} onChange={e=>setNewT(n=>({...n,desc:e.target.value}))}
          style={{...IS,resize:"none",minHeight:70,marginBottom:10,lineHeight:1.5}}/>
        <Lbl>Notes</Lbl>
        <textarea placeholder="Links, references… (optional)" value={newT.notes||""} onChange={e=>setNewT(n=>({...n,notes:e.target.value}))}
          style={{...IS,resize:"none",minHeight:50,marginBottom:16,lineHeight:1.5}}/>
        {/* Time + Duration toggle */}
        {newTShowTime ? (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
              <div><Lbl>Time</Lbl><input type="time" value={newT.time} onChange={e=>setNewT(n=>({...n,time:e.target.value}))} style={IS}/></div>
              <div><Lbl>Duration (min)</Lbl><input type="number" placeholder="30" value={newT.dur||""} onChange={e=>setNewT(n=>({...n,dur:+e.target.value}))} style={IS}/></div>
            </div>
            <button onClick={()=>{setNewTShowTime(false);setNewT(n=>({...n,time:"",dur:30}));}}
              style={{background:"none",border:"none",color:T2,fontSize:12,cursor:"pointer",marginBottom:14,padding:0}}>
              Remove time
            </button>
          </>
        ) : (
          <button onClick={()=>setNewTShowTime(true)}
            style={{...gl(),borderRadius:10,padding:"10px 14px",border:`0.5px solid ${BORD2}`,
              background:"transparent",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",
              width:"100%",textAlign:"left",marginBottom:10}}>
            + Add time &amp; duration
          </button>
        )}

        {/* Due date toggle */}
        {newTShowDue ? (
          <>
            <Lbl>Due date</Lbl>
            <input type="date" value={newT.due} onChange={e=>setNewT(n=>({...n,due:e.target.value}))} style={{...IS,marginBottom:8}}/>
            <button onClick={()=>{setNewTShowDue(false);setNewT(n=>({...n,due:""}));}}
              style={{background:"none",border:"none",color:T2,fontSize:12,cursor:"pointer",marginBottom:14,padding:0}}>
              Remove due date
            </button>
          </>
        ) : (
          <button onClick={()=>setNewTShowDue(true)}
            style={{...gl(),borderRadius:10,padding:"10px 14px",border:`0.5px solid ${BORD2}`,
              background:"transparent",color:ACC,fontSize:13,fontWeight:600,cursor:"pointer",
              width:"100%",textAlign:"left",marginBottom:14}}>
            + Add due date
          </button>
        )}

        <Lbl>Subtasks{(newT.subtasks||[]).length>0?` (${(newT.subtasks||[]).length})`:""}</Lbl>
        {(newT.subtasks||[]).map(s=>(
          <div key={s.id} style={{background:SURF,borderRadius:8,marginBottom:5}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px"}}>
              <span style={{display:"flex",color:T2}}>{Icon.checkSquare(false)}</span>
              <span style={{fontSize:13,color:T2,flex:1}}>{s.text}</span>
              {s.due&&<span style={{fontSize:10,color:GOLD,flexShrink:0}}>{s.due}</span>}
              <button onClick={()=>setSubDueEditId(id=>id===s.id?null:s.id)}
                style={{background:"none",border:"none",cursor:"pointer",fontSize:10,
                  fontWeight:600,color:subDueEditId===s.id?T2:ACC,padding:"2px 4px",flexShrink:0}}>
                {s.due?"date":"+ date"}
              </button>
              <button onClick={()=>setNewT(n=>({...n,subtasks:n.subtasks.filter(sub=>sub.id!==s.id)}))}
                style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:15,cursor:"pointer",padding:"0 2px",flexShrink:0}}>×</button>
            </div>
            {subDueEditId===s.id&&(
              <input type="date" value={s.due||""}
                onChange={e=>setNewT(n=>({...n,subtasks:n.subtasks.map(sub=>sub.id===s.id?{...sub,due:e.target.value}:sub)}))}
                style={{...IS,margin:"0 10px 8px",width:"calc(100% - 20px)",padding:"7px 10px",fontSize:12}}/>
            )}
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input value={newTSubText} onChange={e=>setNewTSubText(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") setSubModal({open:true,text:newTSubText,ctx:"new"}); }}
            placeholder="Add a subtask…"
            style={{...IS,flex:1,padding:"9px 12px",fontSize:13}}/>
          <button onClick={()=>setSubModal({open:true,text:newTSubText,ctx:"new"})}
            style={{padding:"9px 14px",borderRadius:12,border:"none",
              background:ACC,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",flexShrink:0}}>
            Add
          </button>
        </div>
        {subModal.open&&subModal.ctx==="new"&&(
          <SubtaskModal
            initial={subModal.text}
            onClose={()=>{ setSubModal(s=>({...s,open:false})); setNewTSubText(""); }}
            onAdd={sub=>{ setNewT(n=>({...n,subtasks:[...(n.subtasks||[]),sub]})); setNewTSubText(""); }}
          />
        )}
        <div style={{marginBottom:20}}/>

        <button onClick={addManual}
          style={{width:"100%",padding:"16px",borderRadius:16,border:"none",background:ACC,color:"#fff",fontSize:17,fontWeight:800,cursor:"pointer"}}>
          Create
        </button>
      </div>
    </div>
  );

  return null;
}
