import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages, model, maxTokens, temperature, apiKey } = await request.json();
    
    console.log('OpenAI Vision API - Received request:');
    console.log('Model:', model);
    console.log('Messages count:', messages?.length);
    console.log('First message content types:', messages?.[0]?.content?.map((c: any) => c.type));
    console.log('Has image data:', messages?.[0]?.content?.some((c: any) => c.type === 'image_url'));

    if (!apiKey || apiKey === 'sk-...') {
      return NextResponse.json(
        { error: 'Please configure your OpenAI API key in AI Settings' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Validate that the model supports vision
    const visionModels = ['gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview'];
    if (!visionModels.includes(model)) {
      return NextResponse.json(
        { error: `Model ${model} does not support vision. Supported models: ${visionModels.join(', ')}` },
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
        model: model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a medical AI assistant specializing in medical image analysis. Provide accurate, evidence-based analysis of medical images. Always recommend consulting with healthcare professionals for medical decisions.'
          },
          ...messages
        ],
        max_tokens: maxTokens || 1000,
        temperature: temperature || 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI Vision API error:', errorData);
      return NextResponse.json(
        { error: `OpenAI Vision API error: ${errorData.error?.message || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response content from OpenAI Vision API' },
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
    console.error('OpenAI Vision API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
