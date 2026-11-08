"use client";

import { BackLink } from "@/components/BackLink";
import { PageFooterNav } from "@/components/PageFooterNav";
import { ConsentStatusPanel } from "@/components/ConsentStatusPanel";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/components/AuthProvider";
import { formatDisplayDate } from "@/lib/dates";
import { CalendarDays, Mail, School, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ACCOUNT_LABEL = {
  active: "Active",
  pending_consent: "Waiting on consent",
  restricted: "Restricted",
} as const;

const ACCOUNT_CHIP = {
  active: "bg-teal/10 text-teal",
  pending_consent: "bg-gold/20 text-ink",
  restricted: "bg-berry/10 text-berry",
} as const;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <section className="page-enter mx-auto max-w-6xl px-5 py-14 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Loading your profile...</p>
      </section>
    );
  }

  const facts = [
    { label: "Email", value: user.email, icon: Mail },
    {
      label: "Date of birth",
      value: formatDisplayDate(user.dateOfBirth),
      icon: CalendarDays,
    },
    ...(user.schoolName
      ? [{ label: "School", value: user.schoolName, icon: School }]
      : []),
  ];

  return (
    <section className="page-enter mx-auto max-w-6xl space-y-6 px-5 py-14 sm:px-6 lg:px-8">
      <div className="game-panel overflow-hidden rounded-3xl">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(22,124,128,0.16),transparent_42%),linear-gradient(180deg,#fffdf8,#f7f0e5)] px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-center gap-5">
            <BackLink />
            <div className="flex items-center gap-5">
              <UserAvatar
                firstName={user.firstName}
                lastName={user.lastName}
                size="lg"
              />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal">
                  Profile
                </p>
                <h1 className="mt-2 font-display text-4xl text-ink">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="mt-1 text-sm text-muted">{user.email}</p>
                <span
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${ACCOUNT_CHIP[user.status]}`}
                >
                  <ShieldCheck size={13} aria-hidden="true" />
                  {ACCOUNT_LABEL[user.status]}
                </span>
              </div>
            </div>
          </div>
        </div>
        <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-card px-6 py-5">
              <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
                <fact.icon size={14} aria-hidden="true" />
                {fact.label}
              </dt>
              <dd className="mt-2 text-sm font-medium text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {user.ageGroup === "minor" ? <ConsentStatusPanel /> : null}
      <PageFooterNav />
    </section>
  );
}
