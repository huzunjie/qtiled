# 正式产物的最小浏览器消费

桌面浏览器可直接通过 `<script>` 加载下列 UMD 文件，无需打包器、源码路径或 Demo 开发包。地图、视图、元素渲染各自构建，不加入核心入口。当前选择 UMD 是为了沿用 SpriteJS 外部全局加载方式；不额外生成可选模块的其他格式。

| 文件（包根目录下） | 浏览器全局 | 用途 / 外部依赖 |
|---|---|---|
| `dist/qtiled-view.umd.js` | `qtiledView` | `projectGrid` / `pickGrid`；无外部依赖 |
| `dist/qtiled-maps.umd.js` | `qtiledMaps` | 地图校验、实体绘制计算、占用、编辑、导入/导出；无外部依赖 |
| `dist/qtiled-element-rendering.umd.js` | `qtiledElementRendering` | 图片加载、元素定义 IO/校验/编辑、放置/绘制计算、渲染；先加载 SpriteJS 3.7.36 UMD，提供 `window.spritejs` |

这是完整文件路径（例如本地包的 `node_modules/qtiled/dist/qtiled-maps.umd.js`），没有新增 `qtiled/maps` 等简写子路径。三个包复用既有源码，只打入各自所需的内部纯计算；不依赖彼此的全局变量。SpriteJS 不打入 QTiled 产物，也不由 QTiled 自动下载。

核心 `main` / `module` 入口保持原样，仅导出 `shapes` / `pathFinding`；原浏览器产物仍为 `dist/qtiled.browser.js`，全局为 `qtiled`。仅做地图 IO/占用/编辑时只需 maps 包，无需 SpriteJS；下面绘制示例不需要核心包。上述路径以本次本地构建或打包内容为准，不代表同名版本已经发布到注册表。

## 构建与准备独立目录

已有开发依赖的仓库根目录运行 `npm run optional` 生成三份正式可选产物。`npm run build` 也包含此步骤，其余构建与 Demo 命令保持原有行为。产物沿用仓库方式收录在 Git 的 `dist/`，通过构建更新。

下面命令在仓库根目录执行；也可以在本地 `npm pack` 解包后的 `package/` 目录执行复制步骤（产物已包含，无需重新构建）。选择一个新的目标目录，避免覆盖已有项目：

```sh
consumer_dir="$(mktemp -d /tmp/qtiled-browser-consumer.XXXXXX)"
mkdir -p "$consumer_dir/lib" "$consumer_dir/vendor" "$consumer_dir/assets/dog/images"
cp examples/browser-map/index.html examples/browser-map/main.js "$consumer_dir/"
cp dist/qtiled-view.umd.js dist/qtiled-maps.umd.js dist/qtiled-element-rendering.umd.js "$consumer_dir/lib/"
cp demo/static/js/spritejs3.js "$consumer_dir/vendor/"
cp demo/static/map-samples/first-static-map.json "$consumer_dir/assets/map.json"
cp demo/static/element-samples/dog/element.json "$consumer_dir/assets/dog/"
cp demo/static/element-samples/dog/images/*.png "$consumer_dir/assets/dog/images/"
python3 -m http.server 8047 --bind 127.0.0.1 --directory "$consumer_dir"
```

打开 `http://127.0.0.1:8047/`。Python 仅作示例静态服务器，也可用已有的 HTTP 服务；`fetch` 读取文件需要 HTTP，不采用 `file://`。所复制的 `spritejs3.js` 是仓库已有的第三方 SpriteJS 3.7.36，保留其版权头；`demo` 在这里仅提供已存在的样本和外部库文件，运行时不读取 Demo 脚本、开发 bundle 或页面状态。

## 最小调用与结果

[index.html](../examples/browser-map/index.html) 列出加载顺序，[main.js](../examples/browser-map/main.js) 是完整可复用调用例：

1. 从独立目录读取真实元素 JSON、四张图片和地图 JSON，用实际图片尺寸校验元素。
2. `importMapDefinition` 返回地图和占用索引；样本初始两个实例占用 8 格。
3. `applyMapEdit` 删除 `dog-b`，仅在成功后替换当前地图与索引，再 `exportMapDefinition` 展示 JSON；剩余 `dog-a` 占用 4 格。
4. `resolveMapEntities` / `projectGrid` 使用地图的 `[80,40]` 瓦片尺寸和相同视图，`renderElement` 经外部 SpriteJS 绘制一个实例及地面网格。

每一步均处理 `issues`；文件或引用错误停止后续消费，页面显示原因，修复后刷新可重试。示例使用接口默认共存规则，真实场景的规则由调用方同时传给导入、编辑和导出。不保存索引、图片或规则程序到地图 JSON。

这是正式入口的最小单实例示例，不提供地图编辑 UI、多实体场景选择、完整画序或经营规则；完整独立场景由后续切片实现。详细契约见[地图定义](map-definition.md)、[四向视图](isometric-view.md)、[元素渲染](element-rendering.md)。
