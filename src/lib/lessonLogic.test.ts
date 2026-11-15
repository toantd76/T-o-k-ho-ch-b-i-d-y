import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTotalDuration,
  computePlanDurations,
  validateLessonPlanCode,
  validateLessonPlanData,
  createPlanVersionSnapshot,
  pruneVersionsForPlan,
  sanitizeFileName,
  prepareDocxExportModel,
  applyGrammarSuggestionToPlan,
  buildObjectivesExportStructure,
  formatObjectiveDisplayItem,
  formatActivityObjectiveSummary,
  formatEvidenceRowObjectiveLabel,
  compactFrameworkCitations,
  normalizePlanCompactCitations,
} from './lessonLogic';
import { LessonPlan } from '../types/lesson';

function createBasePlan(): LessonPlan {
  return {
    id: 'plan-test-1',
    title: 'Định lí Pythagore trong tam giác vuông',
    status: 'nhap',
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
    schemaVersion: 1,
    promptVersion: '2026.1.0',
    templateType: 'thcs_thpt_tien_trinh',
    tags: ['Toán 8'],
    isSample: false,
    inputSnapshot: {
      schoolName: 'THCS Nguyễn Du',
      departmentName: 'Tổ Toán - Tin',
      teacherName: 'Nguyễn Minh Anh',
      prepareDate: '2026-11-10',
      teachDate: '2026-11-14',
      level: 'thcs',
      grade: '8',
      subject: 'Toán',
      bookSeries: 'Kết nối tri thức với cuộc sống',
      bookEdition: '',
      lessonTitle: 'Định lí Pythagore trong tam giác vuông',
      lessonType: 'bai_moi',
      reviewScope: '',
      periodsCount: 1,
      minutesPerPeriod: 45,
      sequenceMode: 'chia_tung_tiet',
      templateId: 'tpl-thcs-thpt-standard',
      outputLanguage: 'Tiếng Việt',
      learningOutcomesInput: '',
      coreContent: '',
      priorKnowledge: '',
      excludedScope: '',
      teacherCustomRequests: '',
      classSize: 40,
      studentCharacteristics: '',
      commonDifficulties: '',
      inclusiveContextNotes: '',
      equipmentAndMaterials: '',
      internetAccess: 'co_on_dinh',
      studentDevices: 'Không yêu cầu',
      classroomSpace: 'Phòng học chuẩn',
      localContext: '',
      documents: [],
      pedagogicalOptions: {
        activeMethods: true,
        activeMethodNames: 'Thảo luận nhóm',
        games: false,
        gameNotes: '',
        individualWorksheet: true,
        groupWorksheet: false,
        reviewQuestions: true,
        questionFormat: 'Trắc nghiệm',
        questionCount: 2,
        rubric: true,
        stem: false,
        stemMaterials: '',
        stemBudgetLimit: '',
        stemProduct: '',
        digitalCompetence: false,
        digitalCompetenceNotes: '',
        aiUsage: false,
        aiToolName: '',
        aiDeviceContext: '',
        aiVerificationRule: '',
        cyberSafety: false,
        gdqpan: false,
        ethicsLifestyle: false,
        environmentalProtection: false,
        inclusiveSupport: false,
        inclusiveNeed: '',
        inclusiveAdjustment: '',
        otherIntegration: false,
        otherIntegrationNotes: '',
      },
    },
    assumptions: [],
    objectives: [
      {
        id: 'obj-1',
        code: 'MT1',
        category: 'kien_thuc',
        title: '',
        frameworkCode: '',
        description: 'Phát biểu được định lí Pythagore và tính được độ dài cạnh chưa biết.',
        sourceType: 'de_xuat',
        needsConfirmation: false,
        sourceRef: '',
      },
    ],
    resources: [
      { id: 'res-1', actor: 'gv', item: 'Thước thẳng, ê-ke, phiếu học tập số 1', usedInActivities: 'HĐ 2' },
    ],
    sessions: [
      {
        id: 'sess-1',
        sessionNumber: 1,
        title: 'Tiết 1: Khám phá và vận dụng định lí Pythagore',
        durationMinutes: 45,
        overviewNote: '',
      },
    ],
    activities: [
      {
        id: 'act-1',
        sessionNumber: 1,
        order: 1,
        phase: 'khoi_dong',
        title: 'Khởi động: Đo đạc cạnh tam giác vuông',
        durationMinutes: 10,
        objectiveIds: ['obj-1'],
        taskContent: 'Học sinh đo 3 cạnh trên giấy kẻ ô.',
        expectedProduct: 'Bảng số đo độ dài 3 cạnh.',
        steps: {
          transfer: 'GV phát giấy kẻ ô và nêu câu hỏi.',
          execute: 'HS đo và ghi số liệu.',
          report: '2 HS nêu kết quả.',
          conclude: 'GV dẫn vào bài mới.',
        },
        teacherPrompts: 'Em nhận xét gì về bình phương cạnh huyền?',
        studentActions: 'Đo và tính toán.',
        groupOrganization: 'Cá nhân trong 3 phút.',
        assessmentCriteria: 'Ghi đủ 3 số đo chính xác.',
        commonMistakesAndSupport: 'Nhầm cạnh góc vuông với cạnh huyền.',
        extensionTask: '',
        contingencyPlan: '',
        linkedWorksheetIds: ['ws-1'],
      },
      {
        id: 'act-2',
        sessionNumber: 1,
        order: 2,
        phase: 'luyen_tap',
        title: 'Khám phá và luyện tập tính cạnh',
        durationMinutes: 35,
        objectiveIds: ['obj-1'],
        taskContent: 'Thực hiện phiếu học tập số 1.',
        expectedProduct: 'Lời giải 2 bài tập tính cạnh tam giác vuông.',
        steps: {
          transfer: 'GV giao phiếu số 1.',
          execute: 'HS làm việc cặp đôi.',
          report: 'Đại diện trình bày.',
          conclude: 'GV chốt kiến thức.',
        },
        teacherPrompts: 'Áp dụng công thức nào khi biết hai cạnh góc vuông?',
        studentActions: 'Giải bài tập và đối chiếu.',
        groupOrganization: 'Cặp đôi.',
        assessmentCriteria: 'Tính đúng và viết rõ đơn vị.',
        commonMistakesAndSupport: 'Quên lấy căn bậc hai.',
        extensionTask: '',
        contingencyPlan: '',
        linkedWorksheetIds: ['ws-1'],
      },
    ],
    worksheets: [
      {
        id: 'ws-1',
        title: 'Phiếu học tập số 1',
        mode: 'ca_nhan',
        linkedActivityId: 'act-2',
        instructions: 'Hoàn thành trong 10 phút.',
        tasks: ['Tính cạnh huyền của tam giác vuông có hai cạnh góc vuông 3 cm và 4 cm.'],
        answerGuide: '5 cm',
      },
    ],
    questions: [
      {
        id: 'q-1',
        type: 'trac_nghiem',
        prompt: 'Tam giác vuông có hai cạnh góc vuông là 6 cm và 8 cm. Cạnh huyền dài bao nhiêu?',
        options: ['A. 10 cm', 'B. 12 cm', 'C. 14 cm', 'D. 100 cm'],
        correctAnswerOrGuide: 'A. 10 cm',
        linkedObjectiveIds: ['obj-1'],
      },
    ],
    answerKeys: [{ id: 'ak-1', targetLabel: 'Câu 1', answer: 'A. 10 cm', explanation: '6^2 + 8^2 = 100 = 10^2' }],
    rubrics: [
      {
        id: 'rub-1',
        title: 'Rubric bài tập nhóm',
        target: 'Bài giải',
        criteria: [
          {
            id: 'c-1',
            criterion: 'Tính đúng kết quả',
            weightPercent: 60,
            levelGood: 'Đúng hoàn toàn',
            levelPass: 'Đúng bước lập công thức',
            levelNeedWork: 'Sai công thức',
          },
          {
            id: 'c-2',
            criterion: 'Trình bày rõ ràng',
            weightPercent: 40,
            levelGood: 'Rõ ràng, đủ đơn vị',
            levelPass: 'Còn thiếu đơn vị',
            levelNeedWork: 'Khó theo dõi',
          },
        ],
      },
    ],
    teacherAiPrompts: [],
    homework: 'Làm bài tập 1, 2 SGK.',
    objectiveEvidenceMap: [
      {
        objectiveId: 'obj-1',
        objectiveCode: 'MT1',
        activityIds: ['act-1', 'act-2'],
        productEvidence: 'Phiếu học tập số 1',
        assessmentMethod: 'Chấm bài và hỏi đáp',
      },
    ],
    sourceReferences: [],
    itemsNeedingConfirmation: [],
    postLessonReflection: '',
  };
}

test('calculateTotalDuration computes periods × minutes accurately', () => {
  assert.equal(calculateTotalDuration(2, 45), 90);
  assert.equal(calculateTotalDuration(1, 35), 35);
  assert.equal(calculateTotalDuration(0, 45), 0);
});

test('validateLessonPlanCode passes clean plan and catches duration, objective, worksheet, and rubric issues', () => {
  const cleanPlan = createBasePlan();
  assert.equal(validateLessonPlanCode(cleanPlan).length, 0);
  assert.equal(computePlanDurations(cleanPlan).differenceMinutes, 0);

  const brokenPlan = createBasePlan();
  brokenPlan.activities[1].durationMinutes = 25; // tổng còn 35/45 -> thiếu 10
  brokenPlan.activities[0].objectiveIds.push('obj-non-existent');
  brokenPlan.activities[0].linkedWorksheetIds.push('ws-missing');
  brokenPlan.questions[0].correctAnswerOrGuide = '';
  brokenPlan.rubrics[0].criteria[1].weightPercent = 20; // tổng 80%

  const issues = validateLessonPlanCode(brokenPlan);
  const titles = issues.map((i) => i.title).join(' | ');
  assert.match(titles, /Tổng thời lượng chưa khớp/);
  assert.match(titles, /Tiết 1 lệch thời lượng/);
  assert.match(titles, /Liên kết mục tiêu không tồn tại/);
  assert.match(titles, /Phiếu học tập được nhắc chưa tồn tại/);
  assert.match(titles, /Câu hỏi trắc nghiệm chưa có đáp án/);
  assert.match(titles, /Tổng trọng số Rubric/);
});

test('validateLessonPlanData checks Zod schema strictly', () => {
  const valid = validateLessonPlanData(createBasePlan());
  assert.equal(valid.success, true);

  const invalid = validateLessonPlanData({ title: 'Thiếu trường' });
  assert.equal(invalid.success, false);
  assert.ok(invalid.errors.length > 0);
});

test('version management creates isolated snapshots and prunes per plan', () => {
  const plan = createBasePlan();
  const v1 = createPlanVersionSnapshot(plan, 'Trước khi AI sửa');
  plan.title = 'Tên đã đổi';
  assert.equal(v1.snapshot.title, 'Định lí Pythagore trong tam giác vuông');

  const many = Array.from({ length: 20 }, (_, i) =>
    createPlanVersionSnapshot(plan, `Phiên bản ${i}`)
  );
  const pruned = pruneVersionsForPlan(many, plan.id, 10);
  assert.equal(pruned.length, 10);
});

test('sanitizeFileName and prepareDocxExportModel produce clean DOCX metadata', () => {
  assert.equal(
    sanitizeFileName('Bài 3: Định lí Pythagore / Toán 8!'),
    'bai-3-dinh-li-pythagore-toan-8'
  );

  const plan = createBasePlan();
  plan.templateType = 'tieu_hoc_2_cot';
  const mainOnly = prepareDocxExportModel(plan, 'main_only');
  assert.equal(mainOnly.includeSessions, true);
  assert.equal(mainOnly.includeWorksheets, false);
  assert.equal(mainOnly.isPrimaryTwoColumn, true);
  assert.equal(mainOnly.normalizedFileName, 'dinh-li-pythagore-trong-tam-giac-vuong-ke-hoach-chinh.docx');

  const wsOnly = prepareDocxExportModel(plan, 'worksheets_only');
  assert.equal(wsOnly.includeSessions, false);
  assert.equal(wsOnly.includeWorksheets, true);
  assert.equal(wsOnly.includeAnswerKeys, false);
});

test('applyGrammarSuggestionToPlan replaces exact originalText in target activity cleanly', () => {
  const plan = createBasePlan();
  const { updatedPlan, applied } = applyGrammarSuggestionToPlan(plan, {
    id: 'gs-1',
    category: 'chinh_ta',
    sectionId: 'activity-act-1',
    sectionLabel: 'Tiết 1 · Hoạt động 1',
    targetActivityId: 'act-1',
    fieldKey: 'taskContent',
    originalText: 'Học sinh đo 3 cạnh trên giấy kẻ ô.',
    suggestedText: 'Học sinh đo độ dài 3 cạnh trên giấy kẻ ô vuông.',
    explanation: 'Diễn đạt rõ ràng hơn đối tượng cần đo.',
  });
  assert.equal(applied, true);
  assert.equal(
    updatedPlan.activities[0].taskContent,
    'Học sinh đo độ dài 3 cạnh trên giấy kẻ ô vuông.'
  );
  // Original plan remains untouched
  assert.equal(plan.activities[0].taskContent, 'Học sinh đo 3 cạnh trên giấy kẻ ô.');
});

test('default profile and initial lesson input use Trường THPT Đắk Song, Trần Công Toàn, Tin học 10, 44 HS, projector, 2/3 average+', async () => {
  const { createDefaultProfile, createInitialLessonInput } = await import('./templatesAndSamples');
  const profile = createDefaultProfile();
  assert.equal(profile.schoolName, 'Trường THPT Đắk Song');
  assert.equal(profile.teacherName, 'Trần Công Toàn');
  assert.equal(profile.defaultLevel, 'thpt');
  assert.equal(profile.defaultGrade, '10');
  assert.equal(profile.defaultSubject, 'Tin học');
  assert.equal(profile.defaultClassSize, 44);
  assert.match(profile.defaultEquipmentAndMaterials, /máy chiếu/i);
  assert.match(profile.defaultStudentCharacteristics, /2\/3.*Trung bình trở lên/i);

  const initial = createInitialLessonInput(profile);
  assert.equal(initial.level, 'thpt');
  assert.equal(initial.grade, '10');
  assert.equal(initial.subject, 'Tin học');
  assert.equal(initial.schoolName, 'Trường THPT Đắk Song');
  assert.equal(initial.teacherName, 'Trần Công Toàn');
  assert.equal(initial.classSize, 44);
  assert.match(initial.equipmentAndMaterials, /máy chiếu/i);
  assert.match(initial.studentCharacteristics, /2\/3.*Trung bình trở lên/i);
  assert.equal(initial.minutesPerPeriod, 45);
});

test('CV 3456 (27/06/2025) and QD 2422 (18/08/2026) framework helpers resolve grade bands, codes, and prompt blocks', async () => {
  const {
    getNlsBandForGrade,
    getNlsQuickChips,
    getAiQuickChips,
    buildNlsFrameworkPromptGuidance,
    buildAiFrameworkPromptGuidance,
  } = await import('./frameworks');

  assert.equal(getNlsBandForGrade('10').code, 'L10-L11-L12');
  assert.equal(getNlsBandForGrade('10').levelName, 'Nâng cao 1');
  assert.equal(getNlsBandForGrade('8').code, 'L8-L9');
  assert.equal(getNlsBandForGrade('4').code, 'L4-L5');
  assert.equal(getNlsBandForGrade('2').code, 'L1-L2-L3');

  const nlsChips = getNlsQuickChips('Tin học');
  assert.ok(nlsChips.some((c) => c.code === '3.4'));

  const aiChips10 = getAiQuickChips('10');
  assert.ok(aiChips10.some((c) => c.code === '10.C3.1'));
  assert.ok(aiChips10.some((c) => c.code === '10.B2.MR1'));

  const nlsPrompt = buildNlsFrameworkPromptGuidance('10', 'Tin học');
  assert.match(nlsPrompt, /3456\/BGDĐT-GDPT/);
  assert.match(nlsPrompt, /27\/06\/2025/);
  assert.match(nlsPrompt, /L10-L11-L12/);
  assert.match(nlsPrompt, /Tin học giữ vai trò chủ đạo/);

  const aiPrompt = buildAiFrameworkPromptGuidance('10', 'Tin học');
  assert.match(aiPrompt, /2422\/QĐ-BGDĐT/);
  assert.match(aiPrompt, /18\/08\/2026/);
  assert.match(aiPrompt, /10\.C3\.1/);
  assert.match(aiPrompt, /KHÔNG tách bài kiểm tra hay đầu điểm riêng/);
});

test('AppSettingsSchema defaults and DOCX export enforce 13pt Times New Roman, 1.27cm indent, justify, 6pt before, single spacing, and centered 0pt/0-indent table cells', async () => {
  const { Packer } = await import('docx');
  const { inflateRawSync } = await import('node:zlib');
  const { createDefaultSettings } = await import('./templatesAndSamples');
  const { createLessonPlanDocxDocument, DOCX_STANDARD_FORMAT } = await import('./docxExporter');

  const extractDocXml = (buf: Buffer): string => {
    let offset = 0;
    while (offset + 30 < buf.length) {
      if (buf.readUInt32LE(offset) !== 0x04034b50) break;
      const method = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
      const dataStart = offset + 30 + nameLen + extraLen;
      const data = buf.subarray(dataStart, dataStart + compSize);
      if (name === 'word/document.xml') {
        return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
      }
      offset = dataStart + compSize;
    }
    throw new Error('word/document.xml not found in DOCX archive');
  };

  const settings = createDefaultSettings();
  assert.equal(settings.exportFont, 'Times New Roman');
  assert.equal(settings.exportFontSizePt, 13);
  assert.equal(settings.lineSpacing, 1);
  assert.equal(DOCX_STANDARD_FORMAT.firstLineIndentTwips, 720);
  assert.equal(DOCX_STANDARD_FORMAT.spacingBeforeTwips, 120);
  assert.equal(DOCX_STANDARD_FORMAT.lineTwipsSingle, 240);

  for (const templateType of ['thcs_thpt_tien_trinh', 'tieu_hoc_2_cot'] as const) {
    const plan = createBasePlan();
    plan.templateType = templateType;

    for (const scope of ['all', 'main_only', 'worksheets_only', 'teacher_guide_only'] as const) {
      const { doc } = createLessonPlanDocxDocument(plan, scope, settings);
      const buf = await Packer.toBuffer(doc);
      const xml = extractDocXml(buf);

      // Every text run uses size 26 (13pt) and Times New Roman
      const sizes = new Set(Array.from(xml.matchAll(/<w:sz w:val="(\d+)"/g)).map((m) => m[1]));
      assert.deepEqual([...sizes], ['26'], `${templateType}/${scope} must use 13pt everywhere`);
      assert.ok(xml.includes('w:ascii="Times New Roman"'));

      // Table cells must have vertical center, 0 indent, 0pt spacing, single line spacing, center align
      const cells = xml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? [];
      assert.ok(cells.length > 0 || scope === 'worksheets_only', 'Expected tables when applicable');
      for (const tc of cells) {
        assert.ok(tc.includes('<w:vAlign w:val="center"/>'), 'Table cell must vertically center');
        const cellParas = tc.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? [];
        for (const p of cellParas) {
          assert.ok(p.includes('<w:ind w:firstLine="0"/>'), 'Table paragraph must have 0 indent');
          assert.ok(p.includes('<w:jc w:val="center"/>'), 'Table paragraph must center horizontally');
          assert.ok(
            p.includes('w:after="0" w:before="0" w:line="240" w:lineRule="auto"'),
            'Table paragraph must have 0pt before/after and single line spacing'
          );
        }
      }

      // Non-table heading/body paragraphs (outside <w:tc> and excluding centered banner/pagebreak)
      const xmlWithoutTables = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '');
      const bodyParas = xmlWithoutTables.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? [];
      const justifiedBodyParas = bodyParas.filter((p) => p.includes('<w:jc w:val="both"/>'));
      assert.ok(justifiedBodyParas.length > 0, `Expected justified headings/paragraphs for ${scope}`);
      for (const p of justifiedBodyParas) {
        assert.ok(p.includes('<w:ind w:firstLine="720"/>'), 'Heading/paragraph must indent 1.27cm (720 twips)');
        assert.ok(
          p.includes('w:after="0" w:before="120" w:line="240" w:lineRule="auto"'),
          'Heading/paragraph must have before 6pt (120 twips), after 0pt, and single line spacing'
        );
      }
    }
  }
});

test('redesigned Section I objectives structure, activity references, evidence labels, and sample plan validation', async () => {
  const { createSampleLessonPlan } = await import('./templatesAndSamples');
  const sample = createSampleLessonPlan();
  const sampleValidation = validateLessonPlanData(sample);
  assert.equal(sampleValidation.success, true);
  const sampleIssues = validateLessonPlanCode(sample);
  assert.equal(
    sampleIssues.filter((i) => i.severity === 'can_sua').length,
    0,
    `Expected zero critical errors in sample plan, got: ${sampleIssues.map((i) => i.title).join('; ')}`
  );

  const plan = createBasePlan();
  plan.inputSnapshot.subject = 'Tin học';
  plan.inputSnapshot.grade = '10';
  plan.inputSnapshot.pedagogicalOptions.digitalCompetence = true;
  plan.objectives = [
    {
      id: 'obj-1',
      code: 'MT1',
      category: 'kien_thuc',
      title: '',
      frameworkCode: '',
      description: 'Nhận biết và thao tác khởi động, tắt đúng quy trình các thiết bị số cá nhân thông dụng.',
      sourceType: 'trich_nguon',
      needsConfirmation: false,
      sourceRef: '',
    },
    {
      id: 'obj-2',
      code: 'MT2',
      category: 'nang_luc_dac_thu',
      title: 'Năng lực Tương tác thông qua công nghệ số',
      frameworkCode: '2.1.NC1a',
      description: 'Học sinh tự thao tác thành thạo trên các thiết bị số di động cá nhân.',
      sourceType: 'trich_nguon',
      needsConfirmation: false,
      sourceRef: 'CV 3456',
    },
    {
      id: 'obj-3',
      code: 'MT3',
      category: 'nang_luc_dac_thu',
      title: 'Năng lực Sử dụng Trí tuệ nhân tạo',
      frameworkCode: '6.2.NC1a',
      description: 'Học sinh biết cách kích hoạt và đưa ra câu lệnh bằng giọng nói.',
      sourceType: 'trich_nguon',
      needsConfirmation: false,
      sourceRef: 'CV 3456',
    },
    {
      id: 'obj-4',
      code: 'MT4',
      category: 'nang_luc_chung',
      title: '',
      frameworkCode: '',
      description: 'Năng lực tự chủ và tự học: Chủ động khám phá các tính năng mới.',
      sourceType: 'de_xuat',
      needsConfirmation: false,
      sourceRef: '',
    },
    {
      id: 'obj-5',
      code: 'MT5',
      category: 'pham_chat',
      title: 'Trung thực & Trách nhiệm',
      frameworkCode: '',
      description: 'Ý thức tự bảo vệ tài sản số cá nhân và tôn trọng dữ liệu riêng tư.',
      sourceType: 'de_xuat',
      needsConfirmation: false,
      sourceRef: '',
    },
  ];

  const struct = buildObjectivesExportStructure(plan);
  assert.equal(struct.sectionTitle, 'I. MỤC TIÊU BÀI HỌC');
  assert.equal(struct.knowledgeHeading, '1.1. Kiến thức:');
  assert.equal(struct.competencyHeading, '1.2. Định hướng phát triển năng lực:');
  assert.equal(struct.specificHeading, 'a) Năng lực đặc thù (Môn Tin học - Khung Năng lực số):');
  assert.equal(struct.generalHeading, 'b) Năng lực chung:');
  assert.equal(struct.qualityHeading, '1.3. Phẩm chất:');

  assert.equal(struct.knowledgeItems[0].boldPrefix, false);
  assert.equal(struct.knowledgeItems[0].prefixLabel, '');
  assert.equal(struct.specificItems[0].boldPrefix, true);
  assert.equal(struct.specificItems[0].prefixLabel, 'Năng lực Tương tác thông qua công nghệ số (Mã 2.1.NC1a)');
  assert.equal(struct.specificItems[1].prefixLabel, 'Năng lực Sử dụng Trí tuệ nhân tạo (Mã 6.2.NC1a)');
  assert.equal(struct.generalItems[0].boldPrefix, false);
  assert.equal(struct.generalItems[0].prefixLabel, 'Năng lực tự chủ và tự học');
  assert.equal(struct.qualityItems[0].boldPrefix, false);
  assert.equal(struct.qualityItems[0].prefixLabel, 'Trung thực & Trách nhiệm');

  const compact = formatActivityObjectiveSummary(['obj-1', 'obj-2', 'obj-4'], plan.objectives, 'compact');
  assert.equal(compact, 'Kiến thức; Năng lực Tương tác thông qua công nghệ số (Mã 2.1.NC1a); Năng lực tự chủ và tự học');

  const evLabel = formatEvidenceRowObjectiveLabel({ objectiveId: 'obj-2', objectiveCode: 'MT2' }, plan.objectives);
  assert.equal(evLabel, 'Năng lực Tương tác thông qua công nghệ số (Mã 2.1.NC1a)');
});

test('DOCX XML renders Section I headings, bold/italic styles, bold specific prefixes, and preserves 13pt TNR formatting', async () => {
  const { Packer } = await import('docx');
  const { inflateRawSync } = await import('node:zlib');
  const { createDefaultSettings } = await import('./templatesAndSamples');
  const { createLessonPlanDocxDocument } = await import('./docxExporter');

  const extractDocXml = (buf: Buffer): string => {
    let offset = 0;
    while (offset + 30 < buf.length) {
      if (buf.readUInt32LE(offset) !== 0x04034b50) break;
      const method = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
      const dataStart = offset + 30 + nameLen + extraLen;
      const data = buf.subarray(dataStart, dataStart + compSize);
      if (name === 'word/document.xml') {
        return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
      }
      offset = dataStart + compSize;
    }
    throw new Error('word/document.xml not found in DOCX archive');
  };

  const plan = createBasePlan();
  plan.inputSnapshot.subject = 'Tin học';
  plan.inputSnapshot.grade = '10';
  plan.inputSnapshot.pedagogicalOptions.digitalCompetence = true;
  plan.objectives = [
    {
      id: 'obj-1',
      code: 'MT1',
      category: 'kien_thuc',
      title: '',
      frameworkCode: '',
      description: 'Nhận biết thiết bị số cá nhân.',
      sourceType: 'trich_nguon',
      needsConfirmation: false,
      sourceRef: '',
    },
    {
      id: 'obj-2',
      code: 'MT2',
      category: 'nang_luc_dac_thu',
      title: 'Năng lực Tương tác thông qua công nghệ số',
      frameworkCode: '2.1.NC1a',
      description: 'Học sinh thao tác thành thạo trên thiết bị số.',
      sourceType: 'trich_nguon',
      needsConfirmation: false,
      sourceRef: '',
    },
    {
      id: 'obj-3',
      code: 'MT3',
      category: 'nang_luc_chung',
      title: 'Năng lực tự chủ và tự học',
      frameworkCode: '',
      description: 'Chủ động khám phá tính năng mới.',
      sourceType: 'de_xuat',
      needsConfirmation: false,
      sourceRef: '',
    },
    {
      id: 'obj-4',
      code: 'MT4',
      category: 'pham_chat',
      title: 'Trung thực & Trách nhiệm',
      frameworkCode: '',
      description: 'Tôn trọng dữ liệu riêng tư.',
      sourceType: 'de_xuat',
      needsConfirmation: false,
      sourceRef: '',
    },
  ];
  plan.activities[0].objectiveIds = ['obj-1', 'obj-2'];
  plan.objectiveEvidenceMap = [
    {
      objectiveId: 'obj-2',
      objectiveCode: 'MT2',
      activityIds: ['act-1'],
      productEvidence: 'Sản phẩm thực hành',
      assessmentMethod: 'Quan sát',
    },
  ];

  const { doc } = createLessonPlanDocxDocument(plan, 'all', createDefaultSettings());
  const buf = await Packer.toBuffer(doc);
  const xml = extractDocXml(buf);

  assert.ok(xml.includes('I. MỤC TIÊU BÀI HỌC'));
  assert.ok(xml.includes('1.1. Kiến thức:'));
  assert.ok(xml.includes('1.2. Định hướng phát triển năng lực:'));
  assert.ok(xml.includes('a) Năng lực đặc thù (Môn Tin học - Khung Năng lực số):'));
  assert.ok(xml.includes('b) Năng lực chung:'));
  assert.ok(xml.includes('1.3. Phẩm chất:'));
  assert.ok(xml.includes('Năng lực Tương tác thông qua công nghệ số (Mã 2.1.NC1a):'));
  assert.ok(!xml.includes('[MT1]'));
  assert.ok(!xml.includes('[MT2]'));

  // Verify a) Năng lực đặc thù paragraph has bold and italic
  const specificHeadingPara = (xml.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? []).find((p) =>
    p.includes('a) Năng lực đặc thù (Môn Tin học - Khung Năng lực số):')
  );
  assert.ok(specificHeadingPara);
  assert.ok(specificHeadingPara.includes('<w:b/>'));
  assert.ok(specificHeadingPara.includes('<w:i/>'));
  assert.ok(specificHeadingPara.includes('<w:ind w:firstLine="720"/>'));
  assert.ok(specificHeadingPara.includes('<w:jc w:val="both"/>'));

  // Verify specific competency prefix is bold while bullet '- ' is not bold
  const specificItemPara = (xml.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? []).find((p) =>
    p.includes('Năng lực Tương tác thông qua công nghệ số (Mã 2.1.NC1a):')
  );
  assert.ok(specificItemPara);
  const boldRunMatch = specificItemPara.match(
    /<w:r><w:rPr>[\s\S]*?<w:b\/>[\s\S]*?<\/w:rPr><w:t[^>]*>Năng lực Tương tác thông qua công nghệ số \(Mã 2\.1\.NC1a\):<\/w:t><\/w:r>/
  );
  assert.ok(boldRunMatch, 'Specific competency prefix must be rendered in a bold run');
});

test('DOCX export renders 136-dot 2-line Section IV, signature block, and omits Appendix Section 7', async () => {
  const { Packer } = await import('docx');
  const { inflateRawSync } = await import('node:zlib');
  const { createDefaultSettings } = await import('./templatesAndSamples');
  const { createLessonPlanDocxDocument } = await import('./docxExporter');

  const extractDocXml = (buf: Buffer): string => {
    let offset = 0;
    while (offset + 30 < buf.length) {
      if (buf.readUInt32LE(offset) !== 0x04034b50) break;
      const method = buf.readUInt16LE(offset + 8);
      const compSize = buf.readUInt32LE(offset + 18);
      const nameLen = buf.readUInt16LE(offset + 26);
      const extraLen = buf.readUInt16LE(offset + 28);
      const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
      const dataStart = offset + 30 + nameLen + extraLen;
      const data = buf.subarray(dataStart, dataStart + compSize);
      if (name === 'word/document.xml') {
        return (method === 8 ? inflateRawSync(data) : data).toString('utf8');
      }
      offset = dataStart + compSize;
    }
    throw new Error('word/document.xml not found in DOCX archive');
  };

  const plan = createBasePlan();
  plan.inputSnapshot.teacherName = 'Trần Công Toàn';
  plan.sourceReferences = [
    {
      documentName: 'lop 10 bai 16.pdf',
      pageOrSection: 'Trang 1-5',
      excerpt: 'Nội dung mẫu',
      mappedTo: 'Hoạt động 1',
    },
  ];
  plan.itemsNeedingConfirmation = ['Kiểm tra lại mã năng lực'];

  for (const scope of ['main_only', 'all'] as const) {
    const { doc } = createLessonPlanDocxDocument(plan, scope, createDefaultSettings());
    const buf = await Packer.toBuffer(doc);
    const xml = extractDocXml(buf);

    // 1. Section IV has two 136-dot rows (trimmed 8 dots from 144)
    const exact136Dots = '.'.repeat(136);
    const exact137PlusDots = '.'.repeat(137);
    const matches136 = xml.match(new RegExp(exact136Dots.replace(/\./g, '\\.'), 'g')) ?? [];
    assert.equal(matches136.length, 2, `${scope}: Section IV must have 2 lines of 136 dots`);
    assert.ok(!xml.includes(exact137PlusDots), `${scope}: Section IV must not exceed 136 dots per row`);

    // 2. Signature block present
    assert.ok(xml.includes('DUYỆT CỦA TỔ CHUYÊN MÔN'), `${scope}: Missing Duyệt của Tổ chuyên môn`);
    assert.ok(xml.includes('GIÁO VIÊN GIẢNG DẠY'), `${scope}: Missing Giáo viên giảng dạy`);
    assert.ok(xml.includes('(Ký và ghi rõ họ tên)'), `${scope}: Missing signature instruction`);
    assert.ok(xml.includes('Trần Công Toàn'), `${scope}: Missing teacher name under signature`);

    // 3. Section 7 omitted even when sourceReferences / itemsNeedingConfirmation exist
    assert.ok(!xml.includes('7. Nguồn tham khảo'), `${scope}: Section 7 must be omitted`);
    assert.ok(!xml.includes('lop 10 bai 16.pdf'), `${scope}: sourceReferences must not appear in export`);
    assert.ok(!xml.includes('Cần xác nhận:'), `${scope}: itemsNeedingConfirmation must not appear in export`);
  }
});

test('compactFrameworkCitations and normalizePlanCompactCitations shorten CV 3456 and QD 2422 across plans and DOCX exports', async () => {
  assert.equal(
    compactFrameworkCitations('Năng lực số (CV 3456/BGDĐT-GDPT, bậc L10-L11-L12) và AI (QĐ 2422/QĐ-BGDĐT).'),
    'Năng lực số (CV 3456) và AI (QĐ 2422).'
  );
  assert.equal(
    compactFrameworkCitations('Giữ nguyên (CV 3456) và (QĐ 2422).'),
    'Giữ nguyên (CV 3456) và (QĐ 2422).'
  );

  const plan = createBasePlan();
  plan.objectives[0].description = 'Tích hợp theo (CV 3456/BGDĐT-GDPT, bậc L10-L11-L12).';
  plan.activities[0].assessmentCriteria = 'Đánh giá quá trình theo (QĐ 2422/QĐ-BGDĐT).';

  const normalized = normalizePlanCompactCitations(plan);
  assert.equal(normalized.objectives[0].description, 'Tích hợp theo (CV 3456).');
  assert.equal(normalized.activities[0].assessmentCriteria, 'Đánh giá quá trình theo (QĐ 2422).');

  const { Packer } = await import('docx');
  const { inflateRawSync } = await import('node:zlib');
  const { createDefaultSettings } = await import('./templatesAndSamples');
  const { createLessonPlanDocxDocument } = await import('./docxExporter');

  const { doc } = createLessonPlanDocxDocument(plan, 'all', createDefaultSettings());
  const buf = await Packer.toBuffer(doc);
  let offset = 0;
  let xml = '';
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (name === 'word/document.xml') {
      xml = (method === 8 ? inflateRawSync(data) : data).toString('utf8');
      break;
    }
    offset = dataStart + compSize;
  }
  assert.ok(xml.includes('(CV 3456)'));
  assert.ok(xml.includes('(QĐ 2422)'));
  assert.ok(!xml.includes('CV 3456/BGDĐT-GDPT'));
  assert.ok(!xml.includes('QĐ 2422/QĐ-BGDĐT'));
});

test('CV 5512 Appendix 4 template exists, drives prompt guidance, and exports official Appendix 4 structure', async () => {
  const { Packer } = await import('docx');
  const { inflateRawSync } = await import('node:zlib');
  const { BUILT_IN_TEMPLATES, createDefaultSettings } = await import('./templatesAndSamples');
  const { createLessonPlanDocxDocument } = await import('./docxExporter');
  const { buildGeneratePlanPrompt } = await import('../../server/prompts.ts');

  const cvTpl = BUILT_IN_TEMPLATES.find((t) => t.id === 'tpl-thcs-thpt-cv5512');
  assert.ok(cvTpl, 'BUILT_IN_TEMPLATES must include tpl-thcs-thpt-cv5512');
  assert.equal(cvTpl.structureType, 'thcs_thpt_cv5512');

  const plan = createBasePlan();
  plan.templateType = 'thcs_thpt_cv5512';
  plan.inputSnapshot.templateId = 'tpl-thcs-thpt-cv5512';

  const prompt = buildGeneratePlanPrompt(plan.inputSnapshot, cvTpl);
  assert.ok(prompt.includes('PHỤ LỤC IV — CÔNG VĂN 5512/BGDĐT-GDTrH'));
  assert.ok(prompt.includes('Xác định vấn đề/nhiệm vụ học tập/Mở đầu'));

  const model = prepareDocxExportModel(plan, 'all');
  assert.equal(model.isCv5512Appendix4, true);

  const objStruct = buildObjectivesExportStructure(plan);
  assert.equal(objStruct.sectionTitle, 'I. MỤC TIÊU');
  assert.equal(objStruct.knowledgeHeading, '1. Về kiến thức:');
  assert.equal(objStruct.competencyHeading, '2. Về năng lực:');
  assert.equal(objStruct.qualityHeading, '3. Về phẩm chất:');

  const { doc } = createLessonPlanDocxDocument(plan, 'all', createDefaultSettings());
  const buf = await Packer.toBuffer(doc);
  let offset = 0;
  let xml = '';
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (name === 'word/document.xml') {
      xml = (method === 8 ? inflateRawSync(data) : data).toString('utf8');
      break;
    }
    offset = dataStart + compSize;
  }

  assert.ok(xml.includes('1. Về kiến thức:'));
  assert.ok(xml.includes('b) Nội dung:'));
  assert.ok(xml.includes('c) Sản phẩm:'));
  assert.ok(xml.includes('- Giao nhiệm vụ học tập:'));
  assert.ok(xml.includes('- Thực hiện nhiệm vụ:'));
  assert.ok(xml.includes('- Báo cáo, thảo luận:'));
  assert.ok(xml.includes('- Kết luận, nhận định:'));
  assert.ok(xml.includes('DUYỆT CỦA TỔ CHUYÊN MÔN'));
});

test('safeReadJsonResponse parses JSON and safely handles non-JSON HTTP 504/502 proxy errors', async () => {
  const { safeReadJsonResponse } = await import('./http');

  const okRes = new Response(JSON.stringify({ jobId: 'job-1', status: 'generating' }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  });
  const okParsed = await safeReadJsonResponse<{ jobId: string; status: string }>(okRes);
  assert.equal(okParsed.ok, true);
  assert.equal(okParsed.status, 202);
  assert.equal(okParsed.data?.jobId, 'job-1');

  const htmlTimeoutRes = new Response('<html><body>504 Gateway Time-out</body></html>', {
    status: 504,
    headers: { 'Content-Type': 'text/html' },
  });
  const timeoutParsed = await safeReadJsonResponse<{ message?: string }>(htmlTimeoutRes);
  assert.equal(timeoutParsed.ok, false);
  assert.equal(timeoutParsed.status, 504);
  assert.equal(timeoutParsed.data, null);
  assert.match(timeoutParsed.fallbackErrorMessage, /HTTP 504/);
});

test('createUserGuideDocxDocument generates official Decree 30/2020/ND-CP administrative DOCX with 13pt Times New Roman formatting', async () => {
  const { Packer } = await import('docx');
  const { inflateRawSync } = await import('node:zlib');
  const { createDefaultProfile, createDefaultSettings } = await import('./templatesAndSamples');
  const {
    createDefaultAdminGuideMetadata,
    createUserGuideDocxDocument,
  } = await import('./userGuideDocx');

  const profile = createDefaultProfile();
  const settings = createDefaultSettings();
  const metadata = createDefaultAdminGuideMetadata(profile);
  const { doc, fileName } = createUserGuideDocxDocument(metadata, settings);

  assert.equal(fileName, 'Huong_dan_su_dung_Ke_Hoach_Bai_Day_AI.docx');

  const buf = await Packer.toBuffer(doc);
  let offset = 0;
  const files: Record<string, string> = {};
  while (offset + 30 < buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (name.endsWith('.xml')) {
      files[name] = (method === 8 ? inflateRawSync(data) : data).toString('utf8');
    }
    offset = dataStart + compSize;
  }

  const xml = files['word/document.xml'] || '';
  assert.ok(xml.length > 0, 'word/document.xml must exist');

  // Administrative document elements (Nghị định 30/2020/NĐ-CP)
  assert.ok(xml.includes('TRƯỜNG THPT ĐẮK SONG'));
  assert.ok(xml.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'));
  assert.ok(xml.includes('Độc lập - Tự do - Hạnh phúc'));
  assert.ok(xml.includes('Số: 01/HD-KHBD'));
  assert.ok(xml.includes('HƯỚNG DẪN'));
  assert.ok(xml.includes('Nơi nhận:'));
  assert.ok(xml.includes('HIỆU TRƯỞNG'));
  assert.ok(xml.includes('Trần Công Toàn'));
  assert.ok(xml.includes('<w:titlePg/>'), 'Page number must be suppressed on page 1');

  // Margins: top/bottom 20mm (1133 twips), left 30mm (1700 twips), right 15mm (850 twips)
  assert.ok(xml.includes('w:top="1133"'));
  assert.ok(xml.includes('w:bottom="1133"'));
  assert.ok(xml.includes('w:left="1700"'));
  assert.ok(xml.includes('w:right="850"'));

  // 13pt Times New Roman everywhere
  const sizes = new Set(Array.from(xml.matchAll(/<w:sz w:val="(\d+)"/g)).map((m) => m[1]));
  assert.deepEqual([...sizes], ['26']);
  assert.ok(xml.includes('w:ascii="Times New Roman"'));

  // Table cells: 0 indent, 0pt spacing, single line spacing, centered
  const cells = xml.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? [];
  assert.ok(cells.length >= 6);
  for (const tc of cells) {
    assert.ok(tc.includes('<w:vAlign w:val="center"/>'));
    const cellParas = tc.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? [];
    for (const p of cellParas) {
      assert.ok(p.includes('<w:ind w:firstLine="0"/>'));
      assert.ok(p.includes('<w:jc w:val="center"/>'));
      assert.ok(p.includes('w:after="0" w:before="0" w:line="240" w:lineRule="auto"'));
    }
  }

  // Justified body paragraphs: 1.27cm indent (720 twips), before 6pt (120 twips), single line spacing
  const xmlWithoutTables = xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, '');
  const bodyParas = (xmlWithoutTables.match(/<w:p>[\s\S]*?<\/w:p>/g) ?? []).filter((p) =>
    p.includes('<w:jc w:val="both"/>')
  );
  assert.ok(bodyParas.length >= 15);
  for (const p of bodyParas) {
    assert.ok(p.includes('<w:ind w:firstLine="720"/>'));
    assert.ok(p.includes('w:after="0" w:before="120" w:line="240" w:lineRule="auto"'));
  }
});


