import type { BinaryOp } from "@/types";

export type KeyPress =
  | { type: "digit"; value: string }
  | { type: "operator"; op: BinaryOp }
  | { type: "sqrt" }
  | { type: "equals" }
  | { type: "clear" };

interface KeypadProps {
  onPress: (key: KeyPress) => void;
}

type Kind = "num" | "fn" | "op" | "eq";

const KIND_CLASSES: Record<Kind, string> = {
  num: "bg-calc-num/7 text-calc-text hover:bg-calc-num/13",
  fn: "bg-calc-fn/14 text-calc-fn-text border-calc-fn-border/26 hover:bg-calc-fn/24",
  op: "bg-calc-op/30 text-calc-text border-calc-op-border/34 font-semibold hover:bg-calc-op/48",
  eq: "bg-calc-eq text-calc-eq-text font-bold text-2xl hover:bg-calc-eq-hover",
};

interface KeyDef {
  label: string;
  ariaLabel: string;
  kind: Kind;
  press: KeyPress;
  span?: 2;
}

const FUNC_ROW: KeyDef[] = [
  { label: "√", ariaLabel: "square root", kind: "fn", press: { type: "sqrt" } },
  { label: "xʸ", ariaLabel: "power", kind: "fn", press: { type: "operator", op: "power" } },
];

const MAIN_GRID: KeyDef[] = [
  { label: "AC", ariaLabel: "clear", kind: "fn", press: { type: "clear" }, span: 2 },
  { label: "%", ariaLabel: "percent", kind: "fn", press: { type: "operator", op: "percentage" } },
  { label: "÷", ariaLabel: "divide", kind: "op", press: { type: "operator", op: "divide" } },
  { label: "7", ariaLabel: "7", kind: "num", press: { type: "digit", value: "7" } },
  { label: "8", ariaLabel: "8", kind: "num", press: { type: "digit", value: "8" } },
  { label: "9", ariaLabel: "9", kind: "num", press: { type: "digit", value: "9" } },
  { label: "×", ariaLabel: "multiply", kind: "op", press: { type: "operator", op: "multiply" } },
  { label: "4", ariaLabel: "4", kind: "num", press: { type: "digit", value: "4" } },
  { label: "5", ariaLabel: "5", kind: "num", press: { type: "digit", value: "5" } },
  { label: "6", ariaLabel: "6", kind: "num", press: { type: "digit", value: "6" } },
  { label: "−", ariaLabel: "subtract", kind: "op", press: { type: "operator", op: "subtract" } },
  { label: "1", ariaLabel: "1", kind: "num", press: { type: "digit", value: "1" } },
  { label: "2", ariaLabel: "2", kind: "num", press: { type: "digit", value: "2" } },
  { label: "3", ariaLabel: "3", kind: "num", press: { type: "digit", value: "3" } },
  { label: "+", ariaLabel: "add", kind: "op", press: { type: "operator", op: "add" } },
  { label: "0", ariaLabel: "0", kind: "num", press: { type: "digit", value: "0" }, span: 2 },
  { label: ".", ariaLabel: "decimal point", kind: "num", press: { type: "digit", value: "." } },
  { label: "=", ariaLabel: "equals", kind: "eq", press: { type: "equals" } },
];

function Key({ def, onPress }: { def: KeyDef; onPress: (key: KeyPress) => void }) {
  return (
    <button
      type="button"
      aria-label={def.ariaLabel}
      onClick={() => onPress(def.press)}
      className={`font-poppins h-[62px] rounded-2xl border border-transparent text-xl transition-[background-color] duration-150 active:translate-y-px active:scale-[.985] ${
        def.span === 2 ? "col-span-2" : ""
      } ${KIND_CLASSES[def.kind]}`}
    >
      {def.label}
    </button>
  );
}

export function Keypad({ onPress }: KeypadProps) {
  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {FUNC_ROW.map((def) => (
          <Key key={def.label} def={def} onPress={onPress} />
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-2.5">
        {MAIN_GRID.map((def) => (
          <Key key={def.label} def={def} onPress={onPress} />
        ))}
      </div>
    </div>
  );
}
