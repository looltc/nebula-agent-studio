import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Share2,
  MoreVertical,
  Trash2,
  Download,
  Sparkles,
} from 'lucide-react';
import { useChatStore, type ChatMode } from '@/stores/chatStore';
import type { MessageInfo } from '@/types/api';
import { useUIStore } from '@/stores/uiStore';
import { useChatTransport } from '@/hooks/useChatTransport';
import { Button, Modal, TextInput } from '@/components/ui';
import { ConversationHistory, MessageList, ChatInput } from '@/components/chat';
import { cx } from '@/lib/cx';
import styles from './ChatPage.module.css';

/** 自定义气泡省略号图标 —— 新聊天专用，气泡右下角三连粗圆点。 */
function NewChatIcon({ size = 20, strokeWidth: _strokeWidth = 2.5 }: { size?: number; strokeWidth?: number }) {
  // strokeWidth 保留以兼容调用方签名，但当前图标用 fill 模式不使用描边
  void _strokeWidth;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="none"
      aria-hidden="true"
    >
      {/* 气泡主体 —— fill 填充 */}
      <path
        d="M496 88c204.2 0 373.348 150 403.284 345.828 3.148 20.592-13.544 38.172-34.372 38.172-19.02 0-34.588-14.768-37.82-33.508C799.812 280.32 661.968 160 496 160c-185.572 0-336 150.428-336 336v0.108a334.212 334.212 0 0 0 39.48 158.072l5.588 10.456a40.008 40.008 0 0 1 3.772 27.54l-23.272 104.712a8 8 0 0 0 9.544 9.544l104.72-23.272a40.012 40.012 0 0 1 27.532 3.772l10.456 5.592a334.148 334.148 0 0 0 100.668 34.584c18.744 3.24 33.512 18.812 33.512 37.832 0 20.828-17.56 37.516-38.148 34.36a406.068 406.068 0 0 1-124.712-40.516 16.42 16.42 0 0 0-11.068-1.476l-159.488 35.448-1.108 0.228c-23.104 4.352-43.388-16.376-38.232-39.568l33.52-150.824c2.08-9.332 0.668-19.072-3.528-27.664A406.196 406.196 0 0 1 88 496C88 270.664 270.664 88 496 88z"
        fill="currentColor"
        stroke="none"
      />
      {/* 三个粗圆点 —— 用 stroke + round linecap 画短线段，形成粗圆点。
          viewBox=1024 缩放到 20px 时比例约 1:51，strokeWidth=120 才能在
          显示尺寸下呈现约 2.3px 的可见直径。点间距 160 避免重叠。 */}
      <path
        d="M 540 690 L 560 690 M 700 690 L 720 690 M 860 690 L 880 690"
        fill="none"
        stroke="currentColor"
        strokeWidth={100}
        strokeLinecap="round"
      />
    </svg>
  );
}

const MODES: Array<{ key: ChatMode; label: string }> = [
  { key: 'ws', label: 'WS' },
  { key: 'sse', label: 'SSE' },
  { key: 'http', label: 'HTTP' },
];

interface ExportPayload {
  agentId: string | null;
  conversationId: string | null;
  exportedAt: string;
  messages: MessageInfo[];
}

/**
 * Chat page: 260px conversation sidebar (新聊天 + 搜索 + 展开会话列表)
 * + main area that shows a centered welcome screen when empty, or a header
 * (agent name + 分享 + 3-dot 菜单) + MessageList + ChatInput otherwise.
 */
export default function ChatPage() {
  const loadConversations = useChatStore((s) => s.loadConversations);
  const restoreSession = useChatStore((s) => s.restoreSession);
  const agents = useChatStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const chatMode = useChatStore((s) => s.chatMode);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const clearChat = useChatStore((s) => s.clearChat);
  const startNewChat = useChatStore((s) => s.startNewChat);
  const addToast = useUIStore((s) => s.addToast);
  const { send, stop } = useChatTransport();

  const [menuOpen, setMenuOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Keep the conversation list fresh whenever the active agent changes.
  useEffect(() => {
    if (currentAgentId) {
      void loadConversations();
      // 刷新页面后恢复上次正在进行的 conversation（后端已在断开时持久化部分回复）
      void restoreSession();
    }
  }, [currentAgentId, loadConversations, restoreSession]);

  const agentName = useMemo(() => {
    const a = agents.find((x) => x.id === currentAgentId);
    return a?.name ?? currentAgentId ?? '助手';
  }, [agents, currentAgentId]);

  // Currently selected agent object (for avatar + name card)
  const currentAgent = useMemo(
    () => agents.find((x) => x.id === currentAgentId) ?? null,
    [agents, currentAgentId],
  );
  const agentAvatar = currentAgent?.avatar ?? '';

  const showWelcome = messages.length === 0 && !streaming;

  const welcomeSubtitle =
    currentAgentId === null
      ? '请在左侧边栏「聊天」展开的 Agent 列表中选择一个 Agent'
      : '输入消息开始与 Agent 交流';

  function handleExport() {
    setMenuOpen(false);
    if (messages.length === 0) {
      addToast({
        variant: 'info',
        title: '无可导出内容',
        description: '当前会话暂无消息。',
      });
      return;
    }
    const payload: ExportPayload = {
      agentId: currentAgentId,
      conversationId: useChatStore.getState().currentConversationId,
      exportedAt: new Date().toISOString(),
      messages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentAgentId ?? 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast({
      variant: 'success',
      title: '导出成功',
      description: '会话已导出为 JSON 文件。',
    });
  }

  function handleClearClick() {
    setMenuOpen(false);
    setClearOpen(true);
  }

  function handleClearConfirm() {
    clearChat();
    setClearOpen(false);
    addToast({ variant: 'info', title: '已清空对话' });
  }

  function handleShare() {
    addToast({ variant: 'info', title: '分享功能开发中' });
  }

  function handleNewChat() {
    startNewChat();
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          {/* Agent name card — sits above 新聊天 button. Falls back to a
              "未选择 Agent" placeholder when currentAgentId is null. */}
          <div
            className={cx(
              styles.agentCard,
              !currentAgent && styles.agentCardEmpty,
            )}
            title={currentAgent ? `${agentName} (${currentAgent.id})` : '未选择 Agent'}
          >
            <div className={styles.agentAvatar}>
              {agentAvatar ? (
                <img
                  src={`/avatars/${agentAvatar}`}
                  alt={agentName}
                  className={styles.agentAvatarImg}
                />
              ) : currentAgent ? (
                <span className={styles.agentAvatarFallback}>
                  {agentName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Sparkles size={20} className={styles.agentAvatarIcon} />
              )}
            </div>
            <div className={styles.agentInfo}>
              <div className={styles.agentCardName}>{agentName}</div>
              <div className={styles.agentCardRole}>
                {currentAgent ? currentAgent.role : '未选择'}
              </div>
            </div>
            {/* 新聊天 —— 与头像同行靠右，方块加铅笔粗线条图标，
                默认仅图标，hover 时展开显示文字 */}
            <button
              type="button"
              className={styles.newChatFab}
              onClick={handleNewChat}
              aria-label="新聊天"
              title="新聊天"
            >
              <NewChatIcon size={20} />
              <span className={styles.newChatFabLabel}>新聊天</span>
            </button>
          </div>
        </div>

        {/* 会话历史（按 Agent 归属过滤，最新在上） */}
        <div className={styles.convSection}>
          <div className={styles.convSectionHead}>
            <span className={styles.convSectionLabel}>会话历史</span>
          </div>
          <TextInput
            icon={<Search size={16} />}
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="搜索会话"
          />
          <ConversationHistory query={searchQuery} />
        </div>
      </aside>

      <main className={styles.main}>
        {showWelcome ? (
          <div className={styles.welcome}>
            <div className={styles.brandLogo} aria-hidden="true">
              {agentAvatar ? (
                <img
                  src={`/avatars/${agentAvatar}`}
                  alt={agentName}
                  className={styles.brandAvatarImg}
                />
              ) : (
                <Sparkles size={48} />
              )}
            </div>
            <h1 className={styles.welcomeTitle}>
              {currentAgent ? agentName : '开始你的对话'}
            </h1>
            <p className={styles.welcomeSubtitle}>{welcomeSubtitle}</p>
            <div className={styles.welcomeInput}>
              <ChatInput
                onSend={send}
                onStop={stop}
                streaming={streaming}
                agentId={currentAgentId}
                disabled={currentAgentId === null}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Floating toolbar (top-right) — replaces the old header.
                Position: absolute over the message list, pointer-events kept
                on buttons only so the area below still receives scroll. */}
            <div className={styles.floatingToolbar}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={handleShare}
                aria-label="分享"
                title="分享"
              >
                <Share2 size={18} />
              </button>
              <div className={styles.menuWrap}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="更多操作"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title="更多操作"
                >
                  <MoreVertical size={18} />
                </button>
                {menuOpen && (
                  <>
                    <div
                      className={styles.backdrop}
                      onClick={() => setMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className={styles.menu} role="menu">
                      <div className={styles.menuLabel}>传输模式</div>
                      <div
                        className={styles.modeGroup}
                        role="group"
                        aria-label="传输模式"
                      >
                        {MODES.map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            className={cx(
                              styles.modeBtn,
                              chatMode === m.key && styles.modeActive,
                            )}
                            onClick={() => setChatMode(m.key)}
                            aria-pressed={chatMode === m.key}
                            title={`${m.label} 传输`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      <div className={styles.menuDivider} />
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={handleExport}
                        disabled={messages.length === 0}
                      >
                        <Download size={14} className={styles.menuIcon} />
                        导出 JSON
                      </button>
                      <button
                        type="button"
                        className={cx(
                          styles.menuItem,
                          styles.menuItemDanger,
                        )}
                        role="menuitem"
                        onClick={handleClearClick}
                        disabled={messages.length === 0 && !streaming}
                      >
                        <Trash2 size={14} className={styles.menuIcon} />
                        清空对话
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <MessageList />

            <ChatInput
              onSend={send}
              onStop={stop}
              streaming={streaming}
              agentId={currentAgentId}
              disabled={currentAgentId === null}
            />
          </>
        )}
      </main>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="清空对话?"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setClearOpen(false)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearConfirm}>
              清空
            </Button>
          </>
        }
      >
        <p className={styles.modalBody}>
          此操作将移除当前视图中的所有消息，且无法撤销。
        </p>
      </Modal>
    </div>
  );
}
