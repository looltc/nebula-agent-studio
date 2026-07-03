/**
 * 把 agent.avatar（文件名，如 "cat.jpg"）转为 /avatars/ 路径；无则返回 null 由 Avatar fallback 到首字母。
 * 完整 URL（http/https/data:）直接返回。
 */
export function resolveAvatarSrc(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (/^(https?:|data:)/.test(avatar)) return avatar;
  return `/avatars/${avatar}`;
}
