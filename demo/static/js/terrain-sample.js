/* 地表样本的共享描述与素材入口；仅供 Demo 消费，不属于基础库 API。 */
(function () {
  const trees = {
    'ordinary-mature': { label: '普通树', detail: '成熟普通树', shortLabel: '树', base: 927, variants: 9, surroundedOffset: 9 },
    'bamboo-mature': { label: '竹类', detail: '成熟竹类', shortLabel: '竹', base: 945, variants: 9, surroundedOffset: 9 },
    'ordinary-stump': { label: '普通树桩', detail: '普通树桩', shortLabel: '桩', base: 963, variants: 9, surroundedOffset: 0 },
    'bamboo-stump': { label: '竹残株', detail: '竹残株', shortLabel: '竹残', base: 963, variants: 9, surroundedOffset: 0 },
  };
  const rocks = {
    ordinary: { label: '普通石', base: 458 },
    copper: { label: '铜矿', base: 472 },
    iron: { label: '铁矿', base: 486 },
  };
  const atlases = {
    land: { 'beach-atlas.webp': '20261015030000', 'quarry-atlas.webp': '20261015030000', 'water-shore-atlas.webp': '20261015030000', 'grass-atlas.webp': '20261015030000', 'trees-atlas.webp': '20261015030000', 'rocks-atlas.webp': '20261015030000', 'dunes-atlas.webp': '20261015030003', 'salt-marsh-atlas.webp': '20261015040000', 'pinnacles-atlas.webp': '20261015050000' },
    elevation: { 'elevation-atlas.webp': '20261015030000', 'elevation-dirt-atlas.webp': '20261015030000', 'slope-features-atlas.webp': '20261015030000', 'slope-features-dirt-atlas.webp': '20261015030000' },
    construction: { 'road-atlas.webp': '20261015030000', 'house-atlas.webp': '20261015030000' },
  };
  const getTree = kind => typeof kind === 'string' && Object.prototype.hasOwnProperty.call(trees, kind) ? trees[kind] : null;
  const getRock = kind => typeof kind === 'string' && Object.prototype.hasOwnProperty.call(rocks, kind) ? rocks[kind] : null;

  // 保留既有陆地/植被的32位结果；水域使用另一套既有公式，不在此处统一。
  function getStableGridValue(x, y) {
    let hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    return (hash ^ (hash >>> 16)) >>> 0;
  }

  function getSources(directory, reloadToken = '', group = 'land') {
    return Object.fromEntries(Object.entries(atlases[group]).map(([name, version]) => {
      const query = [version && `v=${version}`, reloadToken && `reload=${encodeURIComponent(reloadToken)}`].filter(Boolean).join('&');
      return [name, `${directory}${name}${query ? `?${query}` : ''}`];
    }));
  }

  function getTreeMaterialLabel(number) {
    const tree = Object.values(trees).find(item => number >= item.base && number < item.base + item.variants + item.surroundedOffset);
    if (!tree) return '';
    return tree.surroundedOffset ? `${tree.detail} · ${number - tree.base >= tree.variants ? '周围环绕' : '外围'} · ${number}`
      : `树桩 / 竹残株 · ${number}`;
  }

  function getRockMaterialLabel(number) {
    const rock = Object.values(rocks).find(item => number >= item.base && number < item.base + 14);
    const offset = rock ? number - rock.base : 0;
    return rock ? `${rock.label} · ${offset < 8 ? '1×1' : offset < 12 ? '2×2' : '3×3'} · ${number}` : '';
  }

  window.terrainSample = { trees, rocks, getTree, getRock, getStableGridValue, getSources, getTreeMaterialLabel, getRockMaterialLabel };
})();
