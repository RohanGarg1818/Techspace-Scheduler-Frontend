import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import {
  CalendarEvent,
  CurrentUser,
  GhostRange,
  ThemeMode,
} from '../types/calendar';
import { CLUB_THEME_TOKENS, ThemePalette } from '../theme/calendarTheme';
import {
  formatCompactWeekTimeRange,
  parseTimeToMinutes,
} from '../utils/dateUtils';
import { isDateInRange } from '../utils/conflictUtils';
import { canAccessAdminControls, canViewPrivateDetails } from '../utils/permissions';

interface DayViewProps {
  theme: ThemeMode;
  palette: ThemePalette;
  currentUser: CurrentUser;
  dateKey: string;
  selectedDateKey: string | null;
  todayDateKey: string;
  selectedEventId: string | null;
  events: CalendarEvent[];
  ghostRanges: GhostRange[];
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onDragSelectDayTime?: (selection: {
    dateKey: string;
    startTime: string;
    endTime: string;
  }) => void;
}

const START_HOUR = 8; // 8 AM
const END_HOUR = 19; // 7 PM
const HOUR_HEIGHT = 48; // px per hour

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

function computeEventLanes(dayEvents: CalendarEvent[]): Map<string, { lane: number; totalLanes: number }> {
  const sorted = [...dayEvents].sort(
    (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
  );
  const result = new Map<string, { lane: number; totalLanes: number }>();

  // Group overlapping events into clusters so each cluster calculates its lane count cleanly
  let cluster: CalendarEvent[] = [];
  let clusterMaxEnd = -1;

  const flushCluster = (items: CalendarEvent[]) => {
    if (items.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: { id: string; lane: number }[] = [];

    for (const ev of items) {
      const s = parseTimeToMinutes(ev.startTime);
      const e = parseTimeToMinutes(ev.endTime);
      let laneIndex = laneEnds.findIndex((endMin) => endMin <= s);
      if (laneIndex === -1) {
        laneIndex = laneEnds.length;
        laneEnds.push(e);
      } else {
        laneEnds[laneIndex] = e;
      }
      assigned.push({ id: ev.id, lane: laneIndex });
    }

    const totalLanes = Math.max(1, laneEnds.length);
    for (const item of assigned) {
      result.set(item.id, { lane: item.lane, totalLanes });
    }
  };

  for (const ev of sorted) {
    const s = parseTimeToMinutes(ev.startTime);
    const e = parseTimeToMinutes(ev.endTime);
    if (cluster.length === 0 || s < clusterMaxEnd) {
      cluster.push(ev);
      clusterMaxEnd = Math.max(clusterMaxEnd, e);
    } else {
      flushCluster(cluster);
      cluster = [ev];
      clusterMaxEnd = e;
    }
  }
  flushCluster(cluster);

  return result;
}

export const DayView: React.FC<DayViewProps> = ({
  theme,
  palette,
  currentUser,
  dateKey,
  selectedDateKey,
  todayDateKey: _todayDateKey,
  selectedEventId,
  events,
  ghostRanges,
  onSelectDate,
  onSelectEvent,
  onDragSelectDayTime,
}) => {
  const gridStartMinutes = START_HOUR * 60;
  const gridEndMinutes = END_HOUR * 60;
  const totalGridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  const canDragCreate =
    canAccessAdminControls(currentUser) && Boolean(onDragSelectDayTime);

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
      if (curr?.active && onDragSelectDayTime) {
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
        onDragSelectDayTime({
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
  }, [Boolean(dragState), gridEndMinutes, gridStartMinutes, onDragSelectDayTime]);

  const isSelected = dateKey === selectedDateKey;
  const isDark = theme === 'dark';

  const dayEvents = events
    .filter((ev) => ev.date === dateKey)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const dayGhosts = ghostRanges.filter((g) =>
    isDateInRange(dateKey, g.startDate, g.endDate)
  );

  const laneMap = computeEventLanes(dayEvents);

  return (
    <div className="flex flex-col flex-1 min-h-0 select-none">

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

        {/* Single Day Column + Horizontal Hour Gridlines */}
        <div
          onMouseDown={(e) => {
            if (e.button !== 0 || !canDragCreate) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const anchorMins = Math.min(
              gridEndMinutes - 30,
              snapOffsetToMinutes(e.clientY - rect.top)
            );
            setDragState({
              dateKey,
              columnTop: rect.top,
              anchorMins,
              currentMins: Math.min(gridEndMinutes, anchorMins + 30),
              startClientY: e.clientY,
              active: false,
            });
          }}
          onClick={() => {
            if (justDraggedRef.current) return;
            onSelectDate(dateKey);
          }}
          data-selected={isSelected ? 'true' : 'false'}
          className="ts-calendar-cell flex-1 relative h-full cursor-pointer rounded-[12px]"
          style={{
            height: `${totalGridHeight}px`,
            marginTop: '8px',
            background: isSelected
              ? palette.weekColumnHighlight
              : isDark
                ? palette.surfaceSubtle
                : 'transparent',
            borderLeft: `1px solid ${palette.gridLine}`,
          }}
        >
          {/* Horizontal Hour Lines */}
          {HOURS.map((hour, index) => (
            <div
              key={`day-line-${hour}`}
              className="absolute inset-x-0 pointer-events-none"
              style={{
                top: `${index * HOUR_HEIGHT}px`,
                borderTop: `1px solid ${palette.gridLine}`,
              }}
            />
          ))}


          {/* Live Drag-to-Schedule Preview Block */}
          {dragState?.active &&
            (() => {
              let s = Math.min(dragState.anchorMins, dragState.currentMins);
              let e = Math.max(dragState.anchorMins, dragState.currentMins);
              if (e <= s) {
                e = Math.min(gridEndMinutes, s + 30);
              }
              const dragTop = ((s - gridStartMinutes) / 60) * HOUR_HEIGHT + 2;
              const dragHeight = Math.max(
                24,
                ((e - s) / 60) * HOUR_HEIGHT - 4
              );
              return (
                <div
                  className="pointer-events-none absolute inset-x-2 rounded-[8px] border border-dashed px-2.5 py-1 flex flex-col justify-start z-20"
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
                  <span className="text-[10.5px] font-bold tabular-nums truncate">
                    {formatCompactWeekTimeRange(
                      minutesToTimeString(s),
                      minutesToTimeString(e)
                    )}
                  </span>
                  <span className="text-[10.5px] opacity-80 truncate">
                    New Meeting
                  </span>
                </div>
              );
            })()}

          {/* Tentative Ghost Hold Bars */}
          {dayGhosts.map((hold, ghostIdx) => {
            const clubTokens = CLUB_THEME_TOKENS[theme][hold.clubId];
            const canSeeDetails = canViewPrivateDetails(
              currentUser,
              hold.clubId,
              hold.isPrivate
            );
            const hasTimeWindow =
              !hold.isDateOnly && Boolean(hold.startTime && hold.endTime);

            let topPx = 4 + ghostIdx * 26;
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
                className="pointer-events-none absolute inset-x-2 rounded-[7px] border border-dashed px-2 py-0.5 flex items-center gap-1.5 overflow-hidden"
                style={{
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                  borderColor: clubTokens.dot,
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(0, 0, 0, 0.025)',
                  opacity: 0.85,
                  zIndex: 1,
                }}
              >
                <span
                  className="text-[9px] font-bold uppercase tracking-wider shrink-0"
                  style={{ color: clubTokens.kickerText }}
                >
                  Tentative
                </span>
                <span
                  className="text-[10.5px] font-medium truncate"
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
              34,
              (durationMins / 60) * HOUR_HEIGHT - 4
            );

            const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];
            const isEventSelected = selectedEventId === ev.id;
            const laneInfo = laneMap.get(ev.id) ?? { lane: 0, totalLanes: 1 };
            const widthPct = 100 / laneInfo.totalLanes;
            const leftPct = laneInfo.lane * widthPct;

            return (
              <button
                key={ev.id}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(ev);
                }}
                className="ts-event-chip absolute rounded-[8px] px-2.5 py-1 text-left overflow-hidden border cursor-pointer flex flex-col"
                style={{
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                  left: `calc(${leftPct}% + 6px)`,
                  width: `calc(${widthPct}% - 12px)`,
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] opacity-85 tabular-nums leading-tight truncate">
                    {formatCompactWeekTimeRange(ev.startTime, ev.endTime)}
                  </span>
                  <span className="text-[10px] opacity-75 inline-flex items-center gap-1 truncate shrink-0">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </span>
                </div>
                <span className="text-[12.5px] font-semibold leading-snug truncate mt-0.5">
                  {ev.title}
                </span>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};
