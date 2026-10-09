import { applyMapEdit, buildMapOccupancy, validateMapDefinition } from '../src/maps';
import { validateElementDefinition } from '../src/elements';

const createEntity = (id, grid = [1, 1]) => ({ id, element: 'sample', grid });
const createMap = (entities = []) => ({
  version: 1, id: 'map', tileSize: [80, 40],
  cells: Array.from({ length: 4 }, () => Array.from({ length: 6 }, () => ({ terrain: 'land', elevation: 0 }))),
  entities,
});
const createLibrary = () => ({
  sample: {
    version: 1, id: 'sample', kind: 'sprite', footprint: [[0, 0], [1, 0]],
    views: Object.fromEntries([0, 90, 180, 270].map(angle => [angle, {
      source: 'sample.png', rect: [0, 0, 80, 80], anchor: [40, 60],
    }])),
  },
});
const freezeDeep = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
};
const expectRejected = (result, code, path) => {
  expect(result.definition).toBeNull();
  expect(result.index).toBeNull();
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code, path })]));
};

describe('单条地图编辑', () => {
  test('放置、删除及同 ID 同位置重放，完整结果与旧快照各自保持一致', () => {
    const map = freezeDeep(createMap());
    const library = freezeDeep(createLibrary());
    expect(validateElementDefinition(library.sample, { 'sample.png': { width: 80, height: 80 } })).toEqual([]);
    const command = freezeDeep({ type: 'place', entity: createEntity('one') });
    const rule = jest.fn(() => false);
    const placed = applyMapEdit(map, command, library, rule);
    expect(placed.issues).toEqual([]);
    expect(placed.definition.entities).toEqual([command.entity]);
    expect([...placed.index]).toEqual([['1,1', ['one']], ['2,1', ['one']]]);
    const removed = applyMapEdit(placed.definition, { type: 'remove', id: 'one' }, library, rule);
    expect(removed.issues).toEqual([]);
    expect(removed.definition.entities).toEqual([]);
    expect(removed.index).toEqual(new Map());
    expectRejected(applyMapEdit(removed.definition, { type: 'remove', id: 'one' }), 'missing-entity', '$command.id');
    const replayed = applyMapEdit(removed.definition, command, library, rule);
    expect(replayed).toEqual(placed);
    expect(replayed.index).not.toBe(placed.index);
    expect(replayed.index.get('1,1')).not.toBe(placed.index.get('1,1'));
    expect(map.entities).toEqual([]);
    expect(rule).not.toHaveBeenCalled();
  });

  test('删除中间实例仅移除其引用，剩余顺序和共享格保留，每个共享格只调用一次规则', () => {
    const map = freezeDeep(createMap([createEntity('z'), createEntity('middle', [2, 1]), createEntity('a')]));
    const library = createLibrary();
    const previous = buildMapOccupancy(map, library);
    const rule = jest.fn(() => true);
    const result = applyMapEdit(map, { type: 'remove', id: 'middle' }, library, rule);
    expect(result.issues).toEqual([]);
    expect(result.definition.entities.map(entity => entity.id)).toEqual(['z', 'a']);
    expect([...result.index]).toEqual([['1,1', ['z', 'a']], ['2,1', ['z', 'a']]]);
    expect(rule.mock.calls.map(([{ grid, entities }]) => [grid, entities.map(entity => entity.id)])).toEqual([
      [[1, 1], ['z', 'a']], [[2, 1], ['z', 'a']],
    ]);
    expect([...previous.index]).toEqual([['1,1', ['z', 'a']], ['2,1', ['z', 'middle', 'a']], ['3,1', ['middle']]]);
  });

  test.each([
    ['越界', createEntity('new', [5, 1]), 'footprint-out-of-bounds', 'entities[1]', [6, 1]],
    ['空洞', createEntity('new', [4, 2]), 'footprint-invalid-cell', 'entities[1]', [5, 2]],
    ['重复 ID', createEntity('existing'), 'duplicate-entity-id', 'entities[1].id', null],
    ['共存拒绝', createEntity('new'), 'coexistence-rejected', 'cells[1][1]', [1, 1]],
  ])('%s 失败保留地图、候选与旧索引，修正命令后可重试', (name, entity, code, path, grid) => {
    const map = createMap([createEntity('existing')]);
    map.cells[2][5] = null;
    const library = freezeDeep(createLibrary());
    const command = freezeDeep({ type: 'place', entity });
    freezeDeep(map);
    const previous = buildMapOccupancy(map, library);
    const before = JSON.stringify({ map, command, library, index: [...previous.index] });
    const rule = jest.fn(() => false);
    const result = applyMapEdit(map, command, library, rule);
    expectRejected(result, code, path);
    if (grid) expect(result.issues[0].grid).toEqual(grid);
    expect(rule).toHaveBeenCalledTimes(name === '共存拒绝' ? 2 : 0);
    const retry = applyMapEdit(map, { type: 'place', entity: createEntity('fixed', [3, 1]) }, library, rule);
    expect(retry.issues).toEqual([]);
    expect([...retry.index]).toEqual([
      ['1,1', ['existing']], ['2,1', ['existing']], ['3,1', ['fixed']], ['4,1', ['fixed']],
    ]);
    expect(JSON.stringify({ map, command, library, index: [...previous.index] })).toBe(before);
  });

  test('已确定的对象姿态按真实旋转占地放置和删除，不重新选择放置原点', () => {
    const library = createLibrary();
    const entity = { ...createEntity('turned', [2, 1]), angle: 90 };
    const placed = applyMapEdit(createMap(), { type: 'place', entity }, library);
    expect(placed.issues).toEqual([]);
    expect(placed.definition.entities).toEqual([entity]);
    expect([...placed.index]).toEqual([['2,1', ['turned']], ['2,2', ['turned']]]);
    expect(applyMapEdit(placed.definition, { type: 'remove', id: entity.id }, library).index).toEqual(new Map());
  });

  test('复制实体和坐标，保留共享只读字段；回调修改参数不污染结果', () => {
    const map = createMap([createEntity('old')]);
    map.extra = { title: '原图' };
    map.entities[0].extra = { tag: '保留' };
    freezeDeep(map);
    const library = freezeDeep(createLibrary());
    const command = freezeDeep({ type: 'place', entity: { ...createEntity('new'), extra: { tag: '新增' } } });
    const before = JSON.stringify({ map, command, library });
    const rule = jest.fn(({ grid, entities }) => {
      grid[0] = 999;
      entities[0].grid[0] = 999;
      entities[1].id = 'changed';
      entities.pop();
      return true;
    });
    const result = applyMapEdit(map, command, library, rule);
    expect(result.issues).toEqual([]);
    expect(rule).toHaveBeenCalledTimes(2);
    expect(result.definition).not.toBe(map);
    expect(result.definition.entities).not.toBe(map.entities);
    for (const key of ['cells', 'tileSize', 'extra']) expect(result.definition[key]).toBe(map[key]);
    [map.entities[0], command.entity].forEach((source, index) => {
      const entity = result.definition.entities[index];
      expect(entity).toEqual(source);
      expect(entity).not.toBe(source);
      expect(entity.grid).not.toBe(source.grid);
      expect(entity.extra).toBe(source.extra);
      expect(entity).not.toHaveProperty('angle');
      entity.grid[0] = 99;
      entity.id = 'local';
    });
    result.index.get('1,1').pop();
    expect(result.index.get('2,1')).toEqual(['old', 'new']);
    expect(JSON.stringify({ map, command, library })).toBe(before);
  });

  test.each([
    [undefined, 'invalid-map-edit', '$command'], [null, 'invalid-map-edit', '$command'],
    [[], 'invalid-map-edit', '$command'], [{}, 'unsupported-map-edit', '$command.type'],
    [{ type: 'move' }, 'unsupported-map-edit', '$command.type'],
    [{ type: 'remove', id: ' ' }, 'invalid-id', '$command.id'],
    [{ type: 'remove', id: 1 }, 'invalid-id', '$command.id'],
    [{ type: 'remove', id: 'absent' }, 'missing-entity', '$command.id'],
    [{ type: 'place' }, 'invalid-entity', 'entities[0]'],
    [{ type: 'place', entity: { ...createEntity('new'), element: 'missing' } }, 'missing-element', 'entities[0].element'],
    [{ type: 'place', entity: createEntity('new', [NaN, 1]) }, 'invalid-grid', 'entities[0].grid'],
  ])('非法命令或候选 %j 返回明确问题，不执行场景规则', (command, code, path) => {
    const rule = jest.fn(() => true);
    expectRejected(applyMapEdit(freezeDeep(createMap()), command, createLibrary(), rule), code, path);
    expect(rule).not.toHaveBeenCalled();
  });

  test('原图结构和引用问题优先返回，删除不绕过重复 ID 或坏引用', () => {
    expect(applyMapEdit()).toEqual({ definition: null, index: null, issues: validateMapDefinition() });
    const library = createLibrary();
    const maps = [
      { ...createMap(), cells: [] },
      createMap([createEntity('same'), createEntity('same')]),
      createMap([{ ...createEntity('same'), element: 'missing' }]),
    ];
    const rule = jest.fn(() => true);
    for (const map of maps) {
      freezeDeep(map);
      for (const command of [{ type: 'remove', id: 'same' }, { type: 'place', entity: createEntity('new') }, null]) {
        expect(applyMapEdit(map, command, library, rule)).toEqual({
          definition: null, index: null, issues: validateMapDefinition(map, library),
        });
      }
    }
    expect(rule).not.toHaveBeenCalled();
  });

  test.each(['占地', '共存'])('原图%s冲突拒绝新增或无关删除，删除问题实例后恢复', kind => {
    const map = freezeDeep(createMap([
      createEntity('keep'), createEntity('bad', kind === '占地' ? [5, 1] : [1, 1]), createEntity('unrelated', [3, 2]),
    ]));
    const library = createLibrary();
    const code = kind === '占地' ? 'footprint-out-of-bounds' : 'coexistence-rejected';
    const path = kind === '占地' ? 'entities[1]' : 'cells[1][1]';
    const rule = () => false;
    expectRejected(applyMapEdit(map, { type: 'place', entity: createEntity('new', [0, 3]) }, library, rule), code, path);
    expectRejected(applyMapEdit(map, { type: 'remove', id: 'unrelated' }, library, rule), code, path);
    const fixed = applyMapEdit(map, { type: 'remove', id: 'bad' }, library, rule);
    expect(fixed.issues).toEqual([]);
    expect(fixed.definition.entities.map(entity => entity.id)).toEqual(['keep', 'unrelated']);
    expect([...fixed.index]).toEqual([['1,1', ['keep']], ['2,1', ['keep']], ['3,2', ['unrelated']], ['4,2', ['unrelated']]]);
  });

  test('删除后的场景被规则拒绝时保留旧结果，规则修正后重试成功', () => {
    const map = freezeDeep(createMap(['c', 'b', 'a'].map(id => createEntity(id))));
    const library = createLibrary();
    const previous = buildMapOccupancy(map, library, ({ entities }) => entities.length === 3);
    const command = { type: 'remove', id: 'b' };
    const rule = jest.fn(({ entities }) => entities.length === 3);
    expectRejected(applyMapEdit(map, command, library, rule), 'coexistence-rejected', 'cells[1][1]');
    expect(rule).toHaveBeenCalledTimes(2);
    expect(previous.index.get('1,1')).toEqual(['c', 'b', 'a']);
    expect(applyMapEdit(map, command, library).index.get('1,1')).toEqual(['c', 'a']);
  });

  test.each([null, () => undefined, () => Promise.resolve(true), () => { throw new Error('规则故障'); }])(
    '非法规则或异常直接抛出，调用方状态不替换，修正规则后恢复', rule => {
      const map = freezeDeep(createMap([createEntity('old')]));
      const library = freezeDeep(createLibrary());
      let state = { definition: map, ...buildMapOccupancy(map, library) };
      const previous = state;
      const command = freezeDeep({ type: 'place', entity: createEntity('new') });
      const before = JSON.stringify({ map, library, command, index: [...state.index] });
      expect(() => { state = applyMapEdit(state.definition, command, library, rule); }).toThrow();
      expect(state).toBe(previous);
      expect(JSON.stringify({ map, library, command, index: [...state.index] })).toBe(before);
      state = applyMapEdit(state.definition, command, library);
      expect(state.issues).toEqual([]);
      expect(state.index.get('1,1')).toEqual(['old', 'new']);
    },
  );
});
