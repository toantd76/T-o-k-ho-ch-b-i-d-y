import {
  AlignmentType,
  BorderStyle,
  Document,
  LineRuleType,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import { AppSettings, ExportScope, LessonPlan } from '../types/lesson';
import {
  FormattedObjectiveItem,
  buildObjectivesExportStructure,
  formatActivityObjectiveSummary,
  formatEvidenceRowObjectiveLabel,
  normalizePlanCompactCitations,
  prepareDocxExportModel,
} from './lessonLogic';

export const DOCX_STANDARD_FORMAT = {
  font: 'Times New Roman',
  sizePt: 13,
  firstLineIndentMm: 12.7,
  firstLineIndentTwips: convertMillimetersToTwip(12.7), // 720 twips (1.27 cm)
  spacingBeforeTwips: 120, // 6 pt
  spacingAfterTwips: 0, // 0 pt
  lineTwipsSingle: 240, // 1.0 (Single)
  tableSpacingBeforeTwips: 0,
  tableSpacingAfterTwips: 0,
} as const;

const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '334155',
};

const TABLE_BORDERS = {
  top: BORDER_STYLE,
  bottom: BORDER_STYLE,
  left: BORDER_STYLE,
  right: BORDER_STYLE,
  insideHorizontal: BORDER_STYLE,
  insideVertical: BORDER_STYLE,
};

function resolveLineTwips(lineSpacing: number): number {
  const safe = Number.isFinite(lineSpacing) && lineSpacing >= 1 ? lineSpacing : 1;
  return Math.round(safe * 240);
}

function makeRun(
  text: string,
  font: string,
  sizePt: number,
  options?: { bold?: boolean; italics?: boolean; color?: string }
): TextRun {
  return new TextRun({
    text,
    font,
    size: Math.round(sizePt * 2),
    bold: options?.bold,
    italics: options?.italics,
    color: options?.color,
  });
}

function makeParagraph(
  text: string,
  font: string,
  sizePt: number,
  lineSpacing: number,
  options?: {
    bold?: boolean;
    italics?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
    spacingBefore?: number;
    firstLineIndentTwips?: number;
    isTableCell?: boolean;
  }
): Paragraph {
  const isTableCell = options?.isTableCell ?? false;
  return new Paragraph({
    alignment:
      options?.alignment ??
      (isTableCell ? AlignmentType.CENTER : AlignmentType.JUSTIFIED),
    indent: {
      firstLine: isTableCell
        ? 0
        : (options?.firstLineIndentTwips ?? DOCX_STANDARD_FORMAT.firstLineIndentTwips),
    },
    spacing: {
      line: resolveLineTwips(lineSpacing),
      lineRule: LineRuleType.AUTO,
      before: isTableCell
        ? DOCX_STANDARD_FORMAT.tableSpacingBeforeTwips
        : (options?.spacingBefore ?? DOCX_STANDARD_FORMAT.spacingBeforeTwips),
      after: isTableCell
        ? DOCX_STANDARD_FORMAT.tableSpacingAfterTwips
        : (options?.spacingAfter ?? DOCX_STANDARD_FORMAT.spacingAfterTwips),
    },
    children: [
      makeRun(text, font, sizePt, {
        bold: options?.bold,
        italics: options?.italics,
      }),
    ],
  });
}

function makeObjectiveParagraph(
  item: FormattedObjectiveItem,
  font: string,
  sizePt: number,
  lineSpacing: number
): Paragraph {
  const refNote = item.needsConfirmation ? ' [Cần đối chiếu]' : '';
  const runs: TextRun[] = [makeRun('- ', font, sizePt)];
  if (item.boldPrefix && item.prefixLabel) {
    runs.push(makeRun(`${item.prefixLabel}:`, font, sizePt, { bold: true }));
    runs.push(makeRun(` ${item.body}${refNote}`, font, sizePt));
  } else if (item.prefixLabel) {
    runs.push(makeRun(`${item.prefixLabel}: ${item.body}${refNote}`, font, sizePt));
  } else {
    runs.push(makeRun(`${item.body}${refNote}`, font, sizePt));
  }

  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: {
      firstLine: DOCX_STANDARD_FORMAT.firstLineIndentTwips,
    },
    spacing: {
      line: resolveLineTwips(lineSpacing),
      lineRule: LineRuleType.AUTO,
      before: DOCX_STANDARD_FORMAT.spacingBeforeTwips,
      after: DOCX_STANDARD_FORMAT.spacingAfterTwips,
    },
    children: runs,
  });
}

function makeTableParagraph(
  text: string,
  font: string,
  sizePt: number,
  lineSpacing: number,
  options?: { bold?: boolean; italics?: boolean }
): Paragraph {
  return makeParagraph(text, font, sizePt, lineSpacing, {
    bold: options?.bold,
    italics: options?.italics,
    isTableCell: true,
    alignment: AlignmentType.CENTER,
    firstLineIndentTwips: 0,
    spacingBefore: 0,
    spacingAfter: 0,
  });
}

function makeMultilineParagraphs(
  text: string,
  font: string,
  sizePt: number,
  lineSpacing: number,
  boldPrefix?: string,
  options?: { isTableCell?: boolean; italics?: boolean }
): Paragraph[] {
  const isTableCell = options?.isTableCell ?? false;
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const buildParagraph = (children: TextRun[]) =>
    new Paragraph({
      alignment: isTableCell ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      indent: {
        firstLine: isTableCell ? 0 : DOCX_STANDARD_FORMAT.firstLineIndentTwips,
      },
      spacing: {
        line: resolveLineTwips(lineSpacing),
        lineRule: LineRuleType.AUTO,
        before: isTableCell
          ? DOCX_STANDARD_FORMAT.tableSpacingBeforeTwips
          : DOCX_STANDARD_FORMAT.spacingBeforeTwips,
        after: isTableCell
          ? DOCX_STANDARD_FORMAT.tableSpacingAfterTwips
          : DOCX_STANDARD_FORMAT.spacingAfterTwips,
      },
      children,
    });

  if (lines.length === 0) {
    return boldPrefix
      ? [buildParagraph([makeRun(`${boldPrefix} `, font, sizePt, { bold: true })])]
      : [];
  }

  return lines.map((line, idx) => {
    const children: TextRun[] = [];
    if (idx === 0 && boldPrefix) {
      children.push(makeRun(`${boldPrefix} `, font, sizePt, { bold: true }));
    }
    children.push(makeRun(line, font, sizePt, { italics: options?.italics }));
    return buildParagraph(children);
  });
}

function makeCell(
  paragraphs: Paragraph[],
  widthPercent: number,
  shadingFill?: string
): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: shadingFill ? { fill: shadingFill } : undefined,
    margins: {
      top: 100,
      bottom: 100,
      left: 120,
      right: 120,
    },
    children:
      paragraphs.length > 0
        ? paragraphs
        : [makeTableParagraph('', DOCX_STANDARD_FORMAT.font, DOCX_STANDARD_FORMAT.sizePt, 1)],
  });
}

export function detectFormulaLimitations(plan: LessonPlan): string | null {
  const serialized = JSON.stringify(plan);
  if (/(\$\$|\\frac|\\sqrt|\\sum|\\int)/.test(serialized)) {
    return 'Kế hoạch có chứa ký hiệu công thức dạng LaTeX. Khi xuất Word (.docx), công thức được giữ ở dạng văn bản đọc được; thầy/cô có thể chuyển sang Equation Editor trong Word nếu cần căn chỉnh ký hiệu phân số/căn bậc phức tạp.';
  }
  return null;
}

export function createLessonPlanDocxDocument(
  rawPlan: LessonPlan,
  scope: ExportScope,
  settings: AppSettings
): { doc: Document; fileName: string; formulaNotice: string | null } {
  const plan = normalizePlanCompactCitations(rawPlan);
  const model = prepareDocxExportModel(plan, scope);
  const font = settings.exportFont?.trim() || DOCX_STANDARD_FORMAT.font;
  const sizePt = settings.exportFontSizePt || DOCX_STANDARD_FORMAT.sizePt;
  const lineSpacing = settings.lineSpacing || 1;
  const input = plan.inputSnapshot;

  const children: Array<Paragraph | Table> = [];

  // PHẦN ĐẦU
  if (model.includeHeader) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              makeCell(
                [
                  makeTableParagraph(
                    `Trường: ${input.schoolName || '....................'}`,
                    font,
                    sizePt,
                    lineSpacing,
                    { bold: true }
                  ),
                  makeTableParagraph(
                    `${model.isCv5512Appendix4 ? 'Tổ' : 'Tổ chuyên môn'}: ${input.departmentName || '....................'}`,
                    font,
                    sizePt,
                    lineSpacing
                  ),
                ],
                52
              ),
              makeCell(
                [
                  makeTableParagraph(
                    `Họ và tên giáo viên: ${input.teacherName || '....................'}`,
                    font,
                    sizePt,
                    lineSpacing,
                    { bold: true }
                  ),
                  makeTableParagraph(
                    `Ngày soạn: ${input.prepareDate || '...'} | Ngày dạy: ${input.teachDate || '...'}`,
                    font,
                    sizePt,
                    lineSpacing
                  ),
                ],
                48
              ),
            ],
          }),
        ],
      })
    );

    children.push(
      makeParagraph('KẾ HOẠCH BÀI DẠY', font, sizePt, lineSpacing, {
        bold: true,
        alignment: AlignmentType.CENTER,
        firstLineIndentTwips: 0,
      }),
      makeParagraph(`TÊN BÀI DẠY: ${plan.title.toUpperCase()}`, font, sizePt, lineSpacing, {
        bold: true,
        alignment: AlignmentType.CENTER,
        firstLineIndentTwips: 0,
      }),
      makeParagraph(
        model.isCv5512Appendix4
          ? `Môn học/Hoạt động giáo dục: ${input.subject}; lớp: ${input.grade}${input.bookSeries ? ` (${input.bookSeries})` : ''}`
          : `Môn học / Hoạt động giáo dục: ${input.subject} · Lớp: ${input.grade} · Bộ sách: ${input.bookSeries || 'Không ghi'}`,
        font,
        sizePt,
        lineSpacing,
        {
          alignment: AlignmentType.CENTER,
          firstLineIndentTwips: 0,
        }
      ),
      makeParagraph(
        `${model.isCv5512Appendix4 ? 'Thời gian thực hiện' : 'Thời lượng thực hiện'}: ${input.periodsCount} tiết (${model.totalMinutes} phút)`,
        font,
        sizePt,
        lineSpacing,
        {
          italics: true,
          alignment: AlignmentType.CENTER,
          firstLineIndentTwips: 0,
        }
      )
    );
  }

  // I. MỤC TIÊU BÀI HỌC
  if (model.includeObjectives) {
    const objStruct = buildObjectivesExportStructure(plan);
    children.push(
      makeParagraph(objStruct.sectionTitle, font, sizePt, lineSpacing, {
        bold: true,
      })
    );

    if (objStruct.knowledgeItems.length > 0) {
      children.push(
        makeParagraph(objStruct.knowledgeHeading, font, sizePt, lineSpacing, { bold: true })
      );
      for (const item of objStruct.knowledgeItems) {
        children.push(makeObjectiveParagraph(item, font, sizePt, lineSpacing));
      }
    }

    if (
      objStruct.specificItems.length > 0 ||
      objStruct.generalItems.length > 0 ||
      objStruct.extraIntegrationItems.length > 0
    ) {
      children.push(
        makeParagraph(objStruct.competencyHeading, font, sizePt, lineSpacing, { bold: true })
      );

      if (objStruct.specificItems.length > 0) {
        children.push(
          makeParagraph(objStruct.specificHeading, font, sizePt, lineSpacing, {
            bold: true,
            italics: true,
          })
        );
        for (const item of objStruct.specificItems) {
          children.push(makeObjectiveParagraph(item, font, sizePt, lineSpacing));
        }
      }

      if (objStruct.generalItems.length > 0) {
        children.push(
          makeParagraph(objStruct.generalHeading, font, sizePt, lineSpacing, {
            bold: true,
            italics: true,
          })
        );
        for (const item of objStruct.generalItems) {
          children.push(makeObjectiveParagraph(item, font, sizePt, lineSpacing));
        }
      }

      if (objStruct.extraIntegrationItems.length > 0) {
        children.push(
          makeParagraph(objStruct.extraIntegrationHeading, font, sizePt, lineSpacing, {
            bold: true,
            italics: true,
          })
        );
        for (const item of objStruct.extraIntegrationItems) {
          children.push(makeObjectiveParagraph(item, font, sizePt, lineSpacing));
        }
      }
    }

    if (objStruct.qualityItems.length > 0) {
      children.push(
        makeParagraph(objStruct.qualityHeading, font, sizePt, lineSpacing, { bold: true })
      );
      for (const item of objStruct.qualityItems) {
        children.push(makeObjectiveParagraph(item, font, sizePt, lineSpacing));
      }
    }
  }

  // II. THIẾT BỊ VÀ HỌC LIỆU
  if (model.includeResources) {
    children.push(
      makeParagraph('II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU', font, sizePt, lineSpacing, {
        bold: true,
      })
    );
    const gvItems = plan.resources.filter((r) => r.actor === 'gv');
    const hsItems = plan.resources.filter((r) => r.actor === 'hs');
    children.push(makeParagraph('1. Đối với giáo viên:', font, sizePt, lineSpacing, { bold: true }));
    for (const r of gvItems) {
      children.push(
        makeParagraph(
          `- ${r.item}${r.usedInActivities ? ` (Sử dụng ở: ${r.usedInActivities})` : ''}`,
          font,
          sizePt,
          lineSpacing
        )
      );
    }
    children.push(makeParagraph('2. Đối với học sinh:', font, sizePt, lineSpacing, { bold: true }));
    for (const r of hsItems) {
      children.push(
        makeParagraph(
          `- ${r.item}${r.usedInActivities ? ` (Sử dụng ở: ${r.usedInActivities})` : ''}`,
          font,
          sizePt,
          lineSpacing
        )
      );
    }
  }

  // III. TIẾN TRÌNH DẠY HỌC
  if (model.includeSessions) {
    children.push(
      makeParagraph('III. TIẾN TRÌNH DẠY HỌC', font, sizePt, lineSpacing, {
        bold: true,
      })
    );

    // Bảng tổng quan tiến trình
    children.push(
      makeParagraph('Bảng tổng quan các hoạt động', font, sizePt, lineSpacing, { bold: true }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              makeCell([makeTableParagraph('Tiết / HĐ', font, sizePt, lineSpacing, { bold: true })], 24, 'F1F5F9'),
              makeCell([makeTableParagraph('Thời lượng', font, sizePt, lineSpacing, { bold: true })], 14, 'F1F5F9'),
              makeCell([makeTableParagraph('Mục tiêu', font, sizePt, lineSpacing, { bold: true })], 18, 'F1F5F9'),
              makeCell([makeTableParagraph('Sản phẩm dự kiến', font, sizePt, lineSpacing, { bold: true })], 44, 'F1F5F9'),
            ],
          }),
          ...plan.activities.map((act) => {
            const mtSummary = formatActivityObjectiveSummary(
              act.objectiveIds,
              plan.objectives,
              'compact'
            );
            return new TableRow({
              cantSplit: true,
              children: [
                makeCell(
                  [makeTableParagraph(`Tiết ${act.sessionNumber}: ${act.title}`, font, sizePt, lineSpacing)],
                  24
                ),
                makeCell(
                  [makeTableParagraph(`${act.durationMinutes} phút`, font, sizePt, lineSpacing)],
                  14
                ),
                makeCell([makeTableParagraph(mtSummary, font, sizePt, lineSpacing)], 18),
                makeCell(
                  makeMultilineParagraphs(act.expectedProduct, font, sizePt, lineSpacing, undefined, {
                    isTableCell: true,
                  }),
                  44
                ),
              ],
            });
          }),
        ],
      })
    );

    // Chi tiết từng tiết
    for (const session of plan.sessions) {
      children.push(
        makeParagraph(
          `${session.title} (${session.durationMinutes} phút)`,
          font,
          sizePt,
          lineSpacing,
          { bold: true }
        )
      );
      const sessActivities = plan.activities
        .filter((a) => a.sessionNumber === session.sessionNumber)
        .sort((a, b) => a.order - b.order);

      if (model.isPrimaryTwoColumn) {
        // Mẫu Tiểu học 2 cột GV / HS (văn bản trong bảng: không thụt dòng, hàng đơn, căn giữa ô, 0pt)
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: TABLE_BORDERS,
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  makeCell(
                    [makeTableParagraph('Hoạt động của giáo viên', font, sizePt, lineSpacing, { bold: true })],
                    50,
                    'F1F5F9'
                  ),
                  makeCell(
                    [makeTableParagraph('Hoạt động của học sinh', font, sizePt, lineSpacing, { bold: true })],
                    50,
                    'F1F5F9'
                  ),
                ],
              }),
              ...sessActivities.map((act) => {
                const mtCompact = formatActivityObjectiveSummary(
                  act.objectiveIds,
                  plan.objectives,
                  'compact'
                );
                const gvParas: Paragraph[] = [
                  makeTableParagraph(
                    `${act.title} (${act.durationMinutes} phút)${mtCompact !== '-' ? ` [${mtCompact}]` : ''}`,
                    font,
                    sizePt,
                    lineSpacing,
                    { bold: true }
                  ),
                  ...makeMultilineParagraphs(act.steps.transfer, font, sizePt, lineSpacing, 'Chuyển giao:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.teacherPrompts, font, sizePt, lineSpacing, 'Câu hỏi / Lệnh:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.steps.conclude, font, sizePt, lineSpacing, 'Kết luận:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.assessmentCriteria, font, sizePt, lineSpacing, 'Đánh giá:', {
                    isTableCell: true,
                  }),
                ];
                const hsParas: Paragraph[] = [
                  ...makeMultilineParagraphs(act.taskContent, font, sizePt, lineSpacing, 'Nhiệm vụ:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.steps.execute, font, sizePt, lineSpacing, 'Thực hiện:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.studentActions, font, sizePt, lineSpacing, 'Hành động HS:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.steps.report, font, sizePt, lineSpacing, 'Báo cáo:', {
                    isTableCell: true,
                  }),
                  ...makeMultilineParagraphs(act.expectedProduct, font, sizePt, lineSpacing, 'Sản phẩm:', {
                    isTableCell: true,
                  }),
                ];
                return new TableRow({
                  cantSplit: true,
                  children: [makeCell(gvParas, 50), makeCell(hsParas, 50)],
                });
              }),
            ],
          })
        );
      } else if (model.isCv5512Appendix4) {
        // Mẫu THCS / THPT chuẩn Phụ lục 4 Công văn 5512/BGDĐT-GDTrH
        for (const act of sessActivities) {
          const mtDetailed = formatActivityObjectiveSummary(
            act.objectiveIds,
            plan.objectives,
            'detailed'
          );
          children.push(
            makeParagraph(`${act.title} (${act.durationMinutes} phút)`, font, sizePt, lineSpacing, {
              bold: true,
            }),
            ...makeMultilineParagraphs(mtDetailed, font, sizePt, lineSpacing, 'a) Mục tiêu:'),
            ...makeMultilineParagraphs(act.taskContent, font, sizePt, lineSpacing, 'b) Nội dung:'),
            ...makeMultilineParagraphs(act.expectedProduct, font, sizePt, lineSpacing, 'c) Sản phẩm:'),
            makeParagraph('d) Tổ chức thực hiện:', font, sizePt, lineSpacing, { bold: true }),
            ...makeMultilineParagraphs(
              act.steps.transfer,
              font,
              sizePt,
              lineSpacing,
              '- Giao nhiệm vụ học tập:'
            ),
            ...makeMultilineParagraphs(
              act.steps.execute,
              font,
              sizePt,
              lineSpacing,
              '- Thực hiện nhiệm vụ:'
            ),
            ...makeMultilineParagraphs(
              act.steps.report,
              font,
              sizePt,
              lineSpacing,
              '- Báo cáo, thảo luận:'
            ),
            ...makeMultilineParagraphs(
              act.steps.conclude,
              font,
              sizePt,
              lineSpacing,
              '- Kết luận, nhận định:'
            )
          );
          if (act.groupOrganization) {
            children.push(
              ...makeMultilineParagraphs(
                act.groupOrganization,
                font,
                sizePt,
                lineSpacing,
                'Hình thức tổ chức / thời gian:'
              )
            );
          }
          if (act.assessmentCriteria) {
            children.push(
              ...makeMultilineParagraphs(
                act.assessmentCriteria,
                font,
                sizePt,
                lineSpacing,
                'Đánh giá thường xuyên:'
              )
            );
          }
          if (act.commonMistakesAndSupport) {
            children.push(
              ...makeMultilineParagraphs(
                act.commonMistakesAndSupport,
                font,
                sizePt,
                lineSpacing,
                'Dự kiến khó khăn & hỗ trợ:'
              )
            );
          }
          if (act.contingencyPlan) {
            children.push(
              ...makeMultilineParagraphs(
                act.contingencyPlan,
                font,
                sizePt,
                lineSpacing,
                'Phương án dự phòng:'
              )
            );
          }
        }
      } else {
        // Mẫu THCS / THPT tiến trình 4 bước
        for (const act of sessActivities) {
          const mtDetailed = formatActivityObjectiveSummary(
            act.objectiveIds,
            plan.objectives,
            'detailed'
          );
          children.push(
            makeParagraph(`${act.title} (${act.durationMinutes} phút)`, font, sizePt, lineSpacing, {
              bold: true,
            }),
            ...makeMultilineParagraphs(mtDetailed, font, sizePt, lineSpacing, 'a) Mục tiêu:'),
            ...makeMultilineParagraphs(act.taskContent, font, sizePt, lineSpacing, 'b) Nội dung nhiệm vụ:'),
            ...makeMultilineParagraphs(act.expectedProduct, font, sizePt, lineSpacing, 'c) Sản phẩm dự kiến:'),
            makeParagraph('d) Tổ chức thực hiện:', font, sizePt, lineSpacing, { bold: true }),
            ...makeMultilineParagraphs(
              act.steps.transfer,
              font,
              sizePt,
              lineSpacing,
              '- Bước 1 (Chuyển giao nhiệm vụ):'
            ),
            ...makeMultilineParagraphs(
              act.steps.execute,
              font,
              sizePt,
              lineSpacing,
              '- Bước 2 (Thực hiện nhiệm vụ):'
            ),
            ...makeMultilineParagraphs(
              act.steps.report,
              font,
              sizePt,
              lineSpacing,
              '- Bước 3 (Báo cáo, thảo luận):'
            ),
            ...makeMultilineParagraphs(
              act.steps.conclude,
              font,
              sizePt,
              lineSpacing,
              '- Bước 4 (Kết luận, nhận định):'
            ),
            ...makeMultilineParagraphs(
              act.teacherPrompts,
              font,
              sizePt,
              lineSpacing,
              'Câu hỏi / lệnh cụ thể của GV:'
            ),
            ...makeMultilineParagraphs(
              act.groupOrganization,
              font,
              sizePt,
              lineSpacing,
              'Tổ chức nhóm / thời gian:'
            ),
            ...makeMultilineParagraphs(
              act.assessmentCriteria,
              font,
              sizePt,
              lineSpacing,
              'Đánh giá & tiêu chí đạt:'
            ),
            ...makeMultilineParagraphs(
              act.commonMistakesAndSupport,
              font,
              sizePt,
              lineSpacing,
              'Dự kiến sai lầm & hỗ trợ:'
            )
          );
          if (act.contingencyPlan) {
            children.push(
              ...makeMultilineParagraphs(
                act.contingencyPlan,
                font,
                sizePt,
                lineSpacing,
                'Phương án dự phòng:'
              )
            );
          }
        }
      }
    }

    if (plan.homework) {
      children.push(
        makeParagraph('Nhiệm vụ về nhà', font, sizePt, lineSpacing, { bold: true }),
        ...makeMultilineParagraphs(plan.homework, font, sizePt, lineSpacing)
      );
    }
  }

  // IV. ĐIỀU CHỈNH SAU BÀI DẠY
  if (model.includeReflection) {
    const reflectionDotLine = '.'.repeat(136);
    children.push(
      makeParagraph('IV. ĐIỀU CHỈNH SAU BÀI DẠY', font, sizePt, lineSpacing, {
        bold: true,
      }),
      ...makeMultilineParagraphs(
        plan.postLessonReflection.trim() || `${reflectionDotLine}\n${reflectionDotLine}`,
        font,
        sizePt,
        lineSpacing,
        undefined,
        { italics: !plan.postLessonReflection.trim() }
      )
    );

    // Chữ ký phê duyệt của Tổ chuyên môn và Giáo viên giảng dạy cuối Kế hoạch bài dạy
    children.push(
      makeParagraph('', font, sizePt, lineSpacing, {
        alignment: AlignmentType.CENTER,
        firstLineIndentTwips: 0,
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              makeCell(
                [
                  makeTableParagraph('DUYỆT CỦA TỔ CHUYÊN MÔN', font, sizePt, lineSpacing, {
                    bold: true,
                  }),
                  makeTableParagraph('(Ký và ghi rõ họ tên)', font, sizePt, lineSpacing),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                ],
                50
              ),
              makeCell(
                [
                  makeTableParagraph('GIÁO VIÊN GIẢNG DẠY', font, sizePt, lineSpacing, {
                    bold: true,
                  }),
                  makeTableParagraph('(Ký và ghi rõ họ tên)', font, sizePt, lineSpacing, {
                    italics: true,
                  }),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                  makeTableParagraph('', font, sizePt, lineSpacing),
                  makeTableParagraph(
                    input.teacherName?.trim() || '....................',
                    font,
                    sizePt,
                    lineSpacing,
                    { bold: true }
                  ),
                ],
                50
              ),
            ],
          }),
        ],
      })
    );
  }

  // PHỤ LỤC
  const hasAppendix =
    (model.includeWorksheets && plan.worksheets.length > 0) ||
    (model.includeQuestions && plan.questions.length > 0) ||
    (model.includeAnswerKeys && plan.answerKeys.length > 0) ||
    (model.includeRubrics && plan.rubrics.length > 0) ||
    (model.includeTeacherAiPrompts && plan.teacherAiPrompts.length > 0) ||
    (model.includeEvidenceAndSources && plan.objectiveEvidenceMap.length > 0);

  if (hasAppendix) {
    if (scope === 'all') {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
    children.push(
      makeParagraph('PHỤ LỤC DẠY HỌC', font, sizePt, lineSpacing, {
        bold: true,
        alignment: AlignmentType.CENTER,
        firstLineIndentTwips: 0,
      })
    );
  }

  if (model.includeWorksheets && plan.worksheets.length > 0) {
    children.push(makeParagraph('1. Phiếu học tập học sinh', font, sizePt, lineSpacing, { bold: true }));
    for (const ws of plan.worksheets) {
      children.push(
        makeParagraph(
          `${ws.title} (${ws.mode === 'nhom' ? 'Phiếu nhóm' : 'Phiếu cá nhân'})`,
          font,
          sizePt,
          lineSpacing,
          { bold: true }
        ),
        ...makeMultilineParagraphs(ws.instructions, font, sizePt, lineSpacing, 'Hướng dẫn:')
      );
      ws.tasks.forEach((task, i) => {
        children.push(makeParagraph(`Nhiệm vụ ${i + 1}: ${task}`, font, sizePt, lineSpacing));
      });
    }
  }

  if (model.includeQuestions && plan.questions.length > 0) {
    children.push(
      makeParagraph('2. Câu hỏi củng cố / kiểm tra nhanh', font, sizePt, lineSpacing, { bold: true })
    );
    plan.questions.forEach((q, idx) => {
      children.push(makeParagraph(`Câu ${idx + 1}: ${q.prompt}`, font, sizePt, lineSpacing, { bold: true }));
      for (const opt of q.options) {
        children.push(makeParagraph(opt.trim(), font, sizePt, lineSpacing));
      }
    });
  }

  if (model.includeAnswerKeys && plan.answerKeys.length > 0) {
    children.push(
      makeParagraph('3. Đáp án và hướng dẫn chấm cho giáo viên', font, sizePt, lineSpacing, { bold: true })
    );
    for (const ak of plan.answerKeys) {
      children.push(
        makeParagraph(
          `- ${ak.targetLabel}: ${ak.answer}${ak.explanation ? ` (${ak.explanation})` : ''}`,
          font,
          sizePt,
          lineSpacing
        )
      );
    }
  }

  if (model.includeRubrics && plan.rubrics.length > 0) {
    children.push(makeParagraph('4. Bảng kiểm & Rubric đánh giá', font, sizePt, lineSpacing, { bold: true }));
    for (const rub of plan.rubrics) {
      children.push(makeParagraph(rub.title, font, sizePt, lineSpacing, { bold: true }));
      if (rub.criteria.length > 0) {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: TABLE_BORDERS,
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  makeCell([makeTableParagraph('Tiêu chí', font, sizePt, lineSpacing, { bold: true })], 24, 'F1F5F9'),
                  makeCell([makeTableParagraph('Tỉ trọng', font, sizePt, lineSpacing, { bold: true })], 10, 'F1F5F9'),
                  makeCell([makeTableParagraph('Mức Tốt', font, sizePt, lineSpacing, { bold: true })], 22, 'F1F5F9'),
                  makeCell([makeTableParagraph('Mức Đạt', font, sizePt, lineSpacing, { bold: true })], 22, 'F1F5F9'),
                  makeCell([makeTableParagraph('Cần cố gắng', font, sizePt, lineSpacing, { bold: true })], 22, 'F1F5F9'),
                ],
              }),
              ...rub.criteria.map(
                (c) =>
                  new TableRow({
                    cantSplit: true,
                    children: [
                      makeCell([makeTableParagraph(c.criterion, font, sizePt, lineSpacing)], 24),
                      makeCell([makeTableParagraph(`${c.weightPercent}%`, font, sizePt, lineSpacing)], 10),
                      makeCell([makeTableParagraph(c.levelGood, font, sizePt, lineSpacing)], 22),
                      makeCell([makeTableParagraph(c.levelPass, font, sizePt, lineSpacing)], 22),
                      makeCell([makeTableParagraph(c.levelNeedWork, font, sizePt, lineSpacing)], 22),
                    ],
                  })
              ),
            ],
          })
        );
      }
    }
  }

  if (model.includeTeacherAiPrompts && plan.teacherAiPrompts.length > 0) {
    children.push(
      makeParagraph('5. Gợi ý Prompt hỗ trợ giáo viên', font, sizePt, lineSpacing, { bold: true })
    );
    for (const p of plan.teacherAiPrompts) {
      children.push(makeParagraph(`- ${p}`, font, sizePt, lineSpacing));
    }
  }

  if (model.includeEvidenceAndSources) {
    if (plan.objectiveEvidenceMap.length > 0) {
      children.push(
        makeParagraph('6. Bảng đối chiếu Mục tiêu — Hoạt động — Minh chứng', font, sizePt, lineSpacing, {
          bold: true,
        })
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_BORDERS,
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                makeCell([makeTableParagraph('Mục tiêu', font, sizePt, lineSpacing, { bold: true })], 24, 'F1F5F9'),
                makeCell([makeTableParagraph('Minh chứng sản phẩm', font, sizePt, lineSpacing, { bold: true })], 38, 'F1F5F9'),
                makeCell([makeTableParagraph('Cách đánh giá', font, sizePt, lineSpacing, { bold: true })], 38, 'F1F5F9'),
              ],
            }),
            ...plan.objectiveEvidenceMap.map(
              (row) =>
                new TableRow({
                  cantSplit: true,
                  children: [
                    makeCell(
                      makeMultilineParagraphs(
                        formatEvidenceRowObjectiveLabel(row, plan.objectives),
                        font,
                        sizePt,
                        lineSpacing,
                        undefined,
                        { isTableCell: true }
                      ),
                      24
                    ),
                    makeCell(
                      makeMultilineParagraphs(row.productEvidence, font, sizePt, lineSpacing, undefined, {
                        isTableCell: true,
                      }),
                      38
                    ),
                    makeCell(
                      makeMultilineParagraphs(row.assessmentMethod, font, sizePt, lineSpacing, undefined, {
                        isTableCell: true,
                      }),
                      38
                    ),
                  ],
                })
            ),
          ],
        })
      );
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font,
            size: Math.round(sizePt * 2),
          },
          paragraph: {
            spacing: {
              line: resolveLineTwips(lineSpacing),
              lineRule: LineRuleType.AUTO,
              before: DOCX_STANDARD_FORMAT.spacingBeforeTwips,
              after: DOCX_STANDARD_FORMAT.spacingAfterTwips,
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(settings.marginTopMm || 20),
              bottom: convertMillimetersToTwip(settings.marginBottomMm || 20),
              left: convertMillimetersToTwip(settings.marginLeftMm || 25),
              right: convertMillimetersToTwip(settings.marginRightMm || 15),
            },
          },
        },
        children,
      },
    ],
  });

  return {
    doc,
    fileName: model.normalizedFileName,
    formulaNotice: detectFormulaLimitations(plan),
  };
}

export async function exportLessonPlanToDocx(
  plan: LessonPlan,
  scope: ExportScope,
  settings: AppSettings
): Promise<{ fileName: string; formulaNotice: string | null }> {
  const { doc, fileName, formulaNotice } = createLessonPlanDocxDocument(plan, scope, settings);

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    fileName,
    formulaNotice,
  };
}
