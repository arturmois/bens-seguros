import { z } from 'zod';

const jsonLiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

type JsonLiteral = z.infer<typeof jsonLiteralSchema>;
type JsonValue = JsonLiteral | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([jsonLiteralSchema, z.array(jsonValueSchema), z.record(jsonValueSchema)]),
);

export const jsonObjectSchema: z.ZodType<{ [key: string]: JsonValue }> = z.record(jsonValueSchema);
