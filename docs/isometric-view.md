# P0-B：平地四向视图

世界坐标、元素逻辑占地与视图方向分开保存。切向只改变显示坐标，不旋转或重新居中保存的占地。

P0-B 源码、Demo、开发构建、自动化测试及真实浏览器检查已完成，后续 P0-C 已复用这些坐标能力。

## 核心：固定原点旋转

```js
import { shapes } from '../src';
shapes.polygon.rotateGridPoint([2, -1], 1); // [1, 2]
```

`rotateGridPoint(grid = [0, 0], quarterTurns = 0)` 绕固定 `[0,0]` 旋转，返回新坐标对。`grid` 使用有限数值，允许负数和小数；`quarterTurns` 是有限整数，每单位为 90°，支持负数与累计多圈。正方向以逻辑 X 向右、Y 向下定义，依次为：

| 次数（模 4） | 输出 |
|---|---|
| 0 | `[x, y]` |
| 1 | `[-y, x]` |
| 2 | `[-x, -y]` |
| 3 | `[y, -x]` |

0 次与 4 次均保留原坐标的位置，不修改输入，不产生负零。它不接收错列网格下标。原有 `rotateSelectionOffsets()` 继续负责选区旋转与中心锚定，行为不变。

## 可选入口：投影与反查

```js
import { projectGrid, pickGrid } from '../src/isometric-view';

const view = { angle: 90, tileSize: [60, 30], originPixel: [380, 260] };
const pixel = projectGrid([2, -1], view); // [470, 275]
pickGrid(pixel, view); // [2, -1]
```

两者由可选入口导出，不进入核心 `src/index.js`。不依赖 DOM、图片或 SpriteJS。独立浏览器项目可使用正式文件 `dist/qtiled-view.umd.js`，详见[正式产物消费](browser-consumption.md)。

| 参数 / 返回 | 约定 |
|---|---|
| `view.angle` | 数字 `0/90/180/270`，默认 `0`；其他值抛出 `RangeError`，不自动归一化或猜测方向 |
| `view.tileSize` | `[width, height]`，默认 `[8,4]`；调用方提供有限正数，与素材外框尺寸无关 |
| `view.originPixel` | 世界原点在画布内的有限像素坐标，默认 `[0,0]` |
| `projectGrid(grid, view)` | 世界坐标 → 瓦片中心像素 `[pixelX,pixelY]`；默认格 `[0,0]`，可投影小数连续位置 |
| `pickGrid(pixel, view)` | 画布像素 → 世界整数格 `[gridX,gridY]`；默认像素 `[0,0]` |

调用链：`projectGrid` → `rotateGridPoint` → `getIsometricPosition`；`pickGrid` → `getIsometricInfoByPos` → 逆向 `rotateGridPoint`。沿用现有等距坐标轴：0° 时世界 X 增大指向屏幕右上，世界 Y 增大指向右下。增加 angle 表示世界点在视图中正向旋转，不表示原作罗盘方向。

输入需满足上述数值前提，不做字符串转换、自动补值或地图范围裁剪。除视图角度外不新增通用参数校验。共边与共点沿用既有 `Math.round` 归属规则，四向在边界上可能选到不同一侧；格内点和中心点保证正反查一致。这里只处理海拔 0，不处理坡面、遮挡、图片像素命中或地图实体选择。

占地显示先把定义里的偏移加到元素世界原点，再逐格投影：

```js
const worldCells = shapes.rhombus.getIsometricNeighborsByOffsets(elementGrid, definition.footprint);
const positions = worldCells.map(grid => projectGrid(grid, view));
```

不要先把 `definition.footprint` 用选区旋转函数重新居中，也不要把上次的视图结果写回世界数据。

## 几何 Demo

[四向视图与占地](../demo/isometric-view.html) 使用现有 SpriteJS，显示带负坐标的世界网格、3×2 或 L 形占地、世界原点和元素逻辑原点。点击选择后切向，右侧世界格保持不变，投影像素随方向变化。可选择不同瓦片尺寸，包括非 2:1 比例。

`npm run dev` 监听核心及可选 Demo 模块，打开 `http://localhost:8033/demo/isometric-view.html`。也可先运行 `npm run debug` 生成 Demo 包，再使用本地静态服务打开页面。可选视图 Demo 包为 `demo/static/js/qtiled-view.dev.js`，浏览器命名空间为 `qtiledView`。独立消费者使用 `npm run optional` 生成的正式 UMD 文件。

本页与静态素材 Demo 共用 `demo/static/css/preview-workspace.css`：信息栏始终在画布右侧，正文 12px；空间不足时在画布区域内滚动，保持绘制尺寸和鼠标坐标比例。

P0-B 不加载原作图片、不编辑元素定义；P0-C 将沿用这些坐标函数接入素材、裁切和像素锚点。
