import { Sprite, Polyline, Group } from 'spritejs';
import { getVertexes } from '../shapes/rhombus';

const previews = new WeakMap();

/** 在现有 SpriteJS layer 中替换本函数拥有的预览组，保留调用方其他节点。
 * @param {Object} layer SpriteJS Layer，生命周期由调用方管理。
 * @param {Object|null} drawInfo resolveElementDraw 的结果；null 清除本预览。
 * @param {Object} sources loadElementSources 返回的图片索引。
 * @param {Object} overlays { gridPositions: 像素坐标数组, footprint: true, anchor: true, bounds: false }。
 * @returns {Object|null} 当前预览 Group；不改变输入，不在内部异步加载图片。
 */
export function renderElementPreview(layer, drawInfo, sources = {}, overlays = {}) {
  const previous = previews.get(layer);
  if (previous) previous.remove();
  previews.delete(layer);
  if (!drawInfo) return null;
  const image = Object.prototype.hasOwnProperty.call(sources, drawInfo.source) ? sources[drawInfo.source] : null;
  if (!image) throw new Error(`未加载图片：${drawInfo.source}`);

  const group = new Group();
  const vertexes = getVertexes(drawInfo.tileSize);
  for (const position of overlays.gridPositions || []) {
    group.append(new Polyline({ pos: position, points: vertexes, close: true, strokeColor: '#d4dce3', lineWidth: 1 }));
  }
  const [, , width, height] = drawInfo.rect;
  group.append(new Sprite({
    texture: image, sourceRect: [...drawInfo.rect],
    pos: [...drawInfo.position], size: [width, height], anchor: [0, 0],
  }));
  if (overlays.footprint !== false) {
    drawInfo.footprint.forEach(({ position }) => group.append(new Polyline({
      pos: position, points: vertexes, close: true,
      strokeColor: '#ce871c', fillColor: 'rgba(255, 190, 55, 0.12)', lineWidth: 2,
    })));
  }
  if (overlays.bounds) {
    group.append(new Polyline({
      pos: drawInfo.position, points: [[0, 0], [width, 0], [width, height], [0, height]],
      close: true, strokeColor: '#7395b9', lineWidth: 1,
    }));
  }
  if (overlays.anchor !== false) {
    for (const points of [[[-6, 0], [6, 0]], [[0, -6], [0, 6]]]) {
      group.append(new Polyline({ pos: drawInfo.origin, points, strokeColor: '#cf3535', lineWidth: 2 }));
    }
  }
  layer.append(group);
  previews.set(layer, group);
  return group;
}
