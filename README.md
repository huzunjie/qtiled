# QTiled

[![npm](https://img.shields.io/npm/v/qtiled.svg?colorB=brightgreen&style=flat-square)](https://www.npmjs.com/package/qtiled)   [![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest) 

这是一套 Tiled 多边形布局基础库。

## DEMO

结合 [spritejs](https://github.com/spritejs) 的几种基本用法示例：https://lab.pyzy.net/qtiled

### 菱形布局示例

![菱形布局示例](https://p1.ssl.qhimg.com/t01e8950d2debce4408.png)

### 六边形布局示例

![六边形布局示例](https://user-images.githubusercontent.com/3885060/130448321-ae63115e-e336-430f-a09a-a7e8186f6425.png)

## 计划列表

### Basic Shapes - 基础图形
+ [x] Polygon - 多边形
  + [x] getBounds 根据实际位置集合和共用顶点计算布局包围盒
  + [x] getPolygonVertexes 获取多边形顶点坐标集
  + [x] getPolygonPositions 按目标区间方向获取多个多边形位置坐标集
  + [x] twoDimForEach 按目标区间方向进行二维遍历
  + [x] getPolygonInfoByPos 根据当前任意坐标&原点坐标&单个瓦片尺寸等，取得目标瓦片的二维坐标及渲染坐标值
+ [x] Rect - 矩形
  + [x] getRectVertexes 获取矩形顶点坐标集
  + [x] getRectPositions 获取多个矩形位置坐标集
  + [x] getRectInfoByPos 根据当前任意坐标&原点坐标&单个瓦片尺寸等，取得目标瓦片的二维坐标及渲染坐标值
  + [x] getNeighbors - 获得当前点周边的邻居，可用于寻路等
  + [x] getNeighborsByDistance - 按距离和类型获得邻居区域，返回基于原点的绝对下标
+ [x] Rhombus - 菱形
  + [x] getRhombusVertexes 获取菱形顶点坐标集
  + [x] getRhombusPositions 按目标区间方向获取多个菱形的错列布局位置坐标集
  + [x] getRhombusInfoByPos 根据当前任意坐标&原点坐标&单个瓦片尺寸等，取得目标瓦片的二维坐标及渲染坐标值
  + [x] getIsometricRhombusPositions 按目标区间方向获取多个菱形的等距布局位置坐标集
  + [x] getIsometricRhombusInfoByPos 根据任意点&原点&单瓦片尺寸，取得瓦片的等距二维坐标及渲染坐标
  + [x] getNeighbors - 获得错列布局当前点周边的邻居，可用于寻路等
  + [x] getIsometricNeighbors - 获得等距布局当前点周边的邻居，可用于寻路等
  + [x] getNeighborsByDistance - 按距离和类型获得错列布局邻居区域
  + [x] getIsometricNeighborsByDistance - 按距离和类型获得等距布局邻居区域
+ [x] Hexagon - 六边形
  + [x] getHexagonVertexes 获取六边形顶点坐标集
  + [x] getHexagonPositions 按目标区间方向获取多个六边形的错列布局位置坐标集
  + [x] getHexagonInfoByPos 根据当前任意坐标&原点坐标&单个瓦片尺寸等，取得目标瓦片的二维坐标及渲染坐标值
  + [x] getNeighbors 获得指定tile下标周边紧邻的邻居们
+ [x] ellipse - 椭圆形
  + [x] angle2Radian 角度转弧度
  + [x] radian2Angle 弧度转角度
  + [x] getEllipsePoint 根据椭圆的原点、X轴半径、Y轴半径、旋转弧度，求得圆周上的点坐标
  + [x] getEllipsePointByAngle 根据椭圆的原点、X轴半径、Y轴半径、旋转角度，求得圆周上的点坐标
  + [x] getEllipseIsometryPoint 根据椭圆的X轴半径、Y轴半径、圆周等分数量、等分点序号、起始弧度，求得圆周上的点坐标

### Pathfinding - 寻路
* [x] AStar
* [x] [菱形高差寻路 Demo](demo/pathfinding-elevation-rhombus.html)：错列、等距布局复用现有 A*，在邻居回调中筛选方向、边界、路障和相邻格高差。最大高差可在 0～3 间调整，默认 1，上下行对称，保留原移动成本。

`pathFinding.aStar(startGrid, endGrid, getNeighbors, maximizable)` 使用启发值为 0 的 Dijkstra 策略，按累计成本取点，在终点出队时确认最低成本路径。返回 `[[x, y, 累计成本], ...]`，有限搜索耗尽后返回 `null`；起终点重合时返回 `[[x, y, 0]]`。邻居顺序固定时，等成本节点按入队顺序处理，等成本路线保留先找到的父节点。

最低成本保证要求搜索期间邻接关系、权重固定且不依赖路径历史，`cost || 1` 后为有限正数，累计运算不溢出。保留 `cost || 1`（包括 `0` 回退为 `1`）及每步累计后舍入三位小数的规则，比较的是逐步舍入后的成本，不是未舍入权重之和。负成本及其他不满足前提的输入不提供最优性保证，不另作输入转换或校验。

`maximizable` 默认 `1e6`，统计成功降低节点成本的次数，超过上限仍抛出原有异常，表示搜索未完成。无限地图不可达或存在无限的低成本、舍入后零增量路径时，仍可能搜索到上限。当前使用数组线性选点，大地图的耗时取决于开放队列规模。

高差寻路页预设从 −3 谷底到 3 高地；修改寻路条件会清除旧路径，点击“开始寻路”重新计算。“网格外允许通行”默认关闭，开启后地图外海拔为 0。地形及寻路标记按海拔排序，鼠标逐层反查实际顶面；悬停沿用海拔页的置顶独立焦点，命中为绿色，空白处用红色显示海拔 0 平面参考。这些通行和交互规则仅在 Demo 内实现。

### 菱形单格海拔坐标

+ [x] 错列、等距单格坐标支持海拔偏移

```js
shapes.rhombus.getPosition([1, 2], [80, 40], 'odd', [100, 100], 1);
shapes.rhombus.getIsometricPosition([1, 2], [80, 40], [100, 100], -1);
```

最后一个参数为 `elevation`，默认 0；返回结构保持原样：错列方法为 `[pixelX, pixelY, gridX, gridY]`，等距方法为 `[pixelX, pixelY]`。
每单位海拔固定向上偏移 16px，负值向下，可使用小数；该距离不随瓦片尺寸缩放。
当前单位高度是内部常量，后续贴图阶段再依据素材调整。

- 网格坐标、邻居及距离邻居查询不受影响，也不自动判断高差通行性。
- `getInfoByPos` / `getIsometricInfoByPos` 仍反查平面位置，不能直接用于海拔后的点击选中；原有正反算一致性仅保证零海拔。
- 批量坐标方法仍输出平面位置；顶面、文字和标记应共用单格方法返回的绘制坐标。
- 高度数据仅在 [海拔 Demo](demo/elevation-rhombus.html) 和 [高差寻路 Demo](demo/pathfinding-elevation-rhombus.html) 的 HTML 内保存；基础库提供顶面命中计算，不提供地图数据管理、坡面、遮挡排序或海拔寻路。
- Demo 按海拔升序绘制顶面，使用下述接口从高到低反查；页面负责坐标索引、可选范围、焦点显示和外部格子管理。

### 菱形海拔顶面命中

```js
const { getInfoByPos, getInfoByPosWithElevation } = shapes.rhombus;
const info = getInfoByPosWithElevation(
  [pixelX, pixelY],
  elevationLayers, // 已去重、按降序排列的海拔值，建议包含 0
  ([gridX, gridY]) => cellsByCoord.get(`${gridX},${gridY}`)?.elevation,
  pixel => getInfoByPos(pixel, originPixel, tileSize, 'odd'),
);
```

返回 `[gridX, gridY, pixelX, pixelY, elevation]`。命中时为实际顶面坐标；未命中时为海拔 0 的平面参考坐标，最后一项为 `null`，不能当作实际格子使用。

- 海拔查询回调对不存在或不可选的格子返回 `undefined`；海拔 `0` 是有效命中。地图编辑后由调用方更新海拔层和查询数据，不限制高度范围，支持负数与小数。
- 错列 odd/even 与等距布局共用此方法；等距布局传入绑定参数的 `getIsometricInfoByPos`。每层只查询一个候选，不遍历邻居；层数为 L 时查询复杂度为 O(L)。包含 0 时复用其平面参考，否则未命中时额外反查一次。
- 共边归属沿用所传平面反查方法，不保证按绘制顺序选择共边另一侧；错列 `none` 仍沿用原有近似定位，不提供精确顶面命中保证。
- 默认像素位置为 `[0, 0]`、海拔层为 `[0]`、海拔查询返回 `undefined`，平面反查为默认参数的 `getInfoByPos`；不修改输入或管理地图状态。

### 布局包围盒

`shapes.polygon.getBounds(positions, vertexes)` 返回 `{ minX, minY, maxX, maxY, width, height }`，表示一组共用顶点的多边形平移后的最小轴对齐矩形范围，不包含描边、文字或额外留白。

```js
const positions = shapes.rhombus.getPositions([0, 4], [0, 6], [60, 30]);
const bounds = shapes.polygon.getBounds(positions, shapes.rhombus.getVertexes([60, 30]));
```

位置数组只读取前两项像素坐标，可直接传入批量坐标结果；隐藏格子应先过滤，横纵布局转换应先完成。顶点使用相对位置的像素坐标，结果与位置集处于同一坐标系。默认位置集合为空，默认顶点为 `[[0, 0]]`（仅计算位置范围）；任一集合为空时返回 `null`。输入为有限数值坐标，不修改输入，计算复杂度为 O(N + V)。

### 自定义邻居选区与旋转

自定义选区用整数逻辑偏移集合表示。基础库负责旋转与焦点锚定，再按布局映射为绝对网格坐标：

```js
const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
const rotated = shapes.polygon.rotateSelectionOffsets(offsets, 1);
shapes.rect.getNeighborsByOffsets([3, 4], rotated);
shapes.rhombus.getIsometricNeighborsByOffsets([3, 4], rotated);
shapes.rhombus.getNeighborsByOffsets([3, 4], rotated, 'odd');
```

`polygon.rotateSelectionOffsets(offsets = [], quarterTurns = 0)` 将选区旋转并把包围盒中心格锚定到逻辑原点。`offsets` 是原始选区的整数逻辑坐标，允许未居中；`quarterTurns` 是相对原始选区的累计整数方向，每单位为顺时针 90°，负数为逆时针，按 4 取模；不能传入角度值或上次旋转结果。返回相对焦点的偏移，不接收或修改焦点的世界坐标。顺时针按逻辑 X 向右、Y 向下定义；偶数尺寸的中心格按方向选侧，中心坐标的取整规则如下：

| 方向 | 中心 X 取整 | 中心 Y 取整 | 居中 3×2 选区内的焦点位置 |
| --- | --- | --- | --- |
| 0° | floor | floor | 上排中间 |
| 90° | floor | ceil | 左列中间 |
| 180° | ceil | ceil | 下排中间 |
| 270° | ceil | floor | 右列中间 |

实现只遍历一次求原始包围盒，再遍历一次直接输出旋转并锚定后的偏移，时间复杂度 O(N)，不生成中间旋转数组。Demo 缓存自定义选区偏移，仅在形状、尺寸或方向变化时重算；同一网格内移动鼠标不重复更新平面选区。

奇数尺寸的包围盒中心位于整数格，取整不改变位置。不规则选区可能不包含中心格，方法不会额外补入焦点。0 次也会重新居中，因此 4 次恢复的是 0 次的锚定结果，不保留原始选区的整体平移。

例如焦点固定为 `[2, -1]`，原始 3×2 偏移如下，270° 时得到列 `1～2`、行 `-2～0` 的格子，焦点在右列中间：

```js
const offsets = [[-1, 0], [-1, 1], [0, 0], [0, 1], [1, 0], [1, 1]];
const selectedOffsets = shapes.polygon.rotateSelectionOffsets(offsets, 3);
const grids = shapes.rect.getNeighborsByOffsets([2, -1], selectedOffsets);
```

三个 `getNeighborsByOffsets` 方法的默认原点为 `[0, 0]`，默认偏移为空集合；菱形等距版本名为 `getIsometricNeighborsByOffsets`。`originGrid` 是目标布局中的绝对网格坐标，`offsets` 是相对焦点的逻辑偏移。错列版本的 `stagger` 默认 `'odd'`，沿用现有距离邻居的逻辑偏移换算，因此不能直接把偏移加到错列行列下标上。上述方法均保留输入顺序、不修改输入，空偏移返回空集合；不去重、不过滤地图边界，也不处理海拔与可见性。输入约定为有限整数坐标，旋转次数为有限整数，不接收像素坐标。

[正矩形邻居 Demo](demo/neighbors-rect.html) 与 [菱形邻居 Demo](demo/neighbors-rhombus.html) 在区域查询中保留距离模式，新增单格、可调长方形和 L 形选区。R 或按钮每次旋转 90°；R 只作用于鼠标所在画布，输入控件、组合键和长按重复不触发。预设和控件属于 Demo，不属于基础库 API。

[海拔 Demo](demo/elevation-rhombus.html) 同时提供距离区域和自定义选区。从实际命中的格子展开逻辑选区，各格按自身海拔显示；只选择地图内且顶面露出正面积的格子。完全遮挡或仅共边、共点的格子不入选，未命中时清除选区并保留红色平面参考焦点。可见性按实际绘制顺序扣除后绘制顶面，不考虑演示填充透明度；选区着色和轮廓均裁到露出部分。当前地形静态，可见片段只预计算一次；后续若改地形或视角，需要重新计算。本示例不修改地形，不包含地图视角旋转。

### Tile Data - 瓦片数据格式约定
* [ ] ToDo - 待开发

### Tile Renderer - 瓦片渲染器
* [ ] ToDo - 待开发

### Tile Editor - 瓦片编辑器
* [ ] ToDo - 待开发

### Sprite Editor - 精灵编辑器
* [ ] ToDo - 待开发

### Map Editor - 地图编辑器
* [ ] ToDo - 待开发

## 安装引用

鉴于大家各自的业务构建场景的不同，可以从以下两种引用方式中选择适合自己的方案：

1 . 将lib目录下适合的打包文件放入业务目录中，直接引用JS:

```html
<script src="xxx.js"></script>
<script>
const { shapes, pathFinding } = qtiled;
... 
</script>
```

2 . 项目是基于nodejs环境构建的话，可以先在项目目录下执行命令安装依赖包：

```
npm install qtiled --save
```
然后再按照自己的使用习惯，将依赖 import 或 require 到业务代码中使用：

```
import qtiled from 'qtiled';
```

## 使用方法

可以参考 `demo/index.js` 中的示例，也可以直接阅读 src 目录下源码及相应注释。

交互 demo 使用独立的 `demo/static/js/pointer.js`，在页面交互脚本之前加载，通过 `getPointerPosition(event, container)` 取得 `[pixelX, pixelY]`，再传入基础库反查方法。移动与点击共用该方法，每次使用 `clientX/clientY` 和容器当前的 `getBoundingClientRect()`，适用于当前无边框、无内边距且未缩放的画布容器；此方法不属于 QTiled 基础库 API。

### 坐标变量命名速查

库与 demo 统一使用带语义前缀的坐标变量名，避免把网格下标、像素位置和相对偏移混在一起：

| 命名 | 含义 | 常见示例 |
| --- | --- | --- |
| `gridX` / `gridY` | 瓦片在网格中的列、行下标 | `originGridX`、`neighborGridY` |
| `pixelX` / `pixelY` | 画布或屏幕上的像素坐标 | `originPixelX`、`basePixelY` |
| `offsetX` / `offsetY` | 相对原点的网格或邻居偏移 | `neighborTypes(offsetX, offsetY)` |
| `originGrid` | 参考瓦片的网格坐标 | `[gridX, gridY]` |
| `originPixel` / `originXY` | 参考点或布局原点的像素坐标 | `[originPixelX, originPixelY]` |
| `tileWidth` / `tileHeight` | 单个瓦片的像素尺寸 | `size = [tileWidth, tileHeight]` |
| `currentElevation` / `neighborElevation` | 当前瓦片、邻居瓦片的海拔 | `elevationDiff` |

涉及 API 返回数组时，仍保持原有顺序：位置数组为 `[pixelX, pixelY, gridX, gridY]`，点击定位结果为 `[gridX, gridY, pixelX, pixelY]`。

## 备注

目前还只是静态方法库，希望能带来些许便利，有相应问题请随时反馈。
