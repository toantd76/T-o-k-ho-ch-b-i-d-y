import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  FilePlus2,
  FileUp,
  LayoutTemplate,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { AiStatusInfo, LessonPlan, TeacherProfile } from '../types/lesson';
import { AppRoute } from '../components/Sidebar';

interface OverviewViewProps {
  profile: TeacherProfile;
  plans: LessonPlan[];
  aiStatus: AiStatusInfo | null;
  hasWizardDraft: boolean;
  onStartNewPlan: (initialStep?: number) => void;
  onResumeDraft: () => void;
  onOpenSamplePlan: () => void;
  onOpenPlan: (planId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

export function OverviewView({
  profile,
  plans,
  aiStatus,
  hasWizardDraft,
  onStartNewPlan,
  onResumeDraft,
  onOpenSamplePlan,
  onOpenPlan,
  onNavigate,
}: OverviewViewProps) {
  const [imgError, setImgError] = useState(false);

  // Chỉ tính dữ liệu thật (loại trừ thùng rác)
  const activePlans = plans.filter((p) => p.status !== 'thung_rac');
  const draftPlans = activePlans.filter((p) => p.status === 'nhap');
  const completedPlans = activePlans.filter((p) => p.status === 'hoan_thien');
  const recentPlans = activePlans.slice(0, 5);

  const greetingName = profile.teacherName ? ` ${profile.teacherName}` : '';

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Cảnh báo thực tế nếu AI chưa cấu hình */}
      {aiStatus && !aiStatus.configured && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold">Cần cấu hình kết nối AI</p>
              <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                {aiStatus.message} Thầy/cô vẫn có thể dùng bài mẫu, tạo khung kế hoạch thủ công, kiểm tra chất lượng và xuất Word.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="shrink-0 self-start rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800 sm:self-center"
          >
            Xem hướng dẫn
          </button>
        </div>
      )}

      {/* Phần mở đầu & Nút hành động chính */}
      <section className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Không gian soạn giáo án cá nhân
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl text-balance">
            Chào thầy/cô{greetingName}, sẵn sàng chuẩn bị bài dạy mới hôm nay
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Quy trình gọn trong 4 bước: nhập thông tin bài học, đính kèm tài liệu nếu có, chọn yêu cầu sư phạm, kiểm tra và xuất bản Word chuẩn A4.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasWizardDraft && (
            <button
              type="button"
              onClick={onResumeDraft}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span>Tiếp tục bản nháp đang điền</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onStartNewPlan(1)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>Tạo kế hoạch bài dạy</span>
          </button>
        </div>
      </section>

      {/* Thống kê thật từ dữ liệu IndexedDB */}
      <section aria-label="Thống kê thư viện kế hoạch" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng kế hoạch hiện có</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {activePlans.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Lưu trữ trực tiếp trên trình duyệt này
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Bản nháp đang soạn</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {draftPlans.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Có thể mở chỉnh sửa bất kỳ lúc nào
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Kế hoạch đã hoàn thiện</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-teal-600 dark:text-teal-400">
            {completedPlans.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sẵn sàng giảng dạy và xuất DOCX
          </p>
        </div>
      </section>

      {/* Lối tắt nhanh */}
      <section aria-label="Lối tắt thao tác" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => onStartNewPlan(2)}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        >
          <div className="space-y-1">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <FileUp className="h-4 w-4" />
            </div>
            <h3 className="pt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tạo từ tài liệu
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Tải PDF, DOCX, TXT hoặc ảnh trang sách để trích xuất nội dung bài học.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('templates')}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700"
        >
          <div className="space-y-1">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <LayoutTemplate className="h-4 w-4" />
            </div>
            <h3 className="pt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Dùng mẫu đã lưu
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Chọn mẫu Tiểu học 2 cột, THCS/THPT hoặc mẫu riêng của tổ chuyên môn.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-600" />
        </button>

        <button
          type="button"
          onClick={onOpenSamplePlan}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        >
          <div className="space-y-1">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="pt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Thử với bài mẫu
            </h3>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Mở bài dạy minh họa Toán 8 để thử trình soạn thảo, kiểm tra và xuất Word.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
        </button>
      </section>

      {/* Trạng thái rỗng hoặc Danh sách gần đây */}
      {activePlans.length === 0 ? (
        <section className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-12">
          <div className="md:col-span-5">
            {!imgError ? (
              <img
                src="/src/assets/images/empty_lesson_workspace_1794578943965.jpg"
                alt="Minh họa bàn soạn giáo án gọn gàng"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="aspect-4/3 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-4/3 w-full flex-col items-center justify-center rounded-xl bg-slate-100 p-6 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <BookOpen className="h-10 w-10" />
                <span className="mt-2 text-xs">Không gian soạn kế hoạch bài dạy</span>
              </div>
            )}
          </div>
          <div className="space-y-4 md:col-span-7">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Chưa có kế hoạch bài dạy nào trong thư viện
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Thầy/cô có thể bắt đầu ngay theo 4 bước ngắn gọn hoặc mở bài minh họa để xem trước cấu trúc đầu ra.
            </p>
            <ol className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <li className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                1. Nhập thông tin lớp, môn, thời lượng
              </li>
              <li className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                2. Thêm tài liệu SGK / PDF nếu có
              </li>
              <li className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                3. Chọn phương pháp & nội dung tích hợp
              </li>
              <li className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                4. Tạo, rà soát lỗi và xuất Word
              </li>
            </ol>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onStartNewPlan(1)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Bắt đầu soạn bài đầu tiên
              </button>
              <button
                type="button"
                onClick={onOpenSamplePlan}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Xem bài minh họa
              </button>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Kế hoạch gần đây */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Kế hoạch gần đây
              </h3>
              <button
                type="button"
                onClick={() => onNavigate('library')}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Xem tất cả
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentPlans.map((p) => (
                <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => onOpenPlan(p.id)}
                    className="flex w-full items-center justify-between gap-3 text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {p.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {p.inputSnapshot.subject} · Lớp {p.inputSnapshot.grade} ·{' '}
                        {p.inputSnapshot.periodsCount * p.inputSnapshot.minutesPerPeriod} phút ·{' '}
                        {p.status === 'hoan_thien'
                          ? 'Đã hoàn thiện'
                          : p.status === 'luu_tru'
                          ? 'Lưu trữ'
                          : 'Bản nháp'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-slate-400">
                      {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Các bản nháp đang làm */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Bản nháp đang thực hiện
              </h3>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {draftPlans.length} bản nháp
              </span>
            </div>
            {draftPlans.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Không có bản nháp nào đang dở dang.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {draftPlans.slice(0, 5).map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => onOpenPlan(p.id)}
                      className="flex w-full items-center justify-between gap-3 text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {p.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {p.inputSnapshot.subject} · Lớp {p.inputSnapshot.grade} · Cập nhật{' '}
                          {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        Mở sửa
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
