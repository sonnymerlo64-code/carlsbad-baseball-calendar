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
function localDateKey(n){return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`}
function cls(v){ return String(v||'all').toLowerCase().replace(/\//g,'-').replace(/\s+/g,'-'); }

export default function AdminPage(){
  const [loggedIn,setLoggedIn]=useState(false);
  const [password,setPassword]=useState('');
  const [events,setEvents]=useState([]);
  const [banners,setBanners]=useState([]);
  const [message,setMessage]=useState('');
  const [month,setMonth]=useState(()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1)});
  const [todayKey,setTodayKey]=useState(()=>localDateKey(new Date()));
  useEffect(()=>{
    const refreshToday=()=>{
      const n=new Date(), nextKey=localDateKey(n);
      setTodayKey(prevKey=>{
        if(prevKey!==nextKey){
          setMonth(prev=>{
            const [py,pm]=prevKey.split('-').map(Number);
            const wasCurrent=prev.getFullYear()===py&&prev.getMonth()===pm-1;
            return wasCurrent ? new Date(n.getFullYear(),n.getMonth(),1) : prev;
          });
        }
        return nextKey;
      });
    };
    refreshToday();
    const timer=setInterval(refreshToday,30000);
    window.addEventListener('focus',refreshToday);
    document.addEventListener('visibilitychange',refreshToday);
    return ()=>{clearInterval(timer);window.removeEventListener('focus',refreshToday);document.removeEventListener('visibilitychange',refreshToday)};
  },[]);
  const [filter,setFilter]=useState('All');
  const [open,setOpen]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [practiceOpen,setPracticeOpen]=useState(false);
  const [practiceMonth,setPracticeMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [practiceDates,setPracticeDates]=useState([]);
  const [practiceTeams,setPracticeTeams]=useState(['Varsity']);
  const [practiceTime,setPracticeTime]=useState('15:30');
  const [practiceArrival,setPracticeArrival]=useState('');
  const [practiceLocation,setPracticeLocation]=useState('Carlsbad High School');
  const [practiceAddress,setPracticeAddress]=useState('3557 Lancer Way, Carlsbad, CA 92008');
  const [practiceName,setPracticeName]=useState('Practice');
  const [practiceNotes,setPracticeNotes]=useState('');
  const [practiceSaving,setPracticeSaving]=useState(false);
  const [practiceMessage,setPracticeMessage]=useState('');
  const [templateDays,setTemplateDays]=useState([1,3,5]);
  const [templateEnd,setTemplateEnd]=useState('');
  const togglePracticeDate=(date)=>setPracticeDates(a=>a.includes(date)?a.filter(x=>x!==date):[...a,date].sort());
  function addTemplate(){
    if(!templateEnd){setPracticeMessage('Choose a template end date first.');return}
    const start=localDateKey(practiceMonth);
    if(templateEnd<start){setPracticeMessage('End date must be on or after the displayed month.');return}
    const out=[];const cursor=new Date(start+'T12:00:00');const last=new Date(templateEnd+'T12:00:00');
    for(let i=0;cursor<=last&&i<366;i++,cursor.setDate(cursor.getDate()+1)){if(templateDays.includes(cursor.getDay()))out.push(localDateKey(cursor))}
    setPracticeDates(a=>[...new Set([...a,...out])].sort());setPracticeMessage(out.length+' template dates selected. Review and remove any unwanted dates before saving.');
  }
  function copyPracticeWeek(){
    const first=localDateKey(practiceMonth);const base=new Date(first+'T12:00:00');const shift=(base.getDay()+6)%7;base.setDate(base.getDate()-shift);
    const end=new Date(base);end.setDate(end.getDate()+6);
    const picked=practiceDates.filter(x=>x>=localDateKey(base)&&x<=localDateKey(end));
    if(!picked.length){setPracticeMessage('Select dates in the first displayed week before copying.');return}
    const next=picked.map(x=>{const d=new Date(x+'T12:00:00');d.setDate(d.getDate()+7);return localDateKey(d)});
    setPracticeDates(a=>[...new Set([...a,...next])].sort());setPracticeMessage('Copied '+next.length+' practice dates into the following week.');
  }
  const practiceConflicts=practiceDates.flatMap(date=>practiceTeams.flatMap(team=>events.filter(ev=>d(ev.date)===date&&(ev.team===team||ev.team==='All')&&ev.status!=='Canceled').map(ev=>({date,team,title:ev.event_name||ev.opponent||ev.event_type,time:ev.time||''}))));
  async function savePractices(){
    if(!practiceDates.length||!practiceTeams.length){setPracticeMessage('Choose practice dates and at least one team.');return}
    setPracticeSaving(true);setPracticeMessage('');
    try{
      const r=await fetch('/api/practices/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dates:practiceDates,teams:practiceTeams,time:practiceTime,arrival_time:practiceArrival,location:practiceLocation,address:practiceAddress,name:practiceName,notes:practiceNotes})});
      const x=await r.json();if(!r.ok)throw Error(x.error||'Could not save practices');
      await load();setPracticeDates([]);setPracticeMessage('Created '+x.created+' practices.'+(x.skipped?.length?' Skipped '+x.skipped.length+' duplicates.':''));
    }catch(e){setPracticeMessage(e.message)}finally{setPracticeSaving(false)}
  }

  const [venues,setVenues]=useState([]);
  const [homeFields,setHomeFields]=useState([]);
  const [venueOpen,setVenueOpen]=useState(false);
  const [venueId,setVenueId]=useState(null);
  const [venue,setVenue]=useState({name:'',address:'',place_id:'',notes:''});
  const [venueQuery,setVenueQuery]=useState('');
  const [venueResults,setVenueResults]=useState([]);
  const [venueError,setVenueError]=useState('');
  async function loadVenues(){const r=await fetch('/api/venues');if(r.ok){const x=await r.json();setVenues(x.venues||[]);setHomeFields(x.homeFields||[])}}
  useEffect(()=>{if(loggedIn)loadVenues()},[loggedIn]);
  useEffect(()=>{if(!venueOpen||venueQuery.trim().length<3){setVenueResults([]);return}const c=new AbortController();const t=setTimeout(async()=>{try{const r=await fetch('/api/places/search?q='+encodeURIComponent(venueQuery),{signal:c.signal});const x=await r.json();if(!r.ok)throw Error(x.error||'Lookup failed');setVenueResults(x.results||[]);setVenueError('')}catch(e){if(e.name!=='AbortError')setVenueError(e.message)}},450);return()=>{clearTimeout(t);c.abort()}},[venueQuery,venueOpen]);
  async function saveVenue(e){e.preventDefault();const r=await fetch(venueId?'/api/venues/'+venueId:'/api/venues',{method:venueId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(venue)});if(!r.ok){setVenueError('Could not save venue');return}await loadVenues();setVenue({name:'',address:'',place_id:'',notes:''});setVenueId(null);setVenueQuery('');setVenueError('Venue saved')}
  async function deleteVenue(){if(!venueId||!confirm('Delete venue?'))return;await fetch('/api/venues/'+venueId,{method:'DELETE'});await loadVenues();setVenue({name:'',address:'',place_id:'',notes:''});setVenueId(null)}
  async function saveHomeField(team,id){const r=await fetch('/api/home-fields',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({team,venue_id:id||null})});if(r.ok)await loadVenues();else setVenueError('Unable to set home field')}
  function homeVenue(team){const id=homeFields.find(x=>x.team===team)?.venue_id;return venues.find(x=>x.id===id)}
  function selectVenue(id){const v=venues.find(x=>String(x.id)===String(id));if(v)setForm(f=>({...f,location:v.name,address:v.address}))}
  const [teams,setTeams]=useState([]);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const blankTeam={name:'',address:'',field_address:'',field_name:'',place_id:'',notes:''};
  const [school,setSchool]=useState(blankTeam);
  const [schoolId,setSchoolId]=useState(null);
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [lookupError,setLookupError]=useState('');
  async function loadTeams(){const r=await fetch('/api/teams');if(r.ok){const x=await r.json();setTeams(x.teams||[])}}
  useEffect(()=>{if(loggedIn)loadTeams()},[loggedIn]);
  useEffect(()=>{if(!libraryOpen||query.trim().length<3){setResults([]);return}const c=new AbortController();const t=setTimeout(async()=>{try{const r=await fetch('/api/schools/search?q='+encodeURIComponent(query),{signal:c.signal});const x=await r.json();if(!r.ok)throw Error(x.error);setResults(x.results||[]);setLookupError('')}catch(e){if(e.name!=='AbortError')setLookupError(e.message)}},450);return()=>{clearTimeout(t);c.abort()}},[query,libraryOpen]);
  async function saveSchool(e){e.preventDefault();const r=await fetch(schoolId?'/api/teams/'+schoolId:'/api/teams',{method:schoolId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(school)});if(!r.ok){setMessage('Unable to save school');return}await loadTeams();setSchool(blankTeam);setSchoolId(null);setQuery('');setMessage('School saved')}
  async function deleteSchool(){if(!schoolId||!confirm('Delete saved school?'))return;await fetch('/api/teams/'+schoolId,{method:'DELETE'});await loadTeams();setSchool(blankTeam);setSchoolId(null)}
  function selectOpponent(name){const t=teams.find(x=>x.name===name);if(!t)return;setForm(f=>({...f,opponent:t.name,event_name:f.event_type==='Game'?t.name:f.event_name,...(f.home_away==='Away'?{location:t.field_name||t.name,address:t.field_address||t.address}:{})}))}
  function selectHomeAway(v){setForm(f=>{const t=teams.find(x=>x.name===f.opponent);const hv=homeVenue(f.team);return {...f,home_away:v,...(v==='Home'?{location:hv?.name||'Carlsbad High School',address:hv?.address||'3557 Lancer Way, Carlsbad, CA 92008'}:v==='Away'&&t?{location:t.field_name||t.name,address:t.field_address||t.address}:{})}})}


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
      <button type="button" className="secondary" onClick={()=>{loadTeams();setLibraryOpen(true)}}>Manage HS Teams</button><button type="button" className="secondary" onClick={()=>{loadVenues();setVenueOpen(true)}}>Manage Venues</button><button type="button" className="secondary" onClick={()=>{setPracticeOpen(true);setPracticeMessage('')}}>+ Schedule Practices</button><button type="button" onClick={()=>add('')}>+ Add Event</button><a className="btn secondary" href="/">Public View</a>
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
        const isToday=ds===todayKey; return <div data-date={ds} className={`day ${dayBreaks.length?'breakday ':''}${isToday?'today':''}`} key={ds}>
          <div className="adminDayHead"><span className="num">{day}</span><button type="button" className="dayAdd" onClick={()=>add(ds)}>+</button></div>
          {dayBreaks.map(b=><div className="miniBreak" key={String(b.id)}>{b.title}</div>)}
          {dayEvents.map(ev=><button type="button" key={String(ev.id)} onClick={()=>edit(ev)} className={`event team-${cls(ev.team)} type-${cls(ev.event_type)}`}><span className="eventteam">{ev.team}</span><span>{time12(ev.time)}</span><strong>{ev.event_type==='Game' ? (ev.opponent||ev.event_name||'Game') : (ev.event_name||ev.opponent||'Event')}</strong><em>{ev.event_type}</em></button>)}
        </div>;
      })}
    </div>
    {venueOpen?<div className="modal" onClick={()=>setVenueOpen(false)}><div className="modalbox adminModal" onClick={e=>e.stopPropagation()}>
      <div className="modalhead"><h2>Game Venues Library</h2><button type="button" className="closebtn" onClick={()=>setVenueOpen(false)}>×</button></div>
      <div className="field"><label>Search any park, field, school or street address (Google Places)</label><input placeholder="Poinsettia Park, Carlsbad, CA" value={venueQuery} onChange={e=>setVenueQuery(e.target.value)}/>{venueError?<p>{venueError}</p>:null}{venueResults.map((v,i)=><button type="button" className="schoolResult" key={v.place_id||i} onClick={()=>{setVenue({name:v.name,address:v.address,place_id:v.place_id,notes:''});setVenueId(null);setVenueResults([]);setVenueQuery('')}}><strong>{v.name}</strong><small>{v.address}</small></button>)}</div>
      <form className="grid2" onSubmit={saveVenue}>{[['name','Venue / Field Name'],['address','Full Street Address'],['notes','Notes']].map(([k,label])=><div className="field" key={k}><label>{label}</label><input value={venue[k]||''} required={k==='name'} onChange={e=>setVenue(f=>({...f,[k]:e.target.value}))}/></div>)}<div className="actions full"><button type="submit">Save Venue</button>{venueId?<button type="button" className="danger" onClick={deleteVenue}>Delete Venue</button>:null}<button type="button" className="secondary" onClick={()=>{setVenue({name:'',address:'',place_id:'',notes:''});setVenueId(null)}}>New Venue</button></div></form>
      <h3>Default Home Fields</h3><div className="grid2">{['Varsity','JV','Frosh','JV/Frosh'].map(team=><div className="field" key={team}><label>{team}</label><select value={homeFields.find(x=>x.team===team)?.venue_id||''} onChange={e=>saveHomeField(team,e.target.value)}><option value="">Carlsbad High School (fallback)</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>)}</div>
      <h3>Saved Venues ({venues.length})</h3><div className="schoolList">{venues.map(v=><button type="button" className="schoolResult" key={v.id} onClick={()=>{setVenue(v);setVenueId(v.id)}}><strong>{v.name}</strong><small>{v.address||'No address entered'}</small></button>)}</div>
    </div></div>:null}
    {libraryOpen?<div className="modal" onClick={()=>setLibraryOpen(false)}><div className="modalbox adminModal" onClick={e=>e.stopPropagation()}>
      <div className="modalhead"><h2>High School Team Library</h2><button className="closebtn" onClick={()=>setLibraryOpen(false)}>×</button></div>
      <div className="field"><label>Search school addresses (Google Places)</label><input placeholder="Search high school name" value={query} onChange={e=>setQuery(e.target.value)}/>{lookupError?<p className="error">{lookupError}</p>:null}{results.map((t,i)=><button type="button" className="schoolResult" key={t.place_id||i} onClick={()=>{setSchool({...blankTeam,...t});setSchoolId(null);setResults([]);setQuery('')}}><strong>{t.name}</strong><small>{t.address}</small></button>)}</div>
      <form className="grid2" onSubmit={saveSchool}>{[['name','School Name'],['address','School Address'],['field_name','Baseball Field Name'],['field_address','Baseball Field Address (override)'],['notes','Notes']].map(([k,label])=><div className="field" key={k}><label>{label}</label><input value={school[k]||''} required={k==='name'} onChange={e=>setSchool(f=>({...f,[k]:e.target.value}))}/></div>)}<div className="actions full"><button type="submit">Save School</button>{schoolId?<button type="button" className="danger" onClick={deleteSchool}>Delete School</button>:null}<button type="button" className="secondary" onClick={()=>{setSchool(blankTeam);setSchoolId(null)}}>New School</button></div></form>
      <h3>Saved Schools ({teams.length})</h3><div className="schoolList">{teams.map(t=><button type="button" className="schoolResult" key={t.id} onClick={()=>{setSchool(t);setSchoolId(t.id)}}><strong>{t.name}</strong><small>{t.field_address||t.address||'No address'}</small></button>)}</div>
    </div></div>:null}
    {practiceOpen?<div className="modal" onClick={()=>setPracticeOpen(false)}><div className="modalbox adminModal" onClick={e=>e.stopPropagation()}>
      <div className="modalhead"><div><div className="eyebrow dark">COACH ADMIN</div><h2>Flexible Practice Scheduler</h2></div><button type="button" className="closebtn" onClick={()=>setPracticeOpen(false)}>×</button></div>
      <p className="muted">Select any combination of dates. There is no required weekly pattern. You can also add dates from a weekly template or copy a week, then adjust individual dates.</p>
      <div className="field full"><label>Teams</label><div className="practiceTeamOptions">{LEVELS.filter(t=>t!=='All').map(team=><label key={team}><input type="checkbox" checked={practiceTeams.includes(team)} onChange={e=>setPracticeTeams(a=>e.target.checked?[...a,team]:a.filter(x=>x!==team))}/>{team}</label>)}</div></div>
      <div className="practiceCalendarHeader"><button type="button" className="secondary" onClick={()=>setPracticeMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>‹</button><strong>{practiceMonth.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</strong><button type="button" className="secondary" onClick={()=>setPracticeMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>›</button></div>
      <div className="practiceDateGrid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w,i)=><div key={i} className="practiceDow">{w}</div>)}{Array.from({length:new Date(practiceMonth.getFullYear(),practiceMonth.getMonth(),1).getDay()},(_,i)=><div key={'empty'+i}/>)}
      {Array.from({length:new Date(practiceMonth.getFullYear(),practiceMonth.getMonth()+1,0).getDate()},(_,i)=>{const date=localDateKey(new Date(practiceMonth.getFullYear(),practiceMonth.getMonth(),i+1));return <button type="button" key={date} className={'practiceDate '+(practiceDates.includes(date)?'chosen':'')} onClick={()=>togglePracticeDate(date)}>{i+1}</button>})}</div>
      <div className="practiceTools"><span>{practiceDates.length} dates selected</span><button type="button" className="secondary" onClick={()=>setPracticeDates([])}>Clear dates</button><button type="button" className="secondary" onClick={copyPracticeWeek}>Copy first week → next</button></div>
      <div className="field"><label>Optional weekly template (select weekdays, then choose end date)</label><div className="practiceTeamOptions">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((w,i)=><label key={w}><input type="checkbox" checked={templateDays.includes(i)} onChange={e=>setTemplateDays(a=>e.target.checked?[...a,i]:a.filter(v=>v!==i))}/>{w}</label>)}</div><div className="practiceTools"><input type="date" value={templateEnd} onChange={e=>setTemplateEnd(e.target.value)}/><button type="button" className="secondary" onClick={addTemplate}>Add template dates</button></div></div>
      <div className="grid2">
        <div className="field"><label>Practice time</label><input type="time" value={practiceTime} onChange={e=>setPracticeTime(e.target.value)}/></div>
        <div className="field"><label>Player arrival (optional)</label><input type="time" value={practiceArrival} onChange={e=>setPracticeArrival(e.target.value)}/></div>
        <div className="field"><label>Practice name</label><input value={practiceName} onChange={e=>setPracticeName(e.target.value)}/></div>
        <div className="field"><label>Saved venue (optional)</label><select value="" onChange={e=>{const v=venues.find(v=>String(v.id)===e.target.value);if(v){setPracticeLocation(v.name);setPracticeAddress(v.address)}}}><option value="">Select venue</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
        <div className="field"><label>Location / Field</label><input value={practiceLocation} onChange={e=>setPracticeLocation(e.target.value)}/></div>
        <div className="field"><label>Street address</label><input value={practiceAddress} onChange={e=>setPracticeAddress(e.target.value)}/></div>
        <div className="field full"><label>Notes</label><textarea rows="2" value={practiceNotes} onChange={e=>setPracticeNotes(e.target.value)}/></div>
      </div>
      {practiceConflicts.length?<div className="practiceWarning"><strong>Schedule review: {practiceConflicts.length} existing event(s) on selected team dates.</strong><div>{practiceConflicts.slice(0,12).map((c,i)=><div key={i}>{c.date} · {c.team}: {c.title}{c.time?' ('+time12(c.time)+')':''}</div>)}</div><small>Review before saving. These are date-level warnings, not confirmed time overlaps.</small></div>:null}
      {practiceMessage?<p role="status">{practiceMessage}</p>:null}
      <div className="actions"><button type="button" disabled={practiceSaving||!practiceDates.length||!practiceTeams.length} onClick={savePractices}>{practiceSaving?'Saving…':'Save '+(practiceDates.length*practiceTeams.length)+' Practices'}</button><button type="button" className="secondary" onClick={()=>setPracticeOpen(false)}>Close</button></div>
      <p className="muted">Each saved practice is an individual calendar event, so you can edit, move, or cancel one practice without changing the others.</p>
    </div></div>:null}
    {open?<div className="modal"  onClick={()=>setOpen(false)}><div className="modalbox adminModal" onClick={e=>e.stopPropagation()}>
      <div className="modalhead"><div><div className="eyebrow dark">COACH ADMIN</div><h2>{editId?'Edit Event':'Add Event'}</h2></div><button type="button" className="closebtn" onClick={()=>setOpen(false)}>×</button></div>
      <form className="grid2" onSubmit={save}>
        {form.event_type==='Game'?<div className="field full"><label>Saved Opponent</label><select value={teams.some(t=>t.name===form.opponent)?form.opponent:''} onChange={e=>selectOpponent(e.target.value)}><option value="">Choose school (or type below)</option>{teams.map(t=><option key={t.id} value={t.name}>{t.name}</option>)}</select><button type="button" className="secondary" onClick={()=>{loadTeams();setLibraryOpen(true)}}>Search / Add School</button></div>:null}
        <div className="field full"><label>Choose Saved Game Venue (optional override)</label><select value="" onChange={e=>selectVenue(e.target.value)}><option value="">Select a saved park, school or field</option>{venues.map(v=><option key={v.id} value={v.id}>{v.name} — {v.address}</option>)}</select><button type="button" className="secondary" onClick={()=>{loadVenues();setVenueOpen(true)}}>Search / Add Venue</button></div>
        {[['date','Date','date'],['time','Start / Game Time','time'],['arrival_time','Arrival Time','time'],['opponent','Opponent','text'],['event_name','Event Name','text'],['location','Location / Field','text'],['address','Address','text'],['bus_departure','Bus / Departure','text'],['uniform','Uniform','text']].map(a=><div className="field" key={a[0]}><label>{a[1]}</label><input type={a[2]} value={form[a[0]]||''} onChange={e=>setForm({...form,[a[0]]:e.target.value})} required={a[0]==='date'}/></div>)}
        <div className="field"><label>Level</label><select value={form.team} onChange={e=>setForm(f=>{const hv=homeVenue(e.target.value);return {...f,team:e.target.value,...(f.home_away==='Home'?{location:hv?.name||'Carlsbad High School',address:hv?.address||'3557 Lancer Way, Carlsbad, CA 92008'}:{})}})}>{LEVELS.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Event Type</label><select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})}>{TYPES.map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Home / Away</label><select value={form.home_away} onChange={e=>selectHomeAway(e.target.value)}>{['Home','Away','TBD'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['Scheduled','TBD','Changed','Canceled','Final'].map(x=><option key={x}>{x}</option>)}</select></div>
        <div className="field full"><label>Notes</label><textarea rows="3" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div className="actions full"><button type="submit">{editId?'Save Changes':'Add Event'}</button>{editId?<button type="button" className="danger" onClick={remove}>Delete Event</button>:null}<button type="button" className="secondary" onClick={()=>setOpen(false)}>Cancel</button></div>
      </form>
    </div></div>:null}
  </main>;
}
