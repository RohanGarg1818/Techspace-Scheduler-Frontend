import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarEvent,
  CurrentUser,
  GhostRange,
  ThemeMode,
} from '../types/calendar';
import { CLUB_THEME_TOKENS, ThemePalette } from '../theme/calendarTheme';
import {
  formatCompactWeekTimeRange,
  getWeekDays,
  parseTimeToMinutes,
} from '../utils/dateUtils';
import { isDateInRange } from '../utils/conflictUtils';
import { canAccessAdminControls, canViewPrivateDetails } from '../utils/permissions';

interface WeekViewProps {
  theme: ThemeMode;
  palette: ThemePalette;
  currentUser: CurrentUser;
  anchorDateKey: string;
  selectedDateKey: string | null;
  todayDateKey: string;
  selectedEventId: string | null;
  events: CalendarEvent[];
  ghostRanges: GhostRange[];
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDragSelectWeekTime?: (selection: {
    dateKey: string;
    startTime: string;
    endTime: string;
  }) => void;
}

const START_HOUR = 8; // 8 AM
const END_HOUR = 19; // 7 PM
const HOUR_HEIGHT = 46; // px per hour

const HOURS = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i
);

function formatHourLabel(hour24: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12} ${period}`;
}

function minutesToTimeString(totalMinutes: number): string {
  const clamped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function snapOffsetToMinutes(offsetY: number): number {
  const rawMinutes = START_HOUR * 60 + (offsetY / HOUR_HEIGHT) * 60;
  const snapped = Math.round(rawMinutes / 30) * 30;
  return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snapped));
}

export const WeekView: React.FC<WeekViewProps> = ({
  theme,
  palette,
  currentUser,
  anchorDateKey,
  selectedDateKey,
  todayDateKey,
  selectedEventId,
  events,
  ghostRanges,
  onSelectDate,
  onSelectEvent,
  onDragSelectWeekTime,
}) => {
  const weekDays = getWeekDays(anchorDateKey);
  const gridStartMinutes = START_HOUR * 60;
  const gridEndMinutes = END_HOUR * 60;
  const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  const canDragCreate =
    canAccessAdminControls(currentUser) && Boolean(onDragSelectWeekTime);

  const [dragState, setDragState] = useState<{
    dateKey: string;
    columnTop: number;
    anchorMins: number;
    currentMins: number;
    startClientY: number;
    active: boolean;
  } | null>(null);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const justDraggedRef = useRef(false);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const curr = dragStateRef.current;
      if (!curr) return;
      const movedEnough = Math.abs(e.clientY - curr.startClientY) > 6;
      const nextMins = snapOffsetToMinutes(e.clientY - curr.columnTop);
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentMins: nextMins,
              active: prev.active || movedEnough,
            }
          : null
      );
    };

    const handleMouseUp = () => {
      const curr = dragStateRef.current;
      if (curr?.active && onDragSelectWeekTime) {
        let s = Math.min(curr.anchorMins, curr.currentMins);
        let e = Math.max(curr.anchorMins, curr.currentMins);
        if (e <= s) {
          e = Math.min(gridEndMinutes, s + 30);
          if (e <= s) {
            s = Math.max(gridStartMinutes, e - 30);
          }
        }
        justDraggedRef.current = true;
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
        onDragSelectWeekTime({
          dateKey: curr.dateKey,
          startTime: minutesToTimeString(s),
          endTime: minutesToTimeString(e),
        });
      }
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [Boolean(dragState), gridEndMinutes, gridStartMinutes, onDragSelectWeekTime]);

  // Group events by day in current week
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const day of weekDays) {
    eventsByDay.set(day.dateKey, []);
  }
  for (const ev of events) {
    if (eventsByDay.has(ev.date)) {
      eventsByDay.get(ev.date)!.push(ev);
    }
  }

  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-auto ts-scroll select-none">
      <div className="min-w-[600px] flex flex-col flex-1">
        {/* Day Column Headers */}
        <div className="flex items-stretch">
          <div className="w-14 sm:w-16 shrink-0" />
          <div className="grid grid-cols-7 flex-1">
            {weekDays.map((day) => {
              const isSelected = day.dateKey === selectedDateKey;
              const isToday = day.dateKey === todayDateKey;
              const dayGhosts = ghostRanges.filter((g) =>
                isDateInRange(day.dateKey, g.startDate, g.endDate)
              );

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => onSelectDate(day.dateKey)}
                  data-selected={isSelected ? 'true' : 'false'}
                  className="ts-calendar-cell py-2.5 px-1 flex flex-col items-center justify-center rounded-t-[12px] cursor-pointer relative"
                  style={{
                    background: isSelected
                      ? palette.weekColumnHighlight
                      : 'transparent',
                  }}
                >
                  <span
                    className="text-[20px] sm:text-[22px] font-bold leading-tight tabular-nums"
                    style={{
                      color:
                        isSelected || isToday
                          ? palette.textPrimary
                          : palette.textSecondary,
                    }}
                  >
                    {day.dayNumber}
                  </span>
                  <span
                    className="text-[11.5px] font-medium mt-0.5"
                    style={{
                      color: isSelected
                        ? palette.brandSubtitle
                        : palette.textMuted,
                    }}
                  >
                    {day.shortWeekday}
                  </span>
                  {dayGhosts.length > 0 && (
                    <span
                      title={dayGhosts
                        .map((g) =>
                          canViewPrivateDetails(currentUser, g.clubId, g.isPrivate)
                            ? `Tentative: ${g.title}`
                            : 'Tentative private hold'
                        )
                        .join(', ')}
                      className="mt-1 px-1.5 py-[1px] rounded border border-dashed text-[8.5px] font-semibold uppercase tracking-wider truncate max-w-full"
                      style={{
                        borderColor: CLUB_THEME_TOKENS[theme][dayGhosts[0].clubId].dot,
                        color: palette.textMuted,
                      }}
                    >
                      Tentative{dayGhosts.length > 1 ? ` (${dayGhosts.length})` : ''}
                    </span>
                  )}
                  {isSelected && (
                    <span
                      className="mt-1 w-[2px] h-2 rounded-full"
                      style={{
                        backgroundColor: palette.accentBg,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          </div>
        </div>

        {/* Hourly Time Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto ts-scroll relative mt-1">
          <div className="flex relative" style={{ height: `${totalGridHeight + 16}px` }}>
          {/* Left Time Labels */}
          <div className="w-12 sm:w-14 shrink-0 relative select-none">
            {HOURS.map((hour, index) => (
              <div
                key={hour}
                className="absolute right-3 text-[11px] font-medium tabular-nums -translate-y-1/2"
                style={{
                  top: `${index * HOUR_HEIGHT + 8}px`,
                  color: palette.textMuted,
                }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* 7 Day Columns + Horizontal Gridlines */}
          <div
            className="grid grid-cols-7 flex-1 relative"
            style={{ height: `${totalGridHeight}px`, marginTop: '8px' }}
          >
            {/* Horizontal Hour Lines spanning all 7 columns */}
            {HOURS.map((hour, index) => (
              <div
                key={`line-${hour}`}
                className="absolute inset-x-0 pointer-events-none"
                style={{
                  top: `${index * HOUR_HEIGHT}px`,
                  borderTop: `1px solid ${palette.gridLine}`,
                }}
              />
            ))}

            {/* Columns */}
            {weekDays.map((day, colIdx) => {
              const isSelected = day.dateKey === selectedDateKey;
              const dayEvents = eventsByDay.get(day.dateKey) ?? [];
              const dayGhosts = ghostRanges.filter((g) =>
                isDateInRange(day.dateKey, g.startDate, g.endDate)
              );

              return (
                <div
                  key={day.dateKey}
                  onMouseDown={(e) => {
                    if (e.button !== 0 || !canDragCreate) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const anchorMins = Math.min(
                      gridEndMinutes - 30,
                      snapOffsetToMinutes(e.clientY - rect.top)
                    );
                    setDragState({
                      dateKey: day.dateKey,
                      columnTop: rect.top,
                      anchorMins,
                      currentMins: Math.min(gridEndMinutes, anchorMins + 30),
                      startClientY: e.clientY,
                      active: false,
                    });
                  }}
                  onClick={() => {
                    if (justDraggedRef.current) return;
                    onSelectDate(day.dateKey);
                  }}
                  data-selected={isSelected ? 'true' : 'false'}
                  className="ts-calendar-cell relative h-full cursor-pointer"
                  style={{
                    background: isSelected
                      ? palette.weekColumnHighlight
                      : isDark
                        ? palette.surfaceSubtle
                        : 'transparent',
                    borderLeft:
                      colIdx === 0 ? 'none' : `1px solid ${palette.gridLine}`,
                  }}
                >
                  {/* Live Drag-to-Schedule Preview Block */}
                  {dragState?.active &&
                    dragState.dateKey === day.dateKey &&
                    (() => {
                      let s = Math.min(dragState.anchorMins, dragState.currentMins);
                      let e = Math.max(dragState.anchorMins, dragState.currentMins);
                      if (e <= s) {
                        e = Math.min(gridEndMinutes, s + 30);
                      }
                      const dragTop =
                        ((s - gridStartMinutes) / 60) * HOUR_HEIGHT + 2;
                      const dragHeight = Math.max(
                        22,
                        ((e - s) / 60) * HOUR_HEIGHT - 4
                      );
                      return (
                        <div
                          className="pointer-events-none absolute inset-x-1 rounded-[7px] border border-dashed px-2 py-1 flex flex-col justify-start z-20"
                          style={{
                            top: `${dragTop}px`,
                            height: `${dragHeight}px`,
                            borderColor: palette.accentBg,
                            backgroundColor: isDark
                              ? 'rgba(240, 77, 77, 0.16)'
                              : 'rgba(240, 77, 77, 0.12)',
                            color: palette.textPrimary,
                          }}
                        >
                          <span className="text-[10px] font-bold tabular-nums truncate">
                            {formatCompactWeekTimeRange(
                              minutesToTimeString(s),
                              minutesToTimeString(e)
                            )}
                          </span>
                          <span className="text-[10px] opacity-80 truncate">
                            New Meeting
                          </span>
                        </div>
                      );
                    })()}
                  {/* Subtle Dashed Tentative Hold Bar(s) (never styled as confirmed meeting blocks) */}
                  {dayGhosts.map((hold, ghostIdx) => {
                    const clubTokens = CLUB_THEME_TOKENS[theme][hold.clubId];
                    const canSeeDetails = canViewPrivateDetails(
                      currentUser,
                      hold.clubId,
                      hold.isPrivate
                    );
                    const hasTimeWindow =
                      !hold.isDateOnly && Boolean(hold.startTime && hold.endTime);

                    let topPx = 4 + ghostIdx * 24;
                    let heightPx = 22;

                    if (hasTimeWindow && hold.startTime && hold.endTime) {
                      const s = Math.max(
                        gridStartMinutes,
                        parseTimeToMinutes(hold.startTime)
                      );
                      const e = Math.min(
                        gridEndMinutes,
                        parseTimeToMinutes(hold.endTime)
                      );
                      const dur = Math.max(30, e - s);
                      topPx = ((s - gridStartMinutes) / 60) * HOUR_HEIGHT + 2;
                      heightPx = Math.max(24, (dur / 60) * HOUR_HEIGHT - 4);
                    }

                    return (
                      <div
                        key={hold.id}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-1 rounded-[6px] border border-dashed px-1.5 py-0.5 flex items-center gap-1 overflow-hidden"
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          borderColor: clubTokens.dot,
                          backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.03)'
                            : 'rgba(0, 0, 0, 0.025)',
                          opacity: 0.82,
                          zIndex: 1,
                        }}
                      >
                        <span
                          className="text-[8.5px] font-bold uppercase tracking-wider shrink-0"
                          style={{ color: clubTokens.kickerText }}
                        >
                          Tentative
                        </span>
                        <span
                          className="text-[9.5px] font-medium truncate"
                          style={{ color: palette.textSecondary }}
                        >
                          · {canSeeDetails ? hold.title : 'Private hold'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Confirmed Meetings */}
                  {dayEvents.map((ev) => {
                    const startMins = Math.max(
                      gridStartMinutes,
                      parseTimeToMinutes(ev.startTime)
                    );
                    const endMins = Math.min(
                      gridEndMinutes,
                      parseTimeToMinutes(ev.endTime)
                    );
                    const durationMins = Math.max(30, endMins - startMins);

                    const topPx =
                      ((startMins - gridStartMinutes) / 60) * HOUR_HEIGHT + 2;
                    const heightPx = Math.max(
                      32,
                      (durationMins / 60) * HOUR_HEIGHT - 4
                    );

                    const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];
                    const isEventSelected = selectedEventId === ev.id;
                    const showLocation = heightPx >= 54;

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className="ts-event-chip absolute inset-x-1 rounded-[7px] px-2 py-1 text-left overflow-hidden border cursor-pointer flex flex-col"
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                          backgroundColor: clubTokens.weekBg,
                          borderColor: isEventSelected
                            ? clubTokens.weekBar
                            : clubTokens.pillBorder,
                          borderLeftWidth: '3px',
                          borderLeftColor: clubTokens.weekBar,
                          color: clubTokens.weekText,
                          boxShadow: isEventSelected
                            ? `0 0 0 1.5px ${clubTokens.weekBar}`
                            : 'none',
                          zIndex: isEventSelected ? 10 : 2,
                        }}
                      >
                        <span className="text-[10px] opacity-80 tabular-nums leading-tight truncate">
                          {formatCompactWeekTimeRange(ev.startTime, ev.endTime)}
                        </span>
                        <span className="text-[11.5px] font-semibold leading-snug truncate mt-0.5">
                          {ev.title}
                        </span>
                        {showLocation && (
                          <span className="text-[10px] opacity-75 truncate mt-auto">
                            {ev.location}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
