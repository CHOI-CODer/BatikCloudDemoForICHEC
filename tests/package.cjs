// Explicit deployment allowlist. Only the owner-approved public demo credential is included.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),release=path.join(root,'release');
const files=['index.html','.nojekyll','web/index.html','web/style.css','web/app.js','web/assets/favicon.svg','web/assets/flower-bird.svg','web/assets/spiral.svg','engine/batik_compiler.html','shared/coze-sdk.js','web/coze-config.js','web/coze-chat.html','web/coze-chat.css','web/coze-chat.js','shared/registry.js','shared/parser.js','shared/renderer.js','shared/renderer-legacy.js','shared/formatter.js','web/workshop-controls.js','shared/storage.js','shared/ai-adapter.js','README.md','docs/ai-integration.md','docs/coze-public-demo.json','docs/migration.md','docs/acceptance.md','docs/acceptance-0.2.0.md','docs/acceptance-0.2.1.md','docs/acceptance-0.2.2.md','docs/acceptance-0.2.3.md','docs/acceptance-0.2.4.md','docs/acceptance-0.2.5.md','docs/acceptance-0.2.6.md','docs/acceptance-0.2.7.md','docs/acceptance-0.2.8.md','docs/acceptance-0.2.9.md'];
fs.mkdirSync(release,{recursive:true});
const entries=files.map(file=>{const data=fs.readFileSync(path.join(root,file));return {path:file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};});
fs.writeFileSync(path.join(release,'deploy-manifest.json'),JSON.stringify({appVersion:require('../shared/registry.js').VERSION.app,generatedAt:new Date().toISOString(),entry:'index.html',files:entries},null,2)+'\n');
const archive=path.join(release,'BatiScript-static.zip');
// UTF-8 filename flags keep Chinese documentation names portable on extraction.
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=data=>{let crc=0xffffffff;for(const b of data)crc=table[(crc^b)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;};
const local=[],central=[];let offset=0;
for(const file of files){const name=Buffer.from(file,'utf8'),data=fs.readFileSync(path.join(root,file)),compressed=zlib.deflateRawSync(data,{level:9}),crc=crc32(data),d=fs.statSync(path.join(root,file)).mtime,time=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();
  const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(time,10);h.writeUInt16LE(date,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(compressed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(time,12);c.writeUInt16LE(date,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
  local.push(h,name,compressed);central.push(c,name);offset+=h.length+name.length+compressed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);fs.writeFileSync(archive,Buffer.concat([...local,directory,end]));
cp.execFileSync('/usr/bin/unzip',['-t',archive],{stdio:'inherit'});
console.log('Package:',archive,'Bytes:',fs.statSync(archive).size,'Files:',files.length);
