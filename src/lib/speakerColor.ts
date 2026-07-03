/**
 * 发言者颜色编码：基于 agent id 生成稳定的颜色（hue），用于消息气泡左边框、名字、头像环统一着色。
 * 使用 HSL 色相空间，避免暗色模式下过暗的色相（避开 200-260 蓝紫段过暗区间用 +40 偏移）。
 */

const PALETTE_HUES = [
  0, 25, 50, 90, 130, 165, 195, 280, 320, 350,
];

const cache = new Map<string, { hue: number; cssVar: string }>();

/**
 * 返回发言者颜色。基于 id 哈希取调色板中的 hue，保证同一 agent 颜色稳定。
 */
export function speakerColor(id: string): { hue: number; cssVar: string } {
  const cached = cache.get(id);
  if (cached) return cached;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const hue = PALETTE_HUES[Math.abs(hash) % PALETTE_HUES.length];
  // 用 CSS 自定义属性传递，组件内通过 var(--speaker-hue) 使用
  const cssVar = `${hue}`;
  const result = { hue, cssVar };
  cache.set(id, result);
  return result;
}

/**
 * 内联 style：设置 --speaker-hue 变量，供子元素用 hsl(var(--speaker-hue) ...) 引用。
 */
export function speakerStyle(id: string): React.CSSProperties {
  const { hue } = speakerColor(id);
  return { ['--speaker-hue' as string]: `${hue}` } as React.CSSProperties;
}
