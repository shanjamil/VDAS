import { useEffect, useRef, useState } from "react";
import {
  X,
  Send,
  MessageCircle,
  Bot,
  User,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "Is it safe to drive like this?",
  "How much will the repair cost?",
  "Can I fix this myself?",
  "What tools do I need?",
];

interface ChatPanelProps {
  diagnosisId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateLogin: () => void;
}

export function ChatPanel({
  diagnosisId,
  isOpen,
  onClose,
  onNavigateLogin,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { language, t } = useLanguage();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Load existing chat history when panel opens with a diagnosis ID
  useEffect(() => {
    if (!isOpen || !diagnosisId) return;

    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/chat/?diagnosis_id=${diagnosisId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
            },
          },
        );

        if (response.status === 401) {
          signOut();
          toast.error("Session expired. Please log in again.");
          onNavigateLogin();
          return;
        }

        const data = await response.json();
        if (data.status === "success" && Array.isArray(data.data)) {
          setMessages(
            data.data.map((m: any, i: number) => ({
              id: `history-${i}`,
              role: m.role,
              content: m.content,
            })),
          );
        }
      } catch {
        // Silently fail — user can still send new messages
      }
    };

    loadHistory();
  }, [isOpen, diagnosisId, onNavigateLogin]);

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || sending) return;

    if (!diagnosisId) {
      setError("No diagnosis linked. Run a diagnosis first.");
      return;
    }

    setInput("");
    setError("");
    setSending(true);

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vdas:accessToken")}`,
        },
        body: JSON.stringify({
          diagnosis_id: diagnosisId,
          message: messageText,
          language: language,
        }),
      });

      if (response.status === 401) {
        signOut();
        toast.error("Session expired. Please log in again.");
        onNavigateLogin();
        return;
      }

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Chat failed.");
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.data.reply,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          // Mobile: full width bottom sheet
          "inset-x-0 bottom-0 md:inset-x-auto md:bottom-6 md:right-6",
          // Desktop: fixed-width panel
          "md:w-[420px]",
          isOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="flex flex-col h-[85vh] md:h-[600px] md:rounded-2xl overflow-hidden border border-border/50 bg-background shadow-2xl shadow-primary/10">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 gradient-bg">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                <MessageCircle className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  V-DAS Assistant
                </h3>
                <p className="text-[11px] text-white/70">
                  {t("chatPlaceholder")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
          >
            {messages.length === 0 && !sending && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h4 className="text-base font-semibold mb-1">
                  {t("askAi")}
                </h4>
                <p className="text-xs text-muted-foreground max-w-[260px] mb-6">
                  I have full context of your diagnosis. Ask about costs,
                  safety, tools, or next steps.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:-translate-y-0.5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5 chat-message-appear",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg mt-0.5",
                    msg.role === "user"
                      ? "gradient-bg"
                      : "bg-elevated border border-border/50",
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "gradient-bg text-white rounded-tr-md"
                      : "glass rounded-tl-md text-foreground",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div className="flex gap-2.5 chat-message-appear">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-elevated border border-border/50 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="glass rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="chat-typing-dot" />
                    <span
                      className="chat-typing-dot"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="chat-typing-dot"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-xl px-3 py-2 mx-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border/50 px-4 py-3 bg-card/50">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chatPlaceholder")}
                rows={1}
                disabled={sending}
                className={cn(
                  "flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none py-2 max-h-24 disabled:opacity-50",
                  (language === "ur" || language === "ar") ? "text-right" : "text-left"
                )}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all",
                  input.trim() && !sending
                    ? "gradient-bg text-white shadow-md hover:brightness-110 hover:scale-105 active:scale-95"
                    : "bg-elevated text-muted-foreground cursor-not-allowed",
                )}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
