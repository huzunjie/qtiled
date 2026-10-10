
/**
 * qtiled v0.2.7
 * (c) 2008-2026 huzunjie
 * Released under MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qtiledMaps = {}));
}(this, (function (exports) { 'use strict';

  /* 二维多边形相关配置及基础方法 */

  /* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
  const HALF = 0.5;
  /** 绕固定原点旋转逻辑坐标，不重新居中或锚定选区。
   * @param {Array<number>} grid 有限数值坐标 [gridX, gridY]，默认 [0, 0]；不是错列行列下标。
   * @param {number} quarterTurns 累计整数次数，默认 0；一次为 [-y, x]，负数反向，按 4 取模。
   * @returns {Array<number>} 旋转后的坐标，返回新数组、不修改输入；四次恢复原坐标。
   * 顺时针以逻辑 X 向右、Y 向下定义；允许小数坐标供连续位置计算。
   */

  function rotateGridPoint([gridX, gridY] = [0, 0], quarterTurns = 0) {
    const turns = (quarterTurns % 4 + 4) % 4;
    const swapAxes = turns % 2;
    const signX = turns === 1 || turns === 2 ? -1 : 1;
    const signY = turns >= 2 ? -1 : 1;
    return [signX * (swapAxes ? gridY : gridX) || 0, signY * (swapAxes ? gridX : gridY) || 0];
  }
  /* 计算一组共用顶点的多边形在平移后的轴对齐包围盒，不包含描边或文字。
   * @param {Array} positions 位置集合，每项为 [pixelX, pixelY, ...]，忽略附带的网格下标
   * @param {Array} vertexes 相对每个位置的共用顶点，默认 [[0, 0]]，仅计算位置范围
   * @return {Object|null} { minX, minY, maxX, maxY, width, height }；任一集合为空时返回 null
   * 输入为有限数值坐标，不修改输入；分别遍历位置和顶点，复杂度为 O(N + V)。
   */

  function getBounds(positions = [], vertexes = [[0, 0]]) {
    if (!positions.length || !vertexes.length) return null;
    const [positionBounds, vertexBounds] = [positions, vertexes].map(points => {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const [x, y] of points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      return {
        minX,
        minY,
        maxX,
        maxY
      };
    });
    const minX = positionBounds.minX + vertexBounds.minX;
    const minY = positionBounds.minY + vertexBounds.minY;
    const maxX = positionBounds.maxX + vertexBounds.maxX;
    const maxY = positionBounds.maxY + vertexBounds.maxY;
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /* 正菱形地图元件方法 */

  const ELEVATION_HEIGHT = 16;

  function applyElevation([pixelX, pixelY, ...rest], elevation) {
    return [pixelX, pixelY - elevation * ELEVATION_HEIGHT, ...rest];
  } // 宽高为1的正菱形顶点集合
  /** 将逻辑偏移平移为等距菱形网格坐标。
   * @param {Array<number>} originGrid 焦点的绝对等距下标 [gridX, gridY]，默认 [0, 0]。
   * @param {Array<Array<number>>} offsets 相对焦点的整数逻辑偏移 [[offsetX, offsetY], ...]，默认 []。
   * @returns {Array<Array<number>>} 绝对等距下标，保留顺序、不修改输入；空偏移返回 []。
   * 输入坐标为有限整数；不去重、不筛选边界或海拔，不接收像素坐标。
   */

  function getIsometricNeighborsByOffsets([gridX, gridY] = [0, 0], offsets = []) {
    return offsets.map(([offsetX, offsetY]) => [gridX + offsetX, gridY + offsetY]);
  } // 错列或非错列元素的左上、右上、左下、右下，四个角邻居 [xNum, yNum] 差值及距离成本
  /* 获取宽高的一半（菱形中心点在顶点坐标系中的值）
  * @param  {Array}   size    如： [width{Number}, height{Number}]
  * @return {Array}   [halfWidth, halfHeight]
  */

  function getHalfSize([width = 1, height = 1] = [1, 1]) {
    return [width * HALF, height * HALF];
  }
  /* 按等距布局菱形单元横纵坐标值及单元格宽高得到渲染坐标值
   * elevation 默认 0；每单位向上偏移 16px，不改变网格关系。
   */

  function getIsometricPosition([gridX, gridY] = [], tileSize = [8, 4], originPixel = [0, 0], elevation = 0) {
    const [pixelX, pixelY] = getIsometricPosByHalfSize(gridX, gridY, ...getHalfSize(tileSize));
    return applyElevation([pixelX + originPixel[0], pixelY + originPixel[1]], elevation);
  }
  /* 按等距布局菱形单元横纵坐标值及单元格宽高的一半得到渲染坐标值 */

  function getIsometricPosByHalfSize(xNum, yNum, halfWidth, halfHeight) {
    return [(xNum + yNum) * halfWidth, (yNum - xNum) * halfHeight];
  }

  /* 平地四向视图的可选入口，不从核心 src/index.js 导出。 */

  function getQuarterTurns(angle) {
    if (![0, 90, 180, 270].includes(angle)) {
      throw new RangeError('view.angle 必须为数字 0、90、180 或 270。');
    }

    return angle / 90;
  }
  /** 世界格坐标经固定原点旋转后，复用等距投影得到瓦片中心。
   * @param {Array<number>} grid 世界格坐标，默认 [0, 0]，允许有限小数表示连续位置。
   * @param {Object} view { angle: 0, tileSize: [8, 4], originPixel: [0, 0] }
   * angle 是逻辑坐标顺时针旋转的度数，不对应尚未核实的原作罗盘方位。
   * tileSize 为有限正数宽高，originPixel 为有限像素坐标；只处理平地，不修改输入。
   * @returns {Array<number>} [pixelX, pixelY]
   */


  function projectGrid(grid = [0, 0], {
    angle = 0,
    tileSize = [8, 4],
    originPixel = [0, 0]
  } = {}) {
    return getIsometricPosition(rotateGridPoint(grid, getQuarterTurns(angle)), tileSize, originPixel);
  }

  function checkAngle(angle, name) {
    if (![0, 90, 180, 270].includes(angle)) {
      throw new RangeError(`${name} 必须为数字 0、90、180 或 270。`);
    }
  }
  /** 完整矩形在当前镜头下最上角的占地格；空集或非矩形没有已确认的选格规则。 */


  function getRectangleTopCell(cells, angle = 0) {
    checkAngle(angle, 'viewAngle');
    if (!Array.isArray(cells) || !cells.length || !cells.every(cell => Array.isArray(cell) && cell.length === 2 && cell.every(Number.isInteger))) return null;
    const rotated = cells.map(cell => rotateGridPoint(cell, angle / 90));
    const bounds = getBounds(rotated);
    const count = new Set(rotated.map(cell => cell.join(','))).size;
    if (count !== cells.length || count !== (bounds.width + 1) * (bounds.height + 1)) return null; // QTiled 等距投影的纵坐标为 (y - x) * halfHeight，上角是 maxX/minY。

    return rotateGridPoint([bounds.maxX, bounds.minY], -angle / 90);
  }

  /** 从已校验定义解析一个方向的当前帧，不读时钟、不改定义或世界状态。
   * @param {Object} definition v1 静态或 v2 共享序列元素定义。
   * @param {number} imageAngle 已组合好的素材方向，0、90、180、270。
   * @param {Object} playback { elapsedMs: 非负有限毫秒, phase: 非负安全整数帧偏移 }。
   * 时间和暂停由调用方管理；phase 只影响循环帧索引，不改变序列、方向或锚点。
   * @returns {Object} { source, rect, anchor, sequence, frameIndex }，静态 sequence 为 null。
   */
  function resolveElementFrame(definition, imageAngle = 0, {
    elapsedMs = 0,
    phase = 0
  } = {}) {
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
      const clip = definition.sequences[sequence]; // 先将时间与相位分别取余，避免大相位加总丢失低位或长时间乘法溢出。

      const cycle = clip.frameDurationMs * clip.frames.length;
      frameIndex = (Math.floor(elapsedMs % cycle / clip.frameDurationMs) + phase % clip.frames.length) % clip.frames.length;
      frame = clip.frames[frameIndex];
    }

    return {
      source: frame.source,
      rect: [...frame.rect],
      anchor: [...view.anchor],
      sequence,
      frameIndex
    };
  }

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

  function resolveElementDraw(definition, grid = [0, 0], view = {}, objectAngle = 0, playback = {}) {
    if (![0, 90, 180, 270].includes(objectAngle)) {
      throw new RangeError('objectAngle 必须为数字 0、90、180 或 270。');
    }

    const origin = projectGrid(grid, view);
    const {
      angle = 0,
      tileSize = [8, 4]
    } = view;
    const imageAngle = (angle + objectAngle) % 360;
    const {
      source,
      rect,
      anchor,
      sequence,
      frameIndex
    } = resolveElementFrame(definition, imageAngle, playback);
    const offsets = definition.footprint.map(offset => rotateGridPoint(offset, objectAngle / 90));
    const worldCells = getIsometricNeighborsByOffsets(grid, offsets);
    const placementGrid = getRectangleTopCell(worldCells, angle);
    return {
      id: definition.id,
      angle,
      objectAngle,
      imageAngle,
      source,
      ...(sequence === null ? {} : {
        sequence,
        frameIndex
      }),
      rect: [...rect],
      anchor: [...anchor],
      origin,
      placementGrid,
      placementOrigin: placementGrid ? projectGrid(placementGrid, view) : null,
      position: [origin[0] - anchor[0], origin[1] - anchor[1]],
      tileSize: [...tileSize],
      footprint: worldCells.map(cell => ({
        grid: cell,
        position: projectGrid(cell, view)
      }))
    };
  }

  /* 平地地图定义的可选入口，不从核心 src/index.js 导出。 */

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isId(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isPair(value, checkNumber) {
    return Array.isArray(value) && value.length === 2 && Array.from(value).every(checkNumber);
  }
  /** 校验平地地图的结构和素材引用，不读取文件、不修改输入。
   * @param {Object} definition { version: 1, id, tileSize, cells, entities }
   * cells[y][x] 为 null 或 { terrain, elevation: 0, tile? }。
   * entities 中每个实例为 { id, element, grid, angle? }，省略 angle 表示 0°。
   * @param {Object} elementsById 已经通过元素校验的定义，键与元素 id 一致。
   * @returns {Array<Object>} { path, code, message } 问题列表，空列表表示通过。
   * 此处不判断地形语义、实体完整占地、共存、通行或建造是否合法。
   */


  function validateMapDefinition(definition, elementsById = {}) {
    const issues = [];

    const issue = (path, code, message) => issues.push({
      path,
      code,
      message
    });

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

      if (kind === 'tile' && (!Array.isArray(element.footprint) || element.footprint.length !== 1 || !isPair(element.footprint[0], value => value === 0))) {
        issue(path, 'unsupported-tile-footprint', '底图元素必须仅占据 [0,0] 一格。');
      }
    }

    if (validCells) {
      const {
        cells
      } = definition;
      const width = Array.isArray(cells[0]) && cells[0].length > 0 ? cells[0].length : null;
      let validShape = true;
      let hasCell = false; // entries 会访问数组空洞，避免把缺项误当作 null 或漏掉错误。

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

  function resolveMapEntities(definition, elementsById = {}, {
    angle = 0,
    originPixel = [0, 0]
  } = {}) {
    const issues = validateMapDefinition(definition, elementsById);
    if (issues.length) return {
      entities: null,
      issues
    };
    const view = {
      angle,
      originPixel,
      tileSize: definition.tileSize
    };
    const entities = definition.entities.map(entity => {
      const {
        id,
        element,
        grid,
        angle: objectAngle = 0
      } = entity;
      return {
        id,
        element,
        grid: [...grid],
        angle: objectAngle,
        draw: resolveElementDraw(elementsById[element], grid, view, objectAngle)
      };
    });
    return {
      entities,
      issues
    };
  }
  /** 检查完整世界占地并构建按格多实例索引，不改变地图或保留内部状态。
   * @param {Object} definition 地图定义；先复用 A2 的结构与引用校验。
   * @param {Object} elementsById 已通过元素契约校验的定义。
   * @param {Function} canCoexist 同格多实例规则 ({ grid, entities }) => boolean，默认允许共存。
   * 规则只收到当前格和实例姿态的副本；每个共享格调用一次，须同步返回布尔值。
   * @returns {Object} { index, issues }；index 为 Map<'x,y', string[]>，失败为 null。
   * 格键按首次遇到的占地格插入，同格 ID 按 entities 输入顺序排列；不表示像素画序。
   * 只检查真实占地，不检查定义原点；复用绘制所用旋转/偏移方法，不依赖镜头或像素。
   */

  function buildMapOccupancy(definition, elementsById = {}, canCoexist = () => true) {
    const issues = validateMapDefinition(definition, elementsById);
    if (issues.length) return {
      index: null,
      issues
    };
    if (typeof canCoexist !== 'function') throw new TypeError('canCoexist 必须是函数。');
    const {
      cells,
      entities
    } = definition;
    const index = new Map();

    for (const [entityIndex, entity] of entities.entries()) {
      const offsets = elementsById[entity.element].footprint.map(offset => rotateGridPoint(offset, (entity.angle || 0) / 90));
      const worldCells = getIsometricNeighborsByOffsets(entity.grid, offsets);

      for (const grid of worldCells) {
        const [x, y] = grid;
        let code;
        let message;

        if (!grid.every(Number.isSafeInteger)) {
          code = 'unsafe-footprint-grid';
          message = '占地世界格必须为安全整数。';
        } else if (x < 0 || y < 0 || y >= cells.length || x >= cells[0].length) {
          code = 'footprint-out-of-bounds';
          message = '实体完整占地超出地图矩阵。';
        } else if (cells[y][x] === null) {
          code = 'footprint-invalid-cell';
          message = '实体完整占地包含 null 无效格。';
        }

        if (code) {
          issues.push({
            path: `entities[${entityIndex}]`,
            code,
            message,
            entityId: entity.id,
            grid
          });
          continue;
        }

        const key = grid.join(',');
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(entity.id);
      }
    } // 几何失败时不调用场景规则，也不把裁切后的部分占地作为有效索引返回。


    if (issues.length) return {
      index: null,
      issues
    };
    const entitiesById = new Map(entities.map(entity => [entity.id, entity]));

    for (const [key, entityIds] of index) {
      if (entityIds.length < 2) continue;
      const grid = key.split(',').map(Number);
      const occupants = entityIds.map(id => {
        const {
          element,
          grid: originGrid,
          angle = 0
        } = entitiesById.get(id);
        return {
          id,
          element,
          grid: [...originGrid],
          angle
        };
      });
      const allowed = canCoexist({
        grid: [...grid],
        entities: occupants
      });
      if (typeof allowed !== 'boolean') throw new TypeError('canCoexist 必须同步返回布尔值。');

      if (!allowed) {
        issues.push({
          path: `cells[${grid[1]}][${grid[0]}]`,
          code: 'coexistence-rejected',
          message: '场景规则拒绝该格的实体共存。',
          grid,
          entityIds: [...entityIds]
        });
      }
    }

    return {
      index: issues.length ? null : index,
      issues
    };
  }
  /** 检查新增实例后的完整场景，不放置实体、不修改已有索引。
   * 候选 ID 必须与现有实体不同；已有地图错误也会拒绝本次新增。
   * @returns {Object} { allowed, issues }；候选问题沿用追加后的 entities[n] 路径。
   */

  function checkMapEntityPlacement(definition, entity, elementsById = {}, canCoexist = () => true) {
    const issues = validateMapDefinition(definition, elementsById);
    if (issues.length) return {
      allowed: false,
      issues
    };
    const result = buildMapOccupancy({ ...definition,
      entities: [...definition.entities, entity]
    }, elementsById, canCoexist);
    return {
      allowed: result.issues.length === 0,
      issues: result.issues
    };
  }
  /** 执行单条放置/删除命令，同时返回新地图与完整索引，不修改输入。
   * @param {Object} definition 原地图，结构与引用错误直接拒绝。
   * @param {Object} command { type: 'place', entity } 或 { type: 'remove', id }。
   * @param {Object} elementsById 已通过元素契约校验的定义。
   * @param {Function} canCoexist 沿用 A4 同步规则，仅检查编辑后的完整场景。
   * @returns {Object} { definition, index, issues }；失败时 definition/index 均为 null。
   * 成功复制地图外壳、实体数组、各实体及 grid；cells、tileSize 和附加嵌套字段共享只读引用。
   * 删除可以消除占地/共存问题，但不能绕过原地图的结构/引用错误；回调异常直接抛出。
   */

  function applyMapEdit(definition, command, elementsById = {}, canCoexist = () => true) {
    const issues = validateMapDefinition(definition, elementsById);
    if (issues.length) return {
      definition: null,
      index: null,
      issues
    };

    const reject = (path, code, message) => ({
      definition: null,
      index: null,
      issues: [{
        path,
        code,
        message
      }]
    });

    if (!isObject(command)) return reject('$command', 'invalid-map-edit', '地图编辑命令必须是对象。');
    let entities;

    if (command.type === 'place') {
      entities = [...definition.entities, command.entity];
    } else if (command.type === 'remove') {
      if (!isId(command.id)) return reject('$command.id', 'invalid-id', '待删除的实例 ID 必须是非空字符串。');

      if (!definition.entities.some(entity => entity.id === command.id)) {
        return reject('$command.id', 'missing-entity', '待删除的实例 ID 未在地图中找到。');
      }

      entities = definition.entities.filter(entity => entity.id !== command.id);
    } else {
      return reject('$command.type', 'unsupported-map-edit', '地图编辑命令仅支持 place 或 remove。');
    } // 直接消费一次完整构建的索引，避免候选检查后再次调用同一场景规则。


    const edited = { ...definition,
      entities
    };
    const result = buildMapOccupancy(edited, elementsById, canCoexist);
    if (result.issues.length) return {
      definition: null,
      index: null,
      issues: result.issues
    };
    edited.entities = entities.map(entity => ({ ...entity,
      grid: [...entity.grid]
    }));
    return {
      definition: edited,
      index: result.index,
      issues: result.issues
    };
  } // IO 仅接受普通 JSON 数据，防止 stringify 静默丢字段、改值或执行 toJSON/getter。
  // 只检查当前祖先链，重复引用可按值保存，循环引用不能保存。

  function checkMapJsonValue(value, path = '$', ancestors = new Set()) {
    const invalid = () => ({
      path,
      code: 'non-json-value',
      message: '地图文件仅支持可无损保存的普通 JSON 数据。'
    });

    if (value === null || typeof value === 'string' || typeof value === 'boolean') return null;
    if (typeof value === 'number') return Number.isFinite(value) && !Object.is(value, -0) ? null : invalid();
    if (typeof value !== 'object' || ancestors.has(value)) return invalid();
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== (array ? Array.prototype : Object.prototype) && !(prototype === null && !array)) return invalid();
    const keys = Reflect.ownKeys(value);
    if (array && keys.length !== value.length + 1) return invalid();
    ancestors.add(value);

    for (const key of keys) {
      if (array && key === 'length') continue;
      if (typeof key !== 'string' || array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) return invalid();
      const childPath = array ? `${path}[${key}]` : path === '$' ? key : `${path}.${key}`;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);

      if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        return {
          path: childPath,
          code: 'non-json-value',
          message: '地图文件字段必须是可枚举的自有数据属性。'
        };
      }

      const issue = checkMapJsonValue(descriptor.value, childPath, ancestors);
      if (issue) return issue;
    }

    ancestors.delete(value);
    return null;
  }
  /** 导入 JSON 文本并重建完整占用；失败不返回部分地图或索引。
   * @param {string} json 地图定义文本，不接受已解析对象。
   * @param {Object} elementsById 已通过 P0 校验的元素库，由消费者重新提供。
   * @param {Function} canCoexist 沿用 A4 同步共存规则，不从文件读取。
   * @returns {Object} { definition, index, issues }；失败时 definition/index 均为 null。
   * 保留 JSON 额外字段与省略字段；规则类型/返回值错误及回调异常直接抛出。
   */


  function importMapDefinition(json, elementsById = {}, canCoexist = () => true) {
    const invalidJson = {
      definition: null,
      index: null,
      issues: [{
        path: '$',
        code: 'invalid-json',
        message: '请输入有效的 JSON 文本。'
      }]
    };
    if (typeof json !== 'string') return invalidJson;
    let definition;

    try {
      definition = JSON.parse(json);
    } catch (error) {
      return invalidJson;
    }

    const issue = checkMapJsonValue(definition);
    if (issue) return {
      definition: null,
      index: null,
      issues: [issue]
    };
    const result = buildMapOccupancy(definition, elementsById, canCoexist);
    return {
      definition: result.issues.length ? null : definition,
      index: result.index,
      issues: result.issues
    };
  }
  /** 校验地图事实后导出格式化 JSON；不修改输入或嵌入元素库、规则和派生索引。
   * @returns {Object} { json, issues }；失败时 json 为 null。
   * 额外字段按值保存，拒绝会被 JSON 静默丢弃或改写的值，不执行自定义序列化。
   */

  function exportMapDefinition(definition, elementsById = {}, canCoexist = () => true) {
    const issue = checkMapJsonValue(definition);
    if (issue) return {
      json: null,
      issues: [issue]
    };
    const {
      issues
    } = buildMapOccupancy(definition, elementsById, canCoexist);
    return {
      json: issues.length ? null : `${JSON.stringify(definition, null, 2)}\n`,
      issues
    };
  }

  exports.applyMapEdit = applyMapEdit;
  exports.buildMapOccupancy = buildMapOccupancy;
  exports.checkMapEntityPlacement = checkMapEntityPlacement;
  exports.exportMapDefinition = exportMapDefinition;
  exports.importMapDefinition = importMapDefinition;
  exports.resolveMapEntities = resolveMapEntities;
  exports.validateMapDefinition = validateMapDefinition;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=qtiled-maps.dev.js.map
