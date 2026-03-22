/**
 * Database abstraction layer.
 * 
 * Uses a local JSON-file-backed store instead of PostgreSQL.
 * All Hedera transactions (HCS, HTS, HSCS, HFS) remain the authoritative
 * source of truth. This local store is a convenience cache that can be
 * reconstructed from Hedera Mirror Node at any time.
 */

import localDb from "@/lib/local-db";

export const prisma = localDb;
export default prisma;
