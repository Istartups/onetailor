/**
 * CallMeBot WhatsApp notification utility.
 * API docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * Before this works the phone number must activate the API by texting the
 * CallMeBot bot first — see the link above. Credentials are stored in the
 * payment_settings row (callmebotPhone + callmebotApiKey).
 */

export async function sendCallMeBotAlert(
  phone: string,
  apiKey: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const body = await res.text();
    if (!res.ok || body.toLowerCase().includes("error")) {
      console.warn("[CallMeBot] Alert possibly failed:", body.slice(0, 200));
      return { ok: false, error: body.slice(0, 200) };
    }
    console.log("[CallMeBot] Alert sent OK");
    return { ok: true };
  } catch (err: any) {
    console.warn("[CallMeBot] Alert send error:", err?.message);
    return { ok: false, error: err?.message };
  }
}
