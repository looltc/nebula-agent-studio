import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
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
  ChevronUp,
  ChevronDown,
  Search,
  Puzzle,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { StatusDot, Avatar, TextInput } from '@/components/ui';
import type { StatusDotStatus } from '@/components/ui';
import type { ConnectionState } from '@/services/ws';
import { cx } from '@/lib/cx';
import styles from './SideNav.module.css';

interface NavItem {
  key: string;
  label: string;
  icon: typeof Bot;
  path: string;
  /** When true, this item expands an inline sub-panel (accordion). */
  accordion?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'chat', label: '聊天', icon: MessageCircleMore, path: '/chat', accordion: true },
  { key: 'group-chats', label: '群聊', icon: Users, path: '/group-chats' },
  { key: 'agents', label: 'Agents', icon: Bot, path: '/agents' },
  { key: 'skills', label: 'Skills', icon: Puzzle, path: '/skills' },
  { key: 'orchestration', label: '编排', icon: GitBranch, path: '/orchestration' },
  { key: 'approvals', label: '审批中心', icon: ShieldCheck, path: '/approvals' },
  { key: 'observe', label: '观测', icon: Activity, path: '/observe' },
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

export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const connState = useUIStore((s) => s.connectionState);
  const collapsedShowAgents = useUIStore((s) => s.sidebarCollapsedShowAgents);

  // Chat accordion + agent picker
  const agents = useChatStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const selectAgent = useChatStore((s) => s.selectAgent);
  const loadAgents = useChatStore((s) => s.loadAgents);

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [agentQuery, setAgentQuery] = useState('');
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Load agents once on mount so the accordion picker is ready.
  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

  const connStatus = CONN_STATUS[connState];
  const connLabel = CONN_LABEL[connState];

  const filteredAgents = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
    );
  }, [agents, agentQuery]);

  const go = (path: string, key: string) => {
    setActiveTab(key);
    navigate(path);
    setAccountMenuOpen(false);
  };

  const handleNavClick = (item: NavItem) => {
    // Chat accordion is always expanded; clicking the nav item just navigates.
    go(item.path, item.key);
  };

  const handleSelectAgent = (id: string) => {
    selectAgent(id);
    // Ensure we are on the chat page after picking an agent.
    if (!location.pathname.startsWith('/chat')) {
      go('/chat', 'chat');
    }
  };

  return (
    <nav className={styles.sidenav} data-collapsed={collapsed}>
      {/* ===== Top: brand + collapse button ===== */}
      <div className={styles.topBar}>
        <div className={styles.brandWrap}>
          <button
            className={styles.brand}
            onClick={() => go('/chat', 'chat')}
            title={collapsed ? 'Nebula Studio' : undefined}
            aria-label="Nebula Studio"
          >
            <Sparkles size={20} className={styles.brandIcon} />
            {!collapsed && <span className={styles.brandText}>Nebula Studio</span>}
          </button>
          {/* Expanded mode: collapse button sits to the right of the brand. */}
          {!collapsed && (
            <button
              className={styles.collapseBtn}
              onClick={toggleSidebar}
              aria-label="收起侧边栏"
              title="收起侧边栏"
            >
              <PanelLeft size={18} />
            </button>
          )}
          {/* Collapsed mode: expand button floats over the brand on hover. */}
          {collapsed && (
            <button
              className={styles.expandBtnOverlay}
              onClick={toggleSidebar}
              aria-label="展开侧边栏"
              title="展开侧边栏"
            >
              <PanelLeft size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ===== Middle: nav items ===== */}
      <ul className={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          const isChatAccordion =
            item.accordion && !collapsed;
          // chat 项占满剩余空间（让 Agent 头像列表自适应）；
          // 其余 nav items 因 flex-shrink:0 紧贴底部
          const isChat = item.key === 'chat';
          return (
            <li key={item.key} className={cx(styles.navItemLi, isChat && styles.navItemLiChat)}>
              <button
                className={cx(styles.navItem, active && styles.active)}
                onClick={() => handleNavClick(item)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} className={styles.navIcon} />
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                {!collapsed && item.accordion && (
                  <span className={styles.chevronSlot}>
                    <ChevronDown size={14} />
                  </span>
                )}
              </button>

              {/* Accordion panel: Agent picker under Chat */}
              {isChatAccordion && (
                <div className={styles.accordionPanel} role="region" aria-label="Agent 选择">
                  <div className={styles.agentPickerSearch}>
                    <TextInput
                      icon={<Search size={14} />}
                      placeholder="搜索 Agent..."
                      value={agentQuery}
                      onChange={(e) => setAgentQuery(e.target.value)}
                      aria-label="搜索 Agent"
                    />
                  </div>
                  <div className={styles.agentPickerList}>
                    {filteredAgents.length === 0 ? (
                      <div className={styles.agentPickerEmpty}>
                        {agents.length === 0 ? '暂无 Agent' : '未匹配到 Agent'}
                      </div>
                    ) : (
                      filteredAgents.map((a) => {
                        const isActive = a.id === currentAgentId;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            className={cx(
                              styles.agentPickerItem,
                              isActive && styles.agentPickerItemActive,
                            )}
                            onClick={() => handleSelectAgent(a.id)}
                            aria-pressed={isActive}
                            title={a.name}
                          >
                            <Avatar
                              name={a.name}
                              size="sm"
                              online={a.enabled}
                              src={a.avatar ? `/avatars/${a.avatar}` : null}
                            />
                            <span className={styles.agentPickerName}>{a.name}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Collapsed mode: show agents as a vertical avatar stack
                  under the Chat icon. No labels, hover for tooltip.
                  受设置「折叠时显示 Agent 头像」控制。 */}
              {collapsed && item.accordion && collapsedShowAgents && (
                <div className={styles.collapsedAgentStack} role="list" aria-label="Agent 列表">
                  {agents.map((a) => {
                    const isActive = a.id === currentAgentId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={cx(
                          styles.collapsedAgentBtn,
                          isActive && styles.collapsedAgentBtnActive,
                        )}
                        onClick={() => handleSelectAgent(a.id)}
                        aria-pressed={isActive}
                        title={a.name}
                        role="listitem"
                      >
                        <Avatar
                          name={a.name}
                          size="sm"
                          online={a.enabled}
                          src={a.avatar ? `/avatars/${a.avatar}` : null}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ===== Bottom: account + expandable menu ===== */}
      <div className={styles.bottom} ref={accountMenuRef}>
        <button
          className={cx(styles.accountBtn, accountMenuOpen && styles.accountBtnOpen)}
          onClick={() => setAccountMenuOpen((o) => !o)}
          aria-label="账户菜单"
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
        >
          <span className={styles.accountAvatar}>
            <CircleUser size={20} />
          </span>
          {!collapsed && (
            <>
              <span className={styles.accountInfo}>
                <span className={styles.accountName}>本地用户</span>
                <span className={styles.accountSub}>
                  <StatusDot status={connStatus} size={8} />
                  {connLabel}
                </span>
              </span>
              <ChevronUp
                size={16}
                className={cx(styles.chevron, accountMenuOpen && styles.chevronOpen)}
              />
            </>
          )}
        </button>

        {accountMenuOpen && (
          <div className={cx(styles.accountMenu, collapsed && styles.accountMenuCollapsed)} role="menu">
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                toggleTheme();
              }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
            </button>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => go('/settings', 'settings')}
            >
              <Settings size={16} />
              <span>设置</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
