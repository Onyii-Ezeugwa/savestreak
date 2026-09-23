"use client";

import { cn } from "@/lib/cn";
import {
  addCalendarDays,
  addCalendarMonths,
  addCalendarYears,
  formatDateInputValue,
  formatDisplayDate,
  isSameDay,
  parseDateOnly,
  startOfToday,
} from "@/lib/dates";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type PresetId =
  | "1-week"
  | "2-weeks"
  | "1-month"
  | "3-months"
  | "6-months"
  | "1-year"
  | "custom";

interface PresetOption {
  id: Exclude<PresetId, "custom">;
  label: string;
  getDate: () => Date;
}

const PRESETS: PresetOption[] = [
  {
    id: "1-week",
    label: "1 week away",
    getDate: () => addCalendarDays(startOfToday(), 7),
  },
  {
    id: "2-weeks",
    label: "2 weeks away",
    getDate: () => addCalendarDays(startOfToday(), 14),
  },
  {
    id: "1-month",
    label: "1 month away",
    getDate: () => addCalendarMonths(startOfToday(), 1),
  },
  {
    id: "3-months",
    label: "3 months away",
    getDate: () => addCalendarMonths(startOfToday(), 3),
  },
  {
    id: "6-months",
    label: "6 months away",
    getDate: () => addCalendarMonths(startOfToday(), 6),
  },
  {
    id: "1-year",
    label: "1 year away",
    getDate: () => addCalendarYears(startOfToday(), 1),
  },
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface GoalDatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  describedBy?: string;
}

function matchPreset(value: string): PresetId {
  const selected = parseDateOnly(value);
  if (!selected) {
    return "custom";
  }

  const match = PRESETS.find((preset) => isSameDay(preset.getDate(), selected));
  return match?.id ?? "custom";
}

function monthLabel(month: Date): string {
  return month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function GoalDatePicker({
  id,
  value,
  onChange,
  error,
  describedBy,
}: GoalDatePickerProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    return parseDateOnly(value) ?? addCalendarDays(startOfToday(), 7);
  });

  const selectedDate = parseDateOnly(value);
  const presetId = matchPreset(value);
  const today = startOfToday();

  const triggerLabel = useMemo(() => {
    if (!value) {
      return "Choose a timeline";
    }
    if (presetId !== "custom") {
      const preset = PRESETS.find((item) => item.id === presetId);
      return preset?.label ?? "Choose a timeline";
    }
    return formatDisplayDate(value);
  }, [presetId, value]);

  useEffect(() => {
    const selected = parseDateOnly(value);
    if (!selected) {
      return;
    }
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [value]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectDate(date: Date) {
    if (date <= today) {
      return;
    }
    onChange(formatDateInputValue(date));
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setOpen(false);
  }

  const firstOfMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <div className="space-y-3">
      <div ref={wrapperRef} className="relative">
        <button
          id={id}
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border bg-cream px-4 py-3 text-left text-sm transition-colors",
            error ? "border-orange/50" : "border-line hover:border-teal/40",
            open && "border-teal",
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={value ? "text-ink" : "text-muted"}>
            {triggerLabel}
            {value && presetId !== "custom" ? (
              <span className="text-muted"> ({formatDisplayDate(value)})</span>
            ) : null}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-muted transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        {open ? (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={id}
            className="absolute z-20 mt-2 w-full rounded-2xl border border-line bg-card p-2 shadow-[0_12px_32px_rgba(35,31,27,0.1)]"
          >
            {PRESETS.map((preset) => {
              const selected = presetId === preset.id;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                      selected
                        ? "bg-teal text-white"
                        : "text-ink hover:bg-cream",
                    )}
                    onClick={() => selectDate(preset.getDate())}
                  >
                    {preset.label}
                    {selected ? <Check size={15} aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="rounded-2xl border border-line bg-cream p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-card"
            aria-label="Previous month"
            onClick={() => setVisibleMonth(addCalendarMonths(firstOfMonth, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <p className="font-medium text-ink" aria-live="polite">
            {monthLabel(firstOfMonth)}
          </p>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-card"
            aria-label="Next month"
            onClick={() => setVisibleMonth(addCalendarMonths(firstOfMonth, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          role="grid"
          aria-label="Choose a target date"
          className="grid grid-cols-7 gap-1"
        >
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
            >
              {day}
            </div>
          ))}
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} />;
            }

            const date = new Date(
              visibleMonth.getFullYear(),
              visibleMonth.getMonth(),
              day,
            );
            const disabled = date <= today;
            const selected = Boolean(selectedDate && isSameDay(date, selectedDate));
            const isToday = isSameDay(date, today);

            return (
              <button
                key={`${date.getFullYear()}-${date.getMonth()}-${day}`}
                type="button"
                role="gridcell"
                disabled={disabled}
                aria-selected={selected}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "grid h-9 place-items-center rounded-full text-sm transition-colors",
                  disabled && "cursor-not-allowed text-muted/40",
                  !disabled && !selected && "text-ink hover:bg-card",
                  selected && "bg-teal font-semibold text-white",
                  isToday && !selected && "ring-1 ring-gold/80",
                )}
                onClick={() => selectDate(date)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
