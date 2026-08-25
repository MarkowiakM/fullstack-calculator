import type { BinaryOp, Operation } from "@/types";
import { appendDigit } from "@/utils/appendDigit";

export type State =
  | { status: "entering_first"; input: string }
  | { status: "awaiting_second"; first: string; op: BinaryOp }
  | { status: "entering_second"; first: string; op: BinaryOp; input: string }
  | {
      status: "computing";
      requestId: number;
      operation: Operation;
      operands: string[];
      preview: string;
    }
  | { status: "result"; value: string }
  | { status: "error"; message: string; code: string };

type LiveAction =
  | { type: "DIGIT"; value: string }
  | { type: "OPERATOR"; op: BinaryOp }
  | { type: "UNARY"; op: "sqrt"; requestId: number }
  | { type: "EQUALS"; requestId: number }
  | { type: "BACKSPACE" };

export type Action =
  | LiveAction
  | { type: "CLEAR" }
  | { type: "RUN"; requestId: number; operation: Operation; operands: string[] }
  | { type: "RESOLVED"; requestId: number; value: string }
  | { type: "REJECTED"; requestId: number; message: string; code: string };

export const initialState: State = { status: "entering_first", input: "0" };

const OPERATOR_SYMBOLS: Record<BinaryOp, string> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
  power: "^",
  percentage: "%",
};

function formatExpression(operation: Operation, operands: string[]): string {
  if (operation === "sqrt") return `√${operands[0]}`;
  const symbol = OPERATOR_SYMBOLS[operation];
  return operands.length > 1
    ? `${operands[0]} ${symbol} ${operands[1]}`
    : `${operands[0]} ${symbol}`;
}

export function displayValue(state: State): string {
  switch (state.status) {
    case "entering_first":
    case "entering_second":
      return state.input;
    case "awaiting_second":
      return state.first;
    case "computing":
      return state.preview;
    case "result":
      return state.value;
    case "error":
      return state.message;
  }
}

export function expressionLine(state: State): string {
  switch (state.status) {
    case "entering_first":
    case "result":
    case "error":
      return "";
    case "awaiting_second":
    case "entering_second":
      return `${state.first} ${OPERATOR_SYMBOLS[state.op]}`;
    case "computing":
      return formatExpression(state.operation, state.operands);
  }
}

function enteringFirst(
  state: Extract<State, { status: "entering_first" }>,
  action: LiveAction,
): State {
  switch (action.type) {
    case "DIGIT":
      return { status: "entering_first", input: appendDigit(state.input, action.value) };
    case "OPERATOR":
      return { status: "awaiting_second", first: state.input, op: action.op };
    case "UNARY":
      return {
        status: "computing",
        requestId: action.requestId,
        operation: action.op,
        operands: [state.input],
        preview: state.input,
      };
    case "EQUALS":
      return state;
    case "BACKSPACE": {
      const next = state.input.slice(0, -1);
      return { status: "entering_first", input: next.length > 0 ? next : "0" };
    }
  }
}

function awaitingSecond(
  state: Extract<State, { status: "awaiting_second" }>,
  action: LiveAction,
): State {
  switch (action.type) {
    case "DIGIT":
      return {
        status: "entering_second",
        first: state.first,
        op: state.op,
        input: appendDigit("0", action.value),
      };
    case "OPERATOR":
      return { status: "awaiting_second", first: state.first, op: action.op };
    case "UNARY":
      return state;
    case "EQUALS":
      return state;
    case "BACKSPACE":
      return { status: "entering_first", input: state.first };
  }
}

function enteringSecond(
  state: Extract<State, { status: "entering_second" }>,
  action: LiveAction,
): State {
  switch (action.type) {
    case "DIGIT":
      return { ...state, input: appendDigit(state.input, action.value) };
    case "OPERATOR":
      return state;
    case "UNARY":
      return state;
    case "EQUALS":
      return {
        status: "computing",
        requestId: action.requestId,
        operation: state.op,
        operands: [state.first, state.input],
        preview: state.input,
      };
    case "BACKSPACE": {
      const next = state.input.slice(0, -1);
      return next.length > 0
        ? { ...state, input: next }
        : { status: "awaiting_second", first: state.first, op: state.op };
    }
  }
}

function resultState(state: Extract<State, { status: "result" }>, action: LiveAction): State {
  switch (action.type) {
    case "DIGIT":
      return { status: "entering_first", input: appendDigit("0", action.value) };
    case "OPERATOR":
      return { status: "awaiting_second", first: state.value, op: action.op };
    case "UNARY":
      return {
        status: "computing",
        requestId: action.requestId,
        operation: action.op,
        operands: [state.value],
        preview: state.value,
      };
    case "EQUALS":
      return state;
    case "BACKSPACE":
      return state;
  }
}

function errorState(state: Extract<State, { status: "error" }>, action: LiveAction): State {
  switch (action.type) {
    case "DIGIT":
      return { status: "entering_first", input: appendDigit("0", action.value) };
    case "OPERATOR":
      return state;
    case "UNARY":
      return state;
    case "EQUALS":
      return state;
    case "BACKSPACE":
      return initialState;
  }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "CLEAR":
      return initialState;
    case "RUN":
      return {
        status: "computing",
        requestId: action.requestId,
        operation: action.operation,
        operands: action.operands,
        preview: action.operands[action.operands.length - 1],
      };
    case "RESOLVED":
    case "REJECTED":
      if (state.status !== "computing" || action.requestId !== state.requestId) return state;
      return action.type === "RESOLVED"
        ? { status: "result", value: action.value }
        : { status: "error", message: action.message, code: action.code };
    default:
      switch (state.status) {
        case "entering_first":
          return enteringFirst(state, action);
        case "awaiting_second":
          return awaitingSecond(state, action);
        case "entering_second":
          return enteringSecond(state, action);
        case "computing":
          return state;
        case "result":
          return resultState(state, action);
        case "error":
          return errorState(state, action);
      }
  }
}
