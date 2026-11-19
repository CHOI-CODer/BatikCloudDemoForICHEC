const {test}=require('node:test');
const assert=require('node:assert/strict');
const {normalizeToken,endpointURL,createCozeSDKHost}=require('../shared/coze-sdk.js');
const channel='batik-coze-sdk-v1';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(fetcher=async()=>({ok:true,json:async()=>({access_token:'test-access-token'})})){
  const sent=[],states=[],handlers=new Set(),frame={src:'about:blank',contentWindow:{postMessage:(message,origin)=>sent.push({message,origin})}};
  const scope={location:new URL('https://example.test/project/web/index.html'),crypto:require('node:crypto'),fetch:fetcher,
    addEventListener:(_,fn)=>handlers.add(fn),removeEventListener:(_,fn)=>handlers.delete(fn)};
  const client=createCozeSDKHost({frame,frameURL:'coze-chat.html',scope,onState:value=>states.push(value)});
  const instance=()=>new URL(frame.src).searchParams.get('instance');
  const emit=(type,extra={},event={})=>{for(const handler of handlers)handler({origin:scope.location.origin,source:frame.contentWindow,data:{channel,instance:instance(),type,...extra},...event});};
  return {client,frame,sent,states,emit,instance,handlers};
}
test('token paste accepts curl wrappers without persisting or accepting markup',()=>{
  assert.equal(normalizeToken(' Bearer \\<test.value\\> '),'test.value');
  assert.equal(normalizeToken('test.\nvalue'),'test.value');
  for(const value of ['', '<script>alert(1)</script>', 'x" y'])assert.throws(()=>normalizeToken(value));
});
test('token endpoints require trusted transports and resolve deployment subdirectories',()=>{
  assert.equal(endpointURL('../api/token','https://example.test/project/web/index.html'),'https://example.test/project/api/token');
  for(const value of ['javascript:bad','http://remote.test/token','https://name:pass@example.test/token','https://example.test/token#secret'])assert.throws(()=>endpointURL(value,'https://example.test'));
});
test('only the current child at the exact origin receives credentials',async()=>{
  const h=harness();h.client.connect({token:'test-access-token'});
  h.emit('GET_TOKEN',{requestId:1},{origin:'https://other.test'});h.emit('GET_TOKEN',{requestId:1},{source:{}});
  assert.equal(h.sent.length,0);
  h.emit('READY');assert.equal(h.sent[0].message.projectId,'7707450410642096179');
  h.emit('GET_TOKEN',{requestId:1});await tick();
  assert.equal(h.sent.at(-1).origin,'https://example.test');assert.equal(h.sent.at(-1).message.token,'test-access-token');
  assert.ok(!h.frame.src.includes('test-access-token'));
  h.client.destroy();assert.equal(h.handlers.size,0);
});
test('loaded iframe is not reported as authenticated project',()=>{
  const h=harness();h.client.connect({token:'test-access-token'});h.emit('STATE',{kind:'checking'});
  assert.equal(h.states.at(-1).blocking,true);h.emit('STATE',{kind:'connected'});assert.equal(h.states.at(-1).blocking,false);h.client.destroy();
});
test('an expired manual token requires replacement and does not loop',async()=>{
  const h=harness();h.client.connect({token:'test-access-token'});h.emit('GET_TOKEN',{requestId:1});await tick();
  h.emit('GET_TOKEN',{requestId:2,refresh:true});await tick();
  assert.equal(h.states.at(-1).kind,'expired');assert.equal(h.sent.at(-1).message.type,'TOKEN_ERROR');assert.equal(h.client.reload(),false);h.client.destroy();
});
test('reload aborts old token request and discards a late result',async()=>{
  const calls=[],h=harness((url,options)=>new Promise(resolve=>calls.push({url,options,resolve})));
  h.client.connect({tokenEndpoint:'https://tokens.test/issue'});const old=h.instance();h.emit('GET_TOKEN',{requestId:1});h.client.reload();
  assert.equal(calls[0].options.signal.aborted,true);h.emit('GET_TOKEN',{requestId:2});
  calls[0].resolve({ok:true,json:async()=>({token:'old-token'})});await tick();assert.equal(h.sent.length,0);
  calls[1].resolve({ok:true,json:async()=>({token:'fresh-token'})});await tick();
  assert.notEqual(h.instance(),old);assert.equal(h.sent.at(-1).message.token,'fresh-token');assert.equal(calls[1].options.credentials,'omit');h.client.destroy();
});
test('same-origin token service uses cookies and suppresses provider errors',async()=>{
  let options;const h=harness(async(_,value)=>{options=value;return {ok:false,status:403};});
  h.client.connect({tokenEndpoint:'../api/token'});h.emit('GET_TOKEN',{requestId:1});await tick();
  assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
  assert.equal(h.sent.at(-1).message.type,'TOKEN_ERROR');assert.equal(h.states.at(-1).kind,'network');h.client.destroy();
});
test('disconnect clears the frame and ignores late messages',()=>{
  const h=harness();h.client.connect({token:'test-access-token'});const instance=h.instance();h.client.disconnect();
  for(const handler of h.handlers)handler({origin:'https://example.test',source:h.frame.contentWindow,data:{channel,instance,type:'GET_TOKEN',requestId:1}});
  assert.equal(h.frame.src,'about:blank');assert.equal(h.sent.length,0);assert.equal(h.states.at(-1).configured,false);h.client.destroy();
});
