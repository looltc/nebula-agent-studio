import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Github, Search, Puzzle, Trash2 } from 'lucide-react';
import { ContentHeader, PageContainer } from '@/components/layout';
import { Button, TextInput, Skeleton, EmptyState, Modal, useToast } from '@/components/ui';
import { SkillCard, SkillDetailModal, InstallFromGithubModal } from '@/components/skills';
import { useAgentStore } from '@/stores/agentStore';
import { apiClient } from '@/services/api';
import type { SkillInfo } from '@/types/api';
import styles from './SkillHubPage.module.css';

/**
 * Skill Hub management page. Lists installed skills, supports uploading a
 * zip package, installing from GitHub, toggling, viewing detail and
 * uninstalling.
 */
export default function SkillHubPage() {
  const skills = useAgentStore((s) => s.skills);
  const loadSkills = useAgentStore((s) => s.loadSkills);
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SkillInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailName, setDetailName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadSkills().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadSkills]);

  const displayedSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, query]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await apiClient.uploadSkill(file);
      const names = res.skills.map((s) => s.name).join('、');
      toast.success(`已安装 ${res.count} 个 Skill`, names || '安装成功');
      await loadSkills();
    } catch (err) {
      toast.error('安装失败', err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deleteSkill(deleteTarget.name);
      toast.success('Skill 已卸载', `"${deleteTarget.name}" 已删除。`);
      setDeleteTarget(null);
      await loadSkills();
    } catch (err) {
      toast.error('卸载失败', err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (name: string) => {
    try {
      await apiClient.toggleSkill(name);
      await loadSkills();
    } catch (err) {
      toast.error('操作失败', err instanceof Error ? err.message : String(err));
    }
  };

  const emptyAction = (
    <>
      <Button
        variant="secondary"
        icon={<Upload size={16} />}
        loading={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        上传 Skill 包
      </Button>
      <Button
        variant="primary"
        icon={<Github size={16} />}
        onClick={() => setInstallOpen(true)}
      >
        从 GitHub 安装
      </Button>
    </>
  );

  return (
    <PageContainer>
      <ContentHeader
        title="Skill Hub"
        subtitle="管理已安装的 Agent Skill，支持上传 zip 包或从 GitHub 安装。"
        actions={
          <>
            <input
              type="file"
              accept=".zip"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <Button
              variant="secondary"
              icon={<Upload size={16} />}
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              上传 Skill 包
            </Button>
            <Button
              variant="primary"
              icon={<Github size={16} />}
              onClick={() => setInstallOpen(true)}
            >
              从 GitHub 安装
            </Button>
          </>
        }
        filters={
          <div className={styles.controls}>
            <TextInput
              icon={<Search size={14} />}
              placeholder="搜索 Skill"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.search}
              aria-label="搜索 Skill"
            />
          </div>
        }
      />

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={180} />
          ))}
        </div>
      ) : displayedSkills.length === 0 ? (
        <EmptyState
          icon={<Puzzle size={28} />}
          title="尚无 Skill"
          description="上传 zip 包或从 GitHub 安装你的第一个 Skill。"
          action={emptyAction}
        />
      ) : (
        <div className={styles.grid}>
          {displayedSkills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              onOpenDetail={setDetailName}
              onToggle={handleToggle}
              onDeleteRequest={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <SkillDetailModal name={detailName} onClose={() => setDetailName(null)} />
      <InstallFromGithubModal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        onInstalled={loadSkills}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="卸载 Skill"
        danger
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              loading={deleting}
              onClick={confirmDelete}
            >
              卸载
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          确定要卸载 <strong>{deleteTarget?.name}</strong> 吗？此操作无法撤销。
        </p>
      </Modal>
    </PageContainer>
  );
}
