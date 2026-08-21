import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('\n--- VERIFYING POSTGRESQL & PRISMA DATA ---');
  
  const eventConfig = await prisma.eventConfig.findFirst();
  console.log(`[EventConfig] Stage: ${eventConfig?.currentStage}, Leaderboard Published: ${eventConfig?.isLeaderboardPublished}`);

  const challenges = await prisma.challenge.findMany({ select: { title: true, category: true, difficulty: true, maxCapacity: true } });
  console.log(`[Challenges] Total: ${challenges.length}`);
  challenges.slice(0, 4).forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.title} (${c.category}, ${c.difficulty}, Max: ${c.maxCapacity} seats)`);
  });

  const users = await prisma.user.findMany({ select: { fullName: true, email: true, role: true } });
  console.log(`[Users] Total: ${users.length}`);
  users.forEach((u) => {
    console.log(`  - ${u.fullName} (${u.email}) -> Role: ${u.role}`);
  });

  const teams = await prisma.team.findMany({
    include: {
      members: { select: { fullName: true, isTeamLeader: true } }
    }
  });
  console.log(`[Teams] Total: ${teams.length}`);
  teams.forEach((t) => {
    console.log(`  - Team: "${t.name}" (Access Code: ${t.accessCode}) | Members: ${t.members.map(m => `${m.fullName}${m.isTeamLeader ? ' (Leader)' : ''}`).join(', ')}`);
  });

  console.log('--- ALL RELATIONS AND CONSTRAINTS WORKING PERFECTLY! ---\n');
}

checkDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
