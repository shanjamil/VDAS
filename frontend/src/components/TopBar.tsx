import { LogOut, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { signOut } from "@/lib/auth";
import { toast } from "sonner";

export const TopBar = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    signOut();
    toast.success("Signed out");
    navigate("/login");
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/history")}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5 active:scale-95"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
