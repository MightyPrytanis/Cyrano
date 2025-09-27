import { BaseTool } from './base-tool.js';
import { apiValidator } from '../utils/api-validator.js';

export const systemStatus = new (class extends BaseTool {
  getToolDefinition() {
    return {
      name: 'system_status',
      description: 'Get system status and API configuration information',
      inputSchema: {
        type: 'object',
        properties: {
          include_config_details: {
            type: 'boolean',
            default: false,
            description: 'Include detailed configuration information'
          }
        },
        required: []
      }
    };
  }

  async execute(args: any) {
    try {
      const { include_config_details = false } = args;
      
      const configSummary = apiValidator.getConfigSummary();
      const hasValidProviders = apiValidator.hasAnyValidProviders();
      
      const status = {
        system: {
          name: 'Cyrano MCP Server',
          version: '1.0.0',
          status: 'running',
          timestamp: new Date().toISOString()
        },
        ai_integration: {
          status: hasValidProviders ? 'configured' : 'not_configured',
          available_providers: configSummary.configured,
          missing_providers: configSummary.missing,
          total_providers: configSummary.total,
          functional_ai: hasValidProviders
        },
        tools: {
          total_tools: 10,
          ai_tools: 6,
          data_processing_tools: 4,
          mock_mode: !hasValidProviders
        },
        warnings: [] as string[]
      };

      if (!hasValidProviders) {
        status.warnings.push(
          '⚠️  AI TOOLS OPERATING IN MOCK MODE - No API keys configured',
          'Tools will return simulated responses, not real AI analysis',
          'Configure API keys via environment variables to enable real AI integration'
        );
      }

      if (configSummary.missing.length > 0 && include_config_details) {
        status.warnings.push(
          `Missing API configuration for: ${configSummary.missing.join(', ')}`,
          'Some AI providers will not be available for orchestration'
        );
      }

      return this.createSuccessResult(JSON.stringify(status, null, 2), {
        functional_ai: hasValidProviders,
        configured_providers: configSummary.configured.length,
        total_providers: configSummary.total
      });
    } catch (error) {
      return this.createErrorResult(`System status check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
})();