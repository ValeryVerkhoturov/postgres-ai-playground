import { ratelimit } from '@/utils/ratelimit';
import { OpenAIStream, OpenAIStreamPayload } from '@/utils/stream';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env var from OpenAI');
}

export const runtime = 'edge';

export async function POST(req: NextRequest): Promise<Response> {
  const id = req.ip ?? 'anonymous';

  const limit = await ratelimit.limit(id ?? 'anonymous');

  if (!limit.success) {
    return NextResponse.json(limit, { status: 429 });
  }

  const { prompt } = (await req.json()) as {
    prompt?: string;
  };

  if (!prompt) {
    return new Response('No prompt in the request', { status: 400 });
  }

  const payload: OpenAIStreamPayload = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `you are an AI assistant that only knows about PostgreSQL. All of your responses will be about Postgres, if asked about any other database say you do not know`,
      },
      {
        role: 'user',
        content: `${prompt} 
        
        format your response as SQL code where the explanation is the comment. Display the code on a new line. Reply in 200 characters or less.
      `,
      },
    ],
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 1000,
    stream: true,
    n: 1,
  };

  const stream = await OpenAIStream(payload);

  return new Response(stream);
}
