/* eslint-disable */
// @ts-nocheck
/** RehaFlow — server-side administration API for the native Windows console. */
import { createClient } from '@libsql/client';

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const H = { 'Content-Type': 'application/json; charset=utf-8' };
const ALL_ROLES = ['OWNER','ADMIN','RECEPTION','DOCTOR','NURSE','HEAD_NURSE','JUNIOR_NURSE','REHAB','MEDICAL_DIRECTOR','DEPARTMENT_HEAD','PHYSIO','OCCUPATIONAL','SPEECH','PSYCHOLOGIST'];
const OWNER_ADMIN = new Set(['OWNER','ADMIN']);
const MANAGEMENT = new Set(['OWNER','ADMIN','MEDICAL_DIRECTOR','DEPARTMENT_HEAD']);
const CLINICAL_LEADS = new Set(['OWNER','ADMIN','MEDICAL_DIRECTOR','DEPARTMENT_HEAD','DOCTOR']);
const STAFF_READ = new Set(['OWNER','ADMIN','MEDICAL_DIRECTOR','DEPARTMENT_HEAD']);
const PATIENT_WRITE = new Set(ALL_ROLES);
const json = (statusCode, body) => ({ statusCode, headers: H, body: JSON.stringify(body) });
const now = () => new Date().toISOString();
const id = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`;
const bodyOf = (event) => { try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; } };
const role = (user) => String(user?.role ?? '').toUpperCase();
function deny(user, roles) { if (!user) return json(401,{error:'Не авторизовано'}); if (roles && !roles.has(role(user))) return json(403,{error:'Недостатньо прав для цієї дії'}); return null; }
async function audit(user, action, entity, entityId, payload, event) { try { await db.execute({sql:`INSERT INTO audit_log (id,created_at,user_id,user_role,action,entity,entity_id,device_id,ip,payload) VALUES (?,?,?,?,?,?,?,?,?,?)`,args:[id('aud'),now(),user?.id??null,user?.role??null,action,entity??null,entityId??null,event?.headers?.['x-device-id']??null,event?.headers?.['x-forwarded-for']??null,payload?JSON.stringify(payload):null]}); } catch {} }

const TABLES = new Set(['users','rooms','beds','patients','staff_shifts','audit_log','medical_tasks','prescriptions','patient_history','staff_devices','admin_cabinets','staff_invites','admin_notifications']);
async function tableExists(table) { const r=await db.execute({sql:`SELECT name FROM sqlite_master WHERE type='table' AND name=?`,args:[table]}); return r.rows.length>0; }
async function ensureSupportTables() {
  await db.execute(`CREATE TABLE IF NOT EXISTS admin_cabinets (id TEXT PRIMARY KEY,name TEXT NOT NULL,number TEXT,type TEXT,status TEXT NOT NULL DEFAULT 'ACTIVE',capacity INTEGER,building TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS staff_invites (id TEXT PRIMARY KEY,full_name TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL,department TEXT,status TEXT NOT NULL DEFAULT 'PENDING',invite_code TEXT NOT NULL,created_by TEXT,created_at TEXT NOT NULL,accepted_at TEXT)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS admin_notifications (id TEXT PRIMARY KEY,type TEXT NOT NULL,title TEXT NOT NULL,body TEXT,entity_id TEXT,created_at TEXT NOT NULL,read_at TEXT)`);
}
async function tableColumns(table) { if (!TABLES.has(table)) throw new Error('Unsupported table'); if (!(await tableExists(table))) return []; const r=await db.execute(`PRAGMA table_info(${table})`); return r.rows.map(x=>String(x.name)); }
async function ensurePatientProfileColumns() {
  if (!(await tableExists('patients'))) return;
  const cols = new Set(await tableColumns('patients'));
  const additions = {
    first_name:'TEXT', last_name:'TEXT', middle_name:'TEXT', sex:'TEXT', address:'TEXT', emergency_contact:'TEXT',
    admission_date:'TEXT', referral_source:'TEXT', insurance_number:'TEXT', allergies:'TEXT', chronic_conditions:'TEXT',
    complaints:'TEXT', notes:'TEXT', doctor_name:'TEXT', room_number:'TEXT', room_id:'TEXT', bed_id:'TEXT', status:'TEXT',
    birth_date:'TEXT', phone:'TEXT', diagnosis:'TEXT'
  };
  for (const [column,type] of Object.entries(additions)) if (!cols.has(column)) await db.execute(`ALTER TABLE patients ADD COLUMN ${column} ${type}`);
}
async function selectTable(table, where='', args=[], limit=500) { const cols=await tableColumns(table); if(!cols.length)return []; const order=cols.includes('created_at')?'created_at DESC':cols.includes('name')?'name ASC':'rowid DESC'; const r=await db.execute({sql:`SELECT * FROM ${table}${where?` WHERE ${where}`:''} ORDER BY ${order} LIMIT ${Math.max(1,Math.min(2000,Number(limit)||500))}`,args}); return r.rows; }
async function insertKnown(table, body, map) {
  const cols=await tableColumns(table); if(!cols.length) throw new Error(`Таблиця ${table} не знайдена`);
  const data={}; for(const [col,keys] of Object.entries(map)) { if(!cols.includes(col))continue; const arr=Array.isArray(keys)?keys:[keys]; const v=arr.map(k=>body[k]).find(v=>v!==undefined&&v!==null&&v!==''); if(v!==undefined)data[col]=v; }
  if(cols.includes('id')&&!data.id)data.id=id(table.slice(0,-1));
  if(cols.includes('created_at')&&!data.created_at)data.created_at=now();
  if(cols.includes('updated_at')&&!data.updated_at)data.updated_at=now();
  const keys=Object.keys(data); if(!keys.length)throw new Error('Немає полів для створення');
  const r=await db.execute({sql:`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,args:keys.map(k=>data[k])}); return {id:data.id,rowsAffected:r.rowsAffected};
}

export async function handleAdminRoute(event, user) {
  const path=String(event.path??'').replace(/^\/api\/baas/,'')||'/';
  const method=String(event.httpMethod??'GET').toUpperCase();
  const body=bodyOf(event);
  if (!path.startsWith('/admin/')) return null;
  const authenticated=deny(user,new Set(ALL_ROLES)); if (authenticated) return authenticated;
  await ensureSupportTables();
  await ensurePatientProfileColumns();

  if (path==='/admin/permissions' && method==='GET') {
    const r=role(user);
    return json(200,{role:r,permissions:{dashboard:true,patientsRead:true,patientsWrite:PATIENT_WRITE.has(r),tasksRead:true,prescriptionsCreate:CLINICAL_LEADS.has(r),staffRead:STAFF_READ.has(r),staffManage:OWNER_ADMIN.has(r),roomsRead:true,bedsRead:true,roomsManage:MANAGEMENT.has(r),bedsManage:MANAGEMENT.has(r),cabinetsRead:true,cabinetsManage:MANAGEMENT.has(r),archiveRead:MANAGEMENT.has(r),archiveManage:MANAGEMENT.has(r),auditRead:OWNER_ADMIN.has(r),backup:OWNER_ADMIN.has(r),shiftsRead:true},roles:ALL_ROLES});
  }

  // -------------------- ПОВНИЙ ПРОФІЛЬ ПАЦІЄНТА --------------------
  if(path==='/admin/patients'&&method==='GET'){
    const d=deny(user,PATIENT_WRITE);if(d)return d;
    return json(200,{patients:await selectTable('patients','',[],2000)});
  }
  if(path==='/admin/patients'&&method==='POST'){
    const d=deny(user,PATIENT_WRITE);if(d)return d;
    try {
      const created=await insertKnown('patients',body,{
        id:['id'], full_name:['fullName','full_name','name'], first_name:['firstName','first_name'], last_name:['lastName','last_name'], middle_name:['middleName','middle_name'],
        birth_date:['birthDate','birth_date'], sex:['sex','gender'], phone:['phone','telephone'], address:['address'], emergency_contact:['emergencyContact','emergency_contact'],
        admission_date:['admissionDate','admission_date'], referral_source:['referralSource','referral_source','source'], insurance_number:['insuranceNumber','insurance_number'],
        room_id:['roomId','room_id'], room_number:['roomNumber','room_number'], bed_id:['bedId','bed_id'], doctor_name:['doctorName','doctor_name'], status:['status'],
        diagnosis:['diagnosis'], complaints:['complaints'], allergies:['allergies'], chronic_conditions:['chronicConditions','chronic_conditions'], notes:['notes']
      });
      await audit(user,'PATIENT_CREATE','patient',created.id,body,event);
      return json(201,{ok:true,patientId:created.id});
    } catch(e){ return json(409,{error:e.message}); }
  }
  if(path.startsWith('/admin/patients/')&&method==='PATCH'){
    const d=deny(user,PATIENT_WRITE);if(d)return d;
    const patientId=decodeURIComponent(path.split('/').pop());
    const cols=await tableColumns('patients');
    const aliases={fullName:'full_name',firstName:'first_name',lastName:'last_name',middleName:'middle_name',birthDate:'birth_date',gender:'sex',telephone:'phone',emergencyContact:'emergency_contact',admissionDate:'admission_date',referralSource:'referral_source',insuranceNumber:'insurance_number',roomId:'room_id',roomNumber:'room_number',bedId:'bed_id',doctorName:'doctor_name',chronicConditions:'chronic_conditions'};
    const updates={};
    for(const [input,column] of Object.entries(aliases)) if(cols.includes(column)&&body[input]!==undefined)updates[column]=body[input];
    for(const key of ['diagnosis','complaints','allergies','notes','sex','phone','address','status']) if(cols.includes(key)&&body[key]!==undefined)updates[key]=body[key];
    if(!Object.keys(updates).length)return json(400,{error:'Немає полів для зміни'});
    const set=Object.keys(updates).map(k=>`${k}=?`).join(','); const r=await db.execute({sql:`UPDATE patients SET ${set}${cols.includes('updated_at')?', updated_at=?':''} WHERE id=?`,args:cols.includes('updated_at')?[...Object.values(updates),now(),patientId]:[...Object.values(updates),patientId]});
    if(!r.rowsAffected)return json(404,{error:'Пацієнта не знайдено'});
    await audit(user,'PATIENT_UPDATE','patient',patientId,updates,event); return json(200,{ok:true});
  }

  if(path==='/admin/rooms'&&method==='GET')return json(200,{rooms:await selectTable('rooms','',[],1000)});
  if(path==='/admin/beds'&&method==='GET')return json(200,{beds:await selectTable('beds','',[],2000)});
  if(path==='/admin/cabinets'&&method==='GET')return json(200,{cabinets:await selectTable('admin_cabinets','',[],1000)});

  if(path==='/admin/rooms'&&method==='POST'){
    const d=deny(user,MANAGEMENT);if(d)return d;
    try { const created=await insertKnown('rooms',body,{id:['id'],number:['number','code'],name:['name'],type:['type'],capacity:['capacity'],building:['building'],status:['status']}); await audit(user,'ROOM_CREATE','room',created.id,body,event); return json(201,{ok:true,roomId:created.id}); } catch(e){ return json(409,{error:e.message}); }
  }
  if(path.startsWith('/admin/rooms/')&&method==='PATCH'){
    const d=deny(user,MANAGEMENT);if(d)return d; const rid=decodeURIComponent(path.split('/').pop()); const cols=await tableColumns('rooms'); const allowed=['number','name','type','capacity','building','status']; const updates={}; for(const k of allowed)if(cols.includes(k)&&body[k]!==undefined)updates[k]=body[k]; if(!Object.keys(updates).length)return json(400,{error:'Немає полів для зміни'}); const set=Object.keys(updates).map(k=>`${k}=?`).join(','); const r=await db.execute({sql:`UPDATE rooms SET ${set} WHERE id=?`,args:[...Object.values(updates),rid]}); if(!r.rowsAffected)return json(404,{error:'Палату не знайдено'}); await audit(user,'ROOM_UPDATE','room',rid,updates,event); return json(200,{ok:true});
  }

  if(path==='/admin/beds'&&method==='POST'){
    const d=deny(user,MANAGEMENT);if(d)return d;
    try { const created=await insertKnown('beds',body,{id:['id'],room_id:['roomId','room_id'],number:['number','code'],name:['name'],status:['status'],patient_id:['patientId','patient_id']}); await audit(user,'BED_CREATE','bed',created.id,body,event); return json(201,{ok:true,bedId:created.id}); } catch(e){ return json(409,{error:e.message}); }
  }
  if(path.startsWith('/admin/beds/')&&method==='PATCH'){
    const d=deny(user,MANAGEMENT);if(d)return d; const bid=decodeURIComponent(path.split('/').pop()); const cols=await tableColumns('beds'); const allowed=['room_id','number','name','status','patient_id']; const updates={}; for(const k of allowed)if(cols.includes(k)&&body[k]!==undefined)updates[k]=body[k]; if(!Object.keys(updates).length)return json(400,{error:'Немає полів для зміни'}); const set=Object.keys(updates).map(k=>`${k}=?`).join(','); const r=await db.execute({sql:`UPDATE beds SET ${set} WHERE id=?`,args:[...Object.values(updates),bid]}); if(!r.rowsAffected)return json(404,{error:'Ліжко не знайдено'}); await audit(user,'BED_UPDATE','bed',bid,updates,event); return json(200,{ok:true});
  }

  if(path==='/admin/cabinets'&&method==='POST'){
    const d=deny(user,MANAGEMENT);if(d)return d;
    try { const created=await insertKnown('admin_cabinets',body,{id:['id'],name:['name'],number:['number'],type:['type'],status:['status'],capacity:['capacity'],building:['building']}); await audit(user,'CABINET_CREATE','cabinet',created.id,body,event); return json(201,{ok:true,cabinetId:created.id}); } catch(e){ return json(409,{error:e.message}); }
  }
  if(path.startsWith('/admin/cabinets/')&&method==='PATCH'){
    const d=deny(user,MANAGEMENT);if(d)return d; const cid=decodeURIComponent(path.split('/').pop()); const updates={}; for(const k of ['name','number','type','status','capacity','building'])if(body[k]!==undefined)updates[k]=body[k]; if(!Object.keys(updates).length)return json(400,{error:'Немає полів для зміни'}); const set=Object.keys(updates).map(k=>`${k}=?`).join(','); const r=await db.execute({sql:`UPDATE admin_cabinets SET ${set},updated_at=? WHERE id=?`,args:[...Object.values(updates),now(),cid]}); if(!r.rowsAffected)return json(404,{error:'Кабінет не знайдено'}); await audit(user,'CABINET_UPDATE','cabinet',cid,updates,event); return json(200,{ok:true});
  }

  if(path==='/admin/staff'&&method==='GET'){
    const d=deny(user,STAFF_READ);if(d)return d; return json(200,{columns:await tableColumns('users'),staff:await selectTable('users','',[],1000),invites:await selectTable('staff_invites','',[],300)});
  }
  if(path==='/admin/staff'&&method==='POST'){
    const d=deny(user,OWNER_ADMIN);if(d)return d; const requested=String(body.role??'RECEPTION').toUpperCase(); if(!ALL_ROLES.includes(requested))return json(400,{error:'Невідома роль'}); if(requested==='OWNER'&&role(user)!=='OWNER')return json(403,{error:'Тільки власник може створювати OWNER'}); if(!body.email||!body.fullName)return json(400,{error:'ПІБ та email обовʼязкові'});
    const invite=id('invite'); const code=`RF-${Math.random().toString(36).slice(2,8).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await db.execute({sql:`INSERT INTO staff_invites (id,full_name,email,role,department,status,invite_code,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)`,args:[invite,body.fullName.trim(),body.email.trim().toLowerCase(),requested,body.department??null,'PENDING',code,user.id,now()]}); await audit(user,'STAFF_INVITE','staff_invite',invite,{email:body.email,role:requested},event); return json(201,{ok:true,inviteId:invite,inviteCode:code,status:'PENDING',message:'Запрошення персоналу створено. Підключення до вашого існуючого auth/активації не змінюється.'});
  }
  if(path.startsWith('/admin/staff/')&&method==='PATCH'){
    const d=deny(user,OWNER_ADMIN);if(d)return d; const staffId=decodeURIComponent(path.split('/').pop()); const cols=await tableColumns('users'); const updates={}; for(const key of ['role','status','is_active','full_name','display_name','department'])if(cols.includes(key)&&body[key]!==undefined)updates[key]=body[key]; if(updates.role&&!ALL_ROLES.includes(String(updates.role).toUpperCase()))return json(400,{error:'Невідома роль'}); if(String(updates.role||'').toUpperCase()==='OWNER'&&role(user)!=='OWNER')return json(403,{error:'Тільки власник може видавати OWNER'}); if(!Object.keys(updates).length)return json(400,{error:'Немає полів для зміни'}); const set=Object.keys(updates).map(k=>`${k}=?`).join(','); const r=await db.execute({sql:`UPDATE users SET ${set} WHERE id=?`,args:[...Object.values(updates),staffId]}); if(!r.rowsAffected)return json(404,{error:'Користувача не знайдено'}); await audit(user,'STAFF_UPDATE','user',staffId,updates,event); return json(200,{ok:true});
  }

  if(path==='/admin/notifications'&&method==='GET'){
    const since=new URLSearchParams(String(event.rawQuery??event.queryStringParameters?.raw??'')).get('since')||event.queryStringParameters?.since||null;
    const list=[];
    const stored=await selectTable('admin_notifications',since?'created_at > ?':'',since?[since]:[],100);
    for(const n of stored)list.push({id:String(n.id),type:String(n.type),title:String(n.title),body:n.body??'',entityId:n.entity_id??null,createdAt:n.created_at,readAt:n.read_at??null});
    const pcols=await tableColumns('patients'); if(pcols.includes('created_at')){
      const args=since?[since]:[]; const where=since?'created_at > ?':'1=1'; const rows=await db.execute({sql:`SELECT * FROM patients WHERE ${where} ORDER BY created_at DESC LIMIT 50`,args}); for(const p of rows.rows){const pid=String(p.id); if(list.some(x=>x.entityId===pid&&x.type==='PATIENT_REGISTERED'))continue; const name=p.full_name??p.name??[p.last_name,p.first_name,p.middle_name].filter(Boolean).join(' ')??pid; list.push({id:`patient_${pid}`,type:'PATIENT_REGISTERED',title:'Новий пацієнт',body:`Зареєстровано: ${name}`,entityId:pid,createdAt:p.created_at,readAt:null});}
    }
    return json(200,{notifications:list.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100)});
  }
  if(path==='/admin/notifications/read'&&method==='POST'){
    const d=deny(user,ALL_ROLES);if(d)return d; await db.execute(`UPDATE admin_notifications SET read_at=? WHERE read_at IS NULL`,[now()]); return json(200,{ok:true});
  }

  if(path==='/admin/archive/patients'&&method==='GET'){
    const d=deny(user,MANAGEMENT);if(d)return d; const cols=await tableColumns('patients'); const stateCol=cols.find(c=>['status','state','patient_status'].includes(c)); const where=stateCol?`LOWER(COALESCE(${stateCol},'')) IN ('discharged','archived','inactive','completed')`:'1=0'; return json(200,{patients:await selectTable('patients',where,[],1000)});
  }
  if(path==='/admin/shifts'&&method==='GET')return json(200,{shifts:await selectTable('staff_shifts','',[],1000)});
  if(path==='/admin/audit'&&method==='GET'){const d=deny(user,OWNER_ADMIN);if(d)return d;return json(200,{audit:await selectTable('audit_log','',[],1000)});}
  if(path==='/admin/archive/patient'&&method==='POST'){
    const d=deny(user,MANAGEMENT);if(d)return d; const patientId=body.patientId;if(!patientId)return json(400,{error:'patientId обовʼязковий'}); const cols=await tableColumns('patients'); const stateCol=cols.find(c=>['status','state','patient_status'].includes(c)); if(!stateCol)return json(409,{error:'У таблиці patients немає поля статусу для архівування'}); const archived=cols.includes('archived_at'); const r=await db.execute({sql:`UPDATE patients SET ${stateCol}=?${archived?', archived_at=?':''} WHERE id=?`,args:archived?['DISCHARGED',now(),patientId]:['DISCHARGED',patientId]}); if(!r.rowsAffected)return json(404,{error:'Пацієнта не знайдено'}); await audit(user,'PATIENT_ARCHIVE','patient',patientId,{},event); return json(200,{ok:true,status:'DISCHARGED'});
  }

  if(path==='/admin/backup'&&method==='POST'){
    const d=deny(user,OWNER_ADMIN);if(d)return d; const names=['users','patients','rooms','beds','medical_tasks','prescriptions','patient_history','staff_shifts','staff_devices','audit_log','admin_cabinets','staff_invites']; const snapshot={generatedAt:now(),generatedBy:user.id,role:role(user),tables:{}}; for(const t of names){if(await tableExists(t))snapshot.tables[t]=await selectTable(t,'',[],5000);} await audit(user,'BACKUP_EXPORT','database',null,{tables:Object.keys(snapshot.tables)},event); return json(200,snapshot);
  }

  return null;
}
