"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("rulewallet_ui_error", {
      name: error.name,
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-5 py-16 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-red-400/20 bg-red-50 text-red-700">
          <AlertTriangle />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">The control surface stopped safely.</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          No transaction was signed. Retry the interface, then verify the wallet prompt and explorer
          before continuing.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCcw /> Retry
        </Button>
      </div>
    </main>
  );
}
