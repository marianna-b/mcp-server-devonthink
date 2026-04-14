import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Tool, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { executeJxa } from "../applescript/execute.js";
import { escapeStringForJXA, isJXASafeString } from "../utils/escapeString.js";
import { getRecordLookupHelpers } from "../utils/jxaHelpers.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const SetCustomMetadataSchema = z
	.object({
		uuid: z.string().describe("UUID of the record"),
		key: z.string().describe("The custom metadata field name"),
		value: z
			.union([z.string(), z.number(), z.boolean()])
			.describe("The value to set (text, number, or boolean)"),
		valueType: z
			.enum(["text", "date"])
			.optional()
			.describe(
				"Type hint — use 'date' when the string value is an ISO 8601 date that should be stored as a date. Otherwise the native type of 'value' is used automatically.",
			),
	})
	.strict();

type SetCustomMetadataInput = z.infer<typeof SetCustomMetadataSchema>;

interface SetCustomMetadataResult {
	success: boolean;
	error?: string;
	uuid?: string;
	key?: string;
}

const setCustomMetadata = async (
	input: SetCustomMetadataInput,
): Promise<SetCustomMetadataResult> => {
	const { uuid, key, value, valueType } = input;

	if (!isJXASafeString(uuid)) {
		return { success: false, error: "UUID contains invalid characters" };
	}
	if (!isJXASafeString(key)) {
		return { success: false, error: "Key contains invalid characters" };
	}
	if (typeof value === "string" && !isJXASafeString(value)) {
		return { success: false, error: "Value contains invalid characters" };
	}

	let jxaValueExpr: string;
	if (valueType === "date" && typeof value === "string") {
		jxaValueExpr = `new Date("${escapeStringForJXA(value)}")`;
	} else if (typeof value === "string") {
		jxaValueExpr = `"${escapeStringForJXA(value)}"`;
	} else {
		jxaValueExpr = String(value);
	}

	const script = `
    (() => {
      const theApp = Application("DEVONthink");
      theApp.includeStandardAdditions = true;

      ${getRecordLookupHelpers()}

      try {
        const lookupOptions = {};
        lookupOptions["uuid"] = "${escapeStringForJXA(uuid)}";

        const lookupResult = getRecord(theApp, lookupOptions);
        if (!lookupResult || !lookupResult.record) {
          const err = {};
          err["success"] = false;
          err["error"] = "Record with UUID ${escapeStringForJXA(uuid)} not found";
          return JSON.stringify(err);
        }

        const record = lookupResult.record;
        const metaValue = ${jxaValueExpr};
        const metaKey = "${escapeStringForJXA(key)}";

        const cmdOpts = {};
        cmdOpts["for"] = metaKey;
        cmdOpts["to"] = record;
        theApp.addCustomMetaData(metaValue, cmdOpts);

        const res = {};
        res["success"] = true;
        res["uuid"] = record.uuid();
        res["key"] = metaKey;
        return JSON.stringify(res);
      } catch (error) {
        const err = {};
        err["success"] = false;
        err["error"] = error.toString();
        return JSON.stringify(err);
      }
    })();
  `;

	return await executeJxa<SetCustomMetadataResult>(script);
};

export const setCustomMetadataTool: Tool = {
	name: "set_custom_metadata",
	description:
		'Sets a custom metadata field on a DEVONthink record.\n\nExample:\n{\n  "uuid": "1234-5678-90AB-CDEF",\n  "key": "projectName",\n  "value": "My Project"\n}\n\nFor dates, pass an ISO 8601 string and set valueType to "date":\n{\n  "uuid": "1234-5678-90AB-CDEF",\n  "key": "dueDate",\n  "value": "2025-12-31T00:00:00Z",\n  "valueType": "date"\n}',
	inputSchema: zodToJsonSchema(SetCustomMetadataSchema) as ToolInput,
	run: setCustomMetadata,
};
