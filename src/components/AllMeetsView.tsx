import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SpringSegmentedControl, SegmentOption } from './ui/SpringSegmentedControl';
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  CalendarEvent,
  ClubId,
  ClubInfo,
  CurrentUser,
  ThemeMode,
  TimeSubfilter,
} from '../types/calendar';
import { CLUB_THEME_TOKENS, ThemePalette } from '../theme/calendarTheme';
import {
  addDays,
  addMonths,
  formatDateKey,
  formatFullDateWithYear,
  formatMonthYearLabel,
  formatSelectedDayFull,
  formatSelectedDayShort,
  formatTimeRange,
  formatWeekRangeLabel,
  getWeekDays,
  pad2,
  parseDateKey,
  parseTimeToMinutes,
} from '../utils/dateUtils';
import {
  canAccessAdminControls,
  canCancelMeeting,
  canEditMeeting,
  canManageMom,
} from '../utils/permissions';

export type AllMeetsTab = 'past' | 'today' | 'upcoming';

function getPeriodBounds(
  dateKey: string,
  subfilter: TimeSubfilter
): { start: string; end: string } {
  if (subfilter === 'day') {
    return { start: dateKey, end: dateKey };
  }
  if (subfilter === 'week') {
    const week = getWeekDays(dateKey);
    return { start: week[0].dateKey, end: week[6].dateKey };
  }
  // month
  const d = parseDateKey(dateKey);
  const y = d.getFullYear();
  const m = d.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    start: `${y}-${pad2(m + 1)}-01`,
    end: `${y}-${pad2(m + 1)}-${pad2(lastDay)}`,
  };
}

interface AllMeetsViewProps {
  theme: ThemeMode;
  palette: ThemePalette;
  currentUser: CurrentUser;
  events: CalendarEvent[];
  clubs: ClubInfo[];
  todayDateKey: string;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEventMom: (eventId: string, mom: string) => void;
  onOpenCreateModal?: () => void;
}

export const AllMeetsView: React.FC<AllMeetsViewProps> = ({
  theme,
  palette,
  currentUser,
  events,
  clubs,
  todayDateKey,
  onEditEvent,
  onDeleteEvent,
  onUpdateEventMom,
  onOpenCreateModal,
}) => {
  // Middle switch ("Today") is selected by default
  const [activeTab, setActiveTab] = useState<AllMeetsTab>('today');
  // Day / Week / Month subfilter with Week selected by default
  const [timeSubfilter, setTimeSubfilter] = useState<TimeSubfilter>('week');
  // Multi-club selection (empty array = All Clubs)
  const [selectedClubIds, setSelectedClubIds] = useState<ClubId[]>([]);
  // Anchor dates for Past and Upcoming periods
  const [pastAnchorDateKey, setPastAnchorDateKey] = useState<string>(todayDateKey);
  const [upcomingAnchorDateKey, setUpcomingAnchorDateKey] = useState<string>(todayDateKey);

  // Cards do not activate until clicked
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isEditingMom, setIsEditingMom] = useState(false);
  const [momDraft, setMomDraft] = useState('');

  const isDark = theme === 'dark';
  const clubMap = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);

  const isAllClubs = selectedClubIds.length === 0 || selectedClubIds.length === clubs.length;

  const clubFilteredEvents = useMemo(() => {
    if (isAllClubs) return events;
    return events.filter((ev) => selectedClubIds.includes(ev.clubId));
  }, [events, isAllClubs, selectedClubIds]);

  const handleToggleClub = (clubId: ClubId) => {
    setSelectedEventId(null);
    if (isAllClubs) {
      setSelectedClubIds([clubId]);
    } else {
      if (selectedClubIds.includes(clubId)) {
        const next = selectedClubIds.filter((id) => id !== clubId);
        setSelectedClubIds(next);
      } else {
        const next = [...selectedClubIds, clubId];
        setSelectedClubIds(next.length === clubs.length ? [] : next);
      }
    }
  };

  const effectivePastAnchor = useMemo(() => {
    if (timeSubfilter === 'day' && pastAnchorDateKey >= todayDateKey) {
      return addDays(todayDateKey, -1);
    }
    return pastAnchorDateKey;
  }, [pastAnchorDateKey, timeSubfilter, todayDateKey]);

  const effectiveUpcomingAnchor = useMemo(() => {
    if (timeSubfilter === 'day' && upcomingAnchorDateKey <= todayDateKey) {
      return addDays(todayDateKey, 1);
    }
    return upcomingAnchorDateKey;
  }, [upcomingAnchorDateKey, timeSubfilter, todayDateKey]);

  const pastBounds = useMemo(
    () => getPeriodBounds(effectivePastAnchor, timeSubfilter),
    [effectivePastAnchor, timeSubfilter]
  );

  const upcomingBounds = useMemo(
    () => getPeriodBounds(effectiveUpcomingAnchor, timeSubfilter),
    [effectiveUpcomingAnchor, timeSubfilter]
  );

  const pastMeets = useMemo(() => {
    return clubFilteredEvents
      .filter((ev) => {
        if (ev.date >= todayDateKey) return false;
        return ev.date >= pastBounds.start && ev.date <= pastBounds.end;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return parseTimeToMinutes(b.startTime) - parseTimeToMinutes(a.startTime);
      });
  }, [clubFilteredEvents, todayDateKey, pastBounds]);

  const todayMeets = useMemo(() => {
    return clubFilteredEvents
      .filter((ev) => ev.date === todayDateKey)
      .sort(
        (a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
      );
  }, [clubFilteredEvents, todayDateKey]);

  const upcomingMeets = useMemo(() => {
    return clubFilteredEvents
      .filter((ev) => {
        if (ev.date <= todayDateKey) return false;
        return ev.date >= upcomingBounds.start && ev.date <= upcomingBounds.end;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
      });
  }, [clubFilteredEvents, todayDateKey, upcomingBounds]);

  const tabOptions = useMemo<SegmentOption<AllMeetsTab>[]>(
    () => [
      { value: 'past', label: 'Past Meets', badge: pastMeets.length },
      { value: 'today', label: 'Today', badge: todayMeets.length },
      { value: 'upcoming', label: 'Upcoming', badge: upcomingMeets.length },
    ],
    [pastMeets.length, todayMeets.length, upcomingMeets.length]
  );

  const TIME_SUBFILTER_OPTIONS = useMemo<SegmentOption<TimeSubfilter>[]>(
    () => [
      { value: 'day', label: 'day' },
      { value: 'week', label: 'week' },
      { value: 'month', label: 'month' },
    ],
    []
  );

  const handleTimeSubfilterChange = useCallback((sub: TimeSubfilter) => {
    setTimeSubfilter(sub);
    setSelectedEventId(null);
  }, []);

  const handlePrevPeriod = () => {
    setSelectedEventId(null);
    if (activeTab === 'past') {
      if (timeSubfilter === 'day') {
        setPastAnchorDateKey((prev) =>
          addDays(prev >= todayDateKey ? addDays(todayDateKey, -1) : prev, -1)
        );
      } else if (timeSubfilter === 'week') {
        setPastAnchorDateKey((prev) => addDays(prev, -7));
      } else {
        const d = parseDateKey(pastAnchorDateKey);
        const prevMonth = addMonths(d.getFullYear(), d.getMonth(), -1);
        setPastAnchorDateKey(formatDateKey(new Date(prevMonth.year, prevMonth.monthIndex, 1)));
      }
    } else if (activeTab === 'upcoming') {
      if (timeSubfilter === 'day') {
        setUpcomingAnchorDateKey((prev) =>
          addDays(prev <= todayDateKey ? addDays(todayDateKey, 1) : prev, -1)
        );
      } else if (timeSubfilter === 'week') {
        setUpcomingAnchorDateKey((prev) => addDays(prev, -7));
      } else {
        const d = parseDateKey(upcomingAnchorDateKey);
        const prevMonth = addMonths(d.getFullYear(), d.getMonth(), -1);
        setUpcomingAnchorDateKey(formatDateKey(new Date(prevMonth.year, prevMonth.monthIndex, 1)));
      }
    }
  };

  const handleNextPeriod = () => {
    setSelectedEventId(null);
    if (activeTab === 'past') {
      if (timeSubfilter === 'day') {
        setPastAnchorDateKey((prev) => {
          const nextDay = addDays(prev >= todayDateKey ? addDays(todayDateKey, -1) : prev, 1);
          return nextDay >= todayDateKey ? addDays(todayDateKey, -1) : nextDay;
        });
      } else if (timeSubfilter === 'week') {
        setPastAnchorDateKey((prev) => addDays(prev, 7));
      } else {
        const d = parseDateKey(pastAnchorDateKey);
        const nextMonth = addMonths(d.getFullYear(), d.getMonth(), 1);
        setPastAnchorDateKey(formatDateKey(new Date(nextMonth.year, nextMonth.monthIndex, 1)));
      }
    } else if (activeTab === 'upcoming') {
      if (timeSubfilter === 'day') {
        setUpcomingAnchorDateKey((prev) =>
          addDays(prev <= todayDateKey ? addDays(todayDateKey, 1) : prev, 1)
        );
      } else if (timeSubfilter === 'week') {
        setUpcomingAnchorDateKey((prev) => addDays(prev, 7));
      } else {
        const d = parseDateKey(upcomingAnchorDateKey);
        const nextMonth = addMonths(d.getFullYear(), d.getMonth(), 1);
        setUpcomingAnchorDateKey(formatDateKey(new Date(nextMonth.year, nextMonth.monthIndex, 1)));
      }
    }
  };

  const handleResetPeriod = () => {
    setSelectedEventId(null);
    setPastAnchorDateKey(todayDateKey);
    setUpcomingAnchorDateKey(todayDateKey);
  };

  const currentPeriodLabel = useMemo(() => {
    if (activeTab === 'today') {
      return formatSelectedDayFull(todayDateKey);
    }
    const anchor = activeTab === 'past' ? effectivePastAnchor : effectiveUpcomingAnchor;
    if (timeSubfilter === 'day') {
      return formatSelectedDayFull(anchor);
    }
    if (timeSubfilter === 'week') {
      return formatWeekRangeLabel(anchor);
    }
    const d = parseDateKey(anchor);
    return formatMonthYearLabel(d.getFullYear(), d.getMonth());
  }, [activeTab, effectivePastAnchor, effectiveUpcomingAnchor, timeSubfilter, todayDateKey]);

  const isNavigatedAway = useMemo(() => {
    if (activeTab === 'today') return false;
    if (activeTab === 'past') {
      if (timeSubfilter === 'day') return effectivePastAnchor !== addDays(todayDateKey, -1);
      if (timeSubfilter === 'week') {
        const curWeek = getWeekDays(todayDateKey);
        const pastWeek = getWeekDays(pastAnchorDateKey);
        return curWeek[0].dateKey !== pastWeek[0].dateKey;
      }
      const d1 = parseDateKey(todayDateKey);
      const d2 = parseDateKey(pastAnchorDateKey);
      return d1.getFullYear() !== d2.getFullYear() || d1.getMonth() !== d2.getMonth();
    }
    // upcoming
    if (timeSubfilter === 'day') return effectiveUpcomingAnchor !== addDays(todayDateKey, 1);
    if (timeSubfilter === 'week') {
      const curWeek = getWeekDays(todayDateKey);
      const upWeek = getWeekDays(upcomingAnchorDateKey);
      return curWeek[0].dateKey !== upWeek[0].dateKey;
    }
    const d1 = parseDateKey(todayDateKey);
    const d2 = parseDateKey(upcomingAnchorDateKey);
    return d1.getFullYear() !== d2.getFullYear() || d1.getMonth() !== d2.getMonth();
  }, [activeTab, effectivePastAnchor, effectiveUpcomingAnchor, pastAnchorDateKey, upcomingAnchorDateKey, timeSubfilter, todayDateKey]);

  const displayedMeets =
    activeTab === 'past'
      ? pastMeets
      : activeTab === 'today'
        ? todayMeets
        : upcomingMeets;

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return displayedMeets.find((ev) => ev.id === selectedEventId) ?? null;
  }, [displayedMeets, selectedEventId]);

  useEffect(() => {
    setIsEditingMom(false);
    setMomDraft(selectedEvent?.mom ?? '');
  }, [selectedEventId, selectedEvent?.mom]);

  const handleTabChange = (tab: AllMeetsTab) => {
    setActiveTab(tab);
    setSelectedEventId(null);
  };

  const isDetailOpen = Boolean(selectedEvent);

  const renderDetailsCard = (ev: CalendarEvent) => {
    const isPast = ev.date < todayDateKey;
    const allowMom = canManageMom(currentUser, ev);

    return (
      <aside
        className="w-full lg:w-[clamp(230px,19vw,280px)] shrink-0 rounded-[20px] border p-4 flex flex-col justify-between transition-colors duration-150 h-full"
        style={{
          background: palette.surfaceBackground,
          borderColor: palette.border,
          boxShadow: palette.cardShadow,
        }}
      >
        <div className="flex flex-col min-h-0 overflow-y-auto ts-scroll pr-0.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b" style={{ borderColor: palette.gridLine }}>
            <div className="min-w-0">
              <p
                className="text-[11px] font-bold tracking-[0.06em] uppercase"
                style={{ color: CLUB_THEME_TOKENS[theme][ev.clubId].kickerText }}
              >
                {clubMap.get(ev.clubId)?.shortLabel}
              </p>
              <h2
                className="text-[17px] font-bold leading-snug tracking-tight mt-0.5"
                style={{ color: palette.textPrimary }}
              >
                {ev.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEventId(null)}
              aria-label="Close meeting details"
              className="ts-icon-btn w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer shrink-0"
              style={{
                backgroundColor: palette.buttonMutedBg,
                borderColor: palette.border,
                color: palette.textMuted,
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Badges: Attendance + DONE (for past meets) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span
              className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
              style={{
                backgroundColor:
                  ev.attendance === 'Mandatory'
                    ? palette.mandatoryBadgeBg
                    : palette.optionalBadgeBg,
                color:
                  ev.attendance === 'Mandatory'
                    ? palette.mandatoryBadgeText
                    : palette.optionalBadgeText,
              }}
            >
              {ev.attendance}
            </span>
            {isPast && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wider border"
                style={{
                  backgroundColor: palette.buttonMutedBg,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>DONE</span>
              </span>
            )}
          </div>

          {/* Metadata Rows */}
          <div className="mt-3.5 space-y-2 text-[12px]">
            <div
              className="flex items-center gap-2"
              style={{ color: palette.textSecondary }}
            >
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
              <span>{formatFullDateWithYear(ev.date)}</span>
            </div>
            <div
              className="flex items-center gap-2 tabular-nums"
              style={{ color: palette.textSecondary }}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
              <span>{formatTimeRange(ev.startTime, ev.endTime)}</span>
            </div>
            <div
              className="flex items-center gap-2"
              style={{ color: palette.textSecondary }}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
              <span>{ev.location}</span>
            </div>
            <div
              className="flex items-center gap-2"
              style={{ color: palette.textSecondary }}
            >
              <User className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
              <span>Lead: {ev.organizer}</span>
            </div>

            {/* DONE in place of meeting link for Past Meets; Join link for Today / Upcoming */}
            <div className="pt-1">
              {isPast ? (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11.5px] font-bold tracking-wide"
                  style={{
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>DONE</span>
                </div>
              ) : ev.meetingLink ? (
                <a
                  href={ev.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold underline"
                  style={{ color: palette.textPrimary }}
                >
                  <span>Join Meeting Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>

          {/* Description */}
          <p
            className="mt-3.5 pt-3 border-t text-[12px] leading-relaxed"
            style={{
              borderColor: palette.gridLine,
              color: palette.textSecondary,
            }}
          >
            {ev.description}
          </p>

          {/* Past Meets: Minutes of Meeting (MOM) — Admins only can add/edit */}
          {isPast && (
            <div
              className="mt-3.5 pt-3 border-t"
              style={{ borderColor: palette.gridLine }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: palette.textPrimary }}
                >
                  <FileText className="w-3.5 h-3.5" style={{ color: palette.textMuted }} />
                  <span>Minutes of Meeting (MOM)</span>
                </span>
                {allowMom && !isEditingMom && (
                  <button
                    type="button"
                    onClick={() => {
                      setMomDraft(ev.mom ?? '');
                      setIsEditingMom(true);
                    }}
                    className="ts-btn inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: palette.buttonMutedBg,
                      color: palette.textPrimary,
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{ev.mom ? 'Edit MOM' : 'Add MOM'}</span>
                  </button>
                )}
              </div>

              {isEditingMom && allowMom ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={momDraft}
                    onChange={(e) => setMomDraft(e.target.value)}
                    placeholder="Record key decisions, action items, and attendees..."
                    className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] leading-relaxed focus:outline-none resize-none"
                    style={{
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingMom(false);
                        setMomDraft(ev.mom ?? '');
                      }}
                      className="ts-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: palette.buttonMutedBg,
                        color: palette.textSecondary,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateEventMom(ev.id, momDraft.trim());
                        setIsEditingMom(false);
                      }}
                      className="ts-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: palette.accentBg,
                        color: palette.accentText,
                      }}
                    >
                      Save MOM
                    </button>
                  </div>
                </div>
              ) : ev.mom ? (
                <div
                  className="rounded-[11px] border p-2.5"
                  style={{
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                  }}
                >
                  <p
                    className="text-[12px] leading-relaxed whitespace-pre-line"
                    style={{ color: palette.textSecondary }}
                  >
                    {ev.mom}
                  </p>
                  {ev.momUpdatedBy && (
                    <p
                      className="text-[10.5px] mt-2"
                      style={{ color: palette.textMuted }}
                    >
                      Added by {ev.momUpdatedBy}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11.5px]" style={{ color: palette.textMuted }}>
                  {allowMom
                    ? 'No MOM recorded yet. Click Add MOM to document outcomes.'
                    : 'No MOM recorded for this meeting yet.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom Admin Actions */}
        {(canEditMeeting(currentUser, ev) || canCancelMeeting(currentUser, ev)) && (
          <div
            className="mt-4 pt-3 border-t flex items-center justify-end gap-1.5"
            style={{ borderColor: palette.gridLine }}
          >
            {canEditMeeting(currentUser, ev) && (
              <button
                type="button"
                onClick={() => onEditEvent(ev)}
                className="ts-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer"
                style={{
                  color: palette.textPrimary,
                  backgroundColor: palette.buttonMutedBg,
                }}
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
            {canCancelMeeting(currentUser, ev) && (
              <button
                type="button"
                onClick={() => {
                  onDeleteEvent(ev.id);
                  setSelectedEventId(null);
                }}
                className="ts-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer"
                style={{
                  color: palette.mandatoryBadgeText,
                  backgroundColor: palette.mandatoryBadgeBg,
                }}
              >
                <Trash2 className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        )}
      </aside>
    );
  };

  return (
    <div className="flex flex-1 min-w-0 min-h-0">
      {/* Main All Meets Panel */}
      <main
        className="flex-1 min-w-0 min-h-0 rounded-[20px] border p-3.5 sm:p-4 flex flex-col transition-colors duration-150"
        style={{
          background: palette.surfaceBackground,
          borderColor: palette.border,
          boxShadow: palette.cardShadow,
        }}
      >
        {/* Header: Title + Three-Way Switch + Optional Create Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: palette.gridLine }}>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1
                className="text-[18px] font-bold tracking-tight"
                style={{ color: palette.textPrimary }}
              >
                All Meets
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: palette.textMuted }}>
                Click any meeting card to inspect details
              </p>
            </div>
          </div>

          {/* Three-Way Switch: Past Meets | Today (default) | Upcoming */}
          <SpringSegmentedControl<AllMeetsTab>
            options={tabOptions}
            value={activeTab}
            onChange={handleTabChange}
            trackBg={palette.segmentedTrackBg}
            activeBg={palette.accentBg}
            activeText={palette.accentText}
            inactiveText={palette.textMuted}
            activeBadgeBg="rgba(255, 255, 255, 0.22)"
            activeBadgeText={palette.accentText}
            inactiveBadgeBg={palette.buttonMutedBg}
            inactiveBadgeText={palette.textSecondary}
            className="w-full sm:w-auto flex sm:inline-flex p-1 rounded-full shrink-0"
            buttonClassName="ts-btn flex-1 sm:flex-initial inline-flex items-center justify-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-[13px] font-semibold whitespace-nowrap min-w-0"
            ariaLabel="Meeting timeframe filter"
            role="tablist"
            style={{ "--pill-inset": "8px" } as React.CSSProperties}
          />

          {canAccessAdminControls(currentUser) && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="ts-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold cursor-pointer shrink-0"
              style={{
                backgroundColor: palette.accentBg,
                color: palette.accentText,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Meet</span>
            </button>
          )}
        </div>

        {/* Subfilter & Date Navigation Controls Row */}
        <div
          className="flex flex-wrap items-center justify-between gap-2.5 py-3 border-b"
          style={{ borderColor: palette.gridLine }}
        >
          {/* Subfilter: Day | Week (default) | Month */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11.5px] font-semibold uppercase tracking-wider hidden sm:inline"
              style={{ color: palette.textMuted }}
            >
              Period:
            </span>
            <SpringSegmentedControl<TimeSubfilter>
              options={TIME_SUBFILTER_OPTIONS}
              value={timeSubfilter}
              onChange={handleTimeSubfilterChange}
              trackBg={palette.segmentedTrackBg}
              activeBg={palette.accentBg}
              activeText={palette.accentText}
              inactiveText={palette.textMuted}
              className="p-0.5 sm:p-1 rounded-full shrink-0"
              buttonClassName="ts-btn px-2.5 sm:px-3.5 py-1 rounded-full text-[11px] sm:text-[12px] font-semibold capitalize"
              ariaLabel="Time period subfilter"
              style={{ "--pill-inset": "4px" } as React.CSSProperties}
            />
          </div>

          {/* Date Range Navigation (for Past & Upcoming, or Today label) */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1.5 sm:gap-3 shrink-0">
            {activeTab === 'today' ? (
              <span
                className="text-[12px] sm:text-[13px] font-semibold tabular-nums"
                style={{ color: palette.textPrimary }}
              >
                {currentPeriodLabel}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrevPeriod}
                  aria-label={`Previous ${timeSubfilter}`}
                  className="ts-icon-btn w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                  style={{ color: palette.textSecondary }}
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <span
                  className="text-[11.5px] sm:text-[13px] font-bold tracking-tight text-center tabular-nums min-w-[110px] sm:min-w-[160px] truncate"
                  style={{ color: palette.textPrimary }}
                >
                  {currentPeriodLabel}
                </span>

                <button
                  type="button"
                  onClick={handleNextPeriod}
                  aria-label={`Next ${timeSubfilter}`}
                  className="ts-icon-btn w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
                  style={{ color: palette.textSecondary }}
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {isNavigatedAway && (
                  <button
                    type="button"
                    onClick={handleResetPeriod}
                    className="ts-btn px-2 sm:px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11px] font-semibold border cursor-pointer whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: palette.buttonMutedBg,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                  >
                    Current
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Club Filter Pills Row (Multi-select with checkboxes & All Clubs shortcut) */}
        <div className="flex flex-wrap items-center gap-1.5 py-3">
          <button
            type="button"
            onClick={() => {
              setSelectedClubIds([]);
              setSelectedEventId(null);
            }}
            className="ts-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-semibold cursor-pointer"
            style={{
              background:
                isAllClubs
                  ? palette.accentSoftBg
                  : palette.surfaceElevated,
              borderColor:
                isAllClubs ? palette.accentSoftBorder : palette.border,
              color: palette.textPrimary,
            }}
          >
            <span
              className="w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors"
              style={{
                backgroundColor: isAllClubs ? palette.accentBg : 'transparent',
                borderColor: isAllClubs ? palette.accentBg : palette.border,
                color: palette.accentText,
              }}
            >
              {isAllClubs && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
            </span>
            <span>All Clubs</span>
          </button>
          {clubs.map((club) => {
            const isSelected = !isAllClubs && selectedClubIds.includes(club.id);
            const clubTokens = CLUB_THEME_TOKENS[theme][club.id];
            return (
              <button
                key={club.id}
                type="button"
                onClick={() => handleToggleClub(club.id)}
                className="ts-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-medium cursor-pointer"
                style={{
                  background: isSelected
                    ? clubTokens.filterRowActiveBg
                    : palette.surfaceElevated,
                  borderColor: isSelected
                    ? clubTokens.filterRowActiveBorder
                    : palette.border,
                  color: isSelected ? palette.textPrimary : palette.textSecondary,
                }}
              >
                <span
                  className="w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: isSelected ? clubTokens.dot : 'transparent',
                    borderColor: isSelected ? clubTokens.dot : palette.border,
                    color: '#FFFFFF',
                  }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: clubTokens.dot }}
                />
                <span>{club.name}</span>
              </button>
            );
          })}
        </div>

        {/* Meeting Cards List (Same card design as Calendar section; inactive until clicked) */}
        <div className="flex-1 min-h-0 overflow-y-auto ts-scroll pr-0.5">
          {displayedMeets.length === 0 ? (
            <div
              className="rounded-[15px] border p-6 text-center mt-2"
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              }}
            >
              <p
                className="text-[14px] font-semibold"
                style={{ color: palette.textPrimary }}
              >
                {activeTab === 'past'
                  ? `No past meetings found for this ${timeSubfilter}`
                  : activeTab === 'today'
                    ? 'No meetings scheduled for today'
                    : `No upcoming meetings scheduled for this ${timeSubfilter}`}
              </p>
              <p className="text-[12px] mt-1" style={{ color: palette.textMuted }}>
                {activeTab === 'today'
                  ? 'Switch to Past Meets or Upcoming above to view scheduled club meetings.'
                  : `Use the navigation arrows above to view other ${timeSubfilter} periods, or adjust the club filter.`}
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-3 pb-2 ${
                isDetailOpen
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {displayedMeets.map((ev) => {
                const club = clubMap.get(ev.clubId);
                const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];
                const isCardSelected = selectedEventId === ev.id;
                const isPast = ev.date < todayDateKey;

                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() =>
                      setSelectedEventId((prev) => (prev === ev.id ? null : ev.id))
                    }
                    className="ts-card-interactive w-full text-left rounded-[15px] border p-3.5 cursor-pointer flex flex-col"
                    style={{
                      backgroundColor: palette.surfaceElevated,
                      borderColor: isCardSelected
                        ? clubTokens.weekBar
                        : palette.border,
                      boxShadow: isCardSelected
                        ? `0 0 0 1px ${clubTokens.weekBar}`
                        : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[10.5px] font-bold tracking-[0.06em] uppercase"
                        style={{ color: clubTokens.kickerText }}
                      >
                        {club?.shortLabel}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                        style={{
                          backgroundColor:
                            ev.attendance === 'Mandatory'
                              ? palette.mandatoryBadgeBg
                              : palette.optionalBadgeBg,
                          color:
                            ev.attendance === 'Mandatory'
                              ? palette.mandatoryBadgeText
                              : palette.optionalBadgeText,
                        }}
                      >
                        {ev.attendance}
                      </span>
                    </div>

                    <h3
                      className="text-[15.5px] font-bold mt-1 tracking-tight"
                      style={{ color: palette.textPrimary }}
                    >
                      {ev.title}
                    </h3>

                    <p
                      className="text-[12px] mt-0.5 tabular-nums"
                      style={{ color: palette.textSecondary }}
                    >
                      {formatSelectedDayShort(ev.date)} ·{' '}
                      {formatTimeRange(ev.startTime, ev.endTime)}
                    </p>

                    <div
                      className="flex items-center justify-between gap-2 mt-1.5 text-[11.5px]"
                      style={{ color: palette.textMuted }}
                    >
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </span>
                      {isPast && ev.mom && (
                        <span
                          className="inline-flex items-center gap-1 text-[10.5px] font-semibold shrink-0"
                          style={{ color: palette.textSecondary }}
                        >
                          <FileText className="w-3 h-3" />
                          <span>MOM</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Conditional Desktop Meeting Details Panel (only opens when a card is clicked) */}
      <div
        className="hidden lg:flex ts-right-panel-slot"
        data-open={isDetailOpen ? 'true' : 'false'}
        aria-hidden={!isDetailOpen}
      >
        {selectedEvent && renderDetailsCard(selectedEvent)}
      </div>

      {/* Mobile / Tablet Overlay Meeting Details Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 flex justify-end ts-transition transition-opacity duration-[240ms] ${
          isDetailOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: isDark
            ? 'rgba(10, 10, 12, 0.72)'
            : 'rgba(30, 27, 24, 0.32)',
        }}
        onClick={() => setSelectedEventId(null)}
        aria-hidden={!isDetailOpen}
      >
        <div
          className={`w-[320px] max-w-[90vw] h-full p-3 ts-transition transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isDetailOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedEvent && renderDetailsCard(selectedEvent)}
        </div>
      </div>
    </div>
  );
};
