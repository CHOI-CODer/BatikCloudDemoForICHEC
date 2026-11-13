(function(root){
  'use strict';const B=root.Bati;
  B.AIAdapter={connected:false,name:'外部 AI 未连接',async generate(){throw new Error('外部 AI 未连接，可粘贴中文代码继续创作。');}};
  B.setAIAdapter=function(adapter){if(!adapter||typeof adapter.generate!=='function')throw new TypeError('适配器需要 generate 方法。');B.AIAdapter=adapter;root.dispatchEvent?.(new Event('batik-adapter-change'));};
  B.createDevelopmentAdapter=function({delay=100,code='冰纹 密度 1.2',fail=false}={}){return {connected:true,name:'开发测试桩',async generate(request){await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,delay);request.signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('请求已取消','AbortError'));},{once:true});});if(fail)throw new Error('模拟连接失败');return {code,mode:'patch',explanation:'开发测试桩返回的固定代码。',dslVersion:B.VERSION.dsl,requestId:request.requestId,baseRevision:request.baseRevision};}};};
  B.requestAI=async function(request,{adapter=B.AIAdapter,timeout=30000,signal}={}){
    const controller=new AbortController();const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    let timer;try{if(controller.signal.aborted)throw new DOMException('请求已取消，作品已保留。','AbortError');return await Promise.race([Promise.resolve().then(()=>adapter.generate({...request,signal:controller.signal})),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error('请求已超时，作品已保留。'));controller.abort();},timeout);controller.signal.addEventListener('abort',()=>reject(new DOMException('请求已取消，作品已保留。','AbortError')),{once:true});})]);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  };
})(globalThis);
