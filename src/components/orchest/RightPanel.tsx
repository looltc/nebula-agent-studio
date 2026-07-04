import { useState, useCallback } from 'react';
import { Play, Square, Activity, Clock, ArrowRight, History, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, EmptyState, StatusDot, TextArea, type StatusDotStatus } from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import type { Edge } from '@xyflow/react';
import type { NodeRun } from '@/types/api';
import NodeInspector from './NodeInspector';
import type { CanvasNodeData } from './CanvasNode';
import { cx } from '@/lib/cx';
import styles from './RightPanel.module.css';

export interface RightPanelProps {
  className?: string;
  /** 当前选中的节点 id（null = 无选中，显示编排图信息） */
  selectedNodeId: string | null;
  /** 选中节点的 data */
  selectedNodeData: CanvasNodeData | null;
  /** 选中节点的出边 */
  selectedOutgoingEdges: Edge[];
  /** 选中节点的最近运行记录 */
  selectedNodeRun: NodeRun | null;
  onUpdateNode: (data: Partial<CanvasNodeData>) => void;
  onDeleteNode: () => void;
  onUpdateEdgeCond: (edgeId: string, cond: string | null) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCloseInspector: () => void;
}

function runtimeToStatus(runtime: { is_running?: boolean; done?: boolean } | null): StatusDotStatus {
  if (!runtime) return 'idle';
  if (runtime.is_running) return 'active';
  return 'idle';
}

/**
 * 右侧共用面板（v6）。
 *
 * 设计：
 * - 无选中节点时：显示当前编排图信息（元信息 + 运行控制 + 运行历史）
 * - 有选中节点时：显示 NodeInspector（节点参数面板）
 * - 通过 selectedNodeId 切换
 */
export default function RightPanel({
  className,
  selectedNodeId,
  selectedNodeData,
  selectedOutgoingEdges,
  selectedNodeRun,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdgeCond,
  onDeleteEdge,
  onCloseInspector,
}: RightPanelProps) {
  const currentSpec = useOrchestStore((s) => s.currentSpec);
  const runtime = useOrchestStore((s) => s.runtime);
  const streaming = useOrchestStore((s) => s.orchestrationStreaming);
  const streamChunks = useOrchestStore((s) => s.streamChunks);
  const streamSpec = useOrchestStore((s) => s.streamSpec);
  const stopStream = useOrchestStore((s) => s.stopOrchestrationStream);
  const runs = useOrchestStore((s) => s.runs);
  const runsLoading = useOrchestStore((s) => s.runsLoading);
  const loadRuns = useOrchestStore((s) => s.loadRuns);
  const removeRun = useOrchestStore((s) => s.removeRun);

  const [task, setTask] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const specId = currentSpec?.id;
  const isRunning = runtime?.is_running ?? streaming;

  const handleRun = async () => {
    if (!specId) return;
    await streamSpec(specId, { task: task.trim(), max_iterations: 10 });
  };

  const handleStop = () => stopStream();

  const handleLoadHistory = useCallback(() => {
    if (specId) {
      setHistoryOpen(true);
      void loadRuns(specId, 20);
    }
  }, [specId, loadRuns]);

  // ---- 有选中节点 → 显示 NodeInspector ----
  if (selectedNodeId && selectedNodeData) {
    return (
      <div className={cx(styles.wrap, className)}>
        <NodeInspector
          nodeId={selectedNodeId}
          nodeData={selectedNodeData}
          outgoingEdges={selectedOutgoingEdges}
          nodeRun={selectedNodeRun}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onUpdateEdgeCond={onUpdateEdgeCond}
          onDeleteEdge={onDeleteEdge}
          onClose={onCloseInspector}
        />
      </div>
    );
  }

  // ---- 无选中节点 → 显示编排图信息 ----
  if (!currentSpec) {
    return (
      <div className={cx(styles.wrap, className)}>
        <EmptyState
          icon={<Activity size={24} />}
          title="未选择编排图"
          description="从左侧列表选择一个编排图以查看信息并执行。"
          className={styles.empty}
        />
      </div>
    );
  }

  const status = runtimeToStatus(runtime);
  const chunkEntries = Object.entries(streamChunks);

  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.scrollBody}>
        {/* ---- 编排图元信息 ---- */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <Activity size={12} className={styles.sectionIcon} />
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
          </dl>
        </div>

        {/* ---- 运行时状态 ---- */}
        {runtime && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <Activity size={12} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>运行时</span>
              <StatusDot status={status} className={styles.statusDot} />
            </div>
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <dt>状态</dt>
                <dd>{runtime.is_running ? '运行中' : runtime.done ? '已完成' : '空闲'}</dd>
              </div>
              {runtime.current_agent && (
                <div className={styles.metaRow}>
                  <dt>当前节点</dt>
                  <dd className={styles.mono}>{runtime.current_agent}</dd>
                </div>
              )}
              <div className={styles.metaRow}>
                <dt>迭代</dt>
                <dd>{runtime.iteration} / {runtime.max_iterations}</dd>
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
            </dl>
          </div>
        )}

        {/* ---- 执行控制 ---- */}
        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <Play size={12} className={styles.sectionIcon} />
            <span className={styles.sectionTitle}>执行</span>
          </div>
          <TextArea
            className={styles.taskInput}
            placeholder="输入任务描述（若编排图已有输入文本节点，此处可留空）…"
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
              onClick={handleRun}
              disabled={isRunning}
              title="运行：SSE 流式执行，实时输出每个节点的结果到画布卡片"
            >
              运行
            </Button>
            {streaming && (
              <Button variant="outline" size="sm" icon={<Square size={12} />} onClick={handleStop}>
                停止
              </Button>
            )}
          </div>
          <div className={styles.executeHint}>
            点击「运行」以 SSE 流式执行编排图，每个节点的输出会实时推送到画布卡片预览。
          </div>
        </div>

        {/* ---- 流式输出 ---- */}
        {chunkEntries.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <Clock size={12} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>流式输出</span>
            </div>
            <div className={styles.streamList}>
              {chunkEntries.map(([nodeId, content]) => (
                <div key={nodeId} className={styles.streamItem}>
                  <div className={styles.streamNodeHead}>
                    <span className={styles.streamNodeId}>{nodeId}</span>
                  </div>
                  <pre className={styles.streamContent}>{content || '（空）'}</pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- 最终输出 ---- */}
        {runtime?.output && !streaming && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <Activity size={12} className={styles.sectionIcon} />
              <span className={styles.sectionTitle}>最终输出</span>
            </div>
            <pre className={styles.output}>{runtime.output}</pre>
          </div>
        )}

        {/* ---- 运行历史 ---- */}
        <div className={styles.section}>
          <button
            type="button"
            className={styles.historyToggle}
            onClick={() => (historyOpen ? setHistoryOpen(false) : handleLoadHistory())}
          >
            <History size={12} />
            <span className={styles.sectionTitle}>运行历史</span>
            {historyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {historyOpen && (
            <div className={styles.runList}>
              {runsLoading ? (
                <div className={styles.runEmpty}>加载中…</div>
              ) : runs.length === 0 ? (
                <div className={styles.runEmpty}>暂无运行记录</div>
              ) : (
                runs.map((run) => (
                  <div key={run.id} className={styles.runItem}>
                    <div className={styles.runItemHead}>
                      <span className={styles.runStatusDot} data-status={run.status} />
                      <span className={styles.runStatusText}>
                        {run.status === 'success' ? '成功' : run.status === 'failed' ? '失败' : run.status === 'running' ? '运行中' : '已停止'}
                      </span>
                      {run.duration_ms != null && (
                        <span className={styles.runDuration}>{run.duration_ms}ms</span>
                      )}
                      <button
                        type="button"
                        className={styles.runDelete}
                        title="删除"
                        onClick={() => removeRun(run.id)}
                      >
                        <Trash2 size={9} />
                      </button>
                    </div>
                    {run.started_at && (
                      <div className={styles.runTime}>
                        {new Date(run.started_at).toLocaleString('zh-CN')}
                      </div>
                    )}
                    {run.error && <div className={styles.runError}>{run.error}</div>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
