import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { Avatar, Badge, EmptyState, TextInput } from '@/components/ui';
import { cx } from '@/lib/cx';
import styles from './AgentSidebar.module.css';

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

interface Preview {
  text: string;
  time: string;
}

/**
 * Agent picker — search + list with avatar, name, last-conversation preview
 * and unread badge. Reads its slice from chatStore.
 */
export function AgentSidebar() {
  const agents = useChatStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const conversations = useChatStore((s) => s.conversations);
  const unread = useChatStore((s) => s.unread);
  const selectAgent = useChatStore((s) => s.selectAgent);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
    );
  }, [agents, query]);

  function previewFor(agentId: string): Preview | null {
    const matches = conversations.filter((c) => c.participants.includes(agentId));
    if (matches.length === 0) return null;
    matches.sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
    const c = matches[0]!;
    return {
      text: `${c.message_count} message${c.message_count === 1 ? '' : 's'}`,
      time: relativeTime(c.started_at),
    };
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.search}>
        <TextInput
          icon={<Search size={16} />}
          placeholder="Search agents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search agents"
        />
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <EmptyState
            title={agents.length === 0 ? 'No agents' : 'No matches'}
            description={
              agents.length === 0
                ? 'Load or create an agent to start chatting.'
                : 'Try a different search term.'
            }
          />
        ) : (
          filtered.map((a) => {
            const active = a.id === currentAgentId;
            const count = unread[a.id] ?? 0;
            const preview = previewFor(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className={cx(styles.item, active && styles.active)}
                onClick={() => selectAgent(a.id)}
                aria-pressed={active}
              >
                <Avatar name={a.name} size="sm" online={a.enabled} />
                <div className={styles.info}>
                  <div className={styles.nameRow}>
                    <span className={styles.name} title={a.name}>
                      {a.name}
                    </span>
                    {count > 0 && (
                      <Badge variant="primary" className={styles.badge}>
                        {count}
                      </Badge>
                    )}
                  </div>
                  <span className={styles.preview}>
                    {preview ? `${preview.text} · ${preview.time}` : a.role}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AgentSidebar;
