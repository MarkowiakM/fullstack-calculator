interface HeaderProps {
  apiStatus: "ok" | "error" | null;
}

export function Header({ apiStatus }: HeaderProps) {
  const badgeText =
    apiStatus === "error" ? "API returned an error" : apiStatus === "ok" ? "API connected" : "Ready";
  const dotClass =
    apiStatus === "error" ? "bg-calc-error-strong" : apiStatus === "ok" ? "bg-calc-eq" : "bg-calc-text-dim";

  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-5">
      <div className="flex items-center gap-3">
        <img src="/sezzle_icon.svg" alt="" className="h-[30px] w-[30px]" />
        <span className="bg-calc-num/18 h-5 w-px" />
        <span className="font-poppins text-[18px] font-semibold tracking-[-0.01em] text-calc-text">
          Calculator Service
        </span>
      </div>
      <div className="font-dm-mono border-calc-num/14 bg-calc-num/4 flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs text-[#c6b8de]">
        <span className={`h-[7px] w-[7px] rounded-full ${dotClass}`} />
        {badgeText}
      </div>
    </header>
  );
}
