import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Compass,
  MapPin,
  MessageSquareText,
  Send,
  Settings2,
  Sparkles,
  Sun,
  Waves,
} from "lucide-react";
import { CurrencySwitcher } from "@/contexts/CurrencyContext";
import { LanguageSwitcher } from "@/contexts/LanguageContext";
import { getSessionId } from "@/lib/session";
import "./chat-dashboard.css";
import TypingIndicator from "@/components/TypingIndicator";
import { QuickReplies } from "@/components/QuickReplies";
import ChatMessage from "@/components/ChatMessage";
import ThemeToggle from "@/components/ThemeToggle";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  time: string;
  meta?: {
    locations?: any[];
    bookingSuggestions?: any[];
    faqLinks?: any[];
    alerts?: any[];
  };
}

interface StreamEvent {
  type: string;
  text?: string;
  content?: string;
  error?: string;
  locations?: any[];
  bookingSuggestions?: any[];
  faqLinks?: any[];
  alerts?: any[];
  provider?: string;
  model?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "sample-user",
    role: "user",
    content: "I have one afternoon in Stone Town. What should I make time for?",
    time: "10:42 AM",
  },
  {
    id: "sample-guide",
    role: "assistant",
    content:
      "A lovely way to spend the afternoon is to wander Stone Town's old lanes, then finish by the water as the day cools.\n\nStart at the House of Wonders and the Old Fort, both close to the seafront. Leave a little time to notice the carved doors and shaded courtyards along the way.\n\nAround sunset, head to Forodhani Gardens for the harbour light and a taste of Zanzibar street food. Keep your pace easy; the lanes are best explored on foot.",
    time: "10:42 AM",
  },
];

const SUGGESTIONS = ["Build me a day plan", "Where to eat tonight?", "Best beaches for swimming"];
const STONE_TOWN_IMAGE =
  "https://images.unsplash.com/photo-1739197843134-9e971f74cbff?auto=format&fit=crop&w=1000&q=85";

export default function ChatDashboard() {
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [providerLabel, setProviderLabel] = useState("Adaptive AI");
  const [chatReady, setChatReady] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [destinationSaved, setDestinationSaved] = useState(false);
  const [contextualQuickReplies, setContextualQuickReplies] = useState<string[] | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/health")
      .then(async (response) => {
        if (!response.ok) throw new Error("Health check failed");
        return (await response.json()) as {
          aiProvider?: string;
          activeAiProvider?: string;
          aiConfigured?: boolean;
        };
      })
      .then((health) => {
        const provider = health.aiProvider || health.activeAiProvider || "auto";
        setProviderLabel(provider === "auto" ? "Adaptive AI" : `${provider} assistant`);
        setChatReady(Boolean(health.aiConfigured));
      })
      .catch(() => setChatReady(false));
  }, []);

  useEffect(() => {
    if (messages.length <= INITIAL_MESSAGES.length) return;
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date()),
    };
    const assistantId = `assistant-${Date.now()}`;
    const history = [...messages.filter((message) => !message.id.startsWith("sample-")), userMessage].map(
      ({ role, content }) => ({ role, content }),
    );

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "", time: "Just now" },
    ]);
    setInput("");
    setIsSending(true);

    try {
      const token = localStorage.getItem("travelguide_token");
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: history,
          sessionId: getSessionId(),
          channel: "web",
        }),
      });

      if (!response.ok || !response.body) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorBody.error || `Chat failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      const consumeEvent = (rawEvent: string) => {
        const dataLine = rawEvent.split(/\r?\n/).find((line) => line.startsWith("data:"));
        if (!dataLine) return;
        const payload = dataLine.slice(5).trim();
        if (payload === "[DONE]") return;
        const event = JSON.parse(payload) as StreamEvent;
        if (event.type === "token" && event.text) {
          assembled += event.text;
          setMessages((current) =>
            current.map((message) => (message.id === assistantId ? { ...message, content: assembled } : message)),
          );
        }
        if (event.type === "done") {
          assembled = event.content || assembled;
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: assembled,
                    meta: {
                      locations: event.locations || [],
                      bookingSuggestions: event.bookingSuggestions || [],
                      faqLinks: event.faqLinks || [],
                      alerts: event.alerts || [],
                      sources: (event as any).sources || [],
                    },
                  }
                : message,
            ),
          );
          // set contextual quick replies if provided by the server (uiHints)
          try {
            const ui = (event as any).uiHints;
            if (ui && Array.isArray(ui.quickReplies)) {
              setContextualQuickReplies(ui.quickReplies);
            } else {
              setContextualQuickReplies(null);
            }
          } catch {
            setContextualQuickReplies(null);
          }
          setChatReady(true);
        }
        if (event.type === "error") throw new Error(event.error || "The guide could not respond.");
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";
        for (const event of events) consumeEvent(event);
      }
      if (buffer.trim()) consumeEvent(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setChatReady(false);
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: item.content || `I couldn't reach the guide just now. ${message}`,
              }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleExplore() {
    navigate("/explore");
  }

  return (
    <div className="zanzibar-dashboard">
      <aside className="zd-sidebar" aria-label="Main navigation">
        <Link href="/" className="zd-brand" aria-label="Zanzibar Guide home">
          <span className="zd-brand-mark"><Compass size={21} strokeWidth={1.8} /></span>
          <span className="zd-brand-copy">
            <strong>ZANZIBAR</strong>
            <span>ISLAND GUIDE</span>
          </span>
        </Link>

        <div className="zd-nav-label">WORKSPACE</div>
        <nav className="zd-nav">
          <button className="zd-nav-item" type="button" onClick={handleExplore}>
            <Compass size={17} /><span>Explore Zanzibar</span><ArrowUpRight className="zd-nav-arrow" size={14} />
          </button>
          <Link className="zd-nav-item" href="/account">
            <CalendarDays size={17} /><span>My Bookings</span><ArrowUpRight className="zd-nav-arrow" size={14} />
          </Link>
          <a className="zd-nav-item is-active" href="#chat-feed">
            <MessageSquareText size={17} /><span>AI Chat Assistant</span><span className="zd-active-dot" />
          </a>
          <button className={`zd-nav-item ${settingsOpen ? "is-selected" : ""}`} type="button" onClick={() => setSettingsOpen((open) => !open)} aria-expanded={settingsOpen}>
            <Settings2 size={17} /><span>Settings</span><ChevronDown className={`zd-nav-arrow ${settingsOpen ? "is-open" : ""}`} size={14} />
          </button>
        </nav>

        {settingsOpen && (
          <div className="zd-settings-panel">
            <div className="zd-settings-heading">Preferences</div>
            <label>Language<LanguageSwitcher /></label>
            <label>Currency<CurrencySwitcher /></label>
          </div>
        )}

        <div className="zd-trip-card">
          <div className="zd-trip-overline"><span className="zd-trip-marker" /> YOUR ISLAND ESCAPE</div>
          <strong>Stone Town & the coast</strong>
          <span>Make every hour count.</span>
          <button type="button" onClick={() => void sendMessage("Help me plan a balanced Zanzibar itinerary with Stone Town and the coast.")}>
            Plan your trip <ArrowRight size={14} />
          </button>
        </div>

        <div className="zd-sidebar-bottom">
          <div className="zd-connection"><span className={`zd-status-dot ${chatReady === false ? "is-down" : ""}`} />
            <span>{chatReady === null ? "Connecting to guide" : chatReady ? "Guide ready" : "Guide unavailable"}</span>
          </div>
          <div className="zd-profile">
            <div className="zd-profile-avatar">TG</div>
            <div><strong>Travel guest</strong><span>Personal itinerary</span></div>
            <button type="button" title="Open preferences" aria-label="Open preferences" onClick={() => setSettingsOpen((open) => !open)}><Settings2 size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="zd-main">
        <header className="zd-topbar">
          <div className="zd-topbar-title">
            <span className="zd-eyebrow">YOUR PERSONAL ISLAND CONCIERGE</span>
            <div className="zd-heading-row"><h1>AI Chat Assistant</h1><span className="zd-mobile-provider"><Sparkles size={13} /> {providerLabel}</span></div>
          </div>
          <div className="zd-topbar-actions">
            <span className="zd-provider-pill"><span className="zd-provider-glow" /><Sparkles size={14} />{providerLabel}<ChevronDown size={13} /></span>
            <ThemeToggle />
            <div className="zd-top-avatar" aria-label="Travel guest">TG</div>
          </div>
        </header>

        <nav className="zd-mobile-nav" aria-label="Mobile navigation">
          <button type="button" onClick={handleExplore}><Compass size={16} />Explore</button>
          <Link href="/account"><CalendarDays size={16} />Bookings</Link>
          <a className="is-active" href="#chat-feed"><MessageSquareText size={16} />AI Chat</a>
          <button type="button" onClick={() => setSettingsOpen((open) => !open)}><Settings2 size={16} />Settings</button>
        </nav>
        {settingsOpen && (
          <div className="zd-mobile-settings">
            <span>Language</span><LanguageSwitcher />
            <span>Currency</span><CurrencySwitcher />
          </div>
        )}

        <section className="zd-conversation" aria-label="Conversation with the Zanzibar travel guide">
          <div className="zd-conversation-intro">
            <div className="zd-day-divider"><span /> {new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase()} <span /></div>
            <h2>Good morning, traveller <Sparkles className="zd-wave" size={14} aria-hidden="true" /></h2>
            <p>Where shall we take you today?</p>
          </div>

          <div className="zd-message-feed" id="chat-feed" ref={feedRef} aria-live="polite">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} providerLabel={providerLabel} />
            ))}
            <div className="zd-feed-end"><ArrowDown size={13} /> YOU'RE UP TO DATE</div>
          </div>

          <div className="zd-composer-area">
            <div className="zd-suggestion-row" aria-label="Suggested questions">
              {contextualQuickReplies && contextualQuickReplies.length ? (
                contextualQuickReplies.map((s) => (
                  <button key={s} type="button" onClick={() => void sendMessage(s)} disabled={isSending}>
                    {s} <ArrowUpRight size={13} />
                  </button>
                ))
              ) : (
                <QuickReplies onSelect={(q) => void sendMessage(q)} isLoading={isSending} />
              )}
            </div>
            <form className="zd-composer" onSubmit={handleSubmit}>
              <input
                aria-label="Message the Zanzibar Guide"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about Zanzibar, your plans, or anything in between..."
                disabled={isSending}
              />
              <span className="zd-composer-hint">ENTER TO SEND</span>
              <button type="submit" aria-label="Send message" disabled={!input.trim() || isSending}>
                {isSending ? <span className="zd-send-spinner" /> : <Send size={17} />}
              </button>
            </form>
            <div className="zd-composer-foot"><span><Check size={12} /> Your plans stay yours</span><span>AI can make mistakes. Verify important travel details.</span></div>
          </div>
        </section>
      </main>

      <aside className="zd-insights" aria-label="Destination details">
        <div className="zd-insights-heading">
          <div><span className="zd-eyebrow">A LITTLE LOCAL KNOW-HOW</span><h2>Island notes</h2></div>
          <button type="button" title="Ask for more destination details" aria-label="Ask for more destination details" onClick={() => void sendMessage("Share a few more local highlights and cultural details about Stone Town.")}><ArrowUpRight size={16} /></button>
        </div>

        <section className="zd-destination-card" id="destination-preview">
          <div className="zd-destination-image">
            <img src={STONE_TOWN_IMAGE} alt="Stone Town's historic waterfront and carved wooden doors" />
            <span className="zd-image-tag"><MapPin size={12} /> UNGUNJA ISLAND</span>
            <span className="zd-image-count">01 / 04</span>
          </div>
          <div className="zd-destination-copy">
            <div className="zd-destination-title"><div><span className="zd-eyebrow">CULTURE / HERITAGE</span><h3>Stone Town</h3></div><button type="button" title={destinationSaved ? "Remove Stone Town from saved places" : "Save Stone Town"} aria-label={destinationSaved ? "Remove Stone Town from saved places" : "Save Stone Town"} aria-pressed={destinationSaved} onClick={() => setDestinationSaved((saved) => !saved)}>{destinationSaved ? <Check size={15} /> : <span>+</span>}</button></div>
            <p>A living Swahili city of coral-stone lanes, carved doors, and Indian Ocean stories.</p>
            <div className="zd-destination-tags"><span>UNESCO heritage</span><span>Walkable</span></div>
            <button className="zd-text-link" type="button" onClick={() => void sendMessage("What are the highlights of Stone Town for a first-time visitor?")}>Explore highlights <ArrowRight size={14} /></button>
          </div>
        </section>

        <section className="zd-weather-panel" aria-label="Island conditions">
          <div className="zd-weather-top"><div><span className="zd-eyebrow">ISLAND NOTES</span><h3>Coastal rhythm</h3></div><Waves size={18} /></div>
          <div className="zd-weather-info"><div className="zd-sun-icon"><Sun size={22} /></div><div><strong>Take it slow</strong><span>Warm afternoons, softer by the sea</span></div></div>
          <div className="zd-weather-note"><span>LOCAL TIP</span>Plan your old-town walk for late afternoon, then stay for the harbour at sunset.</div>
        </section>

        <section className="zd-highlights">
          <div className="zd-section-title"><h3>Stone Town highlights</h3><span>3 PLACES</span></div>
          <button type="button" onClick={() => void sendMessage("Tell me about the House of Wonders in Stone Town.")}><span className="zd-highlight-number">01</span><span><strong>House of Wonders</strong><small>Seafront landmark</small></span><ArrowUpRight size={14} /></button>
          <button type="button" onClick={() => void sendMessage("What can I see at the Old Fort in Stone Town?")}><span className="zd-highlight-number">02</span><span><strong>The Old Fort</strong><small>History & open-air events</small></span><ArrowUpRight size={14} /></button>
          <button type="button" onClick={() => void sendMessage("What should I try at Forodhani Gardens?")}><span className="zd-highlight-number">03</span><span><strong>Forodhani Gardens</strong><small>Harbour-side food market</small></span><ArrowUpRight size={14} /></button>
        </section>

        <div className="zd-insights-footer"><span>CURATED FOR YOUR JOURNEY</span><span>01 <span className="zd-footer-line" /> 04</span></div>
      </aside>
    </div>
  );
}
