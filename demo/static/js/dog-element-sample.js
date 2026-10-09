/* 三个 Demo 共用的狗样本资源配置；图片加载与元素校验仍由可选模块负责。 */
function getDogElementSample(reloadToken = '') {
  const directory = './static/element-samples/dog/';
  const suffix = reloadToken ? `?reload=${encodeURIComponent(reloadToken)}` : '';
  const sourceFiles = Object.fromEntries([1, 2, 3, 4].map(number => {
    const path = `images/sculpture_dog0${number}.png`;
    return [path, `${directory}${path}${suffix}`];
  }));
  return { directory, sourceFiles };
}
