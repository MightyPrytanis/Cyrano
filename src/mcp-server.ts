#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import tool implementations
import { documentAnalyzer } from './tools/document-analyzer.js';
import { legalComparator } from './tools/legal-comparator.js';
import { factChecker } from './tools/fact-checker.js';
import { legalReviewer } from './tools/legal-reviewer.js';
import { complianceChecker } from './tools/compliance-checker.js';
import { qualityAssessor } from './tools/quality-assessor.js';
import { workflowManager } from './tools/workflow-manager.js';
import { caseManager } from './tools/case-manager.js';
import { documentProcessor } from './tools/document-processor.js';
import { aiOrchestrator } from './tools/ai-orchestrator.js';
import { systemStatus } from './tools/system-status.js';

class CyranoMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'cyrano-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          documentAnalyzer.getToolDefinition(),
          legalComparator.getToolDefinition(),
          factChecker.getToolDefinition(),
          legalReviewer.getToolDefinition(),
          complianceChecker.getToolDefinition(),
          qualityAssessor.getToolDefinition(),
          workflowManager.getToolDefinition(),
          caseManager.getToolDefinition(),
          documentProcessor.getToolDefinition(),
          aiOrchestrator.getToolDefinition(),
          systemStatus.getToolDefinition(),
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: CallToolResult;

        switch (name) {
          case 'document_analyzer':
            result = await documentAnalyzer.execute(args);
            break;
          case 'legal_comparator':
            result = await legalComparator.execute(args);
            break;
          case 'fact_checker':
            result = await factChecker.execute(args);
            break;
          case 'legal_reviewer':
            result = await legalReviewer.execute(args);
            break;
          case 'compliance_checker':
            result = await complianceChecker.execute(args);
            break;
          case 'quality_assessor':
            result = await qualityAssessor.execute(args);
            break;
          case 'workflow_manager':
            result = await workflowManager.execute(args);
            break;
          case 'case_manager':
            result = await caseManager.execute(args);
            break;
          case 'document_processor':
            result = await documentProcessor.execute(args);
            break;
          case 'ai_orchestrator':
            result = await aiOrchestrator.execute(args);
            break;
          case 'system_status':
            result = await systemStatus.execute(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return result;
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Cyrano MCP Server running on stdio');
  }
}

// Export the class for use in other modules
export { CyranoMCPServer };

// Start the server only if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CyranoMCPServer();
  server.run().catch(console.error);
}
