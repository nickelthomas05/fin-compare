"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteSaved({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      aria-label="Delete comparison"
      className="text-dim hover:text-down"
      onClick={async () => {
        if (!confirm("Delete this saved comparison?")) return;
        await fetch(`/api/saved?id=${id}`, { method: "DELETE" });
        router.refresh();
      }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
