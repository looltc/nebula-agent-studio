import { useEffect, useRef, useState } from 'react';
import {
  MoreVertical,
  Eye,
  Pause,
  Play,
  Trash2,
  FileText,
  BookOpen,
  Image,
  Download,
} from 'lucide-react';
import { Card, Badge, StatusDot } from '@/components/ui';
import type { SkillInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './SkillCard.module.css';

export interface SkillCardProps {
  skill: SkillInfo;
  onOpenDetail: (name: string) => void;
  onToggle: (name: string) => void;
  onDeleteRequest: (skill: SkillInfo) => void;
  /** 导出 Skill 为 zip（分享）。 */
  onExport: (name: string) => void;
  className?: string;
}

const SOURCE_VARIANT: Record<SkillInfo['source'], 'mono' | 'primary' | 'success'> = {
  local: 'mono',
  upload: 'primary',
  github: 'success',
};

/**
 * Skill card. Clicking the card opens the detail view; an inline operation
 * menu exposes view / toggle / uninstall actions. A resource indicator row
 * reflects whether the skill ships with scripts, references and assets.
 */
export function SkillCard({
  skill,
  onOpenDetail,
  onToggle,
  onDeleteRequest,
  onExport,
  className,
}: SkillCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const isActive = skill.enabled;
  const status: 'active' | 'idle' = isActive ? 'active' : 'idle';

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleToggle = (e: React.MouseEvent) => {
    stop(e);
    setMenuOpen(false);
    onToggle(skill.name);
  };

  return (
    <Card className={cx(styles.card, className)} onClick={() => onOpenDetail(skill.name)}>
      <div className={styles.head}>
        <div className={styles.identity}>
          <span className={styles.name}>{skill.name}</span>
          <Badge variant={SOURCE_VARIANT[skill.source]}>{skill.source}</Badge>
        </div>
        <div className={styles.menuWrap} ref={menuRef} onClick={stop}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={`操作 ${skill.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className={styles.menu} role="menu">
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onOpenDetail(skill.name);
                }}
              >
                <Eye size={14} />
                <span>查看详情</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={handleToggle}
              >
                {isActive ? <Pause size={14} /> : <Play size={14} />}
                <span>{isActive ? '禁用' : '启用'}</span>
              </button>
              <button
                type="button"
                className={styles.menuItem}
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onExport(skill.name);
                }}
              >
                <Download size={14} />
                <span>导出分享</span>
              </button>
              <div className={styles.menuDivider} />
              <button
                type="button"
                className={cx(styles.menuItem, styles.menuItemDanger)}
                role="menuitem"
                onClick={(e) => {
                  stop(e);
                  setMenuOpen(false);
                  onDeleteRequest(skill);
                }}
              >
                <Trash2 size={14} />
                <span>卸载</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.statusRow}>
        <StatusDot status={status} />
        <span className={styles.statusText}>{isActive ? '已启用' : '已禁用'}</span>
      </div>

      {skill.description && <p className={styles.desc}>{skill.description}</p>}

      <div className={styles.divider} />

      <div className={styles.resources}>
        <ResourceBadge
          icon={<FileText size={12} />}
          label="scripts"
          present={skill.has_scripts}
        />
        <ResourceBadge
          icon={<BookOpen size={12} />}
          label="references"
          present={skill.has_references}
        />
        <ResourceBadge
          icon={<Image size={12} />}
          label="assets"
          present={skill.has_assets}
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Resource indicator                                                  */
/* ------------------------------------------------------------------ */

interface ResourceBadgeProps {
  icon: React.ReactNode;
  label: string;
  present: boolean;
}

function ResourceBadge({ icon, label, present }: ResourceBadgeProps) {
  return (
    <span
      className={cx(styles.resource, present ? styles.resourceOn : styles.resourceOff)}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export default SkillCard;
