import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function openWhatsApp(phone: string, message: string) {
  const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function openSMS(phone: string, message: string) {
  const url = `sms:${phone.replace(/\D/g, "")}?body=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function openEmail(email: string, subject: string, body: string) {
  const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url, "_blank");
}
