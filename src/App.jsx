import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/clerk-react";

const ACC  = "#2B6AFF";
const PINK = "#E84393";
const SURF = "#18181D";
const BORD = "rgba(255,255,255,0.08)";
const T1   = "#FFFFFF";
const T2   = "#8E8E9A";

const DEFAULT_AREAS = [
  { id:"work",      label:"Work",      sub:"Salesforce & clients", icon:"⌘" },
  { id:"amsterdam", label:"Amsterdam", sub:"Relocation & DAFT",    icon:"✈" },
  { id:"health",    label:"Health",    sub:"Body & mind",           icon:"◎" },
  { id:"finances",  label:"Finances",  sub:"Money & banking",       icon:"$" },
  { id:"personal",  label:"Personal",  sub:"Life admin",            icon:"⊙" },
  { id:"creative",  label:"Creative",  sub:"Ideas & projects",      icon:"✦" },
  { id:"social",    label:"Social",    sub:"People & plans",        icon:"◈" },
  { id:"inbox",     label:"Inbox",     sub:"Unsorted capture",      icon:"⊕" },
];

const DEFAULT_TASKS = [
  {id:1,  text:"Finalize Havis Apex routing logic",  area:"work",      done:false,priority:"high",due:"",time:"09:00",dur:90, desc:"",notes:"",subtasks:[
    {id:"1a",text:"Write Apex class skeleton",done:false},
    {id:"1b",text:"Map 21 routing rules",done:false},
    {id:"1c",text:"Test across 5 queues",done:false},
  ]},
  {id:2,  text:"Embed Agentforce on Havis website",  area:"work",      done:false,priority:"high",due:"",time:"11:00",dur:60, desc:"",notes:"",subtasks:[]},
  {id:3,  text:"Berla flow migration — next phase",  area:"work",      done:false,priority:"med", due:"",time:"14:00",dur:60, desc:"",notes:"",subtasks:[]},
  {id:4,  text:"Submit DAFT application",            area:"amsterdam", done:false,priority:"high",due:"",time:"",    dur:30, desc:"",notes:"",subtasks:[
    {id:"4a",text:"Complete form 7524",done:false},
    {id:"4b",text:"Attach appendix 7601",done:false},
    {id:"4c",text:"Attach appendix 7675",done:false},
    {id:"4d",text:"Submit to IND",done:false},
  ]},
  {id:5,  text:"Sign 12-month lease",                area:"amsterdam", done:false,priority:"high",due:"",time:"",    dur:30, desc:"",notes:"",subtasks:[]},
  {id:6,  text:"Obtain BSN via gemeente",            area:"amsterdam", done:false,priority:"high",due:"",time:"",    dur:45, desc:"",notes:"",subtasks:[
    {id:"6a",text:"Book gemeente appointment",done:false},
    {id:"6b",text:"Bring passport + proof of address",done:false},
    {id:"6c",text:"Collect BSN number",done:false},
  ]},
  {id:7,  text:"Sign up for utilities",              area:"amsterdam", done:false,priority:"med", due:"",time:"",    dur:20, desc:"",notes:"",subtasks:[]},
  {id:8,  text:"Get essentials for apartment",       area:"amsterdam", done:false,priority:"med", due:"",time:"16:00",dur:60, desc:"",notes:"",subtasks:[
    {id:"8a",text:"Bedding & pillows",done:false},
    {id:"8b",text:"Kitchen basics",done:false},
    {id:"8c",text:"Bathroom supplies",done:false},
  ]},
  {id:9,  text:"Decide ZZP vs BV structure",         area:"amsterdam", done:false,priority:"med", due:"",time:"",    dur:30, desc:"",notes:"",subtasks:[]},
  {id:10, text:"Research 30% ruling eligibility",    area:"amsterdam", done:false,priority:"med", due:"",time:"",    dur:20, desc:"",notes:"",subtasks:[]},
  {id:11, text:"Morning workout",                    area:"health",    done:false,priority:"med", due:"",time:"07:00",dur:45, desc:"",notes:"",subtasks:[]},
  {id:12, text:"Skincare — set up in new place",     area:"health",    done:false,priority:"low", due:"",time:"",    dur:15, desc:"",notes:"",subtasks:[]},
  {id:13, text:"Open Dutch bank account",            area:"finances",  done:false,priority:"high",due:"",time:"10:00",dur:45, desc:"",notes:"",subtasks:[
    {id:"13a",text:"Research Bunq vs Revolut vs ING",done:false},
    {id:"13b",text:"Gather required documents",done:false},
    {id:"13c",text:"Submit application",done:false},
  ]},
  {id:14, text:"Review monthly budget",              area:"finances",  done:false,priority:"med", due:"",time:"",    dur:30, desc:"",notes:"",subtasks:[]},
];

const ICONS = ["⌘","✈","◎","$","⊙","✦","◈","⊕","♡","★","◆","▲","●","◐","⬡","⚡","✿","☀","♫","⚙","✎","⊞","⊟","⊠"];
const PRI = { high:{label:"Urgent",color:PINK}, med:{label:"Normal",color:ACC}, low:{label:"Later",color:"#636370"} };
const WEEK_DAYS = ["S","M","T","W","T","F","S"];
const TODAY_LONG  = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const TODAY_SHORT = new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
const today       = new Date();

const CARD_COLORS = ["#2B6AFF","#E84393","#F5A623","#00B894","#FF6348","#A855F7","#0EA5E9","#636370"];
function greet(){ const h=new Date().getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; }

const EC = [
  {bg:"rgba(255,200,80,0.18)",border:"#F5A623"},
  {bg:`rgba(43,106,255,0.18)`,border:ACC},
  {bg:"rgba(80,220,180,0.18)",border:"#00B894"},
  {bg:"rgba(232,67,147,0.18)",border:PINK},
  {bg:"rgba(100,180,255,0.18)",border:"#3D9EFF"},
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

const gl = (bl=20) => ({
  background:SURF,
  backdropFilter:`blur(${bl}px)`,
  WebkitBackdropFilter:`blur(${bl}px)`,
  border:`1px solid ${BORD}`,
});

const PAGE = {
  fontFamily:"system-ui,sans-serif",
  width:"100%",
  minHeight:"100vh",
  background:"#0D0D0F",
  overflowX:"hidden",
  overflowY:"auto",
  WebkitOverflowScrolling:"touch",
};

const TABBAR = {
  position:"fixed",bottom:0,left:0,right:0,
  background:"#111116",
  backdropFilter:"blur(30px)",
  WebkitBackdropFilter:"blur(30px)",
  borderTop:`1px solid ${BORD}`,
  display:"flex",zIndex:100,
  paddingBottom:"calc(env(safe-area-inset-bottom) + 6px)",
  paddingTop:6,
};

const IS = {
  width:"100%",padding:"13px 16px",borderRadius:14,
  border:`1px solid ${BORD}`,
  background:"rgba(255,255,255,0.07)",
  fontSize:16,fontFamily:"inherit",outline:"none",
  color:T1,boxSizing:"border-box",display:"block",
};

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────

const TabBar = memo(function TabBar({ tab, setTab, setView }) {
  const items = [{id:"home",icon:"◉",label:"Tasks"},{id:"schedule",icon:"◷",label:"Schedule"},{id:"ai",icon:"✦",label:"AI"}];
  return (
    <div style={TABBAR}>
      {items.map(v => (
        <button key={v.id} onClick={()=>{ setTab(v.id); setView(v.id); }}
          style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,paddingTop:6,background:"none",border:"none",cursor:"pointer"}}>
          <span style={{fontSize:22,lineHeight:1,color:tab===v.id?ACC:T2}}>{v.icon}</span>
          <span style={{fontSize:10,fontWeight:tab===v.id?700:500,color:tab===v.id?ACC:T2}}>{v.label}</span>
        </button>
      ))}
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
            background:t.done?"#34C759":"transparent",flexShrink:0,cursor:"pointer",
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
          </div>
          {hasSubs && !t.done && (
            <div style={{marginTop:6,height:2,borderRadius:1,background:"rgba(255,255,255,0.1)"}}>
              <div style={{height:2,borderRadius:1,transition:"width 0.3s",
                background:subDone===subs.length?"#34C759":ACC,
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
                  background:s.done?"#34C759":"transparent",
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

const Sheet = memo(function Sheet({ children, onClose, tall }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",
      alignItems:"flex-end",zIndex:200,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#1C1C24",border:`1px solid ${BORD}`,borderBottom:"none",
        borderRadius:"20px 20px 0 0",padding:"12px 20px 44px",width:"100%",
        boxSizing:"border-box",maxHeight:tall?"93vh":"auto",overflowY:"auto"}}>
        <div style={{width:36,height:5,borderRadius:3,background:"rgba(255,255,255,0.2)",margin:"0 auto 20px"}}/>
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

const TaskDetailSheet = memo(function TaskDetailSheet({ detailId, editForm, setEditForm, areas, onToggle, onDelete, onSave, onClose }) {
  const [newSub, setNewSub] = useState("");
  if (!detailId || !editForm) return null;

  const subtasks = editForm.subtasks || [];
  const subDone  = subtasks.filter(s=>s.done).length;

  function toggleSub(sid){
    setEditForm(f=>({...f, subtasks:f.subtasks.map(s=>s.id===sid?{...s,done:!s.done}:s)}));
  }
  function deleteSub(sid){
    setEditForm(f=>({...f, subtasks:f.subtasks.filter(s=>s.id!==sid)}));
  }
  function addSub(){
    if(!newSub.trim()) return;
    setEditForm(f=>({...f, subtasks:[...f.subtasks,{id:uid(),text:newSub.trim(),done:false}]}));
    setNewSub("");
  }

  return (
    <Sheet onClose={onClose} tall>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:800,color:T1}}>Task Detail</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onToggle}
            style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${editForm.done?"#34C759":ACC}`,
              background:editForm.done?"rgba(52,199,89,0.15)":`${ACC}20`,
              color:editForm.done?"#34C759":ACC,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            {editForm.done?"Undo":"Done"}
          </button>
          <button onClick={onDelete}
            style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${PINK}40`,
              background:`${PINK}15`,color:PINK,fontSize:13,fontWeight:700,cursor:"pointer"}}>
            Delete
          </button>
        </div>
      </div>

      <Lbl>Title</Lbl>
      <input value={editForm.text||""} onChange={e=>setEditForm(f=>({...f,text:e.target.value}))}
        style={{...IS,marginBottom:12,fontSize:17,fontWeight:600}}/>

      <Lbl>Description</Lbl>
      <textarea value={editForm.desc||""} onChange={e=>setEditForm(f=>({...f,desc:e.target.value}))}
        placeholder="Add more context…"
        style={{...IS,resize:"none",minHeight:72,marginBottom:12,lineHeight:1.5}}/>

      <Lbl>Notes</Lbl>
      <textarea value={editForm.notes||""} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))}
        placeholder="Links, references, anything…"
        style={{...IS,resize:"none",minHeight:52,marginBottom:16,lineHeight:1.5}}/>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <Lbl>Subtasks {subtasks.length>0?`(${subDone}/${subtasks.length})`:""}</Lbl>
      </div>
      {subtasks.length>0 && (
        <div style={{background:"rgba(255,255,255,0.05)",borderRadius:14,overflow:"hidden",marginBottom:10,border:`1px solid ${BORD}`}}>
          {subtasks.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderBottom:i<subtasks.length-1?`1px solid ${BORD}`:"none"}}>
              <button onClick={()=>toggleSub(s.id)}
                style={{width:22,height:22,borderRadius:11,border:s.done?"none":`2px solid ${ACC}50`,
                  background:s.done?"#34C759":"transparent",flexShrink:0,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                {s.done && <span style={{color:"#fff",fontSize:11}}>✓</span>}
              </button>
              <div style={{flex:1,fontSize:14,color:s.done?"rgba(255,255,255,0.3)":T1,textDecoration:s.done?"line-through":"none",lineHeight:1.3}}>{s.text}</div>
              <button onClick={()=>deleteSub(s.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.2)",fontSize:16,cursor:"pointer",padding:"0 2px"}}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <input value={newSub} onChange={e=>setNewSub(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addSub()}
          placeholder="Add a subtask…"
          style={{...IS,flex:1,padding:"11px 14px",fontSize:14}}/>
        <button onClick={addSub} disabled={!newSub.trim()}
          style={{padding:"11px 16px",borderRadius:14,border:"none",
            background:newSub.trim()?ACC:"rgba(255,255,255,0.1)",
            color:newSub.trim()?"#fff":T2,fontSize:14,fontWeight:700,cursor:"pointer",flexShrink:0}}>
          Add
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <Lbl>Area</Lbl>
          <select value={editForm.area||"inbox"} onChange={e=>setEditForm(f=>({...f,area:e.target.value}))} style={IS}>
            {areas.map(a=><option key={a.id} value={a.id}>{a.icon} {a.label}</option>)}
          </select>
        </div>
        <div>
          <Lbl>Priority</Lbl>
          <select value={editForm.priority||"med"} onChange={e=>setEditForm(f=>({...f,priority:e.target.value}))} style={IS}>
            <option value="high">Urgent</option>
            <option value="med">Normal</option>
            <option value="low">Later</option>
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <Lbl>Time</Lbl>
          <input type="time" value={editForm.time||""} onChange={e=>setEditForm(f=>({...f,time:e.target.value}))} style={IS}/>
        </div>
        <div>
          <Lbl>Duration (min)</Lbl>
          <input type="number" value={editForm.dur||""} onChange={e=>setEditForm(f=>({...f,dur:+e.target.value}))} style={IS}/>
        </div>
      </div>
      <Lbl>Due date</Lbl>
      <input type="date" value={editForm.due||""} onChange={e=>setEditForm(f=>({...f,due:e.target.value}))}
        style={{...IS,marginBottom:24}}/>
      <button onClick={onSave}
        style={{width:"100%",padding:"16px",borderRadius:16,border:"none",background:ACC,
          color:"#fff",fontSize:17,fontWeight:700,cursor:"pointer"}}>
        Save changes
      </button>
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
function LoginScreen() {
  const { signIn, isLoaded:siLoaded, setActive:setSiActive } = useSignIn();
  const { signUp, isLoaded:suLoaded, setActive:setSuActive } = useSignUp();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [code,     setCode]     = useState("");
  const [method,   setMethod]   = useState("password"); // "password" | "code"
  const [step,     setStep]     = useState("form");     // "form" | "verify"
  const [isNew,    setIsNew]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");

  const ready = siLoaded && suLoaded;

  // ── Password flow ──
  async function handlePassword() {
    if(!ready||!email.trim()||!password.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await signIn.create({ identifier:email, password });
      if(r.status==="complete") await setSiActive({ session:r.createdSessionId });
    } catch(e) {
      const ec=e.errors?.[0]?.code;
      if(ec==="form_identifier_not_found") {
        // New user — create account
        try {
          await signUp.create({ emailAddress:email, password });
          await signUp.prepareEmailAddressVerification({ strategy:"email_code" });
          setIsNew(true); setStep("verify");
        } catch(e2) { setErr(e2.errors?.[0]?.message||"Sign up failed"); }
      } else {
        setErr(e.errors?.[0]?.message||"Invalid email or password");
      }
    }
    setLoading(false);
  }

  // ── Email code flow ──
  async function handleSendCode() {
    if(!ready||!email.trim()) return;
    setLoading(true); setErr("");
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
        } catch(e2) { setErr(e2.errors?.[0]?.message||"Sign up failed"); }
      } else {
        setErr(e.errors?.[0]?.message||"Could not send code");
      }
    }
    setLoading(false);
  }

  // ── Verify 6-digit code ──
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
    } catch(e) { setErr(e.errors?.[0]?.message||"Invalid code"); }
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

      {step==="form" ? (
        <>
          {/* Method toggle */}
          <div style={{...gl(),borderRadius:14,padding:4,display:"flex",marginBottom:20,width:"100%"}}>
            {[{id:"password",label:"Password"},{id:"code",label:"Email code"}].map(m=>(
              <button key={m.id} onClick={()=>{setMethod(m.id);setErr("");}}
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
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handlePassword()}
              placeholder="Password"
              style={{...IS,marginBottom:12,fontSize:16}}/>
          )}

          {err&&<div style={{fontSize:13,color:PINK,marginBottom:10,textAlign:"center"}}>{err}</div>}

          <button
            onClick={method==="password"?handlePassword:handleSendCode}
            disabled={!email.trim()||loading||!ready||(method==="password"&&!password.trim())}
            style={btnStyle(email.trim()&&(method==="code"||password.trim()))}>
            {loading?"Please wait…":method==="password"?"Continue →":"Send code →"}
          </button>
        </>
      ) : (
        <>
          <div style={{...gl(),borderRadius:14,padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:12,color:isNew?"#34C759":ACC,fontWeight:700}}>
              {isNew?"New account":"Welcome back"}
            </span>
            <span style={{fontSize:12,color:T2}}>{email}</span>
          </div>
          <div style={{fontSize:14,color:T2,marginBottom:16,textAlign:"center",lineHeight:1.6}}>
            Enter the 6-digit code sent to your email
          </div>
          <input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
            onKeyDown={e=>e.key==="Enter"&&handleVerify()} placeholder="000000" maxLength={6} autoFocus
            style={{...IS,marginBottom:12,textAlign:"center",fontSize:28,letterSpacing:10,fontWeight:700}}/>
          {err&&<div style={{fontSize:13,color:PINK,marginBottom:10,textAlign:"center"}}>{err}</div>}
          <button onClick={handleVerify} disabled={code.length!==6||loading} style={btnStyle(code.length===6)}>
            {loading?"Verifying…":isNew?"Create account →":"Sign in →"}
          </button>
          <button onClick={()=>{setStep("form");setCode("");setErr("");}}
            style={{background:"none",border:"none",color:T2,fontSize:13,cursor:"pointer",marginTop:12}}>
            ← Back
          </button>
        </>
      )}
    </div>
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
  const [newT,        setNewT]        = useState({text:"",area:"inbox",priority:"med",due:"",time:"",dur:30,desc:"",notes:""});
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
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const [syncEnabled, setSyncEnabled] = useState(false);

  const tasksRef      = useRef(tasks);
  const editFormRef   = useRef(editForm);
  const activeAreaRef = useRef(activeArea);
  const newTRef       = useRef(newT);
  const messagesRef   = useRef(messages);
  const getTokenRef   = useRef(getToken);
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
    if(!isSignedIn) return;
    Promise.all([authFetch("/api/areas"),authFetch("/api/tasks")]).then(async([ar,tr])=>{
      const aData=await ar.json(); const tData=await tr.json();
      if(aData?.length) setAreas(aData);
      if(tData?.length) setTasks(tData.map(t=>({subtasks:[],...t})));
      setSyncEnabled(true);
    });
   
  },[isSignedIn]);

  // ── Debounced sync to Neon on change ──
  useEffect(()=>{
    if(!isSignedIn||!syncEnabled) return;
    const timer=setTimeout(()=>{
      authFetch("/api/areas",{method:"POST",body:JSON.stringify({areas})});
    },800);
    return ()=>clearTimeout(timer);
   
  },[areas,isSignedIn,syncEnabled]);

  useEffect(()=>{
    if(!isSignedIn||!syncEnabled) return;
    const timer=setTimeout(()=>{
      authFetch("/api/tasks",{method:"POST",body:JSON.stringify({tasks})});
    },800);
    return ()=>clearTimeout(timer);
   
  },[tasks,isSignedIn,syncEnabled]);

  const toggle    = useCallback((id)=>{ setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t)); },[]);
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
  },[]);

  const saveDetail  = useCallback(()=>{
    const f=editFormRef.current;
    setTasks(ts=>ts.map(t=>t.id===f.id?{...f}:t));
    setDetailId(null); setEditForm(null);
  },[]);

  const closeDetail = useCallback(()=>{ setDetailId(null); setEditForm(null); },[]);

  const addManual   = useCallback(()=>{
    const n=newTRef.current;
    if(!n.text.trim()) return;
    setTasks(ts=>[...ts,{...n,id:uid(),done:false,subtasks:[]}]);
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

  const sharedDetail = (
    <TaskDetailSheet
      detailId={detailId} editForm={editForm} setEditForm={setEditForm} areas={areas}
      onToggle={detailToggle} onDelete={detailDelete} onSave={saveDetail} onClose={closeDetail}
    />
  );
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
    const todayTasks = [...scheduled, ...urgent.filter(t=>!scheduledIds.has(t.id))];
    return (
    <div style={PAGE}>
      <div style={{position:"relative",zIndex:1,paddingBottom:110}}>

        {/* ── Header ── */}
        <div style={{padding:"52px 20px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontSize:13,color:T2,marginBottom:2}}>{TODAY_SHORT}</div>
              <div style={{fontSize:24,fontWeight:800,color:T1,letterSpacing:-0.5}}>{greet()}, Elias.</div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>signOut()}
                style={{fontSize:11,fontWeight:700,color:T2,background:"rgba(255,255,255,0.07)",border:"none",borderRadius:20,padding:"6px 12px",cursor:"pointer"}}>
                Sign out
              </button>
              <button onClick={()=>{ setNewT({text:"",area:"inbox",priority:"med",due:"",time:"",dur:30,desc:"",notes:""}); setView("new-task"); }}
                style={{width:46,height:46,borderRadius:23,background:ACC,border:"none",cursor:"pointer",fontSize:24,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
            </div>
          </div>

          {/* ── Today card with task list ── */}
          <div style={{...gl(),borderRadius:20,marginBottom:20,overflow:"hidden"}}>
            <div style={{padding:"14px 18px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:13,fontWeight:700,color:T1}}>Today</div>
              <div style={{display:"flex",gap:10}}>
                {urgent.length>0&&<span style={{fontSize:12,fontWeight:700,color:PINK}}>{urgent.length} urgent</span>}
                {scheduled.length>0&&<span style={{fontSize:12,fontWeight:700,color:ACC}}>{scheduled.length} scheduled</span>}
              </div>
            </div>
            {todayTasks.length>0 ? todayTasks.map((t,i)=>{
              const a=getArea(areas,t.area);
              const aIdx=areas.findIndex(ar=>ar.id===t.area);
              const aColor=CARD_COLORS[aIdx%CARD_COLORS.length];
              return (
                <div key={t.id}>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 18px"}}>
                    <button onClick={()=>toggle(t.id)}
                      style={{width:22,height:22,borderRadius:11,border:t.done?"none":`2px solid ${ACC}60`,background:t.done?"#34C759":"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {t.done&&<span style={{color:"#fff",fontSize:10}}>✓</span>}
                    </button>
                    <div style={{flex:1,minWidth:0}} onClick={()=>openDetail(t.id)}>
                      <div style={{fontSize:14,fontWeight:600,color:t.done?"rgba(255,255,255,0.3)":T1,textDecoration:t.done?"line-through":"none",lineHeight:1.3}}>{t.text}</div>
                      <div style={{display:"flex",gap:6,marginTop:3,alignItems:"center"}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:aColor+"30",color:aColor}}>{a.label}</span>
                        {t.time&&<span style={{fontSize:10,color:T2}}>{fmt(t.time)}</span>}
                        {t.priority==="high"&&!t.time&&<span style={{fontSize:10,fontWeight:700,color:PINK}}>Urgent</span>}
                      </div>
                    </div>
                    <span onClick={()=>openDetail(t.id)} style={{color:"rgba(255,255,255,0.2)",fontSize:14,cursor:"pointer",flexShrink:0}}>›</span>
                  </div>
                  {i<todayTasks.length-1&&<div style={{height:1,background:BORD,marginLeft:52}}/>}
                </div>
              );
            }) : (
              <div style={{padding:"16px 18px 18px",fontSize:13,color:T2}}>
                {totalOpen===0?"All caught up — nothing open today.":"No urgent or scheduled tasks. Add one with +"}
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
            const eaColor=CARD_COLORS[eaIdx%CARD_COLORS.length];
            const eaOpen=tasks.filter(t=>t.area===expandedArea&&!t.done);
            return (
              <div style={{marginBottom:12}}>
                {/* Colored header — tap to collapse */}
                <div style={{background:eaColor,borderRadius:"20px 20px 0 0",padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}
                  onClick={()=>{ setExpandedArea(null); setExpandedTask(null); }}>
                  <div style={{width:40,height:40,borderRadius:12,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{ea.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{ea.label}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.7)"}}>{eaOpen.length} open</div>
                  </div>
                  <span style={{color:"rgba(255,255,255,0.7)",fontSize:18,display:"inline-block",transform:"rotate(90deg)"}}>›</span>
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
                            style={{width:24,height:24,borderRadius:12,border:`2px solid ${eaColor}70`,background:"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
                              <span style={{fontSize:13,color:eaColor,display:"inline-block",transition:"transform 0.2s",transform:isExpT?"rotate(90deg)":"rotate(0deg)"}}>›</span>
                            )}
                            <span onClick={e=>{ e.stopPropagation(); openDetail(t.id); }}
                              style={{fontSize:13,color:"rgba(255,255,255,0.2)",cursor:"pointer",padding:"2px 4px"}}>⋯</span>
                          </div>
                        </div>
                        {/* Subtasks */}
                        {isExpT&&subs.length>0&&(
                          <div style={{marginLeft:52,marginRight:16,marginBottom:10,borderRadius:12,overflow:"hidden",border:`1px solid ${eaColor}25`,background:`${eaColor}0D`}}>
                            {subs.map((s,si)=>(
                              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderBottom:si<subs.length-1?`1px solid ${BORD}`:"none"}}>
                                <button onClick={()=>toggleSub(t.id,s.id)}
                                  style={{width:18,height:18,borderRadius:9,border:s.done?"none":`1.5px solid ${eaColor}60`,background:s.done?"#34C759":"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
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
              const color=CARD_COLORS[i%CARD_COLORS.length];
              const at=tasks.filter(t=>t.area===a.id);
              const openC=at.filter(t=>!t.done).length;
              const doneC=at.filter(t=>t.done).length;
              const pct=at.length?Math.round(doneC/at.length*100):0;
              return (
                <div key={a.id}
                  style={{background:color,borderRadius:22,padding:"20px 18px",cursor:"pointer",position:"relative",minHeight:170,display:"flex",flexDirection:"column",justifyContent:"space-between"}}
                  onClick={()=>{ setExpandedArea(a.id); setExpandedTask(null); }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{width:46,height:46,borderRadius:14,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{a.icon}</div>
                    <button onClick={e=>{ e.stopPropagation(); openEditArea(a); }}
                      style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",fontSize:12,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.75)",marginBottom:2}}>{a.label}</div>
                    <div style={{fontSize:34,fontWeight:800,color:"#fff",lineHeight:1,marginBottom:10}}>{openC}</div>
                    <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.2)"}}>
                      <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.9)",width:`${pct}%`,transition:"width 0.4s"}}/>
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
      {sharedDetail}
      {sharedAreaMgr}
      {confirmDel && <ConfirmDelete name={getArea(areas,confirmDel).label} onCancel={()=>setConfirmDel(null)} onConfirm={()=>deleteArea(confirmDel)}/>}
    </div>
  );}

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
            <button onClick={()=>{ setNewT({text:"",area:activeArea,priority:"med",due:"",time:"",dur:30,desc:"",notes:""}); setView("new-task"); }}
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
        {sharedDetail}
        {sharedAreaMgr}
        {confirmDel && <ConfirmDelete name={getArea(areas,confirmDel).label} onCancel={()=>setConfirmDel(null)} onConfirm={()=>deleteArea(confirmDel)}/>}
      </div>
    );
  }

  // ══════════════════════════════════
  // SCHEDULE
  // ══════════════════════════════════
  if(view==="schedule") {
    const HOURS=Array.from({length:17},(_,i)=>i+6);
    const DS=6*60,DE=22*60,PX=1.55,TH=(DE-DS)*PX;
    const n=new Date(),nm=n.getHours()*60+n.getMinutes();
    const np=(nm>=DS&&nm<=DE)?(nm-DS)*PX:null;
    return (
      <div style={PAGE}>
        <div style={{position:"relative",zIndex:1,paddingBottom:110}}>
          <div style={{padding:"52px 20px 16px"}}>
            <div style={{fontSize:12,fontWeight:600,color:T2,letterSpacing:1.2,textTransform:"uppercase",marginBottom:4}}>{TODAY_SHORT}</div>
            <div style={{fontSize:34,fontWeight:800,color:T1,letterSpacing:-1,marginBottom:16}}>Schedule</div>
            <div style={{...gl(),borderRadius:18,padding:"12px 8px",display:"flex",marginBottom:20}}>
              {weekDates.map((d,i)=>{
                const isTd=d.toDateString()===today.toDateString();
                return (
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{fontSize:10,fontWeight:600,color:T2,textTransform:"uppercase"}}>{WEEK_DAYS[d.getDay()]}</div>
                    <div style={{width:32,height:32,borderRadius:16,background:isTd?ACC:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:15,fontWeight:isTd?700:500,color:isTd?"#fff":d.getDay()===0||d.getDay()===6?"rgba(255,255,255,0.25)":T1}}>{d.getDate()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{padding:"0 20px"}}>
            <div style={{...gl(),borderRadius:20,padding:"16px 0 16px 16px",overflow:"hidden"}}>
              <div style={{display:"flex",gap:4}}>
                <div style={{width:52,flexShrink:0,position:"relative",height:TH}}>
                  {HOURS.map(h=>(
                    <div key={h} style={{position:"absolute",top:(h*60-DS)*PX-6,fontSize:11,fontWeight:500,color:T2,textAlign:"right",width:48,lineHeight:1}}>
                      {h===12?"noon":h<12?`${h}am`:`${h-12}pm`}
                    </div>
                  ))}
                </div>
                <div style={{flex:1,position:"relative",height:TH,marginRight:16}}>
                  {HOURS.map(h=>(<div key={h} style={{position:"absolute",top:(h*60-DS)*PX,left:0,right:0,height:0.5,background:"rgba(255,255,255,0.07)"}}/>))}
                  {np!==null && (
                    <div style={{position:"absolute",top:np,left:0,right:0,zIndex:5,display:"flex",alignItems:"center"}}>
                      <div style={{width:9,height:9,borderRadius:5,background:ACC,marginLeft:-4,flexShrink:0,border:"2px solid #0D0D0F"}}/>
                      <div style={{flex:1,height:1.5,background:ACC}}/>
                    </div>
                  )}
                  {scheduled.map((t,idx)=>{
                    const top=(t2m(t.time)-DS)*PX;
                    const h=Math.max((t.dur||30)*PX,44);
                    const ec=EC[idx%EC.length];
                    const endMin=t2m(t.time)+(t.dur||30);
                    const endStr=`${Math.floor(endMin/60)}:${String(endMin%60).padStart(2,"0")}`;
                    return (
                      <div key={t.id} onClick={()=>openDetail(t.id)} style={{position:"absolute",top,left:0,right:0,height:h,background:ec.bg,borderLeft:`3.5px solid ${ec.border}`,borderRadius:"0 12px 12px 0",padding:"7px 12px",overflow:"hidden",cursor:"pointer"}}>
                        <div style={{fontSize:13,fontWeight:700,color:T1,lineHeight:1.2,marginBottom:2}}>{t.text}</div>
                        <div style={{fontSize:11,color:T2}}>{fmt(t.time)} – {fmt(endStr)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {scheduled.length===0 && <div style={{textAlign:"center",padding:"32px 0",color:T2,fontSize:14}}>No tasks scheduled today.<br/>Tap any task to add a time.</div>}
          </div>
        </div>
        {sharedTab}
        {sharedDetail}
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
                        <div style={{fontSize:13,fontWeight:700,color:"#34C759"}}>✓ Added to your tasks</div>
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
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div><Lbl>Time</Lbl><input type="time" value={newT.time} onChange={e=>setNewT(n=>({...n,time:e.target.value}))} style={IS}/></div>
          <div><Lbl>Duration (min)</Lbl><input type="number" placeholder="30" value={newT.dur||""} onChange={e=>setNewT(n=>({...n,dur:+e.target.value}))} style={IS}/></div>
        </div>
        <Lbl>Due date</Lbl>
        <input type="date" value={newT.due} onChange={e=>setNewT(n=>({...n,due:e.target.value}))} style={{...IS,marginBottom:28}}/>
        <button onClick={addManual}
          style={{width:"100%",padding:"16px",borderRadius:16,border:"none",background:ACC,color:"#fff",fontSize:17,fontWeight:800,cursor:"pointer"}}>
          Create
        </button>
      </div>
    </div>
  );

  return null;
}
