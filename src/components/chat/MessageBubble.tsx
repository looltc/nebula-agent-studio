import { memo } from 'react';
import type { MessageInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: MessageInfo;
  agentName?: string;
}

interface ContentSegment {
  type: 'text' | 'code';
  lang?: string;
  content: string;
}

/**
 * Splits message content into text runs and fenced code blocks.
 * Recognises ```lang\n...\n``` fences.
 */
function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const regex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    const body = match[2] ?? '';
    segments.push({
      type: 'code',
      lang: match[1] || undefined,
      content: body.replace(/\n$/, ''),
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: 'text', content }];
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
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
  const segments = parseContent(message.content);

  return (
    <div className={cx(styles.row, isUser ? styles.rowUser : styles.rowAgent)}>
      <div
        className={cx(
          styles.bubble,
          isUser ? styles.user : styles.assistant,
          isError && styles.error,
        )}
      >
        {segments.map((seg, i) =>
          seg.type === 'code' ? (
            <pre key={i} className={styles.code} data-lang={seg.lang || ''}>
              {seg.lang && <code className={styles.codeLang}>{seg.lang}</code>}
              <code className={styles.codeBody}>{seg.content}</code>
            </pre>
          ) : (
            <div key={i} className={styles.text}>
              {seg.content}
            </div>
          ),
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
