import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculate, CalculationError } from "./client";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("calculate", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns the result string on success", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { operation: "add", operands: ["2", "3"], result: "5" },
    });

    await expect(calculate("add", ["2", "3"])).resolves.toBe("5");
  });

  it("throws CalculationError with the server's message on an error response", async () => {
    const axiosError = Object.assign(new Error("Request failed with status code 422"), {
      isAxiosError: true,
      response: { data: { error: { code: "DIVISION_BY_ZERO", message: "division by zero" } } },
    });
    mockedAxios.post.mockRejectedValue(axiosError);
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.isCancel.mockReturnValue(false);

    await expect(calculate("divide", ["10", "0"])).rejects.toThrow(CalculationError);
    await expect(calculate("divide", ["10", "0"])).rejects.toThrow("division by zero");
  });

  it("throws a friendly CalculationError when the network request itself fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Network Error"));
    mockedAxios.isAxiosError.mockReturnValue(false);
    mockedAxios.isCancel.mockReturnValue(false);

    await expect(calculate("add", ["1", "2"])).rejects.toThrow(CalculationError);
    await expect(calculate("add", ["1", "2"])).rejects.toThrow(/unable to reach/i);
  });

  it("sends the operation and operands as the request body", async () => {
    mockedAxios.post.mockResolvedValue({ data: { result: "100" } });

    await calculate("percentage", ["50", "200"]);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "/api/v1/calculations",
      { operation: "percentage", operands: ["50", "200"] },
      expect.objectContaining({}),
    );
  });

  it("re-throws a cancellation without wrapping it", async () => {
    const cancelError = new Error("canceled");
    mockedAxios.post.mockRejectedValue(cancelError);
    mockedAxios.isCancel.mockReturnValue(true);

    await expect(calculate("add", ["1", "2"])).rejects.toBe(cancelError);
  });
});
