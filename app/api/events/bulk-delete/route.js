import {NextResponse} from 'next/server';
import {ensureDb,sql} from '../../../../lib/db';
import {isAdmin} from '../../../../lib/auth';
export async function POST(req){
 if(!isAdmin())return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const {ids}=await req.json();
  if(!Array.isArray(ids)||!ids.length||ids.length>500||ids.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(ids).size!==ids.length){
   return NextResponse.json({error:'Select between 1 and 500 unique events.'},{status:400});
  }
  await ensureDb();const q=sql();
  const result=await q`DELETE FROM events WHERE id=ANY(${ids}::int[]) RETURNING id`;
  return NextResponse.json({deleted:result.length});
 }catch(e){return NextResponse.json({error:'Bulk delete failed'},{status:500})}
}
