import { useState } from 'react';
import { Play, Square, Activity, Cpu, Clock, ArrowRight, Eye } from 'lucide-react';
import { Button, EmptyState, StatusDot, type StatusDotStatus } from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import { cx } from '@/lib/cx';
import styles from './RuntimePanel.module.css';

export interface RuntimePanelProps {
  className?: string;
}

function runtimeToStatus(runtime: { is_running?: boolean; done?: boolean } | null): StatusDotStatus {
  if (!runtime) return 'idle';
  if (runtime.is_running) return 'active';
  if (runtime.done) return 'idle';
  return 'idle';
}

/**
 * 运行时面板（右侧浮动栏）。
 *
 * 显示：
 * - 当前 spec 元信息（名称 / 是否激活 / 节点数 / 边数 / 入口）
 * - 运行时状态（运行中 / 当前节点 / 迭代 / 移交）
 * - 执行控制（同步执行 / 流式执行 / 停止）
 * - 流式输出（按节点累积）
 * - 最终输出
 */
export default function RuntimePanel({ className }: RuntimePanelProps) {
  const currentSpec = useOrchestStore((s) => s.currentSpec);
  const runtime = useOrchestStore((s) => s.runtime);
  const invoking = useOrchestStore((s) => s.invoking);
  const streaming = useOrchestStore((s) => s.orchestrationStreaming);
  const streamChunks = useOrchestStore((s) => s.streamChunks);
  const invokeSpec = useOrchestStore((s) => s.invokeSpec);
  const streamSpec = useOrchestStore((s) => s.streamSpec);
  const stopStream = useOrchestStore((s) => s.stopOrchestrationStream);

  const [task, setTask] = useState('');

  const specId = currentSpec?.id;
  const isRunning = runtime?.is_running ?? invoking ?? streaming;

  const handleInvoke = async () => {
    if (!specId || !task.trim()) return;
    await invokeSpec(specId, { task: task.trim(), max_iterations: 10 });
  };

  const handleStream = async () => {
    if (!specId || !task.trim()) return;
    await streamSpec(specId, { task: task.trim(), max_iterations: 10 });
  };

  const handleStop = () => {
    stopStream();
  };

  if (!currentSpec) {
    return (
      <div className={cx(styles.wrap, className)}>
        <EmptyState
          icon={<Activity size={24} />}
          title="未选择编排图"
          description="从列表选择一个编排图以查看运行时状态并执行。"
          className={styles.empty}
        />
      </div>
    );
  }

  const status = runtimeToStatus(runtime);
  const chunkEntries = Object.entries(streamChunks);

  return (
    <div className={cx(styles.wrap, className)}>
      {/* 当前编排图元信息 */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <Cpu size={12} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>当前编排图</span>
        </div>
        <dl className={styles.meta}>
          <div className={styles.metaRow}>
            <dt>名称</dt>
            <dd>{currentSpec.name}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>激活</dt>
            <dd>{currentSpec.is_active ? '是' : '否'}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>节点数</dt>
            <dd>{currentSpec.spec.nodes.length}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>边数</dt>
            <dd>{currentSpec.spec.edges.length}</dd>
          </div>
          {/* 入口节点：从 start 节点推导（新版 GraphSpec 不再有顶层 entry_point） */}
          <div className={styles.metaRow}>
            <dt>入口</dt>
            <dd className={styles.mono}>
              {currentSpec.spec.nodes.find((n) => n.type === 'start')?.id ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* 运行时状态 */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <Activity size={12} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>运行时</span>
          <StatusDot status={status} className={styles.statusDot} />
        </div>
        {runtime ? (
          <dl className={styles.meta}>
            <div className={styles.metaRow}>
              <dt>状态</dt>
              <dd>
                {runtime.is_running ? '运行中' : runtime.done ? '已完成' : '空闲'}
              </dd>
            </div>
            {runtime.current_agent && (
              <div className={styles.metaRow}>
                <dt>当前节点</dt>
                <dd className={styles.mono}>{runtime.current_agent}</dd>
              </div>
            )}
            <div className={styles.metaRow}>
              <dt>迭代</dt>
              <dd>
                {runtime.iteration} / {runtime.max_iterations}
              </dd>
            </div>
            {runtime.handoff_to && (
              <div className={styles.metaRow}>
                <dt>移交</dt>
                <dd className={styles.mono}>
                  <ArrowRight size={10} className={styles.handoffIcon} />
                  {runtime.handoff_to}
                </dd>
              </div>
            )}
            {runtime.trace_id && (
              <div className={styles.metaRow}>
                <dt>追踪</dt>
                <dd className={styles.mono}>{runtime.trace_id.slice(0, 12)}…</dd>
              </div>
            )}
          </dl>
        ) : (
          <div className={styles.emptyText}>暂无运行时数据。</div>
        )}
      </div>

      {/* 执行控制 */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <Play size={12} className={styles.sectionIcon} />
          <span className={styles.sectionTitle}>执行</span>
        </div>
        <textarea
          className={styles.taskInput}
          placeholder="输入编排图执行任务…"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={3}
          disabled={isRunning}
        />
        <div className={styles.executeActions}>
          <Button
            variant="primary"
            size="sm"
            icon={<Play size={12} />}
            onClick={handleInvoke}
            disabled={!task.trim() || isRunning}
          >
            同步执行
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Play size={12} />}
            onClick={handleStream}
            disabled={!task.trim() || isRunning}
          >
            流式执行
          </Button>
          {streaming && (
            <Button
              variant="outline"
              size="sm"
              icon={<Square size={12} />}
              onClick={handleStop}
            >
              停止
            </Button>
          )}
        </div>
      </div>

      {/* 流式输出 */}
      {chunkEntries.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <Eye size={12} className={styles.sectionIcon} />
            <span className={styles.sectionTitle}>流式输出</span>
          </div>
          <div className={styles.streamList}>
            {chunkEntries.map(([nodeId, content]) => (
              <div key={nodeId} className={styles.streamItem}>
                <div className={styles.streamNodeHead}>
                  <Clock size={10} className={styles.streamIcon} />
                  <span className={styles.streamNodeId}>{nodeId}</span>
                </div>
                <pre className={styles.streamContent}>{content || '（空）'}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最终输出 */}
      {runtime?.output && !streaming && (
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <Activity size={12} className={styles.sectionIcon} />
            <span className={styles.sectionTitle}>最终输出</span>
          </div>
          <pre className={styles.output}>{runtime.output}</pre>
        </div>
      )}
    </div>
  );
}
