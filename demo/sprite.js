const {Scene, Sprite} = spritejs
const scene = new Scene('#container')
const layer = scene.layer('def')
const sceneWidth = 800;
const sceneHeight = 600;
scene.setResolution(sceneWidth, sceneHeight);

// 坐标确认
const domC = document.querySelector('canvas');
domC.onclick = function(e){
  console.log('canvas offsetXY:',e.offsetX,e.offsetY)
};


// 元素基本参数设置
const boxMargin = .5;
const _width = 39;
const _height = 20;

// 中心点
const centerPos = [sceneWidth/2, sceneHeight/2];

// 参照物
const refBox = new Sprite()
refBox.attr({
  anchor: [0, 0],
  pos: [0,0],
  size: [600, 500],
  border: [1, '#ff000030']
})
layer.appendChild(refBox);

const _rectBorderWidth=1;
const _rectBorderMargin=_rectBorderWidth*2;
function drawRect(unitXY=[], pos = centerPos){
  const [i = 0, j = 0] = unitXY;
  const box1 = new Sprite()
  box1._x=i;
  box1._y=j;
  
  box1.attr({
    anchor: [0.5, 0.5],
    pos,
    size: [_width - _rectBorderMargin, _height - _rectBorderMargin],
    bgcolor: i==1?'#ff000005':'#ffffff50',
    border: [_rectBorderWidth, '#00000020']
  })
  
  box1.on('mouseenter', function(evt){
    evt.target.attr({
      border:[_rectBorderWidth, 'red']
    })
  })
  box1.on('mouseleave', function(evt){
    evt.target.attr({
      border:[_rectBorderWidth, '#00000020']
    })
  })
  box1.on('click', function(evt){
    var _t = evt.target, pos = _t.attr('pos');
    console.log(
      'pos&unitXY:', pos, _t._x, _t._y,
      '\npixel2unit:', 
      pixel2unit(pos, [_width, _height])
    );
  });
  layer.appendChild(box1)
}

// tiled 变换前的矩形宽高 - 这里为了便于计算以正方形进行菱形变换
const _baseRectWH = (_width+_height)/2;
// tiled 变换前的对角线宽度
const _baseRectDiagonal = Math.sqrt(Math.pow(_baseRectWH,2)*2);
const _scaleX = _width/_baseRectDiagonal;
const _scaleY = _height/_baseRectDiagonal;
const _tiledBorderWidth = 1;
const _tiledWH = _baseRectWH-_tiledBorderWidth*2-boxMargin;
const _tiledBorderColor = 'rgba(0, 0, 0, 0.2)'
let start = null;
const map = {};
let lastPath;
const bgcolor = 'rgba(100, 255, 50, 0.1)';

function drawTiled(unitXY, pos = centerPos, borderColor = _tiledBorderColor){
  const [i = 0, j = 0] = unitXY;
  // console.log('xx',i, j, pos, c);
  const box = new Sprite();
  map[i+','+j]=box;
  // console.log(_x, i)
  box._x=i;
  box._y=j;
  box.attr({
    anchor: [0.5, 0.5],
    pos,
    size: [_tiledWH, _tiledWH],
    border: [_tiledBorderWidth, borderColor],
    bgcolor: i==1?'#ff000005':bgcolor, 
    transform: {
      scale: [_scaleX, _scaleY],
      rotate: 45
    }
  })
  box.on('mouseenter', function(evt){
    evt.target.attr({
      border:[_tiledBorderWidth, 'red']
    })
  })
  box.on('mouseleave', function(evt){
    evt.target.attr({
      border:[_tiledBorderWidth, borderColor]
    })
  })
  box.on('click', function(evt){
    var _t = evt.target;
    console.log(
        'pos&unitXY:', _t.attr('pos'), _t._x, _t._y , 
        '\nrhombusPixel2unit:', rhombusPixel2unit(_t.attr('pos'),[_width, _height],centerPos)
    )
    if(start){
      lastPath = searchPath([start._x, start._y], [_t._x, _t._y], (x,y,cost)=> cost==10);
      // console.log('lastPath',lastPath)
      lastPath.forEach(v=>{
        map[v.join()] && map[v.join()].attr('bgcolor','#ff000030')
      });
      
      start = null;
    }else{
      start = _t;
      if(lastPath){
        lastPath.forEach(v=>{
          map[v.join()] && map[v.join()].attr('bgcolor',bgcolor)
        });
      }
    }
  })
  layer.appendChild(box)
  //drawRect(i,j, pos);
  return box;
}

