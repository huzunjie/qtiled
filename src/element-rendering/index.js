/* 可选元素渲染入口：含纯计算与浏览器适配；SpriteJS 为外部依赖，不进入 QTiled 核心。 */
export { loadElementSources } from './sources';
export { resolveElementDraw } from './draw';
export { resolveElementFrame } from './frame';
export { resolveElementPlacement } from './placement';
export { renderElement, updateElementFrame } from './spritejs-element-renderer';
export { importElementDefinition, validateElementDefinition, applyElementEdit, exportElementDefinition } from '../elements';
