import { projectGrid } from '../isometric-view';
import { rotateGridPoint } from '../shapes/polygon';
import { getIsometricNeighborsByOffsets } from '../shapes/rhombus';
import { getRectangleTopCell } from './placement';
import { resolveElementFrame } from './frame';

/** 将已通过元素契约校验的定义解释为绘制数据，不加载图片或创建渲染对象。
 * @param {Object} definition 由 importElementDefinition/validateElementDefinition 确认有效的定义。
 * @param {Array<number>} grid 定义原点的世界整数格，默认 [0, 0]；放置姿态由 resolveElementPlacement 计算。
 * @param {Object} view P0-B 视图参数，angle 仅表示镜头角度，缺省为 0。
 * @param {number} objectAngle 对象朝向，0、90、180 或 270，默认 0；与镜头采用相同旋转正向。
 * @param {Object} playback 可选的 { elapsedMs, phase }；仅选择当前素材帧，不改变几何与放置。
 * @returns {Object} 镜头/对象/素材角度、素材引用、裁切、锚点、左上角位置、原点像素与占地世界格/像素。
 * 图片锚点相对裁切左上角；位置 = 原点投影 - 锚点，不按图片尺寸猜占地或缩放图片。
 * 本函数只绘制给定姿态，不决定转向时的位置；不能固定 grid 后只改 objectAngle 来模拟建筑原地转向。
 * placementGrid/placementOrigin 是矩形在当前镜头下的上角格/像素；非矩形返回 null，不猜测放置规则。
 */
export function resolveElementDraw(definition, grid = [0, 0], view = {}, objectAngle = 0, playback = {}) {
  if (![0, 90, 180, 270].includes(objectAngle)) {
    throw new RangeError('objectAngle 必须为数字 0、90、180 或 270。');
  }
  const origin = projectGrid(grid, view);
  const { angle = 0, tileSize = [8, 4] } = view;
  const imageAngle = (angle + objectAngle) % 360;
  const { source, rect, anchor, sequence, frameIndex } = resolveElementFrame(definition, imageAngle, playback);
  const offsets = definition.footprint.map(offset => rotateGridPoint(offset, objectAngle / 90));
  const worldCells = getIsometricNeighborsByOffsets(grid, offsets);
  const placementGrid = getRectangleTopCell(worldCells, angle);
  return {
    id: definition.id, angle, objectAngle, imageAngle, source,
    ...(sequence === null ? {} : { sequence, frameIndex }),
    rect: [...rect], anchor: [...anchor], origin,
    placementGrid, placementOrigin: placementGrid ? projectGrid(placementGrid, view) : null,
    position: [origin[0] - anchor[0], origin[1] - anchor[1]],
    tileSize: [...tileSize],
    footprint: worldCells.map(cell => ({ grid: cell, position: projectGrid(cell, view) })),
  };
}
