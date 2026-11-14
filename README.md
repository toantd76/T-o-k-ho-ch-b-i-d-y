# Kế Hoạch Bài Dạy AI

Ứng dụng web hỗ trợ giáo viên Việt Nam thiết kế, kiểm tra chất lượng, rà soát ngữ pháp, chỉnh sửa và xuất kế hoạch bài dạy (giáo án) chuẩn cấu trúc.

## Tính năng chính

1. **Quy trình tạo kế hoạch 4 bước**: Thông tin bài học → Tài liệu & Bối cảnh lớp → Yêu cầu sư phạm → Kiểm tra & Tạo. Tự lưu bản nháp khi thao tác.
2. **Đọc tài liệu đa định dạng**: Hỗ trợ `.txt`, `.docx` (qua `mammoth`), `.pdf` (chọn trang cụ thể qua `pdfjs-dist`), ảnh `PNG/JPEG` (qua Gemini đa phương thức phía máy chủ) và dán văn bản trực tiếp.
3. **Không gian soạn thảo 3 cột**:
   - Chỉnh sửa trực tiếp toàn bộ mục tiêu, thiết bị, tiết học, hoạt động 4 bước, phiếu học tập, câu hỏi, đáp án, rubric và điều chỉnh sau bài dạy.
   - Chế độ **Tập trung** ẩn điều hướng, **Hoàn tác / Làm lại**, lưu mốc và khôi phục **Lịch sử phiên bản**.
   - **Trợ lý AI chỉnh sửa cục bộ**: Xem trước thay đổi và mức ảnh hưởng thời lượng trước khi bấm **Áp dụng**.
   - **Kiểm tra chất lượng**: Tách biệt kiểm tra logic bằng mã (thời lượng từng tiết/toàn bài, mã mục tiêu, phiếu học tập, đáp án, trọng số rubric) và nhận xét chuyên môn bằng AI.
   - **Kiểm tra ngữ pháp & diễn đạt tiếng Việt (AI)**: Rà soát chính tả, ngữ pháp, văn phong sư phạm theo toàn bài hoặc từng phần và áp dụng sửa trực tiếp.
4. **Xuất Word thật (.docx) & In / Lưu PDF**: Xuất tệp `.docx` khổ A4, phông Times New Roman mặc định 13 pt, hỗ trợ bảng 2 cột GV–HS cho Tiểu học, 4 phạm vi xuất và print stylesheet.
5. **Lưu trữ & Sao lưu**: Lưu cục bộ trên thiết bị bằng IndexedDB kèm xuất/nhập bản sao lưu JSON có kiểm tra schema Zod.

## Cấu hình kết nối AI (Quản trị viên / Máy chủ)

Mọi lời gọi Gemini API đi qua máy chủ Express (`server.ts`, `server/gemini.ts`) và không bao giờ đưa khóa API xuống trình duyệt:

- `GEMINI_API_KEY`: Khóa API Gemini được cấu hình trong bảng **Secrets** của môi trường chạy (hoặc biến môi trường máy chủ).
- `GEMINI_MODEL` *(tùy chọn)*: Tên model Gemini sử dụng, mặc định `gemini-4-hydrogen`.

Nếu chưa cấu hình `GEMINI_API_KEY`, ứng dụng sẽ hiển thị trạng thái **“Cần cấu hình kết nối AI”** nhưng vẫn cho phép tạo khung kế hoạch thủ công, trải nghiệm **Bài dạy minh họa**, kiểm tra logic và xuất Word `.docx`.

## Chạy và kiểm thử

```bash
npm install
npm test        # Chạy unit test logic kế hoạch bài dạy
npm run lint    # Kiểm tra kiểu TypeScript
npm run build   # Biên dịch bản production
npm run dev     # Chạy máy chủ dev tại http://localhost:3000
```

## Giới hạn hiện tại

- Dữ liệu được lưu cục bộ trên trình duyệt của thiết bị hiện tại (IndexedDB), chưa có đồng bộ tài khoản đám mây đa thiết bị.
- Công thức toán phức tạp dạng LaTeX được giữ ở dạng văn bản đọc được khi xuất `.docx`; giáo viên có thể tinh chỉnh lại bằng Equation Editor trong Word nếu cần.
