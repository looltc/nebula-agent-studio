import { Puzzle } from 'lucide-react';
import { Checkbox, Badge } from '@/components/ui';
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
 * Skill authorization list. Each row exposes a checkbox bound to the parent
 * store, the skill name, a source badge and a description. Used in the Agent
 * create/edit modal to pick which Skills an Agent may invoke. Skills carry no
 * safety tier, so there is no dangerous indicator here.
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
    <div className={cx(styles.list, className)}>
      {skills.map((skill) => {
        const checked = selectedIds.includes(skill.name);
        return (
          <div
            key={skill.name}
            className={cx(styles.row, checked && styles.rowChecked)}
          >
            <div className={styles.rowMain}>
              <Checkbox checked={checked} onChange={() => onToggle(skill.name)} />
              <div className={styles.rowBody}>
                <div className={styles.rowHead}>
                  <span className={styles.toolName}>{skill.name}</span>
                  <Badge variant={SOURCE_VARIANT[skill.source]}>{skill.source}</Badge>
                </div>
                {skill.description && (
                  <p className={styles.toolDesc}>{skill.description}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SkillAuthorization;
