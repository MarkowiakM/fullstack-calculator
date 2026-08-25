import axios from "axios";
import type { Operation } from "@/types";

export interface CalculateResponse {
  operation: Operation;
  operands: string[];
  result: string;
}

export interface ErrorBody {
  error: { code: string; message: string };
}

export interface ApiExchange {
  status: number;
  body: CalculateResponse | ErrorBody;
  ms: number;
}

// Resolves with the raw response — status and body, success or error — never
// throws except for a caller-initiated cancellation. Both the calculator
// (interpreting the result) and the API-call demo panel (displaying it
// verbatim) are built on the same real exchange.
export async function calculate(
  operation: Operation,
  operands: string[],
  signal?: AbortSignal,
): Promise<ApiExchange> {
  const start = performance.now();
  try {
    const res = await axios.post<CalculateResponse | ErrorBody>(
      "/api/v1/calculations",
      { operation, operands },
      { signal, validateStatus: () => true },
    );
    return { status: res.status, body: res.data, ms: Math.round(performance.now() - start) };
  } catch (err) {
    if (axios.isCancel(err)) {
      throw err;
    }
    return {
      status: 0,
      body: { error: { code: "NETWORK_ERROR", message: "Unable to reach the server" } },
      ms: Math.round(performance.now() - start),
    };
  }
}
