import { describe, expect, it } from "vitest";
import type { BinaryOp } from "@/types";
import { displayValue, expressionLine, initialState, reducer, type State } from "./reducer";

const enteringFirst = (input: string): State => ({ status: "entering_first", input });
const awaitingSecond = (first: string, op: BinaryOp): State => ({
  status: "awaiting_second",
  first,
  op,
});
const enteringSecond = (first: string, op: BinaryOp, input: string): State => ({
  status: "entering_second",
  first,
  op,
  input,
});

describe("reducer — entering_first", () => {
  it("DIGIT appends", () => {
    expect(reducer(enteringFirst("1"), { type: "DIGIT", value: "2" })).toEqual(enteringFirst("12"));
  });

  it("OPERATOR moves to awaiting_second", () => {
    expect(reducer(enteringFirst("12"), { type: "OPERATOR", op: "add" })).toEqual(
      awaitingSecond("12", "add"),
    );
  });

  it("UNARY moves to computing with the current input as the sole operand", () => {
    expect(reducer(enteringFirst("9"), { type: "UNARY", op: "sqrt", requestId: 1 })).toEqual({
      status: "computing",
      requestId: 1,
      operation: "sqrt",
      operands: ["9"],
      preview: "9",
    });
  });

  it("EQUALS is a no-op (nothing to compute yet)", () => {
    const s = enteringFirst("12");
    expect(reducer(s, { type: "EQUALS", requestId: 1 })).toBe(s);
  });

  it("BACKSPACE drops the last char, empties to '0'", () => {
    expect(reducer(enteringFirst("12"), { type: "BACKSPACE" })).toEqual(enteringFirst("1"));
    expect(reducer(enteringFirst("1"), { type: "BACKSPACE" })).toEqual(enteringFirst("0"));
  });
});

describe("reducer — awaiting_second", () => {
  it("DIGIT starts the second operand, moving to entering_second", () => {
    expect(reducer(awaitingSecond("12", "add"), { type: "DIGIT", value: "3" })).toEqual(
      enteringSecond("12", "add", "3"),
    );
  });

  it("OPERATOR replaces the pending operator", () => {
    expect(reducer(awaitingSecond("12", "add"), { type: "OPERATOR", op: "multiply" })).toEqual(
      awaitingSecond("12", "multiply"),
    );
  });

  it("UNARY is a no-op", () => {
    const s = awaitingSecond("12", "add");
    expect(reducer(s, { type: "UNARY", op: "sqrt", requestId: 1 })).toBe(s);
  });

  it("EQUALS is a no-op — guards against computing first OP first with no second operand", () => {
    const s = awaitingSecond("12", "add");
    expect(reducer(s, { type: "EQUALS", requestId: 1 })).toBe(s);
  });

  it("BACKSPACE cancels the pending operator, returning to editing the first operand", () => {
    expect(reducer(awaitingSecond("12", "add"), { type: "BACKSPACE" })).toEqual(
      enteringFirst("12"),
    );
  });
});

describe("reducer — entering_second", () => {
  it("DIGIT appends to the second operand", () => {
    expect(reducer(enteringSecond("12", "add", "3"), { type: "DIGIT", value: "4" })).toEqual(
      enteringSecond("12", "add", "34"),
    );
  });

  it("OPERATOR is a no-op (no chaining mid-entry)", () => {
    const s = enteringSecond("12", "add", "3");
    expect(reducer(s, { type: "OPERATOR", op: "subtract" })).toBe(s);
  });

  it("UNARY is a no-op", () => {
    const s = enteringSecond("12", "add", "3");
    expect(reducer(s, { type: "UNARY", op: "sqrt", requestId: 1 })).toBe(s);
  });

  it("EQUALS moves to computing with both operands", () => {
    expect(reducer(enteringSecond("12", "add", "3"), { type: "EQUALS", requestId: 7 })).toEqual({
      status: "computing",
      requestId: 7,
      operation: "add",
      operands: ["12", "3"],
      preview: "3",
    });
  });

  it("BACKSPACE drops the last char of the second operand", () => {
    expect(reducer(enteringSecond("12", "add", "34"), { type: "BACKSPACE" })).toEqual(
      enteringSecond("12", "add", "3"),
    );
  });

  it("BACKSPACE on the last digit of the second operand returns to awaiting_second", () => {
    expect(reducer(enteringSecond("12", "add", "3"), { type: "BACKSPACE" })).toEqual(
      awaitingSecond("12", "add"),
    );
  });
});

describe("reducer — computing", () => {
  const computing: State = {
    status: "computing",
    requestId: 1,
    operation: "add",
    operands: ["1", "2"],
    preview: "2",
  };

  it("ignores DIGIT, OPERATOR, UNARY, EQUALS, and BACKSPACE", () => {
    expect(reducer(computing, { type: "DIGIT", value: "9" })).toBe(computing);
    expect(reducer(computing, { type: "OPERATOR", op: "multiply" })).toBe(computing);
    expect(reducer(computing, { type: "UNARY", op: "sqrt", requestId: 2 })).toBe(computing);
    expect(reducer(computing, { type: "EQUALS", requestId: 2 })).toBe(computing);
    expect(reducer(computing, { type: "BACKSPACE" })).toBe(computing);
  });

  it("RESOLVED with a matching requestId moves to result", () => {
    expect(reducer(computing, { type: "RESOLVED", requestId: 1, value: "3" })).toEqual({
      status: "result",
      value: "3",
    });
  });

  it("RESOLVED with a stale requestId is discarded — the race-condition guard", () => {
    expect(reducer(computing, { type: "RESOLVED", requestId: 999, value: "wrong" })).toBe(
      computing,
    );
  });

  it("REJECTED with a matching requestId moves to error", () => {
    expect(
      reducer(computing, { type: "REJECTED", requestId: 1, message: "boom", code: "INTERNAL" }),
    ).toEqual({
      status: "error",
      message: "boom",
      code: "INTERNAL",
    });
  });

  it("REJECTED with a stale requestId is discarded", () => {
    expect(
      reducer(computing, { type: "REJECTED", requestId: 999, message: "wrong", code: "INTERNAL" }),
    ).toBe(computing);
  });

  it("RESOLVED/REJECTED arriving outside of computing is discarded", () => {
    const s = enteringFirst("5");
    expect(reducer(s, { type: "RESOLVED", requestId: 1, value: "3" })).toBe(s);
    expect(reducer(s, { type: "REJECTED", requestId: 1, message: "boom", code: "INTERNAL" })).toBe(
      s,
    );
  });
});

describe("reducer — result", () => {
  const result: State = { status: "result", value: "15" };

  it("DIGIT starts a fresh calculation", () => {
    expect(reducer(result, { type: "DIGIT", value: "7" })).toEqual(enteringFirst("7"));
  });

  it("OPERATOR continues from the result, not the out-of-scope chaining — one op per request", () => {
    expect(reducer(result, { type: "OPERATOR", op: "add" })).toEqual(awaitingSecond("15", "add"));
  });

  it("UNARY computes on the result value", () => {
    expect(reducer(result, { type: "UNARY", op: "sqrt", requestId: 3 })).toEqual({
      status: "computing",
      requestId: 3,
      operation: "sqrt",
      operands: ["15"],
      preview: "15",
    });
  });

  it("EQUALS and BACKSPACE are no-ops", () => {
    expect(reducer(result, { type: "EQUALS", requestId: 1 })).toBe(result);
    expect(reducer(result, { type: "BACKSPACE" })).toBe(result);
  });
});

describe("reducer — error", () => {
  const error: State = { status: "error", message: "division by zero", code: "DIVISION_BY_ZERO" };

  it("DIGIT starts a fresh calculation", () => {
    expect(reducer(error, { type: "DIGIT", value: "4" })).toEqual(enteringFirst("4"));
  });

  it("OPERATOR, UNARY, and EQUALS are no-ops", () => {
    expect(reducer(error, { type: "OPERATOR", op: "add" })).toBe(error);
    expect(reducer(error, { type: "UNARY", op: "sqrt", requestId: 1 })).toBe(error);
    expect(reducer(error, { type: "EQUALS", requestId: 1 })).toBe(error);
  });

  it("BACKSPACE resets", () => {
    expect(reducer(error, { type: "BACKSPACE" })).toEqual(initialState);
  });
});

describe("reducer — RUN", () => {
  it("jumps straight to computing from any state, for externally triggered calculations", () => {
    const states: State[] = [enteringFirst("123"), { status: "result", value: "3" }];
    for (const s of states) {
      expect(
        reducer(s, { type: "RUN", requestId: 5, operation: "divide", operands: ["12", "0"] }),
      ).toEqual({
        status: "computing",
        requestId: 5,
        operation: "divide",
        operands: ["12", "0"],
        preview: "0",
      });
    }
  });
});

describe("reducer — CLEAR", () => {
  it("resets from any state", () => {
    const states: State[] = [
      enteringFirst("123"),
      awaitingSecond("1", "add"),
      enteringSecond("1", "add", "2"),
      { status: "computing", requestId: 1, operation: "add", operands: ["1", "2"], preview: "2" },
      { status: "result", value: "3" },
      { status: "error", message: "boom", code: "INTERNAL" },
    ];
    for (const s of states) {
      expect(reducer(s, { type: "CLEAR" })).toEqual(initialState);
    }
  });
});

describe("displayValue", () => {
  it("reflects the input/first/preview/value/message per state", () => {
    expect(displayValue(enteringFirst("12"))).toBe("12");
    expect(displayValue(awaitingSecond("12", "add"))).toBe("12");
    expect(displayValue(enteringSecond("12", "add", "3"))).toBe("3");
    expect(
      displayValue({
        status: "computing",
        requestId: 1,
        operation: "add",
        operands: ["1", "2"],
        preview: "2",
      }),
    ).toBe("2");
    expect(displayValue({ status: "result", value: "15" })).toBe("15");
    expect(displayValue({ status: "error", message: "boom", code: "INTERNAL" })).toBe("boom");
  });
});

describe("expressionLine", () => {
  it("is blank while entering the first operand, on a result, or on an error", () => {
    expect(expressionLine(enteringFirst("12"))).toBe("");
    expect(expressionLine({ status: "result", value: "15" })).toBe("");
    expect(expressionLine({ status: "error", message: "boom", code: "INTERNAL" })).toBe("");
  });

  it("shows 'first operator' while awaiting or entering the second operand", () => {
    expect(expressionLine(awaitingSecond("12", "divide"))).toBe("12 ÷");
    expect(expressionLine(enteringSecond("12", "divide", "3"))).toBe("12 ÷");
  });

  it("shows the full expression while computing", () => {
    expect(
      expressionLine({
        status: "computing",
        requestId: 1,
        operation: "divide",
        operands: ["12", "3"],
        preview: "3",
      }),
    ).toBe("12 ÷ 3");
    expect(
      expressionLine({
        status: "computing",
        requestId: 1,
        operation: "sqrt",
        operands: ["9"],
        preview: "9",
      }),
    ).toBe("√9");
  });
});
