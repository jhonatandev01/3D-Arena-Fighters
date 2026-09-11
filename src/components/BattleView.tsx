import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Shield,
  Zap,
  Swords,
  Heart,
  Volume2,
  VolumeX,
  RotateCcw,
  Home,
  Radio,
  Award,
  Sparkles,
  Trophy,
  Flame,
  TrendingUp,
  Wind,
  ArrowUp,
} from 'lucide-react';
import { CharacterId, PlayerAction, PlayerState, RoomInfo } from '../types';
import { BattleArenaStage } from '../game/three/BattleArenaStage';
import { CHARACTER_PRESETS } from '../game/characterPresets';
import { soundManager } from '../game/sound';
import { ArenaLogo } from './ArenaLogo';
import {
  recordMatchOutcome,
  loadBattleProgress,
  computePlayerBuffs,
  getDifficultyTier,
  getNextSealProgress,
  BattleProgress,
  SealBadge,
} from '../game/battleProgress';

interface BattleViewProps {
  room: RoomInfo;
  localPlayerId: string;
  ping: number;
  callbacksRef: React.MutableRefObject<any>;
  onSendPlayerInput: (pos: [number, number, number], rot: number, action: PlayerAction, isBlocking: boolean) => void;
  onSendPlayerAttack: (type: 'light' | 'special', origin: [number, number, number], dir: [number, number, number]) => void;
  onSendHitAck: (targetId: string, damage: number, type: string, attackerId?: string) => void;
  onRematch: (extraStats?: any) => void;
  onExitToLobby: () => void;
}

export const BattleView: React.FC<BattleViewProps> = ({
  room,
  localPlayerId,
  ping,
  callbacksRef,
  onSendPlayerInput,
  onSendPlayerAttack,
  onSendHitAck,
  onRematch,
  onExitToLobby,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<BattleArenaStage | null>(null);

  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [remoteOverlays, setRemoteOverlays] = useState<Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    x: number;
    y: number;
    visible: boolean;
    isPrimaryAttacker?: boolean;
  }>>([]);

  const [matchOutcomeData, setMatchOutcomeData] = useState<{
    progress: BattleProgress;
    newlyUnlockedSeal: SealBadge | null;
    previousWins: number;
  } | null>(null);

  const hasRecordedOutcomeRef = useRef(false);
  const roomRef = useRef(room);
  roomRef.current = room;

  const localPlayer = room.players[localPlayerId];
  const playersList: PlayerState[] = Object.values(room.players);
  const opponent: PlayerState | undefined = playersList.find((p) => p.id !== localPlayerId);

  const localPreset = CHARACTER_PRESETS.find((c) => c.id === localPlayer?.characterId) || CHARACTER_PRESETS[0];
  const opponentPreset = CHARACTER_PRESETS.find((c) => c.id === opponent?.characterId) || CHARACTER_PRESETS[0];

  const isGameOver = room.status === 'ended';
  const isWinner = room.winnerId === localPlayerId;
  const isBattleRoyale = room.gameMode === 'battle_royale';

  // Reset outcome recording ref when room enters a fresh battle
  useEffect(() => {
    if (room.status === 'battle') {
      hasRecordedOutcomeRef.current = false;
      setMatchOutcomeData(null);
    }
  }, [room.status]);

  // Handle Game Over: record outcome, check seals and trigger audio/confetti
  useEffect(() => {
    if (isGameOver && !hasRecordedOutcomeRef.current) {
      hasRecordedOutcomeRef.current = true;
      const outcome = recordMatchOutcome(
        isWinner ? 'win' : 'loss',
        opponent?.name || (room.botConfig ? 'CyberBot' : 'Oponente'),
        opponent?.characterId || 'mecha_titan',
        localPlayer?.characterId || 'cyber_samurai'
      );
      setMatchOutcomeData(outcome);

      if (outcome.newlyUnlockedSeal) {
        soundManager.playSealUnlock();
        // Golden confetti for seal unlock
        confetti({
          particleCount: 160,
          spread: 90,
          colors: ['#f59e0b', '#fbbf24', '#38bdf8', '#ffffff'],
          origin: { y: 0.5 },
        });
      } else if (isWinner) {
        soundManager.playVictory();
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        soundManager.playDefeat();
      }
    }
  }, [isGameOver, isWinner, opponent, localPlayer, room.botConfig]);

  // Setup Three.js Battle Stage
  useEffect(() => {
    if (!containerRef.current) return;
    const stage = new BattleArenaStage(containerRef.current, localPlayerId);
    stageRef.current = stage;

    // Connect Stage callbacks to WebSocket sender
    stage.onStateUpdate = (pos, rot, action, isBlocking) => {
      onSendPlayerInput(pos, rot, action, isBlocking);
    };

    stage.onAttackTriggered = (type, origin, dir) => {
      onSendPlayerAttack(type, origin, dir);
    };

    stage.onHitTarget = (targetId, damage, type, attackerId) => {
      onSendHitAck(targetId, damage, type, attackerId);
    };

    // Hook network callbacks from socket to Three.js stage
    callbacksRef.current.onPlayerMoved = (data: any) => {
      if (!stageRef.current) return;
      if (stageRef.current.hasPlayer(data.playerId)) {
        stageRef.current.updatePlayerTransform(
          data.playerId,
          data.position,
          data.rotation,
          data.action,
          data.isBlocking,
          data.isPrimaryAttacker
        );
      } else {
        // If not loaded yet, fetch from freshest roomRef
        const existing = roomRef.current.players[data.playerId];
        if (existing) {
          stageRef.current.syncPlayer({
            ...existing,
            position: data.position,
            rotation: data.rotation,
            action: data.action,
            isBlocking: data.isBlocking,
          });
        }
      }
    };

    callbacksRef.current.onRemoteAttack = (data: any) => {
      stage.spawnRemoteAttack(data.sourceId, data.attackType, data.origin, data.direction);
    };

    callbacksRef.current.onCombatHit = (data: any) => {
      stage.applyDamageVisual(data.targetId, data.damage, data.isBlocked);
    };

    callbacksRef.current.onPlayerDeath = (data: any) => {
      if (data.victimId !== localPlayerId && stageRef.current) {
        stageRef.current.handlePlayerDeath(data.victimId);
      }
    };

    callbacksRef.current.onPhaseCleared = (data: any) => {
      soundManager.playWaveClear();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.3 },
      });
    };

    callbacksRef.current.onPhaseStarted = (data: any) => {
      soundManager.playWaveStart();
    };

    // Frame loop for floating HTML nameplates
    const overlayInterval = setInterval(() => {
      if (stageRef.current) {
        setRemoteOverlays(stageRef.current.getPlayerRigPositions());
      }
    }, 30);

    const handleResize = () => stage.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(overlayInterval);
      window.removeEventListener('resize', handleResize);
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  // Sync player updates and cleanup stale bots
  useEffect(() => {
    if (!stageRef.current) return;
    const activeIds = Object.keys(room.players);
    stageRef.current.cleanupStalePlayers(activeIds);
    (Object.values(room.players) as PlayerState[]).forEach((p) => {
      stageRef.current?.syncPlayer(p);
    });
  }, [room.players]);

  const toggleSound = () => {
    const next = !isMuted;
    soundManager.setMuted(next);
    setIsMuted(next);
  };

  const localHpPct = Math.max(0, Math.min(100, (localPlayer?.hp ?? 100) / (localPlayer?.maxHp ?? 100) * 100));
  const localEnergyPct = Math.max(0, Math.min(100, (localPlayer?.energy ?? 100) / (localPlayer?.maxEnergy ?? 100) * 100));
  const opponentHpPct = opponent ? Math.max(0, Math.min(100, (opponent.hp / opponent.maxHp) * 100)) : 0;

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* 3D Canvas Viewport */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 3D Opponent Overlays in World Space */}
      {remoteOverlays.map((ov) => {
        if (!ov.visible) return null;
        const hpPct = Math.max(0, Math.min(100, (ov.hp / ov.maxHp) * 100));
        return (
          <div
            key={ov.id}
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1"
            style={{ left: `${ov.x}px`, top: `${ov.y}px` }}
          >
            <div className="flex items-center gap-1">
              {ov.isPrimaryAttacker && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/50">
                  ⚡ ATACANDO
                </span>
              )}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold text-white border shadow-md ${
                  ov.isPrimaryAttacker
                    ? 'bg-rose-950/90 border-rose-500/80'
                    : 'bg-slate-950/80 border-slate-700/80'
                }`}
              >
                {ov.name}
              </span>
            </div>
            <div className="w-24 h-2 bg-slate-900/90 rounded-full border border-slate-700 overflow-hidden shadow-md">
              <div
                className={`h-full transition-all duration-200 ${
                  ov.isPrimaryAttacker
                    ? 'bg-gradient-to-r from-amber-400 to-rose-600'
                    : 'bg-gradient-to-r from-red-500 to-rose-600'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Dynamic Phase Banner for Battle Royale transitions */}
      {room.phaseBanner && Date.now() < (room.phaseBanner.until || 0) && (
        <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none z-20 animate-fade-in">
          <div
            className={`px-6 py-3 rounded-2xl backdrop-blur-md shadow-2xl border flex flex-col items-center gap-1 ${
              room.phaseBanner.type === 'phase_cleared'
                ? 'bg-emerald-950/85 border-emerald-500/60 text-emerald-200'
                : room.phaseBanner.type === 'victory'
                ? 'bg-amber-950/85 border-amber-500/60 text-amber-200'
                : 'bg-slate-900/90 border-cyan-500/60 text-cyan-200'
            }`}
          >
            <span className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Swords className="w-4 h-4 text-cyan-400" />
              {room.phaseBanner.title}
            </span>
            <span className="text-[11px] md:text-xs text-slate-300 font-medium">
              {room.phaseBanner.subtitle}
            </span>
          </div>
        </div>
      )}

      {/* Top HUD: Life Bars & Energy */}
      <div className="absolute top-4 inset-x-0 px-6 flex items-start justify-between pointer-events-none z-10">
        {/* Local Player HUD */}
        <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800 pointer-events-auto min-w-[270px] max-w-[360px]">
          <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400 font-bold text-lg shadow-inner">
            {localPlayer?.name ? localPlayer.name.charAt(0).toUpperCase() : 'P'}
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white tracking-wide">{localPlayer?.name || 'Você'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  Nv. {localPlayer?.level || 1}
                </span>
              </div>
              <span className="text-[11px] font-mono text-cyan-300">{localPlayer?.hp} / {localPlayer?.maxHp} HP</span>
            </div>

            {/* Health Bar */}
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  localHpPct > 40 ? 'bg-emerald-500' : localHpPct > 20 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${localHpPct}%` }}
              />
            </div>

            {/* Energy Bar */}
            <div className="flex items-center gap-2">
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800 flex-1">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${localEnergyPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-purple-400 flex items-center gap-0.5">
                <Zap className="w-3 h-3" />
                {localEnergyPct >= 40 ? 'ESPECIAL' : `${Math.round(localEnergyPct)}%`}
              </span>
            </div>

            {/* Sub-info: Character & Seal */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>{localPlayer?.customGlbName ? `GLB: ${localPlayer.customGlbName}` : localPreset.name}</span>
              {localPlayer?.equippedSealTitle ? (
                <span className="text-amber-300 font-medium truncate max-w-[140px] flex items-center gap-1">
                  <Award className="w-3 h-3 text-amber-400" />
                  {localPlayer.equippedSealTitle}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Center: Match Header & Network Status */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="px-4 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 flex items-center gap-2.5 shadow-lg">
            <ArenaLogo variant="mark" size="xs" colorTheme="cyan" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              3D ARENA <span className="text-cyan-400">COMBAT</span>
            </span>
            {room.difficultyTier && !isBattleRoyale && (
              <>
                <div className="h-3 w-px bg-slate-800" />
                <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Tier {room.difficultyTier}
                </span>
              </>
            )}
            {isBattleRoyale && (
              <>
                <div className="h-3 w-px bg-slate-800" />
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  Battle Royale
                </span>
              </>
            )}
            <div className="h-3 w-px bg-slate-800" />
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              {ping}ms
            </span>
            <button
              id="btn-toggle-sound"
              onClick={toggleSound}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title={isMuted ? 'Desmutar som' : 'Mutar som'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Opponent HUD (Battle Royale Wave Stats or 1v1 Opponent) */}
        {isBattleRoyale ? (
          <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-rose-900/50 pointer-events-auto min-w-[270px] max-w-[360px] text-right flex-row-reverse">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-950 to-amber-950 border border-rose-600 flex items-center justify-center text-rose-400 font-black text-sm shadow-inner">
              <Swords className="w-6 h-6 text-rose-400" />
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs flex-row-reverse">
                <div className="flex items-center gap-1.5 flex-row-reverse">
                  <span className="font-bold text-white tracking-wide">
                    FASE {room.currentPhase || 1} / {room.maxPhases || 5}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                    {room.phaseEnemiesAlive ?? 0} Vivos
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  {room.totalKills || 0} Kills
                </span>
              </div>

              {/* Wave Alive Progress Bar */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-200 bg-gradient-to-r from-rose-600 to-amber-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((room.phaseEnemiesAlive || 0) / Math.max(1, room.phaseEnemiesTotal || 1)) * 100))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 flex-row-reverse">
                <span className="text-amber-400 font-medium truncate max-w-[170px]">
                  {room.name?.replace('Battle Royale: ', '') || 'Horda'}
                </span>
                <span className="text-rose-400 font-mono">
                  {room.phaseEnemiesAlive === 1 ? '1 Inimigo Restante' : `${room.phaseEnemiesAlive || 0} Inimigos`}
                </span>
              </div>
            </div>
          </div>
        ) : opponent ? (
          <div className="flex items-center gap-4 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-slate-800 pointer-events-auto min-w-[270px] max-w-[360px] text-right flex-row-reverse">
            <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 font-bold text-lg shadow-inner">
              {opponent.name ? opponent.name.charAt(0).toUpperCase() : 'O'}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs flex-row-reverse">
                <div className="flex items-center gap-1.5 flex-row-reverse">
                  <span className="font-bold text-white tracking-wide">{opponent.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                    {room.difficultyTier ? `Tier ${room.difficultyTier}` : `Nv. ${opponent.level || 1}`}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-rose-300">{opponent.hp} / {opponent.maxHp} HP</span>
              </div>

              {/* Health Bar */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    opponentHpPct > 40 ? 'bg-rose-500' : 'bg-rose-600'
                  }`}
                  style={{ width: `${opponentHpPct}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 flex-row-reverse">
                <span>{opponent.customGlbName ? `GLB: ${opponent.customGlbName}` : opponentPreset.name}</span>
                {room.difficultyName && (
                  <span className="text-rose-400 font-semibold">{room.difficultyName}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-[270px]" />
        )}
      </div>

      {/* Bottom Controls Guide Overlay */}
      <div className="absolute bottom-4 left-6 pointer-events-none z-10 hidden sm:block">
        <div className="px-4 py-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Comandos & Movimentos 3D
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Combo x3 • Salto Duplo • Queda Sísmica</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">W</kbd><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">A</kbd><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">S</kbd><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">D</kbd> Mover</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-cyan-300">Espaço</kbd> Salto (x2 Mortal)</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-emerald-300">Q</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-emerald-300">C</kbd> Esquiva / Dash</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-amber-300">J</kbd> Ataque Combo / Queda Sísmica</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300">K</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300">E</kbd> Especial</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-blue-300">Shift</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-blue-300">L</kbd> Escudo</span>
          </div>
        </div>
      </div>

      {/* Action Buttons for Touch / Mobile / Quick Trigger */}
      <div className="absolute bottom-4 right-4 sm:right-6 flex items-center gap-2 z-10 pointer-events-auto">
        <button
          id="btn-trigger-dash"
          onClick={() => stageRef.current?.triggerLocalDash()}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-cyan-600/90 hover:bg-cyan-500 active:scale-95 text-white font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-cyan-600/30 transition-transform"
          title="Esquiva Rápida (Q ou C)"
        >
          <ArenaLogo variant="mark" size="xs" colorTheme="cyan" />
          <span className="text-[9px] sm:text-[10px] uppercase font-black">Dash</span>
        </button>

        <button
          id="btn-trigger-jump"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
          }}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 active:scale-95 text-cyan-300 font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg transition-transform"
          title="Salto / Salto Duplo (Espaço)"
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9px] sm:text-[10px] uppercase font-black">Pulo</span>
        </button>

        <button
          id="btn-trigger-attack"
          onClick={() => stageRef.current?.triggerLocalAttack()}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/90 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-amber-500/30 transition-transform"
          title="Combo de Golpes / Queda no Ar (J)"
        >
          <ArenaLogo variant="mark" size="sm" colorTheme="gold" />
          <span className="text-[9px] sm:text-[10px] uppercase font-black">Golpe</span>
        </button>

        <button
          id="btn-trigger-special"
          disabled={localEnergyPct < 40}
          onClick={() => stageRef.current?.triggerLocalSpecial()}
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-lg transition-transform active:scale-95 ${
            localEnergyPct >= 40
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/40 animate-pulse'
              : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
          title="Habilidade Especial (K)"
        >
          <ArenaLogo variant="mark" size="sm" colorTheme="purple" />
          <span className="text-[9px] sm:text-[10px] uppercase font-black">Especial</span>
        </button>
      </div>

      {/* Game Over Modal Overlay with Battle Progression & Seal Milestone Feedback */}
      {isGameOver && (() => {
        const currentProgress = matchOutcomeData?.progress || loadBattleProgress();
        const playerBuffs = computePlayerBuffs(currentProgress);
        const nextSealProg = getNextSealProgress(currentProgress.wins);
        const nextDiff = getDifficultyTier(currentProgress.wins);
        const newlyUnlocked = matchOutcomeData?.newlyUnlockedSeal;

        const handleRematchClick = () => {
          soundManager.playClick();
          onRematch({
            playerWins: currentProgress.wins,
            level: playerBuffs.activeLevel,
            bonusHp: playerBuffs.totalMaxHpBonus,
            attackMultiplier: 1 + playerBuffs.totalAttackBonusPct / 100,
            blockDefenseBonusPct: playerBuffs.totalBlockDefenseBonusPct,
            equippedSealTitle: playerBuffs.equippedSeal?.title,
            equippedSealRarity: playerBuffs.equippedSeal?.rarity,
          });
        };

        return (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in overflow-y-auto">
            <div className="max-w-lg w-full p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center flex flex-col items-center space-y-4 my-auto">
              {/* Victory / Defeat Badge */}
              <div
                className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-xl ${
                  isWinner
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {isWinner ? '👑' : '💀'}
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {isBattleRoyale
                    ? isWinner
                      ? 'VITÓRIA REAL SUPREMA!'
                      : 'FIM DA SOBREVIVÊNCIA'
                    : isWinner
                    ? 'VITÓRIA GLORIOSA!'
                    : 'DERROTA EM COMBATE'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {isBattleRoyale
                    ? isWinner
                      ? 'Incrível! Você sobreviveu a todas as 5 fases da horda e derrotou todos os inimigos!'
                      : `Você sobreviveu até a Fase ${room.currentPhase || 1} e conseguiu ${room.totalKills || 0} eliminações na Arena.`
                    : isWinner
                    ? 'Excelente performance! Sua vitória foi registrada na sua trajetória de guerreiro.'
                    : 'Não desanime! Analise o padrão de ataque do oponente e lute novamente.'}
                </p>
              </div>

              {/* Newly Unlocked Seal Spotlight (Every 4 wins) */}
              {newlyUnlocked && (
                <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400/80 text-left space-y-2 shadow-xl shadow-amber-500/20 animate-pulse">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-400" />
                      Novo Selo & Emblema Desbloqueado!
                    </span>
                    <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                      {newlyUnlocked.rarity}
                    </span>
                  </div>

                  <div className="text-sm font-black text-white">
                    {newlyUnlocked.title}
                  </div>
                  <p className="text-xs text-amber-200/90 leading-snug">
                    {newlyUnlocked.description}
                  </p>
                  <div className="text-[11px] text-amber-300 font-semibold pt-1 border-t border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Equipado automaticamente (+25% de amplificação no poder)!
                  </div>
                </div>
              )}

              {/* Progression & Stats Overview Card */}
              <div className="w-full p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {isBattleRoyale ? (
                    <>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Fase
                        </span>
                        <span className="text-base font-black text-cyan-400 flex items-center justify-center gap-1">
                          <Swords className="w-3.5 h-3.5 text-cyan-300" />
                          {room.currentPhase || 1}/{room.maxPhases || 5}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Kills
                        </span>
                        <span className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-500" />
                          {room.totalKills || 0}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Vitórias
                        </span>
                        <span className="text-base font-black text-emerald-400 flex items-center justify-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          {currentProgress.wins}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Nível
                        </span>
                        <span className="text-base font-black text-cyan-400 flex items-center justify-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                          Nv. {playerBuffs.activeLevel}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Vitórias
                        </span>
                        <span className="text-base font-black text-emerald-400 flex items-center justify-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          {currentProgress.wins} {isWinner && <span className="text-xs text-emerald-300">(+1)</span>}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Sequência
                        </span>
                        <span className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-rose-400" />
                          {currentProgress.winStreak}x
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Next Seal Milestone Tracker */}
                <div className="space-y-1.5 pt-1 text-left">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Meta para o próximo Selo:</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {nextSealProg.currentInCycle}/4 Vitórias
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-amber-500/40"
                      style={{ width: `${nextSealProg.pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span className="truncate max-w-[220px]">Próximo: {nextSealProg.nextSeal.title}</span>
                    <span className="text-amber-400 font-semibold">
                      Falta(m) {4 - nextSealProg.currentInCycle} vitória(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Difficulty Escalation Alert for Practice Mode */}
              {!isBattleRoyale && (
                <div className="w-full p-3 rounded-2xl bg-rose-950/30 border border-rose-800/60 text-left text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                      Dificuldade da Próxima Batalha:
                    </span>
                    <span className="text-rose-400 font-bold">{nextDiff.title.split(':')[0]}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Conforme suas vitórias aumentam, a IA escala: {nextDiff.botName} terá{' '}
                    <strong className="text-emerald-400">{nextDiff.botHp} HP</strong> e{' '}
                    <strong className="text-rose-400">{nextDiff.botAttackDmg} de dano</strong>.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="w-full flex items-center justify-center gap-3 pt-2">
                <button
                  id="btn-match-rematch"
                  onClick={handleRematchClick}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <ArenaLogo variant="mark" size="sm" colorTheme="cyan" />
                  {isBattleRoyale ? 'Jogar Battle Royale Novamente' : `Revanche (${nextDiff.title.split(':')[0]})`}
                </button>

                <button
                  id="btn-match-return-lobby"
                  onClick={() => {
                    soundManager.playClick();
                    onExitToLobby();
                  }}
                  className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <ArenaLogo variant="mark" size="xs" colorTheme="cyan" /> Lobby
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
