import getConf from './rollup.config.base.js';
import { uglify } from 'rollup-plugin-uglify';

// 独立发布入口，不加载开发服务器或 LiveReload，也不覆盖本地开发包。
export default [
  ['qtiled', 'src/index.js', 'qtiled'],
  ['qtiled-view', 'src/isometric-view/index.js', 'qtiledView'],
  ['qtiled-element-rendering', 'src/element-rendering/index.js', 'qtiledElementRendering'],
  ['qtiled-maps', 'src/maps/index.js', 'qtiledMaps'],
].map(([file, input, name]) => {
  const config = getConf('umd', 'min');
  config.input = input;
  Object.assign(config.output, { file: `output/demo-release/static/js/${file}.min.js`, name, sourcemap: false });
  if (name === 'qtiledElementRendering') {
    config.external = ['spritejs'];
    config.output.globals = { spritejs: 'spritejs' };
  }
  config.plugins.push(uglify({ output: { comments: /qtiled v/ } }));
  return config;
});
