import type { SchoolKind } from "@/lib/school-option";
import { isUsStateCode } from "./us-states";

const PHONE_DIGITS = /^\d{10}$/;
const ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;
const SCHOOL_ID_PATTERN = /^(k12|college):.+/;

export interface ProfileFields {
  lastName: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  schoolId: string;
  schoolName: string;
  schoolCity: string;
  schoolState: string;
  schoolKind: SchoolKind | "";
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhone(value: string) {
  const digits = digitsOnly(value);
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export function formatPhone(value: string) {
  const digits = normalizePhone(value);
  if (digits.length !== 10) {
    return value;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function parseProfileInput(input: {
  lastName?: unknown;
  phone?: unknown;
  streetAddress?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  schoolId?: unknown;
  schoolName?: unknown;
  schoolCity?: unknown;
  schoolState?: unknown;
  schoolKind?: unknown;
}) {
  const lastName =
    typeof input.lastName === "string" ? input.lastName.trim() : "";
  const phone = normalizePhone(
    typeof input.phone === "string" ? input.phone : "",
  );
  const streetAddress =
    typeof input.streetAddress === "string" ? input.streetAddress.trim() : "";
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const state =
    typeof input.state === "string" ? input.state.trim().toUpperCase() : "";
  const postalCode =
    typeof input.postalCode === "string" ? input.postalCode.trim() : "";
  const schoolId =
    typeof input.schoolId === "string" ? input.schoolId.trim() : "";
  const schoolName =
    typeof input.schoolName === "string" ? input.schoolName.trim() : "";
  const schoolCity =
    typeof input.schoolCity === "string" ? input.schoolCity.trim() : "";
  const schoolState =
    typeof input.schoolState === "string"
      ? input.schoolState.trim().toUpperCase()
      : "";
  const schoolKind =
    input.schoolKind === "k12" || input.schoolKind === "college"
      ? input.schoolKind
      : "";

  const fieldErrors: Record<string, string> = {};
  if (!lastName) {
    fieldErrors.lastName = "Enter your last name.";
  }
  if (!PHONE_DIGITS.test(phone)) {
    fieldErrors.phone = "Enter a 10-digit US phone number.";
  }
  if (!streetAddress) {
    fieldErrors.streetAddress = "Enter your street address.";
  }
  if (!city) {
    fieldErrors.city = "Enter your city.";
  }
  if (!isUsStateCode(state)) {
    fieldErrors.state = "Choose your state.";
  }
  if (!ZIP_PATTERN.test(postalCode)) {
    fieldErrors.postalCode = "Enter a 5-digit ZIP code.";
  }
  if (
    !SCHOOL_ID_PATTERN.test(schoolId) ||
    !schoolName ||
    !schoolKind ||
    (schoolState && !isUsStateCode(schoolState) && schoolState.length !== 2)
  ) {
    fieldErrors.school = "Choose your school from the list.";
  }

  const profile: ProfileFields = {
    lastName,
    phone,
    streetAddress,
    city,
    state,
    postalCode,
    schoolId,
    schoolName,
    schoolCity,
    schoolState,
    schoolKind,
  };

  return { profile, fieldErrors };
}
