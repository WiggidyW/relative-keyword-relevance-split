import { Functions } from "objectiveai";
import { ExampleInput } from "./example_input";

export const Function: Functions.RemoteFunction = {
  type: "scalar.function",
  input_maps: null,
  description: "Placeholder function.",
  changelog: null,
  input_schema: {
    type: "integer",
  },
  tasks: [
    {
      type: "vector.completion",
      skip: null,
      map: null,
      messages: [
        {
          role: "user",
          content: {
            $jmespath:
              "join('',['How much do you like the number ',to_string(input),'?'])",
          },
        },
      ],
      tools: null,
      responses: [
        {
          $jmespath:
            "join('',['I REALLY LOVE the number ',to_string(input),'!'])",
        },
        {
          $jmespath: "join('',['Meh, ',to_string(input),' is okay I guess.'])",
        },
        {
          $jmespath: "join('',['I HATE the number ',to_string(input),'!'])",
        },
      ],
    },
  ],
  output: {
    $jmespath: "add(tasks[0].scores[0],multiply(tasks[0].scores[1],`0.5`))",
  },
};

export const Profile: Functions.RemoteProfile = {
  description: "Placeholder profile.",
  changelog: null,
  tasks: [
    {
      ensemble: {
        llms: [
          {
            model: "openai/gpt-4.1-nano",
            output_mode: "json_schema",
          },
          {
            model: "google/gemini-2.5-flash-lite",
            output_mode: "json_schema",
          },
          {
            model: "x-ai/grok-4.1-fast",
            output_mode: "json_schema",
            reasoning: {
              enabled: false,
            },
          },
          {
            model: "openai/gpt-4o-mini",
            output_mode: "json_schema",
            top_logprobs: 20,
          },
          {
            model: "deepseek/deepseek-v3.2",
            output_mode: "instruction",
            top_logprobs: 20,
          },
        ],
      },
      profile: [1.0, 1.0, 1.0, 1.0, 1.0],
    },
  ],
};

export const ExampleInputs: ExampleInput[] = [
  {
    value: 5,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: 10,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: -3,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: 21,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: 0,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: -7,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: 12154235,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: -4636,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: 989898,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
  {
    value: 42,
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: null,
      },
    ],
    outputLength: null,
  },
];
