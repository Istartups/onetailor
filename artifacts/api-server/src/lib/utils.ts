import { customAlphabet } from "nanoid";

// Generate a license key like: OT-XXXX-XXXX-XXXX
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nanoid = customAlphabet(alphabet, 4);

export const generateLicenseKey = () => {
  return `OT-${nanoid()}-${nanoid()}-${nanoid()}`;
};

export const generateReferralCode = () => {
  return `ONT-${nanoid()}`;
};
