import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/fulfillment")({
  head: () => ({
    meta: [
      { title: "Fulfillment Policy — Clean" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FulfillmentPage,
});

function FulfillmentPage() {
  return (
    <main className="clean-shell">
      <div className="clean-stars" aria-hidden />
      <div className="clean-container py-14">
        <h1 className="clean-h1 text-center">Fulfillment Policy</h1>
        <p className="mt-2 text-center text-sm text-white/40">
          Clean Mobile App Limited · Last updated: May 2026
        </p>

        <div className="mt-10 space-y-4 text-white/80 text-sm leading-relaxed">
          {[
            "Upon successful payment you will be prompted to create an account.",
            "Access to Clean Quit Drugs premium features is granted immediately after account creation.",
            "Download the app from the App Store and log in with the email and password you created.",
            "Digital products are delivered immediately and are non-transferable.",
          ].map((item) => (
            <div key={item} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              <p>{item}</p>
            </div>
          ))}
          <div className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
            <p>
              If you experience any issues accessing your account contact{" "}
              <a href="mailto:reece@cleanofficialapp.com" className="text-white underline underline-offset-2">
                reece@cleanofficialapp.com
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
