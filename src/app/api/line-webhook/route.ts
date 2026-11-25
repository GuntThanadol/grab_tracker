import { NextRequest, NextResponse } from 'next/server';
import {
  generateEntryPreviewFlex,
  generateFuelPriceFlex,
  generateHelpFlex,
  ParsedEntryDraft,
} from '@/lib/lineFlex';
import { replyLineMessages, verifyLineSignature } from '@/lib/lineApi';
import { decodeDraftPostback, parseLineCommand } from '@/lib/lineBotParser';
import {
  buildDailyReportMessage,
  buildGoalsMessage,
  buildMaintenanceMessage,
  buildPeriodSummaryMessage,
  commitEntryDraft,
  getLatestOdometerServer,
  prepareEntryDraft,
  resolveAppUrl,
} from '@/lib/lineBotService';
import { getLiveFuelPrices } from '@/lib/oilPrice';
import {
  fetchBotSettingsServer,
  fetchFuelSettingsServer,
  getSupabaseAdmin,
  upsertBotSettingsServer,
  upsertEntryServer,
} from '@/lib/supabaseAdmin';
import { fmt, fmtDateSlash, getTodayThai } from '@/lib/utils';
import { Entry } from '@/types';

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: {
    type?: string;
    userId?: string;
  };
  message?: {
    type?: string;
    text?: string;
  };
  postback?: {
    data?: string;
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'Grab Tracker LINE Webhook' });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    const allowedUserId = process.env.LINE_USER_ID?.trim();

    if (!channelSecret) {
      return NextResponse.json(
        { success: false, error: 'Missing LINE_CHANNEL_SECRET' },
        { status: 500 }
      );
    }

    const signature = req.headers.get('x-line-signature');
    if (!verifyLineSignature(rawBody, signature, channelSecret)) {
      return NextResponse.json({ success: false, error: 'Invalid LINE signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}') as { events?: LineWebhookEvent[] };
    const events = Array.isArray(payload.events) ? payload.events : [];
    if (events.length === 0) {
      return NextResponse.json({ success: true });
    }

    const appUrl = resolveAppUrl(req.nextUrl.origin);
    const todayStr = getTodayThai();
    const adminDb = getSupabaseAdmin();

    for (const event of events) {
      const replyToken = event.replyToken;
      const senderId = event.source?.userId;
      if (!replyToken || !senderId) continue;

      // Setup helper: if LINE_USER_ID is not configured yet, reply with the caller's User ID
      if (!allowedUserId) {
        await replyLineMessages(
          replyToken,
          [
            {
              type: 'text',
              text: `🆔 LINE User ID ของคุณคือ:\n${senderId}\n\nนำค่านี้ไปตั้งใน Environment Variable ชื่อ LINE_USER_ID เพื่อเปิดใช้งานบอทได้เลยครับ`,
            },
          ],
          accessToken,
          false
        );
        continue;
      }

      if (senderId !== allowedUserId) {
        continue;
      }

      if (!adminDb) {
        await replyLineMessages(
          replyToken,
          [
            {
              type: 'text',
              text: '⚠️ ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY บนเซิร์ฟเวอร์ จึงยังไม่สามารถอ่าน/บันทึกฐานข้อมูลผ่านแชท LINE ได้ครับ',
            },
          ],
          accessToken,
          false
        );
        continue;
      }

      // Handle Postback Events (Confirm/Cancel/Quick Add/Maintenance Reset)
      if (event.type === 'postback' && event.postback?.data) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get('a');

        if (action === 'cancel') {
          await upsertBotSettingsServer(adminDb, { pending_draft: null });
          await replyLineMessages(
            replyToken,
            [{ type: 'text', text: '❌ ยกเลิกการบันทึกเรียบร้อยแล้วครับ' }],
            accessToken
          );
          continue;
        }

        if (action === 'confirm_save') {
          const targetDate = params.get('d') || todayStr;
          const { settings } = await fetchBotSettingsServer(adminDb);
          const pending = settings.pending_draft as ParsedEntryDraft | null | undefined;
          const draft: ParsedEntryDraft =
            pending && pending.date === targetDate
              ? pending
              : decodeDraftPostback(params, todayStr);

          const saved = await commitEntryDraft(adminDb, draft);
          if (saved.error) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: `❌ บันทึกไม่สำเร็จ: ${saved.error}` }],
              accessToken
            );
            continue;
          }

          const card = await buildDailyReportMessage(adminDb, saved.entry, appUrl);
          await replyLineMessages(
            replyToken,
            [{ type: 'text', text: `✅ บันทึกข้อมูลวันที่ ${fmtDateSlash(saved.entry.date)} เรียบร้อยแล้ว!` }, card],
            accessToken
          );
          continue;
        }

        if (action === 'add_tip' || action === 'add_oil_real') {
          const targetDate = params.get('d') || todayStr;
          const delta = parseFloat(params.get('v') || '0');
          if (delta > 0) {
            const { data: existing } = await adminDb
              .from('entries')
              .select('*')
              .eq('date', targetDate)
              .maybeSingle();

            if (!existing) {
              await replyLineMessages(
                replyToken,
                [{ type: 'text', text: `ℹ️ ยังไม่พบข้อมูลวันที่ ${fmtDateSlash(targetDate)} กรุณาพิมพ์บันทึกยอดก่อนครับ` }],
                accessToken
              );
              continue;
            }

            const cur = existing as Entry;
            const updated: Entry = {
              ...cur,
              tip: action === 'add_tip' ? Number(((Number(cur.tip) || 0) + delta).toFixed(2)) : Number(cur.tip) || 0,
              oil_real:
                action === 'add_oil_real'
                  ? Number(((Number(cur.oil_real) || 0) + delta).toFixed(2))
                  : Number(cur.oil_real) || 0,
            };

            const res = await upsertEntryServer(adminDb, updated);
            if (res.error) {
              await replyLineMessages(replyToken, [{ type: 'text', text: `❌ อัปเดตไม่สำเร็จ: ${res.error}` }], accessToken);
              continue;
            }

            const card = await buildDailyReportMessage(adminDb, res.entry, appUrl);
            await replyLineMessages(
              replyToken,
              [
                {
                  type: 'text',
                  text:
                    action === 'add_tip'
                      ? `🎁 บวกทิปเพิ่ม +${fmt(delta)} ฿ ให้วันที่ ${fmtDateSlash(targetDate)} แล้ว`
                      : `⛽ บันทึกเติมน้ำมันจริง +${fmt(delta)} ฿ ให้วันที่ ${fmtDateSlash(targetDate)} แล้ว`,
                },
                card,
              ],
              accessToken
            );
            continue;
          }
        }

        if (action === 'reset_oil' || action === 'reset_gear') {
          const paramOdo = parseFloat(params.get('odo') || '0');
          const latest = paramOdo > 0 ? { odometer: paramOdo } : await getLatestOdometerServer(adminDb);
          const nextOdo = latest?.odometer || 0;

          if (nextOdo <= 0) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: '⚠️ ยังไม่มีเลขไมล์ล่าสุดในระบบ กรุณาพิมพ์ "ถ่ายน้ำมันเครื่อง 15420" เพื่อระบุเลขไมล์ครับ' }],
              accessToken
            );
            continue;
          }

          const patch =
            action === 'reset_oil'
              ? { last_engine_oil_odo: nextOdo }
              : { last_gear_oil_odo: nextOdo };
          const updateRes = await upsertBotSettingsServer(adminDb, patch);
          if (!updateRes.success) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: `⚠️ ${updateRes.error}` }],
              accessToken
            );
            continue;
          }

          const card = await buildMaintenanceMessage(adminDb, todayStr);
          await replyLineMessages(
            replyToken,
            [
              {
                type: 'text',
                text:
                  action === 'reset_oil'
                    ? `🛢️ รีเซ็ตรอบน้ำมันเครื่องที่เลขไมล์ ${nextOdo.toLocaleString('th-TH')} กม. เรียบร้อย!`
                    : `⚙️ รีเซ็ตรอบเฟืองท้าย/โซ่ที่เลขไมล์ ${nextOdo.toLocaleString('th-TH')} กม. เรียบร้อย!`,
              },
              card,
            ],
            accessToken
          );
          continue;
        }
      }

      // Handle Text Messages
      if (event.type === 'message' && event.message?.type === 'text' && event.message.text) {
        const cmd = parseLineCommand(event.message.text, todayStr);

        if (cmd.kind === 'help') {
          await replyLineMessages(replyToken, [generateHelpFlex(appUrl)], accessToken);
          continue;
        }

        if (cmd.kind === 'query_day') {
          const { data: row } = await adminDb
            .from('entries')
            .select('*')
            .eq('date', cmd.date)
            .maybeSingle();

          if (!row) {
            await replyLineMessages(
              replyToken,
              [
                {
                  type: 'text',
                  text: `📭 ยังไม่มีข้อมูลของวันที่ ${fmtDateSlash(cmd.date)} ครับ\n\nพิมพ์บันทึกงานได้เลย เช่น: "450 ทิป 30 งาน 11 ไมล์ 15420 3.5ชม" หรือพิมพ์ "หยุด" ถ้าเป็นวันหยุด`,
                },
              ],
              accessToken
            );
            continue;
          }

          const card = await buildDailyReportMessage(adminDb, row as Entry, appUrl);
          await replyLineMessages(replyToken, [card], accessToken);
          continue;
        }

        if (cmd.kind === 'query_week') {
          const card = await buildPeriodSummaryMessage(adminDb, 'week', cmd.offset, todayStr, appUrl);
          await replyLineMessages(replyToken, [card], accessToken);
          continue;
        }

        if (cmd.kind === 'query_month') {
          const card = await buildPeriodSummaryMessage(adminDb, 'month', cmd.offset, todayStr, appUrl);
          await replyLineMessages(replyToken, [card], accessToken);
          continue;
        }

        if (cmd.kind === 'query_oil') {
          const fuelSettings = await fetchFuelSettingsServer(adminDb);
          const oilData = await getLiveFuelPrices(fuelSettings.brand || 'bcp');
          if (!oilData) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: '⚠️ ไม่สามารถดึงราคาน้ำมันล่าสุดจากบางจาก/ปตท. ได้ในขณะนี้ครับ' }],
              accessToken
            );
            continue;
          }
          await replyLineMessages(replyToken, [generateFuelPriceFlex(oilData, fuelSettings)], accessToken);
          continue;
        }

        if (cmd.kind === 'query_maintenance') {
          const card = await buildMaintenanceMessage(adminDb, todayStr);
          await replyLineMessages(replyToken, [card], accessToken);
          continue;
        }

        if (cmd.kind === 'query_goals') {
          const card = await buildGoalsMessage(adminDb, todayStr);
          await replyLineMessages(replyToken, [card], accessToken);
          continue;
        }

        if (cmd.kind === 'rest_day') {
          const { data: existing } = await adminDb
            .from('entries')
            .select('id')
            .eq('date', cmd.date)
            .maybeSingle();

          const restDraft: ParsedEntryDraft = {
            date: cmd.date,
            grab: 0,
            tip: 0,
            trips: null,
            odometer: null,
            distance: null,
            oil: 0,
            oil_real: 0,
            credit: 0,
            withdraw: 0,
            hours: null,
            note: cmd.note,
          };

          if (existing) {
            const prepared = await prepareEntryDraft(adminDb, restDraft);
            await replyLineMessages(
              replyToken,
              [
                generateEntryPreviewFlex(
                  prepared.draft,
                  prepared.prevOdoInfo,
                  true,
                  prepared.confirmData
                ),
              ],
              accessToken
            );
          } else {
            const saved = await commitEntryDraft(adminDb, restDraft);
            if (saved.error) {
              await replyLineMessages(replyToken, [{ type: 'text', text: `❌ บันทึกวันหยุดไม่สำเร็จ: ${saved.error}` }], accessToken);
              continue;
            }
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: `🛌 บันทึกวันหยุด (${fmtDateSlash(cmd.date)}) หมายเหตุ: "${cmd.note}" เรียบร้อยแล้วครับ` }],
              accessToken
            );
          }
          continue;
        }

        if (cmd.kind === 'add_field') {
          const { data: existing } = await adminDb
            .from('entries')
            .select('*')
            .eq('date', cmd.date)
            .maybeSingle();

          if (!existing) {
            await replyLineMessages(
              replyToken,
              [
                {
                  type: 'text',
                  text: `ℹ️ วันนี้ (${fmtDateSlash(cmd.date)}) ยังไม่มีรายการวิ่งงานครับ กรุณาพิมพ์บันทึกงานก่อน เช่น "420 ทิป ${cmd.field === 'tip' ? cmd.amount : 0} งาน 10"`,
                },
              ],
              accessToken
            );
            continue;
          }

          const cur = existing as Entry;
          const updated: Entry = {
            ...cur,
            tip: cmd.field === 'tip' ? Number(((Number(cur.tip) || 0) + cmd.amount).toFixed(2)) : Number(cur.tip) || 0,
            oil_real:
              cmd.field === 'oil_real'
                ? Number(((Number(cur.oil_real) || 0) + cmd.amount).toFixed(2))
                : Number(cur.oil_real) || 0,
          };

          const res = await upsertEntryServer(adminDb, updated);
          if (res.error) {
            await replyLineMessages(replyToken, [{ type: 'text', text: `❌ อัปเดตไม่สำเร็จ: ${res.error}` }], accessToken);
            continue;
          }

          const card = await buildDailyReportMessage(adminDb, res.entry, appUrl);
          await replyLineMessages(
            replyToken,
            [
              {
                type: 'text',
                text:
                  cmd.field === 'tip'
                    ? `🎁 เพิ่มทิป +${fmt(cmd.amount)} ฿ (รวมทิป ${fmt(res.entry.tip)} ฿)`
                    : `⛽ เพิ่มเติมน้ำมันจริง +${fmt(cmd.amount)} ฿ (รวม ${fmt(res.entry.oil_real)} ฿)`,
              },
              card,
            ],
            accessToken
          );
          continue;
        }

        if (cmd.kind === 'set_goal') {
          const patch =
            cmd.target === 'daily'
              ? { daily_goal: cmd.value }
              : cmd.target === 'weekly_trips'
              ? { weekly_trips_goal: Math.max(1, Math.round(cmd.value)) }
              : { monthly_goal: cmd.value };

          const updateRes = await upsertBotSettingsServer(adminDb, patch);
          if (!updateRes.success) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: `⚠️ ${updateRes.error}` }],
              accessToken
            );
            continue;
          }

          const card = await buildGoalsMessage(adminDb, todayStr);
          await replyLineMessages(
            replyToken,
            [{ type: 'text', text: '🎯 อัปเดตเป้าหมายเรียบร้อยแล้ว!' }, card],
            accessToken
          );
          continue;
        }

        if (cmd.kind === 'reset_maint') {
          const latest =
            cmd.odometer && cmd.odometer > 0
              ? { odometer: cmd.odometer }
              : await getLatestOdometerServer(adminDb);
          const nextOdo = latest?.odometer || 0;
          if (nextOdo <= 0) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: '⚠️ ยังไม่พบเลขไมล์ในระบบ กรุณาระบุเลขไมล์ เช่น "ถ่ายน้ำมันเครื่อง 15420"' }],
              accessToken
            );
            continue;
          }

          const patch =
            cmd.target === 'engine_oil'
              ? { last_engine_oil_odo: nextOdo }
              : { last_gear_oil_odo: nextOdo };

          const updateRes = await upsertBotSettingsServer(adminDb, patch);
          if (!updateRes.success) {
            await replyLineMessages(
              replyToken,
              [{ type: 'text', text: `⚠️ ${updateRes.error}` }],
              accessToken
            );
            continue;
          }

          const card = await buildMaintenanceMessage(adminDb, todayStr);
          await replyLineMessages(
            replyToken,
            [
              {
                type: 'text',
                text:
                  cmd.target === 'engine_oil'
                    ? `🛢️ บันทึกเปลี่ยนน้ำมันเครื่องที่ไมล์ ${nextOdo.toLocaleString('th-TH')} กม. แล้วครับ`
                    : `⚙️ บันทึกเปลี่ยนเฟืองท้าย/โซ่ที่ไมล์ ${nextOdo.toLocaleString('th-TH')} กม. แล้วครับ`,
              },
              card,
            ],
            accessToken
          );
          continue;
        }

        if (cmd.kind === 'entry_draft') {
          const prepared = await prepareEntryDraft(adminDb, cmd.draft);
          const previewCard = generateEntryPreviewFlex(
            prepared.draft,
            prepared.prevOdoInfo,
            prepared.isExistingDate,
            prepared.confirmData
          );
          await replyLineMessages(replyToken, [previewCard], accessToken);
          continue;
        }

        // Unknown command fallback
        await replyLineMessages(
          replyToken,
          [
            {
              type: 'text',
              text: '🤖 ไม่เข้าใจคำสั่งนี้ครับ ลองเลือกจากปุ่มด้านล่าง หรือพิมพ์ "ช่วยเหลือ" เพื่อดูตัวอย่างคำสั่งและการพิมพ์บันทึกงานครับ',
            },
          ],
          accessToken
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('LINE Webhook Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
