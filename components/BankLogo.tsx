"use client";

import { resolveBankLogo } from "@/lib/bank-logos";
import { useState } from "react";

interface BankLogoProps {
  id?: string | null;
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_PX = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
} as const;

const SIZE_CLASS = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-14 w-14",
} as const;

export function BankLogo({
  id,
  name,
  domain,
  logoUrl,
  size = "md",
  className = "",
}: BankLogoProps) {
  const [failed, setFailed] = useState(false);
  const src =
    logoUrl ||
    resolveBankLogo({ id, name, domain }) ||
    "";

  if (!src || failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#edf3f9] text-sm font-bold text-[#0a85ea] ${SIZE_CLASS[size]} ${className}`}
        aria-hidden="true"
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  const px = SIZE_PX[size];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={px}
      height={px}
      className={`shrink-0 rounded-2xl object-contain ${SIZE_CLASS[size]} ${className}`}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}
