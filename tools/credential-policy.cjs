'use strict';
const crypto=require('node:crypto');

// Narrow exception for the exact public demo file explicitly approved by its owner.
// A changed file or a credential anywhere else must still fail publishing checks.
function isApprovedPublicDemoCredential(file,data,approval){
  return file==='web/coze-config.js'
    &&approval?.kind==='owner-approved-public-coze-demo'
    &&approval.projectId==='7707450410642096179'
    &&approval.file===file
    &&approval.approvedOn==='2026-11-19'
    &&/^[a-f0-9]{64}$/.test(approval.sha256||'')
    &&crypto.createHash('sha256').update(data).digest('hex')===approval.sha256;
}
module.exports={isApprovedPublicDemoCredential};
