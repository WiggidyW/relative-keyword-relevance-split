import { Function, Profile, ExampleInputs } from "./defs";
import { Functions } from "objectiveai";
import { ExampleInputSchema } from "./example_input";
import { ChildProcess, spawn } from "child_process";
import process from "process";
import OpenAI from "openai";
import "dotenv/config";

function spawnApiServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const apiProcess = spawn(
      "cargo",
      ["run", "--manifest-path", "./objectiveai/objectiveai-api/Cargo.toml"],
      {
        detached: false,
        stdio: ["inherit", "pipe", "pipe"],
      },
    );

    const killApiProcess = () => {
      if (!apiProcess.killed) {
        try {
          process.kill(apiProcess.pid as number);
        } catch {}
      }
    };

    process.on("exit", killApiProcess);
    process.on("SIGINT", () => {
      killApiProcess();
      process.exit(130);
    });
    process.on("SIGTERM", () => {
      killApiProcess();
      process.exit(143);
    });
    process.on("uncaughtException", (err) => {
      killApiProcess();
      throw err;
    });
    process.on("unhandledRejection", (err) => {
      killApiProcess();
      throw err;
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        killApiProcess();
        reject(
          new Error("Timeout: API server did not start within 300 seconds"),
        );
      }
    }, 300000);

    const onData = (data: Buffer) => {
      const output = data.toString();
      if (!resolved && output.includes("Running `")) {
        resolved = true;
        clearTimeout(timeout);
        resolve(apiProcess);
      }
    };

    apiProcess.stdout?.on("data", onData);
    apiProcess.stderr?.on("data", onData);

    apiProcess.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    apiProcess.on("exit", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(
          new Error(
            `API server exited with code ${code} before becoming ready`,
          ),
        );
      }
    });
  });
}

function test(title: string, testFunction: () => void): boolean {
  try {
    testFunction();
    console.log(`${title}: PASSED\n`);
    return true;
  } catch (error) {
    console.error(`${title}: FAILED\n${error}\n`);
    return false;
  }
}

async function testAsync(
  title: string,
  testFunction: () => Promise<void>,
): Promise<boolean> {
  try {
    await testFunction();
    console.log(`${title}: PASSED\n`);
    return true;
  } catch (error) {
    console.error(`${title}: FAILED\n${error}\n`);
    return false;
  }
}

const openai = new OpenAI({
  baseURL: `http://${process.env.ADDRESS ?? "localhost"}:${process.env.PORT ?? 5000}`,
  apiKey: process.env.OBJECTIVEAI_API_KEY,
});

async function main(): Promise<void> {
  const apiProcess = await spawnApiServer();

  test("Function Schema Validation", () =>
    Functions.RemoteFunctionSchema.parse(Function));

  test("Profile Schema Validation", () =>
    Functions.RemoteProfileSchema.parse(Profile));

  test("Example Inputs Schema Validation", () => {
    for (const input of ExampleInputs) {
      ExampleInputSchema.parse(input);
    }
  });

  test("Example Inputs Length Validation", () => {
    if (ExampleInputs.length < 10 || ExampleInputs.length > 100) {
      throw new Error(
        `Expected between 10 and 100 example inputs, but got ${ExampleInputs.length}`,
      );
    }
  });

  test("Example Inputs Validation", () => {
    for (const { value, outputLength } of ExampleInputs) {
      const result = Functions.validateFunctionInput(Function, value);
      if (!result) {
        throw new Error(
          `validation against Function's \`input_schema\` failed for input: ${JSON.stringify(value)}`,
        );
      }
      if (Function.type === "scalar.function") {
        if (outputLength !== null) {
          throw new Error(
            `expected \`outputLength\` to be null for scalar function input: ${JSON.stringify(value)}`,
          );
        }
      } else if (Function.type === "vector.function") {
        if (outputLength === null) {
          throw new Error(
            `expected \`outputLength\` to be non-null for vector function input: ${JSON.stringify(value)}`,
          );
        } else if (typeof outputLength !== "number") {
          throw new Error(
            `expected \`outputLength\` to be a number for vector function input: ${JSON.stringify(value)}`,
          );
        }
      }
    }
  });

  test("Compiled Task Validation", () => {
    for (const {
      value,
      compiledTasks: compiledTaskExpectations,
    } of ExampleInputs) {
      const compiledTasks = Functions.compileFunctionTasks(Function, value);
      if (compiledTasks.length !== compiledTaskExpectations.length) {
        throw new Error(
          `number of compiled tasks (${compiledTasks.length}) does not match number of compiled task expectations (${compiledTaskExpectations.length}) for input: ${JSON.stringify(value)}`,
        );
      }
      for (let i = 0; i < compiledTasks.length; i++) {
        const compiledTask = compiledTasks[i];
        const compiledTaskExpectation = compiledTaskExpectations[i];
        if (compiledTask === null) {
          if (compiledTaskExpectation.skipped === false) {
            throw new Error(
              `compiled task is null but compiled task expectation indicates it should not be skipped for input: ${JSON.stringify(value)}`,
            );
          }
        } else if (Array.isArray(compiledTask)) {
          if (compiledTask.length !== compiledTaskExpectation.mapped) {
            throw new Error(
              `number of mapped sub-tasks (${compiledTask.length}) does not match compiled task expectation mapped (${compiledTaskExpectation.mapped}) for input: ${JSON.stringify(value)}`,
            );
          }
          for (const subTask of compiledTask) {
            if (subTask.type !== compiledTaskExpectation.type) {
              throw new Error(
                `mapped sub-task type (${subTask.type}) does not match compiled task expectation type (${compiledTaskExpectation.type}) for input: ${JSON.stringify(value)}`,
              );
            }
          }
        } else if (compiledTask.type !== compiledTaskExpectation.type) {
          throw new Error(
            `compiled task type (${compiledTask.type}) does not match compiled task expectation type (${compiledTaskExpectation.type}) for input: ${JSON.stringify(value)}`,
          );
        } else if (compiledTaskExpectation.mapped !== null) {
          throw new Error(
            `compiled task is not mapped but compiled task expectation indicates it should be mapped for input: ${JSON.stringify(value)}`,
          );
        }
      }
    }
  });

  if (Function.type === "vector.function") {
    test("Vector Function Validation", () => {
      for (const { value, outputLength } of ExampleInputs) {
        // Validate output length
        const compiledOutputLength = Functions.compileFunctionOutputLength(
          Function,
          value,
        );
        if (compiledOutputLength === null) {
          throw new Error(
            `expected output length to be non-null for vector function input: ${JSON.stringify(value)}`,
          );
        } else if (compiledOutputLength !== outputLength) {
          throw new Error(
            `compiled output length (${compiledOutputLength}) does not match expected output length (${outputLength}) for vector function input: ${JSON.stringify(value)}`,
          );
        } else if (compiledOutputLength <= 1) {
          throw new Error(
            `expected output length to be greater than 1 for vector function input: ${JSON.stringify(value)}`,
          );
        }

        // Split input
        const inputSplit = Functions.compileFunctionInputSplit(Function, value);
        if (inputSplit === null) {
          throw new Error(
            `expected input split to be non-null for vector function input: ${JSON.stringify(value)}`,
          );
        }

        // Validate output length for each split input
        for (const splitInput of inputSplit) {
          const compiledSplitOutputLength =
            Functions.compileFunctionOutputLength(Function, splitInput);
          if (compiledSplitOutputLength !== 1) {
            throw new Error(
              `expected output length for split input to be 1, but got ${compiledSplitOutputLength} for split input: ${JSON.stringify(splitInput)}`,
            );
          }
        }

        // Merge outputs
        const mergedOutput = Functions.compileFunctionInputMerge(
          Function,
          inputSplit,
        );
        if (mergedOutput === null) {
          throw new Error(
            `expected merged output to be non-null for vector function input: ${JSON.stringify(value)}`,
          );
        }

        // Validate merged output length equals original output length
        const mergedOutputLength = Functions.compileFunctionOutputLength(
          Function,
          mergedOutput,
        );
        if (mergedOutputLength !== outputLength) {
          throw new Error(
            `merged output length (${mergedOutputLength}) does not match expected output length (${outputLength}) for vector function input: ${JSON.stringify(value)}`,
          );
        }
      }
    });

    await testAsync(
      "Vector Function Execution Validation (Default Strategy)",
      async () => {
        const promises = [];
        for (const { value } of ExampleInputs) {
          promises.push(
            Functions.Executions.inlineFunctionInlineProfileCreate(
              openai as any,
              {
                input: value,
                function: Function,
                profile: Profile,
                from_rng: true,
              },
            ),
          );
        }
        const results = await Promise.all(promises);
        for (let i = 0; i < ExampleInputs.length; i++) {
          const result = results[i];
          if (result.error !== null) {
            throw new Error(
              `function execution failed for input: ${JSON.stringify(ExampleInputs[i].value)} with error: ${result.error}`,
            );
          } else if (result.tasks_errors) {
            throw new Error(
              `function execution had task errors for input: ${JSON.stringify(ExampleInputs[i].value)}`,
            );
          }
        }
      },
    );

    await testAsync(
      "Vector Function Execution Validation (SwissSystem Strategy)",
      async () => {
        const promises = [];
        for (const { value } of ExampleInputs) {
          promises.push(
            Functions.Executions.inlineFunctionInlineProfileCreate(
              openai as any,
              {
                input: value,
                function: Function,
                profile: Profile,
                from_rng: true,
                strategy: {
                  type: "swiss_system",
                },
              },
            ),
          );
        }
        const results = await Promise.all(promises);
        for (let i = 0; i < ExampleInputs.length; i++) {
          const result = results[i];
          if (result.error !== null) {
            throw new Error(
              `function execution failed for input: ${JSON.stringify(ExampleInputs[i].value)} with error: ${result.error}`,
            );
          } else if (result.tasks_errors) {
            throw new Error(
              `function execution had task errors for input: ${JSON.stringify(ExampleInputs[i].value)}`,
            );
          }
        }
      },
    );
  } else if (Function.type === "scalar.function") {
    await testAsync(
      "Scalar Function Execution Validation (Default Strategy)",
      async () => {
        const promises = [];
        for (const { value } of ExampleInputs) {
          promises.push(
            Functions.Executions.inlineFunctionInlineProfileCreate(
              openai as any,
              {
                input: value,
                function: Function,
                profile: Profile,
                from_rng: true,
              },
            ),
          );
        }
        const results = await Promise.all(promises);
        for (let i = 0; i < ExampleInputs.length; i++) {
          const result = results[i];
          if (result.error !== null) {
            throw new Error(
              `function execution failed for input: ${JSON.stringify(ExampleInputs[i].value)} with error: ${result.error}`,
            );
          } else if (result.tasks_errors) {
            throw new Error(
              `function execution had task errors for input: ${JSON.stringify(ExampleInputs[i].value)}`,
            );
          }
        }
      },
    );
  }

  // kill the API server after tests
  apiProcess.kill();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
