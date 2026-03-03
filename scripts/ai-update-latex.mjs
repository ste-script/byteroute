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
const model = process.env.AI_MODEL || (provider === "github" ? "openai/gpt-5" : "gpt-4.1-mini");
const reportFiles = (process.env.REPORT_FILES || "docs/SPE-report.tex,docs/ASW-report.tex")
  .split(",")
  .map((file) => file.trim())
  .filter(Boolean);
const extraContext = process.env.EXTRA_CONTEXT || "";

const PROMPT_ATTEMPTS = [
  { currentMaxChars: 9000, repoMaxChars: 1800 },
  { currentMaxChars: 6500, repoMaxChars: 900 },
  { currentMaxChars: 4200, repoMaxChars: 300 },
  { currentMaxChars: 3200, repoMaxChars: 0 }
];

const MAX_RATE_LIMIT_RETRIES = 5;
const BASE_RATE_LIMIT_DELAY_MS = 2000;
const CONTEXT_CHARS_PER_FILE = Number(process.env.AI_CONTEXT_CHARS_PER_FILE || 2500);

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
  const files = [
    "README.md",
    "apps/backend/README.md",
    "apps/dashboard/README.md",
    "apps/client-go/README.md",
    "packages/shared/README.md",
    "docs/README.md"
  ];

  const parts = [];
  for (const file of files) {
    const content = await readOptional(file);
    if (content) {
      parts.push(`### ${file}\n${content.slice(0, CONTEXT_CHARS_PER_FILE)}`);
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

function buildPrompt({ path, currentContent, repoContext, currentMaxChars, repoMaxChars }) {
  const safeCurrent = truncateMiddle(currentContent, currentMaxChars);
  const safeRepo = truncateMiddle(repoContext, repoMaxChars);

  return [
    "Task: refresh a university LaTeX report for this monorepo.",
    "Output: ONLY full LaTeX source for the target file, no markdown fences or explanations.",
    "Constraints: keep structure/style coherent, keep package choices unless required for validity, keep claims grounded in provided context.",
    "Validity: must include \\begin{document} and \\end{document}.",
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
    safeRepo ? "\nRepository context:\n" : "",
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

function extractGithubText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("");
  }
  return "";
}

async function generateUpdatedLatex({ path, currentContent, repoContext }) {
  let lastError;

  for (const attempt of PROMPT_ATTEMPTS) {
    const prompt = buildPrompt({
      path,
      currentContent,
      repoContext,
      currentMaxChars: attempt.currentMaxChars,
      repoMaxChars: attempt.repoMaxChars
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
                max_tokens: 3200,
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

      console.warn(`Rate limited for ${path}; retrying in ${waitMs}ms...`);
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
      throw new Error("AI response did not contain generated text.");
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

  for (const path of reportFiles) {
    const currentContent = await readFile(path, "utf8");
    const updated = await generateUpdatedLatex({ path, currentContent, repoContext });
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
