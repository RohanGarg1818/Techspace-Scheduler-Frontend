import {
  Announcement,
  AppNotification,
  AttendanceType,
  CalendarEvent,
  ClashCheckResult,
  ClubId,
  CurrentUser,
  GhostRange,
  MeetingType,
  UserRole,
} from "../types/calendar";
import { findMeetingClashes } from "../utils/conflictUtils";
import { apiFetch } from "./apiClient";
import { fetchTeams, getTeamIdForClub, mapTeamIdToClubId } from "./teamService";
import { addDays, isFutureDateTime } from "../utils/dateUtils";
import {
  canCancelMeeting,
  canCreateGhostRange,
  canCreateMeetingForTeam,
  canDeleteAnnouncement,
  canEditAnnouncement,
  canEditMeeting,
  canManageGhostRange,
  canPermanentlyDeleteMeeting,
  canPublishAnnouncement,
} from "../utils/permissions";

export interface CreateMeetingPayload {
  title: string;
  meetingType: MeetingType;
  clubId: ClubId;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingLink?: string;
  attendance: AttendanceType;
  description?: string;
  confirmOverride?: boolean;
  force?: boolean;
}

export interface UpdateMeetingPayload extends CreateMeetingPayload {
  id: string;
}

export interface CreateGhostRangePayload {
  title: string;
  note?: string;
  clubId: ClubId;
  startDate: string;
  endDate: string;
  isDateOnly: boolean;
  startTime?: string;
  endTime?: string;
  isPrivate?: boolean;
}

export type AnnouncementPriority = "normal" | "urgent";

export interface CreateAnnouncementPayload {
  clubId?: ClubId;
  teamId?: string | null;
  title: string;
  content: string;
  priority?: AnnouncementPriority;
  isPinned?: boolean;
}

export interface UpdateAnnouncementPayload {
  id: string;
  title?: string;
  content?: string;
  priority?: AnnouncementPriority;
  isPinned?: boolean;
}

export class ApiServiceError extends Error {
  status: number;
  code: string;
  data?: any;

  constructor(message: string, status = 400, code = "BAD_REQUEST", data?: any) {
    super(message);
    this.name = "ApiServiceError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Production backend base URL (empty in standalone frontend preview).
 * When configured, meeting mutations and clash checks target documented
 * /api/v1/meetings endpoints without silent demo fallback on failure.
 */
const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env
    ? ((import.meta as any).env.VITE_API_BASE_URL as string | undefined)
    : undefined
  )?.trim() ?? "";

export const isBackendConfigured = Boolean(API_BASE_URL);
console.log("Backend configuration:", {
  configured: isBackendConfigured,
  url: API_BASE_URL,
});

interface BackendMeeting {
  id: string;
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: string;
  color?: string;
  team?: { id: string; name: string } | null;
  location?: string | null;
  link?: string | null;
  note?: string | null;
  status?: string;
  createdBy?: { id: string; name: string } | null;
}

const VALID_CLUB_IDS = new Set<string>([
  "core-team",
  "web-dev",
  "design",
  "operations",
  "announcements",
]);

function normalizeToValidClubId(idOrName: string | undefined): ClubId {
  if (!idOrName) return "core-team";
  const normalized = idOrName.toLowerCase().replace(/\s+/g, "-");
  if (VALID_CLUB_IDS.has(normalized)) return normalized as ClubId;
  if (normalized === "tech-team") return "core-team";
  if (normalized.includes("web")) return "web-dev";
  if (normalized.includes("design")) return "design";
  if (normalized.includes("operat")) return "operations";
  if (normalized.includes("announc")) return "announcements";
  return "core-team";
}

function mapBackendMeetingToCalendarEvent(m: BackendMeeting): CalendarEvent {
  let clubId: ClubId = "core-team";
  if (m.team?.id) {
    const resolved = mapTeamIdToClubId(m.team.id);
    clubId = normalizeToValidClubId(resolved || m.team.name);
  }

  let meetingType: MeetingType = "Core Team";
  if (m.type === "ob") {
    meetingType = "OB";
  } else if (m.type === "subclub") {
    meetingType = "Sub-Club";
  }

  return {
    id: m.id,
    title: m.topic || "Untitled Meeting",
    shortTitle: (m.topic || "Meeting").slice(0, 14),
    meetingType,
    clubId,
    date: m.date,
    startTime: m.startTime,
    endTime: m.endTime,
    location: m.location || "TechSpace Room",
    meetingLink: m.link || undefined,
    attendance: "Optional",
    organizer: m.createdBy?.name || "TechSpace",
    createdById: m.createdBy?.id,
    description: m.note || "",
  };
}

// ============================================================================
// 1. MEETING SERVICE (Documented contracts: GET, POST, PATCH /api/v1/meetings, cancel & check-clash)
// ============================================================================

export async function fetchMeetings(
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  if (!isBackendConfigured) {
    return [];
  }

  await fetchTeams().catch(() => {});

  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffDays = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 60) {
    const res = await apiFetch<{ items: BackendMeeting[] }>(
      `/api/v1/meetings?from=${from}&to=${to}&status=all`,
    );
    return (res.items || []).map(mapBackendMeetingToCalendarEvent);
  }

  // Chunk requests into ≤60 day windows if range exceeds 60 days
  const allMeetings: BackendMeeting[] = [];
  const seenIds = new Set<string>();
  let currentStart = from;

  while (currentStart <= to) {
    let chunkEnd = addDays(currentStart, 59);
    if (chunkEnd > to) chunkEnd = to;

    const res = await apiFetch<{ items: BackendMeeting[] }>(
      `/api/v1/meetings?from=${currentStart}&to=${chunkEnd}&status=all`,
    );
    for (const m of res.items || []) {
      if (!seenIds.has(m.id)) {
        seenIds.add(m.id);
        allMeetings.push(m);
      }
    }
    currentStart = addDays(chunkEnd, 1);
  }

  return allMeetings.map(mapBackendMeetingToCalendarEvent);
}

export async function checkMeetingClash(
  candidate: {
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
    clubId: ClubId;
  },
  existingEvents: CalendarEvent[],
  currentUser: CurrentUser,
): Promise<ClashCheckResult> {
  if (isBackendConfigured) {
    const res = await apiFetch<{
      hasClash: boolean;
      clashes: {
        id: string;
        topic: string;
        date: string;
        startTime: string;
        endTime: string;
        location: string | null;
        team: { id: string; name: string } | null;
      }[];
    }>("/api/v1/meetings/check-clash", {
      method: "POST",
      body: JSON.stringify({
        date: candidate.date,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
        ...(candidate.id ? { excludeMeetingId: candidate.id } : {}),
      }),
    });

    return {
      hasClash: res.hasClash,
      code: res.hasClash ? "MEETING_CLASH" : undefined,
      conflicts: res.clashes.map((meeting) => ({
        id: meeting.id,
        title: meeting.topic,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location ?? "",
        clubId: (meeting.team?.id
          ? (mapTeamIdToClubId(meeting.team.id) ?? "core-team")
          : "core-team") as ClubId,
      })),
    };
  }
  // Clearly labeled local demo adapter when no backend server is attached
  const conflicts = findMeetingClashes(candidate, existingEvents, currentUser);
  if (conflicts.length > 0) {
    return {
      hasClash: true,
      code: "MEETING_CLASH",
      conflicts,
    };
  }
  return { hasClash: false, conflicts: [] };
}

export async function createMeeting(
  payload: CreateMeetingPayload,
  existingEvents: CalendarEvent[],
  currentUser: CurrentUser,
): Promise<CalendarEvent> {
  if (!isFutureDateTime(payload.date, payload.startTime)) {
    throw new ApiServiceError(
      "Meetings can only be scheduled for a future date and time.",
      400,
      "INVALID_DATETIME",
    );
  }

  if (!canCreateMeetingForTeam(currentUser, payload.clubId)) {
    throw new ApiServiceError(
      "You are not authorized to schedule meetings for this team.",
      403,
      "FORBIDDEN",
    );
  }
  if (payload.clubId === "announcements") {
    throw new ApiServiceError(
      "The Announcements club is reserved for announcements, not meetings.",
      400,
      "INVALID_CLUB",
    );
  }
  if (payload.meetingType === "Sub-Club" && payload.clubId === "core-team") {
    throw new ApiServiceError(
      "Sub-Club meetings must be assigned to a sub-club.",
      400,
      "INVALID_CLUB",
    );
  }
  if (
    (payload.meetingType === "Core Team" || payload.meetingType === "OB") &&
    payload.clubId !== "core-team"
  ) {
    throw new ApiServiceError(
      "Core Team and OB meetings must be assigned to the Core Team club.",
      400,
      "INVALID_CLUB",
    );
  }

  if (isBackendConfigured) {
    await fetchTeams().catch(() => {});
    let teamId: string | null = null;
    if (payload.meetingType !== "OB" && payload.clubId !== "core-team") {
      try {
        teamId = await getTeamIdForClub(payload.clubId);
      } catch {
        teamId = null;
      }
    } else if (payload.clubId === "core-team" && payload.meetingType !== "OB") {
      try {
        teamId = await getTeamIdForClub("core-team");
      } catch {
        teamId = null;
      }
    }

    const backendPayload = {
      topic: payload.title.trim(),
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      teamId,
      note: payload.description?.trim() ?? null,
      location: payload.location?.trim() ?? null,
      link: payload.meetingLink?.trim() ?? null,
    };
    const query = payload.force
      ? "?force=true"
      : payload.confirmOverride
        ? "?acknowledgeClash=true"
        : "";
    const res = await apiFetch<BackendMeeting>(`/api/v1/meetings${query}`, {
      method: "POST",
      body: JSON.stringify(backendPayload),
    });

    return mapBackendMeetingToCalendarEvent(res);
  }

  // Local demo adapter: enforce clash check unless user explicitly confirmed override
  const clash = await checkMeetingClash(
    {
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      clubId: payload.clubId,
    },
    existingEvents,
    currentUser,
  );

  if (clash.hasClash && !payload.confirmOverride) {
    throw new ApiServiceError(
      "Schedule clash detected. Review conflicting meetings before confirming.",
      409,
      "MEETING_CLASH",
    );
  }

  return {
    id: `evt-${Date.now()}`,
    title: payload.title.trim(),
    shortTitle: payload.title.trim().slice(0, 14),
    meetingType: payload.meetingType,
    clubId: payload.clubId,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    location: payload.location.trim() || "TechSpace Room",
    meetingLink: payload.meetingLink?.trim() || undefined,
    attendance: payload.attendance,
    organizer: currentUser.name,
    createdById: currentUser.id,
    description:
      payload.description?.trim() ||
      `${payload.meetingType} meeting scheduled by ${currentUser.name}.`,
  };
}

export async function updateMeeting(
  payload: UpdateMeetingPayload,
  existingEvents: CalendarEvent[],
  currentUser: CurrentUser,
): Promise<CalendarEvent> {
  const target = existingEvents.find((ev) => ev.id === payload.id);
  if (!target || !canEditMeeting(currentUser, target)) {
    throw new ApiServiceError(
      "You are not authorized to edit this meeting.",
      403,
      "FORBIDDEN",
    );
  }

  const isRescheduling =
    payload.date !== target.date || payload.startTime !== target.startTime;

  if (isRescheduling && !isFutureDateTime(payload.date, payload.startTime)) {
    throw new ApiServiceError(
      "Meetings can only be scheduled for a future date and time.",
      400,
      "INVALID_DATETIME",
    );
  }
  if (payload.clubId === "announcements") {
    throw new ApiServiceError(
      "The Announcements club is reserved for announcements, not meetings.",
      400,
      "INVALID_CLUB",
    );
  }
  if (payload.meetingType === "Sub-Club" && payload.clubId === "core-team") {
    throw new ApiServiceError(
      "Sub-Club meetings must be assigned to a sub-club.",
      400,
      "INVALID_CLUB",
    );
  }
  if (
    (payload.meetingType === "Core Team" || payload.meetingType === "OB") &&
    payload.clubId !== "core-team"
  ) {
    throw new ApiServiceError(
      "Core Team and OB meetings must be assigned to the Core Team club.",
      400,
      "INVALID_CLUB",
    );
  }

  if (isBackendConfigured) {
    await fetchTeams().catch(() => {});
    let teamId: string | null = null;
    if (payload.meetingType !== "OB" && payload.clubId !== "core-team") {
      try {
        teamId = await getTeamIdForClub(payload.clubId);
      } catch {
        teamId = null;
      }
    } else if (payload.clubId === "core-team" && payload.meetingType !== "OB") {
      try {
        teamId = await getTeamIdForClub("core-team");
      } catch {
        teamId = null;
      }
    }

    const backendPayload = {
      topic: payload.title.trim(),
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      teamId,
      note: payload.description?.trim() ?? null,
      location: payload.location?.trim() ?? null,
      link: payload.meetingLink?.trim() ?? null,
    };
    const query = payload.force
      ? "?force=true"
      : payload.confirmOverride
        ? "?acknowledgeClash=true"
        : "";
    const res = await apiFetch<BackendMeeting>(
      `/api/v1/meetings/${payload.id}${query}`,
      {
        method: "PATCH",
        body: JSON.stringify(backendPayload),
      },
    );

    return mapBackendMeetingToCalendarEvent(res);
  }

  const clash = await checkMeetingClash(
    {
      id: payload.id,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      clubId: payload.clubId,
    },
    existingEvents,
    currentUser,
  );

  if (clash.hasClash && !payload.confirmOverride) {
    throw new ApiServiceError(
      "Schedule clash detected. Review conflicting meetings before confirming.",
      409,
      "MEETING_CLASH",
    );
  }

  return {
    ...target,
    title: payload.title.trim(),
    shortTitle: payload.title.trim().slice(0, 14),
    meetingType: payload.meetingType,
    clubId: payload.clubId,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    location: payload.location.trim() || target.location,
    meetingLink: payload.meetingLink?.trim() || undefined,
    attendance: payload.attendance,
    description: payload.description?.trim() ?? target.description,
  };
}

export async function cancelMeeting(
  meetingId: string,
  existingEvents: CalendarEvent[],
  currentUser: CurrentUser,
): Promise<void> {
  const target = existingEvents.find((ev) => ev.id === meetingId);
  if (!target || !canCancelMeeting(currentUser, target)) {
    throw new ApiServiceError(
      "You are not authorized to cancel this meeting.",
      403,
      "FORBIDDEN",
    );
  }

  if (isBackendConfigured) {
    await apiFetch<unknown>(`/api/v1/meetings/${meetingId}/cancel`, {
      method: "POST",
    });

    return;
  }
}

export async function deleteMeetingPermanently(
  meetingId: string,
  currentUser: CurrentUser,
): Promise<void> {
  if (!canPermanentlyDeleteMeeting(currentUser)) {
    throw new ApiServiceError(
      "You are not authorized to permanently delete meetings.",
      403,
      "FORBIDDEN",
    );
  }

  if (isBackendConfigured) {
    await apiFetch<void>(`/api/v1/meetings/${meetingId}`, {
      method: "DELETE",
    });
  }
}

// ============================================================================
// 2. ANNOUNCEMENTS SERVICE (GET, POST, PATCH, DELETE /api/v1/announcements)
// ============================================================================

interface BackendAnnouncement {
  id: string;
  type?: string;
  team?: { id: string; name: string } | null;
  title: string;
  content: string;
  priority?: "normal" | "urgent" | string;
  isPinned?: boolean;
  createdBy?: { id: string; name: string; role?: UserRole } | null;
  createdAt: string;
  updatedAt?: string | null;
}

function mapBackendAnnouncementToFrontend(
  a: BackendAnnouncement,
): Announcement {
  let clubId: ClubId = "announcements";
  if (a.team?.id) {
    const resolved = mapTeamIdToClubId(a.team.id);
    clubId = normalizeToValidClubId(resolved || a.team.name);
  }

  return {
    id: a.id,
    clubId,
    title: a.title,
    content: a.content,
    priority: a.priority === "urgent" ? "urgent" : "normal",
    publisherName: a.createdBy?.name || "TechSpace",
    publisherRole: a.createdBy?.role,
    createdById: a.createdBy?.id,
    createdAt: a.createdAt,
    isDemoOnly: false,
  };
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (!isBackendConfigured) {
    return [];
  }

  await fetchTeams().catch(() => {});
  const res = await apiFetch<{ items: BackendAnnouncement[] }>(
    "/api/v1/announcements?limit=50",
  );
  return (res?.items || []).map(mapBackendAnnouncementToFrontend);
}

export async function publishAnnouncement(
  payload: CreateAnnouncementPayload,
  currentUser: CurrentUser,
): Promise<Announcement> {
  if (!isBackendConfigured) {
    throw new ApiServiceError(
      "Backend is not configured for announcement persistence.",
      503,
      "SERVICE_UNAVAILABLE",
    );
  }

  const targetClubId = payload.clubId;

  if (!canPublishAnnouncement(currentUser, targetClubId)) {
    throw new ApiServiceError(
      currentUser.role === "team_lead"
        ? "Team Leads can only publish announcements for their authorized teams."
        : "You are not authorized to publish announcements.",
      403,
      "FORBIDDEN",
    );
  }

  const teams = await fetchTeams();

  let teamId: string | null = null;

  // 1. Explicit teamId supplied in payload
  if (payload.teamId !== undefined) {
    if (payload.teamId === null) {
      // Explicitly society-wide announcement
      teamId = null;
    } else {
      // Verified against backend teams
      const matched = teams.find((t) => t.id === payload.teamId);
      if (!matched) {
        throw new ApiServiceError(
          `Team ID "${payload.teamId}" could not be verified in backend database.`,
          400,
          "VALIDATION_ERROR",
        );
      }
      teamId = matched.id;
    }
  } else if (!targetClubId || targetClubId === "announcements") {
    // Explicitly selected society-wide announcement
    teamId = null;
  } else {
    // Club specified - resolve to verified backend UUID
    try {
      teamId = await getTeamIdForClub(targetClubId);
    } catch {
      throw new ApiServiceError(
        `Failed to resolve verified backend team UUID for "${targetClubId}". Never substituting null.`,
        400,
        "UNRESOLVED_TEAM",
      );
    }

    if (!teamId) {
      throw new ApiServiceError(
        `No backend team found matching club "${targetClubId}".`,
        400,
        "UNRESOLVED_TEAM",
      );
    }
  }

  // Society-wide scope check: only OB can create society-wide announcements
  if (teamId === null && currentUser.role === "team_lead") {
    throw new ApiServiceError(
      "Only Office Bearers can publish society-wide announcements.",
      403,
      "FORBIDDEN",
    );
  }

  const validPriority: AnnouncementPriority =
    payload.priority === "urgent" ? "urgent" : "normal";

  const backendPayload = {
    title: payload.title.trim(),
    content: payload.content.trim(),
    teamId,
    priority: validPriority,
    isPinned: payload.isPinned ?? false,
  };

  const res = await apiFetch<BackendAnnouncement>("/api/v1/announcements", {
    method: "POST",
    body: JSON.stringify(backendPayload),
  });

  return mapBackendAnnouncementToFrontend(res);
}

export async function updateAnnouncement(
  payload: UpdateAnnouncementPayload,
  currentUser: CurrentUser,
  announcement?: Announcement,
): Promise<Announcement> {
  if (announcement && !canEditAnnouncement(currentUser, announcement)) {
    throw new ApiServiceError(
      "You are not authorized to edit this announcement.",
      403,
      "FORBIDDEN",
    );
  }

  if (isBackendConfigured) {
    const backendPayload: any = {};
    if (payload.title !== undefined)
      backendPayload.title = payload.title.trim();
    if (payload.content !== undefined)
      backendPayload.content = payload.content.trim();
    if (payload.priority !== undefined)
      backendPayload.priority =
        payload.priority === "urgent" ? "urgent" : "normal";
    if (payload.isPinned !== undefined)
      backendPayload.isPinned = payload.isPinned;

    const res = await apiFetch<BackendAnnouncement>(
      `/api/v1/announcements/${payload.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(backendPayload),
      },
    );

    return mapBackendAnnouncementToFrontend(res);
  }

  throw new ApiServiceError(
    "Announcement editing requires a configured backend.",
    400,
  );
}

export async function deleteAnnouncement(
  id: string,
  currentUser: CurrentUser,
  announcement?: Announcement,
): Promise<void> {
  if (announcement && !canDeleteAnnouncement(currentUser, announcement)) {
    throw new ApiServiceError(
      "You are not authorized to delete this announcement.",
      403,
      "FORBIDDEN",
    );
  }

  if (isBackendConfigured) {
    await apiFetch<void>(`/api/v1/announcements/${id}`, {
      method: "DELETE",
    });
    return;
  }
}

export async function publishAnnouncementDemo(
  payload: CreateAnnouncementPayload,
  currentUser: CurrentUser,
): Promise<Announcement> {
  throw new ApiServiceError(
    "Demo announcement publishing is disabled. Backend database persistence is required.",
    503,
    "PERSISTENCE_REQUIRED",
  );
}

// ============================================================================
// 3. GHOST RANGES SERVICE (No backend contract in schema -> Typed Demo Adapter)
// ============================================================================

export async function createGhostRangeDemo(
  payload: CreateGhostRangePayload,
  currentUser: CurrentUser,
): Promise<GhostRange> {
  if (!canCreateGhostRange(currentUser, payload.clubId)) {
    throw new ApiServiceError(
      "You are not authorized to create tentative holds for this team.",
      403,
      "FORBIDDEN",
    );
  }

  return {
    id: `ghost-${Date.now()}`,
    title: payload.title.trim() || "Tentative Hold",
    note: payload.note?.trim() || undefined,
    clubId: payload.clubId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    isDateOnly: payload.isDateOnly,
    startTime: payload.isDateOnly ? undefined : payload.startTime,
    endTime: payload.isDateOnly ? undefined : payload.endTime,
    isPrivate: payload.isPrivate,
    createdById: currentUser.id,
    createdByName: currentUser.name,
  };
}

export async function updateGhostRangeDemo(
  holdId: string,
  updates: Partial<CreateGhostRangePayload>,
  existingHolds: GhostRange[],
  currentUser: CurrentUser,
): Promise<GhostRange> {
  const target = existingHolds.find((h) => h.id === holdId);
  if (!target || !canManageGhostRange(currentUser, target)) {
    throw new ApiServiceError(
      "You are not authorized to edit this tentative hold.",
      403,
      "FORBIDDEN",
    );
  }

  return {
    ...target,
    ...updates,
    title:
      updates.title !== undefined
        ? updates.title.trim() || "Tentative Hold"
        : target.title,
    note:
      updates.note !== undefined
        ? updates.note.trim() || undefined
        : target.note,
  };
}

export async function removeGhostRangeDemo(
  holdId: string,
  existingHolds: GhostRange[],
  currentUser: CurrentUser,
): Promise<void> {
  const target = existingHolds.find((h) => h.id === holdId);
  if (!target || !canManageGhostRange(currentUser, target)) {
    throw new ApiServiceError(
      "You are not authorized to remove this tentative hold.",
      403,
      "FORBIDDEN",
    );
  }
}

// ============================================================================
// 4. LOCAL DEMO NOTIFICATIONS HELPER (Deduplicated)
// ============================================================================

export function addDeduplicatedNotification(
  existing: AppNotification[],
  next: Omit<AppNotification, "id" | "createdAt" | "read">,
): AppNotification[] {
  if (existing.some((n) => n.dedupeKey === next.dedupeKey)) {
    return existing;
  }
  return [
    {
      ...next,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
    },
    ...existing,
  ];
}
