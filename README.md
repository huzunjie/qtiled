# QTiled

这是一套Tiled布局基础库，目前还在雏形状态。


## 安装引用

鉴于大家各自的业务构建场景的不同，可以从以下两种引用方式中选择适合自己的方案：

1 . 将lib目录下适合的打包文件放入业务目录中，直接引用JS:

```html
<script src="xxx.js"></script>
<script>
const {
  getUnitsByRowCol,
  unit2pixel,
  getNeighbourUnitsByRowCol,
  unit2rhombusPixel,
  searchPath,
  getDiagonalUnitsByRowCol,
  getUnitsByDiagonal,
  rotateUnit,
  getStaggeredUnitsByRowCol,
  pixel2unit,
  rhombusPixel2unit
} = qtiled;
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


