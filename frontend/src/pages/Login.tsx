import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mic, Search, MapPin, Cog } from "lucide-react";
import { Logo } from "@/components/Logo";
import { isAuthedStrict, signIn } from "@/lib/mockAuth";
import { LoginSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthedStrict()) {
      navigate("/home");
      return;
    }
    setMounted(true);
  }, [navigate]);

  if (!mounted) return <LoginSkeleton />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    window.setTimeout(async () => {
      try {
        await signIn(email.trim(), password);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login failed";
        toast.error(message);
        setLoading(false);
        return;
      }

      toast.success("Welcome to V-DAS");
      setLeaving(true);
      window.setTimeout(() => navigate("/home"), 220);
    }, 900);
  };

  return (
    <div
      className={cn(
        "flex h-svh w-full overflow-hidden bg-background transition-opacity duration-200",
        leaving ? "opacity-0" : "opacity-100"
      )}
    >
      <div className="hidden md:flex relative flex-1 items-center justify-center overflow-hidden p-10 animate-gradient">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float" />
        <div
          className="absolute -bottom-28 -right-10 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute inset-0 grid place-items-center opacity-20">
          <Cog className="h-[28rem] w-[28rem] text-white animate-spin" style={{ animationDuration: "60s" }} />
        </div>

        <div className="relative z-10 max-w-md text-center text-white">
          <h1 className="text-6xl font-extrabold tracking-tight drop-shadow-lg animate-slide-up">V-DAS</h1>
          <p
            className="mt-3 text-2xl font-semibold animate-slide-up"
            style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
          >
            Diagnose Smarter
          </p>
          <p
            className="mt-3 text-base text-white/85 animate-slide-up"
            style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
          >
            AI-powered vehicle diagnostics at your fingertips.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {[
              { icon: <Mic className="h-3.5 w-3.5" />, label: "Voice Input" },
              { icon: <Search className="h-3.5 w-3.5" />, label: "AI Fault Detection" },
              { icon: <MapPin className="h-3.5 w-3.5" />, label: "Smart Assistance" },
            ].map((p, i) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 backdrop-blur-sm px-3.5 py-1.5 text-sm font-medium text-white animate-slide-up"
                style={{ animationDelay: `${320 + i * 120}ms`, animationFillMode: "backwards" }}
              >
                {p.icon}
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-6 bg-background">
        <div className="w-full max-w-sm animate-fade-in-right">
          <div className="glass card-shadow rounded-2xl p-7 shadow-[0_0_60px_-15px_hsl(244_100%_70%_/_0.4)]">
            <div className="flex justify-center md:justify-start">
              <Logo />
            </div>
            <h2 className="mt-6 text-2xl md:text-[1.75rem] font-bold leading-tight">Welcome Back</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "mt-1.5 w-full h-11 rounded-lg bg-card border px-3 text-sm placeholder:text-muted-foreground transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_hsl(244_100%_70%_/_0.18)]",
                    errors.email ? "border-danger" : "border-border"
                  )}
                />
                {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "w-full h-11 rounded-lg bg-card border px-3 pr-10 text-sm placeholder:text-muted-foreground transition-all focus:outline-none focus:border-primary focus:shadow-[0_0_0_4px_hsl(244_100%_70%_/_0.18)]",
                      errors.password ? "border-danger" : "border-border"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl gradient-bg text-white font-semibold inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_hsl(244_100%_70%_/_0.6)] transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Login"}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-medium text-primary transition-colors hover:text-secondary">
                  Create account
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
