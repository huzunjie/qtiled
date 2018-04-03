import base from './rollup.config.base';
export default base('common', {
  output: {
    format: 'cjs',
    file: 'lib/index.js'
  }
});
