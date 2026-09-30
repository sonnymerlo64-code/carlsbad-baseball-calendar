'use client';
import {useEffect,useMemo,useState} from 'react';

const teams=['All','Varsity','JV','Frosh','JV/Frosh'];
const blank={date:'',time:'',arrival_time:'',team:'Varsity',opponent:'',home_away:'TBD',location:'',address:'',status:'Scheduled',event_name:'',event_type:'Game',bus_departure:'',uniform:'',notes:''};
const clean=n=>(n||'').replace(' • V5_SOURCE_SEED','').replace('V5_SOURCE_SEED','').trim();
const slug=s=>(s||'All').toLowerCase().replaceAll('/','-').replaceAll(' ','-');

function formatTime(t){
  if(!t) return 'TBD';
  const v=String(t).trim();
  if(!/^\d{1,2}:\d{2}$/.test(v)) return v;
  let [h,m]=v.split(':').map(Number);
  if(h>23||m>59) return v;
  const ap=h>=12?'PM':'AM';
  h=h%12||12;
  return `${h}:${String(m).padStart(2,'0')} ${ap}`;
}
function inputTime(t){
  if(!t) return '';
  const v=String(t).trim();
  const m=v.match(/^(\d{1,2}):(\d{2})/);
  if(!m) return '';
  return `${String(Number(m[1])).padStart(2,'0')}:${m[2]}`;
}
function normalizeEvent(x){
  return {...blank,...x,date:String(x.date||'').slice(0,10),time:inputTime(x.time),arrival_time:inputTime(x.arrival_time),notes:clean(x.notes)};
}

export default function Admin(){
  const [events,setEvents]=useState([]);
  const [banners,setBanners]=useState([]);
  const [auth,setAuth]=useState(false);
  const [password,setPassword]=useState('');
  const [msg,setMsg]=useState('');
  const [team,setTeam]=useState('All');
  const [month,setMonth]=useState(new Date(2026,8,1));
  const [form,setForm]=useState(blank);
  const [edit,setEdit]=useState(null);
  const [showForm,setShowForm]=useState(false);

  const load=async()=>{
    const r=await fetch('/api/events',{cache:'no-store'});
    const x=await r.json();
    if(x.events){setEvents(x.events);setBanners(x.banners||[])}
    else setMsg(x.error||'Unable to load schedule');
  };
  useEffect(()=>{load()},[]);

  async function login(e){
    e.preventDefault();
    setMsg('');
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    if(r.ok){setAuth(true);setMsg('')}
    else setMsg('Incorrect admin password');
  }

  function newEvent(date=''){
    setEdit(null);
    setForm({...blank,date});
    setShowForm(true);
    setTimeout(()=>document.getElementById('event-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }

  function startEdit(x){
    setEdit(x.id);
    setForm(normalizeEvent(x));
    setShowForm(true);
    setTimeout(()=>document.getElementById('event-editor')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
  }

  async function save(e){
    e.preventDefault();
    setMsg('');
    const r=await fetch(edit?`/api/events/${edit}`:'/api/events',{
      method:edit?'PUT':'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(form)
    });
    if(r.status===401){setAuth(false);setMsg('Please log in again');return}
    if(!r.ok){let x={};try{x=await r.json()}catch{};setMsg(x.error||'Unable to save event');return}
    await load();
    setShowForm(false);setEdit(null);setForm(blank);
  }

  async function del(){
    if(!edit||!confirm('Delete this event?')) return;
    const r=await fetch(`/api/events/${edit}`,{method:'DELETE'});
    if(r.status===401){setAuth(false);setMsg('Please log in again');return}
    if(!r.ok){setMsg('Unable to delete event');return}
    await load();
    setShowForm(false);setEdit(null);setForm(blank);
  }

  if(!auth) return <main className="wrap"><div className="card login">
    <img src="/carlsbad-logo.png" className="adminlogo"/>
    <h2>Coach Admin</h2>
    <p className="muted">Enter the admin password to edit the Carlsbad Baseball schedule.</p>
    {msg&&<div className="error">{msg}</div>}
    <form onSubmit={login}>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>
      <div className="actions"><button type="submit">Log In</button><a className="btn secondary" href="/">View Calendar</a></div>
    </form>
  </div></main>;

  const filtered=useMemo(()=>events.filter(e=>team==='All'||e.team===team||e.team==='All'),[events,team]);
  const y=month.getFullYear(),m=month.getMonth();
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const prefix=`${y}-${String(m+1).padStart(2,'0')}`;
  const monthBanners=banners.filter(b=>String(b.start_date).slice(0,7)<=prefix&&String(b.end_date).slice(0,7)>=prefix);

  return <main className="wrap">
    {msg&&<div className="error">{msg}</div>}
    <section className="scheduleHero">
      <div><div className="eyebrow">COACH ADMIN</div><h2>Carlsbad Baseball Schedule</h2><p>Click any event to edit it, or add a new event.</p></div>
    </section>

    <div className="toolbar">
      <div className="navgroup">
        <button type="button" className="iconbtn" onClick={()=>setMonth(new Date(y,m-1,1))}>‹</button>
        <div className="monthnav">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
        <button type="button" className="iconbtn" onClick={()=>setMonth(new Date(y,m+1,1))}>›</button>
      </div>
      <div className="filtergroup"><select value={team} onChange={e=>setTeam(e.target.value)}>{teams.map(t=><option key={t}>{t}</option>)}</select></div>
      <button type="button" onClick={()=>newEvent()}>+ Add Event</button>
      <a className="btn secondary" href="/">Public View</a>
    </div>

    <div className="legend"><span><i className="dot varsity"/>Varsity</span><span><i className="dot jv"/>JV</span><span><i className="dot frosh"/>Frosh</span><span><i className="dot combo"/>JV/Frosh</span><span><i className="dot all"/>All Levels</span></div>

    {monthBanners.map(b=><div className="breakBanner" key={b.id}><b>{b.title}</b><span>{b.subtitle}</span><small>{new Date(String(b.start_date).slice(0,10)+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}{String(b.start_date).slice(0,10)!==String(b.end_date).slice(0,10)?' – '+new Date(String(b.end_date).slice(0,10)+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</small></div>)}

    <div className="calendar">
      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div className="dow" key={d}>{d}</div>)}
      {Array.from({length:first}).map((_,i)=><div className="day empty" key={'b'+i}/>)}
      {Array.from({length:days},(_,i)=>i+1).map(d=>{
        const ds=`${prefix}-${String(d).padStart(2,'0')}`;
        const es=filtered.filter(e=>String(e.date).slice(0,10)===ds);
        const bs=banners.filter(b=>String(b.start_date).slice(0,10)<=ds&&String(b.end_date).slice(0,10)>=ds);
        return <div className={'day '+(bs.length?'breakday':'')} key={d}>
          <div className="num">{d}<button type="button" title="Add event" onClick={()=>newEvent(ds)} style={{float:'right',padding:'0 6px',minWidth:0}}>+</button></div>
          {bs.map(b=><div className="miniBreak" key={b.id}>{b.title}</div>)}
          {es.map(e=><button type="button" key={e.id} onClick={()=>startEdit(e)} className={'event team-'+slug(e.team)+' type-'+slug(e.event_type)}>
            <span className="eventteam">{e.team}</span><span>{formatTime(e.time)}</span><strong>{e.event_name||e.opponent||'Event'}</strong><em>{e.event_type}</em>
          </button>)}
        </div>
      })}
    </div>

    {showForm&&<div id="event-editor" className="card" style={{marginTop:18}}>
      <h2>{edit?'Edit Event':'Add Event'}</h2>
      <form className="grid2" onSubmit={save}>
        {[['date','Date','date'],['time','Start / Game Time','time'],['arrival_time','Arrival Time','time'],['opponent','Opponent','text'],['event_name','Event Name','text'],['location','Location / Field','text'],['address','Address','text'],['bus_departure','Bus / Departure','text'],['uniform','Uniform','text']].map(([k,l,t])=><div className="field" key={k}><label>{l}</label><input type={t} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} required={k==='date'}/></div>)}
        <div className="field"><label>Level</label><select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}>{teams.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Event Type</label><select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}>{['Game','Practice','Tournament','Tryout','Camp','Travel','Team Event'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Home / Away</label><select value={form.home_away} onChange={e=>setForm({...form,home_away:e.target.value})}>{['Home','Away','TBD'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Scheduled','TBD','Changed','Canceled','Final'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field full"><label>Notes</label><textarea rows="3" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div className="actions full">
          <button type="submit">{edit?'Save Changes':'Add Event'}</button>
          {edit&&<button type="button" className="danger" onClick={del}>Delete Event</button>}
          <button type="button" className="secondary" onClick={()=>{setShowForm(false);setEdit(null);setForm(blank)}}>Cancel</button>
        </div>
      </form>
    </div>}
  </main>;
}
