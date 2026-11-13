# 0.2.1-preview · 白底与第一版强度恢复

用户最新要求：恢复第一版效果强度，并让白底效果可见。应用 0.2.1-preview、renderer 2.0.1；schema 2 / DSL 1.3 / parser 1.1.0 不变。

## 修改

恢复第一版的染色响应、笔触位移与阈值、四邻域轻度晕染、细颗粒/经纬纹、细蜡点、裂纹宽度和路径强度。蜡点按 768 参考采样以保留新版预览与导出一致性。原始透明度、光影统一、多色、图层叠加与动画/历史继续保留。右侧顶部增加可直接访问的蓝底/白底切换，不必滚过配色列表。

## 实测

环境：macOS、内置 Chromium，UA：Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36。测试素材为内置花鸟纹，种子 2026；第一版参考来自未改动的 renderer-legacy.js。上一版加强效果来自测试专用 renderer-2.0.0.js，不进入部署包。

- 55 项解析/契约测试通过，既有数值范围与映射不变。
- 专项浏览器测试 7 通过、0 失败；详见 tests/strength-browser-report.json。
- 受影响功能回归 24 通过、0 失败；详见 tests/upgrade-browser-0.2.1-report.json。
- 768px、关闭光影统一和多色、同图同参数：蓝底与第一版的 RGB 平均绝对误差 0.0682/255；白底 0.0426/255。上一版加强效果的误差分别约 19.48 和 20.35。恢复强度接近第一版，非只调低滑杆显示数值。
- 默认光影统一开启时，花鸟图白底留白比例从 63.2% 恢复到 70.9%；多色白底留白 70.9%。统计阈值为 R>225/G>220/B>205，不能外推其他照片。
- 验证白底按钮位置、实际画面/代码同步、撤销重做、动画末帧、图层叠加、项目恢复及 2048px PNG 编码。
- 0.2.0 的五档晕染板在 256px 因第一版轻度半径取整出现重复；原失败记录保留在 tests/strength-regression-before-sampling-fix.json。改用 768px 采样晕染后各档不同，回归通过。

证据目录 docs/evidence-0.2.1/：first-strength-comparison.png（第一版/加强版/恢复后三列，蓝底/白底两行），white-background-workshop.png（实际白底界面及顶部开关）。

旧 ZIP 另存 BatiScript-static-0.2.0-preview.zip，默认 BatiScript-static.zip 更新为本版。部署包不含测试夹具或测试服务。Safari/Edge/手机真机未在本轮新增验证；本轮未发布线上站点。
