import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { isAuthedStrict, signOut } from "@/lib/auth";
import { ArrowLeft, Clock, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type HistoryItem = {
  id: number;
  symptom: string;
  result: {
    fault_name: string;
    confidence: number;
    repair_difficulty: string;
  };
  created_at: string;
};

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"diagnoses" | "bookings">("diagnoses");
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");

  useEffect(() => {
    if (!isAuthedStrict()) {
      toast.error("Please log in or register to view your history.");
      navigate("/login");
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/history/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
          },
        });

        if (response.status === 401) {
          signOut();
          toast.error("Session expired. Please log in again.");
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (!response.ok || data.status !== "success") {
          throw new Error(data.message || "Failed to load history");
        }

        setHistory(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchBookings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
          },
        });

        const data = await response.json();
        if (!response.ok || data.status !== "success") {
          throw new Error(data.message || "Failed to load bookings");
        }

        setBookings(data.data);
      } catch (err: any) {
        setBookingsError(err.message);
      } finally {
        setBookingsLoading(false);
      }
    };

    fetchHistory();
    fetchBookings();
  }, [navigate]);

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-5 py-8 animate-fade-in">
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className={`h-4 w-4 ${language === "ur" || language === "ar" ? "rotate-180" : ""}`} /> {t("backToHome")}
        </button>

        <div className="mt-6 flex items-center justify-between animate-slide-up" style={{ animationDelay: "40ms", animationFillMode: "backwards" }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {activeTab === "diagnoses" ? t("diagnosisHistory") : t("myBookings")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {activeTab === "diagnoses" ? t("historySubtitle") : t("bookingsSubtitle")}
            </p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary">
            {activeTab === "diagnoses" ? (
              <Clock className="h-6 w-6" />
            ) : (
              <Calendar className="h-6 w-6" />
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex border-b border-white/10 gap-6">
          <button
            onClick={() => setActiveTab("diagnoses")}
            className={cn(
              "pb-3 text-sm font-semibold transition-all border-b-2 relative",
              activeTab === "diagnoses"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            {t("diagnosisHistory")}
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={cn(
              "pb-3 text-sm font-semibold transition-all border-b-2 relative",
              activeTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            {t("myBookings")}
          </button>
        </div>

        {activeTab === "diagnoses" ? (
          loading ? (
            <div className="mt-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl glass animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-8 glass rounded-2xl p-6 text-center text-danger">
              <AlertTriangle className="mx-auto h-8 w-8 mb-3" />
              <p>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-full bg-elevated flex items-center justify-center text-muted-foreground mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">{t("noHistory")}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t("noHistorySubtitle")}
              </p>
              <button
                onClick={() => navigate("/home")}
                className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("startDiagnosis")}
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {history.map((item, index) => (
                <div
                  key={item.id}
                  className="group glass card-shadow relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${(index + 2) * 40}ms`, animationFillMode: "backwards" }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className={cn(
                        "font-medium",
                        item.result.confidence >= 80 ? "text-danger" : "text-warning"
                      )}>
                        {item.result.confidence}% {t("confidence")}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-1">
                      {item.result.fault_name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      <span className="font-medium text-foreground/70">Symptom:</span> "{item.symptom}"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:pl-4 sm:border-l border-border/50">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("difficulty")}</p>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                        item.result.repair_difficulty === "DIY" 
                          ? "bg-success/15 text-success border-success/30" 
                          : "bg-danger/15 text-danger border-danger/30"
                      )}>
                        {item.result.repair_difficulty === "DIY" ? t("diy") : t("professional")}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        sessionStorage.setItem("vdas:symptom", item.symptom);
                        sessionStorage.setItem("vdas:historyItem", JSON.stringify(item.result));
                        sessionStorage.setItem("vdas:diagnosisId", String(item.id));
                        navigate("/diagnosis");
                      }}
                      className="h-10 w-10 rounded-full bg-elevated flex items-center justify-center text-foreground transition-transform group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground shrink-0"
                      title={t("reRunDiagnosis")}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          bookingsLoading ? (
            <div className="mt-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl glass animate-pulse" />
              ))}
            </div>
          ) : bookingsError ? (
            <div className="mt-8 glass rounded-2xl p-6 text-center text-danger">
              <AlertTriangle className="mx-auto h-8 w-8 mb-3" />
              <p>{bookingsError}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-full bg-elevated flex items-center justify-center text-muted-foreground mb-4">
                <Calendar className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">No Bookings Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                You haven't scheduled any mechanic appointments yet. Get an AI diagnosis and book a nearby workshop!
              </p>
              <button
                onClick={() => navigate("/home")}
                className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("startDiagnosis")}
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {bookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="group glass card-shadow relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg animate-slide-up"
                  style={{ animationDelay: `${(index + 2) * 40}ms`, animationFillMode: "backwards" }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5 font-mono text-primary font-semibold">
                        Ref: BK-{booking.id}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-border" />
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(booking.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {booking.mechanic_name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-white/70">Service:</span> {booking.service_type}
                      </p>
                      <span className="hidden sm:inline text-white/20">|</span>
                      <p>
                        <span className="font-medium text-white/70">Schedule:</span> {booking.booking_date} at {booking.booking_time}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-4 sm:border-l border-border/50">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Fee Status</p>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                        booking.status === "Paid" 
                          ? "bg-success/15 text-success border-success/30" 
                          : "bg-danger/15 text-danger border-danger/30"
                      )}>
                        {booking.status === "Paid" ? "1,000 PKR Paid" : "Refunded"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
