import { memo, useEffect, useRef, useState } from 'react';
import { ChevronRight, MessageSquare } from 'lucide-react';
import type { GroupMessage, Participant, TimelineEvent } from '@/types/api';
import { cx } from '@/lib/cx';
import { resolveAvatarSrc } from '@/lib/avatar';
import { speakerStyle } from '@/lib/speakerColor';
import { Avatar, Badge } from '@/components/ui';
import { MarkdownText } from '@/components/chat/MarkdownText';
import { ToolCallBlock } from '@/components/chat/ToolCallBlock';
import type { StreamingTool } from '@/stores/chatStore';
import styles from './GroupMessageBubble.module.css';

export interface GroupMessageBubbleProps {
  message: GroupMessage;
  isMe: boolean;
  participants: Participant[];
  agents: { id: string; name: string; avatar?: string | null }[];
}

/** 思考/工具事件计数 */
function countEvents(events: TimelineEvent[]): { steps: number; tools: number } {
  let steps = 0;
  let tools = 0;
  for (const e of events) {
    if (e.kind === 'thinking') steps++;
    else if (e.kind === 'tool') tools++;
  }
  return { steps, tools };
}

function formatTime(ts: string): string {
  try {
    const normalised = ts && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(ts) ? `${ts}Z` : ts;
    return new Date(normalised).toLocaleTimeString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour12: false,
    });
  } catch {
    return '';
  }
}

function GroupMessageBubbleBase({
  message,
  isMe,
  participants,
  agents,
}: GroupMessageBubbleProps) {
  const senderP = participants.find((p) => p.id === message.source);
  const agentInfo = agents.find((a) => a.id === message.source);
  const name =
    message.metadata.sender_name || senderP?.name || agentInfo?.name || message.source;
  const isHuman = message.source.startsWith('human:') || senderP?.kind === 'human';
  const avatarSrc = resolveAvatarSrc(agentInfo?.avatar);
  const time = formatTime(message.ts);
  const isClosing = message.metadata?.is_closing === true;

  return (
    <div
      className={cx(styles.bubble, isMe && styles.bubbleMe)}
      style={speakerStyle(message.source)}
      data-msg-id={message.id}
      data-source={message.source}
    >
      <Avatar name={name} size="sm" src={avatarSrc} />
      <div className={styles.content}>
        <div className={styles.head}>
          <span className={styles.name}>{name}</span>
          {isHuman && <Badge variant="default">用户</Badge>}
          {!isHuman && senderP && <Badge variant="success">{senderP.role}</Badge>}
          {message.addressing.mode !== 'broadcast' && (
            <Badge variant="warning">
              {message.addressing.mode}
              {message.addressing.targets.length > 0 &&
                ` → ${message.addressing.targets.join(', ')}`}
            </Badge>
          )}
          {isClosing && <Badge variant="default">无需回复</Badge>}
          {time && <span className={styles.time}>{time}</span>}
        </div>
        <div className={styles.text}>
          {isHuman ? (
            message.content
          ) : (
            <MarkdownText content={message.content} />
          )}
        </div>
      </div>
    </div>
  );
}

export const GroupMessageBubble = memo(GroupMessageBubbleBase);

export interface StreamingBubbleProps {
  agentId: string;
  reply: { text: string; events: TimelineEvent[] };
  agents: { id: string; name: string; avatar?: string | null }[];
  onDone?: () => void;
}

/**
 * 流式回复气泡：思考/工具事件视窗在上方，文本在下方。
 * - 活跃中：事件视窗固定高度滚动，自动滚到底部
 * - 结束后：自动折叠为「💭 思考过程（N 步 · M 工具）」可点击展开
 */
export function StreamingBubble({ agentId, reply, agents }: StreamingBubbleProps) {
  const agentInfo = agents.find((a) => a.id === agentId);
  const name = agentInfo?.name ?? agentId;
  const avatarSrc = resolveAvatarSrc(agentInfo?.avatar);
  const hasEvents = reply.events.length > 0;
  const hasText = reply.text.length > 0;
  const { steps, tools } = countEvents(reply.events);

  return (
    <div className={cx(styles.bubble, styles.streaming)} style={speakerStyle(agentId)}>
      <Avatar name={name} size="sm" src={avatarSrc} />
      <div className={styles.content}>
        <div className={styles.head}>
          <span className={styles.name}>{name}</span>
          <Badge variant="success">思考中</Badge>
        </div>
        {hasEvents && (
          <ThinkingViewport events={reply.events} steps={steps} tools={tools} active />
        )}
        {hasText && (
          <div className={cx(styles.text, styles.streamingText)}>
            <MarkdownText content={reply.text} streaming />
            <span className={styles.cursor}>▌</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ThinkingViewportProps {
  events: TimelineEvent[];
  steps: number;
  tools: number;
  active: boolean;
}

/**
 * 思考视窗：活跃时固定高度滚动，结束后折叠。
 */
function ThinkingViewport({ events, steps, tools, active }: ThinkingViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // 活跃时自动滚到底部
  useEffect(() => {
    if (active && !collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, active, collapsed]);

  // 活跃结束（active false）时自动折叠
  useEffect(() => {
    if (!active) {
      setCollapsed(true);
    }
  }, [active]);

  if (collapsed) {
    return (
      <button
        type="button"
        className={styles.collapsedBar}
        onClick={() => setCollapsed(false)}
      >
        <MessageSquare size={11} aria-hidden="true" />
        <span>思考过程（{steps} 步 · {tools} 工具）</span>
        <ChevronRight size={11} className={styles.chevronRight} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className={styles.viewport}>
      <div className={styles.viewportHeader}>
        <span className={styles.viewportTitle}>思考过程</span>
        {!active && (
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => setCollapsed(true)}
            aria-label="收起"
          >
            <ChevronRight size={11} className={styles.chevronDown} aria-hidden="true" />
          </button>
        )}
      </div>
      <div ref={scrollRef} className={styles.viewportBody}>
        <ThinkingEventsList events={events} active={active} />
      </div>
    </div>
  );
}

function ThinkingEventsList({ events, active }: { events: TimelineEvent[]; active: boolean }) {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const lastIndex = sorted.length - 1;
  return (
    <>
      {sorted.map((ev, i) => {
        const isLast = i === lastIndex;
        if (ev.kind === 'thinking') {
          return (
            <ThinkingLine
              key={`t-${ev.seq}`}
              step={ev.step}
              content={ev.content}
              autoOpen={active && isLast}
            />
          );
        }
        if (ev.kind === 'tool') {
          const tool: StreamingTool = {
            id: ev.id,
            tool: ev.tool,
            args: ev.args,
            status: ev.status,
            result: ev.result,
            error: ev.error,
          };
          return (
            <ToolCallBlock
              key={`tool-${ev.seq}`}
              tool={tool}
              autoOpen={active && isLast}
            />
          );
        }
        return null;
      })}
    </>
  );
}

function ThinkingLine({
  step,
  content,
  autoOpen,
}: {
  step: string;
  content: string;
  autoOpen: boolean;
}) {
  const [userToggled, setUserToggled] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const prevAutoOpen = useRef(autoOpen);

  useEffect(() => {
    if (prevAutoOpen.current && !autoOpen && !userToggled) {
      setUserOpen(false);
    }
    prevAutoOpen.current = autoOpen;
  }, [autoOpen, userToggled]);

  const isOpen = userToggled ? userOpen : autoOpen;

  return (
    <details
      className={styles.thinkingLine}
      open={isOpen}
      onToggle={(e) => {
        if (userToggled) return;
        setUserToggled(true);
        setUserOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className={styles.thinkingSummary}>
        <ChevronRight size={11} className={styles.chevronRight} aria-hidden="true" />
        <span className={styles.thinkingLabel}>{step || '思考'}</span>
      </summary>
      <div className={styles.thinkingContent}>{content}</div>
    </details>
  );
}

export default GroupMessageBubble;
