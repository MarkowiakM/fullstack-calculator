export type Operation =
  "add" | "subtract" | "multiply" | "divide" | "power" | "percentage" | "sqrt";

export type BinaryOp = Exclude<Operation, "sqrt">;

// A completed request/response pair, for the API-call demo panel — reported
// by the calculator for every calculation, however it was triggered.
export interface ExchangeRecord {
  operation: Operation;
  operands: string[];
  status: number;
  body: unknown;
  ms: number;
}

// An operation the API panel asks the calculator to run directly (an edge
// case), so it shows up on the calculator's own display like any other
// calculation. `nonce` makes each request distinct even if the same edge
// case is triggered twice in a row.
export interface RunRequest {
  operation: Operation;
  operands: string[];
  nonce: number;
}
