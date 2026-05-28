import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaywallExpressCheckout } from "../components/funnel/PaywallExpressCheckout";

export const Route = createFileRoute("/paywall")({
  head: () => ({
    meta: [
      { title: "Get Clean Premium" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaywallPage,
});

// ── locale ────────────────────────────────────────────────────────────────────

type PaywallLocale = "gb" | "us";

function detectPaywallLocale(): PaywallLocale {
  if (typeof navigator === "undefined") return "us";
  const lang = navigator.language.toLowerCase();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (lang === "en-gb" || lang.endsWith("-gb") || tz === "Europe/London") return "gb";
  return "us";
}

const PAYWALL_COPY: Record<PaywallLocale, { price: string; strikePrice: string }> = {
  gb: { price: "£0.99", strikePrice: "£12.99" },
  us: { price: "$0.99", strikePrice: "$12.99" },
};

const PAYWALL_HEADLINE = "Regain your sleep, money & health for less than a half";

const isApplePayCapable =
  typeof window !== "undefined" &&
  /iP(hone|ad)/.test(navigator.userAgent) &&
  /Safari/.test(navigator.userAgent) &&
  !/CriOS|FxiOS|OPiOS/.test(navigator.userAgent);

// ── starfield ─────────────────────────────────────────────────────────────────

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      a: Math.random(),
      da: (Math.random() * 0.003 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.a = Math.max(0.05, Math.min(1, s.a + s.da));
        if (s.a <= 0.05 || s.a >= 1) s.da *= -1;
        ctx.beginPath();
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 h-full w-full"
      aria-hidden
    />
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

function PaywallPage() {
  const [seconds, setSeconds] = useState(5 * 60);
  const [locale, setLocale] = useState<PaywallLocale>("us");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(detectPaywallLocale());
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const reportWalletCheckoutError = useCallback((message: string) => {
    setCheckoutError((prev) => (prev ? `${prev}\n${message}` : message));
  }, []);

  const handleCheckout = async () => {
    setCheckoutError(null);
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", { method: "POST" });
      const bodyText = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = bodyText ? (JSON.parse(bodyText) as { url?: string; error?: string }) : {};
      } catch {
        setCheckoutError(
          `Checkout failed (${res.status}). Server returned non-JSON. See console for body.`,
        );
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data.error ?? `Checkout failed (${res.status} ${res.statusText}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCheckoutError(`Could not reach checkout: ${message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const { price, strikePrice } = PAYWALL_COPY[locale];
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  const headlineWords = PAYWALL_HEADLINE.split(" ");
  const headlineLead =
    headlineWords.length >= 3 ? headlineWords.slice(0, -2).join(" ") : PAYWALL_HEADLINE;
  const headlineAccent = headlineWords.length >= 3 ? headlineWords.slice(-2).join(" ") : "";

  return (
    <div className="relative min-h-screen overflow-y-auto bg-[#0a0414] text-white">
      <div className="pointer-events-none fixed inset-0">
        <Starfield />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-sm flex-col px-6 pb-8 pt-6">
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
          Full access to your system, and every feature Clean offers including the community, AI
          coach, progress tracking &amp; more.
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
        <PaywallExpressCheckout open={true} onError={reportWalletCheckoutError} />

        {/* Card payment option */}
        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="mt-3 flex w-full items-center justify-between rounded-2xl bg-white/10 border border-white/15 px-5 py-4 transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-base font-semibold text-white">
              {checkoutLoading ? "Starting checkout…" : "Pay by Card"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Visa */}
            <div className="flex h-6 w-10 items-center justify-center rounded bg-white px-1">
              <svg viewBox="0 0 48 16" className="h-3.5 w-auto">
                <text x="0" y="13" fontFamily="Arial" fontWeight="bold" fontSize="14" fill="#1a1f71">VISA</text>
              </svg>
            </div>
            {/* Mastercard */}
            <div className="flex h-6 w-10 items-center justify-center rounded bg-[#252525] px-1">
              <svg viewBox="0 0 38 24" className="h-5 w-auto">
                <circle cx="13" cy="12" r="11" fill="#eb001b"/>
                <circle cx="25" cy="12" r="11" fill="#f79e1b"/>
                <path d="M19 4.8a11 11 0 0 1 0 14.4A11 11 0 0 1 19 4.8z" fill="#ff5f00"/>
              </svg>
            </div>
            {/* Amex */}
            <div className="flex h-6 w-10 items-center justify-center rounded bg-[#2557d6] px-1">
              <svg viewBox="0 0 48 16" className="h-3 w-auto">
                <text x="0" y="12" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="white">AMEX</text>
              </svg>
            </div>
          </div>
        </button>

        {checkoutError ? (
          <p className="mt-3 text-center text-sm leading-snug text-red-300" role="alert">
            {checkoutError}
          </p>
        ) : null}

        <button
          type="button"
          className="mt-5 w-full text-center text-xs text-white/70 underline underline-offset-4"
        >
          Restore Purchase
        </button>

        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-center text-[11px] leading-relaxed text-white/50">
          This is an auto-renewing subscription. Your first payment is £0.99 as an introductory
          offer. All future payments will be automatically charged at £12.99/month until you cancel.
          You can cancel by emailing{" "}
          <a href="mailto:reece@cleanofficialapp.com" className="underline text-white/70">
            reece@cleanofficialapp.com
          </a>
          {". "}
          This subscription is bound by our{" "}
          <a href="/privacy" className="underline text-white/70">
            Privacy Policy
          </a>
          {", "}
          <a href="/fulfillment" className="underline text-white/70">
            Fulfillment Policy
          </a>
          {", "}
          <a href="/terms" className="underline text-white/70">
            Terms of Use
          </a>
          {" and "}
          <a href="/refund" className="underline text-white/70">
            Refund Policy
          </a>
          {"."}
        </div>

        <footer className="mt-10 mb-6 flex justify-center gap-6 text-xs text-white/40">
          <a href="/privacy" className="hover:text-white/70 transition-colors">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-white/70 transition-colors">
            Terms of Service
          </a>
        </footer>
      </div>
    </div>
  );
}
