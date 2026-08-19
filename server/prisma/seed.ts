import { PrismaClient, Role, EventStage, SubmissionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CHALLENGES_DATA = [
  {
    title: 'Space Defender',
    category: 'Arcade Shooter',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    shortDescription: 'Defend your starbase against incoming asteroid waves and alien dreadnoughts.',
    fullDescription: 'Build an action-packed 2D top-down or horizontal space shooter in Scratch. Players must maneuver a spaceship, shoot projectiles, manage shield/energy levels, and survive escalating waves of enemies culminating in a mini-boss.',
    requirements: [
      'Player ship movement (smooth keyboard or mouse controls)',
      'Projectile shooting with cooldown/recharge mechanic',
      'At least 3 distinct enemy/asteroid sprite types with varying speeds',
      'Score tracker, health/shield bar, and dynamic difficulty scaling',
      'Game over screen and victory condition when surviving wave 3 or boss defeat'
    ]
  },
  {
    title: 'Maze of Shadows',
    category: 'Puzzle & Stealth',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    shortDescription: 'Navigate a procedurally simulated labyrinth with dynamic line-of-sight and patrol guards.',
    fullDescription: 'Design an immersive top-down stealth puzzle game. The player must navigate dark corridors, collect glowing energy keys, avoid patrolling shadow guards with visible detection cones, and unlock the escape portal before the timer expires.',
    requirements: [
      'Grid or tile-based maze collision detection (no walking through walls)',
      'Line-of-sight visual effect (torchlight radius or fog-of-war)',
      'At least 2 patrolling guard sprites with waypoint movement',
      'Collectable key items and locked exit door mechanism',
      'Stealth alert indicator and time-trial countdown'
    ]
  },
  {
    title: 'Cyber Runner 2099',
    category: 'Endless Platformer',
    difficulty: 'Beginner',
    maxCapacity: 4,
    shortDescription: 'Dash, double-jump, and slide across neon rooftops while evading drone strikes.',
    fullDescription: 'Create a fast-paced auto-scrolling side-scroller. The player controls a cyber-runner navigating high-tech rooftops, performing wall-jumps, sliding under laser traps, and collecting quantum data shards for multiplier bonuses.',
    requirements: [
      'Smooth parallax scrolling background and physics-based jumping',
      'Slide or crouch mechanic to dodge high obstacles',
      'Dynamic obstacle generation with increasing scrolling speed',
      'Multiplier combo scoring system and collectable power-ups',
      'High score persistence using Scratch cloud or session variables'
    ]
  },
  {
    title: 'Treasure of Atlantis',
    category: 'Physics & Exploration',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    shortDescription: 'Pilot a deep-sea submersible to retrieve ancient relics while managing oxygen and pressure.',
    fullDescription: 'Explore the deep oceanic abyss. Manage realistic buoyancy physics, navigate around sea creatures, blast underwater rock barriers, and gather ancient artifacts before your oxygen tank is depleted.',
    requirements: [
      'Underwater inertia/buoyancy physics for player submarine',
      'Oxygen depletion meter with refill bubble stations',
      'Depth pressure mechanic (deeper zones cause damage without upgrades)',
      'At least 4 hidden relic collectibles with descriptive lore popups',
      'Hazardous sea life (sharks, electric jellyfish) with collision logic'
    ]
  },
  {
    title: 'Rhythm Galaxy',
    category: 'Music & Timing',
    difficulty: 'Advanced',
    maxCapacity: 4,
    shortDescription: 'Hit the musical beats in sync with cosmic tracks to power up stellar constellations.',
    fullDescription: 'Develop a 4-lane or circular rhythm game in Scratch. Notes cascade towards target receptors in sync with built-in Scratch music beats. Players must hit the corresponding keys with tight timing windows (Perfect, Good, Miss) to build combos.',
    requirements: [
      'At least 3 multi-track lanes with timed falling notes',
      'Accurate timing detection window (Perfect / Great / Miss)',
      'Live combo counter, score multiplier, and health/groove gauge',
      'Vibrant sound effects matching the visual beat hits',
      'End-of-song grade screen (Rank S, A, B, C)'
    ]
  },
  {
    title: 'Boss Battle Arena',
    category: 'Action & Combat',
    difficulty: 'Advanced',
    maxCapacity: 4,
    shortDescription: 'Defeat a multi-phase colossal titan with telegraphed attack patterns and dodge mechanics.',
    fullDescription: 'Focus on a single, highly polished boss combat encounter. The boss exhibits 3 distinct attack phases with clear telegraph animations (ground slams, bullet rings, beam sweeps), requiring players to learn patterns and exploit vulnerable openings.',
    requirements: [
      'Multi-phase boss entity with visible phase transitions at 66% and 33% HP',
      'At least 3 telegraphed attack animations / bullet hell patterns',
      'Player dodge roll / invulnerability frames mechanic',
      'Combat feedback: screen shake, hit flashes, sound effects',
      'Phase-specific soundtrack / pacing changes'
    ]
  },
  {
    title: 'Eco Cleanup Hero',
    category: 'Simulation & Time Attack',
    difficulty: 'Beginner',
    maxCapacity: 4,
    shortDescription: 'Save the marine ecosystem by categorizing pollutants and restoring coral reefs.',
    fullDescription: 'An engaging simulation game where players clean a polluted coral bay. Sort plastic, metal, and chemical pollutants into proper recycling bins, plant healthy coral seeds, and rescue trapped marine animals before the pollution index reaches critical levels.',
    requirements: [
      'Drag-and-drop or vacuum collection mechanic for different waste types',
      'Sorting logic: plastic, toxic barrels, and biodegradable waste',
      'Global Eco-Health meter that visually changes the water clarity',
      'Animal rescue mini-tasks with bonus points',
      'Victory banner with educational eco-facts'
    ]
  },
  {
    title: 'Gravity Inverter',
    category: 'Physics Platformer',
    difficulty: 'Advanced',
    maxCapacity: 4,
    shortDescription: 'Manipulate the laws of gravity to navigate mind-bending upside-down puzzle chambers.',
    fullDescription: 'A puzzle-platformer where pressing the spacebar flips the room gravity upside-down. Players must maneuver through laser grids, moving spike crushers, and pressure plates across 5 challenging puzzle chambers.',
    requirements: [
      'Instant/smooth gravity inversion flipping player velocity and orientation',
      'Multi-room level transition system (at least 3 unique puzzle rooms)',
      'Moving hazards (lasers, swinging saws, crushing blocks)',
      'Interactive switches, pressure plates, and moving platforms',
      'Death counter and instant checkpoint respawn mechanism'
    ]
  },
  {
    title: 'Pixel Castle Defense',
    category: 'Strategy & Tower Defense',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    shortDescription: 'Place elemental archer towers along strategic paths to repel goblin hordes.',
    fullDescription: 'A classic grid/path tower defense game. Players earn gold by defeating goblins and slimes, which they invest in building Archer, Ice, and Cannon towers, upgrading tower range, and timing special meteor spells.',
    requirements: [
      'Enemy waypoint pathfinding across a curving road',
      'At least 3 distinct placeable tower types (Fast, Slow/Freeze, Splash)',
      'Gold economy system with kill rewards and tower upgrade costs',
      'Wave spawner with progressive enemy health scaling',
      'Castle HP bar and game-over state if 10 enemies breach the gate'
    ]
  },
  {
    title: 'Potion Alchemy Lab',
    category: 'Simulation & Management',
    difficulty: 'Beginner',
    maxCapacity: 4,
    shortDescription: 'Brew magical concoctions for demanding wizard customers under time pressure.',
    fullDescription: 'Run a bustling alchemy shop. Customers enter asking for specific potion formulas (e.g., Invisibility = 2 Moonflowers + 1 Dragon Scale + Stir 3s). Players must harvest ingredients, mix, heat, and bottle orders quickly to earn 5-star reviews.',
    requirements: [
      'Customer queue system with patience timers',
      'Interactive brewing station: ingredient chopping, cauldron stirring, bottling',
      'At least 4 unique potion recipes with failure states for incorrect mixes',
      'Shop rating / coin tally and daily goal progression',
      'Visual effects for boiling cauldrons and sparkling finished potions'
    ]
  },
  {
    title: 'Traffic Grid Master',
    category: 'Simulation & Strategy',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    shortDescription: 'Control intersection traffic lights to prevent catastrophic multi-car pileups.',
    fullDescription: 'Manage a busy city junction. Click traffic lights to toggle Red/Green, manage queue congestion, prioritize emergency ambulances, and clear 100 vehicles without a single intersection collision.',
    requirements: [
      '4-way intersection simulation with autonomous vehicle AI',
      'Clickable traffic light toggles controlling car stopping/accelerating',
      'Emergency vehicle priority system with sirens and bonus points',
      'Accurate car-to-car and car-to-intersection collision detection',
      'Rush hour difficulty curve and accident-free streak tracker'
    ]
  },
  {
    title: 'Dungeon Crawler 8-Bit',
    category: 'Retro RPG',
    difficulty: 'Intermediate',
    maxCapacity: 4,
    shortDescription: 'Explore subterranean crypts, collect legendary loot, and defeat skeleton lords.',
    fullDescription: 'A retro top-down dungeon crawler. Explore rooms, open chests to upgrade swords and bows, defeat monsters with real-time combat, and solve floor puzzles to unlock the dungeon boss gate.',
    requirements: [
      'Top-down movement with 4-directional sword swing animations',
      'Inventory / equipment system (Sword levels, Bow & Arrow counter, Potions)',
      'Enemy AI with aggro chase radius and knockback on hit',
      'Chest looting system with random or fixed loot drops',
      'Health hearts HUD, boss key door, and dungeon victory banner'
    ]
  }
];

async function main() {
  console.log('🚀 Seeding Scratch Game Hackathon Database...');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.round2Score.deleteMany();
  await prisma.round1Score.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.eventConfig.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Seed EventConfig
  const now = new Date();
  const eventConfig = await prisma.eventConfig.create({
    data: {
      currentStage: EventStage.REGISTRATION,
      r1StartTime: new Date(now.getTime() + 1000 * 60 * 30), // in 30 mins
      r1EndTime: new Date(now.getTime() + 1000 * 60 * (30 + 240)), // 4 hours later
      r2StartTime: new Date(now.getTime() + 1000 * 60 * (30 + 240 + 60)), // 1h judging later
      r2EndTime: new Date(now.getTime() + 1000 * 60 * (30 + 240 + 60 + 120)), // 2h later
      isLeaderboardPublished: false
    }
  });
  console.log(`✅ EventConfig initialized (Current Stage: ${eventConfig.currentStage})`);

  // 3. Seed 12 Scratch Challenges
  console.log('📦 Seeding 12 Scratch Problem Statements...');
  const createdChallenges = [];
  for (const c of CHALLENGES_DATA) {
    const challenge = await prisma.challenge.create({
      data: {
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        maxCapacity: c.maxCapacity,
        claimedCount: 0,
        shortDescription: c.shortDescription,
        fullDescription: c.fullDescription,
        requirements: c.requirements
      }
    });
    createdChallenges.push(challenge);
  }
  console.log(`✅ Seeded ${createdChallenges.length} Problem Statements.`);

  // 4. Seed Admin & Judges
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const judgePasswordHash = await bcrypt.hash('judge123', 10);
  const participantPasswordHash = await bcrypt.hash('team123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@hackathon.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Chief Organizer (Admin)',
      role: Role.ORGANIZER
    }
  });

  const judge1 = await prisma.user.create({
    data: {
      email: 'judge1@hackathon.com',
      passwordHash: judgePasswordHash,
      fullName: 'Dr. Alan Turing (Judge 1)',
      role: Role.JUDGE
    }
  });

  const judge2 = await prisma.user.create({
    data: {
      email: 'judge2@hackathon.com',
      passwordHash: judgePasswordHash,
      fullName: 'Prof. Ada Lovelace (Judge 2)',
      role: Role.JUDGE
    }
  });

  console.log(`✅ Seeded 1 Organizer and 2 Judges.`);

  // 5. Seed 7 Sample Teams with Members
  const sampleTeamsData = [
    {
      name: 'Pixel Warriors',
      accessCode: 'PIX2026',
      leader: { name: 'Alex Rivera', email: 'alex@pixelwarriors.com' },
      member: { name: 'Jordan Lee', email: 'jordan@pixelwarriors.com' }
    },
    {
      name: 'Code Masters',
      accessCode: 'CODE99',
      leader: { name: 'Samantha Vance', email: 'sam@codemasters.com' },
      member: { name: 'Marcus Chen', email: 'marcus@codemasters.com' }
    },
    {
      name: 'Scratch Ninjas',
      accessCode: 'NINJA7',
      leader: { name: 'Elena Rostova', email: 'elena@scratchninjas.com' },
      member: { name: 'Liam Taylor', email: 'liam@scratchninjas.com' }
    },
    {
      name: 'Byte Brawlers',
      accessCode: 'BYTE42',
      leader: { name: 'Leo Martinez', email: 'leo@bytebrawlers.com' },
      member: { name: 'Maya Patel', email: 'maya@bytebrawlers.com' }
    },
    {
      name: 'Neon Glitchers',
      accessCode: 'NEON88',
      leader: { name: 'Kai Takahashi', email: 'kai@neonglitchers.com' },
      member: { name: 'Zara Novak', email: 'zara@neonglitchers.com' }
    },
    {
      name: 'Cyber Titans',
      accessCode: 'CYBER01',
      leader: { name: 'Vikram Singh', email: 'vikram@cybertitans.com' },
      member: { name: 'Sophia Dupont', email: 'sophia@cybertitans.com' }
    },
    {
      name: 'Quantum Cats',
      accessCode: 'MEOW99',
      leader: { name: 'Felix Wright', email: 'felix@quantumcats.com' },
      member: { name: 'Chloe Bennett', email: 'chloe@quantumcats.com' }
    }
  ];

  for (const t of sampleTeamsData) {
    const team = await prisma.team.create({
      data: {
        name: t.name,
        accessCode: t.accessCode
      }
    });

    // Create leader
    await prisma.user.create({
      data: {
        email: t.leader.email,
        passwordHash: participantPasswordHash,
        fullName: t.leader.name,
        role: Role.PARTICIPANT,
        isTeamLeader: true,
        teamId: team.id
      }
    });

    // Create member
    await prisma.user.create({
      data: {
        email: t.member.email,
        passwordHash: participantPasswordHash,
        fullName: t.member.name,
        role: Role.PARTICIPANT,
        isTeamLeader: false,
        teamId: team.id
      }
    });
  }

  console.log('✅ Seeded 3 Sample Teams with Leaders and Members.');

  // 6. Seed initial audit log
  await prisma.auditLog.create({
    data: {
      eventType: 'SYSTEM_INITIALIZED',
      userId: admin.id,
      metadata: {
        challengesCount: createdChallenges.length,
        initialStage: EventStage.REGISTRATION
      }
    }
  });

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
