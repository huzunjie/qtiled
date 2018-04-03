const {
  getUnitsByRowCol,
  unit2pixel,
  getNeighbourUnitsByRowCol,
  unit2rhombusPixel,
  searchPath,
  getDiagonalUnitsByRowCol,
  getUnitsByDiagonal,
  rotateUnit,
  getStaggeredUnitsByRowCol,
  pixel2unit,
  rhombusPixel2unit
} = qtiled;

const size = [_width, _height];

let xyDiff = [0, 0];
// 正矩形：2*2元素
getUnitsByRowCol(3,4).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i])
  const pixelXY = unit2pixel(unitXY, size, centerPos);
  drawRect(unitXY, pixelXY);
});
// 正矩形：4*4的邻居
getNeighbourUnitsByRowCol(5, 6).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i])
  const pixelXY = unit2pixel(unitXY, size, centerPos);
  drawRect(unitXY, pixelXY);
});

// 菱形：2*2元素
xyDiff = [19, 5];
getUnitsByRowCol(2,2).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});
// 菱形：4*4的邻居
getNeighbourUnitsByRowCol(4,4).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});


// 对角范围内的元素
xyDiff = [14, -1];
getDiagonalUnitsByRowCol(7,7).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);

  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});


// 起止点连线作为对角线的矩形范围内的元素
xyDiff = [10, -6];
getUnitsByDiagonal([-1,-1], [1,2]).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});

// 设定起止点寻径经过的元素
xyDiff = [6, -10];
searchPath([-1,-1], [1,2]).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});

// 设定起止点寻径经过的元素: 角落不通行的
xyDiff = [2, -14];
const myPath = searchPath([-1,-1], [1,2], (x,y,cost)=> cost==10);
myPath.forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});

// 坐标系角度旋转
xyDiff = [-2, -16];
myPath.forEach(unitXY=>{
  unitXY = rotateUnit(unitXY, 90)
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});

// 像素转为uint坐标
/*
  console.log(
    'pixel2unit:', 
    pixel2unit([386, 126], [_width, _height], centerPos)
  );
  console.log(
    'rhombusPixel2unit:', 
    rhombusPixel2unit(_t.attr('pos'),[_width, _height], centerPos)
  )
*/

// 错列布局
xyDiff = [14, 14];
getStaggeredUnitsByRowCol(5,5).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i])
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});

// 错列布局
xyDiff = [10, 10];
getStaggeredUnitsByRowCol(5,8, (x, y, mX, mY, line)=>{
  // 过滤排除掉坐标（-1, -1）的单元
  return !( x==-1 && -1==y );
}).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i])
  const pixelXY = unit2rhombusPixel(unitXY, size, centerPos);
  drawTiled(unitXY, pixelXY);
});
