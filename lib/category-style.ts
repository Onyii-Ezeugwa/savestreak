import type { ExpenseCategory } from "@/lib/backend/expense-types";

export const CATEGORY_STYLE: Record<
  ExpenseCategory,
  { bar: string; dot: string; chip: string }
> = {
  food: {
    bar: "bg-orange",
    dot: "bg-orange",
    chip: "border-orange/40 bg-orange/15 text-ink",
  },
  transport: {
    bar: "bg-teal",
    dot: "bg-teal",
    chip: "border-teal/40 bg-teal/10 text-ink",
  },
  school: {
    bar: "bg-slateblue",
    dot: "bg-slateblue",
    chip: "border-slateblue/40 bg-slateblue/10 text-ink",
  },
  entertainment: {
    bar: "bg-berry",
    dot: "bg-berry",
    chip: "border-berry/40 bg-berry/10 text-ink",
  },
  shopping: {
    bar: "bg-green",
    dot: "bg-green",
    chip: "border-green/40 bg-green/10 text-ink",
  },
  other: {
    bar: "bg-gold",
    dot: "bg-gold",
    chip: "border-gold/50 bg-gold/15 text-ink",
  },
};
