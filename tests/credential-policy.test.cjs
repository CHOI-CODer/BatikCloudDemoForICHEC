const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {isApprovedPublicDemoCredential:approved}=require('../tools/credential-policy.cjs');
const data=Buffer.from('approved demo settings');
const record={kind:'owner-approved-public-coze-demo',projectId:'7707450410642096179',file:'web/coze-config.js',approvedOn:'2026-11-19',sha256:crypto.createHash('sha256').update(data).digest('hex')};
test('only the exact owner-approved demo configuration is allowed',()=>{
  assert.equal(approved(record.file,data,record),true);
  assert.equal(approved('web/app.js',data,record),false);
  assert.equal(approved(record.file,Buffer.from('changed settings'),record),false);
  assert.equal(approved(record.file,data,{...record,projectId:'another-project'}),false);
  assert.equal(approved(record.file,data,undefined),false);
});
