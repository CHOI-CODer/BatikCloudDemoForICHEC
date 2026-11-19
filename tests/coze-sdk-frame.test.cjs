const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('SDK document validates its parent, mounts official client and refreshes credentials',async()=>{
  const sent=[],scripts=[],handlers={},container={},parent={postMessage:(message,origin)=>sent.push({message,origin})};let options;
  const context={location:new URL('https://example.test/web/coze-chat.html?instance=current'),parent,
    URL,Promise,Map,Error,setTimeout,clearTimeout,
    addEventListener:(type,listener)=>{handlers[type]=listener;},
    document:{createElement:()=>({}),head:{append:script=>scripts.push(script)},getElementById:()=>container,querySelector:()=>null},
    cozeWebSDK:{init:value=>{options=value;}}};
  context.window=context;
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/coze-chat.js'),'utf8'),context);
  const emit=(type,extra={},event={})=>handlers.message({source:parent,origin:'https://example.test',data:{channel:'batik-coze-sdk-v1',instance:'current',type,...extra},...event});
  assert.equal(sent[0].message.type,'READY');
  emit('CONFIG',{projectId:'7707450410642096179'},{origin:'https://foreign.test'});assert.equal(scripts.length,0);
  emit('CONFIG',{projectId:'7707450410642096179'});assert.equal(scripts[0].src,'https://lf-cdn.coze.cn/obj/unpkg/latest/coze/web-sdk/dist/js-umd/index.min.js');
  scripts[0].onload();await tick();assert.equal(sent.at(-1).message.type,'GET_TOKEN');
  emit('TOKEN',{requestId:1,token:'test-initial-token'});await tick();
  assert.equal(options.container,container);assert.equal(options.projectId,'7707450410642096179');
  assert.equal(await options.refreshToken(),'test-initial-token');
  const next=options.refreshToken();assert.equal(sent.at(-1).message.refresh,true);
  emit('TOKEN',{requestId:2,token:'test-refreshed-token'});assert.equal(await next,'test-refreshed-token');
  options.onIframeReady();assert.equal(sent.at(-1).message.kind,'checking');options.onProjectInfoLoaded();assert.equal(sent.at(-1).message.kind,'connected');
});
