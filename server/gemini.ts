import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import {
  type AiActivityEditProposal,
  type AiStatusInfo,
  type GrammarCheckScope,
  type GrammarStyleSuggestion,
  GrammarStyleSuggestionSchema,
  LearningActivitySchema,
  type LessonInput,
  type LessonPlan,
  LessonPlanSchema,
  type LessonTemplate,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  type ValidationIssue,
  ValidationIssueSchema,
} from '../src/types/lesson.ts';
import {
  buildEditActivityPrompt,
  buildGeneratePlanPrompt,
  buildGrammarStyleCheckPrompt,
  buildRepairJsonPrompt,
  buildSemanticReviewPrompt,
  SYSTEM_INSTRUCTION_BASE,
} from './prompts.ts';
import {
  normalizeActivityCompactCitations,
  normalizePlanCompactCitations,
} from '../src/lib/lessonLogic.ts';

const DEFAULT_MODEL = 'gemini-4-hydrogen';

export class AiServiceError extends Error {
  code:
    | 'ai_not_configured'
    | 'rate_limited'
    | 'timeout'
    | 'invalid_output'
    | 'network_error'
    | 'aborted';
  status: number;

  constructor(
    code:
      | 'ai_not_configured'
      | 'rate_limited'
      | 'timeout'
      | 'invalid_output'
      | 'network_error'
      | 'aborted',
    message: string,
    status = 500
  ) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function getConfiguredModel(): string {
  const envModel = (process.env.GEMINI_MODEL || '').trim();
  return envModel || DEFAULT_MODEL;
}

export function isAiConfigured(): boolean {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.length > 10);
}

export function getAiStatus(): AiStatusInfo {
  const configured = isAiConfigured();
  const model = getConfiguredModel();
  if (!configured) {
    return {
      configured: false,
      model,
      message:
        'Cần cấu hình kết nối AI: quản trị viên vui lòng thiết lập biến môi trường GEMINI_API_KEY trong bảng Secrets của môi trường chạy.',
    };
  }
  return {
    configured: true,
    model,
    message: `Kết nối AI sẵn sàng (Model cấu hình: ${model}).`,
  };
}

function createGeminiClient(): GoogleGenAI {
  if (!isAiConfigured()) {
    throw new AiServiceError(
      'ai_not_configured',
      'Cần cấu hình kết nối AI trên máy chủ trước khi tạo hoặc chỉnh sửa bằng AI.',
      503
    );
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

function classifyGeminiError(err: unknown): AiServiceError {
  if (err instanceof AiServiceError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('abort') || lower.includes('cancel')) {
    return new AiServiceError('aborted', 'Yêu cầu tạo kế hoạch đã được dừng.', 499);
  }
  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return new AiServiceError(
      'rate_limited',
      'Hệ thống AI đang bận hoặc tạm vượt giới hạn lượt gọi. Vui lòng đợi vài giây rồi thử lại.',
      429
    );
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('etimedout')) {
    return new AiServiceError(
      'timeout',
      'Kết nối tới dịch vụ AI bị quá thời gian phản hồi. Dữ liệu nháp của thầy/cô vẫn được giữ nguyên.',
      504
    );
  }
  if (
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403')
  ) {
    return new AiServiceError(
      'ai_not_configured',
      'Cần cấu hình kết nối AI hợp lệ trên máy chủ (khóa API chưa hợp lệ hoặc chưa được cấp quyền).',
      503
    );
  }
  return new AiServiceError(
    'network_error',
    'Không thể kết nối ổn định với dịch vụ AI lúc này. Thầy/cô vui lòng thử lại sau.',
    502
  );
}

async function callWithRetryAndTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
  timeoutMs = 120_000,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;
  while (true) {
    if (externalSignal?.aborted) {
      throw new AiServiceError('aborted', 'Yêu cầu đã được dừng theo thao tác của người dùng.', 499);
    }
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error('timeout'));
    }, timeoutMs);
    const onExternalAbort = () => controller.abort(new Error('aborted'));
    externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const result = await fn(controller.signal);
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
      return result;
    } catch (err) {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', onExternalAbort);
      const classified =
        timedOut && !externalSignal?.aborted
          ? new AiServiceError(
              'timeout',
              'Kết nối tới dịch vụ AI bị quá thời gian phản hồi. Dữ liệu nháp của thầy/cô vẫn được giữ nguyên.',
              504
            )
          : classifyGeminiError(err);
      const retryable =
        (classified.code === 'rate_limited' || classified.code === 'network_error') &&
        attempt < maxRetries &&
        !externalSignal?.aborted;
      if (!retryable) {
        if (classified.code === 'network_error') {
          console.error('[AI] Request failed:', err instanceof Error ? err.message : String(err));
        }
        throw classified;
      }
      attempt += 1;
      const delay = 1200 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

const GeneratedPlanCoreSchema = LessonPlanSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  schemaVersion: true,
  promptVersion: true,
  templateType: true,
  tags: true,
  isSample: true,
  inputSnapshot: true,
  postLessonReflection: true,
});

export async function generateLessonPlanFromAi(
  input: LessonInput,
  template: LessonTemplate | undefined,
  externalSignal?: AbortSignal
): Promise<LessonPlan> {
  const ai = createGeminiClient();
  const model = getConfiguredModel();
  const prompt = buildGeneratePlanPrompt(input, template);

  const runModel = async (userPrompt: string, signal: AbortSignal): Promise<string> => {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        abortSignal: signal,
      },
    });
    return stripJsonFence(response.text ?? '');
  };

  let rawJson = await callWithRetryAndTimeout(
    (sig) => runModel(prompt, sig),
    externalSignal,
    150_000,
    2
  );

  const tryParseAndValidate = (raw: string) => {
    try {
      const parsedObj = JSON.parse(raw);
      return GeneratedPlanCoreSchema.safeParse(parsedObj);
    } catch (e) {
      return {
        success: false as const,
        error: {
          issues: [{ path: [], message: e instanceof Error ? e.message : 'JSON parse error' }],
        },
      };
    }
  };

  let validated = tryParseAndValidate(rawJson);

  // Tối đa 1 lần sửa cấu trúc có giới hạn nếu AI trả sai schema nhẹ
  if (!validated.success) {
    const errList = validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    const repairPrompt = buildRepairJsonPrompt(rawJson, errList);
    rawJson = await callWithRetryAndTimeout((sig) => runModel(repairPrompt, sig), externalSignal, 60_000, 0);
    validated = tryParseAndValidate(rawJson);
  }

  if (!validated.success) {
    throw new AiServiceError(
      'invalid_output',
      'Kết quả AI trả về chưa đạt đúng cấu trúc kế hoạch bài dạy. Dữ liệu nhập của thầy/cô vẫn được bảo toàn, vui lòng thử tạo lại.',
      422
    );
  }

  const now = new Date().toISOString();
  const core = validated.data;
  const finalPlan: LessonPlan = {
    id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: core.title || input.lessonTitle,
    status: 'nhap',
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    promptVersion: PROMPT_VERSION,
    templateType: template?.structureType || (input.level === 'tieu_hoc' ? 'tieu_hoc_2_cot' : 'thcs_thpt_tien_trinh'),
    tags: [input.subject, `Lớp ${input.grade}`].filter(Boolean),
    isSample: false,
    inputSnapshot: input,
    assumptions: core.assumptions ?? [],
    objectives: core.objectives,
    resources: core.resources ?? [],
    sessions: core.sessions,
    activities: core.activities,
    worksheets: core.worksheets ?? [],
    questions: core.questions ?? [],
    answerKeys: core.answerKeys ?? [],
    rubrics: core.rubrics ?? [],
    teacherAiPrompts: core.teacherAiPrompts ?? [],
    homework: core.homework ?? '',
    objectiveEvidenceMap: core.objectiveEvidenceMap ?? [],
    sourceReferences: core.sourceReferences ?? [],
    itemsNeedingConfirmation: core.itemsNeedingConfirmation ?? [],
    postLessonReflection: '',
  };

  return normalizePlanCompactCitations(finalPlan);
}

const ActivityEditResponseSchema = z.object({
  updatedActivity: LearningActivitySchema,
  changeSummary: z.string().min(1),
  durationImpactMinutes: z.number().default(0),
  objectiveImpactNote: z.string().default(''),
});

export async function editActivityWithAi(
  plan: LessonPlan,
  activityId: string,
  instruction: string,
  externalSignal?: AbortSignal
): Promise<AiActivityEditProposal> {
  const activity = plan.activities.find((a) => a.id === activityId);
  if (!activity) {
    throw new AiServiceError('invalid_output', 'Không tìm thấy hoạt động cần chỉnh sửa.', 404);
  }

  const ai = createGeminiClient();
  const model = getConfiguredModel();
  const prompt = buildEditActivityPrompt(plan, activity, instruction);

  const raw = await callWithRetryAndTimeout(async (sig) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: sig,
      },
    });
    return stripJsonFence(res.text ?? '');
  }, externalSignal);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiServiceError('invalid_output', 'Đề xuất chỉnh sửa chưa đúng định dạng. Vui lòng thử lại.', 422);
  }

  const check = ActivityEditResponseSchema.safeParse(parsed);
  if (!check.success) {
    throw new AiServiceError('invalid_output', 'Đề xuất chỉnh sửa thiếu thông tin cần thiết. Vui lòng thử lại.', 422);
  }

  return {
    activityId,
    updatedActivity: normalizeActivityCompactCitations({
      ...check.data.updatedActivity,
      id: activity.id,
      sessionNumber: activity.sessionNumber,
      order: activity.order,
    }),
    changeSummary: check.data.changeSummary,
    durationImpactMinutes: check.data.durationImpactMinutes,
    objectiveImpactNote: check.data.objectiveImpactNote,
  };
}

const SemanticReviewResponseSchema = z.object({
  issues: z.array(
    ValidationIssueSchema.omit({ origin: true }).extend({
      origin: z.literal('ai').optional(),
    })
  ),
});

export async function reviewLessonPlanWithAi(
  plan: LessonPlan,
  externalSignal?: AbortSignal
): Promise<ValidationIssue[]> {
  const ai = createGeminiClient();
  const model = getConfiguredModel();
  const prompt = buildSemanticReviewPrompt(plan);

  const raw = await callWithRetryAndTimeout(async (sig) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: sig,
      },
    });
    return stripJsonFence(res.text ?? '');
  }, externalSignal);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiServiceError('invalid_output', 'Không đọc được nhận xét chuyên môn từ AI. Vui lòng thử lại.', 422);
  }

  const check = SemanticReviewResponseSchema.safeParse(parsed);
  if (!check.success) {
    throw new AiServiceError('invalid_output', 'Nhận xét AI chưa hợp lệ cấu trúc.', 422);
  }

  return check.data.issues.map((issue, idx) => ({
    ...issue,
    id: issue.id || `ai-issue-${Date.now()}-${idx}`,
    origin: 'ai' as const,
  }));
}

const ExtractedMediaSchema = z.object({
  extractedText: z.string(),
  unreadableNotes: z.string().default(''),
});

export async function extractDocumentMediaWithAi(
  base64Data: string,
  mimeType: string,
  fileName: string,
  externalSignal?: AbortSignal
): Promise<{ extractedText: string; unreadableNotes: string }> {
  const ai = createGeminiClient();
  const model = getConfiguredModel();

  const raw = await callWithRetryAndTimeout(async (sig) => {
    const res = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Hãy trích xuất chính xác toàn bộ nội dung văn bản, công thức (viết dạng dễ đọc), bảng biểu và câu hỏi có trong tài liệu "${fileName}".
Quy tắc:
- Chỉ ghi những gì thực sự nhìn thấy rõ trong hình/trang tài liệu. Không tự bịa thêm chữ hay số trang.
- Nếu có vùng mờ, bị cắt hoặc chữ viết tay không đọc được, ghi rõ vào trường "unreadableNotes".
- Trả về JSON: { "extractedText": string, "unreadableNotes": string }.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: sig,
      },
    });
    return stripJsonFence(res.text ?? '');
  }, externalSignal);

  try {
    const parsed = JSON.parse(raw);
    const check = ExtractedMediaSchema.safeParse(parsed);
    if (check.success) return check.data;
  } catch {
    // Fallback text if JSON parse fails
  }
  return {
    extractedText: raw,
    unreadableNotes: 'Cần kiểm tra lại định dạng văn bản trích xuất từ hình ảnh.',
  };
}

const GrammarStyleResponseSchema = z.object({
  suggestions: z.array(GrammarStyleSuggestionSchema),
});

export async function checkGrammarAndStyleWithAi(
  plan: LessonPlan,
  scope: GrammarCheckScope,
  activityId?: string,
  externalSignal?: AbortSignal
): Promise<GrammarStyleSuggestion[]> {
  const ai = createGeminiClient();
  const model = getConfiguredModel();
  const prompt = buildGrammarStyleCheckPrompt(plan, scope, activityId);

  const raw = await callWithRetryAndTimeout(async (sig) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: sig,
      },
    });
    return stripJsonFence(res.text ?? '');
  }, externalSignal);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AiServiceError(
      'invalid_output',
      'Không đọc được kết quả kiểm tra ngữ pháp và diễn đạt từ AI. Vui lòng thử lại.',
      422
    );
  }

  const check = GrammarStyleResponseSchema.safeParse(parsed);
  if (!check.success) {
    throw new AiServiceError(
      'invalid_output',
      'Kết quả kiểm tra ngữ pháp chưa đúng cấu trúc. Vui lòng thử lại.',
      422
    );
  }

  return check.data.suggestions.map((s, idx) => ({
    ...s,
    id: s.id || `gs-${Date.now()}-${idx}`,
  }));
}

