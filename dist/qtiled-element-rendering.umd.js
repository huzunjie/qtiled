
/**
 * qtiled v0.2.7
 * (c) 2008-2026 huzunjie
 * Released under MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('spritejs')) :
  typeof define === 'function' && define.amd ? define(['exports', 'spritejs'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qtiledElementRendering = {}, global.spritejs));
}(this, (function (exports, spritejs) { 'use strict';

  /** 加载调用方明确列出的图片，不扫描素材库；仅在调用时使用浏览器 API。
   * @param {Object} sourceFiles 相对路径 → Blob/File 或图片 URL 字符串。
   * @returns {Promise<Object>} { sources, sourceInfo, issues }；保留成功项，逐项报告失败。
   * sources 保存 HTMLImageElement；sourceInfo 使用图片实际尺寸。临时 Blob URL 无论成功失败均释放。
   */
  async function loadElementSources(sourceFiles = {}) {
    const results = await Promise.all(Object.entries(sourceFiles).map(async ([path, file]) => {
      let objectUrl;

      try {
        let url;

        if (typeof file === 'string' && file.length) {
          url = file;
        } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
          objectUrl = URL.createObjectURL(file);
          url = objectUrl;
        } else {
          throw new TypeError('图片来源必须是 Blob/File 或非空 URL 字符串。');
        }

        const image = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';

          image.onload = () => {
            if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image);else reject(new Error('图片实际尺寸为空。'));
          };

          image.onerror = () => reject(new Error('图片加载失败，请检查文件路径或跨域许可。'));

          image.src = url;
        });
        return {
          path,
          image
        };
      } catch (error) {
        return {
          path,
          issue: {
            path,
            code: 'source-load-failed',
            message: error.message
          }
        };
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    }));
    const sources = Object.create(null);
    const sourceInfo = Object.create(null);
    const issues = [];
    results.forEach(({
      path,
      image,
      issue
    }) => {
      if (issue) issues.push(issue);else {
        sources[path] = image;
        sourceInfo[path] = {
          width: image.naturalWidth,
          height: image.naturalHeight
        };
      }
    });
    return {
      sources,
      sourceInfo,
      issues
    };
  }

  /* 二维多边形相关配置及基础方法 */

  /* 基础配置参数（个别参数调整涉及算法变化，所以放全局配置，以示特殊）*/
  const HALF = 0.5;
  const FLAH = -HALF;
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
  /* 得到一个多边形折线顶点坐标集合
   * @param  {Array}     baseVertexes    多边形顶点配置，如上文的: rectVertexes
   * @param  {Number}    width         渲染时的宽度值
   * @param  {Number}    height        渲染时的高度值
   * @param  {String}    axis          主轴方向 'x' || 'y'；默认为 'y'，上下是尖
   * @return {Array}     [x, y]
   */

  function getVertexes$1(baseVertexes, width = 1, height = 1, axis = 'y') {
    let fun = ([vertexX, vertexY]) => [vertexX * width, vertexY * height]; // 如果是要将多边形图案横过来的，旋转90度（六边形会比较大的不同）


    if (axis === 'x') {
      fun = ([vertexX, vertexY]) => [vertexY * width, vertexX * height];
    }

    return baseVertexes.map(fun);
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


  const vertexes = [[0, FLAH], [HALF, 0], [0, HALF], [FLAH, 0]]; // 非错列元素的上、右、下、左，四个边邻居 [xNum, yNum, cost, angStr] 差值及距离成本
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
  /* 根据计划渲染的菱形宽高值，得到顶点坐标集合
  * @param  {Array}   size    如： [width{Number}, height{Number}]
  * @return {Array}   [[x, y], ...]
  */

  function getVertexes([width = 1, height = 1] = [1, 1]) {
    return getVertexes$1(vertexes, width, height);
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
  /** 将矩形占地当前画面的上角格对齐放置基准格，返回可直接交给绘制计算的姿态。
   * @param {Object} definition 已通过元素契约校验的定义；这里只支持完整矩形占地。
   * @param {Array<number>} placementGrid 光标命中的世界整数格，默认 [0, 0]。
   * @param {number} objectAngle 目标对象朝向，0、90、180 或 270。
   * @param {number} viewAngle 放置/转向发生时的镜头角度，之后转镜头不重新调用本函数。
   * @returns {Object} { grid, objectAngle }；grid 是定义原点的世界格，不是固定转轴。
   * 每次从原始占地计算，不改 JSON，也不把图片像素锚点当成旋转中心。
   */

  function resolveElementPlacement(definition, placementGrid = [0, 0], objectAngle = 0, viewAngle = 0) {
    checkAngle(objectAngle, 'objectAngle');
    checkAngle(viewAngle, 'viewAngle');

    if (!Array.isArray(placementGrid) || placementGrid.length !== 2 || !placementGrid.every(Number.isInteger)) {
      throw new TypeError('placementGrid 必须为两个有限整数。');
    }

    if (!getRectangleTopCell(definition.footprint)) {
      throw new RangeError('仅完整矩形占地支持上角格定位；不规则占地的转向规则尚未确认。');
    }

    const offsets = definition.footprint.map(cell => rotateGridPoint(cell, objectAngle / 90));
    const top = getRectangleTopCell(offsets, viewAngle);
    return {
      grid: placementGrid.map((value, i) => value - top[i]),
      objectAngle
    };
  }

  /** 将已通过元素契约校验的定义解释为绘制数据，不加载图片或创建渲染对象。
   * @param {Object} definition 由 importElementDefinition/validateElementDefinition 确认有效的定义。
   * @param {Array<number>} grid 定义原点的世界整数格，默认 [0, 0]；放置姿态由 resolveElementPlacement 计算。
   * @param {Object} view P0-B 视图参数，angle 仅表示镜头角度，缺省为 0。
   * @param {number} objectAngle 对象朝向，0、90、180 或 270，默认 0；与镜头采用相同旋转正向。
   * @returns {Object} 镜头/对象/素材角度、素材引用、裁切、锚点、左上角位置、原点像素与占地世界格/像素。
   * 图片锚点相对裁切左上角；位置 = 原点投影 - 锚点，不按图片尺寸猜占地或缩放图片。
   * 本函数只绘制给定姿态，不决定转向时的位置；不能固定 grid 后只改 objectAngle 来模拟建筑原地转向。
   * placementGrid/placementOrigin 是矩形在当前镜头下的上角格/像素；非矩形返回 null，不猜测放置规则。
   */

  function resolveElementDraw(definition, grid = [0, 0], view = {}, objectAngle = 0) {
    if (![0, 90, 180, 270].includes(objectAngle)) {
      throw new RangeError('objectAngle 必须为数字 0、90、180 或 270。');
    }

    const origin = projectGrid(grid, view);
    const {
      angle = 0,
      tileSize = [8, 4]
    } = view;
    const imageAngle = (angle + objectAngle) % 360;

    if (!Object.prototype.hasOwnProperty.call(definition.views, imageAngle)) {
      throw new Error(`views.${imageAngle} 缺少显式素材配置。`);
    }

    const {
      source,
      rect,
      anchor
    } = definition.views[imageAngle];
    const offsets = definition.footprint.map(offset => rotateGridPoint(offset, objectAngle / 90));
    const worldCells = getIsometricNeighborsByOffsets(grid, offsets);
    const placementGrid = getRectangleTopCell(worldCells, angle);
    return {
      id: definition.id,
      angle,
      objectAngle,
      imageAngle,
      source,
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

  const renderedGroups = new WeakMap();
  /** 在现有 SpriteJS 容器中替换本函数拥有的元素组，保留调用方其他节点。
   * @param {Object} container SpriteJS Layer 或 Group，生命周期由调用方管理；多实例各用独立 Group。
   * @param {Object|null} drawInfo resolveElementDraw 的结果；null 清除本元素组。
   * @param {Object} sources loadElementSources 返回的图片索引。
   * @param {Object} overlays { gridPositions: 像素坐标数组, footprint: true, placement: true, bounds: false }。
   * @returns {Object|null} 当前元素 Group；不改变输入，不在内部异步加载图片。
   */

  function renderElement(container, drawInfo, sources = {}, overlays = {}) {
    const previous = renderedGroups.get(container);
    if (previous) previous.remove();
    renderedGroups.delete(container);
    if (!drawInfo) return null;
    const image = Object.prototype.hasOwnProperty.call(sources, drawInfo.source) ? sources[drawInfo.source] : null;
    if (!image) throw new Error(`未加载图片：${drawInfo.source}`);
    const group = new spritejs.Group();
    const vertexes = getVertexes(drawInfo.tileSize);

    for (const position of overlays.gridPositions || []) {
      group.append(new spritejs.Polyline({
        pos: position,
        points: vertexes,
        close: true,
        strokeColor: '#d4dce3',
        lineWidth: 1
      }));
    }

    const [,, width, height] = drawInfo.rect;
    group.append(new spritejs.Sprite({
      texture: image,
      sourceRect: [...drawInfo.rect],
      pos: [...drawInfo.position],
      size: [width, height],
      anchor: [0, 0]
    }));

    if (overlays.footprint !== false) {
      drawInfo.footprint.forEach(({
        position
      }) => group.append(new spritejs.Polyline({
        pos: position,
        points: vertexes,
        close: true,
        strokeColor: '#ce871c',
        fillColor: 'rgba(255, 190, 55, 0.12)',
        lineWidth: 2
      })));
    }

    if (overlays.bounds) {
      group.append(new spritejs.Polyline({
        pos: drawInfo.position,
        points: [[0, 0], [width, 0], [width, height], [0, height]],
        close: true,
        strokeColor: '#7395b9',
        lineWidth: 1
      }));
    }

    if (overlays.placement !== false && drawInfo.placementOrigin) {
      group.append(new spritejs.Polyline({
        pos: drawInfo.placementOrigin,
        points: [[0, -7], [7, 0], [0, 7], [-7, 0]],
        close: true,
        strokeColor: '#1976b5',
        lineWidth: 2
      }));
    }

    container.append(group);
    renderedGroups.set(container, group);
    return group;
  }

  /* 静态元素定义的可选入口，不从核心 src/index.js 导出。 */
  const VIEW_ANGLES = ['0', '90', '180', '270'];

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isTuple(value, length, checkNumber) {
    return Array.isArray(value) && value.length === length && Array.from(value).every(checkNumber);
  }

  function isSourcePath(value) {
    return typeof value === 'string' && value.trim().length > 0 && !/^[a-z][a-z\d+.-]*:/i.test(value) && !value.includes('\\') && value.split('/').every(part => part !== '' && part !== '.' && part !== '..');
  }
  /** 校验静态元素定义，不读取图片、不修复数据、不修改输入。
   * @param {Object} definition { version: 1, id, kind, footprint, views }
   * @param {Object} sourceInfo 按相对图片路径索引的 { width, height }，由调用方提供实际尺寸
   * @returns {Array<Object>} 问题列表，每项为 { path, code, message }；空列表表示通过
   * 四向分别使用 '0'/'90'/'180'/'270' 键；锚点相对裁切区域左上角，可在区域之外。
   * 占地为不重复的整数偏移，不要求包含原点；此校验不证明素材方向或占地符合原作。
   */


  function validateElementDefinition(definition, sourceInfo = {}) {
    const issues = [];

    const issue = (path, code, message) => issues.push({
      path,
      code,
      message
    });

    if (!isObject(definition)) {
      issue('$', 'invalid-definition', '元素定义必须是对象。');
      return issues;
    }

    if (definition.version !== 1) issue('version', 'unsupported-version', '元素定义版本必须为数字 1。');

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

      let size;

      if (!isSourcePath(view.source)) {
        issue(`${path}.source`, 'invalid-source-path', '图片必须使用 / 分隔的相对文件路径，不含协议、反斜杠、空路径段或 .、.. 路径段。');
      } else if (!isObject(sourceInfo) || !Object.prototype.hasOwnProperty.call(sourceInfo, view.source)) {
        issue(`${path}.source`, 'missing-source', '图片引用未在 sourceInfo 中找到。');
      } else {
        const candidate = sourceInfo[view.source];

        if (!isObject(candidate) || !Number.isInteger(candidate.width) || candidate.width <= 0 || !Number.isInteger(candidate.height) || candidate.height <= 0) {
          issue(`${path}.source`, 'invalid-source-size', '图片实际宽高必须是正整数。');
        } else {
          size = candidate;
        }
      }

      if (!isTuple(view.rect, 4, Number.isInteger) || view.rect[0] < 0 || view.rect[1] < 0 || view.rect[2] <= 0 || view.rect[3] <= 0) {
        issue(`${path}.rect`, 'invalid-rect', '裁切矩形必须为 [x, y, width, height]，使用整数，起点非负且宽高为正。');
      } else if (size && (view.rect[0] + view.rect[2] > size.width || view.rect[1] + view.rect[3] > size.height)) {
        issue(`${path}.rect`, 'rect-out-of-bounds', '裁切矩形超出图片实际尺寸。');
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

  function importElementDefinition(json, sourceInfo = {}) {
    const invalidJson = {
      definition: null,
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

    const issues = validateElementDefinition(definition, sourceInfo);
    return {
      definition: issues.length ? null : definition,
      issues
    };
  }
  /** 应用一次工具编辑，返回新定义；允许暂时非法的草稿，由统一校验器报告问题。
   * @param {Object} definition 当前定义或草稿，调用方将其视为不可变数据。
   * @param {Object} edit { field: 'footprint'|'source'|'rect'|'anchor', value, angle? }。
   * angle 仅在修改视图字段时使用，必须是数字 0/90/180/270。
   * 仅复制修改路径及传入数组；未修改分支与原定义共享，不自动联动裁切和锚点。
   */

  function applyElementEdit(definition, {
    field,
    value,
    angle
  } = {}) {
    const copyValue = Array.isArray(value) ? value.map(item => Array.isArray(item) ? [...item] : item) : value;
    if (field === 'footprint') return { ...definition,
      footprint: copyValue
    };
    if (!['source', 'rect', 'anchor'].includes(field)) throw new TypeError('不支持的元素编辑字段。');
    if (![0, 90, 180, 270].includes(angle)) throw new RangeError('编辑方向必须为 0、90、180、270。');
    return { ...definition,
      views: { ...definition.views,
        [angle]: { ...definition.views[angle],
          [field]: copyValue
        }
      }
    };
  }
  /** 正式导出前复用完整契约校验；不嵌入图片，不补方向或修改定义。
   * @returns {Object} { json: 格式化 JSON 文本或 null, issues: 问题列表 }。
   */

  function exportElementDefinition(definition, sourceInfo = {}) {
    const issues = validateElementDefinition(definition, sourceInfo);
    return {
      json: issues.length ? null : `${JSON.stringify(definition, null, 2)}\n`,
      issues
    };
  }

  exports.applyElementEdit = applyElementEdit;
  exports.exportElementDefinition = exportElementDefinition;
  exports.importElementDefinition = importElementDefinition;
  exports.loadElementSources = loadElementSources;
  exports.renderElement = renderElement;
  exports.resolveElementDraw = resolveElementDraw;
  exports.resolveElementPlacement = resolveElementPlacement;
  exports.validateElementDefinition = validateElementDefinition;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
