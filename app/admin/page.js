'use client';
import {useEffect,useState} from 'react';

const TEAMS=['All','Varsity','JV','Frosh','JV/Frosh'];
const EVENT_TYPES=['Game','Practice','Tournament','Tryout','Camp','Travel','Team Event'];
const blank={date:'',time:'',arrival_time:'',team:'Varsity',opponent:'',home_away:'TBD',location:'',address:'',status:'Scheduled',event_name:'',event_type:'Game',bus_departure:'',uniform:'',notes:''};

function slug(s){return String(s||'All').toLowerCase().replaceAll('/','-').replaceAll(' ','-')}
function formatTime(t){
  if(!t) return 'TBD';
  const v=String(t).trim();
  const match=v.match(/^(\d{1,2}):(\d{2})/);
  if(!match) return v;
  let h=Number(match[1]), m=Number(match[2]);
  if(h>23||m>59) return v;
  const ap=h>=12?'PM':'AM';
  h=h%12||12;
  return `${h}:${String(m).padStart(2,'0')} ${ap}`;
}
function inputTime(t){
  if(!t) return '';
  const match=String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  if(!match) return '';
  return `${String(Number(match[1])).padStart(2,'0')}:${match[2]}`;
}
function dateOnly(v){return String(v||'').slice(0,10)}
function normalized(x){
  return {...blank,...x,date:dateOnly(x.date),time:inputTime(x.time),arrival_time:inputTime(x.arrival_time),notes:String(x.notes||'').replace(' • V5_SOURCE_SEED','').replace('V5_SOURCE_SEED','').trim()};
}

export default function Admin(){
  const [events,setEvents]=useState([]);
  const [banners,setBanners]=useState([]);
  const [auth,setAuth]=useState(false);
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [team,setTeam]=useState('All');
  const [month,setMonth]=useState(new Date(2026,8,1));
  const [editorOpen,setEditorOpen]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(blank);

  useEffect(()=>{loadSchedule()},[]);

  async function loadSchedule(){
    try{
      const r=await fetch('/api/events',{cache:'no-store'});
      const data=await r.json();
      if(!r.ok) throw new Error(data.error||'Unable to load schedule');
      setEvents(Array.isArray(data.events)?data.events:[]);
      setBanners(Array.isArray(data.banners)?data.banners:[]);
    }catch(err){setMessage(err.message||'Unable to load schedule')}
  }

  async function login(e){
    e.preventDefault(); setMessage('');
    try{
      const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      if(!r.ok){setMessage('Incorrect admin password');return}
      setAuth(true);
      setPassword('');
    }catch{setMessage('Unable to log in')}
  }

  function scrollToEditor(){
    setTimeout(()=>document.getElementById('event-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
  }
  function addEvent(date=''){
    setEditId(null);
    setForm({...blank,date});
    setEditorOpen(true);
    scrollToEditor();
  }
  function editEvent(event){
    setEditId(event.id);
    setForm(normalized(event));
    setEditorOpen(true);
    scrollToEditor();
  }
  function closeEditor(){
    setEditorOpen(false); setEditId(null); setForm(blank); setMessage('');
  }

  async function save(e){
    e.preventDefault(); setMessage('');
    const url=editId?`/api/events/${editId}`:'/api/events';
    try{
      const r=await fetch(url,{method:editId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json().catch(()=>({}));
      if(r.status===401){setAuth(false);setEditorOpen(false);setMessage('Please log in again');return}
      if(!r.ok) throw new Error(data.error||'Unable to save event');
      await loadSchedule();
      closeEditor();
    }catch(err){setMessage(err.message||'Unable to save event')}
  }

  async function removeEvent(){
    if(!editId||!window.confirm('Delete this event?')) return;
    setMessage('');
    try{
      const r=await fetch(`/api/events/${editId}`,{method:'DELETE'});
      if(r.status===401){setAuth(false);setEditorOpen(false);setMessage('Please log in again');return}
      if(!r.ok) throw new Error('Unable to delete event');
      await loadSchedule();
      closeEditor();
    }catch(err){setMessage(err.message||'Unable to delete event')}
  }

  const y=month.getFullYear();
  const m=month.getMonth();
  const first=new Date(y,m,1).getDay();
  const days=new Date(y,m+1,0).getDate();
  const prefix=`${y}-${String(m+1).padStart(2,'0')}`;
  const visibleEvents=events.filter(e=>team==='All'||e.team===team||e.team==='All');
  const monthBanners=banners.filter(b=>dateOnly(b.start_date).slice(0,7)<=prefix&&dateOnly(b.end_date).slice(0,7)>=prefix);

  if(!auth){
    return <main className="wrap">
      <div className="card login">
        <img src="/carlsbad-logo.png" className="adminlogo" alt="Carlsbad Baseball"/>
        <h2>Coach Admin</h2>
        <p className="muted">Enter the admin password to edit the Carlsbad Baseball schedule.</p>
        {message&&<div className="error">{message}</div>}
        <form onSubmit={login}>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
          <div className="actions"><button type="submit">Log In</button><a className="btn secondary" href="/">View Calendar</a></div>
        </form>
      </div>
    </main>
  }

  return <main className="wrap adminPage">
    {message&&<div className="error">{message}</div>}
    <section className="scheduleHero">
      <div><div className="eyebrow">COACH ADMIN</div><h2>Carlsbad Baseball Schedule</h2><p>Click an event to edit it, or add a new event directly from the calendar.</p></div>
    </section>

    <div className="toolbar adminToolbar">
      <div className="navgroup">
        <button type="button" className="iconbtn" onClick={()=>setMonth(new Date(y,m-1,1))}>‹</button>
        <div className="monthnav">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
        <button type="button" className="iconbtn" onClick={()=>setMonth(new Date(y,m+1,1))}>›</button>
      </div>
      <div className="filtergroup"><select value={team} onChange={e=>setTeam(e.target.value)}>{TEAMS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      <button type="button" onClick={()=>addEvent()}>+ Add Event</button>
      <a className="btn secondary" href="/">Public View</a>
    </div>

    <div className="legend">
      <span><i className="dot varsity"/>Varsity</span><span><i className="dot jv"/>JV</span><span><i className="dot frosh"/>Frosh</span><span><i className="dot combo"/>JV/Frosh</span><span><i className="dot all"/>All Levels</span>
    </div>

    {monthBanners.map(b=><div className="breakBanner" key={b.id}>
      <b>{b.title}</b><span>{b.subtitle}</span>
      <small>{new Date(dateOnly(b.start_date)+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}{dateOnly(b.start_date)!==dateOnly(b.end_date)?' – '+new Date(dateOnly(b.end_date)+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</small>
    </div>)}

    <div className="calendar adminCalendar">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="dow" key={d}>{d}</div>)}
      {Array.from({length:first}).map((_,i)=><div className="day empty" key={`empty-${i}`}/>)}
      {Array.from({length:days},(_,i)=>i+1).map(day=>{
        const ds=`${prefix}-${String(day).padStart(2,'0')}`;
        const dayEvents=visibleEvents.filter(e=>dateOnly(e.date)===ds);
        const dayBanners=banners.filter(b=>dateOnly(b.start_date)<=ds&&dateOnly(b.end_date)>=ds);
        return <div className={`day ${dayBanners.length?'breakday':''}`} key={ds}>
          <div className="adminDayHead"><span className="num">{day}</span><button type="button" className="dayAdd" onClick={()=>addEvent(ds)} title={`Add event on ${ds}`}>+</button></div>
          {dayBanners.map(b=><div className="miniBreak" key={b.id}>{b.title}</div>)}
          {dayEvents.map(e=><button type="button" key={e.id} onClick={()=>editEvent(e)} className={`event team-${slug(e.team)} type-${slug(e.event_type)}`}>
            <span className="eventteam">{e.team}</span><span>{formatTime(e.time)}</span><strong>{e.event_name||e.opponent||'Event'}</strong><em>{e.event_type}</em>
          </button>)}
        </div>
      })}
    </div>

    {editorOpen&&<div id="event-editor" className="card adminEditor">
      <div className="editorTitle"><div><div className="eyebrow dark">{editId?'EDIT EVENT':'NEW EVENT'}</div><h2>{editId?'Edit Event':'Add Event'}</h2></div><button type="button" className="secondary" onClick={closeEditor}>Close</button></div>
      <form className="grid2" onSubmit={save}>
        {[['date','Date','date'],['time','Start / Game Time','time'],['arrival_time','Arrival Time','time'],['opponent','Opponent','text'],['event_name','Event Name','text'],['location','Location / Field','text'],['address','Address','text'],['bus_departure','Bus / Departure','text'],['uniform','Uniform','text']].map(([k,label,type])=><div className="field" key={k}><label>{label}</label><input type={type} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==='date'}/></div>)}
        <div className="field"><label>Level</label><select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}>{TEAMS.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div className="field"><label>Event Type</label><select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}>{EVENT_TYPES.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div className="field"><label>Home / Away</label><select value={form.home_away} onChange={e=>setForm({...form,home_away:e.target.value})}>{['Home','Away','TBD'].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Scheduled','TBD','Changed','Canceled','Final'].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div className="field full"><label>Notes</label><textarea rows="3" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div className="actions full">
          <button type="submit">{editId?'Save Changes':'Add Event'}</button>
          {editId&&<button type="button" className="danger" onClick={removeEvent}>Delete Event</button>}
          <button type="button" className="secondary" onClick={closeEditor}>Cancel</button>
        </div>
      </form>
    </div>}
  </main>
}
