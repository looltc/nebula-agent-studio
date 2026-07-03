import { useNavigate } from 'react-router-dom';
import { Users, Plus, MessageSquare, Trash2 } from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  useToast,
} from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import type { GroupChatSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import CreateGroupChatModal from './CreateGroupChatModal';
import styles from './GroupChatManager.module.css';

export interface GroupChatManagerProps {
  /** Controlled create-modal open state. The page owns this so its header
   * action button can also open the modal. */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  className?: string;
}

function statusBadgeVariant(
  gc: GroupChatSummary,
): 'success' | 'warning' | 'default' {
  const floor = (gc.current_floor ?? '').toLowerCase();
  if (!floor || floor === 'paused') return 'warning';
  if (floor === 'archived' || floor === 'ended') return 'default';
  return 'success';
}

function statusLabel(gc: GroupChatSummary): string {
  const floor = gc.current_floor;
  if (!floor) return 'idle';
  return floor;
}

/**
 * Group chat manager: a list of group chats (clickable) on top and a detail
 * panel below. The detail panel exposes Pause / Edit / Archive actions which
 * only surface a toast (no API yet). The create modal is controlled via props
 * so the page header can also trigger it.
 */
export default function GroupChatManager({
  createOpen,
  onCreateOpenChange,
  className,
}: GroupChatManagerProps) {
  const navigate = useNavigate();
  const groupChats = useOrchestStore((s) => s.groupChats);
  const selectedId = useOrchestStore((s) => s.selectedGroupChatId);
  const selectGroupChat = useOrchestStore((s) => s.selectGroupChat);
  const deleteGroupChat = useOrchestStore((s) => s.deleteGroupChat);
  const toast = useToast();

  const selected = groupChats.find((g) => g.id === selectedId) ?? null;

  const openGroupChat = (id: string) => {
    selectGroupChat(id);
    navigate(`/group-chats/${encodeURIComponent(id)}`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`确定删除群聊 "${id}" 吗？`)) return;
    await deleteGroupChat(id);
    toast.success('群聊已删除', id);
  };

  return (
    <div className={cx(styles.wrap, className)}>
      {/* ===== List ===== */}
      <Card className={styles.listCard}>
        <div className={styles.listHead}>
          <div className={styles.listTitle}>
            <Users size={14} className={styles.icon} />
            <h3>Group Chats</h3>
            <span className={styles.count}>{groupChats.length}</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => onCreateOpenChange(true)}
          >
            New Group
          </Button>
        </div>

        {groupChats.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="No group chats"
            description="Create a group chat to coordinate multiple agents with a floor policy."
            action={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => onCreateOpenChange(true)}
              >
                New Group
              </Button>
            }
            className={styles.empty}
          />
        ) : (
          <ul className={styles.list}>
            {groupChats.map((gc) => {
              const isActive = gc.id === selectedId;
              return (
                <li key={gc.id} className={styles.listItem}>
                  <button
                    type="button"
                    className={cx(styles.row, isActive && styles.rowActive)}
                    onClick={() => selectGroupChat(gc.id)}
                    aria-pressed={isActive}
                  >
                    <div className={styles.rowIdentity}>
                      <span className={styles.rowId} title={gc.id}>
                        {gc.id}
                      </span>
                      <span className={styles.rowMeta}>
                        {gc.participants.length} participants ·{' '}
                        <span className={styles.policy}>
                          {gc.floor_policy.type}
                        </span>
                      </span>
                    </div>
                    <Badge variant={statusBadgeVariant(gc)}>
                      {statusLabel(gc)}
                    </Badge>
                  </button>
                  <button
                    type="button"
                    className={styles.rowAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      openGroupChat(gc.id);
                    }}
                    title="打开群聊"
                    aria-label={`打开群聊 ${gc.id}`}
                  >
                    <MessageSquare size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ===== Detail ===== */}
      <Card className={styles.detailCard}>
        {selected ? (
          <div className={styles.detail}>
            <div className={styles.detailHead}>
              <h3 className={styles.detailTitle} title={selected.id}>
                Group: {selected.id}
              </h3>
              <Badge variant={statusBadgeVariant(selected)}>
                {statusLabel(selected)}
              </Badge>
            </div>

            <dl className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <dt>Floor Policy</dt>
                <dd>{selected.floor_policy.type}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>State</dt>
                <dd className={styles.capitalize}>{statusLabel(selected)}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Participants</dt>
                <dd>{selected.participants.length}</dd>
              </div>
              <div className={styles.detailItem}>
                <dt>Current Floor</dt>
                <dd className={styles.mono}>
                  {selected.current_floor ?? '—'}
                </dd>
              </div>
            </dl>

            <div className={styles.detailActions}>
              <Button
                variant="primary"
                size="sm"
                icon={<MessageSquare size={14} />}
                onClick={() => openGroupChat(selected.id)}
              >
                打开群聊
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(selected.id)}
              >
                删除
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={<Users size={28} />}
            title="No group selected"
            description="Select a group chat from the list to inspect its floor policy and state."
            className={styles.empty}
          />
        )}
      </Card>

      <CreateGroupChatModal
        open={createOpen}
        onClose={() => onCreateOpenChange(false)}
      />
    </div>
  );
}
