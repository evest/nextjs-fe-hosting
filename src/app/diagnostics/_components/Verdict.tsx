import type { Verdict as VerdictType } from "../_lib/shared";

const STYLES: Record<VerdictType, string> = {
  pass: "bg-green-100 text-green-900 border-green-300",
  warn: "bg-yellow-100 text-yellow-900 border-yellow-300",
  fail: "bg-red-100 text-red-900 border-red-300",
  manual: "bg-blue-100 text-blue-900 border-blue-300",
  unknown: "bg-gray-100 text-gray-700 border-gray-300",
};

const LABELS: Record<VerdictType, string> = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
  manual: "MANUAL CHECK",
  unknown: "UNKNOWN",
};

export function Verdict({ value, note }: { value: VerdictType; note?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-1 text-xs font-mono border rounded ${STYLES[value]}`}>
      <span className="font-bold">{LABELS[value]}</span>
      {note && <span className="font-normal">{note}</span>}
    </span>
  );
}
