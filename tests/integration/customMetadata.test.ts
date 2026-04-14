import { describe, it, expect } from "vitest";
import { jxa, getTestContext, createTestRecord, deleteRecord } from "./helpers.js";

describe("custom metadata", () => {
	it("round-trips a text value", async () => {
		const ctx = getTestContext();
		const rec = await createTestRecord(ctx, "CustomMeta-Text", "markdown", "# Test");
		try {
			await jxa(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "testTextField";
        opts["to"] = record;
        theApp.addCustomMetaData("hello world", opts);
        return JSON.stringify({ success: true });
      `);

			const get = await jxa<{
				success: boolean;
				value?: string | null;
			}>(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "testTextField";
        opts["from"] = record;
        const val = theApp.getCustomMetaData(opts);
        const r = {};
        r["success"] = true;
        r["value"] = val;
        return JSON.stringify(r);
      `);
			expect(get.success).toBe(true);
			expect(get.value).toBe("hello world");
		} finally {
			await deleteRecord(rec.uuid);
		}
	});

	it("round-trips a number value", async () => {
		const ctx = getTestContext();
		const rec = await createTestRecord(ctx, "CustomMeta-Number", "markdown", "# Test");
		try {
			await jxa(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "testNumberField";
        opts["to"] = record;
        theApp.addCustomMetaData(42, opts);
        return JSON.stringify({ success: true });
      `);

			const get = await jxa<{
				success: boolean;
				value?: number | null;
			}>(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "testNumberField";
        opts["from"] = record;
        const val = theApp.getCustomMetaData(opts);
        const r = {};
        r["success"] = true;
        r["value"] = val;
        return JSON.stringify(r);
      `);
			expect(get.success).toBe(true);
			expect(get.value).toBe(42);
		} finally {
			await deleteRecord(rec.uuid);
		}
	});

	it("round-trips a boolean value", async () => {
		const ctx = getTestContext();
		const rec = await createTestRecord(ctx, "CustomMeta-Bool", "markdown", "# Test");
		try {
			await jxa(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "testBoolField";
        opts["to"] = record;
        theApp.addCustomMetaData(true, opts);
        return JSON.stringify({ success: true });
      `);

			const get = await jxa<{
				success: boolean;
				value?: boolean | null;
			}>(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "testBoolField";
        opts["from"] = record;
        const val = theApp.getCustomMetaData(opts);
        const r = {};
        r["success"] = true;
        r["value"] = val;
        return JSON.stringify(r);
      `);
			expect(get.success).toBe(true);
			expect(get.value).toBe(true);
		} finally {
			await deleteRecord(rec.uuid);
		}
	});

	it("returns null for a non-existent metadata key", async () => {
		const ctx = getTestContext();
		const rec = await createTestRecord(ctx, "CustomMeta-Missing", "markdown", "# Test");
		try {
			const get = await jxa<{
				success: boolean;
				value?: unknown;
			}>(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "nonExistentKey";
        opts["from"] = record;
        const val = theApp.getCustomMetaData(opts);
        const r = {};
        r["success"] = true;
        r["value"] = val !== undefined ? val : null;
        return JSON.stringify(r);
      `);
			expect(get.success).toBe(true);
			expect(get.value).toBeNull();
		} finally {
			await deleteRecord(rec.uuid);
		}
	});

	it("overwrites an existing custom metadata value", async () => {
		const ctx = getTestContext();
		const rec = await createTestRecord(ctx, "CustomMeta-Overwrite", "markdown", "# Test");
		try {
			await jxa(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "mutableField";
        opts["to"] = record;
        theApp.addCustomMetaData("first", opts);
        return JSON.stringify({ success: true });
      `);

			await jxa(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "mutableField";
        opts["to"] = record;
        theApp.addCustomMetaData("second", opts);
        return JSON.stringify({ success: true });
      `);

			const get = await jxa<{
				success: boolean;
				value?: string | null;
			}>(`
        const record = theApp.getRecordWithUuid("${rec.uuid}");
        const opts = {};
        opts["for"] = "mutableField";
        opts["from"] = record;
        const val = theApp.getCustomMetaData(opts);
        const r = {};
        r["success"] = true;
        r["value"] = val;
        return JSON.stringify(r);
      `);
			expect(get.success).toBe(true);
			expect(get.value).toBe("second");
		} finally {
			await deleteRecord(rec.uuid);
		}
	});
});
