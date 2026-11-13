(function(){
 'use strict';const B=globalThis.Bati;
 B.installControls=function(A){
  const S=A.state,$=id=>document.getElementById(id),selected=A.selected;
  const patch=(code,label)=>{if(S.config.rendererVersion.startsWith('1.')&&!code.startsWith('动画时长')){$('upgrade-engine').click();return Promise.resolve(false);}return A.applySource(code,'patch',{label});},random=()=>{const n=new Uint32Array(1);crypto.getRandomValues(n);return n[0];};
  function section(html){const s=document.createElement('section');s.className='inspector-section';s.innerHTML=html;return s;}
  function field(label,id,type='select'){return `<div class="field"><label for="${id}">${label}</label><${type} id="${id}"${type==='input'?' type="number"':''}>${type==='input'?'':`</${type}>`}</div>`;}
  function options(el,values){for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v;el.append(o);}}
  function slider(container,key){const p=B.PARAMS[key],id='extra-'+key.replaceAll('.','-'),wrap=document.createElement('div');wrap.className='range-control';wrap.innerHTML=`<div class="range-top"><label for="${id}">${p.label}</label><output></output></div><input id="${id}" type="range" min="${p.min}" max="${p.max}" step="${p.step}" aria-label="${p.label}">`;const input=wrap.querySelector('input'),out=wrap.querySelector('output');input.oninput=()=>out.textContent=Math.round(input.value*100)+'%';const number=document.createElement('input');number.type='number';number.min=p.min*p.divisor;number.max=p.max*p.divisor;number.step=1;number.setAttribute('aria-label',p.label+'百分比');number.className='percent-input';number.onchange=()=>patch(p.l2+': '+number.value+'%;','调整'+p.label);input.oninput=()=>{number.value=Math.round(input.value*100);out.textContent=number.value+'%';};input.onchange=()=>patch(p.l2+': '+B.numberText(input.value*p.divisor)+';','调整'+p.label);wrap.append(number);container.append(wrap);return{input,out,number,key};}
  const inspector=$('inspector'),first=$('layer-effects'),blend=document.createElement('div');
  blend.className='layer-compositing';blend.innerHTML=`<h4>图层合成</h4>${field('图层叠加方式','composite-mode')}<div id="composite-opacity"></div><button class="tiny-btn" id="upgrade-engine" hidden>升级为新版印染（可撤销）</button>`;
  const orientationLabel=document.createElement('p');orientationLabel.className='field-help';orientationLabel.textContent='底色与花纹';first.querySelector('.field').before(orientationLabel,$('orientation'));
  options(blend.querySelector('select'),Object.keys(B.COMPOSITES));first.append(blend);$('composite-opacity').append($('opacity-control'));$('composite-mode').onchange=e=>patch('图层叠加: '+e.target.value+';','切换图层叠加');
  const illumination=section('<h3>光影统一 <label class="toggle"><input type="checkbox" id="illumination-enabled">开启</label></h3><div id="illumination-ranges"></div><div class="view-tabs"><button data-view="original">原图</button><button data-view="normalized">统一后</button><button data-view="final">印染后</button></div>');first.after(illumination);
  const lightHint=document.createElement('p');lightHint.id='illumination-result-note';lightHint.className='field-help';lightHint.textContent='统一后为纯黑白，印染使用同一份黑白图案。';illumination.append(lightHint);
  const sliders=['preprocess.strength','preprocess.shadowSuppression','preprocess.highlightCompression'].map(k=>slider($('illumination-ranges'),k));
  const resetLight=document.createElement('button');resetLight.className='tiny-btn';resetLight.textContent='重置光影设置';resetLight.onclick=()=>patch('光影统一:开启;'+['preprocess.strength','preprocess.shadowSuppression','preprocess.highlightCompression'].map(k=>B.PARAMS[k].l2+':'+B.PARAMS[k].default*100+'%;').join(''),'重置光影设置');illumination.append(resetLight);
  $('illumination-enabled').onchange=e=>patch('光影统一: '+(e.target.checked?'开启':'关闭')+';','切换光影统一');
  for(const button of illumination.querySelectorAll('[data-view]'))button.onclick=()=>{S.view=button.dataset.view;A.drawCurrent();S.refreshControls?.();$('canvas-wrap').dataset.view={original:'原图对照',normalized:selected()?.preprocess.enabled?'纯黑白图案':'光影已关闭',final:''}[S.view];};
  const paletteSection=$('overlay-list').closest('section');paletteSection.innerHTML=`<h3>底色印染 <label class="toggle"><input type="checkbox" id="palette-enabled">多色</label></h3>${field('底色生成方式','palette-mode')}<div id="ratio-kind" class="muted" style="font-size:10px;margin-top:10px">染色区占比</div><div id="ratio-bar" class="ratio-bar"></div><div id="palette-rows"></div><button class="tiny-btn" id="add-color">＋ 添加颜色</button><div id="palette-ranges"></div>${field('配色种子','palette-seed','input')}<div class="palette-actions"><button class="chip" id="shuffle-palette">重排分布</button><button class="chip" id="random-palette">随机配色</button></div><p id="palette-stats" class="field-help"></p>`;
  illumination.after($('style-section'),$('texture-section'),paletteSection);
  options($('palette-mode'),B.PALETTE_MODES);$('palette-enabled').onchange=e=>patch('多色印染: '+(e.target.checked?'开启':'关闭')+';','切换底色印染');$('palette-mode').onchange=e=>patch('配色方式: '+e.target.value+';','切换配色方式');
  for(const key of ['palette.blockSize','palette.transition','palette.crossMix'])sliders.push(slider($('palette-ranges'),key));
  $('palette-seed').onchange=e=>patch('配色种子 '+e.target.value,'调整配色种子');$('shuffle-palette').onclick=()=>patch('配色种子 '+random(),'重排配色分布');
  $('random-palette').onclick=()=>{const l=selected();if(!l)return;const names=Object.keys(B.COLORS);const codes=l.palette.entries.map(e=>{const at=random()%names.length,color=names.splice(at,1)[0];return '配色'+e.id+' 颜色 '+color;});patch(codes.join('\n'),'随机配色');};
  $('add-color').onclick=()=>{const l=selected();if(!l)return;if(!l.palette.enabled){patch('多色印染 开启','开启默认三色');return;}const id=[1,2,3,4,5,6,7,8].find(i=>!l.palette.entries.some(e=>e.id===i));if(!id){A.toast('每层最多 8 种颜色。');return;}patch(`配色${id} 颜色 翠绿 比例 10% 随机度 0% 种子 继承`,'添加印染颜色');};
  $('upgrade-engine').onclick=()=>{const dialog=document.createElement('dialog');dialog.innerHTML='<div class="modal-head"><h2>升级旧作品</h2></div><div class="modal-body"><p>新版将重新计算肌理与底色。旧套色不能直接换算为面积比例；升级后可撤销恢复旧外观。</p><button class="btn" id="preview-upgrade">预览新版</button><button class="btn" id="cancel-upgrade">保留旧版</button><button class="btn primary" id="confirm-upgrade" hidden>应用新版</button></div>';document.body.append(dialog);let candidate,preview;
   dialog.querySelector('#preview-upgrade').onclick=async()=>{candidate=B.clone(S.config);candidate.rendererVersion=B.VERSION.renderer;for(const l of candidate.layers){l.preprocess.enabled=true;if(l.overlays.length){l.palette.enabled=true;l.palette.entries=[{id:1,color:l.mainColor,weight:.5,variation:0,seed:null},...l.overlays.slice(0,7).map((o,i)=>({id:i+2,color:o.color,weight:.5/Math.min(7,l.overlays.length),variation:0,seed:null}))];}l.overlays=[];}try{preview=await B.renderCandidate(candidate,S.assets,{size:512});const im=document.createElement('img');im.src=preview.frame.toDataURL();im.style.width='100%';im.alt='新版效果预览';dialog.querySelector('.modal-body').append(im);dialog.querySelector('#confirm-upgrade').hidden=false;}catch(e){A.toast(e.message);}};
   dialog.querySelector('#confirm-upgrade').onclick=async()=>{if(candidate){await A.commit(candidate,{label:'升级旧工程印染'});dialog.close();dialog.remove();}};dialog.querySelector('#cancel-upgrade').onclick=()=>{dialog.close();dialog.remove();};dialog.showModal();};
  // Duration is a global setting, while speed remains the existing control.
  const duration=section(`<h3>播放设置</h3>${field('动画时长（秒）','animation-duration','input')}<p class="field-help">速度 5 为标准速度；暂停后从原进度继续。</p>`);inspector.append(duration);$('animation-duration').min=B.PARAMS.duration.min;$('animation-duration').max=B.PARAMS.duration.max;$('animation-duration').step=.1;$('animation-duration').onchange=e=>patch('动画时长: '+e.target.value+'秒;','调整动画时长');
  const time=document.createElement('output');time.id='time-label';time.className='muted';$('progress-label').after(time);
  const toolbar=document.querySelector('.toolbar-group');const open=document.createElement('button');open.className='btn';open.textContent='本机项目';open.id='open-local';toolbar.append(open);open.onclick=async()=>{const list=await B.listLocal(),dialog=document.createElement('dialog');dialog.innerHTML='<div class="modal-head"><h2>打开本机项目副本</h2></div><div class="modal-body"><p>打开为当前窗口的独立副本，不会覆盖其他窗口。</p></div><div class="modal-footer"><button class="btn">关闭</button></div>';dialog.querySelector('.modal-footer button').onclick=()=>{dialog.close();dialog.remove();};const body=dialog.querySelector('.modal-body');if(!list.length)body.append(document.createTextNode('还没有其他已保存工程。'));for(const item of list){const b=document.createElement('button');b.className='choice-btn';b.textContent=item.name+(item.updatedAt?' · '+new Date(item.updatedAt).toLocaleString('zh-CN'):'');b.onclick=async()=>{try{const saved=item.id==='legacy-current'?await B.loadLegacyLocal():await B.loadLocal(item.id);await A.loadSnapshot(saved);dialog.close();dialog.remove();}catch(e){A.toast(e.message);}};body.append(b);}document.body.append(dialog);dialog.showModal();};
  const fresh=document.createElement('button');fresh.className='icon-btn';fresh.title='在独立窗口新建工程';fresh.setAttribute('aria-label','新建独立工程');fresh.textContent='＋';toolbar.append(fresh);fresh.onclick=()=>window.open(location.pathname,'_blank','noopener');
  const oldRefresh=S.refreshControls;S.refreshControls=()=>{
   oldRefresh?.();for(const b of illumination.querySelectorAll('[data-view]')){b.setAttribute('aria-pressed',String(S.view===b.dataset.view));b.classList.toggle('active',S.view===b.dataset.view);}const l=selected();lightHint.textContent=l?.preprocess.enabled?'统一后为纯黑白，印染使用同一份黑白图案。':'开启光影统一，可将原图转成纯黑白印染图案。';if(S.view==='normalized')$('canvas-wrap').dataset.view=l?.preprocess.enabled?'纯黑白图案':'光影已关闭';for(const item of sliders){item.input.disabled=!l;item.number.disabled=!l;if(l&&document.activeElement!==item.input){const v=B.get(l,item.key);item.input.value=v;item.number.value=Math.round(v*100);item.out.textContent=Math.round(v*100)+'%';}}
   $('palette-enabled').checked=!!l?.palette.enabled;$('illumination-enabled').checked=!!l?.preprocess.enabled;for(const id of ['palette-enabled','illumination-enabled','composite-mode','palette-mode','palette-seed','add-color','shuffle-palette','random-palette'])$(id).disabled=!l;
   $('upgrade-engine').hidden=!S.config.rendererVersion.startsWith('1.');$('composite-mode').value=l?.compositeMode||'正常';$('palette-mode').value=l?.palette.mode||'随机分区';$('palette-seed').value=l?.palette.seed??2026;$('animation-duration').value=S.config.global.duration;
   $('palette-ranges').querySelector('#extra-palette-crossMix').closest('.range-control').hidden=l?.palette.mode!=='交叉混合';$('ratio-kind').textContent=l?.palette.mode==='交叉混合'?'染料贡献占比':'染色区占比';
   $('palette-rows').replaceChildren();$('ratio-bar').replaceChildren();
   for(const e of l?.palette.entries||[]){const row=document.createElement('div');row.className='palette-row';const head=document.createElement('div');head.className='palette-row-head';const strong=document.createElement('strong');strong.textContent='配色'+e.id;const color=document.createElement('input');color.type='color';color.value=B.colorHex(e.color);color.setAttribute('aria-label','配色'+e.id+'自定义颜色');color.onchange=()=>patch('配色'+e.id+' 颜色 '+color.value,'调整印染颜色');const select=document.createElement('select');select.setAttribute('aria-label','配色'+e.id+'颜色');options(select,Object.keys(B.COLORS));if(!(e.color in B.COLORS))options(select,[e.color]);select.value=e.color;select.onchange=()=>patch('配色'+e.id+' 颜色 '+select.value,'调整印染颜色');const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','删除配色'+e.id);remove.onclick=()=>patch('删除配色 '+e.id,'删除印染颜色');head.append(strong,color,select,remove);row.append(head);
    for(const [key,label,word] of [['weight','比例','比例'],['variation','随机度','随机度']]){const line=document.createElement('label');line.className='palette-number';line.append(document.createTextNode(label));const range=document.createElement('input');range.type='range';range.min=0;range.max=100;range.step=.1;range.value=e[key]*100;range.setAttribute('aria-label','配色'+e.id+label+'滑杆');const input=document.createElement('input');input.type='number';input.min=0;input.max=100;input.step=.1;input.value=(e[key]*100).toFixed(2);input.setAttribute('aria-label','配色'+e.id+label);range.oninput=()=>input.value=range.value;range.onchange=()=>patch('配色'+e.id+' '+word+' '+range.value+'%','调整配色'+label);input.onchange=()=>patch('配色'+e.id+' '+word+' '+input.value+'%','调整配色'+label);line.append(range,input,document.createTextNode('%'));row.append(line);}
    const line=document.createElement('div');line.className='palette-seed';const input=document.createElement('input');input.type='text';input.value=e.seed===null?'继承':e.seed;input.setAttribute('aria-label','配色'+e.id+'随机种子');input.onchange=()=>patch('配色'+e.id+' 种子 '+input.value,'设置颜色随机值');const button=document.createElement('button');button.className='chip';button.textContent='换随机值';button.onclick=()=>patch('配色'+e.id+' 种子 '+random(),'更换颜色随机值');line.append(input,button);row.append(line);$('palette-rows').append(row);
    const bar=document.createElement('span');bar.style.width=(e.weight*100)+'%';bar.style.backgroundColor=B.colorHex(e.color);bar.title=e.color+' '+B.numberText(e.weight*100)+'%';$('ratio-bar').append(bar);
   }
   const stats=S.result?.layers.find(i=>i.layer.id===S.selected)?.texture.stats||[];$('palette-stats').textContent=(l?.palette.enabled&&l.palette.entries.filter(e=>e.weight>0).length<2?'当前按单一颜色印染。':'')+(stats.length?'基础实测：'+stats.map(e=>e.id+'号 '+(e.actual*100).toFixed(1)+'%').join(' / '):'多色开启后可添加与调整颜色；比例合计 100%。');
   for(const row of document.querySelectorAll('.layer-item')){row.querySelector('.layer-visibility')?.remove();const select=row.querySelector('.layer-select'),id=select.getAttribute('aria-label').replace('选择',''),layer=S.config.layers.find(l=>l.id===id);if(!layer)continue;row.draggable=true;row.ondragstart=e=>{e.dataTransfer.setData('text/batik-layer',id);};row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();const moving=e.dataTransfer.getData('text/batik-layer');if(moving&&moving!==id)A.editConfig(c=>{const from=c.layers.findIndex(l=>l.id===moving),to=c.layers.findIndex(l=>l.id===id);if(from<0||to<0)return;const item=c.layers.splice(from,1)[0];c.layers.splice(to,0,item);},'排序图层');};const eye=document.createElement('button');eye.className='icon-btn layer-visibility';eye.textContent=layer.visible?'◉':'○';eye.setAttribute('aria-label',(layer.visible?'隐藏':'显示')+id);eye.onclick=e=>{e.stopPropagation();S.selected=id;patch('图层显示: '+(layer.visible?'关闭':'开启')+';','切换图层显示');};row.prepend(eye);if(!layer.visible)row.classList.add('layer-hidden');}
  };
  installSplitters();
  installPreviewSplitter();
  function installSplitters(){let prefs={left:400,right:280};try{prefs={...prefs,...JSON.parse(localStorage.getItem('batik-layout')||'{}')};}catch{}
   if(!Number.isFinite(prefs.left))prefs.left=400;if(!Number.isFinite(prefs.right))prefs.right=280;
   const set=()=>{const width=innerWidth,wide=width>=1100;const requestedRight=wide?Math.max(240,Math.min(width-676,prefs.right)):0,left=Math.max(300,Math.min(width-requestedRight-(wide?376:368),prefs.left)),right=wide?requestedRight:280;document.documentElement.style.setProperty('--left-width',left+'px');document.documentElement.style.setProperty('--right-width',right+'px');};set();addEventListener('resize',set);
   for(const side of ['left','right']){const separator=document.createElement('div');separator.className='splitter splitter-'+side;separator.tabIndex=0;separator.setAttribute('role','separator');separator.setAttribute('aria-orientation','vertical');separator.setAttribute('aria-label',side==='left'?'调整左栏宽度':'调整右栏宽度');if(side==='left')document.querySelector('.left').after(separator);else document.querySelector('.studio').after(separator);let drag;const persist=()=>{try{localStorage.setItem('batik-layout',JSON.stringify(prefs));}catch{}};separator.onpointerdown=e=>{drag={x:e.clientX,value:side==='left'?document.querySelector('.left').getBoundingClientRect().width:inspector.getBoundingClientRect().width};separator.setPointerCapture(e.pointerId);separator.classList.add('dragging');};separator.onpointermove=e=>{if(!drag)return;prefs[side]=drag.value+(e.clientX-drag.x)*(side==='left'?1:-1);prefs[side]=Math.max(side==='left'?300:240,Math.min(innerWidth-(side==='left'?(innerWidth>=1100?Math.max(240,prefs.right)+376:368):Math.max(300,prefs.left)+376),prefs[side]));set();};separator.onpointerup=()=>{drag=null;separator.classList.remove('dragging');persist();};separator.onpointercancel=()=>{drag=null;separator.classList.remove('dragging');};separator.ondblclick=()=>{prefs={left:400,right:280};set();persist();};separator.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();prefs[side]=e.key==='Home'?(side==='left'?400:280):prefs[side]+(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*(e.shiftKey?50:10);set();persist();};}
  }
  function installPreviewSplitter(){
    const studio=document.querySelector('.studio'),preview=$('work-preview');
    const separator=document.createElement('div');
    separator.id='preview-splitter';
    separator.className='row-splitter';
    separator.tabIndex=0;
    separator.setAttribute('role','separator');
    separator.setAttribute('aria-orientation','horizontal');
    separator.setAttribute('aria-label','调整作品预览与代码区高度');
    separator.setAttribute('aria-controls','work-preview work-tools');
    separator.title='上下拖动调整高度，双击恢复默认';
    preview.after(separator);
    const minPreview=200,minTools=240,defaultRatio=.6;
    let ratio=defaultRatio,drag=null;
    try{
      const saved=Number(localStorage.getItem('batik-preview-ratio'));
      if(Number.isFinite(saved)&&saved>0&&saved<1)ratio=saved;
    }catch{}
    const available=()=>Math.max(minPreview+minTools,studio.clientHeight-separator.offsetHeight);
    const update=()=>{
      const height=available(),top=Math.max(minPreview,Math.min(height-minTools,height*ratio));
      studio.style.setProperty('--preview-height',top+'px');
      studio.style.setProperty('--tools-height',(height-top)+'px');
      separator.setAttribute('aria-valuemin',Math.round(minPreview/height*100));
      separator.setAttribute('aria-valuemax',Math.round((height-minTools)/height*100));
      separator.setAttribute('aria-valuenow',Math.round(top/height*100));
      separator.setAttribute('aria-valuetext','作品预览 '+Math.round(top/height*100)+'%，代码工具 '+Math.round((height-top)/height*100)+'%');
    };
    const persist=()=>{try{localStorage.setItem('batik-preview-ratio',String(ratio));}catch{}};
    const setHeight=height=>{
      const space=available();
      ratio=Math.max(minPreview,Math.min(space-minTools,height))/space;
      update();
    };
    const finish=cancelled=>{
      if(!drag)return;
      if(cancelled)ratio=drag.ratio;
      drag=null;
      separator.classList.remove('dragging');
      update();
      if(!cancelled)persist();
    };
    separator.onpointerdown=e=>{
      if(e.button!==0||drag)return;
      e.preventDefault();
      drag={pointerId:e.pointerId,y:e.clientY,height:preview.getBoundingClientRect().height,ratio};
      separator.setPointerCapture(e.pointerId);
      separator.classList.add('dragging');
    };
    separator.onpointermove=e=>{
      if(drag&&e.pointerId===drag.pointerId)setHeight(drag.height+e.clientY-drag.y);
    };
    separator.onpointerup=e=>{if(drag&&e.pointerId===drag.pointerId)finish(false);};
    separator.onpointercancel=()=>finish(true);
    separator.onlostpointercapture=()=>finish(true);
    separator.ondblclick=()=>{ratio=defaultRatio;update();persist();};
    separator.onkeydown=e=>{
      if(!['ArrowUp','ArrowDown','Home'].includes(e.key))return;
      e.preventDefault();
      if(e.key==='Home'){ratio=defaultRatio;update();}
      else setHeight(preview.getBoundingClientRect().height+(e.key==='ArrowDown'?1:-1)*(e.shiftKey?50:10));
      persist();
    };
    new ResizeObserver(update).observe(studio);
    update();
  }

 };
})();
