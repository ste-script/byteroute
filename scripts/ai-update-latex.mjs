import { readFile, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

const provider = process.env.AI_PROVIDER || "github";
const apiToken = process.env.AI_API_TOKEN || process.env.OPENAI_API_KEY || process.env.GITHUB_TOKEN;
const apiUrl =
  process.env.AI_API_URL ||
  (provider === "github"
    ? "https://models.github.ai/inference/chat/completions"
    : "https://api.openai.com/v1/responses");
const model = process.env.AI_MODEL || (provider === "github" ? "openai/gpt-4.1" : "gpt-4.1-mini");
const reportFiles = (process.env.REPORT_FILES || "docs/SPE-report.tex,docs/ASW-report.tex")
  .split(",")
  .map((file) => file.trim())
  .filter(Boolean);
const extraContext = process.env.EXTRA_CONTEXT || "";

// Maximum number of agentic steps (tool-call rounds) per report before giving up.
const MAX_AGENT_STEPS = Number(process.env.AI_MAX_AGENT_STEPS || 20);

const MAX_RATE_LIMIT_RETRIES = 5;
const BASE_RATE_LIMIT_DELAY_MS = 2000;
// If retry-after exceeds this threshold the quota is exhausted for the day;
// fail fast instead of sleeping for hours inside an Actions job.
const MAX_RATE_LIMIT_WAIT_MS = Number(process.env.AI_MAX_RATE_LIMIT_WAIT_MS || 10 * 60 * 1000); // 10 min
// Minimum pause inserted between every API call (before the next file starts).
// Set AI_INTER_REQUEST_DELAY_MS=65000 when using gpt-5 (1 RPM) or other
// heavily constrained models to avoid back-to-back 429s.
const INTER_REQUEST_DELAY_MS = Number(process.env.AI_INTER_REQUEST_DELAY_MS ?? 0);
const CONTEXT_CHARS_PER_FILE = Number(process.env.AI_CONTEXT_CHARS_PER_FILE || 3500);
// How many chars to take from the top of CHANGELOG.md (most-recent entries first).
const CHANGELOG_CHARS = Number(process.env.AI_CHANGELOG_CHARS || 3000);
const MAX_COMPLETION_TOKENS = Number(process.env.AI_MAX_COMPLETION_TOKENS || 3200);
// Max chars of the *current report* included in the initial agent message.
// The agent can always call read_file on the target path to get the full content.
const INITIAL_CURRENT_CHARS = Number(process.env.AI_INITIAL_CURRENT_CHARS || 4000);
// Max chars of pre-loaded repo context included in the initial agent message.
const INITIAL_REPO_CHARS = Number(process.env.AI_INITIAL_REPO_CHARS || 2000);
// Max chars stored in the conversation history for each tool result.
// The model already processed the full content when it was first returned;
// history only needs enough to remind it what it read.
const MAX_TOOL_RESULT_HISTORY_CHARS = Number(process.env.AI_TOOL_RESULT_HISTORY_CHARS || 400);

if (!apiToken) {
  console.error("Missing AI token. Set AI_API_TOKEN, OPENAI_API_KEY, or GITHUB_TOKEN.");
  process.exit(1);
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readOptional(path) {
  if (!(await exists(path))) return "";
  return readFile(path, "utf8");
}

async function collectRepositoryContext() {
  const readmeFiles = [
    "README.md",
    "apps/backend/README.md",
    "apps/dashboard/README.md",
    "apps/client-go/README.md",
    "packages/shared/README.md",
    "docs/README.md"
  ];

  const parts = [];

  for (const file of readmeFiles) {
    const content = await readOptional(file);
    if (content) {
      parts.push(`### ${file}\n${content.slice(0, CONTEXT_CHARS_PER_FILE)}`);
    }
  }

  // Domain model: describes allowed protocols, analytics query shapes, etc.
  const domainDsl = await readOptional("apps/backend/config/domain.dsl.yaml");
  if (domainDsl) {
    parts.push(`### apps/backend/config/domain.dsl.yaml\n${domainDsl}`);
  }

  // Deployment topology: actual services, ports, volumes, and networking.
  const compose = await readOptional("docker-compose.yml");
  if (compose) {
    parts.push(`### docker-compose.yml\n${compose}`);
  }

  // Recent changelog: best source for what has changed in recent versions.
  if (CHANGELOG_CHARS > 0) {
    const changelog = await readOptional("CHANGELOG.md");
    if (changelog) {
      parts.push(`### CHANGELOG.md (most recent entries)\n${changelog.slice(0, CHANGELOG_CHARS)}`);
    }
  }

  return parts.join("\n\n");
}

function truncateMiddle(text, maxChars) {
  if (!maxChars || maxChars <= 0) return "";
  if (text.length <= maxChars) return text;

  const half = Math.floor((maxChars - 32) / 2);
  const head = text.slice(0, half);
  const tail = text.slice(-half);
  return `${head}\n\n... [TRUNCATED FOR TOKEN LIMIT] ...\n\n${tail}`;
}

// ---------------------------------------------------------------------------
// Agentic tool definitions
// ---------------------------------------------------------------------------
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read the contents of any file in the repository. Use this to gather detailed context about the codebase (source code, configs, READMEs, etc.).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path to the file from the workspace root."
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description:
        "List the files and sub-directories inside a directory. Use this to discover what exists before reading files.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path to the directory. Use '.' for the workspace root."
          }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "replace_section",
      description:
        "Replace a specific paragraph or section in the report. old_content must match the current file exactly (character-for-character, including all whitespace and newlines). Call this once per distinct change — do NOT rewrite the whole document.",
      parameters: {
        type: "object",
        properties: {
          old_content: {
            type: "string",
            description: "The exact LaTeX text to replace, copied verbatim from the current file."
          },
          new_content: {
            type: "string",
            description: "The replacement LaTeX text for that section."
          }
        },
        required: ["old_content", "new_content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "finish",
      description:
        "Signal that you have finished making all necessary changes. Call this when no more updates are needed. You MUST call this (or replace_section) — do not stop silently.",
      parameters: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Optional short description of what was changed (or 'no changes needed')."
          }
        },
        required: []
      }
    }
  }
];

/**
 * Apply a single patch to content. Returns { success, result } or { success: false, error }.
 * Only replaces the first occurrence; warns if the text appears more than once.
 */
function applyPatch(content, oldText, newText) {
  if (!oldText) {
    return { success: false, result: content, error: "old_content must not be empty." };
  }
  const idx = content.indexOf(oldText);
  if (idx === -1) {
    return {
      success: false,
      result: content,
      error:
        "old_content not found in the current file. " +
        "Make sure it is an exact verbatim copy (including all whitespace and newlines)."
    };
  }
  const occurrences = content.split(oldText).length - 1;
  if (occurrences > 1) {
    console.warn(
      `  [agent] replace_section: old_content appears ${occurrences} times; replacing only the first occurrence.`
    );
  }
  const result = content.slice(0, idx) + newText + content.slice(idx + oldText.length);
  return { success: true, result };
}

// Execute a single tool call requested by the agent.
// readCache: Map<path, string> — avoids re-fetching already-read files.
async function executeTool(name, args, readCache) {
  if (name === "read_file") {
    const filePath = args.path;
    if (readCache && readCache.has(filePath)) {
      return `[already read — cached content for '${filePath}' available from earlier in this session]`;
    }
    // Detect directories before attempting to read.
    try {
      const { stat } = await import("node:fs/promises");
      const s = await stat(filePath);
      if (s.isDirectory()) {
        // Transparently serve a directory listing instead of failing.
        return await executeTool("list_directory", { path: filePath }, readCache);
      }
    } catch {
      return `File not found: ${filePath}`;
    }
    const content = await readOptional(filePath);
    if (!content) return `File not found or empty: ${filePath}`;
    const result =
      content.length > CONTEXT_CHARS_PER_FILE
        ? `${content.slice(0, CONTEXT_CHARS_PER_FILE)}\n...[content truncated at ${CONTEXT_CHARS_PER_FILE} chars]...`
        : content;
    if (readCache) readCache.set(filePath, result);
    return result;
  }

  if (name === "list_directory") {
    const { readdir, stat } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const dirPath = args.path || ".";
    try {
      const entries = await readdir(dirPath);
      const withTypes = await Promise.all(
        entries.map(async (e) => {
          try {
            const s = await stat(join(dirPath, e));
            return s.isDirectory() ? `${e}/` : e;
          } catch {
            return e;
          }
        })
      );
      return withTypes.join("\n");
    } catch (err) {
      return `Error listing directory '${dirPath}': ${err.message}`;
    }
  }

  return `Unknown tool: ${name}`;
}

/**
 * Before making an API call, compress all tool-result messages that are older
 * than the most-recent assistant turn. The model gets full content the first
 * time a result is delivered; subsequent turns only need a short reminder.
 */
function compressOldToolResults(messages) {
  // Find the last assistant message so we know which tool results are "fresh".
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }
  for (let i = 0; i < lastAssistantIdx; i++) {
    const msg = messages[i];
    if (msg.role === "tool" && typeof msg.content === "string" &&
        msg.content.length > MAX_TOOL_RESULT_HISTORY_CHARS) {
      messages[i] = {
        ...msg,
        content:
          msg.content.slice(0, MAX_TOOL_RESULT_HISTORY_CHARS) +
          `\n...[compressed for history; ${msg.content.length} chars total]`
      };
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;
  const asNumber = Number(headerValue);
  if (!Number.isNaN(asNumber)) {
    return Math.max(0, Math.floor(asNumber * 1000));
  }
  const asDate = Date.parse(headerValue);
  if (Number.isNaN(asDate)) return null;
  return Math.max(0, asDate - Date.now());
}

function sanitizeModelOutput(text) {
  if (!text) return "";
  const trimmed = text.trim();

  const fenced = trimmed.match(/^```(?:latex)?\s*([\s\S]*?)\s*```$/i);
  const unfenced = fenced ? fenced[1] : trimmed;
  return unfenced.endsWith("\n") ? unfenced : `${unfenced}\n`;
}

function maybeExtractText(part) {
  if (!part) return "";
  if (typeof part === "string") return part;
  if (typeof part.text === "string") return part.text;
  if (typeof part.content === "string") return part.content;
  if (typeof part.value === "string") return part.value;
  return "";
}

function extractGithubText(data) {
  const directOutputText = maybeExtractText(data?.output_text);
  if (directOutputText) return directOutputText;

  const choice = data?.choices?.[0];
  const message = choice?.message;
  const content = message?.content;

  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const joined = content.map(maybeExtractText).filter(Boolean).join("");
    if (joined) return joined;
  }

  const delta = choice?.delta?.content;
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    const joined = delta.map(maybeExtractText).filter(Boolean).join("");
    if (joined) return joined;
  }

  const fallbackFields = [
    maybeExtractText(message?.text),
    maybeExtractText(choice?.text),
    maybeExtractText(data?.response?.output_text),
    maybeExtractText(data?.response?.text)
  ].filter(Boolean);

  if (fallbackFields.length > 0) return fallbackFields.join("\n");
  return "";
}

function summarizeResponseShape(data) {
  try {
    return JSON.stringify(
      {
        topLevelKeys: Object.keys(data || {}),
        hasChoices: Array.isArray(data?.choices),
        firstChoiceKeys: data?.choices?.[0] ? Object.keys(data.choices[0]) : [],
        messageKeys: data?.choices?.[0]?.message ? Object.keys(data.choices[0].message) : [],
        hasOutputText: Boolean(data?.output_text),
        hasError: Boolean(data?.error)
      },
      null,
      2
    );
  } catch {
    return "<unable to summarize response shape>";
  }
}

// Thrown when the request payload exceeds the model's token limit (HTTP 413).
class PayloadTooLargeError extends Error {
  constructor(message) {
    super(message);
    this.name = "PayloadTooLargeError";
  }
}

// Send one API request with rate-limit retry logic.
// Returns the parsed JSON response body.
async function callApi(messages, useTools, label) {
  let response;
  for (let rateAttempt = 0; rateAttempt <= MAX_RATE_LIMIT_RETRIES; rateAttempt += 1) {
    const body = {
      model,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      messages,
      temperature: 1 // gpt-4.1 / gpt-5 require temperature=1
    };
    if (useTools) {
      body.tools = AGENT_TOOLS;
    }

    response = await fetch(apiUrl, {
      method: "POST",
      headers:
        provider === "github"
          ? {
              "Content-Type": "application/json",
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              Authorization: `Bearer ${apiToken}`
            }
          : {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`
            },
      body: JSON.stringify(body)
    });

    if (response.status !== 429) break;

    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    const backoffMs = BASE_RATE_LIMIT_DELAY_MS * 2 ** rateAttempt;
    const jitterMs = Math.floor(Math.random() * 600);
    const waitMs = Math.max(retryAfterMs ?? 0, backoffMs + jitterMs);

    if (rateAttempt >= MAX_RATE_LIMIT_RETRIES) {
      const errBody = await response.text();
      throw new Error(`AI API request failed (429) after retries: ${errBody}`);
    }

    if (waitMs > MAX_RATE_LIMIT_WAIT_MS) {
      const rlType = response.headers.get("x-ratelimit-type") ?? "unknown";
      const errBody = await response.text();
      throw new Error(
        `AI API rate limit wait (${waitMs}ms) exceeds cap of ${MAX_RATE_LIMIT_WAIT_MS}ms ` +
        `(x-ratelimit-type: ${rlType}). Daily quota is likely exhausted. ` +
        `Switch to a model with higher limits (e.g. openai/gpt-4.1) or wait for the quota to reset. ` +
        `Raw response: ${errBody}`
      );
    }

    const rlType = response.headers.get("x-ratelimit-type") ?? "";
    console.warn(`Rate limited${label ? ` [${label}]` : ""} (${rlType}); retrying in ${waitMs}ms...`);
    await sleep(waitMs);
  }

  if (!response) throw new Error("AI request did not produce a response.");

  if (!response.ok) {
    const errBody = await response.text();
    const isPayloadTooLarge =
      response.status === 413 || /tokens_limit_reached|too large/i.test(errBody);
    if (isPayloadTooLarge) {
      throw new PayloadTooLargeError(
        `AI API request too large (${response.status}): ${errBody}`
      );
    }
    throw new Error(`AI API request failed (${response.status}): ${errBody}`);
  }

  return response.json();
}

// Attempt sizes for the initial message when the payload is too large.
// Each entry halves the previous budget so we degrade gracefully.
const INITIAL_ATTEMPT_SCALES = [1, 0.5, 0.25, 0.1];

/**
 * Remove the oldest intermediate assistant+tool-results exchange from the
 * conversation so the next API call fits within the token limit.
 *
 * Layout we expect:
 *   [0] system
 *   [1] user (initial)
 *   [2] assistant  <-- oldest intermediate, drop from here
 *   [3..k] tool results belonging to [2]
 *   [k+1] assistant
 *   ...
 *
 * Returns true if something was trimmed, false if nothing left to remove.
 */
function trimConversationHistory(messages) {
  // Need at least: system + user + 1 assistant + something after it to trim.
  if (messages.length <= 3) return false;

  // Find the first assistant message after the initial user turn (index 1).
  const firstAssistantIdx = messages.findIndex((m, i) => i >= 2 && m.role === "assistant");
  if (firstAssistantIdx === -1) return false;

  // Find the end of the tool-results block that follows it (next assistant or end).
  let endIdx = firstAssistantIdx + 1;
  while (endIdx < messages.length && messages[endIdx].role === "tool") {
    endIdx += 1;
  }

  // Only trim if there is still more conversation after this block.
  if (endIdx >= messages.length) return false;

  messages.splice(firstAssistantIdx, endIdx - firstAssistantIdx);
  return true;
}

// Agentic generation: the model iteratively calls read_file / list_directory
// to gather context, then patches only the paragraphs that need updating via
// replace_section, and signals completion via finish.
async function generateUpdatedLatex({ path, currentContent, siblingContent, repoContext }) {
  // Per-session cache: avoids re-fetching already-read files after history trim.
  const readCache = new Map();
  // Mutable working copy — each replace_section call updates this in place.
  let workingContent = currentContent;

  const systemMessage = [
    "You are an expert technical writer updating university LaTeX reports for a software engineering monorepo.",
    "You have tools to read files and list directories in the repository so you can gather the full context you need.",
    `The target file path is '${path}'. If the content shown below is truncated, call read_file('${path}') to retrieve the full source before making changes.`,
    "Work methodically: explore the codebase, read relevant source files, then make ONLY the necessary targeted changes.",
    "Rules:",
    "  - Use replace_section to update individual paragraphs or sections — do NOT rewrite the whole document.",
    "  - Each replace_section call must supply old_content that matches the current file exactly (copy-paste verbatim).",
    "  - Make as many replace_section calls as needed, one per distinct change.",
    "  - When all changes are done (or no changes are needed), call finish.",
    "  - Keep the existing structure, section ordering, and package choices unless a change is required for correctness.",
    "  - Update technical details (architecture, API shape, deployment, features) to match what you find in the repository.",
    "  - Keep claims grounded in evidence found in the repository — do not invent details.",
    "  - Always avoid em dashes and en dashes. Opt for commas, parentheses, or alternative punctuation.",
    extraContext ? `Additional context from the user: ${extraContext}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  function buildInitialUserMessage(currentChars, repoChars) {
    const safeCurrent = truncateMiddle(currentContent, currentChars);
    const safeRepo = truncateMiddle(repoContext, repoChars);
    return [
      `Target report to update: ${path}`,
      "",
      safeCurrent !== currentContent
        ? `Current content of the target file (truncated — call read_file('${path}') for the full source):`
        : "Current content of the target file:",
      safeCurrent,
      siblingContent
        ? `\nOther report files (preview — call read_file for full content):\n${siblingContent}`
        : "",
      safeRepo
        ? `\nPre-loaded repository context (READMEs, domain model, deployment, changelog):\n${safeRepo}`
        : "",
      "",
      "Use your tools to read any additional source files, configs, or documentation you need.",
      "Then call replace_section for each paragraph that needs updating, and finish when done.",
      "IMPORTANT: replace_section old_content must be an exact verbatim copy from the file shown above."
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  }

  let messages = null;

  // Try progressively smaller initial payloads if the model rejects the request
  // as too large (HTTP 413 / tokens_limit_reached).
  for (const scale of INITIAL_ATTEMPT_SCALES) {
    const currentChars = Math.floor(INITIAL_CURRENT_CHARS * scale);
    const repoChars = Math.floor(INITIAL_REPO_CHARS * scale);
    const userMessage = buildInitialUserMessage(currentChars, repoChars);
    const candidate = [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ];
    try {
      // Dry-run: attempt the very first API call with this payload size.
      console.log(
        `  [agent] initial context budget: current=${currentChars} chars, repo=${repoChars} chars`
      );
      const data = await callApi(candidate, /* useTools */ true, path);

      const choice = data?.choices?.[0];
      if (!choice) {
        throw new Error(`No choices in API response. Shape: ${summarizeResponseShape(data)}`);
      }
      messages = candidate;
      messages.push(choice.message);

      // Handle the first response inline before entering the main loop.
      const firstToolCalls = choice.message?.tool_calls;
      const firstFinishReason = choice.finish_reason;

      if (!firstToolCalls || firstToolCalls.length === 0) {
        if (firstFinishReason === "stop") {
          // Agent stopped without tool calls — treat as "no changes needed".
          console.warn(`  [agent] Model stopped without calling any tools — treating as no changes needed.`);
          return workingContent;
        }
        throw new Error(
          `Unexpected finish_reason '${firstFinishReason}' with no tool calls. Shape: ${summarizeResponseShape(data)}`
        );
      }

      // Process first-turn tool calls.
      let firstFinished = false;
      const firstToolResults = [];
      for (const toolCall of firstToolCalls) {
        const toolName = toolCall.function?.name;
        let toolArgs;
        try { toolArgs = JSON.parse(toolCall.function?.arguments || "{}"); } catch { toolArgs = {}; }
        console.log(`  [agent tool] ${toolName}(${JSON.stringify(toolArgs)})`);
        if (toolName === "replace_section") {
          const oldText = typeof toolArgs.old_content === "string" ? toolArgs.old_content : "";
          const newText = typeof toolArgs.new_content === "string" ? toolArgs.new_content : "";
          const patch = applyPatch(workingContent, oldText, newText);
          if (patch.success) {
            workingContent = patch.result;
            firstToolResults.push({ role: "tool", tool_call_id: toolCall.id, content: "Section replaced successfully." });
          } else {
            firstToolResults.push({ role: "tool", tool_call_id: toolCall.id, content: patch.error });
          }
        } else if (toolName === "finish") {
          const summary = toolArgs.summary || "(no summary)";
          console.log(`  [agent] finish called: ${summary}`);
          firstFinished = true;
          firstToolResults.push({ role: "tool", tool_call_id: toolCall.id, content: "Done." });
        } else {
          const result = await executeTool(toolName, toolArgs, readCache);
          firstToolResults.push({ role: "tool", tool_call_id: toolCall.id, content: result });
        }
      }
      messages.push(...firstToolResults);
      if (firstFinished) return workingContent;

      break; // Initial call succeeded; exit scale loop and enter agentic loop.
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        console.warn(
          `  [agent] Initial payload too large at scale=${scale} (current=${currentChars}, repo=${repoChars}). Retrying with smaller context...`
        );
        if (scale === INITIAL_ATTEMPT_SCALES[INITIAL_ATTEMPT_SCALES.length - 1]) {
          throw err; // All scales exhausted.
        }
        continue;
      }
      throw err;
    }
  }

  if (!messages) throw new Error(`Unable to build initial agent messages for ${path}.`);

  let finished = false;

  // Continue the agentic loop (step 0 was handled above, start from step 1).
  for (let step = 1; step < MAX_AGENT_STEPS; step += 1) {
    console.log(`  [agent step ${step + 1}/${MAX_AGENT_STEPS}] calling API...`);

    let data;
    // If the accumulated conversation exceeds the model's token limit, drop the
    // oldest intermediate exchanges one-by-one until the request succeeds.
    for (;;) {
      try {
        compressOldToolResults(messages);
        data = await callApi(messages, /* useTools */ true, path);
        break;
      } catch (err) {
        if (err instanceof PayloadTooLargeError) {
          const trimmed = trimConversationHistory(messages);
          if (!trimmed) throw err; // Nothing left to trim — give up.
          console.warn(
            `  [agent] Conversation too large at step ${step + 1}; trimmed oldest exchange and retrying...`
          );
        } else {
          throw err;
        }
      }
    }

    const choice = data?.choices?.[0];
    if (!choice) {
      throw new Error(`No choices in API response. Shape: ${summarizeResponseShape(data)}`);
    }

    const message = choice.message;
    // Append the assistant turn to the conversation history.
    messages.push(message);

    const toolCalls = message?.tool_calls;
    const finishReason = choice.finish_reason;

    // No tool calls — treat as implicit finish (no more changes).
    if (!toolCalls || toolCalls.length === 0) {
      if (finishReason === "stop") {
        console.warn(`  [agent] Model stopped without tool calls at step ${step + 1} — treating as finish.`);
        finished = true;
        break;
      }
      throw new Error(
        `Unexpected finish_reason '${finishReason}' with no tool calls. Shape: ${summarizeResponseShape(data)}`
      );
    }

    // Process all tool calls in this turn.
    const toolResults = [];
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      let toolArgs;
      try {
        toolArgs = JSON.parse(toolCall.function?.arguments || "{}");
      } catch {
        toolArgs = {};
      }

      console.log(`  [agent tool] ${toolName}(${JSON.stringify(toolArgs)})`);

      if (toolName === "replace_section") {
        const oldText = typeof toolArgs.old_content === "string" ? toolArgs.old_content : "";
        const newText = typeof toolArgs.new_content === "string" ? toolArgs.new_content : "";
        const patch = applyPatch(workingContent, oldText, newText);
        if (patch.success) {
          workingContent = patch.result;
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: "Section replaced successfully."
          });
        } else {
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: patch.error
          });
        }
      } else if (toolName === "finish") {
        const summary = toolArgs.summary || "(no summary)";
        console.log(`  [agent] finish called: ${summary}`);
        finished = true;
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: "Done."
        });
      } else {
        const result = await executeTool(toolName, toolArgs, readCache);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result
        });
      }
    }

    // Extend the conversation with tool results.
    messages.push(...toolResults);

    if (finished) break;
  }

  if (!finished) {
    console.warn(
      `  [agent] Exhausted ${MAX_AGENT_STEPS} steps without calling finish for ${path}. Returning accumulated patches.`
    );
  }

  return workingContent;
}

async function main() {
  const repoContext = await collectRepositoryContext();

  // Pre-read all report contents so each file can reference its siblings.
  const reportContents = new Map();
  for (const path of reportFiles) {
    reportContents.set(path, await readFile(path, "utf8"));
  }

  for (let i = 0; i < reportFiles.length; i++) {
    const path = reportFiles[i];

    // Respect per-minute rate limits by inserting a delay between files.
    // For gpt-5 (1 RPM) set AI_INTER_REQUEST_DELAY_MS=65000 so requests
    // never fire within the same minute window.
    if (i > 0 && INTER_REQUEST_DELAY_MS > 0) {
      console.log(`Waiting ${INTER_REQUEST_DELAY_MS}ms before next file to respect RPM limit...`);
      await sleep(INTER_REQUEST_DELAY_MS);
    }

    const currentContent = reportContents.get(path);
    // Provide a brief excerpt of the other reports so the agent understands
    // scope boundaries without exhausting the initial-message token budget.
    // The agent can call read_file on any sibling to get the full content.
    const SIBLING_PREVIEW_CHARS = Number(process.env.AI_SIBLING_PREVIEW_CHARS || 2000);
    const siblingContent = reportFiles
      .filter((p) => p !== path)
      .map((p) => {
        const full = reportContents.get(p);
        const preview = SIBLING_PREVIEW_CHARS > 0 ? truncateMiddle(full, SIBLING_PREVIEW_CHARS) : full;
        return `=== ${p} (preview — use read_file for full content) ===\n${preview}`;
      })
      .join("\n\n");

    const updated = await generateUpdatedLatex({ path, currentContent, siblingContent, repoContext });
    if (updated !== currentContent) {
      await writeFile(path, updated, "utf8");
      console.log(`Updated ${path}`);
    } else {
      console.log(`No changes for ${path}`);
    }
  }
}

main().catch((error) => {
  // Quota-exhausted errors are expected in rate-limited environments.
  // Exit 0 so the CI pipeline can continue (nothing was written to disk).
  const isQuotaExhausted =
    /daily quota|quota.*exhausted|wait.*exceeds cap/i.test(error?.message ?? "");
  if (isQuotaExhausted) {
    console.warn(`[ai-update-latex] API quota exhausted — skipping update. ${error.message}`);
    process.exit(0);
  }
  console.error(error);
  process.exit(1);
});
