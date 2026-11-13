(function(root){
  'use strict';
  const B=root.Bati,cache=new Map();
  B.makeCanvas=(w,h=w)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  B.random=function(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
  const hash=(x,y,s)=>{let n=Math.imul(x+Math.imul(y,374761393),668265263)^s;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  const rgb=hex=>{hex=B.colorHex(hex).slice(1);if(hex.length===3)hex=[...hex].map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));};
  const clamp=n=>Math.min(1,Math.max(0,n));
  const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
  const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
  const aborted=signal=>{if(signal?.aborted)throw new DOMException('已取消','AbortError');};
  function check(signal,start){aborted(signal);if(performance.now()-start>B.LIMITS.budgetMs)throw new Error('计算超过时间预算，请降低输出尺寸后重试。');}
  async function texture(layer,asset,size,{signal,start}){
    const key=JSON.stringify([asset.id,size,layer.seed,layer.orientation,layer.mainColor,layer.dyeDepth,layer.crackDensity,layer.crackEnabled,layer.crackWidth,layer.droplets,layer.stroke,layer.halo,layer.grain,layer.overlays]);
    if(cache.has(key))return cache.get(key);
    const c=B.makeCanvas(size),ctx=c.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
    const image=asset.image;if(!image)throw new Error('素材尚未解码。');
    const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
    const scale=Math.min(size/iw,size/ih);ctx.drawImage(image,(size-iw*scale)/2,(size-ih*scale)/2,iw*scale,ih*scale);
    const src=ctx.getImageData(0,0,size,size),lum=new Float32Array(size*size),hist=new Uint32Array(256);
    for(let p=0;p<lum.length;p++){const q=p*4;const l=(src.data[q]*.2126+src.data[q+1]*.7152+src.data[q+2]*.0722);lum[p]=l;hist[l|0]++;}
    let acc=0,low=25,high=230;for(let n=0;n<256;n++){acc+=hist[n];if(acc<lum.length*.04)low=n;if(acc<lum.length*.96)high=n;}if(high-low<50){low=0;high=255;}
    const data=ctx.createImageData(size,size),wax=B.makeCanvas(size),wx=wax.getContext('2d'),mask=wx.createImageData(size,size);
    const color=rgb(layer.mainColor),cloth=[245,240,225],scaleLogical=1024/size;
    const overlays=layer.overlays.map((o,i)=>({...o,rgb:rgb(o.color),phase:(layer.seed%997)*.013+i*3.9}));
    const radius=Math.max(1,Math.round(layer.halo*size/400));
    for(let y=0;y<size;y++){
      if(y%32===0){check(signal,start);await tick();}
      for(let x=0;x<size;x++){
        const p=y*size+x,q=p*4,lx=x*scaleLogical,ly=y*scaleLogical;
        const warp=layer.stroke*(Math.sin(lx*.11+Math.sin(ly*.04)*3)+Math.sin(ly*.17+lx*.025))*1.1;
        const sx=Math.max(0,Math.min(size-1,Math.round(x+warp/scaleLogical))),sy=Math.max(0,Math.min(size-1,Math.round(y+Math.sin(lx*.08)*layer.stroke/scaleLogical)));
        let light=(lum[sy*size+sx]-low)/(high-low);
        if(layer.halo>0){const x0=Math.max(0,x-radius),x1=Math.min(size-1,x+radius),y0=Math.max(0,y-radius),y1=Math.min(size-1,y+radius);const mean=(lum[y*size+x0]+lum[y*size+x1]+lum[y0*size+x]+lum[y1*size+x])/4;light=light*.7+(mean-low)/(high-low)*.3;}
        const threshold=.46+(hash(lx|0,ly|0,layer.seed)-.5)*layer.stroke*.08;
        let dye=smooth((light-threshold)*3.3+.5);if(layer.orientation==='白底蓝花')dye=1-dye;
        const uneven=Math.sin(lx*.013+Math.sin(ly*.008)*2)*Math.cos(ly*.015)*.035;
        const depth=clamp(layer.dyeDepth/1.5),saturation=clamp(layer.dyeDepth*.96+uneven);
        const dyed=color.map((v,i)=>cloth[i]*(1-saturation)+Math.max(0,v*(1.32-depth*.58))*saturation);
        for(const o of overlays){
          let area=o.region==='花心'?Math.pow(Math.max(0,1-Math.hypot(x/size-.5,y/size-.5)*1.8),3):smooth((Math.sin(x/size*13+o.phase+Math.sin(y/size*7))+Math.cos(y/size*11-o.phase)+Math.sin((x+y)/size*6+o.phase)-.35)*.7);
          for(let j=0;j<3;j++)dyed[j]=dyed[j]*(1-area*o.strength)+o.rgb[j]*area*o.strength;
        }
        const noise=(hash(lx|0,ly|0,layer.seed^1234)-.5)*6;
        const weave=((Math.floor(lx/2)%2?1:-1)+(Math.floor(ly/2)%2?1:-1))*1.2;
        for(let j=0;j<3;j++)data.data[q+j]=cloth[j]*(1-dye)+dyed[j]*dye+(noise+weave)*layer.grain;
        data.data[q+3]=255;mask.data[q+3]=(1-dye)*255;
      }
    }
    ctx.putImageData(data,0,0);wx.putImageData(mask,0,0);
    const random=B.random(layer.seed^0x9a73b),dots=Math.round(layer.droplets*size*size/1900);
    ctx.fillStyle='rgba(245,240,225,.93)';
    for(let i=0;i<dots;i++){const x=random()*size,y=random()*size,r=(.3+Math.pow(random(),3)*2.6)*size/768;ctx.beginPath();ctx.ellipse(x,y,r,r*(1+random()*.6),random(),0,Math.PI*2);ctx.fill();if(random()<.06){ctx.beginPath();ctx.ellipse(x,y+r,r*.32,r*3,0,0,Math.PI*2);ctx.fill();}}
    const crack=B.makeCanvas(size),cx=crack.getContext('2d');
    if(layer.crackEnabled&&layer.crackDensity>0){
      const rng=B.random(layer.seed^0xba713),n=Math.round(15+layer.crackDensity*38);
      const crackColor=rgb(layer.mainColor).map((v,i)=>Math.round(cloth[i]*(1-clamp(layer.dyeDepth))+v*clamp(layer.dyeDepth)));
      cx.strokeStyle=`rgb(${crackColor.join(',')})`;cx.lineJoin='round';cx.lineCap='round';
      for(let i=0;i<n;i++){
        let x=rng()*size,y=rng()*size,a=rng()*Math.PI*2;cx.lineWidth=(.25+rng()*.55)*layer.crackWidth*size/1024;
        cx.beginPath();cx.moveTo(x,y);
        const steps=8+Math.floor(rng()*18);for(let s=0;s<steps;s++){a+=(rng()-.5)*1.3;const len=(5+rng()*18)*size/768;x+=Math.cos(a)*len;y+=Math.sin(a)*len;cx.lineTo(x,y);if(s%5===0){const bx=x+Math.cos(a+1)*(8+rng()*22)*size/768,by=y+Math.sin(a+1)*(8+rng()*22)*size/768;cx.lineTo(bx,by);cx.moveTo(x,y);}}cx.stroke();
      }
      cx.globalCompositeOperation='destination-in';cx.drawImage(wax,0,0);cx.globalCompositeOperation='source-over';
    }
    const result={base:c,crack};cache.set(key,result);while(cache.size>10)cache.delete(cache.keys().next().value);return result;
  }
  function maskBlend(canvas,mode,index,layer){
    if(index===0||mode==='叠印')return canvas;
    const s=canvas.width,out=B.makeCanvas(s),ctx=out.getContext('2d');ctx.drawImage(canvas,0,0);ctx.globalCompositeOperation='destination-in';
    if(mode==='拼接'){
      const split=index===1?.5:.68,w=layer.transition/1024,g=ctx.createLinearGradient(s*(split-w),0,s*(split+w+.001),0);g.addColorStop(0,'transparent');g.addColorStop(1,'#fff');ctx.fillStyle=g;ctx.fillRect(0,0,s,s);
    }else if(mode==='交织'){
      const mask=B.makeCanvas(s),m=mask.getContext('2d'),step=Math.max(8,Math.round(s/24));m.fillStyle='#fff';for(let y=0;y<s;y+=step)for(let x=0;x<s;x+=step)if(((x/step|0)+(y/step|0)+index)%2)m.fillRect(x,y,step,step);ctx.drawImage(mask,0,0);
    }else{
      const mask=B.makeCanvas(s),m=mask.getContext('2d'),image=m.createImageData(s,s);for(let y=0;y<s;y++)for(let x=0;x<s;x++){const dx=x-s/2,dy=y-s/2,r=Math.hypot(dx,dy)/s;image.data[(y*s+x)*4+3]=smooth((Math.sin(Math.atan2(dy,dx)*3-r*22+index)-.05)*3)*255;}m.putImageData(image,0,0);ctx.drawImage(mask,0,0);
    }
    return out;
  }
  B.composeLegacyFrame=function(result,config,progress=1,animation=config.global.animation){
    const s=result.size,c=B.makeCanvas(s),ctx=c.getContext('2d');ctx.fillStyle=B.BACKGROUNDS[config.global.background]||config.global.background;ctx.fillRect(0,0,s,s);
    for(let i=0;i<result.layers.length;i++){
      const item=result.layers[i],l=item.layer,frame=B.makeCanvas(s),f=frame.getContext('2d');f.save();f.scale(s/1024,s/1024);
      const offset=animation==='图案融合'?(1-progress)*(i%2?-240:240):0;
      f.translate(l.x+l.width/2+offset,l.y+l.height/2);f.rotate(l.rotation*Math.PI/180);
      if(animation==='浸染'){f.fillStyle='#f5f0e1';f.fillRect(-l.width/2,-l.height/2,l.width,l.height);f.globalAlpha=.06+progress*.94;}
      f.drawImage(item.texture.base,-l.width/2,-l.height/2,l.width,l.height);
      f.globalAlpha=1;
      if(animation==='冰裂蔓延'){f.save();f.beginPath();f.rect(-l.width/2,-l.height/2,l.width*progress,l.height);f.clip();f.drawImage(item.texture.crack,-l.width/2,-l.height/2,l.width,l.height);f.restore();}else f.drawImage(item.texture.crack,-l.width/2,-l.height/2,l.width,l.height);
      f.restore();ctx.globalAlpha=l.opacity;ctx.drawImage(maskBlend(frame,l.blend,i,l),0,0);ctx.globalAlpha=1;
    }
    return c;
  };
  B.renderLegacyCandidate=async function(config,assets,{signal,size=B.LIMITS.preview,onProgress,previousLayers=new Map()}={}){
    const start=performance.now(),layers=[],diagnostics=[];size=Math.min(size,config.global.outputSize);
    for(let i=0;i<config.layers.length;i++){
      check(signal,start);const layer=config.layers[i],asset=assets.get(layer.assetId);
      try{if(!asset)throw new Error('素材缺失，请重新关联。');const frame=await texture(layer,asset,size,{signal,start});layers.push({layer:B.clone(layer),texture:frame});}
      catch(error){if(error.name==='AbortError')throw error;const old=previousLayers.get(layer.id);if(old){layers.push(old);const at=config.layers.findIndex(l=>l.id===layer.id);config.layers[at]=B.clone(old.layer);}diagnostics.push({line:1,column:1,status:'已跳过',message:`${layer.id}：${error.message} ${old?'已恢复该层成功版本。':'该层暂未显示，其余图层继续。'}`});}
      onProgress?.((i+1)/Math.max(1,config.layers.length));
    }
    check(signal,start);const result={size,layers,diagnostics};result.frame=B.composeLegacyFrame(result,config);result.duration=performance.now()-start;return result;
  };
  B.clearLegacyRenderCache=()=>cache.clear();
})(globalThis);
