"use client";

import { cn } from "@/lib/cn";
import {
  addCalendarMonths,
  addCalendarYears,
  formatDateInputValue,
  formatDisplayDate,
  isSameDay,
  parseDateOnly,
  startOfToday,
} from "@/lib/dates";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MIN_AGE = 13;
const DEFAULT_AGE = 18;
const MAX_AGE = 100;

interface BirthDatePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function clampMonth(date: Date, minDate: Date, maxDate: Date) {
  const month = startOfMonth(date);
  const minMonth = startOfMonth(minDate);
  const maxMonth = startOfMonth(maxDate);
  if (month < minMonth) {
    return minMonth;
  }
  if (month > maxMonth) {
    return maxMonth;
  }
  return month;
}

export function BirthDatePicker({
  id,
  value,
  onChange,
  error,
}: BirthDatePickerProps) {
  const today = startOfToday();
  const maxDate = addCalendarYears(today, -MIN_AGE);
  const minDate = addCalendarYears(today, -MAX_AGE);
  const defaultView = addCalendarYears(today, -DEFAULT_AGE);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = parseDateOnly(value);
    return clampMonth(selected ?? defaultView, minDate, maxDate);
  });

  const selectedDate = parseDateOnly(value);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = maxDate.getFullYear(); year >= minDate.getFullYear(); year -= 1) {
      list.push(year);
    }
    return list;
  }, [maxDate, minDate]);

  const firstOfMonth = startOfMonth(visibleMonth);
  const canGoPrev = startOfMonth(addCalendarMonths(firstOfMonth, -1)) >= startOfMonth(minDate);
  const canGoNext = startOfMonth(addCalendarMonths(firstOfMonth, 1)) <= startOfMonth(maxDate);

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

  function moveMonth(offset: number) {
    setVisibleMonth(
      clampMonth(addCalendarMonths(firstOfMonth, offset), minDate, maxDate),
    );
  }

  function selectDate(date: Date) {
    if (date < minDate || date > maxDate) {
      return;
    }
    onChange(formatDateInputValue(date));
    setVisibleMonth(startOfMonth(date));
  }

  return (
    <div>
      <p id={`${id}-value`} className={cn("mb-2 text-sm", value ? "text-ink" : "text-muted")}>
        {value ? formatDisplayDate(value) : "No date selected yet"}
      </p>
      <div
        className={cn(
          "rounded-2xl border bg-cream p-3 sm:p-4",
          error ? "border-orange/50" : "border-line",
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink hover:bg-card disabled:cursor-not-allowed disabled:text-muted/40"
            aria-label="Previous month"
            disabled={!canGoPrev}
            onClick={() => moveMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <label className="sr-only" htmlFor={`${id}-month`}>
            Month
          </label>
          <select
            id={`${id}-month`}
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-card px-2 text-sm text-ink"
            value={visibleMonth.getMonth()}
            onChange={(event) => {
              setVisibleMonth(
                clampMonth(
                  new Date(visibleMonth.getFullYear(), Number(event.target.value), 1),
                  minDate,
                  maxDate,
                ),
              );
            }}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={id}>
            Year
          </label>
          <select
            id={id}
            className="h-9 w-[5.5rem] rounded-xl border border-line bg-card px-2 text-sm text-ink"
            value={visibleMonth.getFullYear()}
            onChange={(event) => {
              setVisibleMonth(
                clampMonth(
                  new Date(Number(event.target.value), visibleMonth.getMonth(), 1),
                  minDate,
                  maxDate,
                ),
              );
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink hover:bg-card disabled:cursor-not-allowed disabled:text-muted/40"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => moveMonth(1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          role="grid"
          aria-label="Choose a date of birth"
          aria-describedby={`${id}-value`}
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
            const disabled = date < minDate || date > maxDate;
            const selected = Boolean(selectedDate && isSameDay(date, selectedDate));

            return (
              <button
                key={`${date.getFullYear()}-${date.getMonth()}-${day}`}
                type="button"
                role="gridcell"
                disabled={disabled}
                aria-selected={selected}
                className={cn(
                  "grid h-9 place-items-center rounded-full text-sm transition-colors",
                  disabled && "cursor-not-allowed text-muted/40",
                  !disabled && !selected && "text-ink hover:bg-card",
                  selected && "bg-teal font-semibold text-white",
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
