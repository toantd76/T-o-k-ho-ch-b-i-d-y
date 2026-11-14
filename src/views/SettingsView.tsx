import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  HardDrive,
  Server,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import {
  AiStatusInfo,
  AppSettings,
  EducationLevel,
  ExportScope,
  TeacherProfile,
} from '../types/lesson';
import { BOOK_SERIES_OPTIONS, EDUCATION_LEVEL_LABELS } from '../lib/templatesAndSamples';
import { CV_3456_INFO, QD_2422_INFO } from '../lib/frameworks';

interface SettingsViewProps {
  profile: TeacherProfile;
  settings: AppSettings;
  aiStatus: AiStatusInfo | null;
  onSaveProfile: (next: TeacherProfile) => Promise<void>;
  onSaveSettings: (next: AppSettings) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (file: File) => Promise<void>;
}

export function SettingsView({
  profile,
  settings,
  aiStatus,
  onSaveProfile,
  onSaveSettings,
  onExportBackup,
  onImportBackup,
}: SettingsViewProps) {
  const [localProfile, setLocalProfile] = useState<TeacherProfile>(profile);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await onSaveProfile(localProfile);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await onSaveSettings(localSettings);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Nơi lưu trữ dữ liệu */}
      <section className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Dữ liệu đang lưu trên thiết bị này (IndexedDB)
          </p>
          <p className="mt-1">
            Toàn bộ kế hoạch bài dạy, lịch sử phiên bản, mẫu riêng và hồ sơ được lưu cục bộ trên trình duyệt của thiết bị hiện tại. Ứng dụng chưa đồng bộ đa thiết bị; thầy/cô nên xuất tệp sao lưu JSON định kỳ để lưu trữ an toàn.
          </p>
        </div>
      </section>

      {/* Hồ sơ giáo viên & mặc định */}
      <form
        onSubmit={handleSaveProfile}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Hồ sơ giáo viên & Mặc định bài mới
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Thông tin này giúp điền nhanh vào Phần đầu khi thầy/cô tạo kế hoạch bài dạy mới.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="set-teacher" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Họ và tên giáo viên
            </label>
            <input
              id="set-teacher"
              type="text"
              value={localProfile.teacherName}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, teacherName: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="set-school" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Tên trường
            </label>
            <input
              id="set-school"
              type="text"
              value={localProfile.schoolName}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, schoolName: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="set-dept" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Tổ chuyên môn
            </label>
            <input
              id="set-dept"
              type="text"
              value={localProfile.departmentName}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, departmentName: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="set-level" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Cấp học mặc định
            </label>
            <select
              id="set-level"
              value={localProfile.defaultLevel}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  defaultLevel: e.target.value as EducationLevel,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              {(Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[]).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {EDUCATION_LEVEL_LABELS[lvl]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="set-grade" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Lớp mặc định
              </label>
              <input
                id="set-grade"
                type="text"
                value={localProfile.defaultGrade}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, defaultGrade: e.target.value })
                }
                placeholder="10"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="set-class-size" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Sĩ số lớp mặc định
              </label>
              <input
                id="set-class-size"
                type="number"
                min={1}
                max={120}
                value={localProfile.defaultClassSize}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    defaultClassSize: Math.max(1, Number(e.target.value) || 44),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label htmlFor="set-subject" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Môn học mặc định
            </label>
            <input
              id="set-subject"
              type="text"
              value={localProfile.defaultSubject}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  defaultSubject: e.target.value,
                  favoriteSubjects: e.target.value.trim() ? [e.target.value.trim()] : [],
                })
              }
              placeholder="Tin học"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-book" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Bộ sách thường dùng
            </label>
            <input
              id="set-book"
              list="settings-book-list"
              value={localProfile.favoriteBookSeries}
              onChange={(e) =>
                setLocalProfile({ ...localProfile, favoriteBookSeries: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <datalist id="settings-book-list">
              {BOOK_SERIES_OPTIONS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-equipment" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Phương tiện dạy học mặc định
            </label>
            <input
              id="set-equipment"
              type="text"
              value={localProfile.defaultEquipmentAndMaterials}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  defaultEquipmentAndMaterials: e.target.value,
                })
              }
              placeholder="Máy tính giáo viên, máy chiếu, bảng..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-student-char" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Đặc điểm trình độ học sinh mặc định
            </label>
            <textarea
              id="set-student-char"
              rows={2}
              value={localProfile.defaultStudentCharacteristics}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  defaultStudentCharacteristics: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-relaxed text-indigo-950 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-200">
          <p className="font-semibold">Khung chuẩn tích hợp đang áp dụng (khi bật ở Bước 3):</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              <strong>Năng lực số:</strong> Thực hiện theo {CV_3456_INFO.shortLabel} ({CV_3456_INFO.legalBasis}).
            </li>
            <li>
              <strong>Giáo dục Trí tuệ nhân tạo (AI):</strong> Thực hiện theo {QD_2422_INFO.shortLabel} ({QD_2422_INFO.title}).
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            Thời lượng mặc định mỗi tiết theo cấp học (phút)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(EDUCATION_LEVEL_LABELS) as EducationLevel[]).map((lvl) => (
              <div key={lvl}>
                <label className="mb-1 block text-xs text-slate-500">
                  {EDUCATION_LEVEL_LABELS[lvl]}
                </label>
                <input
                  type="number"
                  min={15}
                  max={90}
                  value={localProfile.defaultMinutesByLevel[lvl]}
                  onChange={(e) =>
                    setLocalProfile({
                      ...localProfile,
                      defaultMinutesByLevel: {
                        ...localProfile.defaultMinutesByLevel,
                        [lvl]: Math.max(15, Number(e.target.value) || 45),
                      },
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ giáo viên'}
          </button>
        </div>
      </form>

      {/* Giao diện & Định dạng xuất Word */}
      <form
        onSubmit={handleSaveSettings}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Giao diện & Tùy chọn xuất bản Word (DOCX)
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="set-theme" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Chế độ giao diện
            </label>
            <select
              id="set-theme"
              value={localSettings.theme}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  theme: e.target.value as 'light' | 'dark',
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="light">Sáng (Mặc định)</option>
              <option value="dark">Tối (Dịu mắt)</option>
            </select>
          </div>
          <div>
            <label htmlFor="set-font" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Phông chữ xuất Word
            </label>
            <input
              id="set-font"
              type="text"
              value={localSettings.exportFont}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, exportFont: e.target.value })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="set-fontsize" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Cỡ chữ (pt)
            </label>
            <input
              id="set-fontsize"
              type="number"
              min={11}
              max={16}
              value={localSettings.exportFontSizePt}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  exportFontSizePt: Number(e.target.value) || 13,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Lề trên (mm)</label>
            <input
              type="number"
              min={10}
              max={35}
              value={localSettings.marginTopMm}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, marginTopMm: Number(e.target.value) || 20 })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Lề dưới (mm)</label>
            <input
              type="number"
              min={10}
              max={35}
              value={localSettings.marginBottomMm}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  marginBottomMm: Number(e.target.value) || 20,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Lề trái (mm)</label>
            <input
              type="number"
              min={15}
              max={40}
              value={localSettings.marginLeftMm}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, marginLeftMm: Number(e.target.value) || 25 })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Lề phải (mm)</label>
            <input
              type="number"
              min={10}
              max={35}
              value={localSettings.marginRightMm}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  marginRightMm: Number(e.target.value) || 15,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label htmlFor="set-linespacing" className="mb-1 block text-xs text-slate-500">
              Giãn dòng (1 = hàng đơn)
            </label>
            <input
              id="set-linespacing"
              type="number"
              step={0.1}
              min={1}
              max={2}
              value={localSettings.lineSpacing}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  lineSpacing: Number(e.target.value) || 1,
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            Quy chuẩn trình bày văn bản xuất ra (Xem trước A4 / In PDF / Word):
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>
              <strong>Font & Cỡ chữ:</strong> Times New Roman, cỡ chữ 13 pt cho toàn bộ văn bản.
            </li>
            <li>
              <strong>Đề mục & Đoạn văn bản:</strong> Thụt dòng đầu đoạn 1,27 cm, canh đều 2 biên (Justify), khoảng cách đoạn Before 6 pt (After 0 pt), giãn dòng hàng đơn (Single).
            </li>
            <li>
              <strong>Văn bản trong bảng:</strong> Không thụt dòng, giãn dòng hàng đơn, căn giữa ô (ngang & dọc), khoảng cách đoạn 0 pt.
            </li>
          </ul>
        </div>

        <div>
          <label htmlFor="set-scope" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Kiểu xuất mặc định
          </label>
          <select
            id="set-scope"
            value={localSettings.defaultExportScope}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                defaultExportScope: e.target.value as ExportScope,
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">Toàn bộ kế hoạch và Phụ lục</option>
            <option value="main_only">Chỉ kế hoạch chính</option>
            <option value="worksheets_only">Chỉ phiếu học tập học sinh</option>
            <option value="teacher_guide_only">Đáp án & công cụ giáo viên</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() =>
              setLocalSettings({
                ...localSettings,
                exportFont: 'Times New Roman',
                exportFontSizePt: 13,
                lineSpacing: 1,
                marginTopMm: 20,
                marginBottomMm: 20,
                marginLeftMm: 25,
                marginRightMm: 15,
              })
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Áp dụng định dạng chuẩn (13 pt · TNR · Hàng đơn)
          </button>
          <button
            type="submit"
            disabled={savingSettings}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {savingSettings ? 'Đang lưu...' : 'Lưu tùy chọn hiển thị & xuất'}
          </button>
        </div>
      </form>

      {/* Sao lưu và khôi phục dữ liệu */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Sao lưu & Khôi phục dữ liệu (JSON)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Xuất toàn bộ kế hoạch, phiên bản, mẫu riêng và cài đặt thành tệp JSON để chuyển máy hoặc sao lưu. Khi nhập lại, hệ thống kiểm tra cấu trúc dữ liệu chặt chẽ trước khi lưu.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={onExportBackup}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            <span>Xuất bản sao lưu JSON</span>
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportBackup(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
          >
            <Upload className="h-4 w-4" />
            <span>Nhập từ tệp sao lưu JSON</span>
          </button>
        </div>
      </section>

      {/* Chẩn đoán kết nối AI phía quản trị / server */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Trạng thái kết nối AI phía máy chủ (Dành cho quản trị viên)
          </h2>
        </div>
        {aiStatus ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {aiStatus.configured ? (
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {aiStatus.configured ? 'Đã kết nối dịch vụ AI phía máy chủ' : 'Cần cấu hình kết nối AI'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300">{aiStatus.message}</p>
            <p className="text-slate-500 dark:text-slate-400">
              Model đang cấu hình: <span className="font-mono">{aiStatus.model}</span> (thay đổi qua biến môi trường{' '}
              <span className="font-mono">GEMINI_MODEL</span> trên máy chủ; khóa API được quản lý qua Secrets của môi trường chạy, không lưu ở trình duyệt).
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Đang kiểm tra trạng thái kết nối máy chủ...</p>
        )}
      </section>
    </div>
  );
}
