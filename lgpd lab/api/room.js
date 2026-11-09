import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

const TTL = 60 * 60 * 6;
const stages = [
  'Introdução à LGPD', 'Conceitos e agentes', 'Princípios e bases legais',
  'Direitos do titular', 'Punições', 'Boas práticas e conclusão'
];
const allowedOrigins = ['GET', 'POST'];
const sha = v => createHash('sha256').update(v).digest('hex');
const redisKey = code => `lgpd:v1:room:${code}`;
const votesKey = (code, stage) => `lgpd:v1:votes:${code}:${stage}`;
function fail(res, status, error) { res.status(status).json({ error }); }
function tokenValid(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x=Buffer.from(sha(a)), y=Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x,y);
}
function roomCode() {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(6)).map(n=>alphabet[n%alphabet.length]).join('');
}
async function redis(...cmd) {
  const base=process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) throw new Error('Redis não configurado. Conecte Upstash Redis à Vercel e defina as variáveis de ambiente.');
  const resp=await fetch(base, {method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(cmd),signal:AbortSignal.timeout(8000)});
  if(!resp.ok) throw new Error('Falha de conexão com Redis.');
  const payload=await resp.json();
  if(payload.error) throw new Error('Erro do banco de dados.');
  return payload.result;
}
async function readRoom(code) {
  const stored=await redis('GET',redisKey(code));
  if(!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}
function validCode(code) { return typeof code === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(code); }
function publicRoom(room) { return {code:room.code,stage:room.stage,opened:room.opened,createdAt:room.createdAt,titles:stages}; }
function validAnswer(stage, answer) {
  if(!answer || typeof answer !== 'object' || Array.isArray(answer)) return false;
  const permitted={0:['accept','review','decline'],1:['user','company','host'],3:['access','correct','delete','revoke'],4:['automatic','investigate','ignore']};
  if(stage in permitted) return permitted[stage].includes(answer.choice);
  if(stage===2 || stage===5) {
    const choices=stage===2?['name','address','cpf','contacts','location']:['minimize','access','rights','retention','security'];
    return Array.isArray(answer.selected) && answer.selected.length<=choices.length && new Set(answer.selected).size===answer.selected.length && answer.selected.every(v=>choices.includes(v));
  }
  return false;
}
async function totals(code, stage) {
  const values = await redis('HVALS', votesKey(code,stage)) || [];
  const count={};
  for(const raw of values) {
    try {
      const a=JSON.parse(raw);
      if(stage===2 || stage===5) for(const id of a.selected) count[id]=(count[id]||0)+1;
      else count[a.choice]=(count[a.choice]||0)+1;
    } catch {}
  }
  return {participants:values.length,counts:count};
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!allowedOrigins.includes(req.method)) return fail(res,405,'Método não permitido.');
  try {
    const action=req.method==='GET'?'status':req.body?.action;
    if(action==='create') {
      const secret=randomBytes(24).toString('base64url');
      let code;
      for(let i=0;i<10;i++) {
        code=roomCode();
        const ok=await redis('SET',redisKey(code),JSON.stringify({code,secretHash:sha(secret),stage:0,opened:true,createdAt:new Date().toISOString()}),'EX',TTL,'NX');
        if(ok==='OK') return res.status(201).json({code,secret,stage:0});
      }
      return fail(res,503,'Não foi possível gerar uma sala. Tente novamente.');
    }
    const code=String(req.method==='GET'?req.query.code:req.body?.code||'').toUpperCase();
    if(!validCode(code)) return fail(res,400,'Código da sala inválido.');
    const room=await readRoom(code);
    if(!room) return fail(res,404,'Sala não encontrada ou expirada.');
    if(action==='status') {
      const summary=req.query?.view==='student'?undefined:await totals(code,room.stage);
      return res.status(200).json({...publicRoom(room),...(summary?{summary}:{})});
    }
    if(action==='advance' || action==='toggle') {
      const secret=req.headers.authorization?.replace(/^Bearer\s+/i,'')||'';
      if(!tokenValid(secret,room.secretHash)) return fail(res,403,'Acesso restrito ao apresentador.');
      if(action==='advance') {
        const stage=Number(req.body?.stage);
        if(!Number.isInteger(stage)||stage<0||stage>5) return fail(res,400,'Etapa inválida.');
        room.stage=stage; room.opened=true;
      } else room.opened=!room.opened;
      await redis('SET',redisKey(code),JSON.stringify(room),'KEEPTTL');
      return res.status(200).json(publicRoom(room));
    }
    if(action==='vote') {
      if(!room.opened) return fail(res,409,'A votação está encerrada.');
      const participant=req.body?.participant;
      const stage=Number(req.body?.stage);
      const answer=req.body?.answer;
      if(typeof participant!=='string'||! /^[a-f0-9-]{36}$/.test(participant)) return fail(res,400,'Identificador inválido.');
      if(stage!==room.stage) return fail(res,409,'A etapa mudou. Atualize a tela.');
      if(!validAnswer(stage,answer)) return fail(res,400,'Resposta inválida.');
      await redis('HSET',votesKey(code,stage),sha(participant),JSON.stringify(answer));
      await redis('EXPIRE',votesKey(code,stage),TTL);
      return res.status(200).json({ok:true,stage});
    }
    return fail(res,400,'Ação desconhecida.');
  }catch(e){ console.error('LGPD Lab API:',e.message); return fail(res,503,e.message.startsWith('Redis não configurado')?e.message:'Serviço temporariamente indisponível. Confira a conexão do Redis.'); }
}
