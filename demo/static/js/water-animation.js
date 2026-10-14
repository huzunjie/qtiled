// 原作小样观察页；帧序有静态证据，时长、连铺相位及定位为演示设置。
const controls = document.getElementById('controls');
const container = document.getElementById('water-canvas');
const play = document.getElementById('play');
const duration = document.getElementById('duration');
const layout = document.getElementById('layout');
const phase = document.getElementById('phase');
const scale = document.getElementById('scale');
const grid = document.getElementById('grid');
const frame = document.getElementById('frame');
const frameLabel = document.getElementById('frame-label');
const status = document.getElementById('status');
const sampleUrl = new URL('../terrain-samples/emperor-land-water/elements.json', import.meta.url);
const tileSize = [80, 40];
const navigation = document.querySelector('.navs');
if (navigation) navigation.classList.add('closed');
let records = [];
let frames = [];
let atlas;
let anchor;
let frameIndex = 0;
let playing = false;
let requestId = null;
let lastTime = null;
let remainder = 0;
let rhombus;
let layer;
let view;
let gridGroup;
let cells = [];

function createTiles() {
  const { Group, Sprite, Polyline } = window.spritejs;
  if (view) view.remove();
  view = new Group({ pos: [320, 180], transformOrigin: [0, 0] });
  gridGroup = new Group();
  const radius = layout.value === '3' ? 1 : 0;
  const positions = rhombus.getIsometricPositions([-radius, radius], [-radius, radius], tileSize)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const vertices = rhombus.getVertexes(tileSize);
  cells = positions.map(([x, y, gridX, gridY]) => {
    const sprite = new Sprite({ texture: atlas, pos: [x, y], size: [78, 40], anchor: [0.5, 0.5] });
    const outline = new Polyline({ pos: [x, y], points: vertices, close: true, strokeColor: 'rgba(255, 255, 255, .65)', lineWidth: 1 });
    view.append(sprite);
    gridGroup.append(outline);
    return { sprite, outline, gridX, gridY };
  });
  view.append(gridGroup);
  layer.append(view);
  phase.disabled = radius === 0;
  render();
}

function render() {
  // 像素小样使用 SpriteJS 的 2D 后端并关闭插值，避免放大时混入透明边缘颜色。
  layer.canvas.getContext('2d').imageSmoothingEnabled = false;
  const zoom = Number(scale.value);
  view.attr({ scale: [zoom, zoom] });
  gridGroup.attr({ opacity: grid.checked ? 1 : 0 });
  cells.forEach(({ sprite, outline, gridX, gridY }) => {
    // 固定可复现的对照相位，不声称还原原作的初始相位算法。
    const offset = phase.value === 'offset' ? ((gridX * 5 + gridY * 7) % frames.length + frames.length) % frames.length : 0;
    const current = frames[(frameIndex + offset) % frames.length];
    const [, , width, height] = current.rect;
    sprite.attr({ sourceRect: current.rect, size: [width, height], anchor: [anchor[0] / width, anchor[1] / height] });
    outline.attr({ lineWidth: 1 / zoom });
  });
  frame.value = String(frameIndex + 1);
  frameLabel.textContent = `${frameIndex + 1} / ${frames.length} · #${records[frameIndex].id}`;
  frame.setAttribute('aria-valuetext', `中心格第 ${frameIndex + 1} 帧，原记录 ${records[frameIndex].id}`);
}

function stopRequest() {
  if (requestId !== null) cancelAnimationFrame(requestId);
  requestId = null;
  lastTime = null;
}

function tick(time) {
  requestId = null;
  if (!playing || document.hidden) return;
  if (lastTime !== null) remainder += time - lastTime;
  lastTime = time;
  const steps = Math.floor(remainder / Number(duration.value));
  if (steps > 0) {
    frameIndex = (frameIndex + steps) % frames.length;
    remainder %= Number(duration.value);
    render();
  }
  requestId = requestAnimationFrame(tick);
}

function setPlaying(value) {
  stopRequest();
  playing = value;
  play.textContent = playing ? '暂停' : '播放';
  play.setAttribute('aria-pressed', String(playing));
  status.textContent = `24 帧已加载 · ${playing ? '播放中' : '已暂停'} · 速度与起始帧差异为演示设置`;
  if (playing && !document.hidden) requestId = requestAnimationFrame(tick);
}

function selectFrame(index) {
  setPlaying(false);
  remainder = 0;
  frameIndex = (index + frames.length) % frames.length;
  render();
}

async function init() {
  try {
    rhombus = window.qtiled.shapes.rhombus;
    const response = await fetch(sampleUrl);
    if (!response.ok) throw new Error(`样本清单加载失败（${response.status}）`);
    const definitions = await response.json();
    const definition = definitions['emperor-water-deep'];
    const direction = definition?.views?.[0];
    const sequence = definition?.sequences?.[direction?.sequence];
    frames = sequence?.frames;
    anchor = direction?.anchor;
    if (!Array.isArray(frames) || frames.length !== 24 || !Array.isArray(anchor)
      || anchor.length !== 2 || !anchor.every(Number.isFinite)) throw new Error('公共深水动画定义无效');
    records = frames.map(current => {
      const entry = Object.entries(definitions).find(([id, value]) => id.startsWith('emperor-terrain-')
        && value.views?.[0]?.source === current.source
        && JSON.stringify(value.views[0].rect) === JSON.stringify(current.rect));
      if (!entry) throw new Error('公共水面帧缺少原记录对应');
      return { id: Number(entry[0].slice('emperor-terrain-'.length)) };
    });
    atlas = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (frames.some(current => current.source !== frames[0].source || !Array.isArray(current.rect)
          || current.rect.length !== 4 || !current.rect.every(Number.isInteger)
          || current.rect[0] < 0 || current.rect[1] < 0 || current.rect[2] !== 78 || current.rect[3] !== 40
          || current.rect[0] + current.rect[2] > image.naturalWidth
          || current.rect[1] + current.rect[3] > image.naturalHeight)) {
          reject(new Error('公共水面帧的图集裁切无效'));
        } else resolve(image);
      };
      image.onerror = () => reject(new Error('公共水面图集加载失败'));
      image.src = window.terrainSample.getSources(new URL('./', sampleUrl).href)[frames[0].source];
    });
    duration.value = String(sequence.frameDurationMs);
    const scene = new window.spritejs.Scene({ container, width: 640, height: 360, mode: 'static' });
    layer = scene.layer('water', { handleEvent: false, contextType: '2d' });
    play.addEventListener('click', () => setPlaying(!playing));
    document.getElementById('previous').addEventListener('click', () => selectFrame(frameIndex - 1));
    document.getElementById('next').addEventListener('click', () => selectFrame(frameIndex + 1));
    frame.addEventListener('input', () => selectFrame(Number(frame.value) - 1));
    duration.addEventListener('change', () => { remainder = 0; lastTime = null; });
    layout.addEventListener('change', createTiles);
    [phase, scale, grid].forEach(control => control.addEventListener('change', render));
    document.addEventListener('visibilitychange', () => {
      stopRequest();
      if (playing && !document.hidden) requestId = requestAnimationFrame(tick);
    });
    window.addEventListener('pagehide', stopRequest);
    window.addEventListener('pageshow', () => {
      if (playing && !document.hidden && requestId === null) requestId = requestAnimationFrame(tick);
    });
    controls.disabled = false;
    createTiles();
    status.textContent = '24 帧已加载 · 已暂停 · 速度与起始帧差异为演示设置';
  } catch (error) {
    controls.disabled = true;
    status.dataset.error = 'true';
    status.textContent = `${error.message}。请通过项目 HTTP 服务打开本页后重试。`;
  }
}

init();
