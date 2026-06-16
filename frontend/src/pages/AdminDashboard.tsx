import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { isAuthedStrict, isAdminUser, signOut } from "@/lib/auth";
import {
  ArrowLeft,
  Users,
  Wrench,
  DollarSign,
  Search,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Mail,
  Activity,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type RecentDiagnosis = {
  id: number;
  user_email: string;
  symptom: string;
  result: {
    fault_name: string;
    confidence: number;
    repair_difficulty: string;
  };
  created_at: string;
};

type RecentBooking = {
  id: number;
  user_email: string;
  mechanic_name: string;
  service_type: string;
  booking_date: string;
  booking_time: string;
  amount: string;
  status: string;
  created_at: string;
};

type AdminStats = {
  total_users: number;
  total_diagnoses: number;
  total_earnings: number;
  recent_diagnoses: RecentDiagnosis[];
  recent_bookings: RecentBooking[];
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"diagnoses" | "bookings">("diagnoses");

  const handleDeleteDiagnosis = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this diagnosis log?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/diagnose/${id}/delete/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
        },
      });

      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete diagnosis log");
      }

      toast.success("Diagnosis log deleted successfully.");
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel and delete this booking? The user will be refunded 1,000 PKR to their wallet.")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/booking/${id}/delete/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
        },
      });

      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete booking");
      }

      toast.success("Booking deleted and wallet refunded successfully.");
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
        },
      });

      if (response.status === 401) {
        signOut();
        toast.error(t("sessionExpired"));
        navigate("/login");
        return;
      }

      if (response.status === 403) {
        toast.error("Unauthorized access. Administrative credentials required.");
        navigate("/home");
        return;
      }

      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to load admin stats");
      }

      setStats(data.data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isAuthedStrict() || !isAdminUser()) {
      toast.error("Unauthorized access. Administrative credentials required.");
      navigate("/home");
      return;
    }

    fetchStats();
  }, [navigate]);

  const filteredLogs = stats?.recent_diagnoses.filter((log) => {
    const query = searchTerm.toLowerCase();
    return (
      log.user_email.toLowerCase().includes(query) ||
      log.symptom.toLowerCase().includes(query) ||
      log.result.fault_name.toLowerCase().includes(query)
    );
  }) || [];

  const filteredBookings = stats?.recent_bookings.filter((booking) => {
    const query = searchTerm.toLowerCase();
    return (
      booking.user_email.toLowerCase().includes(query) ||
      booking.mechanic_name.toLowerCase().includes(query) ||
      booking.service_type.toLowerCase().includes(query) ||
      `bk-${booking.id}`.includes(query)
    );
  }) || [];

  const handleReload = () => {
    fetchStats(true);
  };

  // Helper to format currency
  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-svh flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-6xl px-5 py-8 animate-fade-in">
        
        {/* Back Link */}
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground mb-6"
        >
          <ArrowLeft className={cn("h-4 w-4", (language === "ur" || language === "ar") && "rotate-180")} />
          {t("backToHome")}
        </button>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight text-glow">{t("adminDashboard")}</h1>
            </div>
            <p className="text-muted-foreground">
              Monitor platform metrics, user diagnostics, and transaction records.
            </p>
          </div>
          
          <button
            onClick={handleReload}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary/10 hover:bg-secondary/20 border border-secondary/20 px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4 text-primary", refreshing && "animate-spin")} />
            {t("reload")}
          </button>
        </div>

        {loading ? (
          /* Skeletons */
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl glass animate-pulse" />
              ))}
            </div>
            <div className="h-96 rounded-2xl glass animate-pulse" />
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-8 text-center text-danger border border-danger/20">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold mb-2">Error Loading Data</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => fetchStats()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-up">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Users */}
              <div className="glass card-shadow p-6 rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">{t("registeredUsers")}</span>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">
                  {stats?.total_users ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Active customer profiles</p>
              </div>

              {/* Card 2: Diagnoses */}
              <div className="glass card-shadow p-6 rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">{t("diagnosesRun")}</span>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight">
                  {stats?.total_diagnoses ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Executed diagnosis sessions</p>
              </div>

              {/* Card 3: Simulated Revenue */}
              <div className="glass card-shadow p-6 rounded-2xl relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none group-hover:bg-primary/10 transition-colors" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">{t("totalRevenue")}</span>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-primary">
                  {formatPKR(stats?.total_earnings ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Simulated diagnostic earnings (PKR)</p>
              </div>
            </div>

            {/* Diagnostic Logs Section */}
            <div className="glass card-shadow rounded-2xl overflow-hidden border border-border/40">
              
              {/* Logs Header & Search */}
              <div className="p-6 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold">{t("recentActivity")}</h2>
                  </div>

                  {/* Tab Selector */}
                  <div className="flex bg-elevated rounded-xl p-0.5 border border-white/5">
                    <button
                      onClick={() => {
                        setActiveTab("diagnoses");
                        setSearchTerm("");
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        activeTab === "diagnoses"
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-white"
                      )}
                    >
                      {t("diagnosesLogs")}
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("bookings");
                        setSearchTerm("");
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        activeTab === "bookings"
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-white"
                      )}
                    >
                      {t("bookingsLogs")}
                    </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === "diagnoses"
                        ? t("searchPlaceholder")
                        : "Search by email, mechanic, service, ref..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-background/50 hover:bg-background/80 focus:bg-background border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                {activeTab === "diagnoses" ? (
                  filteredLogs.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <AlertTriangle className="mx-auto h-8 w-8 mb-3 text-muted-foreground/60" />
                      <p>{t("noActivity")}</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-secondary/5 text-xs font-semibold text-muted-foreground border-b border-border/30">
                          <th className="py-4 px-6">{t("userEmail")}</th>
                          <th className="py-4 px-6">{t("symptom")}</th>
                          <th className="py-4 px-6">{t("diagnosedFault")}</th>
                          <th className="py-4 px-6">{t("difficulty")}</th>
                          <th className="py-4 px-6">{t("date")}</th>
                          <th className="py-4 px-6 text-center">{t("actionsHeader")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 text-sm">
                        {filteredLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-secondary/5 transition-colors duration-150"
                          >
                            {/* User Email */}
                            <td className="py-4 px-6 font-medium max-w-[200px] truncate">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span>{log.user_email}</span>
                              </div>
                            </td>
                            
                            {/* Symptom */}
                            <td className="py-4 px-6 max-w-[250px] truncate text-muted-foreground">
                              "{log.symptom}"
                            </td>
                            
                            {/* Diagnosed Fault */}
                            <td className="py-4 px-6 font-semibold text-foreground">
                              {log.result.fault_name}
                            </td>
                            
                            {/* Difficulty Badge */}
                            <td className="py-4 px-6">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                                  log.result.repair_difficulty === "DIY"
                                    ? "bg-success/10 text-success border-success/20"
                                    : "bg-warning/10 text-warning border-warning/20"
                                )}
                              >
                                {log.result.repair_difficulty === "DIY" ? t("diy") : t("professional")}
                              </span>
                            </td>
                            
                            {/* Date & Time */}
                            <td className="py-4 px-6 text-xs text-muted-foreground whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                                {new Date(log.created_at).toLocaleString(undefined, {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteDiagnosis(log.id)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                                title={t("deleteRecord")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : (
                  filteredBookings.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <AlertTriangle className="mx-auto h-8 w-8 mb-3 text-muted-foreground/60" />
                      <p>{t("noBookings")}</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-secondary/5 text-xs font-semibold text-muted-foreground border-b border-border/30">
                          <th className="py-4 px-6">{t("bookingReference")}</th>
                          <th className="py-4 px-6">{t("userEmail")}</th>
                          <th className="py-4 px-6">{t("mechanicName")}</th>
                          <th className="py-4 px-6">{t("serviceType")}</th>
                          <th className="py-4 px-6">{t("date")}</th>
                          <th className="py-4 px-6">{t("amount")}</th>
                          <th className="py-4 px-6">{t("status")}</th>
                          <th className="py-4 px-6 text-center">{t("actionsHeader")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20 text-sm">
                        {filteredBookings.map((booking) => (
                          <tr
                            key={booking.id}
                            className="hover:bg-secondary/5 transition-colors duration-150"
                          >
                            {/* Booking Reference */}
                            <td className="py-4 px-6 font-mono font-semibold text-primary">
                              BK-{booking.id}
                            </td>

                            {/* User Email */}
                            <td className="py-4 px-6 font-medium max-w-[200px] truncate">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                                <span>{booking.user_email}</span>
                              </div>
                            </td>
                            
                            {/* Mechanic Name */}
                            <td className="py-4 px-6 font-semibold text-foreground">
                              {booking.mechanic_name}
                            </td>
                            
                            {/* Service Type */}
                            <td className="py-4 px-6 text-muted-foreground">
                              {booking.service_type}
                            </td>
                            
                            {/* Schedule Date & Time */}
                            <td className="py-4 px-6 text-xs text-muted-foreground whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-white font-medium">{booking.booking_date}</span>
                                <span>{booking.booking_time}</span>
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-4 px-6 font-medium">
                              {parseFloat(booking.amount).toLocaleString()} PKR
                            </td>

                            {/* Status */}
                            <td className="py-4 px-6">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
                                  booking.status === "Paid"
                                    ? "bg-success/15 text-success border-success/30"
                                    : "bg-danger/15 text-danger border-danger/30"
                                )}
                              >
                                {booking.status === "Paid" ? "Paid" : "Refunded"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleDeleteBooking(booking.id)}
                                disabled={booking.status !== "Paid"}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Cancel & Refund"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
