(function(root){
  'use strict';
  const B=root.Bati;
  const endpoint=new URL('../api/agent',document.currentScript.src).href;
  const maxReplyBytes=256*1024;

  // Decode only public answers. Thinking and tool payloads never become code.
  B.readCozeStream=async function(response,{signal,onText}={}){
    if(!response.ok){
      const messages={401:'智能体凭据已失效，请联系网站管理员更新。',403:'当前网页无法连接智能体，请检查网站连接设置。',429:'智能体正在忙，请稍后重试。',503:'智能体尚未配置，请联系网站管理员。',504:'智能体响应超时，请重试。'};
      throw new Error(messages[response.status]||'智能体连接失败，请稍后重试。');
    }
    if(!response.headers.get('content-type')?.includes('text/event-stream')||!response.body)throw new Error('智能体返回格式不正确，请检查连接服务。');
    const reader=response.body.getReader(),decoder=new TextDecoder(),seen=new Set();
    let buffer='',answer='',bytes=0,ended=false;
    const abort=()=>{reader.cancel().catch(()=>{});};
    signal?.addEventListener('abort',abort,{once:true});
    const consume=block=>{
      const lines=block.split(/\r?\n/),data=lines.filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
      if(!data)return;
      let event;try{event=JSON.parse(data);}catch{throw new Error('智能体回复不完整，请重试。');}
      const type=event.type,content=event.content||{};
      if(type==='error'||content.error)throw new Error('智能体处理失败，请重试。');
      if(type==='message_end'){
        if(String(content.message_end?.code??'0')!=='0')throw new Error('智能体处理失败，请重试。');
        ended=true;return;
      }
      if(type!=='answer')return;
      const key=event.sequence_id==null?null:String(event.sequence_id);
      if(key&&seen.has(key))return;
      if(key)seen.add(key);
      if(typeof content.answer!=='string')return;
      answer+=content.answer;
      onText?.(answer);
    };
    try{
      while(!ended){
        if(signal?.aborted)throw new DOMException('请求已取消','AbortError');
        const {value,done}=await reader.read();
        if(signal?.aborted)throw new DOMException('请求已取消','AbortError');
        if(done){buffer+=decoder.decode();break;}
        bytes+=value.byteLength;
        if(bytes>maxReplyBytes)throw new Error('智能体回复过长，请缩短问题后重试。');
        buffer+=decoder.decode(value,{stream:true});
        let boundary;
        while((boundary=/\r?\n\r?\n/.exec(buffer))){
          const block=buffer.slice(0,boundary.index);
          buffer=buffer.slice(boundary.index+boundary[0].length);
          consume(block);
          if(ended)break;
        }
      }
      if(!ended&&buffer.trim())consume(buffer);
      if(!ended)throw new Error('连接已中断，回复尚未完成，请重试。');
      if(!answer.trim())throw new Error('智能体本次没有返回文字，请重试。');
      return answer;
    }finally{
      signal?.removeEventListener('abort',abort);
      await reader.cancel().catch(()=>{});
      reader.releaseLock();
    }
  };

  B.createCozeAdapter=function({url=endpoint,fetcher=root.fetch.bind(root)}={}){
    // Each page owns a fresh conversation. Never reuse the API sample session.
    let sessionId=root.crypto.randomUUID();
    return {connected:true,name:'扣子智能体 · 就绪',kind:'coze',resetSession(){sessionId=root.crypto.randomUUID();},async generate(request){
      const prompt=[
        '你正在蜡染 AI 创作工坊中对话。根据用户要求回答或生成 BatikScript 中文代码。',
        '需要修改作品时优先给局部修改代码，使用 ```batik 围栏；不要声明新素材或编造素材 ID。',
        '上下文以本次成功代码为准，用户要求只取下方“本次要求”。',
        '当前选中图层：'+(request.selectedLayerId||'尚未上传图案'),
        '当前成功代码：\n'+request.currentCode,
        '本次要求：\n'+request.intent
      ].join('\n\n');
      let response;
      try{response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,session_id:sessionId}),signal:request.signal,redirect:'error'});}
      catch(error){if(error.name==='AbortError')throw error;throw new Error('智能体连接中断，请检查网络后重试。');}
      const text=await B.readCozeStream(response,{signal:request.signal,onText:request.onText});
      const blocks=[...text.matchAll(/```(?:batik(?:script)?|蜡染)?\s*\n([\s\S]*?)```/gi)];
      // Keep multiple alternatives together for the existing choice dialog.
      const code=blocks.length===1?blocks[0][1].trim():text;
      return {code,codeSeparated:blocks.length===1,explanation:blocks.length===1?text.replace(blocks[0][0],'').trim():'',text,mode:'patch',requestId:request.requestId,baseRevision:request.baseRevision};
    }};
  };

  B.connectCoze=async function(){
    const response=await fetch(endpoint,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('网站尚未启用智能体连接服务。');
    const status=await response.json();
    if(status.service!=='batik-coze'||!status.configured)throw new Error('网站尚未配置智能体凭据。');
    B.setAIAdapter(B.createCozeAdapter());
  };
  B.connectCoze().catch(()=>{});
})(globalThis);
