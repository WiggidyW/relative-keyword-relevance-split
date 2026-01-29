import { Functions } from "objectiveai";
import OpenAI from "openai";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import "dotenv/config";

const openai = new OpenAI({
  baseURL: process.env.OBJECTIVEAI_API_BASE ?? "https://api.objective-ai.io",
  apiKey: process.env.OBJECTIVEAI_API_KEY,
});

type FunctionRef = { owner: string; repository: string; commit: string };
type ProfileRef = { owner: string; repository: string; commit: string };

function getFunctionPath(ref: FunctionRef): string {
  return join(
    "examples",
    "functions",
    ref.owner,
    ref.repository,
    ref.commit,
    "function.json",
  );
}

function getProfilePath(ref: ProfileRef): string {
  return join(
    "examples",
    "profiles",
    ref.owner,
    ref.repository,
    ref.commit,
    "profile.json",
  );
}

function functionExists(ref: FunctionRef): boolean {
  return existsSync(getFunctionPath(ref));
}

function profileExists(ref: ProfileRef): boolean {
  return existsSync(getProfilePath(ref));
}

function writeFunction(ref: FunctionRef, data: unknown): void {
  const path = getFunctionPath(ref);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function writeProfile(ref: ProfileRef, data: unknown): void {
  const path = getProfilePath(ref);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}

async function fetchFunctionRecursively(ref: FunctionRef): Promise<void> {
  if (functionExists(ref)) {
    return;
  }

  console.log(
    `Fetching function: ${ref.owner}/${ref.repository}/${ref.commit}`,
  );
  const func = await Functions.retrieve(
    openai as any,
    ref.owner,
    ref.repository,
    ref.commit,
  );
  writeFunction(ref, func);

  // Find sub-function tasks and fetch them recursively
  for (const task of func.tasks) {
    if (task.type === "scalar.function" || task.type === "vector.function") {
      const subRef: FunctionRef = {
        owner: task.owner,
        repository: task.repository,
        commit: task.commit,
      };
      await fetchFunctionRecursively(subRef);
    }
  }
}

function isRemoteProfileTask(
  task: Functions.TaskProfile,
): task is Functions.RemoteFunctionTaskProfile {
  return (
    "owner" in task &&
    "repository" in task &&
    "commit" in task &&
    !("tasks" in task) &&
    !("ensemble" in task)
  );
}

function isInlineProfileTask(
  task: Functions.TaskProfile,
): task is Functions.InlineFunctionTaskProfile {
  return "tasks" in task && !("ensemble" in task);
}

async function fetchProfileRecursively(ref: ProfileRef): Promise<void> {
  if (profileExists(ref)) {
    return;
  }

  console.log(`Fetching profile: ${ref.owner}/${ref.repository}/${ref.commit}`);
  const profile = await Functions.Profiles.retrieve(
    openai as any,
    ref.owner,
    ref.repository,
    ref.commit,
  );
  writeProfile(ref, profile);

  // Find sub-profiles and fetch them recursively
  async function processTaskProfiles(
    tasks: Functions.TaskProfile[],
  ): Promise<void> {
    for (const task of tasks) {
      if (isRemoteProfileTask(task)) {
        const subRef: ProfileRef = {
          owner: task.owner,
          repository: task.repository,
          commit: task.commit,
        };
        await fetchProfileRecursively(subRef);
      } else if (isInlineProfileTask(task)) {
        await processTaskProfiles(task.tasks);
      }
    }
  }

  await processTaskProfiles(profile.tasks);
}

async function main(): Promise<void> {
  // List all function-profile pairs
  const { data: pairs } = await Functions.listPairs(openai as any);

  // Randomly select up to 10 pairs
  const shuffled = pairs.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(10, shuffled.length));

  console.log(`Selected ${selected.length} function-profile pairs`);

  // Fetch each function and profile recursively
  for (const pair of selected) {
    const funcRef: FunctionRef = {
      owner: pair.function.owner,
      repository: pair.function.repository,
      commit: pair.function.commit,
    };
    const profileRef: ProfileRef = {
      owner: pair.profile.owner,
      repository: pair.profile.repository,
      commit: pair.profile.commit,
    };

    await fetchFunctionRecursively(funcRef);
    await fetchProfileRecursively(profileRef);
  }

  // Write examples.json with the selected root pairs
  mkdirSync("examples", { recursive: true });
  writeFileSync(
    join("examples", "examples.json"),
    JSON.stringify(selected, null, 2),
  );

  console.log(
    "Initialization complete. Root pairs saved to examples/examples.json",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
