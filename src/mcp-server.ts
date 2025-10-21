#!/usr/bin/env node

/*
Copyright 2025 Cognisint LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
import { goodCounsel } from './tools/goodcounsel.js';
import { factChecker } from './tools/fact-checker.js';
import { legalReviewer } from './tools/legal-reviewer.js';
import { complianceChecker } from './tools/compliance-checker.js';
import { qualityAssessor } from './tools/quality-assessor.js';
import { workflowManager } from './tools/workflow-manager.js';
import { caseManager } from './tools/case-manager.js';
import { documentProcessor } from './tools/document-processor.js';
import { aiOrchestrator } from './tools/ai-orchestrator.js';
import { systemStatus } from './tools/system-status.js';
import { authTool } from './tools/auth.js';  // Add auth tool import
import { syncManager } from './tools/sync-manager.js';
import { redFlagFinder } from './tools/red-flag-finder.js';
import { clioIntegration } from './tools/clio-integration.js';
import {
  extractConversations,
  extractTextContent,
  categorizeWithKeywords,
  processWithRegex,
  generateCategorizedFiles,
  runExtractionPipeline,
  createArkiverConfig
} from './tools/arkiver-tools.js';

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
          authTool.getToolDefinition(),  // Add auth tool first
          documentAnalyzer.getToolDefinition(),
          legalComparator.getToolDefinition(),
          goodCounsel.getToolDefinition(),
          factChecker.getToolDefinition(),
          legalReviewer.getToolDefinition(),
          complianceChecker.getToolDefinition(),
          qualityAssessor.getToolDefinition(),
          workflowManager.getToolDefinition(),
          caseManager.getToolDefinition(),
          documentProcessor.getToolDefinition(),
          aiOrchestrator.getToolDefinition(),
          systemStatus.getToolDefinition(),
          syncManager.getToolDefinition(),
          redFlagFinder.getToolDefinition(),
          clioIntegration.getToolDefinition(),
          extractConversations.getToolDefinition(),
          extractTextContent.getToolDefinition(),
          categorizeWithKeywords.getToolDefinition(),
          processWithRegex.getToolDefinition(),
          generateCategorizedFiles.getToolDefinition(),
          runExtractionPipeline.getToolDefinition(),
          createArkiverConfig.getToolDefinition(),
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: CallToolResult;

        switch (name) {
          case 'auth':  // Add auth tool case
            result = await authTool.execute(args);
            break;
          case 'document_analyzer':
            result = await documentAnalyzer.execute(args);
            break;
          case 'legal_comparator':
            result = await legalComparator.execute(args);
            break;
          case 'good_counsel':
            result = await goodCounsel.execute(args);
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
        case 'sync_manager':
          result = await syncManager.execute(args);
          break;
        case 'red_flag_finder':
          result = await redFlagFinder.execute(args);
          break;
        case 'clio_integration':
          result = await clioIntegration.execute(args);
          break;
          case 'extract_conversations':
            result = await extractConversations.execute(args);
            break;
          case 'extract_text_content':
            result = await extractTextContent.execute(args);
            break;
          case 'categorize_with_keywords':
            result = await categorizeWithKeywords.execute(args);
            break;
          case 'process_with_regex':
            result = await processWithRegex.execute(args);
            break;
          case 'generate_categorized_files':
            result = await generateCategorizedFiles.execute(args);
            break;
          case 'run_extraction_pipeline':
            result = await runExtractionPipeline.execute(args);
            break;
          case 'create_arkiver_config':
            result = await createArkiverConfig.execute(args);
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
