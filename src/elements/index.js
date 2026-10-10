/* 元素定义的可选入口，不从核心 src/index.js 导出。 */

const VIEW_ANGLES = ['0', '90', '180', '270'];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isTuple(value, length, checkNumber) {
  return Array.isArray(value) && value.length === length
    && Array.from(value).every(checkNumber);
}

function isSourcePath(value) {
  return typeof value === 'string' && value.trim().length > 0
    && !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.includes('\\')
    && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
}

/** 校验元素定义，不读取图片、不修复数据、不修改输入。
 * @param {Object} definition v1 静态定义，或带显式共享帧序列的 v2 定义。
 * @param {Object} sourceInfo 按相对图片路径索引的 { width, height }，由调用方提供实际尺寸
 * @returns {Array<Object>} 问题列表，每项为 { path, code, message }；空列表表示通过
 * 四向分别使用 '0'/'90'/'180'/'270' 键；锚点相对裁切区域左上角，可在区域之外。
 * 占地为不重复的整数偏移，不要求包含原点；此校验不证明素材方向或占地符合原作。
 */
export function validateElementDefinition(definition, sourceInfo = {}) {
  const issues = [];
  const issue = (path, code, message) => issues.push({ path, code, message });
  if (!isObject(definition)) {
    issue('$', 'invalid-definition', '元素定义必须是对象。');
    return issues;
  }

  if (![1, 2].includes(definition.version)) issue('version', 'unsupported-version', '元素定义版本必须为数字 1 或 2。');
  if (typeof definition.id !== 'string' || !definition.id.trim()) {
    issue('id', 'invalid-id', '元素 ID 必须是非空字符串。');
  }
  if (definition.kind !== 'tile' && definition.kind !== 'sprite') {
    issue('kind', 'invalid-kind', '元素类别必须为 tile 或 sprite。');
  }

  if (!Array.isArray(definition.footprint) || !definition.footprint.length) {
    issue('footprint', 'invalid-footprint', '占地必须是非空的整数坐标对数组。');
  } else {
    const seen = new Set();
    for (const [index, grid] of definition.footprint.entries()) {
      if (!isTuple(grid, 2, Number.isInteger)) {
        issue(`footprint[${index}]`, 'invalid-grid', '占地坐标必须是两个有限整数。');
      } else {
        const key = grid.join(',');
        if (seen.has(key)) issue(`footprint[${index}]`, 'duplicate-grid', '占地坐标不能重复。');
        seen.add(key);
      }
    }
  }

  const validateFrame = (frame, path) => {
    let size;
    if (!isSourcePath(frame.source)) {
      issue(`${path}.source`, 'invalid-source-path', '图片必须使用 / 分隔的相对文件路径，不含协议、反斜杠、空路径段或 .、.. 路径段。');
    } else if (!isObject(sourceInfo) || !Object.prototype.hasOwnProperty.call(sourceInfo, frame.source)) {
      issue(`${path}.source`, 'missing-source', '图片引用未在 sourceInfo 中找到。');
    } else {
      const candidate = sourceInfo[frame.source];
      if (!isObject(candidate) || !Number.isInteger(candidate.width) || candidate.width <= 0
        || !Number.isInteger(candidate.height) || candidate.height <= 0) {
        issue(`${path}.source`, 'invalid-source-size', '图片实际宽高必须是正整数。');
      } else {
        size = candidate;
      }
    }

    if (!isTuple(frame.rect, 4, Number.isInteger) || frame.rect[0] < 0 || frame.rect[1] < 0
      || frame.rect[2] <= 0 || frame.rect[3] <= 0) {
      issue(`${path}.rect`, 'invalid-rect', '裁切矩形必须为 [x, y, width, height]，使用整数，起点非负且宽高为正。');
    } else if (size && (frame.rect[0] + frame.rect[2] > size.width || frame.rect[1] + frame.rect[3] > size.height)) {
      issue(`${path}.rect`, 'rect-out-of-bounds', '裁切矩形超出图片实际尺寸。');
    }
  };

  if (definition.version === 2 && definition.sequences !== undefined) {
    if (!isObject(definition.sequences)) {
      issue('sequences', 'invalid-sequences', '帧序列必须是按名称索引的对象。');
    } else {
      Object.entries(definition.sequences).forEach(([id, sequence]) => {
        const path = `sequences.${id}`;
        if (!id.trim()) issue(path, 'invalid-sequence-id', '序列名称必须是非空字符串。');
        if (!isObject(sequence)) {
          issue(path, 'invalid-sequence', '序列必须提供显式有序帧及作者设定的时长。');
          return;
        }
        if (!Number.isSafeInteger(sequence.frameDurationMs) || sequence.frameDurationMs <= 0) {
          issue(`${path}.frameDurationMs`, 'invalid-frame-duration', '每帧时长必须是正的安全整数毫秒。');
        }
        if (sequence.timingSource !== 'author') {
          issue(`${path}.timingSource`, 'invalid-timing-source', '本版本的播放时长须明确标记为 author（作者设置）。');
        }
        if (!Array.isArray(sequence.frames) || !sequence.frames.length) {
          issue(`${path}.frames`, 'invalid-frames', '序列必须包含至少一帧显式图片与裁切。');
        } else {
          for (const [index, frame] of sequence.frames.entries()) {
            if (!isObject(frame)) issue(`${path}.frames[${index}]`, 'invalid-frame', '每帧必须是图片与裁切对象。');
            else validateFrame(frame, `${path}.frames[${index}]`);
          }
        }
      });
    }
  }

  if (!isObject(definition.views)) {
    issue('views', 'invalid-views', '视图必须是包含 0、90、180、270 四向配置的对象。');
    return issues;
  }
  Object.keys(definition.views).forEach(angle => {
    if (!VIEW_ANGLES.includes(angle)) issue(`views.${angle}`, 'invalid-view-angle', '仅支持 0、90、180、270 四向视图。');
  });

  VIEW_ANGLES.forEach(angle => {
    const view = Object.prototype.hasOwnProperty.call(definition.views, angle) ? definition.views[angle] : undefined;
    const path = `views.${angle}`;
    if (!isObject(view)) {
      issue(path, 'invalid-view', '每个方向都必须提供独立的视图配置。');
      return;
    }

    if (definition.version === 2 && Object.prototype.hasOwnProperty.call(view, 'sequence')) {
      if (Object.prototype.hasOwnProperty.call(view, 'source') || Object.prototype.hasOwnProperty.call(view, 'rect')) {
        issue(path, 'mixed-view-binding', '视图须选择静态图片或帧序列，不能同时指定。');
      }
      if (typeof view.sequence !== 'string' || !view.sequence.trim()) {
        issue(`${path}.sequence`, 'invalid-sequence-reference', '序列引用必须是非空字符串。');
      } else if (!isObject(definition.sequences) || !Object.prototype.hasOwnProperty.call(definition.sequences, view.sequence)) {
        issue(`${path}.sequence`, 'missing-sequence', '视图引用的帧序列不存在。');
      }
    } else {
      validateFrame(view, path);
    }

    if (!isTuple(view.anchor, 2, Number.isFinite)) {
      issue(`${path}.anchor`, 'invalid-anchor', '锚点必须是两个有限数值，可位于裁切区域之外。');
    }
  });
  return issues;
}

/** 解析并校验 JSON 文本；成功返回原样解析的定义，失败时 definition 为 null。
 * @param {string} json 元素定义的 JSON 文本，不接受已经解析的对象
 * @param {Object} sourceInfo 按相对图片路径索引的实际尺寸信息
 * @returns {Object} { definition, issues }；不补方向、不转换数值、不丢弃额外字段
 */
export function importElementDefinition(json, sourceInfo = {}) {
  const invalidJson = { definition: null, issues: [{ path: '$', code: 'invalid-json', message: '请输入有效的 JSON 文本。' }] };
  if (typeof json !== 'string') return invalidJson;
  let definition;
  try {
    definition = JSON.parse(json);
  } catch (error) {
    return invalidJson;
  }
  const issues = validateElementDefinition(definition, sourceInfo);
  return { definition: issues.length ? null : definition, issues };
}

/** 应用一次工具编辑，返回新定义；允许暂时非法的草稿，由统一校验器报告问题。
 * @param {Object} definition 当前定义或草稿，调用方将其视为不可变数据。
 * @param {Object} edit { field: 'footprint'|'source'|'rect'|'anchor'|'sequence'|'sequences', value, angle? }。
 * angle 仅在修改视图字段时使用，必须是数字 0/90/180/270。
 * 仅复制修改路径及传入数组；sequences 编辑深复制序列数据并显式升为 v2。
 * 切换 sequence/source/rect 绑定不联动方向锚点，未修改分支与原定义共享。
 */
export function applyElementEdit(definition, { field, value, angle } = {}) {
  const copyValue = Array.isArray(value)
    ? value.map(item => Array.isArray(item) ? [...item] : item) : value;
  if (field === 'footprint') return { ...definition, footprint: copyValue };
  if (field === 'sequences') {
    const copy = input => {
      if (Array.isArray(input)) return input.map(copy);
      if (isObject(input)) return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, copy(item)]));
      return input;
    };
    return { ...definition, version: 2, sequences: copy(value) };
  }
  if (!['source', 'rect', 'anchor', 'sequence'].includes(field)) throw new TypeError('不支持的元素编辑字段。');
  if (![0, 90, 180, 270].includes(angle)) throw new RangeError('编辑方向必须为 0、90、180、270。');
  const editedView = { ...definition.views[angle], [field]: copyValue };
  if (field === 'sequence') {
    delete editedView.source;
    delete editedView.rect;
  } else if (definition.version === 2 && (field === 'source' || field === 'rect')) {
    delete editedView.sequence;
  }
  return {
    ...definition,
    ...(field === 'sequence' ? { version: 2 } : {}),
    views: {
      ...definition.views,
      [angle]: editedView,
    },
  };
}

/** 正式导出前复用完整契约校验；不嵌入图片，不补方向或修改定义。
 * @returns {Object} { json: 格式化 JSON 文本或 null, issues: 问题列表 }。
 */
export function exportElementDefinition(definition, sourceInfo = {}) {
  const issues = validateElementDefinition(definition, sourceInfo);
  return { json: issues.length ? null : `${JSON.stringify(definition, null, 2)}\n`, issues };
}
