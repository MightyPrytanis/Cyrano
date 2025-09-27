/**
 * Cyrano HTTP Bridge - Exposes MCP Server via HTTP
 * 
 * This bridge allows web applications like LexFiat to communicate
 * with the Cyrano MCP server via HTTP instead of stdio.
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

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

// Import Arkiver tools
import {
  extractConversations,
  extractTextContent,
  categorizeWithKeywords,
  processWithRegex,
  generateCategorizedFiles,
  runExtractionPipeline,
  createArkiverConfig
} from './tools/arkiver-tools.js';

const app = express();
const port = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// MCP Server instance
const mcpServer = new Server(
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

// Setup MCP server handlers
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // Legal AI Tools
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
      
      // Arkiver Data Extraction Tools
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

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: CallToolResult;

        switch (name) {
          // Legal AI Tools
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
            
          // Arkiver Data Extraction Tools
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

// HTTP Routes
app.get('/mcp/tools', async (req, res) => {
  try {
    const response = await mcpServer.request(
      { method: 'tools/list' },
      { method: 'tools/list', params: {} }
    );
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tools' });
  }
});

app.post('/mcp/execute', async (req, res) => {
  try {
    const { tool, input } = req.body;
    const response = await mcpServer.request(
      { method: 'tools/call' },
      { 
        method: 'tools/call', 
        params: { 
          name: tool, 
          arguments: input 
        } 
      }
    );
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/mcp/status', (req, res) => {
  res.json({ status: 'running', server: 'cyrano-mcp-http-bridge' });
});

// Start server
app.listen(port, () => {
  console.log(`Cyrano MCP HTTP Bridge running on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /mcp/tools - List available tools`);
  console.log(`  POST /mcp/execute - Execute a tool`);
  console.log(`  GET  /mcp/status - Server status`);
});
