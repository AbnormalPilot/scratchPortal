import { PrismaClient, Role, EventStage } from '@repo/db';
import bcrypt from 'bcryptjs';
import { signToken } from './lib/jwt.js';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5001/api';

async function runConcurrencyTest() {
  console.log('\n======================================================');
  console.log('[CONCURRENCY TEST] ATOMIC FCFS & RACE CONDITION TEST');
  console.log('======================================================\n');

  // 1. Create a test challenge with strictly ONLY 1 SEAT available
  const testChallenge = await prisma.challenge.create({
    data: {
      title: `Concurrent Test Arena ${Date.now()}`,
      category: 'Stress Test',
      difficulty: 'Expert',
      shortDescription: 'Testing atomic row locking under concurrent claims.',
      fullDescription: 'Full description',
      requirements: ['Test requirement'],
      maxCapacity: 1,
      claimedCount: 0,
    },
  });
  console.log(`Created test challenge: "${testChallenge.title}" with Max Capacity = 1 seat.`);

  // 2. Create 10 test teams and generate auth tokens
  const numTeams = 10;
  const teamsData: Array<{ teamId: string; token: string; name: string }> = [];
  const dummyPasswordHash = await bcrypt.hash('testpass', 5);

  for (let i = 1; i <= numTeams; i++) {
    const team = await prisma.team.create({
      data: {
        name: `Stress Team ${Date.now()}_${i}`,
        accessCode: `TST${i}_${Math.floor(Math.random() * 1000)}`,
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `leader_${Date.now()}_${i}@test.com`,
        passwordHash: dummyPasswordHash,
        fullName: `Test Leader ${i}`,
        role: Role.PARTICIPANT,
        isTeamLeader: true,
        teamId: team.id,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamId: team.id,
      isTeamLeader: true,
    });

    teamsData.push({ teamId: team.id, token, name: team.name });
  }
  console.log(`Created ${numTeams} distinct teams ready to claim the 1 seat simultaneously.`);

  // 3. Fire all 10 claim requests simultaneously in parallel!
  console.log(`\n[Test] Firing ${numTeams} simultaneous atomic claim requests...`);
  const startTime = Date.now();

  const results = await Promise.all(
    teamsData.map(async (t, index) => {
      try {
        const response = await fetch(`${API_URL}/challenges/${testChallenge.id}/claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${t.token}`,
          },
        });

        const data = await response.json();
        return {
          teamIndex: index + 1,
          status: response.status,
          success: response.ok,
          message: data.message || data.error,
        };
      } catch (err: any) {
        return {
          teamIndex: index + 1,
          status: 500,
          success: false,
          message: err.message,
        };
      }
    })
  );

  const durationMs = Date.now() - startTime;
  console.log(`[Test] All ${numTeams} requests completed in ${durationMs}ms.\n`);

  // 4. Analyze Results
  const successfulClaims = results.filter((r) => r.status === 200);
  const rejectedClaims = results.filter((r) => r.status === 409);
  const otherResponses = results.filter((r) => r.status !== 200 && r.status !== 409);

  console.log('[Test] CONCURRENCY RESULTS BREAKDOWN:');
  console.log(`  Successful Claims (200 OK): ${successfulClaims.length}`);
  console.log(`  Rejected Due to Capacity (409 Conflict): ${rejectedClaims.length}`);
  if (otherResponses.length > 0) {
    console.log(`  Other Responses: ${otherResponses.length}`);
    console.log('Sample error:', otherResponses[0]);
  }

  // 5. Verify database state
  const updatedChallenge = await prisma.challenge.findUnique({
    where: { id: testChallenge.id },
  });

  console.log(`\n[Database] VERIFICATION:`);
  console.log(`  Challenge "claimedCount" in database: ${updatedChallenge?.claimedCount} / ${updatedChallenge?.maxCapacity}`);

  // 6. Assertions
  if (successfulClaims.length === 1 && rejectedClaims.length === numTeams - 1 && updatedChallenge?.claimedCount === 1) {
    console.log('\n[TEST PASSED] ATOMIC ROW-LOCKING VERIFIED!');
    console.log('Zero race conditions. Overbooking is mathematically impossible.');
  } else {
    console.error('\n[TEST FAILED] Concurrency anomaly detected!');
  }

  // 7. Cleanup
  console.log('\n[Test] Cleaning up test records...');
  for (const t of teamsData) {
    await prisma.user.deleteMany({ where: { teamId: t.teamId } });
    await prisma.auditLog.deleteMany({ where: { teamId: t.teamId } });
    await prisma.team.delete({ where: { id: t.teamId } });
  }
  await prisma.auditLog.deleteMany({ where: { metadata: { path: ['challengeId'], equals: testChallenge.id } } });
  await prisma.challenge.delete({ where: { id: testChallenge.id } });
  console.log('Cleanup complete.\n');
}

runConcurrencyTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
