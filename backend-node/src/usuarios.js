
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
const PERMS=new Set(['CLIENTES_VISUALIZAR','CLIENTES_GERENCIAR','EMPREENDIMENTOS_VISUALIZAR','EMPREENDIMENTOS_GERENCIAR','VENDAS_VISUALIZAR','VENDAS_CRIAR','VENDAS_EDITAR','VENDAS_EXCLUIR','VENDAS_HISTORICO_VISUALIZAR','VENDAS_GERENCIAR','RECEBIMENTOS_VISUALIZAR','RECEBIMENTOS_REGISTRAR','RECEBIMENTOS_ESTORNAR','FINANCEIRO_VISUALIZAR','RELATORIOS_VISUALIZAR','CONFIGURACOES_GERENCIAR','EQUIPE_GERENCIAR']);
const id=(v,bad)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<=0)throw bad(400,'ID invalido');return n};
const email=(v,bad)=>{if(typeof v!=='string'||v.trim().length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()))throw bad(400,'E-mail invalido');return v.trim().toLowerCase()};
const name=(v,bad)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>160)throw bad(400,'Nome invalido');return v.trim()};
const phone=(v,bad)=>{if(v==null||v==='')return null;if(typeof v!=='string'||v.trim().length>30)throw bad(400,'Telefone invalido');return v.trim()};
const permissions=(v,bad,ator)=>{
 if(v==null)return [];
 if(!Array.isArray(v)||v.some(p=>typeof p!=='string'||!PERMS.has(p)))throw bad(400,'Permissoes invalidas');
 const all=new Set(v);
 if(ator.perfil==='USUARIO'&&all.has('EQUIPE_GERENCIAR'))throw bad(403,'Permissao de gestor exige administrador');
 for(const [a,b] of [['CLIENTES_GERENCIAR','CLIENTES_VISUALIZAR'],['EMPREENDIMENTOS_GERENCIAR','EMPREENDIMENTOS_VISUALIZAR'],['RECEBIMENTOS_REGISTRAR','RECEBIMENTOS_VISUALIZAR'],['RECEBIMENTOS_ESTORNAR','RECEBIMENTOS_VISUALIZAR']])if(all.has(a))all.add(b);
 if(['VENDAS_GERENCIAR','VENDAS_CRIAR','VENDAS_EDITAR','VENDAS_EXCLUIR','VENDAS_HISTORICO_VISUALIZAR'].some(x=>all.has(x)))all.add('VENDAS_VISUALIZAR');
 return [...all];
};
const paginacao=(q,bad)=>{const pagina=Number(q.pagina??0),tamanho=Number(q.tamanho??50);if(!Number.isSafeInteger(pagina)||pagina<0||!Number.isSafeInteger(tamanho)||tamanho<1||tamanho>200||!Number.isSafeInteger(pagina*tamanho))throw bad(400,'Paginacao invalida');return {pagina,tamanho}};
const response=u=>({
 id:u.id,nome:u.nome,email:u.email,telefone:u.telefone,perfil:u.perfil,
 ativo:Boolean(u.ativo),emailVerificado:Boolean(u.email_verificado),
 senhaDefinida:Boolean(u.senha_definida),conviteEnviadoEm:u.convite_enviado_em,
 permissoes:u.permissoes||[],empresa:u.empresa_id==null?null:{id:u.empresa_id,nome:u.empresa_nome,slug:u.empresa_slug},
 versao:Number(u.versao),criadoEm:u.criado_em?.replace(' ','T'),atualizadoEm:u.atualizado_em?.replace(' ','T')
});
export function registerUsuarios(app,{db,exigirLogin,empresaAutorizada,exigirPermissao,handler,bad,conta}){
 const auditoria=(c,empresa,ator,alvo,acao)=>c.execute(
  "INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'USUARIO',?,?,UTC_TIMESTAMP())",
  [empresa,ator,alvo,acao]);
 const usuario=async(conn,idUsuario,empresa=null,lock=false)=>{
  const [r]=await conn.execute('SELECT u.*,e.nome AS empresa_nome,e.slug AS empresa_slug FROM usuarios u LEFT JOIN empresas e ON e.id=u.empresa_id WHERE u.id=?'+(empresa!=null?' AND u.empresa_id=?':'')+(lock?' FOR UPDATE':''),
  empresa!=null?[idUsuario,empresa]:[idUsuario]);
  if(!r.length)throw bad(404,'Usuario nao encontrado');
  const u=r[0];const [permissions]=await conn.execute('SELECT permissao FROM usuario_permissoes WHERE usuario_id=?',[u.id]);u.permissoes=permissions.map(p=>p.permissao);return u;
 };
 const listar=async(req,res,empresa=null,superAdmin=false)=>{
  const {pagina,tamanho}=paginacao(req.query,bad),where=[],args=[];
  if(empresa!=null){where.push('u.empresa_id=?');args.push(empresa);}
  if(!superAdmin)where.push("u.perfil='USUARIO'");
  if(req.query.empresaId!=null&&superAdmin){where.push('u.empresa_id=?');args.push(id(req.query.empresaId,bad));}
  if(req.query.perfil!=null&&superAdmin){if(!['ADMIN','USUARIO','SUPER_ADMIN'].includes(req.query.perfil))throw bad(400,'Perfil invalido');where.push('u.perfil=?');args.push(req.query.perfil);}
  if(req.query.ativo!=null){if(!['true','false'].includes(req.query.ativo))throw bad(400,'Ativo invalido');where.push('u.ativo=?');args.push(req.query.ativo==='true'?1:0);}
  if(req.query.busca){const termo=String(req.query.busca).slice(0,100).replace(/[\\%_]/g,c=>'\\'+c);where.push('(u.nome LIKE ? OR u.email LIKE ?)');args.push('%'+termo+'%','%'+termo+'%');}
  const filtro=where.length?' WHERE '+where.join(' AND '):'';
  const [n]=await db.execute('SELECT COUNT(*) AS total FROM usuarios u'+filtro,args),total=Number(n[0].total);
  const [rows]=await db.execute('SELECT u.*,e.nome AS empresa_nome,e.slug AS empresa_slug FROM usuarios u LEFT JOIN empresas e ON e.id=u.empresa_id'+filtro+' ORDER BY u.nome,u.id LIMIT ? OFFSET ?',[...args,tamanho,pagina*tamanho]);
  const out=[];
  for(const u of rows){const [p]=await db.execute('SELECT permissao FROM usuario_permissoes WHERE usuario_id=?',[u.id]);u.permissoes=p.map(z=>z.permissao);out.push(response(u));}
  res.json({content:out,totalElements:total,totalPages:Math.ceil(total/tamanho),number:pagina,size:tamanho,numberOfElements:out.length,first:pagina===0,last:(pagina+1)*tamanho>=total,empty:out.length===0});
 };
 const criar=async(req,res,empresa,perfil)=>{
  const b=req.body||{},nome=name(b.nome,bad),mail=email(b.email,bad),telefone=phone(b.telefone,bad);
  if(!['USUARIO','ADMIN'].includes(perfil))throw bad(400,'Perfil invalido');
  if(req.usuario.perfil==='USUARIO'&&perfil!=='USUARIO')throw bad(403,'Perfil nao permitido');
  const perms=perfil==='USUARIO'?permissions(b.permissoes,bad,req.usuario):[];
  const c=await db.getConnection();let saved;
  try{
   await c.beginTransaction();
   const [duplos]=await c.execute('SELECT id FROM usuarios WHERE LOWER(email)=LOWER(?) LIMIT 1',[mail]);
   if(duplos.length)throw bad(409,'E-mail cadastrado');
   const hash=await bcrypt.hash(randomUUID(),12);
   const [r]=await c.execute("INSERT INTO usuarios (empresa_id,nome,email,telefone,senha_hash,perfil,ativo,senha_definida,email_verificado,versao,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,1,0,0,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())",[empresa,nome,mail,telefone,hash,perfil]);
   for(const p of perms)await c.execute('INSERT INTO usuario_permissoes (usuario_id,permissao) VALUES (?,?)',[r.insertId,p]);
   await auditoria(c,empresa,req.usuario.id,r.insertId,'FUNCIONARIO_CRIADO');
   await c.commit();saved=await usuario(db,r.insertId);
  }catch(e){await c.rollback();throw e}finally{c.release()}
  if(conta.emailConfig())await conta.solicitarConvite(saved);
  res.status(201).json(response(saved));
 };
 const atualizar=async(req,res,empresa,superAdmin=false)=>{
  const targetId=id(req.params.id,bad),b=req.body||{};
  if(!Number.isSafeInteger(b.versao)||b.versao<0)throw bad(400,'Versao invalida');
  const nome=name(b.nome,bad),mail=email(b.email,bad),tel=phone(b.telefone,bad);
  if(typeof b.ativo!=='boolean')throw bad(400,'Ativo invalido');
  const c=await db.getConnection();let saved,alterouEmail=false;
  try{
   await c.beginTransaction();
   const atual=await usuario(c,targetId,empresa,true);
   if(superAdmin){if(atual.perfil==='SUPER_ADMIN')throw bad(403,'Super administradores nao sao gerenciaveis');}
   else{
    if(atual.perfil!=='USUARIO')throw bad(403,'Alvo nao e colaborador');
    if(targetId===req.usuario.id)throw bad(403,'Nao altere seu proprio acesso');
    if(req.usuario.perfil==='USUARIO'&&atual.permissoes.includes('EQUIPE_GERENCIAR'))throw bad(403,'Somente admin altera outro gestor');
   }
   if(Number(atual.versao)!==b.versao)throw bad(409,'Cadastro foi alterado');
   const novaEmpresa=superAdmin?id(b.empresaId,bad):empresa;
   const perfil=superAdmin?b.perfil:'USUARIO';
   if(!['USUARIO','ADMIN'].includes(perfil))throw bad(403,'Perfil nao permitido');
   if(superAdmin){const [e]=await c.execute('SELECT id FROM empresas WHERE id=? AND ativa=1',[novaEmpresa]);if(!e.length)throw bad(404,'Empresa nao encontrada');}
   const perms=superAdmin?[]:permissions(b.permissoes,bad,req.usuario);
   const [duplos]=await c.execute('SELECT id FROM usuarios WHERE LOWER(email)=LOWER(?) AND id<>? LIMIT 1',[mail,targetId]);
   if(duplos.length)throw bad(409,'E-mail ja cadastrado');
   alterouEmail=mail!==atual.email.toLowerCase();
   const [result]=await c.execute('UPDATE usuarios SET nome=?,email=?,telefone=?,empresa_id=?,perfil=?,ativo=?,email_verificado=?,convite_enviado_em=?,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=? AND versao=?',
   [nome,mail,tel,novaEmpresa,perfil,b.ativo?1:0,alterouEmail?0:atual.email_verificado,alterouEmail?null:atual.convite_enviado_em,targetId,b.versao]);
   if(result.affectedRows!==1)throw bad(409,'Cadastro alterado por outra sessao');
   await c.execute('DELETE FROM usuario_permissoes WHERE usuario_id=?',[targetId]);
   for(const p of perms)await c.execute('INSERT INTO usuario_permissoes (usuario_id,permissao) VALUES (?,?)',[targetId,p]);
   if(!b.ativo||alterouEmail)await c.execute('DELETE FROM node_sessoes WHERE usuario_id=?',[targetId]);
   if(alterouEmail)await c.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL',[targetId]);
   await auditoria(c,novaEmpresa,req.usuario.id,targetId,b.ativo?'FUNCIONARIO_ATUALIZADO':'FUNCIONARIO_DESATIVADO');
   await c.commit();saved=await usuario(db,targetId);
  }catch(e){await c.rollback();throw e}finally{c.release()}
  if(alterouEmail&&b.ativo&&conta.emailConfig())await conta.solicitarConvite(saved);
  res.json(response(saved));
 };
 const senha=async(req,res,empresa)=>{
  const uId=id(req.params.id,bad),password=req.body?.senha;
  if(typeof password!=='string'||password.length<8||password.length>72)throw bad(400,'Senha invalida');
  const hash=await bcrypt.hash(password,12),c=await db.getConnection();
  try{
   await c.beginTransaction();
   const u=await usuario(c,uId,empresa,true);
   if(u.perfil==='SUPER_ADMIN'||(!empresa&&req.usuario.perfil!=='SUPER_ADMIN'))throw bad(403,'Alvo nao permitido');
   if(empresa&&u.perfil!=='USUARIO')throw bad(403,'Alvo nao permitido');
   await c.execute('UPDATE usuarios SET senha_hash=?,senha_definida=1,email_verificado=1,versao=versao+1,atualizado_em=UTC_TIMESTAMP() WHERE id=?',[hash,uId]);
   await c.execute('DELETE FROM node_sessoes WHERE usuario_id=?',[uId]);
   await c.execute('UPDATE tokens_acesso_node SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL',[uId]);
   await auditoria(c,u.empresa_id,req.usuario.id,uId,'SENHA_FUNCIONARIO_REDEFINIDA');
   await c.commit();res.status(204).end();
  }catch(e){await c.rollback();throw e}finally{c.release()}
 };
 const convite=async(req,res,empresa)=>{
  const target=await usuario(db,id(req.params.id,bad),empresa);
  if(target.perfil==='SUPER_ADMIN'||(empresa&&target.perfil!=='USUARIO'))throw bad(403,'Alvo nao permitido');
  if(target.senha_definida&&target.email_verificado)throw bad(409,'Usuario ja ativou a conta');
  const enviado=await conta.solicitarConvite(target);res.json({enviado});
 };
 const empresaId=async req=>{await exigirPermissao(req,['EQUIPE_GERENCIAR']);return empresaAutorizada(req);};
 const superAdmin=req=>{if(req.usuario.perfil!=='SUPER_ADMIN')throw bad(403,'Acesso reservado ao super administrador');};
 app.get('/api/empresa/usuarios',exigirLogin,handler(async(req,res)=>listar(req,res,await empresaId(req))));
 app.post('/api/empresa/usuarios',exigirLogin,handler(async(req,res)=>criar(req,res,await empresaId(req),'USUARIO')));
 app.put('/api/empresa/usuarios/:id',exigirLogin,handler(async(req,res)=>atualizar(req,res,await empresaId(req))));
 app.post('/api/empresa/usuarios/:id/senha',exigirLogin,handler(async(req,res)=>senha(req,res,await empresaId(req))));
 app.post('/api/empresa/usuarios/:id/convite',exigirLogin,handler(async(req,res)=>convite(req,res,await empresaId(req))));
 app.get('/api/super-admin/usuarios',exigirLogin,handler(async(req,res)=>{superAdmin(req);return listar(req,res,null,true)}));
 app.get('/api/super-admin/usuarios/resumo',exigirLogin,handler(async(req,res)=>{
  superAdmin(req);
  const [rows]=await db.execute("SELECT COUNT(*) total,SUM(ativo=1) ativos,SUM(ativo=0) inativos,SUM(perfil='ADMIN') administradores,SUM(perfil='USUARIO') usuariosOperacionais FROM usuarios");
  res.json(Object.fromEntries(Object.entries(rows[0]).map(([k,v])=>[k,Number(v||0)])));
 }));
 app.post('/api/super-admin/usuarios',exigirLogin,handler(async(req,res)=>{
  superAdmin(req);const b=req.body||{},empresa=id(b.empresaId,bad);
  const [e]=await db.execute('SELECT id FROM empresas WHERE id=? AND ativa=1',[empresa]);if(!e.length)throw bad(404,'Empresa nao encontrada');
  return criar(req,res,empresa,b.perfil);
 }));
 app.put('/api/super-admin/usuarios/:id',exigirLogin,handler(async(req,res)=>{superAdmin(req);return atualizar(req,res,null,true)}));
 app.post('/api/super-admin/usuarios/:id/senha',exigirLogin,handler(async(req,res)=>{superAdmin(req);return senha(req,res,null)}));
 app.post('/api/super-admin/usuarios/:id/convite',exigirLogin,handler(async(req,res)=>{superAdmin(req);return convite(req,res,null)}));
}
