import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export abstract class BaseTool {
  abstract getToolDefinition(): any;
  abstract execute(args: any): Promise<CallToolResult>;

  createErrorResult(message: string): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }

  createSuccessResult(content: string, metadata?: any): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: content,
        },
      ],
      metadata,
    };
  }
}
