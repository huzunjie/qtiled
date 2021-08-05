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
  '<h3>' +
    '<a class="nav-switch"></a>' +
    '<a href="https://github.com/huzunjie/qtiled" target="_blank" class="qgl">' +
      '<svg aria-hidden="true" version="1.1" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>' +
      'QTiled' +
    '</a>' +
    ' Demo - 示例' +
  '</h3>' +
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