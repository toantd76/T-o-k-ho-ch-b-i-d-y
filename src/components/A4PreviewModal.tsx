import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, X, FileText, ZoomIn, ZoomOut } from 'lucide-react';
import { AppSettings, ExportScope, LessonPlan } from '../types/lesson';
import {
  FormattedObjectiveItem,
  buildObjectivesExportStructure,
  formatActivityObjectiveSummary,
  formatEvidenceRowObjectiveLabel,
  normalizePlanCompactCitations,
  prepareDocxExportModel,
} from '../lib/lessonLogic';
import { exportLessonPlanToDocx } from '../lib/docxExporter';

interface A4PreviewModalProps {
  open: boolean;
  plan: LessonPlan;
  settings: AppSettings;
  onClose: () => void;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const SCOPE_LABELS: Record<ExportScope, string> = {
  all: 'Toàn bộ kế hoạch & Phụ lục',
  main_only: 'Chỉ kế hoạch chính',
  worksheets_only: 'Chỉ phiếu học tập & Câu hỏi HS',
  teacher_guide_only: 'Đáp án, Rubric & Công cụ GV',
};

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.15] as const;

function PreviewObjectiveLine({ item }: { item: FormattedObjectiveItem }) {
  return (
    <p>
      -{' '}
      {item.boldPrefix && item.prefixLabel ? (
        <>
          <strong>{item.prefixLabel}:</strong> {item.body}
        </>
      ) : item.prefixLabel ? (
        <>
          {item.prefixLabel}: {item.body}
        </>
      ) : (
        item.body
      )}
      {item.needsConfirmation && (
        <span className="italic text-slate-600"> [Cần đối chiếu]</span>
      )}
    </p>
  );
}

function splitMultilineText(text: string): string[] {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function MultilineParagraphs({
  text,
  boldPrefix,
  className = '',
}: {
  text: string;
  boldPrefix?: string;
  className?: string;
}) {
  const lines = splitMultilineText(text);
  if (lines.length === 0) {
    if (!boldPrefix) return null;
    return (
      <p className={className}>
        <strong>{boldPrefix}</strong>
      </p>
    );
  }
  return (
    <>
      {lines.map((line, idx) => (
        <p key={idx} className={className}>
          {idx === 0 && boldPrefix ? (
            <>
              <strong>{boldPrefix}</strong> {line}
            </>
          ) : (
            line
          )}
        </p>
      ))}
    </>
  );
}

export function A4PreviewModal({
  open,
  plan: rawPlan,
  settings,
  onClose,
  onNotify,
}: A4PreviewModalProps) {
  const [scope, setScope] = useState<ExportScope>(settings.defaultExportScope || 'all');
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const plan = normalizePlanCompactCitations(rawPlan);
  const model = prepareDocxExportModel(plan, scope);
  const input = plan.inputSnapshot;

  const hasAppendixContent =
    (model.includeWorksheets && plan.worksheets.length > 0) ||
    (model.includeQuestions && plan.questions.length > 0) ||
    (model.includeAnswerKeys && plan.answerKeys.length > 0) ||
    (model.includeRubrics && plan.rubrics.length > 0) ||
    (model.includeTeacherAiPrompts && plan.teacherAiPrompts.length > 0) ||
    (model.includeEvidenceAndSources && plan.objectiveEvidenceMap.length > 0);

  const isFilteredScopeEmpty =
    !model.includeObjectives &&
    !model.includeResources &&
    !model.includeSessions &&
    !hasAppendixContent;

  const jumpToSection = (sectionId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`#${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const stepZoom = (delta: -1 | 1) => {
    const idx = ZOOM_LEVELS.indexOf(zoom as (typeof ZOOM_LEVELS)[number]);
    const nextIdx = Math.min(
      ZOOM_LEVELS.length - 1,
      Math.max(0, (idx === -1 ? 2 : idx) + delta)
    );
    setZoom(ZOOM_LEVELS[nextIdx]);
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const { fileName, formulaNotice } = await exportLessonPlanToDocx(plan, scope, settings);
      onNotify(
        formulaNotice
          ? `Đã tải tệp ${fileName}. Lưu ý: ${formulaNotice}`
          : `Đã xuất tệp Word: ${fileName}`,
        'success'
      );
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể xuất tệp Word lúc này.',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const effectiveLineHeight =
    settings.lineSpacing <= 1 ? 1.15 : settings.lineSpacing * 1.15;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-xs print:static print:inset-auto print:block print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước bản in và xuất tài liệu"
    >
      {/* Thanh điều khiển không in */}
      <div className="no-print border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Xem trước bản in (Khổ A4)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {settings.exportFont} · {settings.exportFontSizePt} pt ·{' '}
                {settings.lineSpacing === 1
                  ? 'Hàng đơn (Single)'
                  : `Giãn dòng ${settings.lineSpacing}`}{' '}
                · Thụt đầu dòng 1,27 cm · Before 6 pt
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Điều khiển thu phóng */}
            <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-800 sm:inline-flex">
              <button
                type="button"
                onClick={() => stepZoom(-1)}
                disabled={zoom <= ZOOM_LEVELS[0]}
                aria-label="Thu nhỏ trang xem trước"
                title="Thu nhỏ"
                className="rounded-lg p-1 text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => stepZoom(1)}
                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                aria-label="Phóng to trang xem trước"
                title="Phóng to"
                className="rounded-lg p-1 text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            <label htmlFor="preview-scope-select" className="sr-only">
              Phạm vi xuất tài liệu
            </label>
            <select
              id="preview-scope-select"
              value={scope}
              onChange={(e) => setScope(e.target.value as ExportScope)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {(Object.keys(SCOPE_LABELS) as ExportScope[]).map((k) => (
                <option key={k} value={k}>
                  {SCOPE_LABELS[k]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Printer className="h-4 w-4" />
              <span>In / Lưu PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportDocx}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? 'Đang tạo DOCX...' : 'Xuất Word (.docx)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng xem trước"
              title="Đóng (Esc)"
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thanh chuyển nhanh phần & hướng dẫn lưu PDF */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950/60 sm:px-6">
          <nav aria-label="Chuyển nhanh trong bản xem trước" className="flex flex-wrap items-center gap-1">
            {model.includeHeader && (
              <button
                type="button"
                onClick={() => jumpToSection('preview-section-header')}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Phần đầu
              </button>
            )}
            {model.includeObjectives && (
              <button
                type="button"
                onClick={() => jumpToSection('preview-section-objectives')}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                I. Mục tiêu
              </button>
            )}
            {model.includeResources && (
              <button
                type="button"
                onClick={() => jumpToSection('preview-section-resources')}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                II. Học liệu
              </button>
            )}
            {model.includeSessions && (
              <button
                type="button"
                onClick={() => jumpToSection('preview-section-sessions')}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                III. Tiến trình
              </button>
            )}
            {hasAppendixContent && (
              <button
                type="button"
                onClick={() => jumpToSection('preview-section-appendix')}
                className="rounded-lg px-2 py-1 text-slate-600 hover:bg-white hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Phụ lục
              </button>
            )}
          </nav>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Mẹo: Nhấn <strong>In / Lưu PDF</strong> và chọn đích <em>Lưu dưới dạng PDF</em> để tải bản PDF khổ A4.
          </p>
        </div>
      </div>

      {/* Vùng trang A4 */}
      <div
        ref={scrollContainerRef}
        className="print-container flex-1 overflow-y-auto p-3 sm:p-6 print:block print:overflow-visible print:p-0"
      >
        <div
          className="a4-preview-sheet mx-auto w-full max-w-[210mm] rounded-xl border border-slate-200 p-5 shadow-lg sm:pt-[20mm] sm:pb-[20mm] sm:pl-[25mm] sm:pr-[15mm] print:rounded-none print:border-0 print:p-0 print:shadow-none"
          style={{
            fontFamily: `"${settings.exportFont}", "Times New Roman", serif`,
            fontSize: `${settings.exportFontSizePt}pt`,
            lineHeight: effectiveLineHeight,
            zoom,
          }}
        >
          {/* Phần đầu */}
          {model.includeHeader && (
            <div id="preview-section-header">
              <table className="preview-header-table">
                <tbody>
                  <tr>
                    <td className="w-[52%]">
                      <p className="font-bold">
                        Trường: {input.schoolName || '....................'}
                      </p>
                      <p>Tổ chuyên môn: {input.departmentName || '....................'}</p>
                    </td>
                    <td className="w-[48%]">
                      <p className="font-bold">
                        Họ và tên giáo viên: {input.teacherName || '....................'}
                      </p>
                      <p>
                        Ngày soạn: {input.prepareDate || '...'} | Ngày dạy: {input.teachDate || '...'}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>

              <h1 className="preview-centered font-bold uppercase">KẾ HOẠCH BÀI DẠY</h1>
              <p className="preview-centered font-bold uppercase">
                TÊN BÀI DẠY: {plan.title.toUpperCase()}
              </p>
              <p className="preview-centered">
                Môn học / Hoạt động giáo dục: {input.subject} · Lớp: {input.grade} · Bộ sách:{' '}
                {input.bookSeries || 'Không ghi'}
              </p>
              <p className="preview-centered italic">
                Thời lượng thực hiện: {input.periodsCount} tiết ({model.totalMinutes} phút)
              </p>
            </div>
          )}

          {isFilteredScopeEmpty && (
            <div className="my-8 rounded-lg border border-dashed border-slate-300 p-6">
              <p className="preview-centered text-slate-600">
                Kế hoạch hiện tại chưa có nội dung thuộc phạm vi <strong>{SCOPE_LABELS[scope]}</strong>.
                Thầy/cô có thể bổ sung trong trình soạn thảo hoặc chọn phạm vi hiển thị khác ở thanh công cụ phía trên.
              </p>
            </div>
          )}

          {model.includeObjectives &&
            (() => {
              const objStruct = buildObjectivesExportStructure(plan);
              return (
                <section id="preview-section-objectives">
                  <h2 className="font-bold uppercase">{objStruct.sectionTitle}</h2>

                  {objStruct.knowledgeItems.length > 0 && (
                    <div>
                      <p className="font-bold">{objStruct.knowledgeHeading}</p>
                      {objStruct.knowledgeItems.map((item) => (
                        <PreviewObjectiveLine key={item.id} item={item} />
                      ))}
                    </div>
                  )}

                  {(objStruct.specificItems.length > 0 ||
                    objStruct.generalItems.length > 0 ||
                    objStruct.extraIntegrationItems.length > 0) && (
                    <div>
                      <p className="font-bold">{objStruct.competencyHeading}</p>

                      {objStruct.specificItems.length > 0 && (
                        <div>
                          <p className="font-bold italic">{objStruct.specificHeading}</p>
                          {objStruct.specificItems.map((item) => (
                            <PreviewObjectiveLine key={item.id} item={item} />
                          ))}
                        </div>
                      )}

                      {objStruct.generalItems.length > 0 && (
                        <div>
                          <p className="font-bold italic">{objStruct.generalHeading}</p>
                          {objStruct.generalItems.map((item) => (
                            <PreviewObjectiveLine key={item.id} item={item} />
                          ))}
                        </div>
                      )}

                      {objStruct.extraIntegrationItems.length > 0 && (
                        <div>
                          <p className="font-bold italic">{objStruct.extraIntegrationHeading}</p>
                          {objStruct.extraIntegrationItems.map((item) => (
                            <PreviewObjectiveLine key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {objStruct.qualityItems.length > 0 && (
                    <div>
                      <p className="font-bold">{objStruct.qualityHeading}</p>
                      {objStruct.qualityItems.map((item) => (
                        <PreviewObjectiveLine key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })()}

          {model.includeResources && (
            <section id="preview-section-resources">
              <h2 className="font-bold uppercase">II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU</h2>
              <p className="font-bold">1. Đối với giáo viên:</p>
              {plan.resources
                .filter((r) => r.actor === 'gv')
                .map((r) => (
                  <p key={r.id}>
                    - {r.item}
                    {r.usedInActivities ? ` (Sử dụng ở: ${r.usedInActivities})` : ''}
                  </p>
                ))}
              <p className="font-bold">2. Đối với học sinh:</p>
              {plan.resources
                .filter((r) => r.actor === 'hs')
                .map((r) => (
                  <p key={r.id}>
                    - {r.item}
                    {r.usedInActivities ? ` (Sử dụng ở: ${r.usedInActivities})` : ''}
                  </p>
                ))}
            </section>
          )}

          {model.includeSessions && (
            <section id="preview-section-sessions">
              <h2 className="font-bold uppercase">III. TIẾN TRÌNH DẠY HỌC</h2>
              <p className="font-bold">Bảng tổng quan các hoạt động</p>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="w-[24%]">Tiết / HĐ</th>
                      <th className="w-[14%]">Thời lượng</th>
                      <th className="w-[18%]">Mục tiêu</th>
                      <th className="w-[44%]">Sản phẩm dự kiến</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.activities.map((act) => {
                      const mtSummary = formatActivityObjectiveSummary(
                        act.objectiveIds,
                        plan.objectives,
                        'compact'
                      );
                      return (
                        <tr key={act.id}>
                          <td>
                            <p>
                              Tiết {act.sessionNumber}: {act.title}
                            </p>
                          </td>
                          <td>
                            <p>{act.durationMinutes} phút</p>
                          </td>
                          <td>
                            <p>{mtSummary}</p>
                          </td>
                          <td>
                            <MultilineParagraphs text={act.expectedProduct} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {plan.sessions.map((sess) => {
                const sessActs = plan.activities
                  .filter((a) => a.sessionNumber === sess.sessionNumber)
                  .sort((a, b) => a.order - b.order);

                return (
                  <div key={sess.id}>
                    <h3 className="font-bold">
                      {sess.title} ({sess.durationMinutes} phút)
                    </h3>

                    {model.isPrimaryTwoColumn ? (
                      <div className="overflow-x-auto">
                        <table>
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="w-1/2">Hoạt động của giáo viên</th>
                              <th className="w-1/2">Hoạt động của học sinh</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessActs.map((act) => {
                              const mtCompact = formatActivityObjectiveSummary(
                                act.objectiveIds,
                                plan.objectives,
                                'compact'
                              );
                              return (
                                <tr key={act.id}>
                                  <td>
                                    <p className="font-bold">
                                      {act.title} ({act.durationMinutes} phút)
                                      {mtCompact !== '-' ? ` [${mtCompact}]` : ''}
                                    </p>
                                    <MultilineParagraphs
                                      text={act.steps.transfer}
                                      boldPrefix="Chuyển giao:"
                                    />
                                    <MultilineParagraphs
                                      text={act.teacherPrompts}
                                      boldPrefix="Câu hỏi / Lệnh:"
                                    />
                                    <MultilineParagraphs
                                      text={act.steps.conclude}
                                      boldPrefix="Kết luận:"
                                    />
                                    <MultilineParagraphs
                                      text={act.assessmentCriteria}
                                      boldPrefix="Đánh giá:"
                                    />
                                  </td>
                                  <td>
                                    <MultilineParagraphs
                                      text={act.taskContent}
                                      boldPrefix="Nhiệm vụ:"
                                    />
                                    <MultilineParagraphs
                                      text={act.steps.execute}
                                      boldPrefix="Thực hiện:"
                                    />
                                    <MultilineParagraphs
                                      text={act.studentActions}
                                      boldPrefix="Hành động HS:"
                                    />
                                    <MultilineParagraphs
                                      text={act.steps.report}
                                      boldPrefix="Báo cáo:"
                                    />
                                    <MultilineParagraphs
                                      text={act.expectedProduct}
                                      boldPrefix="Sản phẩm:"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div>
                        {sessActs.map((act) => {
                          const mtDetailed = formatActivityObjectiveSummary(
                            act.objectiveIds,
                            plan.objectives,
                            'detailed'
                          );
                          return (
                            <div key={act.id} className="print-avoid-break">
                              <p className="font-bold">
                                {act.title} ({act.durationMinutes} phút)
                              </p>
                              <MultilineParagraphs
                                text={mtDetailed}
                                boldPrefix="a) Mục tiêu:"
                              />
                              <MultilineParagraphs
                                text={act.taskContent}
                                boldPrefix="b) Nội dung nhiệm vụ:"
                              />
                              <MultilineParagraphs
                                text={act.expectedProduct}
                                boldPrefix="c) Sản phẩm dự kiến:"
                              />
                              <p className="font-bold">d) Tổ chức thực hiện:</p>
                              <MultilineParagraphs
                                text={act.steps.transfer}
                                boldPrefix="- Bước 1 (Chuyển giao nhiệm vụ):"
                              />
                              <MultilineParagraphs
                                text={act.steps.execute}
                                boldPrefix="- Bước 2 (Thực hiện nhiệm vụ):"
                              />
                              <MultilineParagraphs
                                text={act.steps.report}
                                boldPrefix="- Bước 3 (Báo cáo, thảo luận):"
                              />
                              <MultilineParagraphs
                                text={act.steps.conclude}
                                boldPrefix="- Bước 4 (Kết luận, nhận định):"
                              />
                              {act.teacherPrompts && (
                                <MultilineParagraphs
                                  text={act.teacherPrompts}
                                  boldPrefix="Câu hỏi / lệnh cụ thể của GV:"
                                />
                              )}
                              {act.groupOrganization && (
                                <MultilineParagraphs
                                  text={act.groupOrganization}
                                  boldPrefix="Tổ chức nhóm / thời gian:"
                                />
                              )}
                              {act.assessmentCriteria && (
                                <MultilineParagraphs
                                  text={act.assessmentCriteria}
                                  boldPrefix="Đánh giá & tiêu chí đạt:"
                                />
                              )}
                              {act.commonMistakesAndSupport && (
                                <MultilineParagraphs
                                  text={act.commonMistakesAndSupport}
                                  boldPrefix="Dự kiến sai lầm & hỗ trợ:"
                                />
                              )}
                              {act.contingencyPlan && (
                                <MultilineParagraphs
                                  text={act.contingencyPlan}
                                  boldPrefix="Phương án dự phòng:"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {plan.homework && (
                <div>
                  <p className="font-bold">Nhiệm vụ về nhà</p>
                  <MultilineParagraphs text={plan.homework} />
                </div>
              )}
            </section>
          )}

          {model.includeReflection && (
            <section className="print-avoid-break">
              <h2 className="font-bold uppercase">IV. ĐIỀU CHỈNH SAU BÀI DẠY</h2>
              <MultilineParagraphs
                text={
                  plan.postLessonReflection.trim() ||
                  `${'.'.repeat(107)}\n${'.'.repeat(107)}`
                }
                className={!plan.postLessonReflection.trim() ? 'italic text-slate-600' : ''}
              />

              <table className="preview-header-table mt-4">
                <tbody>
                  <tr>
                    <td className="w-1/2">
                      <p className="font-bold uppercase">DUYỆT CỦA TỔ CHUYÊN MÔN</p>
                      <p>(Ký và ghi rõ họ tên)</p>
                      <p className="h-14" aria-hidden="true">
                        &nbsp;
                      </p>
                    </td>
                    <td className="w-1/2">
                      <p className="font-bold uppercase">GIÁO VIÊN GIẢNG DẠY</p>
                      <p className="italic">(Ký và ghi rõ họ tên)</p>
                      <p className="h-8" aria-hidden="true">
                        &nbsp;
                      </p>
                      <p className="font-bold">
                        {input.teacherName?.trim() || '....................'}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {hasAppendixContent && (
            <section id="preview-section-appendix" className={scope === 'all' ? 'print-page-break' : ''}>
              <h2 className="preview-centered font-bold uppercase">PHỤ LỤC DẠY HỌC</h2>

              {model.includeWorksheets && plan.worksheets.length > 0 && (
                <div>
                  <h3 className="font-bold">1. Phiếu học tập học sinh</h3>
                  {plan.worksheets.map((ws) => (
                    <div key={ws.id} className="mt-2 border border-slate-400 p-3">
                      <p className="font-bold">
                        {ws.title} ({ws.mode === 'nhom' ? 'Phiếu nhóm' : 'Phiếu cá nhân'})
                      </p>
                      {ws.instructions && (
                        <MultilineParagraphs
                          text={ws.instructions}
                          boldPrefix="Hướng dẫn:"
                        />
                      )}
                      {ws.tasks.map((t, i) => (
                        <p key={i}>
                          Nhiệm vụ {i + 1}: {t}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {model.includeQuestions && plan.questions.length > 0 && (
                <div>
                  <h3 className="font-bold">2. Câu hỏi củng cố / kiểm tra nhanh</h3>
                  {plan.questions.map((q, idx) => (
                    <div key={q.id}>
                      <p className="font-bold">
                        Câu {idx + 1}: {q.prompt}
                      </p>
                      {q.options.map((opt, oi) => (
                        <p key={oi}>{opt.trim()}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {model.includeAnswerKeys && plan.answerKeys.length > 0 && (
                <div>
                  <h3 className="font-bold">3. Đáp án và hướng dẫn chấm cho giáo viên</h3>
                  {plan.answerKeys.map((ak) => (
                    <p key={ak.id}>
                      - {ak.targetLabel}: {ak.answer}
                      {ak.explanation ? ` (${ak.explanation})` : ''}
                    </p>
                  ))}
                </div>
              )}

              {model.includeRubrics && plan.rubrics.length > 0 && (
                <div>
                  <h3 className="font-bold">4. Bảng kiểm & Rubric đánh giá</h3>
                  {plan.rubrics.map((rub) => (
                    <div key={rub.id} className="overflow-x-auto">
                      <p className="font-bold">{rub.title}</p>
                      {rub.criteria.length > 0 && (
                        <table>
                          <thead>
                            <tr className="bg-slate-100">
                              <th className="w-[24%]">Tiêu chí</th>
                              <th className="w-[10%]">Tỉ trọng</th>
                              <th className="w-[22%]">Mức Tốt</th>
                              <th className="w-[22%]">Mức Đạt</th>
                              <th className="w-[22%]">Cần cố gắng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rub.criteria.map((c) => (
                              <tr key={c.id}>
                                <td>
                                  <p>{c.criterion}</p>
                                </td>
                                <td>
                                  <p>{c.weightPercent}%</p>
                                </td>
                                <td>
                                  <p>{c.levelGood}</p>
                                </td>
                                <td>
                                  <p>{c.levelPass}</p>
                                </td>
                                <td>
                                  <p>{c.levelNeedWork}</p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {model.includeTeacherAiPrompts && plan.teacherAiPrompts.length > 0 && (
                <div>
                  <h3 className="font-bold">5. Gợi ý Prompt hỗ trợ giáo viên</h3>
                  {plan.teacherAiPrompts.map((p, idx) => (
                    <p key={idx}>- {p}</p>
                  ))}
                </div>
              )}

              {model.includeEvidenceAndSources && plan.objectiveEvidenceMap.length > 0 && (
                <div>
                  <h3 className="font-bold">6. Bảng đối chiếu Mục tiêu — Hoạt động — Minh chứng</h3>
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="w-[24%]">Mục tiêu</th>
                          <th className="w-[38%]">Minh chứng sản phẩm</th>
                          <th className="w-[38%]">Cách đánh giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.objectiveEvidenceMap.map((row) => (
                          <tr key={row.objectiveId}>
                            <td>
                              <p className="font-bold">
                                {formatEvidenceRowObjectiveLabel(row, plan.objectives)}
                              </p>
                            </td>
                            <td>
                              <MultilineParagraphs text={row.productEvidence} />
                            </td>
                            <td>
                              <MultilineParagraphs text={row.assessmentMethod} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
