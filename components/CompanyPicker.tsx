"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { SERIES_COLORS } from "./chart-utils";

type Hit = { ticker: string; name: string };

export function CompanyPicker({
  tickers,
  max,
  onChange,
}: {
  tickers: string[];
  max: number;
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) return setHits([]);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/tickers?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((h: Hit[]) => {
          setHits(h.filter((x) => !tickers.includes(x.ticker)));
          setActive(0);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, tickers]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const add = (t: string) => {
    if (tickers.length >= max || tickers.includes(t)) return;
    onChange([...tickers, t]);
    setQ("");
    setHits([]);
  };

  const full = tickers.length >= max;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tickers.map((t, i) => (
        <span key={t} className="chip text-fg" style={{ borderColor: `${SERIES_COLORS[i]}66` }}>
          <span className="size-2 rounded-full" style={{ background: SERIES_COLORS[i], boxShadow: `0 0 8px ${SERIES_COLORS[i]}` }} />
          <span className="font-semibold">{t}</span>
          <button aria-label={`Remove ${t}`} onClick={() => onChange(tickers.filter((x) => x !== t))} className="text-dim hover:text-fg">
            <X className="size-3.5" />
          </button>
        </span>
      ))}

      <div ref={box} className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
        <input
          className="input pl-9"
          placeholder={full ? `Plan limit: ${max} companies` : "Add company — ticker or name…"}
          disabled={full}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && hits[active]) add(hits[active].ticker);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && hits.length > 0 && (
          <ul className="glass absolute z-20 mt-2 max-h-72 w-full overflow-auto p-1.5">
            {hits.map((h, i) => (
              <li key={h.ticker}>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(h.ticker)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === active ? "bg-blue/20" : "hover:bg-white/5"}`}
                >
                  <Plus className="size-3.5 text-cyan" />
                  <span className="w-14 font-semibold">{h.ticker}</span>
                  <span className="truncate text-muted">{h.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
