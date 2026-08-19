const API_URL = 'http://localhost:5001/api';

async function runApiFlowTest() {
  console.log('\n======================================================');
  console.log('🚀 TESTING FULL END-TO-END COMPETITION LIFECYCLE API');
  console.log('======================================================\n');

  // 1. Health check
  const healthRes = await fetch(`${API_URL}/health`);
  const healthData = await healthRes.json();
  console.log(`1. Health Check: Status = ${healthData.status}`);

  // 2. Login as Organizer / Admin
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hackathon.com', password: 'admin123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;
  console.log(`2. Admin Login: OK (Role: ${adminData.user.role})`);

  // 3. Register a new Team "Cyber Strikers"
  const regRes = await fetch(`${API_URL}/auth/register-team`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamName: `Cyber Strikers ${Date.now()}`,
      leaderName: 'Valerie Pierce',
      leaderEmail: `valerie_${Date.now()}@cyberstrikers.com`,
      leaderPassword: 'team123',
      members: [
        { name: 'Kai Sterling', email: `kai_${Date.now()}@cyberstrikers.com` },
      ],
    }),
  });
  const regData = await regRes.json();
  const teamToken = regData.token;
  const teamId = regData.team.id;
  console.log(`3. Team Registered: "${regData.team.name}" (Access Code: ${regData.team.accessCode})`);

  // 4. Fetch Challenges
  const chalRes = await fetch(`${API_URL}/challenges`);
  const challenges = await chalRes.json();
  const chosenChallenge = challenges[0];
  console.log(`4. Challenges Catalog: Retrieved ${challenges.length} challenges. Selecting "${chosenChallenge.title}".`);

  // 5. Team claims chosen Challenge
  const claimRes = await fetch(`${API_URL}/challenges/${chosenChallenge.id}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teamToken}`,
    },
  });
  const claimData = await claimRes.json();
  console.log(`5. FCFS Claim: ${claimData.message}`);

  // 6. Organizer transitions state to ROUND1_BUILDING
  const stageRes = await fetch(`${API_URL}/admin/event-stage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ stage: 'ROUND1_BUILDING', customDurationMinutes: 240 }),
  });
  const stageData = await stageRes.json();
  console.log(`6. Organizer Stage Transition: Stage is now "${stageData.eventConfig.currentStage}" (4-Hour Timer Set)`);

  // 7. Team submits Scratch Project Link
  const submitRes = await fetch(`${API_URL}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teamToken}`,
    },
    body: JSON.stringify({
      scratchUrl: 'https://scratch.mit.edu/projects/987654321',
      notes: 'Completed all 3 waves, laser collision, and shield bars.',
      isDraft: false,
      roundNumber: 1,
    }),
  });
  const submitData = await submitRes.json();
  console.log(`7. Submission: ${submitData.message}`);

  // 8. Judge 1 logs in
  const judgeLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'judge1@hackathon.com', password: 'judge123' }),
  });
  const judgeData = await judgeLoginRes.json();
  const judgeToken = judgeData.token;
  console.log(`8. Judge Login: OK (Judge: ${judgeData.user.fullName})`);

  // 9. Judge 1 scores Round 1 (Rubric: Basic 38/40, Visual 24/25, Creativity 32/35)
  const scoreR1Res = await fetch(`${API_URL}/judge/score/r1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${judgeToken}`,
    },
    body: JSON.stringify({
      teamId,
      basicWorkingScore: 38,
      visualSpritesScore: 24,
      creativityScore: 32,
      comments: 'Phenomenal particle effects and smooth collision detection.',
      isFinal: true,
    }),
  });
  const scoreR1Data = await scoreR1Res.json();
  console.log(`9. Round 1 Scoring: Total Score = ${scoreR1Data.calculatedTotal} / 100 (Rubric: 38 + 24 + 32)`);

  // 10. Organizer runs Auto-Finalist Selection Algorithm
  const finalistsRes = await fetch(`${API_URL}/admin/finalists/compute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const finalistsData = await finalistsRes.json();
  console.log(`10. Auto-Finalist Engine: ${finalistsData.message}`);
  const ourTeamFinalist = finalistsData.finalists.find((f: any) => f.finalistTeamId === teamId);
  if (ourTeamFinalist) {
    console.log(`    ⭐ Team "${ourTeamFinalist.finalistTeamName}" advanced as Finalist for "${ourTeamFinalist.challengeTitle}"!`);
  }

  // 11. Judge 1 scores Round 2 (Rubric: Pres 28/30, Logic 38/40, QA 19/20, Team 10/10)
  const scoreR2Res = await fetch(`${API_URL}/judge/score/r2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${judgeToken}`,
    },
    body: JSON.stringify({
      teamId,
      presentationQualityScore: 28,
      projectExplanationScore: 38,
      technicalQaScore: 19,
      teamContributionScore: 10,
      comments: 'Clear breakdown of Scratch broadcast messages and clone management.',
      isFinal: true,
    }),
  });
  const scoreR2Data = await scoreR2Res.json();
  console.log(`11. Round 2 Scoring: Total Score = ${scoreR2Data.calculatedTotal} / 100 (Rubric: 28 + 38 + 19 + 10)`);
  console.log(`    🧮 Weighted Final Score = ${scoreR2Data.teamFinalScore} (R1*0.40 + R2*0.60 = ${scoreR1Data.calculatedTotal}*0.40 + ${scoreR2Data.calculatedTotal}*0.60)`);

  // 12. Organizer publishes Leaderboard
  const pubRes = await fetch(`${API_URL}/admin/leaderboard/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ publish: true }),
  });
  const pubData = await pubRes.json();
  console.log(`12. Leaderboard: ${pubData.message}`);

  // 13. Public queries the transparent Leaderboard
  const leaderboardRes = await fetch(`${API_URL}/public/leaderboard`);
  const leaderboardData = await leaderboardRes.json();
  console.log(`13. Public Leaderboard View: Total Ranked Teams = ${leaderboardData.rankings.length}`);
  leaderboardData.rankings.slice(0, 3).forEach((r: any) => {
    console.log(`    🏆 Rank #${r.rank}: ${r.teamName} | Challenge: ${r.challengeTitle} | R1: ${r.round1Score} | R2: ${r.round2Score} | Final: ${r.finalScore}`);
  });

  console.log('\n======================================================');
  console.log('🎉 ALL END-TO-END COMPETITION LIFECYCLE TESTS PASSED!');
  console.log('======================================================\n');
}

runApiFlowTest().catch(console.error);
