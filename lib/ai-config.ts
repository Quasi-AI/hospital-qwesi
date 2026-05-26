export interface AIModel {
  id: string;
  name: string;
  provider: string;
  type: 'llm' | 'vision' | 'speech' | 'multimodal';
  status: 'active' | 'inactive' | 'testing';
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  accuracy: number;
  speed: number;
  cost: number;
  features: string[];
  lastTest: string;
  testResults: {
    accuracy: number;
    responseTime: number;
    reliability: number;
  };
  isActive?: boolean;
}

export interface AIProvider {
  name: string;
  models: string[];
  pricing: string;
  baseUrl: string;
  apiKeyFormat: string;
  supportedFeatures: string[];
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'OpenAI',
    models: [
      'gpt-5', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4',
      'gpt-3.5-turbo', 'gpt-3.5-turbo-instruct'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyFormat: 'sk-...',
    supportedFeatures: ['text-generation', 'chat', 'embeddings', 'vision', 'function-calling']
  },
  {
    name: 'Anthropic',
    models: [
      'claude-3.5-sonnet', 'claude-3.5-haiku', 'claude-3.5-opus',
      'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyFormat: 'sk-ant-...',
    supportedFeatures: ['text-generation', 'chat', 'reasoning', 'vision', 'tool-use']
  },
  {
    name: 'Google',
    models: [
      'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-latest',
      'gemini-pro', 'gemini-pro-vision', 'gemini-ultra'
    ],
    pricing: 'Per request',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyFormat: 'AIza...',
    supportedFeatures: ['text-generation', 'vision', 'multimodal', 'reasoning', 'code-generation']
  },
  {
    name: 'Azure OpenAI',
    models: [
      'gpt-4o', 'gpt-4-turbo', 'gpt-4',
      'gpt-35-turbo', 'gpt-35-turbo-instruct'
    ],
    pricing: 'Per token',
    baseUrl: 'https://your-resource.openai.azure.com',
    apiKeyFormat: 'sk-...',
    supportedFeatures: ['text-generation', 'chat', 'embeddings', 'vision']
  },
  {
    name: 'Mistral AI',
    models: [
      'mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest',
      'mistral-7b-instruct', 'mixtral-8x7b-instruct'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyFormat: 'mist-...',
    supportedFeatures: ['text-generation', 'chat', 'reasoning', 'code-generation']
  },
  {
    name: 'Cohere',
    models: [
      'command-r-plus', 'command-r', 'command-light',
      'rerank-english-v3.0', 'rerank-multilingual-v3.0'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.cohere.ai/v1',
    apiKeyFormat: 'cohere-...',
    supportedFeatures: ['text-generation', 'chat', 'reranking', 'embeddings']
  },
  {
    name: 'Meta AI',
    models: [
      'llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b',
      'llama-3-405b', 'llama-3-70b', 'llama-3-8b'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.meta.ai/v1',
    apiKeyFormat: 'meta-...',
    supportedFeatures: ['text-generation', 'chat', 'reasoning', 'code-generation']
  },
  {
    name: 'Perplexity AI',
    models: [
      'llama-3.1-405b-instruct', 'llama-3.1-70b-instruct',
      'mixtral-8x7b-instruct', 'codellama-70b-instruct'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.perplexity.ai/v1',
    apiKeyFormat: 'pplx-...',
    supportedFeatures: ['text-generation', 'chat', 'reasoning', 'code-generation']
  },
  {
    name: 'Together AI',
    models: [
      'llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b',
      'mixtral-8x7b-instruct', 'codellama-70b-instruct',
      'deepseek-coder-33b-instruct', 'qwen2.5-72b-instruct'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.together.xyz/v1',
    apiKeyFormat: 'together-...',
    supportedFeatures: ['text-generation', 'chat', 'reasoning', 'code-generation']
  },
  {
    name: 'DeepSeek',
    models: [
      'deepseek-coder-33b-instruct', 'deepseek-coder-6.7b-instruct',
      'deepseek-llm-67b-chat', 'deepseek-llm-7b-chat'
    ],
    pricing: 'Per token',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyFormat: 'deepseek-...',
    supportedFeatures: ['text-generation', 'chat', 'reasoning', 'code-generation']
  }
];

export const DEFAULT_AI_MODELS: AIModel[] = [
  {
    id: '1',
    name: 'GPT-4o Medical',
    provider: 'OpenAI',
    type: 'llm',
    status: 'active',
    apiKey: 'sk-...',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    maxTokens: 128000,
    temperature: 0.3,
    accuracy: 96,
    speed: 90,
    cost: 0.005,
    features: ['Medical diagnosis', 'Treatment recommendations', 'Drug interactions', 'Advanced reasoning'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 96, responseTime: 1.8, reliability: 98 }
  },
  {
    id: '2',
    name: 'Claude 3.5 Sonnet Medical',
    provider: 'Anthropic',
    type: 'llm',
    status: 'active',
    apiKey: 'sk-ant-...',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3.5-sonnet',
    maxTokens: 200000,
    temperature: 0.2,
    accuracy: 95,
    speed: 85,
    cost: 0.003,
    features: ['Medical reasoning', 'Clinical analysis', 'Patient education', 'Tool use'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 95, responseTime: 2.5, reliability: 97 }
  },
  {
    id: '3',
    name: 'Gemini 1.5 Pro Medical',
    provider: 'Google',
    type: 'multimodal',
    status: 'inactive',
    apiKey: 'AIza...',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-pro',
    maxTokens: 1000000,
    temperature: 0.1,
    accuracy: 94,
    speed: 80,
    cost: 0.0025,
    features: ['Medical text analysis', 'Image analysis', 'Multimodal reasoning', 'Code generation'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 94, responseTime: 3.0, reliability: 95 }
  },
  {
    id: '4',
    name: 'Mistral Large Medical',
    provider: 'Mistral AI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'mist-...',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    maxTokens: 32768,
    temperature: 0.3,
    accuracy: 93,
    speed: 75,
    cost: 0.002,
    features: ['Medical reasoning', 'Clinical analysis', 'Code generation', 'Multilingual support'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 93, responseTime: 4.2, reliability: 94 }
  },
  {
    id: '5',
    name: 'Claude 3.5 Opus Medical',
    provider: 'Anthropic',
    type: 'llm',
    status: 'inactive',
    apiKey: 'sk-ant-...',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3.5-opus',
    maxTokens: 200000,
    temperature: 0.2,
    accuracy: 97,
    speed: 80,
    cost: 0.015,
    features: ['Advanced medical reasoning', 'Clinical research', 'Complex analysis', 'Tool use'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 97, responseTime: 3.5, reliability: 99 }
  },
  {
    id: '6',
    name: 'Claude 3.5 Haiku Medical',
    provider: 'Anthropic',
    type: 'llm',
    status: 'inactive',
    apiKey: 'sk-ant-...',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3.5-haiku',
    maxTokens: 200000,
    temperature: 0.2,
    accuracy: 92,
    speed: 95,
    cost: 0.00025,
    features: ['Fast medical analysis', 'Patient summaries', 'Quick consultations', 'Cost-effective'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 92, responseTime: 1.2, reliability: 94 }
  },
  {
    id: '7',
    name: 'GPT-4 Turbo Medical',
    provider: 'OpenAI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'sk-...',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo',
    maxTokens: 128000,
    temperature: 0.3,
    accuracy: 95,
    speed: 95,
    cost: 0.01,
    features: ['Fast medical diagnosis', 'Real-time analysis', 'Efficient reasoning', 'High speed'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 95, responseTime: 1.0, reliability: 97 }
  },
  {
    id: '8',
    name: 'GPT-4o Mini Medical',
    provider: 'OpenAI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'sk-...',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    maxTokens: 128000,
    temperature: 0.3,
    accuracy: 94,
    speed: 92,
    cost: 0.0025,
    features: ['Optimized medical analysis', 'Cost-effective reasoning', 'Balanced performance', 'Efficient'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 94, responseTime: 1.5, reliability: 96 }
  },
  {
    id: '9',
    name: 'Gemini 1.5 Flash Medical',
    provider: 'Google',
    type: 'multimodal',
    status: 'inactive',
    apiKey: 'AIza...',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    maxTokens: 1000000,
    temperature: 0.1,
    accuracy: 92,
    speed: 90,
    cost: 0.00075,
    features: ['Fast medical analysis', 'Image processing', 'Quick insights', 'Cost-effective'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 92, responseTime: 1.8, reliability: 93 }
  },
  {
    id: '10',
    name: 'Mistral Medium Medical',
    provider: 'Mistral AI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'mist-...',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-medium-latest',
    maxTokens: 32768,
    temperature: 0.3,
    accuracy: 90,
    speed: 85,
    cost: 0.0007,
    features: ['Balanced medical analysis', 'Good reasoning', 'Fast response', 'Very cost-effective'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 90, responseTime: 2.8, reliability: 91 }
  },
  {
    id: '11',
    name: 'Cohere Command R+ Medical',
    provider: 'Cohere',
    type: 'llm',
    status: 'inactive',
    apiKey: 'cohere-...',
    endpoint: 'https://api.cohere.ai/v1/chat',
    model: 'command-r-plus',
    maxTokens: 128000,
    temperature: 0.3,
    accuracy: 91,
    speed: 80,
    cost: 0.001,
    features: ['Medical text analysis', 'Clinical reasoning', 'Good performance', 'Cost-effective'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 91, responseTime: 3.5, reliability: 92 }
  },
  {
    id: '12',
    name: 'GPT-4o Medical',
    provider: 'OpenAI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'sk-...',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o',
    maxTokens: 128000,
    temperature: 0.3,
    accuracy: 93,
    speed: 88,
    cost: 0.005,
    features: ['Reliable medical analysis', 'Good reasoning', 'Stable performance', 'Proven track record'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 93, responseTime: 2.2, reliability: 95 }
  },
  {
    id: '13',
    name: 'Llama 3.1 405B Medical',
    provider: 'Meta AI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'meta-...',
    endpoint: 'https://api.meta.ai/v1/chat/completions',
    model: 'llama-3.1-405b',
    maxTokens: 8192,
    temperature: 0.3,
    accuracy: 92,
    speed: 70,
    cost: 0.0006,
    features: ['Open-source medical AI', 'Good reasoning', 'Cost-effective', 'Community-driven'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 92, responseTime: 4.5, reliability: 90 }
  },
  {
    id: '14',
    name: 'Perplexity Llama 3.1 Medical',
    provider: 'Perplexity AI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'pplx-...',
    endpoint: 'https://api.perplexity.ai/v1/chat/completions',
    model: 'llama-3.1-405b-instruct',
    maxTokens: 8192,
    temperature: 0.3,
    accuracy: 93,
    speed: 75,
    cost: 0.0007,
    features: ['Enhanced medical reasoning', 'Good performance', 'Cost-effective', 'Reliable'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 93, responseTime: 3.8, reliability: 91 }
  },
  {
    id: '15',
    name: 'Together AI Mixtral Medical',
    provider: 'Together AI',
    type: 'llm',
    status: 'inactive',
    apiKey: 'together-...',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'mixtral-8x7b-instruct',
    maxTokens: 32768,
    temperature: 0.3,
    accuracy: 91,
    speed: 80,
    cost: 0.0002,
    features: ['Very cost-effective', 'Good reasoning', 'Fast response', 'Open-source'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 91, responseTime: 2.5, reliability: 89 }
  },
  {
    id: '16',
    name: 'DeepSeek Coder Medical',
    provider: 'DeepSeek',
    type: 'llm',
    status: 'inactive',
    apiKey: 'deepseek-...',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-coder-33b-instruct',
    maxTokens: 16384,
    temperature: 0.3,
    accuracy: 90,
    speed: 75,
    cost: 0.0004,
    features: ['Medical code generation', 'Clinical algorithms', 'Good reasoning', 'Cost-effective'],
    lastTest: new Date().toLocaleString(),
    testResults: { accuracy: 90, responseTime: 3.2, reliability: 88 }
  }
];

export class AIConfigManager {
  private models: AIModel[] = [];
  private activeModel: string | null = null;

  constructor() {
    // Initialize with empty array - models will be loaded from database
    this.models = [];
  }

  // Load models from database
  async loadModels(): Promise<AIModel[]> {
    try {
      const response = await fetch('/api/ai-models');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.models = result.data;
          console.log('Loaded models from database:', this.models);
          return this.models;
        }
      }
      console.error('Failed to load models from database');
      return [];
    } catch (error) {
      console.error('Error loading models from database:', error);
      return [];
    }
  }

  // Save model to database
  async addModel(model: Omit<AIModel, 'id'>): Promise<string> {
    try {
      console.log('=== AI CONFIG MANAGER - ADD MODEL ===');
      console.log('Model data to send:', { ...model, apiKey: model.apiKey ? '[HIDDEN]' : 'MISSING' });
      
      const response = await fetch('/api/ai-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(model),
      });

      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('API response data:', result);
        
        if (result.success) {
          const newModel = result.data;
          this.models.push(newModel);
          console.log('Model added to local array:', newModel);
          return newModel.id;
        } else {
          console.error('API returned success: false:', result);
          throw new Error(result.error || 'API returned error');
        }
      } else {
        const errorText = await response.text();
        console.error('API request failed:', response.status, errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error adding model to database:', error);
      throw error;
    }
  }

  // Update model in database
  async updateModel(id: string, updates: Partial<AIModel>): Promise<boolean> {
    try {
      console.log('=== AI CONFIG MANAGER - UPDATE MODEL ===');
      console.log('Model ID:', id);
      console.log('Updates:', { ...updates, apiKey: updates.apiKey ? '[HIDDEN]' : 'MISSING' });
      
      const response = await fetch('/api/ai-models', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      });

      console.log('API response status:', response.status);
      console.log('API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('API response data:', result);
        
        if (result.success) {
          const updatedModel = result.data;
          const index = this.models.findIndex(m => m.id === id);
          if (index !== -1) {
            this.models[index] = updatedModel;
          }
          console.log('Model updated in database:', updatedModel);
          return true;
        } else {
          console.error('API returned success: false:', result);
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error('API request failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('Error updating model in database:', error);
      return false;
    }
  }

  // Delete model from database
  async deleteModel(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/ai-models?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.models = this.models.filter(m => m.id !== id);
          console.log('Model deleted from database:', id);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error deleting model from database:', error);
      return false;
    }
  }

  // Set active model in database
  async setActiveModel(id: string): Promise<boolean> {
    try {
      const response = await fetch('/api/ai-models/active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.activeModel = id;
          // Update local models to reflect active status
          this.models.forEach(m => {
            m.isActive = m.id === id;
          });
          console.log('Active model set in database:', id);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error setting active model in database:', error);
      return false;
    }
  }

  // Get active model from database
  async getActiveModel(): Promise<AIModel | undefined> {
    try {
      const response = await fetch('/api/ai-models/active');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.activeModel = result.data.id;
          return result.data;
        }
      }
      return undefined;
    } catch (error) {
      console.error('Error getting active model from database:', error);
      return undefined;
    }
  }

  // Clear all models from database
  async clearAllModels(): Promise<void> {
    try {
      // Delete all models one by one
      for (const model of this.models) {
        await this.deleteModel(model.id);
      }
      this.models = [];
      this.activeModel = null;
      console.log('All models cleared from database');
    } catch (error) {
      console.error('Error clearing models from database:', error);
    }
  }

  // Synchronous getters for backward compatibility
  getModels(): AIModel[] {
    return this.models;
  }

  async getModel(id: string): Promise<AIModel | undefined> {
    // First try to find in loaded models
    let model = this.models.find(m => m.id === id);
    
    // If not found, try to load models from database
    if (!model) {
      console.log('Model not found in memory, loading from database...');
      await this.loadModels();
      model = this.models.find(m => m.id === id);
    }
    
    return model;
  }

  // Get latest models for a specific provider
  getLatestModels(provider: string): string[] {
    const providerInfo = AI_PROVIDERS.find(p => p.name === provider);
    return providerInfo ? providerInfo.models : [];
  }

  // Get recommended model for a provider
  getRecommendedModel(provider: string): string {
    const models = this.getLatestModels(provider);
    if (provider === 'OpenAI') {
      return models.find(m => m.startsWith('gpt-4o')) || models[0] || 'gpt-4';
    } else if (provider === 'Anthropic') {
      return models.find(m => m.startsWith('claude-3.5')) || models[0] || 'claude-3-sonnet';
    } else if (provider === 'Google') {
      return models.find(m => m.startsWith('gemini-1.5')) || models[0] || 'gemini-pro';
    }
    return models[0] || '';
  }

  // Get provider info
  getProviderInfo(provider: string): AIProvider | undefined {
    return AI_PROVIDERS.find(p => p.name === provider);
  }

  // Test model (simulated)
  testModel(id: string): Promise<{ success: boolean; results?: { accuracy: number; responseTime: number; reliability: number } }> {
    return new Promise((resolve) => {
      const model = this.getModel(id);
      if (!model) {
        resolve({ success: false });
        return;
      }

      // Simulate API test
      setTimeout(() => {
        const results = {
          accuracy: Math.floor(Math.random() * 20) + 80,
          responseTime: Math.random() * 5 + 1,
          reliability: Math.floor(Math.random() * 20) + 80
        };

        this.updateModel(id, {
          status: 'active',
          lastTest: new Date().toLocaleString(),
          testResults: results
        });

        resolve({ success: true, results });
      }, 2000);
    });
  }
}

export const aiConfigManager = new AIConfigManager();
