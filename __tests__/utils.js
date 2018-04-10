import * as qtiled from 'index';


test('qtiled.getUnitsByRowCol', () => {
  expect(qtiled.getUnitsByRowCol(2,2)).toHaveLength(4);
});
test('qtiled.getUnitsByRowCol.def', () => {
  expect(qtiled.getUnitsByRowCol()).toHaveLength(1);
});

test('qtiled.getNeighbourUnitsByRowCol', () => {
  expect(qtiled.getNeighbourUnitsByRowCol(2,2)).toHaveLength(12);
});
test('qtiled.getNeighbourUnitsByRowCol.def', () => {
  expect(qtiled.getNeighbourUnitsByRowCol()).toHaveLength(8);
});

test('qtiled.getDiagonalUnitsByRowCol', () => {
  expect(qtiled.getDiagonalUnitsByRowCol(3,3)).toHaveLength(5);
});
test('qtiled.getDiagonalUnitsByRowCol.def', () => {
  const ret = qtiled.getDiagonalUnitsByRowCol();
  expect(ret).toHaveLength(0);
});

test('qtiled.getUnitsByDiagonal', () => {
  const start = [0, 0];
  const end = [2, 2];
  const ret = qtiled.getUnitsByDiagonal(start, end);
  expect(ret).toHaveLength(9);
});
test('qtiled.getUnitsByDiagonal.def', () => {
  const ret = qtiled.getUnitsByDiagonal();
  expect(ret.join()).toBe([0, 0].join());
});

test('qtiled.rotateUnit', () => {
  const start = [0, 1];
  const ret = qtiled.rotateUnit(start, 90);
  expect(ret.join()).toBe([-1, 0].join());
});
test('qtiled.rotateUnit.def', () => {
  const ret = qtiled.rotateUnit();
  expect(ret.join()).toBe([0, 0].join());
});

test('qtiled.unit2pixel', () => {
  const start = [0, 1];
  const ret = qtiled.unit2pixel(start, [10 ,10]);
  expect(ret.join()).toBe([0, 10].join());
});
test('qtiled.unit2pixel.def', () => {
  const ret = qtiled.unit2pixel();
  expect(ret.join()).toBe([0, 0].join());
});

test('qtiled.pixel2unit', () => {
  const start = [0, 10];
  const ret = qtiled.pixel2unit(start, [10 ,10]);
  expect(ret.join()).toBe([0, 1].join());
});
test('qtiled.pixel2unit.def', () => {
  const ret = qtiled.pixel2unit();
  expect(ret.join()).toBe([0, 0].join());
});

test('qtiled.unit2rhombusPixel', () => {
  const start = [0, 1];
  const ret = qtiled.unit2rhombusPixel(start, [10 ,10]);
  expect(ret.join()).toBe([5, -5].join());
});
test('qtiled.unit2rhombusPixel.def', () => {
  const ret = qtiled.unit2rhombusPixel();
  expect(ret.join()).toBe([0, 0].join());
});


test('qtiled.rhombusPixel2unit', () => {
  const start = [5, -5];
  const ret = qtiled.rhombusPixel2unit(start, [10 ,10]);
  expect(ret.join()).toBe([0, 1].join());
});
test('qtiled.rhombusPixel2unit.def', () => {
  const ret = qtiled.rhombusPixel2unit();
  expect(ret.join()).toBe([0, 0].join());
});

test('qtiled.getStaggeredUnitsByRowCol', () => {
  const ret = qtiled.getStaggeredUnitsByRowCol(2, 2);
  expect(ret+'').toBe('1,0,0,1,0,0,0,-1,-1,0');
  // qtiled.getStaggeredUnitsByRowCol(4, 5, ()=>1, (...args)=>console.log(args));
});

test('qtiled.getStaggeredUnitsByRowCol.def', () => {
  const ret = qtiled.getStaggeredUnitsByRowCol();
  expect(ret+'').toBe('0,0');
});
