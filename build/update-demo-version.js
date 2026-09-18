/**
 * 更新 demo HTML 文件中静态资源的版本 hash
 * 在每次构建后自动执行
 */

const fs = require('fs');
const path = require('path');

// 获取当前时间作为版本号 (YYYYMMDDHHmmss 格式)
const getVersionHash = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const versionHash = getVersionHash();

// demo 目录路径
const demoDir = path.join(__dirname, '..', 'demo');

// 查找 demo 目录下的所有 HTML 文件
const getHtmlFiles = (dir) => {
  return fs.readdirSync(dir)
    .filter((filename) => filename.endsWith('.html'))
    .map((filename) => path.join(dir, filename));
};

// 更新单个 HTML 文件
const updateHtmlFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 更新 CSS 资源
  content = content.replace(/href="\.\/static\/css\/([^"?]+\.css)(\?[^"]*)?"/g, (match, filename) => {
    modified = true;
    return `href="./static/css/${filename}?${versionHash}"`;
  });

  // 更新 JS 资源
  content = content.replace(/src="\.\/static\/js\/([^"?]+\.js)(\?[^"]*)?"/g, (match, filename) => {
    modified = true;
    return `src="./static/js/${filename}?${versionHash}"`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Updated: ${path.basename(filePath)}`);
  } else {
    console.log(`- No changes: ${path.basename(filePath)}`);
  }
};

// 主函数
const main = () => {
  console.log(`\n更新静态资源版本号: ${versionHash}\n`);

  const htmlFiles = getHtmlFiles(demoDir);
  htmlFiles.forEach((filePath) => updateHtmlFile(filePath));

  console.log('\n完成!\n');
};

main();