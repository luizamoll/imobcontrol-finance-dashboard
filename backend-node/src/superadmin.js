
const id=(v,bad)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)throw bad(400,'ID invalido');return n};
const text=(v,max,bad,required=false)=>{
 if(v==null||v===''){if(required)throw bad(400,'Campo obrigatorio');return null}
 if(typeof v!=='string'||!v.trim()&&required||v.trim().length>max)throw bad(400,'Campo invalido');
 return v.trim()||null;
};
const slugify=n=>n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'empresa';
const page=(out,total,pagina,tamanho)=>({content:out,totalElements:total,totalPages:Math.ceil(total/tamanho),number:pagina,size:tamanho,numberOfElements:out.length,first:pagina===0,last:(pagina+1)*tamanho>=total,empty:out.length===0});
function validarEmpresa(b,bad,criacao=false){
 if(!b||typeof b!=='object'||Array.isArray(b))throw bad(400,'Empresa invalida');
 const dados={nome:text(b.nome,160,bad,true)};
 for(const [campo,max] of [['razaoSocial',200],['email',200],['telefone',30]]) {
  if(criacao||b[campo]!==undefined)dados[campo]=text(b[campo],max,bad);
 }
 if(dados.email&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email))throw bad(400,'E-mail invalido');
 if(dados.email)dados.email=dados.email.toLowerCase();
 if(criacao||b.cnpj!==undefined){
  const raw=text(b.cnpj,18,bad),cnpj=raw?.replace(/\D/g,'')||null;
  if(cnpj&&cnpj.length!==14)throw bad(400,'CNPJ invalido');
  dados.cnpj=cnpj;
 }
 if(!criacao&&b.ativa!==undefined){if(typeof b.ativa!=='boolean')throw bad(400,'Situacao invalida');dados.ativa=b.ativa?1:0;}
 return dados;
}
export function registerSuperAdmin(app,{db,exigirLogin,handler,bad}) {
 const admin=(req)=>{if(req.usuario.perfil!=='SUPER_ADMIN')throw bad(403,'Somente super administrador')};
 const resumo=async c=>{
  const [stats]=await db.execute("SELECT SUM(perfil='ADMIN' AND ativo=1 AND email_verificado=1 AND senha_definida=1) AS ativos,SUM(perfil='ADMIN' AND ativo=1 AND (email_verificado=0 OR senha_definida=0)) AS pendentes FROM usuarios WHERE empresa_id=?",[c.id]);
  const [cli]=await db.execute('SELECT COUNT(*) AS total FROM clientes WHERE empresa_id=?',[c.id]);
  return {id:c.id,nome:c.nome,slug:c.slug,razaoSocial:c.razao_social,cnpj:c.cnpj,
   email:c.email,telefone:c.telefone,ativa:Boolean(c.ativa),
   administradoresAtivos:Number(stats[0].ativos||0),administradoresPendentes:Number(stats[0].pendentes||0),
   clientesCadastrados:Number(cli[0].total),criadoEm:c.criado_em?.replace(' ','T'),atualizadoEm:c.atualizado_em?.replace(' ','T')};
 };
 app.get('/api/super-admin/empresas',exigirLogin,handler(async(req,res)=>{
  admin(req);if(req.query.incluirInativas!=null&&!['true','false'].includes(req.query.incluirInativas))throw bad(400,'Parametro invalido');
  const [rows]=await db.execute('SELECT * FROM empresas'+(req.query.incluirInativas==='true'?'':' WHERE ativa=1')+' ORDER BY nome');
  res.json(await Promise.all(rows.map(resumo)));
 }));
 app.post('/api/super-admin/empresas',exigirLogin,handler(async(req,res)=>{
  admin(req);const v=validarEmpresa(req.body,bad,true),c=await db.getConnection();
  let empresa;try{
   await c.beginTransaction();
   const base=slugify(v.nome);let slug=base;
   for(let i=2;i<10000;i++){
    const [duplos]=await c.execute('SELECT id FROM empresas WHERE slug=? LIMIT 1',[slug]);
    if(!duplos.length)break;slug=base+'-'+i;
   }
   if(v.cnpj){const [dup]=await c.execute('SELECT id FROM empresas WHERE cnpj=?',[v.cnpj]);if(dup.length)throw bad(409,'CNPJ ja cadastrado')}
   const [r]=await c.execute('INSERT INTO empresas (nome,slug,razao_social,cnpj,email,telefone,ativa,criado_em,atualizado_em) VALUES (?,?,?,?,?,?,1,UTC_TIMESTAMP(),UTC_TIMESTAMP())',
   [v.nome,slug,v.razaoSocial,v.cnpj,v.email,v.telefone]);
   await c.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'EMPRESA',?,'EMPRESA_CRIADA',UTC_TIMESTAMP())",[r.insertId,req.usuario.id,r.insertId]);
   const [rows]=await c.execute('SELECT * FROM empresas WHERE id=?',[r.insertId]);empresa=rows[0];
   await c.commit();
  }catch(e){await c.rollback();throw e}finally{c.release()}
  res.status(201).json(await resumo(empresa));
 }));
 app.put('/api/super-admin/empresas/:id',exigirLogin,handler(async(req,res)=>{
  admin(req);const empresaId=id(req.params.id,bad),v=validarEmpresa(req.body,bad),c=await db.getConnection();
  let empresa;try{
   await c.beginTransaction();
   const [rows]=await c.execute('SELECT * FROM empresas WHERE id=? FOR UPDATE',[empresaId]);
   if(!rows.length)throw bad(404,'Empresa nao encontrada');
   const campos={nome:v.nome};
   const map={razaoSocial:'razao_social',cnpj:'cnpj',email:'email',telefone:'telefone',ativa:'ativa'};
   for(const [input,col] of Object.entries(map))if(Object.hasOwn(v,input))campos[col]=v[input];
   if(campos.cnpj){const [duplos]=await c.execute('SELECT id FROM empresas WHERE cnpj=? AND id<>?',[campos.cnpj,empresaId]);if(duplos.length)throw bad(409,'CNPJ ja cadastrado')}
   await c.execute('UPDATE empresas SET '+Object.keys(campos).map(x=>x+'=?').join(',')+',atualizado_em=UTC_TIMESTAMP() WHERE id=?',[...Object.values(campos),empresaId]);
   if(campos.ativa===0)await c.execute('DELETE FROM node_sessoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE empresa_id=?)',[empresaId]);
   await c.execute("INSERT INTO auditoria_operacional (empresa_id,usuario_id,entidade,entidade_id,acao,criado_em) VALUES (?,?,'EMPRESA',?,'EMPRESA_ATUALIZADA',UTC_TIMESTAMP())",[empresaId,req.usuario.id,empresaId]);
   const [saved]=await c.execute('SELECT * FROM empresas WHERE id=?',[empresaId]);empresa=saved[0];await c.commit();
  }catch(e){await c.rollback();throw e}finally{c.release()}
  res.json(await resumo(empresa));
 }));
 app.get('/api/super-admin/auditoria',exigirLogin,handler(async(req,res)=>{
  admin(req);
  const pagina=Number(req.query.pagina||0),tamanho=Number(req.query.tamanho||50);
  if(!Number.isSafeInteger(pagina)||pagina<0||!Number.isSafeInteger(tamanho)||tamanho<1||tamanho>200)throw bad(400,'Paginacao invalida');
  const campos=[],args=[];
  for(const [input,column] of [['empresaId','a.empresa_id'],['usuarioId','a.usuario_id']])if(req.query[input]!=null){campos.push(column+'=?');args.push(id(req.query[input],bad))}
  for(const input of ['acao','entidade'])if(req.query[input]!=null){campos.push('a.'+input+'=?');args.push(text(req.query[input],60,bad))}
  for(const [input,cmp] of [['inicio','>='],['fim','<=']])if(req.query[input]!=null){
   const d=String(req.query[input]);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d)||Number.isNaN(Date.parse(d)))throw bad(400,'Data invalida');
   campos.push('a.criado_em'+cmp+'?');args.push(d.replace('T',' ').slice(0,19));
  }
  const where=campos.length?' WHERE '+campos.join(' AND '):'';
  const [count]=await db.execute('SELECT COUNT(*) AS total FROM auditoria_operacional a'+where,args);
  const [rows]=await db.execute('SELECT a.*,e.nome AS empresa_nome,u.nome AS usuario_nome FROM auditoria_operacional a LEFT JOIN empresas e ON e.id=a.empresa_id LEFT JOIN usuarios u ON u.id=a.usuario_id'+where+' ORDER BY a.criado_em DESC,a.id DESC LIMIT ? OFFSET ?',[...args,tamanho,pagina*tamanho]);
  const out=rows.map(r=>({id:r.id,empresaId:r.empresa_id,empresaNome:r.empresa_nome||'Empresa #'+r.empresa_id,
   usuarioId:r.usuario_id,usuarioNome:r.usuario_nome||'Usuario #'+r.usuario_id,entidade:r.entidade,entidadeId:r.entidade_id,
   acao:r.acao,detalhes:r.detalhes,criadoEm:r.criado_em?.replace(' ','T')}));
  res.json(page(out,Number(count[0].total),pagina,tamanho));
 }));
}
