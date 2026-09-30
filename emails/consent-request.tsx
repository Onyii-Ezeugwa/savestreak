import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";

export interface ConsentRequestEmailProps {
  studentFirstName: string;
  consentUrl: string;
  appUrl: string;
}

export function ConsentRequestEmail({
  studentFirstName,
  consentUrl,
  appUrl,
}: ConsentRequestEmailProps) {
  return (
    <Html lang="en">
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              colors: {
                cream: "#f7f0e5",
                card: "#fffdf8",
                ink: "#231f1b",
                muted: "#6f675e",
                teal: "#167c80",
                gold: "#d9a63c",
                line: "#e4d4bc",
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-cream font-sans">
          <Preview>
            {studentFirstName} needs your permission to use $aveStreak
          </Preview>
          <Container className="mx-auto my-8 max-w-xl rounded-xl border border-solid border-line bg-card px-6 py-8">
            <Text className="m-0 text-xs font-semibold uppercase tracking-widest text-teal">
              $aveStreak
            </Text>
            <Heading
              as="h1"
              className="mt-3 mb-4 text-2xl font-bold leading-8 text-ink"
            >
              Parent or guardian consent
            </Heading>
            <Text className="m-0 mb-4 text-base leading-7 text-ink">
              {studentFirstName} created a $aveStreak account and needs your
              approval before it can be used.
            </Text>
            <Text className="m-0 mb-4 text-base leading-7 text-muted">
              $aveStreak is a student savings app. It is not investment, credit,
              or tax advice. Approving activates the account. Declining keeps it
              restricted.
            </Text>
            <Section className="my-6">
              <Button
                href={consentUrl}
                className="box-border rounded-lg bg-teal px-5 py-3 text-center text-base font-semibold text-white no-underline"
              >
                Review and decide
              </Button>
            </Section>
            <Text className="m-0 mb-4 text-sm leading-6 text-muted">
              If the button does not work, open this link:
            </Text>
            <Link
              href={consentUrl}
              className="break-all text-sm text-teal underline"
            >
              {consentUrl}
            </Link>
            <Hr className="my-6 border-solid border-line" />
            <Text className="m-0 text-xs leading-5 text-muted">
              If you did not expect this request, you can decline on the page or
              ignore this email. Visit{" "}
              <Link href={appUrl} className="text-teal underline">
                {appUrl}
              </Link>{" "}
              to learn more about $aveStreak.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ConsentRequestEmail.PreviewProps = {
  studentFirstName: "Jordan",
  consentUrl: "https://savestreak.org/consent/preview-token",
  appUrl: "https://savestreak.org",
} satisfies ConsentRequestEmailProps;

export default ConsentRequestEmail;
