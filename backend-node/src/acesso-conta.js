
import { randomBytes,createHash,createHmac,timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

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
 app.post('/api/auth/recuperar-senha',handler(async(req,res)=>{
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
 app.put('/api/auth/minha-conta',exigirLogin,handler(async(req,res)=>{
  const u=req.usuario,b=req.body||{};
  if(typeof b.nome!=='string'||!b.nome.trim()||b.nome.length>160||!validoEmail(b.email))throw bad(400,'Nome ou e-mail invalido');
  const email=b.email.trim().toLowerCase(),mudouEmail=email!==u.email.toLowerCase(),novaSenha=b.novaSenha||null;
  if(mudouEmail)throw bad(503,'Alteracao de e-mail exige verificacao; disponivel apos configurar fluxo de confirmacao');
  if(novaSenha!=null)pwd(novaSenha,bad);
  if(novaSenha!=null){
   if(typeof b.senhaAtual!=='string')throw bad(400,'Informe a senha atual');
   const [r]=await db.execute('SELECT senha_hash FROM usuarios WHERE id=?',[u.id]);
   if(!r.length||!await bcrypt.compare(b.senhaAtual,r[0].senha_hash))throw bad(400,'Senha atual incorreta');
  }
  const telefone=b.telefone==null||b.telefone===''?null:String(b.telefone).trim();
  if(telefone?.length>30)throw bad(400,'Telefone invalido');
  const c=await db.getConnection();
  try{
   await c.beginTransaction();
   if(novaSenha!=null){
    await c.execute('UPDATE usuarios SET nome=?,telefone=?,senha_hash=?,atualizado_em=UTC_TIMESTAMP(),versao=versao+1 WHERE id=?',[b.nome.trim(),telefone,await bcrypt.hash(novaSenha,12),u.id]);
    await c.execute('DELETE FROM node_sessoes WHERE usuario_id=?',[u.id]);
    await c.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL',[u.id]);
   }else await c.execute('UPDATE usuarios SET nome=?,telefone=?,atualizado_em=UTC_TIMESTAMP(),versao=versao+1 WHERE id=?',[b.nome.trim(),telefone,u.id]);
   await c.commit();
  }catch(e){await c.rollback();throw e}finally{c.release()}
  res.json({id:u.id,nome:b.nome.trim(),email,telefone,perfil:u.perfil,senhaDefinida:true,emailVerificado:Boolean(u.email_verificado)});
 }));
 return { solicitarConvite, emailConfig };
}
