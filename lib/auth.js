import crypto from 'crypto';
import { cookies } from 'next/headers';
const COOKIE='cb_admin';
function sig(v){return crypto.createHmac('sha256',process.env.SESSION_SECRET||'dev-secret').update(v).digest('hex')}
export function makeToken(){const v='admin';return `${v}.${sig(v)}`}
export function isAdmin(){const t=cookies().get(COOKIE)?.value||'';const [v,s]=t.split('.');return v==='admin'&&s===sig(v)}
export {COOKIE};
