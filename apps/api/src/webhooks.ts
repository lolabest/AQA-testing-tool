import { signWebhookPayload } from "@testpilot/security";

export interface WebhookDispatchResult {
  ok: boolean;
  status: number;
  responseBody: string;
}

/**
 * Sends a canonical JSON payload signed by the shared security package.
 * Delivery persistence/retries are handled by the caller/worker.
 */
export async function dispatchSignedWebhook(
  url: string,
  payload: unknown,
  secret: string,
  signal?: AbortSignal,
): Promise<WebhookDispatchResult> {
  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body, secret);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "TestPilot-AI-Webhook/1.0",
      "x-testpilot-signature": signature,
    },
    body,
    signal,
  });
  return {
    ok: response.ok,
    status: response.status,
    responseBody: await response.text(),
  };
}
