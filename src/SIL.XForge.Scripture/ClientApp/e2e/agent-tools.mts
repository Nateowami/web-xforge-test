#!/usr/bin/env -S deno run --allow-all
/**
 * MCP (Model Context Protocol) server that gives AI agents a set of Playwright-based tools
 * for interacting with and inspecting a running Scripture Forge web application.
 *
 * Capabilities:
 *  - start_session  – launch a Chromium browser and log in with a secrets.json user
 *  - navigate       – go to a URL
 *  - snapshot       – get the ARIA accessibility tree (lets the agent "see" the page)
 *  - screenshot     – capture a PNG (base64) of the current viewport
 *  - click          – click an element identified by a Playwright selector
 *  - fill           – type text into a form field
 *  - press_key      – send a keyboard key press (e.g. "Enter", "Tab")
 *  - test_selector  – count and preview elements matching a Playwright selector
 *  - evaluate       – run arbitrary JavaScript in the page context
 *  - get_url        – return the current page URL
 *  - close_session  – close the browser
 *
 * Usage (after ensuring a local Scripture Forge instance is running):
 *   deno run --allow-all agent-tools.mts
 *
 * Configuration is done via a .vscode/mcp.json file so VS Code / GitHub Copilot
 * can discover and start the server automatically.
 *
 * Note: All diagnostic output is written to stderr so that stdout remains clean
 * for the JSON-RPC MCP protocol.
 */

import { encodeBase64 } from 'jsr:@std/encoding/base64';
import { Server } from 'npm:@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from 'npm:@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from 'npm:@modelcontextprotocol/sdk/types.js';
import { Browser, BrowserContext, chromium, Page } from 'npm:playwright';
import { logInAsPTUser } from './pt-login.ts';
import secrets from './secrets.json' with { type: 'json' };

// ---------------------------------------------------------------------------
// Browser session state (lazily initialized by start_session)
// ---------------------------------------------------------------------------

/** The active Playwright browser instance, or null if no session has started. */
let browser: Browser | null = null;

/** The active browser context, or null if no session has started. */
let browserContext: BrowserContext | null = null;

/** The active page, or null if no session has started. */
let page: Page | null = null;

/**
 * Returns the active page, throwing a descriptive error if no session is open.
 * All tools that require a browser session should call this helper.
 */
function requirePage(): Page {
  if (page == null) {
    throw new Error('No active browser session. Call start_session first.');
  }
  return page;
}

/**
 * Formats an accessibility snapshot tree into a human-readable indented string.
 * This is used by the snapshot tool to give agents a text representation of the page.
 */
function formatAriaNode(node: Record<string, unknown>, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const role = String(node['role'] ?? '');
  const name = node['name'] != null ? ` "${node['name']}"` : '';
  const value = node['value'] != null ? ` = ${node['value']}` : '';
  const checked = node['checked'] != null ? ` [checked=${node['checked']}]` : '';
  const level = node['level'] != null ? ` [level=${node['level']}]` : '';
  let line = `${prefix}${role}${name}${value}${checked}${level}`;

  const children = node['children'] as Record<string, unknown>[] | undefined;
  if (children != null && children.length > 0) {
    const childLines = children.map(child => formatAriaNode(child, indent + 1)).join('\n');
    line = `${line}\n${childLines}`;
  }
  return line;
}

// ---------------------------------------------------------------------------
// MCP server definition
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'scripture-forge-agent-tools', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ---------------------------------------------------------------------------
// Tool list
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'start_session',
      description:
        'Launch a Chromium browser, navigate to the application, and log in as a user from secrets.json. ' +
        'Must be called before any other tool. The browser window is visible so the agent can observe it.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          userIndex: {
            type: 'number',
            description: 'Index into the secrets.json users array (default: 0).',
          },
          rootUrl: {
            type: 'string',
            description: 'Application root URL (default: http://localhost:5000).',
          },
          headless: {
            type: 'boolean',
            description: 'Run the browser in headless mode (default: false).',
          },
        },
      },
    },
    {
      name: 'navigate',
      description: 'Navigate the current page to the given URL and wait for the page to load.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          url: { type: 'string', description: 'The URL to navigate to.' },
        },
        required: ['url'],
      },
    },
    {
      name: 'snapshot',
      description:
        'Return the ARIA accessibility tree of the current page as text. ' +
        'This is the primary way for an agent to "see" the page content and structure.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'screenshot',
      description: 'Take a screenshot of the current viewport and return it as a base64-encoded PNG.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'click',
      description:
        'Click an element identified by a Playwright selector. ' +
        'For example: "button:has-text(\\"Submit\\")", ".my-class", "[role=\'button\']".',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: { type: 'string', description: 'Playwright selector string.' },
        },
        required: ['selector'],
      },
    },
    {
      name: 'fill',
      description: 'Clear and fill a form field identified by a Playwright selector.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: { type: 'string', description: 'Playwright selector string.' },
          value: { type: 'string', description: 'Text to type into the field.' },
        },
        required: ['selector', 'value'],
      },
    },
    {
      name: 'press_key',
      description:
        'Send a keyboard key press to the currently focused element. ' +
        'Examples: "Enter", "Tab", "Escape", "ArrowDown", "Control+A".',
      inputSchema: {
        type: 'object' as const,
        properties: {
          key: { type: 'string', description: 'Key name as understood by Playwright (e.g. "Enter").' },
        },
        required: ['key'],
      },
    },
    {
      name: 'test_selector',
      description:
        'Test whether a Playwright selector matches any elements on the current page. ' +
        'Returns the number of matching elements and a preview of their text content. ' +
        'Useful for verifying selectors while writing or fixing e2e tests.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: {
            type: 'string',
            description:
              'Playwright selector to test. Examples: "button:has-text(\\"Submit\\")", ".user-connected-project", "[data-testid=\'my-element\']".',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of matching elements to preview (default: 5).',
          },
        },
        required: ['selector'],
      },
    },
    {
      name: 'evaluate',
      description:
        'Execute a JavaScript expression in the page context and return the result as JSON. ' +
        'The expression must be a single expression (not a statement), e.g. "document.title". ' +
        'Note: This tool executes code directly in the browser and is intended for development/testing use only.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          expression: { type: 'string', description: 'JavaScript expression to evaluate.' },
        },
        required: ['expression'],
      },
    },
    {
      name: 'get_url',
      description: 'Return the URL of the current page.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'close_session',
      description: 'Close the browser and end the session.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
  ],
}));

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      // -----------------------------------------------------------------------
      case 'start_session': {
        // Close any existing session first
        if (browser != null) {
          await browser.close();
          browser = null;
          browserContext = null;
          page = null;
        }

        const userIndex = (args['userIndex'] as number | undefined) ?? 0;
        const rootUrl = (args['rootUrl'] as string | undefined) ?? 'http://localhost:5000';
        const headless = (args['headless'] as boolean | undefined) ?? false;

        const user = secrets.users[userIndex];
        if (user == null) {
          throw new Error(
            `No user at index ${userIndex} in secrets.json. Available indices: 0–${secrets.users.length - 1}.`
          );
        }

        console.error(`[agent-tools] Launching browser (headless=${headless}) and logging in as ${user.email}`);

        browser = await chromium.launch({ headless });
        browserContext = await browser.newContext();
        page = await browserContext.newPage();

        await logInAsPTUser(page, user, rootUrl);

        const currentUrl: string = page.url();
        return {
          content: [
            {
              type: 'text',
              text: `Session started. Logged in as ${user.email}. Current URL: ${currentUrl}`,
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'navigate': {
        const activePage = requirePage();
        const url = args['url'] as string;
        await activePage.goto(url);
        return {
          content: [
            {
              type: 'text',
              text: `Navigated to ${activePage.url()} — title: "${await activePage.title()}"`,
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'snapshot': {
        const activePage = requirePage();
        // Use the newer ariaSnapshot API when available (Playwright ≥ 1.35),
        // falling back to the legacy accessibility.snapshot().
        let snapshotText: string;
        const pageWithAriaSnapshot = activePage as unknown as { ariaSnapshot?: () => Promise<string> };
        if (typeof pageWithAriaSnapshot.ariaSnapshot === 'function') {
          snapshotText = await pageWithAriaSnapshot.ariaSnapshot();
        } else {
          const tree = await activePage.accessibility.snapshot();
          snapshotText = tree != null ? formatAriaNode(tree as Record<string, unknown>) : '(empty accessibility tree)';
        }
        return { content: [{ type: 'text', text: snapshotText }] };
      }

      // -----------------------------------------------------------------------
      case 'screenshot': {
        const activePage = requirePage();
        const buffer = await activePage.screenshot({ type: 'png' });
        const base64 = encodeBase64(buffer);
        return { content: [{ type: 'image', data: base64, mimeType: 'image/png' }] };
      }

      // -----------------------------------------------------------------------
      case 'click': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        await activePage.locator(selector).click();
        return { content: [{ type: 'text', text: `Clicked "${selector}".` }] };
      }

      // -----------------------------------------------------------------------
      case 'fill': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        const value = args['value'] as string;
        await activePage.locator(selector).fill(value);
        return { content: [{ type: 'text', text: `Filled "${selector}" with value.` }] };
      }

      // -----------------------------------------------------------------------
      case 'press_key': {
        const activePage = requirePage();
        const key = args['key'] as string;
        await activePage.keyboard.press(key);
        return { content: [{ type: 'text', text: `Pressed key "${key}".` }] };
      }

      // -----------------------------------------------------------------------
      case 'test_selector': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        const limit = (args['limit'] as number | undefined) ?? 5;

        const locator = activePage.locator(selector);
        const count = await locator.count();

        if (count === 0) {
          return {
            content: [{ type: 'text', text: `Selector "${selector}" matched 0 elements.` }],
          };
        }

        // Collect text and HTML for up to `limit` elements
        const previews: string[] = [];
        const previewCount = Math.min(count, limit);
        for (let i = 0; i < previewCount; i++) {
          const el = locator.nth(i);
          const text = (await el.textContent())?.trim() ?? '';
          const tagName = await el.evaluate((node: Element) => node.tagName.toLowerCase());
          const truncated = text.length > 120 ? `${text.slice(0, 120)}…` : text;
          previews.push(`  [${i}] <${tagName}> ${truncated != '' ? `"${truncated}"` : '(no text)'}`);
        }

        const more = count > limit ? `\n  … and ${count - limit} more` : '';
        return {
          content: [
            {
              type: 'text',
              text: `Selector "${selector}" matched ${count} element(s):\n${previews.join('\n')}${more}`,
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      case 'evaluate': {
        const activePage = requirePage();
        const expression = args['expression'] as string;
        // eslint-disable-next-line no-eval -- intentional: the user supplies the expression
        const result: unknown = await activePage.evaluate(expression);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      // -----------------------------------------------------------------------
      case 'get_url': {
        const activePage = requirePage();
        return { content: [{ type: 'text', text: activePage.url() }] };
      }

      // -----------------------------------------------------------------------
      case 'close_session': {
        if (browser != null) {
          await browser.close();
          browser = null;
          browserContext = null;
          page = null;
          return { content: [{ type: 'text', text: 'Browser session closed.' }] };
        }
        return { content: [{ type: 'text', text: 'No active session to close.' }] };
      }

      // -----------------------------------------------------------------------
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Connect to the MCP host via stdin/stdout
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[agent-tools] MCP server started and ready.');
