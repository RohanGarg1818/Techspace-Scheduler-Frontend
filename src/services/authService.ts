import {
  apiFetch,
  saveAuthToken,
  clearAuthToken,
} from "./apiClient";

export type UserRole = "ob" | "faculty" | "executive" | "team_lead" | "member";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  obTitle: string | null;
  teams: {
    teamId: string;
    teamName: string;
    position: "lead" | "colead" | "member";
  }[];
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const result = await apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!result.token) {
    throw new Error("Login response did not include a token");
  }

  saveAuthToken(result.token);
  return result.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/v1/auth/me");
}

export function logout(): void {
  clearAuthToken();
}
