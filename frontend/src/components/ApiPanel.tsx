import { useState } from "react";
import type { ExchangeRecord, Operation, RunRequest } from "@/types";

interface EdgeCase {
  label: string;
  operation: Operation;
  operands: string[];
  expect: string;
  ok?: boolean;
}

const EDGE_CASES: EdgeCase[] = [
  { label: "12 ÷ 0", operation: "divide", operands: ["12", "0"], expect: "DIVISION_BY_ZERO" },
  { label: "√ −9", operation: "sqrt", operands: ["-9"], expect: "NEGATIVE_SQRT" },
  {
    label: "2 ^ 5000",
    operation: "power",
    operands: ["2", "5000"],
    expect: "RESULT_OUT_OF_RANGE",
  },
  { label: "0.1 + 0.2", operation: "add", operands: ["0.1", "0.2"], expect: "200 OK", ok: true },
];

const STATUS_TEXT: Record<number, string> = {
  200: "200 OK",
  400: "400 Bad Request",
  422: "422 Unprocessable Entity",
  500: "500 Internal Server Error",
};

interface ApiPanelProps {
  exchange: ExchangeRecord | null;
  onRun: (run: RunRequest) => void;
}

export function ApiPanel({ exchange, onRun }: ApiPanelProps) {
  const [pending, setPending] = useState<string | null>(null);
  const [seenExchange, setSeenExchange] = useState(exchange);
  if (exchange !== seenExchange) {
    setSeenExchange(exchange);
    setPending(null);
  }

  const statusText = exchange ? (STATUS_TEXT[exchange.status] ?? `${exchange.status}`) : null;
  const isError = exchange ? exchange.status < 200 || exchange.status >= 300 : false;

  return (
    <div className="bg-calc-num/4 border-calc-num/10 w-full rounded-[30px] border p-[26px]">
      <div className="flex items-center justify-between">
        <span className="font-dm-mono text-calc-api-label text-xs tracking-[.14em] uppercase">
          API call
        </span>
        {exchange && <span className="font-dm-mono text-calc-eq text-xs">{exchange.ms} ms</span>}
      </div>

      <div className="font-dm-mono text-calc-fn mt-4.5 text-xs">POST /api/v1/calculations</div>
      <pre className="bg-calc-code-bg border-calc-fn/16 font-dm-mono text-calc-code-text mt-2.5 overflow-x-auto rounded-[14px] border p-4 text-[12.5px] leading-[1.7]">
        {exchange
          ? JSON.stringify({ operation: exchange.operation, operands: exchange.operands }, null, 2)
          : "// use the calculator, or pick an edge case below"}
      </pre>

      {exchange && (
        <>
          <div className="mt-5 flex items-center gap-2.5">
            <span
              className={`font-dm-mono rounded-lg px-2.5 py-1 text-xs font-medium ${
                isError ? "text-calc-error bg-calc-error-strong/15" : "text-calc-eq bg-calc-eq/15"
              }`}
            >
              {statusText}
            </span>
            <span className="font-dm-mono text-calc-text-dim text-xs">application/json</span>
          </div>
          <pre className="bg-calc-code-bg border-calc-fn/16 font-dm-mono text-calc-code-text mt-2.5 overflow-x-auto rounded-[14px] border p-4 text-[12.5px] leading-[1.7]">
            {JSON.stringify(exchange.body, null, 2)}
          </pre>
        </>
      )}

      <div className="bg-calc-num/10 my-6 h-px" />

      <div className="font-dm-mono text-calc-api-label text-xs tracking-[.14em] uppercase">
        Edge cases
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        {EDGE_CASES.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => {
              setPending(c.label);
              onRun({ operation: c.operation, operands: c.operands, nonce: Date.now() });
            }}
            disabled={pending !== null}
            className="font-dm-mono border-calc-num/12 bg-calc-num/3 text-calc-edge-text hover:border-calc-eq/55 hover:bg-calc-eq/7 flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-xs transition-[background-color,border-color] disabled:opacity-50"
          >
            <span>{pending === c.label ? `${c.label} …` : c.label}</span>
            <span className={c.ok ? "text-calc-eq" : "text-calc-error-strong"}>{c.expect}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
