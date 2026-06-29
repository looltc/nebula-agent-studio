import { useChatStore } from '@/stores/chatStore';
import { Spinner } from '@/components/ui';
import { TimelineView } from './TimelineView';
import styles from './StreamingMessage.module.css';

/**
 * In-progress assistant message: streaming text rendered as Markdown with a
 * blinking cursor, plus a timeline of thinking steps and tool-call cards
 * rendered in arrival order (via TimelineView).
 *
 * 思考/工具事件与正文片段按到达顺序穿插输出（TimelineView 内统一渲染）。
 * 进行中的步骤自动展开，当前步骤完成后自动折叠。
 */
export function StreamingMessage() {
  const streamingEvents = useChatStore((s) => s.streamingEvents);
  const streamingText = useChatStore((s) => s.streamingText);
  const currentAgentId = useChatStore((s) => s.currentAgentId);

  const isEmpty = streamingText.length === 0 && streamingEvents.length === 0;

  return (
    <div className={styles.row}>
      <div className={styles.bubble}>
        {isEmpty ? (
          <div className={styles.thinking}>
            <Spinner size="sm" />
            <span>思考中…</span>
          </div>
        ) : (
          <TimelineView events={streamingEvents} streaming />
        )}
      </div>

      <div className={styles.meta}>
        <span className={styles.metaAgent}>{currentAgentId ?? 'assistant'}</span>
        <span className={styles.metaDot} aria-hidden="true">·</span>
        <span className={styles.metaStatus}>流式中…</span>
      </div>
    </div>
  );
}

export default StreamingMessage;
