import { useState } from 'react';
import { Github } from 'lucide-react';
import { Modal, Button, Field, TextInput, useToast } from '@/components/ui';
import { apiClient } from '@/services/api';
import styles from './InstallFromGithubModal.module.css';

export interface InstallFromGithubModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful install so the parent can refresh its list. */
  onInstalled: () => void;
  className?: string;
}

/**
 * Install a Skill from a GitHub repository. Collects a repository URL and an
 * optional subdirectory (for monorepos), then POSTs to the install endpoint.
 * On success it clears the form, closes the modal and notifies the parent.
 */
export function InstallFromGithubModal({
  open,
  onClose,
  onInstalled,
  className,
}: InstallFromGithubModalProps) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [subdirectory, setSubdirectory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError('请输入 GitHub 仓库地址');
      return;
    }
    setUrlError(undefined);
    setSubmitting(true);
    try {
      const res = await apiClient.installSkillFromGithub(
        trimmed,
        subdirectory.trim() || undefined,
      );
      const names = res.skills.map((s) => s.name).join('、');
      toast.success(`已安装 ${res.count} 个 Skill`, names || '安装成功');
      setUrl('');
      setSubdirectory('');
      onClose();
      onInstalled();
    } catch (err) {
      toast.error('安装失败', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="从 GitHub 安装 Skill"
      size="sm"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            取消
          </Button>
          <Button
            icon={<Github size={16} />}
            loading={submitting}
            onClick={handleSubmit}
          >
            安装
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Field label="仓库地址" required error={urlError}>
          <TextInput
            value={url}
            error={Boolean(urlError)}
            placeholder="https://github.com/owner/repo"
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <Field
          label="子目录"
          helper="用于 monorepo 子目录，如 skills/my-skill"
        >
          <TextInput
            value={subdirectory}
            placeholder="skills/my-skill"
            onChange={(e) => setSubdirectory(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

export default InstallFromGithubModal;
