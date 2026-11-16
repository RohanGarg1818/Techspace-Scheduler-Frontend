export type ThemeMode = 'light' | 'dark';

export type CalendarViewMode = 'day' | 'week' | 'month';

export type TimeSubfilter = 'day' | 'week' | 'month';

export type NavSection = 'dashboard' | 'calendar' | 'meets';

export type ClubId =
  | 'core-team'
  | 'web-dev'
  | 'design'
  | 'operations'
  | 'announcements';

export type ClubCategory = 'core' | 'sub-club' | 'announcement';

export type AttendanceType = 'Mandatory' | 'Optional';

export type MeetingType = 'OB' | 'Core Team' | 'Sub-Club';

export type UserRole = 'ob' | 'team_lead' | 'faculty' | 'executive' | 'member';

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  authorizedTeams: ClubId[];
}

export interface ClubInfo {
  id: ClubId;
  name: string;
  shortLabel: string;
  category: ClubCategory;
  lead: string;
  roomDefault: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  shortTitle?: string;
  meetingType?: MeetingType;
  clubId: ClubId;
  date: string; // YYYY-MM-DD local date string
  startTime: string; // HH:mm 24-hour format
  endTime: string; // HH:mm 24-hour format
  location: string;
  meetingLink?: string;
  attendance: AttendanceType;
  organizer: string;
  createdById?: string;
  isPrivate?: boolean;
  description: string;
  mom?: string;
  momUpdatedBy?: string;
  momUpdatedAt?: string;
}

export interface GhostRange {
  id: string;
  title: string;
  note?: string;
  clubId: ClubId;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime?: string; // Optional HH:mm
  endTime?: string; // Optional HH:mm
  isDateOnly: boolean;
  isPrivate?: boolean;
  createdById: string;
  createdByName: string;
  coordinatedNote?: string;
}

export interface Announcement {
  id: string;
  clubId: ClubId;
  title: string;
  content: string;
  priority?: 'normal' | 'urgent';
  publisherName: string;
  publisherRole?: UserRole;
  createdById?: string;
  createdAt: string; // ISO timestamp
  isDemoOnly: boolean;
}

export type NotificationKind = 'announcement' | 'clash' | 'ghost_overlap' | 'success';

export interface AppNotification {
  id: string;
  dedupeKey: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  targetDateKey?: string;
  targetClubId?: ClubId;
  isDemoOnly?: boolean;
}

export interface MeetingClashItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  clubId: ClubId;
  isMaskedPrivate?: boolean;
}

export interface ClashCheckResult {
  hasClash: boolean;
  code?: 'MEETING_CLASH';
  conflicts: MeetingClashItem[];
}

export interface GhostOverlapItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  clubId: ClubId;
  isDateOnly: boolean;
  isMaskedPrivate?: boolean;
}
