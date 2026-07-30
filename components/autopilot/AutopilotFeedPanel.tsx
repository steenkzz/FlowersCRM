"use client";

import { useEffect, useRef, useState } from "react";
import type { AutopilotActor, AutopilotEvent } from "@/lib/autopilotTypes";

interface AutopilotFeedPanelProps {
  events: AutopilotEvent[];
  isRunning: boolean;
}

const ACTOR_STYLES: Record<AutopilotActor, string> = {
  "Decision Agent": "bg-indigo text-white",
  "Quote Agent": "bg-sky-500 text-white",
  "Customer (simulated)": "bg-amber-500 text-white",
  "Build Agent": "bg-emerald-500 text-white",
  System: "bg-slate-400 text-white",
};

function ActorAvatar({ actor }: { actor: AutopilotActor }) {
  const initial = actor === "Customer (simulated)" ? "C" : actor[0];
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${ACTOR_STYLES[actor]}`}
    >
      {initial}
    </span>
  );
}

function FeedRow({ event }: { event: AutopilotEvent }) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = event.detail !== null;

  return (
    <li className="animate-fade-in-up flex flex-col gap-1.5">
      <button
        onClick={() => canExpand && setExpanded((v) => !v)}
        className={`flex items-start gap-2.5 text-left text-sm ${canExpand ? "cursor-pointer" : "cursor-default"}`}
      >
        <ActorAvatar actor={event.actor} />
        <span className="min-w-0 flex-1 text-slate-600">
          <span className="font-medium text-slate-900">{event.actor}</span>{" "}
          {event.summary}
          {event.accountName && (
            <span className="text-slate-400"> · {event.accountName}</span>
          )}
        </span>
        {canExpand && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>
      {expanded && event.detail && (
        <div className="ml-8 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          {event.detail.kind === "email" && (
            <>
              <p className="mb-1 font-semibold text-slate-900">
                {event.detail.subject}
              </p>
              <p className="whitespace-pre-wrap text-slate-600">
                {event.detail.body}
              </p>
            </>
          )}
          {event.detail.kind === "build" && (
            <>
              <p className="mb-1 font-semibold text-slate-900">Release note</p>
              <p className="whitespace-pre-wrap text-slate-600">
                {event.detail.releaseNote}
              </p>
            </>
          )}
        </div>
      )}
    </li>
  );
}

export default function AutopilotFeedPanel({
  events,
  isRunning,
}: AutopilotFeedPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">
          Activity feed
        </span>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-indigo">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-indigo" />
            autopilot running…
          </span>
        )}
      </div>
      <div className="max-h-[520px] overflow-y-auto px-4 py-3">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nothing yet — turn on Autopilot or process a request manually.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <FeedRow key={event.id} event={event} />
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
