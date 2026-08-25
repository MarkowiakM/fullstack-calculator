const MAX_DIGITS = 12;

export function appendDigit(input: string, ch: string): string {
  if (ch === "." && input.includes(".")) return input;
  if (input === "0" && ch !== ".") return ch;
  if (input.replace(/[^0-9]/g, "").length >= MAX_DIGITS) return input;
  return input + ch;
}
