import astar from 'astar';


test('astar.startEqEnd', () => {
  const start = [1, 2];
  const end = start;
  const ret = astar(start,end);
  expect(ret).toHaveLength(1);
  expect(ret[0]).toBe(start);
});

test('astar.illogical', () => {
  const start = [1, 2];
  const end = [.5, .5];
  const ret = astar(start, end);
  expect(ret).toHaveLength(0);
});

test('astar.filter', () => {
  const start = [1, 1];
  const end = [1, 3];
  const ret = astar(start, end, (x, y)=>!(x==1 && y==2));
  expect(ret).toHaveLength(3);
});

test('astar.filterCost', () => {
  const start = [2, 1];
  const end = [1, 3];
  const ret = astar(start, end);
  expect(ret).toHaveLength(3);
  const ret2 = astar(start, end, (x, y, cost)=>cost==10);
  expect(ret2).toHaveLength(4);
});

test('astar.limitRect', () => {
  const start = [1, 1];
  const end = [3, 3];
  const ret = astar(start, end, (x, y)=>x>0 && x<2 && y>0 && y<2);
  expect(ret).toHaveLength(0);
});

test('astar.defaultArguments', () => {
  const ret = astar();
  expect(ret).toHaveLength(1);
});