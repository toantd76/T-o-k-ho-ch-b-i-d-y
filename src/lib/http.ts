export interface SafeJsonResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
  fallbackErrorMessage: string;
}

export async function safeReadJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<SafeJsonResult<T>> {
  const rawText = await res.text();
  let data: T | null = null;
  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText) as T;
    } catch {
      data = null;
    }
  }

  let fallbackErrorMessage = `Máy chủ phản hồi mã lỗi HTTP ${res.status}. Vui lòng thử lại sau.`;
  if (res.status === 504 || res.status === 502 || res.status === 503) {
    fallbackErrorMessage = `Kết nối tới máy chủ xử lý bị gián đoạn tạm thời (HTTP ${res.status}). Vui lòng thử lại.`;
  } else if (res.status === 413) {
    fallbackErrorMessage = 'Dữ liệu hoặc tài liệu gửi lên vượt quá kích thước cho phép.';
  } else if (res.status === 429) {
    fallbackErrorMessage = 'Thầy/cô gửi yêu cầu hơi nhanh. Vui lòng đợi vài giây rồi thử lại.';
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    rawText,
    fallbackErrorMessage,
  };
}
