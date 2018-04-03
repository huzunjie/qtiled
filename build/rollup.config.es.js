import base from './rollup.config.base';

export default base('es', {
  output: {
    format: 'es',
    file: 'lib/index.mjs',
  },
});
