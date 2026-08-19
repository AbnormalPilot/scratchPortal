import confetti from 'canvas-confetti';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatTimeRemaining(targetDate) {
  if (!targetDate) return { hours: 0, minutes: 0, seconds: 0, isExpired: true, text: '00:00:00' };

  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, isExpired: true, text: '00:00:00' };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const pad = (n) => String(n).padStart(2, '0');
  const text = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { hours, minutes, seconds, isExpired: false, text };
}

export function formatStageLabel(stage) {
  switch (stage) {
    case 'REGISTRATION':
      return 'Registration Open';
    case 'WAITING_CHALLENGES':
      return 'Waiting for Challenges';
    case 'CHALLENGE_SELECTION':
      return 'Challenge Selection (FCFS)';
    case 'ROUND1_BUILDING':
      return 'Round 1: 4-Hour Build Sprint';
    case 'ROUND1_JUDGING':
      return 'Round 1: Judging in Progress';
    case 'ROUND2_PREP':
      return 'Round 2: Finalist Prep';
    case 'ROUND2_LIVE':
      return 'Round 2: Presentation & Demo';
    case 'ROUND2_JUDGING':
      return 'Round 2: Final Judging';
    case 'COMPLETED':
      return 'Hackathon Completed';
    default:
      return stage || 'Registration';
  }
}

export function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'],
  });
}
