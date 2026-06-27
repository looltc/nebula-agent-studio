import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageCircleMore,
  Bot,
  GitBranch,
  Activity,
  Settings,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { cx } from '@/lib/cx';
import styles from './SideNav.module.css';

const NAV_ITEMS = [
  { key: 'chat', label: 'Chat', icon: MessageCircleMore, path: '/chat' },
  { key: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
  { key: 'orchestration', label: 'Orchestration', icon: GitBranch, path: '/orchestration' },
  { key: 'observe', label: 'Observe', icon: Activity, path: '/observe' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const agents = useChatStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const selectAgent = useChatStore((s) => s.selectAgent);
  const unread = useChatStore((s) => s.unread);

  const onChat = location.pathname.startsWith('/chat');

  const go = (path: string, key: string) => {
    setActiveTab(key);
    navigate(path);
  };

  return (
    <nav className={styles.sidenav} data-collapsed={collapsed}>
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
          <div className={styles.sectionLabel}>Agents</div>
          <div className={styles.agentList}>
            {agents.length === 0 && (
              <div className={styles.emptyHint}>No agents yet</div>
            )}
            {agents.map((a) => {
              const count = unread[a.id] ?? 0;
              const selected = a.id === currentAgentId;
              return (
                <button
                  key={a.id}
                  className={cx(styles.agentItem, selected && styles.agentSelected)}
                  onClick={() => selectAgent(a.id)}
                >
                  <span className={styles.agentAvatar}>{a.name.charAt(0).toUpperCase()}</span>
                  <span className={styles.agentInfo}>
                    <span className={styles.agentName}>{a.name}</span>
                    <span className={styles.agentRole}>{a.role || 'assistant'}</span>
                  </span>
                  {count > 0 && <span className={styles.unread}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.spacer} />

      {!collapsed && (
        <div className={styles.stats}>
          <span className={styles.statsText}>
            {agents.length} Agents
          </span>
        </div>
      )}
    </nav>
  );
}
