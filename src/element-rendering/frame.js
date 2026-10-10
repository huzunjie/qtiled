/** 从已校验定义解析一个方向的当前帧，不读时钟、不改定义或世界状态。
 * @param {Object} definition v1 静态或 v2 共享序列元素定义。
 * @param {number} imageAngle 已组合好的素材方向，0、90、180、270。
 * @param {Object} playback { elapsedMs: 非负有限毫秒, phase: 非负安全整数帧偏移 }。
 * 时间和暂停由调用方管理；phase 只影响循环帧索引，不改变序列、方向或锚点。
 * @returns {Object} { source, rect, anchor, sequence, frameIndex }，静态 sequence 为 null。
 */
export function resolveElementFrame(definition, imageAngle = 0, { elapsedMs = 0, phase = 0 } = {}) {
  if (![0, 90, 180, 270].includes(imageAngle)) throw new RangeError('imageAngle 必须为 0、90、180 或 270。');
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('elapsedMs 必须是非负有限毫秒。');
  if (!Number.isSafeInteger(phase) || phase < 0) throw new RangeError('phase 必须是非负安全整数帧偏移。');
  if (!Object.prototype.hasOwnProperty.call(definition.views, imageAngle)) {
    throw new Error(`views.${imageAngle} 缺少显式素材配置。`);
  }
  const view = definition.views[imageAngle];
  let frame = view;
  let frameIndex = 0;
  let sequence = null;
  if (definition.version === 2 && Object.prototype.hasOwnProperty.call(view, 'sequence')) {
    sequence = view.sequence;
    const clip = definition.sequences[sequence];
    // 先将时间与相位分别取余，避免大相位加总丢失低位或长时间乘法溢出。
    const cycle = clip.frameDurationMs * clip.frames.length;
    frameIndex = (Math.floor((elapsedMs % cycle) / clip.frameDurationMs) + phase % clip.frames.length) % clip.frames.length;
    frame = clip.frames[frameIndex];
  }
  return { source: frame.source, rect: [...frame.rect], anchor: [...view.anchor], sequence, frameIndex };
}
