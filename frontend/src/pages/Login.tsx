import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api, ApiError } from "../lib/api";
import { Button, Spinner } from "../components/ui/Basics";

export default function Login() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "done" | "reset">("email");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetSending, setResetSending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!resetEmail) return;
    setResetSending(true);
    setResetMsg(null);
    try {
      const res = await api.post<{ message: string; resetToken?: string }>("/auth/forgot-password", { email: resetEmail });
      if ((res as any).resetToken) {
        setResetToken((res as any).resetToken);
        setResetStep("reset");
        setResetMsg("Enter a new password below.");
      } else {
        setResetStep("done");
        setResetMsg("If that email exists, a reset link has been sent.");
      }
    } catch {
      setResetMsg("Failed to send reset request.");
    } finally {
      setResetSending(false);
    }
  }

  async function handleReset() {
    if (!newPassword || newPassword.length < 6) {
      setResetMsg("Password must be at least 6 characters.");
      return;
    }
    setResetSending(true);
    try {
      await api.post("/auth/reset-password", { token: resetToken, newPassword });
      setResetStep("done");
      setResetMsg("Password reset successful! You can now sign in.");
    } catch {
      setResetMsg("Reset failed. The link may have expired.");
    } finally {
      setResetSending(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-surface-container-lowest rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-surface-container-lowest rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-container-lowest/20 flex items-center justify-center text-white font-bold text-lg backdrop-blur-sm">S</div>
            <div className="text-white">
              <div className="font-semibold text-lg">CBC School</div>
              <div className="text-on-primary/80 text-xs uppercase tracking-wider">Management System</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <blockquote className="text-white/80 text-lg leading-relaxed">
            "A comprehensive school management platform with CBC curriculum support, M-Pesa integration, and real-time reporting."
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">B</div>
            <div>
              <div className="text-white font-medium text-sm">Competency-Based Curriculum</div>
              <div className="text-on-primary/80 text-xs">Kenya CBC compliant</div>
            </div>
          </div>
        </div>
        <div className="relative text-on-primary/80 text-xs">&copy; 2026 CBC School Management</div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 bg-surface-container-low">
        <div className="w-full max-w-sm">
          {!showForgot ? (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-on-surface">Welcome back</h1>
                <p className="text-on-surface-variant text-sm mt-1">Sign in to your account to continue</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Username</label>
                  <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin@school.edu"
                    className="w-full rounded-lg border border-outline px-3.5 py-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder-outline-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border border-outline px-3.5 py-2.5 pr-10 text-sm bg-surface-container-lowest text-on-surface placeholder-outline-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <span className="material-symbols-outlined text-lg">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-error bg-error-container/20 border border-error/30 rounded-lg px-4 py-3">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading} size="lg">
                  {loading ? (
                    <span className="flex items-center gap-2"><Spinner className="w-4 h-4 border-white/30 border-t-white" /> Signing in...</span>
                  ) : "Sign in"}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-outline-variant">
                <p className="text-xs text-on-surface-variant text-center">
                  Demo: admin@school.edu / teacher@school.edu / accountant@school.edu
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-on-surface">Reset Password</h1>
                <p className="text-on-surface-variant text-sm mt-1">
                  {resetStep === "email" && "Enter your email to receive a reset link."}
                  {resetStep === "reset" && "Choose a new password."}
                  {resetStep === "done" && resetMsg}
                </p>
              </div>

              {resetStep === "email" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                    <input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="admin@school.edu"
                      className="w-full rounded-lg border border-outline px-3.5 py-2.5 text-sm bg-surface-container-lowest text-on-surface placeholder-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  </div>
                  <Button className="w-full" onClick={handleForgot} disabled={resetSending || !resetEmail}>
                    {resetSending ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <button type="button" onClick={() => setShowForgot(false)} className="w-full text-xs text-on-surface-variant hover:text-on-surface text-center">
                    Back to sign in
                  </button>
                </div>
              )}

              {resetStep === "reset" && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full rounded-lg border border-outline px-3.5 py-2.5 pr-10 text-sm bg-surface-container-lowest text-on-surface placeholder-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                      >
                        <span className="material-symbols-outlined text-lg">{showNewPassword ? "visibility_off" : "visibility"}</span>
                      </button>
                    </div>
                  </div>
                  {resetMsg && <p className="text-sm text-on-surface-variant">{resetMsg}</p>}
                  <Button className="w-full" onClick={handleReset} disabled={resetSending || !newPassword}>
                    {resetSending ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              )}

              {resetStep === "done" && (
                <div className="space-y-5">
                  {resetMsg && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {resetMsg}
                    </div>
                  )}
                  <Button className="w-full" onClick={() => { setShowForgot(false); setResetStep("email"); setResetMsg(null); }}>
                    Back to Sign In
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
