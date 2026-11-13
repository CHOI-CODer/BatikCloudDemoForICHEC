(function(){
 'use strict';const B=globalThis.Bati;
 B.formatCode=function(raw,context={}){
  if(new TextEncoder().encode(raw).length>B.LIMITS.codeBytes)return{code:raw,message:'代码超过限制，原文保留。'};
  if(B.extractCodes(raw).length>1)return{code:raw,message:'请先选择一个代码方案，再整理。'};
  const {tokens}=B.lex(raw);let out='',indent=0,at=0;
  const newline=()=>{out=out.replace(/[ \t]+$/,'');if(!out.endsWith('\n'))out+='\n';};
  const emit=s=>{if(!out||out.endsWith('\n'))out+='  '.repeat(indent);out+=s;};
  for(let ti=0;ti<tokens.length;ti++){const t=tokens[ti];const gap=raw.slice(at,t.offset);if(gap.trim()){if(out&&!out.endsWith('\n'))out+=' ';emit(gap.trim());if(gap.includes('\n')||/^\s*(#|\/\/)/.test(gap))newline();}at=t.end;
   if(t.kind==='break'){if(t.value===';'&&!out.endsWith(';')&&!out.endsWith('\n'))emit(';');newline();}
   else if(t.kind==='{'){out=out.trimEnd();emit(' {');newline();indent++;}
   else if(t.kind==='}'){newline();indent=Math.max(0,indent-1);emit('}');newline();}
   else if(t.kind===':'||t.kind==='='){out=out.trimEnd();emit(': ');}
   else if(t.kind===','){out=out.trimEnd();emit(', ');}
   else {const prev=tokens[ti-1];if(out&&!/[\s([{]$/.test(out)&&!(prev?.value==='图层'||prev?.value==='配色')&&!['[',']'].includes(t.kind))out+=' ';emit(t.kind==='string'?t.raw:t.value);}
  }
  const tail=raw.slice(at);if(tail.trim()){if(out&&!out.endsWith('\n'))out+=' ';emit(tail.trim());}
  out=out.trim();
  const comparable=r=>{const c=B.clone(r.config);for(const l of c.layers)for(const o of l.overlays)delete o.id;return JSON.stringify(c);};
  const a=B.parseAndRecover(raw,context),b=B.parseAndRecover(out,context);
  if(comparable(a)!==comparable(b))return{code:raw,message:'存在不明确结构，已保留原文以避免改变执行含义。'};
  return{code:out,message:'已整理当前草稿；画面保持不变。'};
 };
})();
