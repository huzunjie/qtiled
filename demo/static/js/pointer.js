/* 将鼠标视口坐标换算为当前 demo 画布内的像素坐标。
 * 适用于无边框、无内边距且未缩放的画布容器，移动与点击共用。
 * 每次读取容器位置，避免滚动或布局变化后使用过期坐标。
 */
function getPointerPosition({ clientX, clientY }, container) {
  const { left, top } = container.getBoundingClientRect();
  return [clientX - left, clientY - top];
}
