# 元素绘制、动画帧与 SpriteJS 适配

`src/element-rendering` 是元素编辑器、独立素材预览和地图消费者共用的可选模块。`draw`、`frame`、`placement` 为纯计算入口，`sources` 负责浏览器图片加载，`spritejs-element-renderer` 负责 SpriteJS 节点适配；页面布局、交互状态和素材配置由消费项目负责。

浏览器正式包为 `dist/qtiled-element-rendering.umd.js`，命名空间为 `qtiledElementRendering`；构建及依赖顺序见[浏览器消费说明](browser-consumption.md)。

运行顺序为：`loadElementSources()` → `importElementDefinition()` → `resolveElementPlacement()`（放置/转向时）→ `resolveElementDraw()` → `renderElement()`。编辑器和独立预览都可以消费这一流程，不依赖另一页面的临时状态。

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

将 JSON 和 `sourceInfo` 传给元素导入函数；校验不通过时禁止进入绘制流程。裁切越界、缺方向仍由同一契约校验报告。

## 绘制计算

`resolveElementDraw(definition, grid = [0,0], view = {}, objectAngle = 0, playback = {})` 是纯计算；定义须已通过契约校验，grid 为素材标定用的定义原点的世界整数格，view 沿用四向视图约定。`objectAngle` 为独立对象朝向，只接受数字 `0/90/180/270`，其他值抛出 `RangeError`。本函数只绘制给定姿态，放置/转向时须先算出配套的 grid，不能把固定 grid 仅切 objectAngle 当成建筑原地转向。原有三/四参数调用保持兼容；v2 未传时间时选第一帧。返回：

| 字段 | 含义 |
|---|---|
| `id / source` | 元素 ID 与相对图片引用 |
| `angle` | 镜头角度，继续来自 `view.angle` |
| `objectAngle / imageAngle` | 对象自身朝向与实际素材槽角度 |
| `rect / anchor` | 独立复制的裁切与锚点数组 |
| `origin` | 元素逻辑原点经四向视图投影后的像素位置 |
| `placementGrid / placementOrigin` | 当前镜头下矩形最上角的世界格及其投影，用作下次转向的放置基准；非矩形为 `null` |
| `position` | 图片裁切区域左上角，等于 `origin - anchor` |
| `tileSize` | 逻辑瓦片尺寸，与图片缩放无关 |
| `footprint` | 对象转向后每格 `{grid,position}`，分别为世界格和镜头下的投影像素 |
| `sequence / frameIndex` | 仅序列方向返回：序列名称及零起点帧索引；静态结果保留原有字段形状 |

裁切的 x/y 是原图取样起点，不再加到 `position` 上。锚点以裁切区域左上角为基准，允许负数或位于区域外。没有方向回退、镜像、重新居中或根据图片尺寸猜占地；返回结果不共享输入中的可修改数组。

调用方应显式提供素材的标定 `view.tileSize`：当前狗样本为 `[80,40]`，通用函数缺省值则是 `[8,4]`，不会自动读取 Demo 表单或从 JSON 推断。修改尺寸不自动缩放图片或 anchor。图片、定义、标定尺寸与运行姿态的交付责任见[元素定义的外部参数约定](element-definition.md#交付给绘制方的参数)。

### 共用素材的方向选择

方向共用沿用 `imageAngle = (view.angle + objectAngle) % 360` 读取显式视图。多个视图的 `source`、`rect` 相同时，仍读取当前素材槽自己的 `anchor`；`footprint` 则单独按对象朝向旋转。镜头变化只改变投影与素材槽，不改写对象的世界位置、朝向或占地。

元素编辑器的批量绑定只是一次复制图片引用和裁切的编辑操作；绑定后各方向独立修改，定义中没有持续联动关系。单图四向、部分共用与四向独立均由同一个 `resolveElementDraw` 消费。元素编辑与地图实体测试覆盖了非对称 3×2 占地的 16 种镜头/对象方向组合及保存回读，没有为共用图片另设一套旋转规则。

v2 方向还可以共同引用一份显式帧序列。此时帧数据共用，方向锚点仍独立；序列编辑影响它的所有引用方向。帧选择不参与 `objectAngle`、镜头角度、世界位置或占地旋转计算。

### 时间与当前帧

`resolveElementFrame(definition, imageAngle = 0, playback = {})` 是不读时钟的纯函数。`imageAngle` 已经是镜头与对象组合后的素材槽，只接受 `0/90/180/270`；缺向不回退。`playback` 的字段为：

| 字段 | 约定 |
|---|---|
| `elapsedMs` | 非负有限毫秒，默认 `0`，可含 `performance.now()` 产生的小数 |
| `phase` | 非负安全整数的帧偏移，默认 `0`；先按帧数取余，和作者指定的毫秒时长分开 |

返回 `{source, rect, anchor, sequence, frameIndex}`；数组是独立副本。静态方向的 `sequence` 为 `null`、`frameIndex` 为 `0`。序列方向按 `floor(elapsedMs / frameDurationMs) + phase` 循环选择帧；例如三帧、每帧 `100ms` 时，`99.9ms` 仍是第 0 帧、`100ms` 是第 1 帧、`300ms` 回到第 0 帧。非法时间或相位抛出 `RangeError`。

`resolveElementDraw` 将第五参数传给此函数，位置仍为 `origin - 当前方向 anchor`。如果只是时间推进，调用方可直接解析帧并更新现有 Sprite：

```js
const draw = resolveElementDraw(definition, grid, view, objectAngle, { elapsedMs, phase });
renderElement(holder, draw, sources);

// 后续时钟更新不重建场景、占地或选择覆盖层。
const frame = resolveElementFrame(definition, draw.imageAngle, { elapsedMs: laterMs, phase });
updateElementFrame(holder, frame, sources);
```

元素编辑器与地图 Demo 共用 `demo/static/js/element-animation-player.js` 的会话时钟，暂停固定累计时间，继续从该时间推进；切镜头不重置时间。逐格相位由地图规则提供，当前帧和播放器时间不写入地图或元素定义。保存后可复现作者确定的帧序和相位关系，不承诺恢复上次关闭时的播放瞬间。原作实际播放速率仍需独立证据，不由现代时钟测试替代。

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

`overlays.gridPositions` 是调用方经同一视图投影后的网格中心数组；缺省为空。`footprint`、`placement` 缺省为 true，`bounds` 缺省为 false。placement 是自动确定的矩形上角基准格，以蓝色小框标记；页面“放置基准”开关控制其显示。网格在素材下方，占地/放置基准/裁切边框在上方。定义坐标仅用于内部计算，不再绘制红色十字，移除原有 `overlays.anchor` 选项。

函数只替换它在该容器中拥有的 Group，不清除调用方其他节点。`drawInfo = null` 清除元素组；素材缺失时先清除旧元素组再抛出明确错误，防止残留图片冒充当前结果。内部不异步加载，因此切向只使用已经加载的图片，不发生跨方向加载结果覆盖。

`updateElementFrame(container, frame, sources = {})` 在已经绘制的同一容器中原地更新，并返回原有 Group。它先检查帧的图片引用、裁切结构与方向锚点，确认图片已加载后再更新 Sprite 的纹理、裁切、尺寸和 `pos = 原有 origin - frame.anchor`；若有裁切边框，同时更新其位置与尺寸。它不重建 Group，不改占地、放置基准或调用方其他节点。无已绘制元素、帧结构非法或缺图片时抛错，旧节点与画面保持不变；完整图片尺寸及裁切越界仍由元素定义校验负责。

容器也可使用 SpriteJS Group。多实体消费者为每个实例创建独立 Group，再各自调用本函数；同一容器循环调用会替换前一个实例。消费页面管理整个场景组的生命周期。

纯计算可从 `src/element-rendering/draw`、`src/element-rendering/frame`、`src/element-rendering/placement` 单独引入。完整可选入口 `src/element-rendering` 导出加载、放置、绘制/帧计算、渲染/原地更新及元素的导入、校验、编辑和导出函数；SpriteJS 由调用方提供为外部依赖，不进入核心 `src/index.js`。`npm run optional` 输出独立的 `dist/qtiled-element-rendering.umd.js`，浏览器命名空间为 `qtiledElementRendering`，须在 SpriteJS 后加载。

## 消费项目与边界

元素编辑、素材预览和地图场景由 [EMK](https://emk.pyzy.net/) 维护，相关页面、游戏规则及原作素材已移出 QTiled Demo。调用方提供完整元素定义、图片索引和播放时间，本模块只处理通用绘制与帧解析。EMK 的集合简写格式应先由其加载器展开，不能直接代替 QTiled 的元素定义。

`npm run optional` 生成正式可选 UMD；`npm run dev` 与 `npm run debug` 只生成当前几何 Demo 使用的核心与四向视图开发包。
