import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Phone,
  Navigation,
  Star,
  Wrench,
  Clock,
  CheckCircle2,
  Circle,
  MapPin,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CarViewer } from "@/components/CarViewer";
import { MechanicsMap } from "@/components/MechanicsMap";
import { DEMO_RESULT, MOCK_MECHANICS, MOCK_GUIDES } from "@/lib/mockData";
import { ALL_PARTS, partMatchesFault, type FaultPart } from "@/lib/parts";
import { isAuthedStrict } from "@/lib/mockAuth";
import { DiagnosisSkeleton } from "@/components/Skeletons";
import { cn } from "@/lib/utils";

const urgencyTone: Record<string, string> = {
  Critical: "bg-danger/15 text-danger border-danger/30",
  Moderate: "bg-warning/15 text-warning border-warning/30",
  Low: "bg-success/15 text-success border-success/30",
};

const diffTone: Record<string, string> = {
  Easy: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  Hard: "bg-danger/15 text-danger border-danger/30",
};

export default function Diagnosis() {
  const navigate = useNavigate();
  const [symptom, setSymptom] = useState("Brake squeal during stops");
  const [ready, setReady] = useState(false);
  const [activeMechanicId, setActiveMechanicId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthedStrict()) {
      navigate("/login");
      return;
    }
    const s = sessionStorage.getItem("vdas:symptom");
    if (s) setSymptom(s);
    setReady(true);
  }, [navigate]);

  const result = DEMO_RESULT;
  const faultyParts: FaultPart[] = useMemo(
    () => ALL_PARTS.filter((p) => partMatchesFault(p, result.affected_parts)),
    [result.affected_parts]
  );

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bars, setBars] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBars(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  const toggle = (i: number) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  };

  const directions = (m: { lat: number; lng: number; name: string }) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}`, "_blank");

  if (!ready) return <DiagnosisSkeleton />;

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-8 animate-fade-in">
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        <div
          className="mt-4 animate-slide-up"
          style={{ animationDelay: "40ms", animationFillMode: "backwards" }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">
            Diagnosis Results <span className="text-muted-foreground font-medium">for</span>{" "}
            <span className="gradient-text">"{symptom}"</span>
          </h1>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <section
            className="lg:col-span-7 space-y-5 animate-slide-up"
            style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
          >
            <div className="glass card-shadow rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-danger/15 text-danger">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Primary fault</p>
                    <h2 className="text-lg font-semibold">{result.faults[0].name}</h2>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    urgencyTone[result.urgency]
                  )}
                >
                  {result.urgency}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {result.faults.map((f, i) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground">{f.confidence}%</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-bg transition-[width] duration-700 ease-out"
                        style={{
                          width: bars ? `${f.confidence}%` : "0%",
                          transitionDelay: `${i * 120}ms`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{f.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass card-shadow rounded-2xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Probable Causes
              </h3>
              <ul className="mt-3 space-y-2">
                {result.probable_causes.map((c) => (
                  <li key={c} className="flex gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass card-shadow rounded-2xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended Actions
              </h3>
              <ul className="mt-3 space-y-2">
                {result.recommended_actions.map((a, i) => (
                  <li key={a}>
                    <button
                      onClick={() => toggle(i)}
                      className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm transition-colors hover:bg-elevated/60"
                    >
                      {checked.has(i) ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={cn(checked.has(i) && "text-muted-foreground line-through")}>{a}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            className="lg:col-span-5 animate-slide-up"
            style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
          >
            <div className="glass card-shadow rounded-2xl overflow-hidden h-[420px] lg:h-full lg:min-h-[520px] relative">
              <CarViewer
                faultyParts={faultyParts}
                selectedPart={faultyParts[0] ?? null}
                onSelectPart={() => {}}
                autoRotate
              />
              <div className="pointer-events-none absolute top-3 left-3 rounded-full border border-danger/30 bg-danger/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-danger animate-pulse-fault">
                Affected: {faultyParts[0] ?? "—"}
              </div>
            </div>
          </section>
        </div>

        <section
          className="mt-10 animate-slide-up"
          style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" />
            <h3 className="text-lg font-semibold">Nearby Mechanics</h3>
          </div>
          <p className="text-sm text-muted-foreground">Tap a card to fly the map to that workshop.</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-3">
              {MOCK_MECHANICS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMechanicId(m.id)}
                  className={cn(
                    "w-full text-left glass rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg",
                    activeMechanicId === m.id
                      ? "border-primary/60 shadow-[0_0_0_2px_hsl(244_100%_70%_/_0.35)]"
                      : "hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold">{m.name}</h4>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="text-foreground font-medium">{m.rating}</span>
                        <span>({m.reviews})</span>
                        <span>·</span>
                        <span>{m.distance_km} km</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.specialties.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`tel:${m.phone.replace(/\s/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-card text-xs font-medium transition-all hover:border-primary/50 active:scale-95"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        directions(m);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg gradient-bg text-xs font-medium text-white transition-all hover:brightness-110 active:scale-95"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Directions
                    </button>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-7">
              <div className="glass card-shadow rounded-2xl overflow-hidden h-[420px]">
                <MechanicsMap mechanics={MOCK_MECHANICS} activeId={activeMechanicId} />
              </div>
            </div>
          </div>
        </section>

        <section
          className="mt-10 animate-slide-up"
          style={{ animationDelay: "320ms", animationFillMode: "backwards" }}
        >
          <h3 className="text-lg font-semibold">Step-by-Step Repair Guide</h3>
          <p className="text-sm text-muted-foreground">Follow these steps in order for a safe brake service.</p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {MOCK_GUIDES.map((g, i) => (
              <article
                key={g.id}
                className="glass card-shadow rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <h4 className="text-sm font-semibold">{g.title}</h4>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {g.steps.map((s) => (
                    <li key={s} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-secondary" />
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className={cn("rounded-full border px-2 py-0.5 font-medium", diffTone[g.difficulty])}>
                    {g.difficulty}
                  </span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {g.time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5" />
                      {g.tools.length}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
