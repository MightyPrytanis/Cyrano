import { BaseTool } from './base-tool.js';
import { z } from 'zod';
import { apiValidator } from '../utils/api-validator.js';

const AIOrchestratorSchema = z.object({
  task_description: z.string().describe('Description of the task to orchestrate'),
  ai_providers: z.array(z.string()).optional().describe('AI providers to use'),
  orchestration_mode: z.enum(['sequential', 'parallel', 'collaborative']).default('collaborative'),
  parameters: z.record(z.any()).optional().describe('Orchestration parameters'),
});

export const aiOrchestrator = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'ai_orchestrator',
      description: 'Orchestrate multiple AI providers for complex legal tasks',
      inputSchema: {
        type: 'object',
        properties: {
          task_description: {
            type: 'string',
            description: 'Description of the task to orchestrate',
          },
          ai_providers: {
            type: 'array',
            items: { type: 'string' },
            description: 'AI providers to use',
          },
          orchestration_mode: {
            type: 'string',
            enum: ['sequential', 'parallel', 'collaborative'],
            default: 'collaborative',
            description: 'Mode of AI orchestration',
          },
          parameters: {
            type: 'object',
            description: 'Orchestration parameters',
          },
        },
        required: ['task_description'],
      },
    };
  }

  async execute(args: any) {
    try {
      const { task_description, ai_providers, orchestration_mode, parameters } = AIOrchestratorSchema.parse(args);
      
      // Validate API providers before orchestration
      const providersToUse = ai_providers || ['openai', 'anthropic', 'google'];
      const validation = apiValidator.validateAllProviders(providersToUse);
      
      if (!validation.valid) {
        const configSummary = apiValidator.getConfigSummary();
        return this.createErrorResult(
          `AI orchestration failed - API configuration issues:\n` +
          `${validation.errors.join('\n')}\n\n` +
          `Available providers: ${configSummary.configured.join(', ') || 'none'}\n` +
          `Missing providers: ${configSummary.missing.join(', ')}\n\n` +
          `Please configure API keys in environment variables to enable AI integration.`
        );
      }
      
      if (!apiValidator.hasAnyValidProviders()) {
        return this.createErrorResult(
          `No AI providers configured. Please set API keys for at least one provider:\n` +
          `- OPENAI_API_KEY (starts with sk-)\n` +
          `- ANTHROPIC_API_KEY (starts with sk-ant-)\n` +
          `- GEMINI_API_KEY\n` +
          `- PERPLEXITY_API_KEY (starts with pplx-)`
        );
      }
      
      const orchestration = this.orchestrateAI(task_description, orchestration_mode, providersToUse, parameters);
      return this.createSuccessResult(JSON.stringify(orchestration, null, 2));
    } catch (error) {
      return this.createErrorResult(`AI orchestration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public orchestrateAI(task: string, mode: string = 'collaborative', providers?: string[], parameters?: any) {
    return {
      metadata: {
        task_description: task,
        ai_providers: providers || ['claude', 'gpt-4', 'gemini'],
        orchestration_mode: mode,
        timestamp: new Date().toISOString(),
        parameters: parameters || {},
      },
      orchestration_plan: this.createOrchestrationPlan(task, mode, providers),
      execution_status: 'ready',
      estimated_duration: this.estimateDuration(task, mode),
      resource_requirements: this.calculateResourceRequirements(task, providers),
    };
  }

  public createOrchestrationPlan(task: string, mode: string, providers?: string[]): any {
    const availableProviders = providers || ['claude', 'gpt-4', 'gemini'];
    
    switch (mode) {
      case 'sequential':
        return this.createSequentialPlan(task, availableProviders);
      case 'parallel':
        return this.createParallelPlan(task, availableProviders);
      case 'collaborative':
        return this.createCollaborativePlan(task, availableProviders);
      default:
        return this.createCollaborativePlan(task, availableProviders);
    }
  }

  public createSequentialPlan(task: string, providers: string[]): any {
    return {
      mode: 'sequential',
      steps: providers.map((provider, index) => ({
        step: index + 1,
        provider: provider,
        task: this.getProviderTask(task, provider, index),
        dependencies: index > 0 ? [index] : [],
      })),
    };
  }

  public createParallelPlan(task: string, providers: string[]): any {
    return {
      mode: 'parallel',
      steps: providers.map((provider, index) => ({
        step: index + 1,
        provider: provider,
        task: this.getProviderTask(task, provider, index),
        dependencies: [],
        parallel: true,
      })),
    };
  }

  public createCollaborativePlan(task: string, providers: string[]): any {
    return {
      mode: 'collaborative',
      phases: [
        {
          phase: 'analysis',
          providers: providers.slice(0, 2),
          task: `Analyze: ${task}`,
        },
        {
          phase: 'verification',
          providers: providers.slice(1, 3),
          task: `Verify analysis results`,
        },
        {
          phase: 'synthesis',
          providers: providers,
          task: `Synthesize final result`,
        },
      ],
    };
  }

  public getProviderTask(task: string, provider: string, index: number): string {
    const providerTasks: Record<string, string[]> = {
      claude: ['Deep analysis', 'Legal reasoning', 'Compliance checking'],
      'gpt-4': ['Fact checking', 'Research', 'Drafting'],
      gemini: ['Data processing', 'Pattern recognition', 'Quality assessment'],
    };

    const tasks = providerTasks[provider] || ['General processing'];
    return tasks[index % tasks.length];
  }

  public estimateDuration(task: string, mode: string): string {
    const baseMinutes = task.length > 1000 ? 10 : 5;
    
    switch (mode) {
      case 'sequential':
        return `${baseMinutes * 2}-${baseMinutes * 3} minutes`;
      case 'parallel':
        return `${baseMinutes}-${baseMinutes * 2} minutes`;
      case 'collaborative':
        return `${baseMinutes * 1.5}-${baseMinutes * 2.5} minutes`;
      default:
        return `${baseMinutes}-${baseMinutes * 2} minutes`;
    }
  }

  public calculateResourceRequirements(task: string, providers?: string[]): any {
    const providerCount = providers?.length || 3;
    const taskComplexity = this.assessTaskComplexity(task);
    
    return {
      ai_calls_estimated: providerCount * (taskComplexity === 'high' ? 3 : 2),
      processing_time_estimated: taskComplexity === 'high' ? '10-15 minutes' : '5-10 minutes',
      memory_requirements: 'moderate',
      api_quota_usage: 'low',
    };
  }

  public assessTaskComplexity(task: string): string {
    const complexityIndicators = [
      'complex', 'comprehensive', 'detailed', 'thorough', 'extensive',
      'multiple', 'various', 'different', 'several', 'numerous'
    ];
    
    const indicatorCount = complexityIndicators.filter(indicator => 
      task.toLowerCase().includes(indicator)
    ).length;
    
    if (indicatorCount >= 3) return 'high';
    if (indicatorCount >= 1) return 'medium';
    return 'low';
  }
})();
