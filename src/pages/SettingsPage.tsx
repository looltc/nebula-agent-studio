import { useEffect, useState } from 'react';
import {
  Plus,
  X,
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
  useToast,
} from '@/components/ui';
import { useConfigStore } from '@/stores/configStore';
import { useUIStore } from '@/stores/uiStore';
import { cx } from '@/lib/cx';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
  const providers = useConfigStore((s) => s.providers);
  const models = useConfigStore((s) => s.models);
  const tools = useConfigStore((s) => s.tools);
  const loading = useConfigStore((s) => s.loading);
  const budget = useConfigStore((s) => s.budget);
  const loadTools = useConfigStore((s) => s.loadTools);
  const setBudget = useConfigStore((s) => s.setBudget);
  const addProvider = useConfigStore((s) => s.addProvider);
  const addModel = useConfigStore((s) => s.addModel);

  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const toast = useToast();

  const [newProvider, setNewProvider] = useState('');
  const [newModel, setNewModel] = useState('');
  const [hiddenProviders, setHiddenProviders] = useState<string[]>([]);
  const [hiddenModels, setHiddenModels] = useState<string[]>([]);

  // Local string state for budget inputs (lets users type freely).
  const [dailyCapInput, setDailyCapInput] = useState(String(budget.dailyCap));
  const [warningInput, setWarningInput] = useState(String(budget.warningThreshold));
  const [criticalInput, setCriticalInput] = useState(String(budget.criticalThreshold));

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const shownProviders = providers.filter((p) => !hiddenProviders.includes(p));
  const shownModels = models.filter((m) => !hiddenModels.includes(m));

  const handleAddProvider = () => {
    const name = newProvider.trim();
    if (!name) return;
    addProvider(name);
    setHiddenProviders((prev) => prev.filter((p) => p !== name));
    setNewProvider('');
    toast.success('Provider added', name);
  };

  const handleRemoveProvider = (name: string) => {
    setHiddenProviders((prev) => [...prev, name]);
    toast.info('Provider removed', name);
  };

  const handleAddModel = () => {
    const name = newModel.trim();
    if (!name) return;
    addModel(name);
    setHiddenModels((prev) => prev.filter((m) => m !== name));
    setNewModel('');
    toast.success('Model added', name);
  };

  const handleRemoveModel = (name: string) => {
    setHiddenModels((prev) => [...prev, name]);
    toast.info('Model removed', name);
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
    toast.success('Budget saved', 'Your cost budget has been persisted.');
  };

  const usageExample = budget.dailyCap * 0.24;

  return (
    <PageContainer>
      <ContentHeader
        title="Settings"
        subtitle="Configure providers, tools, budget, and appearance."
      />

      <div className={styles.sections}>
        {/* ===== Appearance ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<Sun size={14} />}>Appearance</SectionTitle>
          <div className={styles.themeRow}>
            <div className={styles.themeMeta}>
              <span className={styles.themeLabel}>
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
              </span>
              <p className={styles.themeHint}>
                Switch between dark and light themes. Your choice is remembered.
              </p>
            </div>
            <Toggle
              checked={theme === 'dark'}
              onChange={toggleTheme}
              aria-label="Toggle dark mode"
            />
          </div>
        </Card>

        {/* ===== LLM Provider ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<Cpu size={14} />}>LLM Provider</SectionTitle>

          <div className={styles.subBlock}>
            <div className={styles.subHead}>
              <span className={styles.subTitle}>Providers</span>
              <span className={styles.subCount}>{shownProviders.length}</span>
            </div>
            {shownProviders.length > 0 ? (
              <div className={styles.chips}>
                {shownProviders.map((p) => (
                  <span key={p} className={styles.chip}>
                    <Badge variant="mono">{p}</Badge>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => handleRemoveProvider(p)}
                      aria-label={`Remove provider ${p}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.emptyInline}>No providers configured.</p>
            )}
            <div className={styles.addRow}>
              <TextInput
                value={newProvider}
                placeholder="provider name"
                onChange={(e) => setNewProvider(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddProvider();
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={handleAddProvider}
              >
                Add
              </Button>
            </div>
          </div>

          <div className={styles.subBlock}>
            <div className={styles.subHead}>
              <span className={styles.subTitle}>Models</span>
              <span className={styles.subCount}>{shownModels.length}</span>
            </div>
            {shownModels.length > 0 ? (
              <div className={styles.chips}>
                {shownModels.map((m) => (
                  <span key={m} className={styles.chip}>
                    <Badge variant="mono">{m}</Badge>
                    <button
                      type="button"
                      className={styles.chipRemove}
                      onClick={() => handleRemoveModel(m)}
                      aria-label={`Remove model ${m}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.emptyInline}>No models configured.</p>
            )}
            <div className={styles.addRow}>
              <TextInput
                value={newModel}
                placeholder="model name"
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddModel();
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={handleAddModel}
              >
                Add
              </Button>
            </div>
          </div>
        </Card>

        {/* ===== Tools ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<Wrench size={14} />}>
            Tools
            <span className={styles.subCount}>{tools.length}</span>
          </SectionTitle>
          {loading && tools.length === 0 ? (
            <p className={styles.emptyInline}>Loading tools…</p>
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
                        {t.dangerous ? 'DANGER' : 'SAFE'}
                      </Badge>
                    </div>
                    {t.description && <p className={styles.toolDesc}>{t.description}</p>}
                    {t.timeout_s !== null && t.timeout_s !== undefined && (
                      <div className={styles.toolMeta}>timeout: {t.timeout_s}s</div>
                    )}
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Wrench size={24} />}
              title="No tools registered"
              description="Tools will appear here once the backend exposes them at /api/tools."
            />
          )}
        </Card>

        {/* ===== Cost Budget ===== */}
        <Card className={styles.section}>
          <SectionTitle icon={<DollarSign size={14} />}>Cost Budget</SectionTitle>
          <div className={styles.budgetGrid}>
            <Field label="Daily Cap ($)" helper="Hard limit per day.">
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
            <Field label="Warning Threshold" helper="0 – 1 (e.g. 0.8 = 80%).">
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
            <Field label="Critical Threshold" helper="0 – 1 (e.g. 0.9 = 90%).">
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
              <span className={styles.usageLabel}>Current usage (example)</span>
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
              Save Budget
            </Button>
          </div>
        </Card>
      </div>
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
