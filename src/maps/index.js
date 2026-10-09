/* 平地地图定义的可选入口，不从核心 src/index.js 导出。 */
import { resolveElementDraw } from '../element-rendering/draw';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isId(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPair(value, checkNumber) {
  return Array.isArray(value) && value.length === 2
    && Array.from(value).every(checkNumber);
}

/** 校验平地地图的结构和素材引用，不读取文件、不修改输入。
 * @param {Object} definition { version: 1, id, tileSize, cells, entities }
 * cells[y][x] 为 null 或 { terrain, elevation: 0, tile? }。
 * entities 中每个实例为 { id, element, grid, angle? }，省略 angle 表示 0°。
 * @param {Object} elementsById 已经通过元素校验的定义，键与元素 id 一致。
 * @returns {Array<Object>} { path, code, message } 问题列表，空列表表示通过。
 * 此处不判断地形语义、实体完整占地、共存、通行或建造是否合法。
 */
export function validateMapDefinition(definition, elementsById = {}) {
  const issues = [];
  const issue = (path, code, message) => issues.push({ path, code, message });
  if (!isObject(definition)) {
    issue('$', 'invalid-map-definition', '地图定义必须是对象。');
    return issues;
  }

  if (definition.version !== 1) issue('version', 'unsupported-version', '地图版本必须为数字 1。');
  if (!isId(definition.id)) issue('id', 'invalid-id', '地图 ID 必须是非空字符串。');
  if (!isPair(definition.tileSize, value => Number.isFinite(value) && value > 0)) {
    issue('tileSize', 'invalid-tile-size', '瓦片尺寸必须为两个有限正数。');
  }

  const validCells = Array.isArray(definition.cells) && definition.cells.length > 0;
  const validEntities = Array.isArray(definition.entities);
  const validLibrary = isObject(elementsById);
  if (!validCells) issue('cells', 'invalid-cells', '地图格必须是非空的二维数组。');
  if (!validEntities) issue('entities', 'invalid-entities', '实体集合必须是数组。');
  if (!validLibrary) issue('$elements', 'invalid-element-library', '元素库必须是以元素 ID 为键的对象。');

  function checkReference(id, path, kind) {
    if (!isId(id)) {
      issue(path, 'invalid-element-reference', '素材引用必须是非空元素 ID。');
      return;
    }
    if (!validLibrary) return;
    if (!Object.prototype.hasOwnProperty.call(elementsById, id)) {
      issue(path, 'missing-element', '素材引用未在元素库中找到。');
      return;
    }
    const element = elementsById[id];
    if (!isObject(element) || element.id !== id) {
      issue(path, 'invalid-element-entry', '引用的元素必须是对象且 id 与元素库键一致。');
      return;
    }
    if (element.kind !== kind) {
      issue(path, 'element-kind-mismatch', `此处必须引用 ${kind} 元素。`);
      return;
    }
    if (kind === 'tile' && (!Array.isArray(element.footprint) || element.footprint.length !== 1
      || !isPair(element.footprint[0], value => value === 0))) {
      issue(path, 'unsupported-tile-footprint', '底图元素必须仅占据 [0,0] 一格。');
    }
  }

  if (validCells) {
    const { cells } = definition;
    const width = Array.isArray(cells[0]) && cells[0].length > 0 ? cells[0].length : null;
    let validShape = true;
    let hasCell = false;
    // entries 会访问数组空洞，避免把缺项误当作 null 或漏掉错误。
    for (const [y, row] of cells.entries()) {
      const rowPath = `cells[${y}]`;
      if (!Array.isArray(row) || row.length === 0) {
        issue(rowPath, 'invalid-row', '地图行必须是非空数组。');
        validShape = false;
        continue;
      }
      if (width !== null && row.length !== width) {
        issue(rowPath, 'row-width-mismatch', '地图各行的长度必须与第 0 行一致。');
        validShape = false;
        continue;
      }
      for (const [x, cell] of row.entries()) {
        if (cell === null) continue;
        const path = `${rowPath}[${x}]`;
        if (!isObject(cell)) {
          issue(path, 'invalid-cell', '格值必须为 null 或格属性对象。');
          validShape = false;
          continue;
        }
        hasCell = true;
        if (!isId(cell.terrain)) issue(`${path}.terrain`, 'invalid-terrain', '地形标识必须是非空字符串。');
        if (!Number.isFinite(cell.elevation)) {
          issue(`${path}.elevation`, 'invalid-elevation', '高程必须是有限数值。');
        } else if (cell.elevation !== 0) {
          issue(`${path}.elevation`, 'unsupported-elevation', '当前平地地图仅支持高程 0。');
        }
        if (Object.prototype.hasOwnProperty.call(cell, 'tile')) checkReference(cell.tile, `${path}.tile`, 'tile');
      }
    }
    if (validShape && !hasCell) issue('cells', 'invalid-cells', '地图必须至少包含一个有效格。');
  }

  if (validEntities) {
    const ids = new Set();
    for (const [index, entity] of definition.entities.entries()) {
      const path = `entities[${index}]`;
      if (!isObject(entity)) {
        issue(path, 'invalid-entity', '实体实例必须是对象。');
        continue;
      }
      if (!isId(entity.id)) {
        issue(`${path}.id`, 'invalid-id', '实例 ID 必须是非空字符串。');
      } else if (ids.has(entity.id)) {
        issue(`${path}.id`, 'duplicate-entity-id', '同一地图中的实例 ID 不能重复。');
      } else {
        ids.add(entity.id);
      }
      checkReference(entity.element, `${path}.element`, 'sprite');
      if (!isPair(entity.grid, Number.isSafeInteger)) {
        issue(`${path}.grid`, 'invalid-grid', '实体原点必须是两个安全整数。');
      }
      if (Object.prototype.hasOwnProperty.call(entity, 'angle') && ![0, 90, 180, 270].includes(entity.angle)) {
        issue(`${path}.angle`, 'invalid-object-angle', '对象角度必须为数字 0、90、180 或 270。');
      }
    }
  }
  return issues;
}

/** 将地图实体解释为独立实例及绘制数据，不加载图片或创建渲染对象。
 * @param {Object} definition 地图定义，先复用 validateMapDefinition 检查结构与引用。
 * @param {Object} elementsById 已通过元素契约校验的定义，键与元素 id 一致。
 * @param {Object} view { angle: 0, originPixel: [0, 0] }；瓦片尺寸统一取 definition.tileSize。
 * @returns {Object} { entities, issues }；地图无效时 entities 为 null，不返回部分实例。
 * 每个结果为 { id, element, grid, angle, draw }；angle 是对象朝向，draw.angle 是镜头角度。
 * draw 沿用 resolveElementDraw 的结果，draw.footprint 包含完整世界格及投影像素。
 * 加载或切镜头不重新执行放置计算；此处不裁剪占地，不判断越界或共存是否合法。
 */
export function resolveMapEntities(definition, elementsById = {}, { angle = 0, originPixel = [0, 0] } = {}) {
  const issues = validateMapDefinition(definition, elementsById);
  if (issues.length) return { entities: null, issues };
  const view = { angle, originPixel, tileSize: definition.tileSize };
  const entities = definition.entities.map(entity => {
    const { id, element, grid, angle: objectAngle = 0 } = entity;
    return {
      id, element, grid: [...grid], angle: objectAngle,
      draw: resolveElementDraw(elementsById[element], grid, view, objectAngle),
    };
  });
  return { entities, issues };
}
