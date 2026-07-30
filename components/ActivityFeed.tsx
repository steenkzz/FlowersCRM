"use client";

import { useEffect, useRef } from "react";
import type { ActivityEvent } from "@/lib/types";

interface ActivityFeedProps {
  events: ActivityEvent[];
  isRunning: boolean;
}

const KIND_STYLES: Record<ActivityEvent["kind"], string> = {
  start: "bg-indigo",
  finding: "bg-sky-500",
  done: "bg-emerald-500",
  error: "bg-red-500",
};

export default function ActivityFeed({ events, isRunning }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <span className="text-sm font-semibold text-slate-700">
          Agent activity
        </span>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-indigo">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-indigo" />
            scanning…
          </span>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto px-4 py-3">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nothing yet — activity will stream here once a scan starts.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {events.map((event) => (
              <li
                key={event.id}
                className="animate-fade-in-up flex items-start gap-2.5 text-sm"
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${KIND_STYLES[event.kind]}`}
                />
                <span className="text-slate-600">
                  <span className="font-medium text-slate-900">
                    {event.accountName}
                  </span>{" "}
                  {event.message}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
