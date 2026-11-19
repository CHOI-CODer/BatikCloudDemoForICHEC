# 官方 JavaScript Web SDK（0.2.9-preview）

左栏使用用户指定的 CDN 与项目 `7707450410642096179`，调用 `cozeWebSDK.init({projectId, container, refreshToken})`。加载和聊天放在独立文档内，重连只重建聊天模块。中栏和右栏保持原有创作管线。

## 当前窗口连接

点击左侧“连接设置”，填写访问令牌并连接。支持粘贴带 Bearer 或尖括号的令牌；连接后清空输入框。凭据仅保留在当前窗口内存，断开、刷新或关闭后需要重新配置，不写入作品、历史、URL、日志或部署包。

也可填写高级设置中的短期凭据接口。接口以 GET 返回 JSON，包含 access_token 或 token 字段。需要允许网站来源的 CORS；生产来源为 `https://choi-coder.github.io`，本地预览来源为 `http://127.0.0.1:4173`。同源接口带本站登录状态，跨站默认不带 Cookie。

## 所有访客自动连接

在源码的 `web/coze-config.js` 填入服务器提供的公开接口地址：

```js
globalThis.BATIK_COZE_CONFIG=Object.freeze({
  tokenEndpoint:'https://你的服务器/api/coze-token',
  useCookies:false
});
```

接口按访客身份签发短期凭据；服务器负责身份、权限、额度与密钥管理。跨站接口若明确需要登录 Cookie，可设置 useCookies 为 true，同时由服务器配置相应的 CORS 和 Cookie 策略。当前用户已确认有接口，完整 HTTPS 地址及登录要求尚待提供，因此本包默认打开连接设置入口。

SDK 首次初始化和过期续期均通过 refreshToken 获取凭据。手动令牌过期时提示更新；服务器接口可自动取新令牌。项目加载成功才显示“已连接”；凭据无效、加载失败与网络超时分别提示。断开与重新连接会取消旧请求，迟到的回复不会覆盖当前连接。

聊天回复通过“复制当前配方”和“粘贴代码”与本地解释器配合使用。绘图素材默认不向聊天模块发送；用户在 SDK 自身界面内上传内容时，由该模块处理。

依据：[扣子 Web SDK（AI 编程）官方文档](https://docs.coze.cn/developer_guides_vibe_coding_websdk)。旧分享页的访问记录保留在 acceptance-0.2.6.md，不代表本版本的实际鉴权结果。
