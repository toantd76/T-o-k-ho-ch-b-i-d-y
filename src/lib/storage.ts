import {
  AppSettings,
  AppSettingsSchema,
  BackupPayload,
  BackupPayloadSchema,
  LessonInput,
  LessonInputSchema,
  LessonPlan,
  LessonPlanSchema,
  LessonTemplate,
  LessonTemplateSchema,
  PlanVersion,
  PlanVersionSchema,
  SCHEMA_VERSION,
  TeacherProfile,
  TeacherProfileSchema,
} from '../types/lesson';
import {
  BUILT_IN_TEMPLATES,
  createDefaultProfile,
  createDefaultSettings,
} from './templatesAndSamples';
import { normalizePlanCompactCitations } from './lessonLogic';

const DB_NAME = 'ke_hoach_bai_day_ai_db';
const DB_VERSION = 1;

const STORES = {
  PLANS: 'plans',
  VERSIONS: 'versions',
  TEMPLATES: 'templates',
  META: 'meta',
} as const;

export interface StorageAdapter {
  getAllPlans(): Promise<LessonPlan[]>;
  getPlanById(id: string): Promise<LessonPlan | undefined>;
  savePlan(plan: LessonPlan): Promise<void>;
  deletePlanPermanent(id: string): Promise<void>;
  getVersionsByPlan(planId: string): Promise<PlanVersion[]>;
  saveVersion(version: PlanVersion): Promise<void>;
  getAllVersions(): Promise<PlanVersion[]>;
  replaceVersionsForPlan(planId: string, versions: PlanVersion[]): Promise<void>;
  getAllTemplates(): Promise<LessonTemplate[]>;
  saveTemplate(template: LessonTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  getProfile(): Promise<TeacherProfile>;
  saveProfile(profile: TeacherProfile): Promise<void>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  getWizardDraft(): Promise<{ step: number; input: LessonInput } | null>;
  saveWizardDraft(draft: { step: number; input: LessonInput } | null): Promise<void>;
  exportBackup(): Promise<BackupPayload>;
  importBackup(raw: unknown): Promise<{ importedPlans: number; importedTemplates: number }>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.PLANS)) {
        db.createObjectStore(STORES.PLANS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
        const verStore = db.createObjectStore(STORES.VERSIONS, { keyPath: 'id' });
        verStore.createIndex('planId', 'planId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không thể mở cơ sở dữ liệu trình duyệt'));
  });
}

function wrapQuotaError(err: unknown): Error {
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return new Error(
      'Dung lượng lưu trữ trên trình duyệt đã đầy. Vui lòng xóa bớt bản nháp trong Thùng rác hoặc xuất bản sao lưu JSON trước khi dọn dẹp.'
    );
  }
  return err instanceof Error ? err : new Error('Lỗi lưu trữ dữ liệu cục bộ');
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result ?? []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(wrapQuotaError(req.error));
    tx.onerror = () => reject(wrapQuotaError(tx.error));
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

class IndexedDBStorageAdapter implements StorageAdapter {
  async getAllPlans(): Promise<LessonPlan[]> {
    const raw = await idbGetAll<unknown>(STORES.PLANS);
    const valid: LessonPlan[] = [];
    for (const item of raw) {
      const parsed = LessonPlanSchema.safeParse(item);
      if (parsed.success) valid.push(normalizePlanCompactCitations(parsed.data));
    }
    return valid.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getPlanById(id: string): Promise<LessonPlan | undefined> {
    const raw = await idbGet<unknown>(STORES.PLANS, id);
    if (!raw) return undefined;
    const parsed = LessonPlanSchema.safeParse(raw);
    return parsed.success ? normalizePlanCompactCitations(parsed.data) : undefined;
  }

  async savePlan(plan: LessonPlan): Promise<void> {
    const clean = LessonPlanSchema.parse({
      ...plan,
      updatedAt: new Date().toISOString(),
    });
    await idbPut(STORES.PLANS, clean);
  }

  async deletePlanPermanent(id: string): Promise<void> {
    await idbDelete(STORES.PLANS, id);
    const allVersions = await this.getAllVersions();
    for (const v of allVersions.filter((item) => item.planId === id)) {
      await idbDelete(STORES.VERSIONS, v.id);
    }
  }

  async getAllVersions(): Promise<PlanVersion[]> {
    const raw = await idbGetAll<unknown>(STORES.VERSIONS);
    const list: PlanVersion[] = [];
    for (const item of raw) {
      const parsed = PlanVersionSchema.safeParse(item);
      if (parsed.success) list.push(parsed.data);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getVersionsByPlan(planId: string): Promise<PlanVersion[]> {
    const all = await this.getAllVersions();
    return all.filter((v) => v.planId === planId);
  }

  async saveVersion(version: PlanVersion): Promise<void> {
    const clean = PlanVersionSchema.parse(version);
    await idbPut(STORES.VERSIONS, clean);
    const existing = await this.getVersionsByPlan(clean.planId);
    if (existing.length > 15) {
      for (const old of existing.slice(15)) {
        await idbDelete(STORES.VERSIONS, old.id);
      }
    }
  }

  async replaceVersionsForPlan(planId: string, versions: PlanVersion[]): Promise<void> {
    const existing = await this.getVersionsByPlan(planId);
    for (const old of existing) {
      await idbDelete(STORES.VERSIONS, old.id);
    }
    for (const v of versions) {
      await idbPut(STORES.VERSIONS, PlanVersionSchema.parse(v));
    }
  }

  async getAllTemplates(): Promise<LessonTemplate[]> {
    const raw = await idbGetAll<unknown>(STORES.TEMPLATES);
    const custom: LessonTemplate[] = [];
    for (const item of raw) {
      const parsed = LessonTemplateSchema.safeParse(item);
      if (parsed.success && !parsed.data.isBuiltIn) {
        custom.push(parsed.data);
      }
    }
    return [...BUILT_IN_TEMPLATES, ...custom];
  }

  async saveTemplate(template: LessonTemplate): Promise<void> {
    const clean = LessonTemplateSchema.parse({ ...template, isBuiltIn: false });
    await idbPut(STORES.TEMPLATES, clean);
  }

  async deleteTemplate(id: string): Promise<void> {
    await idbDelete(STORES.TEMPLATES, id);
  }

  async getProfile(): Promise<TeacherProfile> {
    const record = await idbGet<{ key: string; value: unknown }>(STORES.META, 'profile');
    if (!record) return createDefaultProfile();
    const parsed = TeacherProfileSchema.safeParse(record.value);
    if (!parsed.success) return createDefaultProfile();
    // If an older uncustomized empty profile was stored, apply the new school/teacher defaults
    const raw = (record.value ?? {}) as Record<string, unknown>;
    if (!raw.schoolName && !raw.teacherName) {
      return createDefaultProfile();
    }
    return parsed.data;
  }

  async saveProfile(profile: TeacherProfile): Promise<void> {
    const clean = TeacherProfileSchema.parse(profile);
    await idbPut(STORES.META, { key: 'profile', value: clean });
  }

  async getSettings(): Promise<AppSettings> {
    const record = await idbGet<{ key: string; value: unknown }>(STORES.META, 'settings');
    if (!record) return createDefaultSettings();
    const parsed = AppSettingsSchema.safeParse(record.value);
    if (!parsed.success) return createDefaultSettings();

    const migrated = await idbGet<{ key: string; value: boolean }>(
      STORES.META,
      'migrated_single_spacing_v1'
    );
    if (!migrated) {
      await idbPut(STORES.META, { key: 'migrated_single_spacing_v1', value: true });
      const data = parsed.data;
      if (
        data.exportFont === 'Times New Roman' &&
        data.exportFontSizePt === 13 &&
        data.lineSpacing === 1.3
      ) {
        const updated = { ...data, lineSpacing: 1 };
        await idbPut(STORES.META, { key: 'settings', value: updated });
        return updated;
      }
    }
    return parsed.data;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const clean = AppSettingsSchema.parse(settings);
    await idbPut(STORES.META, { key: 'settings', value: clean });
  }

  async getWizardDraft(): Promise<{ step: number; input: LessonInput } | null> {
    const record = await idbGet<{ key: string; value: { step: number; input: unknown } }>(
      STORES.META,
      'wizard_draft'
    );
    if (!record?.value) return null;
    const parsed = LessonInputSchema.safeParse(record.value.input);
    if (!parsed.success) return null;
    return {
      step: typeof record.value.step === 'number' ? record.value.step : 1,
      input: parsed.data,
    };
  }

  async saveWizardDraft(draft: { step: number; input: LessonInput } | null): Promise<void> {
    if (!draft) {
      await idbDelete(STORES.META, 'wizard_draft');
      return;
    }
    await idbPut(STORES.META, {
      key: 'wizard_draft',
      value: { step: draft.step, input: draft.input },
    });
  }

  async exportBackup(): Promise<BackupPayload> {
    const [profile, settings, plans, versions, templates] = await Promise.all([
      this.getProfile(),
      this.getSettings(),
      this.getAllPlans(),
      this.getAllVersions(),
      this.getAllTemplates(),
    ]);

    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      plans,
      versions,
      templates: templates.filter((t) => !t.isBuiltIn),
    };
  }

  async importBackup(raw: unknown): Promise<{ importedPlans: number; importedTemplates: number }> {
    const parsed = BackupPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        'Tệp sao lưu không đúng định dạng hoặc bị thiếu trường dữ liệu cần thiết.'
      );
    }

    const data = parsed.data;
    await this.saveProfile(data.profile);
    await this.saveSettings(data.settings);

    for (const plan of data.plans) {
      await idbPut(STORES.PLANS, plan);
    }
    for (const ver of data.versions) {
      await idbPut(STORES.VERSIONS, ver);
    }
    let importedTemplates = 0;
    for (const tpl of data.templates) {
      if (!tpl.isBuiltIn) {
        await idbPut(STORES.TEMPLATES, tpl);
        importedTemplates += 1;
      }
    }

    return {
      importedPlans: data.plans.length,
      importedTemplates,
    };
  }
}

export const storage: StorageAdapter = new IndexedDBStorageAdapter();
