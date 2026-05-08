import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LoginSkeleton } from "@/components/Skeletons";
import { isAuthedStrict, signUp } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
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

    if (!name.trim()) next.name = "Enter your full name";
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email";
    if (!password) {
      next.password = "Enter your password";
    } else if (password.length < 8) {
      next.password = "Password must be at least 8 characters";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Account created successfully. Please log in.");
    setLeaving(true);
    window.setTimeout(() => navigate("/login"), 240);
  };

  return (
    <div
      className={cn(
        "flex h-svh w-full overflow-hidden bg-background transition-all duration-300",
        leaving ? "scale-[0.99] opacity-0" : "scale-100 opacity-100"
      )}
    >
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden p-10 md:flex animate-gradient">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgb(255_255_255_/_0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgb(255_255_255_/_0.12),_transparent_30%)]" />
        <div className="absolute -top-20 left-10 h-56 w-56 rounded-full border border-white/10 bg-white/10 blur-3xl animate-float" />
        <div
          className="absolute bottom-0 right-10 h-72 w-72 rounded-full border border-white/10 bg-white/10 blur-3xl animate-float"
          style={{ animationDelay: "1.2s" }}
        />

        <div className="relative z-10 max-w-lg text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm animate-slide-up">
            <Sparkles className="h-4 w-4" />
            Create your V-DAS access
          </span>
          <h1
            className="mt-6 text-5xl font-extrabold tracking-tight animate-slide-up"
            style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
          >
            Start diagnosing with a secure account.
          </h1>
          <p
            className="mt-4 max-w-md text-base text-white/80 animate-slide-up"
            style={{ animationDelay: "220ms", animationFillMode: "backwards" }}
          >
            Create your account once, then sign in anytime to access diagnostics, AI assistance, and repair guidance.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, label: "Your credentials are stored in the backend database." },
              { icon: UserPlus, label: "Signup instantly returns access so users can continue without friction." },
              { icon: ArrowRight, label: "After registration, users go directly into the V-DAS experience." },
            ].map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-md animate-slide-up"
                style={{ animationDelay: `${320 + index * 120}ms`, animationFillMode: "backwards" }}
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/12">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-white/90">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-5 py-6">
        <div className="w-full max-w-sm animate-fade-in-right">
          <div className="glass card-shadow rounded-2xl p-7 shadow-[0_0_60px_-15px_hsl(191_100%_50%_/_0.3)] transition-transform duration-300 hover:-translate-y-1">
            <div className="flex justify-center md:justify-start">
              <Logo />
            </div>
            <h2 className="mt-6 text-2xl font-bold leading-tight md:text-[1.75rem]">Create Account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Register to start using V-DAS</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(
                    "mt-1.5 h-11 w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_hsl(244_100%_70%_/_0.18)] focus:outline-none",
                    errors.name ? "border-danger" : "border-border"
                  )}
                />
                {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "mt-1.5 h-11 w-full rounded-lg border bg-card px-3 text-sm placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_hsl(244_100%_70%_/_0.18)] focus:outline-none",
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
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "h-11 w-full rounded-lg border bg-card px-3 pr-10 text-sm placeholder:text-muted-foreground transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_4px_hsl(244_100%_70%_/_0.18)] focus:outline-none",
                      errors.password ? "border-danger" : "border-border"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand text-white font-semibold shadow-[0_8px_24px_-8px_hsl(191_100%_50%_/_0.6)] transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Creating account..." : "Create Account"}
              </button>

              <p className="pt-2 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary transition-colors hover:text-secondary">
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
