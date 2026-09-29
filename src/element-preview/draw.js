import { projectGrid } from '../isometric-view';
import { getIsometricNeighborsByOffsets } from '../shapes/rhombus';

/** 将已通过元素契约校验的定义解释为绘制数据，不加载图片或创建渲染对象。
 * @param {Object} definition 由 importElementDefinition/validateElementDefinition 确认有效的定义。
 * @param {Array<number>} grid 元素世界整数格，默认 [0, 0]。
 * @param {Object} view P0-B 视图参数，angle 缺省为 0。
 * @returns {Object} 素材引用、裁切、锚点、左上角位置、原点像素与占地世界格/像素。
 * 图片锚点相对裁切左上角；位置 = 原点投影 - 锚点，不按图片尺寸猜占地或缩放图片。
 */
export function resolveElementDraw(definition, grid = [0, 0], view = {}) {
  const origin = projectGrid(grid, view);
  const { angle = 0, tileSize = [8, 4] } = view;
  if (!Object.prototype.hasOwnProperty.call(definition.views, angle)) {
    throw new Error(`views.${angle} 缺少显式素材配置。`);
  }
  const { source, rect, anchor } = definition.views[angle];
  const worldCells = getIsometricNeighborsByOffsets(grid, definition.footprint);
  return {
    id: definition.id, angle, source,
    rect: [...rect], anchor: [...anchor], origin,
    position: [origin[0] - anchor[0], origin[1] - anchor[1]],
    tileSize: [...tileSize],
    footprint: worldCells.map(cell => ({ grid: cell, position: projectGrid(cell, view) })),
  };
}
