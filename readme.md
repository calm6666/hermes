# Hermes

引导巡览引擎：零依赖的聚焦高亮库，用于页面功能引导（高亮目标元素、遮罩挖孔、弹出说明浮层、分步导航）。

Fork 自 [driver.js](https://github.com/kamranahmedse/driver.js) 1.4.0（作者 Kamran Ahmed，MIT），改名发布并按本仓需求演进；API 与 driver.js 保持一致，上游版权见 `license` 文件。

## 源码结构

`src/` 下按职责分文件：`config`（配置与默认值）、`driver`（入口编排）、`highlight`（目标高亮与挖孔）、`overlay`（遮罩）、`popover`（说明浮层）、`emitter` / `events`（事件）、`state`、`utils`，样式为 `driver.css`。

## 导出

| 子路径 | 内容 |
| --- | --- |
| `.` | `dist/hermes.mjs`（ESM）/ `dist/hermes.cjs`（CJS）/ `dist/hermes.d.ts`（类型） |
| `./dist/hermes.css` | 引导层样式 |

另有 IIFE 产物 `dist/hermes.iife.js` 可直接 `<script>` 引入。

## 使用示例

```ts
import { driver } from 'hermes';
import 'hermes/dist/hermes.css';

const driverObj = driver({
  showProgress: true,
  steps: [
    { element: '#upload-btn', popover: { title: '上传视频', description: '点击这里开始投稿' } },
  ],
});
driverObj.drive();
```

## 构建

```sh
pnpm build   # tsc && vite build && dts-bundle-generator
pnpm test    # vitest
```

## 接入与版本控制

- 接入模式：workspace **dist 引入**（打包后引入）。
- 当前消费方：暂无（尚未接线）。
- 版本控制：独立 git 仓库，挂载于根仓库 `packages/hermes`（gitlink 记录指针，远程仓库就绪后转为正式 submodule）。
