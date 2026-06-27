# 02 - 视觉设计规范

基于豆包设计系统（Doubao Design Library），定义 Nebula Agent OS 前端的完整视觉规范。

> **设计参考**：豆包设计系统的 Design Tokens 作为基础色板和字体规范

## 模块清单

| 模块 | 职责 |
|------|------|
| Color System | 颜色令牌（亮/暗双模式） |
| Typography | 字体族、字号阶梯、行高 |
| Spacing | 间距阶梯（4px 基数） |
| Elevation | 阴影层级 |
| Border | 边框宽度与圆角 |
| Icon | 图标规范 |
| Dark Mode | 暗色模式映射 |

---

## 一、颜色系统

### 亮色模式（Light）

#### 基础色板

| 令牌 | 用途 | 色值 |
|------|------|------|
| `--bg-background` | 页面底色 | `#ffffff` |
| `--bg-card` | 卡片/面板底色 | `#ffffff` |
| `--bg-popover` | 弹出层底色 | `#f9f9fa` |
| `--bg-muted` | 次要背景（代码区、输入框底） | `#eff1f4` |

#### 文字色

| 令牌 | 用途 | 色值 |
|------|------|------|
| `--text-foreground` | 主文字 | `#0e1115` |
| `--text-muted` | 次要/说明文字 | `#7f8d9f` |
| `--text-secondary` | 辅助文字 | `#333942` |
| `--text-primary-fg` | 主色按钮上的文字 | `#ffffff` |
| `--text-accent-fg` | 强调文字（链接/标签） | `#00266b` |

#### 强调色

| 令牌 | 用途 | 色值 |
|------|------|------|
| `--accent-primary` | 主按钮、选中态、链接 | `#0065fd` |
| `--accent-ring` | 焦点环、选中边框 | `#557fff` |
| `--accent-input` | 输入框边框 | `#e7eaef` |
| `--accent-bg` | 选中行/高亮背景 | `#e5e9ff` |

#### 状态色

| 令牌 | 用途 | 色值 |
|------|------|------|
| `--status-destructive` | 危险/错误/删除 | `#ef4444` |
| `--status-success` | 成功/完成 | `#22c55e` |
| `--status-warning` | 警告/预算告警 | `#f59e0b` |
| `--status-info` | 提示/信息 | `#0065fd` |

#### 边框色

| 令牌 | 用途 | 色值 |
|------|------|------|
| `--border-default` | 默认边框 | `#e7eaef` |
| `--border-divider` | 分割线 | `#e7eaef` |

### 暗色模式（Dark）

> 前端默认暗色模式，与后端 Dashboard 风格一致。

| 令牌 | 亮色 | 暗色 |
|------|------|------|
| `--bg-background` | `#ffffff` | `#0e1115` |
| `--bg-card` | `#ffffff` | `#0e1115` |
| `--bg-popover` | `#f9f9fa` | `#22252a` |
| `--bg-muted` | `#eff1f4` | `#1a1d23` |
| `--text-foreground` | `#0e1115` | `#eff1f4` |
| `--text-muted` | `#7f8d9f` | `#7f8d9f` |
| `--accent-primary` | `#0065fd` | `#0065fd` |
| `--accent-bg` | `#e5e9ff` | `#1a2340` |
| `--border-default` | `#e7eaef` | `#2b3038` |

### 图表色

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--chart-1` | `#557fff` | 主指标线 |
| `--chart-2` | `#0065fd` | 对比指标 |
| `--chart-3` | `#0057da` | 辅助指标 |
| `--chart-4` | `#0043ad` | 累计指标 |
| `--chart-5` | `#002e7d` | 背景指标 |

### 侧边栏色

| 令牌 | 亮色 | 暗色 |
|------|------|------|
| `--sidebar-bg` | `#eff1f4` | `#1a1d23` |
| `--sidebar-fg` | `#0e1115` | `#eff1f4` |
| `--sidebar-primary` | `#0065fd` | `#0065fd` |
| `--sidebar-accent` | `#d4daff` | `#1a2340` |
| `--sidebar-border` | `#e7eaef` | `#2b3038` |

---

## 二、字体规范

### 字体族

| 用途 | 字体族 |
|------|--------|
| 界面文字 | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| 等宽（代码/ID） | `'JetBrains Mono', 'Fira Code', Consolas, monospace` |
| 中文（备选） | `'PingFang SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif` |

### 字号阶梯

| 令牌 | 大小 | 行高 | 用途 |
|------|------|------|------|
| `--text-xs` | 12px | 16px | 标签、徽标、时间戳 |
| `--text-sm` | 14px | 20px | 辅助文字、描述、按钮 |
| `--text-base` | 16px | 24px | 正文、消息内容 |
| `--text-lg` | 18px | 28px | 小标题、Tab 文字 |
| `--text-xl` | 20px | 28px | 区域标题 |
| `--text-2xl` | 24px | 32px | 页面标题 |
| `--text-3xl` | 30px | 36px | 大标题（欢迎页） |

### 字重

| 令牌 | 字重 | 用途 |
|------|------|------|
| `--font-normal` | 400 | 正文 |
| `--font-medium` | 500 | 按钮、标签、导航 |
| `--font-semibold` | 600 | 小标题、强调 |
| `--font-bold` | 700 | 大标题 |

---

## 三、间距系统

基于 4px 基数的阶梯：

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--space-0` | 0px | |
| `--space-1` | 4px | 图标与文字间距 |
| `--space-2` | 8px | 紧凑间距 |
| `--space-3` | 12px | 输入框内边距 |
| `--space-4` | 16px | 卡片内边距（小） |
| `--space-5` | 20px | 列表项间距 |
| `--space-6` | 24px | 卡片内边距（标准） |
| `--space-8` | 32px | 区域间距 |
| `--space-10` | 40px | 大区域间距 |
| `--space-12` | 48px | 页面边距 |

---

## 四、阴影层级

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | 卡片悬浮 |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | 弹出层、下拉菜单 |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | 模态框 |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | 全屏遮罩弹窗 |

暗色模式下阴影使用 `rgba(0,0,0,0.3)` 基底。

---

## 五、圆角

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--radius-none` | 0px | 表格行 |
| `--radius-sm` | 4px | 标签、徽标 |
| `--radius-md` | 8px | 按钮、输入框 |
| `--radius-lg` | 12px | 卡片 |
| `--radius-xl` | 16px | 模态框 |
| `--radius-full` | 9999px | 头像、Pill 按钮 |

---

## 六、图标规范

### 图标来源

使用豆包设计系统内置的 Lucide 图标集（SVG）。

### 图标尺寸

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--icon-xs` | 14px | 内联图标（按钮内） |
| `--icon-sm` | 16px | 列表项图标 |
| `--icon-md` | 20px | 导航图标 |
| `--icon-lg` | 24px | Tab 图标 |
| `--icon-xl` | 32px | 空状态图标 |

### 常用图标映射

| 功能 | 图标名 |
|------|--------|
| 聊天 | `message-circle-more` |
| Agent | `bot` (自定义) |
| 编排 | `git-branch` |
| 可观测 | `activity` |
| 设置 | `settings` |
| 发送 | `send-horizontal` |
| 工具 | `wrench` |
| 流式 | `zap` |
| 暂停/恢复 | `circle-pause` / `circle-play` |
| 错误 | `circle-alert` |
| 成功 | `circle-check` |
| 警告 | `triangle-alert` |

---

## 七、暗色模式实现

### CSS 变量方案

```css
:root {
  /* 亮色（默认在代码中定义） */
}

[data-theme="dark"] {
  --bg-background: #0e1115;
  --bg-card: #0e1115;
  /* ... 其余暗色令牌 */
}
```

### 切换策略

- **默认暗色**：前端 `data-theme="dark"` 为默认
- **持久化**：`localStorage.setItem('theme', 'dark'|'light')`
- **跟随系统**：`prefers-color-scheme` 作为初始值
- **过渡动画**：切换时 150ms `background-color` transition

---

## 八、代码展示规范

| 元素 | 字号 | 背景色 | 前景色 |
|------|------|--------|--------|
| 行内代码 | `--text-sm` | `--bg-muted` | `--accent-primary` |
| 代码块 | `--text-xs` | `--bg-background` | `--text-foreground` |
| JSON/YAML | `--text-sm` | `--bg-muted` | `--text-foreground` |

## 相关文档

- [01-overview.md](./01-overview.md)
- [03-layout-system.md](./03-layout-system.md)
- [04-component-library.md](./04-component-library.md)
