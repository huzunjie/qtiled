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
- 高度数据仅在 [海拔 Demo](demo/elevation.html) 的 HTML 内保存；基础库不提供地图数据管理、坡面、遮挡排序或海拔寻路。
- Demo 按海拔升序绘制顶面，鼠标移动时从高到低还原海拔偏移，每层仅通过对应布局的位置反查方法查询一个格子，再按坐标索引核对范围与实际海拔并显示结果；odd/even 错列反查通过菱形边角修正进行精确定位，固定次数计算、不遍历邻居；共边采用反查方法的稳定归属，不保证按绘制顺序选择共边另一侧；移到图内空白处取消选中。此规则仅用于页面验证，不是基础库接口。
- 原 `qtiled.elevation` 入口及其接口已移除，不保留兼容层。

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


