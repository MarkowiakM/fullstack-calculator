export type Operation =
  "add" | "subtract" | "multiply" | "divide" | "power" | "percentage" | "sqrt";

export type BinaryOp = Exclude<Operation, "sqrt">;
