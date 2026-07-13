import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Trash2, Users, Plus, Square, MoreVertical, Info, Eraser, ChevronDown, X, Search } from 'lucide-react';
import { ErrorBoundary } from '@/components/layout';
import { Avatar, Button, EmptyState, Badge, useToast } from '@/components/ui';
import { GroupMessageBubble, StreamingBubble } from '@/components/chat/GroupMessageBubble';
import { useOrchestStore } from '@/stores/orchestStore';
import { useUserStore } from '@/stores/userStore';
import { useChatStore } from '@/stores/chatStore';
import { resolveAvatarSrc } from '@/lib/avatar';
import { formatChatDivider, parseDate } from '@/lib/datetime';
import type { GroupMessage, GroupStreamEvent, Participant } from '@/types/api';
import { cx } from '@/lib/cx';
import CreateGroupChatModal from '@/components/orchest/CreateGroupChatModal';
import styles from './GroupChatPage.module.css';

interface MentionState {
  atIdx: number;
  query: string;
  caret: number;
}

/** 格式化用户消息时间戳（用于导航面板显示） */
const formatUserMsgTime = formatChatDivider;

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const gcId = id ?? '';

  // Store
  const groupChats = useOrchestStore((s) => s.groupChats);
  const currentGroupChat = useOrchestStore((s) => s.currentGroupChat);
  const groupMessages = useOrchestStore((s) => s.groupMessages);
  const streamingReplies = useOrchestStore((s) => s.streamingReplies);
  const groupStreaming = useOrchestStore((s) => s.groupStreaming);
  const loadGroupChats = useOrchestStore((s) => s.loadGroupChats);
  const loadGroupChatDetail = useOrchestStore((s) => s.loadGroupChatDetail);
  const streamGroupMessage = useOrchestStore((s) => s.streamGroupMessage);
  const stopGroupStream = useOrchestStore((s) => s.stopGroupStream);
  const deleteGroupChat = useOrchestStore((s) => s.deleteGroupChat);
  const updateGroupChat = useOrchestStore((s) => s.updateGroupChat);

  const user = useUserStore((s) => s.user);
  const loadUser = useUserStore((s) => s.loadUser);
  const agents = useChatStore((s) => s.agents);
  const loadAgents = useChatStore((s) => s.loadAgents);

  // Local state
  const [input, setInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const [showJumpBottom, setShowJumpBottom] = useState(false);
  const [navPanelOpen, setNavPanelOpen] = useState(false);
  // 参与者编辑：添加面板开关 + 搜索词 + 提交中标志
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [participantSaving, setParticipantSaving] = useState(false);
  // 当前可见区域最近的用户消息 id
  const [activeUserMsgId, setActiveUserMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPopoverRef = useRef<HTMLDivElement>(null);
  // 用户是否贴底（ref 避免 stale closure；state 用于 UI）
  const isAtBottomRef = useRef(true);
  // 切换群聊时标记"需要瞬时定位到底部"
  const pendingJumpBottomRef = useRef(false);

  // 初始加载列表 + 用户 + agents
  useEffect(() => {
    void loadGroupChats();
    void loadUser();
    void loadAgents();
  }, [loadGroupChats, loadUser, loadAgents]);

  // 选中群聊变化时加载详情 + 关闭旧 SSE + 标记需要瞬时定位
  useEffect(() => {
    if (gcId) {
      pendingJumpBottomRef.current = true;
      void loadGroupChatDetail(gcId);
    }
    return () => {
      stopGroupStream();
    };
  }, [gcId, loadGroupChatDetail, stopGroupStream]);

  // 滚动检测：判断是否贴底 + 计算当前可见区域最近的用户消息
  const handleScroll = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    const threshold = 80; // 距底部 80px 内算"贴底"
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isAtBottomRef.current = atBottom;
    setShowJumpBottom(!atBottom && groupMessages.length > 8);

    // 计算当前可见区域中点对应的最近用户消息
    const elRect = el.getBoundingClientRect();
    const viewportMid = el.scrollTop + el.clientHeight / 2;
    let bestId: string | null = null;
    let bestDist = Infinity;
    const userMsgEls = el.querySelectorAll<HTMLElement>('[data-source]');
    userMsgEls.forEach((node) => {
      const source = node.dataset.source;
      if (!source || !source.startsWith('human:')) return;
      // 用 getBoundingClientRect 计算相对 messageList 内容顶部的中心 y
      const nodeRect = node.getBoundingClientRect();
      const nodeMid = nodeRect.top - elRect.top + el.scrollTop + nodeRect.height / 2;
      const dist = Math.abs(nodeMid - viewportMid);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = node.dataset.msgId ?? null;
      }
    });
    setActiveUserMsgId(bestId);
  }, [groupMessages.length]);

  // 切换群聊 / 首次加载：瞬时定位到底部（不要 smooth，避免从顶部滚下来的动画）
  useEffect(() => {
    if (groupMessages.length === 0) return;
    // 只有当前 currentGroupChat 与 gcId 匹配时才滚动
    // （避免旧 gcId 残留消息触发的滚动）
    if (currentGroupChat?.id !== gcId) return;
    if (pendingJumpBottomRef.current) {
      pendingJumpBottomRef.current = false;
      isAtBottomRef.current = true;
      // 双层 rAF：第一帧让 React 完成 DOM commit，第二帧让浏览器完成布局，
      // 然后直接设置 scrollTop（比 scrollIntoView 更可靠，避免 smooth 兜底）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = messageListRef.current;
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        });
      });
      return;
    }
    // 非初始加载：用户贴底时才平滑跟随
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupMessages, streamingReplies, currentGroupChat?.id, gcId]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        menuPopoverRef.current &&
        !menuPopoverRef.current.contains(target) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const participants = currentGroupChat?.participants ?? [];
  const agentParticipants = participants.filter((p) => p.kind === 'agent');
  const mySource = user ? `human:${user.user_id}` : 'human:local';

  // @选人：检测光标位置的 @mention
  const detectMention = useCallback(
    (value: string, caret: number): MentionState | null => {
      const before = value.slice(0, caret);
      const atIdx = before.lastIndexOf('@');
      if (atIdx === -1) return null;
      const query = before.slice(atIdx + 1);
      // @ 后到光标之间不能有空白
      if (/\s/.test(query)) return null;
      // @ 前必须是空白、行首或非字母数字字符（中文/标点后也可触发，避免匹配邮箱）
      const charBefore = before[atIdx - 1];
      if (charBefore && /[a-zA-Z0-9_]/.test(charBefore)) return null;
      return { atIdx, query, caret };
    },
    [],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    const caret = e.target.selectionStart ?? value.length;
    const m = detectMention(value, caret);
    setMention(m);
    setMentionHighlight(0);
  };

  const handleSelectMention = (agentId: string) => {
    if (!mention) return;
    const before = input.slice(0, mention.atIdx);
    const after = input.slice(mention.caret);
    const insert = `@${agentId} `;
    const newText = `${before}${insert}${after}`;
    setInput(newText);
    setMention(null);
    // 恢复光标位置
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        const pos = before.length + insert.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    });
  };

  // @选人过滤
  const mentionCandidates = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    return agentParticipants.filter((p) => {
      const name = (p.name || p.id).toLowerCase();
      return p.id.toLowerCase().includes(q) || name.includes(q);
    });
  }, [mention, agentParticipants]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || groupStreaming || !gcId) return;
    // 解析 @mention 自动设置 mode/targets
    const mentions = Array.from(content.matchAll(/@(\w[\w\-]*)/g)).map((m) => m[1]);
    const validMentions = mentions.filter((m) =>
      agentParticipants.some((p) => p.id === m),
    );
    const mode = validMentions.length > 0 ? 'mention' : 'broadcast';
    const targets = validMentions;
    setInput('');
    setMention(null);
    await streamGroupMessage(
      gcId,
      {
        source: mySource,
        content,
        mode,
        targets: mode === 'broadcast' ? undefined : targets,
      },
      (event: GroupStreamEvent) => {
        if (event.type === 'error') {
          toast.error('群聊消息发送失败', event.error ?? '未知错误');
        }
      },
    );
  };

  const handleStop = () => {
    stopGroupStream();
    toast.info('已发送停止指令', '当前 agent 回复完成后将停止自动接话');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // @选人浮层打开时，处理键盘导航
    if (mention && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHighlight((h) => (h + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHighlight(
          (h) => (h - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const target = mentionCandidates[mentionHighlight];
        if (target) {
          handleSelectMention(target.id);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    // 正常发送
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleSelectGroup = (gid: string) => {
    navigate(`/group-chats/${encodeURIComponent(gid)}`);
  };

  const handleDelete = async () => {
    if (!currentGroupChat) return;
    if (!window.confirm(`确定删除群聊 "${currentGroupChat.id}" 吗？`)) return;
    await deleteGroupChat(gcId);
    navigate('/group-chats');
  };

  // 添加参与者
  const handleAddParticipant = async (agentId: string, name: string) => {
    if (!currentGroupChat) return;
    if (participants.some((p) => p.id === agentId)) return;
    const next: Participant[] = [
      ...participants,
      { id: agentId, name, kind: 'agent', role: 'member' },
    ];
    setParticipantSaving(true);
    try {
      await updateGroupChat(gcId, { participants: next });
      toast.success('已添加参与者', name);
    } catch {
      toast.error('添加失败', '请查看控制台');
    } finally {
      setParticipantSaving(false);
    }
  };

  // 移除参与者
  const handleRemoveParticipant = async (agentId: string, name: string) => {
    if (!currentGroupChat) return;
    const next = participants.filter((p) => p.id !== agentId);
    setParticipantSaving(true);
    try {
      await updateGroupChat(gcId, { participants: next });
      toast.success('已移除参与者', name);
    } catch {
      toast.error('移除失败', '请查看控制台');
    } finally {
      setParticipantSaving(false);
    }
  };

  // 候选 agent：未在参与者中且 enabled
  const candidateAgents = useMemo(() => {
    const added = new Set(participants.map((p) => p.id));
    const list = agents.filter((a) => a.enabled && !added.has(a.id));
    const q = addQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [agents, participants, addQuery]);

  // 用户消息列表（用于右侧导航条标记）
  const userMessages = useMemo(
    () => groupMessages.filter((m) => m.source === mySource),
    [groupMessages, mySource],
  );

  // 跳转到指定消息
  const scrollToMessage = useCallback((msgId: string) => {
    const container = messageListRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-msg-id="${msgId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 跳转后不强制贴底（用户在浏览历史）
      isAtBottomRef.current = false;
      setShowJumpBottom(true);
    }
  }, []);

  // 跳转到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    isAtBottomRef.current = true;
    setShowJumpBottom(false);
  }, []);

  // 合并正式消息 + 流式回复，并插入时间分隔线与消息分组
  const displayItems = useMemo(() => {
    type Item =
      | { kind: 'divider'; label: string; key: string }
      | { kind: 'message'; data: GroupMessage; key: string; showHeader: boolean }
      | { kind: 'streaming'; agentId: string; reply: { text: string; events: import('@/types/api').TimelineEvent[] }; key: string };
    const items: Item[] = [];

    let lastSource: string | null = null;
    let lastTs: number | null = null;

    for (const msg of groupMessages) {
      // 时间分隔线：相邻消息间隔 > 5 分钟插入
      const msgDate = parseDate(msg.ts);
      const msgTs = msgDate ? msgDate.getTime() : null;
      if (msgTs !== null && lastTs !== null && msgTs - lastTs > 5 * 60 * 1000) {
        const label = formatChatDivider(msg.ts);
        items.push({ kind: 'divider', label, key: `div-${msg.id}` });
        // 分隔线后重置分组（必显示 header）
        lastSource = null;
      }
      // 消息分组：同一 sender 连续消息，仅第一条显示 header（头像/名字）
      const showHeader = lastSource !== msg.source;
      items.push({ kind: 'message', data: msg, key: msg.id, showHeader });
      lastSource = msg.source;
      lastTs = msgTs;
    }

    for (const [agentId, reply] of Object.entries(streamingReplies)) {
      if (reply.text || reply.events.length > 0) {
        items.push({ kind: 'streaming', agentId, reply, key: `stream-${agentId}` });
      }
    }
    return items;
  }, [groupMessages, streamingReplies]);

  return (
    <div className={styles.page}>
      <ErrorBoundary>
        <div className={styles.layout}>
          {/* ===== 左侧群聊列表 ===== */}
          <aside className={styles.groupList}>
            <div className={styles.listHead}>
              <div className={styles.listTitle}>
                <Users size={14} className={styles.listIcon} />
                <h3>群聊</h3>
                <span className={styles.count}>{groupChats.length}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setCreateOpen(true)}
                aria-label="新建群聊"
                title="新建群聊"
              />
            </div>
            {groupChats.length === 0 ? (
              <div className={styles.listEmpty}>
                暂无群聊
                <br />
                点击 + 创建
              </div>
            ) : (
              <ul className={styles.listItems}>
                {groupChats.map((gc) => {
                  const isActive = gc.id === gcId;
                  return (
                    <li key={gc.id}>
                      <button
                        type="button"
                        className={cx(styles.groupRow, isActive && styles.groupRowActive)}
                        onClick={() => handleSelectGroup(gc.id)}
                      >
                        <div className={styles.groupRowIdentity}>
                          <span className={styles.groupRowId} title={gc.id}>
                            {gc.id}
                          </span>
                          <span className={styles.groupRowMeta}>
                            {gc.participants.length} 参与者 · {gc.message_count} 条
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* ===== 右侧聊天区 ===== */}
          <main className={styles.chat}>
            {currentGroupChat ? (
              <>
                {/* 顶部 header bar */}
                <div className={styles.chatHeader}>
                  <div className={styles.chatTitleWrap}>
                    <h2 className={styles.chatTitle} title={currentGroupChat.id}>
                      {currentGroupChat.id}
                    </h2>
                    <Badge variant="default">
                      {currentGroupChat.floor_policy.type}
                    </Badge>
                    <span className={styles.chatMeta}>
                      {currentGroupChat.message_count} 条消息
                    </span>
                  </div>
                  <div className={styles.chatActions}>
                    {/* 三点菜单按钮（参考微信/飞书右上角入口） */}
                    <button
                      ref={menuBtnRef}
                      type="button"
                      className={cx(styles.iconBtn, menuOpen && styles.iconBtnActive)}
                      onClick={() => setMenuOpen((o) => !o)}
                      aria-label="群聊菜单"
                      title="群聊菜单"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {/* 三点菜单 dropdown：参与者 + 信息 + 操作 内联展开 */}
                    {menuOpen && (
                      <div ref={menuPopoverRef} className={styles.menuDropdown}>
                        {/* 群聊信息（内联展开） */}
                        <div className={styles.menuSection}>
                          <div className={styles.menuSectionTitle}>
                            <Info size={12} />
                            <span>群聊信息</span>
                          </div>
                          <div className={styles.menuInfoBody}>
                            <div className={styles.menuInfoRow}>
                              <span className={styles.menuInfoLabel}>ID</span>
                              <span className={styles.menuInfoValue} title={currentGroupChat.id}>
                                {currentGroupChat.id}
                              </span>
                            </div>
                            <div className={styles.menuInfoRow}>
                              <span className={styles.menuInfoLabel}>消息</span>
                              <span className={styles.menuInfoValue}>
                                {currentGroupChat.message_count} 条
                              </span>
                            </div>
                            <div className={styles.menuInfoRow}>
                              <span className={styles.menuInfoLabel}>策略</span>
                              <span className={styles.menuInfoValue}>
                                {currentGroupChat.floor_policy.type}
                              </span>
                            </div>
                            {currentGroupChat.current_floor && (
                              <div className={styles.menuInfoRow}>
                                <span className={styles.menuInfoLabel}>当前</span>
                                <span className={styles.menuInfoValue}>
                                  {currentGroupChat.current_floor}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={styles.menuDivider} />

                        {/* 参与者宫格（内联展开，可增删） */}
                        <div className={styles.menuSection}>
                          <div className={styles.menuSectionTitle}>
                            <Users size={12} />
                            <span>参与者 ({participants.length})</span>
                          </div>

                          {/* 参与者宫格 */}
                          <div className={styles.participantGrid}>
                            {/* 自己 */}
                            <div className={styles.participantCell}>
                              <Avatar name={user?.display_name ?? '我'} size="sm" />
                              <span className={styles.participantCellName}>
                                {user?.display_name ?? '我'}
                              </span>
                            </div>
                            {agentParticipants.map((p) => {
                              const agentInfo = agents.find((a) => a.id === p.id);
                              const name = p.name || agentInfo?.name || p.id;
                              return (
                                <div key={p.id} className={styles.participantCell}>
                                  <Avatar
                                    name={name}
                                    size="sm"
                                    src={resolveAvatarSrc(agentInfo?.avatar)}
                                  />
                                  <span className={styles.participantCellName}>{name}</span>
                                  <button
                                    type="button"
                                    className={styles.participantCellRemove}
                                    onClick={() => void handleRemoveParticipant(p.id, name)}
                                    disabled={participantSaving}
                                    aria-label={`移除 ${name}`}
                                    title="移除参与者"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              );
                            })}
                            {/* 添加格子（最后一个） */}
                            <button
                              type="button"
                              className={styles.participantAddCell}
                              onClick={() => setAddPanelOpen((o) => !o)}
                              disabled={participantSaving}
                              aria-label="添加参与者"
                              title="添加参与者"
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          {/* 内联添加面板 */}
                          {addPanelOpen && (
                            <div className={styles.addPanel}>
                              <div className={styles.addSearchWrap}>
                                <Search size={12} className={styles.addSearchIcon} />
                                <input
                                  type="text"
                                  className={styles.addSearchInput}
                                  placeholder="搜索 agent"
                                  value={addQuery}
                                  onChange={(e) => setAddQuery(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className={styles.addPanelClose}
                                  onClick={() => {
                                    setAddPanelOpen(false);
                                    setAddQuery('');
                                  }}
                                  aria-label="关闭添加面板"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              {candidateAgents.length > 0 ? (
                                <ul className={styles.addCandidateList}>
                                  {candidateAgents.map((a) => (
                                    <li key={a.id}>
                                      <button
                                        type="button"
                                        className={styles.addCandidateItem}
                                        onClick={() => void handleAddParticipant(a.id, a.name)}
                                        disabled={participantSaving}
                                      >
                                        <Avatar
                                          name={a.name || a.id}
                                          size="sm"
                                          src={resolveAvatarSrc(a.avatar)}
                                        />
                                        <span className={styles.addCandidateName}>
                                          {a.name || a.id}
                                        </span>
                                        <Plus size={12} className={styles.addCandidatePlus} />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className={styles.addEmpty}>没有匹配的 agent</div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className={styles.menuDivider} />

                        {/* 操作区 */}
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setMenuOpen(false);
                            toast.info('功能开发中', '清空消息历史暂未实现，可删除群聊后重建');
                          }}
                        >
                          <Eraser size={14} />
                          <span>清空消息</span>
                        </button>
                        <button
                          type="button"
                          className={cx(styles.menuItem, styles.menuItemDanger)}
                          onClick={() => {
                            setMenuOpen(false);
                            void handleDelete();
                          }}
                        >
                          <Trash2 size={14} />
                          <span>删除群聊</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 消息列表 + 右侧导航条 */}
                <div className={styles.messageArea}>
                  <div className={styles.messageList} ref={messageListRef} onScroll={handleScroll}>
                    {displayItems.length === 0 ? (
                      <EmptyState
                        icon={<Users size={28} />}
                        title="群聊还没消息"
                        description="发送第一条消息开始对话。输入 @ 可以提及特定 agent。"
                        className={styles.empty}
                      />
                    ) : (
                      <>
                        {displayItems.map((item) => {
                          if (item.kind === 'divider') {
                            return (
                              <div key={item.key} className={styles.timeDivider}>
                                <span>{item.label}</span>
                              </div>
                            );
                          }
                          if (item.kind === 'message') {
                            return (
                              <GroupMessageBubble
                                key={item.key}
                                message={item.data}
                                isMe={item.data.source === mySource}
                                participants={participants}
                                agents={agents}
                              />
                            );
                          }
                          return (
                            <StreamingBubble
                              key={item.key}
                              agentId={item.agentId}
                              reply={item.reply}
                              agents={agents}
                            />
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* 右侧导航条：用户消息斑马线标记 + 全部消息面板 + 跳转到底部 */}
                  {userMessages.length > 0 && (
                    <div className={styles.navRail}>
                      {/* 斑马线标记容器（贴右边缘） */}
                      <div className={styles.navMarks}>
                        {(() => {
                          // 所有用户消息密集排列在容器正中央，固定间距 12px
                          const SPACING = 12;
                          const MARK_HEIGHT = 2;
                          const total = userMessages.length;
                          const blockHeight = total * MARK_HEIGHT + (total - 1) * SPACING;
                          const startOffset = -blockHeight / 2 + MARK_HEIGHT / 2;
                          return userMessages.map((msg, idx) => {
                            const offset = startOffset + idx * (MARK_HEIGHT + SPACING);
                            const isActive = msg.id === activeUserMsgId;
                            return (
                              <button
                                key={msg.id}
                                type="button"
                                className={cx(styles.navDot, isActive && styles.navDotActive)}
                                style={{ top: `calc(50% + ${offset}px)` }}
                                onClick={() => scrollToMessage(msg.id)}
                                onMouseEnter={() => setNavPanelOpen(true)}
                                aria-label={`跳转到用户消息 ${idx + 1}`}
                                title={msg.content.slice(0, 60)}
                              />
                            );
                          });
                        })()}
                      </div>

                      {/* 全部用户消息面板（贴右边覆盖斑马线，离开面板关闭） */}
                      {navPanelOpen && (
                        <div
                          className={styles.navPanel}
                          onMouseLeave={() => setNavPanelOpen(false)}
                        >
                          <div className={styles.navPanelHead}>
                            我的消息 ({userMessages.length})
                          </div>
                          {userMessages.length === 0 ? (
                            <div className={styles.navPanelEmpty}>暂无用户消息</div>
                          ) : (
                            <ul className={styles.navPanelList}>
                              {userMessages.map((msg, idx) => {
                                const isActive = msg.id === activeUserMsgId;
                                const time = formatUserMsgTime(msg.ts);
                                return (
                                  <li key={msg.id}>
                                    <button
                                      type="button"
                                      className={cx(
                                        styles.navPanelItem,
                                        isActive && styles.navPanelItemActive,
                                      )}
                                      onClick={() => {
                                        scrollToMessage(msg.id);
                                        setNavPanelOpen(false);
                                      }}
                                    >
                                      <span className={styles.navPanelItemMeta}>
                                        #{idx + 1} · {time}
                                      </span>
                                      <span className={styles.navPanelItemText}>
                                        {msg.content}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 跳转到底部按钮 */}
                      {showJumpBottom && (
                        <button
                          type="button"
                          className={styles.jumpBottomBtn}
                          onClick={scrollToBottom}
                          aria-label="跳转到底部"
                          title="跳转到底部"
                        >
                          <ChevronDown size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 输入区 */}
                <div className={styles.inputArea}>
                  <div className={styles.inputWrap}>
                    <textarea
                      ref={textareaRef}
                      className={styles.textarea}
                      placeholder="发送消息... 输入 @ 提及 agent"
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      disabled={groupStreaming}
                      rows={2}
                    />
                    {/* @选人浮层 */}
                    {mention && mentionCandidates.length > 0 && (
                      <div className={styles.mentionPopover}>
                        {mentionCandidates.map((p, idx) => {
                          const agentInfo = agents.find((a) => a.id === p.id);
                          const name = p.name || agentInfo?.name || p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={cx(
                                styles.mentionItem,
                                idx === mentionHighlight && styles.mentionItemActive,
                              )}
                              onMouseEnter={() => setMentionHighlight(idx)}
                              onClick={() => handleSelectMention(p.id)}
                            >
                              <Avatar
                                name={name}
                                size="sm"
                                src={resolveAvatarSrc(agentInfo?.avatar)}
                              />
                              <div className={styles.mentionInfo}>
                                <span className={styles.mentionName}>{name}</span>
                                <span className={styles.mentionId}>@{p.id}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {groupStreaming ? (
                    <Button
                      variant="danger"
                      icon={<Square size={14} />}
                      onClick={handleStop}
                    >
                      停止
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={<Send size={14} />}
                      onClick={handleSend}
                      disabled={!input.trim()}
                    >
                      发送
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.chatEmpty}>
                <EmptyState
                  icon={<Users size={32} />}
                  title={gcId ? '加载群聊...' : '选择一个群聊'}
                  description={
                    gcId ? '' : '从左侧列表选择群聊开始对话，或新建一个群聊。'
                  }
                />
              </div>
            )}
          </main>
        </div>
      </ErrorBoundary>

      <CreateGroupChatModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
