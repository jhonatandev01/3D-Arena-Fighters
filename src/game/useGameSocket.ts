import { useEffect, useRef, useState, useCallback } from 'react';
import { CharacterId, ChatMsg, CombatEvent, PlayerAction, PlayerState, RoomInfo, RoomSummary } from '../types';

export function useGameSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState(0);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [roomList, setRoomList] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const callbacksRef = useRef<{
    onPlayerMoved?: (data: { playerId: string; position: [number, number, number]; rotation: number; action: PlayerAction; isBlocking: boolean }) => void;
    onRemoteAttack?: (data: { sourceId: string; attackType: 'light' | 'special'; origin: [number, number, number]; direction: [number, number, number] }) => void;
    onCombatHit?: (data: { sourceId: string; targetId: string; damage: number; isBlocked: boolean; targetHp: number; attackerEnergy: number }) => void;
    onPlayerDeath?: (data: { victimId: string; killerId: string }) => void;
    onGameOver?: (data: { winnerId: string; winnerName: string; room: RoomInfo; isBattleRoyaleWin?: boolean; totalKills?: number; phasesSurvived?: number }) => void;
    onPhaseCleared?: (data: { phase: number; nextPhase: number; healAmount?: number }) => void;
    onPhaseStarted?: (data: { phase: number; enemyCount: number }) => void;
  }>({});

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pingInterval: any = null;
    let reconnectTimeout: any = null;
    let isDestroyed = false;

    function connect() {
      if (isDestroyed) return;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}`;
      ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isDestroyed) {
          ws?.close();
          return;
        }
        setIsConnected(true);
        setErrorMsg(null);
        // Measure ping
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'connected':
              setLocalPlayerId(msg.clientId);
              break;

            case 'room_list':
              setRoomList(msg.rooms || []);
              break;

            case 'room_joined':
              setCurrentRoom(msg.room);
              setCountdown(null);
              break;

            case 'room_state':
              setCurrentRoom(msg.room);
              break;

            case 'game_countdown':
              setCountdown(msg.seconds);
              break;

            case 'game_started':
              setCountdown(null);
              setCurrentRoom(msg.room);
              break;

            case 'player_moved':
              if (callbacksRef.current.onPlayerMoved) {
                callbacksRef.current.onPlayerMoved(msg);
              }
              break;

            case 'remote_attack':
              if (callbacksRef.current.onRemoteAttack) {
                callbacksRef.current.onRemoteAttack(msg);
              }
              break;

            case 'combat_hit':
              // Update target HP locally
              setCurrentRoom((prev) => {
                if (!prev) return prev;
                const players = { ...prev.players };
                if (players[msg.targetId]) {
                  players[msg.targetId] = {
                    ...players[msg.targetId],
                    hp: msg.targetHp,
                  };
                }
                if (players[msg.sourceId]) {
                  players[msg.sourceId] = {
                    ...players[msg.sourceId],
                    energy: msg.attackerEnergy,
                  };
                }
                return { ...prev, players };
              });
              if (callbacksRef.current.onCombatHit) {
                callbacksRef.current.onCombatHit(msg);
              }
              break;

            case 'player_death':
              setCurrentRoom((prev) => {
                if (!prev) return prev;
                const players = { ...prev.players };
                if (players[msg.victimId]) {
                  players[msg.victimId] = {
                    ...players[msg.victimId],
                    hp: 0,
                    action: 'death',
                  };
                }
                const isBot = !!players[msg.victimId]?.isBot;
                return {
                  ...prev,
                  players,
                  phaseEnemiesAlive: isBot ? Math.max(0, (prev.phaseEnemiesAlive || 1) - 1) : prev.phaseEnemiesAlive,
                  totalKills: isBot ? (prev.totalKills || 0) + 1 : prev.totalKills,
                };
              });
              if (callbacksRef.current.onPlayerDeath) {
                callbacksRef.current.onPlayerDeath(msg);
              }
              break;

            case 'game_over':
              setCurrentRoom(msg.room);
              if (callbacksRef.current.onGameOver) {
                callbacksRef.current.onGameOver(msg);
              }
              break;

            case 'phase_cleared':
              setCurrentRoom((prev) => {
                const base = msg.room || prev;
                if (!base) return null;
                return {
                  ...base,
                  currentPhase: msg.phase,
                  phaseBanner: msg.banner,
                };
              });
              if (callbacksRef.current.onPhaseCleared) {
                callbacksRef.current.onPhaseCleared(msg);
              }
              break;

            case 'phase_started':
              setCurrentRoom((prev) => {
                const base = msg.room || prev;
                if (!base) return null;
                return {
                  ...base,
                  currentPhase: msg.phase,
                  phaseEnemiesTotal: msg.enemyCount,
                  phaseEnemiesAlive: msg.enemyCount,
                  phaseBanner: msg.banner,
                };
              });
              if (callbacksRef.current.onPhaseStarted) {
                callbacksRef.current.onPhaseStarted(msg);
              }
              break;

            case 'chat_broadcast':
              setChatMessages((prev) => [...prev.slice(-40), msg]);
              break;

            case 'pong':
              setPing(Date.now() - msg.timestamp);
              break;

            case 'error':
              setErrorMsg(msg.message);
              break;
          }
        } catch (e) {
          console.error('Socket message parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingInterval) clearInterval(pingInterval);
        if (!isDestroyed) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    }

    connect();

    return () => {
      isDestroyed = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        (ws as any).onclose = null;
        (ws as any).onerror = null;
        (ws as any).onmessage = null;
        (ws as any).close();
        ws = null;
      }
      socketRef.current = null;
    };
  }, []);

  const send = useCallback((data: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  }, []);

  const createRoom = useCallback((roomName: string, playerName: string, characterId: CharacterId, customGlbName?: string) => {
    send({ type: 'create_room', roomName, playerName, characterId, customGlbName });
  }, [send]);

  const joinRoom = useCallback((roomId: string, playerName: string, characterId: CharacterId, customGlbName?: string) => {
    send({ type: 'join_room', roomId, playerName, characterId, customGlbName });
  }, [send]);

  const startPractice = useCallback((
    playerName: string,
    characterId: CharacterId,
    customGlbName?: string,
    extraStats?: {
      playerWins?: number;
      level?: number;
      bonusHp?: number;
      attackMultiplier?: number;
      blockDefenseBonusPct?: number;
      equippedSealTitle?: string;
      equippedSealRarity?: string;
    }
  ) => {
    send({
      type: 'start_practice',
      playerName,
      characterId,
      customGlbName,
      ...extraStats,
    });
  }, [send]);

  const startBattleRoyale = useCallback((
    playerName: string,
    characterId: CharacterId,
    customGlbName?: string,
    extraStats?: {
      playerWins?: number;
      level?: number;
      bonusHp?: number;
      attackMultiplier?: number;
      blockDefenseBonusPct?: number;
      equippedSealTitle?: string;
      equippedSealRarity?: string;
    }
  ) => {
    send({
      type: 'start_battle_royale',
      playerName,
      characterId,
      customGlbName,
      ...extraStats,
    });
  }, [send]);

  const selectCharacter = useCallback((characterId: CharacterId, customGlbName?: string) => {
    send({ type: 'select_character', characterId, customGlbName });
  }, [send]);

  const toggleReady = useCallback((isReady?: boolean) => {
    send({ type: 'toggle_ready', isReady });
  }, [send]);

  const startGame = useCallback(() => {
    send({ type: 'start_game' });
  }, [send]);

  const sendRematch = useCallback((extraStats?: {
    playerWins?: number;
    level?: number;
    bonusHp?: number;
    attackMultiplier?: number;
    blockDefenseBonusPct?: number;
    equippedSealTitle?: string;
    equippedSealRarity?: string;
  }) => {
    send({ type: 'rematch', ...extraStats });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'leave_room' });
    setCurrentRoom(null);
    setCountdown(null);
  }, [send]);

  const sendPlayerInput = useCallback((
    position: [number, number, number],
    rotation: number,
    action: PlayerAction,
    isBlocking: boolean
  ) => {
    send({ type: 'player_input', position, rotation, action, isBlocking });
  }, [send]);

  const sendPlayerAttack = useCallback((
    attackType: 'light' | 'special',
    origin: [number, number, number],
    direction: [number, number, number]
  ) => {
    send({ type: 'player_attack', attackType, origin, direction });
  }, [send]);

  const sendHitAck = useCallback((targetId: string, damage: number, attackType: string, attackerId?: string) => {
    send({ type: 'player_hit_ack', targetId, damage, attackType, attackerId });
  }, [send]);

  const sendChatMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    send({ type: 'chat_message', text: text.trim() });
  }, [send]);

  const refreshRooms = useCallback(() => {
    send({ type: 'get_rooms' });
  }, [send]);

  return {
    isConnected,
    ping,
    localPlayerId,
    roomList,
    currentRoom,
    chatMessages,
    countdown,
    errorMsg,
    callbacksRef,
    createRoom,
    joinRoom,
    startPractice,
    startBattleRoyale,
    selectCharacter,
    toggleReady,
    startGame,
    sendRematch,
    leaveRoom,
    sendPlayerInput,
    sendPlayerAttack,
    sendHitAck,
    sendChatMessage,
    refreshRooms,
  };
}
