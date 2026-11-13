'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const {Readable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const upstream='https://htm4xz4mf8.coze.site/stream_run';
const projectId='7707450410642096179';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const runtimeFiles=new Set(['index.html','web/index.html','engine/batik_compiler.html','web/style.css','web/app.js','web/workshop-controls.js','web/assets/favicon.svg','web/assets/flower-bird.svg','web/assets/spiral.svg','shared/registry.js','shared/parser.js','shared/renderer.js','shared/renderer-legacy.js','shared/formatter.js','shared/storage.js','shared/ai-adapter.js','shared/coze-adapter.js']);

function createAgentServer({token='',root=path.resolve(__dirname,'..'),fetcher=fetch,timeout=120000}={}){
  const active=new Set();
  const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  return http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    // Also accepts a deployment subdirectory prefix, e.g. /batik/api/agent.
    if(pathname.endsWith('/api/agent')){
      if(req.method==='GET'){json(res,200,{service:'batik-coze',configured:!!token});return;}
      if(req.method!=='POST'){json(res,405,{message:'请使用 POST 请求。'});return;}
      const origin=req.headers.origin;
      let sameOrigin=true;
      try{if(origin)sameOrigin=new URL(origin).host===req.headers.host;}catch{sameOrigin=false;}
      if(req.headers['sec-fetch-site']==='cross-site'||!sameOrigin){json(res,403,{message:'请从本站发起对话。'});return;}
      if(!token){json(res,503,{message:'尚未配置智能体凭据。'});return;}
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){json(res,415,{message:'请发送 JSON。'});return;}
      let input;
      try{
        let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>32768){json(res,413,{message:'消息过长。'});return;}}
        input=JSON.parse(data);
      }catch{if(!res.destroyed)json(res,400,{message:'消息格式不正确。'});return;}
      if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>18000||typeof input.session_id!=='string'||!/^[\w-]{20,64}$/.test(input.session_id)){json(res,400,{message:'消息或会话格式不正确。'});return;}
      if(active.size>=8||active.has(input.session_id)){json(res,429,{message:'智能体正在忙。'});return;}
      active.add(input.session_id);
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
      const disconnected=()=>{if(!res.writableEnded)controller.abort();};
      res.on('close',disconnected);
      try{
        const body={content:{query:{prompt:[{type:'text',content:{text:input.prompt}}]}},type:'query',session_id:input.session_id,project_id:0};
        // Preserve the 19-digit integer exactly; JavaScript Number rounds it.
        const payload=JSON.stringify(body).replace(/"project_id":0\}$/,'"project_id":'+projectId+'}');
        const reply=await fetcher(upstream,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:payload,signal:controller.signal,redirect:'error'});
        if(!reply.ok){await reply.body?.cancel();json(res,[401,403,429].includes(reply.status)?reply.status:502,{message:'智能体连接失败。'});return;}
        if(!reply.body||!reply.headers.get('content-type')?.includes('text/event-stream')){await reply.body?.cancel();json(res,502,{message:'智能体返回格式不正确。'});return;}
        res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
        res.flushHeaders();
        await pipeline(Readable.fromWeb(reply.body),res,{signal:controller.signal});
      }catch{
        if(!res.headersSent&&!res.destroyed)json(res,controller.signal.aborted?504:502,{message:'智能体连接中断。'});
        else if(!res.destroyed)res.destroy();
      }finally{clearTimeout(timer);res.removeListener('close',disconnected);active.delete(input.session_id);}
      return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const file=pathname==='/'?'index.html':pathname.slice(1);
    if(!runtimeFiles.has(file)){res.writeHead(404).end('Not found');return;}
    try{const bytes=await fs.readFile(path.join(root,file));res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);}
    catch{res.writeHead(404).end('Not found');}
  });
}
module.exports={createAgentServer};
if(require.main===module){
  const start=token=>{
    const server=createAgentServer({token:token.trim()});
    const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
    server.listen(port,host,()=>console.log('BatiScript http://'+host+':'+port+' · '+(token.trim()?'智能体已配置':'请设置 BATIK_COZE_TOKEN')));
  };
  if(process.argv.includes('--token-stdin')){
    console.log('等待会话凭据');
    const rl=require('node:readline').createInterface({input:process.stdin});
    rl.once('line',token=>{rl.close();start(token);});
  }else start(process.env.BATIK_COZE_TOKEN||'');
}
