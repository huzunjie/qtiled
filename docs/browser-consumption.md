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

[地图地表编辑](../demo/map-editor.html) 与 [map-editor.js](../demo/static/js/map-editor.js) 是同一套公共场景页面和交互实现。它沿用 C0/C1 的格子/实体查看、占用索引、分层绘制和失败保留能力，增加普通陆地/水域笔刷、整笔预览、撤销重做及地图文件往返。默认矩形有效格地图显示在响应式矩形视口中，支持平移、查看全图和原尺寸；这些相机交互全部位于 Demo 层。原作选图由 Demo 的 `land-water-rules.js` 和规则数据处理；共用帧解析与原地换帧由元素渲染 UMD 提供，地图 UMD 的接口不变。

日常开发沿用 Demo 的三份 `*.dev.js` 和 `npm run dev`；更新源码后先运行 `npm run debug`，浏览器打开 `http://localhost:8033/demo/map-editor.html`。也可直接使用已有开发产物，以仓库根目录运行 `python3 -m http.server 8033 --bind 127.0.0.1`。该页无需核心包。

验证正式消费时，从同一份 HTML 生成隔离运行副本，只将三条开发包路径换成正式 UMD 路径；页面逻辑、样本、CSS 与辅助文件原样复制。仓库已包含正式产物，仅修改对应源码时才需 `npm run optional` 重新生成；无需为消费者合并重建正式产物。`npm run build` 已包含正式可选模块构建。

## 准备独立运行目录

在仓库根目录执行以下命令，生成的页面和依赖均位于本片 `output` 目录。已有同名目录时更新对应文件：

```sh
consumer_dir="output/emperor/map-viewport-implementation-2026-10-10/isolated-consumer"
mkdir -p "$consumer_dir/dist" "$consumer_dir/demo/static/js" "$consumer_dir/demo/static/css" "$consumer_dir/demo/static/map-samples" "$consumer_dir/demo/static/element-samples/dog/images" "$consumer_dir/demo/static/terrain-samples"
sed -e 's|./static/js/qtiled-view.dev.js|../dist/qtiled-view.umd.js|g' \
    -e 's|./static/js/qtiled-maps.dev.js|../dist/qtiled-maps.umd.js|g' \
    -e 's|./static/js/qtiled-element-rendering.dev.js|../dist/qtiled-element-rendering.umd.js|g' \
    demo/map-editor.html > "$consumer_dir/demo/map-editor.html"
cp dist/qtiled-view.umd.js dist/qtiled-maps.umd.js dist/qtiled-element-rendering.umd.js "$consumer_dir/dist/"
cp demo/static/js/spritejs3.js demo/static/js/pointer.js demo/static/js/dog-element-sample.js demo/static/js/land-water-rules.js demo/static/js/element-animation-player.js demo/static/js/navs.js demo/static/js/map-editor.js "$consumer_dir/demo/static/js/"
cp demo/static/css/index.css demo/static/css/preview-workspace.css "$consumer_dir/demo/static/css/"
cp demo/static/map-samples/first-static-map.json demo/static/map-samples/land-water-map.json demo/static/map-samples/deep-water-map.json demo/static/map-samples/rectangular-water-map.json "$consumer_dir/demo/static/map-samples/"
cp demo/static/element-samples/dog/element.json "$consumer_dir/demo/static/element-samples/dog/"
cp demo/static/element-samples/dog/images/*.png "$consumer_dir/demo/static/element-samples/dog/images/"
cp -R demo/static/terrain-samples/emperor-land-water "$consumer_dir/demo/static/terrain-samples/"
python3 -m http.server 8051 --bind 127.0.0.1 --directory "$consumer_dir"
```

打开 [地图地表编辑（正式产物）](http://127.0.0.1:8051/demo/map-editor.html?no_nav)。`no_nav` 使用现有 Demo 导航开关，隐藏隔离目录中不存在的其他示例入口；右栏“元素工具”链接仍需回到完整仓库 Demo 使用，以上副本只包含地图页。端口被占用时换一个空闲端口并同步访问地址；服务运行期间才可访问，不能用 `file://` 代替 HTTP。

隔离目录包含 HTML、页面、规则与共用播放时钟脚本、3 份 UMD、SpriteJS、2 份 CSS、指针/样本/导航辅助、四份地图、狗元素及四张 PNG，以及完整地表样本目录（atlas、元素定义、规则和来源说明）。新默认样本为 `rectangular-water-map.json`；小水塘、宽阔水域和雕塑样本仍可选择。`spritejs3.js` 是已有 SpriteJS 3.7.36，保留版权头；`pointer.js` 与 `dog-element-sample.js` 提供显式辅助函数。运行时不读取 `src`、开发 bundle、其他页面状态或核心包。隔离目录只是一份生成的验收副本，不另行维护页面。

## 消费约定

页面通过 `loadElementSources` 与元素校验加载狗和地表定义，再通过 `importMapDefinition` 取得地图与占用索引。`landWaterRules` 计算地表选图，`resolveMapEntities` 计算独立实例；地表和实体都使用各自的 SpriteJS Group 调用同一个 `renderElement`。同一份地表样本包含 v1 静态定义与 v2 共享序列，元素工具也使用这份定义。动画帧通过 `resolveElementFrame` 计算，再调用 `updateElementFrame` 原地更新 Sprite；时钟不进入核心模块。

当前地表素材要求 `tileSize: [80,40]`、零高程和普通 land/water；普通内部、过渡和深处水面按水域形态选用三套 24 帧循环；null/矩阵外按非水计算邻域。笔刷改变地图事实并重算岸线，松开整笔提交；越界、无效格或缺素材会拒绝整笔。Esc 可取消，撤销/重做按整笔恢复，保存与读取使用 v1 地图 JSON。可选 `terrainVariant` 保存作者固定的变体输入；省略时按世界格稳定派生，规则选择结果不写入 `cell.tile`。

默认样本以 32×32 包围矩阵保存 544 个有效格，其余为 null；投影后的近似矩形范围由地图文件决定，不由窗口大小重新生成。平移工具左拖或中键拖动改变相机世界中心，查看全图/原尺寸改变显示模式；工作模式下转镜头和 resize 保留中心世界点。拾取与笔刷统一逆算显示比例和平移。规则与占用始终消费完整地图，视口边缘裁掉的格不当作非水，画布外素材伸入部分继续绘制。

地图页先用整数原像素坐标合成地表和实体，再整体进行非平滑采样，避免逐片图集在半像素位置的拼缝；resize 后恢复采样设置。实际换帧刷新合成图，平移/缩放只更新显示变换。缩放输入支持 10%～400%（含小数），Enter 或离开输入框应用；全图和原尺寸仍为快捷操作。当前合成缓存覆盖整图，尚无大型地图分块。显示网格和世界坐标是默认关闭的工具覆盖层，不改变地图数据；小于 50% 时坐标暂时隐藏并提示放大。文件打开与“高级：查看 / 粘贴 JSON”调用同一地图读取逻辑。

四镜头保留世界连接与占地。只有地图、索引、图片和下一绘制树全部成功后才替换场景；坏 JSON、坏引用或缺图保留上次有效状态，修复后可重试。详细交互与边界见[地表编辑说明](map-definition.md#地表编辑与地图浏览-demo)。播放、暂停与重播由两页共用时钟管理；切镜头、平移、resize 或重新派生场景不重置时间。100ms/帧是明示作者预览设置，未模拟洪水。相机、当前帧和深处分类不写入地图。本例未包含连续缩放、边缘自动滚动、通用遮挡命中、实体动作状态机或经营规则。接口契约见[地图定义](map-definition.md)、[四向视图](isometric-view.md)、[元素渲染](element-rendering.md)。
