
// 横纵向菱形网格数量
const rowCount = 11;
const colCount = 10;

const sceneSize = [scene.width, scene.height];
const centerPixel = sceneSize.map((v) => v / 2);
const tileSize = [78,40];

const data = qtiled.getStaggeredUnitsByRowCol(rowCount, colCount);

const tilePx2Ids = {};
const tilePixels = data.map((ids)=>{
  const px = qtiled.unit2rhombusPixel(ids, tileSize);
  tilePx2Ids[px.join()] = ids;
  return px;
});
const g = new spritejs.Group({
    anchor: [0.5, 0.5],
    pos: centerPixel,
    border: [2, '#ff0'],
  });
g.append(
  new spritejs.Block({
    anchor: [0.5, 0.5],
    pos: [0, 0],
    size: [100, 100],
    border: [2, '#000'],
  })
);
fglayer.append(
  g
);

window.gridsGroup = new GridsGroup({
  bgcolor:'rgba(0, 255, 255, 0.05)',
  anchor: [0, 0],
  pos: [0, 0],
  size: sceneSize,
  grids: {
    size: tileSize,
    ids:data,
    poss: tilePixels,
    border: [1, 'rgba(0,0,0,0.2)']
  }
});

fglayer.append(gridsGroup); 

const gridsGroupPos = gridsGroup.attr('pos');


// 交互

function getGridsGroup(xN, yN, pos = [0, 0]){
  
  const xyIds = [];
  const poss = qtiled.getUnitsByRowCol(xN, yN, (x,y)=>{
    const xyId = [x, y];
    xyIds.push(xyId);
    return qtiled.unit2rhombusPixel(xyId, tileSize)
  });
  
  return new GridsGroup({
    name:'focus',
    anchor: [0, 0],
    //border: [1, 'rgba(255,0,0,1)'],
    // bgcolor:'#ff000020',
    pos,
    grids: {
      ids:xyIds,
      size: tileSize,
      poss,
      border: [1, 'rgba(255,100,100,1)'],
      bgcolor:'#ffffff80'
    },
    color:'#ff000080',
  });
} 

// 地图原点坐标
const goRenderPos = gridsGroup.getGridRealPosByIdx('0,0')||[0,0];


// 生成交互的焦点格子
const focusGrids = window.focusGrids = getGridsGroup(1, 1, centerPixel);

// 操作格子原点坐标
const foRenderPos = focusGrids.getGridRealPosByIdx('0,0');

// 操作原点与地图原点的差值
let fgRenderPos = [goRenderPos[0]-foRenderPos[0], goRenderPos[1]-foRenderPos[1]];

setFocusPos(focusGrids.attr('pos'));


function setFocusPos(pxArr){
  focusGrids.attr('pos',pxArr.map((v,i)=>v+fgRenderPos[i] ));
} 

ctlayer.append(focusGrids);


const sceneSxs = [1, 1];//scene.resolution.map((v,i)=>v/scene.viewport[i]);

let _hisRPX = null;
document.addEventListener('mousemove',e=>{

  const roundPx = qtiled.staggeredUnitRound(
    [e.pageX * sceneSxs[0], e.pageY * sceneSxs[1]], 
    tileSize,
  );
  const hisRPX = roundPx.join();
  if(_hisRPX===hisRPX)return;
  _hisRPX = hisRPX;
  
  
  let focusGridId = tilePx2Ids[roundPx.map((v,i)=>v-gridsGroupPos[i]).join()];
  focusGridId=focusGridId||[0,0];
  
  focusGridId && focusGrids.labels.forEach(lb=>{
    lb.text = lb._grid_id.map((v,i)=>v+focusGridId[i]).join()
  });

  
  setFocusPos( roundPx );
  
})