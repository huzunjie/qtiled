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
const sampleUrl = new URL('../water-sample/sample.json', import.meta.url);
const tileSize = [80, 40];
const navigation = document.querySelector('.navs');
if (navigation) navigation.classList.add('closed');
let records = [];
let images = [];
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
    const sprite = new Sprite({ texture: images[0], pos: [x, y], size: [78, 40], anchor: [0.5, 0.5] });
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
    const offset = phase.value === 'offset' ? ((gridX * 5 + gridY * 7) % images.length + images.length) % images.length : 0;
    sprite.attr({ texture: images[(frameIndex + offset) % images.length] });
    outline.attr({ lineWidth: 1 / zoom });
  });
  frame.value = String(frameIndex + 1);
  frameLabel.textContent = `${frameIndex + 1} / ${images.length} · #${records[frameIndex].id}`;
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
    frameIndex = (frameIndex + steps) % images.length;
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
  frameIndex = (index + images.length) % images.length;
  render();
}

async function init() {
  try {
    rhombus = window.qtiled.shapes.rhombus;
    const response = await fetch(sampleUrl);
    if (!response.ok) throw new Error(`样本清单加载失败（${response.status}）`);
    const sample = await response.json();
    records = sample.frames;
    if (!Array.isArray(records) || records.length !== 24) throw new Error('样本必须包含 24 帧');
    images = await Promise.all(records.map(record => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth !== 78 || image.naturalHeight !== 40) {
          reject(new Error(`记录 #${record.id} 的尺寸不符`));
        } else resolve(image);
      };
      image.onerror = () => reject(new Error(`记录 #${record.id} 的图片加载失败`));
      image.src = new URL(record.file, sampleUrl).href;
    })));
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
