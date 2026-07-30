"use client";

import { useEffect, useRef, useState } from "react";
import { formatUSD } from "@/lib/format";

interface RevenueCounterProps {
  value: number;
  label: string;
  sub?: string;
}

export default function RevenueCounter({ value, label, sub }: RevenueCounterProps) {
  const [displayed, setDisplayed] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const duration = 500;
    const start = performance.now();

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <div className="rounded-2xl border border-indigo/20 bg-indigo-light px-8 py-6">
      <p className="text-sm font-medium text-indigo/80">{label}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-indigo">
        {formatUSD(displayed)}
      </p>
      {sub && <p className="mt-1 text-sm text-indigo/70">{sub}</p>}
    </div>
  );
}
