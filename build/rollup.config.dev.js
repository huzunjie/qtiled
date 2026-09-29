import getConf from './rollup.config.base.js';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const config = getConf('umd');
Object.assign(config.output, {
  file: 'demo/static/js/qtiled.dev.js',
  sourcemap: true,
});
if (process.env.npm_lifecycle_script.indexOf(' -w') !== -1) {
  config.plugins.push(
    serve({
      open: true,
      openPage: '/demo/index.html',
      host: 'localhost',
      port: 8033,
      verbose: true,
    }),
    livereload()
  );
}
// 可选视图模块单独构建，核心包不引入该入口；dev 同时监听两份源码。
const viewConfig = getConf('umd');
viewConfig.input = 'src/isometric-view/index.js';
Object.assign(viewConfig.output, {
  file: 'demo/static/js/qtiled-view.dev.js',
  name: 'qtiledView',
  sourcemap: true,
});
export default [config, viewConfig];
