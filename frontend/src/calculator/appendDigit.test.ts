import { describe, expect, it } from "vitest";
import { appendDigit } from "./appendDigit";

describe("appendDigit", () => {
  it("replaces a leading zero with the first digit typed", () => {
    expect(appendDigit("0", "5")).toBe("5");
  });

  it("turns a leading zero into '0.' when '.' is typed first", () => {
    expect(appendDigit("0", ".")).toBe("0.");
  });

  it("appends subsequent digits normally", () => {
    expect(appendDigit("5", "3")).toBe("53");
  });

  it("ignores a second decimal point", () => {
    expect(appendDigit("1.5", ".")).toBe("1.5");
  });

  it("caps at 12 significant digits", () => {
    const twelve = "123456789012";
    expect(appendDigit(twelve, "3")).toBe(twelve);
  });

  it("counting digits ignores the decimal point itself", () => {
    const twelveDigitsWithDot = "1234.56789012";
    expect(appendDigit(twelveDigitsWithDot, "3")).toBe(twelveDigitsWithDot);
  });
});
