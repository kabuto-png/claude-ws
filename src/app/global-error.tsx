'use client';

/**
 * Global error boundary - handles errors that occur in root layout
 * This file is required to fix Next.js 16 Turbopack build bug with _global-error
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
      <body style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center' }}>
        <h1>Something went wrong!</h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            background: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
