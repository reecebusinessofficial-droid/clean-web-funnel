import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Clean" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <main className="clean-shell">
      <div className="clean-stars" aria-hidden />
      <div className="clean-container py-14">
        <h1 className="clean-h1 text-center">Refund Policy</h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Clean Mobile App Limited · Last updated: May 2026
        </p>

        <div className="mt-10 space-y-4 text-white/80 text-sm leading-relaxed">
          {[
            "We offer a full refund within 14 days of your first purchase if you have not accessed the app or used any premium features.",
            "To request a refund contact reece@cleanofficialapp.com within 14 days of purchase.",
            "Refunds are not available after 14 days or if premium features have been accessed.",
            "Refunds are processed within 5–10 business days back to your original payment method.",
          ].map((item) => (
            <div key={item} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              <p>{item}</p>
            </div>
          ))}
          <div className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <p>
              To cancel your subscription email{" "}
              <a href="mailto:reece@cleanofficialapp.com" className="text-white underline underline-offset-2">
                reece@cleanofficialapp.com
              </a>{" "}
              or visit{" "}
              <a href="https://start.cleanmobileapp.co.uk/cancel" className="text-white underline underline-offset-2">
                start.cleanmobileapp.co.uk/cancel
              </a>
            </p>
          </div>
        </div>

        <div className="mt-12 mb-6 text-center">
          <a href="/" className="text-xs text-white/40 hover:text-white/70 transition-colors">
            ← Back
          </a>
        </div>
      </div>
    </main>
  );
}
