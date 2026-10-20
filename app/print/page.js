'use client';
import {useEffect,useMemo,useState} from 'react';
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const ym=d=>dateKey(d).slice(0,7);
const parseMonth=s=>{const m=/^(\d{1,2})\/(\d{2}|\d{4})$/.exec((s||'').trim());if(!m)return null;const month=Number(m[1]),year=m[2].length===2?2000+Number(m[2]):Number(m[2]);return month>=1&&month<=12&&year>=2000&&year<=2099?new Date(year,month-1,1):null};
const shortMonth=d=>`${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`;
const fmtTime=t=>{if(!t)return 'TBD';const m=/^(\d{1,2}):(\d{2})/.exec(String(t));if(!m)return String(t);let h=+m[1];return `${h%12||12}:${m[2]} ${h>=12?'PM':'AM'}`};
const title=e=>e.event_type==='Game'?(String(e.home_away||'').toLowerCase()==='away'?'@ ':'')+String(e.opponent||e.event_name||'Game').replace(/^@\s*/,''):(e.event_name||e.opponent||e.event_type||'Event');
const className=t=>String(t||'All').toLowerCase().replaceAll('/','-').replaceAll(' ','-');
export default function PrintCalendar(){
 const now=new Date(),initial=shortMonth(now);
 const [from,setFrom]=useState(initial),[to,setTo]=useState(initial),[team,setTeam]=useState('All');
 const [events,setEvents]=useState([]),[banners,setBanners]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch('/api/events').then(async r=>{const j=await r.json();if(!r.ok||!j.events)throw Error(j.error||'Unable to load calendar');setEvents(j.events);setBanners(j.banners||[])}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 const months=useMemo(()=>{const start=parseMonth(from),end=parseMonth(to);if(!start||!end||end<start)return [];const list=[];for(let d=new Date(start),i=0;d<=end&&i<24;d.setMonth(d.getMonth()+1),i++)list.push(new Date(d));return list},[from,to]);
 const tooMany=!!parseMonth(from)&&!!parseMonth(to)&&months.length===24&&months[23].getTime()!==parseMonth(to)?.getTime();
 return <main className="printApp">
  <div className="printControls">
   <h1>Carlsbad Baseball — Print Calendar</h1>
   <p>Choose a date range and team. Each month prints on its own landscape letter-size page.</p>
   <div className="printInputs"><label>First month<input type="text" inputMode="numeric" placeholder="10/26" aria-label="First month MM/YY" value={from} onChange={e=>setFrom(e.target.value)} /></label><label>Last month<input type="text" inputMode="numeric" placeholder="5/27" aria-label="Last month MM/YY" value={to} onChange={e=>setTo(e.target.value)} /></label><label>Team<select value={team} onChange={e=>setTeam(e.target.value)}>{['All','Varsity','JV','Frosh','JV/Frosh'].map(t=><option key={t}>{t}</option>)}</select></label><button type="button" disabled={loading||!!error||!months.length||tooMany} onClick={()=>window.print()}>Print / Save as PDF</button><a href="/">Back to Calendar</a></div>
   {error?<p className="printError">{error}</p>:null}{loading?<p>Loading schedule…</p>:null}
   {!months.length||tooMany?<p className="printError">Enter months as 10/26 or 5/27. End month must be on or after start month (maximum 24 months).</p>:null}
   <p className="printHint">For best results, use Landscape, Letter paper, and enable Background graphics in your browser's print dialog.</p>
  </div>
  {months.map(month=>{const y=month.getFullYear(),m=month.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),cells=Math.ceil((first+days)/7)*7;const key=ym(month);return <section className="printMonth" key={key}>
    <header className="printMonthHead"><img src="/carlsbad-logo.png" alt="Carlsbad Baseball"/><div><h2>{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2><p>CARLSBAD BASEBALL {team==='All'?'— ALL TEAMS':'— '+team.toUpperCase()}</p></div></header>
    <div className="printGrid" style={{"--calendar-weeks":cells/7}}>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(w=><div className="printWeekday" key={w}>{w}</div>)}
    {Array.from({length:cells},(_,i)=>{const day=i-first+1,active=day>=1&&day<=days,date=active?`${key}-${String(day).padStart(2,'0')}`:'';const evs=active?events.filter(e=>String(e.date||'').slice(0,10)===date&&(team==='All'||e.team===team||e.team==='All')).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))):[];const breaks=active?banners.filter(b=>String(b.start_date||'').slice(0,10)<=date&&String(b.end_date||'').slice(0,10)>=date):[];return <div key={i} className={'printCell '+(!active?'printBlank':'')}><span className="printDayNumber">{active?day:''}</span>{breaks.map(b=><div className="printBreak" key={b.id}>{b.title}</div>)}{evs.map(e=><div className={'printEvent print-'+className(e.team)} key={e.id}><span>{e.team} · {fmtTime(e.time)}</span><strong>{title(e)}</strong></div>)}</div>})}</div>
    <footer className="printFooter">Carlsbad High School Baseball · {month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</footer>
  </section>})}
 </main>
}
