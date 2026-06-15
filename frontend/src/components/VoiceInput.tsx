import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/lib/LanguageContext";

// Minimal SpeechRecognition typing
type AnyRecognition = any;

export const VoiceInput = ({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) => {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<AnyRecognition | null>(null);
  const finalTextRef = useRef("");
  const { language, t } = useLanguage();

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    
    // Dynamically set speech language locale
    if (language === "ur" || language === "roman-ur") {
      rec.lang = "ur-PK";
    } else if (language === "ar") {
      rec.lang = "ar-SA";
    } else {
      rec.lang = "en-US";
    }
    
    rec.onstart = () => {
      finalTextRef.current = "";
    };

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTextRef.current += t + " ";
        else interim += t;
      }
      onTranscript((finalTextRef.current + interim).trim());
    };
    rec.onend = () => setRecording(false);
    rec.onerror = (e: any) => {
      setRecording(false);
      if (e.error !== "aborted") toast.error(`Voice error: ${e.error}`);
    };
    recRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
    };
  }, [onTranscript, language]);

  const toggle = () => {
    if (!supported) {
      toast.error(t("voiceNotSupported"));
      return;
    }
    if (recording) {
      recRef.current?.stop();
    } else {
      try {
        recRef.current?.start();
        setRecording(true);
      } catch {
        // Already started
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={recording ? "Stop recording" : "Start voice input"}
        className={cn(
          "relative grid place-items-center h-12 w-12 rounded-full text-white transition active:scale-95",
          recording ? "bg-danger animate-pulse-fault" : "gradient-bg hover:brightness-110"
        )}
      >
        {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      {recording ? (
        <div className="flex items-center gap-2">
          <Waveform />
          <span className="text-xs text-danger font-medium">{t("listening")}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">
          {supported ? t("tapToDictate") : t("voiceNotSupported")}
        </span>
      )}
    </div>
  );
};

const Waveform = () => (
  <div className="flex items-end gap-0.5 h-5">
    {[0, 1, 2, 3, 4].map((i) => (
      <span
        key={i}
        className="w-1 bg-danger rounded-full origin-bottom animate-bar"
        style={{ height: "100%", animationDelay: `${i * 0.12}s` }}
      />
    ))}
  </div>
);
