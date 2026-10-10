/* 页面共用播放时钟；播放时间不写入元素或地图定义。 */
function createElementAnimationPlayer(onTime) {
  let accumulated = 0;
  let startedAt = 0;
  let playing = false;
  let request = null;
  let disposed = false;
  const elapsed = () => accumulated + (playing ? Math.max(0, performance.now() - startedAt) : 0);
  const tick = () => {
    request = null;
    if (!playing || disposed) return;
    onTime(elapsed());
    if (playing && !disposed) request = requestAnimationFrame(tick);
  };
  const pause = () => {
    if (!playing || disposed) return;
    accumulated = elapsed();
    playing = false;
    if (request !== null) cancelAnimationFrame(request);
    request = null;
    onTime(accumulated);
  };
  const seek = value => {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('播放时间必须是非负有限数。');
    if (disposed) return;
    accumulated = value;
    startedAt = performance.now();
    onTime(accumulated);
  };
  return {
    elapsed,
    get playing() { return playing; },
    play() {
      if (playing || disposed) return;
      startedAt = performance.now();
      playing = true;
      request = requestAnimationFrame(tick);
    },
    pause,
    seek,
    reset: () => seek(0),
    dispose() {
      accumulated = elapsed();
      playing = false;
      disposed = true;
      if (request !== null) cancelAnimationFrame(request);
      request = null;
    },
  };
}
