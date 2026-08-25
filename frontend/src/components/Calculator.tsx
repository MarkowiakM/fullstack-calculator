import { useEffect, useReducer, useRef } from "react";
import { calculate, CalculationError } from "@/api/client";
import { initialState, reducer } from "@/state/reducer";
import { Display } from "./Display";
import { Keypad, type KeyPress } from "./Keypad";

export function Calculator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const requestIdRef = useRef(0);

  function nextRequestId() {
    requestIdRef.current += 1;
    return requestIdRef.current;
  }

  useEffect(() => {
    if (state.status !== "computing") return;

    const { requestId, operation, operands } = state;
    const requestOperands = operation === "percentage" ? [operands[1], operands[0]] : operands;

    const controller = new AbortController();
    calculate(operation, requestOperands, controller.signal)
      .then((value) => dispatch({ type: "RESOLVED", requestId, value }))
      .catch((err: unknown) => {
        const message = err instanceof CalculationError ? err.message : "Calculation failed";
        const code = err instanceof CalculationError ? err.code : "INTERNAL";
        dispatch({ type: "REJECTED", requestId, message, code });
      });

    return () => controller.abort();
  }, [state]);

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
      className={`from-calc-card/8 to-calc-card/3 w-[340px] rounded-[30px] bg-gradient-to-b p-7 shadow-[0_40px_90px_-50px_rgba(139,63,232,.9)] transition-opacity ${
        state.status === "computing" ? "opacity-60" : ""
      }`}
    >
      <Display state={state} />
      <Keypad onPress={handleKeyPress} />
    </div>
  );
}
