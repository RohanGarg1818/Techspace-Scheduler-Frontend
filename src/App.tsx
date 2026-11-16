import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  Announcement,
  AppNotification,
  CalendarEvent,
  CalendarViewMode,
  ClubId,
  CurrentUser,
  GhostRange,
  NavSection,
  ThemeMode,
  UserRole,
} from "./types/calendar";
import {
  CLUBS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_EVENTS,
  INITIAL_GHOST_RANGES,
} from "./data/mockEvents";
import { THEME_TOKENS } from "./theme/calendarTheme";
import {
  addDays,
  addMonths,
  formatFullDateWithYear,
  formatMonthYearLabel,
  formatWeekRangeLabel,
  getTodayDateKey,
  parseDateKey,
  parseTimeToMinutes,
} from "./utils/dateUtils";
import { isDateInRange } from "./utils/conflictUtils";
import {
  canAccessAdminControls,
  canCancelMeeting,
  canEditMeeting,
  canManageGhostRange,
  canManageMom,
  canViewPrivateDetails,
  DEMO_USERS,
} from "./utils/permissions";
import {
  addDeduplicatedNotification,
  cancelMeeting,
  CreateAnnouncementPayload,
  createGhostRangeDemo,
  CreateGhostRangePayload,
  createMeeting,
  CreateMeetingPayload,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchMeetings,
  isBackendConfigured,
  publishAnnouncement,
  publishAnnouncementDemo,
  removeGhostRangeDemo,
  updateAnnouncement,
  updateGhostRangeDemo,
  updateMeeting,
} from "./services/calendarService";
import { NavRail } from "./components/NavRail";
import { LeftPanel } from "./components/LeftPanel";
import { MonthView } from "./components/MonthView";
import { WeekView } from "./components/WeekView";
import { DayView } from "./components/DayView";
import { RightPanel } from "./components/RightPanel";
import {
  CalendarDragSelection,
  EventModal,
  SchedulingKind,
} from "./components/EventModal";
import { AllMeetsView } from "./components/AllMeetsView";
import Dashboard from "./pages/Dashboard";
import { LoginPage } from "./components/LoginPage";
import { LumaSpin } from "./components/ui/luma-spin";
import { SpringSegmentedControl } from "./components/ui/SpringSegmentedControl";
import { getCurrentUser, logout, type AuthUser } from "./services/authService";
import { getAuthToken } from "./services/apiClient";
import {
  users,
  meetings as initialDashboardMeetings,
} from "./data/dashboardData";
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function BackgroundDecor({ theme }: { theme: ThemeMode }) {
  const isDark = theme === "dark";

  const primaryClass = isDark
    ? "text-[#343438] opacity-40"
    : "text-[#233252]/75";
  const secondaryStrokeColor = isDark ? "#29292D" : "currentColor";
  const starClass = isDark ? "text-[#343438] opacity-35" : "text-[#233252]/80";
  const sparkleClass = isDark
    ? "text-[#29292D] opacity-35"
    : "text-[#EAB348]/85";

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Top-right ringed planet & stars in exposed gap */}
      <svg
        className={`absolute top-[64px] right-[18%] w-12 h-12 ${primaryClass}`}
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle
          cx="32"
          cy="32"
          r="11"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="25"
          ry="7.5"
          transform="rotate(-24 32 32)"
          stroke={secondaryStrokeColor}
          strokeWidth="1.4"
        />
      </svg>
      <svg
        className={`absolute top-[68px] right-[37%] w-4 h-4 ${starClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
      </svg>
      <svg
        className={`absolute top-[74px] right-[11%] w-3.5 h-3.5 ${sparkleClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 3L13.8 10.2L21 12L13.8 13.8L12 21L10.2 13.8L3 12L10.2 10.2L12 3Z" />
      </svg>

      {/* Bottom-left atom & sparkles */}
      <svg
        className={`absolute bottom-[8px] left-[16%] w-10 h-10 ${primaryClass}`}
        viewBox="0 0 48 48"
        fill="none"
      >
        <circle cx="24" cy="24" r="2.3" fill="currentColor" />
        <ellipse
          cx="24"
          cy="24"
          rx="16"
          ry="6.2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <ellipse
          cx="24"
          cy="24"
          rx="16"
          ry="6.2"
          transform="rotate(60 24 24)"
          stroke={secondaryStrokeColor}
          strokeWidth="1.4"
        />
        <ellipse
          cx="24"
          cy="24"
          rx="16"
          ry="6.2"
          transform="rotate(-60 24 24)"
          stroke={secondaryStrokeColor}
          strokeWidth="1.4"
        />
      </svg>
      <svg
        className={`absolute bottom-[14px] left-[12%] w-3 h-3 ${sparkleClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 3L13.8 10.2L21 12L13.8 13.8L12 21L10.2 13.8L3 12L10.2 10.2L12 3Z" />
      </svg>
      <svg
        className={`absolute bottom-[14px] left-[23%] w-3.5 h-3.5 ${starClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
      </svg>

      {/* Bottom-right ringed planet & stars */}
      <svg
        className={`absolute bottom-[6px] right-[29%] w-11 h-11 ${primaryClass}`}
        viewBox="0 0 64 64"
        fill="none"
      >
        <circle
          cx="32"
          cy="32"
          r="10.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <ellipse
          cx="32"
          cy="32"
          rx="24"
          ry="7"
          transform="rotate(-20 32 32)"
          stroke={secondaryStrokeColor}
          strokeWidth="1.4"
        />
      </svg>
      <svg
        className={`absolute bottom-[14px] right-[22%] w-3.5 h-3.5 ${starClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" />
      </svg>
      <svg
        className={`absolute bottom-[12px] right-[36%] w-3 h-3 ${sparkleClass}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 3L13.8 10.2L21 12L13.8 13.8L12 21L10.2 13.8L3 12L10.2 10.2L12 3Z" />
      </svg>
    </div>
  );
}

export function App() {
  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const initialDate = useMemo(() => parseDateKey(todayDateKey), [todayDateKey]);

  const [theme, setTheme] = useState<ThemeMode>(() =>
    localStorage.getItem("techspace-theme") === "dark" ? "dark" : "light",
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        if (!getAuthToken()) return;
        const user = await getCurrentUser();
        if (active) setAuthUser(user);
      } catch (error) {
        console.error("Session verification failed:", error);
        if (active) logout();
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    void restoreSession();

    const handleExpiredSession = () => setAuthUser(null);
    window.addEventListener("techspace:session-expired", handleExpiredSession);
    return () => {
      active = false;
      window.removeEventListener(
        "techspace:session-expired",
        handleExpiredSession,
      );
    };
  }, []);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [activeNav, setActiveNav] = useState<NavSection>(() => {
    const savedPage = sessionStorage.getItem("techspace-active-page");

    return savedPage === "dashboard" || savedPage === "calendar"
      ? savedPage
      : "dashboard";
  });
  useEffect(() => {
    sessionStorage.setItem("techspace-active-page", activeNav);
  }, [activeNav]);

  // Map backend identity to the existing Calendar UI's user shape.
  // Team UUIDs must be mapped to actual club IDs when teams API is integrated.
  const currentUser: CurrentUser = useMemo(() => {
    if (!authUser) {
      return { id: "", name: "", role: "member", authorizedTeams: [] };
    }
    const teamIds = authUser.teams
      .filter(
        (team) =>
          authUser.role !== "team_lead" ||
          team.position === "lead" ||
          team.position === "colead",
      )
      .map((team) => {
        const match = CLUBS.find(
          (club) => club.name.toLowerCase() === team.teamName.toLowerCase(),
        );
        return match?.id;
      })
      .filter((id): id is ClubId => Boolean(id));

    return {
      id: authUser.id,
      name: authUser.name,
      role: authUser.role,
      authorizedTeams:
        authUser.role === "ob" || authUser.role === "faculty"
          ? CLUBS.map((club) => club.id)
          : teamIds,
    };
  }, [authUser]);
  const [dashboardMeetings, setDashboardMeetings] = useState(
    initialDashboardMeetings,
  );

  const dashboardRole =
    currentUser.role === "ob"
      ? "Office Bearer"
      : currentUser.role === "faculty"
        ? "Faculty"
        : currentUser.role === "team_lead"
          ? "Lead"
          : "Member";

  const dashboardUser = {
    ...users[dashboardRole],
    name: currentUser.name,
  };

  const [events, setEvents] = useState<CalendarEvent[]>(INITIAL_EVENTS);
  const [ghostRanges, setGhostRanges] =
    useState<GhostRange[]>(INITIAL_GHOST_RANGES);
  const [announcements, setAnnouncements] = useState<Announcement[]>(
    isBackendConfigured ? [] : INITIAL_ANNOUNCEMENTS,
  );
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<
    string[]
  >([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [selectedClubFilters, setSelectedClubFilters] = useState<ClubId[]>([]);

  // Conditional meetings panel starts CLOSED with no selected date
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isMeetingsPanelOpen, setIsMeetingsPanelOpen] =
    useState<boolean>(false);

  const [weekAnchorDateKey, setWeekAnchorDateKey] =
    useState<string>(todayDateKey);
  const [mainYear, setMainYear] = useState<number>(initialDate.getFullYear());
  const [mainMonthIndex, setMainMonthIndex] = useState<number>(
    initialDate.getMonth(),
  );
  const [miniYear, setMiniYear] = useState<number>(initialDate.getFullYear());
  const [miniMonthIndex, setMiniMonthIndex] = useState<number>(
    initialDate.getMonth(),
  );

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [modalSchedulingKind, setModalSchedulingKind] =
    useState<SchedulingKind>("confirmed");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editingGhostRange, setEditingGhostRange] = useState<GhostRange | null>(
    null,
  );
  const [convertingGhostRange, setConvertingGhostRange] =
    useState<GhostRange | null>(null);
  const [isPickingGhostRange, setIsPickingGhostRange] =
    useState<boolean>(false);
  const [rangePickStart, setRangePickStart] = useState<string | null>(null);
  const [pickedCalendarRange, setPickedCalendarRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [dragSelection, setDragSelection] =
    useState<CalendarDragSelection | null>(null);

  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);

  // View mode options for the spring segmented control
  const VIEW_MODE_OPTIONS = useMemo(
    () => [
      { value: "day" as CalendarViewMode, label: "Day" },
      { value: "week" as CalendarViewMode, label: "Week" },
      { value: "month" as CalendarViewMode, label: "Month" },
    ],
    [],
  );

  const handleViewModeChange = useCallback(
    (mode: CalendarViewMode) => {
      setViewMode(mode);
      if (mode === "day" || mode === "week") {
        setWeekAnchorDateKey(todayDateKey);
        setSelectedDateKey(null);
      } else if (mode === "month") {
        const today = parseDateKey(todayDateKey);
        setMainYear(today.getFullYear());
        setMainMonthIndex(today.getMonth());
        setMiniYear(today.getFullYear());
        setMiniMonthIndex(today.getMonth());
      }
    },
    [todayDateKey],
  );

  // Sync `.dark` class on <html> for Tailwind v4 `@custom-variant dark`
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("techspace-theme", theme);
  }, [theme]);

  // Load meetings and announcements when backend is configured
  useEffect(() => {
    if (!isBackendConfigured || !authUser) return;

    let isMounted = true;
    // Calculate date window for current view (approx +/- 2 months from main view)
    const startDate = formatDateKey(new Date(mainYear, mainMonthIndex, 1));
    const endDate = formatDateKey(new Date(mainYear, mainMonthIndex + 1, 0));

    fetchMeetings(startDate, endDate)
      .then((backendMeetings) => {
        if (isMounted) {
          setEvents(backendMeetings);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch meetings from backend:", err);
      });

    fetchAnnouncements()
      .then((backendAnnouncements) => {
        if (isMounted) {
          setAnnouncements(backendAnnouncements);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch announcements from backend:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [mainYear, mainMonthIndex, authUser]);

  // Auto-dismiss transient success toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const palette = THEME_TOKENS[theme];
  const meetingClubs = useMemo(
    () => CLUBS.filter((c) => c.category !== "announcement"),
    [],
  );

  const isAllClubsSelected =
    selectedClubFilters.length === 0 ||
    selectedClubFilters.length === meetingClubs.length;

  const filteredEvents = useMemo(() => {
    if (isAllClubsSelected) return events;
    return events.filter((ev) => selectedClubFilters.includes(ev.clubId));
  }, [events, isAllClubsSelected, selectedClubFilters]);

  const filteredGhostRanges = useMemo(() => {
    if (isAllClubsSelected) return ghostRanges;
    return ghostRanges.filter((g) => selectedClubFilters.includes(g.clubId));
  }, [ghostRanges, isAllClubsSelected, selectedClubFilters]);

  const activeLookupDate = selectedDateKey ?? todayDateKey;

  const selectedDayEvents = useMemo(() => { 
    return filteredEvents
      .filter((ev) => ev.date === activeLookupDate)
      .sort(
        (a, b) =>
          parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
      );
  }, [filteredEvents, activeLookupDate]);

  const selectedDayGhostRanges = useMemo(() => {
    return filteredGhostRanges.filter((g) =>
      isDateInRange(activeLookupDate, g.startDate, g.endDate),
    );
  }, [filteredGhostRanges, activeLookupDate]);

  const todayEvents = useMemo(() => {
    return events
      .filter((ev) => ev.date === todayDateKey)
      .sort(
        (a, b) =>
          parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime),
      );
  }, [events, todayDateKey]);

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((ev) => ev.date > activeLookupDate)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (
          parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime)
        );
      });
  }, [filteredEvents, activeLookupDate]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return filteredEvents.find((ev) => ev.id === selectedEventId) ?? null;
  }, [filteredEvents, selectedEventId]);

  // Filter notifications so unauthorized users never see restricted team details
  const authorizedNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (!n.targetClubId) return true;
      return canViewPrivateDetails(currentUser, n.targetClubId, false);
    });
  }, [notifications, currentUser]);

  // Clicking a date in the MAIN calendar redirects directly to the Day (date) view
  // (or completes tentative date-range picking when activated from the Ghost Range form)
  const handleSelectMainDate = (dateKey: string) => {
    if (isPickingGhostRange) {
      if (!rangePickStart) {
        setRangePickStart(dateKey);
        return;
      }
      const startDate = dateKey < rangePickStart ? dateKey : rangePickStart;
      const endDate = dateKey < rangePickStart ? rangePickStart : dateKey;
      setPickedCalendarRange({ startDate, endDate });
      setIsPickingGhostRange(false);
      setRangePickStart(null);
      setModalSchedulingKind("ghost");
      setIsAdminModalOpen(true);
      return;
    }

    const parsed = parseDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setWeekAnchorDateKey(dateKey);
    setMainYear(parsed.getFullYear());
    setMainMonthIndex(parsed.getMonth());
    setMiniYear(parsed.getFullYear());
    setMiniMonthIndex(parsed.getMonth());
    setSelectedEventId(null);
    setViewMode("day");
    setIsMeetingsPanelOpen(false);
  };

  // Clicking a date in the MINI-calendar redirects to the Day (date) view as well
  const handleSelectMiniDate = (dateKey: string) => {
    const parsed = parseDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setWeekAnchorDateKey(dateKey);
    setMainYear(parsed.getFullYear());
    setMainMonthIndex(parsed.getMonth());
    setMiniYear(parsed.getFullYear());
    setMiniMonthIndex(parsed.getMonth());
    setSelectedEventId(null);
    setViewMode("day");
    setIsMeetingsPanelOpen(false);
  };

  const handleCloseMeetingsPanel = () => {
    setIsMeetingsPanelOpen(false);
    setSelectedDateKey(null);
    setSelectedEventId(null);
  };

  const handleSelectEvent = (ev: CalendarEvent | null) => {
    if (!ev) {
      setSelectedEventId(null);
      return;
    }
    const parsed = parseDateKey(ev.date);
    setSelectedDateKey(ev.date);
    setWeekAnchorDateKey(ev.date);
    setMainYear(parsed.getFullYear());
    setMainMonthIndex(parsed.getMonth());
    setMiniYear(parsed.getFullYear());
    setMiniMonthIndex(parsed.getMonth());
    setSelectedEventId(ev.id);
    setIsMeetingsPanelOpen(true);
  };

  const handleMainPrev = () => {
    if (viewMode === "month") {
      const next = addMonths(mainYear, mainMonthIndex, -1);
      setMainYear(next.year);
      setMainMonthIndex(next.monthIndex);
      setMiniYear(next.year);
      setMiniMonthIndex(next.monthIndex);
    } else {
      const step = viewMode === "day" ? -1 : -7;
      const prevAnchor = addDays(weekAnchorDateKey, step);
      const parsed = parseDateKey(prevAnchor);
      setWeekAnchorDateKey(prevAnchor);
      setMainYear(parsed.getFullYear());
      setMainMonthIndex(parsed.getMonth());
      setMiniYear(parsed.getFullYear());
      setMiniMonthIndex(parsed.getMonth());
      if (isMeetingsPanelOpen) {
        setSelectedDateKey(prevAnchor);
      }
      setSelectedEventId(null);
    }
  };

  const handleMainNext = () => {
    if (viewMode === "month") {
      const next = addMonths(mainYear, mainMonthIndex, 1);
      setMainYear(next.year);
      setMainMonthIndex(next.monthIndex);
      setMiniYear(next.year);
      setMiniMonthIndex(next.monthIndex);
    } else {
      const step = viewMode === "day" ? 1 : 7;
      const nextAnchor = addDays(weekAnchorDateKey, step);
      const parsed = parseDateKey(nextAnchor);
      setWeekAnchorDateKey(nextAnchor);
      setMainYear(parsed.getFullYear());
      setMainMonthIndex(parsed.getMonth());
      setMiniYear(parsed.getFullYear());
      setMiniMonthIndex(parsed.getMonth());
      if (isMeetingsPanelOpen) {
        setSelectedDateKey(nextAnchor);
      }
      setSelectedEventId(null);
    }
  };

  const handleToday = () => {
    const parsed = parseDateKey(todayDateKey);
    setWeekAnchorDateKey(todayDateKey);
    setMainYear(parsed.getFullYear());
    setMainMonthIndex(parsed.getMonth());
    setMiniYear(parsed.getFullYear());
    setMiniMonthIndex(parsed.getMonth());
    setSelectedEventId(null);
    if (isMeetingsPanelOpen) {
      setSelectedDateKey(todayDateKey);
    }
  };

  const handlePrevMiniMonth = () => {
    const next = addMonths(miniYear, miniMonthIndex, -1);
    setMiniYear(next.year);
    setMiniMonthIndex(next.monthIndex);
  };

  const handleNextMiniMonth = () => {
    const next = addMonths(miniYear, miniMonthIndex, 1);
    setMiniYear(next.year);
    setMiniMonthIndex(next.monthIndex);
  };

  const handleSelectClubFilter = (clubId: ClubId | "all") => {
    if (clubId === "all") {
      setSelectedClubFilters([]);
    } else {
      if (isAllClubsSelected) {
        setSelectedClubFilters([clubId]);
        if (selectedEvent && selectedEvent.clubId !== clubId) {
          setSelectedEventId(null);
        }
      } else {
        if (selectedClubFilters.includes(clubId)) {
          const next = selectedClubFilters.filter((id) => id !== clubId);
          setSelectedClubFilters(next);
          if (selectedEvent && selectedEvent.clubId === clubId) {
            setSelectedEventId(null);
          }
        } else {
          const next = [...selectedClubFilters, clubId];
          setSelectedClubFilters(
            next.length === meetingClubs.length ? [] : next,
          );
        }
      }
    }
  };

  const openFreshAdminModal = () => {
    if (!canAccessAdminControls(currentUser)) return;
    setEditingEvent(null);
    setEditingGhostRange(null);
    setConvertingGhostRange(null);
    setPickedCalendarRange(null);
    setDragSelection(null);
    setModalSchedulingKind("confirmed");
    setIsAdminModalOpen(true);
  };

  const handleSubmitMeeting = async (
    payload: CreateMeetingPayload,
    editingId?: string,
    convertingGhostId?: string,
    rangeEndDate?: string,
  ) => {
    if (editingId) {
      const updated = await updateMeeting(
        { ...payload, id: editingId },
        events,
        currentUser,
      );
      setEvents((prev) =>
        prev.map((ev) => (ev.id === editingId ? updated : ev)),
      );
      handleSelectEvent(updated);
      setToastMessage(`Meeting "${updated.title}" updated.`);
      setNotifications((prev) =>
        addDeduplicatedNotification(prev, {
          dedupeKey: `meeting-updated-${updated.id}-${updated.date}-${updated.startTime}`,
          kind: "success",
          title: "Meeting Updated",
          message: `${updated.title} on ${updated.date}`,
          targetDateKey: updated.date,
          targetClubId: updated.clubId,
          isDemoOnly: true,
        }),
      );
      return;
    }

    if (rangeEndDate && rangeEndDate > payload.date) {
      const createdList: CalendarEvent[] = [];
      let workingEvents = [...events];
      let cursor = payload.date;

      while (cursor <= rangeEndDate) {
        const created = await createMeeting(
          { ...payload, date: cursor, confirmOverride: true },
          workingEvents,
          currentUser,
        );
        createdList.push(created);
        workingEvents = [...workingEvents, created];
        cursor = addDays(cursor, 1);
      }

      setEvents((prev) => [...prev, ...createdList]);

      if (convertingGhostId) {
        await removeGhostRangeDemo(convertingGhostId, ghostRanges, currentUser);
        setGhostRanges((prev) =>
          prev.filter((g) => g.id !== convertingGhostId),
        );
      }

      const firstCreated = createdList[0];
      if (firstCreated) {
        handleSelectEvent(firstCreated);
      }
      setToastMessage(
        `Scheduled "${payload.title}" across ${createdList.length} days (${payload.date} – ${rangeEndDate}).`,
      );
      setNotifications((prev) =>
        addDeduplicatedNotification(prev, {
          dedupeKey: `meeting-range-${payload.date}-${rangeEndDate}-${payload.startTime}-${payload.title}`,
          kind: payload.confirmOverride ? "clash" : "success",
          title: `${createdList.length} Meetings Confirmed`,
          message: `${payload.title} (${payload.date} – ${rangeEndDate})`,
          targetDateKey: payload.date,
          targetClubId: payload.clubId,
          isDemoOnly: true,
        }),
      );
      return;
    }

    const created = await createMeeting(payload, events, currentUser);
    setEvents((prev) => [...prev, created]);

    if (convertingGhostId) {
      await removeGhostRangeDemo(convertingGhostId, ghostRanges, currentUser);
      setGhostRanges((prev) => prev.filter((g) => g.id !== convertingGhostId));
    }

    handleSelectEvent(created);
    setToastMessage(`Meeting "${created.title}" confirmed.`);
    setNotifications((prev) =>
      addDeduplicatedNotification(prev, {
        dedupeKey: `meeting-created-${created.date}-${created.startTime}-${created.title}`,
        kind: payload.confirmOverride ? "clash" : "success",
        title: payload.confirmOverride
          ? "Meeting Scheduled (Clash Overridden)"
          : "Meeting Confirmed",
        message: `${created.title} on ${created.date}`,
        targetDateKey: created.date,
        targetClubId: created.clubId,
        isDemoOnly: true,
      }),
    );
  };

  const handleUpdateEventMom = (eventId: string, mom: string) => {
    const target = events.find((ev) => ev.id === eventId);
    if (!target || !canManageMom(currentUser, target)) return;

    const trimmed = mom.trim();
    const updatedAt = new Date().toISOString();
    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              mom: trimmed || undefined,
              momUpdatedBy: trimmed ? currentUser.name : undefined,
              momUpdatedAt: trimmed ? updatedAt : undefined,
            }
          : ev,
      ),
    );
    setToastMessage(
      trimmed
        ? `MOM saved for "${target.title}".`
        : `MOM cleared for "${target.title}".`,
    );
  };

  const handleDeleteEvent = async (eventId: string) => {
    const target = events.find((ev) => ev.id === eventId);
    if (!target || !canCancelMeeting(currentUser, target)) return;

    await cancelMeeting(eventId, events, currentUser);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
    }
    setToastMessage(`Meeting "${target.title}" cancelled.`);
  };

  const handleSubmitGhostRange = async (
    payload: CreateGhostRangePayload,
    editingGhostId?: string,
  ) => {
    if (editingGhostId) {
      const updated = await updateGhostRangeDemo(
        editingGhostId,
        payload,
        ghostRanges,
        currentUser,
      );
      setGhostRanges((prev) =>
        prev.map((g) => (g.id === editingGhostId ? updated : g)),
      );
      setToastMessage(`Tentative hold "${updated.title}" updated (demo).`);
      return;
    }

    const created = await createGhostRangeDemo(payload, currentUser);
    setGhostRanges((prev) => [...prev, created]);
    setSelectedDateKey(created.startDate);
    setIsMeetingsPanelOpen(true);
    setToastMessage(`Tentative hold "${created.title}" saved (demo).`);
  };

  const handleDeleteGhostRange = async (holdId: string) => {
    const target = ghostRanges.find((g) => g.id === holdId);
    if (!target || !canManageGhostRange(currentUser, target)) return;
    await removeGhostRangeDemo(holdId, ghostRanges, currentUser);
    setGhostRanges((prev) => prev.filter((g) => g.id !== holdId));
    setToastMessage(`Tentative hold "${target.title}" removed.`);
  };

  const handleSubmitAnnouncement = async (
    payload: CreateAnnouncementPayload,
  ) => {
    const created = await publishAnnouncement(payload, currentUser);
    setAnnouncements((prev) => [
      created,
      ...prev.filter((a) => a.id !== created.id),
    ]);
    setToastMessage(`Announcement "${created.title}" published.`);
  };

  const handleMarkGhostCoordinated = (holdIds: string[]) => {
    setNotifications((prev) =>
      addDeduplicatedNotification(prev, {
        dedupeKey: `ghost-coord-${holdIds.join(",")}`,
        kind: "ghost_overlap",
        title: "Overlap Marked Coordinated (Demo)",
        message: "Coordinated schedule overlap recorded locally.",
        targetDateKey: selectedDateKey ?? todayDateKey,
        isDemoOnly: true,
      }),
    );
  };

  // Demo role switching is disabled while using real authentication.
  const handleSelectDemoRole = (_role: UserRole) => {
    setToastMessage("Roles are assigned by your TechSpace account.");
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleLogout = () => {
    logout();
    setAuthUser(null);
  };

  const mainDateLabel =
    viewMode === "month"
      ? formatMonthYearLabel(mainYear, mainMonthIndex)
      : viewMode === "week"
        ? formatWeekRangeLabel(weekAnchorDateKey)
        : formatFullDateWithYear(weekAnchorDateKey);

  // Desktop animated RightPanel wrapper + Mobile overlay drawer
  const renderConditionalMeetingsPanel = () => (
    <>
      {/* Desktop Conditional Slide/Width Panel */}
      <div
        className="hidden lg:flex ts-right-panel-slot"
        data-open={isMeetingsPanelOpen ? "true" : "false"}
        aria-hidden={!isMeetingsPanelOpen}
      >
        <RightPanel
          theme={theme}
          palette={palette}
          currentUser={currentUser}
          todayDateKey={todayDateKey}
          selectedDateKey={selectedDateKey}
          dayEvents={selectedDayEvents}
          dayGhostRanges={selectedDayGhostRanges}
          upcomingEvents={upcomingEvents}
          selectedEvent={selectedEvent}
          clubs={CLUBS}
          onSelectEvent={handleSelectEvent}
          onSelectDate={handleSelectMainDate}
          onClosePanel={handleCloseMeetingsPanel}
          onOpenAdminModal={openFreshAdminModal}
          onUpdateEventMom={handleUpdateEventMom}
          onEditEvent={(ev) => {
            if (!canEditMeeting(currentUser, ev)) return;
            setEditingEvent(ev);
            setEditingGhostRange(null);
            setConvertingGhostRange(null);
            setDragSelection(null);
            setIsAdminModalOpen(true);
          }}
          onDeleteEvent={(id) => void handleDeleteEvent(id)}
          onEditGhostRange={(hold) => {
            if (!canManageGhostRange(currentUser, hold)) return;
            setEditingEvent(null);
            setEditingGhostRange(hold);
            setConvertingGhostRange(null);
            setDragSelection(null);
            setIsAdminModalOpen(true);
          }}
          onDeleteGhostRange={(id) => void handleDeleteGhostRange(id)}
          onConvertGhostRange={(hold) => {
            if (!canManageGhostRange(currentUser, hold)) return;
            setEditingEvent(null);
            setEditingGhostRange(null);
            setConvertingGhostRange(hold);
            setDragSelection(null);
            setModalSchedulingKind("confirmed");
            setIsAdminModalOpen(true);
          }}
        />
      </div>

      {/* Mobile / Tablet Overlay Meetings Drawer */}
      <div
        aria-hidden={!isMeetingsPanelOpen}
        className={`lg:hidden fixed inset-0 z-40 flex justify-end ts-transition transition-opacity duration-[240ms] ${
          isMeetingsPanelOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{
          backgroundColor:
            theme === "dark"
              ? "rgba(10, 10, 12, 0.72)"
              : "rgba(30, 27, 24, 0.32)",
        }}
        onClick={handleCloseMeetingsPanel}
      >
        <div
          className={`w-[300px] max-w-[90vw] h-full p-3 ts-transition transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isMeetingsPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <RightPanel
            theme={theme}
            palette={palette}
            currentUser={currentUser}
            todayDateKey={todayDateKey}
            selectedDateKey={selectedDateKey}
            dayEvents={selectedDayEvents}
            dayGhostRanges={selectedDayGhostRanges}
            upcomingEvents={upcomingEvents}
            selectedEvent={selectedEvent}
            clubs={CLUBS}
            onSelectEvent={handleSelectEvent}
            onSelectDate={handleSelectMainDate}
            onClosePanel={handleCloseMeetingsPanel}
            onOpenAdminModal={openFreshAdminModal}
            onUpdateEventMom={handleUpdateEventMom}
            onEditEvent={(ev) => {
              if (!canEditMeeting(currentUser, ev)) return;
              setEditingEvent(ev);
              setEditingGhostRange(null);
              setConvertingGhostRange(null);
              setDragSelection(null);
              setIsAdminModalOpen(true);
            }}
            onDeleteEvent={(id) => void handleDeleteEvent(id)}
            onEditGhostRange={(hold) => {
              if (!canManageGhostRange(currentUser, hold)) return;
              setEditingEvent(null);
              setEditingGhostRange(hold);
              setConvertingGhostRange(null);
              setDragSelection(null);
              setIsAdminModalOpen(true);
            }}
            onDeleteGhostRange={(id) => void handleDeleteGhostRange(id)}
            onConvertGhostRange={(hold) => {
              if (!canManageGhostRange(currentUser, hold)) return;
              setEditingEvent(null);
              setEditingGhostRange(null);
              setConvertingGhostRange(hold);
              setDragSelection(null);
              setModalSchedulingKind("confirmed");
              setIsAdminModalOpen(true);
            }}
          />
        </div>
      </div>
    </>
  );

  if (authLoading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center gap-4 ${
          theme === "dark" ? "ts-graphite-grid" : "ts-cream-grid"
        }`}
        style={{ color: palette.textPrimary }}
      >
        <LumaSpin />
        <span className="text-[14px] font-medium tracking-wide">
          Loading TechSpace...
        </span>
      </div>
    );
  }

  if (!authUser) {
    return (
      <LoginPage
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogin={(user) => {
          setAuthUser(user);
          setActiveNav("dashboard");
        }}
      />
    );
  }

  // UNIFIED LAYOUT SHELL (Light Mode = single source of truth for layout across both themes)
  return (
    <div
      className={`relative min-h-screen h-screen overflow-hidden w-full overflow-x-hidden ${
        theme === "light" ? "ts-cream-grid" : "ts-graphite-grid"
      }`}
    >
      <BackgroundDecor theme={theme} />

      <div className="relative z-10 w-full px-2.5 sm:px-4 lg:px-4 xl:px-6 py-2 sm:py-3 lg:py-3 xl:py-4 h-full min-h-0 flex flex-col gap-2 sm:gap-2.5 xl:gap-3.5">
        {/* Workspace Content */}
        <div className="ts-workspace-grid flex-1 min-h-0 overflow-hidden">
          {/* Permanent 60px Left Navigation Rail */}
          <NavRail
            theme={theme}
            palette={palette}
            activeNav={activeNav}
            onSelectNav={setActiveNav}
            currentUser={currentUser}
            onSelectDemoRole={handleSelectDemoRole}
            onToggleTheme={handleToggleTheme}
            todayEvents={todayEvents}
            clubs={CLUBS}
            announcements={announcements}
            dismissedAnnouncementIds={dismissedAnnouncementIds}
            onDismissAnnouncement={(id) =>
              setDismissedAnnouncementIds((prev) =>
                prev.includes(id) ? prev : [...prev, id],
              )
            }
            notifications={authorizedNotifications}
            onMarkNotificationRead={(id) =>
              setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
              )
            }
            onDismissNotification={(id) =>
              setNotifications((prev) => prev.filter((n) => n.id !== id))
            }
            onSelectEventFromHeader={(ev) => {
              setActiveNav("calendar");
              setSelectedClubFilters([]);
              handleSelectEvent(ev);
            }}
            onOpenNotificationDate={(dateKey) => {
              setActiveNav("calendar");
              handleSelectMainDate(dateKey);
            }}
            onLogout={handleLogout}
          />

          {activeNav === "calendar" ? (
            <div className="ts-calendar-grid flex-1 min-w-0 min-h-0 overflow-hidden">
              {/* Desktop Fluid Left Panel: Mini-Calendar + Club Filters */}
              <div className="hidden lg:block lg:mr-2.5 xl:mr-3.5 lg:h-full lg:overflow-hidden">
                <LeftPanel
                  theme={theme}
                  palette={palette}
                  miniYear={miniYear}
                  miniMonthIndex={miniMonthIndex}
                  onPrevMiniMonth={handlePrevMiniMonth}
                  onNextMiniMonth={handleNextMiniMonth}
                  selectedDateKey={selectedDateKey}
                  todayDateKey={todayDateKey}
                  onSelectDate={handleSelectMiniDate}
                  events={filteredEvents}
                  ghostRanges={filteredGhostRanges}
                  selectedDateMeetingCount={selectedDayEvents.length}
                  clubs={meetingClubs}
                  activeClubFilter={
                    isAllClubsSelected
                      ? "all"
                      : (selectedClubFilters[0] ?? "all")
                  }
                  selectedClubFilters={selectedClubFilters}
                  onSelectClubFilter={handleSelectClubFilter}
                />
              </div>

              {/* Tablet / Mobile Drawer for Mini-Calendar & Club Filters */}
              <div
                className={`lg:hidden fixed inset-0 z-40 flex justify-start ts-transition transition-opacity duration-[240ms] ${
                  isLeftDrawerOpen
                    ? "opacity-100 pointer-events-auto"
                    : "opacity-0 pointer-events-none"
                }`}
                style={{
                  backgroundColor:
                    theme === "dark"
                      ? "rgba(10, 10, 12, 0.72)"
                      : "rgba(30, 27, 24, 0.32)",
                }}
                onClick={() => setIsLeftDrawerOpen(false)}
                aria-hidden={!isLeftDrawerOpen}
              >
                <div
                  className={`w-[290px] max-w-[88vw] h-full p-3 overflow-y-auto ts-scroll ts-transition transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isLeftDrawerOpen ? "translate-x-0" : "-translate-x-full"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span
                      className="text-[12px] font-semibold uppercase tracking-wider"
                      style={{ color: palette.textMuted }}
                    >
                      Schedule &amp; Filters
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLeftDrawerOpen(false)}
                      aria-label="Close schedule and filters drawer"
                      className="ts-icon-btn w-7 h-7 rounded-full border flex items-center justify-center cursor-pointer"
                      style={{
                        backgroundColor: palette.surfaceElevated,
                        borderColor: palette.border,
                        color: palette.textMuted,
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <LeftPanel
                    theme={theme}
                    palette={palette}
                    miniYear={miniYear}
                    miniMonthIndex={miniMonthIndex}
                    onPrevMiniMonth={handlePrevMiniMonth}
                    onNextMiniMonth={handleNextMiniMonth}
                    selectedDateKey={selectedDateKey}
                    todayDateKey={todayDateKey}
                    onSelectDate={(dateKey) => {
                      handleSelectMiniDate(dateKey);
                      setIsLeftDrawerOpen(false);
                    }}
                    events={filteredEvents}
                    ghostRanges={filteredGhostRanges}
                    selectedDateMeetingCount={selectedDayEvents.length}
                    clubs={meetingClubs}
                    activeClubFilter={
                      isAllClubsSelected
                        ? "all"
                        : (selectedClubFilters[0] ?? "all")
                    }
                    selectedClubFilters={selectedClubFilters}
                    onSelectClubFilter={handleSelectClubFilter}
                  />
                </div>
              </div>

              {/* Main Calendar Area (Opaque background, adapts smoothly without animating resize frames) */}
              <main
                className="flex-1 min-w-0 min-h-0 overflow-hidden rounded-[18px] sm:rounded-[20px] border p-2.5 sm:p-3.5 xl:p-4.5 flex flex-col transition-colors duration-150"
                style={{
                  background: palette.surfaceBackground,
                  borderColor: palette.border,
                  boxShadow: palette.cardShadow,
                }}
              >
                {/* Tablet / Mobile Compact Supporting-Panel Trigger */}
                <div className="lg:hidden flex items-center justify-start gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setIsLeftDrawerOpen(true)}
                    className="ts-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer"
                    style={{
                      backgroundColor: palette.buttonMutedBg,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span>Schedule &amp; Filters</span>
                    {!isAllClubsSelected && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: palette.accentBg }}
                      />
                    )}
                  </button>
                </div>

                {/* Shared Calendar Header Toolbar (Day/Week/Month toggle ALWAYS TOP-LEFT) */}
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2.5 xl:gap-3 mb-2 sm:mb-2.5 xl:mb-3.5 shrink-0">
                  {/* Left: Day / Week / Month Three-Way Segmented Control */}
                  <SpringSegmentedControl<CalendarViewMode>
                    options={VIEW_MODE_OPTIONS}
                    value={viewMode}
                    onChange={handleViewModeChange}
                    trackBg={palette.segmentedTrackBg}
                    activeBg={palette.accentBg}
                    activeText={palette.accentText}
                    inactiveText={palette.textMuted}
                    className="order-1 p-1 rounded-full shrink-0"
                    buttonClassName="ts-btn px-3 sm:px-4 py-1.5 rounded-full text-[12.5px] sm:text-[13px] font-semibold whitespace-nowrap"
                    ariaLabel="Calendar view mode"
                    style={{ "--pill-inset": "8px" } as React.CSSProperties}
                  />

                  {/* Center: Date Navigation */}
                  <div className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-center gap-3 sm:gap-5">
                    <button
                      type="button"
                      onClick={handleMainPrev}
                      aria-label={
                        viewMode === "month"
                          ? "Previous month"
                          : viewMode === "week"
                            ? "Previous week"
                            : "Previous day"
                      }
                      className="ts-icon-btn w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ color: palette.textSecondary }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <h1
                      className="text-[15px] sm:text-[16px] font-bold tracking-tight text-center min-w-[155px] sm:min-w-[180px] tabular-nums"
                      style={{ color: palette.textPrimary }}
                    >
                      {mainDateLabel}
                    </h1>

                    <button
                      type="button"
                      onClick={handleMainNext}
                      aria-label={
                        viewMode === "month"
                          ? "Next month"
                          : viewMode === "week"
                            ? "Next week"
                            : "Next day"
                      }
                      className="ts-icon-btn w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                      style={{ color: palette.textSecondary }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right: Today Shortcut */}
                  <button
                    type="button"
                    onClick={handleToday}
                    className="ts-btn order-2 sm:order-3 px-4 py-1.5 rounded-full text-[13px] font-semibold border cursor-pointer whitespace-nowrap shrink-0"
                    style={{
                      backgroundColor: palette.buttonMutedBg,
                      borderColor: palette.border,
                      color: palette.textPrimary,
                    }}
                  >
                    Today
                  </button>
                </div>

                {/* Inline Range-Pick Prompt Banner (when selecting tentative dates on the main calendar) */}
                {isPickingGhostRange && (
                  <div
                    className="mb-3 px-3 py-2 rounded-[10px] border border-dashed flex items-center justify-between gap-2 text-[12px]"
                    style={{
                      backgroundColor: palette.surfaceElevated,
                      borderColor: palette.textMuted,
                      color: palette.textPrimary,
                    }}
                  >
                    <span>
                      {rangePickStart
                        ? `Start date selected (${rangePickStart}). Click an end date on the calendar.`
                        : "Click a start date on the calendar for your tentative hold."}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPickingGhostRange(false);
                        setRangePickStart(null);
                        setIsAdminModalOpen(true);
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer"
                      style={{
                        backgroundColor: palette.buttonMutedBg,
                        color: palette.textSecondary,
                      }}
                    >
                      Cancel Pick
                    </button>
                  </div>
                )}

                {/* Active Calendar View */}
                {viewMode === "month" ? (
                  <MonthView
                    theme={theme}
                    palette={palette}
                    currentUser={currentUser}
                    year={mainYear}
                    monthIndex={mainMonthIndex}
                    selectedDateKey={selectedDateKey}
                    todayDateKey={todayDateKey}
                    selectedEventId={selectedEventId}
                    events={filteredEvents}
                    ghostRanges={filteredGhostRanges}
                    isPickingRange={isPickingGhostRange}
                    rangePickStart={rangePickStart}
                    onSelectDate={handleSelectMainDate}
                    onSelectEvent={handleSelectEvent}
                    onDragSelectMonthRange={({ startDate, endDate }) => {
                      if (!canAccessAdminControls(currentUser)) return;
                      setEditingEvent(null);
                      setEditingGhostRange(null);
                      setConvertingGhostRange(null);
                      setPickedCalendarRange(null);
                      setDragSelection({ startDate, endDate });
                      setModalSchedulingKind("confirmed");
                      setIsAdminModalOpen(true);
                    }}
                  />
                ) : viewMode === "week" ? (
                  <WeekView
                    theme={theme}
                    palette={palette}
                    currentUser={currentUser}
                    anchorDateKey={weekAnchorDateKey}
                    selectedDateKey={selectedDateKey}
                    todayDateKey={todayDateKey}
                    selectedEventId={selectedEventId}
                    events={filteredEvents}
                    ghostRanges={filteredGhostRanges}
                    onSelectDate={handleSelectMainDate}
                    onSelectEvent={handleSelectEvent}
                    onDragSelectWeekTime={({ dateKey, startTime, endTime }) => {
                      if (!canAccessAdminControls(currentUser)) return;
                      setEditingEvent(null);
                      setEditingGhostRange(null);
                      setConvertingGhostRange(null);
                      setPickedCalendarRange(null);
                      setDragSelection({
                        startDate: dateKey,
                        endDate: dateKey,
                        startTime,
                        endTime,
                      });
                      setModalSchedulingKind("confirmed");
                      setIsAdminModalOpen(true);
                    }}
                  />
                ) : (
                  <DayView
                    theme={theme}
                    palette={palette}
                    currentUser={currentUser}
                    dateKey={weekAnchorDateKey}
                    selectedDateKey={selectedDateKey}
                    todayDateKey={todayDateKey}
                    selectedEventId={selectedEventId}
                    events={filteredEvents}
                    ghostRanges={filteredGhostRanges}
                    onSelectDate={handleSelectMainDate}
                    onSelectEvent={handleSelectEvent}
                    onDragSelectDayTime={({ dateKey, startTime, endTime }) => {
                      if (!canAccessAdminControls(currentUser)) return;
                      setEditingEvent(null);
                      setEditingGhostRange(null);
                      setConvertingGhostRange(null);
                      setPickedCalendarRange(null);
                      setDragSelection({
                        startDate: dateKey,
                        endDate: dateKey,
                        startTime,
                        endTime,
                      });
                      setModalSchedulingKind("confirmed");
                      setIsAdminModalOpen(true);
                    }}
                  />
                )}
              </main>

              {/* Conditional Right Meetings Panel */}
              {renderConditionalMeetingsPanel()}
            </div>
          ) : activeNav === "meets" ? (
            <AllMeetsView
              theme={theme}
              palette={palette}
              currentUser={currentUser}
              events={events}
              clubs={meetingClubs}
              todayDateKey={todayDateKey}
              onEditEvent={(ev) => {
                if (!canEditMeeting(currentUser, ev)) return;
                setEditingEvent(ev);
                setEditingGhostRange(null);
                setConvertingGhostRange(null);
                setDragSelection(null);
                setIsAdminModalOpen(true);
              }}
              onDeleteEvent={(id) => void handleDeleteEvent(id)}
              onUpdateEventMom={handleUpdateEventMom}
              onOpenCreateModal={openFreshAdminModal}
            />
          ) : activeNav === "dashboard" ? (
            <div className="flex-1 min-w-0 min-h-0 overflow-y-auto ts-scroll ts-page-scroll">
              <Dashboard
                user={dashboardUser}
                role={dashboardRole}
                meetings={dashboardMeetings}
                setMeetings={setDashboardMeetings}
                theme={theme}
                onNavigateCalendar={() => setActiveNav("calendar")}
                announcements={announcements}
                onSubmitAnnouncement={handleSubmitAnnouncement}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Non-intrusive Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-[12px] border text-[12.5px] font-medium"
          style={{
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            color: palette.textPrimary,
            boxShadow: palette.cardShadow,
          }}
        >
          <CheckCircle2
            className="w-4 h-4 shrink-0"
            style={{ color: palette.textSecondary }}
          />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="p-0.5 cursor-pointer"
            style={{ color: palette.textMuted }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Controls / Scheduling Modal */}
      {isAdminModalOpen && canAccessAdminControls(currentUser) && (
        <EventModal
          theme={theme}
          palette={palette}
          currentUser={currentUser}
          clubs={CLUBS}
          existingEvents={events}
          ghostRanges={ghostRanges}
          defaultDateKey={selectedDateKey ?? todayDateKey}
          initialSchedulingKind={modalSchedulingKind}
          editingEvent={editingEvent}
          editingGhostRange={editingGhostRange}
          convertingGhostRange={convertingGhostRange}
          pickedCalendarRange={pickedCalendarRange}
          dragSelection={dragSelection}
          onRequestCalendarRangePick={() => {
            setIsAdminModalOpen(false);
            setViewMode("month");
            setIsPickingGhostRange(true);
            setRangePickStart(null);
            setDragSelection(null);
          }}
          onClose={() => {
            setIsAdminModalOpen(false);
            setEditingEvent(null);
            setEditingGhostRange(null);
            setConvertingGhostRange(null);
            setPickedCalendarRange(null);
            setDragSelection(null);
          }}
          onSubmitMeeting={handleSubmitMeeting}
          onSubmitGhostRange={handleSubmitGhostRange}
          onSubmitAnnouncement={handleSubmitAnnouncement}
          onMarkGhostCoordinated={handleMarkGhostCoordinated}
        />
      )}
    </div>
  );
}

export default App;
