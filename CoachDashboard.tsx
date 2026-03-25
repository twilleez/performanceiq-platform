// ============================================================
// Messaging — Phase 3
// Real-time coach ↔ athlete threads via Supabase Realtime
// Mobile-first thread list + message view
// ============================================================

import React, {
  useState, useEffect, useRef, useCallback, useId,
} from "react";
import { useDevice, useFocalPoint } from "../../hooks/useDevice";
import { supabase } from "../../lib/supabase";
import { analytics } from "../../lib/analytics";

// ── TYPES ─────────────────────────────────────────────────────
interface Thread {
  id: string;
  athleteId: string;
  coachId: string;
  athleteName: string;
  coachName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface MessagingProps {
  currentUserId: string;
  currentUserRole: "coach" | "athlete";
  currentUserName: string;
}

// ── THREAD LIST ───────────────────────────────────────────────
export const MessagingView: React.FC<MessagingProps> = ({
  currentUserId, currentUserRole, currentUserName,
}) => {
  const { isMobile } = useDevice();
  const { setFocal, jumpToFocal } = useFocalPoint();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const threadListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThreads();
  }, [currentUserId]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("piq_message_threads")
        .select(`
          id,
          coach_id,
          athlete_id,
          last_message_at,
          coach:profiles!coach_id(first_name, last_name),
          athlete:profiles!athlete_id(first_name, last_name),
          piq_messages(content, created_at, sender_id, read_at)
        `)
        .or(`coach_id.eq.${currentUserId},athlete_id.eq.${currentUserId}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      const mapped: Thread[] = (data ?? []).map((t: any) => {
        const msgs: any[] = t.piq_messages ?? [];
        const lastMsg = msgs.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const unread = msgs.filter((m: any) => m.sender_id !== currentUserId && !m.read_at).length;

        return {
          id: t.id,
          coachId: t.coach_id,
          athleteId: t.athlete_id,
          coachName: `${t.coach?.first_name ?? ""} ${t.coach?.last_name ?? ""}`.trim(),
          athleteName: `${t.athlete?.first_name ?? ""} ${t.athlete?.last_name ?? ""}`.trim(),
          lastMessage: lastMsg?.content ?? null,
          lastMessageAt: lastMsg?.created_at ?? null,
          unreadCount: unread,
        };
      });

      setThreads(mapped);
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setLoading(false);
    }
  };

  const openThread = (threadId: string) => {
    setActiveThreadId(threadId);
    analytics.track("message_thread_opened", { thread_id: threadId });
    // Mark messages read
    supabase.from("piq_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .neq("sender_id", currentUserId)
      .is("read_at", null)
      .then(() => loadThreads());
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  // Mobile: full-screen message view when thread open
  if (isMobile && activeThreadId && activeThread) {
    return (
      <MessageThread
        thread={activeThread}
        currentUserId={currentUserId}
        onBack={() => setActiveThreadId(null)}
      />
    );
  }

  return (
    <div style={{ display: "flex", height: isMobile ? "auto" : "calc(var(--dvh, 100vh) - var(--nav-height) - 48px)", gap: 1 }}>
      {/* Thread list */}
      <div
        ref={el => { threadListRef.current = el; setFocal(el); }}
        style={{
          width: isMobile ? "100%" : 280,
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--border-radius-md)",
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-default)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "#1a1a2e" }}>
            Messages
          </div>
        </div>

        {loading && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading...
          </div>
        )}

        {!loading && threads.length === 0 && (
          <div style={{ padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              No messages yet.
              {currentUserRole === "coach" && " Start a conversation with an athlete from their profile."}
            </div>
          </div>
        )}

        {threads.map(thread => {
          const otherName = currentUserRole === "coach" ? thread.athleteName : thread.coachName;
          const isActive = activeThreadId === thread.id;
          return (
            <button
              key={thread.id}
              onClick={() => openThread(thread.id)}
              style={{
                width: "100%",
                padding: "12px 16px",
                textAlign: "left",
                background: isActive ? "var(--bg-raised)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-default)",
                cursor: "pointer",
                transition: "background 150ms ease",
                minHeight: 44,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg-raised)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "var(--theme-primary)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, flexShrink: 0,
              }}>
                {otherName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: thread.unreadCount > 0 ? 700 : 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {otherName}
                  </div>
                  {thread.lastMessageAt && (
                    <div style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginLeft: 6 }}>
                      {formatRelativeTime(thread.lastMessageAt)}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 12, color: thread.unreadCount > 0 ? "var(--text-secondary)" : "var(--text-muted)",
                  fontWeight: thread.unreadCount > 0 ? 600 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {thread.lastMessage ?? "No messages yet"}
                </div>
              </div>
              {thread.unreadCount > 0 && (
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", background: "#C0392B",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }} aria-label={`${thread.unreadCount} unread`}>
                  {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop: message thread in right panel */}
      {!isMobile && (
        <div style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: "var(--border-radius-md)", overflow: "hidden" }}>
          {activeThread
            ? <MessageThread thread={activeThread} currentUserId={currentUserId} onBack={() => setActiveThreadId(null)} isDesktopPanel />
            : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Select a conversation
              </div>
          }
        </div>
      )}
    </div>
  );
};

// ── MESSAGE THREAD VIEW ───────────────────────────────────────
const MessageThread: React.FC<{
  thread: Thread;
  currentUserId: string;
  onBack: () => void;
  isDesktopPanel?: boolean;
}> = ({ thread, currentUserId, onBack, isDesktopPanel = false }) => {
  const { isMobile } = useDevice();
  const { setFocal, jumpToFocal } = useFocalPoint();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load messages and subscribe to real-time updates
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`thread-${thread.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "piq_messages",
        filter: `thread_id=eq.${thread.id}`,
      }, (payload) => {
        const newMsg = payload.new as any;
        setMessages(prev => [...prev, {
          id: newMsg.id,
          threadId: newMsg.thread_id,
          senderId: newMsg.sender_id,
          content: newMsg.content,
          readAt: newMsg.read_at,
          createdAt: newMsg.created_at,
        }]);
        scrollToBottom();
        // Mark as read if we're looking at it
        if (newMsg.sender_id !== currentUserId) {
          supabase.from("piq_messages")
            .update({ read_at: new Date().toISOString() })
            .eq("id", newMsg.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [thread.id]);

  useEffect(() => {
    if (containerRef.current) {
      setFocal(containerRef.current);
      jumpToFocal({ behavior: "instant", highlightDuration: 0 });
    }
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("piq_messages")
      .select("id, thread_id, sender_id, content, read_at, created_at")
      .eq("thread_id", thread.id)
      .order("created_at");

    setMessages((data ?? []).map((m: any) => ({
      id: m.id,
      threadId: m.thread_id,
      senderId: m.sender_id,
      content: m.content,
      readAt: m.read_at,
      createdAt: m.created_at,
    })));
    scrollToBottom("instant");
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior }), 50);
  };

  const sendMessage = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || sending) return;

    setSending(true);
    setInputValue("");

    const { error } = await supabase.from("piq_messages").insert({
      thread_id: thread.id,
      sender_id: currentUserId,
      content,
    });

    if (!error) {
      analytics.track("message_sent", { thread_id: thread.id });
    }
    setSending(false);
    inputRef.current?.focus();
  }, [inputValue, sending, thread.id, currentUserId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const otherName = currentUserId === thread.coachId ? thread.athleteName : thread.coachName;

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: isMobile && !isDesktopPanel
          ? "calc(var(--dvh, 100vh) - 52px)"
          : "100%",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-default)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexShrink: 0,
      }}>
        {!isDesktopPanel && (
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Back to messages"
          >
            ←
          </button>
        )}
        <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
          {otherName}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, i) => {
          const isMine = msg.senderId === currentUserId;
          const isFirst = i === 0 || messages[i - 1].senderId !== msg.senderId;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginTop: isFirst ? 6 : 0 }}>
              <div
                style={{
                  maxWidth: "72%",
                  padding: "9px 13px",
                  borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: isMine ? "var(--theme-primary)" : "var(--bg-raised)",
                  border: isMine ? "none" : "1px solid var(--border-default)",
                  color: isMine ? "#fff" : "var(--text-primary)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
                <div style={{ fontSize: 10, color: isMine ? "rgba(255,255,255,.55)" : "var(--text-muted)", marginTop: 4, textAlign: isMine ? "right" : "left" }}>
                  {formatTime(msg.createdAt)}
                  {isMine && msg.readAt && " · Read"}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--border-default)", display: "flex", gap: 8, flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          style={{
            flex: 1, border: "1px solid var(--border-default)", borderRadius: 22,
            padding: "10px 16px", fontFamily: "var(--font-body)", fontSize: 14,
            color: "var(--text-primary)", resize: "none", outline: "none",
            lineHeight: 1.4, maxHeight: 100, overflowY: "auto",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
        />
        <button
          onClick={sendMessage}
          disabled={!inputValue.trim() || sending}
          aria-label="Send message"
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: inputValue.trim() ? "var(--theme-primary)" : "var(--border-default)",
            color: "#fff", cursor: inputValue.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0, transition: "background 150ms ease",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
};

// ── HELPERS ───────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1)  return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24)   return `${hours}h`;
  if (days < 7)     return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
