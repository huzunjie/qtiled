import { Sprite, Polyline, Group } from 'spritejs';
import { getVertexes } from '../shapes/rhombus';

const renderedGroups = new WeakMap();

/** 在现有 SpriteJS 容器中替换本函数拥有的元素组，保留调用方其他节点。
 * @param {Object} container SpriteJS Layer 或 Group，生命周期由调用方管理；多实例各用独立 Group。
 * @param {Object|null} drawInfo resolveElementDraw 的结果；null 清除本元素组。
 * @param {Object} sources loadElementSources 返回的图片索引。
 * @param {Object} overlays { gridPositions: 像素坐标数组, footprint: true, placement: true, bounds: false }。
 * @returns {Object|null} 当前元素 Group；不改变输入，不在内部异步加载图片。
 */
export function renderElement(container, drawInfo, sources = {}, overlays = {}) {
  const previous = renderedGroups.get(container);
  if (previous) previous.group.remove();
  renderedGroups.delete(container);
  if (!drawInfo) return null;
  const image = Object.prototype.hasOwnProperty.call(sources, drawInfo.source) ? sources[drawInfo.source] : null;
  if (!image) throw new Error(`未加载图片：${drawInfo.source}`);

  const group = new Group();
  const vertexes = getVertexes(drawInfo.tileSize);
  for (const position of overlays.gridPositions || []) {
    group.append(new Polyline({ pos: position, points: vertexes, close: true, strokeColor: '#d4dce3', lineWidth: 1 }));
  }
  const [, , width, height] = drawInfo.rect;
  const sprite = new Sprite({
    texture: image, sourceRect: [...drawInfo.rect],
    pos: [...drawInfo.position], size: [width, height], anchor: [0, 0],
  });
  group.append(sprite);
  if (overlays.footprint !== false) {
    drawInfo.footprint.forEach(({ position }) => group.append(new Polyline({
      pos: position, points: vertexes, close: true,
      strokeColor: '#ce871c', fillColor: 'rgba(255, 190, 55, 0.12)', lineWidth: 2,
    })));
  }
  let bounds = null;
  if (overlays.bounds) {
    bounds = new Polyline({
      pos: drawInfo.position, points: [[0, 0], [width, 0], [width, height], [0, height]],
      close: true, strokeColor: '#7395b9', lineWidth: 1,
    });
    group.append(bounds);
  }
  if (overlays.placement !== false && drawInfo.placementOrigin) {
    group.append(new Polyline({ pos: drawInfo.placementOrigin,
      points: [[0, -7], [7, 0], [0, 7], [-7, 0]], close: true, strokeColor: '#1976b5', lineWidth: 2 }));
  }
  container.append(group);
  renderedGroups.set(container, { group, sprite, bounds, origin: [...drawInfo.origin] });
  return group;
}

/** 原地更新现有元素的当前帧，不替换组、不修改占地或其他覆盖层。
 * @param {Object} container 已经调用 renderElement 的同一容器。
 * @param {Object} frame resolveElementFrame 的结果；锚点属于当前方向而非动画时间。
 * @param {Object} sources 已加载的图片索引。
 * @returns {Object} 原有 Group；输入不合法或缺图片时抛错，保留原画面。
 */
export function updateElementFrame(container, frame, sources = {}) {
  const rendered = renderedGroups.get(container);
  if (!rendered) throw new Error('容器中没有已绘制元素，请先调用 renderElement。');
  if (!frame || typeof frame.source !== 'string' || !frame.source.length
    || !Array.isArray(frame.rect) || frame.rect.length !== 4 || !Array.from(frame.rect).every(Number.isInteger)
    || frame.rect[0] < 0 || frame.rect[1] < 0 || frame.rect[2] <= 0 || frame.rect[3] <= 0
    || !Array.isArray(frame.anchor) || frame.anchor.length !== 2 || !Array.from(frame.anchor).every(Number.isFinite)) {
    throw new TypeError('当前帧必须提供有效的图片、裁切与方向锚点。');
  }
  const image = Object.prototype.hasOwnProperty.call(sources, frame.source) ? sources[frame.source] : null;
  if (!image) throw new Error(`未加载图片：${frame.source}`);
  const [, , width, height] = frame.rect;
  const position = rendered.origin.map((value, index) => value - frame.anchor[index]);
  rendered.sprite.attr({ texture: image, sourceRect: [...frame.rect], size: [width, height], pos: position });
  if (rendered.bounds) rendered.bounds.attr({ pos: position, points: [[0, 0], [width, 0], [width, height], [0, height]] });
  return rendered.group;
}
