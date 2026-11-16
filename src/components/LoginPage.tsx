import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import { THEME_TOKENS } from "../theme/calendarTheme";
import type { ThemeMode } from "../types/calendar";
import { login, type AuthUser } from "../services/authService";

interface LoginPageProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogin: (user: AuthUser) => void;
}

export function LoginPage({ theme, onToggleTheme, onLogin }: LoginPageProps) {
  const palette = THEME_TOKENS[theme];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const user = await login(email.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-4 py-10 ${
        theme === "dark" ? "ts-graphite-grid" : "ts-cream-grid"
      }`}
    >
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Toggle theme"
        className="absolute top-5 right-5 p-3 rounded-full border transition-colors"
        style={{
          color: palette.textPrimary,
          background: palette.surfaceElevated,
          borderColor: palette.border,
        }}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div
        className="w-full max-w-[410px] rounded-[22px] border p-7 sm:p-9"
        style={{
          background: palette.surfaceBackground,
          borderColor: palette.border,
          boxShadow: palette.cardShadow,
        }}
      >
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: palette.textPrimary }}
          >
            TechSpace
          </h1>
          <p className="mt-2 text-sm" style={{ color: palette.textMuted }}>
            Sign in to your workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="block mb-2 text-sm font-medium"
              style={{ color: palette.textSecondary }}
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-current/20"
              style={{
                background: palette.surfaceElevated,
                borderColor: palette.border,
                color: palette.textPrimary,
              }}
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block mb-2 text-sm font-medium"
              style={{ color: palette.textSecondary }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border px-4 py-3 pr-12 text-sm outline-none focus-visible:ring-2 focus-visible:ring-current/20"
                style={{
                  background: palette.surfaceElevated,
                  borderColor: palette.border,
                  color: palette.textPrimary,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: palette.textMuted }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: palette.accentBg,
              color: palette.accentText,
            }}
          >
            {loading && <Loader2 size={17} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
