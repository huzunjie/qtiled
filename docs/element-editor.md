# 元素编辑与导出接口

可视化[元素编辑器](https://emk.pyzy.net/element-editor.html)及素材预览在独立 EMK 项目维护。本页仅说明 QTiled 保留的纯数据接口；页面布局、文件选择、播放时钟和业务工作流由调用方负责。

## 编辑与导出接口

两个函数由纯数据入口 `src/elements` 导出，也由浏览器可选入口 `src/element-rendering` 转出。

```js
import { applyElementEdit, exportElementDefinition } from '../src/elements';

const edited = applyElementEdit(definition, {
  field: 'anchor', angle: 90, value: [59, 39],
});
const { json, issues } = exportElementDefinition(edited, sourceInfo);
```

| 操作 | 输入约定 | 结果 |
|---|---|---|
| `applyElementEdit` 修改占地 | `{ field: 'footprint', value: [[0,0],[-1,0]] }` | 替换逻辑偏移，不旋转、排序或重新居中 |
| `applyElementEdit` 修改视图 | `{ field: 'source'/'rect'/'anchor', angle: 0/90/180/270, value }` | 只改所选方向的一个字段，不补其他方向 |
| `applyElementEdit` 修改序列 | `{ field: 'sequences', value: sequences }` | 深复制序列数据并显式使用 v2；共享方向读取同一组帧 |
| `applyElementEdit` 绑定序列 | `{ field: 'sequence', angle: 0/90/180/270, value: sequenceId }` | 给该方向绑定已有序列并移除静态 `source/rect`，保留锚点 |
| `exportElementDefinition` | 定义和实际 `sourceInfo` | 成功返回 `{json, issues:[]}`；失败返回 `{json:null, issues}` |

编辑函数不改变输入，复制被修改的对象路径及传入数组；未修改分支共享引用，调用方继续按不可变数据使用。调用方提供具有 `views` 对象的定义或草稿；不支持的编辑字段抛出 `TypeError`，非法角度抛出 `RangeError`。字段值可以暂时非法，例如越界裁切或空占地，由现有 `validateElementDefinition` 报告，而不是静默修复。

导出前复用完整校验，缺向、缺图片、缺帧、非法占地、越界裁切和非法帧时长均不能正式导出。JSON 使用两空格缩进并保留结尾换行，不改变相对图片引用，不嵌入图片。ID、类别等普通控件赋值留在工具内部。
