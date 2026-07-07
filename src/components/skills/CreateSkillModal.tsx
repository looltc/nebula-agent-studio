import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Modal, Button, Field, TextInput, TextArea, useToast } from '@/components/ui';
import { apiClient } from '@/services/api';
import styles from './InstallFromGithubModal.module.css';

export interface CreateSkillModalProps {
  open: boolean;
  onClose: () => void;
  /** 创建成功后回调（父组件刷新列表）。 */
  onCreated: () => void;
  className?: string;
}

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * 本地新建 Skill：填写 name / description / body / license / compatibility，
 * POST /api/skills/create 后写入 SKILL.md 并同步 DB 索引。
 */
export function CreateSkillModal({
  open,
  onClose,
  onCreated,
  className,
}: CreateSkillModalProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [license, setLicense] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [descError, setDescError] = useState<string | undefined>(undefined);

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const reset = () => {
    setName('');
    setDescription('');
    setBody('');
    setLicense('');
    setCompatibility('');
    setNameError(undefined);
    setDescError(undefined);
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    let hasError = false;
    if (!trimmedName) {
      setNameError('请输入 Skill 名称');
      hasError = true;
    } else if (!NAME_PATTERN.test(trimmedName)) {
      setNameError('名称只能包含小写字母、数字和连字符');
      hasError = true;
    } else if (trimmedName.length > 64) {
      setNameError('名称不能超过 64 个字符');
      hasError = true;
    } else {
      setNameError(undefined);
    }
    if (!trimmedDesc) {
      setDescError('请输入描述');
      hasError = true;
    } else {
      setDescError(undefined);
    }
    if (hasError) return;

    setSubmitting(true);
    try {
      await apiClient.createSkill({
        name: trimmedName,
        description: trimmedDesc,
        body: body.trim() || undefined,
        license: license.trim() || null,
        compatibility: compatibility.trim() || null,
      });
      toast.success('Skill 已创建', `"${trimmedName}" 已就绪`);
      reset();
      onClose();
      onCreated();
    } catch (err) {
      toast.error('创建失败', err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="新建 Skill"
      size="md"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            取消
          </Button>
          <Button
            icon={<Sparkles size={16} />}
            loading={submitting}
            onClick={handleSubmit}
          >
            创建
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Field
          label="名称"
          required
          error={nameError}
          helper="小写字母、数字、连字符，如 my-skill"
        >
          <TextInput
            value={name}
            error={Boolean(nameError)}
            placeholder="my-skill"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="描述" required error={descError}>
          <TextInput
            value={description}
            error={Boolean(descError)}
            placeholder="一句话说明这个 Skill 做什么"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="正文（SKILL.md body）" helper="Markdown 格式的指令正文">
          <TextArea
            value={body}
            placeholder="# My Skill&#10;&#10;告诉 Agent 如何使用这个 Skill…"
            rows={6}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
        <div className={styles.row}>
          <Field label="License">
            <TextInput
              value={license}
              placeholder="MIT"
              onChange={(e) => setLicense(e.target.value)}
            />
          </Field>
          <Field label="兼容性">
            <TextInput
              value={compatibility}
              placeholder=">=1.0"
              onChange={(e) => setCompatibility(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

export default CreateSkillModal;
