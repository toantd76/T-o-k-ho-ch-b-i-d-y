import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import { z } from 'zod';
import {
  GrammarCheckScopeSchema,
  LessonInputSchema,
  type LessonPlan,
  LessonPlanSchema,
  LessonTemplateSchema,
} from './src/types/lesson.ts';
import {
  AiServiceError,
  checkGrammarAndStyleWithAi,
  editActivityWithAi,
  extractDocumentMediaWithAi,
  generateLessonPlanFromAi,
  getAiStatus,
  isAiConfigured,
  reviewLessonPlanWithAi,
} from './server/gemini.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Giới hạn tần suất đơn giản theo IP (sliding window 60s)
const rateBuckets = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

interface GenerateJobState {
  id: string;
  status: 'generating' | 'validating' | 'done' | 'error' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  receivedChars: number;
  plan?: LessonPlan;
  errorCode?: string;
  message?: string;
  abortController: AbortController;
}

const generateJobs = new Map<string, GenerateJobState>();
const JOB_TTL_MS = 15 * 60_000;

function pruneExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of generateJobs.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS && job.status !== 'generating' && job.status !== 'validating') {
      generateJobs.delete(id);
    }
  }
  if (generateJobs.size > 200) {
    const oldest = Array.from(generateJobs.values())
      .filter((j) => j.status === 'done' || j.status === 'error' || j.status === 'cancelled')
      .sort((a, b) => a.updatedAt - b.updatedAt);
    for (const j of oldest.slice(0, generateJobs.size - 200)) {
      generateJobs.delete(j.id);
    }
  }
}

function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const recent = (rateBuckets.get(ip) ?? []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    res.status(429).json({
      errorCode: 'rate_limited',
      message: 'Thầy/cô gửi yêu cầu AI hơi nhanh. Vui lòng đợi khoảng 1 phút rồi thử lại.',
    });
    return;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  next();
}

const GeneratePlanBodySchema = z.object({
  input: LessonInputSchema.extend({
    grade: z.string().min(1),
    subject: z.string().min(1),
    lessonTitle: z.string().min(1),
  }),
  template: LessonTemplateSchema.optional(),
});

const EditActivityBodySchema = z.object({
  plan: LessonPlanSchema,
  activityId: z.string().min(1),
  instruction: z.string().min(2).max(1500),
});

const ReviewPlanBodySchema = z.object({
  plan: LessonPlanSchema,
});

const ExtractMediaBodySchema = z.object({
  base64Data: z.string().min(10),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  fileName: z.string().min(1).max(200),
});

const CheckGrammarBodySchema = z.object({
  plan: LessonPlanSchema,
  scope: GrammarCheckScopeSchema.default('all'),
  activityId: z.string().optional(),
});

function createDisconnectAbortController(res: Response): AbortController {
  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) {
      abortController.abort(new Error('aborted'));
    }
  });
  return abortController;
}

function handleApiError(err: unknown, res: Response) {
  if (err instanceof AiServiceError) {
    res.status(err.status).json({
      errorCode: err.code,
      message: err.message,
    });
    return;
  }
  res.status(500).json({
    errorCode: 'network_error',
    message: 'Có lỗi xử lý trên máy chủ. Vui lòng thử lại sau.',
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/ai/status', (_req, res) => {
    res.json(getAiStatus());
  });

  app.post('/api/ai/generate-plan/jobs', aiRateLimiter, (req, res) => {
    const parsed = GeneratePlanBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errorCode: 'invalid_input',
        message: 'Thông tin bài học gửi lên chưa đầy đủ hoặc sai định dạng.',
      });
      return;
    }
    if (!isAiConfigured()) {
      res.status(503).json({
        errorCode: 'ai_not_configured',
        message: 'Cần cấu hình kết nối AI trên máy chủ trước khi tạo hoặc chỉnh sửa bằng AI.',
      });
      return;
    }

    pruneExpiredJobs();
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const job: GenerateJobState = {
      id: jobId,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
      receivedChars: 0,
      abortController: new AbortController(),
    };
    generateJobs.set(jobId, job);

    generateLessonPlanFromAi(
      parsed.data.input,
      parsed.data.template,
      job.abortController.signal,
      (progress) => {
        if (job.status === 'cancelled') return;
        if (progress.stage) job.status = progress.stage;
        if (typeof progress.receivedChars === 'number') {
          job.receivedChars = progress.receivedChars;
        }
        job.updatedAt = Date.now();
      }
    )
      .then((plan) => {
        if (job.status === 'cancelled') return;
        job.status = 'done';
        job.plan = plan;
        job.updatedAt = Date.now();
      })
      .catch((err) => {
        if (job.status === 'cancelled') return;
        if (err instanceof AiServiceError) {
          job.status = err.code === 'aborted' ? 'cancelled' : 'error';
          job.errorCode = err.code;
          job.message = err.message;
        } else {
          job.status = 'error';
          job.errorCode = 'network_error';
          job.message = 'Có lỗi xử lý trên máy chủ. Vui lòng thử lại sau.';
        }
        job.updatedAt = Date.now();
      });

    res.status(202).json({
      jobId: job.id,
      status: job.status,
    });
  });

  app.get('/api/ai/generate-plan/jobs/:jobId', (req, res) => {
    const job = generateJobs.get(req.params.jobId);
    if (!job) {
      res.status(404).json({
        errorCode: 'job_not_found',
        message:
          'Phiên tạo kế hoạch đã hết hạn hoặc máy chủ vừa khởi động lại. Dữ liệu nhập của thầy/cô vẫn được giữ nguyên để thử lại.',
      });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      jobId: job.id,
      status: job.status,
      receivedChars: job.receivedChars,
      elapsedMs: Date.now() - job.createdAt,
      plan: job.status === 'done' ? job.plan : undefined,
      errorCode: job.errorCode,
      message: job.message,
    });
  });

  app.delete('/api/ai/generate-plan/jobs/:jobId', (req, res) => {
    const job = generateJobs.get(req.params.jobId);
    if (job) {
      job.status = 'cancelled';
      job.updatedAt = Date.now();
      job.abortController.abort(new Error('aborted'));
    }
    res.json({ ok: true });
  });

  app.post('/api/ai/generate-plan', aiRateLimiter, async (req, res) => {
    const parsed = GeneratePlanBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errorCode: 'invalid_input',
        message: 'Thông tin bài học gửi lên chưa đầy đủ hoặc sai định dạng.',
      });
      return;
    }

    const abortController = createDisconnectAbortController(res);

    try {
      const plan = await generateLessonPlanFromAi(
        parsed.data.input,
        parsed.data.template,
        abortController.signal
      );
      if (!res.writableEnded) {
        res.json({ plan });
      }
    } catch (err) {
      if (!res.writableEnded) {
        handleApiError(err, res);
      }
    }
  });

  app.post('/api/ai/edit-activity', aiRateLimiter, async (req, res) => {
    const parsed = EditActivityBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errorCode: 'invalid_input',
        message: 'Yêu cầu chỉnh sửa hoạt động chưa hợp lệ.',
      });
      return;
    }

    const abortController = createDisconnectAbortController(res);

    try {
      const proposal = await editActivityWithAi(
        parsed.data.plan,
        parsed.data.activityId,
        parsed.data.instruction,
        abortController.signal
      );
      if (!res.writableEnded) {
        res.json({ proposal });
      }
    } catch (err) {
      if (!res.writableEnded) {
        handleApiError(err, res);
      }
    }
  });

  app.post('/api/ai/review-plan', aiRateLimiter, async (req, res) => {
    const parsed = ReviewPlanBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errorCode: 'invalid_input',
        message: 'Dữ liệu kế hoạch chưa hợp lệ để rà soát.',
      });
      return;
    }

    const abortController = createDisconnectAbortController(res);

    try {
      const issues = await reviewLessonPlanWithAi(parsed.data.plan, abortController.signal);
      if (!res.writableEnded) {
        res.json({ issues });
      }
    } catch (err) {
      if (!res.writableEnded) {
        handleApiError(err, res);
      }
    }
  });

  app.post('/api/ai/extract-media', aiRateLimiter, async (req, res) => {
    const parsed = ExtractMediaBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errorCode: 'invalid_input',
        message: 'Tệp hình ảnh/PDF gửi lên không đúng định dạng hỗ trợ.',
      });
      return;
    }

    const abortController = createDisconnectAbortController(res);

    try {
      const result = await extractDocumentMediaWithAi(
        parsed.data.base64Data,
        parsed.data.mimeType,
        parsed.data.fileName,
        abortController.signal
      );
      if (!res.writableEnded) {
        res.json(result);
      }
    } catch (err) {
      if (!res.writableEnded) {
        handleApiError(err, res);
      }
    }
  });

  app.post('/api/ai/check-grammar', aiRateLimiter, async (req, res) => {
    const parsed = CheckGrammarBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errorCode: 'invalid_input',
        message: 'Dữ liệu kiểm tra ngữ pháp và diễn đạt chưa hợp lệ.',
      });
      return;
    }

    const abortController = createDisconnectAbortController(res);

    try {
      const suggestions = await checkGrammarAndStyleWithAi(
        parsed.data.plan,
        parsed.data.scope,
        parsed.data.activityId,
        abortController.signal
      );
      if (!res.writableEnded) {
        res.json({ suggestions });
      }
    } catch (err) {
      if (!res.writableEnded) {
        handleApiError(err, res);
      }
    }
  });

  if (isProduction) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ke Hoach Bai Day AI server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
