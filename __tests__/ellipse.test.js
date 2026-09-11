import {
  PI,
  PI_DBL,
  PI_HALF,
  PI_OPF,
  PI_OA,
  angle2Radian,
  radian2Angle,
  getPoint,
  getPointByAngle,
  getEquidistantPoint,
} from '../src/shapes/ellipse';

describe('ellipse 常量', () => {
  test('PI 约等于 Math.PI', () => {
    expect(PI).toBeCloseTo(Math.PI);
  });

  test('PI_DBL 等于 PI * 2', () => {
    expect(PI_DBL).toBeCloseTo(Math.PI * 2);
  });

  test('PI_HALF 等于 PI / 2', () => {
    expect(PI_HALF).toBeCloseTo(Math.PI / 2);
  });

  test('PI_OPF 等于 PI * 1.5', () => {
    expect(PI_OPF).toBeCloseTo(Math.PI * 1.5);
  });

  test('PI_OA 等于 PI / 180', () => {
    expect(PI_OA).toBeCloseTo(Math.PI / 180);
  });
});

describe('angle2Radian', () => {
  test('0 度 => 0 弧度', () => {
    expect(angle2Radian(0)).toBeCloseTo(0);
  });

  test('90 度 => PI/2', () => {
    expect(angle2Radian(90)).toBeCloseTo(Math.PI / 2);
  });

  test('180 度 => PI', () => {
    expect(angle2Radian(180)).toBeCloseTo(Math.PI);
  });

  test('360 度 => 2*PI', () => {
    expect(angle2Radian(360)).toBeCloseTo(Math.PI * 2);
  });

  test('默认参数 0', () => {
    expect(angle2Radian()).toBeCloseTo(0);
  });
});

describe('radian2Angle', () => {
  test('0 弧度 => 0 度', () => {
    expect(radian2Angle(0)).toBeCloseTo(0);
  });

  test('PI/2 => 90 度', () => {
    expect(radian2Angle(Math.PI / 2)).toBeCloseTo(90);
  });

  test('PI => 180 度', () => {
    expect(radian2Angle(Math.PI)).toBeCloseTo(180);
  });

  test('2*PI => 360 度', () => {
    expect(radian2Angle(Math.PI * 2)).toBeCloseTo(360);
  });

  test('angle2Radian 与 radian2Angle 互为逆运算', () => {
    const angle = 45;
    expect(radian2Angle(angle2Radian(angle))).toBeCloseTo(angle);
  });
});

describe('getPoint', () => {
  test('弧度 0（正右方）时，x 为圆心+radiusX，y 为圆心Y', () => {
    const [x, y] = getPoint(0, 0, 100, 50, 0);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(0);
  });

  test('弧度 PI/2（正下方）时，x 为圆心X，y 为圆心+radiusY', () => {
    const [x, y] = getPoint(0, 0, 100, 50, Math.PI / 2);
    expect(x).toBeCloseTo(0, 0);
    expect(y).toBeCloseTo(50);
  });

  test('弧度 PI（正左方）时，x 为圆心-radiusX，y 为圆心Y', () => {
    const [x, y] = getPoint(0, 0, 100, 50, Math.PI);
    expect(x).toBeCloseTo(-100);
    expect(y).toBeCloseTo(0);
  });

  test('弧度 3*PI/2（正上方）时，x 为圆心X，y 为圆心-radiusY', () => {
    const [x, y] = getPoint(0, 0, 100, 50, Math.PI * 1.5);
    expect(x).toBeCloseTo(0, 0);
    expect(y).toBeCloseTo(-50);
  });

  test('弧度超过 2PI 时自动取模', () => {
    const [x1, y1] = getPoint(0, 0, 100, 50, 0);
    const [x2, y2] = getPoint(0, 0, 100, 50, Math.PI * 2);
    expect(x1).toBeCloseTo(x2);
    expect(y1).toBeCloseTo(y2);
  });

  test('圆心偏移时坐标正确', () => {
    const [x, y] = getPoint(10, 20, 100, 50, 0);
    expect(x).toBeCloseTo(110);
    expect(y).toBeCloseTo(20);
  });

  test('负弧度自动处理', () => {
    const [x1, y1] = getPoint(0, 0, 100, 50, -Math.PI / 2);
    const [x2, y2] = getPoint(0, 0, 100, 50, Math.PI * 1.5);
    expect(x1).toBeCloseTo(x2);
    expect(y1).toBeCloseTo(y2);
  });

  test('第二象限（约 135°）：x < 0，y > 0', () => {
    // radian = 3π/4 在 (π/2, π) 之间，d=-1，x 应为负
    const [x, y] = getPoint(0, 0, 100, 50, Math.PI * 3 / 4);
    expect(x).toBeLessThan(0);
    expect(y).toBeGreaterThan(0);
  });

  test('第三象限（约 225°）：x < 0，y < 0', () => {
    // radian = 5π/4 在 (π, 3π/2) 之间，d=-1，x 应为负
    const [x, y] = getPoint(0, 0, 100, 50, Math.PI * 5 / 4);
    expect(x).toBeLessThan(0);
    expect(y).toBeLessThan(0);
  });

  test('第四象限非特殊角（约 315°）：x > 0，y < 0', () => {
    // radian = 7π/4 在 (3π/2, 2π) 之间，d=1，x 应为正
    const [x, y] = getPoint(0, 0, 100, 50, Math.PI * 7 / 4);
    expect(x).toBeGreaterThan(0);
    expect(y).toBeLessThan(0);
  });

  test('第二象限点与对称第一象限点 x 符号相反', () => {
    const [x1] = getPoint(0, 0, 100, 50, Math.PI / 4);   // 第一象限 45°
    const [x2] = getPoint(0, 0, 100, 50, Math.PI * 3 / 4); // 第二象限 135°
    expect(x1).toBeCloseTo(-x2, 3); // 关于 Y 轴对称
  });
});

describe('getPointByAngle', () => {
  test('角度 0 等于弧度 0 的结果', () => {
    const [x1, y1] = getPointByAngle(0, 0, 100, 50, 0);
    const [x2, y2] = getPoint(0, 0, 100, 50, 0);
    expect(x1).toBeCloseTo(x2);
    expect(y1).toBeCloseTo(y2);
  });

  test('角度 90 等于弧度 PI/2 的结果', () => {
    const [x1, y1] = getPointByAngle(0, 0, 100, 50, 90);
    const [x2, y2] = getPoint(0, 0, 100, 50, Math.PI / 2);
    expect(x1).toBeCloseTo(x2, 3);
    expect(y1).toBeCloseTo(y2, 3);
  });
});

describe('getEquidistantPoint', () => {
  test('圆心在原点，radiusX=radiusY 时等于正圆等分点', () => {
    const [x, y] = getEquidistantPoint(100, 100, 4, 0); // 0° 方向
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(0);
  });

  test('四等分第1点（90°）时坐标正确', () => {
    const [x, y] = getEquidistantPoint(100, 100, 4, 1); // 90° 方向
    expect(x).toBeCloseTo(0, 0);
    expect(y).toBeCloseTo(100);
  });

  test('带起始弧度时坐标正确', () => {
    const [x1, y1] = getEquidistantPoint(100, 50, 4, 0, Math.PI / 2);
    // num=0, radian 直接作为起始角，所以就是 90° 方向
    expect(x1).toBeCloseTo(0, 0);
    expect(y1).toBeCloseTo(50);
  });

  test('等分数量与点序号一致时回到起点', () => {
    const count = 6;
    const [x0, y0] = getEquidistantPoint(100, 50, count, 0);
    const [xN, yN] = getEquidistantPoint(100, 50, count, count);
    expect(x0).toBeCloseTo(xN);
    expect(y0).toBeCloseTo(yN);
  });
});
