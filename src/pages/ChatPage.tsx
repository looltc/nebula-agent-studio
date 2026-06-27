import { useEffect, useMemo, useState } from 'react';
import { Trash2, Download, MessageCircleMore } from 'lucide-react';
import { useChatStore, type ChatMode } from '@/stores/chatStore';
import type { MessageInfo } from '@/types/api';
import { useUIStore } from '@/stores/uiStore';
import { useChatTransport } from '@/hooks/useChatTransport';
import {
  Button,
  EmptyState,
  Modal,
  StatusDot,
  type StatusDotStatus,
} from '@/components/ui';
import {
  AgentSidebar,
  ConversationHistory,
  MessageList,
  ChatInput,
} from '@/components/chat';
import { cx } from '@/lib/cx';
import styles from './ChatPage.module.css';

const MODES: Array<{ key: ChatMode; label: string }> = [
  { key: 'ws', label: 'WS' },
  { key: 'sse', label: 'SSE' },
  { key: 'http', label: 'HTTP' },
];

function connectionToStatus(state: string): StatusDotStatus {
  switch (state) {
    case 'connected':
      return 'active';
    case 'reconnecting':
      return 'warning';
    default:
      return 'idle';
  }
}

interface ExportPayload {
  agentId: string | null;
  conversationId: string | null;
  exportedAt: string;
  messages: MessageInfo[];
}

/**
 * Full-screen Chat page: 260px agent sidebar + messages column + input bar.
 * Toolbar exposes transport-mode toggle, clear (with confirm) and JSON export.
 */
export default function ChatPage() {
  const loadAgents = useChatStore((s) => s.loadAgents);
  const agents = useChatStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const chatMode = useChatStore((s) => s.chatMode);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const clearChat = useChatStore((s) => s.clearChat);
  const connectionState = useUIStore((s) => s.connectionState);
  const addToast = useUIStore((s) => s.addToast);
  const { send, stop } = useChatTransport();
  const [clearOpen, setClearOpen] = useState(false);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const agentName = useMemo(() => {
    const a = agents.find((x) => x.id === currentAgentId);
    return a?.name ?? currentAgentId ?? 'Assistant';
  }, [agents, currentAgentId]);

  const showWelcome =
    messages.length === 0 && !streaming && currentAgentId !== null;

  function handleExport() {
    if (messages.length === 0) {
      addToast({
        variant: 'info',
        title: 'Nothing to export',
        description: 'There are no messages in this conversation yet.',
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
      title: 'Exported',
      description: 'Conversation exported as JSON.',
    });
  }

  function handleClearConfirm() {
    clearChat();
    setClearOpen(false);
    addToast({ variant: 'info', title: 'Chat cleared' });
  }

  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <MessageCircleMore size={18} className={styles.brandIcon} />
          <h1 className={styles.title}>Chat</h1>
          <span
            className={styles.conn}
            title={`Connection: ${connectionState}`}
          >
            <StatusDot status={connectionToStatus(connectionState)} size={8} />
            <span className={styles.connText}>{connectionState}</span>
          </span>
        </div>

        <div className={styles.actions}>
          <div
            className={styles.modeGroup}
            role="group"
            aria-label="Chat transport mode"
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
                title={`${m.label} transport`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => setClearOpen(true)}
            disabled={messages.length === 0 && !streaming}
          >
            Clear
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExport}
            disabled={messages.length === 0}
          >
            Export
          </Button>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarScroll}>
            <AgentSidebar />
          </div>
          <ConversationHistory />
        </aside>

        <main className={styles.main}>
          {currentAgentId === null ? (
            <div className={styles.placeholder}>
              <EmptyState
                icon={<MessageCircleMore size={32} />}
                title="Select an agent to start chatting"
                description="Pick an agent from the sidebar, or load agents if the list is empty."
              />
            </div>
          ) : showWelcome ? (
            <div className={styles.welcomeWrap}>
              <div className={styles.welcome}>
                <div className={styles.welcomeText}>
                  Hi, I'm {agentName}. How can I help?
                </div>
              </div>
              <div className={styles.welcomeMeta}>{agentName}</div>
            </div>
          ) : (
            <MessageList />
          )}

          <ChatInput
            onSend={send}
            onStop={stop}
            streaming={streaming}
            agentId={currentAgentId}
            disabled={currentAgentId === null}
          />
        </main>
      </div>

      <Modal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear conversation?"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearConfirm}>
              Clear
            </Button>
          </>
        }
      >
        <p className={styles.modalBody}>
          This removes all messages in the current view. This action cannot be
          undone.
        </p>
      </Modal>
    </div>
  );
}
