# 正式产物的浏览器消费

桌面浏览器可直接通过 `<script>` 加载下列 UMD 文件，无需打包器、源码路径或 Demo 开发包。地图、视图、元素渲染各自构建，不加入核心入口。当前选择 UMD 是为了沿用 SpriteJS 外部全局加载方式；不额外生成可选模块的其他格式。

| 文件（包根目录下） | 浏览器全局 | 用途 / 外部依赖 |
|---|---|---|
| `dist/qtiled-view.umd.js` | `qtiledView` | `projectGrid` / `pickGrid`；无外部依赖 |
| `dist/qtiled-maps.umd.js` | `qtiledMaps` | 地图校验、实体绘制计算、占用、编辑、导入/导出；无外部依赖 |
| `dist/qtiled-element-rendering.umd.js` | `qtiledElementRendering` | 图片加载、元素定义 IO/校验/编辑、放置/绘制计算、渲染；先加载 SpriteJS 3.7.36 UMD，提供 `window.spritejs` |

这是完整文件路径（例如本地包的 `node_modules/qtiled/dist/qtiled-maps.umd.js`），没有新增 `qtiled/maps` 等简写子路径。三个包复用既有源码，只打入各自所需的内部纯计算；不依赖彼此的全局变量。SpriteJS 不打入 QTiled 产物，也不由 QTiled 自动下载。

核心 `main` / `module` 入口保持原样，仅导出 `shapes` / `pathFinding`；原浏览器产物仍为 `dist/qtiled.browser.js`，全局为 `qtiled`。仅做地图 IO/占用/编辑时只需 maps 包，无需 SpriteJS；下面绘制示例不需要核心包。上述路径以本次本地构建或打包内容为准，不代表同名版本已经发布到注册表。

## 一个公共 Demo，两种运行方式

[静态地图浏览](../demo/map-preview.html) 与 [map-preview.js](../demo/static/js/map-preview.js) 是唯一的公共场景页面和交互实现。它合并了 C0 的格子/实体查看与 C1 的占用索引、分层绘制和失败保留能力；没有另一个“独立静态场景”入口。

日常开发沿用 Demo 的三份 `*.dev.js` 和 `npm run dev`；更新源码后先运行 `npm run debug`，浏览器打开 `http://localhost:8033/demo/map-preview.html`。也可直接使用已有开发产物，以仓库根目录运行 `python3 -m http.server 8033 --bind 127.0.0.1`。该页无需核心包。

验证正式消费时，从同一份 HTML 生成隔离运行副本，只将三条开发包路径换成正式 UMD 路径；页面逻辑、样本、CSS 与辅助文件原样复制。仓库已包含正式产物，仅修改对应源码时才需 `npm run optional` 重新生成；无需为消费者合并重建正式产物。`npm run build` 已包含正式可选模块构建。

## 准备独立运行目录

在仓库根目录执行以下命令，生成的页面和依赖均位于本片 `output` 目录。已有同名目录时更新对应文件：

```sh
consumer_dir="output/emperor/p1-c1-static-scene-2026-10-09/merged-consumer"
mkdir -p "$consumer_dir/dist" "$consumer_dir/demo/static/js" "$consumer_dir/demo/static/css" "$consumer_dir/demo/static/map-samples" "$consumer_dir/demo/static/element-samples/dog/images"
sed -e 's|./static/js/qtiled-view.dev.js|../dist/qtiled-view.umd.js|g' \
    -e 's|./static/js/qtiled-maps.dev.js|../dist/qtiled-maps.umd.js|g' \
    -e 's|./static/js/qtiled-element-rendering.dev.js|../dist/qtiled-element-rendering.umd.js|g' \
    demo/map-preview.html > "$consumer_dir/demo/map-preview.html"
cp dist/qtiled-view.umd.js dist/qtiled-maps.umd.js dist/qtiled-element-rendering.umd.js "$consumer_dir/dist/"
cp demo/static/js/spritejs3.js demo/static/js/pointer.js demo/static/js/dog-element-sample.js demo/static/js/navs.js demo/static/js/map-preview.js "$consumer_dir/demo/static/js/"
cp demo/static/css/index.css demo/static/css/preview-workspace.css "$consumer_dir/demo/static/css/"
cp demo/static/map-samples/first-static-map.json "$consumer_dir/demo/static/map-samples/"
cp demo/static/element-samples/dog/element.json "$consumer_dir/demo/static/element-samples/dog/"
cp demo/static/element-samples/dog/images/*.png "$consumer_dir/demo/static/element-samples/dog/images/"
python3 -m http.server 8049 --bind 127.0.0.1 --directory "$consumer_dir"
```

打开 [静态地图浏览（正式产物）](http://127.0.0.1:8049/demo/map-preview.html?no_nav)。`no_nav` 使用现有 Demo 导航开关，隐藏隔离目录中不存在的其他示例入口。端口被占用时换一个空闲端口并同步访问地址；服务运行期间才可访问，不能用 `file://` 代替 HTTP。

隔离根目录包含 17 个文件：HTML、页面逻辑、3 份 UMD、SpriteJS、2 份 CSS、指针/样本/导航辅助、地图/元素 JSON 和 4 张 PNG。`spritejs3.js` 是已有 SpriteJS 3.7.36，保留版权头；`pointer.js` 与 `dog-element-sample.js` 提供显式辅助函数。运行时不读取 `src`、开发 bundle、其他页面状态或核心包。隔离目录只是一份生成的验收副本，不另行维护页面。

## 消费约定

页面通过 `loadElementSources` / `importElementDefinition` 加载并校验元素，再通过 `importMapDefinition` 取得地图与占用索引。`resolveMapEntities` 计算独立实例；每实例使用自己的 SpriteJS Group 调用 `renderElement`，共享定义不会使实例互相替换。

四镜头只改变显示，按索引选择并查看完整世界占地；格子模式保持可用。只有地图、索引、所有图片和下一绘制树全部成功后才替换场景；坏 JSON、坏引用或缺图保留上次有效状态，修复文件后点击“重新加载”恢复。详细交互与边界统一见[静态地图浏览说明](map-definition.md#静态地图浏览-demo)。

本例不提供地图编辑、通用遮挡命中、平移缩放、动画或经营规则。接口契约见[地图定义](map-definition.md)、[四向视图](isometric-view.md)、[元素渲染](element-rendering.md)。
