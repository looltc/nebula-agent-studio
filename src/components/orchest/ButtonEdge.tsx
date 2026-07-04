import { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';
import styles from './ButtonEdge.module.css';

/**
 * 自定义边组件：带 hover 删除按钮 + 条件标签。
 *
 * v3 优化：
 * - 加宽 hover 热区（strokeWidth 28px 透明边），更容易触发删除按钮显示
 * - 删除按钮变大（22px），点击热区更大
 * - hover 后即使鼠标移到按钮上也保持显示（labelWrap 自身有 hover 监听）
 */
export interface ButtonEdgeData extends Record<string, unknown> {
  cond?: string | null;
  from_port?: string | null;
  to_port?: string | null;
}

export interface ButtonEdgeProps extends EdgeProps {
  data?: ButtonEdgeData;
}

function ButtonEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: ButtonEdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const cond = data?.cond ?? null;
  const isCond = !!cond;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    void deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      {/* 主边 */}
      <BaseEdge
        id={id}
        path={edgePath}
        className={styles.edge}
        style={{
          stroke: selected
            ? 'var(--accent-primary)'
            : isCond
              ? 'var(--accent-primary)'
              : 'var(--text-muted)',
          strokeWidth: selected || isCond ? 2 : 1.5,
          strokeDasharray: isCond ? '6 3' : undefined,
        }}
      />
      {/* 透明加宽热区，便于 hover（28px 宽，比原来 16px 更容易触发） */}
      <BaseEdge
        id={`${id}-hit`}
        path={edgePath}
        className={styles.edgeHit}
        style={{ stroke: 'transparent', strokeWidth: 28, fill: 'none', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          className={styles.labelWrap}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* 条件标签 */}
          {isCond && (
            <span className={styles.condLabel} title="条件表达式">
              {cond}
            </span>
          )}
          {/* 删除按钮：hover 或选中时显示，按钮自身有 padding 扩大点击区 */}
          {(hovered || selected) && (
            <button
              type="button"
              className={styles.deleteBtn}
              title="删除连线"
              onClick={handleDelete}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export type ButtonEdge = Edge<ButtonEdgeData, 'button'>;

export default memo(ButtonEdgeComponent);
