import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { isAuthedStrict, signOut } from "@/lib/auth";
import { ArrowLeft, Clock, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
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

  useEffect(() => {
    if (!isAuthedStrict()) {
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

    fetchHistory();
  }, [navigate]);

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-5 py-8 animate-fade-in">
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        <div className="mt-6 flex items-center justify-between animate-slide-up" style={{ animationDelay: "40ms", animationFillMode: "backwards" }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Diagnosis History</h1>
            <p className="mt-2 text-muted-foreground">Review your previous vehicle assessments.</p>
          </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {loading ? (
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
            <h3 className="text-lg font-semibold">No history found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              You haven't made any diagnoses yet. Head to the home page to start your first vehicle assessment.
            </p>
            <button
              onClick={() => navigate("/home")}
              className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Diagnosis
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
                      {item.result.confidence}% Confidence
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
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Difficulty</p>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                      item.result.repair_difficulty === "DIY" 
                        ? "bg-success/15 text-success border-success/30" 
                        : "bg-danger/15 text-danger border-danger/30"
                    )}>
                      {item.result.repair_difficulty}
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
                    title="Re-run diagnosis"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
