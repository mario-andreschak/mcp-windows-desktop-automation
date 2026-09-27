/**
 * Prompts module for MCP Windows Desktop Automation
 */

import { ToolRegistry as McpServer } from '../server/tools.js';
import { z } from 'zod';
import { log } from '../utils/logger/logger.js';

/**
 * Register all prompts with the MCP server
 */
export function registerAllPrompts(server: McpServer): void {
  // Register window interaction prompts
  registerWindowPrompts(server);
  
  // Register form filling prompts
  registerFormPrompts(server);
  
  // Register automation task prompts
  registerAutomationPrompts(server);
}

/**
 * Register window interaction prompts
 */
function registerWindowPrompts(server: McpServer): void {
  // Prompt for finding and interacting with a window
  server.prompt(
    'findWindow',
    {
      windowTitle: z.string().max(65535).describe('Title or partial title of the window to find'),
      action: z.enum(['activate', 'close', 'minimize', 'maximize']).describe('Action to perform on the window')
    },
    ({ windowTitle, action }) => {
      log.verbose('findWindow prompt called', { windowTitle, action });
      
      let actionDescription: string;
      switch (action) {
        case 'activate':
          actionDescription = 'activate (bring to front)';
          break;
        case 'close':
          actionDescription = 'close';
          break;
        case 'minimize':
          actionDescription = 'minimize';
          break;
        case 'maximize':
          actionDescription = 'maximize';
          break;
      }
      
      return {
        description: `Find a window with title "${windowTitle}" and ${actionDescription} it`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to find a window with the title "${windowTitle}" and ${actionDescription} it. Can you help me with the steps to do this using the available desktop tools?`
            }
          }
        ]
      };
    }
  );
  
  // Prompt for getting information about a window
  server.prompt(
    'windowInfo',
    {
      windowTitle: z.string().max(65535).describe('Title or partial title of the window')
    },
    ({ windowTitle }) => {
      log.verbose('windowInfo prompt called', { windowTitle });
      
      return {
        description: `Get information about a window with title "${windowTitle}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to get information about a window with the title "${windowTitle}". Can you help me retrieve details like its position, size, state, and text content using the available desktop tools?`
            }
          }
        ]
      };
    }
  );
}

/**
 * Register form filling prompts
 */
function registerFormPrompts(server: McpServer): void {
  // Prompt for filling out a form
  server.prompt(
    'fillForm',
    {
      windowTitle: z.string().max(65535).describe('Title of the window containing the form'),
      formFields: z.string().max(65535).describe('Description of form fields and values to fill in')
    },
    ({ windowTitle, formFields }) => {
      log.verbose('fillForm prompt called', { windowTitle, formFields });
      
      return {
        description: `Fill out a form in window "${windowTitle}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to fill out a form in a window with the title "${windowTitle}". The form has the following fields that need to be filled:\n\n${formFields}\n\nCan you help me automate filling out this form using the available desktop tools?`
            }
          }
        ]
      };
    }
  );
  
  // Prompt for submitting a form
  server.prompt(
    'submitForm',
    {
      windowTitle: z.string().max(65535).describe('Title of the window containing the form'),
      submitButtonText: z.string().max(65535).describe('Text on the submit button')
    },
    ({ windowTitle, submitButtonText }) => {
      log.verbose('submitForm prompt called', { windowTitle, submitButtonText });
      
      return {
        description: `Submit a form in window "${windowTitle}"`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to submit a form in a window with the title "${windowTitle}" by clicking the "${submitButtonText}" button. Can you help me automate this using the available desktop tools?`
            }
          }
        ]
      };
    }
  );
}

/**
 * Register automation task prompts
 */
function registerAutomationPrompts(server: McpServer): void {
  // Prompt for automating a repetitive task
  server.prompt(
    'automateTask',
    {
      taskDescription: z.string().max(65535).describe('Description of the repetitive task to automate'),
      repetitions: z.string().max(65535).describe('Number of times to repeat the task')
    },
    ({ taskDescription, repetitions }) => {
      log.verbose('automateTask prompt called', { taskDescription, repetitions });
      
      return {
        description: `Automate a repetitive task: ${taskDescription}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to automate the following repetitive task ${repetitions} times:\n\n${taskDescription}\n\nCan you help me create an automation script using AutoIt functions to accomplish this?`
            }
          }
        ]
      };
    }
  );
  
  // Prompt for monitoring a window or process
  server.prompt(
    'monitorWindow',
    {
      windowTitle: z.string().max(65535).describe('Title of the window to monitor'),
      condition: z.string().max(65535).describe('Condition to monitor for (e.g., "appears", "disappears", "contains text X")')
    },
    ({ windowTitle, condition }) => {
      log.verbose('monitorWindow prompt called', { windowTitle, condition });
      
      return {
        description: `Monitor window "${windowTitle}" for condition: ${condition}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I need to monitor a window with the title "${windowTitle}" and wait until the following condition is met: ${condition}. Can you help me create an automation script using AutoIt functions to accomplish this?`
            }
          }
        ]
      };
    }
  );
  
  // Prompt for taking a screenshot
  server.prompt(
    'takeScreenshot',
    {
      target: z.enum(['fullscreen', 'window', 'region']).describe('What to capture in the screenshot'),
      windowTitle: z.string().max(65535).optional().describe('Title of the window to capture (if target is "window")')
    },
    ({ target, windowTitle }) => {
      log.verbose('takeScreenshot prompt called', { target, windowTitle });
      
      let promptText: string;
      if (target === 'fullscreen') {
        promptText = 'I need to take an actual PNG screenshot with the takeScreenshot tool of the entire screen.';
      } else if (target === 'window' && windowTitle) {
        promptText = `I need to take an actual PNG screenshot with the takeScreenshot tool of a window with the title "${windowTitle}".`;
      } else if (target === 'region') {
        promptText = 'I need to take an actual PNG screenshot with the takeScreenshot tool of a specific region of the screen.';
      } else {
        promptText = 'I need to take an actual PNG screenshot with the takeScreenshot tool.';
      }
      
      return {
        description: `Take a screenshot of ${target === 'window' ? `window "${windowTitle}"` : target}`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `${promptText} Can you help me do this using the available desktop tools?`
            }
          }
        ]
      };
    }
  );
}
