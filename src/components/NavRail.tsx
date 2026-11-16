import React, { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  X,
  Clock,
  MapPin,
  Megaphone,
  AlertTriangle,
  Check,
  CheckCircle2,
} from "lucide-react";
import {
  Announcement,
  AppNotification,
  CalendarEvent,
  ClubInfo,
  CurrentUser,
  NavSection,
  ThemeMode,
} from "../types/calendar";
import { CLUB_THEME_TOKENS, ThemePalette } from "../theme/calendarTheme";
import { formatTimeRange } from "../utils/dateUtils";
import { canAccessAdminControls, ROLE_LABELS } from "../utils/permissions";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "../services/apiClient";

export interface NavRailProps {
  theme: ThemeMode;
  palette: ThemePalette;
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  currentUser: CurrentUser;
  onToggleTheme: () => void;
  todayEvents: CalendarEvent[];
  clubs: ClubInfo[];
  announcements: Announcement[];
  dismissedAnnouncementIds: string[];
  onDismissAnnouncement: (id: string) => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  onDismissNotification: (id: string) => void;
  onSelectEventFromHeader: (event: CalendarEvent) => void;
  onOpenNotificationDate?: (dateKey: string) => void;
  onLogout: () => void;
}

const RAIL_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "meets", label: "All Meets", icon: ClipboardList },
  { id: "users", label: "Management Portal", icon: Users },
];

export const NavRail: React.FC<NavRailProps> = ({
  theme,
  palette,
  activeNav,
  onSelectNav,
  currentUser,
  onToggleTheme,
  todayEvents,
  clubs,
  announcements,
  dismissedAnnouncementIds,
  onDismissAnnouncement,
  notifications,
  onMarkNotificationRead,
  onDismissNotification,
  onSelectEventFromHeader,
  onOpenNotificationDate,
  onLogout,
}) => {
  const visibleRailItems = RAIL_ITEMS.filter(
    (item) => item.id !== "users" || currentUser.role === "faculty",
  );
  const [openPopover, setOpenPopover] = useState<"bell" | "profile" | null>(
    null,
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = canAccessAdminControls(currentUser);
  const isDark = theme === "dark";

  const handleMouseEnter = () => {
    // Cancel any pending collapse timer
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }

    // After 2 seconds of continuous hover, expand to ~220px
    if (!isExpanded && !expandTimerRef.current) {
      expandTimerRef.current = setTimeout(() => {
        setIsExpanded(true);
        expandTimerRef.current = null;
      }, 250);
    }
  };

  const handleMouseLeave = () => {
    // Cancel any pending expand timer
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }

    // After 1.5 seconds of mouse leave, collapse back to 60px
    if (isExpanded && !collapseTimerRef.current) {
      collapseTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
        collapseTimerRef.current = null;
      }, 200);
    }
  };

  // Clean up any pending timers on unmount
  useEffect(() => {
    return () => {
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenPopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAdmin && openPopover === "bell") {
      setOpenPopover(null);
    }
  }, [isAdmin, openPopover]);

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedAnnouncementIds.includes(a.id),
  );
  const unreadNotificationCount =
    notifications.filter((n) => !n.read).length + visibleAnnouncements.length;
  const hasUnread = unreadNotificationCount > 0 || todayEvents.length > 0;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");
    setPasswordError(false);

    if (newPassword.length < 8) {
      setPasswordError(true);
      setPasswordMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(true);
      setPasswordMessage("New passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);

      await apiFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setPasswordMessage("Password changed successfully. Please log in again.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => onLogout(), 1500);
    } catch (error) {
      setPasswordError(true);
      setPasswordMessage(
        error instanceof Error ? error.message : "Failed to change password.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col shrink-0 md:w-[60px] md:h-full z-30"
    >
      {/* Desktop Permanent Navigation Rail with delayed hover expansion (overlays content) */}
      <nav
        aria-label="Primary navigation rail"
        className={`hidden md:flex flex-col justify-between py-3 rounded-[20px] border transition-[width,box-shadow] duration-300 ease-in-out md:absolute md:top-0 md:left-0 md:h-full md:z-40 ${
          isExpanded ? "w-[220px] px-3" : "w-[60px] px-1.5"
        }`}
        style={{
          background: isDark ? "#171719" : palette.surfaceBackground,
          borderColor: palette.border,
          boxShadow: isExpanded
            ? isDark
              ? "0 10px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)"
              : "0 10px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)"
            : palette.cardShadow,
        }}
      >
        {/* Top: Main Navigation Items */}
        <div className="flex flex-col items-center gap-2 w-full">
          {visibleRailItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectNav(item.id);
                  setOpenPopover(null);
                }}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={`group h-11 rounded-[12px] flex items-center transition-all duration-200 cursor-pointer border border-transparent ${
                  isExpanded
                    ? "w-full px-3 gap-3 justify-start"
                    : "w-11 justify-center"
                } ${
                  isActive
                    ? ""
                    : isDark
                      ? "hover:bg-white/[0.05]"
                      : "hover:bg-black/[0.04]"
                }`}
                style={{
                  backgroundColor: isActive
                    ? palette.navActiveBg
                    : "transparent",
                  color: isActive ? palette.brandSubtitle : palette.textMuted,
                }}
              >
                <Icon
                  className="w-[19px] h-[19px] shrink-0 transition-transform duration-150 group-hover:scale-[1.06]"
                  strokeWidth={isActive ? 2.1 : 1.85}
                />
                {isExpanded && (
                  <span className="text-[13.5px] font-semibold whitespace-nowrap truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom: Migrated Controls (Bell, Theme, Profile / Account) */}
        <div className="flex flex-col items-center gap-2 w-full">
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                setOpenPopover(openPopover === "bell" ? null : "bell")
              }
              title="Notifications and announcements"
              aria-label="Notifications and announcements"
              className={`ts-icon-btn relative h-11 rounded-[12px] flex items-center cursor-pointer transition-all duration-200 border border-transparent ${
                isExpanded
                  ? "w-full px-3 gap-3 justify-start"
                  : "w-11 justify-center"
              } ${
                openPopover === "bell"
                  ? ""
                  : isDark
                    ? "hover:bg-white/[0.06]"
                    : "hover:bg-black/[0.045]"
              }`}
              style={{
                backgroundColor:
                  openPopover === "bell"
                    ? palette.buttonMutedBg
                    : "transparent",
                color:
                  openPopover === "bell"
                    ? palette.textPrimary
                    : palette.textMuted,
              }}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Bell className="w-[18px] h-[18px]" strokeWidth={1.9} />
                {hasUnread && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                    style={{ backgroundColor: palette.accentBg }}
                  />
                )}
              </div>
              {isExpanded && (
                <span className="text-[13px] font-medium whitespace-nowrap truncate">
                  Alerts
                </span>
              )}
              {isExpanded && hasUnread && (
                <span
                  className="ml-auto text-[10.5px] px-1.5 py-0.5 rounded-full font-bold tabular-nums"
                  style={{
                    backgroundColor: palette.accentBg,
                    color: palette.accentText,
                  }}
                >
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            aria-label={
              isDark ? "Switch to light theme" : "Switch to dark theme"
            }
            className={`ts-btn h-11 rounded-[12px] flex items-center cursor-pointer transition-all duration-200 border border-transparent ${
              isExpanded
                ? "w-full px-3 gap-3 justify-start"
                : "w-11 justify-center"
            } ${isDark ? "hover:bg-white/[0.06]" : "hover:bg-black/[0.045]"}`}
            style={{
              backgroundColor: "transparent",
              color: palette.textSecondary,
            }}
          >
            <div className="shrink-0 flex items-center justify-center">
              {isDark ? (
                <Sun className="w-[18px] h-[18px]" strokeWidth={1.9} />
              ) : (
                <Moon className="w-[18px] h-[18px]" strokeWidth={1.9} />
              )}
            </div>
            {isExpanded && (
              <span className="text-[13px] font-medium whitespace-nowrap truncate">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </button>

          {/* User Profile & Account Controls */}
          {isExpanded ? (
            <div
              className="w-full p-2 rounded-[12px] border flex items-center justify-between gap-2 transition-all duration-200"
              style={{
                backgroundColor: palette.surfaceSubtle,
                borderColor: palette.border,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenPopover(openPopover === "profile" ? null : "profile")
                }
                title={`${currentUser.name} · ${ROLE_LABELS[currentUser.role]}`}
                aria-label="Member profile and settings"
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer hover:opacity-85 transition-opacity"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: palette.buttonMutedBg,
                    borderColor: palette.border,
                    color: palette.textSecondary,
                  }}
                >
                  <User className="w-4 h-4" strokeWidth={1.9} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className="text-[12.5px] font-semibold truncate leading-tight"
                    style={{ color: palette.textPrimary }}
                  >
                    {currentUser.name}
                  </span>
                  <span
                    className="text-[10.5px] truncate"
                    style={{ color: palette.textMuted }}
                  >
                    {ROLE_LABELS[currentUser.role]}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Log Out"
                aria-label="Log Out"
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                setOpenPopover(openPopover === "profile" ? null : "profile")
              }
              title={`${currentUser.name} · ${ROLE_LABELS[currentUser.role]}`}
              aria-label="Member profile and settings"
              className={`ts-btn w-11 h-11 rounded-[12px] flex items-center justify-center cursor-pointer transition-all duration-200 border ${
                openPopover === "profile"
                  ? ""
                  : isDark
                    ? "hover:bg-white/[0.06]"
                    : "hover:bg-black/[0.045]"
              }`}
              style={{
                backgroundColor:
                  openPopover === "profile"
                    ? palette.navActiveBg
                    : palette.buttonMutedBg,
                borderColor:
                  openPopover === "profile" ? palette.border : "transparent",
                color:
                  openPopover === "profile"
                    ? palette.textPrimary
                    : palette.textSecondary,
              }}
            >
              <User className="w-[18px] h-[18px]" strokeWidth={1.9} />
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Compact Navigation Bar (Touch-friendly, unaffected by hover) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden flex items-center justify-between gap-1 px-1.5 py-1.5 rounded-[16px] border w-full"
        style={{
          background: isDark ? "#171719" : palette.surfaceBackground,
          borderColor: palette.border,
          boxShadow: palette.cardShadow,
        }}
      >
        {visibleRailItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectNav(item.id);
                setOpenPopover(null);
              }}
              className={`flex-1 min-w-0 py-1.5 px-1 sm:px-2 rounded-[10px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-[10.5px] sm:text-[12px] font-semibold leading-tight transition-colors duration-200 cursor-pointer ${
                isActive
                  ? ""
                  : isDark
                    ? "hover:bg-white/[0.05]"
                    : "hover:bg-black/[0.035]"
              }`}
              style={{
                backgroundColor: isActive ? palette.navActiveBg : "transparent",
                color: isActive ? palette.brandSubtitle : palette.textMuted,
              }}
            >
              <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}

        {/* Mobile Bell Button (Admin only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() =>
              setOpenPopover(openPopover === "bell" ? null : "bell")
            }
            title="Notifications and announcements"
            aria-label="Notifications and announcements"
            className={`py-1.5 px-1 sm:px-2 rounded-[10px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-[10.5px] sm:text-[12px] font-semibold leading-tight transition-colors duration-200 cursor-pointer ${
              openPopover === "bell"
                ? ""
                : isDark
                  ? "hover:bg-white/[0.05]"
                  : "hover:bg-black/[0.035]"
            }`}
            style={{
              backgroundColor:
                openPopover === "bell" ? palette.navActiveBg : "transparent",
              color:
                openPopover === "bell"
                  ? palette.brandSubtitle
                  : palette.textMuted,
            }}
          >
            <span className="relative">
              <Bell className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
              {hasUnread && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: palette.accentBg }}
                />
              )}
            </span>
            <span className="truncate max-w-full hidden sm:inline">Alerts</span>
          </button>
        )}

        {/* Mobile Theme Switcher */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className={`py-1.5 px-1 sm:px-2 rounded-[10px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-[10.5px] sm:text-[12px] font-semibold leading-tight transition-colors duration-200 cursor-pointer ${
            isDark ? "hover:bg-white/[0.05]" : "hover:bg-black/[0.035]"
          }`}
          style={{
            color: palette.textMuted,
          }}
        >
          {isDark ? (
            <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          )}
          <span className="truncate max-w-full hidden sm:inline">Theme</span>
        </button>

        {/* Mobile Profile Button */}
        <button
          type="button"
          onClick={() =>
            setOpenPopover(openPopover === "profile" ? null : "profile")
          }
          title={`${currentUser.name} · ${ROLE_LABELS[currentUser.role]}`}
          aria-label="Member profile"
          className={`py-1.5 px-1 sm:px-2 rounded-[10px] flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-[10.5px] sm:text-[12px] font-semibold leading-tight transition-colors duration-200 cursor-pointer ${
            openPopover === "profile"
              ? ""
              : isDark
                ? "hover:bg-white/[0.05]"
                : "hover:bg-black/[0.035]"
          }`}
          style={{
            backgroundColor:
              openPopover === "profile" ? palette.navActiveBg : "transparent",
            color:
              openPopover === "profile"
                ? palette.brandSubtitle
                : palette.textMuted,
          }}
        >
          <User className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span className="truncate max-w-full hidden sm:inline">Profile</span>
        </button>
      </nav>

      {/* Popover: Notifications, Announcements & Today's Schedule */}
      {isAdmin && openPopover === "bell" && (
        <div
          className={`ts-popover-enter fixed md:absolute top-[68px] md:top-auto right-3 md:right-auto md:bottom-2 ${
            isExpanded ? "md:left-[228px]" : "md:left-[68px]"
          } w-[calc(100vw-24px)] md:w-[350px] max-w-[360px] max-h-[75vh] md:max-h-[80vh] overflow-y-auto ts-scroll rounded-[16px] border p-3.5 z-50 space-y-3`}
          style={{
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            boxShadow: palette.cardShadow,
          }}
        >
          {/* Section 1: Announcements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[12.5px] font-bold inline-flex items-center gap-1.5"
                style={{ color: palette.textPrimary }}
              >
                <Megaphone
                  className="w-3.5 h-3.5"
                  style={{ color: palette.textMuted }}
                />
                <span>Announcements</span>
              </span>
              <button
                type="button"
                onClick={() => setOpenPopover(null)}
                className="p-1 rounded-md cursor-pointer hover:opacity-75"
                style={{ color: palette.textMuted }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {visibleAnnouncements.length === 0 ? (
              <p
                className="text-[11.5px] py-1.5"
                style={{ color: palette.textMuted }}
              >
                No unread announcements.
              </p>
            ) : (
              <div className="space-y-1.5">
                {visibleAnnouncements.slice(0, 4).map((ann) => {
                  const annClub = clubs.find((c) => c.id === ann.clubId);
                  const annTokens = CLUB_THEME_TOKENS[theme][ann.clubId];
                  return (
                    <div
                      key={ann.id}
                      className="p-2.5 rounded-[11px] border"
                      style={{
                        backgroundColor: palette.surfaceSubtle,
                        borderColor: palette.border,
                        borderLeftWidth: "3px",
                        borderLeftColor: annTokens.weekBar,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.06em] uppercase"
                            style={{ color: annTokens.kickerText }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: annTokens.dot }}
                            />
                            <span>
                              {annClub?.shortLabel ?? "ANNOUNCEMENTS"}
                            </span>
                          </span>
                          <p
                            className="text-[12.5px] font-bold leading-snug mt-0.5"
                            style={{ color: palette.textPrimary }}
                          >
                            {ann.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDismissAnnouncement(ann.id)}
                          aria-label="Dismiss announcement"
                          title="Dismiss locally"
                          className="p-0.5 rounded cursor-pointer shrink-0"
                          style={{ color: palette.textMuted }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p
                        className="text-[11.5px] mt-1 leading-relaxed"
                        style={{ color: palette.textSecondary }}
                      >
                        {ann.content}
                      </p>
                      <p
                        className="text-[10.5px] mt-1.5 tabular-nums"
                        style={{ color: palette.textMuted }}
                      >
                        {ann.publisherName} ·{" "}
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Scheduling Alerts & Updates */}
          {notifications.length > 0 && (
            <div
              className="pt-2.5 border-t"
              style={{ borderColor: palette.gridLine }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[12.5px] font-bold"
                  style={{ color: palette.textPrimary }}
                >
                  Calendar Alerts
                </span>
                <span
                  className="text-[10.5px]"
                  style={{ color: palette.textMuted }}
                >
                  {notifications.filter((n) => !n.read).length} unread
                </span>
              </div>
              <div className="space-y-1.5">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    className="p-2.5 rounded-[10px] border transition-colors"
                    style={{
                      backgroundColor: notif.read
                        ? "transparent"
                        : palette.surfaceSubtle,
                      borderColor: palette.border,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onMarkNotificationRead(notif.id);
                          if (notif.targetDateKey && onOpenNotificationDate) {
                            onOpenNotificationDate(notif.targetDateKey);
                            setOpenPopover(null);
                          }
                        }}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          {notif.kind === "success" ? (
                            <CheckCircle2
                              className="w-3.5 h-3.5 shrink-0"
                              style={{ color: palette.textSecondary }}
                            />
                          ) : (
                            <AlertTriangle
                              className="w-3.5 h-3.5 shrink-0"
                              style={{
                                color:
                                  notif.kind === "clash"
                                    ? palette.mandatoryBadgeText
                                    : palette.textSecondary,
                              }}
                            />
                          )}
                          <span
                            className="text-[12px] font-semibold truncate"
                            style={{ color: palette.textPrimary }}
                          >
                            {notif.title}
                          </span>
                        </div>
                        <p
                          className="text-[11px] mt-0.5 leading-snug"
                          style={{ color: palette.textMuted }}
                        >
                          {notif.message}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            title="Mark as read"
                            className="p-0.5 rounded cursor-pointer"
                            style={{ color: palette.textMuted }}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDismissNotification(notif.id)}
                          title="Dismiss"
                          className="p-0.5 rounded cursor-pointer"
                          style={{ color: palette.textMuted }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Today's Schedule */}
          <div
            className="pt-2.5 border-t"
            style={{ borderColor: palette.gridLine }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[12.5px] font-bold"
                style={{ color: palette.textPrimary }}
              >
                Today&apos;s Schedule
              </span>
              <span
                className="text-[11px] tabular-nums"
                style={{ color: palette.textMuted }}
              >
                {todayEvents.length}{" "}
                {todayEvents.length === 1 ? "event" : "events"}
              </span>
            </div>
            {todayEvents.length === 0 ? (
              <p
                className="text-[11.5px] py-1"
                style={{ color: palette.textMuted }}
              >
                No scheduled club meetings today.
              </p>
            ) : (
              <div className="space-y-1.5">
                {todayEvents.map((ev) => {
                  const clubTokens = CLUB_THEME_TOKENS[theme][ev.clubId];
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        onSelectEventFromHeader(ev);
                        setOpenPopover(null);
                      }}
                      className="w-full text-left p-2.5 rounded-[10px] border transition-colors cursor-pointer"
                      style={{
                        backgroundColor: palette.surfaceSubtle,
                        borderColor: palette.border,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[12.5px] font-semibold truncate"
                          style={{ color: palette.textPrimary }}
                        >
                          {ev.title}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: clubTokens.dot }}
                        />
                      </div>
                      <div
                        className="flex items-center gap-3 mt-1 text-[11px] tabular-nums"
                        style={{ color: palette.textMuted }}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeRange(ev.startTime, ev.endTime)}
                        </span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {ev.location}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popover: Profile + Clearly Marked Demo Role Switcher + Logout */}
      {openPopover === "profile" && (
        <div
          className={`ts-popover-enter fixed md:absolute top-[68px] md:top-auto right-3 md:right-auto md:bottom-2 ${
            isExpanded ? "md:left-[228px]" : "md:left-[68px]"
          } w-[calc(100vw-24px)] md:w-[280px] max-w-[290px] rounded-[16px] border p-3.5 z-50`}
          style={{
            backgroundColor: palette.surfaceElevated,
            borderColor: palette.border,
            boxShadow: palette.cardShadow,
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-[13.5px] font-bold"
                style={{ color: palette.textPrimary }}
              >
                {currentUser.name}
              </p>
              <p
                className="text-[11.5px] mt-0.5"
                style={{ color: palette.textMuted }}
              >
                {ROLE_LABELS[currentUser.role]} · PST
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenPopover(null)}
              className="p-1 rounded-md cursor-pointer hover:opacity-75"
              style={{ color: palette.textMuted }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="mt-3 pt-2.5 border-t"
            style={{ borderColor: palette.border }}
          >
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((prev) => !prev);
                setPasswordMessage("");
              }}
              className="w-full flex items-center justify-between text-left py-1 cursor-pointer"
              style={{ color: palette.textPrimary }}
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold">
                <KeyRound className="w-3.5 h-3.5" />
                Change Password
              </span>
              <span
                className="text-[11px]"
                style={{ color: palette.textMuted }}
              >
                {showPasswordForm ? "Close" : "Change"}
              </span>
            </button>

            {showPasswordForm && (
              <form
                onSubmit={handleChangePassword}
                className="mt-3 space-y-2.5"
              >
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                />

                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min. 8 characters)"
                  className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                />

                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border px-3 py-2 text-[12px] outline-none"
                  style={{
                    backgroundColor: palette.surfaceSubtle,
                    borderColor: palette.border,
                    color: palette.textPrimary,
                  }}
                />

                {passwordMessage && (
                  <p
                    className="text-[11px]"
                    style={{ color: passwordError ? "#dc2626" : "#16a34a" }}
                  >
                    {passwordMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full rounded-lg py-2 text-[12px] font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: palette.navActiveBg,
                    color: palette.textPrimary,
                  }}
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>

          <div
            className="mt-3 pt-2.5 border-t flex items-center justify-between"
            style={{ borderColor: palette.border }}
          >
            <span
              className="text-[12px]"
              style={{ color: palette.textSecondary }}
            >
              Appearance
            </span>
            <button
              type="button"
              onClick={onToggleTheme}
              className="ts-btn text-[12px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer"
              style={{
                backgroundColor: palette.buttonMutedBg,
                color: palette.textPrimary,
              }}
            >
              {isDark ? "Dark" : "Light"}
            </button>
          </div>

          {/* Logout Button */}
          <div
            className="mt-2.5 pt-2 border-t"
            style={{ borderColor: palette.border }}
          >
            <button
              type="button"
              onClick={() => {
                setOpenPopover(null);
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[9px] text-[12px] font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
