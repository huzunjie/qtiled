# Repository Guidelines

QTiled 是一套零依赖的轻量级 Tiled 多边形布局库，提供基础图形（多边形、矩形、菱形、六边形、椭圆）的顶点与瓦片坐标换算，以及基于网格无关的 A* 寻路能力。产物包含 CJS、ESM、UMD 与压缩包四种格式。

## 项目结构与模块划分

- `src/index.js` —— 公共入口，对外导出 `shapes` 与 `pathFinding` 两个命名空间。
- `src/shapes/` —— 每种图形一个文件：`polygon.js`（共用顶点/行列位置方法）、`rect.js`、`rhombus.js`、`hexagon.js`、`ellipse.js`，以及汇总的 `index.js`。
- `src/path-finding/` —— `a-star.js`，邻居获取方法由调用方注入，以适配错列、等距、正矩形等不同布局。
- `__tests__/` —— 与 `src/` 对应的 Jest 用例，如 `__tests__/hexagon.test.js`；公共断言辅助放在 `utils.js`。
- `demo/` —— 可直接在浏览器打开的示例页（`hexagon.html`、`pathfinding-rhombus.html` 等），依赖 `demo/static/js/qtiled.dev.js`。
- `build/` —— Rollup 配置；`dist/`、`coverage/` 为生成产物，请勿手工修改。
- `.github/prompts/` —— 用于沉淀长期规划类提示词。

## 构建、测试与本地开发命令

- `npm install` —— 安装开发依赖。
- `npm test` —— 运行 Jest 并输出覆盖率到 `coverage/`；`npm run test-w` 为监听模式。
- `npm run lint` —— 按 `.eslintrc` 检查并自动修复（`--fix`）。
- `npm run dev` —— Rollup 监听构建到 `demo/static/js/qtiled.dev.js`，并在 `http://localhost:8033/demo/index.html` 提供示例预览。
- `npm run build` —— 在 `dist/` 生成全部产物（`qtiled.cjs.js`、`qtiled.mjs.js`、`qtiled.umd.js`、`qtiled.min.js`）；也可单独执行 `npm run cjs`、`mjs`、`umd`、`min`、`debug`。

## 基础行为准则

- 禁止盲目扩大代码调整量及业务影响范围。
- 禁止在保持原有代码逻辑时，随意移除代码原有的注释内容。
- 每个迭代应该尽量收敛、具体、可测试、可跟踪，不应该是一个大批量内容调整。
- 涉及以上问题的时候，可以通过多次追问沟通来明确下一步行为。

## 代码风格与命名规范

- 使用 ES Module 写法，2 空格缩进，单引号，语句结尾加分号，文件末尾保留空行，行尾不留空格。
- 只用 `const` / `let`（禁止 `var`），比较统一用 `===`，对象字面量要求简写属性。
- 函数与变量用 `camelCase`，常量用 `UPPER_SNAKE_CASE`（如 `HALF`、`TQUA`、`directions`），文件名用 kebab-case（如 `a-star.js`）。
- 以 `.eslintrc` 为准（babel-eslint 解析器 + jest 插件）；源码注释、JSDoc 与用例描述沿用中文，改动时保持一致。

## 测试规范

测试框架为 Jest（通过 `babel-jest` 转译，配置见 `package.json`）。新增用例命名为 `__tests__/<模块>.test.js`，直接从 `../src/...` 引入被测方法，按模块用 `describe` 分组，覆盖新增导出方法的默认参数与边界情况。提交前请确保 `npm test` 全部通过。

## 提交与合并请求规范

历史提交以简短的中文祈使句为主（如 `补充测试用例`、`增加菱形等距与错列布局寻路`），也偶有 `update demo` 这类英文说明；请保持单行标题、不加句号。

提交 PR 时请说明改动内容与影响的模块、关联对应 issue，确认 `npm test` 与 `npm run lint` 均通过，同步勾选 `README.md` 中的计划清单，涉及 `demo/*.html` 的视觉改动请附截图或动图。
