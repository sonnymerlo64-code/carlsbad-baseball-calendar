import {NextResponse} from 'next/server';
import {ensureDb,sql} from '../../../../lib/db';
import {isAdmin} from '../../../../lib/auth';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const levels=['Varsity','JV','Frosh','JV/Frosh','All'];
const venues=['Home','Away','Neutral','TBD'];
function parseTime(value){
 let s=String(value??'').trim();if(!s)return '';
 let m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
 if(!m)return null;let h=Number(m[1]),min=Number(m[2]);if(min>59)return null;
 if(m[3]){if(h<1||h>12)return null;h=h%12+(m[3].toUpperCase()==='PM'?12:0)}
 if(h>23)return null;return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
}
const text=v=>String(v??'').trim();
const key=r=>[r.date,r.team.toLowerCase(),r.opponent.toLowerCase(),r.time].join('|');
export async function POST(req){
 if(!isAdmin())return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const {rows,commit=false}=await req.json();
  if(!Array.isArray(rows)||!rows.length||rows.length>500)return NextResponse.json({error:'Upload 1–500 game rows.'},{status:400});
  await ensureDb();const q=sql();
  const [schools,homeFields,existing]=await Promise.all([
    q`SELECT * FROM hs_teams`,
    q`SELECT h.team,v.name,v.address FROM home_fields h JOIN game_venues v ON v.id=h.venue_id`,
    q`SELECT date,team,opponent,time FROM events WHERE event_type='Game'`
  ]);
  const existingKeys=new Set(existing.map(e=>key({date:String(e.date).slice(0,10),team:e.team,opponent:e.opponent||'',time:e.time||''})));
  const seen=new Set();const checked=[];
  for(let i=0;i<rows.length;i++){
   const x=rows[i]||{};
   const date=text(x.date),team=text(x.team),opponent=text(x.opponent),home_away=text(x.home_away)||'TBD';
   const time=parseTime(x.time),arrival_time=parseTime(x.arrival_time),bus_departure=parseTime(x.bus_departure);
   const errors=[],warnings=[];
   if(!validDate(date))errors.push('Invalid date (use YYYY-MM-DD)');
   if(!levels.includes(team))errors.push('Invalid team');
   if(!opponent)errors.push('Opponent required');
   if(!venues.includes(home_away))errors.push('Home/Away must be Home, Away, Neutral, or TBD');
   if(time===null||arrival_time===null||bus_departure===null)errors.push('Invalid time; use 3:30 PM or 15:30');
   if(!time)warnings.push('Game time is blank');
   const school=schools.find(t=>t.name.toLowerCase()===opponent.toLowerCase());
   if(!school)warnings.push('Opponent not in HS Team Library');
   const home=homeFields.find(h=>h.team===team);
   let location=text(x.location),address=text(x.address);
   if(!location&&!address){
     if(home_away==='Home'){location=home?.name||'Carlsbad High School';address=home?.address||'3557 Lancer Way, Carlsbad, CA 92008'}
     else if(home_away==='Away'&&school){location=school.field_name||school.name;address=school.field_address||school.address||''}
   }else if(location&&!address){
     const match=await q`SELECT address FROM game_venues WHERE LOWER(name)=LOWER(${location}) LIMIT 1`;
     if(match.length)address=match[0].address||'';
     else if(school&&location.toLowerCase()===(school.field_name||school.name).toLowerCase())address=school.field_address||school.address||'';
   }
   if(!address)warnings.push('Venue address missing — review before import');
   const normalized={date,team,opponent,time:time||'',arrival_time:arrival_time||'',home_away,location,address,bus_departure:bus_departure||'',uniform:text(x.uniform),notes:text(x.notes),status:text(x.status)||'Scheduled',event_name:opponent,event_type:'Game'};
   const k=key(normalized);
   if(existingKeys.has(k))errors.push('Duplicate game already in calendar');
   if(seen.has(k))errors.push('Duplicate row in upload');
   seen.add(k);
   checked.push({row:i+2,data:normalized,errors,warnings});
  }
  if(commit){
    const invalid=checked.filter(x=>x.errors.length);
    if(invalid.length)return NextResponse.json({error:'Resolve duplicate or invalid rows before import.',preview:checked},{status:409});
    // Re-check happens at commit time; each insert is isolated from failed rows.
    for(const {data:r} of checked){
      await q`INSERT INTO events(date,time,arrival_time,team,opponent,home_away,location,address,status,event_name,event_type,bus_departure,uniform,notes) VALUES(${r.date},${r.time},${r.arrival_time},${r.team},${r.opponent},${r.home_away},${r.location},${r.address},${r.status},${r.event_name},'Game',${r.bus_departure},${r.uniform},${r.notes})`;
    }
    return NextResponse.json({created:checked.length});
  }
  return NextResponse.json({preview:checked,canImport:checked.every(x=>!x.errors.length)});
 }catch(e){return NextResponse.json({error:e.message||'Import failed'},{status:500})}
}
