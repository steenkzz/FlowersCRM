"use client";

import { useState } from "react";
import { formatUSD } from "@/lib/format";
import type { AddonRequest } from "@/lib/autopilotTypes";

interface RequestCardProps {
  request: AddonRequest;
  autopilotOn: boolean;
  onManualAdvance: (id: string) => void;
  onApproveDeploy: (id: string) => void;
  onViewBuild: (id: string) => void;
}

const STATE_LABELS: Record<AddonRequest["state"], string> = {
  RECEIVED: "Received",
  EVALUATED: "Evaluated",
  REJECTED_REPLIED: "Declined",
  QUOTED: "Quoted",
  FREE_OFFERED: "Offered free",
  CUSTOMER_AGREED: "Customer agreed",
  CUSTOMER_DECLINED: "Customer declined",
  BUILDING: "Building",
  BUILT: "Built",
  IN_LIBRARY: "In library",
  SHARED_WITH_SPONSOR: "Shared with sponsor",
};

const STATE_STYLES: Record<AddonRequest["state"], string> = {
  RECEIVED: "bg-slate-100 text-slate-600",
  EVALUATED: "bg-sky-50 text-sky-700",
  REJECTED_REPLIED: "bg-red-50 text-red-600",
  QUOTED: "bg-amber-50 text-amber-700",
  FREE_OFFERED: "bg-amber-50 text-amber-700",
  CUSTOMER_AGREED: "bg-emerald-50 text-emerald-700",
  CUSTOMER_DECLINED: "bg-red-50 text-red-600",
  BUILDING: "bg-indigo-light text-indigo",
  BUILT: "bg-indigo-light text-indigo",
  IN_LIBRARY: "bg-emerald-50 text-emerald-700",
  SHARED_WITH_SPONSOR: "bg-emerald-50 text-emerald-700",
};

function manualLabel(state: AddonRequest["state"]): string | null {
  switch (state) {
    case "RECEIVED":
      return "Evaluate";
    case "EVALUATED":
      return "Send offer";
    case "QUOTED":
    case "FREE_OFFERED":
      return "Simulate customer response";
    case "CUSTOMER_AGREED":
      return "Start build";
    default:
      return null;
  }
}

export default function RequestCard({
  request,
  autopilotOn,
  onManualAdvance,
  onApproveDeploy,
  onViewBuild,
}: RequestCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const label = manualLabel(request.state);
  const isTerminal =
    request.state === "REJECTED_REPLIED" ||
    request.state === "CUSTOMER_DECLINED" ||
    request.state === "SHARED_WITH_SPONSOR";

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {request.title}
          </p>
          <p className="truncate text-xs text-slate-500">
            {request.accountName}
            {request.fromFlywheel && (
              <span className="ml-1.5 rounded-full bg-indigo-light px-1.5 py-0.5 text-[10px] font-medium text-indigo">
                flywheel
              </span>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_STYLES[request.state]}`}
        >
          {STATE_LABELS[request.state]}
        </span>
      </div>

      <button
        onClick={() => setShowDetail((v) => !v)}
        className="text-left text-xs text-slate-500 hover:text-slate-700"
      >
        {showDetail ? request.description : `${request.description.slice(0, 70)}${request.description.length > 70 ? "…" : ""}`}
      </button>

      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span>{request.estBuildHours}h build</span>
        {request.evaluation && (
          <span>score {request.evaluation.score}/100</span>
        )}
        {request.offerAmount > 0 && (
          <span className="font-medium text-slate-600">
            {formatUSD(request.offerAmount)}
          </span>
        )}
      </div>

      {request.error && (
        <p className="text-xs text-red-500">Last error: {request.error}</p>
      )}

      {request.processing && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-indigo" />
          working…
        </div>
      )}

      {request.state === "BUILT" && !request.processing && (
        <div className="flex gap-1.5">
          <button
            onClick={() => onViewBuild(request.id)}
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View live build
          </button>
          <button
            onClick={() => onApproveDeploy(request.id)}
            className="flex-1 rounded-md bg-indigo px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo/90"
          >
            Approve deploy
          </button>
        </div>
      )}

      {!autopilotOn && label && !request.processing && (
        <button
          onClick={() => onManualAdvance(request.id)}
          className="rounded-md bg-indigo px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo/90"
        >
          {label}
        </button>
      )}

      {isTerminal && (
        <p className="text-[11px] text-slate-400">
          {request.state === "REJECTED_REPLIED" && "Declined — no further action."}
          {request.state === "CUSTOMER_DECLINED" && "Customer declined the offer."}
          {request.state === "SHARED_WITH_SPONSOR" && "Live in the Add-On Library."}
        </p>
      )}
    </div>
  );
}
