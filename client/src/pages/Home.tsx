import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  AlertCircle,
  Send,
  MessageCircle,
  Languages,
  Heart,
  ExternalLink,
  PanelRight,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Compass,
  Search,
  CalendarDays,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ChatMap, MapLocation } from "@/components/ChatMap";
import { BookingModal } from "@/components/BookingModal";
import { QuickReplies } from "@/components/QuickReplies";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { FaqPanel } from "@/components/FaqPanel";
import { FavoritesPanel } from "@/components/FavoritesPanel";
import { AttractionCard } from "@/components/AttractionCard";
import { VoiceInput } from "@/components/VoiceInput";
import { ItineraryPanel } from "@/components/ItineraryPanel";
import { OpenDataSearch } from "@/components/OpenDataSearch";
import { SourceChips } from "@/components/SourceChips";
import { CompanionPanel } from "@/components/CompanionPanel";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { HandoffPanel } from "@/components/HandoffPanel";
import { BrochureUploadPanel } from "@/components/BrochureUploadPanel";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { SpeakButton } from "@/components/SpeakButton";
import { RoutePlannerPanel } from "@/components/RoutePlannerPanel";
import { PackingListPanel } from "@/components/PackingListPanel";
import { SouvenirsPanel } from "@/components/SouvenirsPanel";
import { PhraseTranslatorPanel } from "@/components/PhraseTranslatorPanel";
import { DocumentVaultPanel } from "@/components/DocumentVaultPanel";
import { DemoScriptButton } from "@/components/DemoScriptButton";
import { CatalogSearchPanel } from "@/components/CatalogSearchPanel";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { CurrencyConverterPanel } from "@/components/CurrencyConverterPanel";
import "./explore-page.css";
import { BudgetCalculatorPanel } from "@/components/BudgetCalculatorPanel";
import { DiningGuidePanel } from "@/components/DiningGuidePanel";
import { SpendingTrackerPanel } from "@/components/SpendingTrackerPanel";
import { StorytellerPanel } from "@/components/StorytellerPanel";
import { SuitabilityWeatherPanel } from "@/components/SuitabilityWeatherPanel";
import { TripWizardPanel } from "@/components/TripWizardPanel";
import { ArrivalLogisticsPanel } from "@/components/ArrivalLogisticsPanel";
import { PolicyModePanel } from "@/components/PolicyModePanel";
import {
  AlsoVisitedPanel,
  ComparePanel,
  GamificationPanel,
  PriceAlertPanel,
  TransportInfoPanel,
  TrendingPanel,
} from "@/components/EngagementPanels";
import { TravelProfilePanel } from "@/components/TravelProfilePanel";
import { BookingsPanel } from "@/components/BookingsPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFavorites } from "@/hooks/useFavorites";
import { useLanguage, LanguageSwitcher, type Language } from "@/contexts/LanguageContext";
import { CurrencySwitcher } from "@/contexts/CurrencyContext";
import { BRAND } from "@shared/travel";
import type { FaqArticle, SafetyAdvisory } from "@shared/catalog";
import type { CitationSource } from "@shared/sources";
import { getSessionId } from "@/lib/session";
import { rememberGuestBooking } from "@/lib/bookings";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  locations?: MapLocation[];
  faqLinks?: FaqArticle[];
  alerts?: SafetyAdvisory[];
  sources?: CitationSource[];
  imageUrl?: string;
}

interface BookingTarget {
  id: string;
  name: string;
  type: "hotel" | "attraction" | "tour";
  price: string;
}

type ChatStatus = "checking" | "configured" | "setup" | "issue" | "unavailable";

const FEATURE_IMAGES = {
  attractions:
    "https://images.unsplash.com/photo-1739197843134-9e971f74cbff?auto=format&fit=crop&w=900&q=80",
  safety:
    "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=80",
  booking:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
};

export default function Home() {
  const { language, t } = useLanguage();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | undefined>();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingItem, setSelectedBookingItem] = useState<BookingTarget | undefined>();
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("checking");
  const [chatProvider, setChatProvider] = useState("");
  const [alerts, setAlerts] = useState<SafetyAdvisory[]>([]);
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolCategory, setToolCategory] = useState<string | null>(null);
  const [toolQuery, setToolQuery] = useState("");
  const [isXl, setIsXl] = useState(false);
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem("travelguide_auto_speak") === "1");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const failedAttemptRef = useRef<{ text: string; userId: string; assistantId: string } | null>(null);
  const greetingSet = useRef(false);
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;

  useEffect(() => {
    if (greetingSet.current && messages.length) {
      setMessages((prev) => {
        if (prev[0]?.type !== "assistant") return prev;
        const next = [...prev];
        next[0] = { ...next[0], content: t("hello") };
        return next;
      });
      return;
    }
    setMessages([
      {
        id: "1",
        type: "assistant",
        content: t("hello"),
        timestamp: new Date(),
      },
    ]);
    greetingSet.current = true;
  }, [language, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/safety/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Health check failed (${res.status})`);
        return (await res.json()) as { activeAiProvider?: string; aiConfigured?: boolean };
      })
      .then((health) => {
        setChatProvider(health.activeAiProvider || "");
        setChatStatus(health.aiConfigured ? "configured" : "setup");
      })
      .catch(() => setChatStatus("unavailable"));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsXl(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Stripe Checkout return — confirm payment and notify
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paidId = params.get("paid");
    if (!paidId) return;
    const token = localStorage.getItem("travelguide_token");
    fetch("/api/payments/confirm-stripe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ bookingId: paidId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.confirmationCode) {
          rememberGuestBooking(paidId);
          setBookingsRefreshKey((k) => k + 1);
          setMessages((prev) => [
            ...prev,
            {
              id: `paid_${paidId}`,
              type: "assistant",
              content: `Payment confirmed. Confirmation code: ${d.data.confirmationCode}. Track: /bookings/${d.data.confirmationCode}`,
              timestamp: new Date(),
            },
          ]);
        }
        window.history.replaceState({}, "", window.location.pathname);
      })
      .catch(() => {});
  }, []);

  const handleQuickReply = (question: string) => {
    setInput(question);
    setTimeout(() => {
      handleSendMessage(new Event("submit") as unknown as React.FormEvent, question);
    }, 0);
  };

  const handleSendMessage = async (
    e: React.FormEvent,
    messageText?: string,
    previousMessages: ChatMessage[] = messages,
  ) => {
    e.preventDefault();
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    const historyForApi = [...previousMessages, userMessage].map((m) => ({
      role: m.type as "user" | "assistant",
      content: m.content,
    }));

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, type: "assistant", content: "", timestamp: new Date() },
    ]);
    setInput("");
    setIsLoading(true);
    setErrorHint(null);
    setChatStatus("checking");

    try {
      const token = localStorage.getItem("travelguide_token");
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: historyForApi,
          sessionId: getSessionId(),
          channel: "web",
        }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error((errBody as { error?: string }).error || `Chat failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type: string;
              text?: string;
              content?: string;
              locations?: MapLocation[];
              faqLinks?: FaqArticle[];
              alerts?: SafetyAdvisory[];
              error?: string;
            };
            if (evt.type === "token" && evt.text) {
              assembled += evt.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assembled } : m)),
              );
            }
            if (evt.type === "done") {
              failedAttemptRef.current = null;
              setChatStatus("configured");
              const locations = evt.locations ?? [];
              const finalContent = evt.content || assembled;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: finalContent,
                        locations: locations.length ? locations : undefined,
                        faqLinks: evt.faqLinks,
                        alerts: evt.alerts,
                        sources: (evt as { sources?: CitationSource[] }).sources,
                      }
                    : m,
                ),
              );
              if (locations.length) {
                setMapLocations(locations);
                setSelectedLocation(locations[0]);
              }
              if (autoSpeakRef.current && finalContent && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(finalContent.replace(/[*#_>`]/g, " ").slice(0, 1200));
                window.speechSynthesis.speak(u);
              }
            }
            if (evt.type === "error") throw new Error(evt.error || "Stream error");
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      failedAttemptRef.current = { text: textToSend, userId: userMessage.id, assistantId };
      setChatStatus("issue");
      setErrorHint(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  m.content ||
                  "I couldn't get a reply. Check the chat status above and try again.",
              }
            : m,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastMessage = () => {
    const failedAttempt = failedAttemptRef.current;
    if (!failedAttempt || isLoading) return;
    const previousMessages = messages.filter(
      (message) => message.id !== failedAttempt.userId && message.id !== failedAttempt.assistantId,
    );
    setMessages(previousMessages);
    void handleSendMessage(
      new Event("submit") as unknown as React.FormEvent,
      failedAttempt.text,
      previousMessages,
    );
  };

  const chatStatusText = {
    checking: t("aiChecking"),
    configured: t("aiConfigured"),
    setup: t("aiSetupNeeded"),
    issue: t("aiNeedsAttention"),
    unavailable: t("aiStatusUnavailable"),
  }[chatStatus];
  const chatStatusTone = {
    checking: "bg-muted text-muted-foreground",
    configured: "bg-emerald-50 text-emerald-800",
    setup: "bg-amber-50 text-amber-900",
    issue: "bg-red-50 text-red-800",
    unavailable: "bg-muted text-muted-foreground",
  }[chatStatus];
  const chatStatusDot = {
    checking: "bg-muted-foreground animate-pulse",
    configured: "bg-emerald-600",
    setup: "bg-amber-600",
    issue: "bg-red-600",
    unavailable: "bg-muted-foreground",
  }[chatStatus];

  const handleOpenBooking = (location: MapLocation) => {
    setSelectedBookingItem({
      id: location.id,
      name: location.name,
      type: location.type === "hotel" ? "hotel" : location.type === "attraction" ? "attraction" : "tour",
      price: location.price || "On request",
    });
    setBookingModalOpen(true);
  };

  const handleVisionResult = (
    result: {
      content: string;
      locations?: MapLocation[];
      faqLinks?: FaqArticle[];
      alerts?: SafetyAdvisory[];
      sources?: CitationSource[];
    },
    previewUrl: string,
    caption: string,
  ) => {
    const locations = result.locations || [];
    setMessages((prev) => [
      ...prev,
      {
        id: `img_u_${Date.now()}`,
        type: "user",
        content: caption || "Photo uploaded",
        timestamp: new Date(),
        imageUrl: previewUrl,
      },
      {
        id: `img_a_${Date.now() + 1}`,
        type: "assistant",
        content: result.content,
        timestamp: new Date(),
        locations: locations.length ? locations : undefined,
        faqLinks: result.faqLinks,
        alerts: result.alerts,
        sources: result.sources,
      },
    ]);
    if (locations.length) {
      setMapLocations(locations);
      setSelectedLocation(locations[0]);
    }
  };

  const findNearbyEmergency = () => {
    setEmergencyStatus("Locating…");
    if (!navigator.geolocation) {
      setEmergencyStatus("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const res = await fetch(`/api/emergency/nearby?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Lookup failed");
          const locs = (data.data || []) as MapLocation[];
          setMapLocations(locs);
          setSelectedLocation(locs[0]);
          setEmergencyStatus(`Found ${locs.length} nearby support centers`);
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              type: "assistant",
              content: `Nearest emergency support from your location:\n\n${locs
                .map((l: MapLocation & { distanceKm?: number }) => `• ${l.name}${l.distanceKm != null ? ` (${l.distanceKm} km)` : ""} — ${l.description || ""}`)
                .join("\n")}`,
              timestamp: new Date(),
              locations: locs,
            },
          ]);
        } catch (err) {
          setEmergencyStatus(err instanceof Error ? err.message : "Emergency lookup failed");
        }
      },
      () => setEmergencyStatus("Location permission denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const renderToolsRail = () => {
    const toolCategories = [
      {
        id: "discover",
        title: t("essentials"),
        description: t("discoverToolsDescription"),
        icon: Compass,
        count: 8,
      },
      {
        id: "plan",
        title: t("planAndBook"),
        description: t("planToolsDescription"),
        icon: CalendarDays,
        count: 13,
      },
      {
        id: "help",
        title: t("helpAndInfo"),
        description: t("helpToolsDescription"),
        icon: ShieldCheck,
        count: 11,
      },
      {
        id: "extras",
        title: t("extras"),
        description: t("extraToolsDescription"),
        icon: Sparkles,
        count: 2,
      },
    ];
    const query = toolQuery.trim().toLocaleLowerCase();
    const visibleCategories = toolCategories.filter((category) =>
      `${category.title} ${category.description}`.toLocaleLowerCase().includes(query),
    );
    return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-foreground">{t("toolsAndMap")}</h2>
        <p className="text-[10px] text-muted-foreground">{t("toolsSubtitle")}</p>
      </div>

      {selectedLocation && (
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-[10px] font-medium uppercase text-muted-foreground">{t("inFocus")}</span>
          <span className="truncate text-sm font-semibold">{selectedLocation.name}</span>
        </div>
      )}

      <Card className="h-[240px] overflow-hidden border-border/70 shadow-sm">
        <ChatMap locations={mapLocations} selectedLocation={selectedLocation} onLocationSelect={setSelectedLocation} />
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="destructive" className="text-xs" onClick={findNearbyEmergency}>
          <AlertCircle className="mr-1 h-3.5 w-3.5" />
          {t("nearestEmergency")}
        </Button>
        {emergencyStatus && <span className="text-xs text-muted-foreground">{emergencyStatus}</span>}
      </div>

      {!toolCategory && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={toolQuery}
              onChange={(event) => setToolQuery(event.target.value)}
              placeholder={t("searchTools")}
              aria-label={t("searchTools")}
              className="h-10 rounded-md pl-9"
            />
          </div>
          {visibleCategories.length ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visibleCategories.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setToolCategory(category.id)}
                    className="group flex min-h-24 items-start gap-3 rounded-md border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <CategoryIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                        {category.title}
                        <span className="text-[10px] font-normal text-muted-foreground">{category.count}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {category.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {t("noToolsFound")}
            </p>
          )}
        </div>
      )}

      {toolCategory && (
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Button type="button" size="sm" variant="ghost" className="-ml-2 gap-1" onClick={() => setToolCategory(null)}>
            <ChevronLeft className="h-4 w-4" />
            {t("allTools")}
          </Button>
        </div>
      )}

      {toolCategory === "discover" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("essentials")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">
        <ItineraryPanel
          onTripBuilt={(trip) => {
            const stops = trip.days.flatMap((d) => d.stops || []);
            if (stops.length) {
              setMapLocations(stops);
              setSelectedLocation(stops[0]);
            }
          }}
        />

        <TripWizardPanel
          onTripBuilt={(stops, summary) => {
            if (stops.length) {
              setMapLocations(stops);
              setSelectedLocation(stops[0]);
            }
            if (summary) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `wiz_${Date.now()}`,
                  type: "assistant",
                  content: summary,
                  timestamp: new Date(),
                },
              ]);
            }
          }}
          onDecision={(accepted, message) => {
            setToolsOpen(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `wiz_dec_${Date.now()}`,
                type: "assistant",
                content: accepted ? `✓ ${message}` : message,
                timestamp: new Date(),
              },
            ]);
          }}
        />

        <StorytellerPanel locationId={selectedLocation?.id} />
        <SuitabilityWeatherPanel locationId={selectedLocation?.id} />

        <CatalogSearchPanel
          onResults={(locs) => {
            setMapLocations(locs);
            if (locs[0]) setSelectedLocation(locs[0]);
          }}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />

        {selectedLocation && (
          <AvailabilityCalendar
            itemId={selectedLocation.id}
            itemName={selectedLocation.name}
            onSelectDate={(day) => {
              setSelectedBookingItem({
                id: selectedLocation.id,
                name: selectedLocation.name,
                type:
                  selectedLocation.type === "hotel"
                    ? "hotel"
                    : selectedLocation.type === "attraction"
                      ? "attraction"
                      : "tour",
                price: day.priceLabel,
              });
              setBookingModalOpen(true);
              setToolsOpen(false);
            }}
          />
        )}

        <ReviewsPanel locationId={selectedLocation?.id} locationName={selectedLocation?.name} />

        <TravelProfilePanel
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />
        </div>
      </details>}

      {toolCategory === "plan" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("planAndBook")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">

        <RoutePlannerPanel
          favorites={favorites}
          onRouteBuilt={(stops) => {
            setMapLocations(stops);
            if (stops[0]) setSelectedLocation(stops[0]);
          }}
        />

        <ArrivalLogisticsPanel
          onBook={(item) => {
            setSelectedBookingItem(item);
            setBookingModalOpen(true);
            setToolsOpen(false);
          }}
        />

        <ComparePanel candidates={mapLocations} />
        <PriceAlertPanel itemId={selectedLocation?.id} itemName={selectedLocation?.name} />
        <BudgetCalculatorPanel activityCandidates={mapLocations} />
        <CurrencyConverterPanel />
        <SpendingTrackerPanel />

        <FavoritesPanel
          favorites={favorites}
          onRemove={removeFavorite}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />

        <TrendingPanel
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />
        <AlsoVisitedPanel
          locationId={selectedLocation?.id}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setMapLocations((prev) => (prev.some((p) => p.id === loc.id) ? prev : [...prev, loc]));
          }}
        />

        <DiningGuidePanel />

        <BookingsPanel refreshKey={bookingsRefreshKey} />

        <HandoffPanel
          messages={messages.map((m) => ({ type: m.type, content: m.content }))}
          onStatus={(text) =>
            setMessages((prev) => [
              ...prev,
              { id: `hd_${Date.now()}`, type: "assistant", content: text, timestamp: new Date() },
            ])
          }
        />
        </div>
      </details>}

      {toolCategory === "help" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("helpAndInfo")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="p-3 border-border/50">
            <PreferencesPanel language={language} />
          </Card>
          <Card className="p-3 border-border/50">
            <FaqPanel />
          </Card>
        </div>

        <CompanionPanel locationIds={mapLocations.map((l) => l.id).slice(0, 5)} />
        <PolicyModePanel />
        <OpenDataSearch
          onResults={(locs) => {
            setMapLocations(locs);
            if (locs[0]) setSelectedLocation(locs[0]);
          }}
        />
        <BrochureUploadPanel />
        <TransportInfoPanel location={selectedLocation} />
        <PackingListPanel />
        <PhraseTranslatorPanel />
        <SouvenirsPanel attractionIds={mapLocations.map((l) => l.id).slice(0, 5)} />
        <DocumentVaultPanel />
        </div>
      </details>}

      {toolCategory === "extras" && <details open className="group border-b border-border/60 pb-2">
        <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-sm font-semibold">
          {t("extras")}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pt-2">

        <GamificationPanel />
        <AccessibilityPanel />
        </div>
      </details>}
    </div>
    );
  };

  return (
    <div className="explore-page min-h-screen">
      <header className="explore-header sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/travelguide-logo.svg" alt={BRAND.name} className="h-11 w-11 shrink-0 rounded-xl bg-primary/5 p-1 ring-1 ring-border/60" />
            <div className="min-w-0">
              <h1 className="travel-brand truncate text-xl text-foreground">{BRAND.name}</h1>
              <p className="truncate text-[11px] text-muted-foreground">{BRAND.tagline}</p>
            </div>
            <Button
              size="sm"
              className="h-9 shrink-0 gap-1.5 px-3 font-semibold shadow-sm"
              onClick={() => setToolsOpen(true)}
              aria-label={t("openTools")}
            >
              <PanelRight className="w-4 h-4" />
              {t("tools")}
            </Button>
            <DemoScriptButton
              onStep={() => {}}
              onStatus={(text) =>
                setMessages((prev) => [
                  ...prev,
                  { id: `demo_${Date.now()}`, type: "assistant", content: text, timestamp: new Date() },
                ])
              }
              sendChat={async (q) => {
                await handleSendMessage(new Event("submit") as unknown as React.FormEvent, q);
              }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <label className="explore-auto-speak flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer" title={t("autoSpeak")}>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => {
                  setAutoSpeak(e.target.checked);
                  localStorage.setItem("travelguide_auto_speak", e.target.checked ? "1" : "0");
                }}
                aria-label={t("autoSpeak")}
              />
              {t("autoSpeak")}
            </label>
            <CurrencySwitcher />
            <div className="flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-muted-foreground" />
              <LanguageSwitcher />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2" aria-label={t("moreNavigation")}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("more")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{t("moreNavigation")}</DropdownMenuLabel>
                <DropdownMenuItem asChild><Link href="/">AI Chat Dashboard</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/compare-trips">{t("compare")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/widget">{t("widget")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account">{t("account")}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/messaging">{t("whatsApp")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/analytics">{t("analytics")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/admin">{t("admin")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/agent">{t("agent")}</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="explore-powered-by hidden md:inline text-xs text-muted-foreground">{t("poweredBy")} {BRAND.poweredBy}</span>
            <span
              role="status"
              aria-live="polite"
              title={chatProvider ? `${chatStatusText} · ${chatProvider}` : chatStatusText}
              className={`inline-flex max-w-[120px] items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium sm:max-w-none ${chatStatusTone}`}
            >
              {chatStatus === "checking" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : chatStatus === "configured" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{chatStatusText}</span>
            </span>
          </div>
        </div>
      </header>

      {alerts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200/80">
          <div className="container mx-auto px-4 py-2 flex gap-3 overflow-x-auto text-xs text-amber-900">
            {alerts.map((a) => (
              <a key={a.id} href={a.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 hover:underline">
                <span className="font-semibold uppercase mr-1">{a.severity}</span>
                {a.title}
              </a>
            ))}
          </div>
        </div>
      )}

      <main className="explore-main container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <Card className="chat-window flex h-[min(70vh,640px)] flex-col border-border/70 bg-card/95 xl:h-[700px]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-background to-muted/20">
                {messages.map((message) => (
                  <div key={message.id} className="chat-message-enter">
                    <div className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                      {message.type === "assistant" && (
                        <span className="assistant-avatar mr-2 mt-1" aria-hidden="true">
                          <Compass className="h-4 w-4" />
                        </span>
                      )}
                      <div
                        className={`min-w-0 max-w-xs break-words px-4 py-3 rounded-2xl shadow-sm lg:max-w-md ${
                          message.type === "user"
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border/70 bg-card text-card-foreground"
                        }`}
                      >
                        {message.imageUrl && (
                          <img
                            src={message.imageUrl}
                            alt="Uploaded"
                            className="rounded-lg mb-2 max-h-40 w-full object-cover"
                          />
                        )}
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {message.type === "assistant" && message.content && (
                            <SpeakButton text={message.content} className="opacity-80" />
                          )}
                        </div>
                      </div>
                    </div>

                    {message.type === "assistant" && <SourceChips sources={message.sources} />}

                    {message.type === "assistant" && message.locations && message.locations.length > 0 && (
                      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 items-stretch">
                        {message.locations.map((location) => (
                          <div key={location.id} className="flex w-64 shrink-0 flex-col">
                            <AttractionCard location={location} onBook={handleOpenBooking} />
                            <div className="flex h-8 items-center justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 p-0"
                                onClick={() =>
                                  isFavorite(location.id) ? removeFavorite(location.id) : addFavorite(location)
                                }
                                title={isFavorite(location.id) ? t("removeFromFavorites") : t("addToFavorites")}
                                aria-label={isFavorite(location.id) ? t("removeFromFavorites") : t("addToFavorites")}
                              >
                                <Heart
                                  className={`h-3.5 w-3.5 shrink-0 ${
                                    isFavorite(location.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                                  }`}
                                />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.faqLinks && message.faqLinks.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.faqLinks.map((f) => (
                          <a
                            key={f.id}
                            href={f.deepLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {f.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading &&
                  messages[messages.length - 1]?.type === "assistant" &&
                  !messages[messages.length - 1]?.content && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-none border border-border/50">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  </div>
                )}
                {errorHint && (
                  <div role="alert" className="mx-1 my-2 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <p className="min-w-0 text-sm text-destructive">{errorHint}</p>
                    </div>
                    {failedAttemptRef.current && (
                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={retryLastMessage}>
                        {t("retry")}
                      </Button>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 pt-3 border-t border-border/50">
                <QuickReplies onSelect={handleQuickReply} isLoading={isLoading} />
              </div>

              <div className="chat-composer border-t border-border/50 bg-card p-4 transition-shadow">
                <form onSubmit={handleSendMessage} className="flex flex-wrap gap-2 items-center">
                  <Input
                    type="text"
                    placeholder={t("chatPlaceholder")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 min-w-[140px]"
                    aria-label={t("sendMessage")}
                  />
                  <ImageUploadButton disabled={isLoading} onResult={handleVisionResult} />
                  <VoiceInput
                    onResult={(text) => {
                      const trimmed = text.trim();
                      if (!trimmed || isLoading) return;
                      handleSendMessage(new Event("submit") as unknown as React.FormEvent, trimmed);
                    }}
                    disabled={isLoading}
                    lang={language === "es" ? "es-ES" : language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : language === "zh" ? "zh-CN" : "en-US"}
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()} size="icon" aria-label={t("sendMessage")}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
            <p className="xl:hidden text-xs text-muted-foreground mt-3 text-center">
          Tip: open <button type="button" className="text-primary underline" onClick={() => setToolsOpen(true)}>Tools</button> — Essentials (map, itinerary, search) → Plan & book → Help & info.
            </p>
          </div>

          <aside
            id="tools-panel"
            className="hidden xl:block xl:col-span-2 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto"
            aria-label={t("toolsAndMap")}
          >
            {/* Only one Tools instance at a time — avoid duplicate TripWizard state */}
            {isXl && !toolsOpen ? renderToolsRail() : null}
          </aside>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { img: FEATURE_IMAGES.attractions, title: "Discover Attractions", body: "Hours, fees, transport, and events from the mock Commission API." },
            { img: FEATURE_IMAGES.safety, title: "Stay Safe & Informed", body: "Dynamic compliance feed with rule-based watch/alert severity." },
            { img: FEATURE_IMAGES.booking, title: "Book securely", body: "Tokenized PCI-DSS shaped mock gateway — no card PANs stored." },
          ].map((block) => (
            <div key={block.title}>
              <div className="relative overflow-hidden rounded-xl mb-4 h-40">
                <img src={block.img} alt="" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{block.title}</h3>
              <p className="text-sm text-muted-foreground">{block.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-primary/5 to-orange-100/30 rounded-2xl p-8 text-center border border-primary/10">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to explore?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Chat with {BRAND.name} for itineraries, lodges, FAQs, and emergency support — powered by {BRAND.poweredBy}.
          </p>
          <Button size="lg" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Start Chatting Now
          </Button>
        </div>
      </main>

      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-4">
          <SheetHeader className="mb-3">
            <SheetTitle>{t("toolsAndMap")}</SheetTitle>
          </SheetHeader>
          {toolsOpen ? renderToolsRail() : null}
        </SheetContent>
      </Sheet>

      {!toolsOpen && (
        <Button
          type="button"
          size="lg"
          className="explore-tools-fab fixed bottom-5 right-5 z-40 h-12 rounded-full px-5 shadow-lg xl:hidden"
          onClick={() => setToolsOpen(true)}
          aria-label={t("openTools")}
        >
          <PanelRight className="w-4 h-4 mr-2" />
          {t("tools")}
        </Button>
      )}

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        itemId={selectedBookingItem?.id}
        itemName={selectedBookingItem?.name}
        itemType={selectedBookingItem?.type}
        price={selectedBookingItem?.price}
        onBooked={() => setBookingsRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
