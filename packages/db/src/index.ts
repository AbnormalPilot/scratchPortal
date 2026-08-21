/**
 * The only place the rest of the monorepo touches the database.
 *
 *   import { prisma, EventStage, Role } from '@repo/db';
 *
 * Nothing outside this package should import '@prisma/client' directly, so the
 * schema, the generated client and the connection settings stay in one place.
 */
export { prisma } from './client.js';
export * from '@prisma/client';
