import React from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  X,
} from 'lucide-react';

export type AppRoute =
  | 'overview'
  | 'wizard'
  | 'editor'
  | 'library'
  | 'templates'
  | 'guide'
  | 'settings';

interface SidebarProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  hasActivePlan: boolean;
  planCount: number;
}

const NAV_ITEMS: Array<{
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'wizard', label: 'Tạo kế hoạch', icon: FilePlus2 },
  { id: 'editor', label: 'Không gian soạn thảo', icon: BookOpen },
  { id: 'library', label: 'Thư viện kế hoạch', icon: FolderKanban },
  { id: 'templates', label: 'Mẫu kế hoạch', icon: LayoutTemplate },
  { id: 'guide', label: 'Hướng dẫn sử dụng', icon: HelpCircle },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export function Sidebar({
  activeRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  hasActivePlan,
  planCount,
}: SidebarProps) {
  const renderNavContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          {(!collapsed || isMobile) && (
            <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Kế Hoạch Bài Dạy AI
            </span>
          )}
          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Đóng thanh điều hướng"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              title={collapsed ? 'Mở rộng' : 'Thu gọn'}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <nav className="space-y-1 p-3" aria-label="Điều hướng chính">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.id;
            const disabled = item.id === 'editor' && !hasActivePlan;

            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onNavigate(item.id);
                  if (isMobile) onCloseMobile();
                }}
                title={
                  disabled
                    ? 'Chọn hoặc tạo một kế hoạch để mở trình soạn thảo'
                    : item.label
                }
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : disabled
                    ? 'cursor-not-allowed text-slate-400 opacity-60 dark:text-slate-600'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobile) && (
                  <span className="flex flex-1 items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    {item.id === 'library' && planCount > 0 && (
                      <span className="ml-2 text-xs font-normal tabular-nums text-slate-500 dark:text-slate-400">
                        {planCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {(!collapsed || isMobile) && (
        <div className="border-t border-slate-200 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Dữ liệu đang lưu trên thiết bị này. Thầy/cô có thể sao lưu JSON trong mục Cài đặt.
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop collapsible sidebar */}
      <aside
        className={`no-print hidden shrink-0 border-r border-slate-200 bg-white transition-[width] duration-150 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:block lg:h-screen ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <nav
            data-mobile-nav="true"
            className="relative z-10 h-full w-72 border-r border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {renderNavContent(true)}
          </nav>
        </div>
      )}
    </>
  );
}
