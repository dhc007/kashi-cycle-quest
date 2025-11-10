import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract phone number from bolt91.app email format
 * e.g., "7709892835@bolt91.app" -> "7709892835"
 */
export function extractPhoneFromEmail(email: string): string | null {
  if (email && email.endsWith('@bolt91.app')) {
    return email.split('@')[0];
  }
  return null;
}

/**
 * Format user display name - prefers phone number over email
 */
export function formatUserDisplay(email: string, phoneNumber?: string): string {
  if (phoneNumber) return phoneNumber;
  const phone = extractPhoneFromEmail(email);
  return phone || email;
}
