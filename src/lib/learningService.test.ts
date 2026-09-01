import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ supabase: null }))

import { listLearningRecordStorageObjects, parseLearningAsset, parseLearningAssetAnalysis, parseLearningRecord, runLearningCreateFlow, runLearningDeleteFlow } from "@/lib/learningService"

describe("learning service flow", () => {
  it("uses pure insert, uploads, metadata insert, then a separate select", async () => {
    const order: string[] = []
    await expect(runLearningCreateFlow({ insertRecord: async () => { order.push("insert") }, uploadAssets: async () => { order.push("upload"); return [{ bucket: "learning-materials-documents", path: "learning/u/r/a.pdf" }] }, insertMetadata: async () => { order.push("metadata") }, selectRecord: async () => { order.push("select"); return "record" }, cleanupStorage: async () => { order.push("cleanup") }, rollbackRecord: async () => { order.push("rollback") } })).resolves.toBe("record")
    expect(order).toEqual(["insert", "upload", "metadata", "select"])
  })
  it("cleans uploaded objects and rolls back the record after metadata failure", async () => {
    const cleanup = vi.fn(async () => undefined); const rollback = vi.fn(async () => undefined)
    const object = { bucket: "learning-materials-documents", path: "learning/u/r/a.pdf" }
    await expect(runLearningCreateFlow({ insertRecord: async () => undefined, uploadAssets: async () => [object], insertMetadata: async () => { throw new Error("metadata") }, selectRecord: async () => "never", cleanupStorage: cleanup, rollbackRecord: rollback })).rejects.toThrow("metadata")
    expect(cleanup).toHaveBeenCalledWith([object]); expect(rollback).toHaveBeenCalledOnce()
  })
  it("does not upload or select when record insertion fails", async () => {
    const upload = vi.fn(async () => []); const select = vi.fn(async () => "record")
    await expect(runLearningCreateFlow({ insertRecord: async () => { throw new Error("insert") }, uploadAssets: upload, insertMetadata: async () => undefined, selectRecord: select, cleanupStorage: async () => undefined, rollbackRecord: async () => undefined })).rejects.toThrow("insert")
    expect(upload).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled()
  })
  it("parses snake_case rows and keeps assets attached to their record", () => {
    const asset = parseLearningAsset({ id: "a", record_id: "r", user_id: "u", asset_type: "image", original_name: "x.png", mime_type: "image/png", file_size: 1, storage_bucket: "learning-materials-images", storage_path: "learning/u/r/a.png", sort_order: 0, processing_status: "uploaded", created_at: "2026-09-01" })
    expect(asset).not.toBeNull()
    expect(parseLearningRecord({ id: "r", user_id: "u", record_date: "2026-09-01", title: null, course_name: null, course_key: null, record_type: "daily", content: "note", mood_note: null, processing_status: "uploaded", analysis_json: null, created_at: "2026-09-01", updated_at: "2026-09-01" }, asset ? [asset] : [])?.assets).toHaveLength(1)
  })
  it("parses only the stable versioned learning analysis schema", () => {
    expect(parseLearningAssetAnalysis({ version: 1, summary: "摘要", keyPoints: ["重点"], contentType: "笔记", language: "中文", suggestedReview: "复习", warnings: [] })).toMatchObject({ version: 1, summary: "摘要" })
    expect(parseLearningAssetAnalysis({ summary: "missing version" })).toBeNull()
  })
  it("deletes record Storage objects before the database record", async () => {
    const order: string[] = []
    await runLearningDeleteFlow({ getStorageObjects: async () => { order.push("paths"); return [{ bucket: "learning-materials-images", path: "learning/u/r/a.jpg" }] }, deleteStorage: async () => { order.push("storage") }, deleteDatabase: async () => { order.push("record") } })
    expect(order).toEqual(["paths", "storage", "record"])
  })
  it("lists real record objects across all three buckets, including objects without metadata", async () => {
    const calls: string[] = []
    const objects = await listLearningRecordStorageObjects("user", "record", async (bucket, prefix) => {
      calls.push(`${bucket}:${prefix}`)
      return bucket === "learning-materials-images" ? ["image.jpg"] : bucket === "learning-materials-audio" ? ["orphan.webm"] : []
    })
    expect(calls).toEqual([
      "learning-materials-images:learning/user/record",
      "learning-materials-documents:learning/user/record",
      "learning-materials-audio:learning/user/record",
    ])
    expect(objects).toEqual([
      { bucket: "learning-materials-images", path: "learning/user/record/image.jpg" },
      { bucket: "learning-materials-audio", path: "learning/user/record/orphan.webm" },
    ])
  })
  it("does not delete a record when listing a Storage bucket fails", async () => {
    const removeRecord = vi.fn(async () => undefined)
    await expect(runLearningDeleteFlow({ getStorageObjects: async () => { throw new Error("list") }, deleteStorage: async () => undefined, deleteDatabase: removeRecord })).rejects.toThrow("list")
    expect(removeRecord).not.toHaveBeenCalled()
  })
  it("deletes the record after all real Storage objects are removed", async () => {
    const order: string[] = []
    const objects = await listLearningRecordStorageObjects("user", "record", async (bucket) => bucket === "learning-materials-documents" ? ["orphan.pdf"] : [])
    await runLearningDeleteFlow({ getStorageObjects: async () => objects, deleteStorage: async () => { order.push("storage") }, deleteDatabase: async () => { order.push("record") } })
    expect(order).toEqual(["storage", "record"])
  })
  it("deletes one asset from Storage before its metadata row", async () => {
    const order: string[] = []
    await runLearningDeleteFlow({ getStorageObjects: async () => [{ bucket: "learning-materials-documents", path: "learning/u/r/a.pdf" }], deleteStorage: async () => { order.push("storage") }, deleteDatabase: async () => { order.push("metadata") } })
    expect(order).toEqual(["storage", "metadata"])
  })
  it("does not delete database metadata when Storage deletion fails", async () => {
    const removeMetadata = vi.fn(async () => undefined)
    await expect(runLearningDeleteFlow({ getStorageObjects: async () => [{ bucket: "learning-materials-documents", path: "learning/u/r/a.pdf" }], deleteStorage: async () => { throw new Error("storage") }, deleteDatabase: removeMetadata })).rejects.toThrow("storage")
    expect(removeMetadata).not.toHaveBeenCalled()
  })
})
