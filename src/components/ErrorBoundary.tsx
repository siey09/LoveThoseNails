import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected studio system error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed && parsed.error) {
          friendly = `Database access notice (${parsed.operationType || 'operation'}): ${parsed.error}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-[#F2ECEB] text-[#141212] flex items-center justify-center p-6">
          <div className="max-w-lg w-full neu-surface p-8 space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#554C4B]">
              Love Those Nails by Eshin
            </p>
            <h1 className="font-['Playfair_Display'] text-2xl font-semibold">
              Something interrupted the studio session
            </h1>
            <p className="text-sm text-[#554C4B] leading-relaxed break-words">
              {friendly}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="neu-btn-ink px-6 py-2.5 text-sm font-medium cursor-pointer"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
