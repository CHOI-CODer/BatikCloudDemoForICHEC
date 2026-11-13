# GitHub 上传与网页发布

目标仓库为 `CHOI-CODer/BatikCloudDemoForICHEC`，当前应用为 `0.2.8-preview`。

在本机源码目录双击 `一键上传到GitHub.command`。首次使用时，按终端显示的验证码在 GitHub 官方页面核对权限并完成授权；随后自动推送完整 main 分支、核对远程文件、将 Pages 来源设为 main 的根目录，并检查线上运行资源。

本工具需要本机现有的 Node.js 18 或更新版本及 Git，仅用于维护发布；网页访客无需安装。GitHub 官方 CLI 缓存位于 `.publish-tools/gh`，该目录不进入仓库和静态部署包。登录配置位于系统临时目录；按官方 CLI 的凭据存储流程处理，不把密码或令牌写入项目。

发布前会校验部署清单中的全部文件、完整静态包、提交状态和上传范围中的疑似凭据。仅已提交的完整工程参与推送；本地有修改、来源仓库不同或推送冲突时先停止检查，不自动合并远程内容。Git 登录助手仅应用于本次推送。

只检查本地准备情况、不登录或上传：

```sh
./一键上传到GitHub.command --check
```

运行结果保存在本机 `.publish-tools/publish-result.json`。`uploaded` 只表示远程提交与文件清单已核对；`pagesConfigured` 表示来源已设置；`siteVerified` 为 true 才表示线上运行资源全部匹配本次部署清单。远程尚未上传或网页仍在同步时，不标记交付完成。

GitHub Pages 来源和状态接口依据：[GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages?apiVersion=2026-03-10)。本次使用静态分支发布，保留零构建网页入口。
