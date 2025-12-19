import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export const maxDuration = 30;

// Simple in-memory rate limiter (per-IP, per minute)
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; ts: number }>();

function allowRequest(ip: string) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entry = buckets.get(key);
  if (!entry || now - entry.ts > WINDOW_MS) {
    buckets.set(key, { count: 1, ts: now });
    return true;
  }
  if (entry.count < RATE_LIMIT) {
    entry.count += 1;
    return true;
  }
  return false;
}

export async function POST(req: Request) {
  const ipHeader = req.headers.get('x-forwarded-for') || '';
  const ip = ipHeader.split(',')[0]?.trim() || '';
  if (!allowRequest(ip)) {
    return new Response('Too Many Requests', { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = await streamText({
    model: google('gemini-2.5-flash'), 
    messages: convertToModelMessages(messages),
    system: `Bạn là 0xVault AI - một trợ lý chuyên về Crypto và Blockchain. 
    Phong cách trả lời: Ngắn gọn, súc tích, chuyên nghiệp (Degen style). 
    Luôn cảnh báo rủi ro khi nói về giá cả. (trả lời bằng tiếng anh hay tiếng việt phụ thuộc và ngôn ngữ người dùng hỏi)`,
  });

  return result.toUIMessageStreamResponse();
}