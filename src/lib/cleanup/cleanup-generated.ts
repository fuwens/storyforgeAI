import fs from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/db/prisma";

const GENERATED_DIR = path.join(process.cwd(), "public", "generated");
const MAX_AGE_DAYS = 30;
const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export type CleanupResult = {
  scanned: number;
  deleted: number;
  bytesFreed: number;
  skipped: number;
  errors: string[];
};

/** Get disk usage stats for the generated directory */
export async function getGeneratedDirStats(): Promise<{
  fileCount: number;
  totalBytes: number;
}> {
  let fileCount = 0;
  let totalBytes = 0;

  try {
    const entries = await fs.readdir(GENERATED_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const stat = await fs.stat(path.join(GENERATED_DIR, entry.name));
        fileCount++;
        totalBytes += stat.size;
      } catch {
        // ignore stat errors for individual files
      }
    }
  } catch {
    // Directory might not exist yet
  }

  return { fileCount, totalBytes };
}

/** Clean up old files in public/generated that are not referenced by approved assets */
export async function cleanupGenerated(): Promise<CleanupResult> {
  const result: CleanupResult = {
    scanned: 0,
    deleted: 0,
    bytesFreed: 0,
    skipped: 0,
    errors: [],
  };

  // Ensure the directory exists
  try {
    await fs.mkdir(GENERATED_DIR, { recursive: true });
  } catch {
    // already exists
  }

  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(GENERATED_DIR, { withFileTypes: true }) as import("node:fs").Dirent[];
  } catch (err) {
    result.errors.push(`Failed to read directory: ${String(err)}`);
    return result;
  }

  const now = Date.now();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    result.scanned++;

    const filePath = path.join(GENERATED_DIR, entry.name);
    let stat: Awaited<ReturnType<typeof fs.stat>>;
    try {
      stat = await fs.stat(filePath);
    } catch {
      result.errors.push(`Cannot stat: ${entry.name}`);
      continue;
    }

    const ageMs = now - stat.mtimeMs;
    if (ageMs < MAX_AGE_MS) {
      result.skipped++;
      continue;
    }

    // Build the relative URL as stored in the DB (e.g., /generated/filename.zip)
    const relativeUrl = `/generated/${entry.name}`;

    // Check if this file is referenced by any approved asset
    const approvedCount = await prisma.asset.count({
      where: {
        storageUrl: relativeUrl,
        approved: true,
      },
    });

    if (approvedCount > 0) {
      result.skipped++;
      continue;
    }

    // Safe to delete — null out any non-approved asset references first
    try {
      await prisma.asset.updateMany({
        where: { storageUrl: relativeUrl },
        data: { storageUrl: null },
      });
    } catch (err) {
      result.errors.push(`DB update failed for ${entry.name}: ${String(err)}`);
      // Still try to delete
    }

    try {
      await fs.unlink(filePath);
      result.deleted++;
      result.bytesFreed += stat.size;
    } catch (err) {
      result.errors.push(`Delete failed for ${entry.name}: ${String(err)}`);
    }
  }

  return result;
}
