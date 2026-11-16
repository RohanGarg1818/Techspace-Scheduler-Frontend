import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import "../dashboard.css";
import "../dashboard-responsive.css";
import { teams } from "../data/dashboardData";

const isPastMeeting = (meeting) =>
  meeting.date && meeting.date < new Date().toISOString().slice(0, 10);

function MiniCalendar({ meetings, onViewCalendar }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const meetingDays = new Set(
    meetings.map((meeting) => meeting.date).filter(Boolean),
  );
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <section className="panel mini-calendar-panel">
      <div className="panel-heading">
        <div>
          <span className="minimal-kicker">MARK YOUR CALENDAR</span>
          <h2>Calendar</h2>
        </div>
        <button className="subtle-link" onClick={onViewCalendar}>
          View your calendar <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="mini-calendar-month">
        <button
          aria-label="Previous month"
          onClick={() => setMonthDate(new Date(year, month - 1, 1))}
        >
          <ChevronLeft size={16} />
        </button>
        <strong>
          {monthDate.toLocaleString("en", { month: "long", year: "numeric" })}
        </strong>
        <button
          aria-label="Next month"
          onClick={() => setMonthDate(new Date(year, month + 1, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="mini-calendar-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
          <span className="weekday" key={`${day}-${i}`}>
            {day}
          </span>
        ))}
        {cells.map((day, i) => {
          const key = day
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            : `blank-${i}`;
          const today =
            day &&
            new Date(year, month, day).toDateString() ===
              new Date().toDateString();
          return (
            <span
              key={key}
              className={`${day ? "calendar-day" : "empty-day"} ${today ? "today" : ""} ${day && meetingDays.has(key) ? "has-meeting" : ""}`}
            >
              {day || ""}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function MeetingCard({ meeting, onEdit, onUpdateMom, canEdit }) {
  return (
    <article className="dashboard-meeting-row">
      <div className="meeting-date">
        <strong>{meeting.day || meeting.date?.slice(8, 10)}</strong>
        <span>
          {meeting.month ||
            new Date(`${meeting.date}T00:00:00`)
              .toLocaleString("en", { month: "short" })
              .toUpperCase()}
        </span>
      </div>
      <div className="meeting-main">
        <h3>{meeting.title || meeting.topic}</h3>
        <span className={`team-pill ${meeting.tone || "blue"}`}>
          {meeting.team || "Society"}
        </span>
        <div className="meeting-meta">
          <span>
            <Clock3 size={13} />
            {meeting.time || "Time TBA"}
          </span>
          <span>
            <MapPin size={13} />
            {meeting.place || "Location TBA"}
          </span>
        </div>
      </div>
      <div className="meeting-actions">
        {canEdit && (
          <button
            className="icon-action"
            title="Edit meeting"
            onClick={() => onEdit(meeting)}
          >
            <Pencil size={15} />
          </button>
        )}
        {meeting.momUrl || meeting.mom ? (
          /^https?:\/\//i.test(meeting.momUrl || meeting.mom) ? (
            <a
              className="mom-upload-button"
              href={meeting.momUrl || meeting.mom}
              target="_blank"
              rel="noreferrer"
              title="Open meeting MOM"
            >
              <Upload size={14} /> View MOM
            </a>
          ) : (
            <span className="mom-upload-button" title="MOM notes saved">
              <Upload size={14} /> MOM added
            </span>
          )
        ) : null}
        {onUpdateMom && isPastMeeting(meeting) && (
          <button
            type="button"
            className="mom-upload-button"
            title={
              meeting.momUrl || meeting.mom
                ? "Update MOM link or notes"
                : "Add MOM link or notes"
            }
            onClick={() => {
              const value = window.prompt(
                "Paste the MOM document link (Google Drive, OneDrive, etc.) or enter meeting notes:",
                meeting.momUrl || meeting.mom || "",
              );
              if (value !== null) onUpdateMom(meeting, value);
            }}
          >
            <Upload size={14} />{" "}
            {meeting.momUrl || meeting.mom ? "Update MOM" : "Add MOM"}
          </button>
        )}
      </div>
    </article>
  );
}

function MeetingPanel({
  meetings,
  onCreate,
  onEdit,
  canCreate,
  canEdit,
  onUpdateMom,
  title = "Upcoming Meetings",
}) {
  return (
    <section className="panel meetings-panel dashboard-scroll-panel">
      <div className="panel-heading">
        <div>
          <span className="minimal-kicker">YOUR SCHEDULE</span>
          <h2>{title}</h2>
        </div>
        {canCreate && (
          <button className="compact-create-btn" onClick={onCreate}>
            <Plus size={14} /> Create meeting
          </button>
        )}
      </div>
      <div className="dashboard-scroll-content">
        {meetings.length ? (
          meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onEdit={onEdit}
              onUpdateMom={onUpdateMom}
              canEdit={canEdit}
            />
          ))
        ) : (
          <p className="dashboard-empty">No meetings to show yet.</p>
        )}
      </div>
    </section>
  );
}

/**
 * @param {{
 *   announcements?: import("../types/calendar").Announcement[],
 *   canDeleteAnnouncement?: (announcement: import("../types/calendar").Announcement) => boolean,
 *   onDeleteAnnouncement?: (announcement: import("../types/calendar").Announcement) => void,
 *   [key: string]: any
 * }} props
 */

export default function Dashboard({
  user,
  role,
  meetings = [],
  onViewCalendar = () => {},
  theme = "light",
  onNavigateCalendar,
  announcements = [],
  onOpenAdminModal,
  onEditMeeting,
  onUpdateEventMom,
  canCreateMeeting = false,
  canPublishAnnouncement = false,
  canDeleteAnnouncement = () => false,
  onDeleteAnnouncement,
}) {
  const [visiblePastCount, setVisiblePastCount] = useState(8);
  const [tasks, setTasks] = useState([
    {
      id: "task1",
      teamId: "t1",
      title: "Complete Dashboard UI",
      status: "In Progress",
      dueDate: "2026-11-18",
    },
    {
      id: "task2",
      teamId: "t1",
      title: "Fix Frontend Bugs",
      status: "Pending",
      dueDate: "2026-11-20",
    },
    {
      id: "task3",
      teamId: "t1",
      title: "Review Team Progress",
      status: "Completed",
      dueDate: "2026-11-12",
    },
    {
      id: "task4",
      teamId: "t1",
      title: "Update Project Documentation",
      status: "Pending",
      dueDate: "2026-11-22",
    },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const canManageMeetings =
    role === "Office Bearer" || role === "Faculty" || role === "Team Lead";
  const isOBOrFaculty = role === "Office Bearer" || role === "Faculty";
  const isFaculty = role === "Faculty";
  const isExecutive = role === "Executive";
  const isTeamLead = role === "Team Lead";
  const isMember = role === "Member";

  const memberTeam = isMember
    ? teams.find((team) => team.id === user?.teams?.[0]?.teamId)
    : null;

  const memberTeamTasks = tasks.filter(
    (task) => task.teamId === memberTeam?.id,
  );

  const memberCurrentTask = memberTeamTasks
    .filter((task) => task.status === "In Progress")
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
  const leadTeam = isTeamLead
    ? teams.find((team) => team.id === user?.teams?.[0]?.teamId)
    : null;
  const myTeamTasks = tasks.filter((task) => task.teamId === leadTeam?.id);
  const currentTask = myTeamTasks
    .filter((task) => task.status === "In Progress")
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
  // App.tsx already supplies the meetings visible to the signed-in user.
  // Do not filter by the old demo team IDs here: backend team IDs and calendar
  // club IDs are different identifier systems.
  const meetingList = meetings;

  const upcomingMine = meetingList
    .filter((meeting) => !isPastMeeting(meeting) && !meeting.cancelled)
    .sort((a, b) => {
      const dateOrder = (a.date || "").localeCompare(b.date || "");
      return dateOrder || (a.time || "").localeCompare(b.time || "");
    });

  const pastMine = meetingList
    .filter(isPastMeeting)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const pendingMom = canManageMeetings
    ? meetingList.filter(
        (meeting) =>
          isPastMeeting(meeting) &&
          !(meeting.momUrl || meeting.mom || meeting.momUploaded),
      )
    : [];
  const coreTeams = teams.filter((team) => team.type === "core");
  const subClubs = teams.filter((team) => team.type === "subclub");
  const greetingName = user?.name || "there";
  const roleLabel = role === "Faculty" ? "Faculty" : role;
  const calendarAction = onNavigateCalendar || onViewCalendar || (() => {});
  const pastVisible = useMemo(
    () => pastMine.slice(0, visiblePastCount),
    [pastMine, visiblePastCount],
  );

  return (
    <div
      className={`dashboard-page ${theme === "dark" ? "dashboard-dark" : ""}`}
      id="dashboard"
    >
      <main className="page-content dashboard-minimal">
        <section className="minimal-welcome">
          <div>
            <h1>Hello, {greetingName}!</h1>
            <p>You're logged in as {roleLabel}</p>
          </div>
        </section>

        {isTeamLead && leadTeam && (
          <div className="team-overview-grid">
            <section className="panel team-details-panel">
              <div className="panel-heading">
                <div>
                  <span className="minimal-kicker">YOUR TEAM</span>
                  <h2>{leadTeam.name}</h2>
                </div>
                <span className="team-pill blue">Team Lead</span>
              </div>
              <p>{leadTeam.description}</p>
            </section>

            <section className="panel current-task-panel">
              <div className="current-task-heading">
                <span className="minimal-kicker">CURRENT TASK</span>
                {currentTask && (
                  <span className="current-task-status">In Progress</span>
                )}
              </div>

              {currentTask ? (
                <>
                  <h2>{currentTask.title}</h2>
                  <p>
                    Due:{" "}
                    {currentTask.dueDate
                      ? new Date(
                          `${currentTask.dueDate}T00:00:00`,
                        ).toLocaleDateString("en-GB")
                      : "Not set"}
                  </p>
                </>
              ) : (
                <p className="current-task-empty">No active task</p>
              )}
            </section>
          </div>
        )}
        {isMember && memberTeam && (
          <section className="team-overview-grid">
            <section className="panel team-details-panel">
              <div className="panel-heading">
                <div>
                  <span className="minimal-kicker">YOUR TEAM</span>
                  <h2>{memberTeam.name}</h2>
                </div>
                <span className="team-pill teal">Member</span>
              </div>
              <p>{memberTeam.description}</p>
            </section>

            <section className="panel current-task-panel">
              <div className="current-task-heading">
                <span className="minimal-kicker">CURRENT TASK</span>
                {memberCurrentTask && (
                  <span className="current-task-status">In Progress</span>
                )}
              </div>

              {memberCurrentTask ? (
                <>
                  <h2>{memberCurrentTask.title}</h2>
                  <p>
                    Due:{" "}
                    {memberCurrentTask.dueDate
                      ? new Date(
                          `${memberCurrentTask.dueDate}T00:00:00`,
                        ).toLocaleDateString("en-GB")
                      : "Not set"}
                  </p>
                </>
              ) : (
                <p className="current-task-empty">No active task</p>
              )}
            </section>
          </section>
        )}
        {isExecutive && (
          <section className="executive-overview-grid">
            {/* Society Overview */}
            <section className="panel team-details-panel">
              <div className="panel-heading">
                <div>
                  <span className="minimal-kicker">SOCIETY OVERVIEW</span>
                  <h2>TechSpace</h2>
                </div>
                <span className="team-pill blue">Executive</span>
              </div>

              <p>Stay connected with society teams, meetings and activities.</p>
            </section>

            {/* Current Responsibility */}
            <section className="panel current-task-panel">
              <div className="current-task-heading">
                <span className="minimal-kicker">YOUR RESPONSIBILITY</span>
              </div>

              <h2>Society Coordination</h2>

              <p>
                Stay updated with team activities and important society updates.
              </p>
            </section>
          </section>
        )}

        {canPublishAnnouncement && (
          <section className="panel announcement-panel">
            <div className="panel-heading">
              <div>
                <span className="minimal-kicker">FACULTY UPDATES</span>
                <h2>Announcements</h2>
              </div>

              <button
                className="compact-create-btn"
                onClick={() => onOpenAdminModal?.("announcement")}
              >
                <Plus size={14} /> Make Announcement
              </button>
            </div>

            <div className="announcement-list">
              {announcements && announcements.length > 0 ? (
                announcements.map((item) => (
                  <article className="announcement-card" key={item.id}>
                    <div className="announcement-card-content">
                      <h3>{item.title}</h3>

                      <p>{item.content || item.description}</p>

                      <span>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-IN")
                          : item.date || "Just now"}{" "}
                        · {item.publisherName || item.postedBy || "TechSpace"}
                      </span>
                    </div>

                    {canDeleteAnnouncement(item) && (
                      <button
                        type="button"
                        className="icon-action"
                        title="Delete announcement"
                        aria-label={`Delete ${item.title}`}
                        onClick={() => onDeleteAnnouncement?.(item)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">
                  Important society announcements will appear here.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="dashboard-primary-grid">
          <MiniCalendar meetings={meetings} onViewCalendar={calendarAction} />
          <MeetingPanel
            meetings={upcomingMine}
            onCreate={() => onOpenAdminModal?.("meeting")}
            onEdit={(meeting) => onEditMeeting?.(meeting)}
            onUpdateMom={(meeting, value) =>
              onUpdateEventMom?.(meeting.id, value)
            }
            canCreate={canCreateMeeting}
            canEdit={canManageMeetings}
          />
        </section>

        {isTeamLead && leadTeam && (
          <section className="panel team-tasks-panel">
            <div className="panel-heading">
              <div>
                <span className="minimal-kicker">TEAM MANAGEMENT</span>
                <h2>Team Tasks</h2>
              </div>
              <span className="past-meeting-count">
                {myTeamTasks.length} Tasks
              </span>
            </div>

            <form
              className="team-task-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newTaskTitle.trim() || !newTaskDueDate) return;

                setTasks((previous) => [
                  {
                    id: Date.now(),
                    teamId: leadTeam.id,
                    title: newTaskTitle.trim(),
                    status: "Pending",
                    dueDate: newTaskDueDate,
                  },
                  ...previous,
                ]);
                setNewTaskTitle("");
                setNewTaskDueDate("");
              }}
            >
              <input
                type="text"
                placeholder="Enter task name"
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                required
              />
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(event) => setNewTaskDueDate(event.target.value)}
                required
              />
              <button className="compact-create-btn" type="submit">
                <Plus size={14} /> Add Task
              </button>
            </form>

            <div className="team-task-list">
              {myTeamTasks.length ? (
                myTeamTasks.map((task) => (
                  <article className="team-task-card" key={task.id}>
                    <div className="team-task-details">
                      <h3>{task.title}</h3>
                      <span>
                        Due:{" "}
                        {new Date(
                          `${task.dueDate}T00:00:00`,
                        ).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <select
                      aria-label={`Status for ${task.title}`}
                      value={task.status}
                      onChange={(event) =>
                        setTasks((previous) =>
                          previous.map((item) =>
                            item.id === task.id
                              ? { ...item, status: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </article>
                ))
              ) : (
                <p className="dashboard-empty">No tasks added yet.</p>
              )}
            </div>
          </section>
        )}

        {canManageMeetings && (
          <section className="panel mom-panel">
            <div className="panel-heading">
              <div>
                <span className="minimal-kicker">MEETING DOCUMENTATION</span>
                <h2>Add MOM for Meetings</h2>
              </div>
            </div>
            <div className="mom-list">
              {pendingMom.length ? (
                pendingMom.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onUpdateMom={(item, value) =>
                      onUpdateEventMom?.(item.id, value)
                    }
                  />
                ))
              ) : (
                <p className="dashboard-empty">
                  All meetings have their MOM uploaded.
                </p>
              )}
            </div>
          </section>
        )}

        {isOBOrFaculty && (
          <section className="teams-section minimal-teams society-groups">
            <div className="minimal-section-heading">
              <div>
                <span className="minimal-kicker">SOCIETY GROUPS</span>
                <h2>Teams & Sub-Clubs</h2>
              </div>
            </div>
            <div className="society-groups-grid">
              <article className="society-group-card">
                <h3>Core Teams</h3>
                <div className="society-group-list">
                  {coreTeams.map((team) => (
                    <article className="society-club-card" key={team.id}>
                      <h4>{team.name}</h4>
                      <p>
                        {team.description ||
                          "Club information will be added soon."}
                      </p>
                    </article>
                  ))}
                </div>
              </article>
              <article className="society-group-card">
                <h3>Sub-Clubs</h3>
                <div className="society-group-list">
                  {subClubs.map((team) => (
                    <article className="society-club-card" key={team.id}>
                      <h4>{team.name}</h4>
                      <p>
                        {team.description ||
                          "Club information will be added soon."}
                      </p>
                    </article>
                  ))}
                </div>
              </article>
            </div>
          </section>
        )}
        <section className="panel past-meetings-panel">
          <div className="panel-heading">
            <div>
              <span className="minimal-kicker">YOUR HISTORY</span>
              <h2>Past Meetings</h2>
            </div>
            <span className="past-meeting-count">
              {pastMine.length} meetings
            </span>
          </div>
          <div
            className="past-meetings-scroll"
            onScroll={(event) => {
              const el = event.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30)
                setVisiblePastCount((count) =>
                  Math.min(count + 8, pastMine.length),
                );
            }}
          >
            {pastVisible.length ? (
              pastVisible.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))
            ) : (
              <p className="dashboard-empty">
                Your past meetings will appear here.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
