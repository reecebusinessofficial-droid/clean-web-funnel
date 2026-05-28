import mixpanel from "mixpanel-browser";

if (typeof window !== "undefined") {
  console.log("[mixpanel] module loaded");
}

type EventProps = Record<string, unknown>;

const SUBSTANCE = "cocaine";
const DEDUPE_MS = 1000;

/** TODO: remove after Mixpanel testing */
const MIXPANEL_DEBUG = true;

function debugLog(message: string, data?: Record<string, unknown>) {
  if (!MIXPANEL_DEBUG) return;
  if (data) console.log(`[mixpanel] ${message}`, data);
  else console.log(`[mixpanel] ${message}`);
}

function hasMixpanelToken(): boolean {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  return Boolean(token && token !== "PASTE_TOKEN_HERE");
}

let initialized = false;
const recentScreenViews = new Map<string, number>();
const recentQuizAnswers = new Map<string, number>();
let paywallOpenedTracked = false;
let purchaseCompletedTracked = false;

function getToken(): string | undefined {
  const token = import.meta.env.VITE_MIXPANEL_TOKEN;
  if (!token || token === "PASTE_TOKEN_HERE") return undefined;
  return token;
}

function initMixpanel(): boolean {
  if (typeof window === "undefined") return false;
  if (initialized) {
    debugLog("initialized", { initialized: true });
    return true;
  }

  debugLog("VITE_MIXPANEL_TOKEN present", { hasToken: hasMixpanelToken() });

  const token = getToken();
  if (!token) {
    debugLog("initialized", { initialized: false });
    return false;
  }

  mixpanel.init(token, {
    track_pageview: false,
    persistence: "localStorage",
    ignore_dnt: false,
  });
  initialized = true;
  debugLog("initialized", { initialized: true });
  return true;
}

function shouldDedupe(store: Map<string, number>, key: string): boolean {
  const now = Date.now();
  const last = store.get(key);
  if (last !== undefined && now - last < DEDUPE_MS) return true;
  store.set(key, now);
  return false;
}

function getBrowserName(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Safari/")) return "Safari";
  return "Other";
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function getVariant(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("variant") ?? undefined;
}

export function getSharedProperties(): EventProps {
  if (typeof window === "undefined") {
    return { substance: SUBSTANCE };
  }

  const variant = getVariant();
  return {
    substance: SUBSTANCE,
    ...(variant ? { variant } : {}),
    browser: getBrowserName(),
    device_type: getDeviceType(),
    current_path: `${window.location.pathname}${window.location.search}`,
  };
}

function track(event: string, properties?: EventProps): void {
  if (!initMixpanel()) return;
  mixpanel.track(event, {
    ...getSharedProperties(),
    ...properties,
  });
}

/** Funnel step → Mixpanel screen_name */
export const FUNNEL_STEP_SCREEN: Record<string, string> = {
  landing: "landing",
  q_frequency: "substance_goal",
  transition1: "personalisation_intro",
  q_frustrates: "frustration_question",
  q_pulls: "triggers_question",
  q_worries: "worries_question",
  q_howlong: "problem_duration",
  transition2: "consistency_message",
  q_cost: "cost_question",
  q_difference: "difference_question",
  calculating: "calculating",
  results: "impact_results",
  welcome2: "welcome",
  goals: "motivation_question",
  testimonials: "testimonials",
  plan: "personalised_plan",
  reset: "reset_offer",
};

export function screenNameForStep(step: string): string | undefined {
  return FUNNEL_STEP_SCREEN[step];
}

export function trackScreenView(screen_name: string, properties?: EventProps): void {
  debugLog("trackScreenView called", { screen_name });
  if (shouldDedupe(recentScreenViews, screen_name)) return;
  track("Screen View", { screen_name, ...properties });
}

export function trackQuizAnswered(
  question: string,
  answer: string | string[],
  properties?: EventProps,
): void {
  const answerKey = Array.isArray(answer) ? answer.join(",") : answer;
  debugLog("trackQuizAnswered called", { question, answer: answerKey });
  const dedupeKey = `${question}:${answerKey}`;
  if (shouldDedupe(recentQuizAnswers, dedupeKey)) return;

  track("Quiz Answered", {
    question,
    answer: answerKey,
    ...properties,
  });
}

export function trackPaywallOpened(properties?: EventProps): void {
  if (paywallOpenedTracked) return;
  paywallOpenedTracked = true;
  track("Paywall Opened", properties);
  trackScreenView("paywall", properties);
}

export function trackPurchaseCompleted(properties?: EventProps): void {
  if (purchaseCompletedTracked) return;
  purchaseCompletedTracked = true;
  track("Purchase Completed", properties);
}
