import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import PageTransition from "../components/PageTransition";

/* ── Inline icons ──────────────────────────────────────────────────── */
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

/* ── Left branding panel ────────────────────────────────────────────── */
const BrandPanel = () => (
  <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 p-10 text-white relative overflow-hidden">
    <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/8 blur-2xl" />
    <div className="absolute bottom-0 left-0 h-60 w-60 rounded-full bg-black/10 blur-3xl" />

    <div className="relative z-10">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center text-sm font-black border border-white/30">
          MB
        </div>
        <div>
          <p className="text-lg font-black tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>Mane Bazar</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Premium Grocery</p>
        </div>
      </div>

      <div className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60 mb-3">
          Your neighbourhood grocery store
        </p>
        <h2 className="text-4xl font-extrabold leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
          Welcome back<br />to fresh &<br />fast delivery
        </h2>
        <p className="mt-5 text-sm leading-7 text-white/75 max-w-xs">
          Log in to access your orders, wishlist, exclusive deals, and real-time delivery tracking.
        </p>
      </div>
    </div>

    <div className="relative z-10 space-y-3">
      {[
        { icon: "📦", text: "Track your orders live" },
        { icon: "♥", text: "Access your wishlist" },
        { icon: "🎁", text: "Exclusive offers for members" },
      ].map((f) => (
        <div key={f.text} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <span className="text-xl">{f.icon}</span>
          <span className="text-sm font-semibold text-white/90">{f.text}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ── Field wrapper ─────────────────────────────────────────────────── */
const Field = ({ label, icon, error, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {icon}{label}
    </label>
    {children}
    {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
  </div>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading: authLoading } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/";

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  /* remembered email */
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setForm((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateForm = () => {
    const next = {};
    if (!form.email.trim()) next.email = "Email is required";
    else if (!validateEmail(form.email)) next.email = "Enter a valid email address";
    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) { toast.error("Please fix the errors below"); return; }
    setIsValidating(true);
    try {
      await login(form);
      if (rememberMe) localStorage.setItem("rememberedEmail", form.email);
      toast.success("✅ Welcome back! Redirecting...");
      setTimeout(() => navigate(redirectTo), 500);
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed";
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <PageTransition className="section-shell flex min-h-[88vh] items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl overflow-hidden rounded-[2.5rem] shadow-2xl shadow-slate-200/80 grid lg:grid-cols-2"
        style={{ minHeight: 580 }}
      >
        {/* ── Left brand panel ───────────────────────────────────────── */}
        <BrandPanel />

        {/* ── Right form panel ───────────────────────────────────────── */}
        <div className="flex flex-col justify-center bg-white px-8 py-10 sm:px-12">
          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-green-600 mb-2">
              Sign in
            </p>
            <h1 className="text-3xl font-extrabold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Access your orders, wishlist, and personalized offers
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Email Address" icon={<MailIcon />} error={errors.email}>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => {
                  if (form.email && !validateEmail(form.email))
                    setErrors((p) => ({ ...p, email: "Invalid email format" }));
                }}
                placeholder="you@example.com"
                className={`input-field ${errors.email ? "border-rose-300" : ""}`}
                disabled={authLoading || isValidating}
                autoComplete="email"
              />
            </Field>

            <Field label="Password" icon={<LockIcon />} error={errors.password}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="••••••••"
                  className={`input-field pr-11 ${errors.password ? "border-rose-300" : ""}`}
                  disabled={authLoading || isValidating}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={!form.password}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            {/* Remember me + forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-green-600"
                />
                <span className="text-xs text-slate-600 font-medium">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={authLoading || isValidating}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-btn-green hover:shadow-btn-green-hover hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
            >
              {authLoading || isValidating ? (
                <span className="animate-spin h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>Sign In<ArrowRightIcon /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-green-600 hover:text-green-700 transition-colors">
              Create one now
            </Link>
          </p>
        </div>
      </motion.div>
    </PageTransition>
  );
};

export default LoginPage;
