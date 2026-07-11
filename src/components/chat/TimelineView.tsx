import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { TimelineEvent } from '@/types/api';
import { ToolCallBlock } from './ToolCallBlock';
import type { StreamingTool } from '@/stores/chatStore';
import { MarkdownText } from './MarkdownText';
import styles from './TimelineView.module.css';

export interface TimelineViewProps {
  events: TimelineEvent[];
  /**
   * 是否处于流式进行中。
   * - true: 当前活跃步骤展开（thinking/tool 的最后一项）
   * - false: 全部折叠（已完成的历史消息）
   */
  streaming: boolean;
}

/**
 * 思考步骤名的中文化映射。
 *
 * 后端通过 stream_thinking 事件发送的 step 值：
 * - "reasoning"：ReAct/推理模型的 reasoning_content（DeepSeek-R1 / Qwen 等）
 * - "plan" / "replan"：PlanExecute 的规划/重规划节点
 * - "evaluator" / "reflector"：Reflexion 的评估/反思节点
 *
 * 前端展示时映射为中文友好文案，未知 step 原样显示。
 */
const STEP_LABELS: Record<string, string> = {
  reasoning: '思考',
  react: '推理过程',
  plan: '规划',
  replan: '重新规划',
  evaluator: '评估',
  reflector: '反思',
};

function stepLabel(step: string): string {
  return STEP_LABELS[step] || step || '思考';
}

/**
 * 思考过程、工具调用、正文片段的统一时间线视图。
 *
 * 渲染规则：
 * - 事件按 seq 升序排列，思考/工具与正文穿插输出
 * - text 事件：直接渲染为 Markdown 正文
 * - thinking 事件：折叠行（› 符号），流式时当前活跃项展开，被后续事件取代后自动折叠
 * - tool 事件：整体作为折叠卡片（与 thinking 一致的 › 符号交互），
 *   流式时当前活跃项展开，被后续事件取代后自动折叠；内部参数/结果始终展开
 *
 * 折叠时机（"当前步骤完了就折叠自己"）：
 * - thinking: 当它不再是最后一个事件时（后续事件到达），自动折叠
 * - tool: 当它不再是最后一个事件时（后续事件到达），自动折叠
 * - 用户手动展开/折叠后，不再受自动控制
 */
export function TimelineView({ events, streaming }: TimelineViewProps) {
  if (events.length === 0) return null;

  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  const lastIndex = sorted.length - 1;

  return (
    <div className={styles.timeline}>
      {sorted.map((ev, i) => {
        const isLast = i === lastIndex;
        if (ev.kind === 'text') {
          const showCursor = streaming && isLast;
          return (
            <div key={`text-${ev.seq}`} className={styles.textSegment}>
              <MarkdownText content={ev.content} streaming={streaming && isLast} />
              {showCursor && <span className={styles.cursor} aria-hidden="true">▋</span>}
            </div>
          );
        }
        if (ev.kind === 'thinking') {
          // 流式中且是最后一项时展开；非最后一项或非流式时折叠
          const autoOpen = streaming && isLast;
          return (
            <ThinkingItem
              key={`t-${ev.seq}`}
              step={stepLabel(ev.step)}
              content={ev.content}
              autoOpen={autoOpen}
            />
          );
        }
        // tool：与 thinking 一致的折叠交互（autoOpen 由 streaming && isLast 控制）
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
            autoOpen={streaming && isLast}
          />
        );
      })}
    </div>
  );
}

interface ThinkingItemProps {
  step: string;
  content: string;
  /** 自动展开（流式中且为当前活跃步骤时为 true） */
  autoOpen: boolean;
}

/**
 * 单个思考步骤，轻量折叠行。
 *
 * "当前步骤完了就折叠自己"：
 * - autoOpen=true 时展开（它是当前活跃步骤）
 * - autoOpen 变为 false（后续事件到达，它不再是最后一步）时自动折叠
 * - 用户手动操作后接管，不再受 autoOpen 控制
 */
function ThinkingItem({ step, content, autoOpen }: ThinkingItemProps) {
  const [userToggled, setUserToggled] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const prevAutoOpen = useRef(autoOpen);

  // autoOpen 从 true→false 时自动折叠（除非用户已手动操作）
  useEffect(() => {
    if (prevAutoOpen.current && !autoOpen && !userToggled) {
      setUserOpen(false);
    }
    prevAutoOpen.current = autoOpen;
  }, [autoOpen, userToggled]);

  const isOpen = userToggled ? userOpen : autoOpen;

  return (
    <details
      className={styles.thinkingItem}
      open={isOpen}
      onToggle={(e) => {
        if (userToggled) return;
        setUserToggled(true);
        setUserOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className={styles.thinkingSummary}>
        <ChevronRight
          size={12}
          className={styles.chevron}
          aria-hidden="true"
        />
        <span className={styles.thinkingLabel}>{step || '思考'}</span>
      </summary>
      <div className={styles.thinkingContent}>{content}</div>
    </details>
  );
}

export default TimelineView;
