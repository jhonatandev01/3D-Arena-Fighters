import React, { useState } from 'react';
import {
  Award,
  Shield,
  Zap,
  Swords,
  Crown,
  Flame,
  Wind,
  Sparkles,
  Check,
  Lock,
  Trophy,
  X,
  TrendingUp,
  FlameKindling,
  History,
  Info,
} from 'lucide-react';
import {
  BattleProgress,
  CORE_SEALS,
  getAllSealsToDisplay,
  getDifficultyTier,
  getNextSealProgress,
  computePlayerBuffs,
  equipSeal,
  SealBadge,
} from '../game/battleProgress';
import { soundManager } from '../game/sound';
import { ArenaLogo } from './ArenaLogo';

interface SealsSanctuaryModalProps {
  progress: BattleProgress;
  onProgressChange: (updated: BattleProgress) => void;
  onClose: () => void;
}

export const SealsSanctuaryModal: React.FC<SealsSanctuaryModalProps> = ({
  progress,
  onProgressChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'seals' | 'difficulty' | 'history'>('seals');
  const allSeals = getAllSealsToDisplay(progress.wins);
  const buffs = computePlayerBuffs(progress);
  const nextProgress = getNextSealProgress(progress.wins);
  const currentDiff = getDifficultyTier(progress.wins);

  const handleEquip = (sealId: string) => {
    soundManager.playClick();
    const updated = equipSeal(sealId);
    onProgressChange(updated);
  };

  const renderIcon = (name: string, className = 'w-6 h-6') => {
    switch (name) {
      case 'swords':
        return <Swords className={className} />;
      case 'zap':
        return <Zap className={className} />;
      case 'shield':
        return <Shield className={className} />;
      case 'wind':
        return <Wind className={className} />;
      case 'flame':
        return <Flame className={className} />;
      case 'crown':
        return <Crown className={className} />;
      case 'award':
      default:
        return <Award className={className} />;
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'text-amber-300 bg-amber-950/80 border-amber-500/60 shadow-lg shadow-amber-500/20';
      case 'diamond':
        return 'text-cyan-300 bg-cyan-950/80 border-cyan-500/60 shadow-md shadow-cyan-500/20';
      case 'platinum':
        return 'text-indigo-300 bg-indigo-950/80 border-indigo-500/60';
      case 'gold':
        return 'text-yellow-400 bg-yellow-950/80 border-yellow-500/60';
      case 'silver':
        return 'text-slate-200 bg-slate-800 border-slate-600';
      case 'bronze':
      default:
        return 'text-amber-600 bg-amber-950/40 border-amber-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-fade-in">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/25 p-1">
              <img
                src="/arena-logo.svg"
                alt="Arena Seal Emblem"
                referrerPolicy="no-referrer"
                className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight font-mono">
                  SANTUÁRIO DOS <span className="text-amber-400">SELOS & PROGRESSÃO</span>
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                  Nível {buffs.activeLevel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                A cada 4 vitórias, um novo Emblema é desbloqueado concedendo poder e atributos ao seu personagem!
              </p>
            </div>
          </div>

          <button
            id="btn-close-seals-modal"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Stats Overview Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-slate-950/40 border-b border-slate-800/80 text-center">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Vitórias Registradas
            </span>
            <span className="text-xl font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              {progress.wins}
            </span>
            <span className="text-[10px] text-slate-500">
              {progress.losses} derrota(s)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nível do Guerreiro
            </span>
            <span className="text-xl font-black text-cyan-400 flex items-center justify-center gap-1.5 mt-0.5">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              Nv. {buffs.activeLevel}
            </span>
            <span className="text-[10px] text-cyan-500/80">
              +{buffs.totalMaxHpBonus} HP • +{buffs.totalAttackBonusPct}% ATK
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Selo Equipado
            </span>
            <span className="text-sm font-bold text-amber-300 truncate block mt-1">
              {buffs.equippedSeal ? buffs.equippedSeal.title : 'Nenhum'}
            </span>
            <span className="text-[10px] text-amber-400/80">
              {buffs.equippedSeal ? '+25% Bônus de Afinidade' : 'Selecione abaixo'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dificuldade Atual
            </span>
            <span className="text-sm font-bold text-rose-400 truncate block mt-1">
              {currentDiff.title.split(':')[0]}
            </span>
            <span className="text-[10px] text-rose-500/80">
              {currentDiff.threatLevel}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/60 bg-slate-900">
          <button
            id="tab-seals-gallery"
            onClick={() => setActiveTab('seals')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'seals'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            Emblemas & Selos ({progress.unlockedSealIds.length}/{allSeals.length})
          </button>

          <button
            id="tab-difficulty-guide"
            onClick={() => setActiveTab('difficulty')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'difficulty'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Escalonamento de Dificuldade
          </button>

          <button
            id="tab-battle-history"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico ({progress.history.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'seals' && (
            <div className="space-y-6">
              {/* Next Milestone Progress Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center md:justify-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Meta de Desbloqueio de Selo
                  </span>
                  <div className="text-sm font-bold text-white">
                    Próximo: {nextProgress.nextSeal.title} ({nextProgress.totalNeeded} vitórias)
                  </div>
                  <div className="text-xs text-slate-400">
                    Faltam <span className="text-amber-300 font-bold">{4 - nextProgress.currentInCycle} vitória(s)</span> para desbloquear este emblema.
                  </div>
                </div>

                <div className="w-full md:w-64 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>{nextProgress.currentInCycle} / 4 Vitórias</span>
                    <span className="text-amber-300 font-bold">{nextProgress.pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700/60">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300 shadow-md shadow-amber-500/30"
                      style={{ width: `${nextProgress.pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Grid of Seals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSeals.map((seal) => {
                  const isUnlocked = progress.unlockedSealIds.includes(seal.id);
                  const isEquipped = progress.equippedSealId === seal.id;

                  return (
                    <div
                      key={seal.id}
                      className={`p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                        isEquipped
                          ? 'bg-amber-950/20 border-amber-500/70 shadow-lg shadow-amber-500/10'
                          : isUnlocked
                          ? 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                          : 'bg-slate-950/50 border-slate-800/60 opacity-65'
                      }`}
                    >
                      {/* Top Bar of Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white border shadow-inner ${
                              isEquipped
                                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/50'
                                : isUnlocked
                                ? 'bg-slate-800 text-amber-300 border-slate-700'
                                : 'bg-slate-900 text-slate-600 border-slate-800'
                            }`}
                          >
                            {renderIcon(seal.iconName, 'w-6 h-6')}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white">{seal.title}</h3>
                            </div>
                            <span className="text-[11px] text-slate-400 block">{seal.subtitle}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${getRarityBadge(
                            seal.rarity
                          )}`}
                        >
                          {seal.rarity}
                        </span>
                      </div>

                      {/* Lore & Stats */}
                      <div className="my-3 space-y-2">
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {seal.description}
                        </p>
                        <p className="text-[11px] text-slate-400 italic">
                          "{seal.lore}"
                        </p>
                      </div>

                      {/* Power Boost Pills */}
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {seal.powerBonus.attackBonusPct > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold">
                            +{seal.powerBonus.attackBonusPct}% Ataque
                          </span>
                        )}
                        {seal.powerBonus.maxHpBonus > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-bold">
                            +{seal.powerBonus.maxHpBonus} HP
                          </span>
                        )}
                        {seal.powerBonus.speedBonusPct > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-bold">
                            +{seal.powerBonus.speedBonusPct}% Vel.
                          </span>
                        )}
                        {seal.powerBonus.blockDefenseBonusPct > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-300 font-bold">
                            +{seal.powerBonus.blockDefenseBonusPct}% Defesa
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 font-bold">
                          +{seal.levelBonus} Nível
                        </span>
                      </div>

                      {/* Card Action Footer */}
                      <div className="pt-3 mt-2 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                          {isUnlocked ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Desbloqueado ({seal.winsRequired} Vitórias)
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-1">
                              <Lock className="w-3.5 h-3.5" /> Requer {seal.winsRequired} Vitórias ({seal.winsRequired - progress.wins} restantes)
                            </span>
                          )}
                        </span>

                        {isUnlocked ? (
                          isEquipped ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Equipado
                            </span>
                          ) : (
                            <button
                              id={`btn-equip-seal-${seal.id}`}
                              onClick={() => handleEquip(seal.id)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow transition-transform active:scale-95 flex items-center gap-1.5"
                            >
                              <ArenaLogo variant="mark" size="xs" colorTheme="gold" />
                              Equipar Emblema
                            </button>
                          )
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-semibold cursor-not-allowed">
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'difficulty' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center gap-3">
                <Info className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Conforme você acumula vitórias na arena, os oponentes de IA e robôs de combate evoluem dinamicamente: ganham mais vida, velocidade tática, bloqueios reflexivos e poder de ataque devastador.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    tier: 1,
                    name: 'Tier 1: Cyber Cadete',
                    wins: '0 - 3 Vitórias',
                    hp: 115,
                    atk: 16,
                    speed: '1.0x',
                    threat: 'Ameaça Baixa',
                    desc: 'Iniciante na arena. Movimentação previsível e golpes espaçados.',
                  },
                  {
                    tier: 2,
                    name: 'Tier 2: Cyber Guerreiro',
                    wins: '4 - 7 Vitórias',
                    hp: 140,
                    atk: 20,
                    speed: '1.15x',
                    threat: 'Ameaça Moderada',
                    desc: 'Veterano que executa esquivas moderadas e defesas frequentes.',
                  },
                  {
                    tier: 3,
                    name: 'Tier 3: Cyber Executor',
                    wins: '8 - 11 Vitórias',
                    hp: 170,
                    atk: 24,
                    speed: '1.3x',
                    threat: 'Ameaça Elevada',
                    desc: 'Elite com reflexos velozes e ataques especiais recorrentes.',
                  },
                  {
                    tier: 4,
                    name: 'Tier 4: Cyber Titã Alfa',
                    wins: '12 - 15 Vitórias',
                    hp: 205,
                    atk: 29,
                    speed: '1.45x',
                    threat: 'Ameaça Severa',
                    desc: 'Mestre da arena com blindagem pesada e contra-ataques brutais.',
                  },
                  {
                    tier: 5,
                    name: 'Tier 5: Cyber Overlord',
                    wins: '16 - 19 Vitórias',
                    hp: 245,
                    atk: 34,
                    speed: '1.6x',
                    threat: 'Ameaça Crítica',
                    desc: 'Grão-mestre implacável. Utiliza especiais assim que a barra recarrega.',
                  },
                  {
                    tier: 6,
                    name: 'Tier 6+: Soberano Cósmico',
                    wins: '20+ Vitórias',
                    hp: '275+ (Escala contínua)',
                    atk: '38+ (Escala contínua)',
                    speed: '1.8x',
                    threat: 'Ameaça Apocalíptica',
                    desc: 'Divindade da arena que escala poder a cada nova vitória conquistada!',
                  },
                ].map((t) => {
                  const isCurrent = currentDiff.tier === t.tier || (t.tier === 6 && currentDiff.tier >= 6);

                  return (
                    <div
                      key={t.tier}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-rose-950/20 border-rose-500/80 shadow-lg shadow-rose-500/10'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{t.name}</h4>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                              Sua Dificuldade Atual
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-mono font-bold text-slate-400">
                          {t.wins}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1.5">{t.desc}</p>

                      <div className="flex flex-wrap gap-3 mt-3 text-[11px] font-mono text-slate-400">
                        <span>HP: <strong className="text-emerald-400">{t.hp}</strong></span>
                        <span>Dano: <strong className="text-rose-400">{t.atk}</strong></span>
                        <span>Velocidade: <strong className="text-cyan-400">{t.speed}</strong></span>
                        <span>Nível de Ameaça: <strong className="text-amber-400">{t.threat}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {progress.history.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <History className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-400">Nenhuma batalha registrada ainda</p>
                  <p className="text-xs text-slate-500">
                    Jogue uma partida no modo Treino ou Multiplayer para começar seu histórico!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {progress.history.map((h) => (
                    <div
                      key={h.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        h.result === 'win'
                          ? 'bg-emerald-950/20 border-emerald-800/60'
                          : 'bg-rose-950/20 border-rose-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            h.result === 'win'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {h.result === 'win' ? 'VIT' : 'DER'}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white">
                            vs {h.opponentName}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Tier {h.difficultyTier} • {new Date(h.date).toLocaleDateString()} às{' '}
                            {new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold uppercase ${
                          h.result === 'win' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {h.result === 'win' ? '+1 Vitória' : 'Derrota'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Progresso salvo automaticamente no seu perfil.
          </span>

          <button
            id="btn-close-sanctuary"
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
