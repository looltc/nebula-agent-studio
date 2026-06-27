import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { cx } from '@/lib/cx';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { HITLApproval } from './HITLApproval';
import styles from './MessageList.module.css';

const DANGEROUS_HINTS = ['write', 'execute', 'delete'];
const SCROLL_THRESHOLD = 80;

function isDangerousTool(name: string): boolean {
  const lower = name.toLowerCase();
  return DANGEROUS_HINTS.some((h) => lower.includes(h));
}

/**
 * Scrollable message list. Auto-sticks to the bottom while the user is near it,
 * and yields a "jump to latest" button when they scroll up.
 * Renders an inline HITL approval card when a dangerous tool is mid-flight.
 */
export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const streamingText = useChatStore((s) => s.streamingText);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const agents = useChatStore((s) => s.agents);
  const onStreamToolEnd = useChatStore((s) => s.onStreamToolEnd);
  const addToast = useUIStore((s) => s.addToast);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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
  }, [messages, streamingText, streaming, streamingTools, autoScroll]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
  };

  const hitlTool = streamingTools.find(
    (t) => t.status === 'loading' && isDangerousTool(t.tool),
  );

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
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} agentName={agentName} />
          ))}
          {streaming && <StreamingMessage />}
          {hitlTool && (
            <HITLApproval
              agentId={currentAgentId ?? 'agent'}
              tool={hitlTool.tool}
              args={hitlTool.args}
              onApprove={() => {
                if (!hitlTool) return;
                onStreamToolEnd(hitlTool.tool, { approved: true, by: 'human' });
                addToast({
                  variant: 'success',
                  title: 'Approved',
                  description: `${hitlTool.tool} was approved.`,
                });
              }}
              onReject={() => {
                if (!hitlTool) return;
                onStreamToolEnd(hitlTool.tool, { rejected: true, by: 'human' });
                addToast({
                  variant: 'warning',
                  title: 'Rejected',
                  description: `${hitlTool.tool} was rejected.`,
                });
              }}
            />
          )}
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
