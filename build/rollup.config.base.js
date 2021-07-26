import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const { version, name, author, license } = require('../package.json');
const banner = `
/**
 * ${name} v${version}
 * (c) ${new Date().getFullYear()} ${author}
 * Released under ${license}
 */
`;

export const moduleName = name;
const _name = name.toLocaleLowerCase();
export default (format, suffix) => {
  format = format || 'umd';
  const babelOptions = {
    presets: ['@babel/preset-env'],
    babelrc: false,
    exclude: 'node_modules/**',
    babelHelpers: 'bundled',
  };
  if (suffix !== 'min') {
    babelOptions.babelHelpers = 'runtime';
    babelOptions.plugins = [
      '@babel/plugin-transform-runtime'
    ];
  }
  return {
    input: 'src/index.js',
    plugins: [
      babel(babelOptions),
      resolve({
        customResolveOptions: {
          moduleDirectories: ['src', 'node_modules'],
        },
      }),
      commonjs(),
    ],
    output: {
      banner,
      format,
      file: `dist/${_name}.${suffix || format}.js`,
      name: _name,
    }
  };
};
