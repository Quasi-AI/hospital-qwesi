import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, maxTokens, temperature, apiKey } = await request.json();

    if (!apiKey || apiKey === 'sk-...') {
      return NextResponse.json(
        { error: 'Please configure your OpenAI API key in AI Settings' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant. Provide accurate, evidence-based medical information. Always recommend consulting with healthcare professionals for medical decisions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens || 1000,
        temperature: temperature || 0.3,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `OpenAI API error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response content from OpenAI' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content,
      model: data.model,
      usage: data.usage,
      finish_reason: data.choices?.[0]?.finish_reason
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
