/* 椭圆形 */

export const PI = Math.PI; // π；180度对应的弧度值
export const PI_DBL = PI * 2; // 2 倍的 π；360度对应的弧度值
export const PI_HALF = PI / 2; // 一半的 π；90度对应的弧度值
export const PI_OPF = PI + PI_HALF; // 1.5 倍的π One point five；270度对应弧度值
export const PI_OA = PI / 180; // One Angle 1角度换算为弧度值

/* 角度转弧度
* @param {Number}  angle    角度值 0 ~ 360+N
* @return {Number} 弧度值
*/
export function angle2Radian(angle = 0) {
  return angle * PI_OA;
}

/* 弧度转角度
* @param {Number}  radian    弧度值 0 ~ PI*N
* @return {Number} 角度值
*/
export function radian2Angle(radian = 0) {
  return radian / PI_OA;
}

/* 根据椭圆的原点、X轴半径、Y轴半径、弧度，求得圆周上的点坐标
* @param  {Number}  x0        圆心X点坐标值
* @param  {Number}  y0        圆心Y点坐标值
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  radian    弧度值
* @return {Array}   [x, y]
*/
export function getEllipsePoint(x0, y0, radiusX, radiusY, radian) {
  radian %= PI_DBL;
  if(radian < 0) radian += PI_DBL;
  const k = Math.tan(radian);
  if(Math.abs(k) > 1e5) {
    return [x0, y0 + (radian < PI ? radiusY : -radiusY)];
  }
  // 第一或第四象限取正、其他象限取负
  const d = radian <= PI_HALF || radian > PI_OPF ? 1 : -1;
  const v = 1 / radiusX ** 2 + k ** 2 / radiusY ** 2;
  const x = d * Math.sqrt(1 / v) + x0;
  return [x, k * x + y0 - k * x0];
};

/* 根据椭圆的原点、X轴半径、Y轴半径、角度，求得圆周上的点坐标
* @param  {Number}  x0        圆心X点坐标值
* @param  {Number}  y0        圆心Y点坐标值
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  angle     角度值
* @return {Array}   [x, y]
*/
export function getEllipsePointByAngle(x0, y0, radiusX, radiusY, angle) {
  return getEllipsePoint(x0, y0, radiusX, radiusY, angle2Radian(angle));
}

/* 根据椭圆的X轴半径、Y轴半径、圆周等分数量、等分点序号、起始弧度，求得圆周上的点坐标
* @param  {Number}  radiusX   X轴半径值
* @param  {Number}  radiusY   Y轴半径值
* @param  {Number}  count     圆周等分数量
* @param  {Number}  num       圆周等分点序号
* @param  {Number}  radian    起始弧度
* @return {Array}   [x, y]
*/
export function getEllipseIsometryPoint(radiusX, radiusY, count, num, radian = 0) {
  radian += PI_DBL * num / count;
  return [radiusX * Math.cos(radian), radiusY * Math.sin(radian)];
}
