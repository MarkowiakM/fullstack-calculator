import axios from "axios";
import type { Operation } from "@/types";

export class CalculationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

interface CalculateResponse {
  operation: Operation;
  operands: string[];
  result: string;
}

interface ErrorBody {
  error: { code: string; message: string };
}

export async function calculate(
  operation: Operation,
  operands: string[],
  signal?: AbortSignal,
): Promise<string> {
  try {
    const { data } = await axios.post<CalculateResponse>(
      "/api/v1/calculations",
      { operation, operands },
      { signal },
    );
    return data.result;
  } catch (err) {
    if (axios.isCancel(err)) {
      throw err;
    }
    if (axios.isAxiosError(err)) {
      const body = (err.response?.data as ErrorBody | undefined)?.error;
      throw new CalculationError(
        body?.message ?? "Unable to reach the server",
        body?.code ?? "NETWORK_ERROR",
      );
    }
    throw new CalculationError("Unable to reach the server", "NETWORK_ERROR");
  }
}
