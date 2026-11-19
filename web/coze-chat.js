(function(){
  'use strict';
  // A separate document resets the official SDK's complete lifecycle on reload.
  const channel='batik-coze-sdk-v1',instance=new URL(location.href).searchParams.get('instance'),origin=location.origin;
  const pending=new Map();let sequence=0,started=false,tokenRequests=0;
  const post=(type,extra={})=>parent.postMessage({channel,instance,type,...extra},origin);
  const state=kind=>post('STATE',{kind});
  function refreshToken(){
    const requestId=++sequence,refresh=tokenRequests++>0;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(requestId);state('network');reject(new Error('连接凭据获取超时。'));},4500);
      pending.set(requestId,{resolve,reject,timer});post('GET_TOKEN',{requestId,refresh});
    });
  }
  function loadSDK(){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>reject(new Error('SDK load timeout')),15000);
      script.src='https://lf-cdn.coze.cn/obj/unpkg/latest/coze/web-sdk/dist/js-umd/index.min.js';
      script.onload=()=>{clearTimeout(timer);globalThis.cozeWebSDK?resolve():reject(new Error('SDK unavailable'));};
      script.onerror=()=>{clearTimeout(timer);reject(new Error('SDK unavailable'));};document.head.append(script);
    });
  }
  async function start(projectId){
    try{await loadSDK();}catch{state('load');return;}
    // Resolve the first credential before init so rejected credentials are handled.
    let initial;
    try{initial=await refreshToken();}catch{return;}
    let first=true;
    cozeWebSDK.init({projectId,container:document.getElementById('sdk-container'),theme:'light',
      refreshToken:()=>{if(first){first=false;const value=initial;initial=null;return Promise.resolve(value);}return refreshToken();},
      unauthorizedDescription:'请在工坊左侧的连接设置中更新访问令牌。',
      onIframeReady:()=>state('checking'),onProjectInfoLoaded:()=>state('connected'),
      onTokenInvalid:()=>state('invalid'),onTokenExpired:()=>state('expired'),onNetworkError:()=>state('network')});
    const iframe=document.querySelector('#sdk-container iframe');
    if(iframe){iframe.title='扣子蜡染智能体';iframe.allow='clipboard-write';iframe.referrerPolicy='no-referrer';}
  }
  addEventListener('message',event=>{
    const message=event.data;
    if(event.source!==parent||event.origin!==origin||!message||message.channel!==channel||message.instance!==instance)return;
    if(message.type==='CONFIG'&&!started&&message.projectId==='7707450410642096179'){started=true;start(message.projectId).catch(()=>state('load'));}
    else if(['TOKEN','TOKEN_ERROR'].includes(message.type)){
      const request=pending.get(message.requestId);if(!request)return;
      clearTimeout(request.timer);pending.delete(message.requestId);
      if(message.type==='TOKEN'&&typeof message.token==='string')request.resolve(message.token);
      else request.reject(new Error('请检查连接设置。'));
    }
  });
  // SDK refresh callbacks are async; avoid showing raw provider errors or tokens.
  addEventListener('unhandledrejection',event=>{event.preventDefault();});
  if(parent!==window&&instance&&origin!=='null')post('READY');
})();
