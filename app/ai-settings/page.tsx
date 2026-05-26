'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '../protected-route';
import SidebarLayout from '../components/sidebar-layout';
import { useTranslations } from '../hooks/useTranslations';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { 
  Settings, 
  Brain, 
  CheckCircle, 
  Save,
  X,
  RefreshCw,
  Star,
  TestTube
} from 'lucide-react';
import { AIModel, aiConfigManager } from '../../lib/ai-config';
import { aiService } from '../../lib/ai-service';

// Simplified AI models list - Only GPT 4.1
const AI_MODELS = [
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'OpenAI',
    description: 'Enhanced GPT-4.1 model with improved medical analysis',
    type: 'llm',
    maxTokens: 128000,
    cost: 0.0055,
    features: ['Medical diagnosis', 'Treatment recommendations', 'Drug interactions', 'Enhanced reasoning'],
    recommended: true
  }
];

export default function AISettingsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { formatCurrency } = useFormatCurrency();
  const [models, setModels] = useState<AIModel[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringModel, setConfiguringModel] = useState<any>(null);
  const [config, setConfig] = useState({
    apiKey: '',
    temperature: 0.3,
    maxTokens: 4000
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const loadedModels = await aiConfigManager.loadModels();
      setModels(loadedModels);
      console.log('Loaded models:', loadedModels);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveModel = () => {
    return models.find(m => m.isActive);
  };

  const setActiveModel = async (modelId: string) => {
    try {
      const success = await aiConfigManager.setActiveModel(modelId);
      if (success) {
        await loadModels();
        alert('Model activated successfully!');
      } else {
        alert('Failed to set active model');
      }
    } catch (error) {
      console.error('Error setting active model:', error);
      alert('Failed to set active model');
    }
  };

  const configureModel = (modelInfo: any) => {
    setConfiguringModel(modelInfo);
    
    // Check if this model is already configured
    const existingModel = models.find(m => m.model === modelInfo.id);
    
    if (existingModel) {
      // Load existing configuration
      setConfig({
        apiKey: existingModel.apiKey || '',
        temperature: existingModel.temperature || 0.3,
        maxTokens: existingModel.maxTokens || modelInfo.maxTokens || 4000
      });
    } else {
      // Set default values for new model
      setConfig({
        apiKey: '',
        temperature: 0.3,
        maxTokens: modelInfo.maxTokens || 4000
      });
    }
    
    setShowConfigModal(true);
  };

  const saveModelConfig = async () => {
    if (!configuringModel || !config.apiKey.trim()) {
      alert('Please provide an API key to save the configuration.');
      return;
    }

    setIsSaving(true);
    console.log('=== SAVING MODEL CONFIG ===');
    console.log('Configuring model:', configuringModel);
    console.log('Config data:', { ...config, apiKey: '[HIDDEN]' });

    try {
      // Check if this model is already configured
      const existingModel = models.find(m => m.model === configuringModel.id);
      
      if (existingModel) {
        // Update existing model
        console.log('Updating existing model:', existingModel.id);
        
        const updateData = {
          apiKey: config.apiKey,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          lastTest: new Date().toLocaleString()
        };
        
        const updateSuccess = await aiConfigManager.updateModel(existingModel.id, updateData);
        
        if (updateSuccess) {
          console.log('Model updated successfully');
          await loadModels();
          setShowConfigModal(false);
          setConfiguringModel(null);
          setConfig({ apiKey: '', temperature: 0.3, maxTokens: 4000 });
          alert(`✅ ${configuringModel.name} configuration updated successfully!`);
        } else {
          console.error('Failed to update model');
          alert(`❌ Error updating configuration. Please check the console for details.`);
        }
      } else {
        // Create new model
        console.log('Creating new model');
        
        const modelToAdd = {
          name: configuringModel.name,
          provider: configuringModel.provider,
          type: configuringModel.type as any,
          status: 'inactive' as const,
          apiKey: config.apiKey,
          endpoint: getEndpointForProvider(configuringModel.provider),
          model: configuringModel.id,
          maxTokens: config.maxTokens,
          temperature: config.temperature,
          accuracy: 90,
          speed: 80,
          cost: configuringModel.cost,
          features: configuringModel.features,
          lastTest: new Date().toLocaleString(),
          testResults: { accuracy: 90, responseTime: 2.0, reliability: 90 }
        };

        console.log('Model to add:', { ...modelToAdd, apiKey: '[HIDDEN]' });

        const newModelId = await aiConfigManager.addModel(modelToAdd);
        console.log('Model added successfully with ID:', newModelId);
        
        // Refresh the models list
        await loadModels();
        
        // Close modal and reset form
        setShowConfigModal(false);
        setConfiguringModel(null);
        setConfig({ apiKey: '', temperature: 0.3, maxTokens: 4000 });
        
        // Show success feedback
        alert(`✅ ${configuringModel.name} configured successfully!`);
      }
    } catch (error) {
      console.error('Error saving model config:', error);
      alert(`❌ Error saving configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getEndpointForProvider = (provider: string) => {
    switch (provider) {
      case 'OpenAI': return 'https://api.openai.com/v1/chat/completions';
      case 'Anthropic': return 'https://api.anthropic.com/v1/messages';
      case 'Google': return 'https://generativelanguage.googleapis.com/v1beta';
      default: return '';
    }
  };

  const deleteModel = async (id: string) => {
    if (confirm('Are you sure you want to remove this model configuration?')) {
      try {
        await aiConfigManager.deleteModel(id);
        await loadModels();
        alert('Model configuration removed successfully!');
      } catch (error) {
        console.error('Error deleting model:', error);
        alert('Failed to delete model configuration');
      }
    }
  };

  const clearAllModels = async () => {
    if (confirm('Are you sure you want to clear all AI model configurations? This action cannot be undone.')) {
      try {
        await aiConfigManager.clearAllModels();
        await loadModels();
        alert('All AI model configurations have been cleared.');
      } catch (error) {
        console.error('Error clearing models:', error);
        alert('Failed to clear models from database');
      }
    }
  };

  const testModel = async (modelId: string) => {
    setTestingModel(modelId);
    try {
      console.log('Testing model:', modelId);
      const success = await aiService.testModelConnection(modelId);
      
      const result = {
        success,
        message: success 
          ? '✅ Connection test successful! Model is working properly.' 
          : '❌ Connection test failed. Please check your API key and configuration.'
      };
      
      setTestResults(prev => ({ ...prev, [modelId]: result }));
      
      // Update the model's last test time if successful
      if (success) {
        await aiConfigManager.updateModel(modelId, {
          lastTest: new Date().toLocaleString(),
          status: 'active'
        });
        await loadModels();
      }
      
    } catch (error) {
      console.error('Error testing model:', error);
      setTestResults(prev => ({ 
        ...prev, 
        [modelId]: { 
          success: false, 
          message: '❌ Test failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        } 
      }));
    } finally {
      setTestingModel(null);
    }
  };

  // Show loading state if translations aren't loaded yet
  if (!translationsLoaded) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading translations...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <SidebarLayout 
          title={t('ai.settings.title')} 
          description={t('ai.settings.description')} dense>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-purple-600"></div>
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarLayout 
        title={t('ai.settings.title')} 
        description={t('ai.settings.description')} dense>
        <div className="mx-auto max-w-6xl space-y-3">
          {/* Header with Active Model */}
          <div className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 p-3 text-white">
            <div className="mb-2 flex items-center gap-2">
              <Settings className="h-6 w-6 shrink-0" />
              <h2 className="text-lg font-bold">{t('ai.settings.aiModelManagement')}</h2>
            </div>

            <div className="rounded-md bg-white/10 p-3">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-purple-100">
                {t('ai.settings.activeModel')}
              </h3>
              {(() => {
                const activeModel = getActiveModel();
                return activeModel ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activeModel.name}</p>
                      <p className="text-xs text-purple-100">
                        {activeModel.provider} • {formatCurrency(activeModel.cost)}/1K tokens
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[11px] font-medium text-white">
                      {t('ai.settings.active')}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-purple-100">{t('ai.settings.noActiveModelSelected')}</p>
                );
              })()}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{t('ai.settings.availableAIModels')}</h3>
            <button
              onClick={loadModels}
              className="inline-flex items-center gap-1.5 rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('ai.settings.refresh')}
            </button>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {AI_MODELS.map((modelInfo) => {
              const isConfigured = models.some(m => m.model === modelInfo.id);
              const configuredModel = models.find(m => m.model === modelInfo.id);
              const isActive = getActiveModel()?.model === modelInfo.id;

              return (
                <div
                  key={modelInfo.id}
                  className="rounded-lg border-2 border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-purple-200"
                >
                  {/* Model Header */}
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Brain className="h-4 w-4 shrink-0 text-purple-600" />
                      <div className="min-w-0">
                        <h4 className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <span className="truncate">{modelInfo.name}</span>
                          {modelInfo.recommended && <Star className="h-3.5 w-3.5 shrink-0 text-yellow-500" />}
                        </h4>
                        <p className="text-xs text-gray-500">{modelInfo.provider}</p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                        {t('ai.settings.active')}
                      </span>
                    )}
                  </div>

                  {/* Model Description */}
                  <p className="mb-2 text-xs leading-snug text-gray-600">{modelInfo.description}</p>

                  {/* Model Stats */}
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div className="rounded bg-gray-50 p-1.5 text-center">
                      <div className="text-xs font-bold text-purple-600">{formatCurrency(modelInfo.cost)}</div>
                      <div className="text-[11px] text-gray-600">{t('ai.settings.per1KTokens')}</div>
                    </div>
                    <div className="rounded bg-gray-50 p-1.5 text-center">
                      <div className="text-xs font-bold text-blue-600">{modelInfo.maxTokens.toLocaleString()}</div>
                      <div className="text-[11px] text-gray-600">{t('ai.settings.maxTokens')}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-1.5">
                    {isConfigured ? (
                      <>
                        {isActive ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>{t('ai.settings.currentlyActive')}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => configuredModel && setActiveModel(configuredModel.id)}
                            className="w-full rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {t('ai.settings.setAsActive')}
                          </button>
                        )}
                        <div className="space-y-1.5">
                          <button
                            onClick={() => configuredModel && testModel(configuredModel.id)}
                            disabled={testingModel === configuredModel?.id}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {testingModel === configuredModel?.id ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white"></div>
                            ) : (
                              <TestTube className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {testingModel === configuredModel?.id ? t('ai.settings.testing') : t('ai.settings.testModel')}
                            </span>
                          </button>

                          {testResults[configuredModel?.id || ''] && (
                            <div
                              className={`rounded p-1.5 text-[11px] leading-snug ${
                                testResults[configuredModel?.id || ''].success
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {testResults[configuredModel?.id || ''].message}
                            </div>
                          )}

                          <button
                            onClick={() => configureModel(modelInfo)}
                            className="w-full rounded-md bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          >
                            {t('ai.settings.edit')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => configureModel(modelInfo)}
                        className="w-full rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {t('ai.settings.configureModel')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration Modal */}
          {showConfigModal && configuringModel && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t('ai.settings.configure')} {configuringModel.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.settings.apiKey')} *</label>
                    <input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={t('ai.settings.enterApiKey', { provider: configuringModel.provider })}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.settings.temperature')}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="0"
                      max="2"
                    />
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{t('ai.settings.temperatureDescription')}</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('ai.settings.maxTokens')}</label>
                    <input
                      type="number"
                      value={config.maxTokens}
                      onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="100"
                      max={configuringModel.maxTokens}
                    />
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                      {t('ai.settings.maxTokensDescription', { max: configuringModel.maxTokens.toLocaleString() })}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('ai.settings.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={saveModelConfig}
                    disabled={!config.apiKey.trim() || isSaving}
                    className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>{isSaving ? t('ai.settings.saving') : t('ai.settings.saveConfiguration')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}