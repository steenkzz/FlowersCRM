"use client";

import { Component, type ReactNode } from "react";

interface PreviewErrorBoundaryProps {
  children: ReactNode;
}

interface PreviewErrorBoundaryState {
  error: Error | null;
}

/** Catches runtime errors thrown by the dynamically-executed, AI-generated
 * preview component so a bad generation shows an inline message instead of
 * crashing the rest of the app. */
export default class PreviewErrorBoundary extends Component<
  PreviewErrorBoundaryProps,
  PreviewErrorBoundaryState
> {
  state: PreviewErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PreviewErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          This build&apos;s preview crashed at runtime: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
