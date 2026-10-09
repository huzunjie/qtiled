import { resolveMapEntities, validateMapDefinition } from '../src/maps';
import { validateElementDefinition } from '../src/elements';
import { resolveElementPlacement } from '../src/element-rendering/placement';

const angles = [0, 90, 180, 270];
const createElement = () => ({
  version: 1, id: 'dog', kind: 'sprite',
  footprint: [[0, 0], [1, 0], [0, 1], [1, 1]],
  views: Object.fromEntries(angles.map((angle, index) => [angle, {
    source: `${angle}.png`, rect: [0, 0, 80, 80], anchor: [20 + index, 30.5 + index],
  }])),
});
const createMap = () => ({
  version: 1, id: 'first-map', tileSize: [80, 40],
  cells: Array.from({ length: 4 }, (_, y) => Array.from({ length: 6 }, (_, x) =>
    (y === 0 || y === 3) && (x === 0 || x === 5) ? null : { terrain: 'land', elevation: 0 })),
  entities: [
    { id: 'dog-a', element: 'dog', grid: [1, 1] },
    { id: 'dog-b', element: 'dog', grid: [3, 1] },
  ],
});
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};

describe('地图实体消费', () => {
  test('20 格双实例复用已校验元素，保持身份、输入顺序和各自位置', () => {
    const map = createMap();
    const element = createElement();
    const sourceInfo = Object.fromEntries(angles.map(angle => [`${angle}.png`, { width: 80, height: 80 }]));
    expect(validateElementDefinition(element, sourceInfo)).toEqual([]);
    expect(map.cells.flat().filter(Boolean)).toHaveLength(20);
    const result = resolveMapEntities(map, { dog: element });
    expect(result.issues).toEqual([]);
    expect(result.entities.map(({ id, element: reference, grid, angle }) => ({ id, reference, grid, angle }))).toEqual([
      { id: 'dog-a', reference: 'dog', grid: [1, 1], angle: 0 },
      { id: 'dog-b', reference: 'dog', grid: [3, 1], angle: 0 },
    ]);
    expect(result.entities.map(({ draw }) => draw.origin)).toEqual([[80, 0], [160, -40]]);
    expect(result.entities.map(({ draw }) => draw.footprint.map(cell => cell.grid))).toEqual([
      [[1, 1], [2, 1], [1, 2], [2, 2]],
      [[3, 1], [4, 1], [3, 2], [4, 2]],
    ]);
  });

  test('空实体集合可用默认元素库；地图尺寸优先于额外的视图尺寸', () => {
    expect(resolveMapEntities({ ...createMap(), entities: [] })).toEqual({ entities: [], issues: [] });
    const result = resolveMapEntities(createMap(), { dog: createElement() }, { tileSize: [8, 4] });
    expect(result.entities[0].draw.tileSize).toEqual([80, 40]);
    expect(result.entities[0].draw.origin).toEqual([80, 0]);
  });

  const footprints = [
    [[1, 1], [2, 1], [1, 2], [2, 2]],
    [[1, 1], [1, 2], [0, 1], [0, 2]],
    [[1, 1], [0, 1], [1, 0], [0, 0]],
    [[1, 1], [1, 0], [2, 1], [2, 0]],
  ];
  const origins = [[380, 200], [300, 240], [220, 200], [300, 160]];
  const slots = [[0, 90, 180, 270], [90, 180, 270, 0], [180, 270, 0, 90], [270, 0, 90, 180]];
  test.each(angles.flatMap((objectAngle, objectIndex) => angles.map((angle, cameraIndex) =>
    [objectAngle, angle, objectIndex, cameraIndex])))('对象 %i° / 镜头 %i°：仅投影和素材槽随镜头变化', (objectAngle, angle, objectIndex, cameraIndex) => {
    const map = createMap();
    map.entities[0].angle = objectAngle;
    const result = resolveMapEntities(map, { dog: createElement() }, { angle, originPixel: [300, 200] });
    expect(result.issues).toEqual([]);
    const [first, second] = result.entities;
    expect(first.grid).toEqual([1, 1]);
    expect(first.angle).toBe(objectAngle);
    expect(first.draw.footprint.map(cell => cell.grid)).toEqual(footprints[objectIndex]);
    expect(first.draw.origin).toEqual(origins[cameraIndex]);
    expect(first.draw.footprint[0].position).toEqual(origins[cameraIndex]);
    expect(first.draw).toMatchObject({
      id: 'dog', angle, objectAngle, imageAngle: slots[cameraIndex][objectIndex],
      source: `${slots[cameraIndex][objectIndex]}.png`,
    });
    expect(first.draw.position.map((value, i) => value + first.draw.anchor[i])).toEqual(origins[cameraIndex]);
    expect(second.draw.footprint.map(cell => cell.grid)).toEqual([[3, 1], [4, 1], [3, 2], [4, 2]]);
    expect(second.angle).toBe(0);
  });

  test.each([
    [0, [5, -3]], [90, [7, -3]], [180, [7, -2]], [270, [6, -1]],
  ])('3×2 放置结果以对象 %i° 保存，四镜头消费不重新定位', (objectAngle, expectedGrid) => {
    const element = createElement();
    element.footprint = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
    const pose = resolveElementPlacement(element, [7, -3], objectAngle, 0);
    expect(pose.grid).toEqual(expectedGrid);
    const map = createMap();
    map.entities = [{ id: 'building', element: 'dog', grid: pose.grid, angle: pose.objectAngle }];
    const saved = JSON.stringify(map);
    const baseline = resolveMapEntities(map, { dog: element }).entities[0].draw;
    expect(baseline.placementGrid).toEqual([7, -3]);
    expect(baseline.footprint).toHaveLength(6);
    for (const angle of angles) {
      const result = resolveMapEntities(JSON.parse(saved), { dog: element }, { angle });
      expect(result.entities[0].grid).toEqual(expectedGrid);
      expect(result.entities[0].draw.footprint.map(cell => cell.grid)).toEqual(baseline.footprint.map(cell => cell.grid));
    }
    expect(JSON.stringify(map)).toBe(saved);
  });

  test('不规则占地、界外原点及同格实例保留完整占地，留待 A4 判定合法性', () => {
    const element = createElement();
    element.footprint = [[-2, 0], [-2, 1], [1, 1]];
    const map = createMap();
    map.entities = ['a', 'b'].map(id => ({ id, element: 'dog', grid: [-3, -1], angle: 90 }));
    const result = resolveMapEntities(map, { dog: element });
    expect(result.issues).toEqual([]);
    result.entities.forEach(({ draw }) => {
      expect(draw.placementGrid).toBeNull();
      expect(draw.footprint.map(cell => cell.grid)).toEqual([[-3, -3], [-4, -3], [-4, 0]]);
    });
  });

  test.each([
    ['缺少第二个素材', map => { map.entities[1].element = 'missing'; }],
    ['第二个姿态无效', map => { map.entities[1].angle = null; }],
    ['格属性无效', map => { map.cells[0][1].elevation = 1; }],
  ])('%s 不返回部分实例，修正后恢复', (name, change) => {
    const map = createMap();
    const library = { dog: createElement() };
    change(map);
    const issues = validateMapDefinition(map, library);
    expect(issues).toHaveLength(1);
    expect(resolveMapEntities(map, library)).toEqual({ entities: null, issues });
    Object.assign(map, createMap());
    expect(resolveMapEntities(map, library).entities).toHaveLength(2);
  });

  test('缺地图或元素库使用 A2 诊断，非法镜头沿用既有异常', () => {
    expect(resolveMapEntities()).toEqual({ entities: null, issues: validateMapDefinition() });
    expect(resolveMapEntities(createMap()).entities).toBeNull();
    expect(() => resolveMapEntities(createMap(), { dog: createElement() }, { angle: 45 })).toThrow(RangeError);
  });

  test('冻结输入不变，修改派生数据不污染其他实例、原定义或下一次计算', () => {
    const map = freezeDeep(createMap());
    const library = freezeDeep({ dog: createElement() });
    const view = freezeDeep({ angle: 90, originPixel: [300, 200] });
    const before = JSON.stringify({ map, library, view });
    const result = resolveMapEntities(map, library, view);
    const expected = JSON.stringify(result);
    const second = JSON.stringify(result.entities[1]);
    const first = result.entities[0];
    first.grid[0] = 999;
    ['rect', 'anchor', 'origin', 'position', 'tileSize', 'placementGrid', 'placementOrigin'].forEach(key => {
      first.draw[key][0] = 999;
    });
    first.draw.footprint[0].grid[0] = 999;
    first.draw.footprint[0].position[0] = 999;
    expect(JSON.stringify(result.entities[1])).toBe(second);
    expect(JSON.stringify({ map, library, view })).toBe(before);
    expect(JSON.stringify(resolveMapEntities(map, library, view))).toBe(expected);
    expect(map.entities[0]).not.toHaveProperty('angle');
  });
});
