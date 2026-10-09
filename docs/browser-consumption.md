# 正式产物的独立静态场景

桌面浏览器可直接通过 `<script>` 加载下列 UMD 文件，无需打包器、源码路径或 Demo 开发包。地图、视图、元素渲染各自构建，不加入核心入口。当前选择 UMD 是为了沿用 SpriteJS 外部全局加载方式；不额外生成可选模块的其他格式。

| 文件（包根目录下） | 浏览器全局 | 用途 / 外部依赖 |
|---|---|---|
| `dist/qtiled-view.umd.js` | `qtiledView` | `projectGrid` / `pickGrid`；无外部依赖 |
| `dist/qtiled-maps.umd.js` | `qtiledMaps` | 地图校验、实体绘制计算、占用、编辑、导入/导出；无外部依赖 |
| `dist/qtiled-element-rendering.umd.js` | `qtiledElementRendering` | 图片加载、元素定义 IO/校验/编辑、放置/绘制计算、渲染；先加载 SpriteJS 3.7.36 UMD，提供 `window.spritejs` |

这是完整文件路径（例如本地包的 `node_modules/qtiled/dist/qtiled-maps.umd.js`），没有新增 `qtiled/maps` 等简写子路径。三个包复用既有源码，只打入各自所需的内部纯计算；不依赖彼此的全局变量。SpriteJS 不打入 QTiled 产物，也不由 QTiled 自动下载。

核心 `main` / `module` 入口保持原样，仅导出 `shapes` / `pathFinding`；原浏览器产物仍为 `dist/qtiled.browser.js`，全局为 `qtiled`。仅做地图 IO/占用/编辑时只需 maps 包，无需 SpriteJS；下面绘制示例不需要核心包。上述路径以本次本地构建或打包内容为准，不代表同名版本已经发布到注册表。

## 构建与准备独立目录

仓库已包含三份正式可选产物，可直接使用；仅在修改对应源码后，在已有开发依赖的仓库根目录运行 `npm run optional` 重新生成。`npm run build` 也包含此步骤，其余构建与 Demo 命令保持原有行为。产物沿用仓库方式收录在 Git 的 `dist/`，通过构建更新。

下面命令在仓库根目录执行，复制页面、正式产物、样本、第三方库和共用样式/指针辅助到独立 HTTP 根目录。`demo/browser-map/index.html` 是可复用页面源文件，不能只打开它而省略依赖准备。已有同名运行目录时，以下命令会更新其中的对应文件：

```sh
consumer_dir="output/emperor/p1-c1-static-scene-2026-10-09/consumer"
mkdir -p "$consumer_dir/lib" "$consumer_dir/vendor" "$consumer_dir/common" "$consumer_dir/assets/dog/images"
cp demo/browser-map/index.html demo/browser-map/main.js "$consumer_dir/"
cp dist/qtiled-view.umd.js dist/qtiled-maps.umd.js dist/qtiled-element-rendering.umd.js "$consumer_dir/lib/"
cp demo/static/js/spritejs3.js "$consumer_dir/vendor/"
cp demo/static/css/index.css demo/static/css/preview-workspace.css demo/static/js/pointer.js "$consumer_dir/common/"
cp demo/static/map-samples/first-static-map.json "$consumer_dir/assets/map.json"
cp demo/static/element-samples/dog/element.json "$consumer_dir/assets/dog/"
cp demo/static/element-samples/dog/images/*.png "$consumer_dir/assets/dog/images/"
python3 -m http.server 8048 --bind 127.0.0.1 --directory "$consumer_dir"
```

打开 [独立静态场景](http://127.0.0.1:8048/)。Python 仅作静态服务器，也可用已有的 HTTP 服务；`fetch` 读取文件需要 HTTP，不采用 `file://`。端口被占用时请换一个空闲端口，并修改访问地址。此入口只在本机服务器运行期间可访问。

独立目录共 15 个文件：HTML/JS、3 份正式 UMD、SpriteJS、2 份 CSS、指针辅助、地图/元素 JSON 和 4 张 PNG。所复制的 `spritejs3.js` 是仓库已有的第三方 SpriteJS 3.7.36，保留其版权头；`common/pointer.js` 提供显式的 `getPointerPosition` 全局。运行时不读取 `src`、Demo 开发 bundle 或其他页面状态，也不需要核心包。

## 场景与交互

[index.html](../demo/browser-map/index.html) 列出依赖加载顺序，[main.js](../demo/browser-map/main.js) 是完整只读调用例：

1. 读取真实元素 JSON、四张图片和地图 JSON，用图片实际尺寸校验元素。`importMapDefinition` 返回地图及完整占用索引。
2. 保留样本中的 `dog-a` 与 `dog-b`：共享 `sculpture-dog-preview` 定义，位置分别为 `[1,1]`、`[3,1]`，每实例使用独立 SpriteJS Group。没有自动删除或编辑地图的操作。
3. 绿色纯色地面表示 20 个有效格，四个 `null` 空角不绘制；地面与实体是独立绘制组。此样本没有 `cell.tile`，绿色仅为地形示意，不代表原作地面素材。
4. 四镜头调用 `resolveMapEntities`，与地面共用地图的 `[80,40]` 格距；只改变投影和素材方向。矩阵、实例位置、对象朝向、完整世界占地与占用索引保持不变，选中 ID 保留。
5. 点击地面格子，经 `pickGrid` 和占用索引选择一个实例，显示 ID、元素引用、当前图片、世界姿态和完整占地。点选只替换高亮与详情，不重新解析地图或绘制实体。同格多个实例按 `entities` 的输入顺序取第一个，与像素画序无关。空地、空角及地图外点击清除实体选择；“清除选择”同时清除格子详情。

布局沿用静态地图浏览 Demo：详情栏固定在画布右侧并独立滚动，窄窗口只滚动画布区域；画布容器无边框、内边距或 CSS 缩放，每次点击读取当前容器位置。点击雕塑上部仍查询指针下的地面格，不宣称按可见图片像素命中。

## 加载失败与恢复

首次失败显示原因与空状态。已有有效场景时，重新加载期间继续显示旧场景；只有 JSON、引用、完整占用、所有图片及下一绘制树都成功后，才一起替换地图、索引与画面。坏 JSON、坏引用或缺图会保留旧地图和选择，修复 `assets/` 中的文件后点击“重新加载”即可恢复，不需要手工清理画布。

本例使用地图接口默认的共存规则，没有经营规则。地面和实体分组，当前不重叠样本按占地下端由远到近绘制；通用画序、遮挡像素选择、平移缩放、编辑和动画不在此例范围。详细契约见[地图定义](map-definition.md)、[四向视图](isometric-view.md)、[元素渲染](element-rendering.md)。
