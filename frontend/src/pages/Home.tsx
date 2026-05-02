import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CarViewer } from "@/components/CarViewer";
import { VoiceInput } from "@/components/VoiceInput";
import { isAuthedStrict } from "@/lib/mockAuth";
import { HomeSkeleton } from "@/components/Skeletons";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Squealing noise when braking",
  "Engine misfires on cold start",
  "AC blowing warm air",
  "Steering wheel vibrates at high speed",
];

export default function Home() {
  const [symptom, setSymptom] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthedStrict()) {
      navigate("/login");
      return;
    }
    setReady(true);
  }, [navigate]);

  const start = () => {
    const text = symptom.trim();
    if (!text) {
      toast.error("Describe a symptom first");
      return;
    }
    sessionStorage.setItem("vdas:symptom", text);
    navigate("/diagnosis");
  };

  if (!ready) return <HomeSkeleton />;

  return (
    <div className="min-h-svh flex flex-col bg-background overflow-hidden">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-6 lg:py-8 animate-fade-in grid gap-8 lg:grid-cols-2 lg:items-center">
        
        {/* Left Side: Content & Input */}
        <section
          className="space-y-5 lg:space-y-6 max-w-xl animate-slide-up"
          style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI Diagnostic Engine
          </span>

          <div>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              What's troubling <br className="hidden lg:block" />
              <span className="gradient-text">your car?</span>
            </h1>
            <p className="mt-2.5 text-base md:text-lg text-muted-foreground">
              Describe the symptoms in your own words - or tap the mic and speak. We'll diagnose it instantly.
            </p>
          </div>

          <div className="glass card-shadow rounded-2xl p-4 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_hsl(244_100%_70%_/_0.18)]">
            <textarea
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="e.g. There's a high-pitched squeal when I press the brakes..."
              rows={4}
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <VoiceInput onTranscript={setSymptom} />
              <button
                onClick={start}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl gradient-bg text-white font-semibold shadow-[0_8px_24px_-8px_hsl(244_100%_70%_/_0.6)] transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95"
              >
                Start Diagnosis
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Try a suggestion</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSymptom(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Side: Big Car Viewer */}
        <section 
          className="h-[300px] md:h-[400px] lg:h-[600px] w-full rounded-3xl lg:rounded-[3rem] glass card-shadow overflow-hidden relative animate-slide-up"
          style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-secondary/5" />
          <CarViewer faultyParts={[]} selectedPart={null} onSelectPart={() => {}} autoRotate />
        </section>

      </main>
    </div>
  );
}
