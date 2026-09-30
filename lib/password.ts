export const PASSWORD_HINT =
  "At least 8 characters, with 1 uppercase letter, 1 lowercase letter, and 1 number.";

export function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
}

export function passwordScore(password: string) {
  const checks = passwordChecks(password);
  return Number(checks.length) + Number(checks.uppercase) + Number(checks.lowercase) + Number(checks.number);
}

export function isStrongPassword(password: string) {
  return passwordScore(password) === 4;
}

export function passwordError(password: string) {
  if (!isStrongPassword(password)) {
    return PASSWORD_HINT;
  }
  return null;
}
