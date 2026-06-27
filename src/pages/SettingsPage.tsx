import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Zap,
  ListChecks,
  Wrench,
  Cpu,
  DollarSign,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { ContentHeader, PageContainer } from '@/components/layout';
import {
  Card,
  Badge,
  Button,
  Field,
  TextInput,
  Toggle,
  ProgressBar,
  EmptyState,
  Modal,
  useToast,
} from '@/components/ui';
import { useConfigStore } from '@/stores/configStore';
import { useUIStore } from '@/stores/uiStore';
import type { ProviderSummary } from '@/types/api';
import { cx } from '@/lib/cx';
import styles from './SettingsPage.module.css';

interface ProviderFormState {
  name: string;
  base_url: string;
  api_key: string;
}

interface TestResult {
  status: 'ok' | 'error';
  models?: string[];
  error?: string;
}

export default function SettingsPage() {
  const providers = useConfigStore((s) => s.providers);
  const providerModels = useConfigStore((s) => s.providerModels);
  const tools = useConfigStore((s) => s.tools);
  const loading = useConfigStore((s) => s.loading);
  const budget = useConfigStore((s) => s.budget);
  const loadProviders = useConfigStore((s) => s.loadProviders);
  const loadTools = useConfigStore((s) => s.loadTools);
  const createProvider = useConfigStore((s) => s.createProvider);
  const updateProvider = useConfigStore((s) => s.updateProvider);
  const deleteProvider = useConfigStore((s) => s.deleteProvider);
  const testProvider = useConfigStore((s) => s.testProvider);
  const loadProviderModels = useConfigStore((s) => s.loadProviderModels);
  const setBudget = useConfigStore((s) => s.setBudget);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const toast = useToast();

  // Provider modal state
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ProviderSummary | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderFormState>({
    name: '',
    base_url: '',
    api_key: '',
  });
  const [providerSaving, setProviderSaving] = useState(false);

  // Per-provider async state
  const [testingIds, setTestingIds] = useState<Record<string, boolean>>({});
  const [loadingModelIds, setLoadingModelIds] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ProviderSummary | null>(null);
  const [deletingProvider, setDeletingProvider] = useState(false);

  // Local string state for budget inputs (lets users type freely).
  const [dailyCapInput, setDailyCapInput] = useState(String(budget.dailyCap));
  const [warningInput, setWarningInput] = useState(String(budget.warningThreshold));
  const [criticalInput, setCriticalInput] = useState(String(budget.criticalThreshold));

  useEffect(() => {
    loadProviders();
    loadTools();
  }, [loadProviders, loadTools]);

  const openCreateProvider = () => {
    setEditingProvider(null);
    setProviderForm({ name: '', base_url: '', api_key: '' });
    setProviderModalOpen(true);
  };

  const openEditProvider = (provider: ProviderSummary) => {
    setEditingProvider(provider);
    setProviderForm({
      name: provider.name,
      base_url: provider.base_url ?? '',
      api_key: '',
    });
    setProviderModalOpen(true);
  };

  const handleSaveProvider = async () => {
    const name = providerForm.name.trim();
    if (!name) {
      toast.error('名称不能为空', '请填写供应商名称');
      return;
    }
    setProviderSaving(true);
    try {
      const body = {
        name,
        base_url: providerForm.base_url.trim() || null,
        api_key: providerForm.api_key.trim() || null,
      };
      const ok = editingProvider
        ? await updateProvider(editingProvider.id, body)
        : await createProvider(body);
      if (ok) {
        toast.success(
          editingProvider ? '供应商已更新' : '供应商已创建',
          name,
        );
        setProviderModalOpen(false);
      } else {
        toast.error('保存失败', '请检查后端连接或重试');
      }
    } finally {
      setProviderSaving(false);
    }
  };

  const handleTestProvider = async (provider: ProviderSummary) => {
    setTestingIds((prev) => ({ ...prev, [provider.id]: true }));
    try {
      const res: TestResult = await testProvider(provider.id);
      setTestResults((prev) => ({ ...prev, [provider.id]: res }));
      if (res.status === 'ok') {
        toast.success(
          '连接成功',
          `共 ${res.models?.length ?? 0} 个模型可用`,
        );
      } else {
        toast.error('连接失败', res.error ?? '未知错误');
      }
    } finally {
      setTestingIds((prev) => ({ ...prev, [provider.id]: false }));
    }
  };

  const handleLoadModels = async (provider: ProviderSummary) => {
    setLoadingModelIds((prev) => ({ ...prev, [provider.id]: true }));
    try {
      const models = await loadProviderModels(provider.id);
      if (models.length > 0) {
        toast.success('模型已加载', `${provider.name}：${models.length} 个模型`);
      } else {
        toast.info('无可用模型', `${provider.name} 未返回模型列表`);
      }
    } finally {
      setLoadingModelIds((prev) => ({ ...prev, [provider.id]: false }));
    }
  };

  const confirmDeleteProvider = async () => {
    if (!deleteTarget) return;
    setDeletingProvider(true);
    try {
      const ok = await deleteProvider(deleteTarget.id);
      if (ok) {
        toast.success('供应商已删除', deleteTarget.name);
        setDeleteTarget(null);
      } else {
        toast.error('删除失败', '请检查后端连接或重试');
      }
    } finally {
      setDeletingProvider(false);
    }
  };

  const commitBudget = (
    field: 'dailyCap' | 'warningThreshold' | 'criticalThreshold',
    raw: string,
  ) => {
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    setBudget({ [field]: n } as Partial<typeof budget>);
  };

  const saveBudget = () => {
    commitBudget('dailyCap', dailyCapInput);
    commitBudget('warningThreshold', warningInput);
    commitBudget('criticalThreshold', criticalInput);
    toast.success('预算已保存', '成本预算已持久化');
  };

  const usageExample = budget.dailyCap * 0.24;

  return (
    <PageContainer>
      <ContentHeader
        title="设置"
        subtitle="配置 LLM 供应商、工具、成本预算与外观主题。"
      />

      <div className={styles.sections}>
        {/* ===== Appearance ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<Sun size={14} />}>外观</SectionTitle>
          <div className={styles.themeRow}>
            <div className={styles.themeMeta}>
              <span className={styles.themeLabel}>
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                <span>{theme === 'dark' ? '深色模式' : '浅色模式'}</span>
              </span>
              <p className={styles.themeHint}>
                在深色与浅色主题之间切换，你的选择会被记住。
              </p>
            </div>
            <Toggle
              checked={theme === 'dark'}
              onChange={toggleTheme}
              aria-label="切换深色模式"
            />
          </div>
        </Card>

        {/* ===== LLM Provider ===== */}
        <Card className={styles.section}>
          <div className={styles.sectionHead}>
            <SectionTitle icon={<Cpu size={14} />}>LLM 供应商</SectionTitle>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={openCreateProvider}
            >
              添加供应商
            </Button>
          </div>

          {providers.length > 0 ? (
            <div className={styles.providerList}>
              {providers.map((provider) => {
                const models = providerModels[provider.id] ?? [];
                const result = testResults[provider.id];
                const isTesting = testingIds[provider.id];
                const isLoadingModels = loadingModelIds[provider.id];
                return (
                  <Card key={provider.id} className={styles.providerCard}>
                    <div className={styles.providerHead}>
                      <div className={styles.providerInfo}>
                        <span className={styles.providerName}>{provider.name}</span>
                        <Badge variant={provider.api_key_set ? 'success' : 'default'}>
                          {provider.api_key_set ? '已配置' : '未配置'}
                        </Badge>
                      </div>
                      <div className={styles.providerMeta}>
                        <span>
                          <span className={styles.providerUrlLabel}>base_url:</span>
                          <span className={styles.providerUrl}>
                            {provider.base_url ?? '默认'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {models.length > 0 && (
                      <div className={styles.modelBadges}>
                        <span className={styles.modelBadgesLabel}>
                          模型 ({models.length})
                        </span>
                        {models.map((m) => (
                          <Badge key={m} variant="mono">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {result && (
                      <div
                        className={cx(
                          styles.testResult,
                          result.status === 'ok'
                            ? styles.testResultOk
                            : styles.testResultError,
                        )}
                      >
                        {result.status === 'ok'
                          ? `连接成功，共 ${result.models?.length ?? 0} 个模型可用`
                          : `连接失败：${result.error ?? '未知错误'}`}
                      </div>
                    )}

                    <div className={styles.providerActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Zap size={14} />}
                        loading={isTesting}
                        onClick={() => handleTestProvider(provider)}
                      >
                        测试连接
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ListChecks size={14} />}
                        loading={isLoadingModels}
                        onClick={() => handleLoadModels(provider)}
                      >
                        加载模型
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={14} />}
                        onClick={() => openEditProvider(provider)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => setDeleteTarget(provider)}
                      >
                        删除
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Cpu size={24} />}
              title="尚未配置供应商"
              description="添加一个 LLM 供应商以开始创建 Agent。"
              action={
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={openCreateProvider}
                >
                  添加供应商
                </Button>
              }
            />
          )}
        </Card>

        {/* ===== Tools ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<Wrench size={14} />}>
            工具
            <span className={styles.sectionCount}>{tools.length}</span>
          </SectionTitle>
          {loading && tools.length === 0 ? (
            <p className={styles.emptyInline}>正在加载工具…</p>
          ) : tools.length > 0 ? (
            <div className={styles.toolGrid}>
              {tools.map((t) => (
                <div key={t.name} className={styles.toolCardWrap}>
                  <Card className={styles.toolCard}>
                    <div className={styles.toolHeader}>
                      <div className={styles.toolId}>
                        <span className={styles.toolIcon} aria-hidden="true">
                          <Wrench size={16} />
                        </span>
                        <span className={styles.toolName}>{t.name}</span>
                      </div>
                      <Badge variant={t.dangerous ? 'danger' : 'success'}>
                        {t.dangerous ? '危险' : '安全'}
                      </Badge>
                    </div>
                    {t.description && <p className={styles.toolDesc}>{t.description}</p>}
                    {t.timeout_s !== null && t.timeout_s !== undefined && (
                      <div className={styles.toolMeta}>超时: {t.timeout_s}s</div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wrench size={24} />}
              title="尚无注册工具"
              description="后端在 /api/tools 暴露工具后将在此显示。"
            />
          )}
        </Card>

        {/* ===== Cost Budget ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<DollarSign size={14} />}>成本预算</SectionTitle>
          <div className={styles.budgetGrid}>
            <Field label="每日上限 ($)" helper="每日硬性上限。">
              <TextInput
                type="number"
                min={0}
                step={1}
                value={dailyCapInput}
                onChange={(e) => {
                  setDailyCapInput(e.target.value);
                  commitBudget('dailyCap', e.target.value);
                }}
              />
            </Field>
            <Field label="预警阈值" helper="0 – 1（例如 0.8 = 80%）。">
              <TextInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={warningInput}
                onChange={(e) => {
                  setWarningInput(e.target.value);
                  commitBudget('warningThreshold', e.target.value);
                }}
              />
            </Field>
            <Field label="临界阈值" helper="0 – 1（例如 0.9 = 90%）。">
              <TextInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={criticalInput}
                onChange={(e) => {
                  setCriticalInput(e.target.value);
                  commitBudget('criticalThreshold', e.target.value);
                }}
              />
            </Field>
          </div>

          <div className={styles.usage}>
            <div className={styles.usageHead}>
              <span className={styles.usageLabel}>当前用量（示例）</span>
              <span className={styles.usageValue}>
                ${usageExample.toFixed(2)} / ${budget.dailyCap.toFixed(2)}
              </span>
            </div>
            <ProgressBar
              value={usageExample}
              max={budget.dailyCap}
              variant={
                usageExample / (budget.dailyCap || 1) >= budget.criticalThreshold
                  ? 'danger'
                  : usageExample / (budget.dailyCap || 1) >= budget.warningThreshold
                    ? 'warning'
                    : 'success'
              }
              size="thick"
            />
          </div>

          <div className={styles.budgetFooter}>
            <Button variant="primary" icon={<Check size={16} />} onClick={saveBudget}>
              保存预算
            </Button>
          </div>
        </Card>
      </div>

      {/* ===== Provider create/edit modal ===== */}
      <Modal
        open={providerModalOpen}
        onClose={() => setProviderModalOpen(false)}
        title={editingProvider ? '编辑供应商' : '添加供应商'}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setProviderModalOpen(false)}
              disabled={providerSaving}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveProvider}
              loading={providerSaving}
              icon={<Check size={16} />}
            >
              保存
            </Button>
          </>
        }
      >
        <div className={styles.providerForm}>
          <Field
            label="供应商名称"
            required
            helper="同时作为 Agent 配置中的 Provider 标识，例如 openai、deepseek。"
          >
            <TextInput
              value={providerForm.name}
              placeholder="openai"
              onChange={(e) =>
                setProviderForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </Field>
          <Field
            label="Base URL"
            helper="可选，例如 https://api.openai.com/v1。"
          >
            <TextInput
              value={providerForm.base_url}
              placeholder="https://api.openai.com/v1"
              onChange={(e) =>
                setProviderForm((prev) => ({ ...prev, base_url: e.target.value }))
              }
            />
          </Field>
          <Field
            label="API Key"
            helper={
              editingProvider
                ? '留空则保持现有密钥不变。'
                : '可选，留空则使用环境变量。'
            }
          >
            <TextInput
              type="password"
              value={providerForm.api_key}
              placeholder="sk-..."
              onChange={(e) =>
                setProviderForm((prev) => ({ ...prev, api_key: e.target.value }))
              }
            />
          </Field>
        </div>
      </Modal>

      {/* ===== Provider delete confirm ===== */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="删除供应商"
        danger
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deletingProvider}
            >
              取消
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={16} />}
              loading={deletingProvider}
              onClick={confirmDeleteProvider}
            >
              删除
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          确定要删除 <strong>{deleteTarget?.name}</strong> 吗？此操作无法撤销。
        </p>
      </Modal>
    </PageContainer>
  );
}

/* ---------- internal ---------- */

function SectionTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cx(styles.sectionTitleWrap)}>
      {icon && (
        <span className={styles.sectionTitleIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className={styles.sectionTitle}>{children}</h2>
    </div>
  );
}
