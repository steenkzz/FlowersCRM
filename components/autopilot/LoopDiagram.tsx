import { DIAGRAM_NODES, type DiagramNodeId } from "@/lib/autopilotTypes";

interface LoopDiagramProps {
  counts: Record<DiagramNodeId, number>;
  activeNodeId: DiagramNodeId | null;
}

export default function LoopDiagram({ counts, activeNodeId }: LoopDiagramProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex min-w-max items-center gap-1.5">
        {DIAGRAM_NODES.map((node, i) => {
          const isActive = node.id === activeNodeId;
          return (
            <div key={node.id} className="flex items-center gap-1.5">
              <div
                className={`flex w-[124px] flex-col items-center gap-1 rounded-lg border px-2.5 py-2.5 text-center transition-colors ${
                  isActive
                    ? "animate-pulse-dot border-indigo bg-indigo-light"
                    : "border-slate-200 bg-white"
                }`}
              >
                <span
                  className={`text-lg font-bold tabular-nums ${isActive ? "text-indigo" : "text-slate-700"}`}
                >
                  {counts[node.id] ?? 0}
                </span>
                <span className="text-[10px] font-medium leading-tight text-slate-500">
                  {node.label}
                </span>
              </div>
              {i < DIAGRAM_NODES.length - 1 && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-4 w-4 shrink-0 text-slate-300"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
