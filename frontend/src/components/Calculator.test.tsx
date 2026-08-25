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
    mockedAxios.post.mockResolvedValue({ data: { result: "15" } });
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
    mockedAxios.post.mockRejectedValue(
      Object.assign(new Error("422"), {
        isAxiosError: true,
        response: { data: { error: { code: "DIVISION_BY_ZERO", message: "division by zero" } } },
      }),
    );
    mockedAxios.isAxiosError.mockReturnValue(true);
    mockedAxios.isCancel.mockReturnValue(false);
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
    let resolveFirst: (value: { data: { result: string } }) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockedAxios.post.mockReturnValueOnce(first).mockResolvedValueOnce({ data: { result: "20" } });
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

    resolveFirst!({ data: { result: "8" } });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.getByRole("status")).toHaveTextContent("20");
  });
});
