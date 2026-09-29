/** 加载调用方明确列出的图片，不扫描素材库；仅在调用时使用浏览器 API。
 * @param {Object} sourceFiles 相对路径 → Blob/File 或图片 URL 字符串。
 * @returns {Promise<Object>} { sources, sourceInfo, issues }；保留成功项，逐项报告失败。
 * sources 保存 HTMLImageElement；sourceInfo 使用图片实际尺寸。临时 Blob URL 无论成功失败均释放。
 */
export async function loadElementSources(sourceFiles = {}) {
  const results = await Promise.all(Object.entries(sourceFiles).map(async ([path, file]) => {
    let objectUrl;
    try {
      let url;
      if (typeof file === 'string' && file.length) {
        url = file;
      } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
        objectUrl = URL.createObjectURL(file);
        url = objectUrl;
      } else {
        throw new TypeError('图片来源必须是 Blob/File 或非空 URL 字符串。');
      }
      const image = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image);
          else reject(new Error('图片实际尺寸为空。'));
        };
        image.onerror = () => reject(new Error('图片加载失败，请检查文件路径或跨域许可。'));
        image.src = url;
      });
      return { path, image };
    } catch (error) {
      return { path, issue: { path, code: 'source-load-failed', message: error.message } };
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }));
  const sources = Object.create(null);
  const sourceInfo = Object.create(null);
  const issues = [];
  results.forEach(({ path, image, issue }) => {
    if (issue) issues.push(issue);
    else {
      sources[path] = image;
      sourceInfo[path] = { width: image.naturalWidth, height: image.naturalHeight };
    }
  });
  return { sources, sourceInfo, issues };
}
