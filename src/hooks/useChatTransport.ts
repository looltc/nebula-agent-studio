import { useCallback, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import {
  buildChatWSUrl,
  ConnectionManager,
  WSChatClient,
  streamSSEChat,
} from '@/services/ws';
import type { WSReceived } from '@/types/api';

/**
 * Owns the chat transport (WebSocket / SSE / HTTP) lifecycle.
 * - ws: maintains a WSChatClient per currentAgentId; reconnects via ConnectionManager.
 * - sse: per-message fetch stream.
 * - http: per-message request via store.
 *
 * Exposes a single `send(text)` the page calls regardless of mode.
 * Also keeps uiStore.connectionState in sync for ws mode.
 */
export function useChatTransport() {
  const agentId = useChatStore((s) => s.currentAgentId);
  const chatMode = useChatStore((s) => s.chatMode);
  const setConnectionState = useUIStore((s) => s.setConnectionState);
  const addToast = useUIStore((s) => s.addToast);

  const clientRef = useRef<WSChatClient | null>(null);
  const connMgrRef = useRef<ConnectionManager | null>(null);
  const sseCancelRef = useRef<(() => void) | null>(null);

  const getStore = useChatStore.getState;

  const handleWSMessage = useCallback(
    (data: WSReceived) => {
      const st = getStore();
      // 无论什么事件类型，只要有 conversation_id 就立即同步到 store + localStorage。
      // 这样即使 stream_done 前连接断开（如切换页面），restoreSession 也能找到会话。
      if (data.conversation_id) {
        st.setCurrentConversationId(data.conversation_id);
      }
      if (data.type === 'message') {
        st.appendAssistantMessage(data.content);
        st.markRead(data.source);
      } else {
        // StreamEvent
        switch (data.type) {
          case 'stream_chunk':
            st.onStreamChunk(data.payload.text ?? '');
            break;
          case 'stream_thinking':
            st.onStreamThinking(data.payload.step ?? '', data.payload.content ?? '');
            break;
          case 'stream_tool_start':
            st.onStreamToolStart(data.payload.tool ?? '', data.payload.args);
            break;
          case 'stream_tool_end':
            st.onStreamToolEnd(data.payload.tool ?? '', data.payload.result);
            break;
          case 'stream_tool_approval':
            st.onStreamToolApproval({
              approval_id: data.payload.approval_id ?? '',
              tool: data.payload.tool ?? '',
              args: data.payload.args,
              scene: data.payload.scene ?? 'chat',
              agent_id: data.agent_id,
            });
            break;
          case 'stream_done':
            st.onStreamDone(data.payload.message_id ?? data.message_id);
            break;
          case 'stream_error':
            st.onStreamError(data.payload.error ?? 'Unknown stream error');
            break;
        }
      }
    },
    [getStore],
  );

  const connectWS = useCallback(
    (id: string, stream: boolean) => {
      const url = buildChatWSUrl(id, stream);
      if (!connMgrRef.current) {
        connMgrRef.current = new ConnectionManager({
          onStateChange: (state) => setConnectionState(state),
        });
      }
      const conn = connMgrRef.current;

      const client = new WSChatClient(url, {
        onOpen: () => conn.markConnected(),
        onClose: () => {
          conn.markDisconnected(() => connectWS(id, stream));
          if (conn.state === 'degraded') {
            addToast({
              variant: 'warning',
              title: 'Connection degraded',
              description: 'Switched to HTTP fallback. Real-time updates may be delayed.',
            });
          }
        },
        onError: () => {
          /* onClose will follow */
        },
        onMessage: handleWSMessage,
      });
      client.connect();
      clientRef.current = client;
    },
    [handleWSMessage, setConnectionState, addToast],
  );

  // (Re)connect WS when agent or mode changes
  useEffect(() => {
    // tear down existing
    clientRef.current?.close();
    clientRef.current = null;
    sseCancelRef.current?.();
    sseCancelRef.current = null;
    connMgrRef.current?.reset();

    if (!agentId) {
      setConnectionState('disconnected');
      return;
    }

    if (chatMode === 'ws') {
      // streaming WS for richer events
      connectWS(agentId, true);
    } else {
      setConnectionState('connected');
    }

    return () => {
      clientRef.current?.close();
      clientRef.current = null;
      connMgrRef.current?.destroy();
      connMgrRef.current = null;
      sseCancelRef.current?.();
      sseCancelRef.current = null;
    };
  }, [agentId, chatMode, connectWS, setConnectionState]);

  const send = useCallback(
    async (text: string) => {
      const st = getStore();
      const id = st.currentAgentId;
      const mode = st.chatMode;
      if (!id || !text.trim()) return;

      st.appendLocalUserMessage(text);

      if (mode === 'http') {
        await st.sendMessage(text);
        return;
      }

      st.startStreaming();

      if (mode === 'ws') {
        const client = clientRef.current;
        if (client && client.isOpen) {
          client.send(text, st.currentConversationId);
        } else {
          // fallback to http if ws not ready
          st.onStreamError('WebSocket not connected, falling back to HTTP');
          try {
            const res = await import('@/services/api').then((m) =>
              m.apiClient.chat({
                agent_id: id,
                message: text,
                conversation_id: st.currentConversationId,
              }),
            );
            st.setCurrentConversationId(res.conversation_id);
            st.onStreamDone(res.conversation_id);
            st.markRead(id);
          } catch (e) {
            st.onStreamError(e instanceof Error ? e.message : String(e));
          }
        }
      } else if (mode === 'sse') {
        sseCancelRef.current?.();
        sseCancelRef.current = streamSSEChat(
          id,
          text,
          {
            onEvent: (evt) => {
              const s = getStore();
              if (evt.type === 'start') {
                if (evt.conversation_id) {
                  s.setCurrentConversationId(evt.conversation_id);
                }
              } else if (evt.type === 'chunk') {
                s.onStreamChunk(evt.text);
              } else if (evt.type === 'thinking') {
                s.onStreamThinking(
                  evt.payload.step ?? '',
                  evt.payload.content ?? '',
                );
              } else if (evt.type === 'tool_start') {
                s.onStreamToolStart(
                  evt.payload.tool ?? '',
                  evt.payload.args,
                );
              } else if (evt.type === 'tool_end') {
                s.onStreamToolEnd(
                  evt.payload.tool ?? '',
                  evt.payload.result,
                );
              } else if (evt.type === 'tool_approval') {
                s.onStreamToolApproval({
                  approval_id: evt.payload.approval_id ?? '',
                  tool: evt.payload.tool ?? '',
                  args: evt.payload.args,
                  scene: evt.payload.scene ?? 'chat',
                });
              } else if (evt.type === 'end') {
                if (evt.conversation_id) {
                  s.setCurrentConversationId(evt.conversation_id);
                }
                s.onStreamDone();
                s.markRead(id);
              } else if (evt.type === 'error') {
                s.onStreamError(evt.error);
              }
            },
            onError: (err) => {
              getStore().onStreamError(err.message);
            },
          },
          st.currentConversationId,
        );
      }
    },
    [getStore],
  );

  const stop = useCallback(() => {
    sseCancelRef.current?.();
    sseCancelRef.current = null;
    const st = getStore();
    if (st.streaming) {
      st.onStreamDone();
    }
  }, [getStore]);

  return { send, stop };
}

export default useChatTransport;
