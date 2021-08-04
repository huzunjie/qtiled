var navsArr = [
  ['rect.html', '正矩形 - Rect'],
  ['hexagon.html', '六边形 - Hexagon'],
  ['rhombus.html', '正菱形 - Rhombus'],
  ['ellipse.html', '椭圆形 - Ellipse'],
  ['path-finding.html', 'A*寻路 - 正矩形'],
  ['vast.html', '大量菱形单元交互测试'],
  ['old.html', '一个旧思路试验 一个旧思路试验一个旧思路试验一个旧思路试验一个旧思路试验一个旧思路试验'],
];

var navsEl = document.createElement('div');
navsEl.className = 'navs';
navsEl.innerHTML = '' +
  '<h3><a class="nav-switch"></a><a href="https://github.com/huzunjie/qtiled" target="_blank">QTiled</a> Demo - 示例</h3>' +
  '<div>' +
    navsArr.map(function(item) {
      var url = item[0];
      var cls = location.href.indexOf(url) !== -1 ? 'class="active"' : '';
      return '  <a href="' + url + '" ' + cls + '>' + item[1] + '</a>';
    }).join('') +
  '</div>' +
  '<a class="github" href="https://github.com/huzunjie/qtiled" target="_blank">QTiled source code in GitHub</a>';

document.body.appendChild(navsEl);

var navSwitchEl = document.querySelector('.nav-switch');
navSwitchEl.addEventListener('click', function() {
  navsEl.className = 'navs' + (navsEl.className.indexOf('closed') !== -1 ? '' : ' closed');
});