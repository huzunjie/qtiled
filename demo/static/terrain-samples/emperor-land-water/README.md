# 普通陆地与水域素材样本

此目录供元素编辑器和地图 Demo 读取同一套原作素材、动画定义与规则数据。`elements.json` 按元素 ID 索引；`rules.json` 提供普通平地水岸的 46 行邻域表及三个动画元素引用；`atlas.png`（624×1140）包含 **145 张原作图片**，由 RGB555 原值与原透明信息解码，不缩放或重绘。

- `emperor-terrain-202`：固定陆地样本，不包含肥力或气候自动选图。
- `emperor-terrain-386`～`emperor-terrain-457`：原普通水岸组的全部 72 张图片。
- `emperor-terrain-664`～`emperor-terrain-735`：水面动画所需的全部 72 张原图，单图定义保留供素材检查。

元素库共 **148 项定义**：145 项 v1 静态单图，以及共用上述图集的 3 项 v2 动画。每个动画的 `sequences.water` 都有 24 帧，四向显式引用同一序列，各向锚点仍独立。

| 动画元素 | 原图帧序 | 普通场景中的用途 |
|---|---|---|
| `emperor-water-even` | 664、666、…、710 | 普通内部水面，以及偶数外观字节的内部过渡 |
| `emperor-water-odd` | 665、667、…、711 | 奇数外观字节的内部过渡 |
| `emperor-water-deep` | 712、713、…、735 | 宽阔水域的深处 |

不能把 #664～711 按连续编号播成 48 帧。三个动画均明确设置 `frameDurationMs: 100`、`timingSource: "author"`：**100ms 是本样本作者选择的预览时长**，不是推断出的原作固定帧率。实际播放时间由页面时钟传入，不写入定义或地图。

邻域顺序和条件含义记录在规则中；条件 0 为水、1 为非水、2 为任意。QTiled 的 0、90、180、270 度对应原表列 `[1,0,3,2]`。0 度基准用四个直边和两个角的真实素材像素对照 QTiled 投影校准，不能只靠相对旋转核算推断。完整图像高度为 40～58，不能统一裁成 40；锚点 `[39,height-20]` 为工具明确采用的底部菱形中心。

普通水面、过渡和深处由陆/水布局派生，不新增作者填写的水深字段。规则先检查 3×3 水域，再执行原作对应的形态修整；保留下来的内部标记还须八邻全为标记，才使用 deep 帧族。有陆地包边的 3×3 水池只有普通内部水面，4×4 水池有过渡，5×5 水池才出现中央一格深处。固定外观输入来自已有 `terrainVariant` 或工具的世界坐标哈希，初始相位不因镜头、反复预览或 JSON 存读重新抽取。

此前报告中未命名的特殊场景已确认是 `cFlood` 洪水活动态。洪水也会使用 #712～735；这不意味着洪水等同于深水，或这组图片专属洪水。本样本的 deep 是常态下的派生绘制分区名，不声称存在已还原的数值水深系统。

边界及 `null` 格按非水读取是本工具的规则选择；不绘制或修改那些格。本样本不包含 BEACH、rim、洪水扩张与退水模拟、高程、网络和环境派生。缺少动画元素或不支持的输入会拒绝整笔候选，不退回静态图掩盖缺失。

来源：中文版 `China_Terrain.sg3`，SHA-256 `56e9fe6bbbbdc93d28f44883bd9bd8f9cfe0198f024a5af1e4589d47319f374d`。可复用的本机证据包括：

- [水岸与四镜头像素校准](../../../../output/emperor/s1-terrain-implementation-2026-10-10/evidence-gate.md)。
- [水面帧序的双程序证据](../../../../output/emperor/original-water-animation-2026-10-09/review.md)与[时间许可和逐格外观输入](../../../../output/emperor/content-rules-r7-2026-10-10/review.md)。
- [常态水域、形态修整与 cFlood 关系](../../../../output/emperor/water-animation-implementation-2026-10-10/semantics/review.md)：原字节、地址、指纹、交叉路径及有限译文检查均保留。
- [本批 145 张图片的提取清单](../../../../output/emperor/water-animation-implementation-2026-10-10/assets/terrain-manifest.json)与[提取脚本](../../../../output/emperor/water-animation-implementation-2026-10-10/assets/extract-water.mjs)。

素材归原作品权利人所有，本地研究与工具样本不改变其权属。上述证据目录保存在本机，独立分发 Demo 时不要求携带原程序。
