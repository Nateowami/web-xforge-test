#!/usr/bin/env -S deno run --allow-all
/**
 * MCP (Model Context Protocol) server that gives AI agents a set of Playwright-based tools
 * for interacting with and inspecting a running Scripture Forge web application.
 *
 * Capabilities:
 *  - start_session          – launch a Chromium browser and log in with a secrets.json user
 *  - navigate               – go to a URL
 *  - snapshot               – get the ARIA accessibility tree (lets the agent "see" the page)
 *  - screenshot             – capture a PNG (base64) of the current viewport
 *  - get_interactive_elements – enumerate visible interactive elements with ready-to-use selectors
 *  - click                  – click an element identified by a Playwright selector
 *  - fill                   – type text into a form field
 *  - press_key              – send a keyboard key press (e.g. "Enter", "Tab")
 *  - select_option          – choose an option in a <select> or ARIA combobox
 *  - get_text               – read the visible text content of an element
 *  - get_value              – read the current value of a form input/textarea/select
 *  - wait_for_url           – wait until the page URL matches a string or pattern
 *  - wait_for_selector      – wait until an element matching a selector appears
 *  - test_selector          – count and preview elements matching a Playwright selector
 *  - evaluate               – run arbitrary JavaScript in the page context
 *  - get_url                – return the current page URL
 *  - close_session          – close the browser
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
      name: 'get_interactive_elements',
      description:
        'Enumerate all visible interactive elements on the current page. ' +
        'For each element this tool (1) injects a temporary "data-sf-agent-ref" attribute so the element ' +
        'can be addressed immediately as [data-sf-agent-ref="N"], and (2) generates a stable selector ' +
        'based on data-testid / id / aria-label / role+name / placeholder / name attribute. ' +
        'Call this tool whenever you are unsure which selector to use — it will give you two ready-to-use ' +
        'selectors per element so you can avoid trial-and-error. ' +
        'Ref attributes are valid until the next navigation or another call to get_interactive_elements.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          parent: {
            type: 'string',
            description:
              'Optional CSS selector to restrict enumeration to a subtree (e.g. "mat-dialog-container"). ' +
              'Useful when many elements are present and you only care about those inside a dialog/panel.',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of elements to return (default: 50).',
          },
        },
      },
    },
    {
      name: 'select_option',
      description:
        'Choose an option in a <select> element or an ARIA combobox by visible text, value, or label.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: { type: 'string', description: 'Playwright selector for the select/combobox element.' },
          value: {
            type: 'string',
            description: 'Option to select — matched against visible text, value attribute, or label.',
          },
        },
        required: ['selector', 'value'],
      },
    },
    {
      name: 'get_text',
      description: 'Return the visible text content of an element. Useful for reading current state.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: { type: 'string', description: 'Playwright selector string.' },
        },
        required: ['selector'],
      },
    },
    {
      name: 'get_value',
      description: 'Return the current value of a form input, textarea, or select element.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: { type: 'string', description: 'Playwright selector string.' },
        },
        required: ['selector'],
      },
    },
    {
      name: 'wait_for_url',
      description:
        'Wait until the page URL contains the given string (or matches the given glob/regex pattern). ' +
        'Use this after triggering a navigation to confirm the app has moved to the expected page.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          url: {
            type: 'string',
            description:
              'URL substring, glob pattern (e.g. "**/projects/**"), or /regex/ string to match against.',
          },
          timeout: {
            type: 'number',
            description: 'Maximum wait time in milliseconds (default: 15000).',
          },
        },
        required: ['url'],
      },
    },
    {
      name: 'wait_for_selector',
      description:
        'Wait until an element matching the selector is visible in the DOM. ' +
        'Use this after triggering an async operation (save, connect, dialog open, etc.).',
      inputSchema: {
        type: 'object' as const,
        properties: {
          selector: { type: 'string', description: 'Playwright selector string.' },
          timeout: {
            type: 'number',
            description: 'Maximum wait time in milliseconds (default: 15000).',
          },
        },
        required: ['selector'],
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
        const pageAsAriaSnapshotCapable = activePage as unknown as { ariaSnapshot?: () => Promise<string> };
        if (typeof pageAsAriaSnapshotCapable.ariaSnapshot === 'function') {
          snapshotText = await pageAsAriaSnapshotCapable.ariaSnapshot();
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
      case 'get_interactive_elements': {
        const activePage = requirePage();
        const parentSelector = (args['parent'] as string | undefined) ?? null;
        const maxCount = (args['limit'] as number | undefined) ?? 50;

        // Run entirely in the browser context so we have access to the live DOM.
        type ElementData = {
          ref: number;
          tag: string;
          role: string;
          displayName: string | null;
          text: string | null;
          value: string | null;
          checked: boolean | null;
          placeholder: string | null;
          disabled: boolean;
          stableSelector: string | null;
          playwrightApi: string | null;
        };

        const elements = await activePage.evaluate(
          ({ parentSel, max }) => {
            // Remove any ref attributes from a previous call.
            document.querySelectorAll('[data-sf-agent-ref]').forEach(el => el.removeAttribute('data-sf-agent-ref'));

            // Resolve the root element. Return null as a sentinel if a parent selector was
            // provided but did not match any element on the current page.
            let root: Element;
            if (parentSel != null) {
              const found = document.querySelector(parentSel);
              if (found == null) return null;
              root = found;
            } else {
              root = document.body;
            }

            const interactiveQuery = [
              'a[href]',
              'button',
              'input:not([type="hidden"])',
              'select',
              'textarea',
              '[role="button"]',
              '[role="link"]',
              '[role="menuitem"]',
              '[role="checkbox"]',
              '[role="radio"]',
              '[role="tab"]',
              '[role="combobox"]',
              '[role="option"]',
              '[role="switch"]',
              '[role="treeitem"]',
            ].join(', ');

            const seen = new Set<Element>();
            const results: ElementData[] = [];
            let refCounter = 0;

            for (const el of Array.from(root.querySelectorAll(interactiveQuery))) {
              if (results.length >= max) break;
              if (seen.has(el)) continue;
              seen.add(el);

              // Skip invisible elements.
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
              const rect = el.getBoundingClientRect();
              if (rect.width === 0 && rect.height === 0) continue;

              const tag = el.tagName.toLowerCase();
              const id = (el as HTMLElement).id || null;
              const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id') || null;
              const nameAttr = el.getAttribute('name') || null;
              const typeAttr = el.getAttribute('type') || null;
              const placeholder = el.getAttribute('placeholder') || null;
              const ariaLabel = el.getAttribute('aria-label') || null;
              const explicitRole = el.getAttribute('role') || null;
              const disabledAttr =
                (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';

              // Visible text content (trimmed, collapsed whitespace, limited length).
              const rawText = el.textContent ?? '';
              const text = rawText.trim().replace(/\s+/g, ' ').slice(0, 80) || null;

              // Current value / checked state for form controls.
              let value: string | null = null;
              let checked: boolean | null = null;
              if (el instanceof HTMLInputElement) {
                if (el.type === 'checkbox' || el.type === 'radio') {
                  checked = el.checked;
                } else {
                  value = el.value || null;
                }
              } else if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
                value = el.value || null;
              }

              // Compute accessible name (aria-label > aria-labelledby > <label for> > wrapping <label>).
              let accessibleName: string | null = ariaLabel;
              if (accessibleName == null) {
                const labelledBy = el.getAttribute('aria-labelledby');
                if (labelledBy != null) {
                  accessibleName =
                    labelledBy
                      .split(/\s+/)
                      .map(lbId => document.getElementById(lbId)?.textContent?.trim())
                      .filter(Boolean)
                      .join(' ') || null;
                }
              }
              if (accessibleName == null && id != null) {
                const labelEl = document.querySelector(`label[for="${id}"]`);
                if (labelEl != null) accessibleName = (labelEl.textContent ?? '').trim() || null;
              }
              if (accessibleName == null) {
                const closestLabel = el.closest('label');
                if (closestLabel != null) {
                  accessibleName = (closestLabel.textContent ?? '').trim().replace(/\s+/g, ' ') || null;
                }
              }
              const displayName = accessibleName ?? (text != null && text.length <= 60 ? text : null);

              // Effective ARIA role.
              const tagRoleMap: Record<string, string> = {
                a: 'link',
                button: 'button',
                select: 'combobox',
                textarea: 'textbox',
              };
              let role = explicitRole ?? tagRoleMap[tag];
              if (tag === 'input') {
                const t = (typeAttr ?? 'text').toLowerCase();
                if (t === 'checkbox') role = 'checkbox';
                else if (t === 'radio') role = 'radio';
                else if (t === 'button' || t === 'submit' || t === 'reset') role = 'button';
                else role = 'textbox';
              }
              if (role == null) role = tag;

              // Inject ref attribute so the element can be addressed reliably.
              const ref = refCounter++;
              el.setAttribute('data-sf-agent-ref', String(ref));

              // Generate the best stable selector for e2e tests.
              let stableSelector: string | null = null;
              let playwrightApi: string | null = null;

              if (testId != null) {
                stableSelector = `[data-testid="${testId}"]`;
                playwrightApi = `getByTestId('${testId}')`;
              } else if (id != null && id.length > 0 && !/^(mat-|ng-|cdk-|mdc-)/.test(id)) {
                // Only use hand-written IDs, not framework-generated ones.
                stableSelector = `#${id}`;
                playwrightApi = `locator('#${id}')`;
              } else if (ariaLabel != null) {
                const esc = ariaLabel.replace(/'/g, "\\'");
                if (role === 'textbox' || role === 'combobox') {
                  stableSelector = `[aria-label="${ariaLabel}"]`;
                  playwrightApi = `getByLabel('${esc}')`;
                } else {
                  stableSelector = `[aria-label="${ariaLabel}"]`;
                  playwrightApi = `getByRole('${role}', { name: '${esc}' })`;
                }
              } else if (accessibleName != null && (role === 'button' || role === 'link' || role === 'menuitem' || role === 'tab')) {
                const short = accessibleName.slice(0, 50);
                const esc = short.replace(/'/g, "\\'");
                stableSelector = `${tag}:has-text("${short}")`;
                playwrightApi = `getByRole('${role}', { name: '${esc}' })`;
              } else if (placeholder != null) {
                stableSelector = `[placeholder="${placeholder}"]`;
                playwrightApi = `getByPlaceholder('${placeholder.replace(/'/g, "\\'")}')`;
              } else if (nameAttr != null) {
                stableSelector = `${tag}[name="${nameAttr}"]`;
                playwrightApi = `locator('${tag}[name="${nameAttr}"]')`;
              } else if (accessibleName != null) {
                const short = accessibleName.slice(0, 50);
                const esc = short.replace(/'/g, "\\'");
                stableSelector = `${tag}:has-text("${short}")`;
                playwrightApi = `getByRole('${role}', { name: '${esc}' })`;
              } else if (text != null) {
                const short = text.slice(0, 50);
                stableSelector = `${tag}:has-text("${short}")`;
                playwrightApi = `getByText('${short.replace(/'/g, "\\'")}')`;
              }

              results.push({
                ref,
                tag,
                role,
                displayName,
                text,
                value,
                checked,
                placeholder,
                disabled: disabledAttr,
                stableSelector,
                playwrightApi,
              });
            }

            return results;
          },
          { parentSel: parentSelector, max: maxCount }
        );

        if (elements == null) {
          return {
            content: [{ type: 'text', text: `Parent selector "${parentSelector}" not found on this page.` }],
          };
        }

        if (elements.length === 0) {
          const scope = parentSelector != null ? ` inside "${parentSelector}"` : '';
          return { content: [{ type: 'text', text: `No visible interactive elements found${scope}.` }] };
        }

        // Format the output so agents can read it at a glance.
        const scopeNote = parentSelector != null ? ` inside "${parentSelector}"` : '';
        const limitNote = elements.length === maxCount ? ` (showing first ${maxCount}; use "parent" or "limit" to narrow)` : '';
        let output = `Interactive elements${scopeNote} — ${elements.length} found${limitNote}:\n`;
        output +=
          '\nTip: use the "ref selector" immediately (it is injected into the DOM), or the\n' +
          '"stable selector" when writing e2e tests that need to survive re-renders.\n\n';

        for (const el of elements) {
          const label = el.displayName ?? el.text ?? '(unnamed)';
          const disabledStr = el.disabled ? ' [DISABLED]' : '';
          const stateStr =
            el.checked != null
              ? ` [${el.checked ? 'checked' : 'unchecked'}]`
              : el.value != null && el.value !== ''
                ? ` value="${el.value}"`
                : '';

          output += `[ref=${el.ref}]  ${el.role}  "${label}"${disabledStr}${stateStr}\n`;
          output += `  ref selector:    [data-sf-agent-ref="${el.ref}"]\n`;
          if (el.stableSelector != null) {
            output += `  stable selector: ${el.stableSelector}\n`;
          }
          if (el.playwrightApi != null) {
            output += `  playwright api:  page.${el.playwrightApi}\n`;
          }
          output += '\n';
        }

        return { content: [{ type: 'text', text: output }] };
      }

      // -----------------------------------------------------------------------
      case 'select_option': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        const value = args['value'] as string;
        await activePage.locator(selector).selectOption(value);
        return { content: [{ type: 'text', text: `Selected option "${value}" in "${selector}".` }] };
      }

      // -----------------------------------------------------------------------
      case 'get_text': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        const text = await activePage.locator(selector).textContent();
        return { content: [{ type: 'text', text: text != null ? text.trim() : '(element has no text content)' }] };
      }

      // -----------------------------------------------------------------------
      case 'get_value': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        const value = await activePage.locator(selector).inputValue();
        return { content: [{ type: 'text', text: value }] };
      }

      // -----------------------------------------------------------------------
      case 'wait_for_url': {
        const activePage = requirePage();
        const urlPattern = args['url'] as string;
        const timeout = (args['timeout'] as number | undefined) ?? 15_000;

        // Support /regex/ syntax, glob patterns, and plain substrings.
        const regexMatch = /^\/(.+)\/([gimsuy]*)$/.exec(urlPattern);
        if (regexMatch != null) {
          const pattern = new RegExp(regexMatch[1], regexMatch[2]);
          await activePage.waitForURL(pattern, { timeout });
        } else if (urlPattern.includes('*') || urlPattern.includes('?') || urlPattern.includes('{')) {
          // Treat as a glob pattern.
          await activePage.waitForURL(urlPattern, { timeout });
        } else {
          // Treat as a substring — wrap in a glob.
          await activePage.waitForURL(url => url.href.includes(urlPattern), { timeout });
        }

        return { content: [{ type: 'text', text: `URL matched. Current URL: ${activePage.url()}` }] };
      }

      // -----------------------------------------------------------------------
      case 'wait_for_selector': {
        const activePage = requirePage();
        const selector = args['selector'] as string;
        const timeout = (args['timeout'] as number | undefined) ?? 15_000;
        await activePage.waitForSelector(selector, { state: 'visible', timeout });
        return { content: [{ type: 'text', text: `Element "${selector}" is now visible.` }] };
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
