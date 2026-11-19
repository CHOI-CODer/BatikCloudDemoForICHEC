/* BatikScript: one registry shared by the workshop, compiler and tests. */
(function (root) {
  'use strict';
  const B = root.Bati = root.Bati || {};
  B.VERSION = { app: '0.2.9-preview', schema: 2, dsl: '1.3', parser: '1.1.0', renderer: '2.0.2' };
  B.LIMITS = { imageBytes: 20 * 1024 ** 2, imagePixels: 24000000, codeBytes: 100 * 1024, statements: 2000, layers: 3, overlays: 8, history: 50, projectBytes: 100 * 1024 ** 2, preview: 768, budgetMs: 15000 };
  B.COLORS = { 靛蓝:'#1b3158', 苏根棕:'#744824', 赭石:'#a55823', 朱红:'#c63e26', 红:'#96323c', 鲜黄:'#f0cd37', 亮黄:'#e2be2d', 芥末黄:'#b99b37', 黄:'#c8a046', 翠绿:'#199155', 粉绿:'#9bc3a0', 绿:'#467850', 天蓝:'#55a0d7', 蓝:'#3c5a96', 青:'#286e73', 紫罗兰:'#7d55a5', 深紫:'#4e2a6c', 紫:'#643c82', 白色粉红:'#f2b9c0', 粉红:'#eb9ba0', 茶:'#825532', 褐:'#6e462d', 乳白:'#f5f0e1', 米色:'#e8dcc4', 白:'#ebe6dc', 黑:'#1e1e23' };
  B.STYLES = { 中式:'靛蓝', 峇迪:'苏根棕', 非洲:'赭石' };
  B.BACKGROUNDS = { 靛蓝:'#1a3a5c', 本白:'#f5f0e8', 土黄:'#e8dcc4' };
  B.BLENDS = ['叠印','拼接','螺旋','交织'];
  B.ANIMATIONS = ['无','浸染','冰裂蔓延','图案融合'];
  B.COMPOSITES = {正常:'source-over',变暗:'darken',正片叠底:'multiply',变亮:'lighten',滤色:'screen',叠加:'overlay',柔光:'soft-light',强光:'hard-light',差值:'difference',排除:'exclusion'};
  B.PALETTE_MODES=['随机分区','交叉混合'];
  B.PARAMS = {
    dyeDepth: { label:'浸染深度', l1:'染色 深度', l2:'浸染深度', min:0,max:1.5,default:1,divisor:100,step:.05, note:'染液由浅至深，100% 对应 1.5。' },
    crackDensity: { label:'冰纹密度', l1:'冰纹 密度', l2:'冰裂纹密度', min:0,max:2,default:.6,divisor:50,step:.05,note:'蜡层龟裂留下的自然冰纹。' },
    crackWidth: { label:'冰纹粗细', l1:'冰纹 宽度', l2:'冰裂纹粗细', min:1,max:8,default:3,divisor:1,step:.25,note:'控制裂纹的宽度。' },
    droplets: { label:'点蜡密度', l1:'蜡滴 密度', l2:'点蜡密度', min:0,max:2,default:.8,divisor:50,step:.05,note:'点蜡形成的留白圆点与垂流。' },
    stroke: { label:'画蜡笔触', l1:'笔触 强度', l2:'画蜡笔触', min:0,max:2,default:.8,divisor:50,step:.05,note:'铜刀手绘边缘的细微起伏。' },
    halo: { label:'蜡边晕染', l1:'蜡边 强度', l2:'晕染程度', min:0,max:2,default:1,divisor:50,step:.05,note:'蜡与染液交界的柔和渗色。' },
    grain: { label:'布面织纹', l1:'布面 颗粒', l2:'布面颗粒', min:0,max:2,default:1,divisor:50,step:.05,note:'经纬交错的布面纹理。' },
    opacity: { label:'图层透明度', l2:'透明度', min:0,max:1,default:1,divisor:100,step:.01 },
    seed: { label:'纹理种子', l1:'种子', l2:'种子', min:0,max:4294967295,default:2026,divisor:1,integer:true,step:1 },
    outputSize: { label:'输出尺寸', l1:'尺寸', l2:'输出尺寸', min:256,max:2048,default:1024,divisor:1,integer:true,unit:'px',step:1 },
    speed: { label:'动画速度', l2:'动画速度', min:1,max:10,default:5,divisor:1,step:1 },
    rotation: { label:'旋转', l2:'旋转', min:-360,max:360,default:0,divisor:1,unit:'deg',step:1 },
    transition: { label:'拼接过渡宽度', l2:'拼接过渡宽度', min:0,max:512,default:40,divisor:1,unit:'px',step:1 }
  };
  Object.assign(B.PARAMS,{
    'preprocess.strength':{label:'统一强度',l2:'光影强度',min:0,max:1,default:.8,divisor:100,percent:true,step:.01},
    'preprocess.shadowSuppression':{label:'阴影抑制',l2:'阴影抑制',min:0,max:1,default:.8,divisor:100,percent:true,step:.01},
    'preprocess.highlightCompression':{label:'高光压制',l2:'高光压制',min:0,max:1,default:.6,divisor:100,percent:true,step:.01},
    'palette.seed':{...B.PARAMS.seed,label:'配色种子',l2:'配色种子'},
    'palette.blockSize':{label:'色块大小',l2:'色块大小',min:.01,max:1,default:.35,divisor:100,percent:true,step:.01},
    'palette.transition':{label:'颜色过渡',l2:'颜色过渡',min:0,max:1,default:.15,divisor:100,percent:true,step:.01},
    'palette.crossMix':{label:'交叉混合度',l2:'交叉混合度',min:0,max:1,default:.4,divisor:100,percent:true,step:.01},
    duration:{label:'动画时长',l2:'动画时长',min:1,max:60,default:6,divisor:1,unit:'s',step:.1}
  });
  B.ALIASES = { 疏密:'密度', 粗细:'宽度', 质感:'颗粒', 浓淡:'深度', 流派:'风格', 密渡:'密度', 冰列纹:'冰纹', 冰裂纹密渡:'冰裂纹密度', 浸然深度:'浸染深度', 蓝花白底:'白底蓝花', 黄色:'黄', 翡翠:'翠绿', 爪哇:'峇迪' };
  Object.assign(B.ALIASES,{光照统一:'光影统一',去阴影:'阴影抑制',占比:'比例',颜色比例:'比例',颜色随机度:'随机度',颜色随机值:'种子',颜色种子:'种子',底色印染:'多色印染',叠加方式:'图层叠加',图层混合模式:'图层叠加'});
  B.BOOLEANS = { 开启:true,打开:true,开:true,是:true,true:true,on:true,关闭:false,关:false,否:false,false:false,off:false };
  B.clone = obj => JSON.parse(JSON.stringify(obj));
  B.get=(obj,key)=>key.split('.').reduce((a,k)=>a?.[k],obj);
  B.set=(obj,key,value)=>{const path=key.split('.');let at=obj;for(const k of path.slice(0,-1))at=at[k]||(at[k]={});at[path.at(-1)]=value;};
  B.defaultPalette=()=>({enabled:false,mode:'随机分区',seed:2026,blockSize:.35,transition:.15,crossMix:.4,entries:[]});
  B.defaultEntries=()=>['靛蓝','朱红','鲜黄'].map((color,i)=>({id:i+1,color,weight:[.5,.3,.2][i],variation:0,seed:null}));
  B.defaults = function (id='图层1', assetId=null) {
    const layer = { id, assetId, x:0,y:0,width:1024,height:1024,rotation:0,style:'中式',orientation:'蓝底白花',mainColor:'靛蓝',explicitColor:false,crackEnabled:true,blend:'叠印',transition:40,overlays:[] };
    layer.preprocess={enabled:true};layer.palette=B.defaultPalette();layer.visible=true;layer.compositeMode='正常';
    for (const [key,p] of Object.entries(B.PARAMS)) if (!['outputSize','speed','duration'].includes(key)) B.set(layer,key,p.default);
    return layer;
  };
  B.newConfig = () => ({schemaVersion:B.VERSION.schema,parserVersion:B.VERSION.parser,rendererVersion:B.VERSION.renderer,global:{outputSize:B.PARAMS.outputSize.default,animation:B.ANIMATIONS[0],speed:B.PARAMS.speed.default,duration:B.PARAMS.duration.default,loop:false,background:'土黄'},layers:[]});
  B.colorHex = color => B.COLORS[color] || (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(color) ? color : '#1b3158');
  B.numberText = n => String(Math.round(n * 10000) / 10000);
  B.toCode = function (config) {
    const f=B.numberText;
    const lines=[`# BatikScript ${B.VERSION.dsl} | parser ${B.VERSION.parser} | renderer ${config.rendererVersion}`, '# 素材为本地引用；完整备份请导出项目。'];
    for(const l of config.layers) {
      lines.push(`${l.id} {`, `  素材: ${JSON.stringify(l.assetId || '请关联素材')};`, `  位置: ${f(l.x)}, ${f(l.y)};`, `  大小: ${f(l.width)}, ${f(l.height)};`, `  旋转: ${f(l.rotation)};`, `  风格 ${l.style}`, `  ${l.orientation}`);
      if(l.explicitColor||l.mainColor!==B.STYLES[l.style])lines.push(`  染色 颜色 ${l.mainColor}`);
      for(const k of ['dyeDepth','crackDensity','crackWidth','droplets','stroke','halo','grain','opacity','seed','transition']) {const p=B.PARAMS[k];lines.push(`  ${p.l2}: ${f(l[k]*p.divisor)};`);}
      lines.push(`  冰裂纹: ${l.crackEnabled?'开启':'关闭'};`, `  融合模式: ${l.blend};`);
      for(const o of l.overlays) lines.push(`  套色 颜色 ${o.color} 区域 ${o.region} 强度 ${f(o.strength)}`);
      if(!config.rendererVersion.startsWith('1.')){
        lines.push(`  光影统一: ${l.preprocess.enabled?'开启':'关闭'};`);
        for(const key of Object.keys(B.PARAMS).filter(k=>k.includes('.'))) lines.push(`  ${B.PARAMS[key].l2}: ${f(B.get(l,key)*B.PARAMS[key].divisor)};`);
        lines.push(`  多色印染: ${l.palette.enabled?'开启':'关闭'};`,`  配色方式: ${l.palette.mode};`);
        const entries=l.palette.entries;let remainder=100;
        entries.forEach((e,i)=>{const w=i===entries.length-1?remainder:Math.round(e.weight*10000)/100;remainder-=w;lines.push(`  配色${e.id} 颜色 ${e.color} 比例 ${f(w)}% 随机度 ${f(e.variation*100)}% 种子 ${e.seed===null?'继承':e.seed}`);});
        lines.push(`  图层叠加: ${l.compositeMode};`,`  图层显示: ${l.visible?'开启':'关闭'};`);
      }
      lines.push('}', '');
    }
    const g=config.global;
    lines.push('全局 {', `  输出尺寸: ${g.outputSize};`, `  动画: ${g.animation};`, `  动画速度: ${f(g.speed)};`, `  动画时长: ${f(g.duration)}秒;`, `  动画循环: ${g.loop?'开启':'关闭'};`, `  画布底色: ${g.background};`, '}');
    return lines.join('\n');
  };
  if(typeof module!=='undefined') module.exports=B;
})(typeof globalThis!=='undefined'?globalThis:window);
