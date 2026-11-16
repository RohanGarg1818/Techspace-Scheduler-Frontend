interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  data?: unknown;
}

const TOKEN_COOKIE = "techspace_auth_token";

export function getAuthToken(): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${TOKEN_COOKIE}=`));

  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.split("=").slice(1).join("="));
  } catch {
    return null;
  }
}

export function saveAuthToken(token: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie =
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; ` +
    `Max-Age=604800; Path=/; SameSite=Lax${secure}`;
}

export function clearAuthToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;

  // Clear any token left by the previous implementation.
  localStorage.removeItem("authToken");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const base = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? "";

  const url = `${base}${path}`;
  const headers = new Headers(init.headers);

  if (init.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();

  const isLoginRequest = /\/auth\/login\/?$/.test(path);

  if (token && !isLoginRequest) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "omit",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let json:
    | (ApiResponse<T> & {
        error?: { code?: string };
      })
    | null = null;

  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const error = new Error(
      json?.message || `Request failed with status ${response.status}`,
    ) as ApiError;

    error.status = response.status;
    error.code =
      json?.error?.code ??
      (response.status === 401
        ? "UNAUTHENTICATED"
        : response.status === 403
          ? "FORBIDDEN"
          : "API_ERROR");

    error.data = json?.data ?? null;

    if (response.status === 401 && token) {
      clearAuthToken();
      window.dispatchEvent(new Event("techspace:session-expired"));
    }

    throw error;
  }

  return json
    ? json.data !== undefined
      ? json.data
      : (json as unknown as T)
    : (undefined as T);
}
