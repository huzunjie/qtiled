/* 将本目录按 docs/browser-consumption.md 复制到独立 HTTP 目录运行。 */
(async function() {
  const status = document.getElementById('status');

  function requireSuccess(result) {
    if (result.issues.length) {
      throw new Error(result.issues.map(issue => `${issue.path}：${issue.message}`).join('\n'));
    }
    return result;
  }

  async function readText(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} 加载失败（HTTP ${response.status}）`);
    return response.text();
  }

  try {
    if (window.location.protocol === 'file:') {
      throw new Error('请先按 docs/browser-consumption.md 准备独立目录，再通过 HTTP 服务打开本页');
    }
    if (!window.qtiledElementRendering || !window.qtiledMaps || !window.qtiledView || !window.spritejs) {
      throw new Error('运行库未加载，请按 docs/browser-consumption.md 构建并复制正式产物到 lib/，将 SpriteJS 放入 vendor/');
    }
    const { loadElementSources, importElementDefinition, renderElement } = window.qtiledElementRendering;
    const { importMapDefinition, applyMapEdit, exportMapDefinition, resolveMapEntities } = window.qtiledMaps;
    const { projectGrid } = window.qtiledView;
    // 路径对应现有狗样本；源文件名与方向绑定仍由元素 JSON 决定。
    const sourceFiles = Object.fromEntries([1, 2, 3, 4].map(number => {
      const path = `images/sculpture_dog0${number}.png`;
      return [path, `./assets/dog/${path}`];
    }));
    const [elementJson, mapJson, images] = await Promise.all([
      readText('./assets/dog/element.json'),
      readText('./assets/map.json'),
      loadElementSources(sourceFiles),
    ]);
    requireSuccess(images);
    const element = requireSuccess(importElementDefinition(elementJson, images.sourceInfo)).definition;
    const elementsById = { [element.id]: element };
    let current = requireSuccess(importMapDefinition(mapJson, elementsById));
    const importedCount = current.index.size;

    // 完整成功后才替换当前地图与索引；失败则保留 current。
    const edited = applyMapEdit(current.definition, { type: 'remove', id: 'dog-b' }, elementsById);
    requireSuccess(edited);
    current = edited;
    const exported = requireSuccess(exportMapDefinition(current.definition, elementsById));

    const view = { angle: 0, tileSize: current.definition.tileSize, originPixel: [160, 180] };
    const resolved = requireSuccess(resolveMapEntities(current.definition, elementsById, view));
    const gridPositions = [];
    current.definition.cells.forEach((row, y) => row.forEach((cell, x) => {
      if (cell !== null) gridPositions.push(projectGrid([x, y], view));
    }));
    // 本例仅绘制编辑后剩余的一个实例；多实例应各自使用独立 Group。
    const scene = new window.spritejs.Scene({
      container: document.getElementById('canvas'), width: 640, height: 360, mode: 'static',
    });
    const layer = scene.layer('sample', { handleEvent: false, contextType: '2d' });
    renderElement(layer, resolved.entities[0].draw, images.sources, { gridPositions });
    document.getElementById('exported').textContent = exported.json;
    status.textContent = `已完成：导入占用 ${importedCount} 格，删除后占用 ${current.index.size} 格，已绘制 ${resolved.entities[0].id}。`;
  } catch (error) {
    status.textContent = `加载失败：${error.message}。修复文件后刷新页面重试。`;
  }
})();
