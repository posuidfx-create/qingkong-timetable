# 努力也是一种天赋

## Pixel Editorial Workspace 设计规范

本规范定义产品自 v3.0.2 起的正式视觉方向。界面是一套安静、精确、以内容为中心的学习工作台：使用纯灰画布、编辑式排版、少量上下文表面和克制的原创像素互动。它不是营销页、后台 Dashboard、复古游戏界面，也不是壁纸展示器。

## 1. Pure Gray Canvas

- Light Canvas 固定为 `#F5F5F5`，对应 `--app-canvas`。
- 全页不以纯白作为默认背景；白色只用于需要明确分组的 Context Surface。
- Canvas 不使用图片、视频、渐变、光晕、水纹或玻璃模糊。
- 页面结构主要依靠字级、间距、对齐和 hairline，而不是卡片堆叠。

## 2. Editorial Typography

- 字体使用 Geist、system-ui 与系统中日文字体 fallback，不打包或模仿专有字体。
- 主标题：高对比、紧凑字距、低至中等字重。
- 正文：稳定行高，中文与日文优先保证阅读节奏。
- Metadata：小字号、tabular numbers、适度字距，不与正文争夺注意力。
- 层级顺序：Primary title → Section title → Body → Metadata。

## 3. Color System

- Canvas：`#F5F5F5`。
- Carbon：`#1D1D1F`。
- Context：`#FFFFFF`。
- Muted：`#6E6E73`。
- Hairline：`#D7D7D4`。
- Active 状态优先使用 Carbon 与 Canvas 的反转，不默认使用高饱和色。
- Destructive 颜色只服务于危险操作。

## 4. Surface Hierarchy

1. Level 0 — Pure Gray Canvas。
2. Level 1 — Editorial Reading Surface，通常直接使用 Canvas。
3. Level 2 — Context Surface，仅在分组必要时使用白色或轻微灰差。
4. Level 3 — Interactive Surface，用于按钮、输入和导航。
5. Level 4 — Pixel Motion Layer，位于内容下方且 `pointer-events: none`。

Surface 使用克制圆角与极轻阴影。正文区不使用 backdrop blur。

## 5. Spacing Rhythm

- 基础单位为 4px。
- 常用序列：4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96。
- 模块之间优先增加留白，不增加装饰边框。
- 移动端保持紧凑但不压缩 44px 触控目标。

## 6. Hairline, Radius and Shadow

- Hairline：1px neutral gray。
- 控件圆角通常 6–10px；上下文表面通常不超过 10px。
- 大面积阅读面允许无圆角。
- 阴影只表达真实浮层或焦点变化，常规内容最多使用 1–2px 极轻阴影。
- 禁止多层高光、折射边、玻璃内阴影和漂浮卡片墙。

## 7. Pixel Response

Pointer Pixel Response 使用局部坐标影响少量像素单元：

`pointer → local coordinates → nearby cells → 1–4px offset / opacity / scale → return`

- 只用于空白区域、Index 编号和主要 CTA 周边。
- 不覆盖正文，不形成满屏网格、cursor trail 或粒子爆炸。
- pointermove 不触发 React state；使用 ref、CSS variables 与单个 RAF 合并更新。
- 离开区域后移除临时变量并平滑归位。

## 8. Pixel Heart Arrow Geometry

- Pixel Heart Arrow 是项目原创 CSS pixel geometry。
- 由 2px 基础像素、心形头部、细长箭身和阶梯式箭尖组成。
- 不是 emoji，不是 Lucide 组合，不是通用 SVG icon。
- Light 使用低透明 Carbon；Dark 使用低透明 light neutral。
- 爱心通过轮廓表达，不依赖粉红或情人节色彩。

## 9. Pixel Heart Drift

- Desktop 同时最多 3 支，实际数量为 1–3。
- Mobile 最多 1 支，也允许某次完全不出现。
- 从 viewport 边缘外生成，可左右横穿或斜向上穿过。
- 每支拥有不同方向、高度、速度与 idle gap。
- 路径以慢速 CSS transform / RAF 呈现，并保留轻微 pixel stepping。
- 出界后复用固定槽位，不累积 DOM；总节点上限固定。
- 指针接近时最多产生 1–4px 修正，不追逐、不躲避、不加速。

## 10. Ambient Motion Rules

- 环境动态表达“偶尔有小生命经过”，不是持续特效。
- 必须存在长停顿、低透明度和非同步节奏。
- 页面 hidden 时停止 RAF，恢复可见后继续。
- unmount 时清理 RAF、media query、pointer、resize 与 visibility listeners。
- 环境层不遮挡 Bottom Navigation、表单、文字或点击目标。

## 11. Morph Navigation

- inactive 项保持 compact，只显示编号。
- active 项扩展并显示 label。
- 使用 gray / black editorial surface，不使用玻璃 pill。
- 动画 150–240ms；减少动态模式下直接切换。
- `aria-current="page"` 必须保留。

## 12. Pixel Reactive Surface

- 仅用于主要 CTA，例如“记录今天”。
- 基础为 Carbon 按钮，不使用水光、折射、渐变或 glass shine。
- 内部少量像素单元根据指针局部响应，最大位移 4px。
- 键盘 focus-visible、touch active 与 disabled 状态必须清晰。

## 13. Learning Workspace

- 保留 `LEARNING / 01`、Today、Index、Recent Learning、Context Rail、Morph Navigation 和 archive rows。
- 主阅读面直接落在 Canvas 上；Context Rail 使用白色 Context Surface。
- Index 和记录列表用数字、metadata、hairline 与准确对齐构成节奏。
- 真实 CRUD、附件、AI feature flag 与数据模型不因视觉系统变化而改变。

## 14. Accessibility and Reduced Motion

- 所有 icon-only 控件必须有可读名称。
- 最小触控区约 44×44px，focus-visible 不得被移除。
- 颜色不是唯一状态信号；active 同时使用位置、边框或反转。
- `prefers-reduced-motion: reduce` 下隐藏 Pixel Heart Drift，禁用 Pointer displacement，并让 Morph 直接切换。
- 动态层均为装饰性 `aria-hidden`。

## 15. Performance

- 不在 pointermove 中调用 React setState。
- 使用 RAF 合并 DOM style 写入；同时只运行一个 drift RAF。
- Pixel Heart Drift 固定最多 3 个对象，移动端最多激活 1 个。
- 不引入 GSAP 或粒子库；当前交互规模使用原生 CSS/RAF 更轻且可控。
- 页面隐藏和组件卸载必须停止工作并释放监听器。

## 16. Mobile and Dark Mode

- 375 / 390 / 430px 优先保证无横向滚动、safe-area、底部导航和正文可读性。
- 手机可完全不生成环境箭头；Pointer Pixel Field 在小屏禁用。
- Dark Canvas 使用近黑 neutral，不切换背景素材。
- Dark Pixel Heart 使用低透明浅灰，Context Surface 使用轻微亮度差。

## 17. External Reference Boundaries

### ma5a

只抽象稀疏 pointer response、随机停顿、边缘生成和出界销毁的机制理念。绝不复制 rabbit、sprite、pixel art、原始源码、数量公式、运动路径或品牌表达。

### Apple reference

只吸收克制层级、留白、hairline 和 typography-first 原则。绝不复制 Apple 品牌、Logo、文案、页面结构、SF Pro 文件或专属蓝色规则。

## 18. Wallpaper System Removed

- Wallpaper Layer、Picker、Preview、配置、motion pause/play、类型和静态资源均已废弃并移除。
- `app_wallpaper_id` 与 `app_wallpaper_motion` 仅作为升级清理键读取并删除，不再驱动界面。
- manifest、PWA precache 和运行时不再引用 wallpaper 资源。
- 后续设计不得重新引入水面背景、Aqua 命名或可切换壁纸抽象。
