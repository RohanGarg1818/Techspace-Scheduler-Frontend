import React from 'react';
import {
  MapPin,
  ShieldCheck,
  ChevronRight,
  Clock,
  User,
  Calendar as CalendarIcon,
  X,
  Trash2,
  Pencil,
  ExternalLink,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  CalendarEvent,
  ClubInfo,
  CurrentUser,
  GhostRange,
  ThemeMode,
} from '../types/calendar';
import { CLUB_THEME_TOKENS, ThemePalette } from '../theme/calendarTheme';
import {
  formatFullDateWithYear,
  formatSelectedDayShort,
  formatTimeRange,
} from '../utils/dateUtils';
import {
  canAccessAdminControls,
  canCancelMeeting,
  canEditMeeting,
  canManageGhostRange,
  canManageMom,
  canPublishAnnouncement,
  canViewPrivateDetails,
  ROLE_LABELS,
} from '../utils/permissions';

interface RightPanelProps {
  theme: ThemeMode;
  palette: ThemePalette;
  currentUser: CurrentUser;
  todayDateKey: string;
  selectedDateKey: string | null;
  dayEvents: CalendarEvent[];
  dayGhostRanges: GhostRange[];
  upcomingEvents: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  clubs: ClubInfo[];
  onSelectEvent: (event: CalendarEvent | null) => void;
  onSelectDate: (dateKey: string) => void;
  onClosePanel: () => void;
  onOpenAdminModal: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  onUpdateEventMom: (eventId: string, mom: string) => void;
  onEditGhostRange: (hold: GhostRange) => void;
  onDeleteGhostRange: (holdId: string) => void;
  onConvertGhostRange: (hold: GhostRange) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  theme,
  palette,
  currentUser,
  todayDateKey,
  selectedDateKey,
  dayEvents,
  dayGhostRanges,
  upcomingEvents,
  selectedEvent,
  clubs,
  onSelectEvent,
  onSelectDate,
  onClosePanel,
  onOpenAdminModal,
  onEditEvent,
  onDeleteEvent,
  onUpdateEventMom,
  onEditGhostRange,
  onDeleteGhostRange,
  onConvertGhostRange,
}) => {
  const [isEditingMom, setIsEditingMom] = React.useState(false);
  const [momDraft, setMomDraft] = React.useState('');

  React.useEffect(() => {
    setIsEditingMom(false);
    setMomDraft(selectedEvent?.mom ?? '');
  }, [selectedEvent?.id, selectedEvent?.mom]);

  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const activeDateKey = selectedDateKey ?? '';
  const isDark = theme === 'dark';
  const showAdminEntry = canAccessAdminControls(currentUser);
  const isFullAdmin = currentUser.role === 'ob' || currentUser.role === 'faculty';
  const canAnnounce = canPublishAnnouncement(currentUser);

  return (
    <aside
      className="w-full lg:w-[clamp(210px,18vw,275px)] shrink-0 rounded-[20px] border p-3 sm:p-3.5 xl:p-4 flex flex-col transition-colors duration-150 h-full overflow-hidden"
      style={{
        background: palette.surfaceBackground,
        borderColor: palette.border,
        boxShadow: palette.cardShadow,
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2
              className="text-[17px] font-bold leading-[1.22] tracking-tight"
              style={{ color: palette.textPrimary }}
            >
              Meetings on
              <br />
              {activeDateKey ? formatSelectedDayShort(activeDateKey) : 'Selected Day'}
            </h2>
            <p className="text-[11.5px] mt-1" style={{ color: palette.textMuted }}>
              Your day, at a glance
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold tabular-nums shrink-0"
              style={{
                backgroundColor: palette.accentBg,
                color: palette.accentText,
              }}
            >
              {dayEvents.length}
            </span>
            <button
              type="button"
              onClick={onClosePanel}
              aria-label="Close meetings panel"
              title="Close meetings panel"
              className="ts-icon-btn w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer"
              style={{
                backgroundColor: palette.buttonMutedBg,
                borderColor: palette.border,
                color: palette.textMuted,
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selected Event Detail View OR Day Meetings List + Tentative Holds */}
        {selectedEvent ? (
          <div className="mt-4 overflow-y-auto ts-scroll pr-0.5 flex-1 min-h-0">
            <div
              className="rounded-[15px] border p-4"
              style={{
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-bold tracking-[0.06em] uppercase"
                  style={{
                    color: CLUB_THEME_TOKENS[theme][selectedEvent.clubId].kickerText,
                  }}
                >
                  {clubMap.get(selectedEvent.clubId)?.shortLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                    style={{
                      backgroundColor:
                        selectedEvent.attendance === 'Mandatory'
                          ? palette.mandatoryBadgeBg
                          : palette.optionalBadgeBg,
                      color:
                        selectedEvent.attendance === 'Mandatory'
                          ? palette.mandatoryBadgeText
                          : palette.optionalBadgeText,
                    }}
                  >
                    {selectedEvent.attendance}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(null)}
                    aria-label="Close event details"
                    className="ts-icon-btn w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                    style={{
                      color: palette.textMuted,
                      backgroundColor: palette.buttonMutedBg,
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3
                className="text-[17px] font-bold mt-2 tracking-tight"
                style={{ color: palette.textPrimary }}
              >
                {selectedEvent.title}
              </h3>

              <div className="mt-3 space-y-2 text-[12px]">
                <div
                  className="flex items-center gap-2"
                  style={{ color: palette.textSecondary }}
                >
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
                  <span>{formatFullDateWithYear(selectedEvent.date)}</span>
                </div>
                <div
                  className="flex items-center gap-2 tabular-nums"
                  style={{ color: palette.textSecondary }}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
                  <span>{formatTimeRange(selectedEvent.startTime, selectedEvent.endTime)}</span>
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{ color: palette.textSecondary }}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
                  <span>{selectedEvent.location}</span>
                </div>
                <div
                  className="flex items-center gap-2"
                  style={{ color: palette.textSecondary }}
                >
                  <User className="w-3.5 h-3.5 shrink-0" style={{ color: palette.textMuted }} />
                  <span>Lead: {selectedEvent.organizer}</span>
                </div>
                {selectedEvent.date < todayDateKey ? (
                  <div className="pt-0.5">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wide"
                      style={{
                        backgroundColor: palette.surfaceSubtle,
                        borderColor: palette.border,
                        color: palette.textPrimary,
                      }}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>DONE</span>
                    </span>
                  </div>
                ) : (
                  selectedEvent.meetingLink && (
                    <div className="pt-0.5">
                      <a
                        href={selectedEvent.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold underline"
                        style={{ color: palette.textPrimary }}
                      >
                        <span>Join Meeting Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )
                )}
              </div>

              <p
                className="mt-3 pt-3 border-t text-[12px] leading-relaxed"
                style={{
                  borderColor: palette.gridLine,
                  color: palette.textSecondary,
                }}
              >
                {selectedEvent.description}
              </p>

              {selectedEvent.date < todayDateKey && (
                <div
                  className="mt-3 pt-3 border-t"
                  style={{ borderColor: palette.gridLine }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider"
                      style={{ color: palette.textPrimary }}
                    >
                      <FileText className="w-3 h-3" style={{ color: palette.textMuted }} />
                      <span>MOM</span>
                    </span>
                    {canManageMom(currentUser, selectedEvent) && !isEditingMom && (
                      <button
                        type="button"
                        onClick={() => {
                          setMomDraft(selectedEvent.mom ?? '');
                          setIsEditingMom(true);
                        }}
                        className="ts-btn inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold cursor-pointer"
                        style={{
                          backgroundColor: palette.buttonMutedBg,
                          color: palette.textPrimary,
                        }}
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>{selectedEvent.mom ? 'Edit MOM' : 'Add MOM'}</span>
                      </button>
                    )}
                  </div>

                  {isEditingMom && canManageMom(currentUser, selectedEvent) ? (
                    <div className="space-y-1.5">
                      <textarea
                        rows={3}
                        value={momDraft}
                        onChange={(e) => setMomDraft(e.target.value)}
                        placeholder="Add minutes of meeting..."
                        className="w-full px-2 py-1.5 rounded-[8px] border text-[11.5px] focus:outline-none resize-none"
                        style={{
                          backgroundColor: palette.surfaceSubtle,
                          borderColor: palette.border,
                          color: palette.textPrimary,
                        }}
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingMom(false)}
                          className="ts-btn px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer"
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
                            onUpdateEventMom(selectedEvent.id, momDraft.trim());
                            setIsEditingMom(false);
                          }}
                          className="ts-btn px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer"
                          style={{
                            backgroundColor: palette.accentBg,
                            color: palette.accentText,
                          }}
                        >
                          Save MOM
                        </button>
                      </div>
                    </div>
                  ) : selectedEvent.mom ? (
                    <div
                      className="rounded-[9px] border p-2 text-[11.5px] leading-relaxed whitespace-pre-line"
                      style={{
                        backgroundColor: palette.surfaceSubtle,
                        borderColor: palette.border,
                        color: palette.textSecondary,
                      }}
                    >
                      {selectedEvent.mom}
                    </div>
                  ) : (
                    <p className="text-[11px]" style={{ color: palette.textMuted }}>
                      No MOM added yet.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectEvent(null)}
                  className="ts-btn px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold cursor-pointer"
                  style={{
                    backgroundColor: palette.buttonMutedBg,
                    color: palette.textPrimary,
                  }}
                >
                  Back to list
                </button>

                <div className="flex items-center gap-1.5">
                  {canEditMeeting(currentUser, selectedEvent) && (
                    <button
                      type="button"
                      onClick={() => onEditEvent(selectedEvent)}
                      title="Edit meeting"
                      className="ts-btn inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer"
                      style={{
                        color: palette.textPrimary,
                        backgroundColor: palette.buttonMutedBg,
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                  {canCancelMeeting(currentUser, selectedEvent) && (
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(selectedEvent.id)}
                      title="Cancel meeting"
                      className="ts-btn inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11.5px] font-medium cursor-pointer"
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
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5 overflow-y-auto ts-scroll pr-0.5 max-h-[390px]">
            {dayEvents.length === 0 ? (
              <div
                className="rounded-[15px] border p-4"
                style={{
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                }}
              >
                <p
                  className="text-[13.5px] font-semibold"
                  style={{ color: palette.textPrimary }}
                >
                  No meetings scheduled
                </p>
                <p
                  className="text-[12px] mt-1 leading-relaxed"
                  style={{ color: palette.textMuted }}
                >
                  Nothing on the schedule for{' '}
                  {activeDateKey ? formatSelectedDayShort(activeDateKey) : 'this day'}.
                </p>

                {upcomingEvents.length > 0 && (
                  <div
                    className="mt-3 pt-3 border-t space-y-1.5"
                    style={{ borderColor: palette.gridLine }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: palette.textMuted }}
                    >
                      Upcoming
                    </p>
                    {upcomingEvents.slice(0, 2).map((ev) => {
                      const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            onSelectDate(ev.date);
                            onSelectEvent(ev);
                          }}
                          className="ts-card-interactive w-full text-left p-2 rounded-[10px] border cursor-pointer flex items-center justify-between gap-2"
                          style={{
                            backgroundColor: palette.surfaceSubtle,
                            borderColor: palette.border,
                          }}
                        >
                          <div className="min-w-0">
                            <p
                              className="text-[12px] font-semibold truncate"
                              style={{ color: palette.textPrimary }}
                            >
                              {ev.title}
                            </p>
                            <p
                              className="text-[11px] tabular-nums"
                              style={{ color: palette.textMuted }}
                            >
                              {formatSelectedDayShort(ev.date)} · {ev.startTime}
                            </p>
                          </div>
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: clubTokens.dot }}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              dayEvents.map((ev) => {
                const club = clubMap.get(ev.clubId);
                const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];

                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="ts-card-interactive w-full text-left rounded-[15px] border p-3.5 cursor-pointer"
                    style={{
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.border,
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
                      {formatTimeRange(ev.startTime, ev.endTime)}
                    </p>

                    <div
                      className="flex items-center gap-1.5 mt-1.5 text-[11.5px]"
                      style={{ color: palette.textMuted }}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  </button>
                );
              })
            )}

            {/* Tentative Holds (Ghost Ranges) overlapping selected date */}
            {dayGhostRanges.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p
                    className="text-[10.5px] font-bold uppercase tracking-wider"
                    style={{ color: palette.textMuted }}
                  >
                    Tentative Holds
                  </p>
                  {dayEvents.length > 0 && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-dashed"
                      style={{
                        borderColor: palette.border,
                        color: palette.textSecondary,
                      }}
                    >
                      Date overlap
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {dayGhostRanges.map((hold) => {
                    const club = clubMap.get(hold.clubId);
                    const clubTokens = CLUB_THEME_TOKENS[theme][hold.clubId];
                    const canSeeDetails = canViewPrivateDetails(
                      currentUser,
                      hold.clubId,
                      hold.isPrivate
                    );
                    const canManage = canManageGhostRange(currentUser, hold);

                    return (
                      <div
                        key={hold.id}
                        className="ts-card-interactive rounded-[13px] border border-dashed p-3"
                        style={{
                          backgroundColor: palette.surfaceSubtle,
                          borderColor: clubTokens.dot,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: palette.textMuted }}
                          >
                            {canSeeDetails ? club?.shortLabel : 'PRIVATE HOLD'}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold border border-dashed"
                            style={{
                              borderColor: palette.border,
                              color: palette.textSecondary,
                            }}
                          >
                            Tentative
                          </span>
                        </div>

                        <p
                          className="text-[13.5px] font-semibold mt-1 leading-snug"
                          style={{ color: palette.textPrimary }}
                        >
                          {canSeeDetails ? hold.title : 'Tentative team hold'}
                        </p>

                        <p
                          className="text-[11px] mt-0.5 tabular-nums"
                          style={{ color: palette.textMuted }}
                        >
                          {hold.startDate} – {hold.endDate}
                        </p>

                        {canSeeDetails && hold.note && (
                          <p
                            className="text-[11px] mt-1 leading-snug"
                            style={{ color: palette.textSecondary }}
                          >
                            {hold.note}
                          </p>
                        )}

                        {canManage && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onConvertGhostRange(hold)}
                              title="Confirm & convert into a confirmed meeting"
                              className="ts-btn inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold cursor-pointer"
                              style={{
                                backgroundColor: palette.accentBg,
                                color: palette.accentText,
                              }}
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Convert</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditGhostRange(hold)}
                              className="ts-btn inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium cursor-pointer"
                              style={{
                                backgroundColor: palette.buttonMutedBg,
                                color: palette.textPrimary,
                              }}
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteGhostRange(hold.id)}
                              title="Delete tentative hold"
                              aria-label="Delete tentative hold"
                              className="ts-btn inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium cursor-pointer"
                              style={{
                                backgroundColor: palette.mandatoryBadgeBg,
                                color: palette.mandatoryBadgeText,
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls & Local Time Caption */}
      <div className="mt-4 pt-2">
        {showAdminEntry ? (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="ts-card-interactive group w-full flex items-center justify-between gap-3 p-3 rounded-[14px] border text-left cursor-pointer"
            style={{
              backgroundColor: palette.buttonMutedBg,
              borderColor: palette.border,
            }}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105"
                style={{
                  backgroundColor: palette.surfaceElevated,
                  color: isDark ? palette.textPrimary : palette.brandSubtitle,
                }}
              >
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span
                  className="block text-[13px] font-semibold leading-tight"
                  style={{ color: palette.textPrimary }}
                >
                  {isFullAdmin ? 'Admin Controls' : 'Team Scheduling'}
                </span>
                <span
                  className="block text-[11px] mt-0.5 truncate"
                  style={{ color: palette.textMuted }}
                >
                  {isFullAdmin
                    ? 'Meetings & announcements'
                    : canAnnounce
                      ? 'Meetings & announcements'
                      : 'Schedule for your team'}
                </span>
              </span>
            </span>
            <ChevronRight
              className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
              style={{ color: palette.textMuted }}
            />
          </button>
        ) : (
          <div
            className="w-full flex items-center gap-2.5 p-3 rounded-[14px] border"
            style={{
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            }}
          >
            <Lock className="w-4 h-4 shrink-0" style={{ color: palette.textMuted }} />
            <div className="min-w-0">
              <p
                className="text-[12px] font-semibold leading-tight"
                style={{ color: palette.textSecondary }}
              >
                Read-Only Schedule
              </p>
              <p
                className="text-[10.5px] mt-0.5 truncate"
                style={{ color: palette.textMuted }}
              >
                {ROLE_LABELS[currentUser.role]}
              </p>
            </div>
          </div>
        )}

        <p
          className="text-[11px] mt-3"
          style={{ color: palette.textMuted }}
        >
          All times in campus local time
        </p>
      </div>
    </aside>
  );
};
