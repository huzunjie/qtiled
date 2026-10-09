# 平地地图校验与实体消费

`src/maps/index.js` 是可选源码入口，提供 `validateMapDefinition` 与 `resolveMapEntities`。不加入核心导出，尚无地图导入导出、空间索引或场景渲染。A2 校验已通过 95 项定向 Jest 用例和全量回归（19 suites / 581 tests）；A3 静态实体消费已通过 28 项专项用例，本轮全量回归为 20 suites / 609 tests。

## 测试验证

[地图定义用例](../__tests__/map-definition.test.js) 覆盖二维矩阵、无效格、必需属性、素材引用与类别、实体姿态、错误路径及修正恢复；同时检查数组空洞、undefined、NaN、无穷数和安全整数等 JavaScript 输入边界，以及冻结输入不被修改、可选字段不被自动补齐。

运行 `npm test -- --runInBand __tests__/map-definition.test.js` 执行定向测试，运行 `npm test -- --runInBand` 执行全量回归。测试内定义样本，不依赖本机 output 文件或浏览器。数据校验 Demo 已按用户要求撤回。

## 源码使用

```js
import { validateMapDefinition } from '../src/maps/index';

const map = {
  version: 1,
  id: 'first-map',
  tileSize: [80, 40],
  cells: [[{ terrain: 'land', elevation: 0 }, null]],
  entities: [],
};
const issues = validateMapDefinition(map); // 合法输入返回 []
```

## 数据约定

- `cells[y][x]` 是从 0 开始的世界格坐标；各行非空且等宽，不接受数组空洞，至少有一个有效格。`null` 表示无效格，有效格必须是对象。
- cell 的 `terrain` 为非空地形标识，`elevation` 必须为数字 0。可选 `tile` 是底图元素 ID，省略表示未贴图；旧的 0/字符串格值不再接受。
- 地形标识和底图素材引用分开。换底图不自动改变地形，校验通过不表示已解析地形玩法规则。
- `entities` 是实例数组，每项为 `{ id, element, grid, angle? }`。实例 ID 在地图内唯一；grid 是两个安全整数，可以为负数；省略 angle 表示 0°，显式提供时只能为数字 0/90/180/270。
- version 必须为数字 1，地图 id 为非空字符串，tileSize 是两个有限正数，允许小数和非 2:1 比例。
- 附加字段保持原样，但不会启用未定义的能力；cell 内的 x/y、entities 不作为坐标或实例来源。

## 素材引用与检查边界

有素材引用时，调用 `validateMapDefinition(map, elementsById)`。元素库由调用方准备，值须预先通过 `validateElementDefinition`，键须与定义 id 一致；此函数不访问图片、文件或网络。

cell.tile 必须引用 `kind: 'tile'` 且 footprint 恰为 `[[0,0]]` 的元素；entity.element 必须引用 `kind: 'sprite'` 的元素。未引用的库项不影响结果，不重复检查图片裁切和尺寸。

问题列表每项为 `{ path, code, message }`，例如 `cells[0][1].terrain` 或 `entities[1].element`。先检查顶层字段，再按行列检查 cells，最后检查实体；父结构非法时跳过相应子检查。失败不修改输入，不补默认字段，不生成半有效地图。

本函数只检查当前平地格式及素材引用。同格多个实例、实体占地越界或重叠不在此处判断；完整占地和共存规则由后续放置检查负责。通行、可建造、风水及五行结果也不由本函数生成。

## 实体消费

[专项用例](../__tests__/map-entities.test.js) 覆盖 20 格双实例、16 种镜头/对象组合、既有矩形放置结果的重新消费、完整不规则占地、失败恢复与冻结输入。运行 `npm test -- --runInBand __tests__/map-entities.test.js`。当前消费 P0 静态定义，不包含动画片段选择、时钟或动态地块绘制。

`resolveMapEntities(map, elementsById = {}, view = {})` 先调用上述校验器。成功返回 `{ entities: [...], issues: [] }`；地图无效时返回 `{ entities: null, issues }`，问题路径和代码与校验器一致，不产生部分结果。合法的空实体集合返回 `entities: []`。

元素库须先通过 P0 元素校验。此函数直接引用纯计算的 `element-preview/draw`，不引入 SpriteJS、图片加载或浏览器 API。`view` 仅消费镜头 `angle`（缺省 0）和 `originPixel`（缺省 `[0,0]`）；瓦片尺寸始终来自地图，不消费额外的 `view.tileSize`。每个实体的投影沿用 P0 参数约定，非法镜头参数由既有绘制函数抛错。

```js
import { resolveMapEntities } from '../src/maps/index';

// map 和元素库已由调用方准备，库内定义已通过 P0 校验。
const result = resolveMapEntities(map, elementsById, {
  angle: 90,
  originPixel: [320, 240],
});
// result.issues 为空后消费 result.entities；以下描述不是保存格式。
// { id: 'dog-a', element: 'sculpture-dog-preview',
//   grid: [1,1], angle: 0, draw: { ... } }
```

每项只包含实例 `id`、素材引用 `element`、定义原点世界格 `grid`、对象 `angle` 和 `draw`。`draw` 沿用 [元素绘制结果](element-preview.md#绘制计算)：其中 `id` 为元素 ID，`angle` 为镜头角度，`objectAngle` 为对象朝向，`imageAngle` 决定素材槽；`footprint` 给出全部 `{grid,position}`。同一元素可产生多个独立实例，顺序与输入一致，不代表遮挡画序。返回的数组不与输入或其他实例共享可修改状态；不回写缺省 angle，不复制附加业务字段到派生结果。

实体的 `grid` 已是定义原点，读取或转镜头直接传入 `resolveElementDraw`，不再调用 `resolveElementPlacement`。切镜头仅更新投影和素材槽。新放置/对象转向时，调用方先用既有矩形放置函数计算配套 `grid/objectAngle`，再将它们作为实体 `grid/angle`；地图编辑命令留给后续切片。

完整 footprint 不裁剪到 cells：原点在占地外、界外占地、同格多个实例及明确姿态的不规则占地均可派生。A4 再按有效格和场景共存规则判断是否合法。本片不计算 cell.tile 的绘制结果、不创建空间索引或场景节点。
