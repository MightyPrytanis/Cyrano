/**
 * Cyrano HTTP Bridge - Exposes MCP Server via HTTP
 * 
 * This bridge allows web applications like LexFiat to communicate
 * with the Cyrano MCP server via HTTP instead of stdio.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
console.log('Environment variables loaded:');
console.log('PERPLEXITY_API_KEY exists:', !!process.env.PERPLEXITY_API_KEY);
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
import { Server } from '@modelcontextprotocol/sdk/server/index';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types';

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
    // Return the tools list directly
    const tools = [
      // Legal AI Tools
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
      
      // Arkiver Tools
      extractConversations.getToolDefinition(),
      extractTextContent.getToolDefinition(),
      categorizeWithKeywords.getToolDefinition(),
      processWithRegex.getToolDefinition(),
      generateCategorizedFiles.getToolDefinition(),
      runExtractionPipeline.getToolDefinition(),
      createArkiverConfig.getToolDefinition(),
    ];
    
    res.json({ tools });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tools' });
  }
});

app.post('/mcp/execute', async (req, res) => {
  try {
    const { tool, input } = req.body;
    
    // Execute the tool directly
    let result;
    switch (tool) {
      case 'document_analyzer':
        result = await documentAnalyzer.execute(input);
        break;
      case 'legal_comparator':
        result = await legalComparator.execute(input);
        break;
      case 'good_counsel':
        result = await goodCounsel.execute(input);
        break;
      case 'fact_checker':
        result = await factChecker.execute(input);
        break;
      case 'legal_reviewer':
        result = await legalReviewer.execute(input);
        break;
      case 'compliance_checker':
        result = await complianceChecker.execute(input);
        break;
      case 'quality_assessor':
        result = await qualityAssessor.execute(input);
        break;
      case 'workflow_manager':
        result = await workflowManager.execute(input);
        break;
      case 'case_manager':
        result = await caseManager.execute(input);
        break;
      case 'document_processor':
        result = await documentProcessor.execute(input);
        break;
      case 'ai_orchestrator':
        result = await aiOrchestrator.execute(input);
        break;
      case 'system_status':
        result = await systemStatus.execute(input);
        break;
      case 'extract_conversations':
        result = await extractConversations.execute(input);
        break;
      case 'extract_text_content':
        result = await extractTextContent.execute(input);
        break;
      case 'categorize_with_keywords':
        result = await categorizeWithKeywords.execute(input);
        break;
      case 'process_with_regex':
        result = await processWithRegex.execute(input);
        break;
      case 'generate_categorized_files':
        result = await generateCategorizedFiles.execute(input);
        break;
      case 'run_extraction_pipeline':
        result = await runExtractionPipeline.execute(input);
        break;
      case 'create_arkiver_config':
        result = await createArkiverConfig.execute(input);
        break;
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
    
    res.json(result);
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

// GoodCounsel API endpoint for LexFiat integration
app.get('/api/good-counsel/overview', async (req, res) => {
  try {
    const result = await goodCounsel.execute({});
    const textContent = result.content[0]?.text;
    if (textContent && typeof textContent === 'string') {
      try {
        const parsed = JSON.parse(textContent);
        res.json(parsed);
      } catch (parseError) {
        res.json({ content: textContent });
      }
    } else {
      res.json({ error: 'No content available' });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get GoodCounsel overview',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    tools_count: 18,
    uptime: process.uptime()
  });
});

app.get('/mcp/tools/info', async (req, res) => {
  try {
    const toolsInfo = [
      // Legal AI Tools
      { category: 'Legal AI', ...documentAnalyzer.getToolDefinition() },
      { category: 'Legal AI', ...legalComparator.getToolDefinition() },
      { category: 'Legal AI', ...goodCounsel.getToolDefinition() },
      { category: 'Legal AI', ...factChecker.getToolDefinition() },
      { category: 'Legal AI', ...legalReviewer.getToolDefinition() },
      { category: 'Legal AI', ...complianceChecker.getToolDefinition() },
      { category: 'Legal AI', ...qualityAssessor.getToolDefinition() },
      { category: 'Legal AI', ...workflowManager.getToolDefinition() },
      { category: 'Legal AI', ...caseManager.getToolDefinition() },
      { category: 'Legal AI', ...documentProcessor.getToolDefinition() },
      { category: 'Legal AI', ...aiOrchestrator.getToolDefinition() },
      { category: 'System', ...systemStatus.getToolDefinition() },
      
      // Arkiver Tools
      { category: 'Data Processing', ...extractConversations.getToolDefinition() },
      { category: 'Data Processing', ...extractTextContent.getToolDefinition() },
      { category: 'Data Processing', ...categorizeWithKeywords.getToolDefinition() },
      { category: 'Data Processing', ...processWithRegex.getToolDefinition() },
      { category: 'Data Processing', ...generateCategorizedFiles.getToolDefinition() },
      { category: 'Data Processing', ...runExtractionPipeline.getToolDefinition() },
      { category: 'Data Processing', ...createArkiverConfig.getToolDefinition() },
    ];
    
    res.json({ 
      tools: toolsInfo,
      summary: {
        total_tools: toolsInfo.length,
        legal_ai_tools: toolsInfo.filter(t => t.category === 'Legal AI').length,
        data_processing_tools: toolsInfo.filter(t => t.category === 'Data Processing').length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tools info' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Cyrano MCP HTTP Bridge running on port ${port}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  GET  /mcp/tools - List available tools`);
  console.log(`  GET  /mcp/tools/info - Detailed tool information`);
  console.log(`  POST /mcp/execute - Execute a tool`);
  console.log(`  GET  /mcp/status - Server status`);
});
