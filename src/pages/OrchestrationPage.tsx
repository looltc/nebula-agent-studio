import { useEffect, useState } from 'react';
import { Network, GitBranch } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { ContentHeader, PageContainer, ErrorBoundary } from '@/components/layout';
import { Tabs, type TabItem } from '@/components/ui';
import {
  TopologyView,
  RelationGraphView,
  WorldPanel,
  OrchestrationDetail,
} from '@/components/orchest';
import { useOrchestStore } from '@/stores/orchestStore';
import { useChatStore } from '@/stores/chatStore';
import styles from './OrchestrationPage.module.css';

type LeftTab = 'topology' | 'relations';

const TABS: TabItem[] = [
  { key: 'topology', label: 'Topology', icon: <Network size={14} /> },
  { key: 'relations', label: 'Relations', icon: <GitBranch size={14} /> },
];

export default function OrchestrationPage() {
  const world = useOrchestStore((s) => s.world);
  const relations = useOrchestStore((s) => s.relations);
  const worldRunning = useOrchestStore((s) => s.worldRunning);
  const worldSpeed = useOrchestStore((s) => s.worldSpeed);
  const loadWorld = useOrchestStore((s) => s.loadWorld);
  const loadEvents = useOrchestStore((s) => s.loadEvents);
  const loadRelations = useOrchestStore((s) => s.loadRelations);

  const loadAgents = useChatStore((s) => s.loadAgents);

  const [tab, setTab] = useState<LeftTab>('topology');

  // Initial load of all orchestration data + chat agents (for the picker).
  useEffect(() => {
    void loadWorld();
    void loadEvents();
    void loadRelations();
    void loadAgents();
  }, [loadWorld, loadEvents, loadRelations, loadAgents]);

  // Poll for world state + events while the world loop is running.
  useEffect(() => {
    if (!worldRunning) return;
    const interval = window.setInterval(
      () => {
        void loadWorld();
        void loadEvents();
      },
      Math.max(250, 1000 / Math.max(1, worldSpeed)),
    );
    return () => window.clearInterval(interval);
  }, [worldRunning, worldSpeed, loadWorld, loadEvents]);

  return (
    <PageContainer>
      <ContentHeader
        title="Orchestration"
        subtitle="Visualize agent topology, world state, and relations."
      />

      <ErrorBoundary>
        <div className={styles.grid}>
          <div className={styles.column}>
            <Tabs
              tabs={TABS}
              active={tab}
              onChange={(k) => setTab(k as LeftTab)}
              variant="pill"
              className={styles.tabs}
            />
            <ReactFlowProvider>
              {tab === 'topology' ? (
                <TopologyView world={world} relations={relations} />
              ) : (
                <RelationGraphView relations={relations} />
              )}
            </ReactFlowProvider>
            <OrchestrationDetail world={world} />
          </div>

          <div className={styles.column}>
            <WorldPanel />
          </div>
        </div>
      </ErrorBoundary>
    </PageContainer>
  );
}
