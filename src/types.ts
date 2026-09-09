export type CharacterId = 'cyber_samurai' | 'mecha_titan' | 'neon_valkyrie' | 'shadow_assassin' | 'custom_glb';

export interface CharacterPreset {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  color: string;
  secondaryColor: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    energyRegen: number;
  };
  weaponName: string;
  specialName: string;
  specialDescription: string;
  quote: string;
  customGlbUrl?: string;
  customGlbName?: string;
}

export type PlayerAction = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'special' | 'block' | 'hit' | 'death' | 'dash' | 'ground_slam';

export interface PlayerState {
  id: string;
  name: string;
  characterId: CharacterId;
  customGlbName?: string;
  isReady: boolean;
  isHost: boolean;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  position: [number, number, number];
  rotation: number; // yaw in radians
  action: PlayerAction;
  isBlocking: boolean;
  score: number;
  isBot?: boolean;
  level?: number;
  equippedSealTitle?: string;
  equippedSealRarity?: string;
  difficultyTier?: number;
  isPrimaryAttacker?: boolean;
  botArchetype?: string;
  lastUpdate: number;
}

export type RoomStatus = 'lobby' | 'countdown' | 'battle' | 'ended';

export type GameMode = 'standard' | 'battle_royale';

export interface RoomInfo {
  id: string;
  name: string;
  hostId: string;
  status: RoomStatus;
  gameMode?: GameMode;
  currentPhase?: number;
  maxPhases?: number;
  phaseEnemiesTotal?: number;
  phaseEnemiesAlive?: number;
  totalKills?: number;
  phaseBanner?: {
    title: string;
    subtitle: string;
    type: 'phase_start' | 'phase_cleared' | 'victory';
    timestamp: number;
    until: number;
  };
  botConfig?: any;
  players: Record<string, PlayerState>;
  maxPlayers: number;
  arena: 'neon_colosseum' | 'cyber_grid';
  winnerId?: string;
  countdown?: number;
  difficultyTier?: number;
  difficultyName?: string;
  createdAt: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  hostName: string;
}

export interface CombatEvent {
  id: string;
  type: 'attack' | 'special' | 'hit' | 'block' | 'death' | 'respawn';
  sourceId: string;
  targetId?: string;
  damage?: number;
  position?: [number, number, number];
  timestamp: number;
}

export interface ChatMsg {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: number;
  system?: boolean;
}

export interface FloatingDamage {
  id: string;
  text: string;
  position: [number, number, number];
  isCritical?: boolean;
  isBlocked?: boolean;
  createdAt: number;
}
