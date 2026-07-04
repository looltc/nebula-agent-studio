import { useEffect, useMemo, useState } from 'react';
import { Plus, Sparkles, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Modal,
  Button,
  Field,
  TextInput,
  TextArea,
  Select,
  useToast,
} from '@/components/ui';
import { useOrchestStore } from '@/stores/orchestStore';
import { useAgentStore } from '@/stores/agentStore';
import { cx } from '@/lib/cx';
import type { GenerateGraphResponse, GraphSpec } from '@/types/api';
import styles from './CreateSpecModal.module.css';

export interface CreateSpecModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
}

type Tab = 'blank' | 'template' | 'ai';

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: 'blank', label: '空白编排图', icon: <Plus size={14} /> },
  { key: 'template', label: '从模板新建', icon: <FileText size={14} /> },
  { key: 'ai', label: 'AI 生成图', icon: <Sparkles size={14} /> },
];

/**
 * 创建编排图 Modal（Phase C 入口）。
 *
 * 3 个 Tab：
 * - 空白编排图：仅输入名称，快速创建空 spec
 * - 从模板新建：选择内置模板（串行链 / 并行 fan-out / 自反思循环），实例化为新编排图
 * - AI 生成图：输入任务描述 + 选择 Agent，调 LLM 生成 GraphSpec，预览后保存
 *
 * 设计文档：26-node-system-v2.md §九 Phase C
 */
export default function CreateSpecModal({ open, onClose, className }: CreateSpecModalProps) {
  const specs = useOrchestStore((s) => s.specs);
  const createSpec = useOrchestStore((s) => s.createSpec);
  const selectSpec = useOrchestStore((s) => s.selectSpec);
  const templates = useOrchestStore((s) => s.templates);
  const loadTemplates = useOrchestStore((s) => s.loadTemplates);
  const instantiateTemplate = useOrchestStore((s) => s.instantiateTemplate);
  const generateGraph = useOrchestStore((s) => s.generateGraph);
  const generatingGraph = useOrchestStore((s) => s.generatingGraph);
  const agents = useAgentStore((s) => s.agents);
  const loadAgents = useAgentStore((s) => s.loadAgents);
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('blank');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 模板 Tab 状态
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);

  // AI 生成 Tab 状态
  const [task, setTask] = useState('');
  const [agentId, setAgentId] = useState<string>('');
  const [genResult, setGenResult] = useState<GenerateGraphResponse | null>(null);

  // 打开时重置 + 懒加载模板/agent 列表
  useEffect(() => {
    if (open) {
      setTab('blank');
      setName('');
      setSubmitting(false);
      setSelectedTemplateKey(null);
      setTask('');
      setAgentId('');
      setGenResult(null);
      void loadTemplates();
      void loadAgents();
    }
  }, [open, loadTemplates, loadAgents]);

  const defaultName = useMemo(() => `编排图 ${specs.length + 1}`, [specs.length]);

  // ---------- 空白编排图 ----------
  const handleCreateBlank = async () => {
    setSubmitting(true);
    try {
      const finalName = name.trim() || defaultName;
      const detail = await createSpec({ name: finalName });
      if (detail) {
        await selectSpec(detail.id);
        toast.success('已创建', finalName);
        onClose();
      }
    } catch {
      toast.error('创建失败', '请查看控制台');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- 从模板新建 ----------
  const handleInstantiate = async () => {
    if (!selectedTemplateKey) {
      toast.warning('未选择模板', '请先选择一个模板');
      return;
    }
    setSubmitting(true);
    try {
      const tpl = templates.find((t) => t.key === selectedTemplateKey);
      const finalName = name.trim() || tpl?.name || defaultName;
      const detail = await instantiateTemplate(selectedTemplateKey, finalName);
      if (detail) {
        await selectSpec(detail.id);
        toast.success('已从模板创建', `${finalName} · ${tpl?.name ?? ''}`);
        onClose();
      }
    } catch {
      toast.error('实例化失败', '请查看控制台');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- AI 生成图 ----------
  const handleGenerate = async () => {
    if (!task.trim()) {
      toast.warning('任务描述为空', '请输入要生成的图任务描述');
      return;
    }
    setGenResult(null);
    const result = await generateGraph({
      task: task.trim(),
      agent_id: agentId || null,
      max_retries: 1,
    });
    if (!result) {
      toast.error('生成失败', '请查看控制台');
      return;
    }
    setGenResult(result);
    if (result.ok && result.spec) {
      toast.success(
        '图生成成功',
        `${result.spec.nodes.length} 节点 · ${result.spec.edges.length} 边`,
      );
    } else {
      toast.error(
        '生成未通过校验',
        `${result.errors.length} 个错误，请在预览中查看`,
      );
    }
  };

  const handleSaveGenerated = async () => {
    if (!genResult?.ok || !genResult.spec) return;
    setSubmitting(true);
    try {
      const finalName = name.trim() || genResult.spec.name || defaultName;
      const detail = await createSpec({
        name: finalName,
        spec: genResult.spec as GraphSpec,
      });
      if (detail) {
        await selectSpec(detail.id);
        toast.success('已保存', finalName);
        onClose();
      }
    } catch {
      toast.error('保存失败', '请查看控制台');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新建编排图"
      size="lg"
      className={className}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting || generatingGraph}>
            取消
          </Button>
          {tab === 'blank' && (
            <Button onClick={handleCreateBlank} loading={submitting} icon={<Plus size={16} />}>
              创建
            </Button>
          )}
          {tab === 'template' && (
            <Button
              onClick={handleInstantiate}
              loading={submitting}
              disabled={!selectedTemplateKey}
              icon={<FileText size={16} />}
            >
              实例化
            </Button>
          )}
          {tab === 'ai' && (
            <>
              <Button
                variant="secondary"
                onClick={handleGenerate}
                loading={generatingGraph}
                icon={<Sparkles size={16} />}
              >
                生成
              </Button>
              <Button
                onClick={handleSaveGenerated}
                loading={submitting}
                disabled={!genResult?.ok || !genResult.spec}
                icon={<CheckCircle2 size={16} />}
              >
                保存为新编排图
              </Button>
            </>
          )}
        </>
      }
    >
      <div className={styles.body}>
        {/* Tab 切换 */}
        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={cx(styles.tab, tab === t.key && styles.tabActive)}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* 名称（所有 Tab 共用，AI 生成 Tab 在生成成功后用于命名） */}
        <section className={styles.section}>
          <Field
            label="编排图名称"
            helper={tab === 'ai' ? '生成成功后保存时使用（留空用默认名或 LLM 生成的 name）' : '留空则使用默认名'}
          >
            <TextInput
              value={name}
              placeholder={defaultName}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        </section>

        {/* ===== 空白编排图 ===== */}
        {tab === 'blank' && (
          <section className={styles.section}>
            <div className={styles.hintBox}>
              <Plus size={16} />
              <span>创建一个空白编排图，进入编辑器后手动添加节点和边。</span>
            </div>
          </section>
        )}

        {/* ===== 从模板新建 ===== */}
        {tab === 'template' && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>选择模板</h3>
            {templates.length === 0 ? (
              <div className={styles.empty}>暂无可用模板</div>
            ) : (
              <ul className={styles.templateList}>
                {templates.map((tpl) => {
                  const isActive = selectedTemplateKey === tpl.key;
                  return (
                    <li key={tpl.key}>
                      <button
                        type="button"
                        className={cx(styles.templateItem, isActive && styles.templateItemActive)}
                        onClick={() => setSelectedTemplateKey(tpl.key)}
                      >
                        <div className={styles.templateHead}>
                          <span className={styles.templateName}>{tpl.name}</span>
                          <span className={styles.templateKey}>{tpl.key}</span>
                        </div>
                        <p className={styles.templateDesc}>{tpl.desc}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ===== AI 生成图 ===== */}
        {tab === 'ai' && (
          <>
            <section className={styles.section}>
              <Field
                label="任务描述"
                helper="用自然语言描述要解决的任务，LLM 会根据任务生成合适的编排图"
              >
                <TextArea
                  value={task}
                  placeholder="例如：写一篇关于 AI Agent 的研究报告，先搜索资料再撰写"
                  rows={4}
                  onChange={(e) => setTask(e.target.value)}
                />
              </Field>
            </section>

            <section className={styles.section}>
              <Field
                label="使用 Agent 的 LLM"
                helper="留空则自动用第一个可用 Agent；指定 Agent 会使用其配置的 LLM"
              >
                <Select
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                >
                  <option value="">自动选择</option>
                  {agents
                    .filter((a) => a.enabled)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}（{a.id}）
                      </option>
                    ))}
                </Select>
              </Field>
            </section>

            {/* 生成结果预览 */}
            {genResult && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  生成结果
                  {genResult.ok ? (
                    <span className={cx(styles.badge, styles.badgeOk)}>
                      <CheckCircle2 size={11} />
                      成功
                    </span>
                  ) : (
                    <span className={cx(styles.badge, styles.badgeErr)}>
                      <AlertCircle size={11} />
                      失败
                    </span>
                  )}
                </h3>

                {genResult.ok && genResult.spec ? (
                  <div className={styles.specPreview}>
                    <div className={styles.specMeta}>
                      <span className={styles.specName}>{genResult.spec.name}</span>
                      <span className={styles.specCount}>
                        {genResult.spec.nodes.length} 节点 · {genResult.spec.edges.length} 边
                      </span>
                    </div>
                    <ul className={styles.nodeList}>
                      {genResult.spec.nodes.map((n) => (
                        <li key={n.id} className={styles.nodeRow}>
                          <span className={styles.nodeId}>{n.id}</span>
                          <span className={styles.nodeType}>{n.type}</span>
                          {n.label && <span className={styles.nodeLabel}>{n.label}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className={styles.errorList}>
                    {genResult.errors.map((err, i) => (
                      <li key={i} className={styles.errorItem}>
                        <AlertCircle size={12} />
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {genResult.raw_output && (
                  <details className={styles.rawDetails}>
                    <summary>查看 LLM 原始输出</summary>
                    <pre className={styles.rawPre}>{genResult.raw_output}</pre>
                  </details>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
