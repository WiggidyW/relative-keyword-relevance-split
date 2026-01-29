import { Ensemble, EnsembleLlm, Functions } from "objectiveai";
import { Function, Profile } from "./defs";
import { writeFileSync } from "fs";

function buildFunction(): void {
  // serialize Function into function.json
  writeFileSync("function.json", JSON.stringify(Function, null, 2));
}

function orderTaskProfile(
  taskProfile: Functions.TaskProfile,
): Functions.TaskProfile {
  const keyLength = Object.keys(taskProfile).length;
  if (keyLength === 1 && "tasks" in taskProfile) {
    // InlineFunctionTaskProfile
    const ordered: Functions.InlineFunctionTaskProfile = {
      tasks: [],
    };
    for (const task of taskProfile.tasks) {
      ordered.tasks.push(orderTaskProfile(task));
    }
    return ordered;
  } else if (
    keyLength === 3 &&
    "owner" in taskProfile &&
    "repository" in taskProfile &&
    "commit" in taskProfile
  ) {
    // RemoteFunctionTaskProfile
    return taskProfile;
  } else if (
    keyLength === 2 &&
    "ensemble" in taskProfile &&
    "profile" in taskProfile
  ) {
    // VectorCompletionTaskProfile
    if (typeof taskProfile.ensemble === "string") {
      // no re-ordering needed for non-inline ensemble
      return taskProfile;
    }
    // map full Ensemble LLM ID to profile weight
    const ensembleProfileMap = new Map<string, number>();
    for (let i = 0; i < taskProfile.ensemble.llms.length; i++) {
      const ensembleLlmBase = taskProfile.ensemble.llms[i];
      let llmFullId = "";
      llmFullId += EnsembleLlm.validate(ensembleLlmBase).id;
      if (ensembleLlmBase.fallbacks) {
        for (const fallback of ensembleLlmBase.fallbacks) {
          llmFullId += EnsembleLlm.validate(fallback).id;
        }
      }
      if (!ensembleProfileMap.has(llmFullId)) {
        ensembleProfileMap.set(llmFullId, taskProfile.profile[i]);
      }
    }
    // validate ensemble and re-order profile to fit final Ensemble LLM order
    const ensemble: any = Ensemble.validate(taskProfile.ensemble);
    delete ensemble.id;
    const profile: number[] = [];
    for (const llm of ensemble.llms) {
      // compute full LLM ID and delete id fields
      let llmFullId = "";
      llmFullId += llm.id;
      delete llm.id;
      if (llm.fallbacks) {
        for (const fallback of llm.fallbacks) {
          llmFullId += fallback.id;
          delete fallback.id;
        }
      }
      // push corresponding profile weight
      const weight = ensembleProfileMap.get(llmFullId);
      if (weight === undefined) {
        throw new Error(
          `No profile weight found for ensemble LLM: ${llmFullId}`,
        );
      }
      profile.push(weight);
    }
    return {
      ensemble: ensemble as Ensemble.EnsembleBase,
      profile,
    };
  } else {
    throw new Error(`Invalid TaskProfile: ${JSON.stringify(taskProfile)}`);
  }
}

function buildProfile(): void {
  // for each vector task, rearrange profile weights to match validated order
  const { tasks, ...profile } = Profile;
  const orderedTasks: Functions.TaskProfile[] = [];
  for (const task of tasks) {
    orderedTasks.push(orderTaskProfile(task));
  }
  // serialize Profile into profile.json
  writeFileSync(
    "profile.json",
    JSON.stringify(
      {
        ...profile,
        tasks: orderedTasks,
      },
      null,
      2,
    ),
  );
}

buildFunction();
buildProfile();
