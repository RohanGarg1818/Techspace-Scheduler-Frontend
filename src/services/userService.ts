
import { apiFetch } from "./apiClient";

export type UserRole =
  | "ob"
  | "faculty"
  | "executive"
  | "team_lead"
  | "member";

export interface UserTeam {
  teamId: string;
  position: "lead" | "colead" | "member";
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teams?: UserTeam[];
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  obTitle?: string;
  teams?: UserTeam[];
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

interface UsersResponse {
  items: BackendUser[];
}

export async function fetchUsers(): Promise<BackendUser[]> {
  const response = await apiFetch<UsersResponse>("/api/v1/users");
  return response.items;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<BackendUser> {
  return apiFetch<BackendUser>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<BackendUser> {
  return apiFetch<BackendUser>(`/api/v1/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/api/v1/users/${id}`, {
    method: "DELETE",
  });
}
