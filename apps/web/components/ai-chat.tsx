'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bot, Send, User } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

export function AIChat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const [input, setInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;
    await sendMessage({ text: input });
    setInput('');
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="w-5 h-5 text-blue-500" />
          Market Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((m: UIMessage, i: number) => (
          <div
            key={m.id ?? i}
            className={`flex gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role !== 'user' && <Bot />}
            <div>
              {m.parts.map((part, idx) =>
                part.type === 'text' ? <span key={idx}>{part.text}</span> : null
              )}
            </div>
            {m.role === 'user' && <User />}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about crypto..."
            disabled={status !== 'ready'}
            aria-label="Chat input"
          />
          <Button type="submit" size="icon" disabled={status !== 'ready'} aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
