import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { Button, ProgressBar } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './HITLApproval.module.css';

export interface HITLApprovalProps {
  agentId: string;
  tool: string;
  args?: Record<string, unknown>;
  onApprove: () => void;
  onReject: () => void;
  /** Countdown window in seconds. Defaults to 60. */
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

/**
 * Human-in-the-loop approval card.
 * Shown when an agent invokes a dangerous tool. Includes a 60s countdown
 * that auto-rejects on timeout; turns red below 10s.
 */
export function HITLApproval({
  agentId,
  tool,
  args,
  onApprove,
  onReject,
  timeoutSeconds = 60,
}: HITLApprovalProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onRejectRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const danger = secondsLeft < 10;
  const pct = Math.max(0, (secondsLeft / timeoutSeconds) * 100);
  const argsText = formatArgs(args);

  return (
    <div className={styles.card} role="alertdialog" aria-label="Human approval required">
      <div className={styles.title}>
        <AlertTriangle size={16} className={styles.titleIcon} />
        <span>HITL Approval Required</span>
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
          icon={<X size={14} />}
          onClick={onReject}
        >
          Reject
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<Check size={14} />}
          onClick={onApprove}
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
