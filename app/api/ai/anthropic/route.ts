import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, maxTokens, temperature, apiKey } = await request.json();

    if (!apiKey || apiKey === 'sk-ant-...') {
      return NextResponse.json(
        { error: 'Please configure your Anthropic API key in AI Settings' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-3-sonnet-20240229',
        max_tokens: maxTokens || 1000,
        temperature: temperature || 0.2,
        system: 'You are a medical AI assistant. Provide accurate, evidence-based medical information. Always recommend consulting with healthcare professionals for medical decisions.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `Anthropic API error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      return NextResponse.json(
        { error: 'No response content from Anthropic' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content,
      model: data.model,
      usage: data.usage,
      stop_reason: data.stop_reason
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
