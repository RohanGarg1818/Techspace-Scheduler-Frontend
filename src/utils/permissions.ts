import {
  Announcement,
  CalendarEvent,
  ClubId,
  ClubInfo,
  CurrentUser,
  GhostRange,
  UserRole,
} from "../types/calendar";

export const ROLE_LABELS: Record<UserRole, string> = {
  ob: "Office Bearer",
  team_lead: "Team Lead",
  faculty: "Faculty (Admin)",
  executive: "Executive (View only)",
  member: "Member (View only)",
};

/**
 * Clearly marked demo user presets for frontend role preview.
 * Real production deployments must supply authenticated user & team memberships
 * from the backend session and enforce mutations server-side.
 */
export const DEMO_USERS: Record<UserRole, CurrentUser> = {
  ob: {
    id: "user-ob-1",
    name: "Ananya Rao",
    role: "ob",
    authorizedTeams: [
      "core-team",
      "web-dev",
      "design",
      "operations",
      "announcements",
    ],
  },
  team_lead: {
    id: "user-tl-webdev",
    name: "Marcus Chen",
    role: "team_lead",
    authorizedTeams: ["web-dev"],
  },
  faculty: {
    id: "user-faculty-1",
    name: "Dr. Priya Nair",
    role: "faculty",
    authorizedTeams: [
      "core-team",
      "web-dev",
      "design",
      "operations",
      "announcements",
    ],
  },
  executive: {
    id: "user-exec-1",
    name: "Rohan Mehta",
    role: "executive",
    authorizedTeams: [
      "core-team",
      "web-dev",
      "design",
      "operations",
      "announcements",
    ],
  },
  member: {
    id: "user-member-1",
    name: "Samira Patel",
    role: "member",
    authorizedTeams: ["web-dev", "design"],
  },
};

export function isOfficeBearer(user: CurrentUser): boolean {
  return user.role === "ob";
}

export function isFacultyAdmin(user: CurrentUser): boolean {
  return user.role === "faculty";
}

export function isTeamLead(user: CurrentUser): boolean {
  return user.role === "team_lead";
}

export function isViewOnlyRole(user: CurrentUser): boolean {
  return user.role === "executive" || user.role === "member";
}

export function canAccessAdminControls(user: CurrentUser): boolean {
  return (
    user.role === "ob" || user.role === "team_lead" || user.role === "faculty"
  );
}

export function canViewEverything(_user: CurrentUser): boolean {
  return true;
}

export function canManageUsers(user: CurrentUser): boolean {
  return user.role === "faculty";
}

export function canManageTeams(user: CurrentUser): boolean {
  return user.role === "faculty";
}

export function canChangeOwnPassword(_user: CurrentUser): boolean {
  return true;
}

export function canCreateAnyMeeting(user: CurrentUser): boolean {
  return user.role === "ob" || user.role === "faculty";
}

export function canCreateMeeting(
  user: CurrentUser,
  clubId?: ClubId,
): boolean {
  if (user.role === "ob" || user.role === "faculty") {
    return true;
  }
  if (user.role === "team_lead") {
    if (clubId) {
      return (
        clubId !== "announcements" && user.authorizedTeams.includes(clubId)
      );
    }
    return user.authorizedTeams.some((t) => t !== "announcements");
  }
  return false;
}

export function canCreateMeetingForTeam(
  user: CurrentUser,
  clubId: ClubId,
): boolean {
  return canCreateMeeting(user, clubId);
}

export function canEditMeeting(
  user: CurrentUser,
  event: CalendarEvent,
): boolean {
  if (user.role === "faculty") {
    return true;
  }
  if (user.role === "ob" || user.role === "team_lead") {
    const isCreator =
      (Boolean(event.createdById) && event.createdById === user.id) ||
      event.organizer === user.name;
    return isCreator;
  }
  return false;
}

export function canCancelMeeting(
  user: CurrentUser,
  event: CalendarEvent,
): boolean {
  return canEditMeeting(user, event);
}

export function canPermanentlyDeleteMeeting(user: CurrentUser): boolean {
  return user.role === "ob" || user.role === "faculty";
}

export function canPublishAnnouncement(
  user: CurrentUser,
  clubId?: ClubId,
): boolean {
  if (user.role === "ob" || user.role === "faculty") {
    return true;
  }
  if (user.role === "team_lead") {
    if (clubId) {
      return (
        clubId !== "announcements" && user.authorizedTeams.includes(clubId)
      );
    }
    return user.authorizedTeams.some((t) => t !== "announcements");
  }
  return false;
}

export function canEditAnnouncement(
  user: CurrentUser,
  announcement: Announcement,
): boolean {
  if (user.role === "faculty") {
    return true;
  }
  if (user.role === "ob" || user.role === "team_lead") {
    const isCreator =
      (Boolean(announcement.createdById) &&
        announcement.createdById === user.id) ||
      announcement.publisherName === user.name;
    return isCreator;
  }
  return false;
}

export function canDeleteAnnouncement(
  user: CurrentUser,
  announcement: Announcement,
): boolean {
  return canEditAnnouncement(user, announcement);
}

export function canCreateGhostRange(
  user: CurrentUser,
  clubId?: ClubId,
): boolean {
  if (
    user.role !== "ob" &&
    user.role !== "team_lead" &&
    user.role !== "faculty"
  ) {
    return false;
  }
  if (!clubId) return user.authorizedTeams.length > 0;
  return user.authorizedTeams.includes(clubId);
}

export function canManageGhostRange(
  user: CurrentUser,
  hold: GhostRange,
): boolean {
  if (user.role === "faculty") {
    return true;
  }
  if (user.role === "ob" || user.role === "team_lead") {
    return (
      (Boolean(hold.createdById) && hold.createdById === user.id) ||
      hold.createdByName === user.name
    );
  }
  return false;
}

export function canManageMom(user: CurrentUser, event: CalendarEvent): boolean {
  return canEditMeeting(user, event);
}

export function canViewPrivateDetails(
  _user: CurrentUser,
  _clubId: ClubId,
  _isPrivate?: boolean,
): boolean {
  return true;
}

export function getAuthorizedClubs(user: CurrentUser): ClubId[] {
  return user.authorizedTeams;
}

/**
 * Membership rule validation helper:
 * A user can belong to at most ONE Core Club (category === 'core'),
 * but can belong to MULTIPLE Sub Clubs (category === 'sub-club').
 */
export function validateUserClubMemberships(
  authorizedTeams: ClubId[],
  clubs: ClubInfo[],
): boolean {
  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const coreClubs = authorizedTeams.filter(
    (id) => clubMap.get(id)?.category === "core",
  );
  return coreClubs.length <= 1;
}
