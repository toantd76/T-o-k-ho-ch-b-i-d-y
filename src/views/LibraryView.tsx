import React, { useMemo, useState } from 'react';
import {
  Archive,
  Copy,
  Edit3,
  FolderOpen,
  LayoutGrid,
  List,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { LessonPlan, PlanStatus } from '../types/lesson';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface LibraryViewProps {
  plans: LessonPlan[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenPlan: (planId: string) => void;
  onDuplicatePlan: (plan: LessonPlan) => Promise<void>;
  onRenamePlan: (planId: string, newTitle: string) => Promise<void>;
  onChangeStatus: (planId: string, status: PlanStatus) => Promise<void>;
  onDeletePermanent: (planId: string) => Promise<void>;
  onCreateNew: () => void;
}

const STATUS_LABELS: Record<PlanStatus, string> = {
  nhap: 'Bản nháp',
  hoan_thien: 'Đã hoàn thiện',
  luu_tru: 'Lưu trữ',
  thung_rac: 'Thùng rác',
};

export function LibraryView({
  plans,
  searchQuery,
  onSearchChange,
  onOpenPlan,
  onDuplicatePlan,
  onRenamePlan,
  onChangeStatus,
  onDeletePermanent,
  onCreateNew,
}: LibraryViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'active' | PlanStatus>('active');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated_desc' | 'title_asc'>('updated_desc');

  const [renamingPlan, setRenamingPlan] = useState<LessonPlan | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const uniqueSubjects = useMemo(
    () => Array.from(new Set(plans.map((p) => p.inputSnapshot.subject).filter(Boolean))),
    [plans]
  );
  const uniqueGrades = useMemo(
    () => Array.from(new Set(plans.map((p) => p.inputSnapshot.grade).filter(Boolean))),
    [plans]
  );
  const uniqueBooks = useMemo(
    () => Array.from(new Set(plans.map((p) => p.inputSnapshot.bookSeries).filter(Boolean))),
    [plans]
  );

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return plans
      .filter((p) => {
        if (statusFilter === 'active') {
          if (p.status === 'thung_rac') return false;
        } else if (p.status !== statusFilter) {
          return false;
        }
        if (subjectFilter !== 'all' && p.inputSnapshot.subject !== subjectFilter) return false;
        if (gradeFilter !== 'all' && p.inputSnapshot.grade !== gradeFilter) return false;
        if (bookFilter !== 'all' && p.inputSnapshot.bookSeries !== bookFilter) return false;
        if (q) {
          const hay = `${p.title} ${p.inputSnapshot.subject} ${p.tags.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        sortBy === 'updated_desc'
          ? b.updatedAt.localeCompare(a.updatedAt)
          : a.title.localeCompare(b.title, 'vi')
      );
  }, [plans, statusFilter, subjectFilter, gradeFilter, bookFilter, searchQuery, sortBy]);

  const confirmDeletePlan = plans.find((p) => p.id === confirmDeleteId);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Thanh bộ lọc & tìm kiếm */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                { id: 'active', label: 'Tất cả hiện hành' },
                { id: 'nhap', label: 'Bản nháp' },
                { id: 'hoan_thien', label: 'Đã hoàn thiện' },
                { id: 'luu_tru', label: 'Lưu trữ' },
                { id: 'thung_rac', label: 'Thùng rác' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Xem dạng thẻ"
              title="Dạng thẻ"
              className={`rounded-lg p-2 ${
                viewMode === 'grid'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Xem dạng danh sách"
              title="Dạng danh sách"
              className={`rounded-lg p-2 ${
                viewMode === 'list'
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên bài dạy..."
            aria-label="Tìm theo tên bài dạy"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          />

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Lọc theo môn học"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">Tất cả môn học</option>
            {uniqueSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Lọc theo lớp"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">Tất cả lớp</option>
            {uniqueGrades.map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </select>

          <select
            value={bookFilter}
            onChange={(e) => setBookFilter(e.target.value)}
            aria-label="Lọc theo bộ sách"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">Tất cả bộ sách</option>
            {uniqueBooks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'updated_desc' | 'title_asc')}
            aria-label="Sắp xếp kế hoạch"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="updated_desc">Mới cập nhật nhất</option>
            <option value="title_asc">Theo tên (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Kết quả */}
      {filteredPlans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {statusFilter === 'thung_rac'
              ? 'Thùng rác hiện đang trống'
              : 'Chưa tìm thấy kế hoạch phù hợp trong thư viện'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Thử thay đổi bộ lọc hoặc tạo một kế hoạch bài dạy mới.
          </p>
          {statusFilter !== 'thung_rac' && (
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Tạo kế hoạch bài dạy
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {plan.title}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {plan.inputSnapshot.subject} · Lớp {plan.inputSnapshot.grade} ·{' '}
                  {plan.inputSnapshot.periodsCount * plan.inputSnapshot.minutesPerPeriod} phút
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {STATUS_LABELS[plan.status]} · Cập nhật{' '}
                  {new Date(plan.updatedAt).toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                {plan.status !== 'thung_rac' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenPlan(plan.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>Mở soạn</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingPlan(plan);
                          setRenameText(plan.title);
                        }}
                        aria-label={`Đổi tên ${plan.title}`}
                        title="Đổi tên"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicatePlan(plan)}
                        aria-label={`Tạo bản sao ${plan.title}`}
                        title="Tạo bản sao"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeStatus(
                            plan.id,
                            plan.status === 'luu_tru' ? 'nhap' : 'luu_tru'
                          )
                        }
                        aria-label={plan.status === 'luu_tru' ? 'Bỏ lưu trữ' : 'Lưu trữ'}
                        title={plan.status === 'luu_tru' ? 'Bỏ lưu trữ' : 'Lưu trữ'}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeStatus(plan.id, 'thung_rac')}
                        aria-label={`Đưa ${plan.title} vào thùng rác`}
                        title="Đưa vào thùng rác"
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex w-full items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onChangeStatus(plan.id, 'nhap')}
                      className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Khôi phục</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(plan.id)}
                      className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
                    >
                      Xóa vĩnh viễn
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <th className="px-4 py-3 font-semibold">Tên bài dạy</th>
                <th className="px-4 py-3 font-semibold">Môn · Lớp</th>
                <th className="px-4 py-3 font-semibold">Thời lượng</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Cập nhật</th>
                <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {plan.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {plan.inputSnapshot.subject} · Lớp {plan.inputSnapshot.grade}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {plan.inputSnapshot.periodsCount * plan.inputSnapshot.minutesPerPeriod} phút
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {STATUS_LABELS[plan.status]}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-500">
                    {new Date(plan.updatedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {plan.status !== 'thung_rac' ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPlan(plan.id)}
                          className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Mở
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicatePlan(plan)}
                          className="text-slate-600 hover:underline dark:text-slate-300"
                        >
                          Nhân bản
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeStatus(plan.id, 'thung_rac')}
                          className="text-rose-600 hover:underline"
                        >
                          Thùng rác
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onChangeStatus(plan.id, 'nhap')}
                          className="font-semibold text-teal-600 hover:underline"
                        >
                          Khôi phục
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(plan.id)}
                          className="text-rose-600 hover:underline"
                        >
                          Xóa hẳn
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal đổi tên */}
      {renamingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Đổi tên kế hoạch bài dạy"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Đổi tên kế hoạch</h2>
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenamingPlan(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (renameText.trim()) {
                    await onRenamePlan(renamingPlan.id, renameText.trim());
                  }
                  setRenamingPlan(null);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Lưu tên mới
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDeletePlan)}
        title="Xóa vĩnh viễn kế hoạch này?"
        description={`Thao tác này sẽ xóa hoàn toàn "${confirmDeletePlan?.title || ''}" cùng lịch sử phiên bản và không thể khôi phục lại.`}
        confirmLabel="Xóa vĩnh viễn"
        danger
        onConfirm={async () => {
          if (confirmDeleteId) await onDeletePermanent(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
