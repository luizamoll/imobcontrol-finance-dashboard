
import { randomBytes,createHash,createHmac,timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { rateLimit } from 'express-rate-limit';

const sha=x=>createHash('sha256').update(x).digest('hex');
const validoEmail=v=>typeof v==='string'&&v.trim().length<=200&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const emailConfig=()=>Boolean(process.env.SMTP_HOST&&process.env.SMTP_FROM&&process.env.APP_URL);
const remetente=()=>nodemailer.createTransport({
 host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),
 secure:Number(process.env.SMTP_PORT||587)===465,
 auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,
 requireTLS:Number(process.env.SMTP_PORT||587)!==465,
 connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000
});
const enviar=async(to,subject,text)=>{
 if(!emailConfig())return false;
 await remetente().sendMail({from:process.env.SMTP_FROM,to,subject,text});
 return true;
};
const appURL=()=>process.env.APP_URL.replace(/\/+$/,'');
const pwd=(s,bad)=>{
 if(typeof s!=='string'||s.length<8||s.length>72)throw bad(400,'Senha precisa ter entre 8 e 72 caracteres');
 return s;
};
export function registerAcessoConta(app,{db,exigirLogin,handler,bad}){
 const limited=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:'draft-7',legacyHeaders:false});
 async function emitirToken(usuario,tipo,minutos){
  const token=randomBytes(32).toString('base64url'),hash=sha(token);
  await db.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND tipo=? AND usado_em IS NULL',[usuario.id,tipo]);
  await db.execute('INSERT INTO tokens_acesso_node (usuario_id,tipo,token_hash,expira_em,criado_em) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? MINUTE),UTC_TIMESTAMP())',[usuario.id,tipo,hash,minutos]);
  return token;
 }
 async function revogar(usuario,tipo,token){
  await db.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND tipo=? AND token_hash=?',[usuario.id,tipo,sha(token)]);
 }
 async function enviarLink(usuario,tipo,link,minutos){
  if(!emailConfig())return false;
  const token=await emitirToken(usuario,tipo,minutos);
  try{
   const caminho=appURL()+'/'+link+'?token='+encodeURIComponent(token);
   const nome=tipo==='CONVITE'?'Convite para acessar':'Recuperacao de senha';
   const enviado=await enviar(usuario.email,nome+' - Imob Control','Ola, '+usuario.nome+'.\n\nAcesse este link de uso unico (expira em '+minutos+' minutos):\n'+caminho+'\n\nSe nao solicitou, ignore.');
   if(enviado&&tipo==='CONVITE')await db.execute('UPDATE usuarios SET convite_enviado_em=UTC_TIMESTAMP() WHERE id=?',[usuario.id]);
   return enviado;
  }catch(e){await revogar(usuario,tipo,token);console.error('Falha no envio de e-mail transacional:',e.message);return false;}
 }
 const solicitarConvite=async usuario=>enviarLink(usuario,'CONVITE','ativar-conta',48*60);
 const solicitarRecuperacao=async usuario=>enviarLink(usuario,'RECUPERACAO_SENHA','redefinir-senha',30);
 const concluir=async(tipo,b,res)=>{
  pwd(b?.novaSenha,bad);
  if(typeof b?.token!=='string'||b.token.length<30||b.token.length>200)throw bad(400,'Token invalido ou expirado');
  const c=await db.getConnection();
  try{
   await c.beginTransaction();
   const [rows]=await c.execute('SELECT t.id,t.usuario_id,t.usado_em,t.expira_em,u.email,u.ativo,e.ativa AS empresa_ativa FROM tokens_acesso_node t JOIN usuarios u ON u.id=t.usuario_id LEFT JOIN empresas e ON e.id=u.empresa_id WHERE t.tipo=? AND t.token_hash=? LIMIT 1 FOR UPDATE',[tipo,sha(b.token.trim())]);
   const token=rows[0];
   if(!token||token.usado_em!=null||String(token.expira_em).replace('T',' ').slice(0,19) <= new Date().toISOString().slice(0,19).replace('T',' ')||
      !Number(token.ativo)||(token.empresa_ativa!=null&&!Number(token.empresa_ativa)))throw bad(400,'Token invalido ou expirado');
   const hash=await bcrypt.hash(b.novaSenha,12);
   await c.execute('UPDATE usuarios SET senha_hash=?,senha_definida=1,email_verificado=1,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=?',[hash,token.usuario_id]);
   await c.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL',[token.usuario_id]);
   await c.execute('DELETE FROM node_sessoes WHERE usuario_id=?',[token.usuario_id]);
   await c.commit();res.status(204).end();
  }catch(e){await c.rollback();throw e;}finally{c.release()}
 };
 app.post('/api/auth/recuperar-senha',limited,handler(async(req,res)=>{
  if(!validoEmail(req.body?.email))throw bad(400,'E-mail invalido');
  if(emailConfig()){
   const [r]=await db.execute('SELECT id,nome,email FROM usuarios WHERE LOWER(email)=LOWER(?) AND ativo=1 AND (empresa_id IS NULL OR empresa_id IN (SELECT id FROM empresas WHERE ativa=1)) LIMIT 1',[req.body.email.trim()]);
   if(r.length)await solicitarRecuperacao(r[0]);
  }
  // Nao revela se o email existe nem se o SMTP esta disponivel.
  res.status(204).end();
 }));
 app.post('/api/auth/ativar-conta',handler(async(req,res)=>concluir('CONVITE',req.body,res)));
 app.post('/api/auth/redefinir-senha',handler(async(req,res)=>concluir('RECUPERACAO_SENHA',req.body,res)));

 const codigoHash=(id,codigo)=>createHmac('sha256',process.env.SESSION_SECRET).update('email:'+id+':'+codigo).digest('hex');
 const prepararCodigo=async(conn,usuarioId)=>{
  const codigo=String(randomBytes(4).readUInt32BE(0)%1000000).padStart(6,'0');
  await conn.execute("UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND tipo='VERIFICACAO_EMAIL' AND usado_em IS NULL",[usuarioId]);
  await conn.execute("INSERT INTO tokens_acesso_node (usuario_id,tipo,token_hash,expira_em,criado_em) VALUES (?,'VERIFICACAO_EMAIL',?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE),UTC_TIMESTAMP())",[usuarioId,codigoHash(usuarioId,codigo)]);
  return codigo;
 };
 const enviarCodigo=async(usuarioId,mail,nome,conn)=>{
  const codigo=await prepararCodigo(conn,usuarioId);
  return enviar(mail,'Codigo de verificacao - Imob Control',
    'Ola, '+nome+'.\n\nSeu codigo de verificacao do Imob Control e: '+codigo+
    '\n\nUso unico, valido por 15 minutos. Nao compartilhe este codigo.');
 };
 const cookieSessao=req=>{
  const m=String(req.headers.cookie||'').match(/(?:^|;\s*)imob_session=([0-9a-f]{64})(?:;|$)/i);
  return m?sha(m[1]):null;
 };
 const dtoConta=async usuarioId=>{
  const [r]=await db.execute('SELECT id,nome,email,telefone,email_verificado,senha_definida,perfil FROM usuarios WHERE id=?',[usuarioId]);
  if(!r.length)throw bad(404,'Usuario nao encontrado');
  const u=r[0];
  const [p]=await db.execute('SELECT permissao FROM usuario_permissoes WHERE usuario_id=?',[usuarioId]);
  const [empresa]=await db.execute('SELECT e.id,e.nome,e.slug FROM empresas e JOIN usuarios u ON u.empresa_id=e.id WHERE u.id=?',[usuarioId]);
  return {id:u.id,nome:u.nome,email:u.email,telefone:u.telefone,emailVerificado:Boolean(u.email_verificado),
   senhaDefinida:Boolean(u.senha_definida),perfil:u.perfil,permissoes:p.map(x=>x.permissao),
   empresa:empresa[0]||null};
 };
 app.put('/api/auth/minha-conta',exigirLogin,handler(async(req,res)=>{
  const u=req.usuario,b=req.body||{};
  if(typeof b.nome!=='string'||!b.nome.trim()||b.nome.trim().length>160||!validoEmail(b.email))throw bad(400,'Nome ou e-mail invalido');
  const email=b.email.trim().toLowerCase(),mudouEmail=email!==u.email.toLowerCase();
  const novaSenha=b.novaSenha||null;
  if((mudouEmail||novaSenha!=null)&&!emailConfig()&&mudouEmail)throw bad(503,'Configure SMTP para confirmar a mudanca de e-mail');
  if(novaSenha!=null)pwd(novaSenha,bad);
  if(mudouEmail||novaSenha!=null){
   const [rows]=await db.execute('SELECT senha_hash FROM usuarios WHERE id=?',[u.id]);
   if(!rows.length||typeof b.senhaAtual!=='string'||!await bcrypt.compare(b.senhaAtual,rows[0].senha_hash))throw bad(400,'Confirme sua senha atual');
  }
  const telefone=b.telefone==null||b.telefone===''?null:String(b.telefone).trim();
  if(telefone?.length>30)throw bad(400,'Telefone invalido');
  const conn=await db.getConnection();
  try{
   await conn.beginTransaction();
   const [rows]=await conn.execute('SELECT id,email FROM usuarios WHERE id=? FOR UPDATE',[u.id]);
   if(!rows.length)throw bad(404,'Usuario nao encontrado');
   if(mudouEmail){
    const [duplos]=await conn.execute('SELECT id FROM usuarios WHERE LOWER(email)=LOWER(?) AND id<>?',[email,u.id]);
    if(duplos.length)throw bad(409,'E-mail ja cadastrado');
   }
   const sql='UPDATE usuarios SET nome=?,email=?,telefone=?,email_verificado=?,'
     +'senha_hash=COALESCE(?,senha_hash),versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=?';
   await conn.execute(sql,[b.nome.trim(),email,telefone,mudouEmail?0:u.email_verificado,
    novaSenha==null?null:await bcrypt.hash(novaSenha,12),u.id]);
   if(mudouEmail) {
    if(!await enviarCodigo(u.id,email,b.nome.trim(),conn))throw bad(503,'Falha ao enviar o codigo de confirmacao');
   }
   // O usuario pode confirmar com a propria sessao; todas as outras sao encerradas.
   if(mudouEmail||novaSenha!=null){
    const tokenHash=cookieSessao(req);
    if(tokenHash)await conn.execute('DELETE FROM node_sessoes WHERE usuario_id=? AND token_hash<>?',[u.id,tokenHash]);
    if(novaSenha!=null)await conn.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND tipo<>\'VERIFICACAO_EMAIL\' AND usado_em IS NULL',[u.id]);
   }
   await conn.commit();
  }catch(e){await conn.rollback();throw e}finally{conn.release()}
  res.json(await dtoConta(u.id));
 }));
 app.post('/api/auth/verificar-email-codigo',exigirLogin,limited,handler(async(req,res)=>{
  const codigo=req.body?.codigo;
  if(typeof codigo!=='string'||!/^\d{6}$/.test(codigo))throw bad(400,'Codigo invalido');
  const c=await db.getConnection();
  try{
   await c.beginTransaction();
   const [t]=await c.execute("SELECT id,expira_em,usado_em FROM tokens_acesso_node WHERE usuario_id=? AND tipo='VERIFICACAO_EMAIL' AND token_hash=? FOR UPDATE",[req.usuario.id,codigoHash(req.usuario.id,codigo)]);
   const token=t[0],agora=new Date().toISOString().slice(0,19).replace('T',' ');
   if(!token||token.usado_em!=null||String(token.expira_em).replace('T',' ').slice(0,19)<=agora)throw bad(400,'Codigo invalido ou expirado');
   await c.execute('UPDATE usuarios SET email_verificado=1,atualizado_em=UTC_TIMESTAMP(),versao=versao+1 WHERE id=?',[req.usuario.id]);
   await c.execute("UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND tipo='VERIFICACAO_EMAIL' AND usado_em IS NULL",[req.usuario.id]);
   await c.commit();res.status(204).end();
  }catch(e){await c.rollback();throw e}finally{c.release()}
 }));
 app.post('/api/auth/reenviar-verificacao-email',exigirLogin,limited,handler(async(req,res)=>{
  if(req.usuario.email_verificado) return res.status(204).end();
  if(!emailConfig())throw bad(503,'Servico de e-mail nao configurado');
  const c=await db.getConnection();
  try{
   await c.beginTransaction();
   if(!await enviarCodigo(req.usuario.id,req.usuario.email,req.usuario.nome,c))throw bad(503,'Falha ao enviar codigo');
   await c.commit();res.status(204).end();
  }catch(e){await c.rollback();throw e}finally{c.release()}
 }));
 app.post('/api/auth/verificar-email',handler(async(req,res)=>{
  if(typeof req.body?.token!=='string'||req.body.token.length<30||req.body.token.length>200)throw bad(400,'Token invalido');
  const c=await db.getConnection();
  try{
   await c.beginTransaction();
   const [r]=await c.execute("SELECT id,usuario_id,expira_em,usado_em FROM tokens_acesso_node WHERE tipo='VERIFICACAO_EMAIL' AND token_hash=? FOR UPDATE",[sha(req.body.token.trim())]);
   const token=r[0];
   if(!token||token.usado_em!=null||String(token.expira_em).replace('T',' ').slice(0,19)<=new Date().toISOString().slice(0,19).replace('T',' '))throw bad(400,'Token invalido ou expirado');
   await c.execute('UPDATE usuarios SET email_verificado=1,atualizado_em=UTC_TIMESTAMP() WHERE id=?',[token.usuario_id]);
   await c.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL',[token.usuario_id]);
   await c.commit();res.status(204).end();
  }catch(e){await c.rollback();throw e}finally{c.release()}
 }));
 return { solicitarConvite, emailConfig };
}
