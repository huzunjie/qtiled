import getConf from './rollup.config.base.js';

// 首个独立浏览器消费者使用 UMD；保持可选入口与核心各自构建。
const viewConfig = getConf('umd');
viewConfig.input = 'src/isometric-view/index.js';
Object.assign(viewConfig.output, {
  file: 'dist/qtiled-view.umd.js',
  name: 'qtiledView',
});

const mapsConfig = getConf('umd');
mapsConfig.input = 'src/maps/index.js';
Object.assign(mapsConfig.output, {
  file: 'dist/qtiled-maps.umd.js',
  name: 'qtiledMaps',
});

const renderingConfig = getConf('umd');
renderingConfig.input = 'src/element-rendering/index.js';
renderingConfig.external = ['spritejs'];
Object.assign(renderingConfig.output, {
  file: 'dist/qtiled-element-rendering.umd.js',
  name: 'qtiledElementRendering',
  globals: { spritejs: 'spritejs' },
});

export default [viewConfig, mapsConfig, renderingConfig];
