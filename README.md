# Music Box

九键演奏应用。按下按键即发声，演奏记录以反向瀑布流的形式向上流动，支持「正常」与「滑键」两种演奏模式。

- 前端：React + TypeScript + Vite
- 音色：Web Audio 实时合成大钢琴，不依赖外部音频文件
- 动画：Canvas 绘制反向瀑布流音符条
- 版本：**v2.2.2**

## 功能

- **九键演奏**：3×3 圆角按键组，按下发声、长按延长
- **反向瀑布流**：音符条从底部基准线向上生长，按住的时长就是音符条长度；松开后继续上移
  - 单个音居中显示
  - 只有真正同时按下的音才并排分列，先按的在左、后按的在右
  - 分批按下的音、滑键模式下滑动经过的键，保持在同一列
- **两种模式**
  - 正常：按键显示 `1 2 3 / 4 5 6 / 7 1̇ 2̇`，对应 C4 D4 E4 / F4 G4 A4 / B4 C5 D5
  - 滑键：中间格为中立区（显示「—」，不发声），其余 8 键沿中立区绕一圈 `1 2 3 / 高音1 — 4 / 7 6 5`；手指可连续滑动演奏，经过中立区静音
- **音域调节**：`↑ / ↓` 整体升降一个八度，音域显示同步更新（`C4 – D5` ↔ `c¹ – d²`）
- **音量**：显示框 + 旋钮，支持拖动旋转、滚轮、上下方向键
- **清空**：清除瀑布流记录
- **本地记忆**：音量、音域、模式在本地记住上次选择

## 界面与操作

- 顶栏：`☰` 打开侧栏（使用说明 / 更新日志），居中应用名，`ⓘ` 查看更新日志
- 左侧工具栏：`↑` `↓` 调音域，`切换` 切换演奏模式（按钮下方常显当前模式），`清空` 清除记录
- 右侧工具栏保留空位

## 本地运行

```bash
npm ci
npm run dev
```

## 构建前端

```bash
npm ci
npm run build
```

产物：`dist/output/`（HTML 与公共资源）、`dist/output_resource/assets/`（JS / CSS）。

## 打包 Android APK

`android/` 是一个 WebView 壳工程：内置一个极简本地 HTTP 服务，把 `assets/www` 以 `http://127.0.0.1:<随机端口>` 形式提供，避免 `file://` 下 ES module 被 CORS 拦截。

```bash
# 1. 构建前端（相对资源路径 + Hash 路由，便于在 WebView 内本地加载）
npx vite build --outDir dist/apk --emptyOutDir --base ./

# 2. 把 dist/apk 拷到 android/assets/www
# 3. 按 android/README.md 里的 aapt2 + javac + d8 + zipalign + apksigner 流程打包并签名
```

> WebView 版不依赖平台运行时，构建时会把 `src/index.tsx` 里的 `BrowserRouter` 换为 `HashRouter`。

## 目录结构

```
index.html              入口 HTML
src/
  app.tsx               路由入口
  components/           Keypad / MusicStaff / VolumeKnob / Layout / AppDrawer 及 UI 组件
  lib/audio-engine.ts   Web Audio 音色与发声管理
  lib/key-config.ts     按键布局、音高映射、两种模式
  lib/prefs.ts          本地记忆
  data/                 更新日志、使用说明文案
  pages/                演奏页 / 使用说明页 / 更新日志页
android/                WebView 壳工程（Manifest、MainActivity、图标）
scripts/build.sh        前端构建脚本
README.md / CHANGELOG.md / LICENSE
```

## 许可证

本项目以 [Mozilla Public License 2.0](LICENSE)（MPL-2.0）发布。

- 可以自由使用、复制、修改、分发，也可以商用
- 修改了本项目原有的源文件时，被修改的这些文件需要继续以 MPL-2.0 开源
- 额外新增的独立文件可采用其他许可证，不会被本项目连带
- 附带专利授权与专利反制条款

## 更新日志

见 [CHANGELOG.md](CHANGELOG.md)。
