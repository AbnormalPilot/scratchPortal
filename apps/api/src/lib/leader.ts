import { randomUUID } from 'crypto';
import { getRedis, redisEnabled } from './redis.js';

/**
 * Single-writer election.
 *
 * The background stage watcher in index.ts mutates EventConfig and emits global
 * broadcasts every tick. If every API replica ran it, each scheduled transition
 * would fire N times: N audit log rows, N stage broadcasts, N timer resets.
 * Only the replica holding this lock ticks; the others idle and take over
 * automatically within LOCK_TTL_MS if the leader dies.
 *
 * With no Redis configured there is only one process, so it is always leader.
 */
const LOCK_KEY = 'scratch:lock:stage-watcher';
const LOCK_TTL_MS = 15_000;

export const INSTANCE_ID = process.env.INSTANCE_ID || `${process.env.HOSTNAME || 'local'}-${randomUUID().slice(0, 8)}`;

// Renew only if we still own the lock (avoids stealing it back after a failover).
const RENEW_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
else
  return 0
end`;

let wasLeader = false;

export async function acquireLeadership(): Promise<boolean> {
  if (!redisEnabled) return true;

  const redis = getRedis();
  if (!redis) return true;

  try {
    const renewed = (await redis.eval(RENEW_SCRIPT, 1, LOCK_KEY, INSTANCE_ID, LOCK_TTL_MS)) as number;
    let leader = renewed === 1;

    if (!leader) {
      const acquired = await redis.set(LOCK_KEY, INSTANCE_ID, 'PX', LOCK_TTL_MS, 'NX');
      leader = acquired === 'OK';
    }

    if (leader !== wasLeader) {
      console.log(
        leader
          ? `[Leader] ${INSTANCE_ID} is now the stage-watcher leader.`
          : `[Leader] ${INSTANCE_ID} lost leadership; standing by.`
      );
      wasLeader = leader;
    }

    return leader;
  } catch (err: any) {
    // Redis blip: stay passive rather than risk two leaders writing at once.
    console.error('[Leader] election failed:', err.message);
    return false;
  }
}

export async function releaseLeadership(): Promise<void> {
  if (!redisEnabled || !wasLeader) return;
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1,
      LOCK_KEY,
      INSTANCE_ID
    );
  } catch {
    /* lock expires on its own */
  }
}
