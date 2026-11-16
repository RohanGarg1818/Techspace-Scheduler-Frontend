import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  CalendarEvent,
  CurrentUser,
  GhostRange,
  ThemeMode,
} from '../types/calendar';
import { CLUB_THEME_TOKENS, ThemePalette } from '../theme/calendarTheme';
import {
  formatCompactHour,
  getMonthGridDays,
  parseTimeToMinutes,
} from '../utils/dateUtils';
import { hasActualTimeClashOnDay, isDateInRange } from '../utils/conflictUtils';
import { canAccessAdminControls, canViewPrivateDetails } from '../utils/permissions';

interface MonthViewProps {
  theme: ThemeMode;
  palette: ThemePalette;
  currentUser: CurrentUser;
  year: number;
  monthIndex: number;
  selectedDateKey: string | null;
  todayDateKey: string;
  selectedEventId: string | null;
  events: CalendarEvent[];
  ghostRanges: GhostRange[];
  isPickingRange?: boolean;
  rangePickStart?: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDragSelectMonthRange?: (range: { startDate: string; endDate: string }) => void;
}

const WEEKDAY_HEADERS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const MonthView: React.FC<MonthViewProps> = ({
  theme,
  palette,
  currentUser,
  year,
  monthIndex,
  selectedDateKey,
  todayDateKey,
  selectedEventId,
  events,
  ghostRanges,
  isPickingRange = false,
  rangePickStart = null,
  onSelectDate,
  onSelectEvent,
  onDragSelectMonthRange,
}) => {
  const days = getMonthGridDays(year, monthIndex);
  const canDragCreate =
    canAccessAdminControls(currentUser) &&
    !isPickingRange &&
    Boolean(onDragSelectMonthRange);

  const [dragState, setDragState] = useState<{
    anchorDateKey: string;
    currentDateKey: string;
    active: boolean;
  } | null>(null);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (!dragState) return;

    const handleWindowMouseUp = () => {
      const current = dragStateRef.current;
      if (current?.active && onDragSelectMonthRange) {
        const startDate =
          current.anchorDateKey <= current.currentDateKey
            ? current.anchorDateKey
            : current.currentDateKey;
        const endDate =
          current.anchorDateKey <= current.currentDateKey
            ? current.currentDateKey
            : current.anchorDateKey;
        justDraggedRef.current = true;
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
        onDragSelectMonthRange({ startDate, endDate });
      }
      setDragState(null);
    };

    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [Boolean(dragState), onDragSelectMonthRange]);

  const activeDragRange =
    dragState?.active
      ? {
          startDate:
            dragState.anchorDateKey <= dragState.currentDateKey
              ? dragState.anchorDateKey
              : dragState.currentDateKey,
          endDate:
            dragState.anchorDateKey <= dragState.currentDateKey
              ? dragState.currentDateKey
              : dragState.anchorDateKey,
        }
      : null;

  // Group events by dateKey sorted by startTime
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }
  for (const [, list] of eventsByDate) {
    list.sort(
      (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
    );
  }

  const rowsCount = days.length / 7;
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 mb-1 sm:mb-1.5 shrink-0">
        {WEEKDAY_HEADERS.map((day) => (
          <div
            key={day}
            className="py-1 sm:py-1.5 text-center text-[10px] sm:text-[11px] font-semibold tracking-[0.06em]"
            style={{ color: palette.textMuted }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div
        className="grid grid-cols-7 flex-1 min-h-0 rounded-[12px] sm:rounded-[14px] border overflow-hidden"
        style={{
          borderColor: palette.gridLine,
          gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1fr))`, minHeight: 0,
        }}
      >
        {days.map((cell, idx) => {
          const isSelected = cell.dateKey === selectedDateKey;
          const isToday = cell.dateKey === todayDateKey;
          const isRangeAnchor = isPickingRange && cell.dateKey === rangePickStart;
          const isDragSelected =
            activeDragRange !== null &&
            isDateInRange(
              cell.dateKey,
              activeDragRange.startDate,
              activeDragRange.endDate
            );
          const dayEvents = eventsByDate.get(cell.dateKey) ?? [];
          const visibleEvents = dayEvents.slice(0, 3);
          const overflowCount = dayEvents.length - visibleEvents.length;
          const hasClash = hasActualTimeClashOnDay(dayEvents);
          const dayGhosts = ghostRanges.filter((g) =>
            isDateInRange(cell.dateKey, g.startDate, g.endDate)
          );

          const colIndex = idx % 7;
          const rowIndex = Math.floor(idx / 7);
          const isLastCol = colIndex === 6;
          const isLastRow = rowIndex === rowsCount - 1;

          const cellBg =
            isSelected || isRangeAnchor || isDragSelected
              ? palette.monthCellHighlight
              : isDark
                ? cell.isCurrentMonth
                  ? palette.surfaceSubtle
                  : '#151518'
                : 'transparent';

          return (
            <div
              key={cell.dateKey}
              role="button"
              tabIndex={0}
              onMouseDown={(e) => {
                if (e.button !== 0 || !canDragCreate) return;
                setDragState({
                  anchorDateKey: cell.dateKey,
                  currentDateKey: cell.dateKey,
                  active: false,
                });
              }}
              onMouseEnter={() => {
                if (!dragStateRef.current) return;
                setDragState((prev) =>
                  prev
                    ? {
                        ...prev,
                        currentDateKey: cell.dateKey,
                        active: prev.active || cell.dateKey !== prev.anchorDateKey,
                      }
                    : null
                );
              }}
              onClick={() => {
                if (justDraggedRef.current) return;
                onSelectDate(cell.dateKey);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(cell.dateKey);
                }
              }}
              className="ts-calendar-cell min-w-0 overflow-hidden p-1 sm:p-1.5 xl:p-2 flex flex-col text-left cursor-pointer focus:outline-none"
              data-selected={
                isSelected || isRangeAnchor || isDragSelected ? 'true' : 'false'
              }
              style={{
                backgroundColor: cellBg,
                borderRight: isLastCol ? 'none' : `1px solid ${palette.gridLine}`,
                borderBottom: isLastRow ? 'none' : `1px solid ${palette.gridLine}`,
                boxShadow: isDragSelected
                  ? `inset 0 0 0 1.5px ${palette.accentBg}`
                  : 'none',
              }}
            >
              {/* Date Number + Minimal Clash / Busy Density Indicators */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1 shrink-0">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-[5px] sm:rounded-[6px] text-[10.5px] sm:text-[12px] tabular-nums transition-colors duration-150"
                  style={{
                    backgroundColor:
                      isSelected || isRangeAnchor
                        ? palette.accentBg
                        : 'transparent',
                    color:
                      isSelected || isRangeAnchor
                        ? palette.accentText
                        : cell.isCurrentMonth
                          ? palette.textPrimary
                          : palette.textOutOfMonth,
                    fontWeight: isSelected || isToday ? 700 : 600,
                    outline:
                      !isSelected && isToday
                        ? `1.5px solid ${palette.accentBg}`
                        : 'none',
                  }}
                >
                  {cell.dayNumber}
                </span>

                {hasClash && (
                  <span
                    title="Actual meeting time clash on this date"
                    className="inline-flex items-center justify-center w-4 h-4 rounded"
                    style={{ color: palette.mandatoryBadgeText }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Tentative Ghost Range Continuous Band(s) — Visually secondary to confirmed meetings */}
              {dayGhosts.length > 0 && (
                <div className="space-y-1 mb-1 min-w-0">
                  {dayGhosts.slice(0, dayEvents.length <= 1 ? 2 : 1).map((hold) => {
                    const clubTokens = CLUB_THEME_TOKENS[theme][hold.clubId];
                    const canSeeDetails = canViewPrivateDetails(
                      currentUser,
                      hold.clubId,
                      hold.isPrivate
                    );
                    const isStart = cell.dateKey === hold.startDate || colIndex === 0;
                    const isEnd = cell.dateKey === hold.endDate || colIndex === 6;

                    return (
                      <div
                        key={hold.id}
                        className="ts-event-chip px-1.5 py-[2px] text-[9.5px] leading-[1.3] font-medium border border-dashed truncate opacity-85"
                        style={{
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(0, 0, 0, 0.025)',
                          borderColor: clubTokens.dot,
                          color: palette.textSecondary,
                          borderTopLeftRadius: isStart ? '4px' : '0px',
                          borderBottomLeftRadius: isStart ? '4px' : '0px',
                          borderTopRightRadius: isEnd ? '4px' : '0px',
                          borderBottomRightRadius: isEnd ? '4px' : '0px',
                          borderLeftStyle: isStart ? 'dashed' : 'none',
                          borderRightStyle: isEnd ? 'dashed' : 'none',
                          marginLeft: isStart ? '0px' : '-7px',
                          marginRight: isEnd ? '0px' : '-7px',
                        }}
                        title={
                          canSeeDetails
                            ? `Tentative: ${hold.title} (${hold.startDate} – ${hold.endDate})`
                            : 'Tentative private hold'
                        }
                      >
                        <span className="uppercase tracking-wider text-[8.5px] font-bold opacity-85 mr-1">
                          Tentative
                        </span>
                        {isStart && (
                          <span>
                            {canSeeDetails ? hold.title : 'Private hold'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {dayGhosts.length > (dayEvents.length <= 1 ? 2 : 1) && (
                    <div
                      className="text-[9.5px] font-medium px-1 tabular-nums"
                      style={{ color: palette.textMuted }}
                    >
                      +{dayGhosts.length - (dayEvents.length <= 1 ? 2 : 1)} tentative
                    </div>
                  )}
                </div>
              )}

              {/* Confirmed Event Indicators (visually more prominent than tentative holds) */}
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 min-h-0 overflow-y-auto ts-scroll">
                {visibleEvents.map((ev) => {
                  const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];
                  const isEventSelected = selectedEventId === ev.id;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="ts-event-chip w-full text-left truncate px-1 sm:px-1.5 py-[1px] sm:py-[1.5px] rounded-[3px] sm:rounded-[4px] text-[9.5px] sm:text-[10.5px] leading-[1.3] font-medium border tabular-nums cursor-pointer"
                      style={{
                        backgroundColor: clubTokens.pillBg,
                        borderColor: isEventSelected
                          ? clubTokens.weekBar
                          : clubTokens.pillBorder,
                        color: clubTokens.pillText,
                        boxShadow: isEventSelected
                          ? `0 0 0 1px ${clubTokens.weekBar}`
                          : 'none',
                      }}
                      title={`${formatCompactHour(ev.startTime)} · ${ev.title}`}
                    >
                      {formatCompactHour(ev.startTime)} ·{' '}
                      {ev.shortTitle || ev.title}
                    </button>
                  );
                })}
                {overflowCount > 0 && (
                  <div
                    className="text-[10px] font-semibold px-1 tabular-nums"
                    style={{ color: palette.textMuted }}
                  >
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
