import { useChatStore } from '@/stores/chatStore';
import { Spinner } from '@/components/ui';
import { ToolCallBlock } from './ToolCallBlock';
import { MarkdownText } from './MarkdownText';
import styles from './StreamingMessage.module.css';

/**
 * In-progress assistant message: streaming text rendered as Markdown with a
 * blinking cursor, collapsible thinking steps, and tool-call cards.
 */
export function StreamingMessage() {
  const streamingText = useChatStore((s) => s.streamingText);
  const streamingThinking = useChatStore((s) => s.streamingThinking);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const currentAgentId = useChatStore((s) => s.currentAgentId);

  const isEmpty = streamingText.length === 0;

  return (
    <div className={styles.row}>
      <div className={styles.bubble}>
        {isEmpty ? (
          <div className={styles.thinking}>
            <Spinner size="sm" />
            <span>Thinking…</span>
          </div>
        ) : (
          <div className={styles.text}>
            <MarkdownText content={streamingText} streaming />
            <span className={styles.cursor} aria-hidden="true">▋</span>
          </div>
        )}

        {streamingThinking.length > 0 && (
          <div className={styles.thinkingList}>
            {streamingThinking.map((step, i) => {
              const isLast = i === streamingThinking.length - 1;
              return (
                <details
                  key={`${step.step}-${i}`}
                  className={styles.thinkingItem}
                  open={isLast}
                >
                  <summary className={styles.thinkingSummary}>
                    <span className={styles.thinkingLabel}>Thinking</span>
                    <span className={styles.thinkingStep}>{step.step}</span>
                  </summary>
                  <div className={styles.thinkingContent}>{step.content}</div>
                </details>
              );
            })}
          </div>
        )}

        {streamingTools.length > 0 && (
          <div className={styles.tools}>
            {streamingTools.map((t) => (
              <ToolCallBlock key={t.id} tool={t} />
            ))}
          </div>
        )}
      </div>

      <div className={styles.meta}>
        <span className={styles.metaAgent}>{currentAgentId ?? 'assistant'}</span>
        <span className={styles.metaDot} aria-hidden="true">·</span>
        <span className={styles.metaStatus}>streaming…</span>
      </div>
    </div>
  );
}

export default StreamingMessage;
