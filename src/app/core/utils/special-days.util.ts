import { Achievement, Game, GameMemory, LifeEvent, Run, SavePoint } from '../models';

export type SpecialDayKind = 'run-started' | 'run-completed' | 'memory' | 'achievement' | 'save-point' | 'life-event';

export interface SpecialDayCandidate {
  key: string;
  date: string;
  kind: SpecialDayKind;
  gameId?: number;
  gameTitle?: string;
  runName?: string;
  label: string;
}

export interface SpecialDay {
  key: string;
  date: string;
  yearsAgo: number;
  text: string;
  gameId?: number;
}

export interface RunWithGame {
  game: Game;
  run: Run;
}

export function buildSpecialDayCandidates(
  games: Game[],
  allRuns: RunWithGame[],
  memoriesLists: GameMemory[][],
  achievementsLists: Achievement[][],
  lifeEvents: LifeEvent[],
  savePointLists: SavePoint[][],
): SpecialDayCandidate[] {
  const candidates: SpecialDayCandidate[] = [];

  for (const { game, run } of allRuns) {
    if (run.startDate) {
      candidates.push({
        key: `run-started-${run.id}`,
        date: run.startDate,
        kind: 'run-started',
        gameId: game.id,
        gameTitle: game.title,
        runName: run.runName,
        label: run.runName,
      });
    }
    if (run.endDate) {
      candidates.push({
        key: `run-completed-${run.id}`,
        date: run.endDate,
        kind: 'run-completed',
        gameId: game.id,
        gameTitle: game.title,
        runName: run.runName,
        label: run.runName,
      });
    }
  }

  games.forEach((game, index) => {
    for (const memory of memoriesLists[index] ?? []) {
      if (!memory.memoryDate) {
        continue;
      }
      candidates.push({
        key: `memory-${memory.id}`,
        date: memory.memoryDate,
        kind: 'memory',
        gameId: game.id,
        gameTitle: game.title,
        label: memory.title,
      });
    }
    for (const achievement of achievementsLists[index] ?? []) {
      if (!achievement.unlocked || !achievement.unlockedDate) {
        continue;
      }
      candidates.push({
        key: `achievement-${achievement.id}`,
        date: achievement.unlockedDate,
        kind: 'achievement',
        gameId: game.id,
        gameTitle: game.title,
        label: achievement.title,
      });
    }
  });

  allRuns.forEach(({ game, run }, index) => {
    for (const savePoint of savePointLists[index] ?? []) {
      if (!savePoint.date) {
        continue;
      }
      candidates.push({
        key: `savepoint-${savePoint.id}`,
        date: savePoint.date,
        kind: 'save-point',
        gameId: game.id,
        gameTitle: game.title,
        label: savePoint.title,
      });
    }
  });

  for (const lifeEvent of lifeEvents) {
    if (!lifeEvent.date) {
      continue;
    }
    candidates.push({
      key: `life-event-${lifeEvent.id}`,
      date: lifeEvent.date,
      kind: 'life-event',
      label: lifeEvent.title,
    });
  }

  return candidates;
}

export function buildSpecialDayText(candidate: SpecialDayCandidate, yearsAgo: number, when = 'Hoje'): string {
  const yearsLabel = `${yearsAgo} ${yearsAgo === 1 ? 'ano' : 'anos'}`;
  switch (candidate.kind) {
    case 'run-completed':
      return `${when} faz ${yearsLabel} que você terminou ${candidate.gameTitle} (run "${candidate.runName}").`;
    case 'run-started':
      return `${when} faz ${yearsLabel} que você começou sua run "${candidate.runName}" em ${candidate.gameTitle}.`;
    case 'achievement':
      return `${when} faz ${yearsLabel} que você desbloqueou "${candidate.label}" em ${candidate.gameTitle}.`;
    case 'memory':
      return `${when} faz ${yearsLabel} que você registrou a memória "${candidate.label}" em ${candidate.gameTitle}.`;
    case 'save-point':
      return `${when} faz ${yearsLabel} que você salvou em "${candidate.label}" — ${candidate.gameTitle}.`;
    case 'life-event':
      return `${when} faz ${yearsLabel}: ${candidate.label}.`;
  }
}

export function filterSpecialDaysForDate(
  candidates: SpecialDayCandidate[],
  month: number,
  day: number,
  referenceYear: number,
  when = 'Hoje',
): SpecialDay[] {
  const matches: SpecialDay[] = [];
  for (const candidate of candidates) {
    const [yearStr, monthStr, dayStr] = candidate.date.split('-');
    const year = Number(yearStr);
    if (Number(monthStr) !== month || Number(dayStr) !== day || year >= referenceYear) {
      continue;
    }
    const yearsAgo = referenceYear - year;
    matches.push({
      key: candidate.key,
      date: candidate.date,
      yearsAgo,
      text: buildSpecialDayText(candidate, yearsAgo, when),
      gameId: candidate.gameId,
    });
  }
  return matches.sort((a, b) => b.yearsAgo - a.yearsAgo);
}

export function daysWithSpecialDaysInMonth(candidates: SpecialDayCandidate[], month: number, referenceYear: number): Set<number> {
  const days = new Set<number>();
  for (const candidate of candidates) {
    const [yearStr, monthStr, dayStr] = candidate.date.split('-');
    if (Number(monthStr) === month && Number(yearStr) < referenceYear) {
      days.add(Number(dayStr));
    }
  }
  return days;
}
