(function (root) {
  'use strict';
  const B=root.Bati;
  const commands=['蓝底白花','白底蓝花','风格','冰纹','蜡滴','笔触','蜡边','染色','布面','套色','种子','尺寸'];
  const fields={};
  for(const [k,p] of Object.entries(B.PARAMS)) fields[p.l2]=k;
  Object.assign(fields,{素材:'assetId',位置:'position',大小:'size',冰裂纹:'crackEnabled',染色颜色:'mainColor',融合模式:'blend',动画:'animation',动画循环:'loop',画布底色:'background',光影统一:'preprocess.enabled',多色印染:'palette.enabled',配色方式:'palette.mode',图层叠加:'compositeMode',图层显示:'visible'});
  const params=['密度','宽度','强度','颗粒','深度','颜色','区域'];
  const words=[...new Set([...commands,...Object.keys(fields),...params,...Object.keys(B.ALIASES),...Object.keys(B.COLORS),...Object.keys(B.STYLES),...B.BLENDS,...B.ANIMATIONS,...Object.keys(B.BACKGROUNDS),...Object.keys(B.BOOLEANS),'配色','删除配色','比例','随机度','继承',...Object.keys(B.COMPOSITES),...B.PALETTE_MODES,'图层','全局','花心','色块','蜡染','开始','结束'])].sort((a,b)=>b.length-a.length);
  const canonical=w=>B.ALIASES[w]||w;
  const normalize=c=>{const n=c.charCodeAt(0);return n>=0xff01&&n<=0xff5e?String.fromCharCode(n-0xfee0):({'【':'[','】':']','，':',','、':',','。':';','−':'-','　':' '})[c]||c;};
  B.extractCodes=function(text){
    const blocks=[...String(text).matchAll(/```([^\n`]*)\n([\s\S]*?)```/g)];
    const chosen=blocks.filter(m=>/^\s*(batik|batikscript)\s*$/i.test(m[1]));
    const candidates=chosen.length?chosen:blocks.filter(m=>/^\s*(text)?\s*$/i.test(m[1]));
    return candidates.length?candidates.map(m=>{const leading=m[2].length-m[2].trimStart().length,offset=m.index+m[0].indexOf('\n')+1+leading;return{code:m[2].trim(),line:text.slice(0,offset).split('\n').length,offset};}): [{code:String(text).replace(/^\uFEFF/,''),line:1,offset:text.startsWith('\uFEFF')?1:0}];
  };
  B.lex=function(raw){
    const tokens=[],notes=[];let i=0,line=1,column=1;
    const pos=()=>({offset:i,line,column});
    const advance=()=>{const c=raw[i++];if(c==='\n'){line++;column=1;}else column++;return c;};
    const push=(kind,value,start,original)=>tokens.push({kind,value,raw:original??raw.slice(start.offset,i),...start,end:i});
    const quotes={'"':'"',"'":"'",'“':'”','‘':'’','「':'」','『':'』'};
    while(i<raw.length){
      const start=pos(),c=raw[i],n=normalize(c);
      if(c==='\r'||(n!=='\n'&&/\s/.test(n))){advance();continue;}
      if(c==='/'&&raw[i+1]==='*') {advance();advance();while(i<raw.length&&!(raw[i]==='*'&&raw[i+1]==='/'))advance();if(i<raw.length){advance();advance();}else notes.push({...start,message:'块注释尚未闭合，余下内容保留为注释。',status:'已跳过'});continue;}
      if((c==='/'&&raw[i+1]==='/')||(c==='#'&&!/^#(?:[a-f\d]{6}|[a-f\d]{3})(?![a-z\d])/i.test(raw.slice(i)))) {while(i<raw.length&&raw[i]!=='\n')advance();continue;}
      if(quotes[c]){advance();let value='',closed=false;while(i<raw.length&&raw[i]!=='\n'){if(raw[i]===quotes[c]){advance();closed=true;break;}if(raw[i]==='\\'&&raw[i+1]===quotes[c])advance();value+=advance();}push('string',value,start);if(!closed)notes.push({...start,message:'在本行末尾补齐引号。',status:'自动修正后应用'});continue;}
      if(c==='#'){let value='';const m=raw.slice(i).match(/^#[a-f\d]{3}(?:[a-f\d]{3})?/i)[0];for(let x=0;x<m.length;x++)value+=advance();push('value',value,start);continue;}
      if(/^https?:\/\//i.test(raw.slice(i))){let value='';while(i<raw.length&&!/[\s;；}｝]/.test(raw[i]))value+=advance();push('string',value,start);continue;}
      if(/[\n;{}:=,\[\]()×!?]/.test(n)){advance();push(n==='\n'||n===';'?'break':n,n,start);continue;}
      let run='',positions=[];
      while(i<raw.length){const q=raw[i],v=normalize(q);if(/\s/.test(v)||/[;{}:=,\[\]()×!?]/.test(v)||quotes[q]||q==='#'||q==='/')break;positions.push(pos());run+=v;advance();}
      if(!run){advance();push('unknown',c,start);continue;}
      let at=0;
      while(at<run.length){
        const rest=run.slice(at),key=words.find(w=>rest.startsWith(w));
        if(key){const p=positions[at];tokens.push({kind:'word',value:canonical(key),raw:raw.slice(p.offset,positions[at+key.length-1].offset+1),...p,end:positions[at+key.length-1].offset+1,alias:key!==canonical(key)});at+=key.length;continue;}
        const num=rest.match(/^[+-]?(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(?:[a-zA-Z]+|像素|度|秒)?%?/);
        let len=num?num[0].length:1;
        if(!num)while(at+len<run.length&&!words.some(w=>run.slice(at+len).startsWith(w))&&!/^[+-]?\d/.test(run.slice(at+len)))len++;
        const p=positions[at];tokens.push({kind:'value',value:run.slice(at,at+len),raw:raw.slice(p.offset,positions[at+len-1].offset+1),...p,end:positions[at+len-1].offset+1});at+=len;
      }
    }
    return {tokens,notes};
  };
  function chineseNumber(s){
    if(!/^[零一二两三四五六七八九十百千点]+$/.test(s))return NaN;
    const digits={零:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
    const parts=s.split('点');if(parts.length>2)return NaN;
    let total=0,last=0;
    for(const c of parts[0]){if(c in digits)last=digits[c];else{total+=(last||1)*({十:10,百:100,千:1000}[c]);last=0;}}
    total+=last;
    if(parts.length===2){if(!parts[1]||[...parts[1]].some(c=>!(c in digits)))return NaN;total+=Number('0.'+[...parts[1]].map(c=>digits[c]).join(''));}
    return total;
  }
  B.readNumber=function(tokens,key,l2=false){
    const p=B.PARAMS[key],text=tokens.map(t=>t.value).join('').replace(/^,+|,+$/g,'');
    let unit='',value=NaN;const match=text.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(%|px|像素|deg|度|秒|s)?$/i);
    if(match){value=Number(match[1]);unit=(match[2]||'').toLowerCase();}else value=chineseNumber(text);
    if(!Number.isFinite(value))return {error:'数值无法识别；请使用完整数字，小数用英文点。'};
    if(unit&&unit!=='%'&&!(p.unit==='px'&&['px','像素'].includes(unit))&&!(p.unit==='deg'&&['deg','度'].includes(unit))&&!(p.unit==='s'&&['s','秒'].includes(unit)))return {error:'该属性不接受这个单位。'};
    if(unit==='%'&&(['seed','outputSize','speed','rotation','transition','duration'].includes(key)||key.endsWith('.seed')))return {error:'该属性需要明确数值，不能使用百分比。'};
    if(unit==='%')value=value/100*p.max;else if(l2||p.percent)value/=p.divisor;
    const before=value;value=Math.min(p.max,Math.max(p.min,value));if(p.integer)value=Math.trunc(value);
    return {value,adjusted:value!==before};
  };
  const clean=ts=>ts.filter(t=>![':', '=', '(',')','!','?'].includes(t.kind));
  function distance1(a,b){if(Math.abs(a.length-b.length)>1)return false;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]));prev=next;}if(prev[b.length]===1)return true;for(let i=0;i<a.length-1;i++)if(a.slice(0,i)+a[i+1]+a[i]+a.slice(i+2)===b)return true;return false;}
  B.parseAndRecover=function(raw,context={}){
    const original=String(raw),base=B.clone(context.baseConfig||B.newConfig()),mode=context.mode||'replace';
    const diagnostics=[];let count=0,applied=0,blocked=false;
    const diag=(token,message,status='已跳过',effectiveValue)=>{if(diagnostics.length<150)diagnostics.push({line:token?.line||1,column:token?.column||1,start:token?.offset||0,end:token?.end||0,original:token?.raw||'',message,status,effectiveValue,severity:status==='已跳过'?'warning':'info'});};
    if(new TextEncoder().encode(original).length>B.LIMITS.codeBytes)return {config:base,diagnostics:[{line:1,column:1,message:'代码超过 100 KiB，本次保留现有作品。',status:'已跳过'}],changed:false,applied:0,status:'未应用',rawCode:original,normalizedCode:B.toCode(base),sourceMap:[]};
    const choices=B.extractCodes(original);
    if(choices.length>1)return {config:base,choices,diagnostics:[{line:1,column:1,message:'检测到多个代码方案，请先选择一个。',status:'已跳过'}],changed:false,applied:0,status:'未应用',rawCode:original,normalizedCode:B.toCode(base),sourceMap:[]};
    const prefix=original.slice(0,choices[0].offset||0).replace(/[^\r\n]/g,' ');
    const {tokens,notes}=B.lex(prefix+choices[0].code);notes.forEach(n=>diag(n,n.message,n.status));
    const wide=tokens.find(t=>t.kind!=='string'&&/[！-～，。【】、]/.test(t.raw));if(wide)diag(wide,'已识别全角数字与中英文语法标点；原文保持不变。','自动修正后应用');
    for(const t of tokens)if(t.alias)diag(t,`“${t.raw}”按“${t.value}”识别。`,'自动修正后应用');
    const hasLayers=tokens.some(t=>t.kind==='word'&&t.value==='图层');
    const replaceProject=hasLayers||context.fullProject;
    const config=replaceProject&&mode==='replace'?B.newConfig():B.clone(base);
    let targetId=context.targetLayerId||(base.layers.length===1?base.layers[0].id:null),scope=null,open=false;
    const valid=new Set(),overlayTouched=new Set(),paletteOps=new Map();
    const assetList=context.assets||[];
    const oldLayer=id=>base.layers.find(l=>l.id===id);
    const ensureLayer=id=>{let layer=config.layers.find(l=>l.id===id);if(!layer){if(config.layers.length>=B.LIMITS.layers)return null;layer=B.defaults(id,oldLayer(id)?.assetId);config.layers.push(layer);}return layer;};
    if(!replaceProject&&mode==='replace'&&targetId){const prior=oldLayer(targetId);const fresh=B.defaults(targetId,prior?.assetId);if(prior)for(const k of ['x','y','width','height','rotation','blend','opacity'])fresh[k]=prior[k];const at=config.layers.findIndex(l=>l.id===targetId);if(at>=0)config.layers[at]=fresh;else config.layers.push(fresh);}
    const target=()=>scope==='全局'||!(scope||targetId)?null:ensureLayer(scope||targetId);
    const recover=(obj,key,tok,message)=>{const id=obj===config.global?'global':obj?.id,tag=id+'.'+key;if(obj&&!valid.has(tag)){const old=id==='global'?base.global:oldLayer(id);if(old&&B.get(old,key)!==undefined)B.set(obj,key,B.clone(B.get(old,key)));}diag(tok,message+(obj?' 已保留有效值。':''),'已跳过',obj?B.get(obj,key):undefined);};
    const assign=(obj,key,value)=>{if(!obj)return;B.set(obj,key,value);valid.add((obj===config.global?'global':obj.id)+'.'+key);applied++;};
    const numeric=(obj,key,ts,l2,tok)=>{if(!obj){diag(tok,'请先选中一个图层。');return;}const result=B.readNumber(clean(ts),key,l2);if(result.error)recover(obj,key,tok,result.error);else {assign(obj,key,result.value);if(result.adjusted)diag(tok,`已调整至允许范围：${result.value}。`,'自动修正后应用',result.value);if(key==='crackDensity')assign(obj,'crackEnabled',result.value>0);}};
    const color=(obj,key,ts,tok)=>{const v=clean(ts).map(t=>t.value).join('').replace(/^,+|,+$/g,'');if(v in B.COLORS||/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(v)){assign(obj,key,v);if(key==='mainColor')assign(obj,'explicitColor',true);}else recover(obj,key,tok,'颜色未识别，请使用色板名称或 Hex 颜色。');};
    function parseField(key,ts,tok){
      const globalKeys=['outputSize','speed','duration','animation','loop','background'];const obj=globalKeys.includes(key)?config.global:target();
      if(!obj){diag(tok,'请先选中一个图层。');return;}
      const vals=clean(ts),v=vals.map(t=>t.value).join('');
      if(B.PARAMS[key]){numeric(obj,key,vals,true,tok);return;}
      if(key==='mainColor'){color(obj,key,vals,tok);return;}
      if(key==='assetId'){
        const exact=assetList.filter(a=>a.id===v),matches=exact.length?exact:assetList.filter(a=>a.name===v||(a.aliases||[]).includes(v));
        if(matches.length===1)assign(obj,key,matches[0].id);
        else {assign(obj,key,v);diag(tok,matches.length>1?'素材名称重复，请在图层面板选择明确的素材 ID。':'未找到素材，请在图层面板重新关联图片。');}
        return;
      }
      if(key==='position'||key==='size'){
        const groups=[[]];for(const t of vals){if(t.kind===','||t.kind==='×')groups.push([]);else groups.at(-1).push(t);}
        if(groups.length!==2){recover(obj,key==='position'?'x':'width',tok,'位置/大小需要两个数值，用逗号分隔。');return;}
        let numbers=groups.map(g=>{const s=g.map(t=>t.value).join(''),m=s.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(%|px|像素)?$/i);return m?Number(m[1])*(m[2]==='%'?10.24:1):NaN;});
        if(numbers.some(n=>!Number.isFinite(n))||(key==='size'&&numbers.some(n=>n<=0||n>8192))){recover(obj,key==='position'?'x':'width',tok,'图层位置或尺寸无效。');return;}
        assign(obj,key==='position'?'x':'width',numbers[0]);assign(obj,key==='position'?'y':'height',numbers[1]);return;
      }
      if(['crackEnabled','loop','preprocess.enabled','palette.enabled','visible'].includes(key)){if(v.toLowerCase() in B.BOOLEANS){assign(obj,key,B.BOOLEANS[v.toLowerCase()]);if(key==='crackEnabled'&&obj.crackEnabled&&obj.crackDensity===0)assign(obj,'crackDensity',B.PARAMS.crackDensity.default);}else recover(obj,key,tok,'请使用开启或关闭。');return;}
      const choices=key==='blend'?B.BLENDS:key==='animation'?B.ANIMATIONS:key==='compositeMode'?Object.keys(B.COMPOSITES):key==='palette.mode'?B.PALETTE_MODES:Object.keys(B.BACKGROUNDS);
      if(choices.includes(v))assign(obj,key,v);else recover(obj,key,tok,`可选：${choices.join('、')}。`);
    }
    function parseCommand(cmd,ts,tok){
      if(cmd==='种子'||cmd==='尺寸'){numeric(cmd==='尺寸'?config.global:target(),cmd==='尺寸'?'outputSize':'seed',ts,false,tok);return;}
      const obj=target();if(!obj){diag(tok,'多图时请先选中要调整的图层。');return;}
      if(['蓝底白花','白底蓝花'].includes(cmd)){assign(obj,'orientation',cmd);if(clean(ts).length)diag(ts[0],'取向指令后有未识别内容，已跳过。');return;}
      if(cmd==='风格'){const v=clean(ts).map(t=>t.value).join('');if(v in B.STYLES){assign(obj,'style',v);if(!obj.explicitColor)assign(obj,'mainColor',B.STYLES[v]);}else recover(obj,'style',tok,'风格可选中式、峇迪、非洲。');return;}
      const mapping={冰纹:{密度:'crackDensity',宽度:'crackWidth'},蜡滴:{密度:'droplets'},笔触:{强度:'stroke'},蜡边:{强度:'halo'},染色:{深度:'dyeDepth',颜色:'mainColor'},布面:{颗粒:'grain'},套色:{颜色:'color',区域:'region',强度:'strength'}};
      const map=mapping[cmd],vals=clean(ts);
      if(cmd==='冰纹'&&vals.length===1&&vals[0].value.toLowerCase() in B.BOOLEANS){parseField('crackEnabled',vals,tok);return;}
      const pairs=[];let current=null;
      for(const t of vals){if(t.value in map){current={name:t.value,values:[],token:t};pairs.push(current);}else{if(!current){current={name:null,values:[],token:t};pairs.push(current);}current.values.push(t);}}
      if(!pairs.length){diag(tok,'此指令还需要参数值。');return;}
      const overlay={color:'黄',region:'色块',strength:.5,id:`${context.operationId||'patch'}:${obj.id}:${tok.line}:${tok.column}`};let overlayValid=true;
      for(const pair of pairs){
        let name=pair.name;const text=pair.values.map(t=>t.value).join('');
        if(!name){name=cmd==='染色'&&(text in B.COLORS||text.startsWith('#'))?'颜色':cmd==='套色'?'颜色':Object.keys(map)[0];diag(pair.token,`补全“${cmd} ${name}”。`,'自动修正后应用');}
        const key=map[name];
        if(cmd==='套色'){
          if(name==='颜色'){if(text in B.COLORS||/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(text))overlay.color=text;else{diag(pair.token,'套色颜色无效，保留已有套色。');overlayValid=false;}}
          else if(name==='区域'){if(['花心','色块'].includes(text))overlay.region=text;else{diag(pair.token,'套色区域可选花心、色块。');overlayValid=false;}}
          else {const result=B.readNumber(pair.values,'opacity');if(result.error){diag(pair.token,result.error);overlayValid=false;}else{overlay.strength=result.value;if(result.adjusted)diag(pair.token,'套色强度已调整至 0–1。','自动修正后应用');}}
        }else if(key==='mainColor')color(obj,key,pair.values,pair.token);else numeric(obj,key,pair.values,false,pair.token);
      }
      if(cmd==='套色'){
        if(!overlayValid){if(!overlayTouched.has(obj.id)&&mode==='replace')obj.overlays=B.clone(oldLayer(obj.id)?.overlays||[]);return;}
        if(!overlayTouched.has(obj.id)){overlayTouched.add(obj.id);if(mode==='replace')obj.overlays=[];}
        const existing=obj.overlays.findIndex(o=>o.id===overlay.id);
        if(existing>=0){obj.overlays[existing]=overlay;applied++;}else if(obj.overlays.length<B.LIMITS.overlays){obj.overlays.push(overlay);applied++;}else diag(tok,'每层最多 8 次套色，新增项已跳过。');
      }
    }
    function paletteOp(obj){if(!paletteOps.has(obj.id))paletteOps.set(obj.id,{weights:new Set(),rows:false,invalid:false});return paletteOps.get(obj.id);}
    function parseExtended(ts){
      const name=ts[0].value,tok=ts[0];
      if(name==='光影统一'){
        if(scope==='全局'){diag(tok,'光影统一是图层属性，请放在图层内。');return true;}
        const at=ts.findIndex(t=>t.value==='强度');parseField('preprocess.enabled',ts.slice(1,at<0?ts.length:at),tok);
        if(at>=0)numeric(target(),'preprocess.strength',ts.slice(at+1),true,ts[at]);return true;
      }
      if(!['配色','删除配色','多色印染'].includes(name))return false;
      const obj=target();if(!obj){diag(tok,'此配置需要明确的图层。');return true;}const op=paletteOp(obj);
      if(name==='多色印染'){parseField('palette.enabled',ts.slice(1),tok);return true;}
      const vals=ts.slice(1).filter(t=>!['[',']'].includes(t.kind)),id=Number(vals[0]?.value);
      if(!Number.isInteger(id)||id<1||id>8){diag(tok,'配色编号需为 1–8，当前项已跳过。');return true;}
      if(name==='删除配色') {const at=obj.palette.entries.findIndex(e=>e.id===id);if(at>=0){obj.palette.entries.splice(at,1);applied++;}else diag(tok,'该配色编号不存在，没有新增修改。','自动修正后应用');return true;}
      op.rows=true;const prior=obj.palette.entries.find(e=>e.id===id),old=oldLayer(obj.id)?.palette?.entries.find(e=>e.id===id);
      const entry=B.clone(prior||{id,color:null,weight:null,variation:0,seed:null});let touched=false;
      const slots=['颜色','比例','随机度','种子'];
      for(let i=1;i<vals.length;){const key=vals[i].value,start=vals[i++];let end=i;while(end<vals.length&&!slots.includes(vals[end].value))end++;const value=vals.slice(i,end);i=end;
        const text=value.map(t=>t.value).join('').replace(/^,+|,+$/g,'');if(!slots.includes(key)){diag(start,'未识别的配色属性已跳过。');continue;}
        const field={颜色:'color',比例:'weight',随机度:'variation',种子:'seed'}[key];let result;
        if(key==='颜色')result=(text in B.COLORS||/^#[a-f\d]{3}(?:[a-f\d]{3})?$/i.test(text))?{value:text}:{error:'配色颜色无效。'};
        else if(key==='种子'&&text==='继承')result={value:null};
        else result=B.readNumber(value,key==='种子'?'seed':'preprocess.strength',true);
        if(result.error){if(!prior&&old)entry[field]=old[field];diag(start,result.error);}
        else{entry[field]=result.value;touched=true;if(key==='比例')op.weights.add(id);if(result.adjusted)diag(start,'配色数值已调整至允许范围。','自动修正后应用');}
      }
      if(entry.color===null||entry.weight===null){diag(tok,'新配色需要有效颜色和比例，保留已有配色。');return true;}
      if(touched){if(prior)Object.assign(prior,entry);else obj.palette.entries.push(entry);applied++;}return true;
    }
    function finishPalettes(){
      for(const [id,op] of paletteOps){const obj=config.layers.find(l=>l.id===id),p=obj.palette,old=oldLayer(id)?.palette;
        if(p.enabled&&!p.entries.length&&!op.rows){p.entries=B.defaultEntries();applied++;}
        const rows=p.entries,sum=rows.reduce((n,e)=>n+e.weight,0);
        if((p.enabled||op.rows)&&(!rows.length||sum<=0)){obj.palette=old?B.clone(old):B.defaultPalette();diag(null,'配色组没有有效正比例，保留上次配色或单色结果。');continue;}
        if(!rows.length)continue;
        const specified=rows.filter(e=>op.weights.has(e.id)),rest=rows.filter(e=>!op.weights.has(e.id));
        if(mode==='patch'&&specified.length&&rest.length){const total=specified.reduce((n,e)=>n+e.weight,0),other=rest.reduce((n,e)=>n+e.weight,0);
          if(total>1){specified.forEach(e=>e.weight/=total);rest.forEach(e=>e.weight=0);diag(null,'明确配色比例超过 100%，已归一化。','自动修正后应用');}
          else rest.forEach(e=>e.weight=(1-total)*(other>0?e.weight/other:1/rest.length));
        }else {rows.forEach(e=>e.weight/=sum);if(Math.abs(sum-1)>.00001)diag(null,'已按完整配色权重归一化至 100%。','自动修正后应用');}
        rows.sort((a,b)=>a.id-b.id);
      }
    }
    function parseStatement(ts){
      ts=clean(ts);if(!ts.length)return;if(++count>B.LIMITS.statements){blocked=true;return;}
      if(ts[0].value==='蜡染')return;
      if(ts[0].kind==='value'&&ts[0].value.length>2){const candidates=[...Object.keys(fields),...commands].filter(w=>w.length>2&&distance1(ts[0].value,w));if(candidates.length===1){diag(ts[0],`“${ts[0].raw}”按“${candidates[0]}”识别。`,'自动修正后应用');ts[0]={...ts[0],value:candidates[0]};}}
      const first=ts[0],v=first.value;
      // An isolated 冰裂纹 is also the L1 crack command when followed by density/width.
      if(parseExtended(ts))return;
      if(v==='冰裂纹'&&ts.some(t=>['密度','宽度'].includes(t.value))){parseCommand('冰纹',ts.slice(1),first);return;}
      if(v in fields&&!commands.includes(v)){
        let start=0;
        for(let i=1;i<=ts.length;i++)if(i===ts.length||((ts[i].value in fields||commands.includes(ts[i].value))&&!['颜色'].includes(ts[i].value)&&!(ts[i].value in B.COLORS)&&!B.ANIMATIONS.includes(ts[i].value))){parseField(fields[ts[start].value],ts.slice(start+1,i),ts[start]);start=i;}
        return;
      }
      const cmdIndices=ts.map((t,i)=>commands.includes(t.value)?i:-1).filter(i=>i>=0);
      if(cmdIndices.length===1&&cmdIndices[0]>0){const at=cmdIndices[0];diag(ts[at],'已识别前置参数。','自动修正后应用');parseCommand(ts[at].value,[...ts.slice(0,at),...ts.slice(at+1)],ts[at]);return;}
      if(cmdIndices[0]===0){for(let j=0;j<cmdIndices.length;j++){const at=cmdIndices[j],end=cmdIndices[j+1]??ts.length;parseCommand(ts[at].value,ts.slice(at+1,end),ts[at]);}return;}
      diag(first,'未识别的语句已跳过，后续有效内容继续应用。');
    }
    let statement=[];
    const flush=()=>{parseStatement(statement);statement=[];};
    for(let at=0;at<tokens.length&&!blocked;at++){
      const t=tokens[at];
      if(t.kind==='word'&&(t.value==='图层'||t.value==='全局')){
        flush();if(open)diag(t,'在下一块之前补齐上一块的右括号。','自动修正后应用');
        if(t.value==='全局'){scope='全局';}else{
          let j=at+1;while(['[',']'].includes(tokens[j]?.kind))j++;
          const n=Number(tokens[j]?.value);if(!Number.isInteger(n)||n<1||n>3){diag(t,'图层编号需为 1–3，此块已跳过。');scope='无效';}else{scope='图层'+n;ensureLayer(scope);}
          at=j;while([']'].includes(tokens[at+1]?.kind))at++;
        }
        open=true;continue;
      }
      if(t.kind==='{')continue;
      if(t.kind==='('&&open&&!statement.length)continue;
      if(t.kind==='}'||(t.kind===')'&&open&&statement.length===0)){flush();if(!open)diag(t,'忽略多余的右括号。','自动修正后应用');open=false;scope=null;continue;}
      if(t.kind==='break'){flush();continue;}
      if(scope==='无效')continue;
      statement.push(t);
    }
    flush();if(open)diag(tokens.at(-1),'在末尾补齐块的右括号。','自动修正后应用');
    if(blocked){diag(tokens.at(-1),'语句超过 2000 条，本次保留现有作品。');return {config:base,diagnostics,changed:false,applied:0,status:'未应用',rawCode:original,normalizedCode:B.toCode(base),sourceMap:tokens};}
    // Invalid drafts do not reset defaults or remove layers from the successful work.
    finishPalettes();
    if(base.rendererVersion?.startsWith('1.')&&!paletteOps.size&&!tokens.some(t=>['光影统一','光影强度','图层叠加','图层显示','配色方式'].includes(t.value)))config.rendererVersion=base.rendererVersion;
    const header=original.match(/^# BatikScript[^\n]*renderer ([12]\.[\d.]+)/m),newFeatures=tokens.some(t=>['光影统一','多色印染','配色','图层叠加','图层显示'].includes(t.value));
    if((header?.[1].startsWith('1.')||(!header&&overlayTouched.size&&!newFeatures))&&applied){config.rendererVersion='1.0.0';for(const l of config.layers){l.preprocess.enabled=false;l.palette.enabled=false;}if(!tokens.some(t=>t.value==='动画时长'))config.global.duration=2.4;diag(null,'按旧版印染显示，可在右侧预览后升级。','自动修正后应用');}
    const final=applied?config:base;
    const changed=JSON.stringify(final)!==JSON.stringify(base);
    return {config:final,diagnostics,changed,applied,status:!applied?'未应用':diagnostics.some(d=>d.status==='已跳过')?'部分应用':diagnostics.length?'已调整':'已应用',rawCode:original,normalizedCode:B.toCode(final),sourceMap:tokens,stats:{statements:count,applied}};
  };
})(globalThis);
