# 静态元素绘制与 SpriteJS 适配

`src/element-rendering` 是元素编辑器、独立素材预览和地图消费者共用的可选模块。`draw`、`placement` 为纯计算入口，`sources` 负责浏览器图片加载，`spritejs-element-renderer` 负责 SpriteJS 节点适配；页面布局、交互状态和样本资源配置留在 Demo。

原 `src/element-preview` 已迁移到本目录，`renderElementPreview` 改名为 `renderElement`；浏览器包与命名空间为 `qtiled-element-rendering.dev.js` / `qtiledElementRendering`。仓库内消费者同步迁移，不保留旧入口。实际素材预览页仍使用 `demo/element-preview.html`，其名称表示页面用途。

运行顺序为：`loadElementSources()` → `importElementDefinition()` → `resolveElementPlacement()`（放置/转向时）→ `resolveElementDraw()` → `renderElement()`。编辑器和独立预览都可以消费这一流程，不依赖另一页面的临时状态。

2026-10-04 上角格定位修正已完成回归：全量 18 suites / 486 tests、Demo 构建及差异检查通过，两页各 16 种镜头/对象组合正常。独立预览已回读导出窗口原文保存的 JSON，下载可用由用户实测确认；具体证据边界见[编辑器验证记录](element-editor.md#验证记录)。

## 图片加载

```js
import { loadElementSources } from '../src/element-rendering/sources';

const { sources, sourceInfo, issues } = await loadElementSources({
  'images/dog.png': '/assets/images/dog.png',
  'images/local.png': selectedFile,
});
```

输入是调用方明确指定的“定义中的相对路径 → URL 字符串或 Blob/File”集合；空集合返回空结果。URL 须同源或允许匿名 CORS。加载器不扫描目录，也不根据文件名推断方向。

返回 `sources`（路径 → 已加载 HTMLImageElement）、`sourceInfo`（路径 → 实际 `{width,height}`）和 `issues`（`{path,code:'source-load-failed',message}`）。一项失败不丢弃其他成功项，问题顺序与输入顺序一致。临时 Blob URL 在加载成功或失败后均释放；返回的图片由调用方持有。只有调用时需要浏览器的 Image/Blob/URL API。

将 JSON 和 `sourceInfo` 传给 P0-A 的导入函数；校验不通过时禁止进入绘制流程。裁切越界、缺方向仍由同一契约校验报告。

## 绘制计算

`resolveElementDraw(definition, grid = [0,0], view = {}, objectAngle = 0)` 是纯计算；定义须已通过契约校验，grid 为素材标定用的定义原点的世界整数格，view 沿用 P0-B。`objectAngle` 为独立对象朝向，只接受数字 `0/90/180/270`，其他值抛出 `RangeError`。本函数只绘制给定姿态，放置/转向时须先算出配套的 grid，不能把固定 grid 仅切 objectAngle 当成建筑原地转向。原有三参数调用保留原有字段的计算结果。返回：

| 字段 | 含义 |
|---|---|
| `id / source` | 元素 ID 与相对图片引用 |
| `angle` | 镜头角度，继续来自 `view.angle` |
| `objectAngle / imageAngle` | 对象自身朝向与实际素材槽角度 |
| `rect / anchor` | 独立复制的裁切与锚点数组 |
| `origin` | 元素逻辑原点经 P0-B 投影后的像素位置 |
| `placementGrid / placementOrigin` | 当前镜头下矩形最上角的世界格及其投影，用作下次转向的放置基准；非矩形为 `null` |
| `position` | 图片裁切区域左上角，等于 `origin - anchor` |
| `tileSize` | 逻辑瓦片尺寸，与图片缩放无关 |
| `footprint` | 对象转向后每格 `{grid,position}`，分别为世界格和镜头下的投影像素 |

裁切的 x/y 是原图取样起点，不再加到 `position` 上。锚点以裁切区域左上角为基准，允许负数或位于区域外。没有方向回退、镜像、重新居中或根据图片尺寸猜占地；返回结果不共享输入中的可修改数组。

调用方应显式提供素材的标定 `view.tileSize`：当前狗样本为 `[80,40]`，通用函数缺省值则是 `[8,4]`，不会自动读取 Demo 表单或从 JSON 推断。修改尺寸不自动缩放图片或 anchor。图片、定义、标定尺寸与运行姿态的交付责任见[元素定义的外部参数约定](element-definition.md#交付给绘制方的参数)。

### 放置、对象朝向与镜头

根据用户在原作对 2×2、3×2 建筑的实验，矩形放置预览以**当前画面最上角的占地单元格**对齐光标所在格。它不是图片外框角、屋顶像素或永久不变的素材局部格。2×2 转向保持同一组世界占地，3×2 转向交换长宽后仍固定该基准格；不据此推测原作引擎内部转轴。

`resolveElementPlacement(definition, placementGrid = [0,0], objectAngle = 0, viewAngle = 0)` 返回 `{grid, objectAngle}`。输入定义应通过契约校验，且占地必须为完整矩形；支持负偏移以及定义原点在占地外的矩形。placementGrid 是放置基准的世界整数格。两种角度只接受数字 `0/90/180/270`，非法角度抛 `RangeError`，非法基准格抛 `TypeError`，空集/非矩形抛 `RangeError`。不规则占地的选格规则尚未确认，本函数不补格、不取外接框空角、不猜并列最高格；这些定义仍可在绘制层按明确姿态显示。

计算从原始 footprint 旋转出目标朝向，找出当前镜头下矩形上角格相对定义原点的偏移 `top`，再令 `grid = placementGrid - top`。QTiled 的等距纵坐标为 `(y-x) * tileHeight/2`，因此镜头坐标中的上角格是 `maxX/minY`，再逆镜头旋转回世界偏移。这是对已观察放置规则的坐标实现，不新增 JSON 字段或 pivot。

```js
// 放置时，当前画面上角格对齐光标命中的世界格 [5,3]。
const view = { angle: 90, tileSize: [80, 40] };
let pose = resolveElementPlacement(definition, [5, 3], 0, view.angle);
let draw = resolveElementDraw(definition, pose.grid, view, pose.objectAngle);

// R 转向：保留当前上角的世界格，重新计算配套的定义原点位置。
pose = resolveElementPlacement(definition, draw.placementGrid, 90, view.angle);
draw = resolveElementDraw(definition, pose.grid, view, pose.objectAngle);

// 转镜头：复用姿态，只改 view，不再次调用放置计算。
view.angle = 180;
draw = resolveElementDraw(definition, pose.grid, view, pose.objectAngle);
```

例如基准 3×2 为 `x=0..2,y=0..1`，镜头 0°，放置基准格 `[0,0]`：

| 对象朝向 | 返回的定义原点 grid | 世界占地范围 |
|---|---|---|
| 0° | `[-2,0]` | `x=-2..0,y=0..1` |
| 90° | `[0,0]` | `x=-1..0,y=0..2` |
| 180° | `[0,1]` | `x=-2..0,y=0..1` |
| 270° | `[-1,2]` | `x=-1..0,y=0..2` |

每次使用原始定义和目标角度，不把上次旋转结果写回 footprint。同条件下四次恢复初态。镜头变化时，`draw.placementGrid` 会指出新画面最上角那一格，供之后的 R 操作采用；它不会改变已经确定的世界占地。

绘制继续使用 `[x,y] → [-y,x]` 的正向编码，素材槽为 `imageAngle = (view.angle + objectAngle) % 360`。各槽 anchor 保留旧定义原点的标定语义，图片左上角为新的 `projectGrid(pose.grid, view) - anchor`；占地与图片共享同一次平移。无需重新标定已有 JSON，也不旋转像素 anchor。原作精确鼠标热点与像素 anchor 的真实性仍属独立标定缺口。

两页在初次载入/新建定义时令姿态为 `grid=[0,0], objectAngle=0`，保持基准预览的位置；R 或对象按钮根据当时的上角格计算新姿态。仅切镜头保持姿态；不规则占地禁用转向。预览位置和朝向不写入元素 JSON，独立回读若要复现相同操作后的绝对位置，需要从相同初态按相同镜头/对象操作顺序进行，不能只比较最终的两个角度。鼠标在画布内且未编辑输入框时按 R 转对象，重复按键、组合键及拖拽期间不触发。

## SpriteJS 适配

适配器源码为 `src/element-rendering/spritejs-element-renderer.js`；`demo/static/js/spritejs3.js` 则是 Demo 使用的第三方 SpriteJS 库文件。

`renderElement(container, drawInfo, sources, overlays = {})` 使用 SpriteJS 3.7.36 的 `Sprite.sourceRect` 裁切、`size` 保持裁切像素大小、`pos` 定位。无需改写原图。

`overlays.gridPositions` 是调用方经同一 P0-B 视图投影后的网格中心数组；缺省为空。`footprint`、`placement` 缺省为 true，`bounds` 缺省为 false。placement 是自动确定的矩形上角基准格，以蓝色小框标记；页面“放置基准”开关控制其显示。网格在素材下方，占地/放置基准/裁切边框在上方。定义坐标仅用于内部计算，不再绘制红色十字，移除原有 `overlays.anchor` 选项。

函数只替换它在该容器中拥有的 Group，不清除调用方其他节点。`drawInfo = null` 清除元素组；素材缺失时先清除旧元素组再抛出明确错误，防止残留图片冒充当前结果。内部不异步加载，因此切向只使用已经加载的图片，不发生跨方向加载结果覆盖。

容器也可使用 SpriteJS Group。多实体消费者为每个实例创建独立 Group，再各自调用本函数；同一容器循环调用会替换前一个实例。[静态地图浏览 Demo](../demo/map-preview.html) 采用此方式复用适配器，由页面管理整个场景组的生命周期。

纯计算可从 `src/element-rendering/draw`、`src/element-rendering/placement` 单独引入。完整可选入口 `src/element-rendering` 导出加载、放置、绘制计算、渲染及元素的导入、校验、编辑和导出函数；SpriteJS 由调用方提供为外部依赖，不进入核心 `src/index.js`。Demo 构建输出独立的 `qtiled-element-rendering.dev.js`，浏览器命名空间为 `qtiledElementRendering`，须在 SpriteJS 后加载。

## 样本和边界

[四向静态素材 Demo](../demo/element-preview.html) 使用两份本地 JSON：完整素材与裁切示例。四张图片和 JSON 保存在[样本目录](../demo/static/element-samples/dog/)。没有可视化编辑、导出、地图放置或经营规则。

狗样本资源目录和图片清单由 `demo/static/js/dog-element-sample.js` 统一提供，供编辑、素材预览和地图浏览三页使用。这个固定样本配置不进入可选模块；各页仍独立加载、校验并持有图片和定义。

`npm run debug` 生成 Demo 运行文件；`npm run dev` 同时监听核心、视图、元素绘制和地图四个 Demo 入口。独立项目使用 `npm run optional` 生成的正式 UMD 文件，路径、SpriteJS 加载顺序和完整调用例见[正式产物消费](browser-consumption.md)。

本页与四向视图 Demo 共用 `demo/static/css/preview-workspace.css`：信息栏始终在画布右侧，正文 12px。独立预览按实际可见宽高自动适配，长占地列表在右侧局部滚动。

P0-D 增加独立回读：选择素材根目录或图片文件，再选择编辑器导出的 JSON；导入重新调用 P0-A 校验，并使用本页加载的图片绘制。单独选图以文件名作为引用，目录图片保留目录内相对路径。两页不共享编辑状态。瓦片宽高属于视图参数，需手动与编辑预览保持一致；“载入样本”恢复内置图片与样本。完整流程见[元素编辑工具](element-editor.md)。

独立预览从当前对象转向及平移后的占地建立网格范围，再合并四个镜头方向的素材边界和网格范围，按可见画布自动缩小并居中。该适配只影响显示，不改变侧栏中的裁切、锚点和绘制坐标；适配可能改变屏幕位置/比例，不是放置基准世界格变化。网格至少 9×9，随占地扩展并留出两格。右侧占用格子显示转向后的世界格，另显示当前上角放置基准格。

2026-09-30 布局整理：顶部集中样本与文件操作，画布工具栏放显示开关及适配比例；配置选择、方向与图片、裁切定位、占地和预览尺寸分组放在右栏，操作说明单独折叠。当时先暂缓验证，随后已补做宽窄窗口、四向、长占地滚动与显示开关的真实浏览器检查。该历史证据不覆盖后来的对象转向增补。

2026-10-04 较早的原点格纯旋转方案曾完成两页事件测试、18 suites / 479 tests、Demo 构建、真实 Chrome 及下载回读；用户随后纠正了该规则。那些结果仅为旧方案的技术记录，不覆盖本次上角格定位修正。范围见[编辑器验证记录](element-editor.md#验证记录)。
