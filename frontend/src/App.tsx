import { useState } from "react";
import { ApiPanel } from "@/components/ApiPanel";
import { Calculator } from "@/components/Calculator";
import { Header } from "@/components/Header";
import type { ExchangeRecord, RunRequest } from "@/types";

function App() {
  const [run, setRun] = useState<RunRequest | null>(null);
  const [exchange, setExchange] = useState<ExchangeRecord | null>(null);

  const apiStatus: "ok" | "error" | null = !exchange
    ? null
    : exchange.status >= 200 && exchange.status < 300
      ? "ok"
      : "error";

  return (
    <main className="min-h-screen px-7 pt-12 pb-16">
      <div className="mx-auto max-w-[1080px]">
        <Header apiStatus={apiStatus} />
        <div className="mt-10 grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
          <Calculator run={run} onRunConsumed={() => setRun(null)} onExchange={setExchange} />
          <ApiPanel exchange={exchange} onRun={setRun} />
        </div>
      </div>
    </main>
  );
}

export default App;
