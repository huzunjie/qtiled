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
export default config;
