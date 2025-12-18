import { google } from '@ai-sdk/google';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = await streamText({
    model: google('gemini-2.5-flash'), 
    messages: convertToModelMessages(messages),
    system: `Bạn là 0xVault AI - một trợ lý chuyên về Crypto và Blockchain. 
    Phong cách trả lời: Ngắn gọn, súc tích, chuyên nghiệp (Degen style). 
    Luôn cảnh báo rủi ro (DYOR) khi nói về giá cả. (trả lời bằng tiếng anh hay tiếng việt phụ thuộc và ngôn ngữ người dùng hỏi)`,
  });

  return result.toUIMessageStreamResponse();
}