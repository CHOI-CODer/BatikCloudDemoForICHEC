#!/usr/bin/env node
'use strict';
// Maintenance utility only; the website remains static and buildless.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const repository = 'CHOI-CODer/BatikCloudDemoForICHEC';
const remoteUrl = `https://github.com/${repository}.git`;
const localTools = path.join(root, '.publish-tools');
const reportPath = path.join(localTools, 'publish-result.json');
const git = fs.existsSync('/Applications/Xcode.app/Contents/Developer/usr/bin/git')
  ? '/Applications/Xcode.app/Contents/Developer/usr/bin/git' : 'git';
const gh = fs.existsSync(path.join(localTools, 'gh')) ? path.join(localTools, 'gh') : 'gh';
const env = {...process.env, GH_PROMPT_DISABLED: '1', GIT_TERMINAL_PROMPT: '0', GH_CONFIG_DIR: path.join(os.tmpdir(), 'batik-gh-auth')};
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
let stage = 'preflight';
let details = {repository, uploaded: false, pagesConfigured: false, siteVerified: false};

function run(command, args, options = {}) {
  return cp.spawnSync(command, args, {
    cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    timeout: options.timeout || 30000,
    stdio: options.live ? 'inherit' : 'pipe',
    input: options.input
  });
}
function requireResult(result, message) {
  if (result.error || result.status !== 0) throw new Error(message);
  return (result.stdout || '').trim();
}
function api(endpoint, method = 'GET', body) {
  const args = ['api', `repos/${repository}/${endpoint}`, '--method', method,
    '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2026-03-10'];
  if (body !== undefined) args.push('--input', '-');
  const result = run(gh, args, {input: body === undefined ? undefined : JSON.stringify(body)});
  const value = result.status === 0 && result.stdout.trim() ? JSON.parse(result.stdout) : null;
  return {ok: !result.error && result.status === 0, value, errorText: result.stderr || ''};
}
function saveReport(extra = {}) {
  fs.mkdirSync(localTools, {recursive: true, mode: 0o700});
  fs.writeFileSync(reportPath, JSON.stringify({...details, stage, ...extra, recordedAt: new Date().toISOString()}, null, 2) + '\n', {mode: 0o600});
}
function preflight() {
  if (typeof fetch !== 'function' || typeof AbortSignal.timeout !== 'function') throw new Error('发布工具需要 Node.js 18 或更新版本。');
  const branch = requireResult(run(git, ['branch', '--show-current']), '无法读取本地 Git 仓库。');
  if (branch !== 'main') throw new Error('请先切回 main 分支，再运行发布工具。');
  const remote = requireResult(run(git, ['remote', 'get-url', 'origin']), '尚未设置 origin 仓库。');
  if (remote !== remoteUrl) throw new Error('当前 origin 与指定的 GitHub 仓库不同，请核对后再发布。');
  const pending = requireResult(run(git, ['status', '--porcelain', '--untracked-files=no']), '无法检查本地提交状态。');
  if (pending) throw new Error('还有未提交的源码修改，请先完成提交。');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'release/deploy-manifest.json'), 'utf8'));
  if (!Array.isArray(manifest.files) || !manifest.files.length) throw new Error('部署清单为空。');
  for (const file of manifest.files) {
    const absolute = path.resolve(root, file.path);
    if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute)) throw new Error(`部署文件缺失：${file.path}`);
    if (digest(fs.readFileSync(absolute)) !== file.sha256) throw new Error(`部署文件与已验收版本不同：${file.path}`);
    requireResult(run(git, ['cat-file', '-e', `main:${file.path}`]), `当前提交缺少部署文件：${file.path}`);
  }
  const files = requireResult(run(git, ['ls-files', '-z']), '无法检查上传范围。').split('\0').filter(Boolean);
  const secrets = [/eyJ[A-Za-z0-9_-]{80,}\.[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{30,}/,
    /gh[pousr]_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{40,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
  for (const file of files.filter(file => /\.(?:js|cjs|html|css|md|txt|json|command)$/.test(file))) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    if (secrets.some(pattern => pattern.test(text))) throw new Error(`上传范围发现疑似凭据，请先检查：${file}`);
  }
  requireResult(run(process.execPath, ['tests/verify-package.cjs']), '部署包校验未通过，请先重新打包并核对。');
  const after = requireResult(run(git, ['status', '--porcelain', '--untracked-files=no']), '无法复核提交状态。');
  if (after) throw new Error('部署校验记录发生变化，请核对并提交后再发布。');
  details = {...details, appVersion: manifest.appVersion, deploymentFiles: manifest.files.length,
    trackedFiles: files.length, commit: requireResult(run(git, ['rev-parse', 'main']), '无法读取当前提交。')};
  console.log(`检查通过：${details.appVersion}，${details.deploymentFiles} 个部署文件，${details.trackedFiles} 个已提交文件。`);
  return manifest;
}
async function publish() {
  if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('参数仅支持 --check（只检查，不登录或上传）。');
  const manifest = preflight();
  if (process.argv.includes('--check')) return;
  stage = 'authentication'; saveReport();
  requireResult(run(gh, ['--version']), '未找到 GitHub 官方登录工具，请检查 .publish-tools/gh。');
  if (run(gh, ['auth', 'status', '--hostname', 'github.com']).status !== 0) {
    console.log('请在即将打开的 GitHub 官方页面核对权限并完成登录授权。');
    requireResult(run(gh, ['auth', 'login', '--hostname', 'github.com', '--git-protocol', 'https', '--web', '--skip-ssh-key'],
      {live: true, timeout: 900000}), 'GitHub 登录未完成。请检查连接后重新打开一键上传入口。');
  }
  const repositoryInfo = run(gh, ['api', `repos/${repository}`]);
  const permissions = JSON.parse(requireResult(repositoryInfo, '无法读取目标仓库，请检查 GitHub 登录和连接。'));
  if (!permissions.permissions?.push) throw new Error('当前 GitHub 登录账号没有目标仓库的推送权限。');
  stage = 'push'; saveReport();
  console.log('正在上传完整工程到 main……');
  const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
  requireResult(run(git, ['-c', 'credential.helper=', '-c', `credential.https://github.com.helper=!${quote(gh)} auth git-credential`,
    'push', '-u', 'origin', 'main'], {live: true, timeout: 180000}), 'GitHub 推送未完成，请检查终端中的提示。');
  const reference = api('git/ref/heads/main');
  if (!reference.ok || reference.value?.object?.sha !== details.commit) throw new Error('远程 main 尚未与本地提交一致，请稍后复核。');
  const tree = api(`git/trees/${details.commit}?recursive=1`);
  if (!tree.ok || tree.value?.truncated) throw new Error('无法核对完整远程文件清单。');
  const remoteFiles = new Set(tree.value.tree.filter(file => file.type === 'blob').map(file => file.path));
  for (const file of manifest.files) if (!remoteFiles.has(file.path)) throw new Error(`远程部署文件缺失：${file.path}`);
  details.uploaded = true; stage = 'pages'; saveReport();
  console.log('完整工程已上传并核对，正在配置网页访问……');
  const existing = api('pages');
  const source = {build_type: 'legacy', source: {branch: 'main', path: '/'}};
  if (existing.ok) {
    if (existing.value.source?.branch !== 'main' || existing.value.source?.path !== '/' || existing.value.build_type === 'workflow') {
      if (!api('pages', 'PUT', source).ok) throw new Error('源码已上传，GitHub Pages 来源配置未完成。');
    }
  } else {
    if (!/HTTP 404/.test(existing.errorText)) throw new Error('源码已上传，暂时无法读取 GitHub Pages 配置。');
    if (!api('pages', 'POST', source).ok) throw new Error('源码已上传，GitHub Pages 开启未完成，请检查仓库 Pages 权限。');
  }
  const site = api('pages');
  if (!site.ok || !site.value?.html_url) throw new Error('源码已上传，网页地址尚未生成。');
  const siteUrl = new URL(site.value.html_url.endsWith('/') ? site.value.html_url : site.value.html_url + '/');
  if (siteUrl.protocol !== 'https:') throw new Error('源码已上传，正在等待网页 HTTPS 地址就绪。');
  details = {...details, pagesConfigured: true, url: siteUrl.href};
  stage = 'building'; saveReport();
  if (!api('pages/builds', 'POST').ok) console.log('已保存 Pages 配置，正在等待 GitHub 的发布任务。');
  for (let attempt = 0; attempt < 24; attempt++) {
    const build = api('pages/builds/latest');
    if (build.ok && build.value.commit === details.commit) {
      if (build.value.status === 'errored') throw new Error('源码已上传，GitHub 网页发布失败，请检查仓库的 Pages 任务。');
      if (build.value.status === 'built') {
        stage = 'verification'; saveReport();
        const publicFiles = manifest.files.filter(file => file.path !== '.nojekyll' && !file.path.startsWith('docs/') && file.path !== 'README.md');
        try {
          await Promise.all(publicFiles.map(async file => {
            const response = await fetch(new URL(file.path, siteUrl), {signal: AbortSignal.timeout(20000)});
            if (!response.ok || digest(Buffer.from(await response.arrayBuffer())) !== file.sha256) throw new Error('资源未就绪');
          }));
          details.siteVerified = true; stage = 'complete'; saveReport();
          console.log(`网页已上线并核对全部 ${publicFiles.length} 个运行资源：\n${siteUrl.href}`);
          return;
        } catch { stage = 'building'; }
      }
    }
    if (attempt === 0) console.log('正在等待网页发布和资源同步……');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  saveReport({message: '源码和 Pages 配置完成，网页资源尚待同步核对。'});
  console.log(`源码已上传，网页仍在发布或同步中：\n${details.url}\n请稍后重新运行此入口，继续核对上线结果。`);
}
publish().catch(error => {
  if (!process.argv.includes('--check')) saveReport({message: error.message});
  console.error(`\n尚未完成：${error.message}`);
  process.exitCode = 1;
});
