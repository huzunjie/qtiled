import base from './rollup.config.base';
const { name } = require('../package.json');
import replace from 'rollup-plugin-replace';
const config = base('umd', {
  output: {
    format: 'umd',
    file: 'lib/index.browser.js',
  },
  name: name.toLocaleLowerCase(),
});
config.plugins.unshift(replace({
  'process.env.NODE_ENV': '"development"',
}));
export default config;
