import React, { useState } from 'react';
import { Copy, Check, Swords, Shield, Send, Users, LogOut, Sparkles, AlertCircle } from 'lucide-react';
import { CharacterId, ChatMsg, PlayerState, RoomInfo } from '../types';
import { CHARACTER_PRESETS } from '../game/characterPresets';
import { soundManager } from '../game/sound';
import { ArenaLogo } from './ArenaLogo';

interface LobbyViewProps {
  room: RoomInfo;
  localPlayerId: string;
  chatMessages: ChatMsg[];
  countdown: number | null;
  onSelectCharacterClick: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onSendChat: (text: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  localPlayerId,
  chatMessages,
  countdown,
  onSelectCharacterClick,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
  onSendChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  const localPlayer = room.players[localPlayerId];
  const isHost = localPlayer?.isHost;
  const playersList: PlayerState[] = Object.values(room.players);
  const isReady = localPlayer?.isReady;

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    soundManager.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const allPlayersReady = playersList.length >= 2 && playersList.every((p) => p.isReady || p.isHost);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
            Preparando a Arena de Batalha
          </span>
          <div className="text-8xl font-black text-white drop-shadow-[0_0_35px_rgba(6,182,212,0.8)] animate-bounce">
            {countdown}
          </div>
          <p className="text-sm text-slate-400 mt-4">Sincronizando modelos 3D e estados de combate...</p>
        </div>
      )}

      {/* Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20 p-1">
            <img
              src="/arena-logo.svg"
              alt="Arena Logo"
              referrerPolicy="no-referrer"
              className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight font-mono">{room.name}</h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-md">
                Lobby Multiplayer
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              Arena: <span className="text-slate-300 font-medium capitalize">Coliseu Neon</span> • {playersList.length}/{room.maxPlayers} Jogadores
            </p>
          </div>
        </div>

        {/* Room ID with Copy */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400">Código da Sala:</span>
            <span className="font-mono font-bold text-xs text-cyan-300">{room.id}</span>
            <button
              id="btn-copy-room-id"
              onClick={handleCopyRoomId}
              className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              title="Copiar código da sala"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            id="btn-leave-room"
            onClick={() => {
              soundManager.playClick();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Main Grid: Slots & Chat */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left: Player Slots */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" /> Lutadores Conectados
              </h2>
              <span className="text-xs text-slate-400">
                {playersList.length === 1 ? 'Aguardando oponente entrar...' : 'Prontos para combate!'}
              </span>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Slot 1: Host */}
              {playersList[0] && (
                <PlayerCard
                  player={playersList[0]}
                  isCurrentLocal={playersList[0].id === localPlayerId}
                />
              )}

              {/* Slot 2: Challenger or Empty */}
              {playersList[1] ? (
                <PlayerCard
                  player={playersList[1]}
                  isCurrentLocal={playersList[1].id === localPlayerId}
                />
              ) : (
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-900/20">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3 animate-pulse">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-300">Aguardando Desafiante</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                    Compartilhe o código <strong className="text-cyan-400 font-mono">{room.id}</strong> para um amigo entrar!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lobby Action Controls Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btn-open-character-select"
                onClick={() => {
                  soundManager.playClick();
                  onSelectCharacterClick();
                }}
                className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center gap-2"
              >
                <ArenaLogo variant="mark" size="xs" colorTheme="cyan" />
                Trocar Personagem / GLB
              </button>

              <button
                id="btn-toggle-ready"
                onClick={() => {
                  soundManager.playClick();
                  onToggleReady();
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <ArenaLogo variant="mark" size="xs" colorTheme={isReady ? 'emerald' : 'cyan'} />
                {isReady ? 'Estou Pronto!' : 'Marcar Pronto'}
              </button>
            </div>

            {isHost ? (
              <button
                id="btn-start-game-host"
                disabled={!allPlayersReady}
                onClick={() => {
                  soundManager.playClick();
                  onStartGame();
                }}
                className={`px-6 py-2.5 text-xs font-bold tracking-wider uppercase rounded-xl transition-all flex items-center gap-2 ${
                  allPlayersReady
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                <ArenaLogo variant="mark" size="sm" colorTheme="cyan" />
                Iniciar Batalha
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Aguardando o anfitrião iniciar a partida...
              </span>
            )}
          </div>
        </div>

        {/* Right: Room Chat */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Chat da Sala em Tempo Real
            </h3>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-center">
                Envie uma mensagem para os participantes da sala!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMine = msg.senderId === localPlayerId;
                return (
                  <div
                    key={msg.id || msg.time}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-0.5">
                      {isMine ? 'Você' : msg.senderName}
                    </span>
                    <div
                      className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                        isMine
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-800 bg-slate-900/80 flex gap-2">
            <input
              id="input-chat-lobby"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              maxLength={100}
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              id="btn-send-chat"
              type="submit"
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

function PlayerCard({ player, isCurrentLocal }: { player: any; isCurrentLocal: boolean }) {
  const preset = CHARACTER_PRESETS.find((c) => c.id === player.characterId) || CHARACTER_PRESETS[0];

  return (
    <div
      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
        isCurrentLocal
          ? 'bg-slate-900/90 border-cyan-500/50 shadow-lg shadow-cyan-950/40'
          : 'bg-slate-900/60 border-slate-800'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{player.name}</span>
            {isCurrentLocal && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 rounded">
                Você
              </span>
            )}
            {player.isHost && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 rounded">
                Host
              </span>
            )}
          </div>

          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full flex items-center gap-1 ${
              player.isReady
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {player.isReady ? '✓ Pronto' : 'Preparando'}
          </span>
        </div>

        {/* Character Info Box */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
            {preset.title}
          </span>
          <h5 className="font-bold text-sm text-white">
            {player.customGlbName ? `GLB: ${player.customGlbName}` : preset.name}
          </h5>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
            Arma: {preset.weaponName}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <span>HP: {preset.stats.hp}</span>
        <span>ATK: {preset.stats.attack}</span>
        <span>DEF: {preset.stats.defense}</span>
      </div>
    </div>
  );
}
