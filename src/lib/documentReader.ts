import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { SourceDocRole, SourceDocument } from '../types/lesson';
import { sanitizePlainText } from './lessonLogic';
import { safeReadJsonResponse } from './http';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_TOTAL_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

export function parsePageSelection(selectionStr: string | undefined, maxPages: number): number[] {
  if (!selectionStr || !selectionStr.trim()) {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  const parts = selectionStr.split(/[,;]+/);
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part) continue;
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Math.max(1, Number(rangeMatch[1]));
      const end = Math.min(maxPages, Number(rangeMatch[2]));
      for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
        if (p >= 1 && p <= maxPages) pages.add(p);
      }
    } else if (/^\d+$/.test(part)) {
      const p = Number(part);
      if (p >= 1 && p <= maxPages) pages.add(p);
    }
  }
  if (pages.size === 0) {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }
  return Array.from(pages).sort((a, b) => a - b);
}

export function detectFileType(file: File): SourceDocument['fileType'] | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'txt';
  if (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    file.type === 'image/png' ||
    file.type === 'image/jpeg'
  ) {
    return 'image';
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function extractPdfPagesText(
  file: File,
  selectedPagesExpr?: string
): Promise<{
  pageCount: number;
  extractedText: string;
  unreadableNotes: string;
  selectedPages: string;
}> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const chosenPages = parsePageSelection(selectedPagesExpr, pageCount);

  const chunks: string[] = [];
  const lowTextPages: number[] = [];

  for (const pageNum of chosenPages) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const pageText = sanitizePlainText(strings.join(' ').replace(/\s+/g, ' '));
    if (pageText.length < 25) {
      lowTextPages.push(pageNum);
      chunks.push(`[Trang ${pageNum}]: (Trang có ít hoặc không có lớp văn bản, có thể là trang ảnh quét.)`);
    } else {
      chunks.push(`[Trang ${pageNum}]:\n${pageText}`);
    }
  }

  let unreadableNotes = '';
  if (lowTextPages.length > 0) {
    unreadableNotes = `Trang ${lowTextPages.join(', ')} chứa rất ít văn bản số (có thể là ảnh chụp/scan). Thầy/cô có thể bổ sung mô tả hoặc dùng nút Trích xuất bằng AI.`;
  }

  return {
    pageCount,
    extractedText: chunks.join('\n\n'),
    unreadableNotes,
    selectedPages: selectedPagesExpr?.trim() || `1-${pageCount}`,
  };
}

export async function extractPdfWithAiFallback(
  file: File
): Promise<{ extractedText: string; unreadableNotes: string }> {
  const buffer = await file.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);
  const res = await fetch('/api/ai/extract-media', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64Data,
      mimeType: 'application/pdf',
      fileName: file.name,
    }),
  });
  const parsed = await safeReadJsonResponse<{
    extractedText?: string;
    unreadableNotes?: string;
    message?: string;
  }>(res);
  if (!parsed.ok || !parsed.data) {
    throw new Error(
      parsed.data?.message ||
        parsed.fallbackErrorMessage ||
        'Không thể trích xuất PDF bằng AI lúc này.'
    );
  }
  return {
    extractedText: sanitizePlainText(parsed.data.extractedText || ''),
    unreadableNotes: parsed.data.unreadableNotes || '',
  };
}

export async function readSourceFile(
  file: File,
  role: SourceDocRole,
  order: number,
  currentTotalBytes: number
): Promise<{ doc: SourceDocument; rawFile?: File }> {
  const fileType = detectFileType(file);
  if (!fileType) {
    throw new Error(
      `Định dạng tệp "${file.name}" chưa được hỗ trợ. Vui lòng chọn PDF, DOCX, TXT hoặc ảnh PNG/JPEG.`
    );
  }
  if (file.size > MAX_SINGLE_FILE_BYTES) {
    throw new Error(
      `Tệp "${file.name}" vượt quá giới hạn 10 MB mỗi tệp. Vui lòng nén hoặc tách nhỏ tài liệu.`
    );
  }
  if (currentTotalBytes + file.size > MAX_TOTAL_UPLOAD_BYTES) {
    throw new Error(
      'Tổng dung lượng tài liệu vượt quá giới hạn 20 MB cho một bài dạy. Vui lòng gỡ bớt tệp không cần thiết.'
    );
  }

  const baseDoc: SourceDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    fileType,
    mimeType: file.type,
    sizeBytes: file.size,
    role,
    order,
    status: 'ready',
    extractedText: '',
    hasPageMapping: false,
  };

  if (fileType === 'txt') {
    const text = sanitizePlainText(await file.text());
    return {
      doc: {
        ...baseDoc,
        extractedText: text,
        unreadableNotes: text ? '' : 'Tệp văn bản trống.',
      },
      rawFile: file,
    };
  }

  if (fileType === 'docx') {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = sanitizePlainText(result.value || '');
    const warnings = result.messages
      .filter((m) => m.type === 'warning')
      .map((m) => m.message)
      .join('; ');
    return {
      doc: {
        ...baseDoc,
        extractedText: text,
        status: text ? 'ready' : 'warning',
        unreadableNotes:
          warnings ||
          (!text
            ? 'Không trích xuất được chữ từ tệp DOCX (có thể nội dung chỉ gồm hình ảnh).'
            : ''),
      },
      rawFile: file,
    };
  }

  if (fileType === 'pdf') {
    const pdfData = await extractPdfPagesText(file);
    return {
      doc: {
        ...baseDoc,
        pageCount: pdfData.pageCount,
        selectedPages: pdfData.selectedPages,
        extractedText: pdfData.extractedText,
        hasPageMapping: true,
        status: pdfData.unreadableNotes ? 'warning' : 'ready',
        unreadableNotes: pdfData.unreadableNotes,
      },
      rawFile: file,
    };
  }

  // Ảnh PNG/JPEG -> gọi AI đa phương thức nếu sẵn sàng, không thì cho nhập tay
  const buffer = await file.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

  try {
    const res = await fetch('/api/ai/extract-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType,
        fileName: file.name,
      }),
    });
    const parsed = await safeReadJsonResponse<{
      extractedText?: string;
      unreadableNotes?: string;
      message?: string;
    }>(res);
    if (!parsed.ok || !parsed.data) {
      return {
        doc: {
          ...baseDoc,
          status: 'warning',
          extractedText: '',
          unreadableNotes:
            parsed.data?.message ||
            parsed.fallbackErrorMessage ||
            'Chưa đọc tự động được ảnh (AI chưa sẵn sàng). Thầy/cô có thể gõ hoặc dán nội dung từ ảnh vào khung bên dưới.',
        },
        rawFile: file,
      };
    }
    return {
      doc: {
        ...baseDoc,
        extractedText: sanitizePlainText(parsed.data.extractedText || ''),
        unreadableNotes: parsed.data.unreadableNotes || '',
        status: parsed.data.unreadableNotes ? 'warning' : 'ready',
      },
      rawFile: file,
    };
  } catch {
    return {
      doc: {
        ...baseDoc,
        status: 'warning',
        extractedText: '',
        unreadableNotes:
          'Không kết nối được dịch vụ đọc ảnh. Thầy/cô có thể nhập nội dung từ ảnh trực tiếp vào ô văn bản.',
      },
      rawFile: file,
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
