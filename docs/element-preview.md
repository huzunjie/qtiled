# P0-C：静态素材预览

运行顺序为：`loadElementSources()` → `importElementDefinition()` → `resolveElementDraw()` → `renderElementPreview()`。编辑器和独立预览都可以消费这一流程，不依赖页面的临时状态。

## 图片加载

```js
import { loadElementSources } from '../src/element-preview/sources';

const { sources, sourceInfo, issues } = await loadElementSources({
  'images/dog.png': '/assets/images/dog.png',
  'images/local.png': selectedFile,
});
```

输入是调用方明确指定的“定义中的相对路径 → URL 字符串或 Blob/File”集合；空集合返回空结果。URL 须同源或允许匿名 CORS。加载器不扫描目录，也不根据文件名推断方向。

返回 `sources`（路径 → 已加载 HTMLImageElement）、`sourceInfo`（路径 → 实际 `{width,height}`）和 `issues`（`{path,code:'source-load-failed',message}`）。一项失败不丢弃其他成功项，问题顺序与输入顺序一致。临时 Blob URL 在加载成功或失败后均释放；返回的图片由调用方持有。只有调用时需要浏览器的 Image/Blob/URL API。

将 JSON 和 `sourceInfo` 传给 P0-A 的导入函数；校验不通过时禁止进入绘制流程。裁切越界、缺方向仍由同一契约校验报告。

## 绘制计算

`resolveElementDraw(definition, grid = [0,0], view = {})` 是纯计算；定义须已通过契约校验，grid 为世界整数格，view 沿用 P0-B。返回：

| 字段 | 含义 |
|---|---|
| `id / angle / source` | 元素 ID、所选角度与相对图片引用 |
| `rect / anchor` | 独立复制的裁切与锚点数组 |
| `origin` | 元素逻辑原点经 P0-B 投影后的像素位置 |
| `position` | 图片裁切区域左上角，等于 `origin - anchor` |
| `tileSize` | 逻辑瓦片尺寸，与图片缩放无关 |
| `footprint` | 每格 `{grid,position}`，分别为世界格和投影像素 |

裁切的 x/y 是原图取样起点，不再加到 `position` 上。锚点以裁切区域左上角为基准，允许负数或位于区域外。没有方向回退、镜像、重新居中或根据图片尺寸猜占地；返回结果不共享输入中的可修改数组。

## SpriteJS 适配

`renderElementPreview(layer, drawInfo, sources, overlays = {})` 使用 SpriteJS 3.7.36 的 `Sprite.sourceRect` 裁切、`size` 保持裁切像素大小、`pos` 定位。无需改写原图。

`overlays.gridPositions` 是调用方经同一 P0-B 视图投影后的网格中心数组；缺省为空。`footprint`、`anchor` 缺省为 true，`bounds` 缺省为 false。网格在素材下方，占地/锚点/裁切边框在上方。

函数只替换它在该 layer 中拥有的 Group，不清除调用方其他节点。`drawInfo = null` 清除预览；素材缺失时先清除旧预览再抛出明确错误，防止残留图片冒充当前结果。内部不异步加载，因此切向只使用已经加载的图片，不发生跨方向加载结果覆盖。

纯计算可从 `src/element-preview/draw` 单独引入。完整可选入口 `src/element-preview` 导出三个函数及 P0-A 的导入/校验函数；SpriteJS 由调用方提供为外部依赖，不进入核心 `src/index.js`。Demo 构建输出独立的 `qtiled-preview.dev.js`，浏览器命名空间为 `qtiledPreview`，须在 SpriteJS 后加载。

## 样本和边界

[四向静态素材 Demo](../demo/element-preview.html) 使用两份本地 JSON：完整素材与裁切示例。四张图片、标定依据和待核实项见[样本说明](../demo/static/element-samples/dog/README.md)。没有可视化编辑、导出、地图放置或经营规则。

`npm run debug` 生成运行文件；`npm run dev` 同时监听核心、视图和静态预览三个 Demo 入口。可选模块的正式发布包与 npm 子路径尚未实现，属于后续打包工作。

本页与四向视图 Demo 共用 `demo/static/css/preview-workspace.css`：信息栏始终在画布右侧，正文 12px；空间不足时在画布区域内滚动，保持绘制尺寸。
