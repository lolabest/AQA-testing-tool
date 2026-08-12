import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number = Date.now(),
): string {
  const body = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export function verifyWebhookSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceMs = 5 * 60 * 1000,
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );
  const timestamp = Number(parts["t"]);
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() - timestamp) > toleranceMs) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
