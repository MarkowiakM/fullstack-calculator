import axios from "axios";
import type { Operation } from "@/types";

export class CalculationError extends Error {}

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
      const message = (err.response?.data as ErrorBody | undefined)?.error?.message;
      throw new CalculationError(message ?? "Unable to reach the server");
    }
    throw new CalculationError("Unable to reach the server");
  }
}
