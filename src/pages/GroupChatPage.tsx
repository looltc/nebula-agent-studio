import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, Trash2, Users, Plus, X, Square } from 'lucide-react';
import { ErrorBoundary } from '@/components/layout';
import { Avatar, Button, EmptyState, Badge, useToast } from '@/components/ui';
import { MarkdownText } from '@/components/chat/MarkdownText';
import { useOrchestStore } from '@/stores/orchestStore';
import { useUserStore } from '@/stores/userStore';
import { useChatStore } from '@/stores/chatStore';
import type { GroupMessage, GroupStreamEvent, Participant } from '@/types/api';
import { cx } from '@/lib/cx';
import CreateGroupChatModal from '@/components/orchest/CreateGroupChatModal';
import styles from './GroupChatPage.module.css';

interface MentionState {
  atIdx: number;
  query: string;
  caret: number;
}

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

  const user = useUserStore((s) => s.user);
  const loadUser = useUserStore((s) => s.loadUser);
  const agents = useChatStore((s) => s.agents);
  const loadAgents = useChatStore((s) => s.loadAgents);

  // Local state
  const [input, setInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [mentionHighlight, setMentionHighlight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const participantsBtnRef = useRef<HTMLButtonElement>(null);
  const participantsPopoverRef = useRef<HTMLDivElement>(null);

  // 初始加载列表 + 用户 + agents
  useEffect(() => {
    void loadGroupChats();
    void loadUser();
    void loadAgents();
  }, [loadGroupChats, loadUser, loadAgents]);

  // 选中群聊变化时加载详情 + 关闭旧 SSE
  useEffect(() => {
    if (gcId) {
      void loadGroupChatDetail(gcId);
    }
    return () => {
      stopGroupStream();
    };
  }, [gcId, loadGroupChatDetail, stopGroupStream]);

  // 消息列表滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages, streamingReplies]);

  // 点击外部关闭参与者浮层
  useEffect(() => {
    if (!participantsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        participantsPopoverRef.current &&
        !participantsPopoverRef.current.contains(e.target as Node) &&
        participantsBtnRef.current &&
        !participantsBtnRef.current.contains(e.target as Node)
      ) {
        setParticipantsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [participantsOpen]);

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
      // @ 前必须是空白或行首（避免匹配邮箱）
      const charBefore = before[atIdx - 1];
      if (charBefore && !/\s/.test(charBefore)) return null;
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

  // 合并正式消息 + 流式回复
  const displayItems = useMemo(() => {
    const items: Array<
      | { kind: 'message'; data: GroupMessage }
      | { kind: 'streaming'; agentId: string; text: string }
    > = [];
    for (const msg of groupMessages) {
      items.push({ kind: 'message', data: msg });
    }
    for (const [agentId, text] of Object.entries(streamingReplies)) {
      if (text) {
        items.push({ kind: 'streaming', agentId, text });
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
                    <button
                      ref={participantsBtnRef}
                      type="button"
                      className={cx(styles.iconBtn, participantsOpen && styles.iconBtnActive)}
                      onClick={() => setParticipantsOpen((o) => !o)}
                      aria-label="参与者"
                      title="参与者"
                    >
                      <Users size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={handleDelete}
                      aria-label="删除群聊"
                      title="删除群聊"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* 参与者浮层 */}
                    {participantsOpen && (
                      <div ref={participantsPopoverRef} className={styles.participantsPopover}>
                        <div className={styles.popoverHead}>
                          <span>参与者 ({participants.length})</span>
                          <button
                            type="button"
                            className={styles.popoverClose}
                            onClick={() => setParticipantsOpen(false)}
                            aria-label="关闭"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <ul className={styles.popoverList}>
                          {/* 自己 */}
                          <li className={styles.popoverRow}>
                            <Avatar name={user?.display_name ?? '我'} size="sm" />
                            <div className={styles.popoverInfo}>
                              <span className={styles.popoverName}>
                                {user?.display_name ?? '我'}
                              </span>
                              <span className={styles.popoverRole}>用户</span>
                            </div>
                          </li>
                          {agentParticipants.map((p) => {
                            const agentInfo = agents.find((a) => a.id === p.id);
                            const name = p.name || agentInfo?.name || p.id;
                            return (
                              <li key={p.id} className={styles.popoverRow}>
                                <Avatar
                                  name={name}
                                  size="sm"
                                  src={resolveAvatarSrc(agentInfo?.avatar)}
                                />
                                <div className={styles.popoverInfo}>
                                  <span className={styles.popoverName}>{name}</span>
                                  <span className={styles.popoverRole}>{p.role}</span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        <div className={styles.popoverPolicy}>
                          <div className={styles.policyRow}>
                            <span className={styles.policyLabel}>Floor</span>
                            <Badge>{currentGroupChat.floor_policy.type}</Badge>
                          </div>
                          {currentGroupChat.current_floor && (
                            <div className={styles.policyRow}>
                              <span className={styles.policyLabel}>当前</span>
                              <span className={styles.policyValue}>
                                {currentGroupChat.current_floor}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 消息列表 */}
                <div className={styles.messageList}>
                  {displayItems.length === 0 ? (
                    <EmptyState
                      icon={<Users size={28} />}
                      title="群聊还没消息"
                      description="发送第一条消息开始对话。输入 @ 可以提及特定 agent。"
                      className={styles.empty}
                    />
                  ) : (
                    <>
                      {displayItems.map((item, idx) => {
                        if (item.kind === 'message') {
                          return (
                            <MessageBubble
                              key={item.data.id}
                              message={item.data}
                              isMe={item.data.source === mySource}
                              participants={participants}
                              agents={agents}
                            />
                          );
                        }
                        const agentInfo = agents.find((a) => a.id === item.agentId);
                        const name = agentInfo?.name ?? item.agentId;
                        return (
                          <div key={`stream-${idx}`} className={styles.streamingBubble}>
                            <Avatar
                              name={name}
                              size="sm"
                              src={resolveAvatarSrc(agentInfo?.avatar)}
                            />
                            <div className={styles.streamingContent}>
                              <span className={styles.streamingName}>{name}</span>
                              <div className={styles.streamingText}>
                                <MarkdownText content={item.text} streaming />
                                <span className={styles.cursor}>▌</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
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

/** 把 agent.avatar（文件名，如 "cat.jpg"）转为 /avatars/ 路径；无则返回 null 由 Avatar fallback 到首字母 */
function resolveAvatarSrc(avatar?: string | null): string | null {
  if (!avatar) return null;
  // 已经是完整 URL（http/https/data:）直接用
  if (/^(https?:|data:)/.test(avatar)) return avatar;
  // 文件名 → /avatars/ 路径
  return `/avatars/${avatar}`;
}

/** 单条消息气泡 */
function MessageBubble({
  message,
  isMe,
  participants,
  agents,
}: {
  message: GroupMessage;
  isMe: boolean;
  participants: Participant[];
  agents: { id: string; name: string; avatar?: string | null }[];
}) {
  const senderP = participants.find((p) => p.id === message.source);
  const agentInfo = agents.find((a) => a.id === message.source);
  const name =
    message.metadata.sender_name || senderP?.name || agentInfo?.name || message.source;
  const isHuman = message.source.startsWith('human:') || senderP?.kind === 'human';
  const avatarSrc = resolveAvatarSrc(agentInfo?.avatar);

  return (
    <div className={cx(styles.messageBubble, isMe && styles.messageBubbleMe)}>
      <Avatar name={name} size="sm" src={avatarSrc} />
      <div className={styles.messageContent}>
        <div className={styles.messageHead}>
          <span className={styles.messageName}>{name}</span>
          {isHuman && <Badge variant="default">用户</Badge>}
          {!isHuman && senderP && <Badge variant="success">{senderP.role}</Badge>}
          {message.addressing.mode !== 'broadcast' && (
            <Badge variant="warning">
              {message.addressing.mode}
              {message.addressing.targets.length > 0 &&
                ` → ${message.addressing.targets.join(', ')}`}
            </Badge>
          )}
        </div>
        {/* agent 消息用 MarkdownText 渲染（支持 md 格式），用户消息保持纯文本 */}
        <div className={styles.messageText}>
          {isHuman ? message.content : <MarkdownText content={message.content} />}
        </div>
      </div>
    </div>
  );
}
