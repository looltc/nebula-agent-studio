import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageCircleMore,
  Bot,
  GitBranch,
  Activity,
  Settings,
  Sparkles,
  Sun,
  Moon,
  CircleUser,
  PanelLeft,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { StatusDot } from '@/components/ui';
import type { StatusDotStatus } from '@/components/ui';
import type { ConnectionState } from '@/services/ws';
import { cx } from '@/lib/cx';
import styles from './SideNav.module.css';

const NAV_ITEMS = [
  { key: 'chat', label: '聊天', icon: MessageCircleMore, path: '/chat' },
  { key: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
  { key: 'orchestration', label: '编排', icon: GitBranch, path: '/orchestration' },
  { key: 'observe', label: '可观测', icon: Activity, path: '/observe' },
  { key: 'settings', label: '设置', icon: Settings, path: '/settings' },
];

const CONN_STATUS: Record<ConnectionState, StatusDotStatus> = {
  connected: 'active',
  reconnecting: 'warning',
  disconnected: 'idle',
  degraded: 'idle',
};

const CONN_LABEL: Record<ConnectionState, string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
  degraded: 'Degraded',
};

/** Render a compact relative-time string like "5m", "2h", "3d". */
function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return 'now';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const connState = useUIStore((s) => s.connectionState);

  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const loadMessages = useChatStore((s) => s.loadMessages);

  const onChat = location.pathname.startsWith('/chat');
  const connStatus = CONN_STATUS[connState];
  const connLabel = CONN_LABEL[connState];

  const go = (path: string, key: string) => {
    setActiveTab(key);
    navigate(path);
  };

  return (
    <nav className={styles.sidenav} data-collapsed={collapsed}>
      {/* ===== Top section: brand ===== */}
      <button
        className={styles.brand}
        onClick={() => go('/chat', 'chat')}
        title={collapsed ? 'Nebula Agent Studio' : undefined}
        aria-label="Nebula Agent Studio"
      >
        <Sparkles size={20} className={styles.brandIcon} />
        {!collapsed && <span className={styles.brandText}>Nebula Agent Studio</span>}
      </button>

      {/* ===== Middle section: nav + conversation history ===== */}
      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <li key={item.key}>
              <button
                className={cx(styles.navItem, active && styles.active)}
                onClick={() => go(item.path, item.key)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className={styles.navIcon} />
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {onChat && !collapsed && (
        <div className={styles.contextSection}>
          <div className={styles.sectionLabel}>会话历史</div>
          <div className={styles.convList}>
            {conversations.length === 0 && (
              <div className={styles.emptyHint}>暂无会话</div>
            )}
            {conversations.map((c) => {
              const selected = c.id === currentConversationId;
              const rel = relativeTime(c.started_at);
              return (
                <button
                  key={c.id}
                  className={cx(styles.convItem, selected && styles.convSelected)}
                  onClick={() => loadMessages(c.id)}
                  title={c.title ?? c.id}
                >
                  <span className={styles.convTitle}>{c.title ?? c.id}</span>
                  {rel && <span className={styles.convTime}>{rel}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!(onChat && !collapsed) && <div className={styles.spacer} />}

      {/* ===== Bottom section: account + actions ===== */}
      <div className={styles.bottom}>
        <span
          className={styles.conn}
          title={connLabel}
        >
          <StatusDot status={connStatus} size={8} />
        </span>
        <button
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className={styles.iconBtn}
          aria-label="Account"
          title="Account"
        >
          <CircleUser size={18} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Collapse/expand sidebar"
        >
          <PanelLeft size={18} />
        </button>
      </div>
    </nav>
  );
}
