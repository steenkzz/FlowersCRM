"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/format";
import { PIPELINE_STAGES } from "@/lib/types";
import type {
  CacheEntry,
  DraftEmail,
  MeetingPrepResult,
  StageId,
} from "@/lib/types";
import type { ValueBreakdownItem } from "@/lib/pipeline";

export interface PipelineCardData {
  id: string;
  accountName: string;
  tier: string;
  value: number;
  breakdown: ValueBreakdownItem[];
  stage: StageId;
  reachout: CacheEntry<DraftEmail> | undefined;
  prep: CacheEntry<MeetingPrepResult> | undefined;
}

interface PipelineCardProps {
  card: PipelineCardData;
  onAdvance: (accountId: string) => void;
  onSetStage: (accountId: string, stage: StageId) => void;
}

const DROPDOWN_OPTIONS: { id: StageId; label: string }[] = [
  ...PIPELINE_STAGES.map((s) => ({ id: s.id, label: s.label })),
  { id: "lost", label: "Closed Lost" },
];

function Skeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2.5 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default function PipelineCard({
  card,
  onAdvance,
  onSetStage,
}: PipelineCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);

  const isLastColumnStage = card.stage === "won";
  const isLost = card.stage === "lost";

  return (
    <div className="relative flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
          {card.accountName}
        </p>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            card.tier === "Enterprise"
              ? "bg-indigo-light text-indigo"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {card.tier}
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex items-center gap-1 text-left text-base font-bold tabular-nums text-slate-900 hover:text-indigo"
        >
          {formatUSD(card.value)}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5 text-slate-300"
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
        {showBreakdown && (
          <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-card p-3 shadow-lg">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Value breakdown
            </p>
            <ul className="flex flex-col gap-1">
              {card.breakdown.map((item: ValueBreakdownItem, i: number) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 text-xs text-slate-600"
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="shrink-0 font-medium tabular-nums text-slate-900">
                    {formatUSD(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {card.stage === "reachout" && (
        <div className="rounded-md bg-slate-50 p-2">
          {card.reachout === undefined || card.reachout.status === "loading" ? (
            <Skeleton />
          ) : card.reachout.status === "error" ? (
            <p className="text-xs text-red-500">
              Reachout draft failed ({card.reachout.message}).
            </p>
          ) : (
            <button
              onClick={() => setShowDraftModal(true)}
              className="text-xs font-medium text-indigo hover:underline"
            >
              ✉ Agent drafted reachout — view
            </button>
          )}
        </div>
      )}

      {card.stage === "meeting" && (
        <div className="rounded-md bg-slate-50 p-2">
          {card.prep === undefined || card.prep.status === "loading" ? (
            <Skeleton />
          ) : card.prep.status === "error" ? (
            <p className="text-xs text-red-500">
              Meeting prep failed ({card.prep.message}).
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {card.prep.data.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-slate-600">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-indigo" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => onAdvance(card.id)}
          disabled={isLastColumnStage || isLost}
          className="w-full whitespace-nowrap rounded-md bg-indigo px-2 py-1.5 text-xs font-medium text-white hover:bg-indigo/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Advance →
        </button>
        <select
          value={card.stage}
          onChange={(e) => onSetStage(card.id, e.target.value as StageId)}
          className="w-full min-w-0 rounded-md border border-slate-200 bg-card px-1.5 py-1.5 text-xs text-slate-600"
          aria-label={`Set stage for ${card.accountName}`}
        >
          {DROPDOWN_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {showDraftModal && card.reachout?.status === "done" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setShowDraftModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Draft reachout — {card.accountName}
              </p>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-sm font-semibold text-slate-900">
              {card.reachout.data.subject}
            </p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {card.reachout.data.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
