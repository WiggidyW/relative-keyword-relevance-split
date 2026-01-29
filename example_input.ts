import { Functions } from "objectiveai";
import z from "zod";

export const CompiledTaskExpectationSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("vector.completion"),
      skipped: z.boolean().describe("Whether the task was skipped"),
      mapped: z
        .uint32()
        .nullable()
        .describe("The number of mapped sub-tasks, or null if non-mapped"),
    }),
    z.object({
      type: z.literal("scalar.function"),
      skipped: z.boolean().describe("Whether the task was skipped"),
      mapped: z
        .uint32()
        .nullable()
        .describe("The number of mapped sub-tasks, or null if non-mapped"),
    }),
    z.object({
      type: z.literal("vector.function"),
      skipped: z.boolean().describe("Whether the task was skipped"),
      mapped: z
        .uint32()
        .nullable()
        .describe("The number of mapped sub-tasks, or null if non-mapped"),
    }),
  ])
  .describe("Schema for compiled task expectations");
export type CompiledTaskExpectation = z.infer<
  typeof CompiledTaskExpectationSchema
>;

export const ExampleInputSchema = z.object({
  value: Functions.Expression.InputValueSchema,
  compiledTasks: z.array(CompiledTaskExpectationSchema),
  outputLength: z
    .uint32()
    .nullable()
    .describe("Expected output length for vector functions"),
});
export type ExampleInput = z.infer<typeof ExampleInputSchema>;
