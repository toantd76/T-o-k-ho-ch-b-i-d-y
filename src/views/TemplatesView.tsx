import React, { useState } from 'react';
import { Check, Eye, Trash2, X } from 'lucide-react';
import { LessonTemplate } from '../types/lesson';
import { EDUCATION_LEVEL_LABELS } from '../lib/templatesAndSamples';

interface TemplatesViewProps {
  templates: LessonTemplate[];
  onUseTemplate: (template: LessonTemplate) => void;
  onDeleteCustomTemplate: (id: string) => Promise<void>;
}

export function TemplatesView({
  templates,
  onUseTemplate,
  onDeleteCustomTemplate,
}: TemplatesViewProps) {
  const [filterGroup, setFilterGroup] = useState<'all' | 'tieu_hoc' | 'trung_hoc' | 'custom'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<LessonTemplate | null>(null);

  const filtered = templates.filter((t) => {
    if (filterGroup === 'tieu_hoc') return t.isBuiltIn && t.level === 'tieu_hoc';
    if (filterGroup === 'trung_hoc') return t.isBuiltIn && t.level !== 'tieu_hoc';
    if (filterGroup === 'custom') return !t.isBuiltIn;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Thư viện mẫu kế hoạch bài dạy
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Các mẫu có sẵn là mẫu tham khảo thực hành; thầy/cô có thể xem trước cấu trúc hoặc dùng mẫu riêng của tổ chuyên môn đã lưu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'tieu_hoc', label: 'Tiểu học' },
              { id: 'trung_hoc', label: 'THCS / THPT' },
              { id: 'custom', label: 'Mẫu đã lưu' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterGroup(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterGroup === tab.id
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Chưa có mẫu nào trong nhóm này. Thầy/cô có thể lưu một kế hoạch bất kỳ thành Mẫu riêng từ thanh công cụ trong Trình soạn thảo.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((tpl) => (
            <article
              key={tpl.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {EDUCATION_LEVEL_LABELS[tpl.level]} · {tpl.isBuiltIn ? 'Mẫu tham khảo' : 'Mẫu giáo viên lưu'}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                  {tpl.name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {tpl.description}
                </p>
                <p className="mt-2 text-[11px] italic text-slate-500 dark:text-slate-400">
                  {tpl.referenceNote}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Xem trước cấu trúc</span>
                  </button>
                  {!tpl.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => onDeleteCustomTemplate(tpl.id)}
                      aria-label={`Xóa mẫu ${tpl.name}`}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Dùng mẫu này</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal xem trước cấu trúc mẫu */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Xem trước cấu trúc mẫu kế hoạch"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  {EDUCATION_LEVEL_LABELS[previewTemplate.level]}
                </p>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {previewTemplate.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Đóng xem trước mẫu"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {previewTemplate.description}
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                Các mục chính trong bố cục xuất bản:
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs text-slate-700 dark:text-slate-300">
                {previewTemplate.sectionsPreview.map((sec, idx) => (
                  <li key={idx}>{sec}</li>
                ))}
              </ol>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium dark:border-slate-700"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = previewTemplate;
                  setPreviewTemplate(null);
                  onUseTemplate(chosen);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Áp dụng mẫu này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
