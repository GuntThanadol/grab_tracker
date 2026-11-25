import crypto from 'node:crypto';

export interface LineQuickReplyItem {
  type: 'action';
  action: {
    type: 'message';
    label: string;
    text: string;
  };
}

/**
 * Default Quick Reply chips attached to bot replies.
 * LINE enforces max 20 characters (including emoji/spaces) per label and max 13 items.
 */
export const QUICK_REPLY_ITEMS: LineQuickReplyItem[] = [
  { type: 'action', action: { type: 'message', label: '📊 วันนี้', text: 'วันนี้' } },
  { type: 'action', action: { type: 'message', label: '⏮️ เมื่อวาน', text: 'เมื่อวาน' } },
  { type: 'action', action: { type: 'message', label: '📅 สัปดาห์นี้', text: 'สัปดาห์นี้' } },
  { type: 'action', action: { type: 'message', label: '🗓️ เดือนนี้', text: 'เดือนนี้' } },
  { type: 'action', action: { type: 'message', label: '⛽ ราคาน้ำมัน', text: 'ราคาน้ำมัน' } },
  { type: 'action', action: { type: 'message', label: '🔧 เช็คระยะรถ', text: 'เช็คระยะ' } },
  { type: 'action', action: { type: 'message', label: '❓ วิธีใช้บอท', text: 'ช่วยเหลือ' } },
];

/**
 * Verifies the `x-line-signature` header against raw request body using HMAC-SHA256.
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string
): boolean {
  if (!signature || !channelSecret) return false;
  const expected = crypto
    .createHmac('sha256', channelSecret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expected, 'utf8');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Attaches QUICK_REPLY_ITEMS to a LINE message object.
 */
export function attachQuickReply<T extends Record<string, unknown>>(
  message: T,
  items: LineQuickReplyItem[] = QUICK_REPLY_ITEMS
): T & { quickReply: { items: LineQuickReplyItem[] } } {
  return {
    ...message,
    quickReply: { items },
  };
}

export interface LineSendResult {
  ok: boolean;
  status: number;
  error?: string;
  details?: unknown;
}

/**
 * Replies using a free LINE `replyToken` (does not consume push message quota).
 * Skips calling LINE API for LINE Console's all-zeros verify dummy token.
 */
export async function replyLineMessages(
  replyToken: string,
  messages: Record<string, unknown>[],
  accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim(),
  withQuickReply = true
): Promise<LineSendResult> {
  if (!replyToken || /^0+$/.test(replyToken)) {
    return { ok: true, status: 200 };
  }
  if (!accessToken) {
    return { ok: false, status: 400, error: 'ยังไม่ได้ระบุ LINE_CHANNEL_ACCESS_TOKEN' };
  }

  const prepared = messages.slice(0, 5).map((msg, idx, arr) =>
    withQuickReply && idx === arr.length - 1 ? attachQuickReply(msg) : msg
  );

  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: prepared,
    }),
  });

  if (!res.ok) {
    const details = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: res.status,
      error: (details as { message?: string }).message || `LINE Reply Error (${res.status})`,
      details,
    };
  }

  return { ok: true, status: res.status };
}

/**
 * Pushes messages proactively to a LINE user ID (used for web saves and scheduled alerts).
 */
export async function pushLineMessages(
  to: string,
  messages: Record<string, unknown>[],
  accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim(),
  withQuickReply = true
): Promise<LineSendResult> {
  if (!accessToken || !to) {
    return {
      ok: false,
      status: 400,
      error: 'ยังไม่ได้ระบุ LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_USER_ID',
    };
  }

  const prepared = messages.slice(0, 5).map((msg, idx, arr) =>
    withQuickReply && idx === arr.length - 1 ? attachQuickReply(msg) : msg
  );

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to,
      messages: prepared,
    }),
  });

  if (!res.ok) {
    const details = await res.json().catch(() => ({}));
    return {
      ok: false,
      status: res.status,
      error: (details as { message?: string }).message || `LINE API Error (${res.status})`,
      details,
    };
  }

  return { ok: true, status: res.status };
}
