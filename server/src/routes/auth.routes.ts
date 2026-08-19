import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { Role } from '@prisma/client';

const router = Router();

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Register a new Team with Leader and optional members
router.post('/register-team', async (req, res: Response) => {
  try {
    const { teamName, leaderName, leaderEmail, leaderPassword, members } = req.body;

    if (!teamName || !leaderName || !leaderEmail || !leaderPassword) {
      res.status(400).json({ error: 'Team name, leader name, email, and password are required.' });
      return;
    }

    // Check if team name already exists
    const existingTeam = await prisma.team.findUnique({ where: { name: teamName.trim() } });
    if (existingTeam) {
      res.status(400).json({ error: `Team name "${teamName}" is already taken.` });
      return;
    }

    // Check if leader email is already registered
    const existingUser = await prisma.user.findUnique({ where: { email: leaderEmail.trim().toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ error: `Email "${leaderEmail}" is already registered.` });
      return;
    }

    let accessCode = generateAccessCode();
    // Ensure access code is unique
    let codeExists = await prisma.team.findUnique({ where: { accessCode } });
    while (codeExists) {
      accessCode = generateAccessCode();
      codeExists = await prisma.team.findUnique({ where: { accessCode } });
    }

    const leaderPasswordHash = await bcrypt.hash(leaderPassword, 10);

    // Create Team and Leader in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: teamName.trim(),
          accessCode,
        },
      });

      const leader = await tx.user.create({
        data: {
          email: leaderEmail.trim().toLowerCase(),
          passwordHash: leaderPasswordHash,
          fullName: leaderName.trim(),
          role: Role.PARTICIPANT,
          isTeamLeader: true,
          teamId: team.id,
        },
      });

      // Optionally create additional 1-2 members if provided
      if (Array.isArray(members) && members.length > 0) {
        for (const m of members.slice(0, 2)) {
          if (m.email && m.name) {
            const memberHash = await bcrypt.hash(m.password || 'team123', 10);
            await tx.user.create({
              data: {
                email: m.email.trim().toLowerCase(),
                passwordHash: memberHash,
                fullName: m.name.trim(),
                role: Role.PARTICIPANT,
                isTeamLeader: false,
                teamId: team.id,
              },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          eventType: 'TEAM_REGISTERED',
          teamId: team.id,
          userId: leader.id,
          metadata: { teamName: team.name, accessCode: team.accessCode },
        },
      });

      return { team, leader };
    });

    const token = signToken({
      userId: result.leader.id,
      email: result.leader.email,
      fullName: result.leader.fullName,
      role: result.leader.role,
      teamId: result.team.id,
      isTeamLeader: true,
    });

    res.status(201).json({
      message: 'Team successfully registered!',
      token,
      user: {
        id: result.leader.id,
        email: result.leader.email,
        fullName: result.leader.fullName,
        role: result.leader.role,
        isTeamLeader: true,
      },
      team: {
        id: result.team.id,
        name: result.team.name,
        accessCode: result.team.accessCode,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during registration.' });
  }
});

// 2. Join an existing team using Team Access Code
router.post('/join-team', async (req, res: Response) => {
  try {
    const { accessCode, fullName, email, password } = req.body;

    if (!accessCode || !fullName || !email || !password) {
      res.status(400).json({ error: 'Access code, full name, email, and password are required.' });
      return;
    }

    const team = await prisma.team.findUnique({
      where: { accessCode: accessCode.trim().toUpperCase() },
      include: { members: true },
    });

    if (!team) {
      res.status(404).json({ error: 'Invalid team access code. Team not found.' });
      return;
    }

    if (team.members.length >= 3) {
      res.status(400).json({ error: 'Team already has the maximum capacity of 3 members.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingUser) {
      res.status(400).json({ error: `Email "${email}" is already registered.` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        role: Role.PARTICIPANT,
        isTeamLeader: false,
        teamId: team.id,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamId: team.id,
      isTeamLeader: false,
    });

    res.status(201).json({
      message: `Successfully joined team "${team.name}"!`,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isTeamLeader: false,
      },
      team: {
        id: team.id,
        name: team.name,
        accessCode: team.accessCode,
      },
    });
  } catch (error: any) {
    console.error('Join team error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while joining team.' });
  }
});

// 3. Login for all roles (Participant, Judge, Organizer) by Email or Team ID / Access Code
router.post('/login', async (req, res: Response) => {
  try {
    const { email, identifier, password } = req.body;
    const loginId = (identifier || email || '').trim().toLowerCase();

    if (!loginId || !password) {
      res.status(400).json({ error: 'Team ID / Email and password are required.' });
      return;
    }

    // 1. Try finding user directly by email
    let user = await prisma.user.findFirst({
      where: { email: { equals: loginId, mode: 'insensitive' } },
      include: {
        team: {
          include: {
            challenge: true,
            members: { select: { id: true, fullName: true, email: true, isTeamLeader: true } },
          },
        },
      },
    });

    // 2. If not found by email, try finding by Team Access Code / Team ID
    if (!user) {
      const team = await prisma.team.findFirst({
        where: {
          OR: [
            { accessCode: { equals: loginId.toUpperCase() } },
            { name: { equals: loginId, mode: 'insensitive' } },
          ],
        },
        include: {
          members: {
            include: {
              team: {
                include: {
                  challenge: true,
                  members: { select: { id: true, fullName: true, email: true, isTeamLeader: true } },
                },
              },
            },
          },
        },
      });

      if (team && team.members.length > 0) {
        // Pick the team leader or first member
        user = team.members.find((m) => m.isTeamLeader) || team.members[0];
      }
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid Team ID / Email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid Team ID / Email or password.' });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      teamId: user.teamId,
      isTeamLeader: user.isTeamLeader,
    });

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isTeamLeader: user.isTeamLeader,
      },
      team: user.team || null,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 4. Get current user profile and event state
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isTeamLeader: true,
        teamId: true,
        team: {
          include: {
            challenge: true,
            members: { select: { id: true, fullName: true, email: true, isTeamLeader: true } },
            submissions: { orderBy: { roundNumber: 'asc' } },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const eventConfig = await prisma.eventConfig.findFirst();

    res.json({
      user,
      eventConfig,
    });
  } catch (error: any) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;
