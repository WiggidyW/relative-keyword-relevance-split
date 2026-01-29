import { Functions } from "objectiveai";
import { ExampleInput } from "./example_input";

export const Function: Functions.RemoteFunction = {
  type: "vector.function",
  description:
    "Keyword-based Relevance Rankings. Discover which piece of content is most relevant to specific keywords. Splits each keyword into a separate Vector Completion Task.",
  input_schema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        description: "Keywords to evaluate relevance against.",
        minItems: 1,
        items: {
          type: "string",
          description: "A keyword to evaluate relevance against.",
        },
      },
      contentItems: {
        type: "array",
        description: "Content items to be ranked for relevance.",
        minItems: 1,
        items: {
          anyOf: [
            {
              type: "string",
              description: "Text content to be evaluated for relevance.",
            },
            {
              type: "image",
              description: "Image content to be evaluated for relevance.",
            },
            {
              type: "video",
              description: "Video content to be evaluated for relevance.",
            },
            {
              type: "audio",
              description: "Audio content to be evaluated for relevance.",
            },
            {
              type: "file",
              description: "File content to be evaluated for relevance.",
            },
            {
              type: "array",
              description:
                "Array of content pieces to be evaluated for relevance.",
              minItems: 1,
              items: {
                anyOf: [
                  {
                    type: "string",
                    description: "Text content to be evaluated for relevance.",
                  },
                  {
                    type: "image",
                    description: "Image content to be evaluated for relevance.",
                  },
                  {
                    type: "video",
                    description: "Video content to be evaluated for relevance.",
                  },
                  {
                    type: "audio",
                    description: "Audio content to be evaluated for relevance.",
                  },
                  {
                    type: "file",
                    description: "File content to be evaluated for relevance.",
                  },
                ],
              },
            },
          ],
        },
      },
    },
    required: ["keywords", "contentItems"],
  },
  input_maps: {
    $jmespath: "to_array(input.keywords)",
  },
  tasks: [
    {
      type: "vector.completion",
      map: 0,
      messages: [
        {
          role: "user",
          content: {
            $jmespath:
              "join('',['Which content is most relevant with regards to \"',map,'\"?'])",
          },
        },
      ],
      responses: {
        $jmespath:
          "input.contentItems[].input_value_switch(@,`null`,&[].input_value_switch(@,`null`,`null`,&{type:'text',text:@},`null`,`null`,`null`,@,@,@,@),@,`null`,`null`,`null`,@,@,@,@)",
      },
    },
  ],
  output: {
    $jmespath: "zip_map(&avg(@),tasks[0][].scores)",
  },
  output_length: {
    $jmespath: "length(input.contentItems)",
  },
  input_split: {
    $jmespath:
      "zip_map(&{keywords:@[0],contentItems:[@[1]]},[repeat(input.keywords,length(input.contentItems)),input.contentItems])",
  },
  input_merge: {
    $jmespath:
      "@.{keywords:input[0].keywords,contentItems:input[].contentItems[0]}",
  },
};

export const Profile: Functions.RemoteProfile = {
  description:
    "The default profile for `WiggidyW/relative-keyword-relevance-split`. Non-Reasoning. Supports multi-modal content.",
  tasks: [
    {
      ensemble: {
        llms: [
          {
            model: "openai/gpt-4.1-nano",
            output_mode: "json_schema",
          },
          {
            model: "openai/gpt-4.1-nano",
            output_mode: "json_schema",
            temperature: 0.75,
          },
          {
            model: "openai/gpt-4.1-nano",
            output_mode: "json_schema",
            temperature: 1.25,
          },
          {
            model: "google/gemini-2.5-flash-lite",
            output_mode: "json_schema",
          },
          {
            model: "x-ai/grok-4.1-fast",
            output_mode: "json_schema",
            temperature: 0.75,
            reasoning: {
              enabled: false,
            },
          },
          {
            model: "x-ai/grok-4.1-fast",
            output_mode: "json_schema",
            temperature: 1.25,
            reasoning: {
              enabled: false,
            },
          },
          {
            count: 3,
            model: "deepseek/deepseek-v3.2",
            output_mode: "instruction",
            top_logprobs: 20,
          },
          {
            model: "google/gemini-2.5-flash-lite",
            output_mode: "json_schema",
            temperature: 0.75,
          },
          {
            model: "google/gemini-2.5-flash-lite",
            output_mode: "json_schema",
            temperature: 1.25,
          },
          {
            count: 3,
            model: "openai/gpt-4o-mini",
            output_mode: "json_schema",
            top_logprobs: 20,
          },
          {
            model: "x-ai/grok-4.1-fast",
            output_mode: "json_schema",
            reasoning: {
              enabled: false,
            },
          },
        ],
      },
      profile: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    },
  ],
};

export const ExampleInputs: ExampleInput[] = [
  {
    value: {
      keywords: ["GraphQL", "API design", "REST alternatives"],
      contentItems: [
        "The schema-first approach defines types and resolvers declaratively, enabling introspection and automatic documentation generation for frontend developers.",
        "Called customer support today. Was on hold for 47 minutes. Their API—I mean, their phone system—is absolutely terrible.",
        "Overfetching and underfetching problems are eliminated when clients can specify exactly which fields they need in a single query.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 3,
      },
    ],
    outputLength: 3,
  },
  {
    value: {
      keywords: ["impressionism", "Monet"],
      contentItems: [
        "The Water Lilies series captures light's ephemeral qualities across different times of day, with Monet painting the same pond obsessively for decades.",
        "My impression of my boss: 'We need to synergize our core competencies!' Nailed it tbh 😂",
        "The museum gift shop had some nice prints but they were way overpriced. $40 for a poster?? no thanks",
        "Loose brushwork and visible strokes prioritize capturing atmospheric conditions over photographic accuracy.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 2,
      },
    ],
    outputLength: 4,
  },
  {
    value: {
      keywords: ["volleyball"],
      contentItems: [
        "The libero position, introduced in 1998, allows teams to substitute a defensive specialist without counting against their substitution limit.",
        "Beach day was ruined when some kids' volleyball landed in our picnic. Potato salad everywhere. Absolute chaos.",
        "Spike timing requires reading the setter's hands and approaching at the optimal angle to attack around the block.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 1,
      },
    ],
    outputLength: 3,
  },
  {
    value: {
      keywords: ["thermodynamics", "entropy", "heat transfer"],
      contentItems: [
        "The second law states that the total entropy of an isolated system can only increase over time, approaching maximum entropy at equilibrium.",
        "it's hot outside. really hot. like... TOO hot. summer is cancelled imo 🥵☀️",
        "Fourier's law describes conductive heat transfer: q = -k∇T, where k represents thermal conductivity and ∇T the temperature gradient.",
        "My coffee got cold while I was on that meeting. Classic Monday.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 3,
      },
    ],
    outputLength: 4,
  },
  {
    value: {
      keywords: ["origami", "paper folding", "Japanese arts"],
      contentItems: [
        "Wet-folding techniques allow for curved surfaces and more naturalistic forms, though they require heavier paper and greater skill.",
        "I folded my laundry today! Well... I put it in a pile on the chair. That counts right?",
        "The traditional crane (orizuru) requires 16 steps and has become a symbol of peace following Sadako Sasaki's story.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 3,
      },
    ],
    outputLength: 3,
  },
  {
    value: {
      keywords: ["astrophotography", "long exposure"],
      contentItems: [
        "Stack multiple 30-second exposures to reveal faint nebulae while avoiding star trailing. Use a tracking mount for exposures exceeding Earth's rotation rate.",
        "Took a blurry pic of the moon with my phone. You can kinda see it if you squint. Good enough for Instagram stories!",
        "Light pollution mapping tools help identify dark sky sites within driving distance for optimal imaging conditions.",
        "the stars are pretty i guess. saw some last time the power went out in my neighborhood",
        "Calibration frames—darks, flats, and bias—mathematically remove sensor noise and optical aberrations during post-processing.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 2,
      },
    ],
    outputLength: 5,
  },
  {
    value: {
      keywords: ["mixology", "cocktails", "bartending"],
      contentItems: [
        "A proper dry martini demands stirring—not shaking—to achieve clarity and silky texture without introducing air bubbles or ice shards.",
        "Just cracked open a beer. Twist-off cap technology is truly humanity's greatest achievement.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 3,
      },
    ],
    outputLength: 2,
  },
  {
    value: {
      keywords: ["beekeeping", "apiculture"],
      contentItems: [
        "Inspect hives every 7-10 days during nectar flow, checking for queen cells, brood patterns, and signs of disease or pest infestation.",
        "OUCH!!! Something stung me at the park!! Probably a wasp or bee or something idk they all look the same to me",
        "Smokers calm bees by triggering a feeding response—they gorge on honey preparing for potential hive evacuation.",
        "Honey is delicious on toast. That's my hot take. Revolutionary stuff here folks.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 2,
      },
    ],
    outputLength: 4,
  },
  {
    value: {
      keywords: ["calligraphy", "lettering", "penmanship"],
      contentItems: [
        "Copperplate script requires a flexible pointed nib held at 55 degrees, with pressure variation creating the characteristic thick-thin contrast.",
        "my handwriting is trash lol. doctors probably look at my notes and think 'finally someone who understands us'",
        "The quick brown fox jumps over the lazy dog. There, I practiced my typing. Same thing basically.",
        "Sumi ink must reach proper consistency—too thick causes dragging, too thin produces weak, bleeding strokes on washi paper.",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 3,
      },
    ],
    outputLength: 4,
  },
  {
    value: {
      keywords: ["automotive restoration", "classic cars", "vintage vehicles"],
      contentItems: [
        "Numbers-matching drivetrain components significantly impact valuation—a 1969 Camaro Z/28 with original DZ302 commands substantial premiums.",
        "My car is from 2019. That's practically vintage in phone years!!",
        "Proper body prep includes media blasting to bare metal, treating rust with phosphoric acid converter, then applying epoxy primer within 24 hours.",
        "vroom vroom car go fast haha 🚗💨 thats all i know about automobiles tbh",
      ],
    },
    compiledTasks: [
      {
        type: "vector.completion",
        skipped: false,
        mapped: 3,
      },
    ],
    outputLength: 4,
  },
];
