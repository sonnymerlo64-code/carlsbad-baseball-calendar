'use client';
import { useEffect, useState } from 'react';

const EMPTY = {date:'',time:'',arrival_time:'',team:'Varsity',opponent:'',home_away:'TBD',location:'',address:'',status:'Scheduled',event_name:'',event_type:'Game',bus_departure:'',uniform:'',notes:''};
const LEVELS=['Varsity','JV','Frosh','JV/Frosh','All'];
const TYPES=['Game','Practice','Tournament','Tryout','Camp','Travel','Team Event'];

function d(v){ return String(v || '').slice(0,10); }
function timeInput(v){
  const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);
  return m ? `${String(Number(m[1])).padStart(2,'0')}:${m[2]}` : '';
}
function time12(v){
  const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);
  if(!m) return v || 'TBD';
  let h=Number(m[1]); const min=m[2];
  const ap=h>=12?'PM':'AM'; h=h%12||12;
  return `${h}:${min} ${ap}`;
}
function cls(v){ return String(v||'all').toLowerCase().replace(/\//g,'-').replace(/\s+/g,'-'); }

export default function AdminPage(){
  const [loggedIn,setLoggedIn]=useState(false);
  const [password,setPassword]=useState('');
  const [events,setEvents]=useState([]);
  const [banners,setBanners]=useState([]);
  const [message,setMessage]=useState('');
  const [month,setMonth]=useState(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1)});
  const [today,setToday]=useState(()=>new Date());
  useEffect(()=>{
    const refreshToday=()=>{
      const n=new Date();
      setToday(n);
      setMonth(prev=>{
        const wasCurrent=prev.getFullYear()===today.getFullYear()&&prev.getMonth()===today.getMonth();
        return wasCurrent ? new Date(n.getFullYear(),n.getMonth(),1) : prev;
      });
    };
    const timer=setInterval(refreshToday,30000);
    window.addEventListener('focus',refreshToday);
    document.addEventListener('visibilitychange',refreshToday);
    return ()=>{clearInterval(timer);window.removeEventListener('focus',refreshToday);document.removeEventListener('visibilitychange',refreshToday)};
  },[today]);
  const [filter,setFilter]=useState('All');
  const [open,setOpen]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(EMPTY);

  useEffect(function(){ load(); },[]);

  async function load(){
    try{
      const r=await fetch('/api/events',{cache:'no-store'});
      const x=await r.json();
      if(!r.ok) throw new Error(x.error || 'Unable to load schedule');
      setEvents(Array.isArray(x.events)?x.events:[]);
      setBanners(Array.isArray(x.banners)?x.banners:[]);
    }catch(e){ setMessage(e.message || 'Unable to load schedule'); }
  }
  async function login(e){
    e.preventDefault(); setMessage('');
    try{
      const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      if(!r.ok){setMessage('Incorrect admin password');return;}
      setLoggedIn(true); setPassword('');
    }catch(e){setMessage('Unable to log in');}
  }
  function add(date){
    setEditId(null); setForm({...EMPTY,date:date||''}); setOpen(true);
  }
  function edit(ev){
    setEditId(ev.id);
    setForm({...EMPTY,...ev,date:d(ev.date),time:timeInput(ev.time),arrival_time:timeInput(ev.arrival_time),notes:String(ev.notes||'').replace(/V5_SOURCE_SEED/g,'').replace(' • ','').trim()});
    setOpen(true);
  }
  async function save(e){
    e.preventDefault(); setMessage('');
    const r=await fetch(editId?`/api/events/${editId}`:'/api/events',{method:editId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    if(r.status===401){setLoggedIn(false);setOpen(false);setMessage('Please log in again');return;}
    if(!r.ok){setMessage('Unable to save event');return;}
    await load(); setOpen(false); setEditId(null); setForm(EMPTY);
  }
  async function remove(){
    if(!editId || !window.confirm('Delete this event?')) return;
    const r=await fetch(`/api/events/${editId}`,{method:'DELETE'});
    if(r.status===401){setLoggedIn(false);setOpen(false);setMessage('Please log in again');return;}
    if(!r.ok){setMessage('Unable to delete event');return;}
    await load(); setOpen(false); setEditId(null); setForm(EMPTY);
  }

  const y=month.getFullYear(), mo=month.getMonth();
  const first=new Date(y,mo,1).getDay(), count=new Date(y,mo+1,0).getDate();
  const prefix=`${y}-${String(mo+1).padStart(2,'0')}`;
  const visible=events.filter(ev=>filter==='All'||ev.team===filter||ev.team==='All');
  const monthBanners=banners.filter(b=>d(b.start_date).slice(0,7)<=prefix&&d(b.end_date).slice(0,7)>=prefix);

  if(!loggedIn){
    return <main className="wrap"><div className="card login">
      <img src="/carlsbad-logo.png" className="adminlogo" alt="Carlsbad Baseball"/>
      <h2>Coach Admin</h2><p className="muted">Enter the admin password to edit the schedule.</p>
      {message?<div className="error">{message}</div>:null}
      <form onSubmit={login}><div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
      <div className="actions"><button type="submit">Log In</button><a className="btn secondary" href="/">View Calendar</a></div></form>
    </div></main>;
  }

  return <main className="wrap">
    {message?<div className="error">{message}</div>:null}
    <section className="scheduleHero"><div><div className="eyebrow">COACH ADMIN</div><h2>Carlsbad Baseball Schedule</h2><p>Click an event to edit it. Use + to add an event.</p></div></section>
    <div className="toolbar">
      <div className="navgroup"><button type="button" className="iconbtn" onClick={()=>setMonth(new Date(y,mo-1,1))}>‹</button><div className="monthnav">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div><button type="button" className="iconbtn" onClick={()=>setMonth(new Date(y,mo+1,1))}>›</button></div>
      <div className="filtergroup"><select value={filter} onChange={e=>setFilter(e.target.value)}>{['All','Varsity','JV','Frosh','JV/Frosh'].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
      <button type="button" onClick={()=>add('')}>+ Add Event</button><a className="btn secondary" href="/">Public View</a>
    </div>
    <div className="legend"><span><i className="dot varsity"/>Varsity</span><span><i className="dot jv"/>JV</span><span><i className="dot frosh"/>Frosh</span><span><i className="dot combo"/>JV/Frosh</span><span><i className="dot all"/>All Levels</span></div>
    {monthBanners.map(b=><div className="breakBanner" key={String(b.id)}><b>{b.title}</b><span>{b.subtitle}</span></div>)}
    <div className="calendar adminCalendar">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><div className="dow" key={x}>{x}</div>)}
      {Array.from({length:first},(_,i)=><div className="day empty" key={`e${i}`}/>)}
      {Array.from({length:count},(_,i)=>i+1).map(day=>{
        const ds=`${prefix}-${String(day).padStart(2,'0')}`;
        const dayEvents=visible.filter(ev=>d(ev.date)===ds);
        const dayBreaks=banners.filter(b=>d(b.start_date)<=ds&&d(b.end_date)>=ds);
        const isToday=today.getFullYear()===y&&today.getMonth()===mo&&today.getDate()===day; return <div className={`day ${dayBreaks.length?'breakday ':''}${isToday?'today':''}`} key={ds}>
          <div className="adminDayHead"><span className="num">{day}</span><button type="button" className="dayAdd" onClick={()=>add(ds)}>+</button></div>
          {dayBreaks.map(b=><div className="miniBreak" key={String(b.id)}>{b.title}</div>)}
          {dayEvents.map(ev=><button type="button" key={String(ev.id)} onClick={()=>edit(ev)} className={`event team-${cls(ev.team)} type-${cls(ev.event_type)}`}><span className="eventteam">{ev.team}</span><span>{time12(ev.time)}</span><strong>{ev.event_type==='Game' ? (ev.opponent||ev.event_name||'Game') : (ev.event_name||ev.opponent||'Event')}</strong><em>{ev.event_type}</em></button>)}
        </div>;
      })}
    </div>
    {open?<div className="modal" onClick={()=>setOpen(false)}><div className="modalbox adminModal" onClick={e=>e.stopPropagation()}>
      <div className="modalhead"><div><div className="eyebrow dark">COACH ADMIN</div><h2>{editId?'Edit Event':'Add Event'}</h2></div><button type="button" className="closebtn" onClick={()=>setOpen(false)}>×</button></div>
      <form className="grid2" onSubmit={save}>
        {[['date','Date','date'],['time','Start / Game Time','time'],['arrival_time','Arrival Time','time'],['opponent','Opponent','text'],['event_name','Event Name','text'],['location','Location / Field','text'],['address','Address','text'],['bus_departure','Bus / Departure','text'],['uniform','Uniform','text']].map(a=><div className="field" key={a[0]}><label>{a[1]}</label><input type={a[2]} value={form[a[0]]||''} onChange={e=>setForm({...form,[a[0]]:e.target.value})} required={a[0]==='date'}/></div>)}
        <div className="field"><label>Level</label><select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}>{LEVELS.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Event Type</label><select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Home / Away</label><select value={form.home_away} onChange={e=>setForm({...form,home_away:e.target.value})}>{['Home','Away','TBD'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Scheduled','TBD','Changed','Canceled','Final'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field full"><label>Notes</label><textarea rows="3" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div className="actions full"><button type="submit">{editId?'Save Changes':'Add Event'}</button>{editId?<button type="button" className="danger" onClick={remove}>Delete Event</button>:null}<button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancel</button></div>
      </form>
    </div></div>:null}
  </main>;
}
