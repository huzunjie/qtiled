# 元素定义：静态图片与共享动画

本契约使元素编辑器与独立预览消费同一份数据。本页介绍定义校验和 JSON 导入；不可变编辑与校验后导出见[元素编辑工具](element-editor.md)。纯数据模块不加载图片、不绘制，也不解释游戏规则。

可选源码入口为 `src/elements/index.js`，没有从核心 `src/index.js` 导出，没有 DOM 或 SpriteJS 依赖。浏览器通过可选元素绘制包使用同一组函数，打包与加载见[正式产物消费](browser-consumption.md)。

## 数据格式

```json
{
  "version": 1,
  "id": "example-sprite",
  "kind": "sprite",
  "footprint": [[0, 0], [1, 0], [0, 1], [1, 1]],
  "views": {
    "0": { "source": "images/view-0.png", "rect": [0, 0, 158, 110], "anchor": [79, 90] },
    "90": { "source": "images/view-90.png", "rect": [0, 0, 158, 110], "anchor": [79, 90] },
    "180": { "source": "images/view-180.png", "rect": [0, 0, 158, 126], "anchor": [79, 106] },
    "270": { "source": "images/view-270.png", "rect": [0, 0, 158, 125], "anchor": [79, 105] }
  }
}
```

上例是契约演示，尺寸、占地和锚点不代表已经完成某个原作素材的视觉校准。

| 字段 | 约定 |
|---|---|
| `version` | 数字 `1` 为静态格式，数字 `2` 允许共享帧序列；导入不自动升级或转换字符串版本 |
| `id` | 非空字符串，不能全部为空白；由内容作者保持稳定，不从文件名猜测 |
| `kind` | `tile`（地块）或 `sprite`（精灵）；不引入住宅等游戏类别 |
| `footprint` | 非空且无重复的整数坐标对，表示相对逻辑原点的占地；允许负坐标、不规则形状及不包含原点，不排序或重新居中 |
| `views` | 对象，恰好使用 `0`、`90`、`180`、`270` 四个键；不接受缺向或其他角度 |
| `source` | 使用 `/` 分隔的相对图片文件路径；不接受绝对路径、协议/盘符、反斜杠、空路径段及 `.`、`..` 路径段；中文和空格可保留 |
| `rect` | `[x, y, width, height]`，整数像素；起点非负，宽高为正，矩形完全位于实际图片内；贴边有效 |
| `anchor` | `[x, y]`，相对裁切区域左上角的像素位置，对应元素逻辑原点；允许小数、负数及位于裁切区域之外 |

每个视图必须显式配置。不同视图可以显式引用同一图片与裁切，并各自保留不同锚点；是否确实可复用由作者确认，校验器不自动复制、镜像或推断方向。

图片外框不等于逻辑瓦片尺寸，也不能证明占地。`0/90/180/270` 是工具的视图槽，不因文件名含 `01/02/03/04` 就认定原作的罗盘方向。

未定义的附加字段会被保留，但不参与校验或作为已支持的能力；`views` 的角度键仍按上表限制。

### 共享动画（v2）

需要动画时使用 `version: 2`，同一份有序帧只写入 `sequences` 一次，各方向显式引用序列并保留自己的锚点：

```json
{
  "version": 2,
  "id": "water-example",
  "kind": "tile",
  "footprint": [[0, 0]],
  "sequences": {
    "water": {
      "frames": [
        { "source": "water.png", "rect": [0, 0, 78, 40] },
        { "source": "water.png", "rect": [78, 0, 78, 40] }
      ],
      "frameDurationMs": 100,
      "timingSource": "author"
    }
  },
  "views": {
    "0": { "sequence": "water", "anchor": [39, 20] },
    "90": { "sequence": "water", "anchor": [39, 20] },
    "180": { "sequence": "water", "anchor": [39, 20] },
    "270": { "sequence": "water", "anchor": [39, 20] }
  }
}
```

上例只演示格式。实际水面样本的每组序列有 24 帧，帧序由资源证据提供；`100ms` 是本工具作者选择的预览时长，不是原作实际帧率。

| 字段 | 约定 |
|---|---|
| `sequences` | v2 可选的名称 → 序列对象；名称非空；每个已声明序列都要完整校验，即使尚未被方向引用 |
| `frames` | 非空有序数组；每帧显式给出 `source`、`rect`，沿用静态素材的资源存在、实际尺寸与裁切校验；不由文件名或相邻图号生成帧 |
| `frameDurationMs` | 全序列统一的每帧时长，正安全整数毫秒；没有默认值或 SG 速度编号换算 |
| `timingSource` | 本版仅接受 `author`，表示作者设置；不把原作 `timeGetTime > 60` 的局部门槛当成固定每帧时长 |
| `views[angle].sequence` | 引用显式存在的序列，与该方向的 `source` / `rect` 二选一；同一定义可混用静态方向与序列方向 |
| `views[angle].anchor` | 仍是该方向自己的锚点，适用于该方向所有帧；共用序列不合并锚点，也不改变占地 |

v1 的定义、附加字段及静态选图保持兼容。v1 中同名的历史附加字段不会被解读成动画；只有显式 v2 才解释 `sequences` / `sequence`。动画在循环中只改变选中的图片和裁切，不将当前帧或播放器时间写回定义；本版没有动作状态机、逐帧锚点或业务状态映射。

### 静态方向共用

[元素编辑器](../demo/element-editor.html) 的“方向共用”将当前素材槽的 `source` 和 `rect` 一次应用到所选方向，显示本次目标以及当前同图同裁切的方向。各方向 `anchor` 保持原值；操作后可单独换图、改裁切或调整锚点，其他方向不联动。这里的目标是素材方向，当前素材槽仍由镜头与对象朝向共同确定。

操作复用 `applyElementEdit`，对每个目标分别复制裁切数组。导出仍使用 `version: 1` 和完整四个 `views`，不增加持久关联、继承或共用标记。单图四向、部分共用、四向独立都使用同一校验、导入和导出路径；当前图片未加载或裁切非法时不能批量应用。

共用素材不会取消对象朝向，也不改变占地旋转。保存后的定义同时供元素预览和地图实体消费者使用，具体选图与几何职责见[共用素材的方向选择](element-rendering.md#共用素材的方向选择)。

在 v2 中，同一批量操作复制当前 `sequence` 引用并保留目标方向锚点。修改共享序列的一帧会影响所有引用它的方向；将某一方向转成静态图片只替换该方向的绑定，原序列仍保留供其他方向使用。

## 交付给绘制方的参数

一份可复用的素材需要原始图片、元素 JSON 和**标定时使用的逻辑瓦片尺寸**。当前 JSON 不携带瓦片尺寸，交付说明需另外记录；编辑器和独立预览由使用者手动设置相同尺寸。修改过预览瓦片宽高的素材，应记录实际标定值，不能从图片外框或占地行列推断。

| 信息 | 由谁提供 / 如何使用 |
|---|---|
| 图片、占地、四向裁切和像素锚点 | 素材交付方提供图片与 JSON；绘制方按相对路径加载，不缩放原图或自动换算 anchor |
| 标定瓦片尺寸 | 素材交付说明提供，绘制方显式传入 `view.tileSize`；当前狗样本使用 `[80,40]` |
| 对象位置与朝向 | 消费者保存 `{grid, objectAngle}`；矩形放置/转向时通过 `resolveElementPlacement` 求姿态，转镜头时复用姿态 |
| 镜头与画布原点 | 消费者提供 `view.angle` 和 `originPixel`；复现相同绝对绘制坐标时，两者及对象姿态也需一致 |
| 界面缩放与不透明度 | 仅为显示状态，不写入元素定义，也不替代标定尺寸 |

通用绘制/投影函数的缺省 `tileSize` 是 `[8,4]`，不会从定义中识别出 Demo 的 `[80,40]`。独立消费者必须显式传入素材的标定尺寸。单独改变 `tileSize` 会改变网格间距，但图片裁切和像素 anchor 保持原值，因此它不是界面缩放；查看同一标定结果的不同大小，应缩放整个预览。调用顺序见[静态素材预览](element-rendering.md#放置对象朝向与镜头)。

这些参数足以明确当前工具的复现条件，不代表原作参数已经核实。当前采用说明文件交付尺寸，尚未提供自动携带或恢复标定尺寸的导入导出格式。

## 接口

```js
import { validateElementDefinition, importElementDefinition } from './src/elements';

// 由调用方根据已读取的图片提供实际尺寸，不从 definition 里的裁切范围推导。
const sourceInfo = {
  'images/view-0.png': { width: 158, height: 110 },
  'images/view-90.png': { width: 158, height: 110 },
  'images/view-180.png': { width: 158, height: 126 },
  'images/view-270.png': { width: 158, height: 125 },
};

const issues = validateElementDefinition(definition, sourceInfo);
const result = importElementDefinition(jsonText, sourceInfo);
// 成功：{ definition: 解析后的对象, issues: [] }
// 失败：{ definition: null, issues: [{ path, code, message }, ...] }
```

以上为仓库源码/构建环境的引用示意，不是当前发布包的新增命名空间。

`validateElementDefinition()` 不修改任何输入。源信息省略时默认为空对象，引用的图片报告缺失；它不读取文件、访问网络或判断图片方向的真实性。

`importElementDefinition()` 只接收 JSON 文本。解析错误返回 `invalid-json`；解析成功后调用同一校验函数。通过时返回原样解析的对象，不补字段、不删附加数据，也不改变坐标、路径或数值。失败不返回部分有效的元素。

`applyElementEdit(definition, { field, value, angle })` 继续允许暂时不合法的草稿。静态 `footprint/source/rect/anchor` 编辑规则不变；`field: 'sequences'` 深复制传入的序列数据并显式设置 v2，`field: 'sequence'` 给指定方向绑定序列并删除该方向的 `source/rect`。在 v2 中编辑方向的 `source/rect` 会移除 `sequence` 绑定；如需编辑序列的当前帧，应先修改 `sequences` 中该帧再整体应用，不能把它误当成静态方向换图。上述操作均保留各向锚点及未修改分支。

`exportElementDefinition()` 统一校验完整 v1 / v2 定义；有任何缺帧、缺资源或非法时长时返回 `json: null`。成功返回带结尾换行的 JSON；导出不保存暂停、当前时间、当前帧或选中的编辑槽。

### 问题定位

每个问题为 `{ path, code, message }`，例如：

```json
{ "path": "views.90.rect", "code": "rect-out-of-bounds", "message": "裁切矩形超出图片实际尺寸。" }
```

`path` 指向定义中的字段，根对象或 JSON 解析问题使用 `$`；占地项使用 `footprint[2]`。无法继续读取的父对象报告父级问题，其余可检查字段继续收集问题。

错误码包括：`invalid-json`、`invalid-definition`、`unsupported-version`、`invalid-id`、`invalid-kind`、`invalid-footprint`、`invalid-grid`、`duplicate-grid`、`invalid-views`、`invalid-view-angle`、`invalid-view`、`invalid-source-path`、`missing-source`、`invalid-source-size`、`invalid-rect`、`rect-out-of-bounds`、`invalid-anchor`。调用方按错误码处理，中文说明用于显示。

v2 增加 `invalid-sequences`、`invalid-sequence-id`、`invalid-sequence`、`invalid-frames`、`invalid-frame`、`invalid-frame-duration`、`invalid-timing-source`、`mixed-view-binding`、`invalid-sequence-reference`、`missing-sequence`。例如缺失第二帧定位为 `sequences.water.frames[1]`，该帧越界则定位为 `sequences.water.frames[1].rect`。

## 职责边界与配套能力

校验和读取保证：同一份完整定义能被校验和读取，非法定义能定位问题，并保持核心入口无新增依赖。通过契约校验不等于原作方向、占地、锚点已校准。

配套能力：[四向视图](isometric-view.md)、[素材预览](element-rendering.md)、[编辑与导出](element-editor.md)。各自维持独立职责。
