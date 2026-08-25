import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { calculate } from "./client";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("calculate", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("resolves with the status and body on success", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { operation: "add", operands: ["2", "3"], result: "5" },
    });

    const exchange = await calculate("add", ["2", "3"]);

    expect(exchange.status).toBe(200);
    expect(exchange.body).toMatchObject({ result: "5" });
  });

  it("resolves with the server's error status and body, not a throw", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 422,
      data: { error: { code: "DIVISION_BY_ZERO", message: "division by zero" } },
    });

    const exchange = await calculate("divide", ["10", "0"]);

    expect(exchange.status).toBe(422);
    expect(exchange.body).toMatchObject({
      error: { code: "DIVISION_BY_ZERO", message: "division by zero" },
    });
  });

  it("resolves with a NETWORK_ERROR body when the request itself fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Network Error"));
    mockedAxios.isCancel.mockReturnValue(false);

    const exchange = await calculate("add", ["1", "2"]);

    expect(exchange.status).toBe(0);
    expect(exchange.body).toMatchObject({ error: { code: "NETWORK_ERROR" } });
  });

  it("sends the operation and operands as the request body", async () => {
    mockedAxios.post.mockResolvedValue({ status: 200, data: { result: "100" } });

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
