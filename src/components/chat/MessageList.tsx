import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { cx } from '@/lib/cx';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import styles from './MessageList.module.css';

const SCROLL_THRESHOLD = 80;

/**
 * Scrollable message list. Auto-sticks to the bottom while the user is near it,
 * and yields a "jump to latest" button when they scroll up.
 */
export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const streamingEvents = useChatStore((s) => s.streamingEvents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const agents = useChatStore((s) => s.agents);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Defensive ascending sort by timestamp — the store already sorts loaded
  // messages, but locally appended messages must also stay ordered.
  const orderedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const ta = Date.parse(a.ts);
      const tb = Date.parse(b.ts);
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
      return 0;
    });
  }, [messages]);

  const agentName = useMemo(() => {
    const a = agents.find((x) => x.id === currentAgentId);
    return a?.name ?? currentAgentId ?? undefined;
  }, [agents, currentAgentId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distance < SCROLL_THRESHOLD);
  };

  // Auto-stick to bottom as new content arrives.
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [orderedMessages, streamingText, streaming, streamingEvents, autoScroll]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
  };

  return (
    <div className={styles.wrap}>
      <div
        ref={scrollRef}
        className={styles.scroll}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className={styles.list}>
          {orderedMessages.map((m) => (
            <MessageBubble key={m.id} message={m} agentName={agentName} />
          ))}
          {streaming && <StreamingMessage />}
        </div>
      </div>

      {!autoScroll && (
        <button
          type="button"
          className={cx(styles.jumpBtn)}
          onClick={scrollToBottom}
          aria-label="Jump to latest message"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}

export default MessageList;
