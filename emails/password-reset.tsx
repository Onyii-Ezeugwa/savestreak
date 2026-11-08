import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "react-email";

export interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
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
                line: "#e4d4bc",
              },
            },
          },
        }}
      >
        <Head />
        <Body className="bg-cream font-sans">
          <Preview>Reset your $aveStreak password</Preview>
          <Container className="mx-auto my-8 max-w-xl rounded-xl border border-solid border-line bg-card px-6 py-8">
            <Text className="m-0 text-xs font-semibold uppercase tracking-widest text-teal">
              $aveStreak
            </Text>
            <Heading
              as="h1"
              className="mt-3 mb-4 text-2xl font-bold leading-8 text-ink"
            >
              Reset your password
            </Heading>
            <Text className="m-0 mb-4 text-base leading-7 text-ink">
              A password reset was requested for this email. The link expires in
              30 minutes and works only once.
            </Text>
            <Text className="m-0 mb-4 text-base leading-7 text-muted">
              If you did not ask for this, you can ignore the email. Your
              password will stay the same.
            </Text>
            <Section className="my-6">
              <Button
                href={resetUrl}
                className="box-border rounded-lg bg-teal px-5 py-3 text-center text-base font-semibold text-white no-underline"
              >
                Choose a new password
              </Button>
            </Section>
            <Text className="m-0 text-sm leading-6 text-muted">{resetUrl}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
