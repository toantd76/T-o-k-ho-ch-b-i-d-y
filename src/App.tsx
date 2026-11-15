import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AiStatusInfo,
  AppSettings,
  LessonInput,
  LessonPlan,
  LessonTemplate,
  PlanStatus,
  PlanVersion,
  TeacherProfile,
} from './types/lesson';
import { storage } from './lib/storage';
import {
  BUILT_IN_TEMPLATES,
  createDefaultProfile,
  createDefaultSettings,
  createInitialLessonInput,
  createSampleLessonInput,
  createSampleLessonPlan,
} from './lib/templatesAndSamples';
import { createPlanVersionSnapshot } from './lib/lessonLogic';
import { AppRoute, Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewView } from './views/OverviewView';
import { WizardView } from './views/WizardView';
import { EditorView } from './views/EditorView';
import { LibraryView } from './views/LibraryView';
import { TemplatesView } from './views/TemplatesView';
import { GuideView } from './views/GuideView';
import { SettingsView } from './views/SettingsView';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<AppRoute>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const [profile, setProfile] = useState<TeacherProfile>(createDefaultProfile);
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [templates, setTemplates] = useState<LessonTemplate[]>(BUILT_IN_TEMPLATES);
  const [activePlan, setActivePlan] = useState<LessonPlan | null>(null);
  const [activePlanVersions, setActivePlanVersions] = useState<PlanVersion[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatusInfo | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardInput, setWizardInput] = useState<LessonInput>(() => createInitialLessonInput());
  const [hasSavedWizardDraft, setHasSavedWizardDraft] = useState(false);

  // Library search
  const [searchQuery, setSearchQuery] = useState('');

  // Save state & Toast
  const [saveStatusText, setSaveStatusText] = useState('Đã lưu cục bộ');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const autoSaveTimerRef = useRef<number | null>(null);
  const wizardDraftTimerRef = useRef<number | null>(null);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  // Sync light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Scroll to top when switching views
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeRoute]);

  // Initial load from IndexedDB + server AI status
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const [loadedProfile, loadedSettings, loadedPlans, loadedTemplates, loadedDraft] =
          await Promise.all([
            storage.getProfile(),
            storage.getSettings(),
            storage.getAllPlans(),
            storage.getAllTemplates(),
            storage.getWizardDraft(),
          ]);

        if (!mounted) return;
        setProfile(loadedProfile);
        setSettings(loadedSettings);
        setPlans(loadedPlans);
        setTemplates(loadedTemplates);

        if (loadedDraft) {
          setWizardStep(loadedDraft.step);
          setWizardInput(loadedDraft.input);
          setHasSavedWizardDraft(true);
        } else {
          setWizardInput(createInitialLessonInput(loadedProfile));
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === '1') {
          setActiveRoute('wizard');
        }
      } catch {
        if (mounted) {
          notify('Không đọc được dữ liệu lưu trữ cục bộ. Sử dụng phiên làm việc tạm thời.', 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    bootstrap();

    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data: AiStatusInfo) => {
        if (mounted) setAiStatus(data);
      })
      .catch(() => {
        if (mounted) {
          setAiStatus({
            configured: false,
            model: 'gemini-4-hydrogen',
            message: 'Không kết nối được máy chủ kiểm tra trạng thái AI.',
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [notify]);

  const reloadPlans = async () => {
    const all = await storage.getAllPlans();
    setPlans(all);
  };

  // Auto-save wizard draft with debounce
  const handleWizardInputChange = (nextInput: LessonInput) => {
    setWizardInput(nextInput);
    setHasSavedWizardDraft(true);
    if (wizardDraftTimerRef.current) window.clearTimeout(wizardDraftTimerRef.current);
    wizardDraftTimerRef.current = window.setTimeout(async () => {
      try {
        await storage.saveWizardDraft({ step: wizardStep, input: nextInput });
      } catch {
        // Ignore silent draft errors
      }
    }, 500);
  };

  const handleWizardStepChange = (nextStep: number) => {
    setWizardStep(nextStep);
    storage.saveWizardDraft({ step: nextStep, input: wizardInput }).catch(() => undefined);
  };

  const handleStartNewPlan = (initialStep = 1) => {
    setWizardInput(createInitialLessonInput(profile));
    setWizardStep(initialStep);
    setActiveRoute('wizard');
  };

  const handleResumeDraft = () => {
    setActiveRoute('wizard');
  };

  const handleTrySampleInWizard = () => {
    setWizardInput(createSampleLessonInput());
    setWizardStep(1);
    notify('Đã nạp dữ liệu bài dạy minh họa vào quy trình 4 bước.', 'info');
  };

  const handleOpenSamplePlan = () => {
    const sample = createSampleLessonPlan();
    setActivePlan(sample);
    setActivePlanVersions([]);
    setActiveRoute('editor');
    notify(
      'Đang mở Bài dạy minh họa. Thầy/cô có thể chỉnh sửa, kiểm tra và xuất Word hoặc bấm Lưu vào thư viện.',
      'info'
    );
  };

  const handleOpenPlan = async (planId: string) => {
    const found = await storage.getPlanById(planId);
    if (!found) {
      notify('Không tìm thấy kế hoạch này trong bộ nhớ.', 'error');
      return;
    }
    const vers = await storage.getVersionsByPlan(planId);
    setActivePlan(found);
    setActivePlanVersions(vers);
    setActiveRoute('editor');
  };

  const handleGenerateComplete = async (newPlan: LessonPlan) => {
    try {
      await storage.savePlan(newPlan);
      const initialVer = createPlanVersionSnapshot(newPlan, 'Bản khởi tạo ban đầu', '');
      await storage.saveVersion(initialVer);
      await storage.saveWizardDraft(null);
      setHasSavedWizardDraft(false);
      await reloadPlans();
      setActivePlan(newPlan);
      setActivePlanVersions([initialVer]);
      setActiveRoute('editor');
      notify('Đã tạo và lưu kế hoạch bài dạy mới.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi khi lưu kế hoạch mới.', 'error');
    }
  };

  // Debounced auto-save active plan in editor
  const handleUpdateActivePlan = (nextPlan: LessonPlan) => {
    setActivePlan(nextPlan);

    // Nếu đang mở bài mẫu chưa lưu vào thư viện thật, chỉ cập nhật trên state cho đến khi GV bấm Lưu
    if (nextPlan.isSample) {
      setSaveStatusText('Bài minh họa (chưa lưu vào thư viện)');
      return;
    }

    setSaveStatusText('Đang lưu...');
    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await storage.savePlan(nextPlan);
        setPlans((prev) => {
          const exists = prev.some((p) => p.id === nextPlan.id);
          const updated = exists
            ? prev.map((p) => (p.id === nextPlan.id ? nextPlan : p))
            : [nextPlan, ...prev];
          return updated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        });
        setSaveStatusText(`Đã lưu lúc ${new Date().toLocaleTimeString('vi-VN')}`);
      } catch (err) {
        setSaveStatusText('Lỗi lưu dữ liệu');
        notify(err instanceof Error ? err.message : 'Không thể lưu tự động.', 'error');
      }
    }, 600);
  };

  const handleSaveSampleToLibrary = async (samplePlan: LessonPlan) => {
    const realPlan: LessonPlan = {
      ...samplePlan,
      id: `plan-${Date.now()}`,
      isSample: false,
      title: samplePlan.title.replace(/\s*\(Bài minh họa\)/i, ''),
      tags: samplePlan.tags.filter((t) => t !== 'Minh họa'),
      updatedAt: new Date().toISOString(),
    };
    await storage.savePlan(realPlan);
    const ver = createPlanVersionSnapshot(realPlan, 'Lưu từ bài minh họa', '');
    await storage.saveVersion(ver);
    await reloadPlans();
    setActivePlan(realPlan);
    setActivePlanVersions([ver]);
    setSaveStatusText('Đã lưu vào thư viện');
    notify('Đã lưu kế hoạch vào thư viện cá nhân.', 'success');
  };

  const handleSaveVersion = async (version: PlanVersion) => {
    if (activePlan?.isSample) return;
    await storage.saveVersion(version);
    const vers = await storage.getVersionsByPlan(version.planId);
    setActivePlanVersions(vers);
  };

  const handleSaveAsTemplate = async (plan: LessonPlan) => {
    const newTpl: LessonTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: `Mẫu: ${plan.title}`,
      level: plan.inputSnapshot.level,
      structureType: plan.templateType,
      description: `Mẫu lưu từ bài "${plan.title}" (${plan.inputSnapshot.subject}, Lớp ${plan.inputSnapshot.grade}).`,
      isBuiltIn: false,
      referenceNote: 'Mẫu riêng do giáo viên lưu từ bài dạy thực tế.',
      sectionsPreview: [
        'Thông tin chung',
        'I. Mục tiêu',
        'II. Thiết bị & Học liệu',
        ...plan.sessions.map((s) => s.title),
        'Phụ lục & Bảng kiểm',
      ],
      defaultSequenceMode: plan.inputSnapshot.sequenceMode,
      createdAt: new Date().toISOString(),
    };
    await storage.saveTemplate(newTpl);
    setTemplates(await storage.getAllTemplates());
    notify('Đã lưu cấu trúc thành Mẫu riêng trong mục Mẫu kế hoạch.', 'success');
  };

  // Library actions
  const handleDuplicatePlan = async (plan: LessonPlan) => {
    const now = new Date().toISOString();
    const copy: LessonPlan = {
      ...(JSON.parse(JSON.stringify(plan)) as LessonPlan),
      id: `plan-copy-${Date.now()}`,
      title: `${plan.title} (Bản sao)`,
      status: 'nhap',
      isSample: false,
      createdAt: now,
      updatedAt: now,
    };
    await storage.savePlan(copy);
    await reloadPlans();
    notify('Đã tạo bản sao kế hoạch.', 'success');
  };

  const handleRenamePlan = async (planId: string, newTitle: string) => {
    const target = await storage.getPlanById(planId);
    if (!target) return;
    const updated = { ...target, title: newTitle, updatedAt: new Date().toISOString() };
    await storage.savePlan(updated);
    if (activePlan?.id === planId) setActivePlan(updated);
    await reloadPlans();
    notify('Đã đổi tên kế hoạch.', 'success');
  };

  const handleChangePlanStatus = async (planId: string, status: PlanStatus) => {
    const target = await storage.getPlanById(planId);
    if (!target) return;
    const updated = { ...target, status, updatedAt: new Date().toISOString() };
    await storage.savePlan(updated);
    if (activePlan?.id === planId) {
      setActivePlan(status === 'thung_rac' ? null : updated);
    }
    await reloadPlans();
    notify(
      status === 'thung_rac'
        ? 'Đã chuyển kế hoạch vào thùng rác.'
        : status === 'luu_tru'
        ? 'Đã chuyển kế hoạch sang mục Lưu trữ.'
        : 'Đã cập nhật trạng thái kế hoạch.',
      'success'
    );
  };

  const handleDeletePermanent = async (planId: string) => {
    await storage.deletePlanPermanent(planId);
    if (activePlan?.id === planId) setActivePlan(null);
    await reloadPlans();
    notify('Đã xóa vĩnh viễn kế hoạch khỏi thiết bị.', 'success');
  };

  // Template actions
  const handleUseTemplate = (tpl: LessonTemplate) => {
    const base = createInitialLessonInput(profile);
    const resolvedLevel =
      (tpl.structureType === 'thcs_thpt_cv5512' || tpl.structureType === 'thcs_thpt_tien_trinh') &&
      (profile.defaultLevel === 'thcs' || profile.defaultLevel === 'thpt')
        ? profile.defaultLevel
        : tpl.level;
    setWizardInput({
      ...base,
      level: resolvedLevel,
      minutesPerPeriod: profile.defaultMinutesByLevel[resolvedLevel] ?? 45,
      templateId: tpl.id,
      sequenceMode: tpl.defaultSequenceMode,
    });
    setWizardStep(1);
    setActiveRoute('wizard');
    notify(`Đã chọn mẫu "${tpl.name}".`, 'success');
  };

  const handleDeleteCustomTemplate = async (id: string) => {
    await storage.deleteTemplate(id);
    setTemplates(await storage.getAllTemplates());
    notify('Đã xóa mẫu riêng.', 'success');
  };

  // Settings actions
  const handleSaveProfile = async (next: TeacherProfile) => {
    await storage.saveProfile(next);
    setProfile(next);
    notify('Đã lưu hồ sơ giáo viên.', 'success');
  };

  const handleSaveSettings = async (next: AppSettings) => {
    await storage.saveSettings(next);
    setSettings(next);
    notify('Đã lưu tùy chọn giao diện và xuất bản.', 'success');
  };

  const handleToggleTheme = async () => {
    const next: AppSettings = {
      ...settings,
      theme: settings.theme === 'dark' ? 'light' : 'dark',
    };
    setSettings(next);
    await storage.saveSettings(next);
  };

  const handleExportBackup = async () => {
    try {
      const payload = await storage.exportBackup();
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sao-luu-ke-hoach-bai-day-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Đã xuất tệp sao lưu JSON thành công.', 'success');
    } catch {
      notify('Không thể xuất bản sao lưu.', 'error');
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const res = await storage.importBackup(raw);
      const [loadedProfile, loadedSettings, loadedPlans, loadedTemplates] = await Promise.all([
        storage.getProfile(),
        storage.getSettings(),
        storage.getAllPlans(),
        storage.getAllTemplates(),
      ]);
      setProfile(loadedProfile);
      setSettings(loadedSettings);
      setPlans(loadedPlans);
      setTemplates(loadedTemplates);
      notify(
        `Đã khôi phục ${res.importedPlans} kế hoạch và ${res.importedTemplates} mẫu từ tệp sao lưu.`,
        'success'
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Tệp sao lưu không hợp lệ hoặc bị hỏng.',
        'error'
      );
    }
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim() && activeRoute === 'overview') {
      setActiveRoute('library');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Đang tải không gian làm việc...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {!(focusMode && activeRoute === 'editor') && (
        <Sidebar
          activeRoute={activeRoute}
          onNavigate={setActiveRoute}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          hasActivePlan={Boolean(activePlan)}
          planCount={plans.filter((p) => p.status !== 'thung_rac').length}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeRoute={activeRoute}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          saveStatusText={saveStatusText}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          focusMode={focusMode}
        />

        <main className="flex-1">
          {activeRoute === 'overview' && (
            <OverviewView
              profile={profile}
              plans={plans}
              aiStatus={aiStatus}
              hasWizardDraft={hasSavedWizardDraft}
              onStartNewPlan={handleStartNewPlan}
              onResumeDraft={handleResumeDraft}
              onOpenSamplePlan={handleOpenSamplePlan}
              onOpenPlan={handleOpenPlan}
              onNavigate={setActiveRoute}
            />
          )}

          {activeRoute === 'wizard' && (
            <WizardView
              step={wizardStep}
              onStepChange={handleWizardStepChange}
              input={wizardInput}
              onInputChange={handleWizardInputChange}
              templates={templates}
              profile={profile}
              aiStatus={aiStatus}
              onGenerateComplete={handleGenerateComplete}
              onTrySample={handleTrySampleInWizard}
              onNotify={notify}
            />
          )}

          {activeRoute === 'editor' && activePlan && (
            <EditorView
              plan={activePlan}
              versions={activePlanVersions}
              settings={settings}
              aiStatus={aiStatus}
              saveStatusText={saveStatusText}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode((v) => !v)}
              onUpdatePlan={handleUpdateActivePlan}
              onSaveVersion={handleSaveVersion}
              onSaveAsTemplate={handleSaveAsTemplate}
              onSaveSampleToLibrary={handleSaveSampleToLibrary}
              onNotify={notify}
            />
          )}

          {activeRoute === 'library' && (
            <LibraryView
              plans={plans}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenPlan={handleOpenPlan}
              onDuplicatePlan={handleDuplicatePlan}
              onRenamePlan={handleRenamePlan}
              onChangeStatus={handleChangePlanStatus}
              onDeletePermanent={handleDeletePermanent}
              onCreateNew={() => handleStartNewPlan(1)}
            />
          )}

          {activeRoute === 'templates' && (
            <TemplatesView
              templates={templates}
              onUseTemplate={handleUseTemplate}
              onDeleteCustomTemplate={handleDeleteCustomTemplate}
            />
          )}

          {activeRoute === 'guide' && (
            <GuideView profile={profile} settings={settings} onNotify={notify} />
          )}

          {activeRoute === 'settings' && (
            <SettingsView
              profile={profile}
              settings={settings}
              aiStatus={aiStatus}
              onSaveProfile={handleSaveProfile}
              onSaveSettings={handleSaveSettings}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>
      </div>

      {/* Toast notifications */}
      <div
        data-toast-container="true"
        aria-live="polite"
        className="no-print fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border px-4 py-2.5 text-xs font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100'
                : t.type === 'success'
                ? 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100'
                : 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
