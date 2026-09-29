/* 目录选择器返回“所选目录名/相对路径”，定义只保存目录内的相对路径。
 * 编辑页和独立预览各自选择、加载文件；不通过存储或页面间消息共享状态。
 */
function getElementSourceFiles(files) {
  return Object.fromEntries(Array.from(files)
    .filter(file => file.type.startsWith('image/'))
    .map(file => {
      const path = file.webkitRelativePath;
      return [path ? path.slice(path.indexOf('/') + 1) : file.name, file];
    }));
}
