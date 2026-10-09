# 静态元素定义（P0-A）

本契约使元素编辑器与独立预览消费同一份数据。本页介绍 P0-A 的定义校验和 JSON 导入；P0-D 增加的不可变编辑与校验后导出见[元素编辑工具](element-editor.md)。纯数据模块不加载图片、不绘制，也不解释游戏规则。

可选源码入口为 `src/elements/index.js`，没有从核心 `src/index.js` 导出，没有 DOM 或 SpriteJS 依赖。可选模块的正式打包产物与 npm 子路径尚未实现，属于后续打包工作。

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
| `version` | 数字 `1`；不自动升级或转换字符串版本 |
| `id` | 非空字符串，不能全部为空白；由内容作者保持稳定，不从文件名猜测 |
| `kind` | `tile`（地块）或 `sprite`（精灵）；不引入住宅等游戏类别 |
| `footprint` | 非空且无重复的整数坐标对，表示相对逻辑原点的占地；允许负坐标、不规则形状及不包含原点，不排序或重新居中 |
| `views` | 对象，恰好使用 `0`、`90`、`180`、`270` 四个键；不接受缺向或其他角度 |
| `source` | 使用 `/` 分隔的相对图片文件路径；不接受绝对路径、协议/盘符、反斜杠、空路径段及 `.`、`..` 路径段；中文和空格可保留 |
| `rect` | `[x, y, width, height]`，整数像素；起点非负，宽高为正，矩形完全位于实际图片内；贴边有效 |
| `anchor` | `[x, y]`，相对裁切区域左上角的像素位置，对应元素逻辑原点；允许小数、负数及位于裁切区域之外 |

每个视图必须显式配置。不同视图可以显式引用同一图片，但是否确实可复用由作者确认，校验器不自动复制、镜像或推断方向。

图片外框不等于逻辑瓦片尺寸，也不能证明占地。`0/90/180/270` 是工具的视图槽，不因文件名含 `01/02/03/04` 就认定原作的罗盘方向。

未定义的附加字段会被保留，但不参与校验或作为已支持的能力；`views` 的角度键仍按上表限制。

## 交付给绘制方的参数

一份可复用的素材需要原始图片、元素 JSON 和**标定时使用的逻辑瓦片尺寸**。当前 JSON 不携带瓦片尺寸，交付说明需另外记录；编辑器和独立预览由使用者手动设置相同尺寸。修改过预览瓦片宽高的素材，应记录实际标定值，不能从图片外框或占地行列推断。

| 信息 | 由谁提供 / 如何使用 |
|---|---|
| 图片、占地、四向裁切和像素锚点 | 素材交付方提供图片与 JSON；绘制方按相对路径加载，不缩放原图或自动换算 anchor |
| 标定瓦片尺寸 | 素材交付说明提供，绘制方显式传入 `view.tileSize`；当前狗样本使用 `[80,40]` |
| 对象位置与朝向 | 消费者保存 `{grid, objectAngle}`；矩形放置/转向时通过 `resolveElementPlacement` 求姿态，转镜头时复用姿态 |
| 镜头与画布原点 | 消费者提供 `view.angle` 和 `originPixel`；复现相同绝对绘制坐标时，两者及对象姿态也需一致 |
| 界面缩放与不透明度 | 仅为显示状态，不写入元素定义，也不替代标定尺寸 |

通用绘制/投影函数的缺省 `tileSize` 是 `[8,4]`，不会从定义中识别出 Demo 的 `[80,40]`。独立消费者必须显式传入素材的标定尺寸。单独改变 `tileSize` 会改变网格间距，但图片裁切和像素 anchor 保持原值，因此它不是界面缩放；查看同一标定结果的不同大小，应缩放整个预览。调用顺序见[静态素材预览](element-preview.md#放置对象朝向与镜头)。

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

### 问题定位

每个问题为 `{ path, code, message }`，例如：

```json
{ "path": "views.90.rect", "code": "rect-out-of-bounds", "message": "裁切矩形超出图片实际尺寸。" }
```

`path` 指向定义中的字段，根对象或 JSON 解析问题使用 `$`；占地项使用 `footprint[2]`。无法继续读取的父对象报告父级问题，其余可检查字段继续收集问题。

错误码包括：`invalid-json`、`invalid-definition`、`unsupported-version`、`invalid-id`、`invalid-kind`、`invalid-footprint`、`invalid-grid`、`duplicate-grid`、`invalid-views`、`invalid-view-angle`、`invalid-view`、`invalid-source-path`、`missing-source`、`invalid-source-size`、`invalid-rect`、`rect-out-of-bounds`、`invalid-anchor`。调用方按错误码处理，中文说明用于显示。

## 本片边界与下一步

P0-A 的成功标准是：同一份完整定义能被校验和读取，非法定义能定位问题，并保持核心入口无新增依赖。通过契约校验不等于原作方向、占地、锚点已校准。

后续能力分片建立：[P0-B 四向视图](isometric-view.md)、[P0-C 素材预览](element-preview.md)、[P0-D 编辑与导出](element-editor.md)。各自维持独立职责。
