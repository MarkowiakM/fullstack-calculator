import axios from "axios";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Calculator } from "./Calculator";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

function press(label: string) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("Calculator", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("12 + 3 = shows 15", async () => {
    mockedAxios.post.mockResolvedValue({ status: 200, data: { result: "15" } });
    render(<Calculator />);

    press("1");
    press("2");
    press("add");
    press("3");
    press("equals");

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("15"), {
      timeout: 3000,
    });
  });

  it("10 ÷ 0 = shows a division-by-zero message", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 422,
      data: { error: { code: "DIVISION_BY_ZERO", message: "division by zero" } },
    });
    render(<Calculator />);

    press("1");
    press("0");
    press("divide");
    press("0");
    press("equals");

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("division by zero"), {
      timeout: 3000,
    });
  });

  it("5, +, backspace cancels the pending operator and returns to editing 5", async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    press("5");
    press("add");
    await user.keyboard("{Backspace}");

    expect(screen.getByRole("status")).toHaveTextContent("5");
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("5, +, = is a no-op — no request fired without a second operand", () => {
    render(<Calculator />);

    press("5");
    press("add");
    press("equals");

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("discards a stale response that resolves after a newer calculation", async () => {
    let resolveFirst: (value: { status: number; data: { result: string } }) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockedAxios.post
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({ status: 200, data: { result: "20" } });
    render(<Calculator />);

    press("5");
    press("add");
    press("3");
    press("equals");

    press("clear");
    press("1");
    press("0");
    press("multiply");
    press("2");
    press("equals");

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("20"), {
      timeout: 3000,
    });

    resolveFirst!({ status: 200, data: { result: "8" } });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByRole("status")).toHaveTextContent("20");
  });

  it("an externally triggered run (an API panel edge case) shows on the display and is reported via onExchange", async () => {
    mockedAxios.post.mockResolvedValue({
      status: 422,
      data: { error: { code: "NEGATIVE_SQRT", message: "square root of a negative number" } },
    });
    const onExchange = vi.fn();
    render(
      <Calculator
        run={{ operation: "sqrt", operands: ["-9"], nonce: 1 }}
        onExchange={onExchange}
      />,
    );

    await waitFor(
      () => expect(screen.getByRole("status")).toHaveTextContent("square root of a negative number"),
      { timeout: 3000 },
    );
    expect(onExchange).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "sqrt", operands: ["-9"], status: 422 }),
    );
  });
});
