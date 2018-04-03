import * as qtiled from 'index';


test('qtiled.pixel2unit', () => {
  expect(qtiled.pixel2unit([0, 0],[1, 1]).join()).toBe([0, 0].join());
});


test('qtiled.getUnitsByRowCol', () => {
  expect(qtiled.getUnitsByRowCol(2,2).length).toBe(4);
});