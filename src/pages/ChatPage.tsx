import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
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
  const loadAgents = useChatStore((s) => s.loadAgents);
  const loadConversations = useChatStore((s) => s.loadConversations);
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

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  // Keep the conversation list fresh whenever the active agent changes.
  useEffect(() => {
    if (currentAgentId) void loadConversations();
  }, [currentAgentId, loadConversations]);

  const agentName = useMemo(() => {
    const a = agents.find((x) => x.id === currentAgentId);
    return a?.name ?? currentAgentId ?? '助手';
  }, [agents, currentAgentId]);

  const showWelcome = messages.length === 0 && !streaming;

  const welcomeSubtitle =
    currentAgentId === null
      ? '请先在左侧导航选择一个 Agent'
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
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={handleNewChat}
            fullWidth
          >
            新聊天
          </Button>
          <TextInput
            icon={<Search size={16} />}
            placeholder="搜索会话..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="搜索会话"
          />
        </div>
        <ConversationHistory query={searchQuery} />
      </aside>

      <main className={styles.main}>
        {showWelcome ? (
          <div className={styles.welcome}>
            <div className={styles.brandLogo} aria-hidden="true">
              <Sparkles size={48} />
            </div>
            <h1 className={styles.welcomeTitle}>开始你的对话</h1>
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
            <header className={styles.header}>
              <div className={styles.headerLeft}>
                <span className={styles.agentName} title={agentName}>
                  {agentName}
                </span>
              </div>
              <div className={styles.headerRight}>
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
            </header>

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
