import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Crown,
  UserRound,
  UsersRound,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "../services/apiClient";
import { getCurrentUser } from "../services/authService";
import "./UserManagement.css";

const ROLE_OPTIONS = [
  { value: "faculty", label: "Faculty" },
  { value: "ob", label: "Office Bearer" },
  { value: "executive", label: "Executive" },
  { value: "team_lead", label: "Team Lead" },
  { value: "member", label: "Member" },
];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "member",
  obTitle: "",
  teams: [],
};

const roleLabel = (role) =>
  ROLE_OPTIONS.find((item) => item.value === role)?.label || role;
const roleClass = (role) =>
  role === "ob" ? "office-bearer" : role.replaceAll("_", "-");
const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function getErrorMessage(error) {
  if (error?.code === "CONFLICT")
    return (
      error.message ||
      "This email is already in use, or this action would remove the last Faculty account."
    );
  if (error?.code === "FORBIDDEN")
    return "You do not have permission to perform this action. Faculty access is required.";
  if (error?.code === "NOT_FOUND")
    return "The selected user or team could not be found. Refresh and try again.";
  if (error?.code === "VALIDATION_ERROR") {
    const details = error?.data?.error?.details || error?.data?.details;
    if (Array.isArray(details) && details.length)
      return details.map((item) => `${item.field}: ${item.issue}`).join("; ");
  }
  return error?.message || "Something went wrong. Please try again.";
}

export default function UserManagement({ theme = "light" }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const isFaculty = currentUser?.role === "faculty";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [me, userResult, teamResult] = await Promise.all([
        getCurrentUser(),
        apiFetch("/api/v1/users?page=1&limit=100"),
        apiFetch("/api/v1/teams"),
      ]);
      setCurrentUser(me);
      setUsers(userResult?.items || []);
      setTeams(teamResult?.items || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const facultyCount = users.filter((user) => user.role === "faculty").length;
  const obCount = users.filter((user) => user.role === "ob").length;
  const teamLeadCount = users.filter(
    (user) => user.role === "team_lead",
  ).length;

  const openAddModal = () => {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, teams: [] });
    setModalError("");
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role,
      obTitle: user.obTitle || "",
      teams: (user.teams || []).map((team) => ({
        teamId: team.teamId,
        position: team.position || "member",
      })),
    });
    setModalError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingUser(null);
    setForm({ ...EMPTY_FORM, teams: [] });
    setModalError("");
  };

  const toggleTeam = (teamId) => {
    setForm((prev) => {
      const exists = prev.teams.some((team) => team.teamId === teamId);
      return {
        ...prev,
        teams: exists
          ? prev.teams.filter((team) => team.teamId !== teamId)
          : [
              ...prev.teams,
              {
                teamId,
                position: prev.role === "team_lead" ? "lead" : "member",
              },
            ],
      };
    });
  };

  const updateTeamPosition = (teamId, position) => {
    setForm((prev) => ({
      ...prev,
      teams: prev.teams.map((team) =>
        team.teamId === teamId ? { ...team, position } : team,
      ),
    }));
  };

  const handleRoleChange = (role) => {
    setForm((prev) => ({
      ...prev,
      role,
      obTitle: role === "ob" ? prev.obTitle : "",
      teams: prev.teams.map((team) => ({
        ...team,
        position:
          role === "team_lead"
            ? team.position === "lead" || team.position === "colead"
              ? team.position
              : "lead"
            : "member",
      })),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setModalError("");
    if (!isFaculty) return setModalError("Only Faculty can manage users.");
    if (!form.name.trim() || !form.email.trim())
      return setModalError("Name and email are required.");
    if (!editingUser && form.password.length < 8)
      return setModalError("Password must be at least 8 characters.");
    if (
      form.role === "team_lead" &&
      !form.teams.some(
        (team) => team.position === "lead" || team.position === "colead",
      )
    ) {
      return setModalError(
        "A Team Lead must be assigned as Lead or Co-lead to at least one team.",
      );
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      teams: form.teams.map(({ teamId, position }) => ({ teamId, position })),
    };
    if (form.role === "ob") payload.obTitle = form.obTitle.trim();
    if (form.password.trim()) payload.password = form.password;

    setSaving(true);
    try {
      if (editingUser) {
        const changed = {};
        for (const key of [
          "name",
          "email",
          "role",
          "obTitle",
          "teams",
          "password",
        ]) {
          if (key === "password" && !payload.password) continue;
          if (key === "obTitle" && payload.role !== "ob") continue;
          const oldValue =
            key === "teams"
              ? (editingUser.teams || []).map(({ teamId, position }) => ({
                  teamId,
                  position,
                }))
              : key === "obTitle"
                ? editingUser.obTitle || ""
                : (editingUser[key] ?? "");
          const newValue =
            key === "teams"
              ? payload.teams
              : key === "obTitle"
                ? payload.obTitle || ""
                : payload[key];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue))
            changed[key] = newValue;
        }
        if (payload.role !== "ob" && editingUser.role === "ob")
          changed.role = payload.role;
        if (Object.keys(changed).length === 0) {
          setShowModal(false);
          setEditingUser(null);
          setForm({ ...EMPTY_FORM, teams: [] });
          return;
        }
        await apiFetch(`/api/v1/users/${editingUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(changed),
        });
      } else {
        await apiFetch("/api/v1/users", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      setEditingUser(null);
      setForm({ ...EMPTY_FORM, teams: [] });
      await loadData();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!isFaculty) return setError("Only Faculty can delete users.");
    if (
      !window.confirm(
        `Delete ${user.name}? This will disable their account and remove them from all teams.`,
      )
    )
      return;
    setDeletingId(user.id);
    setError("");
    try {
      await apiFetch(`/api/v1/users/${user.id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className={`dashboard-page dashboard-minimal um-page ${theme === "dark" ? "dashboard-dark um-dark" : ""}`}
    >
      <div className="um-welcome">
        <div>
          <span className="um-kicker">FACULTY WORKSPACE</span>
          <h1>Management Portal</h1>
          <p>Manage TechSpace members, roles and team assignments.</p>
        </div>
        {isFaculty && (
          <button className="um-primary-btn" onClick={openAddModal}>
            <UserPlus size={16} />
            Add New User
          </button>
        )}
      </div>

      {error && (
        <div className="um-feedback um-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <section className="um-stats">
        <div className="um-stat-card">
          <div className="um-stat-icon blue">
            <Users size={18} />
          </div>
          <div>
            <span>Total Users</span>
            <strong>{users.length}</strong>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon purple">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span>Faculty</span>
            <strong>{facultyCount}</strong>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon purple">
            <Crown size={18} />
          </div>
          <div>
            <span>Office Bearers</span>
            <strong>{obCount}</strong>
          </div>
        </div>
        <div className="um-stat-card">
          <div className="um-stat-icon teal">
            <UsersRound size={18} />
          </div>
          <div>
            <span>Team Leads</span>
            <strong>{teamLeadCount}</strong>
          </div>
        </div>
      </section>

      <section className="um-panel">
        <div className="um-panel-heading">
          <div>
            <span className="um-eyebrow">SOCIETY DIRECTORY</span>
            <h2>All Users</h2>
          </div>
          <div className="um-directory-controls">
            <div className="um-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="um-filter">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter users by role"
              >
                <option value="all">All Roles</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <button
              className="um-refresh"
              onClick={loadData}
              title="Refresh users"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>TEAM ASSIGNMENT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="um-empty">
                    <LoaderCircle className="um-spin" size={24} />
                    <strong>Loading users...</strong>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="um-user">
                        <div className="um-avatar">{initials(user.name)}</div>
                        <div className="um-user-details">
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`um-role ${roleClass(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                      {user.role === "ob" && user.obTitle && (
                        <div className="um-user-subtitle">{user.obTitle}</div>
                      )}
                    </td>
                    <td>
                      <div className="um-teams">
                        {user.teams?.length ? (
                          user.teams.map((team) => (
                            <span key={team.teamId}>
                              {team.teamName}
                              {team.position && team.position !== "member"
                                ? ` · ${team.position === "colead" ? "Co-lead" : "Lead"}`
                                : ""}
                            </span>
                          ))
                        ) : (
                          <span className="um-no-team">Not assigned</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="um-actions">
                        {isFaculty && (
                          <>
                            <button
                              title="Edit user"
                              onClick={() => openEditModal(user)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              title="Delete user"
                              className="um-delete"
                              disabled={deletingId === user.id}
                              onClick={() => deleteUser(user)}
                            >
                              {deletingId === user.id ? (
                                <LoaderCircle className="um-spin" size={15} />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="4" className="um-empty">
                    <UserRound size={26} />
                    <strong>No users found</strong>
                    <span>Try changing your search or role filter.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="um-table-footer">
          Showing {filteredUsers.length} of {users.length} users
          {!isFaculty && currentUser && " · View only access"}
        </div>
      </section>

      {showModal && (
        <div
          className="um-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="um-modal">
            <div className="um-modal-heading">
              <div>
                <span className="um-eyebrow">USER DETAILS</span>
                <h2>{editingUser ? "Edit User" : "Add New User"}</h2>
                <p>
                  {editingUser
                    ? "Update the user's information and assignments."
                    : "Create a new TechSpace user account."}
                </p>
              </div>
              <button className="um-close" onClick={closeModal} type="button">
                <X size={18} />
              </button>
            </div>
            {modalError && (
              <div className="um-feedback um-error" role="alert">
                {modalError}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label>
                Full Name
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  placeholder="Enter full name"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </label>
              <label>
                Email Address
                <input
                  required
                  type="email"
                  value={form.email}
                  placeholder="Enter email address"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </label>
              <label>
                {editingUser ? "New Password (optional)" : "Password"}
                <input
                  type="password"
                  required={!editingUser}
                  minLength={8}
                  maxLength={100}
                  value={form.password}
                  placeholder={
                    editingUser
                      ? "Leave blank to keep current password"
                      : "At least 8 characters"
                  }
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </label>
              <label>
                User Role
                <select
                  value={form.role}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              {form.role === "ob" && (
                <label>
                  Office Bearer Title
                  <input
                    maxLength={100}
                    value={form.obTitle}
                    placeholder="e.g. President"
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, obTitle: e.target.value }))
                    }
                  />
                </label>
              )}
              <div className="um-form-label">Assign Teams</div>
              <div className="um-team-options">
                {teams.map((team) => {
                  const assignment = form.teams.find(
                    (item) => item.teamId === team.id,
                  );
                  return (
                    <div className="um-team-option-wrap" key={team.id}>
                      <label className="um-team-option">
                        <input
                          type="checkbox"
                          checked={Boolean(assignment)}
                          onChange={() => toggleTeam(team.id)}
                        />
                        {team.name}
                      </label>
                      {assignment && (
                        <select
                          className="um-team-position"
                          aria-label={`${team.name} position`}
                          value={assignment.position}
                          onChange={(e) =>
                            updateTeamPosition(team.id, e.target.value)
                          }
                        >
                          <option value="member">Member</option>
                          {form.role === "team_lead" && (
                            <>
                              <option value="lead">Lead</option>
                              <option value="colead">Co-lead</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>
                  );
                })}
                {teams.length === 0 && (
                  <span className="um-no-team">No teams available.</span>
                )}
              </div>
              <div className="um-modal-actions">
                <button
                  type="button"
                  className="um-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="um-primary-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="um-spin" size={15} /> Saving...
                    </>
                  ) : editingUser ? (
                    "Save Changes"
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
