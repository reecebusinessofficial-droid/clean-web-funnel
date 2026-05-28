import { createFileRoute } from "@tanstack/react-router";
import { LaurelWreath } from "../components/funnel/LaurelWreath";
import { PaywallExpressCheckout } from "../components/funnel/PaywallExpressCheckout";
import {
  screenNameForStep,
  trackPaywallOpened,
  trackQuizAnswered,
  trackScreenView,
} from "../lib/mixpanel";
import { trackMetaInitiateCheckout } from "../lib/metaPixel";
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Clean — Customise your journey" },
      { name: "description", content: "Welcome to Clean. Customise everything around you and start your journey." },
    ],
  }),
});

/** Survives remounts; paired with deferred playback until enter animation finishes. */
const typewriterPlayback = new Map<string, { typed: string; done: boolean }>();

type TypewriterGranularity = "char" | "word";

function typewriterCacheKey(id: string, text: string, granularity: TypewriterGranularity = "char") {
  return `${id}::${text}::${granularity}`;
}

/** Whole words/spaces/newlines so wrapped lines don't reflow mid-token during reveal. */
function tokenizeTypewriterText(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\n") {
      tokens.push("\n");
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      let space = ch;
      i += 1;
      while (i < text.length && /\s/.test(text[i]) && text[i] !== "\n") {
        space += text[i];
        i += 1;
      }
      tokens.push(space);
      continue;
    }
    let word = ch;
    i += 1;
    while (i < text.length && !/\s/.test(text[i])) {
      word += text[i];
      i += 1;
    }
    tokens.push(word);
  }
  return tokens;
}

/** Shared typewriter pacing — aligned with mobile onboarding */
const TYPEWRITER_CHAR_DELAY = 40;
const TYPEWRITER_HOLD_MS = 2600;

/** Shared layout for quiz transitions + personalised plan typewriter screens */
const TYPEWRITER_SCREEN_OFFSET = "-translate-y-[30px]";
const TYPEWRITER_SCREEN_CENTER = `relative mx-auto flex w-full max-w-md flex-col items-center justify-center px-8 text-center ${TYPEWRITER_SCREEN_OFFSET}`;
const TYPEWRITER_SCREEN_FULL = `${TYPEWRITER_SCREEN_CENTER} min-h-screen`;
const TYPEWRITER_TEXT_BADGE = "text-3xl font-extrabold leading-tight";
const TYPEWRITER_TEXT_QUOTE =
  "text-2xl font-extrabold leading-snug drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]";

/** Mobile parity layout (390px viewport) */
const FUNNEL_SHELL = "funnel-screen-shell";
const FUNNEL_PAD = "px-5";
const FUNNEL_QUIZ_W = "mx-auto w-full max-w-[330px]";
const FUNNEL_WELCOME_E_W = "mx-auto w-full max-w-[342px]";
const FUNNEL_CTA =
  "flex w-full min-h-[66px] items-center justify-center gap-2 rounded-[50px] funnel-cta text-[18px] font-bold transition-transform active:scale-[0.98]";
const FUNNEL_CTA_ROW =
  "relative flex w-full min-h-[66px] items-center justify-between rounded-[50px] funnel-cta px-6 text-[18px] font-bold transition-transform active:scale-[0.98]";
const FUNNEL_PILL =
  "flex w-full items-center gap-3 rounded-[50px] border px-4 py-3 text-left transition-all";
const FUNNEL_PILL_ON = "border-transparent funnel-pill-selected";
const FUNNEL_PILL_OFF = "border-purple-900/60 bg-white/[0.02] hover:border-purple-700";

const LANDING_IMG_LOGO_GREY = "/images/logo%20grey.png";
const LANDING_IMG_CHARACTER = "/images/character-in-bed.png";

function scrollPageToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const StepMotionContext = createContext({ playbackReady: true });

function useStepPlaybackReady() {
  return useContext(StepMotionContext).playbackReady;
}

function useTypewriter({
  cacheId,
  text,
  charDelay = TYPEWRITER_CHAR_DELAY,
  holdAfterMs = 0,
  onComplete,
  enabled = true,
  granularity = "char",
}: {
  cacheId: string;
  text: string;
  charDelay?: number;
  holdAfterMs?: number;
  onComplete?: () => void;
  enabled?: boolean;
  granularity?: TypewriterGranularity;
}) {
  const tokens = useMemo(
    () => (granularity === "word" ? tokenizeTypewriterText(text) : null),
    [text, granularity],
  );
  const playbackKey = typewriterCacheKey(cacheId, text, granularity);
  const playbackReady = useStepPlaybackReady();
  const cached = typewriterPlayback.get(playbackKey);
  const [typed, setTyped] = useState(cached?.typed ?? "");
  const [done, setDone] = useState(cached?.done ?? false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedForKeyRef = useRef<string | null>(null);

  const scheduleComplete = useCallback(() => {
    if (firedForKeyRef.current === playbackKey) return;
    firedForKeyRef.current = playbackKey;
    onCompleteRef.current?.();
  }, [playbackKey]);

  useEffect(() => {
    if (!enabled || !playbackReady) return;

    const existing = typewriterPlayback.get(playbackKey);
    if (existing?.done && existing.typed.length > 0) {
      setTyped(existing.typed);
      setDone(true);
      if (holdAfterMs <= 0) {
        scheduleComplete();
        return;
      }
      const holdTimer = setTimeout(scheduleComplete, holdAfterMs);
      return () => clearTimeout(holdTimer);
    }

    setTyped("");
    setDone(false);
    let i = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (finalTyped: string) => {
      typewriterPlayback.set(playbackKey, { typed: finalTyped, done: true });
      setDone(true);
      holdTimer = setTimeout(scheduleComplete, holdAfterMs);
    };

    const interval = setInterval(() => {
      i++;
      if (granularity === "word" && tokens) {
        const slice = tokens.slice(0, i).join("");
        setTyped(slice);
        if (i >= tokens.length) {
          clearInterval(interval);
          finish(text);
        }
        return;
      }

      const slice = text.slice(0, i);
      setTyped(slice);
      if (i >= text.length) {
        clearInterval(interval);
        finish(text);
      }
    }, charDelay);

    return () => {
      clearInterval(interval);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [playbackKey, text, tokens, granularity, charDelay, holdAfterMs, enabled, playbackReady, scheduleComplete]);

  return {
    typed,
    done,
    showCursor: !done && typed.length < text.length,
  };
}

function TypewriterCursor() {
  return (
    <span className="relative inline-block w-0 align-middle">
      <span
        className="absolute left-0 top-1/2 w-[2px] -translate-y-1/2 animate-pulse bg-white"
        style={{ height: "1em" }}
      />
    </span>
  );
}

function TypeText({
  full,
  typed,
  showCursor,
  className,
  stableLayout = false,
}: {
  full: string;
  typed: string;
  showCursor: boolean;
  className?: string;
  /** Full string stays in layout; words are nowrap boxes so wrap decisions happen before reveal. */
  stableLayout?: boolean;
}) {
  const visibleCount = typed.length;
  const stableTokens = useMemo(
    () => (stableLayout ? tokenizeTypewriterText(full) : null),
    [stableLayout, full],
  );

  if (stableLayout && stableTokens) {
    let charIndex = 0;
    return (
      <span className={`whitespace-pre-line ${className ?? ""}`}>
        {stableTokens.map((token, ti) => {
          const tokenStart = charIndex;
          charIndex += token.length;
          const isWord = token !== "\n" && !/^\s+$/.test(token);
          const chars = token.split("").map((char, ci) => {
            const i = tokenStart + ci;
            return (
              <span key={ci}>
                <span
                  className={i < visibleCount ? "opacity-100" : "opacity-0"}
                  aria-hidden={i >= visibleCount}
                >
                  {char}
                </span>
                {showCursor && i === visibleCount - 1 ? <TypewriterCursor /> : null}
              </span>
            );
          });
          if (isWord) {
            return (
              <span key={ti} className="inline-block whitespace-nowrap">
                {chars}
              </span>
            );
          }
          return <span key={ti}>{chars}</span>;
        })}
        {showCursor && visibleCount === 0 ? <TypewriterCursor /> : null}
      </span>
    );
  }

  const remaining = full.slice(typed.length);
  return (
    <span className={`whitespace-pre-line ${className ?? ""}`}>
      {typed}
      {showCursor ? <TypewriterCursor /> : null}
      <span aria-hidden className="invisible">
        {remaining || "\u200B"}
      </span>
    </span>
  );
}

type NavDirection = "forward" | "back";
type TransitionVariant = "slide" | "fade";

const EXIT_MS: Record<TransitionVariant, number> = {
  slide: 380,
  fade: 280,
};

const ENTER_MS: Record<TransitionVariant, number> = {
  slide: 400,
  fade: 360,
};

type TransitionPhase = "idle" | "exiting" | "entering";

type StepTransitionFooterState = {
  phase: TransitionPhase;
  visibleStep: string;
  /** True once incoming step is on screen (entering or idle), false while outgoing step exits */
  showFixedCta: boolean;
};

function StepTransition({
  stepKey,
  direction,
  variantForStep,
  children,
  footer,
}: {
  stepKey: string;
  direction: NavDirection;
  variantForStep: (step: string) => TransitionVariant;
  children: (visibleStep: string) => ReactNode;
  footer?: (state: StepTransitionFooterState) => ReactNode;
}) {
  const [visibleStep, setVisibleStep] = useState(stepKey);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const variantForStepRef = useRef(variantForStep);
  variantForStepRef.current = variantForStep;

  const [motionState, setMotionState] = useState({
    direction,
    enterVariant: variantForStep(stepKey),
    exitVariant: variantForStep(stepKey),
  });

  useLayoutEffect(() => {
    if (stepKey === visibleStep) return;

    const exitVariant = variantForStepRef.current(visibleStep);
    const enterVariant = variantForStepRef.current(stepKey);
    const exitMs = EXIT_MS[exitVariant];
    const enterMs = ENTER_MS[enterVariant];

    setMotionState({ direction, enterVariant, exitVariant });
    setPhase("exiting");

    const exitTimer = window.setTimeout(() => {
      setVisibleStep(stepKey);
      setPhase("entering");
    }, exitMs);

    const enterTimer = window.setTimeout(() => {
      setPhase("idle");
    }, exitMs + enterMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(enterTimer);
    };
  }, [stepKey, visibleStep, direction]);

  // Allow typing once exit finishes (during enter or idle); block only while outgoing screen exits.
  const playbackReady = phase !== "exiting";
  const showFixedCta = visibleStep === stepKey && phase !== "exiting";

  const wrapClass =
    phase === "exiting"
      ? motionState.exitVariant === "fade"
        ? "step-fade-out"
        : motionState.direction === "forward"
          ? "step-exit-forward"
          : "step-exit-back"
      : phase === "entering"
        ? motionState.enterVariant === "fade"
          ? "step-fade-in"
          : motionState.direction === "forward"
            ? "step-enter-forward"
            : "step-enter-back"
        : "";

  return (
    <StepMotionContext.Provider value={{ playbackReady }}>
      <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
        <div className={`min-h-[100dvh] w-full ${wrapClass}`}>{children(visibleStep)}</div>
        {footer?.({ phase, visibleStep, showFixedCta })}
      </div>
    </StepMotionContext.Provider>
  );
}

type Step =
  | "landing"
  | "transition1"
  | "q_frequency"
  | "q_frustrates"
  | "q_pulls"
  | "q_worries"
  | "q_howlong"
  | "transition2"
  | "q_cost"
  | "q_difference"
  | "calculating"
  | "results"
  | "welcome2"
  | "goals"
  | "testimonials"
  | "plan"
  | "reset";

const STEP_ORDER: Step[] = [
  "landing",
  "q_frequency",
  "transition1",
  "q_frustrates",
  "q_pulls",
  "q_worries",
  "q_howlong",
  "transition2",
  "q_cost",
  "q_difference",
  "calculating",
  "results",
  "welcome2",
  "goals",
  "testimonials",
  "plan",
  "reset",
];

const FADE_STEPS = new Set<Step>(["landing", "transition1", "transition2", "calculating", "welcome2"]);

type StatusTone = "purple" | "blue" | "orange" | "cyan" | "green" | "amber";

const TONE_STYLES: Record<StatusTone, { ring: string; bg: string; dot: string; text: string; glow: string }> = {
  purple: {
    ring: "ring-purple-400/40",
    bg: "bg-white/[0.03]",
    dot: "bg-purple-400/30",
    text: "text-white/85",
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.25)]",
  },
  blue: {
    ring: "ring-blue-400/50",
    bg: "bg-white/[0.03]",
    dot: "bg-blue-400/35",
    text: "text-white/85",
    glow: "shadow-[0_0_28px_rgba(59,130,246,0.4)]",
  },
  orange: {
    ring: "ring-orange-400/50",
    bg: "bg-white/[0.03]",
    dot: "bg-orange-400/35",
    text: "text-white/85",
    glow: "shadow-[0_0_28px_rgba(249,115,22,0.4)]",
  },
  cyan: {
    ring: "ring-cyan-400/40",
    bg: "bg-white/[0.03]",
    dot: "bg-cyan-400/30",
    text: "text-white/85",
    glow: "shadow-[0_0_25px_rgba(34,211,238,0.25)]",
  },
  green: {
    ring: "ring-emerald-400/50",
    bg: "bg-white/[0.03]",
    dot: "bg-emerald-400/30",
    text: "text-white/85",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.35)]",
  },
  amber: {
    ring: "ring-amber-400/50",
    bg: "bg-white/[0.03]",
    dot: "bg-amber-400/30",
    text: "text-white/85",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.35)]",
  },
};

function Starfield() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 10% 90%, rgba(255,255,255,0.3), transparent)",
          backgroundSize: "300px 300px",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
    </>
  );
}

function Index() {
  /** Dev: set to `"reset"` to land on 7-day reset + paywall for testing */
  const [step, setStep] = useState<Step>("landing");
  const [navDirection, setNavDirection] = useState<NavDirection>("forward");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    q_frequency: "",
    q_frustrates: "",
    q_pulls: "",
    q_worries: "",
    q_howlong: "",
    q_difference: "",
  });
  const [cost, setCost] = useState<number>(27);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const initiateCheckoutTracked = useRef(false);

  const QUIZ_STEPS: Step[] = [
    "q_frequency",
    "q_frustrates",
    "q_pulls",
    "q_worries",
    "q_howlong",
    "q_cost",
    "q_difference",
  ];
  const variantForStep = useCallback(
    (s: string): TransitionVariant => (FADE_STEPS.has(s as Step) ? "fade" : "slide"),
    [],
  );

  useLayoutEffect(() => {
    scrollPageToTop();
  }, []);

  useLayoutEffect(() => {
    scrollPageToTop();
  }, [step]);

  useLayoutEffect(() => {
    if (paywallOpen) scrollPageToTop();
  }, [paywallOpen]);

  useEffect(() => {
    if (!paywallOpen) return;
    if (initiateCheckoutTracked.current) return;
    initiateCheckoutTracked.current = true;
    trackMetaInitiateCheckout();
    trackPaywallOpened();
  }, [paywallOpen]);

  useEffect(() => {
    console.log("[analytics] index screen effect fired", step);
    const screenName = screenNameForStep(step);
    if (screenName) trackScreenView(screenName);
  }, [step]);

  useEffect(() => {
    const onPageShow = () => scrollPageToTop();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const navigateTo = (target: Step) => {
    const from = STEP_ORDER.indexOf(step);
    const to = STEP_ORDER.indexOf(target);
    if (to < 0) return;
    setNavDirection(to >= from ? "forward" : "back");
    setStep(target);
  };

  const go = (s: Step) => navigateTo(s);
  const next = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i < STEP_ORDER.length - 1) navigateTo(STEP_ORDER[i + 1]);
  };
  const back = () => {
    const i = STEP_ORDER.indexOf(step);
    if (i > 0) navigateTo(STEP_ORDER[i - 1]);
  };

  const setAnswer = (key: string, value: string | string[]) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  return (
    <main
      className={`relative min-h-dvh overflow-hidden text-white ${step === "landing" ? "bg-black" : "bg-[#0a0414]"}`}
    >
      {step !== "landing" && <Starfield />}

      <StepTransition
        stepKey={step}
        direction={navDirection}
        variantForStep={variantForStep}
        footer={({ showFixedCta, phase }) => (
          <>
            {showFixedCta && step === "testimonials" && (
              <TestimonialsFixedCta onContinue={next} entering={phase === "entering"} />
            )}
            {showFixedCta && step === "reset" && !paywallOpen && (
              <ResetFixedCta onContinue={() => setPaywallOpen(true)} entering={phase === "entering"} />
            )}
            <div className="mt-6 mb-4 flex justify-center gap-6 text-xs text-white/40">
              <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white/70 transition-colors">Terms of Service</a>
            </div>
          </>
        )}
      >
        {(visibleStep) => {
          const quizIdx = QUIZ_STEPS.indexOf(visibleStep as Step);
          const progress = quizIdx >= 0 ? (quizIdx + 1) / QUIZ_STEPS.length : 0.08;

          return (
            <>
      {visibleStep === "landing" && <LandingStep onContinue={next} />}

      {visibleStep === "q_frequency" && (
        <ChoiceStep
          progress={progress}
          onBack={back}
          tone="blue"
          analyticsQuestion="substance_goal"
          status="Understanding Your Goal"
          question="Are you looking to cut down or quit cocaine?"
          options={[
            { id: "quit", label: "Quit completely", emoji: "❌" },
            { id: "cutdown", label: "Cut down and control it", emoji: "⚖️" },
            { id: "unsure", label: "I'm not sure yet", emoji: "🤷" },
          ]}
          value={answers.q_frequency as string}
          onChange={(v) => setAnswer("q_frequency", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "transition1" && (
        <TransitionStep
          cacheId="transition1"
          text="Now let's personalise your Clean system"
          variant="badge"
          onDone={() => go("q_frustrates")}
        />
      )}

      {visibleStep === "q_frustrates" && (
        <ChoiceStep
          progress={progress}
          onBack={back}
          tone="orange"
          analyticsQuestion="frustration_question"
          status="Mapping Behaviour Patterns"
          question="What frustrates you about your cocaine use?"
          options={[
            { id: "drained", label: "Feeling drained after binges", emoji: "🧠" },
            { id: "nextline", label: "Thinking about the next line", emoji: "❄️" },
            { id: "money", label: "Wasting huge amounts of money", emoji: "💸" },
            { id: "empty", label: "Feeling empty after the high", emoji: "🌑" },
            { id: "routine", label: "Destroying my routine", emoji: "🌙" },
            { id: "control", label: "Feeling out of control", emoji: "⚠️" },
            { id: "hiding", label: "Hiding my use from others", emoji: "🫥" },
          ]}
          value={answers.q_frustrates as string}
          onChange={(v) => setAnswer("q_frustrates", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "q_pulls" && (
        <ChoiceStep
          progress={progress}
          onBack={back}
          tone="green"
          analyticsQuestion="triggers_question"
          status="Adapting Relapse Prevention"
          question="What usually pulls you back in?"
          options={[
            { id: "cravings", label: "The cravings themselves", emoji: "🔥" },
            { id: "drinking", label: "Drinking or partying", emoji: "🍺" },
            { id: "people", label: "Certain people or environments", emoji: "👥" },
            { id: "stress", label: "Stress or anxiety", emoji: "😔" },
            { id: "onemore", label: "Wanting one more good night", emoji: "🌙" },
            { id: "confident", label: "Feeling overly confident or impulsive", emoji: "⚡" },
          ]}
          value={answers.q_pulls as string}
          onChange={(v) => setAnswer("q_pulls", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "q_worries" && (
        <ChoiceStep
          progress={progress}
          onBack={back}
          tone="amber"
          analyticsQuestion="worries_question"
          status="Analysing Risk Patterns"
          question="What worries you most if this keeps continuing?"
          options={[
            { id: "years", label: "Wasting more years", emoji: "⏳" },
            { id: "discipline", label: "Losing discipline completely", emoji: "📉" },
            { id: "financial", label: "Financial damage", emoji: "💸" },
            { id: "relationships", label: "Damaging relationships", emoji: "💔" },
            { id: "mental", label: "Mental health decline", emoji: "🧠" },
            { id: "dependent", label: "Becoming dependent on it", emoji: "🔒" },
          ]}
          value={answers.q_worries as string}
          onChange={(v) => setAnswer("q_worries", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "q_howlong" && (
        <ChoiceStep
          progress={progress}
          onBack={back}
          tone="cyan"
          analyticsQuestion="problem_duration"
          status="Building Recovery Timeline"
          question="How long have you felt this needed to change?"
          options={[
            { id: "years", label: "Honestly… years", emoji: "⏳" },
            { id: "overayear", label: "Over a year", emoji: "📅" },
            { id: "months", label: "Several months", emoji: "🗒️" },
            { id: "recently", label: "Recently", emoji: "💡" },
          ]}
          value={answers.q_howlong as string}
          onChange={(v) => setAnswer("q_howlong", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "transition2" && (
        <TransitionStep
          cacheId="transition2"
          text="Small changes compound fast — consistency rebuilds momentum better than motivation ever will."
          variant="quote"
          onDone={() => go("q_cost")}
        />
      )}

      {visibleStep === "q_cost" && (
        <CostStep
          progress={progress}
          onBack={back}
          cost={cost}
          setCost={setCost}
          onContinue={next}
        />
      )}

      {visibleStep === "q_difference" && (
        <ChoiceStep
          progress={progress}
          onBack={back}
          tone="green"
          analyticsQuestion="difference_question"
          status="Prioritising Recovery Goals"
          question="What would make the biggest difference in your life right now?"
          options={[
            { id: "finances", label: "Getting my finances together", emoji: "💸" },
            { id: "energy", label: "Having stable energy again", emoji: "⚡" },
            { id: "disciplined", label: "Becoming disciplined again", emoji: "📈" },
            { id: "control", label: "Feeling more in control", emoji: "😌" },
            { id: "confident", label: "Feeling confident in myself", emoji: "😎" },
            { id: "routines", label: "Having normal routines again", emoji: "🌙" },
            { id: "relationships", label: "Repairing relationships", emoji: "👨‍❤️‍👨" },
          ]}
          value={answers.q_difference as string}
          onChange={(v) => setAnswer("q_difference", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "calculating" && (
        <CalculatingStep
          substance="cocaine"
          onDone={next}
        />
      )}

      {visibleStep === "results" && (
        <ResultsStep
          substance="cocaine"
          onContinue={next}
        />
      )}

      {visibleStep === "welcome2" && <Welcome2Step onContinue={next} />}

      {visibleStep === "goals" && (
        <GoalsStep
          value={(answers.goals as string[]) ?? []}
          onChange={(v: string[]) => setAnswer("goals", v)}
          onContinue={next}
        />
      )}

      {visibleStep === "testimonials" && <TestimonialsStep />}



      {visibleStep === "plan" && (
        <PlanStep
          substance="cocaine"
          worries={answers.q_worries as string}
          howlong={answers.q_howlong as string}
          cost={cost}
          difference={answers.q_difference as string}
          onContinue={next}
        />
      )}

      {visibleStep === "reset" && <ResetStep paywallActive={paywallOpen} />}
            </>
          );
        }}
      </StepTransition>

      <PaywallSheet open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </main>
  );
}

function CalculatingStep({ substance, onDone }: { substance: string; onDone: () => void }) {
  const lines = useMemo(
    () => [
      `Analysing your ${substance} profile...`,
      `Mapping your withdrawal timeline...`,
      `Building your recovery plan...`,
      `Calculating your financial recovery...`,
      `Personalising your ${substance} programme...`,
    ],
    [substance],
  );

  const [progress, setProgress] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 8000;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(id);
        setTimeout(onDone, 400);
      }
    }, 50);
    return () => clearInterval(id);
  }, [onDone]);

  useEffect(() => {
    const id = setInterval(() => {
      setLineIdx((i) => (i + 1) % lines.length);
    }, 1600);
    return () => clearInterval(id);
  }, [lines.length]);

  const pct = Math.round(progress * 100);
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c * progress;

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} items-center justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-center`}
    >
      <div className={`${FUNNEL_QUIZ_W} flex flex-col items-center`}>
        <div className="relative h-[120px] w-[120px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="calcGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
            <circle
              cx="60"
              cy="60"
              r={r}
              stroke="url(#calcGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: "stroke-dasharray 80ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[28px] font-extrabold tabular-nums">{pct}%</span>
          </div>
        </div>

        <p className="mt-8 text-xs font-semibold tracking-[0.25em] text-white/40">CALCULATING</p>
        <h2
          key={lineIdx}
          className="mt-3 min-h-[3.25rem] max-w-[330px] animate-in fade-in text-xl font-extrabold leading-snug duration-300"
        >
          {lines[lineIdx]}
        </h2>
      </div>
    </div>
  );
}

function TransitionStep({
  text,
  variant,
  onDone,
  cacheId,
}: {
  text: string;
  variant: "badge" | "quote";
  onDone: () => void;
  cacheId?: string;
}) {
  const { typed, showCursor } = useTypewriter({
    cacheId: cacheId ?? variant,
    text,
    charDelay: TYPEWRITER_CHAR_DELAY,
    holdAfterMs: TYPEWRITER_HOLD_MS,
    onComplete: onDone,
  });

  if (variant === "quote") {
    return (
      <div className={TYPEWRITER_SCREEN_FULL}>
        <h2 className={TYPEWRITER_TEXT_QUOTE}>
          <TypeText full={text} typed={typed} showCursor={showCursor} />
        </h2>
      </div>
    );
  }

  return (
    <div className={TYPEWRITER_SCREEN_FULL}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/30 ring-1 ring-indigo-300/50 shadow-[0_0_40px_rgba(129,140,248,0.6)]">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 className={`mt-8 ${TYPEWRITER_TEXT_BADGE}`}>
        <TypeText full={text} typed={typed} showCursor={showCursor} />
      </h2>
    </div>
  );
}

function TopBar({ progress, onBack }: { progress: number; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={onBack}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 hover:text-white"
        aria-label="Back"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-500"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <button className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/10">
        <span>🇺🇸</span> EN
      </button>
    </div>
  );
}

function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  const s = TONE_STYLES[tone];
  return (
    <div
      data-tone={tone}
      className={`funnel-status-pill mx-auto mt-8 inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ${s.bg} ${s.ring} ${s.glow}`}
    >
      <span
        data-tone={tone}
        className={`funnel-status-pill-icon flex h-5 w-5 items-center justify-center rounded-full ${s.dot}`}
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className={`text-sm font-medium ${s.text}`}>{label}</span>
    </div>
  );
}

type ChoiceOpt = { id: string; label: string; emoji: string };

function ChoiceStep({
  progress,
  onBack,
  tone,
  analyticsQuestion,
  status,
  question,
  options,
  value,
  onChange,
  onContinue,
  multi = false,
}: {
  progress: number;
  onBack: () => void;
  tone: StatusTone;
  analyticsQuestion: string;
  status: string;
  question: string;
  options: ChoiceOpt[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  onContinue: () => void;
  multi?: boolean;
}) {
  const isActive = (id: string) =>
    multi ? (value as string[]).includes(id) : value === id;

  const handle = (id: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    } else {
      onChange(id);
      const label = options.find((o) => o.id === id)?.label;
      trackQuizAnswered(analyticsQuestion, id, label ? { answer_label: label } : undefined);
      setTimeout(onContinue, 280);
    }
  };

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]`}
    >
      <TopBar progress={progress} onBack={onBack} />

      <div className={`${FUNNEL_QUIZ_W} flex flex-1 flex-col`}>
        <div className="flex justify-center">
          <StatusPill tone={tone} label={status} />
        </div>

        <h2 className="mt-5 text-center text-[26px] font-extrabold leading-[32px]">
          {question}
        </h2>
        <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        <ul className="mt-5 flex flex-col gap-3">
          {options.map((opt) => {
            const active = isActive(opt.id);
            return (
              <li key={opt.id}>
                <button
                  onClick={() => handle(opt.id)}
                  className={[FUNNEL_PILL, active ? FUNNEL_PILL_ON : FUNNEL_PILL_OFF].join(" ")}
                >
                  <span
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl",
                      active ? "bg-white/20" : "bg-purple-950/60",
                    ].join(" ")}
                  >
                    {opt.emoji}
                  </span>
                  <span className="text-base font-semibold">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {multi && (() => {
          const disabled = (value as string[]).length === 0;
          return (
            <div className="mt-auto pt-8">
              <button
                onClick={disabled ? undefined : onContinue}
                disabled={disabled}
                className={[
                  FUNNEL_CTA,
                  disabled ? "cursor-not-allowed !bg-white/5 !shadow-none text-white/40" : "",
                ].join(" ")}
              >
                Continue
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function CostStep({
  progress,
  onBack,
  cost,
  setCost,
  onContinue,
}: {
  progress: number;
  onBack: () => void;
  cost: number;
  setCost: (n: number) => void;
  onContinue: () => void;
}) {
  const monthly = useMemo(() => Math.round(cost * 30), [cost]);
  const pct = (cost / 200) * 100;

  const handleContinue = () => {
    trackQuizAnswered("cost_question", String(cost), { cost_daily: cost, cost_monthly: monthly });
    onContinue();
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-12">
      <TopBar progress={progress} onBack={onBack} />
      <div className="flex justify-center">
        <StatusPill tone="amber" label="Calculating Habit Impact" />
      </div>

      <h2 className="mt-6 text-center text-[2rem] font-extrabold leading-tight">
        Roughly how much is this habit costing you?
      </h2>

      <div className="mt-10 text-center">
        <div className="flex items-baseline justify-center">
          <span className="text-6xl font-extrabold">£{cost}</span>
          <span className="ml-1 text-2xl font-medium text-white/60">/day</span>
        </div>
        <p className="mt-2 text-white/60">≈ £{monthly}/month</p>
      </div>

      <div className="mt-10 px-1">
        <div className="relative h-2 w-full rounded-full bg-white/10">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-sky-400"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-white shadow-[0_0_25px_rgba(168,85,247,0.8)] ring-2 ring-purple-400/40"
            style={{ left: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={200}
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-3 flex justify-between text-sm text-white/50">
          <span>£0</span>
          <span>£200/day</span>
        </div>
      </div>

      <div className="mt-10">
        <button
          onClick={handleContinue}
          className="flex w-full items-center justify-center gap-2 rounded-full funnel-cta px-6 py-5 text-lg font-bold transition-transform active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function ResultsStep({ substance, onContinue }: { substance: string; onContinue: () => void }) {
  const youScore = 64;
  const avgScore = 36;
  const diff = youScore - avgScore;
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} items-center pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3.5rem,env(safe-area-inset-top))] text-center`}
    >
      <div className={`${FUNNEL_QUIZ_W} flex w-full flex-col items-center`}>
        <header className="flex items-center justify-center gap-2.5">
          <h1 className="text-[32px] font-extrabold leading-[38px] tracking-tight">Analysis Complete</h1>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500 shadow-[0_0_20px_rgba(129,140,248,0.7)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </header>

        <p className="mt-4 text-base leading-[22px] text-white/90">
          Your impact score is <span className="font-bold text-red-400">{diff}%</span> higher than the
          average <span className="font-bold">{substance}</span> user.
        </p>

        <div className="mt-8 flex w-full justify-center gap-6">
          {[
            { label: "Your Score", pct: youScore, color: "bg-red-500", glow: "shadow-[0_0_40px_rgba(239,68,68,0.45)]" },
            { label: "Average User", pct: avgScore, color: "bg-emerald-500", glow: "shadow-[0_0_40px_rgba(16,185,129,0.45)]" },
          ].map((bar) => (
            <div key={bar.label} className="flex flex-col items-center">
              <div className="relative h-[260px] w-[88px] overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/5">
                <div
                  className={`absolute bottom-0 left-0 right-0 flex items-start justify-center rounded-2xl pt-3 transition-all duration-[1400ms] ease-out ${bar.color} ${bar.glow}`}
                  style={{ height: animate ? `${bar.pct}%` : "0%" }}
                >
                  <span className="text-2xl font-extrabold drop-shadow">{bar.pct}%</span>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-white/60">{bar.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-base leading-[22px] text-white/90">
          Clean AI is now using the provided answers to map out the best strategy for you to overcome
          triggers, Improve your habbits & reach your goals.
        </p>

        <div className="mt-8 w-full">
          <button onClick={onContinue} className={`${FUNNEL_CTA_ROW} pl-8 pr-3`}>
            <span className="flex-1 text-center">It's Time To Change</span>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-white/40">
            * The result is an indication only, not a medical diagnosis. For a definitive assessment,
            please consult a healthcare professional.
          </p>
        </div>
      </div>
    </div>
  );
}

function LandingTopGlow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[min(42vh,300px)] overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0b2e]/40 via-black/80 to-black" />
    </div>
  );
}

function LandingStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className={`${FUNNEL_SHELL} relative overflow-y-auto bg-black pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
    >
      <section className={`relative ${FUNNEL_PAD} pt-[max(2rem,env(safe-area-inset-top))] pb-1`}>
        <LandingTopGlow />
        <header className={`${FUNNEL_WELCOME_E_W} relative z-10 mx-auto text-center`}>
          <p className="text-sm font-semibold text-purple-400">Welcome to</p>
          <h1 className="mt-0.5 text-5xl font-extrabold tracking-tight drop-shadow-[0_0_22px_rgba(168,85,247,0.4)]">
            Clean
          </h1>
          <div className="mx-auto mt-1.5 h-px w-28 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          <h2 className="mt-2 text-center text-[26px] font-normal italic leading-[31px] text-white/95">
            Quit or cut down on Cocaine, effectively.
          </h2>
        </header>
      </section>

      <section
        className={`${FUNNEL_PAD} ${FUNNEL_WELCOME_E_W} relative z-10 mx-auto flex w-full flex-col items-center overflow-visible`}
      >
        <img
          src={LANDING_IMG_LOGO_GREY}
          alt=""
          className="w-full object-contain"
          aria-hidden
        />

        <img
          src={LANDING_IMG_CHARACTER}
          alt=""
          className="mt-2 w-full origin-top scale-[1.2] object-contain"
        />

        <blockquote className="mt-4 max-w-[300px] text-center">
          <p className="text-lg font-semibold leading-snug text-white/95">
            &ldquo;Like a mate helping you quit.&rdquo;
          </p>
        </blockquote>

        <div className="mt-6 w-full">
          <button type="button" onClick={onContinue} className={`${FUNNEL_CTA_ROW} pl-8 pr-2.5`}>
            <span className="flex-1 text-center">Start my transformation</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
        </div>

        <nav className="mt-5 flex items-center justify-center gap-8 text-sm text-white/40">
          <a href="#" className="hover:text-white/60">
            Terms
          </a>
          <a href="#" className="hover:text-white/60">
            Privacy
          </a>
        </nav>
      </section>
    </div>
  );
}

function Welcome2Step({ onContinue }: { onContinue: () => void }) {
  const headline = "Built for the hard days.";
  const body = "Anyone can feel motivated for a day. The hard part is staying consistent when cravings come back.";

  const [bodyStarted, setBodyStarted] = useState(false);
  const { typed: h, done: headlineDone, showCursor: headlineCursor } = useTypewriter({
    cacheId: "welcome2-headline",
    text: headline,
    charDelay: TYPEWRITER_CHAR_DELAY,
    holdAfterMs: TYPEWRITER_HOLD_MS,
  });
  const { typed: b, done: bodyDone, showCursor: bodyCursor } = useTypewriter({
    cacheId: "welcome2-body",
    text: body,
    charDelay: TYPEWRITER_CHAR_DELAY,
    holdAfterMs: TYPEWRITER_HOLD_MS,
    enabled: bodyStarted,
  });

  useEffect(() => {
    if (headlineDone) {
      const t = setTimeout(() => setBodyStarted(true), 800);
      return () => clearTimeout(t);
    }
  }, [headlineDone]);

  const showCta = headlineDone && bodyDone;

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]`}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center -translate-y-[30px]">
        <div className={`${FUNNEL_WELCOME_E_W} w-full`}>
          <p className="text-lg font-semibold text-purple-400">Welcome to</p>
          <h1 className="mt-3 text-7xl font-extrabold tracking-tight drop-shadow-[0_0_35px_rgba(168,85,247,0.5)]">
            Clean
          </h1>
          <div className="mx-auto mt-4 h-px w-full max-w-[280px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        </div>

        <h2 className="mx-auto mt-10 max-w-[342px] text-[28px] font-extrabold leading-[34px]">
          <TypeText full={headline} typed={h} showCursor={headlineCursor} />
        </h2>

        <p className="mx-auto mt-5 max-w-[296px] text-xl leading-[27px] text-white/80">
          <TypeText full={body} typed={b} showCursor={bodyCursor} />
        </p>
      </div>

      <div className={`${FUNNEL_WELCOME_E_W} ${showCta ? "animate-in fade-in duration-500" : "invisible"}`}>
        <button onClick={onContinue} className={FUNNEL_CTA_ROW}>
          <span className="flex-1 text-center">Continue To My Plan</span>
          <span aria-hidden className="text-xl">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}

const GOALS: ChoiceOpt[] = [
  { id: "relationships", label: "Stronger Relationships", emoji: "❤️" },
  { id: "energy", label: "Energy & Motivation", emoji: "⚡" },
  { id: "financial", label: "Financial Freedom", emoji: "💰" },
  { id: "mental", label: "Better Mental Health", emoji: "🧠" },
  { id: "physical", label: "Better Physical Health", emoji: "💪" },
  { id: "focus", label: "Clearer Thinking & Focus", emoji: "🎯" },
  { id: "confidence", label: "Improved Self Confidence", emoji: "✨" },
  { id: "life", label: "Get My Life Together", emoji: "🕐" },
  { id: "discipline", label: "Stronger Discipline", emoji: "📈" },
];

function GoalsStep({
  value,
  onChange,
  onContinue,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onContinue: () => void;
}) {
  const MAX = 3;
  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else if (value.length < MAX) {
      onChange([...value, id]);
    }
  };
  const ready = value.length === MAX;

  const handleContinue = () => {
    trackQuizAnswered("motivation_question", value);
    onContinue();
  };

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]`}
    >
      <div className={`${FUNNEL_QUIZ_W} flex flex-1 flex-col`}>
        <header className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-400">
            This is what we're fighting for.
          </p>
          <h1 className="mt-5 text-center text-[26px] font-extrabold leading-[32px]">
            Choose Your 3 Goals
          </h1>
          <p className="mt-3 text-center text-base leading-[22px] text-white/70">
            Pick up to 3. These become your tracked goals inside Clean.
          </p>
          <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        </header>

        <ul className="mt-5 flex flex-col gap-3">
        {GOALS.map((g) => {
          const active = value.includes(g.id);
          return (
            <li key={g.id}>
              <button
                onClick={() => toggle(g.id)}
                className={[
                  "flex w-full items-center gap-4 rounded-full border bg-white/[0.02] px-4 py-3.5 text-left transition-all",
                  active
                    ? "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                    : "border-white/10 hover:border-white/20",
                ].join(" ")}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center text-2xl">
                  {g.emoji}
                </span>
                <span className="flex-1 text-base font-semibold">{g.label}</span>
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all",
                    active
                      ? "bg-amber-400 text-black"
                      : "border-2 border-white/25",
                  ].join(" ")}
                >
                  {active && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            </li>
          );
        })}
        </ul>

        <div className="mt-auto pt-8">
          <button
            onClick={ready ? handleContinue : undefined}
            disabled={!ready}
            className={[
              "relative flex w-full min-h-[66px] items-center justify-between rounded-[50px] px-3 pl-8 text-[18px] font-bold transition-all",
              ready
                ? "bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-black shadow-[0_0_45px_rgba(245,158,11,0.55)] active:scale-[0.98]"
                : "cursor-not-allowed bg-gradient-to-r from-amber-700/60 via-amber-600/50 to-yellow-600/50 text-white/50",
            ].join(" ")}
          >
            <span className="flex-1 text-center">Track These Goals</span>
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${ready ? "bg-black/20 text-black" : "bg-black/30 text-white/60"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </span>
          </button>
          <p className="mt-3 text-center text-xs text-white/40">
            {value.length}/{MAX} selected
          </p>
        </div>
      </div>
    </div>
  );
}

type Testimonial = {
  name: string;
  role: string;
  badge: "expert" | "story" | "user";
  headline: string;
  quote: string;
  avatar?: string;
};

function TestimonialsFixedCta({
  onContinue,
  entering = false,
}: {
  onContinue: () => void;
  entering?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 w-full${
        entering ? " animate-in fade-in duration-400 fill-mode-both" : ""
      }`}
    >
      <div className="pointer-events-none mx-auto w-full max-w-[390px] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 top-0 -z-10 bg-gradient-to-t from-[#0a0414]/95 via-[#0a0414]/75 to-transparent"
          aria-hidden
        />
        <button
          type="button"
          onClick={onContinue}
          className={`pointer-events-auto relative ${FUNNEL_CTA_ROW}`}
        >
        <span className="flex-1 text-center">I Want Results Like These</span>
        <span aria-hidden className="text-xl">
          ›
        </span>
        </button>
      </div>
    </div>
  );
}

function TestimonialsStep() {
  const items: Testimonial[] = [
    {
      name: "Jake",
      role: "Clean User",
      badge: "user",
      headline: "Actually works tbh, loving it",
      quote: "Thought I'd fail again. 34 days clean now, streaks keep me locked in. Proper rate this app.",
    },
    {
      name: "Darren Cole",
      role: "Clean User",
      badge: "user",
      headline: "Like a mate helping you",
      quote: "Tracks progress without being salesy. Makes quitting feel doable. Big fan.",
    },
    {
      name: "Mia",
      role: "Clean User",
      badge: "user",
      headline: "Lowkey addictive",
      quote: "The tracker stops me folding when cravings hit 😅 20 days sober and proud. Elite app.",
    },
    {
      name: "Sophie R.",
      role: "Clean User",
      badge: "user",
      headline: "No cringe vibes",
      quote: "So natural and actually useful. Feels like a safe space, not a lecture. Love it.",
    },
    {
      name: "Tommy",
      role: "Clean User",
      badge: "user",
      headline: "Keeps you honest",
      quote: "Not preachy, just real. Helps me stay accountable without feeling judged.",
    },
  ];

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} pb-[max(7.5rem,calc(env(safe-area-inset-bottom)+6.5rem))] pt-[max(3.5rem,env(safe-area-inset-top))]`}
    >
      <header className="w-full text-center">
        <LaurelWreath className="mx-auto h-11 w-28 drop-shadow-[0_0_12px_rgba(234,179,8,0.35)]" />
        <h1 className="mx-auto mt-4 max-w-[330px] text-[26px] font-bold leading-[30px] drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]">
          Here's What Others Said About Getting Clean
        </h1>
      </header>

      <div className="mt-6 w-full rounded-xl border border-white/10 bg-white/[0.02] px-2 py-5">
        <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
          <Stat value="2,000" label="Members" />
          <Stat value="89%" label="Success Rate" />
          <Stat value="21 days" label="Avg. to habit-free" />
        </div>
      </div>

      <div className="mt-6 flex w-full flex-col gap-4">
        {items.map((t) => (
          <TestimonialCard key={t.name} t={t} />
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2">
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-xs text-white/55">{label}</div>
    </div>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <article className="w-full rounded-[12px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 shadow-[0_0_25px_rgba(99,102,241,0.08)]">
      <header className="flex items-center gap-3">
        {t.badge === "user" ? (
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-black ring-1 ring-white/10">
            <span className="text-[10px] font-extrabold tracking-wider text-white">CLEAN</span>
          </div>
        ) : (
          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-lg ring-1 ring-white/10">
            {t.badge === "expert" ? "🎓" : "🎤"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-base font-bold">{t.name}</p>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-amber-400" fill="currentColor">
              <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.49L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" opacity="0.001" />
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 11 15 16 9" fill="none" stroke="#0a0414" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-white/55">
            {t.role}
            {t.badge === "user" && <span className="text-amber-400">⭐</span>}
          </p>
        </div>
      </header>
      <h3 className="mt-4 text-xl font-extrabold leading-tight">{t.headline}</h3>
      <p className="mt-2 text-base leading-relaxed text-white/75">{t.quote}</p>
    </article>
  );
}

function ReadyStep({ onContinue }: { onContinue: () => void }) {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-8 pt-20">
      <header className="text-center">
        <h1 className="text-[2rem] font-extrabold leading-tight">Your System Is Ready</h1>
        <p className="mt-3 text-lg text-white/75">You now have structure behind you.</p>
      </header>

      <div className="mt-10 px-2">
        <div className="relative aspect-[1.05/1.55] w-full overflow-hidden rounded-[2rem] p-6 shadow-[0_25px_80px_-15px_rgba(249,115,22,0.45)] ring-1 ring-white/15">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #7dd3fc 0%, #60a5fa 28%, #94a3b8 50%, #fb923c 72%, #ea580c 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-start justify-between">
              <span className="rounded-full border border-white px-4 py-1.5 text-sm font-bold tracking-wider text-white">
                CLEAN
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold tracking-wider text-white backdrop-blur">
                <span className="text-amber-300">★</span> MEMBER
              </span>
            </div>

            <div className="mt-auto">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                Active Streak
              </p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-7xl font-extrabold leading-none text-white drop-shadow-[0_4px_20px_rgba(255,255,255,0.5)]">
                  0
                </span>
                <span className="mb-2 text-2xl font-medium text-white">days</span>
              </div>
            </div>

            <div className="mt-auto pt-12 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                Free Since
              </p>
              <p className="mt-1 text-2xl font-extrabold text-white">{dateStr}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-lg leading-snug text-white/85">
        Designed around your routines, triggers & goals.
      </p>

      <div className="mt-auto pt-10">
        <button
          onClick={onContinue}
          className="relative flex w-full items-center justify-between rounded-full funnel-cta px-6 py-5 text-lg font-bold transition-transform active:scale-[0.98]"
        >
          <span className="flex-1 text-center">Continue My Journey</span>
          <span aria-hidden className="text-xl">›</span>
        </button>
      </div>
    </div>
  );
}

const WORRY_IMPACT: Record<string, string> = {
  years: "future",
  discipline: "motivation",
  financial: "finances",
  relationships: "relationships",
  mental: "mental health",
  dependent: "sense of control",
};

const HOWLONG_TIMEFRAME: Record<string, string> = {
  years: "years",
  overayear: "over a year",
  months: "months",
  recently: "weeks",
};

const DIFFERENCE_PHRASE: Record<string, string> = {
  finances: "your financial freedom",
  energy: "your stable energy",
  disciplined: "your discipline",
  control: "your sense of control",
  confident: "your confidence",
  routines: "your normal routines",
  relationships: "your relationships",
};

function formatGBP(n: number) {
  return `£${n.toLocaleString("en-GB")}`;
}

function PlanStep({
  substance,
  worries,
  howlong,
  cost,
  difference,
  onContinue,
}: {
  substance: string;
  worries: string;
  howlong: string;
  cost: number;
  difference: string;
  onContinue: () => void;
}) {
  const impact = WORRY_IMPACT[worries] ?? "mental health";
  const timeframe = HOWLONG_TIMEFRAME[howlong] ?? "months";
  const isToday = howlong === "recently";
  const daily = formatGBP(cost);
  const yearly = formatGBP(cost * 365);
  const transformation = DIFFERENCE_PHRASE[difference] ?? "your control";

  const pages: string[] = useMemo(
    () => [
      "Clean is now yours. Personalised around your life, your situation, and what you actually need to break free.",
      `You said ${substance} has been hitting your ${impact} the hardest.\n\nYour recovery path focuses on helping you rebuild that step by step.`,
      isToday
        ? "Today is the day you realised something has to change.\n\nThe sooner you interrupt the cycle, the easier it becomes to rebuild control."
        : `You've known something has to change for ${timeframe}.\n\nThe sooner you interrupt the cycle, the easier it becomes to rebuild control.`,
      "Clean isn't just there to count sober days.\n\nIt's designed to help you interrupt cravings, rebuild routines, and stay consistent when difficult moments hit.",
      `You currently spend around ${daily} a day — that's over ${yearly} a year.\n\nThat's not just money lost. It's time, freedom, opportunities, and control.`,
      `Getting back ${transformation} starts with breaking the patterns that have been pulling you backwards.`,
      "You've spent enough time stuck in the same cycle.\n\nNow let's start building something better.",
    ],
    [substance, impact, timeframe, isToday, daily, yearly, transformation],
  );

  const [page, setPage] = useState(0);
  const pageText = pages[page];
  const isLast = page === pages.length - 1;

  const { typed, done, showCursor } = useTypewriter({
    cacheId: `plan-page-${page}`,
    text: pageText,
    charDelay: TYPEWRITER_CHAR_DELAY,
    holdAfterMs: TYPEWRITER_HOLD_MS,
    onComplete: () => {
      if (!isLast) setPage((p) => p + 1);
    },
  });

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let wakeLock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch {
        // Unsupported, denied, or low battery — plan still plays without wake lock
      }
    };

    void acquire();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      } else {
        void wakeLock?.release();
        wakeLock = null;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void wakeLock?.release();
    };
  }, []);

  return (
    <div
      className={`${FUNNEL_SHELL} ${FUNNEL_PAD} pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))]`}
    >
      <div className={`${TYPEWRITER_SCREEN_CENTER} flex-1 min-h-0`}>
        <h2 className={TYPEWRITER_TEXT_QUOTE}>
          <TypeText full={pageText} typed={typed} showCursor={showCursor} stableLayout />
        </h2>
      </div>

      {isLast && done && (
        <button
          onClick={onContinue}
          className={`${FUNNEL_CTA_ROW} animate-in fade-in duration-500`}
        >
          <span className="flex-1 text-center">Start Rebuilding My Life</span>
          <span aria-hidden className="text-xl">
            ›
          </span>
        </button>
      )}
    </div>
  );
}

type ResetCardKind = "feature" | "banner";
type ResetCard =
  | { kind: "feature"; emoji: string; title: string; desc: string }
  | { kind: "banner"; title: string; desc: string };

const RESET_CARDS: ResetCard[] = [
  { kind: "feature", emoji: "🗂️", title: "Set Up for Success", desc: "Make your home, phone & routine support your goals." },
  { kind: "feature", emoji: "🧠", title: "Deal With Withdrawal", desc: "Quick tools to ride out urges without losing control." },
  { kind: "feature", emoji: "🔥", title: "Outsmart Triggers", desc: "Spot what pulls you back — replace it with better habits." },
  { kind: "banner", title: "You're already breaking the cycle.", desc: "Every clean day weakens old patterns." },
  { kind: "feature", emoji: "💰", title: "Visualise your savings", desc: "See how much money you take back daily." },
  { kind: "feature", emoji: "🤖", title: "24/7 AI support", desc: "Get instant support when cravings hit." },
  { kind: "feature", emoji: "👥", title: "Rebuild relationships", desc: "Show up calmer, clearer & more connected." },
  { kind: "banner", title: "You're starting to regain control.", desc: "Small wins become real momentum fast." },
  { kind: "feature", emoji: "📈", title: "Progress tracking", desc: "Track clarity, mood, progress & consistency." },
  { kind: "feature", emoji: "🫂", title: "Community support", desc: "Connect with people on the same path." },
  { kind: "feature", emoji: "🎓", title: "Guided courses", desc: "Step-by-step systems to stay in control." },
  { kind: "banner", title: "This gets easier with structure.", desc: "You don't have to rely on motivation anymore." },
  { kind: "feature", emoji: "⚡", title: "Get Your Energy Back", desc: "Your motivation and energy return, quick." },
  { kind: "feature", emoji: "💪", title: "Feel good physically", desc: "Better sleep, steadier energy & faster recovery." },
  { kind: "feature", emoji: "🎯", title: "Think clearly again", desc: "Less brain fog. More focus. More control." },
  { kind: "banner", title: "Your future is coming back.", desc: "More clarity. More control. More connection." },
  { kind: "feature", emoji: "💸", title: "Take back your money", desc: "See more money stay in your pocket each week." },
  { kind: "feature", emoji: "⏳", title: "Take back your time", desc: "More room for goals, routines & real life." },
  { kind: "feature", emoji: "🧭", title: "Feel in control again", desc: "Life stops revolving around cravings & escape." },
];

function ResetFixedCta({
  onContinue,
  entering = false,
}: {
  onContinue: () => void;
  entering?: boolean;
}) {
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-50 w-full${
        entering ? " animate-in fade-in duration-400 fill-mode-both" : ""
      }`}
    >
      <div className="pointer-events-none mx-auto w-full max-w-[390px]">
        <div className="pointer-events-auto border-t border-[rgba(91,26,168,0.3)] bg-[rgba(10,10,18,0.97)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            onClick={onContinue}
            className="relative flex h-[66px] w-full max-w-[350px] items-center justify-between rounded-[50px] bg-gradient-to-r from-[#8b5cf6] to-[#3b82f6] px-6 text-[18px] font-bold leading-none text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] transition-transform active:scale-[0.98] mx-auto"
          >
            <span className="flex-1 text-center">I'm Ready To Progress</span>
            <span aria-hidden className="text-xl">
              ›
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetStep({ paywallActive = false }: { paywallActive?: boolean }) {
  const title = "This is the moment your life changes!";
  const { typed, done, showCursor } = useTypewriter({
    cacheId: "reset-title",
    text: title,
    charDelay: 50,
    holdAfterMs: TYPEWRITER_HOLD_MS,
  });

  return (
    <div
      className={`relative mx-auto flex min-h-[100svh] w-full max-w-[390px] flex-col overflow-x-hidden px-5 pb-[max(8.5rem,calc(env(safe-area-inset-bottom)+7rem))] pt-6 transition-opacity duration-[450ms] ease-out ${
        paywallActive ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center">
        <div className={`${FUNNEL_WELCOME_E_W} text-center`}>
          <h2 className="text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_0_28px_rgba(255,255,255,0.22)]">
            Clean
          </h2>
          <div
            className="mx-auto mt-3 h-px w-32 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            aria-hidden
          />
        </div>

        <h1 className="mx-auto mt-6 max-w-[294px] text-center text-[32px] font-bold leading-[38px] text-white">
          <TypeText full={title} typed={typed} showCursor={showCursor} />
        </h1>
      </div>

      {done && (
        <>
          <p className="mx-auto mt-5 max-w-[320px] text-center text-[17px] font-medium leading-[24px] text-white/80 animate-in fade-in duration-500">
            We're going to make sure you're successful - here's the plan! 👇
          </p>

          <div className="mx-auto mt-8 flex w-full max-w-[350px] flex-col gap-[22px] animate-in fade-in duration-700">
            {RESET_CARDS.map((c, i) => {
              const stagger =
                i % 2 === 0 ? "self-end mr-[50px]" : "self-start ml-[50px]";
              if (c.kind === "banner") {
                return (
                  <div
                    key={i}
                    className="box-border w-full shrink-0 rounded-[16px] border-2 border-[#5B1AA8] bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 p-4 shadow-[0_0_40px_rgba(217,70,239,0.35)]"
                  >
                    <h3 className="mb-1.5 text-[18px] font-bold leading-[22px]">{c.title}</h3>
                    <p className="text-[15px] font-normal leading-[22px] text-white/90">{c.desc}</p>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`${stagger} box-border w-[300px] max-w-[calc(100vw-40px)] shrink-0 rounded-[16px] border-2 border-[#5B1AA8] bg-[#0D0D22] p-4 shadow-[0_0_25px_rgba(168,85,247,0.15)]`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[32px] leading-none">{c.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1.5 text-[18px] font-bold leading-[22px]">{c.title}</h3>
                      <p className="text-[15px] font-normal leading-[22px] text-white/75">{c.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

type PaywallLocale = "gb" | "us";

function detectPaywallLocale(): PaywallLocale {
  if (typeof navigator === "undefined") return "us";
  const lang = navigator.language.toLowerCase();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (lang === "en-gb" || lang.endsWith("-gb") || tz === "Europe/London") return "gb";
  return "us";
}

const PAYWALL_COPY: Record<
  PaywallLocale,
  { price: string; strikePrice: string; legal: string }
> = {
  gb: {
    price: "£0.99",
    strikePrice: "£12.99",
    legal:
      "By continuing, you agree to the Terms of Service and Privacy Policy. Your subscription includes a 3-day introductory trial for £1, after which it automatically renews at £12.99/week unless cancelled before renewal. Cancel anytime through your account settings.",
  },
  us: {
    price: "$0.99",
    strikePrice: "$12.99",
    legal:
      "By continuing, you agree to the Terms of Service and Privacy Policy. Your subscription includes a 3-day introductory trial for $1, after which it automatically renews at $12.99/week unless cancelled before renewal. Cancel anytime through your account settings.",
  },
};

const PAYWALL_HEADLINE = "Regain your sleep, money & health for less than a half";

const isApplePayCapable =
  typeof window !== "undefined" &&
  /iP(hone|ad)/.test(navigator.userAgent) &&
  /Safari/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|OPiOS/.test(navigator.userAgent);

function PaywallSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(5 * 60);
  const [locale, setLocale] = useState<PaywallLocale>("us");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = window.setTimeout(() => setPresent(false), 450);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLocale(detectPaywallLocale());
    setSeconds(5 * 60);
    setCheckoutError(null);
    setCheckoutLoading(false);
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [open]);

  const reportWalletCheckoutError = useCallback((message: string) => {
    setCheckoutError((prev) => (prev ? `${prev}\n${message}` : message));
  }, []);

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
      });

      const bodyText = await res.text();
      console.log("[create-checkout-session] response", {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        body: bodyText,
      });

      let data: { url?: string; error?: string } = {};
      try {
        data = bodyText ? (JSON.parse(bodyText) as { url?: string; error?: string }) : {};
      } catch {
        console.error("[create-checkout-session] response body is not JSON", bodyText);
        setCheckoutError(
          `Checkout failed (${res.status}). Server returned non-JSON. See console for body.`,
        );
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (!res.ok) {
        setCheckoutError(data.error ?? `Checkout failed (${res.status} ${res.statusText}).`);
        return;
      }

      setCheckoutError(data.error ?? "No checkout URL returned. See console for response body.");
    } catch (err) {
      console.error("[create-checkout-session] fetch error", err);
      const message = err instanceof Error ? err.message : String(err);
      setCheckoutError(`Could not reach checkout: ${message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!present) return null;

  const { price, strikePrice, legal } = PAYWALL_COPY[locale];
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  const headlineFull = PAYWALL_HEADLINE;
  const headlineWords = headlineFull.split(" ");
  const headlineLead =
    headlineWords.length >= 3 ? headlineWords.slice(0, -2).join(" ") : headlineFull;
  const headlineAccent =
    headlineWords.length >= 3 ? headlineWords.slice(-2).join(" ") : "";

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-y-auto text-white transition-opacity duration-[450ms] ease-out ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 bg-[#0a0414]">
        <Starfield />
      </div>

      <div
        className={`relative z-10 mx-auto flex min-h-full max-w-sm flex-col px-6 pb-8 pt-6 transition-all duration-[450ms] ease-out ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <h1 className="text-center text-[34px] font-extrabold leading-[1.1] tracking-tight">
          {headlineLead}
          {headlineAccent ? (
            <>
              {" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                {headlineAccent}
              </span>
            </>
          ) : null}
        </h1>

        <p className="mt-4 text-center text-base leading-relaxed text-white/75">
          Full access to your system, and every feature Clean offers including the community, AI coach,
          progress tracking &amp; more.
        </p>

        <div className="mx-auto mt-8 inline-flex flex-col items-center rounded-2xl border-2 border-violet-500/70 bg-black/30 px-7 py-4 text-center shadow-[0_0_36px_rgba(91,33,182,0.45),0_0_24px_rgba(29,78,216,0.35)]">
          <div className="text-[52px] font-extrabold leading-none tracking-tight text-white drop-shadow-[0_0_16px_rgba(255,255,255,0.35)]">
            80%
          </div>
          <div className="mt-1.5 bg-gradient-to-r from-violet-300 to-blue-400 bg-clip-text text-[10px] font-bold uppercase tracking-[0.3em] text-transparent">
            Discount
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/85">The offer leaves in...</p>
        <div className="mt-1 text-center text-[40px] font-extrabold tabular-nums tracking-tight text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.3)]">
          {mm}:{ss}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-violet-500/50 shadow-[0_0_28px_rgba(91,33,182,0.35),0_0_20px_rgba(29,78,216,0.25)]">
          <div className="bg-gradient-to-r from-[#6d28d9] via-[#5b21b6] to-[#1d4ed8] py-2 text-center text-[11px] font-extrabold uppercase tracking-wider text-white">
            Get access while this offer lasts!
          </div>
          <div className="flex items-center justify-between bg-neutral-950 px-5 py-4">
            <div>
              <div className="text-lg font-extrabold text-white">Full Access</div>
              <div className="text-xs text-white/50">Instant Progress</div>
            </div>
            <div className="flex shrink-0 items-baseline gap-2">
              <span className="-mt-1.5 whitespace-nowrap text-sm font-semibold tabular-nums text-white/45 line-through decoration-white/35">
                {strikePrice}
              </span>
              <span className="text-2xl font-extrabold tabular-nums text-white">{price}</span>
            </div>
          </div>
        </div>

        {/* Apple Pay — primary CTA on iOS Safari */}
        <PaywallExpressCheckout open={open} onError={reportWalletCheckoutError} />

        {/* Redirect button — shown on non-iOS-Safari devices */}
        {!isApplePayCapable && (
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className={[
              "mt-6 flex w-full items-center justify-center rounded-[50px] bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-8 py-5 text-[19px] font-extrabold shadow-[0_0_40px_rgba(129,140,248,0.55)] transition-transform active:scale-[0.98]",
              checkoutLoading ? "cursor-not-allowed opacity-70" : "",
            ].join(" ")}
          >
            {checkoutLoading ? "Starting checkout…" : "Claim Your Offer Now"}
          </button>
        )}

        {/* Safety net — if Apple Pay errors on iOS, show redirect button */}
        {isApplePayCapable && checkoutError && (
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="mt-3 flex w-full items-center justify-center rounded-[50px] bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-8 py-5 text-[19px] font-extrabold shadow-[0_0_40px_rgba(129,140,248,0.55)] transition-transform active:scale-[0.98]"
          >
            {checkoutLoading ? "Starting checkout…" : "Claim Your Offer Now"}
          </button>
        )}

        {checkoutError ? (
          <p className="mt-3 text-center text-sm leading-snug text-red-300" role="alert">
            {checkoutError}
          </p>
        ) : null}

        <button type="button" className="mt-5 w-full text-center text-xs text-white/70 underline underline-offset-4">
          Restore Purchase
        </button>

        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-center text-[11px] leading-relaxed text-white/50">
          This is an auto-renewing subscription. Your first payment is £0.99 as
          an introductory offer. All future payments will be automatically charged
          at £12.99/month until you cancel. You can cancel by emailing{" "}
          <a href="mailto:reece@cleanofficialapp.com" className="underline text-white/70">
            reece@cleanofficialapp.com
          </a>
          {". "}
          This subscription is bound by our{" "}
          <a href="/privacy" className="underline text-white/70">Privacy Policy</a>
          {", "}
          <a href="/fulfillment" className="underline text-white/70">Fulfillment Policy</a>
          {", "}
          <a href="/terms" className="underline text-white/70">Terms of Use</a>
          {" and "}
          <a href="/refund" className="underline text-white/70">Refund Policy</a>
          {"."}
        </div>

        <footer className="mt-10 mb-6 flex justify-center gap-6 text-xs text-white/40">
          <a href="/privacy" className="hover:text-white/70 transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-white/70 transition-colors">Terms of Service</a>
        </footer>
      </div>
    </div>
  );
}
