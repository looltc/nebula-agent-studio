import { useState } from 'react';
import { ChevronDown, MessageCircleMore, Clock } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cx } from '@/lib/cx';
import styles from './ConversationHistory.module.css';

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
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
    </div>
  );
}

export default ConversationHistory;
