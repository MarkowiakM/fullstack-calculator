import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Display } from "./Display";
import type { State } from "@/state/reducer";

describe("Display", () => {
  it("shows the current input with an aria-live status role", () => {
    render(<Display state={{ status: "entering_first", input: "12" }} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("12");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
  });

  it("shows the pending expression while awaiting the second operand", () => {
    render(<Display state={{ status: "awaiting_second", first: "12", op: "divide" }} />);
    expect(screen.getByText("12 ÷")).toBeInTheDocument();
  });

  it("shows an error message and its code badge on error", () => {
    const state: State = { status: "error", message: "division by zero", code: "DIVISION_BY_ZERO" };
    render(<Display state={state} />);
    expect(screen.getByRole("status")).toHaveTextContent("division by zero");
    expect(screen.getByText("DIVISION_BY_ZERO")).toBeInTheDocument();
  });

  it("does not show an error badge outside of the error state", () => {
    render(<Display state={{ status: "result", value: "15" }} />);
    expect(screen.queryByText(/^[A-Z_]+$/)).not.toBeInTheDocument();
  });

  it("shrinks the font size as the value gets longer", () => {
    const { unmount } = render(<Display state={{ status: "entering_first", input: "123" }} />);
    expect(screen.getByRole("status")).toHaveStyle({ fontSize: "56px" });
    unmount();

    const second = render(<Display state={{ status: "entering_first", input: "123456789" }} />);
    expect(screen.getByRole("status")).toHaveStyle({ fontSize: "42px" });
    second.unmount();

    render(<Display state={{ status: "entering_first", input: "123456789012345" }} />);
    expect(screen.getByRole("status")).toHaveStyle({ fontSize: "32px" });
  });
});
