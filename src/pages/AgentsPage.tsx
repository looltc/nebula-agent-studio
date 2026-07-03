import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Bot, Users } from 'lucide-react';
import { ContentHeader, PageContainer } from '@/components/layout';
import { Button, Select, Tabs, TextInput, type TabItem } from '@/components/ui';
import { AgentList, AgentDetail, AgentCreateModal } from '@/components/agents';
import { GroupChatManager } from '@/components/orchest';
import { useAgentStore } from '@/stores/agentStore';
import { useOrchestStore } from '@/stores/orchestStore';
import type { AgentSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './AgentsPage.module.css';

type FilterTab = 'all' | 'active' | 'idle' | 'error';
type PageTab = 'agent' | 'group';

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '运行中' },
  { key: 'idle', label: '空闲' },
  { key: 'error', label: '错误' },
];

const PAGE_TABS: TabItem[] = [
  { key: 'agent', label: 'Agent', icon: <Bot size={14} /> },
  { key: 'group', label: 'Group', icon: <Users size={14} /> },
];

export default function AgentsPage() {
  const { agentId } = useParams<{ agentId: string }>();

  const agents = useAgentStore((s) => s.agents);
  const loading = useAgentStore((s) => s.loading);
  const loadAgents = useAgentStore((s) => s.loadAgents);
  const loadTools = useAgentStore((s) => s.loadTools);
  const setCreateOpen = useAgentStore((s) => s.setCreateOpen);
  const resetForm = useAgentStore((s) => s.resetForm);

  const loadGroupChats = useOrchestStore((s) => s.loadGroupChats);

  const [pageTab, setPageTab] = useState<PageTab>('agent');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<'name'>('name');
  const [query, setQuery] = useState('');
  const [pausedIds, setPausedIds] = useState<string[]>([]);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);

  useEffect(() => {
    loadAgents();
    loadTools();
    loadGroupChats();
  }, [loadAgents, loadTools, loadGroupChats]);

  const handleTogglePause = (id: string) => {
    setPausedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // Apply local pause overrides.
  const adjustedAgents = useMemo<AgentSummary[]>(
    () =>
      agents.map((a) => ({
        ...a,
        enabled: pausedIds.includes(a.id) ? false : a.enabled,
      })),
    [agents, pausedIds],
  );

  const displayedAgents = useMemo(() => {
    let list = adjustedAgents;
    if (filterTab === 'active') list = list.filter((a) => a.enabled);
    else if (filterTab === 'idle') list = list.filter((a) => !a.enabled);
    else if (filterTab === 'error') list = []; // backend exposes no error state

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      );
    }

    if (sortKey === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [adjustedAgents, filterTab, query, sortKey]);

  const detailAgent = useMemo(() => {
    if (!agentId) return null;
    return adjustedAgents.find((a) => a.id === agentId) ?? null;
  }, [adjustedAgents, agentId]);

  const counts = useMemo(
    () => ({
      all: adjustedAgents.length,
      active: adjustedAgents.filter((a) => a.enabled).length,
      idle: adjustedAgents.filter((a) => !a.enabled).length,
      error: 0,
    }),
    [adjustedAgents],
  );

  const handleNewAgent = () => {
    resetForm();
    setCreateOpen(true);
  };

  const newAgentAction = (
    <Button variant="primary" icon={<Plus size={16} />} onClick={handleNewAgent}>
      新建 Agent
    </Button>
  );

  const filters = (
    <>
      <div className={styles.pills} role="tablist" aria-label="筛选 Agent">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filterTab === f.key}
            className={cx(styles.pill, filterTab === f.key && styles.pillActive)}
            onClick={() => setFilterTab(f.key)}
          >
            {f.label}
            <span className={styles.pillCount}>{counts[f.key]}</span>
          </button>
        ))}
      </div>
      <div className={styles.controls}>
        <TextInput
          icon={<Search size={14} />}
          placeholder="搜索 Agent"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.search}
          aria-label="搜索 Agent"
        />
        <Select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as 'name')}
          className={styles.sort}
          aria-label="排序 Agent"
        >
          <option value="name">名称</option>
        </Select>
      </div>
    </>
  );

  // 查看 Agent 详情时不显示 Tabs
  if (agentId) {
    return (
      <PageContainer>
        <AgentDetail agent={detailAgent} />
        <AgentCreateModal />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Tabs
        tabs={PAGE_TABS}
        active={pageTab}
        onChange={(k) => setPageTab(k as PageTab)}
        variant="pill"
        className={styles.pageTabs}
      />

      {pageTab === 'agent' ? (
        <>
          <ContentHeader
            title="Agent 管理"
            subtitle="创建、配置和管理你的自治 Agent。"
            actions={newAgentAction}
            filters={filters}
          />
          <AgentList
            agents={displayedAgents}
            loading={loading}
            onTogglePause={handleTogglePause}
          />
        </>
      ) : (
        <GroupChatManager
          createOpen={groupCreateOpen}
          onCreateOpenChange={setGroupCreateOpen}
        />
      )}

      <AgentCreateModal />
    </PageContainer>
  );
}
