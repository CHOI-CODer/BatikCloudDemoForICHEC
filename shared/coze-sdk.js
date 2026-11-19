/* Optional Coze integration. Credentials stay in this window's memory. */
(function(root){
  'use strict';
  const channel='batik-coze-sdk-v1',projectId='7707450410642096179';
  function normalizeToken(value){
    const token=String(value||'').trim().replace(/^Bearer\s+/i,'').trim().replace(/^\\?</,'').replace(/\\?>$/,'').replace(/\s+/g,'');
    if(!token||token.length>16384||!/^[\w.~-]+$/.test(token))throw new Error('请填写有效的访问令牌。');
    return token;
  }
  function endpointURL(value,base){
    if(!String(value||'').trim())return '';
    let url;try{url=new URL(value,base);}catch{throw new Error('请填写有效的凭据接口地址。');}
    if(url.username||url.password||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new Error('续期接口需要使用 HTTPS，或本机开发地址。');
    return url.href;
  }
  function createCozeSDKHost({frame,frameURL,onState=()=>{},scope=root}){
    let config=null,instance='',controller=null,timer=null,expired=false;
    const origin=scope.location.origin;
    const messages={idle:'连接智能体，开始讨论你的蜡染创意。',loading:'正在加载聊天窗口…',checking:'正在验证连接…',connected:'已连接',invalid:'凭据无效或权限不足，请更新连接设置。',expired:'凭据已过期，请更新连接设置。',network:'连接遇到网络问题，可重新加载。',load:'聊天模块加载失败，可重新加载。',timeout:'聊天连接超时，可重新加载。'};
    function emit(kind){onState({kind,message:messages[kind]||messages.network,configured:!!config,blocking:kind!=='connected'});}
    function clear(){clearTimeout(timer);timer=null;controller?.abort();controller=null;}
    function send(type,payload){frame.contentWindow?.postMessage({channel,instance,type,...payload},origin);}
    function launch(){
      clear();instance=scope.crypto.randomUUID();controller=new AbortController();
      const url=new URL(frameURL,scope.location.href);url.searchParams.set('instance',instance);
      frame.src=url.href;emit('loading');timer=setTimeout(()=>emit('timeout'),30000);
    }
    async function supplyToken(message){
      const at=instance,signal=controller.signal;
      try{
        let token;
        if(config.tokenEndpoint){
          const request=new AbortController(),abort=()=>request.abort(),deadline=setTimeout(abort,4000);
          signal.addEventListener('abort',abort,{once:true});
          try{
            const reply=await scope.fetch(config.tokenEndpoint,{signal:request.signal,cache:'no-store',credentials:new URL(config.tokenEndpoint).origin===origin?'same-origin':config.useCookies?'include':'omit',redirect:'error',headers:{Accept:'application/json'}});
            if(!reply.ok)throw new Error('token endpoint');
            const data=await reply.json();token=normalizeToken(data.access_token||data.token);
          }finally{clearTimeout(deadline);signal.removeEventListener('abort',abort);}
        }else{
          if(message.refresh){expired=true;throw new Error('expired');}
          token=config.token;
        }
        if(at===instance&&!signal.aborted)send('TOKEN',{requestId:message.requestId,token});
      }catch{
        if(at!==instance||signal.aborted)return;
        clearTimeout(timer);send('TOKEN_ERROR',{requestId:message.requestId});emit(expired?'expired':'network');
      }
    }
    function receive(event){
      const message=event.data;
      if(event.origin!==origin||event.source!==frame.contentWindow||!message||message.channel!==channel||message.instance!==instance||!config)return;
      if(message.type==='READY')send('CONFIG',{projectId});
      else if(message.type==='GET_TOKEN'&&Number.isSafeInteger(message.requestId))supplyToken(message);
      else if(message.type==='STATE'&&['checking','connected','invalid','expired','network','load'].includes(message.kind)){
        if(message.kind!=='checking')clearTimeout(timer);
        if(message.kind==='expired')expired=true;
        emit(message.kind);
      }
    }
    scope.addEventListener('message',receive);
    emit('idle');
    return {
      connect({token='',tokenEndpoint='',useCookies=false}){
        if(!/^https?:$/.test(scope.location.protocol))throw new Error('请通过网站地址或本地 HTTP 预览连接智能体。');
        const endpoint=endpointURL(tokenEndpoint,scope.location.href);
        config=endpoint?{tokenEndpoint:endpoint,useCookies:useCookies===true}:{token:normalizeToken(token)};
        expired=false;launch();
      },
      reload(){if(!config)return false;if(expired&&!config.tokenEndpoint){emit('expired');return false;}launch();return true;},
      disconnect(){clear();config=null;expired=false;instance='';frame.src='about:blank';emit('idle');},
      destroy(){this.disconnect();scope.removeEventListener('message',receive);}
    };
  }
  const exports={normalizeToken,endpointURL,createCozeSDKHost};
  if(typeof module==='object'&&module.exports)module.exports=exports;
  Object.assign(root.Bati=root.Bati||{},exports);
})(globalThis);
