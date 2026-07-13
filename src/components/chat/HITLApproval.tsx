import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import { Button, ProgressBar } from '@/components/ui';
import { apiClient } from '@/services/api';
import { cx } from '@/lib/cx';
import styles from './HITLApproval.module.css';

export interface HITLApprovalProps {
  approvalId: string;
  agentId: string;
  tool: string;
  args?: Record<string, unknown>;
  /** 审批场景标签（chat/group/orch） */
  scene?: string;
  /** 审批完成后回调（从 pending 列表移除） */
  onResolved: (approvalId: string) => void;
  /** Countdown window in seconds. Defaults to 120. */
  timeoutSeconds?: number;
}

function formatArgs(args?: Record<string, unknown>): string {
  if (!args) return '';
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

const SCENE_LABELS: Record<string, string> = {
  chat: '单聊',
  group: '群聊',
  orch: '编排',
};

/**
 * Human-in-the-loop approval card.
 * Shown when an agent invokes a dangerous tool. Calls the unified backend
 * approval API (/api/approvals/{id}/resume | /reject) to resolve the pending
 * future. Includes a countdown that auto-rejects on timeout; turns red below 10s.
 */
export function HITLApproval({
  approvalId,
  agentId,
  tool,
  args,
  scene = 'chat',
  onResolved,
  timeoutSeconds = 120,
}: HITLApprovalProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);
  const [busy, setBusy] = useState(false);
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          // 超时自动拒绝
          void doReject('timeout');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doApprove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.resumeApproval(approvalId);
      onResolvedRef.current(approvalId);
    } catch (e) {
      // 审批可能已被处理（404），静默移除
      onResolvedRef.current(approvalId);
    } finally {
      setBusy(false);
    }
  };

  const doReject = async (reason: string = '') => {
    if (busy) return;
    setBusy(true);
    try {
      await apiClient.rejectApproval(approvalId, { reason });
      onResolvedRef.current(approvalId);
    } catch {
      onResolvedRef.current(approvalId);
    } finally {
      setBusy(false);
    }
  };

  const danger = secondsLeft < 10;
  const pct = Math.max(0, (secondsLeft / timeoutSeconds) * 100);
  const argsText = formatArgs(args);

  return (
    <div className={styles.card} role="alertdialog" aria-label="Human approval required">
      <div className={styles.title}>
        <AlertTriangle size={16} className={styles.titleIcon} />
        <span>HITL Approval Required</span>
        {scene && SCENE_LABELS[scene] && (
          <span className={styles.sceneTag}>{SCENE_LABELS[scene]}</span>
        )}
      </div>

      <div className={styles.body}>
        <p className={styles.line}>
          Agent <strong className={styles.agentId}>{agentId}</strong> wants to:
        </p>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Tool</span>
          <code className={styles.toolName}>{tool}</code>
        </div>

        {argsText && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Args</span>
            <pre className={styles.args}>
              <code>{argsText}</code>
            </pre>
          </div>
        )}

        <p className={cx(styles.warning, danger && styles.warningDanger)}>
          <AlertTriangle size={14} className={styles.warningIcon} />
          This tool is marked as <strong>DANGEROUS</strong>
        </p>
      </div>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          size="sm"
          icon={busy ? <Loader2 size={14} className="spin" /> : <X size={14} />}
          onClick={() => doReject('rejected by human')}
          disabled={busy}
        >
          Reject
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
          onClick={doApprove}
          disabled={busy}
        >
          Approve
        </Button>
      </div>

      <div className={styles.countdown}>
        <ProgressBar
          value={pct}
          max={100}
          variant={danger ? 'danger' : 'warning'}
          size="thin"
        />
        <span className={cx(styles.countdownText, danger && styles.countdownDanger)}>
          {secondsLeft}s remaining
        </span>
      </div>
    </div>
  );
}

export default HITLApproval;
