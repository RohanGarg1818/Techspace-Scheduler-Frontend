// Service for fetching TechSpace teams from the backend and providing a lookup
// between the frontend static ClubId values and the backend team UUIDs.
// Backend endpoint: GET /api/v1/teams returns { items: Team[] } where each Team has
// an `id` (UUID) and a `name` (human readable, e.g. "Core Team").
// The frontend UI works with ClubId literals defined in src/types/calendar.ts
// ("core-team", "web-dev", "design", "operations", "announcements").
// This module builds bidirectional maps to translate between them.

import { apiFetch } from "./apiClient";

/** Minimal representation of a backend team. */
export interface Team {
  id: string; // UUID
  name: string; // e.g. "Core Team", "Web Dev"
}

let cachedTeams: Team[] | null = null;
let clubIdToTeamId: Record<string, string> = {};
let teamIdToClubId: Record<string, string> = {};

/** Fetch teams from the backend (or return cached copy). */
export async function fetchTeams(): Promise<Team[]> {
  if (cachedTeams) return cachedTeams;
  const data = await apiFetch<{ items: Team[] }>("/api/v1/teams");
  cachedTeams = data.items;
  // Build lookup tables.
  clubIdToTeamId = {};
  teamIdToClubId = {};
  cachedTeams.forEach((team) => {
    const normalized = team.name.toLowerCase().replace(/\s+/g, "-");
    clubIdToTeamId[normalized] = team.id;
    teamIdToClubId[team.id] = normalized;

    // Handle common alias variations between UI static ids and backend names
    if (normalized === 'tech-team' || normalized === 'core-team') {
      clubIdToTeamId['core-team'] = team.id;
      teamIdToClubId[team.id] = 'core-team';
    } else if (normalized === 'design-club' || normalized === 'design') {
      clubIdToTeamId['design'] = team.id;
      teamIdToClubId[team.id] = 'design';
    } else if (normalized === 'operations-club' || normalized === 'operations') {
      clubIdToTeamId['operations'] = team.id;
      teamIdToClubId[team.id] = 'operations';
    } else if (normalized === 'web-dev' || normalized === 'web-development' || normalized === 'webdev') {
      clubIdToTeamId['web-dev'] = team.id;
      teamIdToClubId[team.id] = 'web-dev';
    }
  });
  return cachedTeams;
}

/** Resolve a frontend ClubId or team UUID to the corresponding verified backend team UUID. */
export async function getTeamIdForClub(clubId: string): Promise<string> {
  const teams = await fetchTeams();
  // Check if clubId is already a valid team UUID
  const directTeam = teams.find((t) => t.id === clubId);
  if (directTeam) return directTeam.id;

  const teamId = clubIdToTeamId[clubId];
  if (!teamId) {
    throw new Error(`Unresolved team mapping for clubId "${clubId}"`);
  }
  return teamId;
}

/** Convert a backend team UUID back to the frontend ClubId (if known). */
export function mapTeamIdToClubId(teamId: string): string | undefined {
  return teamIdToClubId[teamId];
}
