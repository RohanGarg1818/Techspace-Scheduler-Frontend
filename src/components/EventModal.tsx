import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  Loader2,
  Megaphone,
  X,
} from 'lucide-react';
import {
  AttendanceType,
  CalendarEvent,
  ClashCheckResult,
  ClubId,
  ClubInfo,
  CurrentUser,
  GhostOverlapItem,
  GhostRange,
  MeetingType,
  ThemeMode,
} from '../types/calendar';
import { CLUB_THEME_TOKENS, ThemePalette } from '../theme/calendarTheme';
import {
  ApiServiceError,
  checkMeetingClash,
  CreateAnnouncementPayload,
  CreateGhostRangePayload,
  CreateMeetingPayload,
} from '../services/calendarService';
import { findGhostRangeOverlaps, isDateInRange } from '../utils/conflictUtils';
import {
  canPublishAnnouncement,
  getAuthorizedClubs,
  isTeamLead,
} from '../utils/permissions';
import {
  formatTimeRange,
  getCurrentLocalTime24,
  getTodayDateKey,
  isFutureDateTime,
  parseTimeToMinutes,
} from '../utils/dateUtils';

export type AdminActionTab = 'meeting' | 'announcement';
export type SchedulingKind = 'confirmed' | 'ghost';

export interface CalendarDragSelection {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
}

interface EventModalProps {
  theme: ThemeMode;
  palette: ThemePalette;
  currentUser: CurrentUser;
  clubs: ClubInfo[];
  existingEvents: CalendarEvent[];
  ghostRanges: GhostRange[];
  defaultDateKey: string;
  initialTab?: AdminActionTab;
  initialSchedulingKind?: SchedulingKind;
  editingEvent?: CalendarEvent | null;
  editingGhostRange?: GhostRange | null;
  convertingGhostRange?: GhostRange | null;
  pickedCalendarRange?: { startDate: string; endDate: string } | null;
  dragSelection?: CalendarDragSelection | null;
  onRequestCalendarRangePick?: () => void;
  onClose: () => void;
  onSubmitMeeting: (
    payload: CreateMeetingPayload,
    editingId?: string,
    convertingGhostId?: string,
    rangeEndDate?: string
  ) => Promise<void>;
  onSubmitGhostRange: (
    payload: CreateGhostRangePayload,
    editingGhostId?: string
  ) => Promise<void>;
  onSubmitAnnouncement: (payload: CreateAnnouncementPayload) => Promise<void>;
  onMarkGhostCoordinated: (holdIds: string[]) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  theme,
  palette,
  currentUser,
  clubs,
  existingEvents,
  ghostRanges,
  defaultDateKey,
  initialTab = 'meeting',
  initialSchedulingKind = 'confirmed',
  editingEvent = null,
  editingGhostRange = null,
  convertingGhostRange = null,
  pickedCalendarRange = null,
  dragSelection = null,
  onRequestCalendarRangePick,
  onClose,
  onSubmitMeeting,
  onSubmitGhostRange,
  onSubmitAnnouncement,
  onMarkGhostCoordinated,
}) => {
  const isDark = theme === 'dark';
  const allowAnnouncement = canPublishAnnouncement(currentUser);
  const authorizedClubIds = getAuthorizedClubs(currentUser);
  const authorizedClubs = clubs.filter((c) => authorizedClubIds.includes(c.id));
  const authorizedMeetingClubs = authorizedClubs.filter(
    (c) => c.category !== 'announcement'
  );
  const authorizedCoreClubs = authorizedClubs.filter(
    (c) => c.category === 'core'
  );
  const authorizedSubClubs = authorizedClubs.filter(
    (c) => c.category === 'sub-club'
  );
  const authorizedAnnouncementClubs =
    currentUser.role === 'team_lead'
      ? authorizedClubs.filter(
          (c) =>
            currentUser.authorizedTeams.includes(c.id) &&
            c.id !== 'announcements'
        )
      : currentUser.role === 'ob' || currentUser.role === 'faculty'
        ? authorizedClubs
        : [];
  const defaultMeetingClub =
    authorizedMeetingClubs[0] ??
    clubs.find((c) => c.category !== 'announcement') ??
    clubs[0];
  const defaultAnnouncementClub =
    (currentUser.role === 'team_lead'
      ? authorizedAnnouncementClubs[0]
      : clubs.find((c) => c.category === 'announcement')) ??
    authorizedAnnouncementClubs[0] ??
    clubs[0];

  const initialMeetingType: MeetingType =
    editingEvent?.meetingType ??
    (convertingGhostRange
      ? convertingGhostRange.clubId === 'core-team'
        ? 'Core Team'
        : 'Sub-Club'
      : authorizedCoreClubs.length > 0 && !isTeamLead(currentUser)
        ? 'Core Team'
        : 'Sub-Club');

  const initialClubsForType =
    initialMeetingType === 'Sub-Club' ? authorizedSubClubs : authorizedCoreClubs;
  const initialMeetingClub =
    clubs.find((c) => c.id === (editingEvent?.clubId ?? convertingGhostRange?.clubId)) ??
    initialClubsForType[0] ??
    defaultMeetingClub;

  const [activeTab, setActiveTab] = useState<AdminActionTab>(
    allowAnnouncement && initialTab === 'announcement' ? 'announcement' : 'meeting'
  );
  const [schedulingKind, setSchedulingKind] = useState<SchedulingKind>(
    editingGhostRange ? 'ghost' : initialSchedulingKind
  );

  // Confirmed meeting form state
  const [title, setTitle] = useState(
    editingEvent?.title ?? convertingGhostRange?.title ?? ''
  );
  const [meetingType, setMeetingType] = useState<MeetingType>(initialMeetingType);
  const [clubId, setClubId] = useState<ClubId>(initialMeetingClub.id);
  const [date, setDate] = useState(
    editingEvent?.date ??
      convertingGhostRange?.startDate ??
      dragSelection?.startDate ??
      defaultDateKey
  );
  const [applyAcrossDraggedDays, setApplyAcrossDraggedDays] = useState<boolean>(
    Boolean(dragSelection && dragSelection.endDate > dragSelection.startDate)
  );
  const [startTime, setStartTime] = useState(
    editingEvent?.startTime ??
      convertingGhostRange?.startTime ??
      dragSelection?.startTime ??
      '13:00'
  );
  const [endTime, setEndTime] = useState(
    editingEvent?.endTime ??
      convertingGhostRange?.endTime ??
      dragSelection?.endTime ??
      '14:00'
  );
  const [location, setLocation] = useState(
    editingEvent?.location ?? initialMeetingClub.roomDefault
  );
  const [meetingLink, setMeetingLink] = useState(editingEvent?.meetingLink ?? '');
  const [attendance, setAttendance] = useState<AttendanceType>(
    editingEvent?.attendance ?? 'Optional'
  );
  const [description, setDescription] = useState(
    editingEvent?.description ?? convertingGhostRange?.note ?? ''
  );

  // Tentative Hold (Ghost Range) form state
  const [ghostTitle, setGhostTitle] = useState(editingGhostRange?.title ?? '');
  const [ghostNote, setGhostNote] = useState(editingGhostRange?.note ?? '');
  const [ghostClubId, setGhostClubId] = useState<ClubId>(
    editingGhostRange?.clubId ?? defaultMeetingClub.id
  );
  const [ghostStartDate, setGhostStartDate] = useState(
    pickedCalendarRange?.startDate ??
      editingGhostRange?.startDate ??
      dragSelection?.startDate ??
      defaultDateKey
  );
  const [ghostEndDate, setGhostEndDate] = useState(
    pickedCalendarRange?.endDate ??
      editingGhostRange?.endDate ??
      dragSelection?.endDate ??
      defaultDateKey
  );
  const [ghostIsDateOnly, setGhostIsDateOnly] = useState<boolean>(
    editingGhostRange?.isDateOnly ?? !dragSelection?.startTime
  );
  const [ghostStartTime, setGhostStartTime] = useState(
    editingGhostRange?.startTime ?? dragSelection?.startTime ?? '10:00'
  );
  const [ghostEndTime, setGhostEndTime] = useState(
    editingGhostRange?.endTime ?? dragSelection?.endTime ?? '12:00'
  );
  const [ghostPrivate, setGhostPrivate] = useState<boolean>(
    editingGhostRange?.isPrivate ?? false
  );

  // Announcement form state (OB / Faculty only)
  const [announcementClubId, setAnnouncementClubId] = useState<ClubId>(
    defaultAnnouncementClub.id
  );
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  const scopedMeetingClubs =
    meetingType === 'Sub-Club' ? authorizedSubClubs : authorizedCoreClubs;

  // Validation, conflict & submission state
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clashResult, setClashResult] = useState<ClashCheckResult | null>(null);
  const [ghostOverlaps, setGhostOverlaps] = useState<GhostOverlapItem[]>([]);
  const [ghostActionTaken, setGhostActionTaken] = useState<
    'none' | 'kept' | 'coordinated'
  >('none');
  const [tentativeConflictWarning, setTentativeConflictWarning] = useState<{
    message: string;
    regularClashes?: any[];
    tentativeClashes?: any[];
  } | null>(null);

  useEffect(() => {
    if (pickedCalendarRange) {
      setSchedulingKind('ghost');
      setGhostStartDate(pickedCalendarRange.startDate);
      setGhostEndDate(pickedCalendarRange.endDate);
    }
  }, [pickedCalendarRange]);

  // Live Ghost Range overlap check when editing Confirmed Meeting date
  useEffect(() => {
    if (activeTab !== 'meeting' || schedulingKind !== 'confirmed' || !date) {
      setGhostOverlaps([]);
      return;
    }
    const overlaps = findGhostRangeOverlaps(
      date,
      ghostRanges.filter((g) => g.id !== convertingGhostRange?.id),
      currentUser
    );
    setGhostOverlaps(overlaps);
    setGhostActionTaken('none');
  }, [activeTab, schedulingKind, date, ghostRanges, convertingGhostRange, currentUser]);

  // Clear stale clash state when date or times change
  useEffect(() => {
    setClashResult(null);
    setTentativeConflictWarning(null);
  }, [date, startTime, endTime, clubId]);

  const handleClubChange = (newClubId: ClubId) => {
    setClubId(newClubId);
    const club = clubs.find((c) => c.id === newClubId);
    if (club && !editingEvent) {
      setLocation(club.roomDefault);
    }
  };

  const handleMeetingTypeChange = (nextType: MeetingType) => {
    setMeetingType(nextType);
    const nextScoped =
      nextType === 'Sub-Club' ? authorizedSubClubs : authorizedCoreClubs;
    if (nextScoped.length > 0 && !nextScoped.some((c) => c.id === clubId)) {
      const nextClub = nextScoped[0];
      setClubId(nextClub.id);
      if (!editingEvent) {
        setLocation(nextClub.roomDefault);
      }
    }
  };

  const todayKey = getTodayDateKey();
  const currentLocalTime = getCurrentLocalTime24();

  const isRescheduling =
    !editingEvent ||
    date !== editingEvent.date ||
    startTime !== editingEvent.startTime;

  const isPastDateTime = Boolean(
    isRescheduling && date && startTime && !isFutureDateTime(date, startTime)
  );

  const minAllowedDate =
    editingEvent && editingEvent.date < todayKey
      ? editingEvent.date
      : todayKey;

  const minAllowedStartTime =
    date === todayKey
      ? editingEvent &&
        editingEvent.date === todayKey &&
        parseTimeToMinutes(editingEvent.startTime) <=
          parseTimeToMinutes(currentLocalTime)
        ? undefined
        : currentLocalTime
      : undefined;

  const validateMeetingInputs = (): string | null => {
    if (!title.trim()) return 'Meeting topic is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Select a valid meeting date.';
    if (!startTime || !endTime) return 'Start time and end time are required.';
    if (parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime)) {
      return 'End time must be after start time.';
    }
    if (isRescheduling && !isFutureDateTime(date, startTime)) {
      return 'Meetings can only be scheduled for a future date and time.';
    }
    if (!authorizedClubIds.includes(clubId)) {
      return 'You are not authorized to schedule meetings for the selected team.';
    }
    if (meetingLink.trim()) {
      try {
        const parsed = new URL(meetingLink.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return 'Meeting link must start with http:// or https://.';
        }
      } catch {
        return 'Enter a valid meeting URL (including https://) or leave it blank.';
      }
    }
    return null;
  };

  const handleConfirmMeetingSubmit = async (confirmOverride = false, force = false) => {
    setFormError(null);
    const validationError = validateMeetingInputs();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Check real time clash via POST /api/v1/meetings/check-clash contract
      if (!confirmOverride && !force) {
        const clash = await checkMeetingClash(
          {
            id: editingEvent?.id,
            date,
            startTime,
            endTime,
            clubId,
          },
          existingEvents,
          currentUser
        );

        if (clash.hasClash) {
          setClashResult(clash);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. If tentative overlap exists and user hasn't acknowledged Keep/Coordinated, pause for decision
      if (!force && ghostOverlaps.length > 0 && ghostActionTaken === 'none') {
        setFormError(
          'Review the potential tentative hold overlap below and choose Keep Schedule, Reschedule, or Mark Coordinated.'
        );
        setIsSubmitting(false);
        return;
      }

      const payload: CreateMeetingPayload = {
        title: title.trim(),
        meetingType,
        clubId,
        date,
        startTime,
        endTime,
        location: location.trim() || defaultMeetingClub.roomDefault,
        meetingLink: meetingLink.trim() || undefined,
        attendance,
        description: description.trim() || undefined,
        confirmOverride,
        force,
      };

      await onSubmitMeeting(
        payload,
        editingEvent?.id,
        convertingGhostRange?.id,
        !editingEvent &&
          dragSelection &&
          dragSelection.endDate > date &&
          applyAcrossDraggedDays
          ? dragSelection.endDate
          : undefined
      );
      onClose();
    } catch (err: any) {
      // Check if backend reported a 409 MEETING_CLASH with conflict details
      const errorData = err?.data;
      const regularClashes = errorData?.regularClashes || errorData?.clashes || [];
      const tentativeClashes = errorData?.tentativeClashes || [];

      if (err?.status === 409 && (err?.code === 'MEETING_CLASH' || err?.message?.includes('overlaps'))) {
        // If there are regular (confirmed) clashes, block completely and do not allow Save Anyway
        if (regularClashes.length > 0) {
          setTentativeConflictWarning(null);
          setClashResult({
            hasClash: true,
            conflicts: regularClashes.map((c: any) => ({
              id: c.id,
              title: c.topic || c.title || 'Meeting',
              date: c.date,
              startTime: c.startTime,
              endTime: c.endTime,
              location: c.location || '',
              clubId: (c.team?.id || 'core-team') as ClubId,
            })),
          });
          setFormError('Cannot save: Conflicts with confirmed meeting(s). Confirmed clashes cannot be overridden.');
        } else if (tentativeClashes.length > 0 || err?.message?.includes('tentative')) {
          // Tentative-only conflicts allow user to Save Anyway with force=true
          setClashResult(null);
          setTentativeConflictWarning({
            message: err.message || 'This meeting overlaps with tentative meeting(s).',
            regularClashes,
            tentativeClashes,
          });
          setFormError(null);
        } else {
          setFormError(err.message);
        }
      } else if (err instanceof ApiServiceError) {
        setFormError(err.message);
      } else {
        setFormError(err?.message || 'Unable to save meeting. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitGhost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!ghostStartDate || !ghostEndDate) {
      setFormError('Start date and end date are required for a tentative hold.');
      return;
    }
    if (ghostEndDate < ghostStartDate) {
      setFormError('End date must be on or after start date.');
      return;
    }
    if (!authorizedClubIds.includes(ghostClubId)) {
      setFormError('You can only create tentative holds for authorized teams.');
      return;
    }
    if (!ghostIsDateOnly) {
      if (!ghostStartTime || !ghostEndTime) {
        setFormError('Specify both start and end times or switch to date-only hold.');
        return;
      }
      if (parseTimeToMinutes(ghostEndTime) <= parseTimeToMinutes(ghostStartTime)) {
        setFormError('End time must be after start time.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmitGhostRange(
        {
          title: ghostTitle.trim() || 'Tentative Hold',
          note: ghostNote.trim() || undefined,
          clubId: ghostClubId,
          startDate: ghostStartDate,
          endDate: ghostEndDate,
          isDateOnly: ghostIsDateOnly,
          startTime: ghostIsDateOnly ? undefined : ghostStartTime,
          endTime: ghostIsDateOnly ? undefined : ghostEndTime,
          isPrivate: ghostPrivate,
        },
        editingGhostRange?.id
      );
      onClose();
    } catch (err) {
      setFormError(
        err instanceof ApiServiceError
          ? err.message
          : 'Unable to save tentative hold.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnnouncementForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!announcementTitle.trim() || !announcementContent.trim()) {
      setFormError('Announcement title and content are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitAnnouncement({
        clubId: announcementClubId,
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
      });
      onClose();
    } catch (err: any) {
      setFormError(
        err?.message ||
        (err instanceof ApiServiceError
          ? err.message
          : 'Unable to publish announcement.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(editingEvent || editingGhostRange);
  const modalHeading = editingEvent
    ? 'Edit Meeting'
    : editingGhostRange
      ? 'Edit Tentative Hold'
      : convertingGhostRange
        ? 'Convert Hold to Meeting'
        : allowAnnouncement
          ? 'Admin Controls'
          : 'Schedule for Team';

  const inputStyle = {
    backgroundColor: palette.surfaceElevated,
    borderColor: palette.border,
    color: palette.textPrimary,
  };

  const ghostConfirmedOverlaps =
    activeTab === 'meeting' && schedulingKind === 'ghost' && ghostStartDate && ghostEndDate
      ? existingEvents.filter((ev) => isDateInRange(ev.date, ghostStartDate, ghostEndDate))
      : [];

  return (
    <div
      className="ts-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{
        backgroundColor: isDark
          ? 'rgba(10, 10, 12, 0.72)'
          : 'rgba(30, 27, 24, 0.36)',
      }}
      onClick={onClose}
    >
      <div
        className="ts-modal-panel w-full max-w-[490px] max-h-[90vh] overflow-y-auto ts-scroll rounded-[20px] border p-4 sm:p-5"
        style={{
          background: palette.surfaceBackground,
          borderColor: palette.border,
          boxShadow: palette.cardShadow,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3
              className="text-[16px] font-bold tracking-tight"
              style={{ color: palette.textPrimary }}
            >
              {modalHeading}
            </h3>
            <p className="text-[12px] mt-0.5" style={{ color: palette.textMuted }}>
              {allowAnnouncement
                ? currentUser.role === 'faculty'
                  ? 'Faculty admin scheduling and announcement actions'
                  : currentUser.role === 'team_lead'
                    ? `Team Lead scheduling & announcements (${authorizedAnnouncementClubs.map((c) => c.name).join(', ')})`
                    : 'Office Bearer scheduling and announcement actions'
                : `Authorized scope: ${authorizedMeetingClubs.map((c) => c.name).join(', ')}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="ts-icon-btn w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
            style={{
              backgroundColor: palette.buttonMutedBg,
              color: palette.textMuted,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* OB-Only Admin Controls Primary Action Switcher (ONLY Create Meeting & Post Announcement) */}
        {allowAnnouncement && !isEditing && !convertingGhostRange && (
          <div
            className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-[12px] border"
            style={{
              backgroundColor: palette.segmentedTrackBg,
              borderColor: palette.border,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('meeting');
                setFormError(null);
              }}
              className="py-2 px-2 sm:px-3 rounded-[9px] text-[11.5px] sm:text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  activeTab === 'meeting' ? palette.accentBg : 'transparent',
                color:
                  activeTab === 'meeting'
                    ? palette.accentText
                    : palette.textMuted,
              }}
            >
              <CalendarRange className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Create Meeting</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('announcement');
                setFormError(null);
              }}
              className="py-2 px-2 sm:px-3 rounded-[9px] text-[11.5px] sm:text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  activeTab === 'announcement' ? palette.accentBg : 'transparent',
                color:
                  activeTab === 'announcement'
                    ? palette.accentText
                    : palette.textMuted,
              }}
            >
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Post Announcement</span>
            </button>
          </div>
        )}

        {/* Confirmed Meeting vs Tentative Hold toggle (inside Create Meeting tab) */}
        {activeTab === 'meeting' && !isEditing && !convertingGhostRange && (
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSchedulingKind('confirmed');
                setFormError(null);
              }}
              className="flex-1 py-1.5 px-3 rounded-[10px] border text-[12px] font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  schedulingKind === 'confirmed'
                    ? palette.buttonMutedBg
                    : 'transparent',
                borderColor:
                  schedulingKind === 'confirmed'
                    ? palette.textMuted
                    : palette.border,
                color:
                  schedulingKind === 'confirmed'
                    ? palette.textPrimary
                    : palette.textMuted,
              }}
            >
              Confirmed Meeting
            </button>
            <button
              type="button"
              onClick={() => {
                setSchedulingKind('ghost');
                setFormError(null);
              }}
              className="flex-1 py-1.5 px-3 rounded-[10px] border border-dashed text-[12px] font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  schedulingKind === 'ghost'
                    ? palette.buttonMutedBg
                    : 'transparent',
                borderColor:
                  schedulingKind === 'ghost'
                    ? palette.textMuted
                    : palette.border,
                color:
                  schedulingKind === 'ghost'
                    ? palette.textPrimary
                    : palette.textMuted,
              }}
            >
              Tentative Hold (Ghost Range)
            </button>
          </div>
        )}

        {/* Error Banner */}
        {formError && (
          <div
            className="mt-3 p-2.5 rounded-[10px] border text-[12px] flex items-start gap-2"
            style={{
              backgroundColor: palette.mandatoryBadgeBg,
              borderColor: palette.border,
              color: palette.mandatoryBadgeText,
            }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* FORM A: POST ANNOUNCEMENT (OB ONLY) */}
        {activeTab === 'announcement' && allowAnnouncement && (
          <form onSubmit={handleSubmitAnnouncementForm} className="mt-4 space-y-3">
            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Announcement Club
              </label>
              <div
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] border text-[13px]"
                style={inputStyle}
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        CLUB_THEME_TOKENS[theme][announcementClubId].dot,
                    }}
                  />
                  <span>
                    {clubs.find((c) => c.id === announcementClubId)?.name ??
                      'Announcements'}
                  </span>
                </span>
                <select
                  aria-label="Announcement club"
                  value={announcementClubId}
                  onChange={(e) => setAnnouncementClubId(e.target.value as ClubId)}
                  disabled={authorizedAnnouncementClubs.length <= 1}
                  className="bg-transparent text-[11.5px] font-semibold focus:outline-none cursor-pointer disabled:cursor-default"
                  style={{
                    color: CLUB_THEME_TOKENS[theme][announcementClubId].kickerText,
                  }}
                >
                  {(authorizedAnnouncementClubs.length > 0
                    ? authorizedAnnouncementClubs
                    : [defaultAnnouncementClub]
                  ).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g., Lab 204 Maintenance Window"
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Announcement Content *
              </label>
              <textarea
                rows={4}
                required
                value={announcementContent}
                onChange={(e) => setAnnouncementContent(e.target.value)}
                placeholder="Share important club updates or room notices..."
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="ts-btn px-4 py-2 rounded-[10px] text-[12.5px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: palette.buttonMutedBg,
                  color: palette.textSecondary,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ts-btn px-4 py-2 rounded-[10px] text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{
                  backgroundColor: palette.accentBg,
                  color: palette.accentText,
                }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Publish Announcement</span>
              </button>
            </div>
          </form>
        )}

        {/* FORM B: CONFIRMED MEETING */}
        {activeTab === 'meeting' && schedulingKind === 'confirmed' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleConfirmMeetingSubmit(false);
            }}
            className="mt-4 space-y-3"
          >
            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Meeting Topic *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Frontend Architecture Sync"
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  Meeting Type
                </label>
                <select
                  value={meetingType}
                  onChange={(e) =>
                    handleMeetingTypeChange(e.target.value as MeetingType)
                  }
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                  style={inputStyle}
                >
                  {!isTeamLead(currentUser) && authorizedCoreClubs.length > 0 && (
                    <>
                      <option value="OB">OB</option>
                      <option value="Core Team">Core Team</option>
                    </>
                  )}
                  {authorizedSubClubs.length > 0 && (
                    <option value="Sub-Club">Sub-Club</option>
                  )}
                </select>
              </div>

              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  {meetingType === 'Sub-Club' ? 'Sub-Club' : 'Core Club'}
                </label>
                <select
                  value={clubId}
                  onChange={(e) => handleClubChange(e.target.value as ClubId)}
                  disabled={scopedMeetingClubs.length <= 1}
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none disabled:opacity-80"
                  style={inputStyle}
                >
                  {scopedMeetingClubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  Date *
                </label>
                <input
                  id="ts-meeting-date-input"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setFormError(null);
                  }}
                  min={minAllowedDate}
                  className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  Start *
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setFormError(null);
                  }}
                  min={minAllowedStartTime}
                  className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  End *
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {isPastDateTime && (
              <p
                className="text-[11.5px] font-medium mt-1.5 flex items-center gap-1.5"
                style={{ color: palette.mandatoryBadgeText }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Meetings can only be scheduled for a future date and time.</span>
              </p>
            )}

            {!editingEvent &&
              dragSelection &&
              dragSelection.endDate > date && (
                <div
                  className="px-3 py-2 rounded-[10px] border text-[12px] flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.border,
                    color: palette.textSecondary,
                  }}
                >
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyAcrossDraggedDays}
                      onChange={(e) => setApplyAcrossDraggedDays(e.target.checked)}
                    />
                    <span>
                      Schedule across dragged days ({date} – {dragSelection.endDate})
                    </span>
                  </label>
                </div>
              )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  Location / Room
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Design Studio"
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  Attendance
                </label>
                <select
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value as AttendanceType)}
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                  style={inputStyle}
                >
                  <option value="Mandatory">Mandatory</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Meeting Link (optional)
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.example.com/techspace"
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agenda or preparation notes..."
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>

            {/* WARNING A: Confirmed Meeting Clash */}
            {clashResult?.hasClash && (
              <div
                className="p-3 rounded-[12px] border space-y-2"
                style={{
                  backgroundColor: palette.mandatoryBadgeBg,
                  borderColor: palette.border,
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: palette.mandatoryBadgeText }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[12.5px] font-bold"
                      style={{ color: palette.mandatoryBadgeText }}
                    >
                      Confirmed Meeting Clash (MEETING_CLASH)
                    </p>
                    <p
                      className="text-[11.5px] mt-0.5"
                      style={{ color: palette.textSecondary }}
                    >
                      This time interval overlaps with existing scheduled meeting(s):
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {clashResult.conflicts.map((c) => (
                        <li
                          key={c.id}
                          className="text-[11.5px] px-2 py-1 rounded-[7px] border"
                          style={{
                            backgroundColor: palette.surfaceElevated,
                            borderColor: palette.border,
                            color: palette.textPrimary,
                          }}
                        >
                          <span className="font-semibold">{c.title}</span>
                          {' · '}
                          <span className="tabular-nums">
                            {formatTimeRange(c.startTime, c.endTime)}
                          </span>
                          {!c.isMaskedPrivate && ` · ${c.location}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setClashResult(null)}
                    className="px-3 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: palette.buttonMutedBg,
                      color: palette.textPrimary,
                    }}
                  >
                    Adjust Time
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleConfirmMeetingSubmit(true)}
                    className="px-3 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: palette.accentBg,
                      color: palette.accentText,
                    }}
                  >
                    Confirm Despite Clash
                  </button>
                </div>
              </div>
            )}

            {/* WARNING A2: Backend Tentative Meeting Conflict Warning Dialog */}
            {tentativeConflictWarning && (
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="tentative-conflict-title"
                className="p-3.5 rounded-[12px] border space-y-2.5"
                style={{
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.accentBg,
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: palette.accentBg }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      id="tentative-conflict-title"
                      className="text-[12.5px] font-bold"
                      style={{ color: palette.textPrimary }}
                    >
                      Tentative Meeting Conflict
                    </p>
                    <p
                      className="text-[11.5px] mt-0.5"
                      style={{ color: palette.textSecondary }}
                    >
                      {tentativeConflictWarning.message}
                    </p>
                    {tentativeConflictWarning.tentativeClashes && tentativeConflictWarning.tentativeClashes.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {tentativeConflictWarning.tentativeClashes.map((t: any) => (
                          <li
                            key={t.id}
                            className="text-[11.5px] px-2 py-1 rounded-[7px] border"
                            style={{
                              backgroundColor: palette.surfaceSubtle,
                              borderColor: palette.border,
                              color: palette.textPrimary,
                            }}
                          >
                            <span className="font-semibold">{t.topic || 'Tentative Meeting'}</span>
                            {' · '}
                            <span className="tabular-nums">
                              {t.startDate}{t.endDate && t.endDate !== t.startDate ? ` to ${t.endDate}` : ''}
                              {t.startTime && t.endTime ? ` (${formatTimeRange(t.startTime, t.endTime)})` : ' (All-day)'}
                            </span>
                            {t.team?.name && ` · ${t.team.name}`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1 border-t" style={{ borderColor: palette.border }}>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setTentativeConflictWarning(null);
                    }}
                    className="px-3 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: palette.buttonMutedBg,
                      color: palette.textPrimary,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleConfirmMeetingSubmit(false, true)}
                    className="px-3 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                    style={{
                      backgroundColor: palette.accentBg,
                      color: palette.accentText,
                    }}
                  >
                    Save Anyway
                  </button>
                </div>
              </div>
            )}

            {/* WARNING B: Ghost Range Potential Scheduling Overlap */}
            {ghostOverlaps.length > 0 && (
              <div
                className="p-3 rounded-[12px] border border-dashed space-y-2"
                style={{
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.textMuted,
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: palette.textPrimary }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[12.5px] font-bold"
                      style={{ color: palette.textPrimary }}
                    >
                      Potential scheduling overlap
                    </p>
                    <p
                      className="text-[11.5px] mt-0.5"
                      style={{ color: palette.textSecondary }}
                    >
                      Date intersects tentative hold(s).{' '}
                      {ghostOverlaps.some((g) => g.isDateOnly)
                        ? 'Date-only tentative holds do not indicate an hourly clash.'
                        : 'Check with the hold creator before finalizing.'}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {ghostOverlaps.map((g) => (
                        <li
                          key={g.id}
                          className="text-[11.5px] px-2 py-1 rounded-[7px] border border-dashed"
                          style={{
                            backgroundColor: palette.surfaceSubtle,
                            borderColor: palette.border,
                            color: palette.textPrimary,
                          }}
                        >
                          {g.isMaskedPrivate
                            ? 'Private team tentative hold (details restricted)'
                            : `${g.title} (${g.startDate} – ${g.endDate})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {ghostActionTaken === 'none' ? (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setGhostActionTaken('kept');
                        setFormError(null);
                      }}
                      className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: palette.buttonMutedBg,
                        color: palette.textPrimary,
                      }}
                    >
                      Keep Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('ts-meeting-date-input')?.focus();
                      }}
                      className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: palette.buttonMutedBg,
                        color: palette.textSecondary,
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGhostActionTaken('coordinated');
                        setFormError(null);
                        onMarkGhostCoordinated(ghostOverlaps.map((g) => g.id));
                      }}
                      className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: palette.accentBg,
                        color: palette.accentText,
                      }}
                    >
                      Mark Coordinated (Demo)
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-[11px] flex items-center gap-1.5 font-medium"
                    style={{ color: palette.textSecondary }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {ghostActionTaken === 'coordinated'
                        ? 'Marked coordinated (demo-only local note)'
                        : 'Keeping selected date despite tentative hold'}
                    </span>
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="ts-btn px-4 py-2 rounded-[10px] text-[12.5px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: palette.buttonMutedBg,
                  color: palette.textSecondary,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ts-btn px-4 py-2 rounded-[10px] text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{
                  backgroundColor: palette.accentBg,
                  color: palette.accentText,
                }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {editingEvent
                    ? 'Save Changes'
                    : convertingGhostRange
                      ? 'Confirm & Convert'
                      : 'Create Meeting'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* FORM C: TENTATIVE HOLD (GHOST RANGE) */}
        {activeTab === 'meeting' && schedulingKind === 'ghost' && (
          <form onSubmit={handleSubmitGhost} className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11.5px]" style={{ color: palette.textMuted }}>
                Creates a dashed tentative hold band without booking a confirmed meeting.
              </p>
              {onRequestCalendarRangePick && !editingGhostRange && (
                <button
                  type="button"
                  onClick={onRequestCalendarRangePick}
                  className="ts-btn px-2.5 py-1 rounded-[8px] border border-dashed text-[11px] font-semibold shrink-0 cursor-pointer"
                  style={{
                    backgroundColor: palette.buttonMutedBg,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                >
                  Pick on Calendar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={ghostStartDate}
                  onChange={(e) => setGhostStartDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className="block text-[11.5px] font-semibold mb-1"
                  style={{ color: palette.textSecondary }}
                >
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  value={ghostEndDate}
                  onChange={(e) => setGhostEndDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Authorized Team
              </label>
              <select
                value={ghostClubId}
                onChange={(e) => setGhostClubId(e.target.value as ClubId)}
                disabled={authorizedMeetingClubs.length <= 1}
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none disabled:opacity-80"
                style={inputStyle}
              >
                {authorizedMeetingClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Title (optional)
              </label>
              <input
                type="text"
                value={ghostTitle}
                onChange={(e) => setGhostTitle(e.target.value)}
                placeholder="e.g., Hackathon Tentatively Reserved"
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                className="block text-[11.5px] font-semibold mb-1"
                style={{ color: palette.textSecondary }}
              >
                Note (optional)
              </label>
              <textarea
                rows={2}
                value={ghostNote}
                onChange={(e) => setGhostNote(e.target.value)}
                placeholder="Hold context or pending approvals..."
                className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label
                className="inline-flex items-center gap-2 text-[12px] cursor-pointer"
                style={{ color: palette.textSecondary }}
              >
                <input
                  type="checkbox"
                  checked={ghostIsDateOnly}
                  onChange={(e) => setGhostIsDateOnly(e.target.checked)}
                />
                <span>Date-only tentative hold</span>
              </label>
              <label
                className="inline-flex items-center gap-2 text-[12px] cursor-pointer"
                style={{ color: palette.textSecondary }}
              >
                <input
                  type="checkbox"
                  checked={ghostPrivate}
                  onChange={(e) => setGhostPrivate(e.target.checked)}
                />
                <span>Private team hold</span>
              </label>
            </div>

            {!ghostIsDateOnly && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-[11.5px] font-semibold mb-1"
                    style={{ color: palette.textSecondary }}
                  >
                    Optional Start Time
                  </label>
                  <input
                    type="time"
                    value={ghostStartTime}
                    onChange={(e) => setGhostStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label
                    className="block text-[11.5px] font-semibold mb-1"
                    style={{ color: palette.textSecondary }}
                  >
                    Optional End Time
                  </label>
                  <input
                    type="time"
                    value={ghostEndTime}
                    onChange={(e) => setGhostEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-[10px] border text-[12px] tabular-nums focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {ghostConfirmedOverlaps.length > 0 && (
              <div
                className="p-2.5 rounded-[10px] border border-dashed text-[11.5px] flex items-start gap-2"
                style={{
                  backgroundColor: palette.surfaceElevated,
                  borderColor: palette.border,
                  color: palette.textSecondary,
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: palette.textPrimary }} />
                <span>
                  Note: {ghostConfirmedOverlaps.length} confirmed{' '}
                  {ghostConfirmedOverlaps.length === 1 ? 'meeting exists' : 'meetings exist'}{' '}
                  in this date range. Tentative holds do not block confirmed meetings.
                </span>
              </div>
            )}

            <p className="text-[11px]" style={{ color: palette.textMuted }}>
              Demo mode: Ghost Ranges are saved locally and never sent to /api/v1/meetings.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="ts-btn px-4 py-2 rounded-[10px] text-[12.5px] font-semibold cursor-pointer"
                style={{
                  backgroundColor: palette.buttonMutedBg,
                  color: palette.textSecondary,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="ts-btn px-4 py-2 rounded-[10px] text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{
                  backgroundColor: palette.accentBg,
                  color: palette.accentText,
                }}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {editingGhostRange ? 'Save Tentative Hold' : 'Save Hold'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
