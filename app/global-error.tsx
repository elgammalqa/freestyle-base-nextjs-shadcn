"use client";

/**
 * Last-resort error boundary. Replaces the entire RootLayout when an
 * error is thrown above the segment-level error.tsx (e.g. in the layout
 * itself or a top-level provider). Must define <html> and <body>.
 *
 * Keep this minimal — at this point styling, fonts, and providers may
 * not have loaded successfully.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxWidth: 640,
          margin: "0 auto",
          padding: "4rem 1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
          Application error
        </h2>
        <p style={{ color: "#666", marginBottom: "1rem" }}>
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest ? (
          <p
            style={{
              color: "#999",
              fontSize: "0.75rem",
              fontFamily: "monospace",
              marginBottom: "1rem",
            }}
          >
            Error id: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            background: "#000",
            color: "#fff",
            border: 0,
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
