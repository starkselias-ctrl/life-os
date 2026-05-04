import { useState, useEffect, useRef } from "react";

const ACC = "#6C5CE7";

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
  {id:1,  text:"Finalize Havis Apex routing logic",    area:"work",      done:false,priority:"high",due:"",time:"09:00",dur:90},
  {id:2,  text:"Embed Agentforce on Havis website",    area:"work",      done:false,priority:"high",due:"",time:"11:00",dur:60},
  {id:3,  text:"Berla flow migration — next phase",    area:"work",      done:false,priority:"med", due:"",time:"14:00",dur:60},
  {id:4,  text:"Submit DAFT application",              area:"amsterdam", done:false,priority:"high",due:"",time:"",    dur:30},
  {id:5,  text:"Sign 12-month lease",                  area:"amsterdam", done:false,priority:"high",due:"",time:"",    dur:30},
  {id:6,  text:"Obtain BSN via gemeente",              area:"amsterdam", done:false,priority:"high",due:"",time:"",    dur:45},
  {id:7,  text:"Sign up for utilities",                area:"amsterdam", done:false,priority:"med", due:"",time:"",    dur:20},
  {id:8,  text:"Get essentials for apartment",         area:"amsterdam", done:false,priority:"med", due:"",time:"16:00",dur:60},
  {id:9,  text:"Decide ZZP vs BV structure",           area:"amsterdam", done:false,priority:"med", due:"",time:"",    dur:30},
  {id:10, text:"Research 30% ruling eligibility",      area:"amsterdam", done:false,priority:"med", due:"",time:"",    dur:20},
  {id:11, text:"Morning workout",                      area:"health",    done:false,priority:"med", due:"",time:"07:00",dur:45},
  {id:12, text:"Skincare — set up in new place",       area:"health",    done:false,priority:"low", due:"",time:"",    dur:15},
  {id:13, text:"Open Dutch bank account",              area:"finances",  done:false,priority:"high",due:"",time:"10:00",dur:45},
  {id:14, text:"Review monthly budget",                area:"finances",  done:false,priority:"med", due:"",time:"",    dur:30},
];

const ICONS = ["⌘","✈","◎","$","⊙","✦","◈","⊕","♡","★","◆","▲","●","◐","⬡","⚡","✿","☀","♫","⚙","✎","⊞","⊟","⊠"];
const PRI = { high:{label:"Urgent",color:"#E84393"}, med:{label:"Normal",color:ACC}, low:{label:"Later",color:"#8E8E93"} };
const WEEK_DAYS = ["S","M","T","W","T","F","S"];
const TODAY_LONG  = new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const TODAY_SHORT = new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

const AI_SYS = `You are the AI brain of a personal life OS for Elias — Salesforce consultant relocating Austin→Amsterdam, DAFT visa applicant, self-employed. Today: ${TODAY_LONG}.
Areas: work, amsterdam, health, finances, personal, creative, social, inbox
Respond ONLY valid JSON no markdown:
{"summary":"1-2 sentences","tasks":[{"text":"Imperative task","area":"id","priority":"high|med|low","due":"YYYY-MM-DD or empty","time":"HH:MM or empty","dur":30,"notes":"optional"}],"timeline":[{"week":"label","focus":"..."}],"research":"named real services or empty","insight":"one sharp recommendation"}
Rules: specific tasks; realistic times; dur=minutes; timeline only if deadline; email→extract every action; shipping→Seven Seas Worldwide/DSV/Send My Bag; Elias in Amsterdam, Austin=origin.`;

function getArea(areas, id){ return areas.find(a=>a.id===id) || {id:"inbox",label:"Inbox",sub:"",icon:"⊕"}; }
function t2m(t){ if(!t) return null; const[h,m]=t.split(":").map(Number); return h*60+m; }
function fmt(t){ if(!t) return ""; const[h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
const glass = (op=0.78,bl=20) => ({background:`rgba(255,255,255,${op})`,backdropFilter:`blur(${bl}px)`,WebkitBackdropFilter:`blur(${bl}px)`,border:"1px solid rgba(255,255,255,0.65)"});

// ── STORAGE ──
function load(key, fallback){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):fallback; }catch{ return fallback; } }
function save(key,val){ try{ localStorage.setItem(key,JSON.stringify(val)); }catch{} }

export default function App(){
  const [areas, setAreas]   = useState(()=>load("los_areas", DEFAULT_AREAS));
  const [tasks, setTasks]   = useState(()=>load("los_tasks", DEFAULT_TASKS));
  const [view,  setView]    = useState("home");
  const [tab,   setTab]     = useState("home");
  const [activeArea, setActiveArea] = useState(null);
  const [showDone, setShowDone]     = useState(false);

  // new task
  const [newT,  setNewT]   = useState({text:"",area:"inbox",priority:"med",due:"",time:"",dur:30,desc:""});
  const [newDay,setNewDay] = useState("today");

  // area editor
  const [showAreaMgr, setShowAreaMgr] = useState(false);
  const [editingArea,  setEditingArea]  = useState(null); // null=new, obj=edit
  const [areaForm, setAreaForm] = useState({label:"",sub:"",icon:"⊙"});
  const [confirmDel, setConfirmDel] = useState(null); // area id to confirm delete

  // AI
  const [aiMode,   setAiMode]   = useState("brain");
  const [aiInput,  setAiInput]  = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [aiLoad,   setAiLoad]   = useState(false);
  const [aiErr,    setAiErr]    = useState("");
  const [pending,  setPending]  = useState([]);

  // persist
  useEffect(()=>save("los_areas",areas),[areas]);
  useEffect(()=>save("los_tasks",tasks),[tasks]);

  // ── TASK OPS ──
  function toggle(id){ setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t)); }
  function delTask(id){ setTasks(ts=>ts.filter(t=>t.id!==id)); }
  function addManual(){
    if(!newT.text.trim()) return;
    setTasks(ts=>[...ts,{...newT,id:uid(),done:false}]);
    setNewT({text:"",area:activeArea||"inbox",priority:"med",due:"",time:"",dur:30,desc:""});
    setView(activeArea?"area":"home");
  }

  // ── AREA OPS ──
  function openNewArea(){ setEditingArea(null); setAreaForm({label:"",sub:"",icon:"⊙"}); setShowAreaMgr(true); }
  function openEditArea(a){ setEditingArea(a); setAreaForm({label:a.label,sub:a.sub,icon:a.icon}); setShowAreaMgr(true); }

  function saveArea(){
    if(!areaForm.label.trim()) return;
    if(editingArea){
      setAreas(as=>as.map(a=>a.id===editingArea.id?{...a,...areaForm}:a));
    } else {
      const id = areaForm.label.toLowerCase().replace(/\s+/g,"-")+"-"+uid().slice(0,4);
      setAreas(as=>[...as,{id,label:areaForm.label,sub:areaForm.sub||areaForm.label,icon:areaForm.icon}]);
    }
    setShowAreaMgr(false);
  }

  function deleteArea(id){
    // move orphaned tasks to inbox
    setTasks(ts=>ts.map(t=>t.area===id?{...t,area:"inbox"}:t));
    setAreas(as=>as.filter(a=>a.id!==id));
    setConfirmDel(null);
    if(activeArea===id){ setActiveArea(null); setView("home"); }
  }

  // ── AI ──
  async function runAI(){
    if(!aiInput.trim()) return;
    setAiLoad(true); setAiErr(""); setAiResult(null); setPending([]);
    try{
      const areaList = areas.map(a=>a.id).join(", ");
      const sys = AI_SYS.replace("work, amsterdam, health, finances, personal, creative, social, inbox", areaList);
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1400,system:sys,
          messages:[{role:"user",content:aiMode==="email"?`Extract all actions:\n\n${aiInput}`:aiInput}]})
      });
      const d   = await res.json();
      const raw = d.content?.find(b=>b.type==="text")?.text||"";
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setAiResult(parsed);
      setPending(parsed.tasks.map((t,i)=>({...t,id:uid(),done:false,sel:true})));
    }catch{ setAiErr("Something went wrong. Try again."); }
    setAiLoad(false);
  }

  function addPending(){
    setTasks(ts=>[...ts,...pending.filter(p=>p.sel).map(({sel,notes,...t})=>t)]);
    setView("home"); setTab("home"); setAiResult(null); setAiInput(""); setPending([]);
  }

  // ── DERIVED ──
  const urgent   = tasks.filter(t=>t.priority==="high"&&!t.done);
  const doneList = tasks.filter(t=>t.done);
  const scheduled= [...tasks].filter(t=>t.time&&!t.done).sort((a,b)=>t2m(a.time)-t2m(b.time));
  const today    = new Date();
  const weekDates= Array.from({length:7},(_,i)=>{ const d=new Date(today); d.setDate(today.getDate()-today.getDay()+i); return d; });
  const EVENT_COLORS=[
    {bg:"rgba(255,200,120,0.25)",border:"#F5A623"},
    {bg:`${ACC}22`,border:ACC},
    {bg:"rgba(100,220,200,0.22)",border:"#00B894"},
    {bg:"rgba(232,67,147,0.15)",border:"#E84393"},
    {bg:"rgba(100,180,255,0.2)",border:"#3D9EFF"},
  ];

  // ── WRAPPER ──
  const Wrap = ({children})=>(
    <div style={{fontFamily:"-apple-system,'SF Pro Display',system-ui,sans-serif",maxWidth:390,margin:"0 auto",
      minHeight:"100vh",background:"linear-gradient(160deg,#f0f0f5 0%,#e8e8f0 100%)",position:"relative",overflowX:"hidden"}}>
      <div style={{position:"fixed",top:-80,right:-60,width:260,height:260,borderRadius:"50%",background:`${ACC}16`,pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",bottom:60,left:-80,width:220,height:220,borderRadius:"50%",background:"rgba(100,180,255,0.09)",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"relative",zIndex:1,paddingBottom:110}}>{children}</div>
      {/* Tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:390,
        ...glass(0.88,30),borderTop:"1px solid rgba(255,255,255,0.7)",display:"flex",zIndex:100,paddingBottom:22,paddingTop:4}}>
        {[{id:"home",icon:"◉",label:"Areas"},{id:"schedule",icon:"◷",label:"Schedule"},{id:"ai",icon:"✦",label:"AI"}].map(v=>(
          <button key={v.id} onClick={()=>{setTab(v.id);if(v.id!=="home"||view==="area"||view==="new-task")setView(v.id==="home"?"home":v.id);else setView("home");}}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,paddingTop:6,background:"none",border:"none",cursor:"pointer"}}>
            <span style={{fontSize:22,lineHeight:1,color:tab===v.id?ACC:"#8E8E93"}}>{v.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===v.id?700:500,color:tab===v.id?ACC:"#8E8E93",letterSpacing:0.3}}>{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════
  // HOME
  // ══════════════════════════════════
  if(view==="home") return(
    <Wrap>
      <div style={{padding:"52px 20px 16px"}}>
        <div style={{fontSize:12,fontWeight:600,color:"#8E8E93",letterSpacing:1.2,textTransform:"uppercase",marginBottom:4}}>{TODAY_SHORT}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:20}}>
          <div style={{fontSize:36,fontWeight:800,color:"#1C1C1E",letterSpacing:-1,lineHeight:1.05}}>Hello,<br/>Elias.</div>
          <div style={{display:"flex",gap:8}}>
            <Btn ghost onClick={openNewArea}>+ Area</Btn>
            <Btn onClick={()=>{setNewT({text:"",area:"inbox",priority:"med",due:"",time:"",dur:30,desc:""});setView("new-task");}}>+ Task</Btn>
          </div>
        </div>
        {/* Stats */}
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          {[{v:urgent.length,l:"Urgent",c:"#E84393"},{v:scheduled.length,l:"Scheduled",c:ACC},{v:doneList.length,l:"Done",c:"#34C759"}].map(s=>(
            <div key={s.l} style={{flex:1,...glass(0.8),borderRadius:16,padding:"12px 10px",textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,color:s.c,lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:11,color:"#8E8E93",marginTop:3,fontWeight:500}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Area cards */}
      <div style={{padding:"0 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <Lbl>Areas ({areas.length})</Lbl>
          <button onClick={openNewArea} style={{fontSize:12,fontWeight:700,color:ACC,background:"none",border:"none",cursor:"pointer",letterSpacing:0.3}}>Manage ›</button>
        </div>
        {areas.map(a=>{
          const at=tasks.filter(t=>t.area===a.id);
          const open=at.filter(t=>!t.done).length;
          const done=at.filter(t=>t.done).length;
          const pct=at.length?Math.round(done/at.length*100):0;
          return(
            <div key={a.id} style={{...glass(0.78,24),borderRadius:20,marginBottom:10,cursor:"pointer",
              display:"flex",alignItems:"center",gap:14,padding:"16px 18px",position:"relative"}}>
              <div onClick={()=>{setActiveArea(a.id);setView("area");setShowDone(false);}} style={{display:"contents"}}>
                <div style={{width:44,height:44,borderRadius:14,background:`${ACC}15`,display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:20,color:ACC,flexShrink:0,border:`1px solid ${ACC}28`,fontWeight:700}}>
                  {a.icon}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:17,fontWeight:700,color:"#1C1C1E",letterSpacing:-0.3}}>{a.label}</div>
                  <div style={{fontSize:12,color:"#8E8E93",marginTop:1,fontWeight:500}}>{a.sub}</div>
                  <div style={{marginTop:8,height:3,borderRadius:2,background:"rgba(0,0,0,0.07)"}}>
                    <div style={{height:3,borderRadius:2,background:pct===100?"#34C759":ACC,width:`${pct}%`,transition:"width 0.4s"}}/>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:22,fontWeight:800,color:"#1C1C1E",lineHeight:1}}>{open}</div>
                  <div style={{fontSize:11,color:"#8E8E93",marginTop:1}}>open</div>
                </div>
                <span style={{color:"#C7C7CC",fontSize:16,marginLeft:2}}>›</span>
              </div>
              {/* Edit button */}
              <button onClick={e=>{e.stopPropagation();openEditArea(a);}}
                style={{position:"absolute",top:10,right:48,background:"none",border:"none",cursor:"pointer",
                  fontSize:14,color:"#C7C7CC",padding:4,lineHeight:1}}>✎</button>
            </div>
          );
        })}
        {/* Add area card */}
        <div onClick={openNewArea}
          style={{...glass(0.5,16),borderRadius:20,marginBottom:10,padding:"16px 18px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,border:"1.5px dashed rgba(108,92,231,0.3)"}}>
          <div style={{width:44,height:44,borderRadius:14,background:`${ACC}10`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:22,color:`${ACC}80`,flexShrink:0}}>+</div>
          <div style={{fontSize:15,fontWeight:600,color:`${ACC}90`}}>Add new area</div>
        </div>
      </div>

      {/* Area Manager Sheet */}
      {showAreaMgr&&(
        <Sheet onClose={()=>setShowAreaMgr(false)} tall>
          <div style={{fontSize:20,fontWeight:800,color:"#1C1C1E",letterSpacing:-0.5,marginBottom:20}}>
            {editingArea?"Edit area":"New area"}
          </div>
          {/* Icon picker */}
          <Lbl>Icon</Lbl>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
            {ICONS.map(ic=>(
              <button key={ic} onClick={()=>setAreaForm(f=>({...f,icon:ic}))}
                style={{width:40,height:40,borderRadius:12,border:`2px solid ${areaForm.icon===ic?ACC:"transparent"}`,
                  background:areaForm.icon===ic?`${ACC}15`:"rgba(255,255,255,0.7)",
                  fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {ic}
              </button>
            ))}
          </div>
          <Lbl>Name</Lbl>
          <input autoFocus placeholder="e.g. Golf, Learning, Travel…" value={areaForm.label}
            onChange={e=>setAreaForm(f=>({...f,label:e.target.value}))}
            style={{...inputStyle,marginBottom:12}}/>
          <Lbl>Description</Lbl>
          <input placeholder="Short tagline" value={areaForm.sub}
            onChange={e=>setAreaForm(f=>({...f,sub:e.target.value}))}
            style={{...inputStyle,marginBottom:24}}/>
          <div style={{display:"flex",gap:10}}>
            {editingArea&&editingArea.id!=="inbox"&&(
              <button onClick={()=>{setShowAreaMgr(false);setConfirmDel(editingArea.id);}}
                style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(232,67,147,0.1)",
                  color:"#E84393",fontSize:15,fontWeight:700,cursor:"pointer"}}>Delete</button>
            )}
            <button onClick={()=>setShowAreaMgr(false)}
              style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(0,0,0,0.06)",
                color:"#8E8E93",fontSize:15,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={saveArea} disabled={!areaForm.label.trim()}
              style={{flex:2,padding:"14px 0",borderRadius:14,border:"none",
                background:areaForm.label.trim()?ACC:"rgba(0,0,0,0.06)",
                color:areaForm.label.trim()?"#fff":"#8E8E93",fontSize:15,fontWeight:700,cursor:"pointer"}}>
              {editingArea?"Save changes":"Create area"}
            </button>
          </div>
        </Sheet>
      )}

      {/* Confirm delete */}
      {confirmDel&&(
        <Sheet onClose={()=>setConfirmDel(null)}>
          <div style={{textAlign:"center",padding:"8px 0 20px"}}>
            <div style={{fontSize:40,marginBottom:12}}>⚠</div>
            <div style={{fontSize:20,fontWeight:800,color:"#1C1C1E",marginBottom:8}}>Delete area?</div>
            <div style={{fontSize:15,color:"#8E8E93",lineHeight:1.5,marginBottom:24}}>
              All tasks in <strong style={{color:"#1C1C1E"}}>{getArea(areas,confirmDel).label}</strong> will move to Inbox. This cannot be undone.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDel(null)}
                style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(0,0,0,0.06)",color:"#8E8E93",fontSize:16,fontWeight:600,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={()=>deleteArea(confirmDel)}
                style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"#E84393",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>
                Delete
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </Wrap>
  );

  // ══════════════════════════════════
  // AREA DETAIL
  // ══════════════════════════════════
  if(view==="area"&&activeArea){
    const a    = getArea(areas,activeArea);
    const open = tasks.filter(t=>t.area===activeArea&&!t.done);
    const done = tasks.filter(t=>t.area===activeArea&&t.done);
    return(
      <Wrap>
        <div style={{padding:"52px 20px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
            <button onClick={()=>{setView("home");setTab("home");}}
              style={{width:36,height:36,borderRadius:12,...glass(0.85),border:"none",fontSize:18,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",color:"#1C1C1E"}}>‹</button>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:600,color:"#8E8E93",letterSpacing:1,textTransform:"uppercase"}}>{a.sub}</div>
              <div style={{fontSize:28,fontWeight:800,color:"#1C1C1E",letterSpacing:-0.8,lineHeight:1.1}}>{a.label}</div>
            </div>
            <button onClick={()=>openEditArea(a)}
              style={{width:44,height:44,borderRadius:14,background:`${ACC}15`,border:`1px solid ${ACC}28`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:ACC,cursor:"pointer"}}>
              {a.icon}
            </button>
          </div>
          {/* Stats */}
          <div style={{...glass(0.8),borderRadius:16,padding:"14px 18px",display:"flex",marginBottom:4}}>
            {[{v:open.length,l:"Open"},{v:done.length,l:"Done"},{v:tasks.filter(t=>t.area===activeArea&&t.priority==="high"&&!t.done).length,l:"Urgent",c:"#E84393"}].map((s,i)=>(
              <div key={s.l} style={{flex:1,textAlign:"center",borderRight:i<2?"1px solid rgba(0,0,0,0.06)":"none"}}>
                <div style={{fontSize:26,fontWeight:800,color:s.c||"#1C1C1E",lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:11,color:"#8E8E93",marginTop:2,fontWeight:500}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:"0 20px"}}>
          {open.length>0?(
            <div style={{...glass(0.8),borderRadius:20,overflow:"hidden",marginBottom:10}}>
              {open.map((t,i)=>(
                <div key={t.id}>
                  <div style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",minHeight:56}}>
                    <button onClick={()=>toggle(t.id)}
                      style={{width:26,height:26,borderRadius:13,border:`2px solid ${ACC}50`,background:"transparent",
                        flexShrink:0,cursor:"pointer"}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,fontWeight:600,color:"#1C1C1E",lineHeight:1.3}}>{t.text}</div>
                      <div style={{display:"flex",gap:8,marginTop:3}}>
                        {t.time&&<span style={{fontSize:11,color:"#8E8E93",fontWeight:500}}>{fmt(t.time)}{t.dur?` · ${t.dur}m`:""}</span>}
                        {t.priority==="high"&&<span style={{fontSize:11,fontWeight:700,color:"#E84393"}}>Urgent</span>}
                      </div>
                    </div>
                    <button onClick={()=>delTask(t.id)} style={{background:"none",border:"none",color:"#D1D1D6",fontSize:18,cursor:"pointer",padding:4}}>×</button>
                  </div>
                  {i<open.length-1&&<div style={{height:1,background:"rgba(0,0,0,0.05)",marginLeft:58}}/>}
                </div>
              ))}
            </div>
          ):(
            <div style={{...glass(0.7),borderRadius:20,padding:"40px 24px",textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:36,marginBottom:8}}>✓</div>
              <div style={{fontSize:18,fontWeight:700,color:"#1C1C1E"}}>All done</div>
              <div style={{fontSize:14,color:"#8E8E93",marginTop:4}}>Nothing left in {a.label}</div>
            </div>
          )}

          {done.length>0&&(
            <div style={{...glass(0.65),borderRadius:20,overflow:"hidden",marginBottom:10}}>
              <button onClick={()=>setShowDone(s=>!s)}
                style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"14px 18px",background:"none",border:"none",cursor:"pointer",minHeight:44}}>
                <span style={{fontSize:12,fontWeight:700,color:"#8E8E93",letterSpacing:0.8,textTransform:"uppercase"}}>Completed ({done.length})</span>
                <span style={{fontSize:14,color:"#8E8E93"}}>{showDone?"▾":"▸"}</span>
              </button>
              {showDone&&done.map((t,i)=>(
                <div key={t.id}>
                  <div style={{display:"flex",alignItems:"center",gap:14,padding:"13px 18px",opacity:0.5}}>
                    <button onClick={()=>toggle(t.id)}
                      style={{width:26,height:26,borderRadius:13,border:"none",background:"#34C759",
                        flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13}}>✓</button>
                    <div style={{fontSize:15,color:"#8E8E93",textDecoration:"line-through",flex:1}}>{t.text}</div>
                    <button onClick={()=>delTask(t.id)} style={{background:"none",border:"none",color:"#D1D1D6",fontSize:16,cursor:"pointer",padding:4}}>×</button>
                  </div>
                  {i<done.length-1&&<div style={{height:1,background:"rgba(0,0,0,0.05)",marginLeft:58}}/>}
                </div>
              ))}
            </div>
          )}

          <button onClick={()=>{setNewT({text:"",area:activeArea,priority:"med",due:"",time:"",dur:30,desc:""});setView("new-task");}}
            style={{width:"100%",padding:"15px",borderRadius:16,border:"none",background:ACC,
              color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",letterSpacing:0.2}}>
            + Add to {a.label}
          </button>
          {a.id!=="inbox"&&(
            <button onClick={()=>{setShowAreaMgr(false);setConfirmDel(activeArea);}}
              style={{width:"100%",padding:"13px",borderRadius:16,border:"none",background:"transparent",
                color:"#E84393",fontSize:14,fontWeight:600,cursor:"pointer",marginTop:8}}>
              Delete this area
            </button>
          )}
        </div>

        {showAreaMgr&&(
          <Sheet onClose={()=>setShowAreaMgr(false)} tall>
            <div style={{fontSize:20,fontWeight:800,color:"#1C1C1E",letterSpacing:-0.5,marginBottom:20}}>Edit area</div>
            <Lbl>Icon</Lbl>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
              {ICONS.map(ic=>(
                <button key={ic} onClick={()=>setAreaForm(f=>({...f,icon:ic}))}
                  style={{width:40,height:40,borderRadius:12,border:`2px solid ${areaForm.icon===ic?ACC:"transparent"}`,
                    background:areaForm.icon===ic?`${ACC}15`:"rgba(255,255,255,0.7)",
                    fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {ic}
                </button>
              ))}
            </div>
            <Lbl>Name</Lbl>
            <input placeholder="Area name" value={areaForm.label} onChange={e=>setAreaForm(f=>({...f,label:e.target.value}))} style={{...inputStyle,marginBottom:12}}/>
            <Lbl>Description</Lbl>
            <input placeholder="Short tagline" value={areaForm.sub} onChange={e=>setAreaForm(f=>({...f,sub:e.target.value}))} style={{...inputStyle,marginBottom:24}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAreaMgr(false)} style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(0,0,0,0.06)",color:"#8E8E93",fontSize:15,fontWeight:600,cursor:"pointer"}}>Cancel</button>
              <button onClick={saveArea} style={{flex:2,padding:"14px 0",borderRadius:14,border:"none",background:ACC,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>Save changes</button>
            </div>
          </Sheet>
        )}
        {confirmDel&&(
          <Sheet onClose={()=>setConfirmDel(null)}>
            <div style={{textAlign:"center",padding:"8px 0 20px"}}>
              <div style={{fontSize:40,marginBottom:12}}>⚠</div>
              <div style={{fontSize:20,fontWeight:800,color:"#1C1C1E",marginBottom:8}}>Delete area?</div>
              <div style={{fontSize:15,color:"#8E8E93",lineHeight:1.5,marginBottom:24}}>Tasks will move to Inbox. Cannot be undone.</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(0,0,0,0.06)",color:"#8E8E93",fontSize:16,fontWeight:600,cursor:"pointer"}}>Cancel</button>
                <button onClick={()=>deleteArea(confirmDel)} style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"#E84393",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>Delete</button>
              </div>
            </div>
          </Sheet>
        )}
      </Wrap>
    );
  }

  // ══════════════════════════════════
  // SCHEDULE
  // ══════════════════════════════════
  if(view==="schedule"){
    const HOURS=Array.from({length:17},(_,i)=>i+6);
    const DS=6*60,DE=22*60,PX=1.55,TH=(DE-DS)*PX;
    const n=new Date(),nm=n.getHours()*60+n.getMinutes();
    const np=(nm>=DS&&nm<=DE)?(nm-DS)*PX:null;
    return(
      <Wrap>
        <div style={{padding:"52px 20px 16px"}}>
          <div style={{fontSize:12,fontWeight:600,color:"#8E8E93",letterSpacing:1.2,textTransform:"uppercase",marginBottom:4}}>{TODAY_SHORT}</div>
          <div style={{fontSize:34,fontWeight:800,color:"#1C1C1E",letterSpacing:-1,marginBottom:16}}>Schedule</div>
          {/* Week strip */}
          <div style={{...glass(0.8),borderRadius:18,padding:"12px 8px",display:"flex",marginBottom:20}}>
            {weekDates.map((d,i)=>{
              const isTd=d.toDateString()===today.toDateString();
              return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{fontSize:10,fontWeight:600,color:"#8E8E93",textTransform:"uppercase",letterSpacing:0.5}}>{WEEK_DAYS[d.getDay()]}</div>
                  <div style={{width:32,height:32,borderRadius:16,background:isTd?ACC:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:15,fontWeight:isTd?700:500,color:isTd?"#fff":d.getDay()===0||d.getDay()===6?"#C7C7CC":"#1C1C1E"}}>{d.getDate()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{padding:"0 20px"}}>
          <div style={{...glass(0.78),borderRadius:20,padding:"16px 0 16px 16px",overflow:"hidden"}}>
            <div style={{display:"flex",gap:4}}>
              <div style={{width:52,flexShrink:0,position:"relative",height:TH}}>
                {HOURS.map(h=>(
                  <div key={h} style={{position:"absolute",top:(h*60-DS)*PX-6,fontSize:11,fontWeight:500,color:"#8E8E93",textAlign:"right",width:48,lineHeight:1}}>
                    {h===12?"noon":h<12?`${h}am`:`${h-12}pm`}
                  </div>
                ))}
              </div>
              <div style={{flex:1,position:"relative",height:TH,marginRight:16}}>
                {HOURS.map(h=>(<div key={h} style={{position:"absolute",top:(h*60-DS)*PX,left:0,right:0,height:0.5,background:"rgba(0,0,0,0.06)"}}/>))}
                {np!==null&&(
                  <div style={{position:"absolute",top:np,left:0,right:0,zIndex:5,display:"flex",alignItems:"center"}}>
                    <div style={{width:9,height:9,borderRadius:5,background:ACC,marginLeft:-4,flexShrink:0,border:"2px solid #fff"}}/>
                    <div style={{flex:1,height:1.5,background:ACC}}/>
                  </div>
                )}
                {scheduled.map((t,idx)=>{
                  const top=(t2m(t.time)-DS)*PX;
                  const h=Math.max((t.dur||30)*PX,44);
                  const ec=EVENT_COLORS[idx%EVENT_COLORS.length];
                  const endMin=t2m(t.time)+(t.dur||30);
                  const endStr=`${Math.floor(endMin/60)}:${String(endMin%60).padStart(2,"0")}`;
                  return(
                    <div key={t.id} style={{position:"absolute",top,left:0,right:0,height:h,
                      background:ec.bg,borderLeft:`3.5px solid ${ec.border}`,borderRadius:"0 12px 12px 0",
                      padding:"7px 12px",overflow:"hidden",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#1C1C1E",lineHeight:1.2,marginBottom:2}}>{t.text}</div>
                      <div style={{fontSize:11,color:"#8E8E93",fontWeight:500}}>{fmt(t.time)} – {fmt(endStr)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {scheduled.length===0&&<div style={{textAlign:"center",padding:"32px 0",color:"#8E8E93",fontSize:14}}>No tasks scheduled today.<br/>Set a time on any task to see it here.</div>}
        </div>
      </Wrap>
    );
  }

  // ══════════════════════════════════
  // AI
  // ══════════════════════════════════
  if(view==="ai") return(
    <Wrap>
      <div style={{padding:"52px 20px 20px"}}>
        <div style={{fontSize:34,fontWeight:800,color:"#1C1C1E",letterSpacing:-1,marginBottom:4}}>AI Assistant</div>
        <div style={{fontSize:14,color:"#8E8E93",marginBottom:20}}>Brain dump or paste an email. I'll handle the rest.</div>
        <div style={{...glass(0.8),borderRadius:14,padding:4,display:"flex",marginBottom:20}}>
          {[{id:"brain",label:"✦ Brain dump"},{id:"email",label:"✉ Email"}].map(m=>(
            <button key={m.id} onClick={()=>{setAiMode(m.id);setAiResult(null);setPending([]);setAiInput("");}}
              style={{flex:1,padding:"9px 0",borderRadius:11,border:"none",background:aiMode===m.id?ACC:"transparent",
                color:aiMode===m.id?"#fff":"#8E8E93",fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {m.label}
            </button>
          ))}
        </div>
        {!aiResult&&(
          <>
            <textarea autoFocus value={aiInput} onChange={e=>setAiInput(e.target.value)}
              placeholder={aiMode==="brain"?"Type anything — a goal, problem, brain dump…":"Paste full email here…"}
              style={{width:"100%",padding:"16px",borderRadius:16,...glass(0.75),fontSize:16,resize:"none",
                minHeight:aiMode==="email"?180:130,boxSizing:"border-box",fontFamily:"inherit",outline:"none",
                color:"#1C1C1E",marginBottom:12,lineHeight:1.5}}/>
            {aiErr&&<div style={{fontSize:13,color:"#E84393",marginBottom:8,fontWeight:500}}>{aiErr}</div>}
            <button onClick={runAI} disabled={aiLoad||!aiInput.trim()}
              style={{width:"100%",padding:"16px",borderRadius:16,border:"none",
                background:aiLoad||!aiInput.trim()?"rgba(0,0,0,0.07)":ACC,
                color:aiLoad||!aiInput.trim()?"#8E8E93":"#fff",
                fontSize:17,fontWeight:700,cursor:aiLoad?"default":"pointer"}}>
              {aiLoad?"Thinking...":aiMode==="brain"?"Break it down ↗":"Extract tasks ↗"}
            </button>
          </>
        )}
        {aiResult&&(
          <div>
            <div style={{...glass(0.75),borderRadius:16,padding:"14px 16px",marginBottom:12,fontSize:15,color:"#3C3C43",lineHeight:1.6}}>{aiResult.summary}</div>
            {aiResult.research&&<InfoCard color="#FF9F0A" label="Options found" text={aiResult.research} bg="rgba(255,159,10,0.1)" border="rgba(255,159,10,0.2)"/>}
            {aiResult.insight&&<InfoCard color={ACC} label="Key insight" text={aiResult.insight} bg={`${ACC}10`} border={`${ACC}28`}/>}
            {aiResult.timeline?.length>0&&(
              <div style={{...glass(0.7),borderRadius:16,padding:"14px 16px",marginBottom:12}}>
                <Lbl>Timeline</Lbl>
                {aiResult.timeline.map((w,i)=>(
                  <div key={i} style={{display:"flex",gap:12,marginBottom:8}}>
                    <div style={{fontSize:11,color:ACC,minWidth:76,paddingTop:2,fontWeight:700}}>{w.week}</div>
                    <div style={{fontSize:14,color:"#3C3C43",flex:1,lineHeight:1.4}}>{w.focus}</div>
                  </div>
                ))}
              </div>
            )}
            <Lbl>Tasks — {pending.filter(p=>p.sel).length} selected</Lbl>
            <div style={{...glass(0.75),borderRadius:18,overflow:"hidden",marginBottom:14}}>
              {pending.map((p,i)=>{
                const a=getArea(areas,p.area);
                return(
                  <div key={p.id}>
                    <div onClick={()=>setPending(ps=>ps.map(x=>x.id===p.id?{...x,sel:!x.sel}:x))}
                      style={{display:"flex",gap:12,padding:"14px 16px",cursor:"pointer",opacity:p.sel?1:0.3}}>
                      <div style={{width:24,height:24,borderRadius:12,border:`2px solid ${p.sel?ACC:"#D1D1D6"}`,
                        background:p.sel?ACC:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:2}}>
                        {p.sel&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:15,fontWeight:600,color:"#1C1C1E",marginBottom:4,lineHeight:1.3}}>{p.text}</div>
                        {p.notes&&<div style={{fontSize:12,color:"#8E8E93",marginBottom:4}}>{p.notes}</div>}
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20,background:`${ACC}15`,color:ACC}}>{a.label}</span>
                          <span style={{fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20,background:PRI[p.priority].color+"15",color:PRI[p.priority].color}}>{PRI[p.priority].label}</span>
                          {p.time&&<span style={{fontSize:11,padding:"2px 9px",borderRadius:20,background:"rgba(0,0,0,0.05)",color:"#8E8E93"}}>{fmt(p.time)} · {p.dur}m</span>}
                        </div>
                      </div>
                    </div>
                    {i<pending.length-1&&<div style={{height:1,background:"rgba(0,0,0,0.05)",marginLeft:52}}/>}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setAiResult(null);setPending([]);}}
                style={{flex:1,padding:"14px 0",borderRadius:14,border:"none",background:"rgba(0,0,0,0.06)",color:"#8E8E93",fontSize:16,fontWeight:600,cursor:"pointer"}}>Back</button>
              <button onClick={addPending} disabled={!pending.some(p=>p.sel)}
                style={{flex:2,padding:"14px 0",borderRadius:14,border:"none",
                  background:pending.some(p=>p.sel)?ACC:"rgba(0,0,0,0.06)",
                  color:pending.some(p=>p.sel)?"#fff":"#8E8E93",fontSize:16,fontWeight:700,cursor:"pointer"}}>
                Add {pending.filter(p=>p.sel).length} tasks
              </button>
            </div>
          </div>
        )}
      </div>
    </Wrap>
  );

  // ══════════════════════════════════
  // NEW TASK
  // ══════════════════════════════════
  if(view==="new-task") return(
    <div style={{fontFamily:"-apple-system,'SF Pro Display',system-ui,sans-serif",maxWidth:390,margin:"0 auto",
      minHeight:"100vh",background:"linear-gradient(160deg,#f0f0f5 0%,#e8e8f0 100%)"}}>
      <div style={{position:"fixed",top:-80,right:-60,width:260,height:260,borderRadius:"50%",background:`${ACC}16`,pointerEvents:"none"}}/>
      <div style={{position:"relative",padding:"52px 20px 40px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <button onClick={()=>setView(activeArea?"area":"home")}
            style={{width:36,height:36,borderRadius:12,...glass(0.85),border:"none",fontSize:18,cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",color:"#1C1C1E"}}>×</button>
          <div style={{fontSize:20,fontWeight:800,color:"#1C1C1E",letterSpacing:-0.5}}>New Task</div>
          <div style={{width:36}}/>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          {["today","tomorrow","later"].map(d=>(
            <button key={d} onClick={()=>setNewDay(d)}
              style={{padding:"9px 18px",borderRadius:20,border:"none",background:newDay===d?ACC:"rgba(255,255,255,0.7)",
                color:newDay===d?"#fff":"#1C1C1E",fontSize:15,fontWeight:700,cursor:"pointer",
                backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",textTransform:"capitalize"}}>
              {d.charAt(0).toUpperCase()+d.slice(1)}
            </button>
          ))}
        </div>
        <Lbl>Area</Lbl>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:22}}>
          {areas.map(a=>(
            <button key={a.id} onClick={()=>setNewT(n=>({...n,area:a.id}))}
              style={{padding:"7px 15px",borderRadius:20,border:`1.5px solid ${newT.area===a.id?ACC:"transparent"}`,
                background:newT.area===a.id?`${ACC}15`:"rgba(255,255,255,0.65)",
                color:newT.area===a.id?ACC:"#1C1C1E",fontSize:13,fontWeight:600,cursor:"pointer",
                backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
        <Lbl>Priority</Lbl>
        <div style={{display:"flex",gap:8,marginBottom:22}}>
          {Object.entries(PRI).map(([k,v])=>(
            <button key={k} onClick={()=>setNewT(n=>({...n,priority:k}))}
              style={{flex:1,padding:"10px 0",borderRadius:14,border:`1.5px solid ${newT.priority===k?v.color:"transparent"}`,
                background:newT.priority===k?`${v.color}15`:"rgba(255,255,255,0.65)",
                color:newT.priority===k?v.color:"#8E8E93",fontSize:14,fontWeight:700,cursor:"pointer",
                backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)"}}>
              {v.label}
            </button>
          ))}
        </div>
        <Lbl>Title</Lbl>
        <input autoFocus placeholder="What needs doing?" value={newT.text} onChange={e=>setNewT(n=>({...n,text:e.target.value}))}
          style={{...inputStyle,marginBottom:10}}/>
        <input placeholder="Description (optional)" value={newT.desc||""} onChange={e=>setNewT(n=>({...n,desc:e.target.value}))}
          style={{...inputStyle,marginBottom:22}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
          <div><Lbl>Time</Lbl>
            <input type="time" value={newT.time} onChange={e=>setNewT(n=>({...n,time:e.target.value}))} style={inputStyle}/></div>
          <div><Lbl>Duration (min)</Lbl>
            <input type="number" placeholder="30" value={newT.dur||""} onChange={e=>setNewT(n=>({...n,dur:+e.target.value}))} style={inputStyle}/></div>
        </div>
        <button onClick={addManual}
          style={{width:"100%",padding:"16px",borderRadius:16,border:"none",background:ACC,
            color:"#fff",fontSize:17,fontWeight:800,cursor:"pointer",letterSpacing:0.3}}>
          Create
        </button>
      </div>
    </div>
  );

  return null;
}

// ── SHARED COMPONENTS ──
function Sheet({children,onClose,tall}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"flex-end",zIndex:200,backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"rgba(245,245,250,0.97)",backdropFilter:"blur(30px)",WebkitBackdropFilter:"blur(30px)",
        borderRadius:"20px 20px 0 0",padding:"12px 20px 44px",width:"100%",boxSizing:"border-box",
        maxHeight:tall?"93vh":"auto",overflowY:"auto",border:"1px solid rgba(255,255,255,0.8)"}}>
        <div style={{width:36,height:5,borderRadius:3,background:"#D1D1D6",margin:"0 auto 20px"}}/>
        {children}
      </div>
    </div>
  );
}
function Btn({children,onClick,ghost}){
  return(
    <button onClick={onClick} style={{padding:"8px 14px",borderRadius:20,border:ghost?`1.5px solid ${ACC}`:"none",
      background:ghost?"transparent":ACC,color:ghost?ACC:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
      backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",whiteSpace:"nowrap"}}>
      {children}
    </button>
  );
}
function Lbl({children}){
  return <div style={{fontSize:11,fontWeight:700,color:"#8E8E93",letterSpacing:1.2,textTransform:"uppercase",marginBottom:8}}>{children}</div>;
}
function InfoCard({color,label,text,bg,border}){
  return(
    <div style={{background:bg,borderRadius:16,padding:"14px 16px",marginBottom:12,border:`1px solid ${border}`}}>
      <div style={{fontSize:11,fontWeight:700,color,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{label}</div>
      <div style={{fontSize:14,lineHeight:1.5,color:"#3C3C43"}}>{text}</div>
    </div>
  );
}
const inputStyle = {
  width:"100%",padding:"14px 16px",borderRadius:14,border:"1px solid rgba(255,255,255,0.7)",
  background:"rgba(255,255,255,0.75)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",
  fontSize:16,fontFamily:"inherit",outline:"none",color:"#1C1C1E",boxSizing:"border-box",display:"block"
};