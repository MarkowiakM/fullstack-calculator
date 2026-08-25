import { useEffect, useReducer, useRef } from "react";
import { calculate, type CalculateResponse, type ErrorBody } from "@/api/client";
import { initialState, reducer } from "@/state/reducer";
import type { ExchangeRecord, RunRequest } from "@/types";
import { Display } from "./Display";
import { Keypad, type KeyPress } from "./Keypad";

interface CalculatorProps {
  run?: RunRequest | null;
  onRunConsumed?: () => void;
  onExchange?: (exchange: ExchangeRecord) => void;
}

export function Calculator({ run, onRunConsumed, onExchange }: CalculatorProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestIdRef = useRef(0);

  function nextRequestId() {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }

  useEffect(() => {
    if (!run) return;
    dispatch({ type: "RUN", requestId: nextRequestId(), operation: run.operation, operands: run.operands });
    onRunConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  useEffect(() => {
    if (state.status !== "computing") return;

    const { requestId, operation, operands } = state;
    const requestOperands = operation === "percentage" ? [operands[1], operands[0]] : operands;

    const controller = new AbortController();
    calculate(operation, requestOperands, controller.signal)
      .then((exchange) => {
        onExchange?.({ operation, operands: requestOperands, ...exchange });
        if (exchange.status >= 200 && exchange.status < 300) {
          const body = exchange.body as CalculateResponse;
          dispatch({ type: "RESOLVED", requestId, value: body.result });
        } else {
          const body = exchange.body as ErrorBody;
          dispatch({
            type: "REJECTED",
            requestId,
            message: body.error?.message ?? "Calculation failed",
            code: body.error?.code ?? "INTERNAL",
          });
        }
      })
      .catch(() => {
        // cancelled: a newer calculation superseded this one
      });

    return () => controller.abort();
  }, [state, onExchange]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) {
        dispatch({ type: "DIGIT", value: e.key });
      } else if (e.key === "." || e.key === ",") {
        dispatch({ type: "DIGIT", value: "." });
      } else if (e.key === "+") {
        dispatch({ type: "OPERATOR", op: "add" });
      } else if (e.key === "-") {
        dispatch({ type: "OPERATOR", op: "subtract" });
      } else if (e.key === "*") {
        dispatch({ type: "OPERATOR", op: "multiply" });
      } else if (e.key === "/") {
        e.preventDefault();
        dispatch({ type: "OPERATOR", op: "divide" });
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        dispatch({ type: "EQUALS", requestId: nextRequestId() });
      } else if (e.key === "Escape") {
        dispatch({ type: "CLEAR" });
      } else if (e.key === "Backspace") {
        dispatch({ type: "BACKSPACE" });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleKeyPress(key: KeyPress) {
    switch (key.type) {
      case "digit":
        dispatch({ type: "DIGIT", value: key.value });
        return;
      case "operator":
        dispatch({ type: "OPERATOR", op: key.op });
        return;
      case "sqrt":
        dispatch({ type: "UNARY", op: "sqrt", requestId: nextRequestId() });
        return;
      case "equals":
        dispatch({ type: "EQUALS", requestId: nextRequestId() });
        return;
      case "clear":
        dispatch({ type: "CLEAR" });
        return;
    }
  }

  return (
    <div
      className={`border-calc-num/10 w-full rounded-[30px] border bg-[linear-gradient(170deg,rgba(243,237,255,.08),rgba(243,237,255,.03))] p-7 shadow-[0_40px_90px_-50px_rgba(139,63,232,.9)] transition-opacity ${
        state.status === "computing" ? "opacity-60" : ""
      }`}
    >
      <Display state={state} />
      <Keypad onPress={handleKeyPress} />
      <div className="font-dm-mono text-calc-text-muted mt-4.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[11px]">
        <span>keys · operators · Enter · Esc</span>
        <span>decimal · 10 decimals</span>
      </div>
    </div>
  );
}
