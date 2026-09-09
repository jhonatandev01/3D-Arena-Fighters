// Battle Progression, Dynamic Difficulty Scaling & Seal/Emblem System
// Saves persistent battle records and calculates character level & power bonuses

import { CharacterPreset } from '../types';

export interface SealBadge {
  id: string;
  winsRequired: number;
  title: string;
  subtitle: string;
  description: string;
  lore: string;
  iconName: 'swords' | 'zap' | 'shield' | 'wind' | 'flame' | 'crown' | 'sparkles' | 'award';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
  levelBonus: number;
  powerBonus: {
    attackBonusPct: number;
    specialBonusPct: number;
    maxHpBonus: number;
    speedBonusPct: number;
    blockDefenseBonusPct: number;
  };
}

export interface BattleHistoryItem {
  id: string;
  date: number;
  result: 'win' | 'loss';
  opponentName: string;
  opponentCharacter: string;
  difficultyTier: number;
  playerCharacter: string;
}

export interface BattleProgress {
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;
  totalBattles: number;
  lastMatchResult?: 'win' | 'loss';
  equippedSealId: string | null;
  history: BattleHistoryItem[];
  unlockedSealIds: string[];
}

export interface DifficultyTierInfo {
  tier: number;
  title: string;
  rankName: string;
  badgeColor: string;
  minWins: number;
  botName: string;
  botHp: number;
  botAttackDmg: number;
  botSpeedMultiplier: number;
  botCooldownTicks: number;
  botSpecialFrequency: number;
  botBlockChance: number;
  threatLevel: string;
}

// 6 Core Predefined Milestone Seals (Unlocked every 4 wins)
export const CORE_SEALS: SealBadge[] = [
  {
    id: 'seal_blade_cyber',
    winsRequired: 4,
    title: 'Selo da Lâmina Cibernética',
    subtitle: 'Emblema Grau I • Ofensiva Afiada',
    description: '+10% Dano de Ataque • +10 Energia Máxima • +1 Nível',
    lore: 'Forjado com plasma condutivo durante as primeiras vitórias na arena. Seus ataques normais cortam com precisão cirúrgica.',
    iconName: 'swords',
    rarity: 'bronze',
    levelBonus: 1,
    powerBonus: {
      attackBonusPct: 10,
      specialBonusPct: 0,
      maxHpBonus: 0,
      speedBonusPct: 0,
      blockDefenseBonusPct: 0,
    },
  },
  {
    id: 'seal_plasma_core',
    winsRequired: 8,
    title: 'Selo do Núcleo de Plasma',
    subtitle: 'Emblema Grau II • Sobrecarga Energética',
    description: '+15% Dano Especial • +20 HP Máximo • +1 Nível',
    lore: 'Um minirreator subatômico embutido no peito do lutador. Carrega ondas de choque e projéteis especiais devastadores.',
    iconName: 'zap',
    rarity: 'silver',
    levelBonus: 1,
    powerBonus: {
      attackBonusPct: 5,
      specialBonusPct: 15,
      maxHpBonus: 20,
      speedBonusPct: 0,
      blockDefenseBonusPct: 0,
    },
  },
  {
    id: 'seal_titanic_aegis',
    winsRequired: 12,
    title: 'Selo da Égide Titânica',
    subtitle: 'Emblema Grau III • Blindagem de Liga Nano',
    description: '+35 HP Máximo • +15% Absorção no Bloqueio • +1 Nível',
    lore: 'Placas reforçadas que vibram sob impacto. Reduz drasticamente o dano sofrido ao bloquear e amplia sua vitalidade.',
    iconName: 'shield',
    rarity: 'gold',
    levelBonus: 1,
    powerBonus: {
      attackBonusPct: 0,
      specialBonusPct: 5,
      maxHpBonus: 35,
      speedBonusPct: 0,
      blockDefenseBonusPct: 15,
    },
  },
  {
    id: 'seal_quantum_thruster',
    winsRequired: 16,
    title: 'Selo do Impulso Quântico',
    subtitle: 'Emblema Grau IV • Agilidade Relâmpago',
    description: '+14% Velocidade de Movimento • +10% Dano Ataque • +1 Nível',
    lore: 'Propulsores de micro-dobra espacial nas solas. Permitem reposicionamento instantâneo e manobras evasivas em alta velocidade.',
    iconName: 'wind',
    rarity: 'platinum',
    levelBonus: 1,
    powerBonus: {
      attackBonusPct: 10,
      specialBonusPct: 5,
      maxHpBonus: 15,
      speedBonusPct: 14,
      blockDefenseBonusPct: 0,
    },
  },
  {
    id: 'seal_neon_dragon',
    winsRequired: 20,
    title: 'Selo da Fúria do Dragão Neon',
    subtitle: 'Emblema Grau V • Poder Holográfico Primordial',
    description: '+20% Dano Ataque • +20% Dano Especial • +2 Níveis',
    lore: 'A essência ardente do dragão digital envolve sua silhueta. Cada golpe deixa um rastro de combustão estática.',
    iconName: 'flame',
    rarity: 'diamond',
    levelBonus: 2,
    powerBonus: {
      attackBonusPct: 20,
      specialBonusPct: 20,
      maxHpBonus: 25,
      speedBonusPct: 8,
      blockDefenseBonusPct: 10,
    },
  },
  {
    id: 'seal_matrix_sovereign',
    winsRequired: 24,
    title: 'Selo do Soberano da Matriz',
    subtitle: 'Emblema Grau VI • Controle Absoluto',
    description: '+50 HP Máximo • +25% Todos Danos • +15% Velocidade • +2 Níveis',
    lore: 'A insígnia máxima da glória na arena. Você reescreve as leis da física cibernética a cada passo e corte.',
    iconName: 'crown',
    rarity: 'legendary',
    levelBonus: 2,
    powerBonus: {
      attackBonusPct: 25,
      specialBonusPct: 25,
      maxHpBonus: 50,
      speedBonusPct: 15,
      blockDefenseBonusPct: 20,
    },
  },
];

// Generates dynamic prestige seals for 28+ wins (every 4 wins)
export function getSealForMilestone(winsMilestone: number): SealBadge {
  const existing = CORE_SEALS.find((s) => s.winsRequired === winsMilestone);
  if (existing) return existing;

  const prestigeRank = Math.floor(winsMilestone / 4) - 5; // e.g. 28 -> rank 2
  const romanNumerals = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  const numeral = romanNumerals[Math.min(prestigeRank - 1, romanNumerals.length - 1)] || `${prestigeRank + 6}`;

  return {
    id: `seal_prestige_${winsMilestone}`,
    winsRequired: winsMilestone,
    title: `Selo Cósmico de Prestígio ${numeral}`,
    subtitle: `Emblema de Lenda Infinita • Grau ${numeral}`,
    description: `+30% Dano • +60 HP • +15% Velocidade • +2 Níveis`,
    lore: `Conquistado após ${winsMilestone} vitórias lendárias. Irradia uma aura cósmica dourada inquebrantável.`,
    iconName: 'award',
    rarity: 'legendary',
    levelBonus: 2,
    powerBonus: {
      attackBonusPct: 25 + prestigeRank * 3,
      specialBonusPct: 25 + prestigeRank * 3,
      maxHpBonus: 50 + prestigeRank * 10,
      speedBonusPct: 15 + Math.min(10, prestigeRank * 2),
      blockDefenseBonusPct: 20,
    },
  };
}

// Get list of all available seals up to current progress + next 2 upcoming seals
export function getAllSealsToDisplay(currentWins: number): SealBadge[] {
  const list = [...CORE_SEALS];
  const maxCoreWins = CORE_SEALS[CORE_SEALS.length - 1].winsRequired;

  // Add next prestige milestones
  const highestTarget = Math.max(maxCoreWins + 8, Math.ceil((currentWins + 5) / 4) * 4);
  for (let w = maxCoreWins + 4; w <= highestTarget; w += 4) {
    list.push(getSealForMilestone(w));
  }
  return list;
}

// Dynamic Difficulty Scaling based on Wins
export function getDifficultyTier(wins: number): DifficultyTierInfo {
  if (wins < 4) {
    return {
      tier: 1,
      title: 'Tier 1: Cyber Cadete',
      rankName: 'Iniciante',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-800',
      minWins: 0,
      botName: 'CyberBot Cadete v1.0',
      botHp: 110,
      botAttackDmg: 15,
      botSpeedMultiplier: 1.0,
      botCooldownTicks: 18,
      botSpecialFrequency: 0.15,
      botBlockChance: 0.15,
      threatLevel: 'Ameaça Baixa',
    };
  } else if (wins < 8) {
    return {
      tier: 2,
      title: 'Tier 2: Cyber Guerreiro',
      rankName: 'Veterano',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      minWins: 4,
      botName: 'CyberBot Guerreiro v2.4',
      botHp: 135,
      botAttackDmg: 19,
      botSpeedMultiplier: 1.15,
      botCooldownTicks: 15,
      botSpecialFrequency: 0.25,
      botBlockChance: 0.28,
      threatLevel: 'Ameaça Moderada',
    };
  } else if (wins < 12) {
    return {
      tier: 3,
      title: 'Tier 3: Cyber Executor',
      rankName: 'Elite de Choque',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
      minWins: 8,
      botName: 'CyberBot Executor v3.8',
      botHp: 165,
      botAttackDmg: 23,
      botSpeedMultiplier: 1.28,
      botCooldownTicks: 12,
      botSpecialFrequency: 0.35,
      botBlockChance: 0.38,
      threatLevel: 'Ameaça Elevada',
    };
  } else if (wins < 16) {
    return {
      tier: 4,
      title: 'Tier 4: Cyber Titã Alfa',
      rankName: 'Mestre da Arena',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
      minWins: 12,
      botName: 'Cyber Titã Alfa v4.5',
      botHp: 195,
      botAttackDmg: 28,
      botSpeedMultiplier: 1.40,
      botCooldownTicks: 10,
      botSpecialFrequency: 0.45,
      botBlockChance: 0.48,
      threatLevel: 'Ameaça Severa',
    };
  } else if (wins < 20) {
    return {
      tier: 5,
      title: 'Tier 5: Cyber Overlord',
      rankName: 'Grão-Mestre Cibernético',
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800',
      minWins: 16,
      botName: 'Cyber Overlord Supremo v5.2',
      botHp: 235,
      botAttackDmg: 33,
      botSpeedMultiplier: 1.55,
      botCooldownTicks: 8,
      botSpecialFrequency: 0.55,
      botBlockChance: 0.58,
      threatLevel: 'Ameaça Crítica',
    };
  } else {
    // Tier 6+ Escalating
    const extraTiers = Math.floor((wins - 20) / 4) + 1;
    const tierNum = 5 + extraTiers;
    const hpScale = 235 + extraTiers * 30;
    const dmgScale = 33 + extraTiers * 4;
    const speedScale = Math.min(2.0, 1.55 + extraTiers * 0.1);

    return {
      tier: tierNum,
      title: `Tier ${tierNum}: Soberano Cósmico`,
      rankName: 'Lenda Divina',
      badgeColor: 'text-yellow-300 bg-yellow-950/60 border-yellow-700 shadow-lg shadow-yellow-500/20',
      minWins: 20 + (extraTiers - 1) * 4,
      botName: `Cyber Divindade Mk-${tierNum}`,
      botHp: hpScale,
      botAttackDmg: dmgScale,
      botSpeedMultiplier: speedScale,
      botCooldownTicks: Math.max(5, 8 - Math.floor(extraTiers / 2)),
      botSpecialFrequency: 0.65,
      botBlockChance: 0.65,
      threatLevel: 'Ameaça Apocalíptica',
    };
  }
}

// Compute Character Level
export function computeCharacterLevel(wins: number, unlockedSealIds: string[]): number {
  // Base Level 1
  // +1 Level every 2 wins
  const winLevels = Math.floor(wins / 2);

  // Extra levels from unlocked seals
  let sealLevels = 0;
  unlockedSealIds.forEach((id) => {
    // Check core seals or dynamic
    const core = CORE_SEALS.find((s) => s.id === id);
    if (core) {
      sealLevels += core.levelBonus;
    } else {
      sealLevels += 2; // prestige seals grant +2
    }
  });

  return Math.max(1, 1 + winLevels + sealLevels);
}

// Compute Aggregated Buffs
export interface PlayerComputedBuffs {
  totalAttackBonusPct: number;
  totalSpecialBonusPct: number;
  totalMaxHpBonus: number;
  totalSpeedBonusPct: number;
  totalBlockDefenseBonusPct: number;
  equippedSeal: SealBadge | null;
  activeLevel: number;
}

export function computePlayerBuffs(progress: BattleProgress): PlayerComputedBuffs {
  let attackBonus = 0;
  let specialBonus = 0;
  let hpBonus = 0;
  let speedBonus = 0;
  let blockDefenseBonus = 0;

  // Passive benefits from all unlocked seals
  progress.unlockedSealIds.forEach((id) => {
    let seal = CORE_SEALS.find((s) => s.id === id);
    if (!seal && id.startsWith('seal_prestige_')) {
      const wins = parseInt(id.replace('seal_prestige_', ''), 10);
      seal = getSealForMilestone(wins);
    }
    if (seal) {
      attackBonus += seal.powerBonus.attackBonusPct;
      specialBonus += seal.powerBonus.specialBonusPct;
      hpBonus += seal.powerBonus.maxHpBonus;
      speedBonus += seal.powerBonus.speedBonusPct;
      blockDefenseBonus += seal.powerBonus.blockDefenseBonusPct;
    }
  });

  // Equipped Seal grants extra 25% amplification to its primary attributes!
  let equippedSeal: SealBadge | null = null;
  if (progress.equippedSealId) {
    let eq = CORE_SEALS.find((s) => s.id === progress.equippedSealId);
    if (!eq && progress.equippedSealId.startsWith('seal_prestige_')) {
      const wins = parseInt(progress.equippedSealId.replace('seal_prestige_', ''), 10);
      eq = getSealForMilestone(wins);
    }
    if (eq) {
      equippedSeal = eq;
      attackBonus += Math.round(eq.powerBonus.attackBonusPct * 0.25);
      specialBonus += Math.round(eq.powerBonus.specialBonusPct * 0.25);
      hpBonus += Math.round(eq.powerBonus.maxHpBonus * 0.25);
      speedBonus += Math.round(eq.powerBonus.speedBonusPct * 0.25);
    }
  }

  const activeLevel = computeCharacterLevel(progress.wins, progress.unlockedSealIds);

  return {
    totalAttackBonusPct: attackBonus,
    totalSpecialBonusPct: specialBonus,
    totalMaxHpBonus: hpBonus,
    totalSpeedBonusPct: speedBonus,
    totalBlockDefenseBonusPct: blockDefenseBonus,
    equippedSeal,
    activeLevel,
  };
}

// Compute boosted character stats for battle and display
export function computeBoostedStats(
  preset: CharacterPreset,
  buffs: PlayerComputedBuffs
) {
  const finalHp = preset.stats.hp + buffs.totalMaxHpBonus;
  const finalAttack = Math.round(preset.stats.attack * (1 + buffs.totalAttackBonusPct / 100));
  const finalSpeed = Number((preset.stats.speed * (1 + buffs.totalSpeedBonusPct / 100)).toFixed(1));
  const finalDefense = preset.stats.defense + Math.round(buffs.totalBlockDefenseBonusPct * 0.5);

  return {
    hp: finalHp,
    attack: finalAttack,
    defense: finalDefense,
    speed: finalSpeed,
    energyRegen: preset.stats.energyRegen,
    originalHp: preset.stats.hp,
    originalAttack: preset.stats.attack,
    originalSpeed: preset.stats.speed,
    originalDefense: preset.stats.defense,
  };
}

// Next Seal Progress
export function getNextSealProgress(currentWins: number): {
  nextSeal: SealBadge;
  currentInCycle: number;
  neededInCycle: number;
  totalNeeded: number;
  pct: number;
} {
  const nextTarget = (Math.floor(currentWins / 4) + 1) * 4;
  const nextSeal = getSealForMilestone(nextTarget);
  const currentInCycle = currentWins % 4;
  const neededInCycle = 4;
  const pct = Math.min(100, Math.round((currentInCycle / neededInCycle) * 100));

  return {
    nextSeal,
    currentInCycle,
    neededInCycle,
    totalNeeded: nextTarget,
    pct,
  };
}

// Local Storage Persistence Key
const STORAGE_KEY = 'arena_battle_progress_v2';

export function loadBattleProgress(): BattleProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all seals that should be unlocked by win count are unlocked
      const unlocked = new Set<string>(parsed.unlockedSealIds || []);
      const wins = parsed.wins || 0;
      for (let w = 4; w <= wins; w += 4) {
        const seal = getSealForMilestone(w);
        unlocked.add(seal.id);
      }

      let equipped = parsed.equippedSealId || null;
      if (!equipped && unlocked.size > 0) {
        // Auto-equip the latest seal
        const arr = Array.from(unlocked);
        equipped = arr[arr.length - 1];
      }

      return {
        wins: parsed.wins || 0,
        losses: parsed.losses || 0,
        winStreak: parsed.winStreak || 0,
        bestWinStreak: parsed.bestWinStreak || 0,
        totalBattles: parsed.totalBattles || 0,
        lastMatchResult: parsed.lastMatchResult,
        equippedSealId: equipped,
        history: Array.isArray(parsed.history) ? parsed.history.slice(0, 30) : [],
        unlockedSealIds: Array.from(unlocked),
      };
    }
  } catch (e) {
    console.error('Failed to load battle progress from storage', e);
  }

  return {
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestWinStreak: 0,
    totalBattles: 0,
    equippedSealId: null,
    history: [],
    unlockedSealIds: [],
  };
}

export function saveBattleProgress(progress: BattleProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save battle progress to storage', e);
  }
}

// Record match outcome
export function recordMatchOutcome(
  result: 'win' | 'loss',
  opponentName: string,
  opponentCharacter: string,
  playerCharacter: string
): {
  progress: BattleProgress;
  updatedProgress: BattleProgress;
  newlyUnlockedSeal: SealBadge | null;
  previousWins: number;
} {
  const current = loadBattleProgress();
  const previousWins = current.wins;

  let newWins = current.wins;
  let newLosses = current.losses;
  let newStreak = current.winStreak;
  let newlyUnlockedSeal: SealBadge | null = null;

  if (result === 'win') {
    newWins += 1;
    newStreak += 1;

    // Check if new milestone hit (every 4 wins)
    if (newWins % 4 === 0) {
      newlyUnlockedSeal = getSealForMilestone(newWins);
      if (!current.unlockedSealIds.includes(newlyUnlockedSeal.id)) {
        current.unlockedSealIds.push(newlyUnlockedSeal.id);
      }
      // Auto-equip newly unlocked seal
      current.equippedSealId = newlyUnlockedSeal.id;
    }
  } else {
    newLosses += 1;
    newStreak = 0;
  }

  const bestStreak = Math.max(current.bestWinStreak, newStreak);
  const diff = getDifficultyTier(newWins);

  const historyItem: BattleHistoryItem = {
    id: 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    date: Date.now(),
    result,
    opponentName,
    opponentCharacter,
    difficultyTier: diff.tier,
    playerCharacter,
  };

  const updated: BattleProgress = {
    wins: newWins,
    losses: newLosses,
    winStreak: newStreak,
    bestWinStreak: bestStreak,
    totalBattles: current.totalBattles + 1,
    lastMatchResult: result,
    equippedSealId: current.equippedSealId,
    history: [historyItem, ...current.history].slice(0, 30),
    unlockedSealIds: Array.from(new Set(current.unlockedSealIds)),
  };

  saveBattleProgress(updated);
  return { progress: updated, updatedProgress: updated, newlyUnlockedSeal, previousWins };
}

// Equip or unequip a seal
export function equipSeal(sealId: string | null): BattleProgress {
  const current = loadBattleProgress();
  current.equippedSealId = sealId;
  saveBattleProgress(current);
  return current;
}

// Reset battle progress for testing
export function resetBattleProgress(): BattleProgress {
  const clean: BattleProgress = {
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestWinStreak: 0,
    totalBattles: 0,
    equippedSealId: null,
    history: [],
    unlockedSealIds: [],
  };
  saveBattleProgress(clean);
  return clean;
}
