import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

interface Player {
  id: string;
  ws?: WebSocket;
  name: string;
  characterId: string;
  customGlbName?: string;
  isReady: boolean;
  isHost: boolean;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  position: [number, number, number];
  rotation: number;
  action: string;
  isBlocking: boolean;
  score: number;
  isBot?: boolean;
  level?: number;
  difficultyTier?: number;
  equippedSealTitle?: string;
  equippedSealRarity?: string;
  attackMultiplier?: number;
  blockDamageRatio?: number;
  isPrimaryAttacker?: boolean;
  botArchetype?: string;
  attackCooldownTicks?: number;
  lastUpdate: number;
}

interface BotConfig {
  tier: number;
  title: string;
  botName: string;
  botHp: number;
  attackDmg: number;
  speedStep: number;
  cooldownTicks: number;
  specialFreq: number;
  blockChance: number;
}

interface Room {
  id: string;
  name: string;
  hostId: string;
  status: 'lobby' | 'countdown' | 'battle' | 'ended';
  gameMode?: 'standard' | 'battle_royale';
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
  primaryAttackerId?: string;
  _isPhaseTransitioning?: boolean;
  players: Map<string, Player>;
  maxPlayers: number;
  arena: 'neon_colosseum' | 'cyber_grid';
  winnerId?: string;
  countdown?: number;
  difficultyTier?: number;
  difficultyName?: string;
  botConfig?: BotConfig;
  createdAt: number;
  botInterval?: NodeJS.Timeout;
}

interface PhaseConfig {
  phase: number;
  title: string;
  subtitle: string;
  enemies: Array<{
    name: string;
    characterId: string;
    hp: number;
    attackDmg: number;
    isBoss?: boolean;
    tier: number;
  }>;
}

const BATTLE_ROYALE_PHASES: PhaseConfig[] = [
  {
    phase: 1,
    title: 'Fase 1: Recrutas da Arena (2 Inimigos)',
    subtitle: 'Ataque em dupla! Elimine os dois para avançar.',
    enemies: [
      { name: 'Recruta Alfa', characterId: 'cyber_samurai', hp: 95, attackDmg: 14, tier: 1 },
      { name: 'Valkyria Sentinela', characterId: 'neon_valkyrie', hp: 90, attackDmg: 13, tier: 1 },
    ],
  },
  {
    phase: 2,
    title: 'Fase 2: Tríade de Choque (3 Inimigos)',
    subtitle: 'Cerco em trio! Um ataca rápido e os outros cercam em ritmo cadenciado.',
    enemies: [
      { name: 'Guerreiro Lança-Raio', characterId: 'cyber_samurai', hp: 115, attackDmg: 17, tier: 2 },
      { name: 'Valkyria Caçadora', characterId: 'neon_valkyrie', hp: 110, attackDmg: 16, tier: 2 },
      { name: 'Mecha Vanguarda', characterId: 'mecha_titan', hp: 130, attackDmg: 19, tier: 2 },
    ],
  },
  {
    phase: 3,
    title: 'Fase 3: Emboscada Quádrupla (4 Inimigos)',
    subtitle: 'Matilha de 4 oponentes! Use o combo e salto com impacto de área.',
    enemies: [
      { name: 'Sombra das Trevas', characterId: 'shadow_assassin', hp: 125, attackDmg: 20, tier: 3 },
      { name: 'Samurai Cibernético', characterId: 'cyber_samurai', hp: 135, attackDmg: 20, tier: 3 },
      { name: 'Valkyria Estelar', characterId: 'neon_valkyrie', hp: 125, attackDmg: 19, tier: 3 },
      { name: 'Mecha Quebra-Crânio', characterId: 'mecha_titan', hp: 155, attackDmg: 22, tier: 3 },
    ],
  },
  {
    phase: 4,
    title: 'Fase 4: Esquadrão Mortal (5 Inimigos)',
    subtitle: 'Pressão intensa de 5 guerreiros! Esquive com Dash e bloqueie com precisão.',
    enemies: [
      { name: 'Executor Sombrio', characterId: 'shadow_assassin', hp: 145, attackDmg: 23, tier: 4 },
      { name: 'Mestre Espadachim', characterId: 'cyber_samurai', hp: 150, attackDmg: 22, tier: 4 },
      { name: 'Arcanista Valkyria', characterId: 'neon_valkyrie', hp: 140, attackDmg: 22, tier: 4 },
      { name: 'Titã Destruidor', characterId: 'mecha_titan', hp: 175, attackDmg: 25, tier: 4 },
      { name: 'Fantasma Neon', characterId: 'shadow_assassin', hp: 140, attackDmg: 23, tier: 4 },
    ],
  },
  {
    phase: 5,
    title: 'Fase 5 - FINAL: O Titã Supremo & Guarda Imperial (6 Inimigos)',
    subtitle: 'Derrote o Chefe Titã e seus 5 protetores para a Vitória Real!',
    enemies: [
      { name: 'Cyber Titã Supremo [CHEFE]', characterId: 'mecha_titan', hp: 350, attackDmg: 32, isBoss: true, tier: 5 },
      { name: 'Guarda de Honra Alfa', characterId: 'cyber_samurai', hp: 140, attackDmg: 21, tier: 4 },
      { name: 'Guarda de Honra Beta', characterId: 'neon_valkyrie', hp: 135, attackDmg: 20, tier: 4 },
      { name: 'Algoz Imperial', characterId: 'shadow_assassin', hp: 140, attackDmg: 22, tier: 4 },
      { name: 'Guarda Titânica', characterId: 'mecha_titan', hp: 165, attackDmg: 23, tier: 4 },
      { name: 'Valkyria Imperial', characterId: 'neon_valkyrie', hp: 135, attackDmg: 20, tier: 4 },
    ],
  },
];

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json({ limit: '50mb' }));

const rooms = new Map<string, Room>();

// Persistent progress backup in-memory store
const playerProgressStore = new Map<string, any>();

function computeServerDifficulty(wins: number): BotConfig {
  if (wins < 4) {
    return {
      tier: 1,
      title: 'Tier 1: Cyber Cadete',
      botName: 'CyberBot Cadete v1.0',
      botHp: 115,
      attackDmg: 16,
      speedStep: 0.33,
      cooldownTicks: 18,
      specialFreq: 0.18,
      blockChance: 0.15,
    };
  } else if (wins < 8) {
    return {
      tier: 2,
      title: 'Tier 2: Cyber Guerreiro',
      botName: 'CyberBot Guerreiro v2.4',
      botHp: 140,
      attackDmg: 20,
      speedStep: 0.38,
      cooldownTicks: 15,
      specialFreq: 0.28,
      blockChance: 0.26,
    };
  } else if (wins < 12) {
    return {
      tier: 3,
      title: 'Tier 3: Cyber Executor',
      botName: 'CyberBot Executor v3.8',
      botHp: 170,
      attackDmg: 24,
      speedStep: 0.44,
      cooldownTicks: 12,
      specialFreq: 0.38,
      blockChance: 0.38,
    };
  } else if (wins < 16) {
    return {
      tier: 4,
      title: 'Tier 4: Cyber Titã Alfa',
      botName: 'Cyber Titã Alfa v4.5',
      botHp: 205,
      attackDmg: 29,
      speedStep: 0.50,
      cooldownTicks: 10,
      specialFreq: 0.48,
      blockChance: 0.48,
    };
  } else if (wins < 20) {
    return {
      tier: 5,
      title: 'Tier 5: Cyber Overlord',
      botName: 'Cyber Overlord Supremo v5.2',
      botHp: 245,
      attackDmg: 34,
      speedStep: 0.56,
      cooldownTicks: 8,
      specialFreq: 0.58,
      blockChance: 0.58,
    };
  } else {
    const extraTiers = Math.floor((wins - 20) / 4) + 1;
    const tierNum = 5 + extraTiers;
    return {
      tier: tierNum,
      title: `Tier ${tierNum}: Soberano Cósmico`,
      botName: `Cyber Divindade Mk-${tierNum}`,
      botHp: 245 + extraTiers * 30,
      attackDmg: 34 + extraTiers * 4,
      speedStep: Math.min(0.72, 0.56 + extraTiers * 0.04),
      cooldownTicks: Math.max(5, 8 - Math.floor(extraTiers / 2)),
      specialFreq: 0.68,
      blockChance: 0.65,
    };
  }
}

// Helper: Serialize room for network transmission
function serializeRoom(room: Room) {
  const playersObj: Record<string, Omit<Player, 'ws'>> = {};
  room.players.forEach((p, id) => {
    const { ws, ...rest } = p;
    playersObj[id] = rest;
  });

  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    gameMode: room.gameMode || 'standard',
    currentPhase: room.currentPhase,
    maxPhases: room.maxPhases,
    phaseEnemiesTotal: room.phaseEnemiesTotal,
    phaseEnemiesAlive: room.phaseEnemiesAlive,
    totalKills: room.totalKills,
    phaseBanner: room.phaseBanner,
    players: playersObj,
    maxPlayers: room.maxPlayers,
    arena: room.arena,
    winnerId: room.winnerId,
    countdown: room.countdown,
    difficultyTier: room.difficultyTier,
    difficultyName: room.difficultyName,
    createdAt: room.createdAt,
  };
}

function broadcastToRoom(room: Room, message: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  room.players.forEach((player) => {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  });
}

function getRoomSummaries() {
  const list: Array<{
    id: string;
    name: string;
    playerCount: number;
    maxPlayers: number;
    status: string;
    hostName: string;
  }> = [];

  rooms.forEach((r) => {
    // Hide solo practice and battle royale rooms from public multiplayer lobby browser
    if (r.id.startsWith('PRACTICE-') || r.id.startsWith('SOLO-') || r.id.startsWith('BATTLE-ROYALE-')) return;
    const humanPlayers = Array.from(r.players.values()).filter((p) => !p.isBot);
    // Ignore empty/ghost rooms with only bots
    if (humanPlayers.length === 0) return;

    const host = r.players.get(r.hostId) || humanPlayers[0];
    list.push({
      id: r.id,
      name: r.name,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      status: r.status,
      hostName: host ? host.name : 'Jogador',
    });
  });

  return list;
}

// REST endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
  res.json({ rooms: getRoomSummaries() });
});

// REST endpoints for player battle progression & seals persistence backup
app.get('/api/player-progress/:name', (req, res) => {
  const key = (req.params.name || '').toLowerCase().trim();
  const record = playerProgressStore.get(key) || null;
  res.json({ record });
});

app.post('/api/player-progress/:name', (req, res) => {
  const key = (req.params.name || '').toLowerCase().trim();
  const record = req.body;
  if (record && key) {
    playerProgressStore.set(key, record);
  }
  res.json({ status: 'ok', saved: true });
});

// WebSocket Connection Management
wss.on('connection', (ws: WebSocket) => {
  const clientId = 'player_' + Math.random().toString(36).substring(2, 9);
  let currentRoomId: string | null = null;

  const send = (msg: object) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  // Welcome client
  send({ type: 'connected', clientId });
  send({ type: 'room_list', rooms: getRoomSummaries() });

  ws.on('message', (raw: string) => {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'get_rooms': {
          send({ type: 'room_list', rooms: getRoomSummaries() });
          break;
        }

        case 'create_room': {
          if (currentRoomId) handleLeave();
          const roomId = 'ARENA-' + Math.floor(1000 + Math.random() * 9000);
          const roomName = data.roomName || `Sala de ${data.playerName || 'Guerreiro'}`;
          const player: Player = {
            id: clientId,
            ws,
            name: data.playerName || 'Guerreiro 1',
            characterId: data.characterId || 'cyber_samurai',
            customGlbName: data.customGlbName,
            isReady: false,
            isHost: true,
            hp: 100,
            maxHp: 100,
            energy: 100,
            maxEnergy: 100,
            position: [-6, 0, 0],
            rotation: -Math.PI / 2,
            action: 'idle',
            isBlocking: false,
            score: 0,
            lastUpdate: Date.now(),
          };

          const room: Room = {
            id: roomId,
            name: roomName,
            hostId: clientId,
            status: 'lobby',
            players: new Map([[clientId, player]]),
            maxPlayers: 2,
            arena: 'neon_colosseum',
            createdAt: Date.now(),
          };

          rooms.set(roomId, room);
          currentRoomId = roomId;

          send({ type: 'room_joined', room: serializeRoom(room), localId: clientId });
          // Notify room list update
          broadcastRoomList();
          break;
        }

        case 'join_room': {
          if (currentRoomId) handleLeave();
          const room = rooms.get(data.roomId);
          if (!room) {
            send({ type: 'error', message: 'Sala não encontrada!' });
            return;
          }
          if (room.players.size >= room.maxPlayers) {
            send({ type: 'error', message: 'A sala está cheia!' });
            return;
          }

          const player: Player = {
            id: clientId,
            ws,
            name: data.playerName || `Guerreiro ${room.players.size + 1}`,
            characterId: data.characterId || 'neon_valkyrie',
            customGlbName: data.customGlbName,
            isReady: false,
            isHost: false,
            hp: 100,
            maxHp: 100,
            energy: 100,
            maxEnergy: 100,
            position: [6, 0, 0],
            rotation: Math.PI / 2,
            action: 'idle',
            isBlocking: false,
            score: 0,
            lastUpdate: Date.now(),
          };

          room.players.set(clientId, player);
          currentRoomId = room.id;

          send({ type: 'room_joined', room: serializeRoom(room), localId: clientId });
          broadcastToRoom(room, { type: 'room_state', room: serializeRoom(room) });
          broadcastRoomList();
          break;
        }

        case 'start_practice': {
          if (currentRoomId) handleLeave();
          // Practice vs AI Bot with dynamic difficulty scaling
          const playerWins = typeof data.playerWins === 'number' ? data.playerWins : 0;
          const botConfig = computeServerDifficulty(playerWins);

          const hpBonus = typeof data.bonusHp === 'number' ? data.bonusHp : 0;
          const playerMaxHp = 100 + hpBonus;

          const roomId = 'PRACTICE-' + Math.floor(1000 + Math.random() * 9000);
          const localPlayer: Player = {
            id: clientId,
            ws,
            name: data.playerName || 'Guerreiro Solo',
            characterId: data.characterId || 'cyber_samurai',
            customGlbName: data.customGlbName,
            isReady: true,
            isHost: true,
            hp: playerMaxHp,
            maxHp: playerMaxHp,
            energy: 100,
            maxEnergy: 100,
            position: [-6, 0, 0],
            rotation: -Math.PI / 2,
            action: 'idle',
            isBlocking: false,
            score: 0,
            level: data.level || 1,
            equippedSealTitle: data.equippedSealTitle,
            equippedSealRarity: data.equippedSealRarity,
            attackMultiplier: data.attackMultiplier || 1,
            blockDamageRatio: data.blockDefenseBonusPct ? Math.max(0.1, 0.25 - data.blockDefenseBonusPct / 200) : 0.25,
            lastUpdate: Date.now(),
          };

          const botId = 'bot_' + Math.random().toString(36).substring(2, 7);
          const botPlayer: Player = {
            id: botId,
            name: botConfig.botName,
            characterId: botConfig.tier >= 4 ? 'mecha_titan' : (botConfig.tier >= 2 ? 'neon_valkyrie' : 'mecha_titan'),
            isReady: true,
            isHost: false,
            hp: botConfig.botHp,
            maxHp: botConfig.botHp,
            energy: 100,
            maxEnergy: 100,
            position: [6, 0, 0],
            rotation: Math.PI / 2,
            action: 'idle',
            isBlocking: false,
            score: 0,
            isBot: true,
            level: botConfig.tier,
            difficultyTier: botConfig.tier,
            lastUpdate: Date.now(),
          };

          const room: Room = {
            id: roomId,
            name: `Arena: ${botConfig.title}`,
            hostId: clientId,
            status: 'battle',
            players: new Map([
              [clientId, localPlayer],
              [botId, botPlayer],
            ]),
            maxPlayers: 2,
            arena: 'neon_colosseum',
            difficultyTier: botConfig.tier,
            difficultyName: botConfig.title,
            botConfig,
            createdAt: Date.now(),
          };

          rooms.set(roomId, room);
          currentRoomId = roomId;

          // Start Bot AI loop
          setupBotAI(room, botPlayer, clientId);

          send({ type: 'room_joined', room: serializeRoom(room), localId: clientId });
          send({ type: 'game_started', room: serializeRoom(room) });
          break;
        }

        case 'start_battle_royale': {
          if (currentRoomId) handleLeave();

          const hpBonus = typeof data.bonusHp === 'number' ? data.bonusHp : 0;
          const playerMaxHp = 100 + hpBonus;

          const roomId = 'BATTLE-ROYALE-' + Math.floor(1000 + Math.random() * 9000);
          const localPlayer: Player = {
            id: clientId,
            ws,
            name: data.playerName || 'Guerreiro da Arena',
            characterId: data.characterId || 'cyber_samurai',
            customGlbName: data.customGlbName,
            isReady: true,
            isHost: true,
            hp: playerMaxHp,
            maxHp: playerMaxHp,
            energy: 100,
            maxEnergy: 100,
            position: [0, 0, 0],
            rotation: 0,
            action: 'idle',
            isBlocking: false,
            score: 0,
            level: data.level || 1,
            equippedSealTitle: data.equippedSealTitle,
            equippedSealRarity: data.equippedSealRarity,
            attackMultiplier: data.attackMultiplier || 1,
            blockDamageRatio: data.blockDefenseBonusPct ? Math.max(0.1, 0.25 - data.blockDefenseBonusPct / 200) : 0.25,
            lastUpdate: Date.now(),
          };

          const room: Room = {
            id: roomId,
            name: 'Battle Royale: Horda de Fases',
            hostId: clientId,
            status: 'battle',
            gameMode: 'battle_royale',
            currentPhase: 1,
            maxPhases: 5,
            totalKills: 0,
            players: new Map([[clientId, localPlayer]]),
            maxPlayers: 10,
            arena: 'neon_colosseum',
            createdAt: Date.now(),
          };

          rooms.set(roomId, room);
          currentRoomId = roomId;

          spawnBattleRoyaleWave(room, 1, clientId);

          send({ type: 'room_joined', room: serializeRoom(room), localId: clientId });
          send({ type: 'game_started', room: serializeRoom(room) });
          break;
        }

        case 'select_character': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const p = room.players.get(clientId);
          if (p) {
            p.characterId = data.characterId;
            p.customGlbName = data.customGlbName;
            broadcastToRoom(room, { type: 'room_state', room: serializeRoom(room) });
          }
          break;
        }

        case 'toggle_ready': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const p = room.players.get(clientId);
          if (p) {
            p.isReady = typeof data.isReady === 'boolean' ? data.isReady : !p.isReady;
            broadcastToRoom(room, { type: 'room_state', room: serializeRoom(room) });
          }
          break;
        }

        case 'start_game': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.hostId !== clientId) return;

          room.status = 'countdown';
          let count = 3;
          broadcastToRoom(room, { type: 'game_countdown', seconds: count });

          const interval = setInterval(() => {
            count--;
            if (count > 0) {
              broadcastToRoom(room, { type: 'game_countdown', seconds: count });
            } else {
              clearInterval(interval);
              room.status = 'battle';
              // Reset HP and positions
              let idx = 0;
              room.players.forEach((p) => {
                p.hp = p.maxHp;
                p.energy = 100;
                p.position = idx === 0 ? [-6, 0, 0] : [6, 0, 0];
                p.rotation = idx === 0 ? -Math.PI / 2 : Math.PI / 2;
                idx++;
              });
              broadcastToRoom(room, { type: 'game_started', room: serializeRoom(room) });
            }
          }, 1000);
          break;
        }

        case 'player_input': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.status !== 'battle') return;

          const p = room.players.get(clientId);
          if (p && p.hp > 0) {
            if (data.position) p.position = data.position;
            if (typeof data.rotation === 'number') p.rotation = data.rotation;
            if (data.action) p.action = data.action;
            p.isBlocking = !!data.isBlocking;
            p.lastUpdate = Date.now();

            // Broadcast movement delta to other players
            broadcastToRoom(
              room,
              {
                type: 'player_moved',
                playerId: clientId,
                position: p.position,
                rotation: p.rotation,
                action: p.action,
                isBlocking: p.isBlocking,
              },
              ws
            );
          }
          break;
        }

        case 'player_attack': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.status !== 'battle') return;

          const p = room.players.get(clientId);
          if (p && p.hp > 0) {
            // Deduct energy if special
            if (data.attackType === 'special') {
              p.energy = Math.max(0, p.energy - 40);
            }
            broadcastToRoom(
              room,
              {
                type: 'remote_attack',
                sourceId: clientId,
                attackType: data.attackType || 'light',
                origin: data.origin,
                direction: data.direction,
              },
              ws
            );
          }
          break;
        }

        case 'player_hit_ack': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room || room.status !== 'battle') return;

          const attacker = room.players.get(data.attackerId || clientId);
          const target = room.players.get(data.targetId);

          if (attacker && target && target.hp > 0) {
            // Debounce rapid duplicate hit registers from client ticks
            const now = Date.now();
            const lastHit = (target as any)._lastHitTimestamp || 0;
            if (now - lastHit < 160) {
              return;
            }
            (target as any)._lastHitTimestamp = now;

            let damage = Math.round(data.damage || 20);
            if (attacker.attackMultiplier && attacker.attackMultiplier > 1) {
              damage = Math.round(damage * attacker.attackMultiplier);
            }

            const isBlocked = target.isBlocking;
            if (isBlocked) {
              const ratio = target.blockDamageRatio !== undefined ? target.blockDamageRatio : 0.25;
              damage = Math.max(1, Math.round(damage * ratio));
            }

            target.hp = Math.max(0, target.hp - damage);
            attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 15);

            broadcastToRoom(room, {
              type: 'combat_hit',
              sourceId: attacker.id,
              targetId: target.id,
              damage,
              isBlocked,
              targetHp: target.hp,
              attackerEnergy: attacker.energy,
            });

            // Check for defeat / victory
            if (target.hp <= 0) {
              attacker.score += 1;
              broadcastToRoom(room, {
                type: 'player_death',
                victimId: target.id,
                killerId: attacker.id,
              });

              if (room.gameMode === 'battle_royale') {
                if (target.isBot) {
                  room.totalKills = (room.totalKills || 0) + 1;
                  // If target was primary attacker, release slot so next bot becomes primary
                  if (room.primaryAttackerId === target.id) {
                    room.primaryAttackerId = undefined;
                  }
                  // Cleanly remove dead bot from room players after brief delay
                  setTimeout(() => {
                    const b = room.players.get(target.id);
                    if (b && b.hp <= 0) {
                      room.players.delete(target.id);
                    }
                  }, 1200);
                  // Swarm AI loop will detect when aliveBots.length === 0 and advance phase or victory
                } else {
                  // Human was defeated in battle royale
                  setTimeout(() => {
                    if (room.status === 'battle') {
                      room.status = 'ended';
                      room.winnerId = attacker.id;
                      broadcastToRoom(room, {
                        type: 'game_over',
                        winnerId: attacker.id,
                        winnerName: attacker.name,
                        room: serializeRoom(room),
                        isBattleRoyaleWin: false,
                        totalKills: room.totalKills || 0,
                        phasesSurvived: (room.currentPhase || 1) - 1,
                      });
                    }
                  }, 1200);
                }
              } else {
                // Standard match end
                setTimeout(() => {
                  if (room.status === 'battle') {
                    room.status = 'ended';
                    room.winnerId = attacker.id;
                    broadcastToRoom(room, {
                      type: 'game_over',
                      winnerId: attacker.id,
                      winnerName: attacker.name,
                      room: serializeRoom(room),
                    });
                  }
                }, 1500);
              }
            }
          }
          break;
        }

        case 'rematch': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const humanPlayer = room.players.get(clientId);

          // If Battle Royale mode
          if (room.gameMode === 'battle_royale') {
            if (humanPlayer) {
              if (typeof data.bonusHp === 'number') {
                humanPlayer.maxHp = 100 + data.bonusHp;
              }
              if (typeof data.level === 'number') {
                humanPlayer.level = data.level;
              }
              if (data.equippedSealTitle) {
                humanPlayer.equippedSealTitle = data.equippedSealTitle;
                humanPlayer.equippedSealRarity = data.equippedSealRarity;
              }
              if (data.attackMultiplier) {
                humanPlayer.attackMultiplier = data.attackMultiplier;
              }
              if (data.blockDefenseBonusPct) {
                humanPlayer.blockDamageRatio = Math.max(0.1, 0.25 - data.blockDefenseBonusPct / 200);
              }
              humanPlayer.hp = humanPlayer.maxHp;
              humanPlayer.energy = 100;
              humanPlayer.position = [0, 0, 0];
              humanPlayer.rotation = 0;
              humanPlayer.action = 'idle';
              humanPlayer.isBlocking = false;
            }

            room.status = 'battle';
            room.totalKills = 0;
            room.currentPhase = 1;
            spawnBattleRoyaleWave(room, 1, clientId);
            broadcastToRoom(room, { type: 'game_started', room: serializeRoom(room) });
            break;
          }

          const botPlayer = Array.from(room.players.values()).find((p) => p.isBot);

          // If practice room vs Bot, check if player has updated wins or seal stats for next round
          if (botPlayer && humanPlayer) {
            const playerWins = typeof data.playerWins === 'number' ? data.playerWins : undefined;
            if (playerWins !== undefined) {
              const botConfig = computeServerDifficulty(playerWins);
              room.difficultyTier = botConfig.tier;
              room.difficultyName = botConfig.title;
              room.botConfig = botConfig;
              room.name = `Arena: ${botConfig.title}`;

              botPlayer.name = botConfig.botName;
              botPlayer.maxHp = botConfig.botHp;
              botPlayer.hp = botConfig.botHp;
              botPlayer.level = botConfig.tier;
              botPlayer.difficultyTier = botConfig.tier;
            }

            if (typeof data.bonusHp === 'number') {
              humanPlayer.maxHp = 100 + data.bonusHp;
            }
            if (typeof data.level === 'number') {
              humanPlayer.level = data.level;
            }
            if (data.equippedSealTitle) {
              humanPlayer.equippedSealTitle = data.equippedSealTitle;
              humanPlayer.equippedSealRarity = data.equippedSealRarity;
            }
            if (data.attackMultiplier) {
              humanPlayer.attackMultiplier = data.attackMultiplier;
            }
            if (data.blockDefenseBonusPct) {
              humanPlayer.blockDamageRatio = Math.max(0.1, 0.25 - data.blockDefenseBonusPct / 200);
            }
          }

          room.status = 'battle';
          let i = 0;
          room.players.forEach((p) => {
            p.hp = p.maxHp;
            p.energy = 100;
            p.position = i === 0 ? [-6, 0, 0] : [6, 0, 0];
            p.rotation = i === 0 ? -Math.PI / 2 : Math.PI / 2;
            p.action = 'idle';
            p.isBlocking = false;
            i++;
          });

          if (botPlayer && humanPlayer) {
            if (room.botInterval) {
              clearInterval(room.botInterval);
              room.botInterval = undefined;
            }
            setupBotAI(room, botPlayer, humanPlayer.id);
          }

          broadcastToRoom(room, { type: 'game_started', room: serializeRoom(room) });
          break;
        }

        case 'chat_message': {
          if (!currentRoomId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;
          const p = room.players.get(clientId);
          if (p && data.text) {
            broadcastToRoom(room, {
              type: 'chat_broadcast',
              id: Math.random().toString(36).substring(2, 9),
              senderId: clientId,
              senderName: p.name,
              text: String(data.text).slice(0, 100),
              time: Date.now(),
            });
          }
          break;
        }

        case 'leave_room': {
          handleLeave();
          break;
        }

        case 'ping': {
          send({ type: 'pong', timestamp: data.timestamp });
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  const handleLeave = () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) {
      currentRoomId = null;
      return;
    }

    if (room.botInterval) {
      clearInterval(room.botInterval);
      room.botInterval = undefined;
    }

    room.players.delete(clientId);
    const humanPlayers = Array.from(room.players.values()).filter((p) => !p.isBot);

    // If no real players remain, delete the room cleanly to prevent ghost server rooms
    if (humanPlayers.length === 0) {
      rooms.delete(currentRoomId);
    } else {
      // If host left, assign new host from remaining humans
      if (room.hostId === clientId) {
        const nextHost = humanPlayers[0];
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
        }
      }
      broadcastToRoom(room, { type: 'room_state', room: serializeRoom(room) });
    }

    currentRoomId = null;
    broadcastRoomList();
  };

  ws.on('close', handleLeave);
  ws.on('error', handleLeave);
});

function broadcastRoomList() {
  const data = JSON.stringify({ type: 'room_list', rooms: getRoomSummaries() });
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(data);
    }
  });
}

// AI Bot Routine for Practice Mode
function setupBotAI(room: Room, bot: Player, humanId: string) {
  let tickCount = 0;
  let attackCooldown = 0;
  const config = room.botConfig || computeServerDifficulty(0);

  room.botInterval = setInterval(() => {
    if (room.status !== 'battle' || bot.hp <= 0) return;

    const human = room.players.get(humanId);
    if (!human || human.hp <= 0) return;

    tickCount++;
    attackCooldown = Math.max(0, attackCooldown - 1);

    // Calculate distance and angle to human
    const dx = human.position[0] - bot.position[0];
    const dz = human.position[2] - bot.position[2];
    const dist = Math.hypot(dx, dz);
    const targetAngle = Math.atan2(-dx, -dz);

    bot.rotation = targetAngle;

    // Movement: pursue until in melee range (dist ~ 2.4)
    let action = 'idle';
    if (dist > 2.5) {
      const step = config.speedStep;
      // High tier bots perform tactical sinusoidal micro-strafing
      let strafeX = 0;
      let strafeZ = 0;
      if (config.tier >= 3) {
        const strafe = Math.sin(tickCount * 0.16) * 0.12;
        strafeX = (-dz / dist) * strafe;
        strafeZ = (dx / dist) * strafe;
      }
      bot.position[0] += (dx / dist) * step + strafeX;
      bot.position[2] += (dz / dist) * step + strafeZ;
      action = 'walk';
    } else {
      // Combat range
      if (attackCooldown === 0) {
        if (bot.energy >= 40 && Math.random() < config.specialFreq) {
          // Bot special
          bot.energy = Math.max(0, bot.energy - 40);
          action = 'special';
          attackCooldown = Math.max(12, Math.round(config.cooldownTicks * 1.5));
          broadcastToRoom(room, {
            type: 'remote_attack',
            sourceId: bot.id,
            attackType: 'special',
            origin: [bot.position[0] + (dx / dist) * 1.1, 1.2, bot.position[2] + (dz / dist) * 1.1],
            direction: [dx / dist, 0, dz / dist],
          });
        } else {
          // Bot normal attack
          action = 'attack';
          attackCooldown = config.cooldownTicks;
          broadcastToRoom(room, {
            type: 'remote_attack',
            sourceId: bot.id,
            attackType: 'light',
            origin: [bot.position[0] + (dx / dist) * 1.1, 1.1, bot.position[2] + (dz / dist) * 1.1],
            direction: [dx / dist, 0, dz / dist],
          });

          // Inflict damage if human close enough
          setTimeout(() => {
            if (room.status !== 'battle') return;
            const currentHuman = room.players.get(humanId);
            if (currentHuman && currentHuman.hp > 0) {
              const curDist = Math.hypot(
                currentHuman.position[0] - bot.position[0],
                currentHuman.position[2] - bot.position[2]
              );
              if (curDist < 3.2) {
                let dmg = config.attackDmg;
                if (currentHuman.isBlocking) {
                  const ratio = currentHuman.blockDamageRatio !== undefined ? currentHuman.blockDamageRatio : 0.25;
                  dmg = Math.max(1, Math.round(dmg * ratio));
                }
                currentHuman.hp = Math.max(0, currentHuman.hp - dmg);
                broadcastToRoom(room, {
                  type: 'combat_hit',
                  sourceId: bot.id,
                  targetId: currentHuman.id,
                  damage: dmg,
                  isBlocked: currentHuman.isBlocking,
                  targetHp: currentHuman.hp,
                  attackerEnergy: bot.energy,
                });

                if (currentHuman.hp <= 0) {
                  bot.score += 1;
                  broadcastToRoom(room, {
                    type: 'player_death',
                    victimId: currentHuman.id,
                    killerId: bot.id,
                  });
                  setTimeout(() => {
                    room.status = 'ended';
                    room.winnerId = bot.id;
                    broadcastToRoom(room, {
                      type: 'game_over',
                      winnerId: bot.id,
                      winnerName: bot.name,
                      room: serializeRoom(room),
                    });
                  }, 1200);
                }
              }
            }
          }, 350);
        }
      } else if (Math.random() < config.blockChance) {
        // Random tactical block scaled with difficulty
        bot.isBlocking = true;
        action = 'block';
      } else {
        bot.isBlocking = false;
      }
    }

    bot.action = action;

    broadcastToRoom(room, {
      type: 'player_moved',
      playerId: bot.id,
      position: bot.position,
      rotation: bot.rotation,
      action: bot.action,
      isBlocking: bot.isBlocking,
    });
  }, 100);
}

// Battle Royale Wave Spawner & Swarm Orchestrator
function spawnBattleRoyaleWave(room: Room, phaseNum: number, humanId: string) {
  const phaseConfig = BATTLE_ROYALE_PHASES.find((p) => p.phase === phaseNum) || BATTLE_ROYALE_PHASES[0];

  // Remove previous bot players
  Array.from(room.players.keys()).forEach((id) => {
    if (id !== humanId) {
      room.players.delete(id);
    }
  });

  const count = phaseConfig.enemies.length;
  room.phaseEnemiesTotal = count;
  room.phaseEnemiesAlive = count;
  room.currentPhase = phaseNum;
  room.maxPhases = BATTLE_ROYALE_PHASES.length;
  room.name = `Battle Royale: ${phaseConfig.title}`;
  room.primaryAttackerId = undefined;
  (room as any)._isPhaseTransitioning = false;

  room.phaseBanner = {
    title: phaseConfig.title,
    subtitle: phaseConfig.subtitle,
    type: 'phase_start',
    timestamp: Date.now(),
    until: Date.now() + 3500,
  };

  phaseConfig.enemies.forEach((cfg, idx) => {
    const angle = (idx / count) * Math.PI * 2;
    const spawnRadius = 10.5;
    const posX = Math.cos(angle) * spawnRadius;
    const posZ = Math.sin(angle) * spawnRadius;
    const rot = Math.atan2(-posX, -posZ);
    const botId = `br_bot_${phaseNum}_${idx}_` + Math.random().toString(36).substring(2, 6);

    const bot: Player = {
      id: botId,
      name: cfg.name,
      characterId: cfg.characterId,
      isReady: true,
      isHost: false,
      hp: cfg.hp,
      maxHp: cfg.hp,
      energy: 100,
      maxEnergy: 100,
      position: [posX, 0, posZ],
      rotation: rot,
      action: 'idle',
      isBlocking: false,
      score: 0,
      isBot: true,
      level: cfg.tier,
      difficultyTier: cfg.tier,
      attackCooldownTicks: 10 + idx * 4,
      lastUpdate: Date.now(),
    };
    room.players.set(botId, bot);
  });

  setupBattleRoyaleSwarmAI(room, humanId);

  broadcastToRoom(room, {
    type: 'phase_started',
    phase: phaseNum,
    enemyCount: count,
    banner: room.phaseBanner,
    room: serializeRoom(room),
  });
}

function setupBattleRoyaleSwarmAI(room: Room, humanId: string) {
  if (room.botInterval) {
    clearInterval(room.botInterval);
    room.botInterval = undefined;
  }

  let tickCount = 0;

  room.botInterval = setInterval(() => {
    if (room.status !== 'battle') return;

    const human = room.players.get(humanId);
    if (!human || human.hp <= 0) return;

    // Alive bots targeting human
    const aliveBots = Array.from(room.players.values()).filter((p) => p.isBot && p.hp > 0);
    room.phaseEnemiesAlive = aliveBots.length;

    // Check if wave is cleared
    if (aliveBots.length === 0) {
      if ((room as any)._isPhaseTransitioning) return;
      (room as any)._isPhaseTransitioning = true;

      if ((room.currentPhase || 1) < (room.maxPhases || 5)) {
        // Player clears this phase!
        const nextPhase = (room.currentPhase || 1) + 1;
        const healAmt = Math.round(human.maxHp * 0.35);
        human.hp = Math.min(human.maxHp, human.hp + healAmt);

        room.phaseBanner = {
          title: `FASE ${room.currentPhase} CONCLUÍDA!`,
          subtitle: `Recuperando +${healAmt} de vida! Próxima horda se aproximando...`,
          type: 'phase_cleared',
          timestamp: Date.now(),
          until: Date.now() + 2500,
        };

        broadcastToRoom(room, {
          type: 'phase_cleared',
          phase: room.currentPhase,
          nextPhase,
          healAmount: healAmt,
          banner: room.phaseBanner,
          room: serializeRoom(room),
        });

        setTimeout(() => {
          if (room.status !== 'battle') return;
          (room as any)._isPhaseTransitioning = false;
          spawnBattleRoyaleWave(room, nextPhase, humanId);
        }, 2500);
      } else {
        // Player won all 5 phases! Victory!
        room.status = 'ended';
        room.winnerId = human.id;
        room.phaseBanner = {
          title: 'VITÓRIA REAL! CAMPEÃO DA ARENA',
          subtitle: `Você sobreviveu a todas as 5 fases e derrotou o Titã Supremo com ${room.totalKills || 0} eliminações!`,
          type: 'victory',
          timestamp: Date.now(),
          until: Date.now() + 10000,
        };

        broadcastToRoom(room, {
          type: 'game_over',
          winnerId: human.id,
          winnerName: human.name,
          room: serializeRoom(room),
          isBattleRoyaleWin: true,
          totalKills: room.totalKills,
          totalPhases: room.maxPhases,
        });
      }
      return;
    }

    tickCount++;

    // Calculate distance of each alive bot to the human
    const botDists = aliveBots.map((b) => {
      const dx = human.position[0] - b.position[0];
      const dz = human.position[2] - b.position[2];
      const dist = Math.hypot(dx, dz);
      return { bot: b, dx, dz, dist, directAngle: Math.atan2(-dx, -dz) };
    });

    // Determine primary attacker:
    // If current primary attacker died, is missing, or cycle timer expired, select the closest alive bot
    let currentPrimary = room.primaryAttackerId ? aliveBots.find((b) => b.id === room.primaryAttackerId) : null;
    if (!currentPrimary && botDists.length > 0) {
      const closest = botDists.reduce((min, cur) => (cur.dist < min.dist ? cur : min), botDists[0]);
      room.primaryAttackerId = closest.bot.id;
      currentPrimary = closest.bot;
    }

    // Process each bot
    botDists.forEach(({ bot, dx, dz, dist, directAngle }, idx) => {
      const isPrimary = (bot.id === room.primaryAttackerId);
      bot.isPrimaryAttacker = isPrimary;
      bot.attackCooldownTicks = Math.max(0, (bot.attackCooldownTicks || 0) - 1);
      bot.rotation = directAngle;

      if (isPrimary) {
        // PRIMARY ATTACKER:
        // Full, aggressive pursuit speed towards player
        const speedStep = 0.42;
        let action = 'idle';

        if (dist > 2.2) {
          // Approach human
          bot.position[0] += (dx / dist) * speedStep;
          bot.position[2] += (dz / dist) * speedStep;
          action = 'walk';

          // If at medium-far distance and ready, bot can launch a special projectile!
          if (dist >= 5.0 && dist <= 12.0 && (bot.attackCooldownTicks || 0) <= 0 && Math.random() < 0.28) {
            action = 'special';
            bot.attackCooldownTicks = 32; // 3.2s cooldown
            const attackOrigin: [number, number, number] = [
              bot.position[0] + (dx / dist) * 1.1,
              1.1,
              bot.position[2] + (dz / dist) * 1.1,
            ];
            const attackDir: [number, number, number] = [dx / dist, 0, dz / dist];

            broadcastToRoom(room, {
              type: 'remote_attack',
              sourceId: bot.id,
              attackType: 'special',
              origin: attackOrigin,
              direction: attackDir,
            });
          }
        } else {
          // In close melee combat range (dist <= 2.2)
          if ((bot.attackCooldownTicks || 0) <= 0) {
            action = 'attack';
            bot.attackCooldownTicks = 16; // ~1.6s cooldown
            const attackOrigin: [number, number, number] = [
              bot.position[0] + (dx / dist) * 1.1,
              1.1,
              bot.position[2] + (dz / dist) * 1.1,
            ];
            const attackDir: [number, number, number] = [dx / dist, 0, dz / dist];

            broadcastToRoom(room, {
              type: 'remote_attack',
              sourceId: bot.id,
              attackType: 'light',
              origin: attackOrigin,
              direction: attackDir,
            });

            // Strike with delay so human can block, counter, or dash away
            setTimeout(() => {
              if (room.status !== 'battle') return;
              const curHuman = room.players.get(humanId);
              const curBot = room.players.get(bot.id);

              // STRICT VALIDATION:
              // Bot MUST be alive, human MUST be alive, and bot MUST still be in close melee range (<= 2.4 units)!
              if (curHuman && curHuman.hp > 0 && curBot && curBot.hp > 0) {
                const curDist = Math.hypot(
                  curHuman.position[0] - curBot.position[0],
                  curHuman.position[2] - curBot.position[2]
                );

                // If player dashed away or bot moved away, attack misses cleanly
                if (curDist <= 2.4) {
                  let dmg = 18 + (curBot.level || 1) * 3;
                  if (curHuman.isBlocking) {
                    const ratio = curHuman.blockDamageRatio !== undefined ? curHuman.blockDamageRatio : 0.25;
                    dmg = Math.max(1, Math.round(dmg * ratio));
                  }
                  curHuman.hp = Math.max(0, curHuman.hp - dmg);
                  broadcastToRoom(room, {
                    type: 'combat_hit',
                    sourceId: curBot.id,
                    targetId: curHuman.id,
                    damage: dmg,
                    isBlocked: curHuman.isBlocking,
                    targetHp: curHuman.hp,
                    attackerEnergy: curBot.energy,
                  });

                  if (curHuman.hp <= 0) {
                    broadcastToRoom(room, {
                      type: 'player_death',
                      victimId: curHuman.id,
                      killerId: curBot.id,
                    });
                    setTimeout(() => {
                      room.status = 'ended';
                      room.winnerId = curBot.id;
                      broadcastToRoom(room, {
                        type: 'game_over',
                        winnerId: curBot.id,
                        winnerName: curBot.name,
                        room: serializeRoom(room),
                        isBattleRoyaleWin: false,
                        totalKills: room.totalKills || 0,
                        phasesSurvived: (room.currentPhase || 1) - 1,
                      });
                    }, 1200);
                  }
                }
              }
            }, 280);

            // Yield primary attacker spot so another bot steps up
            setTimeout(() => {
              if (room.primaryAttackerId === bot.id) {
                room.primaryAttackerId = undefined;
              }
            }, 1100);
          } else {
            action = 'idle';
          }
        }
        bot.action = action;
      } else {
        // FLANKERS / SURROUNDING BOTS:
        // "só que enquanto um ataca, os outros ficam mais lento, atacam também, só que mais lento"
        // Move towards the human at slower speed (~0.18 step)
        const slowSpeedStep = 0.18;
        let action = 'idle';

        // Calculate encircling orbital position close to human (~2.3 radius)
        const flankOffsetAngle = (idx % 2 === 0 ? 1 : -1) * (0.75 + idx * 0.3);
        const orbitAngle = directAngle + flankOffsetAngle;
        const targetRadius = 2.3;
        const targetX = human.position[0] - Math.sin(orbitAngle) * targetRadius;
        const targetZ = human.position[2] - Math.cos(orbitAngle) * targetRadius;

        const toTargetX = targetX - bot.position[0];
        const toTargetZ = targetZ - bot.position[2];
        const toTargetDist = Math.hypot(toTargetX, toTargetZ);

        if (toTargetDist > 0.4) {
          bot.position[0] += (toTargetX / toTargetDist) * slowSpeedStep;
          bot.position[2] += (toTargetZ / toTargetDist) * slowSpeedStep;
          action = 'walk';
        } else {
          action = 'idle';
        }

        // Flanker can fire a telegraphed special projectile from distance
        if (dist >= 5.0 && dist <= 12.0 && (bot.attackCooldownTicks || 0) <= 0 && Math.random() < 0.2) {
          action = 'special';
          bot.attackCooldownTicks = 55 + idx * 6; // Slower cooldown ~5.5s
          const attackOrigin: [number, number, number] = [
            bot.position[0] + (dx / dist) * 1.1,
            1.1,
            bot.position[2] + (dz / dist) * 1.1,
          ];
          const attackDir: [number, number, number] = [dx / dist, 0, dz / dist];

          broadcastToRoom(room, {
            type: 'remote_attack',
            sourceId: bot.id,
            attackType: 'special',
            origin: attackOrigin,
            direction: attackDir,
          });
        } else if (dist <= 2.2 && (bot.attackCooldownTicks || 0) <= 0) {
          // Melee attack only if in close melee range (dist <= 2.2)
          action = 'attack';
          bot.attackCooldownTicks = 45 + idx * 6; // Much slower melee attack cadence (~4.5s)
          const attackOrigin: [number, number, number] = [
            bot.position[0] + (dx / dist) * 1.1,
            1.1,
            bot.position[2] + (dz / dist) * 1.1,
          ];
          const attackDir: [number, number, number] = [dx / dist, 0, dz / dist];

          broadcastToRoom(room, {
            type: 'remote_attack',
            sourceId: bot.id,
            attackType: 'light',
            origin: attackOrigin,
            direction: attackDir,
          });

          // Inflict slower telegraphed hit with strict validation
          setTimeout(() => {
            if (room.status !== 'battle') return;
            const curHuman = room.players.get(humanId);
            const curBot = room.players.get(bot.id);

            // STRICT VALIDATION:
            // Bot MUST be alive, human MUST be alive, and bot MUST still be in close melee range (<= 2.4 units)!
            if (curHuman && curHuman.hp > 0 && curBot && curBot.hp > 0) {
              const curDist = Math.hypot(
                curHuman.position[0] - curBot.position[0],
                curHuman.position[2] - curBot.position[2]
              );

              // If player moved away or bot died, NO DAMAGE
              if (curDist <= 2.4) {
                let dmg = 12 + (curBot.level || 1) * 2;
                if (curHuman.isBlocking) {
                  const ratio = curHuman.blockDamageRatio !== undefined ? curHuman.blockDamageRatio : 0.25;
                  dmg = Math.max(1, Math.round(dmg * ratio));
                }
                curHuman.hp = Math.max(0, curHuman.hp - dmg);
                broadcastToRoom(room, {
                  type: 'combat_hit',
                  sourceId: curBot.id,
                  targetId: curHuman.id,
                  damage: dmg,
                  isBlocked: curHuman.isBlocking,
                  targetHp: curHuman.hp,
                  attackerEnergy: curBot.energy,
                });

                if (curHuman.hp <= 0) {
                  broadcastToRoom(room, {
                    type: 'player_death',
                    victimId: curHuman.id,
                    killerId: curBot.id,
                  });
                  setTimeout(() => {
                    room.status = 'ended';
                    room.winnerId = curBot.id;
                    broadcastToRoom(room, {
                      type: 'game_over',
                      winnerId: curBot.id,
                      winnerName: curBot.name,
                      room: serializeRoom(room),
                      isBattleRoyaleWin: false,
                      totalKills: room.totalKills || 0,
                      phasesSurvived: (room.currentPhase || 1) - 1,
                    });
                  }, 1200);
                }
              }
            }
          }, 380);
        }

        bot.action = action;
      }

      // Broadcast bot movement & status to client
      broadcastToRoom(room, {
        type: 'player_moved',
        playerId: bot.id,
        position: bot.position,
        rotation: bot.rotation,
        action: bot.action,
        isBlocking: bot.isBlocking,
        isPrimaryAttacker: isPrimary,
      });
    });
  }, 100);
}

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Arena Fighters server running on port ${PORT}`);
  });
}

startServer();
