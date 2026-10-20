# 正式产物的浏览器消费

桌面浏览器可直接通过 `<script>` 加载下列 UMD 文件，无需打包器、源码路径或 Demo 开发包。地图、视图、元素渲染各自构建，不加入核心入口。当前选择 UMD 是为了沿用 SpriteJS 外部全局加载方式；不额外生成可选模块的其他格式。

| 文件（包根目录下） | 浏览器全局 | 用途 / 外部依赖 |
|---|---|---|
| `dist/qtiled-view.umd.js` | `qtiledView` | `projectGrid` / `pickGrid`；无外部依赖 |
| `dist/qtiled-maps.umd.js` | `qtiledMaps` | 地图校验、实体绘制计算、占用、编辑、导入/导出；无外部依赖 |
| `dist/qtiled-element-rendering.umd.js` | `qtiledElementRendering` | 图片加载、元素定义 IO/校验/编辑、放置/绘制计算、渲染；先加载 SpriteJS 3.7.36 UMD，提供 `window.spritejs` |

这是完整文件路径（例如本地包的 `node_modules/qtiled/dist/qtiled-maps.umd.js`），没有新增 `qtiled/maps` 等简写子路径。三个包复用既有源码，只打入各自所需的内部纯计算；不依赖彼此的全局变量。SpriteJS 不打入 QTiled 产物，也不由 QTiled 自动下载。

核心 `main` / `module` 入口保持原样，仅导出 `shapes` / `pathFinding`；原浏览器产物仍为 `dist/qtiled.browser.js`，全局为 `qtiled`。仅做地图 IO/占用/编辑时只需 maps 包，无需 SpriteJS；业务页面按所用 API 选择相应产物。上述路径以本次本地构建或打包内容为准，不代表同名版本已经发布到注册表。

## 构建与加载

`npm run optional` 构建三份正式可选 UMD，`npm run build` 同时包含核心与可选模块。`npm run dev` / `npm run debug` 只为保留的基础 Demo 生成核心与四向视图开发包；`npm run build:demo` 生成这两份压缩包及示例页面。

独立消费者按需复制正式产物，通过 HTTP 提供页面、JSON 和图片；使用元素渲染包时，先加载 SpriteJS，再加载 QTiled 渲染包。图片来源和素材文件由消费者管理，QTiled 不附带游戏图集。

```html
<script src="./vendor/spritejs3.js"></script>
<script src="./dist/qtiled-element-rendering.umd.js"></script>
<script src="./dist/qtiled-maps.umd.js"></script>
<script src="./dist/qtiled-view.umd.js"></script>
```

其中 `vendor/spritejs3.js` 由消费项目自行准备。图片加载与绘制流程见[元素渲染](element-rendering.md)，地图数据校验、占用与文件文本消费见[地图接口](map-definition.md)。这些接口不依赖旧 Demo 页面或其临时状态。

## 游戏编辑器迁移

[元素编辑器](https://emk.pyzy.net/element-editor.html)与[地图编辑器](https://emk.pyzy.net/map-editor.html)在独立 EMK 项目维护。旧的 `demo/map-editor.html` 及其规则、样本和资源已移除，不再支持从 QTiled Demo 复制整套编辑器的运行方式。后续游戏开发请使用 EMK 项目的依赖、构建与运行说明。
