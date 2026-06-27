<<<<<<< HEAD
import { useState } from 'react';
import { ChevronDown, MessageCircleMore, Clock } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
=======
import { useMemo, useState } from 'react';
import { Clock, MoreVertical, Pencil, Trash2, Download } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { apiClient } from '@/services/api';
import { Modal, Button } from '@/components/ui';
>>>>>>> feat-implement-frontend-design-GH23Da
import { cx } from '@/lib/cx';
import styles from './ConversationHistory.module.css';

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
<<<<<<< HEAD
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

/**
 * Collapsible list of past conversations for the current agent.
 * Clicking an entry loads its messages via the store.
 */
export function ConversationHistory() {
  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <MessageCircleMore size={16} className={styles.toggleIcon} />
        <span className={styles.toggleLabel}>Conversation History</span>
        <span className={styles.toggleCount}>{conversations.length}</span>
        <ChevronDown
          size={14}
          className={cx(styles.chevron, open && styles.chevronOpen)}
        />
      </button>

      {open && (
        <div className={styles.list}>
          {conversations.length === 0 ? (
            <div className={styles.empty}>No conversations yet.</div>
          ) : (
            conversations.map((c) => {
              const active = c.id === currentConversationId;
              const time = relativeTime(c.started_at);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={cx(styles.item, active && styles.active)}
                  onClick={() => void loadMessages(c.id)}
                  title={`Load conversation ${c.id}`}
                  aria-pressed={active}
                >
                  <div className={styles.itemTop}>
                    <span className={styles.participants}>
                      {c.participants.length} participants
                    </span>
                    <span className={styles.count}>{c.message_count} msgs</span>
                  </div>
                  <span className={styles.time}>
                    <Clock size={12} className={styles.timeIcon} />
                    {time || c.state}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
=======
  if (sec < 60) return '刚刚';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

export interface ConversationHistoryProps {
  /** Optional title filter (case-insensitive). When omitted, shows all. */
  query?: string;
}

/**
 * Expanded, non-collapsible conversation list for the current agent.
 * Reads its slice from chatStore. Hovering an item reveals a 3-dot menu
 * with 重命名 / 删除 / 导出 actions.
 */
export function ConversationHistory({ query }: ConversationHistoryProps) {
  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const addToast = useUIStore((s) => s.addToast);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query?.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      (c.title ?? '新对话').toLowerCase().includes(q),
    );
  }, [conversations, query]);

  async function handleExport(convId: string, title: string) {
    try {
      const res = await apiClient.getConversationMessages(convId, 1000);
      const payload = {
        conversation_id: convId,
        title,
        exported_at: new Date().toISOString(),
        messages: res.messages,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${convId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({
        variant: 'success',
        title: '导出成功',
        description: '会话已导出为 JSON 文件。',
      });
    } catch (e) {
      addToast({
        variant: 'error',
        title: '导出失败',
        description: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteConversation(deleteTarget);
    setDeleteTarget(null);
    addToast({ variant: 'info', title: '已删除会话' });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {conversations.length === 0 ? '暂无会话' : '未匹配到会话'}
          </div>
        ) : (
          filtered.map((c) => {
            const active = c.id === currentConversationId;
            const time = relativeTime(c.started_at);
            const menuOpen = openMenuId === c.id;
            return (
              <div
                key={c.id}
                className={cx(styles.item, active && styles.active)}
              >
                <button
                  type="button"
                  className={styles.body}
                  onClick={() => void loadMessages(c.id)}
                  title={c.title ?? '新对话'}
                  aria-pressed={active}
                >
                  <span className={styles.title}>
                    {c.title ?? '新对话'}
                  </span>
                  <span className={styles.meta}>
                    <Clock size={12} className={styles.metaIcon} />
                    {time || c.state}
                    <span className={styles.dot}>·</span>
                    {c.message_count} 条
                  </span>
                </button>

                <button
                  type="button"
                  className={styles.menuBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(menuOpen ? null : c.id);
                  }}
                  aria-label="会话操作"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className={styles.backdrop}
                      onClick={() => setOpenMenuId(null)}
                      aria-hidden="true"
                    />
                    <div className={styles.menu} role="menu">
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuId(null);
                          addToast({
                            variant: 'info',
                            title: '重命名功能开发中',
                          });
                        }}
                      >
                        <Pencil size={14} className={styles.menuIcon} />
                        重命名
                      </button>
                      <button
                        type="button"
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuId(null);
                          void handleExport(c.id, c.title ?? '新对话');
                        }}
                      >
                        <Download size={14} className={styles.menuIcon} />
                        导出
                      </button>
                      <button
                        type="button"
                        className={cx(styles.menuItem, styles.menuItemDanger)}
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuId(null);
                          setDeleteTarget(c.id);
                        }}
                      >
                        <Trash2 size={14} className={styles.menuIcon} />
                        删除
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除会话?"
        danger
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              删除
            </Button>
          </>
        }
      >
        <p className={styles.modalBody}>
          删除后将无法恢复该会话及其所有消息。
        </p>
      </Modal>
>>>>>>> feat-implement-frontend-design-GH23Da
    </div>
  );
}

export default ConversationHistory;
