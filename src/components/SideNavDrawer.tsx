import React from 'react';
import {
  X,
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Sun,
  Moon,
} from 'lucide-react';
import { NavSection, ThemeMode } from '../types/calendar';
import { ThemePalette } from '../theme/calendarTheme';

interface SideNavDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  palette: ThemePalette;
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  onClose: () => void;
  onToggleTheme: () => void;
}

const DESTINATIONS: {
  id: NavSection;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'TechSpace workspace overview',
    icon: LayoutDashboard,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    description: 'Club meetings and schedules',
    icon: CalendarDays,
  },
  {
    id: 'meets',
    label: 'All Meets',
    description: 'Past, today, and upcoming meetings',
    icon: ClipboardList,
  },
];

export const SideNavDrawer: React.FC<SideNavDrawerProps> = ({
  isOpen,
  theme,
  palette,
  activeNav,
  onSelectNav,
  onClose,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 flex ts-transition transition-opacity duration-[240ms] ease-out ${
        isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
      style={{
        backgroundColor: isDark
          ? 'rgba(10, 10, 12, 0.72)'
          : 'rgba(30, 27, 24, 0.32)',
      }}
      onClick={onClose}
    >
      <aside
        className={`w-[272px] max-w-[85vw] h-full border-r p-5 flex flex-col justify-between ts-transition transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: palette.surfaceBackground,
          borderColor: palette.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div
            className="flex items-center justify-between pb-4 border-b"
            style={{ borderColor: palette.border }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-[9px] flex items-center justify-center"
                style={{ backgroundColor: palette.brandIconBg }}
              >
                <CalendarDays
                  className="w-4 h-4"
                  style={{ color: isDark ? palette.textPrimary : '#FFFFFF' }}
                />
              </span>
              <span
                className="text-[16px] font-bold"
                style={{ color: palette.textPrimary }}
              >
                TechSpace
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation drawer"
              className="ts-icon-btn w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: palette.buttonMutedBg,
                borderColor: palette.border,
                color: palette.textMuted,
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p
            className="text-[11px] font-semibold uppercase tracking-wider mt-5 mb-2.5"
            style={{ color: palette.textMuted }}
          >
            Navigation
          </p>

          <nav className="space-y-1.5" aria-label="Side navigation">
            {DESTINATIONS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectNav(item.id);
                    onClose();
                  }}
                  className="ts-filter-row w-full text-left px-3 py-2.5 rounded-[12px] border flex items-start gap-3 cursor-pointer"
                  style={{
                    backgroundColor: isActive
                      ? palette.navActiveBg
                      : 'transparent',
                    borderColor: isActive ? palette.border : 'transparent',
                    color: isActive
                      ? palette.textPrimary
                      : palette.textSecondary,
                  }}
                >
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[13.5px] font-semibold leading-tight">
                      {item.label}
                    </span>
                    <span
                      className="block text-[11.5px] mt-0.5"
                      style={{ color: palette.textMuted }}
                    >
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div
          className="pt-4 border-t"
          style={{ borderColor: palette.border }}
        >
          <button
            type="button"
            onClick={() => {
              onToggleTheme();
              onClose();
            }}
            className="ts-btn w-full py-2.5 px-3.5 rounded-[12px] border text-[13px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
            style={{
              backgroundColor: palette.buttonMutedBg,
              borderColor: palette.border,
              color: palette.textPrimary,
            }}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4" style={{ color: palette.textSecondary }} />
                <span>Switch to Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" style={{ color: palette.textSecondary }} />
                <span>Switch to Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
};
