# QTiled

[![npm](https://img.shields.io/npm/v/qtiled.svg?colorB=brightgreen&style=flat-square)](https://www.npmjs.com/package/qtiled)   [![tested with jest](https://img.shields.io/badge/tested_with-jest-99424f.svg)](https://github.com/facebook/jest)    [![Total Alerts](https://img.shields.io/lgtm/alerts/g/huzunjie/qtiled.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/huzunjie/qtiled/alerts)

这是一套 Tiled 多边形布局基础库。

## DEMO

结合 [spritejs](https://github.com/spritejs) 的几种基本用法示例：https://lab.pyzy.net/qtiled

![菱形地图示例](https://p1.ssl.qhimg.com/t01e8950d2debce4408.png)

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
+ [x] Rhombus - 菱形
  + [x] getRhombusVertexes 获取菱形顶点坐标集
  + [x] getRhombusPositions 按目标区间方向获取多个菱形的错列布局位置坐标集
  + [x] getRhombusInfoByPos 根据当前任意坐标&原点坐标&单个瓦片尺寸等，取得目标瓦片的二维坐标及渲染坐标值
  + [x] getIsometricRhombusPositions 按目标区间方向获取多个菱形的等距布局位置坐标集
  + [x] getIsometricRhombusInfoByPos 根据任意点&原点&单瓦片尺寸，取得瓦片的等距二维坐标及渲染坐标
  + [ ] pathfinding - 待实现
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
const { shapes, pathFinding, ... } = qtiled;
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

## 备注

目前还只是静态方法库，希望能带来些许便利，有相应问题请随时反馈。


