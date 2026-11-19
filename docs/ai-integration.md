# 官方 JavaScript Web SDK（0.2.9-preview）

左栏使用用户指定的 CDN 与项目 7707450410642096179，调用 cozeWebSDK.init({projectId, container, refreshToken})。SDK 放在独立聊天文档内，重连只重建聊天模块，中栏和右栏沿用原有创作管线。

## 打开即连接

按负责人明确要求，web/coze-config.js 内置所提供的个人访问令牌，打开或刷新页面均自动连接，无需另外填写。负责人已确认公开网页和 GitHub 源码会公开该令牌，任何访客都能读取并使用相应扣子额度。授权范围及唯一允许包含凭据的文件哈希见 coze-public-demo.json；其他文件仍执行凭据拦截。

令牌失效后需要更换该配置并重新部署。此静态配置不具备服务器自动签发新令牌的能力。SDK 初次加载与凭据刷新均经过 refreshToken 适配；无效/过期、网络超时与加载失败分别显示可操作提示。

## 临时切换连接

连接设置保留为备用入口。临时填写的个人令牌只留在当前窗口内存，不写入作品、历史、URL 或浏览器存储；刷新后恢复公开演示配置。聊天重载和断开均不改变画布、编辑内容与作品历史。

回复中的代码可复制到“粘贴代码”，预览修正并应用到画布。绘图素材默认不向聊天模块发送；在 SDK 自身界面主动上传的内容由扣子处理。

## 后续改用服务器自动续期

可将 web/coze-config.js 改为仅包含公开接口地址的配置：

```js
globalThis.BATIK_COZE_CONFIG=Object.freeze({
  tokenEndpoint:'https://你的服务器/api/coze-token',
  useCookies:false
});
```

接口以 GET 返回 JSON，包含 access_token 或 token。服务器按访客身份管理凭据、权限和额度，并允许网站来源的 CORS；生产来源为 https://choi-coder.github.io。同源接口带本站登录状态，跨站默认不带 Cookie，明确需要登录 Cookie 时设置 useCookies:true。当前未配置此接口，真实服务器续期待后续验证。

依据：[扣子 Web SDK 官方文档](https://docs.coze.cn/developer_guides_vibe_coding_websdk)。实测见 acceptance-0.2.9.md，旧分享页记录仅保留历史用途。
