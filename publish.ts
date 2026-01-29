import { ExampleInputs } from "./defs";
import { Functions, Vector } from "objectiveai";
import OpenAI from "openai";
import { execSync } from "child_process";
import "dotenv/config";

function validateNoUncommittedChanges(): void {
  const status = execSync("git status --porcelain", {
    encoding: "utf-8",
  }).trim();

  if (status) {
    throw new Error(
      `Cannot publish with uncommitted changes:\n${status}\n\nPlease commit your changes first.`,
    );
  }
}

function validateSyncedWithRemote(): void {
  // Fetch latest from remote
  execSync("git fetch", { encoding: "utf-8" });

  const local = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  const remote = execSync("git rev-parse @{upstream}", {
    encoding: "utf-8",
  }).trim();

  if (local !== remote) {
    throw new Error(
      `Local branch is not in sync with remote.\nLocal:  ${local}\nRemote: ${remote}\n\nPlease push or pull to sync with the remote.`,
    );
  }
}

function validateGitHubRemote(): void {
  const remoteUrl = execSync("git remote get-url origin", {
    encoding: "utf-8",
  }).trim();

  if (!remoteUrl.includes("github.com")) {
    throw new Error(
      `Remote must be a GitHub repository.\nGot: ${remoteUrl}`,
    );
  }
}

function getGitUpstream(): { owner: string; repository: string } {
  const remoteUrl = execSync("git remote get-url origin", {
    encoding: "utf-8",
  }).trim();

  // Handle SSH format: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/git@[^:]+:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repository: sshMatch[2] };
  }

  // Handle HTTPS format: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(
    /https?:\/\/[^/]+\/([^/]+)\/(.+?)(?:\.git)?$/,
  );
  if (httpsMatch) {
    return { owner: httpsMatch[1], repository: httpsMatch[2] };
  }

  throw new Error(`Unable to parse git remote URL: ${remoteUrl}`);
}

async function execute(
  openai: OpenAI,
  input: Functions.Expression.InputValue,
  owner: string,
  repository: string,
): Promise<void> {
  const response = await Functions.Executions.remoteFunctionRemoteProfileCreate(
    openai as any,
    owner,
    repository,
    null,
    owner,
    repository,
    null,
    {
      input,
    },
  );
  if (Vector.Completions.Response.Usage.isEmpty(response.usage)) {
    throw new Error(
      `Function execution was usage-free for input ${JSON.stringify(input)}. Unable to publish Function & Profile without usage.`,
    );
  }
}

async function main(): Promise<void> {
  validateNoUncommittedChanges();
  validateSyncedWithRemote();
  validateGitHubRemote();

  const openai = new OpenAI({
    baseURL: process.env.OBJECTIVEAI_API_BASE ?? "https://api.objective-ai.io",
    apiKey: process.env.OBJECTIVEAI_API_KEY,
  });
  const { owner, repository } = getGitUpstream();
  const promises = [];
  for (const { value } of ExampleInputs) {
    promises.push(execute(openai, value, owner, repository));
  }
  await Promise.all(promises);
  console.log("Function & Profile published successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
