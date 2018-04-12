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

let cPos = [105, 55];
drawCenterOfCircle(cPos);
// 正矩形：2*2元素
const uint2x2 = getUnitsByRowCol(2,2);
uint2x2.forEach(unitXY=>{
  const pixelXY = unit2pixel(unitXY, size, cPos);
  drawRect(unitXY, pixelXY);
});

// 正矩形：4*4的邻居
const uint4x4 = getNeighbourUnitsByRowCol(4, 4);
uint4x4.forEach(unitXY=>{
  const pixelXY = unit2pixel(unitXY, size, cPos);
  drawRect(unitXY, pixelXY);
});


cPos = [120, 200];
drawCenterOfCircle(cPos);
// 菱形：2*2元素
//const centerPos
uint2x2.forEach(unitXY=>{
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});


// 菱形：4*4的邻居
uint4x4.forEach(unitXY=>{
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

let xyDiff = [1,13];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
// 对角范围内的元素
getDiagonalUnitsByRowCol(7,9, (...unitXY)=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

xyDiff = [-4, 7];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
// 根据设定起止点得到一条线，以这条线作为矩形对角线得出矩形区域元素
getUnitsByDiagonal([-1,-1], [1,1], (...unitXY)=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

// 设定起止点寻径经过的元素
xyDiff = [-2, 16];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
searchPath([-2,-1], [1,1]).forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

// 设定起止点寻径经过的元素: 角落不通行的
xyDiff = [-5, 11];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
const mySearchPath = searchPath([-1,-1], [1,2], (x,y,cost)=> cost==10);
mySearchPath.forEach(unitXY=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

// 坐标系角度旋转
xyDiff = [-7, 13];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
mySearchPath.forEach(unitXY=>{
  unitXY = rotateUnit(unitXY, 90)
  unitXY = unitXY.map((v,i)=>v+xyDiff[i]);
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

// 错列布局
xyDiff = [-4, -5];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
getStaggeredUnitsByRowCol(4, 5,(...unitXY)=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i])
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
});

// 错列布局
xyDiff = [-9, 1];
drawCenterOfCircle(unit2rhombusPixel(xyDiff, size, cPos));
getStaggeredUnitsByRowCol(6, 10,(...unitXY)=>{
  unitXY = unitXY.map((v,i)=>v+xyDiff[i])
  const pixelXY = unit2rhombusPixel(unitXY, size, cPos);
  drawTiled(unitXY, pixelXY);
}, (x, y, xn, yn)=>{
  // 过滤排除掉坐标（-1, -1）的单元
  // console.log(x, y)
  return !( x==-1 && -1==y );
});