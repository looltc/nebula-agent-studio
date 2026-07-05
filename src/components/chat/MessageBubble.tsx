import { memo } from 'react';
import type { MessageInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import { formatTime } from '@/lib/datetime';
import { MarkdownText } from './MarkdownText';
import { TimelineView } from './TimelineView';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: MessageInfo;
  agentName?: string;
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

  // 历史消息的思考/工具事件（streaming=false → 全部折叠）
  const hasEvents = !isUser && message.events && message.events.length > 0;

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
        ) : hasEvents ? (
          // 有时间线事件时，正文也作为 text 事件穿插渲染
          <TimelineView events={message.events!} streaming={false} />
        ) : (
          // 无事件的历史消息：直接渲染 Markdown
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
