import fs from 'fs';
import path from 'path';
import vm from 'vm';

function playerFixture() {
  let now = 0;
  let nextId = 0;
  const callbacks = new Map();
  const onTime = jest.fn();
  const context = vm.createContext({
    performance: { now: () => now },
    requestAnimationFrame: callback => { callbacks.set(++nextId, callback); return nextId; },
    cancelAnimationFrame: id => callbacks.delete(id),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../demo/static/js/element-animation-player.js'), 'utf8'), context);
  const player = context.createElementAnimationPlayer(onTime);
  const advance = value => {
    now += value;
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach(callback => callback(now));
  };
  return { player, onTime, advance, callbacks };
}

test('共用播放时钟在暂停继续、重复播放与显式定位后保留累计时间', () => {
  const { player, advance, onTime, callbacks } = playerFixture();
  expect(player.elapsed()).toBe(0);
  player.play();
  player.play();
  expect(callbacks.size).toBe(1);
  advance(150);
  expect(onTime).toHaveBeenLastCalledWith(150);
  player.pause();
  expect(callbacks.size).toBe(0);
  advance(5000);
  expect(player.elapsed()).toBe(150);
  player.play();
  advance(50);
  expect(player.elapsed()).toBe(200);
  player.seek(310);
  advance(40);
  expect(player.elapsed()).toBe(350);
  player.pause();
  player.reset();
  expect(player.elapsed()).toBe(0);
  expect(player.playing).toBe(false);
});

test('共用播放时钟拒绝非法定位，销毁取消回调且不能再次启动', () => {
  const { player, advance, onTime, callbacks } = playerFixture();
  player.play();
  advance(120);
  for (const value of [-1, NaN, Infinity, '1']) expect(() => player.seek(value)).toThrow();
  expect(player.elapsed()).toBe(120);
  player.dispose();
  expect(callbacks.size).toBe(0);
  const calls = onTime.mock.calls.length;
  advance(2000);
  player.play();
  player.seek(1000);
  expect(player.elapsed()).toBe(120);
  expect(callbacks.size).toBe(0);
  expect(onTime).toHaveBeenCalledTimes(calls);
});
