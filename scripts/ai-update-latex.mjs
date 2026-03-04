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

const PROMPT_ATTEMPTS = [
  { currentMaxChars: 9000, repoMaxChars: 3000, siblingMaxChars: 2000 },
  { currentMaxChars: 7000, repoMaxChars: 1800, siblingMaxChars: 1000 },
  { currentMaxChars: 5000, repoMaxChars: 900,  siblingMaxChars: 400 },
  { currentMaxChars: 3200, repoMaxChars: 300,  siblingMaxChars: 0 }
];

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
// How many chars of the *other* report to include as sibling context.
const SIBLING_REPORT_CHARS = Number(process.env.AI_SIBLING_REPORT_CHARS || 2000);
const MAX_COMPLETION_TOKENS = Number(process.env.AI_MAX_COMPLETION_TOKENS || 3200);

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

function buildPrompt({ path, currentContent, siblingContent, repoContext, currentMaxChars, repoMaxChars, siblingMaxChars }) {
  const safeCurrent = truncateMiddle(currentContent, currentMaxChars);
  const safeRepo = truncateMiddle(repoContext, repoMaxChars);
  const safeSibling = siblingContent ? truncateMiddle(siblingContent, siblingMaxChars) : "";

  return [
    "Task: refresh a university LaTeX report for this monorepo.",
    "Output: ONLY full LaTeX source for the target file, no markdown fences or explanations.",
    "Constraints: keep structure/style coherent, keep package choices unless required for validity, keep claims grounded in provided context.",
    "Validity: must include \\begin{document} and \\end{document}.",
    safeSibling
      ? "Sibling report: the other report file is included for scope reference — avoid duplicating its content verbatim."
      : "",
    safeCurrent !== currentContent
      ? "Current file content can be truncated in the middle; preserve continuity and avoid large rewrites."
      : "",
    safeRepo !== repoContext
      ? "Repository context can be truncated; prefer conservative updates grounded in explicit context only."
      : "",
    extraContext ? `Additional user context: ${extraContext}` : "",
    `Target file: ${path}`,
    "\nCurrent file content:\n",
    safeCurrent,
    safeSibling ? "\nSibling report (scope reference only):\n" : "",
    safeSibling,
    safeRepo ? "\nRepository context (READMEs, domain model, deployment, changelog):\n" : "",
    safeRepo
  ]
    .filter(Boolean)
    .join("\n");
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

async function generateUpdatedLatex({ path, currentContent, siblingContent, repoContext }) {
  let lastError;

  for (const attempt of PROMPT_ATTEMPTS) {
    const prompt = buildPrompt({
      path,
      currentContent,
      siblingContent,
      repoContext,
      currentMaxChars: attempt.currentMaxChars,
      repoMaxChars: attempt.repoMaxChars,
      siblingMaxChars: attempt.siblingMaxChars ?? 0
    });

    let response;
    for (let rateAttempt = 0; rateAttempt <= MAX_RATE_LIMIT_RETRIES; rateAttempt += 1) {
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
        body:
          provider === "github"
            ? JSON.stringify({
                model,
                max_completion_tokens: MAX_COMPLETION_TOKENS,
                messages: [
                  {
                    role: "system",
                    content:
                      "You update LaTeX technical reports conservatively. Return only valid LaTeX source code for the full target file."
                  },
                  {
                    role: "user",
                    content: prompt
                  }
                ],
                temperature: 1, //gpt5 only allows 1
              })
            : JSON.stringify({
                model,
                input: prompt
              })
      });

      if (response.status !== 429) {
        break;
      }

      const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
      const backoffMs = BASE_RATE_LIMIT_DELAY_MS * 2 ** rateAttempt;
      const jitterMs = Math.floor(Math.random() * 600);
      const waitMs = Math.max(retryAfterMs ?? 0, backoffMs + jitterMs);

      if (rateAttempt >= MAX_RATE_LIMIT_RETRIES) {
        const body = await response.text();
        throw new Error(`AI API request failed (429) after retries: ${body}`);
      }

      // If the server asks us to wait longer than our cap, the daily quota is
      // likely exhausted.  Fail fast with an actionable message instead of
      // silently blocking the Actions job until it times out.
      if (waitMs > MAX_RATE_LIMIT_WAIT_MS) {
        const rlType = response.headers.get("x-ratelimit-type") ?? "unknown";
        const body = await response.text();
        throw new Error(
          `AI API rate limit wait (${waitMs}ms) exceeds cap of ${MAX_RATE_LIMIT_WAIT_MS}ms ` +
          `(x-ratelimit-type: ${rlType}). Daily quota is likely exhausted. ` +
          `Switch to a model with higher limits (e.g. openai/gpt-4.1) or wait for the quota to reset. ` +
          `Raw response: ${body}`
        );
      }

      const rlType = response.headers.get("x-ratelimit-type") ?? "";
      console.warn(`Rate limited for ${path} (${rlType}); retrying in ${waitMs}ms...`);
      await sleep(waitMs);
    }

    if (!response) {
      throw new Error("AI request did not produce a response.");
    }

    if (!response.ok) {
      const errorBody = await response.text();
      const isPayloadTooLarge = response.status === 413 || /tokens_limit_reached|too large/i.test(errorBody);
      if (isPayloadTooLarge) {
        lastError = new Error(`AI API request too large (${response.status}) at attempt ${attempt.currentMaxChars}/${attempt.repoMaxChars}: ${errorBody}`);
        console.warn(`Prompt too large for ${path}, retrying with smaller context...`);
        continue;
      }
      throw new Error(`AI API request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const text =
      provider === "github"
        ? sanitizeModelOutput(extractGithubText(data))
        : data.output_text?.trim();

    if (!text) {
      throw new Error(`AI response did not contain generated text. Response shape: ${summarizeResponseShape(data)}`);
    }

    if (!text.includes("\\begin{document}") || !text.includes("\\end{document}")) {
      throw new Error(`Generated LaTeX for ${path} is invalid (missing document markers).`);
    }

    return provider === "github" ? text : text.endsWith("\n") ? text : `${text}\n`;
  }

  throw lastError || new Error(`Unable to generate LaTeX for ${path}.`);
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
    // Provide the other reports as sibling context so the AI understands
    // scope boundaries and avoids duplicating content between reports.
    const siblingContent = reportFiles
      .filter((p) => p !== path)
      .map((p) => `=== ${p} ===\n${reportContents.get(p)}`)
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
  console.error(error);
  process.exit(1);
});
