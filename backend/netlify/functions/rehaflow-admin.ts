/* eslint-disable */
// @ts-nocheck
/** RehaFlow server-side administration API for the native Windows console. */
import { createClient } from '@libsql/client';

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const H = { 'Content-Type': 'application/json; charset=utf-8' };
const ALL_ROLES = ['OWNER','ADMIN','RECEPTION','DOCTOR','NURSE','HEAD_NURSE','JUNIOR_NURSE','REHAB','MEDICAL_DIRECTOR','DEPARTMENT_HEAD','PHYSIO','OCCUPATIONAL','SPEECH','PSYCHOLOGIST'];
const OWNER_ADMIN = new Set(['OWNER','ADMIN','owner','admin']);
const MANAGEMENT = new Set(['OWNER','ADMIN','MEDICAL_DIRECTOR','DEPARTMENT_HEAD','owner','admin','medical_director','department_head']);
const CLINICAL_LEADS = new Set(['OWNER','ADMIN','MEDICAL_DIRECTOR','DEPARTMENT_HEAD','DOCTOR','owner','admin','medical_director','department_head','doctor']);
const STAFF_READ = new Set(['OWNER','ADMIN','MEDICAL_DIRECTOR','DEPARTMENT_HEAD','owner','admin','medical_director','department_head']);
const json = (statusCode, body) => ({ statusCode, headers: H, body: JSON.stringify(body) });
const now = () => new Date().toISOString();
const id = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`;
const bodyOf = (event) => { try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; } };
const role = (user) => String(user?.role ?? '').toUpperCase();
function deny(user, roles) { if (!user) return json(401,{error:'Не авторизовано'}); if (roles && !roles.has(role(user))) return json(403,{error:'Недостатньо прав для цієї дії'}); return null; }
async function audit(user, action, entity, entityId, payload, event) { try { await db.execute({sql:`INSERT INTO audit_log (id,created_at,user_id,user_role,action,entity,entity_id,device_id,ip,payload) VALUES (?,?,?,?,?,?,?,?,?,?)`,args:[id('aud'),now(),user?.id??null,user?.role??null,action,entity??null,entityId??null,event?.headers?.['x-device-id']??null,event?.headers?.['x-forwarded-for']??null,payload?JSON.stringify(payload):null]}); } catch {} }
async function tableColumns(table) { const allowed = new Set(['users','rooms','beds','patients','staff_shifts','audit_log']); if (!allowed.has(table)) throw new Error('Unsupported table'); const r=await db.execute(`PRAGMA table_info(${table})`); return r.rows.map(x=>String(x.name)); }
async function selectTable(table, where='', args=[], limit=500) { const cols=await tableColumns(table); const order=cols.includes('created_at')?'created_at DESC':cols.includes('name')?'name ASC':'rowid DESC'; const r=await db.execute({sql:`SELECT * FROM ${table}${where?` WHERE ${where}`:''} ORDER BY ${order} LIMIT ${Math.max(1,Math.min(1000,Number(limit)||500))}`,args}); return r.rows; }

export async function handleAdminRoute(event, user) {
  const path=String(event.path??'').replace(/^\/api\/baas/,'')||'/';
  const method=String(event.httpMethod??'GET').toUpperCase();
  const body=bodyOf(event);
  if (!path.startsWith('/admin/')) return null;
  const authenticated=deny(user,new Set(ALL_ROLES)); if (authenticated) return authenticated;

  if (path==='/admin/permissions' && method==='GET') {
    const r=role(user);
    return json(200,{role:r,permissions:{
      dashboard:true, patientsRead:true, tasksRead:true,
      prescriptionsCreate:CLINICAL_LEADS.has(r),
      staffRead:STAFF_READ.has(r), staffManage:OWNER_ADMIN.has(r),
      roomsRead:true, bedsRead:true, roomsManage:MANAGEMENT.has(r), bedsManage:MANAGEMENT.has(r),
      archiveRead:MANAGEMENT.has(r), archiveManage:MANAGEMENT.has(r),
      auditRead:OWNER_ADMIN.has(r), backup:OWNER_ADMIN.has(r),
      shiftsRead:true
    },roles:ALL_ROLES});
  }

  // Every authenticated staff member may READ the operational bed/room board.
  // Mutations remain restricted to management roles.
  if(path==='/admin/rooms'&&method==='GET')return json(200,{rooms:await selectTable('rooms','',[],1000)});
  if(path==='/admin/beds'&&method==='GET')return json(200,{beds:await selectTable('beds','',[],2000)});

  if (path==='/admin/staff' && method==='GET') {
    const d=deny(user,STAFF_READ); if(d)return d;
    return json(200,{columns:await tableColumns('users'),staff:await selectTable('users','',[],1000)});
  }
  if (path.startsWith('/admin/staff/') && method==='PATCH') {
    const d=deny(user,OWNER_ADMIN); if(d)return d;
    const staffId=decodeURIComponent(path.split('/').pop()); const cols=await tableColumns('users'); const updates={};
    for(const key of ['role','status','is_active','full_name','display_name','department']) if(cols.includes(key)&&body[key]!==undefined) updates[key]=body[key];
    if(updates.role&&!ALL_ROLES.includes(String(updates.role).toUpperCase())) return json(400,{error:'Невідома роль'});
    if(String(updates.role||'').toUpperCase()==='OWNER' && role(user)!=='OWNER') return json(403,{error:'Тільки власник може видавати роль OWNER'});
    if(!Object.keys(updates).length)return json(400,{error:'Немає полів для зміни'});
    const set=Object.keys(updates).map(k=>`${k}=?`).join(', '); const r=await db.execute({sql:`UPDATE users SET ${set} WHERE id=?`,args:[...Object.values(updates),staffId]});
    if(!r.rowsAffected)return json(404,{error:'Користувача не знайдено'}); await audit(user,'STAFF_UPDATE','user',staffId,updates,event); return json(200,{ok:true});
  }

  if(path==='/admin/archive/patients'&&method==='GET'){
    const d=deny(user,MANAGEMENT); if(d)return d;
    const cols=await tableColumns('patients'); const stateCol=cols.find(c=>['status','state','patient_status'].includes(c)); const where=stateCol?`LOWER(COALESCE(${stateCol},'')) IN ('discharged','archived','inactive','completed')`:'1=0'; return json(200,{patients:await selectTable('patients',where,[],1000)});
  }
  if(path==='/admin/shifts'&&method==='GET')return json(200,{shifts:await selectTable('staff_shifts','',[],1000)});
  if(path==='/admin/audit'&&method==='GET'){
    const d=deny(user,OWNER_ADMIN); if(d)return d; return json(200,{audit:await selectTable('audit_log','',[],1000)});
  }
  if(path==='/admin/archive/patient'&&method==='POST'){
    const d=deny(user,MANAGEMENT); if(d)return d; const patientId=body.patientId; if(!patientId)return json(400,{error:'patientId обовʼязковий'});
    const cols=await tableColumns('patients'); const stateCol=cols.find(c=>['status','state','patient_status'].includes(c)); if(!stateCol)return json(409,{error:'У таблиці patients немає поля статусу для архівування'});
    const archived=cols.includes('archived_at'); const r=await db.execute({sql:`UPDATE patients SET ${stateCol}=?${archived?', archived_at=?':''} WHERE id=?`,args:archived?['DISCHARGED',now(),patientId]:['DISCHARGED',patientId]}); if(!r.rowsAffected)return json(404,{error:'Пацієнта не знайдено'}); await audit(user,'PATIENT_ARCHIVE','patient',patientId,{},event); return json(200,{ok:true,status:'DISCHARGED'});
  }
  return null;
}
