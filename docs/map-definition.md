# 平地地图校验、实体消费、占地索引与编辑命令

`src/maps/index.js` 是可选源码入口，提供 `validateMapDefinition`、`resolveMapEntities`、`buildMapOccupancy`、`checkMapEntityPlacement` 与 `applyMapEdit`。不加入核心导出，模块不包含导入导出或场景渲染。A2 校验已通过 95 项定向 Jest 用例和全量回归（19 suites / 581 tests）；A3 静态实体消费已通过 28 项专项用例，对应全量回归为 20 suites / 609 tests。下方 C0 Demo 消费前两个函数；历史数字不代替新改动验收。

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

本函数只检查当前平地格式及素材引用。同格多个实例、实体占地越界或重叠不在此处判断；完整占地和共存规则由下述 A4 接口负责。通行、可建造、风水及五行结果也不由本函数生成。

## 实体消费

[专项用例](../__tests__/map-entities.test.js) 覆盖 20 格双实例、16 种镜头/对象组合、既有矩形放置结果的重新消费、完整不规则占地、失败恢复与冻结输入。运行 `npm test -- --runInBand __tests__/map-entities.test.js`。当前消费 P0 静态定义，不包含动画片段选择、时钟或动态地块绘制。

`resolveMapEntities(map, elementsById = {}, view = {})` 先调用上述校验器。成功返回 `{ entities: [...], issues: [] }`；地图无效时返回 `{ entities: null, issues }`，问题路径和代码与校验器一致，不产生部分结果。合法的空实体集合返回 `entities: []`。

元素库须先通过 P0 元素校验。此函数直接引用纯计算的 `element-rendering/draw`，不引入 SpriteJS、图片加载或浏览器 API。`view` 仅消费镜头 `angle`（缺省 0）和 `originPixel`（缺省 `[0,0]`）；瓦片尺寸始终来自地图，不消费额外的 `view.tileSize`。每个实体的投影沿用 P0 参数约定，非法镜头参数由既有绘制函数抛错。

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

每项只包含实例 `id`、素材引用 `element`、定义原点世界格 `grid`、对象 `angle` 和 `draw`。`draw` 沿用 [元素绘制结果](element-rendering.md#绘制计算)：其中 `id` 为元素 ID，`angle` 为镜头角度，`objectAngle` 为对象朝向，`imageAngle` 决定素材槽；`footprint` 给出全部 `{grid,position}`。同一元素可产生多个独立实例，顺序与输入一致，不代表遮挡画序。返回的数组不与输入或其他实例共享可修改状态；不回写缺省 angle，不复制附加业务字段到派生结果。

实体的 `grid` 已是定义原点，读取或转镜头直接传入 `resolveElementDraw`，不再调用 `resolveElementPlacement`。切镜头仅更新投影和素材槽。新放置/对象转向时，调用方先用既有矩形放置函数计算配套 `grid/objectAngle`，再将它们作为实体 `grid/angle`；下述编辑命令接收已经确定姿态的新实体，不提供转向命令。

完整 footprint 不裁剪到 cells：原点在占地外、界外占地、同格多个实例及明确姿态的不规则占地均可派生。A4 再按有效格和场景共存规则判断是否合法。`resolveMapEntities` 不计算 cell.tile 的绘制结果、不创建空间索引或场景节点。

## 完整占地与按格索引

[占地与候选检查用例](../__tests__/map-occupancy.test.js) 共 31 项，与 A2/A3 合计 3 suites / 154 tests 通过。复跑命令：`npm test -- --runInBand __tests__/map-definition.test.js __tests__/map-entities.test.js __tests__/map-occupancy.test.js`。本片按确认范围执行定向验收，未跑全量、构建或浏览器；ESLint 不可用，未执行。

`buildMapOccupancy(map, elementsById = {}, canCoexist = () => true)` 先复用 A2 校验，再用与绘制相同的 `rotateGridPoint`、`getIsometricNeighborsByOffsets` 计算完整世界占地。没有镜头输入，也不投影像素或重新定位原点。元素库仍须先通过元素契约校验；占地必须非空且不重复，计算所得世界格须为安全整数。

逐格检查矩阵边界与 null 无效格，保留每一个失败格的诊断；不会裁切占地或把包围盒内的空洞补成占地。定义原点不代表实际占地：原点位于矩阵外或 null 格，但全部占地有效时可以通过。合法姿态的不规则占地可以检查；新对象如何原地转向仍由既有放置规则负责。

成功返回 `{ index, issues: [] }`，`index` 是 `Map<string, string[]>`。键为世界坐标的 `"x,y"`，值为该格关联的唯一实例 ID 列表；只索引实体实际占地，cell.tile 不产生实例。格键遍历顺序按输入实体及其 footprint 顺序首次插入，同格 ID 按 `map.entities` 输入顺序排列，不排序 ID、不依赖镜头或像素画序。输入实体换序会相应改变查询顺序。有效空地图得到空 Map；任一错误返回 `{ index: null, issues }`，不暴露部分索引。

```js
import { buildMapOccupancy, checkMapEntityPlacement } from '../src/maps/index';

// map、elementsById 已准备；这里的容量仅为调用方场景规则示例。
const canCoexist = ({ entities }) => entities.length <= 2;
const result = buildMapOccupancy(map, elementsById, canCoexist);
if (!result.issues.length) {
  const grid = [1, 1];
  const ids = result.index.get(grid.join(',')) || [];
  // ids 按地图实例顺序列出，可再通过实例 ID 查询地图事实。
}

const candidate = { id: 'dog-new', element: 'sculpture-dog-preview', grid: [1, 1] };
const placement = checkMapEntityPlacement(map, candidate, elementsById, canCoexist);
// placement 为 { allowed, issues }，不写入 map.entities。
```

索引只属于本次计算，是派生快照，不写入地图 JSON；函数不缓存、不接收或更新旧索引。修改事实后重新构建并在成功时替换调用方保存的索引。同格删除一个实例后，其他实例引用按原顺序保留。返回的 Map/数组由调用方持有，可修改，但不会影响输入、其他格或后续重建。

### 场景共存规则与候选检查

缺省规则允许所有几何有效的同格共存；这只表示通用占地检查通过，不代表某种游戏的建造、通行、接路或风水规则通过。传入 `() => false` 可拒绝全部同格共存，或根据实例 ID/元素 ID 和外部场景配置实现选择性规则，不要求给地图添加游戏分类字段。

几何全部通过后，每个至少含两个实例的共享格调用一次 `canCoexist({ grid, entities })`。`entities` 是该格的完整实例集合，按输入顺序提供 `{ id, element, grid, angle }`；缺省对象角度归一为 0，附加业务字段不复制。回调可检查三实例容量等集合条件，不局限于两两比较；规则应为确定性的纯函数。调用时传入独立副本，修改参数不会改动地图或本次索引。单实例格不调用共存规则，地形条件不在此回调职责内。

规则须同步返回 `true` 或 `false`；`false` 记录具体冲突格及全部关联 ID。非函数、非布尔结果（包括 Promise）抛出 TypeError；规则自己抛出的错误直接向上传递。不吞掉调用方程序错误，也不发布部分索引。外部闭包的副作用由调用方负责。

`checkMapEntityPlacement(map, entity, elementsById = {}, canCoexist = () => true)` 把候选临时追加到实例数组，复用上述整图检查，返回 `{ allowed, issues }`。它检查新增后的整个场景，已有非法占地或共存冲突也会拒绝新增。候选必须有新 ID；与已有 ID 相同得到 A2 的 `duplicate-entity-id`，不会被当成移动/替换。候选问题路径为追加后的 `entities[n]`，n 是原实例数量。返回成功也不会修改事实或已有索引，编辑命令属于 A5。

问题列表继续使用 `{ path, code, message }`，A2 结构错误原样返回。A4 的几何问题追加 `entityId`、世界 `grid`，路径指向对应 `entities[n]`，代码为 `unsafe-footprint-grid`、`footprint-out-of-bounds` 或 `footprint-invalid-cell`；共存问题使用 `coexistence-rejected`，路径指向 `cells[y][x]`，追加 `grid` 和按查询顺序排列的 `entityIds`。几何错误按实体/占地顺序报告，存在几何错误时不执行共存回调；共存错误按格键顺序报告。修正事实或规则后重新调用即可恢复。

## 单条放置与删除

[编辑命令用例](../__tests__/map-edit.test.js) 新增 27 项，覆盖连续编辑、拒绝后重试、删除保留、输入与旧索引不变、共享引用边界及规则异常。A2/A3/A4/A5 定向回归共 4 suites / 181 tests 通过；完整调用例已独立执行。复跑：`npm test -- --runInBand __tests__/map-definition.test.js __tests__/map-entities.test.js __tests__/map-occupancy.test.js __tests__/map-edit.test.js`。

`applyMapEdit(map, command, elementsById = {}, canCoexist = () => true)` 一次执行一条命令：

- `{ type: 'place', entity }`：追加一个完整实例，已有 ID 返回 `duplicate-entity-id`，不会替换或移动原实体。
- `{ type: 'remove', id }`：按唯一实例 ID 删除一个实体，保持剩余实体及同格索引 ID 的相对顺序。删除不存在的 ID 返回 `missing-entity`，包括空地图和重复删除。

成功返回 `{ definition, index, issues: [] }`。`definition` 是编辑后的完整地图，`index` 是与之配套的完整 A4 占用索引；调用方只在成功时一次替换保存的整个结果。失败返回 `{ definition: null, index: null, issues }`，不提供部分事实或索引。不接收或修改之前的索引，不保存内部状态，不自动生成 ID。

处理顺序与错误边界：

1. 先用 A2 检查原地图结构和引用。错误原样返回，即使本次要删除的就是错误实例，也不会绕过检查或消除重复 ID。
2. 再检查命令。非对象（含 null、数组、未传）返回 `$command / invalid-map-edit`；未知或缺少 type 返回 `$command.type / unsupported-map-edit`；删除 ID 不是非空字符串时返回 `$command.id / invalid-id`，找不到则为 `$command.id / missing-entity`。命令附加字段不启用其他能力。
3. 构造编辑后实体集合，只调用一次 `buildMapOccupancy`，复用结构、引用、完整占地与共存检查。放置候选问题沿用追加后的 `entities[n]` 路径，删除后问题使用剩余数组的新下标。存在任何几何错误时不运行规则；每个共享格仅运行一次规则。已有占地/共存冲突会拒绝放置，删除可消除被删实体造成的冲突；剩余场景仍有问题则整条删除失败。
4. `canCoexist` 的类型、同步布尔值要求及异常传递沿用 A4；非函数或非布尔结果抛出 TypeError，回调自身异常原样抛出。不将程序错误包装为 issues。前面的结构或命令错误会先返回，规则不会执行。

函数不写入原地图、输入实体或元素库。成功时复制地图外壳、`entities` 数组、每个实体对象和各自的 `grid` 数组；缺省 angle 保持省略，附加字段保留。`cells`（含行和格对象）、`tileSize`、地图及实体的附加嵌套字段与输入共享，须按只读值使用，不承诺通用深拷贝。索引 Map 及每格 ID 数组为本次新建。直接修改返回的实体姿态或索引不会改动输入，但会使这一结果内事实和索引失配；应再次调用命令得到完整新结果。回调参数仍为 A4 的独立姿态副本，外部闭包副作用由调用方负责。

下面是无需图片加载的完整调用例；`views` 满足静态元素格式，地图命令只使用其占地。三次调用分别完成放置、删除及同 ID/位置重放，各次失败均可保留前一个有效结果后修正重试。

```js
import { applyMapEdit } from '../src/maps/index';

const elementsById = {
  marker: {
    version: 1, id: 'marker', kind: 'sprite', footprint: [[0, 0], [1, 0]],
    views: Object.fromEntries([0, 90, 180, 270].map(angle => [angle, {
      source: 'marker.png', rect: [0, 0, 80, 80], anchor: [40, 60],
    }])),
  },
};
const initialMap = {
  version: 1, id: 'edit-example', tileSize: [80, 40],
  cells: [[{ terrain: 'land', elevation: 0 }, { terrain: 'land', elevation: 0 }]],
  entities: [],
};
const entity = { id: 'marker-a', element: 'marker', grid: [0, 0] };
const placed = applyMapEdit(initialMap, { type: 'place', entity }, elementsById);
if (placed.issues.length) throw new Error(JSON.stringify(placed.issues));

const removed = applyMapEdit(placed.definition, { type: 'remove', id: entity.id }, elementsById);
if (removed.issues.length) throw new Error(JSON.stringify(removed.issues));

const replayed = applyMapEdit(removed.definition, { type: 'place', entity }, elementsById);
if (replayed.issues.length) throw new Error(JSON.stringify(replayed.issues));
// initialMap.entities 仍为空；removed.index 为空。
// replayed.index: Map { '0,0' => ['marker-a'], '1,0' => ['marker-a'] }
```

本接口不包含批量事务、移动/旋转、撤销重做、增量索引、文件往返或编辑 UI。

## 静态地图浏览 Demo

[P1-C-0 浏览页](../demo/map-preview.html) 已通过本片验收：新增 10 项用例，定向 59 项、全量 21 suites / 619 tests 通过；Demo 构建与真实浏览器四向选择、失败恢复、窄窗口滚动命中通过。ESLint 本机不可用，未执行。先运行 `npm run debug`，再运行 `npm run dev` 并打开 `http://localhost:8033/demo/map-preview.html`；也可将整个 demo 目录交给静态 HTTP 服务。新增 `qtiled-maps.dev.js` 仅是 Demo 构建入口，不代表已提供正式包或 npm 子路径。

页面独立读取 [地图 JSON](../demo/static/map-samples/first-static-map.json)、共享的 [狗元素定义](../demo/static/element-samples/dog/element.json) 及其四张 PNG；不读取 output、本地编辑器状态或浏览器存储。样本为 4 行 6 列、20 个 land/0 有效格、四个 null 空角，dog-a / dog-b 共用一个静态 v1 定义，各占四格。格距仍为现有 80×40 工作参数，不增加原作标定结论。

加载链为 `loadElementSources` → `validateElementDefinition` → `resolveMapEntities`（内部调用 `validateMapDefinition`）。共享解析器成功后页面才访问 cells，不重复前置校验。图片必须全部加载且元素/地图校验成功才显示；失败撤下当前场景、清空信息并显示字段/资源原因，修复后“重新加载”会重新读取 JSON 与图片。重载期间禁用查看控件，以请求编号隔离较早的异步结果。

画格、反查、边界计算分别复用现有 `getVertexes` / `projectGrid`、`pickGrid` / `getPointerPosition`、`getBounds`。每个实体以独立 SpriteJS Group 作为 `renderElement` 的容器，因此不会互相覆盖；整个新场景组建完成后替换旧组。固定双实例按占地投影最下端由远到近绘制。此画序只服务本样本，未实现通用复杂遮挡。

场景在零原点下解析一次，由根 Group 统一平移到画布内；点击反查使用同一平移作为 originPixel。加载和切镜头重建场景，点选和切换查看方式只更新高亮组与信息，不重新校验、投影或创建实体节点。狗样本资源配置复用 `demo/static/js/dog-element-sample.js`。

镜头 0/90/180/270° 只改变投影、画序及素材槽；实例 grid、angle 和全部世界占地保持不变，读取时不重新调用放置计算。“点击查看”选择“格子属性”时查看坐标/属性；选择“雕塑信息”时，点击雕塑脚下的格子，按反查格匹配全部 footprint 并高亮完整占地。选择保持为世界格/实例 ID，切镜头后仍查看同一对象。空角显示 null，矩阵外显示界外；按地面格选择，不提供像素透明度或遮挡命中。

本片只浏览固定无底图样本，画布 640×440 原尺寸显示，窄窗口内滚动。右栏与左侧画布区域等高，详情局部滚动，变化字段预留空间，点选不会撑高页面或改变滚动位置。任意素材库/地图导入、cell.tile 绘制、完整占地有效性与共存、空间索引、放置删除保存和正式消费入口留给后续切片。C0 不计为 C1、L1 全验收或地图编辑完成。
