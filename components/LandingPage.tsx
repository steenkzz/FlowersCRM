"use client";

import UploadZone from "@/components/UploadZone";
import FlowerIcon from "@/components/FlowerIcon";
import FlowerCluster from "@/components/FlowerCluster";
import {
  UsersIcon,
  CartIcon,
  SparkleIcon,
  FunnelIcon,
  InboxIcon,
  LibraryIcon,
} from "@/components/icons";

interface LandingPageProps {
  onFile: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

const LOOP_STEPS = [
  {
    step: "01",
    title: "Qualify",
    description:
      "An agent scores every account on six signals and auto-builds a ranked, qualified expansion list.",
  },
  {
    step: "02",
    title: "Expand",
    description:
      "AI-generated storefronts add a 1% GMV commission, plus new ERP seats as accounts scale.",
  },
  {
    step: "03",
    title: "Innovate",
    description:
      "Custom work gets productized into new SKUs, then sold across the entire base.",
  },
];

const MODULES = [
  {
    icon: UsersIcon,
    title: "Qualified Leads Module",
    description:
      "Deterministic scoring across six weighted metrics, ranked and ready for outreach.",
  },
  {
    icon: CartIcon,
    title: "E-Commerce Opportunities Module",
    description:
      "Agents scan each account's site and size the 1% commission opportunity.",
  },
  {
    icon: SparkleIcon,
    title: "Creator's Add-on",
    description:
      "Invite the accounts with the highest custom-work spend into the program.",
  },
  {
    icon: FunnelIcon,
    title: "Opportunity Funnel",
    description:
      "Deal-by-deal pipeline for both growth plays, stage by stage, at a glance.",
  },
  {
    icon: InboxIcon,
    title: "Add-on Requests",
    description:
      "Autonomous evaluation, quoting, negotiation, and build of every incoming request.",
  },
  {
    icon: LibraryIcon,
    title: "Add-on Library",
    description:
      "Every request that became a real SKU, sold across the entire install base.",
  },
];

export default function LandingPage({
  onFile,
  isLoading,
  error,
}: LandingPageProps) {
  return (
    <div className="flex flex-col">
      <section className="relative flex flex-col items-center gap-6 overflow-hidden px-6 pb-16 pt-20 text-center">
        <FlowerCluster className="h-16 w-32" />
        <div className="flex flex-col items-center gap-3">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Growing revenue from the base you already own.
          </h1>
          <p className="max-w-xl text-lg text-slate-500">
            FlowersCRM is an AI agent layer on top of your customer base — it
            turns your legacy ERP install base into compounding revenue per
            customer, one engine, three loops at a time.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-card px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
            One engine. Three compounding loops.
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LOOP_STEPS.map((loop) => (
              <div
                key={loop.step}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-canvas p-5"
              >
                <span className="text-xs font-bold tracking-wide text-indigo">
                  STEP {loop.step}
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {loop.title}
                </span>
                <p className="text-sm text-slate-500">{loop.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">
            Every expansion feeds richer data back into qualification — the
            engine compounds.
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col items-center gap-3">
            <FlowerIcon className="h-6 w-6" />
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-400">
              What&apos;s inside
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod) => (
              <div
                key={mod.title}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-card p-5 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-light text-indigo">
                  <mod.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {mod.title}
                </p>
                <p className="text-xs text-slate-500">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-card px-6 py-16">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Get started
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload your customer base export to see who&apos;s ready to
              grow.
            </p>
          </div>
          <UploadZone onFile={onFile} isLoading={isLoading} error={error} />
        </div>
      </section>
    </div>
  );
}
