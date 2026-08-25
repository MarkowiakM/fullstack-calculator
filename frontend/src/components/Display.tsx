import { displayValue, expressionLine, type State } from "@/state/reducer";

interface DisplayProps {
  state: State;
}

function resultFontSizePx(state: State): number {
  if (state.status === "error") return 20;
  const length = displayValue(state).length;
  if (length > 12) return 32;
  if (length > 8) return 42;
  return 56;
}

export function Display({ state }: DisplayProps) {
  const isError = state.status === "error";
  const value = displayValue(state);
  const expression = expressionLine(state);

  return (
    <div className="from-calc-display-start to-calc-display-end border-calc-fn/18 flex min-h-[132px] flex-col justify-end rounded-[22px] border bg-gradient-to-b p-6 pb-5">
      <div className="flex min-h-[20px] items-center justify-between gap-3">
        <div className="text-calc-text-dim font-dm-mono truncate text-sm">{expression || " "}</div>
        {isError && (
          <span className="text-calc-error border-calc-error-strong/45 bg-calc-error-strong/16 font-dm-mono shrink-0 rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap">
            {state.code}
          </span>
        )}
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`mt-2.5 text-right font-semibold break-words tabular-nums ${
          isError ? "text-calc-error" : "text-calc-text"
        }`}
        style={{ fontSize: resultFontSizePx(state), letterSpacing: "-0.03em", lineHeight: 1.12 }}
      >
        {value}
      </div>
    </div>
  );
}
