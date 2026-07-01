import { Puzzle } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { SkillInfo } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './SkillAuthorization.module.css';

export interface SkillAuthorizationProps {
  skills: SkillInfo[];
  selectedIds: string[];
  onToggle: (name: string) => void;
  className?: string;
}

const SOURCE_VARIANT: Record<SkillInfo['source'], 'mono' | 'primary' | 'success'> = {
  local: 'mono',
  upload: 'primary',
  github: 'success',
};

/**
 * Skill authorization grid. Each card is a clickable label that toggles the
 * embedded checkbox. Compact grid layout matching ToolAuthorization.
 */
export function SkillAuthorization({
  skills,
  selectedIds,
  onToggle,
  className,
}: SkillAuthorizationProps) {
  if (skills.length === 0) {
    return (
      <div className={cx(styles.empty, className)}>
        <Puzzle size={20} className={styles.emptyIcon} />
        <p className={styles.emptyText}>尚未安装任何 Skill，请前往 Skill Hub 安装</p>
      </div>
    );
  }

  return (
    <div className={cx(styles.grid, className)}>
      {skills.map((skill) => {
        const checked = selectedIds.includes(skill.name);
        return (
          <label
            key={skill.name}
            className={cx(styles.card, checked && styles.cardChecked)}
          >
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={checked}
              onChange={() => onToggle(skill.name)}
            />
            <div className={styles.cardBody}>
              <div className={styles.cardHead}>
                <span className={styles.skillName}>{skill.name}</span>
                <Badge variant={SOURCE_VARIANT[skill.source]}>{skill.source}</Badge>
              </div>
              {skill.description && (
                <p className={styles.skillDesc}>{skill.description}</p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default SkillAuthorization;
