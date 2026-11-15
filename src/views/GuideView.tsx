import React, { useState } from 'react';
import {
  Download,
  FileCheck2,
  FileText,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { AppSettings, TeacherProfile } from '../types/lesson';
import {
  AdminGuideMetadata,
  USER_GUIDE_DOCUMENT_SUBJECT,
  USER_GUIDE_DOCUMENT_TITLE,
  USER_GUIDE_SECTIONS,
  createDefaultAdminGuideMetadata,
  exportUserGuideToDocx,
} from '../lib/userGuideDocx';

interface GuideViewProps {
  profile: TeacherProfile;
  settings: AppSettings;
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function GuideView({ profile, settings, onNotify }: GuideViewProps) {
  const [metadata, setMetadata] = useState<AdminGuideMetadata>(() =>
    createDefaultAdminGuideMetadata(profile)
  );
  const [recipientsText, setRecipientsText] = useState<string>(() =>
    createDefaultAdminGuideMetadata(profile).recipients.join('\n')
  );
  const [exporting, setExporting] = useState(false);

  const syncedMetadata: AdminGuideMetadata = {
    ...metadata,
    recipients: recipientsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  };

  const handleResetDefaults = () => {
    const def = createDefaultAdminGuideMetadata(profile);
    setMetadata(def);
    setRecipientsText(def.recipients.join('\n'));
    onNotify('Đã khôi phục thông tin thể thức hành chính mặc định.', 'info');
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const { fileName } = await exportUserGuideToDocx(syncedMetadata, settings);
      onNotify(`Đã xuất tài liệu hướng dẫn chuẩn văn bản hành chính: ${fileName}`, 'success');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Không thể xuất tệp Word hướng dẫn lúc này.',
        'error'
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8 print-container">
      {/* Thanh công cụ & thông tin thể thức hành chính (ẩn khi in) */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tài liệu Hướng dẫn sử dụng (Chuẩn văn bản hành chính NĐ 30/2020/NĐ-CP)
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Khổ giấy A4 (lề trên 20 mm, dưới 20 mm, trái 30 mm, phải 15 mm) · Times New Roman 13 pt · Thụt đầu dòng 1,27 cm · Before 6 pt · Giãn dòng đơn · Bảng căn giữa 0 pt · Đánh số trang từ trang 2.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Mặc định</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Printer className="h-4 w-4" />
              <span>In / Lưu PDF</span>
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportDocx}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{exporting ? 'Đang xuất...' : 'Xuất hướng dẫn (.docx)'}</span>
            </button>
          </div>
        </div>

        {/* Biểu mẫu tùy chỉnh thể thức ban hành */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="guide-parent-agency"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Cơ quan chủ quản
            </label>
            <input
              id="guide-parent-agency"
              type="text"
              value={metadata.parentAgency}
              onChange={(e) => setMetadata({ ...metadata, parentAgency: e.target.value })}
              placeholder="SỞ GIÁO DỤC VÀ ĐÀO TẠO"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label
              htmlFor="guide-issuing-agency"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Đơn vị ban hành
            </label>
            <input
              id="guide-issuing-agency"
              type="text"
              value={metadata.issuingAgency}
              onChange={(e) => setMetadata({ ...metadata, issuingAgency: e.target.value })}
              placeholder="TRƯỜNG THPT ĐẮK SONG"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label
              htmlFor="guide-doc-number"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Số, ký hiệu văn bản
            </label>
            <input
              id="guide-doc-number"
              type="text"
              value={metadata.documentNumber}
              onChange={(e) => setMetadata({ ...metadata, documentNumber: e.target.value })}
              placeholder="Số: 01/HD-KHBD"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label
              htmlFor="guide-place-date"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Địa danh & ngày ban hành
            </label>
            <div className="grid grid-cols-12 gap-2">
              <input
                id="guide-place-date"
                type="text"
                value={metadata.issuePlace}
                onChange={(e) => setMetadata({ ...metadata, issuePlace: e.target.value })}
                aria-label="Địa danh ban hành"
                className="col-span-4 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                value={metadata.issueDateText}
                onChange={(e) => setMetadata({ ...metadata, issueDateText: e.target.value })}
                aria-label="Ngày tháng năm ban hành"
                className="col-span-8 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="guide-signer-title"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Chức danh người ký
            </label>
            <input
              id="guide-signer-title"
              type="text"
              value={metadata.signerTitle}
              onChange={(e) => setMetadata({ ...metadata, signerTitle: e.target.value })}
              placeholder="HIỆU TRƯỞNG"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label
              htmlFor="guide-signer-name"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Họ tên người ký
            </label>
            <input
              id="guide-signer-name"
              type="text"
              value={metadata.signerName}
              onChange={(e) => setMetadata({ ...metadata, signerName: e.target.value })}
              placeholder="Trần Công Toàn"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="guide-recipients"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Nơi nhận (mỗi dòng một mục)
            </label>
            <textarea
              id="guide-recipients"
              rows={2}
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>
      </section>

      {/* Xem trước trang A4 đúng thể thức văn bản hành chính */}
      <div className="rounded-2xl bg-slate-200/70 p-3 dark:bg-slate-950/60 sm:p-6 print:bg-white print:p-0">
        <div className="no-print mb-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <FileText className="h-3.5 w-3.5" />
            <span>Bản xem trước văn bản ban hành (Khổ A4)</span>
          </span>
          <span>Mục lục nhanh: {USER_GUIDE_SECTIONS.length} phần chính</span>
        </div>

        <article
          aria-label="Bản xem trước tài liệu hướng dẫn sử dụng"
          className="a4-preview-sheet mx-auto w-full max-w-[210mm] rounded-sm border border-slate-300 bg-white shadow-lg print:border-none print:shadow-none"
          style={{
            paddingTop: '20mm',
            paddingBottom: '20mm',
            paddingLeft: '30mm',
            paddingRight: '15mm',
          }}
        >
          {/* Phần mở đầu 2 cột theo NĐ 30/2020/NĐ-CP */}
          <table className="preview-header-table">
            <tbody>
              <tr>
                <td style={{ width: '38%', padding: '2pt 3pt' }}>
                  {syncedMetadata.parentAgency.trim() && (
                    <p className="uppercase">{syncedMetadata.parentAgency.trim()}</p>
                  )}
                  <p className="font-bold uppercase">
                    {syncedMetadata.issuingAgency.trim() || 'ĐƠN VỊ BAN HÀNH'}
                  </p>
                  <p>──────────────</p>
                  <p>{syncedMetadata.documentNumber.trim() || 'Số: .../HD-...'}</p>
                </td>
                <td style={{ width: '62%', padding: '2pt 3pt' }}>
                  <p className="font-bold uppercase whitespace-nowrap">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
                  <p>────────────────────────</p>
                  <p className="italic">
                    {syncedMetadata.issuePlace.trim() || 'Địa danh'},{' '}
                    {syncedMetadata.issueDateText.trim() || 'ngày ... tháng ... năm ...'}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tên loại & trích yếu */}
          <h1 className="preview-centered font-bold uppercase" style={{ marginTop: '14pt' }}>
            {USER_GUIDE_DOCUMENT_TITLE}
          </h1>
          <p className="preview-centered font-bold">{USER_GUIDE_DOCUMENT_SUBJECT}</p>
          <p className="preview-centered">─────────────────</p>

          {/* Nội dung chính */}
          {USER_GUIDE_SECTIONS.map((sec) => (
            <section key={sec.id}>
              <h2 className="font-bold">{sec.title}</h2>
              {sec.paragraphs?.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
              {sec.subsections?.map((sub, sIdx) => (
                <div key={sIdx}>
                  <h3 className="font-bold">{sub.heading}</h3>
                  {sub.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              ))}
              {sec.table && (
                <div>
                  <p className="font-bold italic">{sec.table.caption}</p>
                  <table>
                    <thead>
                      <tr className="bg-slate-100">
                        {sec.table.headers.map((h, idx) => (
                          <th
                            key={idx}
                            style={{ width: `${sec.table!.colWidthsPercent[idx]}%` }}
                          >
                            <p className="font-bold">{h}</p>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sec.table.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx}>
                              <p className={cIdx === 1 ? 'font-bold' : ''}>{cell}</p>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {/* Khối kết thúc: Nơi nhận & Chữ ký ban hành */}
          <table className="preview-header-table print-avoid-break" style={{ marginTop: '14pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '48%' }}>
                  <p className="font-bold italic">Nơi nhận:</p>
                  {(syncedMetadata.recipients.length > 0
                    ? syncedMetadata.recipients
                    : ['Lưu: VT, CM.']
                  ).map((rec, idx) => (
                    <p key={idx}>- {rec.replace(/^\s*[-•]\s*/, '')}</p>
                  ))}
                </td>
                <td style={{ width: '52%' }}>
                  <p className="font-bold uppercase">
                    {syncedMetadata.signerTitle.trim() || 'HIỆU TRƯỞNG'}
                  </p>
                  <p className="italic">(Ký, ghi rõ họ tên và đóng dấu)</p>
                  <div style={{ height: '48pt' }} />
                  <p className="font-bold">
                    {syncedMetadata.signerName.trim() || '....................'}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </div>
  );
}
