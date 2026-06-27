import { Play, Pause, StepForward, Activity, Globe } from 'lucide-react';
import {
  Card,
  StatCard,
  StatusDot,
  Avatar,
  Skeleton,
  Button,
  Select,
  type StatusDotStatus,
} from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import { cx } from '@/lib/cx';
import type { AgentStateInfo } from '@/types/api';
import styles from './WorldPanel.module.css';

function statusToDot(status?: string): StatusDotStatus {
  const s = (status ?? '').toLowerCase();
  if (s === 'active' || s === 'running' || s === 'online') return 'active';
  if (s === 'error' || s === 'failed') return 'error';
  if (s === 'paused' || s === 'warning') return 'warning';
  if (s === 'loading' || s === 'thinking' || s === 'processing') return 'loading';
  return 'idle';
}

const SPEED_OPTIONS = [1, 2, 4];

export interface WorldPanelProps {
  className?: string;
}

/**
 * World panel: stats row (Tick / Agents / Events / Sim Time), agent states list
 * with live status, and the WorldLoop controls (Run / Pause / Step / Speed).
 * Falls back to skeletons when the world state has not yet loaded.
 */
export default function WorldPanel({ className }: WorldPanelProps) {
  const world = useOrchestStore((s) => s.world);
  const events = useOrchestStore((s) => s.events);
  const worldRunning = useOrchestStore((s) => s.worldRunning);
  const worldSpeed = useOrchestStore((s) => s.worldSpeed);
  const setWorldRunning = useOrchestStore((s) => s.setWorldRunning);
  const setWorldSpeed = useOrchestStore((s) => s.setWorldSpeed);
  const stepWorld = useOrchestStore((s) => s.stepWorld);

  const agentEntries = world
    ? Object.entries(world.agent_states)
    : ([] as Array<[string, AgentStateInfo]>);

  if (!world) {
    return (
      <div className={cx(styles.wrap, className)}>
        <div className={styles.statsRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={styles.statCard}>
              <Skeleton width="40%" height={10} />
              <Skeleton width="60%" height={26} />
            </Card>
          ))}
        </div>
        <Card className={styles.body}>
          <Skeleton width="30%" height={14} />
          <div className={styles.skeletonList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <Skeleton width={28} height={28} rounded />
                <div className={styles.skeletonText}>
                  <Skeleton width="40%" height={12} />
                  <Skeleton width="70%" height={10} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.statsRow}>
        <StatCard label="Tick" value={world.tick} />
        <StatCard label="Agents" value={agentEntries.length} />
        <StatCard label="Events" value={events.length} />
        <StatCard
          label="Sim Time"
          value={<span className={styles.mono}>{world.sim_time}</span>}
        />
      </div>

      <Card className={styles.body}>
        <div className={styles.sectionHead}>
          <Activity size={14} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Agent States</h3>
          <span className={styles.count}>{agentEntries.length}</span>
        </div>
        {agentEntries.length === 0 ? (
          <div className={styles.emptyRow}>No agents registered in the world.</div>
        ) : (
          <ul className={styles.agentList}>
            {agentEntries.map(([id, info]) => {
              const status = info.status;
              return (
                <li key={id} className={styles.agentRow}>
                  <Avatar name={id} size="sm" online={status === 'active' || status === 'running'} />
                  <div className={styles.agentMeta}>
                    <span className={styles.agentId}>{id}</span>
                    <span className={styles.agentLast}>
                      {info.last_message ?? '—'}
                    </span>
                  </div>
                  <div className={styles.agentStatus}>
                    <StatusDot status={statusToDot(status)} />
                    <span className={styles.statusText}>{status ?? 'idle'}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className={styles.controls}>
        <div className={styles.controlsHead}>
          <Globe size={14} className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>World Loop</h3>
          <span
            className={cx(
              styles.runBadge,
              worldRunning ? styles.runBadgeOn : styles.runBadgeOff,
            )}
          >
            {worldRunning ? 'running' : 'paused'}
          </span>
        </div>
        <div className={styles.controlsRow}>
          <Button
            variant="primary"
            size="sm"
            icon={<Play size={14} />}
            disabled={worldRunning}
            onClick={() => setWorldRunning(true)}
          >
            Run
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Pause size={14} />}
            disabled={!worldRunning}
            onClick={() => setWorldRunning(false)}
          >
            Pause
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<StepForward size={14} />}
            onClick={() => void stepWorld()}
          >
            Step
          </Button>
          <div className={styles.speedWrap}>
            <label className={styles.speedLabel} htmlFor="world-speed">
              Speed
            </label>
            <Select
              id="world-speed"
              value={String(worldSpeed)}
              onChange={(e) => setWorldSpeed(Number(e.target.value))}
              className={styles.speedSelect}
            >
              {SPEED_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}x
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}
