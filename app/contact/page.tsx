import { LegalPage } from "@/components/LegalPage";

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        Have a question about $aveStreak? Reach the team at{" "}
        <a href="mailto:hello@savestreak.app" className="font-medium text-teal">
          hello@savestreak.app
        </a>
        .
      </p>
      <p>
        If you are a student under 18, please include a parent or guardian on
        any account-related request.
      </p>
    </LegalPage>
  );
}
