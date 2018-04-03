import base from './rollup.config.base';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import replace from 'rollup-plugin-replace';
const { name } = require('../package.json');
const config = base('iife', {
  output: {
    format: 'umd',
    file: 'lib/index.dev.js',
  },
  name: name.toLocaleLowerCase(),
});
config.plugins.push(
  serve(),
  livereload()
);
config.plugins.unshift(replace({
  'process.env.NODE_ENV': '"development"',
}));
export default config;
