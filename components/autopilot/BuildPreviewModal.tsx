"use client";

import { useMemo } from "react";
import { compileAddonComponent } from "@/lib/babelPreview";
import PreviewErrorBoundary from "./PreviewErrorBoundary";

interface BuildPreviewModalProps {
  title: string;
  code: string;
  releaseNote: string;
  onClose: () => void;
}

export default function BuildPreviewModal({
  title,
  code,
  releaseNote,
  onClose,
}: BuildPreviewModalProps) {
  const { component: AddonPreview, error } = useMemo(
    () => compileAddonComponent(code),
    [code],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live build preview
            </p>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="mb-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
            {error ? (
              <p className="text-sm text-red-600">
                Preview failed to compile: {error}
              </p>
            ) : AddonPreview ? (
              <PreviewErrorBoundary>
                <AddonPreview />
              </PreviewErrorBoundary>
            ) : (
              <p className="text-sm text-slate-400">No preview available.</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Release note
            </p>
            <p className="text-sm text-slate-700">{releaseNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
