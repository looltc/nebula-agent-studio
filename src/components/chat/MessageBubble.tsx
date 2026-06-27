import { memo } from 'react';
import type { MessageInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import { MarkdownText } from './MarkdownText';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: MessageInfo;
  agentName?: string;
}

function formatTime(ts: string): string {
  try {
    // Backend stores UTC; normalise to ISO with explicit timezone if missing,
    // then render in Beijing time (Asia/Shanghai).
    const normalised = ts && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(ts) ? `${ts}Z` : ts;
    return new Date(normalised).toLocaleTimeString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function MessageBubbleBase({ message, agentName }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.content.startsWith('[Error:');
  const time = formatTime(message.ts);
  const metaSource =
    message.role === 'assistant'
      ? agentName ?? message.source
      : message.role === 'user'
        ? '你'
        : message.source;

  return (
    <div className={cx(styles.row, isUser ? styles.rowUser : styles.rowAgent)}>
      <div
        className={cx(
          styles.bubble,
          isUser ? styles.user : styles.assistant,
          isError && styles.error,
        )}
      >
        {isUser ? (
          // User messages stay as plain pre-wrapped text — users don't type
          // Markdown and we want newlines/indentation preserved verbatim.
          <div className={styles.text}>{message.content}</div>
        ) : (
          // Assistant messages are rendered as GitHub-flavoured Markdown with
          // syntax-highlighted code blocks.
          <MarkdownText content={message.content} />
        )}
      </div>
      <div className={styles.meta}>
        <span className={styles.metaSource}>{metaSource}</span>
        <span className={styles.metaDot} aria-hidden="true">·</span>
        <span className={styles.metaTime}>{time}</span>
      </div>
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleBase);
export default MessageBubble;
