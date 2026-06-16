import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Phone,
  Navigation,
  Wrench,
  Clock,
  CheckCircle2,
  Circle,
  MapPin,
  MessageCircle,
  Calendar,
  CreditCard,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { CarViewer } from "@/components/CarViewer";
import { MechanicsMap } from "@/components/MechanicsMap";
import { ChatPanel } from "@/components/ChatPanel";
import { useLanguage } from "@/lib/LanguageContext";
type Mechanic = {
  id: string;
  name: string;
  distance_km: number;
  specialties: string[];
  phone: string;
  lat: number;
  lng: number;
  address: string;
};
import { ALL_PARTS, partMatchesFault, type DiagnosticResult, type FaultPart } from "@/lib/parts";
import { isAuthedOrGuest, isGuestUser, signOut } from "@/lib/auth";
import { DiagnosisSkeleton } from "@/components/Skeletons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type DiagnosisApiResult = {
  fault_name: string;
  component_id: string;
  confidence: number;
  probable_causes: string[];
  recommended_actions: string[];
  repair_difficulty: "DIY" | "Professional";
  repair_steps: string[];
};

type DiagnosisApiResponse =
  | {
      status: "success";
      data: DiagnosisApiResult & { diagnosis_id?: number };
    }
  | {
      status: "error";
      message: string;
    };

type RepairGuide = {
  id: string;
  title: string;
  difficulty: "Easy" | "Hard";
  time: string;
  tools: string[];
  steps: string[];
};

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

const toAffectedPart = (componentId: string): FaultPart => {
  const value = componentId.toLowerCase();

  if (value.includes("brake")) return "brakes";
  if (value.includes("battery")) return "battery";
  if (value.includes("suspension") || value.includes("shock") || value.includes("strut"))
    return "suspension";
  if (value.includes("transmission") || value.includes("gear") || value.includes("clutch"))
    return "transmission";
  if (value.includes("exhaust") || value.includes("muffler")) return "exhaust";
  if (value.includes("ac") || value.includes("air_condition") || value.includes("compressor"))
    return "ac";
  if (value.includes("tyre") || value.includes("tire") || value.includes("wheel")) return "tyres";

  return "engine";
};

const toUrgency = (confidence: number): DiagnosticResult["urgency"] => {
  if (confidence >= 85) return "Critical";
  if (confidence >= 60) return "Moderate";
  return "Low";
};

const toDiagnosticResult = (data: DiagnosisApiResult): DiagnosticResult => {
  const affectedPart = toAffectedPart(data.component_id);

  return {
    faults: [
      {
        name: data.fault_name,
        confidence: data.confidence,
        description: data.probable_causes[0] ?? "AI detected this as the most likely fault.",
      },
    ],
    probable_causes: data.probable_causes,
    recommended_actions: data.recommended_actions,
    urgency: toUrgency(data.confidence),
    estimated_cost_pkr: { min: 0, max: 0 },
    affected_parts: [affectedPart],
  };
};

const toRepairGuide = (data: DiagnosisApiResult): RepairGuide[] => [
  {
    id: "ai-repair-guide",
    title: `${data.fault_name} Repair Guide`,
    difficulty: data.repair_difficulty === "DIY" ? "Easy" : "Hard",
    time: data.repair_difficulty === "DIY" ? "30-60 min" : "Professional inspection required",
    tools: data.repair_difficulty === "DIY" ? ["Basic tools", "Safety gloves"] : ["Workshop tools"],
    steps: data.repair_steps,
  },
];

export default function Diagnosis() {
  const navigate = useNavigate();
  const [symptom, setSymptom] = useState("Brake squeal during stops");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [repairGuides, setRepairGuides] = useState<RepairGuide[]>([]);
  const [error, setError] = useState("");
  const { language, t } = useLanguage();
  
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [mechanicsLoading, setMechanicsLoading] = useState(false);
  const [mechanicsError, setMechanicsError] = useState("");
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [activeMechanicId, setActiveMechanicId] = useState<string | null>(null);

  const [diagnosisId, setDiagnosisId] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [resultLanguage, setResultLanguage] = useState<string | null>(null);

  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("10:00 AM");
  const [serviceType, setServiceType] = useState("General Diagnostics");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingInvoice, setBookingInvoice] = useState<any | null>(null);

  const handleOpenBooking = (mechanic: Mechanic) => {
    if (isGuestUser()) {
      toast.info(t("createAccount") + " to book appointments!");
      navigate("/login");
      return;
    }
    setSelectedMechanic(mechanic);
    setBookingStep(1);
    setBookingDate(new Date(Date.now() + 86400000).toISOString().split("T")[0]); // tomorrow
    setBookingTime("10:00 AM");
    setServiceType("General Diagnostics");
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setBookingError("");
    setBookingInvoice(null);
    setBookingModalOpen(true);
  };

  const handleProcessPayment = async () => {
    if (!cardHolder.trim()) {
      setBookingError("Cardholder name is required.");
      return;
    }
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length !== 16 || !/^\d+$/.test(cleanCard)) {
      setBookingError("Card number must be exactly 16 digits.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setBookingError("Expiry date must be MM/YY format.");
      return;
    }
    if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
      setBookingError("CVV must be exactly 3 digits.");
      return;
    }

    setBookingLoading(true);
    setBookingError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
        },
        body: JSON.stringify({
          mechanic_name: selectedMechanic?.name,
          service_type: serviceType,
          booking_date: bookingDate,
          booking_time: bookingTime,
          card_number: cleanCard,
          expiry_date: cardExpiry,
          cvv: cardCvv,
        }),
      });

      const payload = await response.json();
      if (!response.ok || payload.status !== "success") {
        throw new Error(payload.message || "Booking failed.");
      }

      setBookingInvoice(payload.data);

      const currentBalance = parseFloat(localStorage.getItem("vdas:wallet_balance") || "0");
      const newBalance = currentBalance - 1000;
      localStorage.setItem("vdas:wallet_balance", String(newBalance));

      window.dispatchEvent(new Event("vdas:wallet_update"));

      toast.success("Payment successful!");
      setBookingStep(3);
    } catch (err: any) {
      setBookingError(err.message || "Booking failed.");
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthedOrGuest()) {
      navigate("/login");
      return;
    }
    const historyItemStr = sessionStorage.getItem("vdas:historyItem");
    if (historyItemStr) {
      try {
        const historyData = JSON.parse(historyItemStr);
        setResult(toDiagnosticResult(historyData));
        setRepairGuides(toRepairGuide(historyData));
        setResultLanguage(language);
      } catch (e) {
        console.error("Failed to parse history item", e);
      }
    }
    const storedDiagnosisId = sessionStorage.getItem("vdas:diagnosisId");
    if (storedDiagnosisId) {
      setDiagnosisId(parseInt(storedDiagnosisId, 10));
    }
    const s = sessionStorage.getItem("vdas:symptom");
    if (s) setSymptom(s);
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    if (!ready) return;

    setMechanicsLoading(true);
    setMechanicsError("");

    const fetchMechanics = async (lat: number, lng: number) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/mechanics/?lat=${lat}&lng=${lng}`);
        const payload = await response.json();
        if (!response.ok || payload.status !== "success") {
          throw new Error(payload.message || "Failed to load nearby mechanics.");
        }
        setMechanics(payload.data);
      } catch (err: any) {
        setMechanicsError(err.message);
      } finally {
        setMechanicsLoading(false);
      }
    };

    const cachedLat = sessionStorage.getItem("vdas:lat");
    const cachedLng = sessionStorage.getItem("vdas:lng");
    if (cachedLat && cachedLng) {
      const lat = parseFloat(cachedLat);
      const lng = parseFloat(cachedLng);
      setUserLocation({ lat, lng });
      fetchMechanics(lat, lng);
      return;
    }

    if (!navigator.geolocation) {
      setMechanicsError("Geolocation is not supported by your browser");
      setMechanicsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        sessionStorage.setItem("vdas:lat", String(lat));
        sessionStorage.setItem("vdas:lng", String(lng));
        setUserLocation({ lat, lng });
        fetchMechanics(lat, lng);
      },
      () => {
        setMechanicsError("Please allow location access to find nearby mechanics.");
        setMechanicsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [ready]);

  useEffect(() => {
    if (!ready || !symptom.trim()) return;
    if (result && resultLanguage === language) return; // Prevent re-fetching if already loaded in this language

    const controller = new AbortController();

    const loadDiagnosis = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("vdas:accessToken");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/diagnose/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ symptom: symptom.trim(), language: language }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          signOut();
          toast.error("Session expired. Please log in again.");
          navigate("/login");
          return;
        }

        const payload = (await response.json()) as DiagnosisApiResponse;

        if (!response.ok || payload.status !== "success") {
          const message = "message" in payload ? payload.message : "Diagnosis failed.";
          throw new Error(message);
        }

        setResult(toDiagnosticResult(payload.data));
        setRepairGuides(toRepairGuide(payload.data));
        setResultLanguage(language);
        if (payload.data.diagnosis_id) {
          setDiagnosisId(payload.data.diagnosis_id);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        const message = err instanceof Error ? err.message : "Diagnosis failed.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadDiagnosis();

    return () => controller.abort();
  }, [ready, symptom, language, result, resultLanguage]);

  const faultyParts: FaultPart[] = useMemo(
    () => ALL_PARTS.filter((p) => partMatchesFault(p, result?.affected_parts ?? [])),
    [result],
  );

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [bars, setBars] = useState(false);
  useEffect(() => {
    setBars(false);
    const t = window.setTimeout(() => setBars(true), 80);
    return () => window.clearTimeout(t);
  }, [result]);

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

  if (!ready || loading) return <DiagnosisSkeleton />;

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <TopBar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-8 animate-fade-in">
        <button
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className={`h-4 w-4 ${language === "ur" || language === "ar" ? "rotate-180" : ""}`} /> {t("backToHome")}
        </button>

        <div
          className="mt-4 animate-slide-up"
          style={{ animationDelay: "40ms", animationFillMode: "backwards" }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">
            {t("diagnosisTitle")} {t("for")}{" "}
            <span className="gradient-text">"{symptom}"</span>
          </h1>
        </div>

        {error || !result ? (
          <div className="mt-6 glass card-shadow rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-danger/15 text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t("diagnosisFailed")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error || t("diagnosisFailed")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {t("severity")}
                        </p>
                        <h2 className="text-lg font-semibold">{result.faults[0].name}</h2>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        urgencyTone[result.urgency],
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
                    {t("causes")}
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
                    {t("actions")}
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
                          <span
                            className={cn(checked.has(i) && "text-muted-foreground line-through")}
                          >
                            {a}
                          </span>
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
                  <CarViewer autoRotate />
                  <div className="pointer-events-none absolute top-3 left-3 rounded-full border border-danger/30 bg-danger/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-danger animate-pulse-fault">
                    {t("affected")}: {faultyParts[0] ?? "-"}
                  </div>
                </div>
              </section>
            </div>

            <section
              className="mt-10 animate-slide-up"
              style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-secondary" />
                <h3 className="text-xl font-semibold">{t("repairGuide")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("repairStepsSubtitle")}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-6">
                {repairGuides.map((g, i) => {
                  // Chunk steps into 2 or 3 boxes depending on guide length
                  const boxCount = g.steps.length > 6 ? 3 : 2;
                  const chunkSize = Math.ceil(g.steps.length / boxCount);
                  const boxes = [];
                  for (let j = 0; j < g.steps.length; j += chunkSize) {
                    boxes.push(g.steps.slice(j, j + chunkSize));
                  }

                  return (
                    <article
                      key={g.id}
                      className="glass card-shadow rounded-2xl p-6 md:p-8 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-sm font-bold text-primary">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="text-lg font-bold">{g.title}</h4>
                          <p className="text-xs text-muted-foreground">{t("detailedRepairSequence")}</p>
                        </div>
                      </div>

                      <div className="mt-8 space-y-6">
                        {boxes.map((boxSteps, bi) => (
                          <div key={bi} className="relative bg-secondary/5 rounded-2xl border border-border/50 p-5 pt-8 overflow-hidden">
                            <div className="absolute top-0 left-0 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary rounded-br-xl">
                              {t("phase")} {bi + 1}
                            </div>
                            <ul className="space-y-4">
                              {boxSteps.map((s, si) => {
                                const globalIndex = j => {
                                   let count = 0;
                                   for(let k=0; k<j; k++) count += boxes[k].length;
                                   return count;
                                };
                                return (
                                  <li key={si} className="flex gap-4 text-sm text-muted-foreground items-start group">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                      {globalIndex(bi) + si + 1}
                                    </span>
                                    <span className="leading-relaxed">{s}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                      {g.tools.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-elevated px-2.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 font-medium",
                          diffTone[g.difficulty],
                        )}
                      >
                        {g.difficulty === "Easy" ? t("diy") : t("professional")}
                      </span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {g.time}
                        </span>
                      </div>
                    </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section
              className="mt-10 animate-slide-up"
              style={{ animationDelay: "320ms", animationFillMode: "backwards" }}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-secondary" />
                <h3 className="text-lg font-semibold">{t("mechanicsNear")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("mechanicsSubtitle")}
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-12">
                {mechanicsLoading ? (
                  <div className="lg:col-span-12 flex flex-col items-center justify-center py-12 text-muted-foreground glass rounded-2xl">
                    <Clock className="h-8 w-8 mb-3 animate-spin" />
                    <p>{t("locatingMechanics")}</p>
                  </div>
                ) : mechanicsError ? (
                  <div className="lg:col-span-12 flex flex-col items-center justify-center py-12 text-danger glass rounded-2xl">
                    <AlertTriangle className="h-8 w-8 mb-3" />
                    <p>{mechanicsError}</p>
                  </div>
                ) : mechanics.length === 0 ? (
                  <div className="lg:col-span-12 flex flex-col items-center justify-center py-12 text-muted-foreground glass rounded-2xl">
                    <MapPin className="h-8 w-8 mb-3 opacity-50" />
                    <p>{t("noMechanicsFound")}</p>
                  </div>
                ) : (
                  <>
                    <div className="lg:col-span-5 space-y-2">
                      {mechanics.slice(0, 3).map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setActiveMechanicId(m.id)}
                          className={cn(
                            "w-full text-left glass rounded-2xl p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg",
                            activeMechanicId === m.id
                              ? "border-primary/60 shadow-[0_0_0_2px_hsl(244_100%_70%_/_0.35)]"
                              : "hover:border-primary/40",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-semibold">{m.name}</h4>
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 text-secondary" />
                                <span>{m.distance_km} {t("mechanicDistance")}</span>
                              </div>
                              {m.phone !== "Not available" && (
                                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{m.phone}</span>
                                </div>
                              )}
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
                          <div className="mt-2 flex gap-2">
                            {m.phone !== "Not available" ? (
                              <a
                                href={`tel:${m.phone.replace(/\s/g, "")}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-card text-xs font-medium transition-all hover:border-primary/50 active:scale-95"
                              >
                                <Phone className="h-3.5 w-3.5" /> {t("call")}
                              </a>
                            ) : (
                              <span
                                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground opacity-50 cursor-not-allowed"
                              >
                                <Phone className="h-3.5 w-3.5" /> {t("noPhone")}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                directions(m);
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg gradient-bg text-xs font-medium text-white transition-all hover:brightness-110 active:scale-95"
                            >
                              <Navigation className="h-3.5 w-3.5" /> {t("directions")}
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBooking(m);
                            }}
                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-primary bg-primary/10 hover:bg-primary/20 text-xs font-medium text-primary hover:text-primary transition-all active:scale-95"
                          >
                            <Calendar className="h-3.5 w-3.5" /> {t("bookAppointment")}
                          </button>
                        </button>
                      ))}
                    </div>

                    <div className="lg:col-span-7">
                      <div className="glass card-shadow rounded-2xl overflow-hidden h-full min-h-[380px]">
                        <MechanicsMap mechanics={mechanics.slice(0, 3)} activeId={activeMechanicId} userLocation={userLocation} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
        {result && (
          <>
            <button
              onClick={() => {
                if (isGuestUser()) {
                  toast.info(t("createAccount") + " to chat with the V-DAS Assistant!");
                  return;
                }
                setChatOpen(true);
              }}
              className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 h-14 px-5 rounded-2xl gradient-bg text-white font-semibold shadow-2xl shadow-primary/30 transition-all hover:brightness-110 hover:scale-105 active:scale-95 chat-fab-pulse"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="hidden sm:inline">{t("askAi")}</span>
            </button>
            <ChatPanel
              diagnosisId={diagnosisId}
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              onNavigateLogin={() => navigate("/login")}
            />
          </>
        )}

        {/* Booking & Mock Payment Modal */}
        {bookingModalOpen && selectedMechanic && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass rounded-2xl w-full max-w-md overflow-hidden card-shadow border border-white/10 text-card-foreground p-6 relative flex flex-col gap-4 max-h-[95vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {bookingStep === 3 ? t("bookingSuccess") : t("bookAppointment")}
                </h3>
                <button
                  onClick={() => setBookingModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Step 1: Appointment details */}
              {bookingStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">{selectedMechanic.name}</h4>
                    <p className="text-xs text-muted-foreground">{selectedMechanic.address}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {t("serviceType")}
                    </label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                    >
                      <option value="General Diagnostics">General Diagnostics</option>
                      <option value="Engine Repair">Engine Repair</option>
                      <option value="Brake Service">Brake Service</option>
                      <option value="AC/Heating Service">AC/Heating Service</option>
                      <option value="Electrical Checkup">Electrical Checkup</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("selectDate")}
                      </label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("selectTime")}
                      </label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                      >
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="11:00 AM">11:00 AM</option>
                        <option value="12:00 PM">12:00 PM</option>
                        <option value="01:00 PM">01:00 PM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="03:00 PM">03:00 PM</option>
                        <option value="04:00 PM">04:00 PM</option>
                        <option value="05:00 PM">05:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
                    <p>{t("depositFee")}</p>
                  </div>

                  <button
                    onClick={() => setBookingStep(2)}
                    className="w-full py-2.5 rounded-xl gradient-bg text-sm font-semibold text-white hover:brightness-110 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    {t("proceedToPayment")}
                  </button>
                </div>
              )}

              {/* Step 2: Payment checkout */}
              {bookingStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t("walletBalance")}:</span>
                    <span className="font-bold text-primary">
                      {parseFloat(localStorage.getItem("vdas:wallet_balance") || "0").toLocaleString()} PKR
                    </span>
                  </div>

                  {parseFloat(localStorage.getItem("vdas:wallet_balance") || "0") < 1000 ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-xs text-red-400">
                      {t("insufficientFunds")}
                    </div>
                  ) : (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary shrink-0" />
                      <span>{t("depositFee")}</span>
                    </div>
                  )}

                  {bookingError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-xs text-red-400">
                      {bookingError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("cardHolderName")}
                      </label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        disabled={parseFloat(localStorage.getItem("vdas:wallet_balance") || "0") < 1000}
                        className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        {t("cardNumber")}
                      </label>
                      <input
                        type="text"
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const matches = val.match(/\d{4,16}/g);
                          const match = (matches && matches[0]) || "";
                          const parts = [];

                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }

                          if (parts.length > 0) {
                            setCardNumber(parts.join(" "));
                          } else {
                            setCardNumber(val);
                          }
                        }}
                        disabled={parseFloat(localStorage.getItem("vdas:wallet_balance") || "0") < 1000}
                        className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {t("expiryDate")}
                        </label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 2) {
                              val = val.substring(0, 2) + "/" + val.substring(2, 4);
                            }
                            setCardExpiry(val);
                          }}
                          disabled={parseFloat(localStorage.getItem("vdas:wallet_balance") || "0") < 1000}
                          className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {t("cvv")}
                        </label>
                        <input
                          type="password"
                          placeholder="***"
                          maxLength={3}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                          disabled={parseFloat(localStorage.getItem("vdas:wallet_balance") || "0") < 1000}
                          className="w-full bg-elevated border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setBookingStep(1)}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                    >
                      {t("back")}
                    </button>
                    <button
                      onClick={handleProcessPayment}
                      disabled={bookingLoading || parseFloat(localStorage.getItem("vdas:wallet_balance") || "0") < 1000}
                      className="flex-1 py-2.5 rounded-xl gradient-bg text-sm font-semibold text-white hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {bookingLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("payBookingFee")
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Booking Success receipt download */}
              {bookingStep === 3 && bookingInvoice && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mb-3">
                      <Check className="h-6 w-6 text-green-400" />
                    </div>
                    <h4 className="text-base font-bold text-white">{t("bookingSuccess")}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receipt Code: <span className="font-mono text-primary">{bookingInvoice.booking_reference}</span>
                    </p>
                  </div>

                  <div className="bg-elevated border border-white/10 rounded-xl p-4 space-y-2.5 text-xs text-card-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mechanic:</span>
                      <span className="font-semibold text-white">{bookingInvoice.mechanic_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-semibold text-white">{bookingInvoice.service_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-semibold text-white">{bookingInvoice.booking_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-semibold text-white">{bookingInvoice.booking_time}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="text-muted-foreground">Deposit Paid:</span>
                      <span className="font-semibold text-primary">1,000 PKR</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        const receiptText = `-------------------------------------------
V-DAS APPOINTMENT BOOKING RECEIPT
-------------------------------------------
Reference:   ${bookingInvoice.booking_reference}
Status:      CONFIRMED
Date Booked: ${new Date(bookingInvoice.created_at).toLocaleString()}

MECHANIC DETAILS
Name:        ${bookingInvoice.mechanic_name}

SERVICE DETAILS
Type:        ${bookingInvoice.service_type}
Date:        ${bookingInvoice.booking_date}
Time:        ${bookingInvoice.booking_time}

TRANSACTION DETAILS
Deposit Fee: 1,000.00 PKR (Paid)
Payment:     Simulated User Wallet
-------------------------------------------
Thank you for booking with V-DAS!
-------------------------------------------`;
                        const blob = new Blob([receiptText], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `vdas-booking-${bookingInvoice.booking_reference}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                    >
                      {t("downloadReceipt")}
                    </button>
                    <button
                      onClick={() => setBookingModalOpen(false)}
                      className="flex-1 py-2.5 rounded-xl gradient-bg text-sm font-semibold text-white hover:brightness-110 transition-all active:scale-[0.98]"
                    >
                      {t("close")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
