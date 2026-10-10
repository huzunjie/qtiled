/* 只读地形上下文；直接消费地图的规则、素材和绘制解析，不维护第二份四向配图表。 */
(function () {
  const get = id => document.getElementById(id);
  const directory = new URL('./static/terrain-samples/', document.baseURI);
  let library;
  let loading = false;

  async function json(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`上下文文件读取失败（${response.status}）。`);
    return response.json();
  }

  function render() {
    const { map, elements, sources, landRules, heightRules, samples } = library;
    const sample = samples.find(item => item.id === get('context-sample').value);
    const figures = [0, 90, 180, 270].map(angle => {
      const resolved = window.elevationRules.resolve(map, elements, landRules, heightRules, angle);
      if (resolved.issues.length) throw new Error(`${resolved.issues[0].path}：${resolved.issues[0].message}`);
      const view = { angle, tileSize: map.tileSize, originPixel: [0, 0] };
      const draws = resolved.tiles.flatMap(tile => window.elevationRendering.resolveTileDraws(tile, map, elements, view)
        .map(draw => ({ tile, depth: window.qtiledView.projectGrid(tile.grid, view)[1], draw })));
      const focus = draws.find(({ tile }) => tile.grid.every((value, axis) => value === sample.grid[axis]));
      const figure = document.createElement('figure');
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      canvas.setAttribute('aria-label', `${sample.label} ${angle}度上下文`);
      const context = canvas.getContext('2d');
      const offset = [160 - focus.draw.origin[0], 160 - focus.draw.origin[1]];
      context.imageSmoothingEnabled = false;
      draws.sort((a, b) => a.depth - b.depth).forEach(({ draw }) => {
        context.drawImage(sources[draw.source], ...draw.rect,
          draw.position[0] + offset[0], draw.position[1] + offset[1], draw.rect[2], draw.rect[3]);
      });
      context.beginPath();
      [[160, 140], [200, 160], [160, 180], [120, 160]].forEach(([x, y], index) => {
        if (index) context.lineTo(x, y);
        else context.moveTo(x, y);
      });
      context.closePath();
      context.strokeStyle = '#e97819';
      context.lineWidth = 2;
      context.stroke();
      const caption = document.createElement('figcaption');
      caption.textContent = `${angle}° · ${focus.tile.element} · 锚点 [${focus.draw.anchor}] · 所属格 [${sample.grid}]`;
      figure.dataset.angle = String(angle);
      figure.dataset.element = focus.tile.element;
      figure.dataset.anchor = JSON.stringify(focus.draw.anchor);
      figure.dataset.grid = JSON.stringify(sample.grid);
      figure.append(canvas, caption);
      return figure;
    });
    get('context-views').replaceChildren(...figures);
    get('context-status').textContent = `${sample.label} · 世界格 [${sample.grid}] · 高度 ${map.cells[sample.grid[1]][sample.grid[0]].elevation} · 四向共用同一地图事实`;
  }

  async function load() {
    if (loading) return;
    loading = true;
    get('context-sample').disabled = true;
    get('context-reload').disabled = true;
    get('context-status').textContent = '正在载入上下文…';
    try {
      const contextUrl = new URL('emperor-elevation/contexts.json', directory);
      const catalogue = await json(contextUrl);
      const [map, land, heights, landRules, heightRules, loaded] = await Promise.all([
        json(new URL(catalogue.map, contextUrl)), json(new URL('emperor-land-water/elements.json', directory)),
        json(new URL('emperor-elevation/elements.json', directory)), json(new URL('emperor-land-water/rules.json', directory)),
        json(new URL('emperor-elevation/rules.json', directory)),
        window.qtiledElementRendering.loadElementSources({
          'atlas.png': new URL('emperor-land-water/atlas.png', directory).href,
          'elevation-atlas.png': new URL('emperor-elevation/elevation-atlas.png', directory).href,
        }),
      ]);
      if (loaded.issues.length) throw new Error(loaded.issues[0].message);
      const elements = { ...land, ...heights };
      for (const [id, definition] of Object.entries(elements)) {
        const issues = window.qtiledElementRendering.validateElementDefinition(definition, loaded.sourceInfo);
        if (issues.length) throw new Error(`${id}.${issues[0].path}：${issues[0].message}`);
      }
      const checked = window.qtiledMaps.validateMapDefinition(map, elements);
      if (checked.length) throw new Error(checked[0].message);
      library = { map, elements, sources: loaded.sources, landRules, heightRules, samples: catalogue.samples };
      get('context-sample').replaceChildren(...catalogue.samples.map(sample => new Option(sample.label, sample.id)));
      render();
    } catch (error) {
      library = null;
      get('context-views').replaceChildren();
      get('context-status').textContent = `上下文预览失败：${error.message}`;
    } finally {
      loading = false;
      get('context-sample').disabled = !library;
      get('context-reload').disabled = false;
    }
  }
  get('elevation-context').addEventListener('toggle', () => { if (get('elevation-context').open && !library) load(); });
  get('context-reload').addEventListener('click', load);
  get('context-sample').addEventListener('change', () => {
    try { render(); } catch (error) {
      get('context-views').replaceChildren();
      get('context-status').textContent = `上下文预览失败：${error.message}`;
    }
  });
})();
