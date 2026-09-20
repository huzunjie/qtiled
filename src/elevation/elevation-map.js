/* 海拔地图数据管理

 * 用于管理菱形布局中每个瓦片的海拔值，支持稀疏存储和动态扩展。
 * 海拔值为整数（0 表示平地，正值表示高地，负值表示低地）。
 *
 * 示例：
 *   const map = new ElevationMap([10, 10], 0);
 *   map.set(2, 3, 2);
 *   map.get(2, 3); // 2
 */

/* 将坐标转换为字符串 key */
function gridCoordToKey([gridX, gridY]) {
  return `${gridX}_${gridY}`;
}

/* 海拔地图数据类 */
export default class ElevationMap {
  /* 构造海拔地图
   * @param {Array}  [width, height]  地图尺寸，如 [10, 10]
   * @param {Number} defaultElevation 默认海拔值，默认为 0
   */
  constructor([width = 0, height = 0] = [0, 0], defaultElevation = 0) {
    this.width = width;
    this.height = height;
    this.defaultElevation = defaultElevation;
    this._data = new Map();
    this._max = defaultElevation;
    this._min = defaultElevation;
  }

  /* 判断坐标是否在地图范围内
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @return {Boolean}
   */
  inBounds(gridX, gridY) {
    return gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height;
  }

  /* 获取指定瓦片的海拔值
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @return {Number} 海拔值
   */
  get(gridX, gridY) {
    return this._data.get(gridCoordToKey([gridX, gridY])) ?? this.defaultElevation;
  }

  /* 设置指定瓦片的海拔值
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @param  {Number} level 海拔值
   * @return {ElevationMap} this（支持链式调用）
   */
  set(gridX, gridY, level) {
    const key = gridCoordToKey([gridX, gridY]);
    this._data.set(key, level);
    if (level > this._max) this._max = level;
    if (level < this._min) this._min = level;
    return this;
  }

  /* 批量设置海拔值
   * @param  {Array} entries 坐标与海拔值数组，如 [[x, y, level], ...]
   * @return {ElevationMap} this
   */
  setBatch(entries = []) {
    entries.forEach(([gridX, gridY, level]) => this.set(gridX, gridY, level));
    return this;
  }

  /* 获取地图最高海拔值
   * @return {Number}
   */
  getMaxElevation() {
    return this._max;
  }

  /* 获取地图最低海拔值
   * @return {Number}
   */
  getMinElevation() {
    return this._min;
  }

  /* 获取指定瓦片与相邻瓦片的海拔差集合
   * @param  {Number} xNum
   * @param  {Number} yNum
   * @param  {Array}  neighbors 邻居坐标数组 [[xNum, yNum], ...]，如不传则返回空数组
   * @return {Array} [[xNum, yNum, diff], ...]
   */
  getDiffs(gridX, gridY, neighbors = []) {
    const currentElevation = this.get(gridX, gridY);
    return neighbors.map(([neighborGridX, neighborGridY]) => {
      if (!this.inBounds(neighborGridX, neighborGridY)) return [neighborGridX, neighborGridY, null];
      return [neighborGridX, neighborGridY, this.get(neighborGridX, neighborGridY) - currentElevation];
    });
  }

  /* 验证指定区域是否为平整区域（所有瓦片海拔值相同）
   * @param  {Number} xNum   起始 X 坐标
   * @param  {Number} yNum   起始 Y 坐标
   * @param  {Number} areaWidth  区域宽度
   * @param  {Number} areaHeight 区域高度
   * @return {Boolean}
   */
  validateFlatArea(gridX, gridY, areaWidth = 1, areaHeight = 1) {
    const baseElevation = this.get(gridX, gridY);
    for (let currentGridY = gridY; currentGridY < gridY + areaHeight; currentGridY++) {
      for (let currentGridX = gridX; currentGridX < gridX + areaWidth; currentGridX++) {
        if (this.get(currentGridX, currentGridY) !== baseElevation) return false;
      }
    }
    return true;
  }

  /* 按海拔值分组瓦片坐标
   * @return {Object} { level: [[xNum, yNum], ...], ... }
   */
  getElevationGroups() {
    const groups = {};
    // 先收集默认海拔的瓦片（地图范围内未单独设置的）
    for (let gridY = 0; gridY < this.height; gridY++) {
      for (let gridX = 0; gridX < this.width; gridX++) {
        const level = this.get(gridX, gridY);
        const key = String(level);
        if (!groups[key]) groups[key] = [];
        groups[key].push([gridX, gridY]);
      }
    }
    return groups;
  }

  /* 导出为二维数组（行优先）
   * @return {Array} [[level, ...], ...]
   */
  toArray() {
    const result = [];
    for (let gridY = 0; gridY < this.height; gridY++) {
      const row = [];
      for (let gridX = 0; gridX < this.width; gridX++) {
        row.push(this.get(gridX, gridY));
      }
      result.push(row);
    }
    return result;
  }

  /* 从二维数组导入海拔数据
   * @param  {Array} data 二维海拔数组 [[level, ...], ...]
   * @return {ElevationMap} this
   */
  fromArray(data = []) {
    this.width = data[0] ? data[0].length : 0;
    this.height = data.length;
    this._data.clear();
    this._max = this.defaultElevation;
    this._min = this.defaultElevation;
    for (let gridY = 0; gridY < data.length; gridY++) {
      for (let gridX = 0; gridX < data[gridY].length; gridX++) {
        this.set(gridX, gridY, data[gridY][gridX]);
      }
    }
    return this;
  }

  /* 导出为 JSON 可序列化对象
   * @return {Object} { width, height, defaultElevation, data: { key: level, ... } }
   */
  toJSON() {
    const data = {};
    this._data.forEach((level, key) => { data[key] = level; });
    return {
      width: this.width,
      height: this.height,
      defaultElevation: this.defaultElevation,
      data,
    };
  }

  /* 从 JSON 对象恢复海拔地图
   * @param  {Object} json 序列化对象
   * @return {ElevationMap} this
   */
  fromJSON(json = {}) {
    this.width = json.width || 0;
    this.height = json.height || 0;
    this.defaultElevation = json.defaultElevation ?? 0;
    this._data.clear();
    this._max = this.defaultElevation;
    this._min = this.defaultElevation;
    const entries = json.data || {};
    Object.keys(entries).forEach((key) => {
      const level = entries[key];
      this._data.set(key, level);
      if (level > this._max) this._max = level;
      if (level < this._min) this._min = level;
    });
    return this;
  }
}
