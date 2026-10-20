import {NextResponse} from 'next/server';
import {ensureDb,sql} from '../../../../lib/db';
import {isAdmin} from '../../../../lib/auth';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export async function POST(req){
 if(!isAdmin())return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const b=await req.json();
  const dates=[...new Set(b.dates||[])].sort();
  const teams=[...new Set(b.teams||[])];
  if(!dates.length||dates.length>180||!dates.every(validDate)||!teams.length||teams.length>5)return NextResponse.json({error:'Select 1–180 valid dates and at least one team.'},{status:400});
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time||''))return NextResponse.json({error:'Enter a valid practice time.'},{status:400});
  if(b.arrival_time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.arrival_time))return NextResponse.json({error:'Invalid arrival time.'},{status:400});
  await ensureDb();const q=sql();let count=0;const skipped=[];
  for(const date of dates)for(const team of teams){
   const exists=await q`SELECT id FROM events WHERE date=${date} AND team=${team} AND event_type='Practice' AND time=${b.time} LIMIT 1`;
   if(exists.length){skipped.push(date+' '+team);continue}
   await q`INSERT INTO events(date,time,arrival_time,team,opponent,home_away,location,address,status,event_name,event_type,bus_departure,uniform,notes) VALUES(${date},${b.time},${b.arrival_time||''},${team},'','TBD',${b.location||''},${b.address||''},'Scheduled',${b.name||team+' Practice'},'Practice','','',${b.notes||''})`;
   count++;
  }
  return NextResponse.json({created:count,skipped});
 }catch(e){return NextResponse.json({error:e.message||'Unable to create practices'},{status:500})}
}
