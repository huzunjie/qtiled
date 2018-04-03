const { version, name, author, license, dependencies } = require('../package.json');
const banner = `
/**
 * ${name} v${version}
 * (c) 2018 ${author}
 * Released under ${license}
 */
`;
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
// import visualizer from 'rollup-plugin-visualizer';
const babelConfig = {
  common: {
    presets: [
      [ 'env', {
        modules: false,
        targets: {
          browsers: [ 'last 2 versions', 'not ie <= 8' ],
        },
      }],
      'stage-0',
    ],
    exclude: 'node_modules/**',
    plugins: [
      'external-helpers',
      'transform-decorators-legacy',
      'transform-runtime',
    ],
    externalHelpers: true,
    runtimeHelpers: true,
    babelrc: false,
  },
  es: {
    presets: [
      [ 'env', {
        modules: false,
        targets: {
          browsers: [ 'last 2 versions', 'not ie <= 8' ],
        },
      }],
      'stage-0',
    ],
    exclude: 'node_modules/**',
    plugins: [
      'external-helpers',
      'transform-decorators-legacy',
      'transform-runtime',
    ],
    externalHelpers: true,
    runtimeHelpers: true,
    babelrc: false,
  },
  umd: {
    presets: [
      [ 'env', {
        modules: false,
        targets: {
          browsers: [ 'last 2 versions', 'not ie <= 8' ],
        },
      }],
      'stage-0',
    ],
    exclude: 'node_modules/**',
    plugins: [
      'external-helpers',
      'transform-decorators-legacy',
      'transform-runtime',
    ],
    externalHelpers: true,
    runtimeHelpers: true,
    babelrc: false,
  },
  iife: {
    presets: [
      [ 'env', {
        modules: false,
        targets: {
          browsers: [ 'last 2 versions', 'not ie <= 8' ],
        },
      }],
      'stage-0',
    ],
    exclude: 'node_modules/**',
    plugins: [
      'external-helpers',
      'transform-decorators-legacy',
      'transform-runtime',
    ],
    externalHelpers: true,
    runtimeHelpers: true,
    babelrc: false,
  },
  min: {
    presets: [
      [ 'env', {
        modules: false,
        targets: {
          browsers: [ 'last 2 versions', 'not ie <= 8' ],
        },
      }],
      'stage-0',
    ],
    exclude: 'node_modules/**',
    plugins: [
      'external-helpers',
      'transform-decorators-legacy',
    ],
    externalHelpers: true,
    babelrc: false,
  },
};
const externalRegExp = new RegExp(Object.keys(dependencies).join('|'));
export default function (mode, useConf) {
  const _conf = {
    input: 'src/index.js',
    banner,
    external (id) {
      return !/min|umd|iife/.test(mode) && externalRegExp.test(id);
    },
    plugins: [
      babel(babelConfig[mode]),
      resolve({
        customResolveOptions: {
          moduleDirectory: [ 'src', 'node_modules' ],
        },
      }),
      commonjs(),
      replace({
        'process.env.PLAYER_VERSION': `'${version}'`,
      }),
      /* visualizer({
        filename: `bundle-size/${mode}.html`,
      }),*/
    ],
  };
  useConf && Object.assign(_conf, useConf);
  return _conf;
}
