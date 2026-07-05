/**
 * 统一时间格式化工具
 *
 * 设计原则：
 * - 后端存储统一使用 UTC（ISO 字符串，可能带 +00:00 / Z 后缀）
 * - 前端显示统一使用北京时间（Asia/Shanghai）
 * - 所有组件统一通过本模块格式化时间，避免散落硬编码
 *
 * 关键修复：
 * - 后端 SQLite 读出的 naive datetime（无 tz 后缀）会被浏览器当作本地时间解析
 *   这里通过 normaliseTs 自动补 Z 后缀，强制按 UTC 解析
 */

/** 统一显示时区（北京时间） */
export const DISPLAY_TIMEZONE = 'Asia/Shanghai';

/** 统一 locale（中文） */
export const DISPLAY_LOCALE = 'zh-CN';

/**
 * 把后端返回的时间字符串归一化为可被 Date 正确解析的 ISO 字符串。
 *
 * 后端 SQLite 读出的 naive datetime 不带 tz 后缀（如 "2026-07-05 04:40:29"），
 * 浏览器会按本地时区解析，导致非北京时区用户看到错误时间。
 * 这里检测无 tz 后缀时补 Z（按 UTC 解析）。
 *
 * @param ts 后端时间字符串（ISO 或 SQLite 格式）
 * @returns 归一化后的 ISO 字符串
 */
export function normaliseTs(ts: string | null | undefined): string {
  if (!ts) return '';
  // 已含 tz 后缀（Z / z / +08:00 / -0500）→ 原样返回
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(ts)) return ts;
  // 把空格分隔符替换为 T（SQLite 格式 → ISO 格式）
  const iso = ts.includes('T') ? ts : ts.replace(' ', 'T');
  return `${iso}Z`;
}

/**
 * 把时间字符串解析为 Date 对象（自动处理 naive UTC 字符串）。
 */
export function parseDate(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  try {
    const normalised = normaliseTs(ts);
    const d = new Date(normalised);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * 格式化为时间（时:分:秒），北京时间，24 小时制。
 *
 * @param ts 后端时间字符串
 * @returns 如 "04:40:29"
 */
export function formatTime(ts: string | null | undefined): string {
  const d = parseDate(ts);
  if (!d) return '';
  try {
    return d.toLocaleTimeString(DISPLAY_LOCALE, {
      timeZone: DISPLAY_TIMEZONE,
      hour12: false,
    });
  } catch {
    return '';
  }
}

/**
 * 格式化为日期（年-月-日），北京时间。
 *
 * @param ts 后端时间字符串
 * @returns 如 "2026/7/5"
 */
export function formatDate(ts: string | null | undefined): string {
  const d = parseDate(ts);
  if (!d) return '';
  try {
    return d.toLocaleDateString(DISPLAY_LOCALE, {
      timeZone: DISPLAY_TIMEZONE,
    });
  } catch {
    return '';
  }
}

/**
 * 格式化为日期+时间（年-月-日 时:分:秒），北京时间，24 小时制。
 *
 * @param ts 后端时间字符串
 * @param includeSeconds 是否包含秒（默认 false）
 * @returns 如 "2026/7/5 04:40" 或 "2026/7/5 04:40:29"
 */
export function formatDateTime(
  ts: string | null | undefined,
  includeSeconds = false,
): string {
  const d = parseDate(ts);
  if (!d) return '';
  try {
    return d.toLocaleString(DISPLAY_LOCALE, {
      timeZone: DISPLAY_TIMEZONE,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds ? { second: '2-digit' } : {}),
    });
  } catch {
    return '';
  }
}

/**
 * 格式化为相对时间（"刚刚" / "X 分钟前" / "X 小时前" / "X 天前" / 日期）。
 *
 * @param ts 后端时间字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(ts: string | null | undefined): string {
  const d = parseDate(ts);
  if (!d) return '';
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  // 超过 7 天显示具体日期
  return formatDate(ts);
}

/**
 * 判断两个时间戳是否间隔超过指定分钟数（用于聊天分隔线）。
 *
 * @param ts1 第一个时间戳
 * @param ts2 第二个时间戳
 * @param minutes 间隔阈值（默认 5 分钟）
 */
export function isTimeGapExceeded(
  ts1: string | null | undefined,
  ts2: string | null | undefined,
  minutes = 5,
): boolean {
  const d1 = parseDate(ts1);
  const d2 = parseDate(ts2);
  if (!d1 || !d2) return false;
  const diffMs = Math.abs(d1.getTime() - d2.getTime());
  return diffMs > minutes * 60 * 1000;
}

/**
 * 格式化为聊天分隔线格式（月/日 时:分），北京时间，24 小时制。
 *
 * @param ts 后端时间字符串
 * @returns 如 "7/5 04:40"
 */
export function formatChatDivider(ts: string | null | undefined): string {
  const d = parseDate(ts);
  if (!d) return '';
  try {
    return d.toLocaleString(DISPLAY_LOCALE, {
      timeZone: DISPLAY_TIMEZONE,
      hour12: false,
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
