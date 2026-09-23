"use client";

import { cn } from "@/lib/cn";
import { useRef, type PointerEvent, type ReactNode } from "react";

interface HexLitPanelProps {
  children: ReactNode;
  className?: string;
}

export function HexLitPanel({ children, className }: HexLitPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    node.style.setProperty("--lx", `${event.clientX - rect.left}px`);
    node.style.setProperty("--ly", `${event.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} onPointerMove={onMove} className={cn("hex-lit-panel", className)}>
      {children}
    </div>
  );
}
