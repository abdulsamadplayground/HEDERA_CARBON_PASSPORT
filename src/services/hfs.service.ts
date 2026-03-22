import {
  FileCreateTransaction,
  FileContentsQuery,
  FileId,
} from "@hashgraph/sdk";
import { getClient, getOperatorKey } from "@/lib/hedera/client";
import { setValue, getValue } from "@/lib/local-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HederaFileType = "LCA_REPORT" | "CERTIFICATE" | "VISUAL_METADATA";

export interface FileRecord {
  fileId: string;
  fileType: HederaFileType;
  associatedEntity: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Persists a file ID to the local config store, linked to the associated entity.
 * Files are stored under `files.<entityType>.<entityId>`.
 */
function persistFileId(
  fileId: FileId,
  fileType: HederaFileType,
  associatedEntity: string
): void {
  const key = `files.${fileType}.${associatedEntity}`;
  const record: FileRecord = {
    fileId: fileId.toString(),
    fileType,
    associatedEntity,
    createdAt: new Date().toISOString(),
  };
  setValue(key, record);
}

/**
 * Loads a previously-persisted file record from the local config store.
 */
export function loadFileRecord(
  fileType: HederaFileType,
  associatedEntity: string
): FileRecord | null {
  const key = `files.${fileType}.${associatedEntity}`;
  const raw = getValue(key);
  if (raw && typeof raw === "object" && "fileId" in (raw as Record<string, unknown>)) {
    return raw as FileRecord;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core HFS functions
// ---------------------------------------------------------------------------

/**
 * Uploads content to a new Hedera file via FileCreateTransaction.
 * Retries once on failure, logging the Hedera response code.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */
export async function uploadFile(
  content: Buffer,
  memo?: string
): Promise<FileId> {
  const client = await getClient();
  const operatorKey = getOperatorKey();

  async function attempt(): Promise<FileId> {
    const tx = new FileCreateTransaction()
      .setContents(content)
      .setKeys([operatorKey]);

    if (memo) {
      tx.setFileMemo(memo);
    }

    const signedTx = await tx.freezeWith(client).sign(operatorKey);
    const response = await signedTx.execute(client);
    const receipt = await response.getReceipt(client);

    console.log(
      `[HFS] File uploaded — txId=${response.transactionId}, status=${receipt.status}, fileId=${receipt.fileId}`
    );

    if (!receipt.fileId) {
      throw new Error(
        `File creation succeeded but no fileId returned. status=${receipt.status}`
      );
    }

    return receipt.fileId;
  }

  try {
    return await attempt();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `[HFS] File upload failed, retrying once… Error: ${msg}`
    );
    return await attempt();
  }
}

/**
 * Retrieves the contents of a Hedera file by its file ID.
 *
 * Requirements: 4.6
 */
export async function getFileContents(fileId: FileId): Promise<Buffer> {
  const client = await getClient();

  const contents = await new FileContentsQuery()
    .setFileId(fileId)
    .execute(client);

  console.log(
    `[HFS] File contents retrieved — fileId=${fileId}, size=${contents.length} bytes`
  );

  return Buffer.from(contents);
}

// ---------------------------------------------------------------------------
// High-level operations (with local store persistence)
// ---------------------------------------------------------------------------

/**
 * Uploads a file and persists the file ID in the local config store,
 * linked to the specified entity (product, certificate, or token).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export async function uploadAndPersistFile(
  content: Buffer,
  fileType: HederaFileType,
  associatedEntity: string,
  memo?: string
): Promise<FileId> {
  const fileId = await uploadFile(content, memo);
  persistFileId(fileId, fileType, associatedEntity);
  return fileId;
}
