import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Network,
  GitBranch,
  Pencil,
  Eye,
  PanelRight,
  List,
  Boxes,
  Save,
  Rocket,
} from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { ErrorBoundary } from '@/components/layout';
import { Tabs, Button, type TabItem } from '@/components/ui';
import {
  InfiniteCanvasEditor,
  CompiledGraphPreview,
  SpecListPanel,
  RightPanel,
  TopologyView,
  RelationGraphView,
  NodePalette,
  type CreateNodeFn,
  type NodeOps,
  type SelectionSnapshot,
  type CanvasNodeData,
} from '@/components/orchest';
import { useOrchestStore } from '@/stores/orchestStore';
import { useAgentStore } from '@/stores/agentStore';
import { apiClient } from '@/services/api';
import type { GraphSpec, GraphNodeType, NodePosition, NodeRun } from '@/types/api';
import styles from './OrchestrationPage.module.css';

type MainTab = 'editor' | 'preview' | 'topology' | 'relations';
type LeftTab = 'specs' | 'palette';

const MAIN_TABS: TabItem[] = [
  { key: 'editor', label: '编辑器', icon: <Pencil size={14} /> },
  { key: 'preview', label: '编译预览', icon: <Eye size={14} /> },
  { key: 'topology', label: '拓扑视图', icon: <Network size={14} /> },
  { key: 'relations', label: '关系图', icon: <GitBranch size={14} /> },
];

const LEFT_TABS: TabItem[] = [
  { key: 'specs', label: '编排图', icon: <List size={13} /> },
  { key: 'palette', label: '节点', icon: <Boxes size={13} /> },
];

/** debounce 500ms 保存 spec + positions */
function useDebouncedSave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSpec = useOrchestStore((s) => s.saveSpec);

  return useCallback(
    (id: string, spec: GraphSpec, positions: Record<string, NodePosition>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void saveSpec(id, { spec, positions });
      }, 500);
    },
    [saveSpec],
  );
}

/**
 * OrchestrationPage：编排图编辑器主入口（v6）。
 *
 * v6 布局：
 * - 画布充满整个区域
 * - 左侧面板：Tab 切换「编排图列表 / 节点工具栏」，折叠按钮在面板内部
 * - 右侧共用面板：RightPanel（无选中→编排图信息，有选中→节点参数面板）
 * - 顶部浮动工具栏：Tab 切换 + 保存/发布按钮
 * - 选中状态由本组件持有，画布通过回调通知
 */
export default function OrchestrationPage() {
  const currentSpec = useOrchestStore((s) => s.currentSpec);
  const compiledView = useOrchestStore((s) => s.compiledView);
  const compiling = useOrchestStore((s) => s.compiling);
  const compileErrors = useOrchestStore((s) => s.compileErrors);
  const runtime = useOrchestStore((s) => s.runtime);
  const world = useOrchestStore((s) => s.world);
  const relations = useOrchestStore((s) => s.relations);
  const lastRunId = useOrchestStore((s) => s.lastRunId);

  const loadSpecs = useOrchestStore((s) => s.loadSpecs);
  const loadWorld = useOrchestStore((s) => s.loadWorld);
  const loadRelations = useOrchestStore((s) => s.loadRelations);
  const loadRouters = useOrchestStore((s) => s.loadRouters);
  const loadNodeTypes = useOrchestStore((s) => s.loadNodeTypes);
  const loadAgents = useAgentStore((s) => s.loadAgents);
  const saveSpec = useOrchestStore((s) => s.saveSpec);
  const activateSpec = useOrchestStore((s) => s.activateSpec);

  const [tab, setTab] = useState<MainTab>('editor');
  // 左侧面板：Tab 切换 + 折叠
  const [leftTab, setLeftTab] = useState<LeftTab>('specs');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const debouncedSave = useDebouncedSave();

  // InfiniteCanvasEditor 注册的创建节点函数
  const [createNodeFn, setCreateNodeFn] = useState<CreateNodeFn | null>(null);
  // InfiniteCanvasEditor 注册的节点操作 API
  const [nodeOps, setNodeOps] = useState<NodeOps | null>(null);
  // 当前选中节点 id（null = 无选中，RightPanel 显示编排图信息）
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  // 选中节点快照（nodeData + outgoingEdges）
  const [selectionSnapshot, setSelectionSnapshot] = useState<SelectionSnapshot | null>(null);
  // 选中节点的运行记录（从 lastRunId 加载）
  const [selectedNodeRun, setSelectedNodeRun] = useState<NodeRun | null>(null);
  // 保存/发布中状态
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    void loadSpecs();
    void loadAgents();
    void loadWorld();
    void loadRelations();
    void loadRouters();
    void loadNodeTypes();
  }, [loadSpecs, loadAgents, loadWorld, loadRelations, loadRouters, loadNodeTypes]);

  // 切换编排图时清空选中状态
  useEffect(() => {
    setSelectedNodeId(null);
    setSelectionSnapshot(null);
    setSelectedNodeRun(null);
  }, [currentSpec?.id]);

  // 选中节点 + lastRunId 变化时加载该节点的运行记录
  useEffect(() => {
    if (!selectedNodeId || !lastRunId) {
      setSelectedNodeRun(null);
      return;
    }
    let cancelled = false;
    void apiClient.getNodeRun(lastRunId, selectedNodeId).then((run) => {
      if (!cancelled) setSelectedNodeRun(run);
    }).catch(() => {
      if (!cancelled) setSelectedNodeRun(null);
    });
    return () => { cancelled = true; };
  }, [selectedNodeId, lastRunId]);

  const handleCanvasChange = useCallback(
    (spec: GraphSpec, positions: Record<string, NodePosition>) => {
      if (!currentSpec) return;
      debouncedSave(currentSpec.id, spec, positions);
    },
    [currentSpec, debouncedSave],
  );

  // NodePalette 点击创建节点（通过 InfiniteCanvasEditor 注册的函数）
  const handleCreateNode = useCallback(
    (type: GraphNodeType, presetConfig?: Record<string, unknown>, defaultLabel?: string) => {
      createNodeFn?.(type, presetConfig, defaultLabel);
    },
    [createNodeFn],
  );

  // 选中节点变化 → 更新 selectedNodeId
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (!nodeId) setSelectionSnapshot(null);
  }, []);

  // 选中节点快照变化 → 更新 snapshot state
  const handleSelectionSnapshot = useCallback((snapshot: SelectionSnapshot | null) => {
    setSelectionSnapshot(snapshot);
  }, []);

  // ---- RightPanel 的节点操作回调（通过 nodeOps 转发到画布） ----
  const handleUpdateNode = useCallback(
    (data: Partial<CanvasNodeData>) => {
      if (selectedNodeId && nodeOps) nodeOps.updateNode(selectedNodeId, data);
    },
    [selectedNodeId, nodeOps],
  );

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId && nodeOps) nodeOps.deleteNode(selectedNodeId);
  }, [selectedNodeId, nodeOps]);

  const handleUpdateEdgeCond = useCallback(
    (edgeId: string, cond: string | null) => {
      if (nodeOps) nodeOps.updateEdgeCond(edgeId, cond);
    },
    [nodeOps],
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      if (nodeOps) nodeOps.deleteEdge(edgeId);
    },
    [nodeOps],
  );

  const handleCloseInspector = useCallback(() => {
    setSelectedNodeId(null);
    setSelectionSnapshot(null);
  }, []);

  // ---- 顶部工具栏：保存 / 发布 ----
  const handleSave = useCallback(async () => {
    if (!currentSpec) return;
    setSaving(true);
    try {
      await saveSpec(currentSpec.id, { spec: currentSpec.spec, positions: currentSpec.positions });
    } finally {
      setSaving(false);
    }
  }, [currentSpec, saveSpec]);

  const handlePublish = useCallback(async () => {
    if (!currentSpec) return;
    setPublishing(true);
    try {
      // 先保存最新草稿，再激活
      await saveSpec(currentSpec.id, { spec: currentSpec.spec, positions: currentSpec.positions });
      await activateSpec(currentSpec.id);
    } finally {
      setPublishing(false);
    }
  }, [currentSpec, saveSpec, activateSpec]);

  const runningNodeId = runtime?.current_agent ?? null;
  const isActive = currentSpec?.is_active ?? false;

  return (
    <ErrorBoundary>
      <div className={styles.page}>
        {/* 画布层 */}
        <div className={styles.canvasLayer}>
          {tab === 'editor' && (
            <ReactFlowProvider>
              {currentSpec ? (
                <InfiniteCanvasEditor
                  spec={currentSpec.spec}
                  positions={currentSpec.positions}
                  onChange={handleCanvasChange}
                  runningNodeId={runningNodeId}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={handleNodeSelect}
                  onSelectionSnapshot={handleSelectionSnapshot}
                  onRegisterCreateNode={(fn) => setCreateNodeFn(() => fn)}
                  onRegisterNodeOps={(ops) => setNodeOps(() => ops)}
                  className={styles.fill}
                />
              ) : (
                <div className={styles.placeholder}>
                  <Pencil size={32} className={styles.placeholderIcon} />
                  <p className={styles.placeholderTitle}>未选择编排图</p>
                  <p className={styles.placeholderDesc}>
                    从左侧列表选择一个编排图，或点击「新建」创建第一个编排图开始编辑。
                  </p>
                </div>
              )}
            </ReactFlowProvider>
          )}

          {tab === 'preview' && (
            <CompiledGraphPreview
              view={compiledView}
              compiling={compiling}
              compileErrors={compileErrors}
              runningNodeId={runningNodeId}
              className={styles.fill}
            />
          )}

          {tab === 'topology' && (
            <ReactFlowProvider>
              <TopologyView world={world} relations={relations} />
            </ReactFlowProvider>
          )}

          {tab === 'relations' && <RelationGraphView relations={relations} />}
        </div>

        {/* 顶部浮动：Tab 切换 + 保存/发布 */}
        <div className={styles.topBar}>
          <Tabs
            tabs={MAIN_TABS}
            active={tab}
            onChange={(k) => setTab(k as MainTab)}
            variant="pill"
          />
          {currentSpec && (
            <div className={styles.toolbarActions}>
              {isActive && <span className={styles.activeBadge}>已激活</span>}
              <Button
                variant="outline"
                size="sm"
                icon={<Save size={12} />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中…' : '保存'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Rocket size={12} />}
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? '发布中…' : '发布'}
              </Button>
            </div>
          )}
        </div>

        {/* 左侧面板：Tab 切换「编排图 / 节点」+ 折叠按钮在内部 */}
        <div
          className={`${styles.leftPanel} ${leftOpen ? styles.leftOpen : styles.leftCollapsed}`}
        >
          <div className={styles.leftHeader}>
            <Tabs
              tabs={LEFT_TABS}
              active={leftTab}
              onChange={(k) => setLeftTab(k as LeftTab)}
              variant="pill"
              className={styles.leftTabs}
            />
            <button
              type="button"
              className={styles.collapseBtn}
              title={leftOpen ? '收起面板' : '展开面板'}
              onClick={() => setLeftOpen((v) => !v)}
            >
              <PanelRight size={14} className={leftOpen ? styles.collapseIcon : styles.expandIcon} />
            </button>
          </div>
          {leftOpen && (
            <div className={styles.leftBody}>
              {leftTab === 'specs' && <SpecListPanel className={styles.panelFill} />}
              {leftTab === 'palette' && (
                <NodePalette
                  onCreateNode={handleCreateNode}
                  className={styles.panelFill}
                />
              )}
            </div>
          )}
        </div>

        {/* 右侧共用面板：RightPanel（无选中→编排图信息，有选中→节点参数面板） */}
        <div
          className={`${styles.rightPanel} ${rightOpen ? styles.rightOpen : styles.rightCollapsed}`}
        >
          <button
            type="button"
            className={styles.collapseBtn}
            title={rightOpen ? '收起面板' : '展开面板'}
            onClick={() => setRightOpen((v) => !v)}
          >
            <PanelRight size={14} className={rightOpen ? styles.expandIcon : styles.collapseIcon} />
          </button>
          {rightOpen && (
            <RightPanel
              className={styles.panelFill}
              selectedNodeId={selectedNodeId}
              selectedNodeData={selectionSnapshot?.nodeData ?? null}
              selectedOutgoingEdges={selectionSnapshot?.outgoingEdges ?? []}
              selectedNodeRun={selectedNodeRun}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onUpdateEdgeCond={handleUpdateEdgeCond}
              onDeleteEdge={handleDeleteEdge}
              onCloseInspector={handleCloseInspector}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
