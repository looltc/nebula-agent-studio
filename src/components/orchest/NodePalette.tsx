import { memo, useState } from 'react';
import {
  Bot,
  Brain,
  Wrench,
  GitBranch,
  Code,
  Plug,
  Puzzle,
  Type,
  ChevronDown,
  ChevronRight,
  Search,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNodeType } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './NodePalette.module.css';

/** 拖拽时 dataTransfer 携带的节点创建信息 */
export interface PaletteDragItem {
  type: GraphNodeType;
  /** 预填的 config（如 logic 的 mode） */
  presetConfig?: Record<string, unknown>;
  /** 默认 label */
  defaultLabel?: string;
}

/** Palette 项定义：可以是单个类型，也可以是带预设 config 的实例 */
export interface PaletteItem {
  /** 唯一 key（用于 React key + 拖拽数据） */
  key: string;
  /** 节点类型 */
  type: GraphNodeType;
  /** 显示名 */
  label: string;
  /** 简介 */
  desc: string;
  /** 图标 */
  icon: LucideIcon;
  /** 预填 config（如 logic 的 mode='branch'） */
  presetConfig?: Record<string, unknown>;
  /** 默认 label（创建节点时填入 config.label） */
  defaultLabel?: string;
}

/** Palette 分组 */
export interface PaletteGroup {
  /** 分组名（中文） */
  title: string;
  /** 分组项 */
  items: PaletteItem[];
}

/** 节点类型 → 图标映射（v7：移除 start/end，新增 text） */
const TYPE_ICON: Record<GraphNodeType, LucideIcon> = {
  start: Type,  // 保留兼容（不再展示在 palette）
  end: Type,    // 保留兼容（不再展示在 palette）
  llm: Brain,
  agent: Bot,
  tool: Wrench,
  logic: GitBranch,
  code: Code,
  connector: Plug,
  custom: Puzzle,
  text: Type,
};

/** Palette 分组配置（v7：移除 start/end，新增 text 节点的 input/output/note 预设） */
const PALETTE_GROUPS: PaletteGroup[] = [
  {
    title: '文本',
    items: [
      {
        key: 'text-input',
        type: 'text',
        label: '输入文本',
        desc: '可作为图入口，输入任意文本',
        icon: TYPE_ICON.text,
        presetConfig: { role: 'input' },
        defaultLabel: '输入',
      },
      {
        key: 'text-output',
        type: 'text',
        label: '输出/预览',
        desc: '可作为图出口，预览或输出结果',
        icon: TYPE_ICON.text,
        presetConfig: { role: 'output' },
        defaultLabel: '输出',
      },
      {
        key: 'text-note',
        type: 'text',
        label: '注释',
        desc: '画布注释，不参与执行',
        icon: TYPE_ICON.text,
        presetConfig: { role: 'note' },
        defaultLabel: '注释',
      },
    ],
  },
  {
    title: 'AI 节点',
    items: [
      {
        key: 'llm',
        type: 'llm',
        label: 'LLM',
        desc: '直接调用 LLM（不绑 Agent）',
        icon: TYPE_ICON.llm,
      },
      {
        key: 'agent',
        type: 'agent',
        label: '智能体',
        desc: '调用系统已注册的 Agent',
        icon: TYPE_ICON.agent,
      },
      {
        key: 'tool',
        type: 'tool',
        label: '工具',
        desc: '直接调用工具（不经 LLM）',
        icon: TYPE_ICON.tool,
      },
    ],
  },
  {
    title: '逻辑控制',
    items: [
      {
        key: 'logic-branch',
        type: 'logic',
        label: '条件分支',
        desc: '根据条件选择分支执行',
        icon: TYPE_ICON.logic,
        presetConfig: { mode: 'branch' },
        defaultLabel: '条件分支',
      },
      {
        key: 'logic-parallel',
        type: 'logic',
        label: '并行执行',
        desc: 'fan-out 并行多个分支',
        icon: TYPE_ICON.logic,
        presetConfig: { mode: 'parallel' },
        defaultLabel: '并行执行',
      },
      {
        key: 'logic-loop',
        type: 'logic',
        label: '循环',
        desc: '循环回流（带最大次数）',
        icon: TYPE_ICON.logic,
        presetConfig: { mode: 'loop', max_iterations: 10 },
        defaultLabel: '循环',
      },
      {
        key: 'logic-wait',
        type: 'logic',
        label: '等待',
        desc: '等待 timer / approval / event',
        icon: TYPE_ICON.logic,
        presetConfig: { mode: 'wait' },
        defaultLabel: '等待',
      },
      {
        key: 'logic-router',
        type: 'logic',
        label: '路由',
        desc: '按路由函数分发',
        icon: TYPE_ICON.logic,
        presetConfig: { mode: 'router' },
        defaultLabel: '路由',
      },
    ],
  },
  {
    title: '高级',
    items: [
      {
        key: 'code',
        type: 'code',
        label: '代码',
        desc: '沙箱执行 Python 代码',
        icon: TYPE_ICON.code,
      },
    ],
  },
  {
    title: '连接器',
    items: [
      {
        key: 'connector-http',
        type: 'connector',
        label: 'HTTP 请求',
        desc: '调用外部 HTTP API',
        icon: TYPE_ICON.connector,
        presetConfig: { mode: 'http', method: 'GET' },
        defaultLabel: 'HTTP 请求',
      },
      {
        key: 'connector-webhook',
        type: 'connector',
        label: 'Webhook',
        desc: '接收 Webhook 触发（可作为图入口）',
        icon: TYPE_ICON.connector,
        presetConfig: { mode: 'webhook' },
        defaultLabel: 'Webhook',
      },
      {
        key: 'connector-database',
        type: 'connector',
        label: '数据库',
        desc: '数据库查询',
        icon: TYPE_ICON.connector,
        presetConfig: { mode: 'database' },
        defaultLabel: '数据库',
      },
      {
        key: 'connector-mq',
        type: 'connector',
        label: '消息队列',
        desc: 'MQ 收发',
        icon: TYPE_ICON.connector,
        presetConfig: { mode: 'mq' },
        defaultLabel: '消息队列',
      },
      {
        key: 'connector-file',
        type: 'connector',
        label: '文件',
        desc: '文件读写',
        icon: TYPE_ICON.connector,
        presetConfig: { mode: 'file' },
        defaultLabel: '文件',
      },
      {
        key: 'connector-subgraph',
        type: 'connector',
        label: '子图',
        desc: '嵌套编排子图',
        icon: TYPE_ICON.connector,
        presetConfig: { mode: 'subgraph' },
        defaultLabel: '子图',
      },
    ],
  },
  {
    title: '扩展',
    items: [
      {
        key: 'custom',
        type: 'custom',
        label: '自定义',
        desc: 'plugin 注册的扩展节点',
        icon: TYPE_ICON.custom,
      },
    ],
  },
];

/** 拖拽时 dataTransfer 的 MIME 类型 */
export const PALETTE_DRAG_MIME = 'application/x-nebula-palette-item';

export interface NodePaletteProps {
  /** 点击创建节点（兼容旧 onClick 模式，作为拖拽的回退） */
  onCreateNode?: (type: GraphNodeType, presetConfig?: Record<string, unknown>, defaultLabel?: string) => void;
  className?: string;
}

/**
 * 节点工具栏（v3 重构）。
 *
 * 设计要点：
 * - 按类别分组（流程控制 / AI 节点 / 逻辑控制 / 高级 / 连接器 / 扩展）
 * - 逻辑 / 连接器 拆为独立实例（带预设 config.mode）
 * - 支持拖拽到画布（HTML5 drag-and-drop）
 * - 支持搜索过滤
 * - 折叠/展开分组
 */
function NodePalette({ onCreateNode, className }: NodePaletteProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const toggleGroup = (title: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLButtonElement>,
    item: PaletteItem,
  ) => {
    const payload: PaletteDragItem = {
      type: item.type,
      presetConfig: item.presetConfig,
      defaultLabel: item.defaultLabel,
    };
    e.dataTransfer.setData(PALETTE_DRAG_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (item: PaletteItem) => {
    onCreateNode?.(item.type, item.presetConfig, item.defaultLabel);
  };

  // 搜索过滤
  const filteredGroups = query.trim()
    ? PALETTE_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.label.toLowerCase().includes(query.toLowerCase()) ||
            it.desc.toLowerCase().includes(query.toLowerCase()) ||
            it.type.toLowerCase().includes(query.toLowerCase()),
        ),
      })).filter((g) => g.items.length > 0)
    : PALETTE_GROUPS;

  return (
    <div className={cx(styles.palette, className)}>
      {/* 搜索框 */}
      <div className={styles.searchWrap}>
        <Search size={12} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="搜索节点..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={styles.groupList}>
        {filteredGroups.map((group) => {
          const isCollapsed = collapsed.has(group.title);
          return (
            <div key={group.title} className={styles.group}>
              <button
                type="button"
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.title)}
              >
                {isCollapsed ? (
                  <ChevronRight size={11} className={styles.chevron} />
                ) : (
                  <ChevronDown size={11} className={styles.chevron} />
                )}
                <span className={styles.groupTitle}>{group.title}</span>
                <span className={styles.groupCount}>{group.items.length}</span>
              </button>
              {!isCollapsed && (
                <div className={styles.itemList}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={styles.item}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => handleClick(item)}
                        title={item.desc}
                      >
                        <Icon size={13} className={styles.itemIcon} />
                        <div className={styles.itemText}>
                          <span className={styles.itemLabel}>{item.label}</span>
                          <span className={styles.itemDesc}>{item.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.hint}>
        <span>拖拽到画布或点击添加</span>
      </div>
    </div>
  );
}

export default memo(NodePalette);
