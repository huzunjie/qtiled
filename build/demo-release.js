const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const release = path.join(root, 'output/demo-release');
const bundles = ['qtiled', 'qtiled-view', 'qtiled-element-rendering', 'qtiled-maps'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  if (entry.isSymbolicLink()) throw new Error(`发布目录不接受符号链接：${file}`);
  return entry.isDirectory() ? files(file) : [file];
});

function check(directory) {
  bundles.forEach(name => {
    if (!fs.statSync(path.join(directory, `static/js/${name}.min.js`)).size) throw new Error(`缺少发布包：${name}`);
  });
  for (const file of files(directory)) {
    if (/\.dev\.js(?:\.map)?$|\.map$/.test(file)) throw new Error(`发布目录包含开发产物：${file}`);
    if (!/\.(html|js|css)$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (/\.dev\.js|livereload|sourceMappingURL/i.test(text)) throw new Error(`发布文件包含开发引用：${file}`);
    if (file.endsWith('.html')) {
      for (const match of text.matchAll(/(?:src|href)=["'](\.\/static\/[^"']+)["']/g)) {
        if (!fs.existsSync(path.resolve(path.dirname(file), match[1].split('?')[0]))) throw new Error(`资源不存在：${match[1]}`);
      }
    }
  }
  console.log(`发布检查通过：${directory}`);
}

if (process.argv[2] === '--check') {
  check(path.resolve(process.argv[3] || release));
} else {
  // 仅清理固定的生成目录；构建失败不产生可上传的完整结果。
  fs.rmSync(release, { recursive: true, force: true });
  fs.cpSync(path.join(root, 'demo'), release, { recursive: true, filter: source => !/\.dev\.js(?:\.map)?$|\.map$|\.DS_Store$/.test(source) });
  execFileSync(process.execPath, [path.join(root, 'node_modules/rollup/dist/bin/rollup'), '-c', 'build/rollup.config.demo.js'], { cwd: root, stdio: 'inherit' });
  for (const file of files(release).filter(file => file.endsWith('.html'))) {
    const text = fs.readFileSync(file, 'utf8').replace(/(\.\/static\/js\/qtiled(?:-[\w-]+)?)\.dev\.js(?:\?[^"']*)?/g, '$1.min.js');
    fs.writeFileSync(file, text.replace(/((?:src|href)=["'])(\.\/static\/[^"'?]+\.(?:js|css))(?:\?[^"']*)?(?=["'])/g,
      (_, prefix, resource) => `${prefix}${resource}?${hash(path.resolve(path.dirname(file), resource))}`));
  }
  check(release);
}
