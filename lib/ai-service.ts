import { AIModel, aiConfigManager } from './ai-config';

export interface AIRequest {
  prompt: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  context?: string;
}

export interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  modelUsed: string;
  tokensUsed: number;
  responseTime: number;
  cost: number;
}

export interface MedicalAnalysisRequest {
  symptoms: string[];
  patientAge: number;
  patientGender: string;
  medicalHistory: string[];
  vitalSigns: Record<string, string | number>;
  modelId: string;
}

export interface DrugInteractionRequest {
  medications: string[];
  patientAge: number;
  medicalConditions: string[];
  allergies: string[];
  modelId: string;
}

export interface ImageAnalysisRequest {
  imageData: string; // base64 encoded
  imageType: 'xray' | 'ct' | 'mri' | 'ultrasound';
  analysisType: 'diagnosis' | 'abnormality' | 'measurement';
  modelId: string;
  imageFormat?: string; // jpeg, png, etc.
}

export class AIService {
  private configManager = aiConfigManager;

  async generateText(request: AIRequest): Promise<AIResponse> {
    const model = await this.configManager.getModel(request.modelId);
    if (!model) {
      return {
        success: false,
        error: 'Model not found',
        modelUsed: 'unknown',
        tokensUsed: 0,
        responseTime: 0,
        cost: 0
      };
    }

    try {
      const startTime = Date.now();
      
      let response: { content: string };
      
      switch (model.provider) {
        case 'OpenAI':
          response = await this.callOpenAI(request, model);
          break;
        case 'Anthropic':
          response = await this.callAnthropic(request, model);
          break;
        case 'Google':
          response = await this.callGoogle(request, model);
          break;
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
      }

      const responseTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(request.prompt + (response.content || ''));
      const cost = (tokensUsed / 1000) * model.cost;

      return {
        success: true,
        content: response.content,
        modelUsed: model.name,
        tokensUsed,
        responseTime,
        cost
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        modelUsed: model.name,
        tokensUsed: 0,
        responseTime: 0,
        cost: 0
      };
    }
  }

  async analyzeMedicalSymptoms(request: MedicalAnalysisRequest): Promise<AIResponse> {
    const prompt = this.buildMedicalPrompt(request);
    return this.generateText({
      prompt,
      modelId: request.modelId,
      maxTokens: 1000,
      temperature: 0.1
    });
  }

  async checkDrugInteractions(request: DrugInteractionRequest): Promise<AIResponse> {
    const prompt = this.buildDrugInteractionPrompt(request);
    return this.generateText({
      prompt,
      modelId: request.modelId,
      maxTokens: 800,
      temperature: 0.1
    });
  }

  async analyzeMedicalImage(request: ImageAnalysisRequest): Promise<AIResponse> {
    console.log('Looking for model with ID:', request.modelId);
    console.log('Available models:', this.configManager.getModels().map(m => ({ id: m.id, name: m.name, model: m.model })));
    
    const model = await this.configManager.getModel(request.modelId);
    if (!model) {
      console.error('Model not found with ID:', request.modelId);
      return {
        success: false,
        error: 'Model not found',
        modelUsed: 'unknown',
        tokensUsed: 0,
        responseTime: 0,
        cost: 0
      };
    }

    try {
      const startTime = Date.now();
      
      let response: { content: string };
      
      // Check if model supports vision
      if (this.isVisionCapableModel(model)) {
        if (model.provider === 'Google' && model.model.includes('vision')) {
          response = await this.callGoogleVision(request, model);
        } else if (model.provider === 'OpenAI' && this.isOpenAIVisionModel(model.model)) {
          response = await this.callOpenAIVision(request, model);
        } else if (model.provider === 'Anthropic' && this.isAnthropicVisionModel(model.model)) {
          response = await this.callAnthropicVision(request, model);
        } else {
          // Fallback to text-based analysis for other vision models
          const prompt = this.buildImageAnalysisPrompt(request);
          return this.generateText({
            prompt,
            modelId: request.modelId,
            maxTokens: 600,
            temperature: 0.1
          });
        }
      } else {
        // Model doesn't support vision - fallback to text-based analysis
        const prompt = this.buildImageAnalysisPrompt(request);
        return this.generateText({
          prompt,
          modelId: request.modelId,
          maxTokens: 600,
          temperature: 0.1
        });
      }

      const responseTime = Date.now() - startTime;
      const tokensUsed = this.estimateTokens(response.content || '');
      const cost = (tokensUsed / 1000) * model.cost;

      return {
        success: true,
        content: response.content,
        modelUsed: model.name,
        tokensUsed,
        responseTime,
        cost
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        modelUsed: model.name,
        tokensUsed: 0,
        responseTime: 0,
        cost: 0
      };
    }
  }

  private async callOpenAI(request: AIRequest, model: AIModel): Promise<any> {
    const response = await fetch('/api/ai/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: model.model,
        maxTokens: request.maxTokens || model.maxTokens,
        temperature: request.temperature || model.temperature,
        apiKey: model.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content };
  }

  private async callAnthropic(request: AIRequest, model: AIModel): Promise<any> {
    const response = await fetch('/api/ai/anthropic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: model.model,
        maxTokens: request.maxTokens || model.maxTokens,
        temperature: request.temperature || model.temperature,
        apiKey: model.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content };
  }

  private async callGoogle(request: AIRequest, model: AIModel): Promise<any> {
    const response = await fetch('/api/ai/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt,
        model: model.model,
        maxTokens: request.maxTokens || model.maxTokens,
        temperature: request.temperature || model.temperature,
        apiKey: model.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content };
  }

  private async callGoogleVision(request: ImageAnalysisRequest, model: AIModel): Promise<any> {
    const response = await fetch('/api/ai/google-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: request.imageData,
        imageType: request.imageType,
        analysisType: request.analysisType,
        model: model.model,
        apiKey: model.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content };
  }

  private buildMedicalPrompt(request: MedicalAnalysisRequest): string {
    return `As a medical AI assistant, analyze the following patient information and provide a comprehensive assessment in a structured format:

Patient Profile:
- Age: ${request.patientAge}
- Gender: ${request.patientGender}
- Symptoms: ${request.symptoms.join(', ')}
- Medical History: ${request.medicalHistory.join(', ')}
- Vital Signs: ${JSON.stringify(request.vitalSigns)}

Please provide your analysis in the following structured format:

**POSSIBLE CONDITIONS:**
List 2-3 most likely conditions with:
- Condition name
- Probability percentage (60-95%)
- Urgency level (low/medium/high/critical)
- Brief description

**RISK ASSESSMENT:**
- Overall risk level (low/medium/high/critical)
- Key risk factors identified
- Specific recommendations

**TREATMENT PLAN:**
- Immediate actions needed
- Medication considerations (with medical consultation note)
- Lifestyle modifications
- Follow-up timeline

Base your analysis on evidence-based medicine and current clinical guidelines. Be specific and actionable in your recommendations.`;
  }

  private buildDrugInteractionPrompt(request: DrugInteractionRequest): string {
    return `As a medical AI assistant, analyze potential drug interactions for the following medications:

Medications: ${request.medications.join(', ')}
Patient Age: ${request.patientAge}
Medical Conditions: ${request.medicalConditions.join(', ')}
Allergies: ${request.allergies.join(', ')}

Please provide:
1. Potential drug-drug interactions
2. Drug-disease interactions
3. Contraindications
4. Recommended monitoring
5. Alternative medication suggestions

Focus on clinically significant interactions and provide evidence-based recommendations.`;
  }

  // Helper functions to check vision capabilities
  private isVisionCapableModel(model: AIModel): boolean {
    const visionModels = {
      'OpenAI': ['gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview'],
      'Anthropic': ['claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3.5-opus', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      'Google': ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro-vision', 'gemini-ultra']
    };
    
    return visionModels[model.provider as keyof typeof visionModels]?.includes(model.model) || false;
  }

  private isOpenAIVisionModel(modelName: string): boolean {
    return ['gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview'].includes(modelName);
  }

  private isAnthropicVisionModel(modelName: string): boolean {
    return ['claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3.5-opus', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'].includes(modelName);
  }

  // OpenAI Vision API call
  private async callOpenAIVision(request: ImageAnalysisRequest, model: AIModel): Promise<any> {
    console.log('OpenAI Vision API call - Image data length:', request.imageData.length);
    console.log('OpenAI Vision API call - Image data preview:', request.imageData.substring(0, 50) + '...');
    
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: this.buildImageAnalysisPrompt(request)
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/${request.imageFormat || 'jpeg'};base64,${request.imageData}`
              }
            }
          ]
        }
      ],
      model: model.model,
      max_tokens: 1000,
      temperature: 0.1,
      apiKey: model.apiKey
    };
    
    console.log('OpenAI Vision API request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('/api/ai/openai-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI Vision API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content };
  }

  // Anthropic Vision API call
  private async callAnthropicVision(request: ImageAnalysisRequest, model: AIModel): Promise<any> {
    const response = await fetch('/api/ai/anthropic-vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.buildImageAnalysisPrompt(request)
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: request.imageData
                }
              }
            ]
          }
        ],
        model: model.model,
        max_tokens: 1000,
        temperature: 0.1,
        apiKey: model.apiKey
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic Vision API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return { content: data.content };
  }

  private buildImageAnalysisPrompt(request: ImageAnalysisRequest): string {
    return `As a medical AI assistant, analyze the following medical image and provide a comprehensive assessment:

Image Type: ${request.imageType}
Analysis Type: ${request.analysisType}

Please provide your analysis in the following structured format:

**OVERALL ASSESSMENT:**
- Assessment: [Normal/Abnormal/Uncertain]
- Confidence: [0-100%]
- Urgency: [Low/Medium/High/Critical]

**FINDINGS:**
- List any abnormalities, lesions, or notable features detected
- Include location, size, and characteristics
- Note any measurements or comparisons

**RECOMMENDATIONS:**
- Immediate actions needed (if any)
- Follow-up recommendations
- Additional imaging or tests suggested
- Consultation recommendations

Base your analysis on medical imaging best practices and current clinical guidelines. Be specific and actionable in your recommendations.`;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  async testModelConnection(modelId: string): Promise<boolean> {
    try {
      const response = await this.generateText({
        prompt: 'Test connection - respond with "OK"',
        modelId,
        maxTokens: 10,
        temperature: 0
      });
      return response.success;
    } catch {
      return false;
    }
  }
}

export const aiService = new AIService();
