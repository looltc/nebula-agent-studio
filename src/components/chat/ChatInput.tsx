import { useCallback, useEffect, useRef, useState } from 'react';
import { SendHorizontal, Paperclip, Square } from 'lucide-react';
import { Button } from '@/components/ui';
import styles from './ChatInput.module.css';

export interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  /** When this value changes (e.g. agent switch), the field clears + refocuses. */
  agentId?: string | null;
  placeholder?: string;
}

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 200;

/**
 * Auto-growing chat input. Enter sends, Shift+Enter inserts a newline.
 * While streaming, the send button morphs into a red Stop button.
 */
export function ChatInput({
  onSend,
  onStop,
  streaming,
  disabled = false,
  agentId,
  placeholder = 'Type a message…',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  // Clear + refocus when the agent changes (and on first mount).
  useEffect(() => {
    setValue('');
    const t = window.setTimeout(() => {
      textareaRef.current?.focus();
      autoResize();
    }, 0);
    return () => window.clearTimeout(t);
  }, [agentId, autoResize]);

  const send = useCallback(() => {
    const text = value.trim();
    if (!text || streaming || disabled) return;
    onSend(text);
    setValue('');
    const el = textareaRef.current;
    if (el) el.style.height = `${MIN_HEIGHT}px`;
    textareaRef.current?.focus();
  }, [value, streaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      autoResize();
    },
    [autoResize],
  );

  const canSend = value.trim().length > 0 && !streaming && !disabled;

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        <span className={styles.attach} aria-hidden="true" title="Attach (decorative)">
          <Paperclip size={18} />
        </span>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder={placeholder}
          value={value}
          rows={1}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Message"
        />
        {streaming ? (
          <Button
            variant="danger"
            icon={<Square size={16} />}
            onClick={onStop}
            aria-label="Stop generation"
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            icon={<SendHorizontal size={16} />}
            onClick={send}
            disabled={!canSend}
            aria-label="Send message"
          >
            Send
          </Button>
        )}
      </div>
    </div>
  );
}

export default ChatInput;
