import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type Connection,
  type NodeMouseHandler,
  type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {
  GraphEdgeSpec,
  GraphNodeType,
  GraphSpec,
  NodePosition,
  NodeTypeDef,
  PortType,
} from '@/types/api';
import CanvasNode, { type CanvasNodeData } from './CanvasNode';
import ButtonEdge, { type ButtonEdgeData } from './ButtonEdge';
import { PALETTE_DRAG_MIME, type PaletteDragItem } from './NodePalette';
import { useOrchestStore } from '@/stores/orchestStore';
import styles from './InfiniteCanvasEditor.module.css';

type CanvasRFNode = Node<CanvasNodeData, 'canvas'>;
type ButtonRFEdge = Edge<ButtonEdgeData, 'button'>;

/** 选中节点快照（供外部 NodeInspector 渲染） */
export interface SelectionSnapshot {
  nodeId: string;
  nodeData: CanvasNodeData;
  outgoingEdges: Edge[];
}

/** 节点操作 API（供外部 NodeInspector 调用，操作内部 RF state） */
export interface NodeOps {
  updateNode: (nodeId: string, data: Partial<CanvasNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  updateEdgeCond: (edgeId: string, cond: string | null) => void;
  deleteEdge: (edgeId: string) => void;
}

export interface InfiniteCanvasEditorProps {
  /** 当前编排图 spec（受控） */
  spec: GraphSpec;
  /** 节点画布位置（受控） */
  positions: Record<string, NodePosition>;
  /** spec/positions 变化回调（受控更新） */
  onChange: (spec: GraphSpec, positions: Record<string, NodePosition>) => void;
  /** 运行时高亮节点 id（用于流式执行时高亮 current_agent） */
  runningNodeId?: string | null;
  /** 当前选中节点 id（受控，null = 无选中） */
  selectedNodeId?: string | null;
  /** 选中节点变化通知 */
  onNodeSelect?: (nodeId: string | null) => void;
  /** 选中节点快照变化通知（selection 变化或 data 变化都触发） */
  onSelectionSnapshot?: (snapshot: SelectionSnapshot | null) => void;
  /** 注册创建节点函数（供外部 NodePalette 点击创建时调用） */
  onRegisterCreateNode?: (fn: CreateNodeFn) => void;
  /** 注册节点操作 API（供外部 NodeInspector 调用） */
  onRegisterNodeOps?: (ops: NodeOps) => void;
  className?: string;
}

/** 创建节点函数类型 */
export type CreateNodeFn = (
  type: GraphNodeType,
  presetConfig?: Record<string, unknown>,
  defaultLabel?: string,
) => void;

// nodeTypes / edgeTypes 在组件内 useMemo 声明（react-flow 官方推荐），
// 避免模块级常量在 HMR 时持有陈旧引用导致 "does not provide an export named 'default'"。

/** 本地端口兼容性矩阵（与后端 _COMPATIBLE 同步，避免每次连接都请求 API）
 *
 * 注意：key 是源端口类型，value 是它能连接的目标端口类型列表。
 * 后端 _COMPATIBLE 是 set[tuple(src, dst)]，这里按 src 聚合。
 * v7 修复：补齐了 string/int/float/bool/json/message/messages/agent_result/tool_result/thinking → state_ref 的映射，
 * 之前缺失导致 Agent 输出（string/agent_result/messages）连不上 text 预览节点（state_ref）。
 */
const LOCAL_COMPATIBLE: Record<string, string[]> = {
  // 同类型直连 + 基础类型 → string/json（toString/json.dumps）
  string: ['string', 'json', 'any', 'state_ref'],
  int: ['int', 'float', 'string', 'json', 'any', 'state_ref'],
  float: ['float', 'string', 'json', 'any', 'state_ref'],
  bool: ['bool', 'string', 'json', 'any', 'state_ref'],
  json: ['json', 'string', 'any', 'state_ref'],
  // Agent 语义层
  message: ['message', 'messages', 'string', 'json', 'any', 'state_ref'],
  messages: ['messages', 'string', 'json', 'any', 'message', 'state_ref'],
  agent_result: ['agent_result', 'messages', 'string', 'json', 'any', 'state_ref'],
  tool_result: ['tool_result', 'string', 'json', 'any', 'state_ref'],
  thinking: ['thinking', 'string', 'json', 'any', 'state_ref'],
  // 控制层：state_ref 作为源 → 任何类型（编译期解析为引用，运行时求值）
  state_ref: ['state_ref', 'any', 'string', 'int', 'float', 'bool', 'json', 'message', 'messages', 'agent_result', 'tool_result', 'thinking'],
  // any 作为源 → 任何类型（运行时动态校验）
  any: ['any', 'string', 'int', 'float', 'bool', 'json', 'message', 'messages', 'agent_result', 'tool_result', 'thinking', 'state_ref'],
};

/** 本地校验端口兼容性（同步，避免 onConnect 变成 async） */
function isPortCompatibleLocal(src: PortType, dst: PortType): boolean {
  if (src === dst) return true;
  const allowed = LOCAL_COMPATIBLE[src] ?? [];
  return allowed.includes(dst);
}

/** 从 NodeTypeDef 中找输入端口类型 */
function getInputPortType(def: NodeTypeDef | null, portName?: string | null): PortType | null {
  if (!def || !portName) return null;
  const p = def.inputs.find((x) => x.name === portName);
  return p?.type ?? null;
}

/** 从 NodeTypeDef 中找输出端口类型 */
function getOutputPortType(def: NodeTypeDef | null, portName?: string | null): PortType | null {
  if (!def || !portName) return null;
  const p = def.outputs.find((x) => x.name === portName);
  return p?.type ?? null;
}

/** 获取节点默认输出端口名（首个 output） */
function getDefaultOutputPort(def: NodeTypeDef | null): string | null {
  if (!def || def.outputs.length === 0) return null;
  return def.outputs[0].name;
}

/** 获取节点默认输入端口名（首个 input） */
function getDefaultInputPort(def: NodeTypeDef | null): string | null {
  if (!def || def.inputs.length === 0) return null;
  return def.inputs[0].name;
}

let nodeIdCounter = 0;
function genNodeId(type: GraphNodeType): string {
  nodeIdCounter += 1;
  return `${type}_${Date.now().toString(36)}_${nodeIdCounter}`;
}

/** GraphSpec + positions → React Flow nodes（注入 NodeTypeDef + mode 字段） */
function specToNodes(
  spec: GraphSpec,
  positions: Record<string, NodePosition>,
  nodeTypeMap: Record<string, NodeTypeDef>,
  runningNodeId?: string | null,
  streamChunks?: Record<string, string>,
): CanvasRFNode[] {
  // 自动推导入口/出口：无入边=入口，无出边=出口
  const hasIncoming = new Set<string>();
  const hasOutgoing = new Set<string>();
  for (const e of spec.edges) {
    hasOutgoing.add(e.from);
    hasIncoming.add(e.to);
  }
  return spec.nodes.map((n) => {
    const cfg = n.config ?? {};
    const def = nodeTypeMap[n.type] ?? null;
    return {
      id: n.id,
      type: 'canvas',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        type: n.type,
        label: (cfg.label as string | undefined) ?? n.label ?? null,
        agent_ref: (cfg.agent_ref as string | undefined) ?? null,
        tool_name: (cfg.tool_name as string | undefined) ?? null,
        config: cfg,
        is_entry: !hasIncoming.has(n.id),
        is_end: !hasOutgoing.has(n.id),
        running: runningNodeId === n.id,
        def,
        mode: n.mode ?? 'always',
        streamOutput: streamChunks?.[n.id] ?? null,
      },
    };
  });
}

/**
 * GraphSpec edges → React Flow edges。
 *
 * v3 关键修复：spec 没有 from_port / to_port 时，回填默认端口名（首个 input/output），
 * 否则 react-flow 会把 sourceHandle/targetHandle 当作 undefined，导致连线连到节点框上而非具体端口。
 */
function specToEdges(spec: GraphSpec, nodeTypeMap: Record<string, NodeTypeDef>): ButtonRFEdge[] {
  // 构建 id → type 映射，用于查 NodeTypeDef
  const nodeDefMap = new Map<string, NodeTypeDef | null>();
  for (const n of spec.nodes) {
    nodeDefMap.set(n.id, nodeTypeMap[n.type] ?? null);
  }

  return spec.edges.map((e: GraphEdgeSpec, i) => {
    const id = `e-${e.from}-${e.to}-${i}`;
    const isCond = !!e.cond;

    // 默认端口回填：若 spec 未指定端口，使用节点默认端口
    const srcDef = nodeDefMap.get(e.from) ?? null;
    const dstDef = nodeDefMap.get(e.to) ?? null;
    const sourceHandle = e.from_port ?? getDefaultOutputPort(srcDef) ?? undefined;
    const targetHandle = e.to_port ?? getDefaultInputPort(dstDef) ?? undefined;

    const edgeData: ButtonEdgeData = {
      cond: e.cond ?? null,
      from_port: sourceHandle ?? null,
      to_port: targetHandle ?? null,
    };

    return {
      id,
      source: e.from,
      target: e.to,
      sourceHandle,
      targetHandle,
      label: e.cond ?? undefined,
      type: 'button',
      animated: isCond,
      data: edgeData,
    };
  });
}

/** React Flow nodes → GraphSpec.nodes + positions（v2：含 mode + from_port/to_port） */
function nodesToSpec(
  nodes: CanvasRFNode[],
  edges: Edge[],
  name: string,
): { spec: GraphSpec; positions: Record<string, NodePosition> } {
  const specNodes = nodes.map((n) => {
    const cfg = n.data.config ?? {};
    const mergedConfig: Record<string, unknown> = { ...cfg };
    if (n.data.label) mergedConfig.label = n.data.label;
    if (n.data.agent_ref) mergedConfig.agent_ref = n.data.agent_ref;
    if (n.data.tool_name) mergedConfig.tool_name = n.data.tool_name;
    return {
      id: n.id,
      type: n.data.type,
      config: mergedConfig,
      ...(n.data.mode && n.data.mode !== 'always' ? { mode: n.data.mode } : {}),
    };
  });

  const specEdges: GraphEdgeSpec[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
    from_port: (e.sourceHandle as string | null) ?? null,
    to_port: (e.targetHandle as string | null) ?? null,
    cond: ((e.data as ButtonEdgeData | undefined)?.cond as string | null) ?? null,
  }));

  const positions: Record<string, NodePosition> = {};
  for (const n of nodes) {
    positions[n.id] = { x: n.position.x, y: n.position.y };
  }

  return {
    spec: {
      name,
      nodes: specNodes,
      edges: specEdges,
    },
    positions,
  };
}

/**
 * 无限画布编排图编辑器（v3 重构）。
 *
 * v3 升级：
 * - 自定义 ButtonEdge：hover 显示删除按钮，支持条件标签
 * - NodePalette 分组 + 搜索 + 拖拽（HTML5 drag-and-drop）
 * - specToEdges 默认端口回填：连线连到具体端口而非节点框
 * - 端口布局改为左右侧（CanvasNode 已重构）
 */
export default function InfiniteCanvasEditor({
  spec,
  positions,
  onChange,
  runningNodeId,
  selectedNodeId,
  onNodeSelect,
  onSelectionSnapshot,
  onRegisterCreateNode,
  onRegisterNodeOps,
  className,
}: InfiniteCanvasEditorProps) {
  const nodeTypeMap = useOrchestStore((s) => s.nodeTypeMap);
  const streamChunks = useOrchestStore((s) => s.streamChunks);
  const { screenToFlowPosition } = useReactFlow();

  // nodeTypes / edgeTypes 在组件内声明（react-flow 官方推荐，避免 HMR 陈旧引用）
  const nodeTypes = useMemo<NodeTypes>(() => ({ canvas: CanvasNode }), []);
  const edgeTypes = useMemo<EdgeTypes>(() => ({ button: ButtonEdge }), []);

  const initialNodes = useMemo(
    () => specToNodes(spec, positions, nodeTypeMap, runningNodeId),
    [], // 仅初始化时同步
  );
  const initialEdges = useMemo(
    () => specToEdges(spec, nodeTypeMap),
    [],
  );

  const [nodes, setNodes] = useNodesState<CanvasRFNode>(initialNodes);
  const [edges, setEdges] = useEdgesState<ButtonRFEdge>(initialEdges);

  const specNameRef = useRef(spec.name);
  specNameRef.current = spec.name;

  // v6：结构指纹——只在切换 spec / 增删节点 / 增删边时才重置 RF state。
  // 编辑 config（如输入框打字）不会触发重置，避免输入框失焦 + minimap 闪动。
  // 原因：saveSpec 返回新 currentSpec 引用 → spec prop 变 → 旧逻辑 setNodes(specToNodes(...)) 重建所有节点 → 失焦。
  function specFingerprint(s: GraphSpec): string {
    return JSON.stringify({
      name: s.name,
      nodes: s.nodes.map((n) => n.id + ':' + n.type),
      edges: s.edges.map((e) => e.from + '->' + e.to),
    });
  }
  const lastFingerprintRef = useRef<string>(specFingerprint(spec));

  // 外部 spec 变化 → 同步到 RF state（v6：用指纹判断，避免编辑 config 时重置）
  useEffect(() => {
    const fp = specFingerprint(spec);
    if (lastFingerprintRef.current === fp) return;
    lastFingerprintRef.current = fp;
    setNodes(specToNodes(spec, positions, nodeTypeMap, runningNodeId));
    setEdges(specToEdges(spec, nodeTypeMap));
  }, [spec, positions, runningNodeId, nodeTypeMap, setNodes, setEdges]);

  // 运行时高亮 + 流式输出变化 → 更新 data.running + data.streamOutput
  // v7：把 streamChunks 注入到节点 data，让卡片可以实时预览输出
  useEffect(() => {
    setNodes((curr) =>
      curr.map((n) => ({
        ...n,
        data: {
          ...n.data,
          running: runningNodeId === n.id,
          streamOutput: streamChunks[n.id] ?? null,
        },
      })),
    );
  }, [runningNodeId, streamChunks, setNodes]);

  // nodeTypeMap 变化 → 重新注入 def
  const lastMapRef = useRef(nodeTypeMap);
  useEffect(() => {
    if (lastMapRef.current === nodeTypeMap) return;
    lastMapRef.current = nodeTypeMap;
    setNodes((curr) =>
      curr.map((n) => ({
        ...n,
        data: { ...n.data, def: nodeTypeMap[n.data.type] ?? null },
      })),
    );
  }, [nodeTypeMap, setNodes]);

  // v5：用 ref 持有最新的 nodes/edges/onChange，避免回调依赖它们导致
  // useEffect 注册死循环（节点变化 → handleCreateNode 重建 → setCreateNodeFn → 父重渲染 → spec 同步 → 节点变化...）
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const onChangeRef = useRef(onChange);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const onNodeSelectRef = useRef(onNodeSelect);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  onChangeRef.current = onChange;
  selectedNodeIdRef.current = selectedNodeId;
  onNodeSelectRef.current = onNodeSelect;

  // 内部变化 → 回写外部（v5：通过 onChangeRef 调用，emitChange 永不重建）
  const emitChange = useCallback(
    (nextNodes: CanvasRFNode[], nextEdges: Edge[]) => {
      const { spec: newSpec, positions: newPositions } = nodesToSpec(
        nextNodes,
        nextEdges,
        specNameRef.current,
      );
      onChangeRef.current(newSpec, newPositions);
    },
    [],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const curNodes = nodesRef.current;
      const curEdges = edgesRef.current;
      const next = applyNodeChanges(changes, curNodes) as CanvasRFNode[];
      setNodes(next);
      // 删除节点时，若该节点当前被选中，通知父组件取消选中
      const deletedIds = changes
        .filter((c) => c.type === 'remove')
        .map((c) => c.id);
      if (deletedIds.length > 0) {
        if (selectedNodeIdRef.current && deletedIds.includes(selectedNodeIdRef.current)) {
          onNodeSelectRef.current?.(null);
        }
        const filteredEdges = curEdges.filter(
          (e) => !deletedIds.includes(e.source) && !deletedIds.includes(e.target),
        );
        setEdges(filteredEdges);
        emitChange(next, filteredEdges);
      } else {
        emitChange(next, curEdges);
      }
    },
    [setNodes, setEdges, emitChange],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, edgesRef.current) as ButtonRFEdge[];
      setEdges(next);
      emitChange(nodesRef.current, next);
    },
    [setEdges, emitChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge<ButtonEdgeData> = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        ...connection,
        type: 'button',
        data: {
          cond: null,
          from_port: connection.sourceHandle ?? null,
          to_port: connection.targetHandle ?? null,
        },
      };
      const next = addEdge(newEdge, edgesRef.current) as ButtonRFEdge[];
      setEdges(next);
      emitChange(nodesRef.current, next);
    },
    [setEdges, emitChange],
  );

  // 连接时按 PortType 兼容性校验
  const isValidConnection: IsValidConnection<Edge> = useCallback(
    (connection: Connection | Edge) => {
      const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
      const targetNode = nodesRef.current.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return true;

      const srcDef = sourceNode.data.def ?? null;
      const dstDef = targetNode.data.def ?? null;

      const srcPortName = connection.sourceHandle ?? getDefaultOutputPort(srcDef);
      const dstPortName = connection.targetHandle ?? getDefaultInputPort(dstDef);

      const srcType = getOutputPortType(srcDef, srcPortName);
      const dstType = getInputPortType(dstDef, dstPortName);

      if (!srcType || !dstType) return true;

      return isPortCompatibleLocal(srcType, dstType);
    },
    [],
  );

  // 单击节点 → 通知父组件选中（v7：选中状态由父组件持有，画布不再渲染 NodeInspector）
  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    onNodeSelectRef.current?.(node.id);
  }, []);

  // 点击画布空白处 → 取消选中
  const onPaneClick = useCallback(() => {
    onNodeSelectRef.current?.(null);
  }, []);

  // ---- 拖拽创建节点（v3 新增）----
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(PALETTE_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData(PALETTE_DRAG_MIME);
      if (!raw) return;

      let payload: PaletteDragItem;
      try {
        payload = JSON.parse(raw) as PaletteDragItem;
      } catch {
        return;
      }

      // 防御性校验：type 必须是字符串且已注册
      if (!payload.type || typeof payload.type !== 'string' || !nodeTypeMap[payload.type]) {
        console.warn('[InfiniteCanvasEditor] 拖拽节点类型非法，拒绝创建:', payload.type);
        return;
      }

      // 屏幕坐标 → 画布坐标
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = genNodeId(payload.type);
      const presetConfig = payload.presetConfig ?? {};
      const defaultLabel = payload.defaultLabel ?? null;

      const newNode: CanvasRFNode = {
        id,
        type: 'canvas',
        position,
        data: {
          type: payload.type,
          label: defaultLabel,
          agent_ref: null,
          tool_name: null,
          config: presetConfig,
          is_entry: true, // 新建节点无入边，自动为入口
          is_end: true,   // 新建节点无出边，自动为出口
          running: false,
          def: nodeTypeMap[payload.type] ?? null,
          mode: 'always',
        },
      };
      // v5：用函数式更新 + ref，避免依赖 nodes/edges
      setNodes((prev) => {
        const next = [...prev, newNode];
        emitChange(next, edgesRef.current);
        return next;
      });
    },
    [nodeTypeMap, setNodes, emitChange, screenToFlowPosition],
  );

  // 点击创建节点（NodePalette onClick 回退路径）
  // v5：用 ref + 函数式 setNodes，移除 nodes/edges 依赖，避免 useEffect 注册死循环
  // v7：增加 type 合法性校验，防止意外调用（如 useState 函数式更新陷阱）创建非法节点
  const handleCreateNode = useCallback(
    (
      type: GraphNodeType,
      presetConfig?: Record<string, unknown>,
      defaultLabel?: string,
    ) => {
      // 防御性校验：type 必须是字符串且已注册，否则直接返回
      if (!type || typeof type !== 'string' || !nodeTypeMap[type]) {
        console.warn('[InfiniteCanvasEditor] 非法节点类型，拒绝创建:', type);
        return;
      }
      const id = genNodeId(type);
      // 在视口中心创建（用 react-flow 的 viewport center）
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const newNode: CanvasRFNode = {
        id,
        type: 'canvas',
        position,
        data: {
          type,
          label: defaultLabel ?? null,
          agent_ref: null,
          tool_name: null,
          config: presetConfig ?? {},
          is_entry: true, // 新建节点无入边，自动为入口
          is_end: true,   // 新建节点无出边，自动为出口
          running: false,
          def: nodeTypeMap[type] ?? null,
          mode: 'always',
        },
      };
      setNodes((prev) => {
        const next = [...prev, newNode];
        emitChange(next, edgesRef.current);
        return next;
      });
    },
    [nodeTypeMap, setNodes, emitChange, screenToFlowPosition],
  );

  // 注册创建节点函数给外部（v4：NodePalette 移到 OrchestrationPage）
  // v5：handleCreateNode 已稳定（不依赖 nodes/edges），useEffect 只运行一次
  useEffect(() => {
    if (onRegisterCreateNode) {
      onRegisterCreateNode(handleCreateNode);
    }
  }, [handleCreateNode, onRegisterCreateNode]);

  // ---- ButtonEdge 删除回调（同时作为 NodeOps.deleteEdge 的实现） ----
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      const curEdges = edgesRef.current;
      const next = curEdges.filter((e) => e.id !== edgeId);
      setEdges(next);
      emitChange(nodesRef.current, next);
    },
    [setEdges, emitChange],
  );

  // ---- NodeOps：供外部 NodeInspector 调用，操作内部 RF state ----
  // 所有方法都通过 ref 读取最新值，依赖列表为空，永不重建。
  const nodeOps: NodeOps = useMemo(
    () => ({
      updateNode: (nodeId, data) => {
        const curNodes = nodesRef.current;
        const curEdges = edgesRef.current;
        const next = curNodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
        );
        setNodes(next);
        emitChange(next, curEdges);
      },
      deleteNode: (nodeId) => {
        const curNodes = nodesRef.current;
        const curEdges = edgesRef.current;
        const next = curNodes.filter((n) => n.id !== nodeId);
        const nextEdges = curEdges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );
        setNodes(next);
        setEdges(nextEdges);
        emitChange(next, nextEdges);
        // 删除后取消选中
        onNodeSelectRef.current?.(null);
      },
      updateEdgeCond: (edgeId, cond) => {
        const curEdges = edgesRef.current;
        const next = curEdges.map((e) =>
          e.id === edgeId
            ? {
                ...e,
                data: { ...e.data, cond },
                label: cond ?? undefined,
                animated: !!cond,
              }
            : e,
        );
        setEdges(next);
        emitChange(nodesRef.current, next);
      },
      deleteEdge: handleDeleteEdge,
    }),
    [setNodes, setEdges, emitChange, handleDeleteEdge],
  );

  // 注册 NodeOps 给外部（v7：父组件持有选中态，通过 NodeOps 操作内部 RF state）
  useEffect(() => {
    onRegisterNodeOps?.(nodeOps);
  }, [nodeOps, onRegisterNodeOps]);

  // ---- 选中节点快照：selection / nodes / edges 变化时通知父组件 ----
  // 父组件用此快照渲染 NodeInspector，避免 NodeInspector 直接依赖画布内部 state。
  useEffect(() => {
    if (!onSelectionSnapshot) return;
    if (!selectedNodeId) {
      onSelectionSnapshot(null);
      return;
    }
    const node = nodesRef.current.find((n) => n.id === selectedNodeId);
    if (!node) {
      onSelectionSnapshot(null);
      return;
    }
    const outgoing = edgesRef.current.filter((e) => e.source === selectedNodeId);
    onSelectionSnapshot({
      nodeId: selectedNodeId,
      nodeData: node.data,
      outgoingEdges: outgoing,
    });
  }, [selectedNodeId, nodes, edges, onSelectionSnapshot]);

  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        deleteKeyCode={['Delete', 'Backspace']}
        className={styles.flow}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} className={styles.controls} />
        <MiniMap
          pannable
          zoomable
          className={styles.minimap}
          nodeColor={(n) => {
            const t = (n.data as CanvasNodeData | undefined)?.type;
            switch (t) {
              case 'text':
                return '#6366f1';
              case 'llm':
                return '#8b5cf6';
              case 'agent':
                return '#0065fd';
              case 'tool':
                return '#f59e0b';
              case 'logic':
                return '#06b6d4';
              case 'code':
                return '#a855f7';
              case 'connector':
                return '#10b981';
              case 'custom':
                return '#7f8d9f';
              default:
                return '#7f8d9f';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
