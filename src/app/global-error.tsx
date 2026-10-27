"use client";

/** Last-resort error screen when the root layout itself fails (no styles or fonts are guaranteed here). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f4f7f5", color: "#0f1a16" }}>
        <div style={{ textAlign: "center", padding: 16, maxWidth: 360 }}>
          <h1 style={{ fontSize: 24 }}>The shop is having trouble</h1>
          <p>Please try again in a minute. If it keeps happening, call the store.</p>
          <button onClick={reset} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: 0, background: "#047857", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
