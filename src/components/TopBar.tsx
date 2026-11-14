import React from 'react';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import { AppRoute } from './Sidebar';

interface TopBarProps {
  activeRoute: AppRoute;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  saveStatusText: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMobileMenu: () => void;
  focusMode: boolean;
}

const ROUTE_TITLES: Record<AppRoute, string> = {
  overview: 'Tổng quan',
  wizard: 'Tạo kế hoạch bài dạy',
  editor: 'Không gian soạn thảo',
  library: 'Thư viện kế hoạch',
  templates: 'Mẫu kế hoạch',
  settings: 'Cài đặt hệ thống',
};

export function TopBar({
  activeRoute,
  searchQuery,
  onSearchChange,
  saveStatusText,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
  focusMode,
}: TopBarProps) {
  if (focusMode && activeRoute === 'editor') {
    return null;
  }

  return (
    <header
      data-app-topbar="true"
      className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 sm:px-6"
    >
      {/* Zone 1: Mobile menu button + Page title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Mở menu điều hướng"
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg">
          {ROUTE_TITLES[activeRoute]}
        </h1>
      </div>

      {/* Zone 2: Search input */}
      <div className="hidden max-w-sm flex-1 md:block">
        <label htmlFor="topbar-search" className="sr-only">
          Tìm kiếm kế hoạch trong thư viện
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="topbar-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kế hoạch theo tên bài..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
          />
        </div>
      </div>

      {/* Zone 3: Save status & theme toggle */}
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline whitespace-nowrap">
          {saveStatusText}
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
