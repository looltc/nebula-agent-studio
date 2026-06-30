import { useEffect, useState } from 'react';
import { FileText, BookOpen, Image, Puzzle } from 'lucide-react';
import { Modal, Spinner, Badge, Button } from '@/components/ui';
import { apiClient } from '@/services/api';
import type { SkillDetail } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './SkillDetailModal.module.css';

export interface SkillDetailModalProps {
  /** null = closed; a skill name = open and load its detail. */
  name: string | null;
  onClose: () => void;
  className?: string;
}

const SOURCE_VARIANT: Record<SkillDetail['source'], 'mono' | 'primary' | 'success'> = {
  local: 'mono',
  upload: 'primary',
  github: 'success',
};

/**
 * Skill detail modal. Loads the full SkillDetail (body + scripts/references/
 * assets) via apiClient.getSkill whenever `name` changes from null to a
 * skill name. Renders meta info, collapsible resource lists and the raw
 * SKILL.md body.
 */
export function SkillDetailModal({ name, onClose, className }: SkillDetailModalProps) {
  const [detail, setDetail] = useState<SkillDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    apiClient
      .getSkill(name)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        console.error('Failed to load skill detail:', e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <Modal
      open={name !== null}
      onClose={onClose}
      title="Skill 详情"
      size="lg"
      className={className}
      footer={
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      {loading ? (
        <div className={styles.loading}>
          <Spinner size="md" />
          <span>正在加载详情…</span>
        </div>
      ) : detail ? (
        <div className={styles.body}>
          <div className={styles.header}>
            <h2 className={styles.title}>{detail.name}</h2>
            <Badge variant={SOURCE_VARIANT[detail.source]}>{detail.source}</Badge>
            {detail.license && <Badge variant="default">{detail.license}</Badge>}
          </div>

          {detail.description && <p className={styles.desc}>{detail.description}</p>}

          <div className={styles.kvGrid}>
            <KV label="版本" value={detail.version || '—'} mono />
            <KV label="来源" value={detail.source} mono />
            <KV label="兼容性" value={detail.compatibility || '—'} mono />
            <KV label="安装时间" value={detail.installed_at || '—'} mono />
          </div>

          <ResourceSection
            label="Scripts"
            icon={<FileText size={14} />}
            items={detail.scripts}
          />
          <ResourceSection
            label="References"
            icon={<BookOpen size={14} />}
            items={detail.references}
          />
          <ResourceSection
            label="Assets"
            icon={<Image size={14} />}
            items={detail.assets}
          />

          <details className={styles.bodyDetails}>
            <summary className={styles.bodySummary}>
              <span>SKILL.md</span>
            </summary>
            <pre className={styles.bodyCode}>
              <code>{detail.body}</code>
            </pre>
          </details>
        </div>
      ) : (
        <div className={styles.loading}>
          <Puzzle size={20} />
          <span>无法加载 Skill 详情。</span>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

interface KVProps {
  label: string;
  value: string;
  mono?: boolean;
}

function KV({ label, value, mono }: KVProps) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={cx(styles.kvValue, mono && styles.mono)}>{value}</span>
    </div>
  );
}

interface ResourceSectionProps {
  label: string;
  icon: React.ReactNode;
  items: string[];
}

function ResourceSection({ label, icon, items }: ResourceSectionProps) {
  return (
    <details className={styles.resDetails}>
      <summary className={styles.resSummary}>
        <span className={styles.resSummaryIcon}>{icon}</span>
        <span>{label}</span>
        <span className={styles.resCount}>{items.length}</span>
      </summary>
      {items.length > 0 ? (
        <ul className={styles.resList}>
          {items.map((f) => (
            <li key={f} className={styles.resItem}>
              {f}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.resEmpty}>无</p>
      )}
    </details>
  );
}

export default SkillDetailModal;
