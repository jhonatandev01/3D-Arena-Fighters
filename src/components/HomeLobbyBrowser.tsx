import React, { useState } from 'react';
import {
  Swords,
  Users,
  Bot,
  PlusCircle,
  LogIn,
  Sparkles,
  RefreshCw,
  Radio,
  Shield,
  Zap,
  Award,
  Trophy,
  Flame,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { CharacterId, RoomSummary } from '../types';
import { CHARACTER_PRESETS } from '../game/characterPresets';
import { soundManager } from '../game/sound';
import { ArenaLogo } from './ArenaLogo';
import {
  loadBattleProgress,
  computePlayerBuffs,
  computeBoostedStats,
  getDifficultyTier,
  getNextSealProgress,
  BattleProgress,
} from '../game/battleProgress';
import { SealsSanctuaryModal } from './SealsSanctuaryModal';

interface HomeLobbyBrowserProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedCharacterId: CharacterId;
  customGlbName?: string;
  onOpenCharacterSelect: () => void;
  onStartPractice: () => void;
  onStartBattleRoyale: () => void;
  onCreateRoom: (roomName: string) => void;
  onJoinRoom: (roomId: string) => void;
  roomList: RoomSummary[];
  onRefreshRooms: () => void;
  isConnected: boolean;
  ping: number;
}

export const HomeLobbyBrowser: React.FC<HomeLobbyBrowserProps> = ({
  playerName,
  setPlayerName,
  selectedCharacterId,
  customGlbName,
  onOpenCharacterSelect,
  onStartPractice,
  onStartBattleRoyale,
  onCreateRoom,
  onJoinRoom,
  roomList,
  onRefreshRooms,
  isConnected,
  ping,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [isCreatingModal, setIsCreatingModal] = useState(false);
  const [isSealsModalOpen, setIsSealsModalOpen] = useState(false);
  const [battleProgress, setBattleProgress] = useState<BattleProgress>(() => loadBattleProgress());

  const selectedPreset = CHARACTER_PRESETS.find((c) => c.id === selectedCharacterId) || CHARACTER_PRESETS[0];

  const buffs = computePlayerBuffs(battleProgress);
  const boostedStats = computeBoostedStats(selectedPreset, buffs);
  const currentDiff = getDifficultyTier(battleProgress.wins);
  const nextSealProg = getNextSealProgress(battleProgress.wins);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    onCreateRoom(roomNameInput.trim() || `Arena de ${playerName}`);
    setIsCreatingModal(false);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    soundManager.playClick();
    onJoinRoom(joinCodeInput.trim().toUpperCase());
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20 p-1">
              <img
                src="/arena-logo.svg"
                alt="3D Arena Fighters Logo"
                referrerPolicy="no-referrer"
                className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 font-mono">
              3D ARENA <span className="text-cyan-400">FIGHTERS</span>
            </h1>
            <span className="text-[11px] text-cyan-400 font-medium">
              Three.js Real-time Engine & WebSockets
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
            <span className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
              {isConnected ? `Online (${ping}ms)` : 'Conectando...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Battle Progression & Seals Banner with Arena Illustration Backdrop */}
        <section className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/30 border border-amber-500/30 shadow-2xl relative overflow-hidden">
          {/* Arena Background Illustration Banner */}
          <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
            <img
              src="/arena-banner.svg"
              alt="3D Battle Arena Banner"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Player Level & Record */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nível {buffs.activeLevel}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {battleProgress.wins} Vitórias • {battleProgress.losses} Derrotas
                </span>
                {battleProgress.winStreak >= 2 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-400" />
                    {battleProgress.winStreak}x Sequência
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white">
                  Progresso de Batalhas & Emblemas
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Selo Ativo:</span>
                {buffs.equippedSeal ? (
                  <span className="font-bold text-amber-300 flex items-center gap-1.5 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-500/30">
                    <Award className="w-3.5 h-3.5" />
                    {buffs.equippedSeal.title} (+{buffs.equippedSeal.powerBonus.attackBonusPct}% ATK, +{buffs.equippedSeal.powerBonus.maxHpBonus} HP)
                  </span>
                ) : (
                  <span className="text-slate-500 italic">
                    Nenhum (Vença 4 partidas para o 1º Selo)
                  </span>
                )}
              </div>
            </div>

            {/* Center: Next Seal Milestone */}
            <div className="w-full lg:w-72 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Próximo Selo:</span>
                <span className="text-amber-300 font-bold font-mono">
                  {nextSealProg.currentInCycle}/4 Vitórias
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-amber-500/40"
                  style={{ width: `${nextSealProg.pct}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span className="truncate max-w-[170px]">{nextSealProg.nextSeal.title}</span>
                <span className="text-amber-400 font-bold">{4 - nextSealProg.currentInCycle} restante(s)</span>
              </div>
            </div>

            {/* Right: Sanctuary Trigger Button */}
            <div className="flex-shrink-0 w-full lg:w-auto">
              <button
                id="btn-open-seals-modal"
                onClick={() => {
                  soundManager.playClick();
                  setIsSealsModalOpen(true);
                }}
                className="w-full lg:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <ArenaLogo variant="mark" size="sm" colorTheme="gold" />
                Santuário dos Selos
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Player Profile & Active Fighter Section */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-3xl bg-slate-900/50 border border-slate-800">
          <div className="md:col-span-6 space-y-4">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                Perfil do Lutador
              </span>
              <h2 className="text-2xl font-black text-white mt-1">Identificação na Arena</h2>
              <p className="text-xs text-slate-400 mt-1">
                Escolha seu apelido e selecione qualquer personagem 3D ou faça upload do seu arquivo .GLB.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Seu Nome de Jogador:
              </label>
              <input
                id="input-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="Ex: NeoStriker"
                className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Current Fighter Card */}
          <div className="md:col-span-6 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Personagem Atual
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {customGlbName ? `GLB: ${customGlbName}` : selectedPreset.name}
                </h3>
                <span className="text-xs text-slate-400">{selectedPreset.title}</span>
              </div>

              <button
                id="btn-change-character-main"
                onClick={() => {
                  soundManager.playClick();
                  onOpenCharacterSelect();
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 transition-colors flex items-center gap-1.5"
              >
                <ArenaLogo variant="mark" size="xs" colorTheme="cyan" />
                Trocar / Importar GLB
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-800/80 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900">
                <span className="text-slate-400 block text-[10px]">HP</span>
                <span className="font-bold text-white">
                  {boostedStats.hp}
                  {buffs.totalMaxHpBonus > 0 && (
                    <span className="text-[9px] text-emerald-400 font-normal block">
                      +{buffs.totalMaxHpBonus}
                    </span>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900">
                <span className="text-slate-400 block text-[10px]">ATK</span>
                <span className="font-bold text-white">
                  {boostedStats.attack}
                  {buffs.totalAttackBonusPct > 0 && (
                    <span className="text-[9px] text-rose-400 font-normal block">
                      +{buffs.totalAttackBonusPct}%
                    </span>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900">
                <span className="text-slate-400 block text-[10px]">DEF</span>
                <span className="font-bold text-white">
                  {boostedStats.defense}
                  {buffs.totalBlockDefenseBonusPct > 0 && (
                    <span className="text-[9px] text-blue-400 font-normal block">
                      +{Math.round(buffs.totalBlockDefenseBonusPct * 0.5)}
                    </span>
                  )}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900">
                <span className="text-slate-400 block text-[10px]">SPD</span>
                <span className="font-bold text-white">
                  {boostedStats.speed}
                  {buffs.totalSpeedBonusPct > 0 && (
                    <span className="text-[9px] text-cyan-400 font-normal block">
                      +{buffs.totalSpeedBonusPct}%
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Action Game Modes Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Card 1: Battle Royale / Horde Mode (Multi-Enemy Swarm with Phases) */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-rose-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-950 to-amber-950 border border-rose-800/80 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shadow-lg shadow-rose-950/40">
                  <Swords className="w-6 h-6 text-rose-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-950/90 to-amber-950/90 border border-rose-700/80 text-amber-300 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-500" />
                  5 Fases • Swarm
                </span>
              </div>

              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Battle Royale
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Vários oponentes simultâneos! Enquanto o atacante principal ataca rápido, os outros flanqueiam mais devagar.
              </p>

              {/* Horde Info Indicator */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Estrutura de Fases:</span>
                  <span className="font-bold text-amber-300">5 Rodadas Crescentes</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Mecânica de Combate:</span>
                  <span className="text-rose-400 font-semibold">Ataque Alternado</span>
                </div>
              </div>
            </div>

            <button
              id="btn-play-battle-royale"
              onClick={() => {
                soundManager.playClick();
                onStartBattleRoyale();
              }}
              className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
            >
              <ArenaLogo variant="mark" size="sm" colorTheme="gold" /> Iniciar Battle Royale
            </button>
          </div>

          {/* Card 2: Practice vs Bot with dynamic difficulty scaling */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Bot className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-300">
                  {currentDiff.title.split(':')[0]}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">Treino Solo vs Bot</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Jogue instantaneamente contra a IA de combate. A dificuldade escala dinamicamente com seu histórico de vitórias!
              </p>

              {/* Dynamic Difficulty Badge Indicator */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Oponente Atual:</span>
                  <span className="font-bold text-white">{currentDiff.botName}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">HP: {currentDiff.botHp} • Dano: {currentDiff.botAttackDmg}</span>
                  <span className="text-rose-400 font-semibold">{currentDiff.threatLevel}</span>
                </div>
              </div>
            </div>

            <button
              id="btn-play-practice"
              onClick={() => {
                soundManager.playClick();
                onStartPractice();
              }}
              className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2"
            >
              <ArenaLogo variant="mark" size="sm" colorTheme="cyan" /> Jogar Treino Agora
            </button>
          </div>

          {/* Card 2: Create Multiplayer Room */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Criar Sala Multiplayer</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Hospede uma nova partida na rede, escolha a arena e receba um código de acesso exclusivo para desafiar amigos.
              </p>
            </div>

            <button
              id="btn-open-create-room-modal"
              onClick={() => {
                soundManager.playClick();
                setIsCreatingModal(true);
              }}
              className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              <ArenaLogo variant="mark" size="sm" colorTheme="purple" /> Criar Nova Sala
            </button>
          </div>

          {/* Card 3: Join by Code */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                <LogIn className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Entrar com Código</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Digite o código de 4 a 5 dígitos fornecido pelo anfitrião para se conectar diretamente ao lobby.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="mt-6 flex gap-2">
              <input
                id="input-join-code"
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="ARENA-1234"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                id="btn-submit-join-code"
                type="submit"
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <ArenaLogo variant="mark" size="xs" colorTheme="emerald" />
                Entrar
              </button>
            </form>
          </div>
        </section>

        {/* Public Room Browser List */}
        <section className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Salas Multiplayer Ativas
              </h3>
              <p className="text-xs text-slate-400">
                Salas abertas aguardando jogadores na rede
              </p>
            </div>

            <button
              id="btn-refresh-rooms"
              onClick={() => {
                soundManager.playClick();
                onRefreshRooms();
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>

          {roomList.length === 0 ? (
            <div className="py-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center text-slate-500">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs">Nenhuma sala pública disponível no momento.</p>
              <span className="text-[11px] text-slate-600 mt-0.5">
                Crie sua própria sala ou jogue no modo Treino Solo!
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {roomList.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-xs text-white">{r.name}</h4>
                    <p className="text-[11px] text-slate-400">Host: {r.hostName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-cyan-400">{r.id}</span>
                      <span className="text-[10px] text-slate-500">
                        {r.playerCount}/{r.maxPlayers} players
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-join-room-${r.id}`}
                    disabled={r.playerCount >= r.maxPlayers}
                    onClick={() => {
                      soundManager.playClick();
                      onJoinRoom(r.id);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                      r.playerCount >= r.maxPlayers
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
                    }`}
                  >
                    <ArenaLogo variant="mark" size="xs" colorTheme={r.playerCount >= r.maxPlayers ? 'cyan' : 'cyan'} />
                    {r.playerCount >= r.maxPlayers ? 'Cheia' : 'Entrar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal: Create Room */}
      {isCreatingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArenaLogo variant="mark" size="sm" colorTheme="purple" />
              Criar Nova Sala Multiplayer
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome da Sala:
                </label>
                <input
                  id="input-create-room-name"
                  type="text"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  placeholder={`Arena de ${playerName}`}
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-create-room"
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5"
                >
                  <ArenaLogo variant="mark" size="xs" colorTheme="purple" />
                  Criar Sala
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Seals & Emblems Sanctuary Modal */}
      {isSealsModalOpen && (
        <SealsSanctuaryModal
          progress={battleProgress}
          onProgressChange={(updated) => setBattleProgress(updated)}
          onClose={() => setIsSealsModalOpen(false)}
        />
      )}
    </div>
  );
};
