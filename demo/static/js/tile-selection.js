/* Demo 共用选区控件；预设和键盘交互不属于基础库 API。 */
function createTileSelection({ container, getByOffsets, getByDistance, onChange }) {
  const panel = document.createElement('fieldset');
  panel.className = 'tile-selection';
  panel.innerHTML = `
    <legend>邻居选区</legend>
    <label>模式 <select data-control="mode"><option value="distance">距离区域</option><option value="custom">自定义选区</option></select></label>
    <span data-controls="distance"></span>
    <span data-controls="custom" hidden>
      <label>形状 <select data-control="shape"><option value="single">单格</option><option value="rectangle" selected>长方形</option><option value="l">L 形</option></select></label>
      <span data-controls="size">
        <label>宽 <input data-control="width" type="number" min="1" max="7" step="1" value="3"></label>
        <label>高 <input data-control="height" type="number" min="1" max="7" step="1" value="2"></label>
      </span>
      <button type="button" data-control="rotate">旋转 90°（R）</button>
      <output data-control="angle">0°</output>
      <small>围绕包围盒中心旋转；偶数尺寸可能吸附半格。R 仅作用于鼠标所在画布。</small>
    </span>`;
  container.before(panel);
  const control = name => panel.querySelector(`[data-control="${name}"]`);
  const mode = control('mode');
  const shape = control('shape');
  const width = control('width');
  const height = control('height');
  const distanceControls = panel.querySelector('[data-controls="distance"]');
  const customControls = panel.querySelector('[data-controls="custom"]');
  const sizeControls = panel.querySelector('[data-controls="size"]');
  distanceControls.innerHTML = `
    <label>距离 <input data-control="distance" type="number" min="0" max="6" step="1" value="1"></label>
    <label>类型 <select data-control="type">
      <option value="all">全部</option><option value="no_self">排除自己</option>
      <option value="border">边框</option><option value="vertex">顶点</option><option value="diamond">菱形逻辑区域</option>
    </select></label>`;
  const distanceInput = control('distance');
  const typeInput = control('type');
  // 编辑中的输入值尚未触发节点重建，查询必须使用已提交的距离。
  let distance = Number(distanceInput.value);
  let quarterTurns = 0;
  // 仅形状、尺寸或方向变化时失效；移动焦点复用旋转后的偏移。
  let rotatedOffsets = null;
  let hovered = false;
  const normalizeSize = input => {
    input.value = String(Math.max(1, Math.min(7, Math.round(Number(input.value) || 1))));
  };
  const refreshControls = () => {
    const custom = mode.value === 'custom';
    distanceControls.hidden = custom;
    customControls.hidden = !custom;
    sizeControls.hidden = shape.value !== 'rectangle';
    control('angle').value = `${quarterTurns * 90}°`;
  };
  const rotate = () => {
    if (mode.value !== 'custom') return;
    quarterTurns = (quarterTurns + 1) % 4;
    rotatedOffsets = null;
    refreshControls();
    onChange();
  };
  panel.addEventListener('change', event => {
    if ([shape, width, height].includes(event.target)) {
      normalizeSize(width);
      normalizeSize(height);
      quarterTurns = 0;
      rotatedOffsets = null;
    }
    if (event.target === distanceInput) {
      distanceInput.value = String(Math.max(0, Math.min(6, Math.round(Number(distanceInput.value) || 0))));
      distance = Number(distanceInput.value);
    }
    refreshControls();
    onChange();
  });
  control('rotate').addEventListener('click', rotate);
  container.addEventListener('mouseenter', () => { hovered = true; });
  container.addEventListener('mouseleave', () => { hovered = false; });
  window.addEventListener('blur', () => { hovered = false; });
  document.addEventListener('keydown', event => {
    if (!hovered || event.key.toLowerCase() !== 'r' || event.repeat || event.isComposing
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || event.target.closest('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) return;
    if (mode.value !== 'custom') return;
    event.preventDefault();
    rotate();
  });
  refreshControls();
  return {
    getNeighbors(originGrid) {
      if (mode.value === 'distance') return getByDistance(originGrid, distance, typeInput.value);
      if (rotatedOffsets === null) {
        let offsets = [[0, 0]];
        if (shape.value === 'l') offsets = [[-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];
        if (shape.value === 'rectangle') {
          offsets = [];
          const columns = Number(width.value);
          const rows = Number(height.value);
          for (let x = 0; x < columns; x++) {
            for (let y = 0; y < rows; y++) offsets.push([x - Math.floor((columns - 1) / 2), y - Math.floor((rows - 1) / 2)]);
          }
        }
        rotatedOffsets = qtiled.shapes.polygon.rotateSelectionOffsets(offsets, quarterTurns);
      }
      return getByOffsets(originGrid, rotatedOffsets);
    },
  };
}
