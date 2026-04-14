import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Tool, ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { executeJxa } from "../applescript/execute.js";
import { escapeStringForJXA, isJXASafeString } from "../utils/escapeString.js";
import { getRecordLookupHelpers } from "../utils/jxaHelpers.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

const GetCustomMetadataSchema = z
	.object({
		uuid: z.string().describe("UUID of the record"),
		key: z.string().describe("The custom metadata field name"),
	})
	.strict();

type GetCustomMetadataInput = z.infer<typeof GetCustomMetadataSchema>;

interface GetCustomMetadataResult {
	success: boolean;
	error?: string;
	uuid?: string;
	key?: string;
	value?: string | number | boolean | null;
	valueType?: string;
}

const getCustomMetadata = async (
	input: GetCustomMetadataInput,
): Promise<GetCustomMetadataResult> => {
	const { uuid, key } = input;

	if (!isJXASafeString(uuid)) {
		return { success: false, error: "UUID contains invalid characters" };
	}
	if (!isJXASafeString(key)) {
		return { success: false, error: "Key contains invalid characters" };
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
        const metaKey = "${escapeStringForJXA(key)}";

        const cmdOpts = {};
        cmdOpts["for"] = metaKey;
        cmdOpts["from"] = record;
        const metaValue = theApp.getCustomMetaData(cmdOpts);

        const res = {};
        res["success"] = true;
        res["uuid"] = record.uuid();
        res["key"] = metaKey;

        if (metaValue === null || metaValue === undefined) {
          res["value"] = null;
          res["valueType"] = "null";
        } else if (metaValue instanceof Date) {
          res["value"] = metaValue.toISOString();
          res["valueType"] = "date";
        } else if (typeof metaValue === "number") {
          res["value"] = metaValue;
          res["valueType"] = "number";
        } else if (typeof metaValue === "boolean") {
          res["value"] = metaValue;
          res["valueType"] = "boolean";
        } else {
          res["value"] = String(metaValue);
          res["valueType"] = "text";
        }

        return JSON.stringify(res);
      } catch (error) {
        const err = {};
        err["success"] = false;
        err["error"] = error.toString();
        return JSON.stringify(err);
      }
    })();
  `;

	return await executeJxa<GetCustomMetadataResult>(script);
};

export const getCustomMetadataTool: Tool = {
	name: "get_custom_metadata",
	description:
		'Gets a custom metadata field from a DEVONthink record.\n\nReturns the value and its detected type (text, number, boolean, date, or null).\n\nExample:\n{\n  "uuid": "1234-5678-90AB-CDEF",\n  "key": "projectName"\n}',
	inputSchema: zodToJsonSchema(GetCustomMetadataSchema) as ToolInput,
	run: getCustomMetadata,
};
