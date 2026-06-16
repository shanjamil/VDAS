import { LogOut, LogIn, History, Globe, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { signOut, isGuestUser, isAdminUser } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { type Language } from "@/lib/translations";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const TopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const isGuest = isGuestUser();
  const isAdmin = isAdminUser();
  const isHomePage = location.pathname === "/home" || location.pathname === "/";

  const handleLogout = () => {
    signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const handleHistoryClick = () => {
    if (isGuest) {
      toast.info(t("createAccount") + " to save and view history!");
      navigate("/login");
    } else {
      navigate("/history");
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          {isHomePage && (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground/80" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="bg-transparent font-medium text-xs sm:text-sm text-foreground focus:outline-none cursor-pointer pr-1"
                dir="ltr"
              >
                <option value="en">English</option>
                <option value="ur">اردو (Urdu)</option>
                <option value="roman-ur">Roman Urdu</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
          )}

          <button
            onClick={handleHistoryClick}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5 active:scale-95"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t("history")}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/45 bg-primary/10 text-primary px-3.5 py-2 text-sm font-semibold transition-all hover:bg-primary/20 hover:-translate-y-0.5 active:scale-95"
            >
              <ShieldAlert className="h-4 w-4" />
              <span className="hidden sm:inline">{t("manageSystem")}</span>
            </button>
          )}

          {isGuest ? (
            <button
              onClick={() => {
                signOut(); // Clear guest session flag
                navigate("/login");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5 active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">{t("signIn")}</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
