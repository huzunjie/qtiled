import * as utils from 'utils';

test('utils.getUnitsByRowCol', () => {
  expect(utils.getUnitsByRowCol(2, 2)).toHaveLength(4);
});
test('utils.getUnitsByRowCol.def', () => {
  expect(utils.getUnitsByRowCol()).toHaveLength(1);
});

test('utils.getNeighbourUnitsByRowCol', () => {
  expect(utils.getNeighbourUnitsByRowCol(2, 2)).toHaveLength(12);
});
test('utils.getNeighbourUnitsByRowCol.def', () => {
  expect(utils.getNeighbourUnitsByRowCol()).toHaveLength(8);
});

test('utils.getDiagonalUnitsByRowCol', () => {
  expect(utils.getDiagonalUnitsByRowCol(3, 3)).toHaveLength(5);
});
test('utils.getDiagonalUnitsByRowCol.def', () => {
  const ret = utils.getDiagonalUnitsByRowCol();
  expect(ret).toHaveLength(0);
});

test('utils.getUnitsByDiagonal', () => {
  const start = [0, 0];
  const end = [2, 2];
  const ret = utils.getUnitsByDiagonal(start, end);
  expect(ret).toHaveLength(9);
});
test('utils.getUnitsByDiagonal.def', () => {
  const ret = utils.getUnitsByDiagonal();
  expect(ret.join()).toBe([0, 0].join());
});

test('utils.rotateUnit', () => {
  const start = [0, 1];
  const ret = utils.rotateUnit(start, 90);
  expect(ret.join()).toBe([-1, 0].join());
});
test('utils.rotateUnit.def', () => {
  const ret = utils.rotateUnit();
  expect(ret.join()).toBe([0, 0].join());
});

test('utils.unit2pixel', () => {
  const start = [0, 1];
  const ret = utils.unit2pixel(start, [10, 10]);
  expect(ret.join()).toBe([0, 10].join());
});
test('utils.unit2pixel.def', () => {
  const ret = utils.unit2pixel();
  expect(ret.join()).toBe([0, 0].join());
});

test('utils.pixel2unit', () => {
  const start = [0, 10];
  const ret = utils.pixel2unit(start, [10, 10]);
  expect(ret.join()).toBe([0, 1].join());
});
test('utils.pixel2unit.def', () => {
  const ret = utils.pixel2unit();
  expect(ret.join()).toBe([0, 0].join());
});

test('utils.unit2rhombusPixel', () => {
  const start = [0, 1];
  const ret = utils.unit2rhombusPixel(start, [10, 10]);
  expect(ret.join()).toBe([5, -5].join());
});
test('utils.unit2rhombusPixel.def', () => {
  const ret = utils.unit2rhombusPixel();
  expect(ret.join()).toBe([0, 0].join());
});

test('utils.rhombusPixel2unit', () => {
  const start = [5, -5];
  const ret = utils.rhombusPixel2unit(start, [10, 10]);
  expect(ret.join()).toBe([0, 1].join());
});
test('utils.rhombusPixel2unit.def', () => {
  const ret = utils.rhombusPixel2unit();
  expect(ret.join()).toBe([0, 0].join());
});

test('utils.getStaggeredUnitsByRowCol.1', () => {
  const ret = utils.getStaggeredUnitsByRowCol(2, 2);
  // console.log(ret)
  expect(ret + '').toBe('1,0,0,1,1,-1,0,0');
  // utils.getStaggeredUnitsByRowCol(4, 5, ()=>1, (...args)=>console.log(args));
});

test('utils.getStaggeredUnitsByRowCol.def', () => {
  const ret = utils.getStaggeredUnitsByRowCol();
  expect(ret + '').toBe('0,0');
});

test('utils.getStaggeredUnitsByRowCol.2', () => {
  const ret = utils.getStaggeredUnitsByRowCol(1, 2);
  expect(ret + '').toBe('0,1,0,0');
});

test('utils.getStaggeredUnitsByRowCol.3', () => {
  const ret = utils.getStaggeredUnitsByRowCol(2, 1);
  expect(ret + '').toBe('1,-1,0,0');
});

test('utils.staggeredUnitRound.def', () => {
  const ret = utils.staggeredUnitRound();
  expect(ret + '').toBe('0,0');
});

test('utils.staggeredUnitRound', () => {
  const ret = utils.staggeredUnitRound([40, 25], [78, 40]);
  expect(ret + '').toBe('39,20');

  const ret1 = utils.staggeredUnitRound([78, 100], [78, 40]);
  expect(ret1 + '').toBe('117,100');
});
