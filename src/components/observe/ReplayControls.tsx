import { useEffect, useState, type FormEvent } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
} from 'lucide-react';
import { useObserveStore } from '@/stores/observeStore';
import { Button, Card, Select, TextInput, useToast } from '@/components/ui';
import styles from './ReplayControls.module.css';

const SPEED_OPTIONS = [1, 2, 4];

export function ReplayControls() {
  const replay = useObserveStore((s) => s.replay);
  const setReplayRange = useObserveStore((s) => s.setReplayRange);
  const playReplay = useObserveStore((s) => s.playReplay);
  const pauseReplay = useObserveStore((s) => s.pauseReplay);
  const stepReplay = useObserveStore((s) => s.stepReplay);
  const setReplaySpeed = useObserveStore((s) => s.setReplaySpeed);
  const setCurrentTick = useObserveStore((s) => s.setCurrentTick);
  const lastTick = useObserveStore((s) => s.lastTick);

  const toast = useToast();

  const [fromInput, setFromInput] = useState<string>(String(replay.fromTick));
  const [toInput, setToInput] = useState<string>(String(replay.toTick));
  const [injectTick, setInjectTick] = useState<string>('');

  // Keep local range inputs roughly synced when the store range changes externally.
  useEffect(() => {
    setFromInput(String(replay.fromTick));
  }, [replay.fromTick]);
  useEffect(() => {
    setToInput(String(replay.toTick));
  }, [replay.toTick]);

  // Drive playback: each interval tick advances one step until toTick is reached.
  useEffect(() => {
    if (!replay.playing) return;
    if (replay.currentTick >= replay.toTick) {
      pauseReplay();
      return;
    }
    const interval = window.setInterval(
      () => stepReplay(1),
      Math.round(1000 / replay.speed),
    );
    return () => window.clearInterval(interval);
  }, [
    replay.playing,
    replay.currentTick,
    replay.toTick,
    replay.speed,
    stepReplay,
    pauseReplay,
  ]);

  const handleSetRange = () => {
    const from = Number(fromInput);
    const to = Number(toInput);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    setReplayRange(lo, hi);
  };

  // Step ±5: invoke the single-tick stepper five times. Each call uses a
  // functional state update, so chained calls accumulate correctly.
  const handleStepFive = (direction: 1 | -1) => {
    for (let i = 0; i < 5; i++) stepReplay(direction);
  };

  const handleStart = () => setCurrentTick(replay.fromTick);
  const handleEnd = () => setCurrentTick(replay.toTick);

  const togglePlay = () => {
    if (replay.playing) {
      pauseReplay();
    } else if (replay.currentTick >= replay.toTick) {
      // Restart from the beginning if already at the end.
      setCurrentTick(replay.fromTick);
      playReplay();
    } else {
      playReplay();
    }
  };

  const handleInject = (e: FormEvent) => {
    e.preventDefault();
    toast.info('Inject not supported in MVP', 'Tick injection/forking is coming soon.');
    setInjectTick('');
  };

  const sliderDisabled = replay.toTick <= replay.fromTick;
  const sliderMax = Math.max(replay.toTick, replay.fromTick);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Replay</span>
        {replay.playing && <span className={styles.liveBadge}>● playing</span>}
      </div>

      {/* Range */}
      <div className={styles.row}>
        <div className={styles.rangePair}>
          <label className={styles.fieldLabel} htmlFor="replay-from">
            From Tick
          </label>
          <TextInput
            id="replay-from"
            type="number"
            min={0}
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            className={styles.tickField}
            aria-label="Replay from tick"
          />
          <label className={styles.fieldLabel} htmlFor="replay-to">
            To Tick
          </label>
          <TextInput
            id="replay-to"
            type="number"
            min={0}
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className={styles.tickField}
            aria-label="Replay to tick"
          />
          <Button variant="primary" size="sm" onClick={handleSetRange}>
            Set Range
          </Button>
          {lastTick > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setToInput(String(lastTick));
                setReplayRange(0, lastTick);
              }}
            >
              Use latest ({lastTick})
            </Button>
          )}
        </div>
      </div>

      {/* Transport */}
      <div className={styles.transport}>
        <Button
          variant="ghost"
          size="md"
          icon={<SkipBack size={16} />}
          onClick={handleStart}
          aria-label="Jump to start"
        />
        <Button
          variant="ghost"
          size="md"
          icon={<Rewind size={16} />}
          onClick={() => handleStepFive(-1)}
          aria-label="Step back 5 ticks"
        />
        <Button
          variant={replay.playing ? 'secondary' : 'primary'}
          size="md"
          icon={replay.playing ? <Pause size={16} /> : <Play size={16} />}
          onClick={togglePlay}
          aria-label={replay.playing ? 'Pause' : 'Play'}
        >
          {replay.playing ? 'Pause' : 'Play'}
        </Button>
        <Button
          variant="ghost"
          size="md"
          icon={<FastForward size={16} />}
          onClick={() => handleStepFive(1)}
          aria-label="Step forward 5 ticks"
        />
        <Button
          variant="ghost"
          size="md"
          icon={<SkipForward size={16} />}
          onClick={handleEnd}
          aria-label="Jump to end"
        />
      </div>

      {/* Speed + Inject */}
      <div className={styles.row}>
        <div className={styles.controlGroup}>
          <label className={styles.fieldLabel} htmlFor="replay-speed">
            Speed
          </label>
          <Select
            id="replay-speed"
            value={String(replay.speed)}
            onChange={(e) => setReplaySpeed(Number(e.target.value))}
            className={styles.speedSelect}
            aria-label="Replay speed"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </Select>
        </div>

        <form className={styles.controlGroup} onSubmit={handleInject}>
          <label className={styles.fieldLabel} htmlFor="replay-inject">
            Inject at tick
          </label>
          <TextInput
            id="replay-inject"
            type="number"
            min={0}
            value={injectTick}
            onChange={(e) => setInjectTick(e.target.value)}
            placeholder="optional"
            className={styles.tickField}
            aria-label="Inject at tick"
          />
          <Button variant="outline" size="sm" type="submit">
            Inject
          </Button>
        </form>
      </div>

      {/* Progress slider */}
      <div className={styles.progress}>
        <input
          type="range"
          className={styles.slider}
          min={replay.fromTick}
          max={sliderMax}
          value={replay.currentTick}
          disabled={sliderDisabled}
          onChange={(e) => setCurrentTick(Number(e.target.value))}
          aria-label="Replay tick"
        />
        <div className={styles.progressLabel}>
          <span className={styles.progressTick}>
            tick: {replay.currentTick}/{replay.toTick}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default ReplayControls;
