import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDeviceId() {
  let id = localStorage.getItem("deviceId");
  if (!id) {
    id = "dt_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("deviceId", id);
  }
  return id;
}

// Validation Helpers
export const validateName = (name: string): { valid: boolean; message: string } => {
  if (!name) return { valid: true, message: "" };
  // Letters, spaces, hyphens, apostrophes allowed. Numbers rejected.
  const nameRegex = /^[a-zA-Z\s\-\']+$/;
  if (!nameRegex.test(name)) {
    return { valid: false, message: "Numbers are not allowed in this field." };
  }
  return { valid: true, message: "" };
};

export const validatePhone = (phone: string): { valid: boolean; message: string } => {
  if (!phone) return { valid: true, message: "" };
  // 0-9 and Plus sign (+) only
  const phoneRegex = /^[0-9+]+$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, message: "Enter a valid phone number." };
  }
  return { valid: true, message: "" };
};
