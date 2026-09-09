import React, { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Swords, Heart, Upload, Play, CheckCircle2, Sparkles } from 'lucide-react';
import { CharacterId, CharacterPreset } from '../types';
import { CHARACTER_PRESETS } from '../game/characterPresets';
import { SelectionPreviewStage } from '../game/three/SelectionPreviewStage';
import { storeCustomGlb, setCustomGlbAdjustments, getCustomGlbAdjustments } from '../game/three/modelLoader';
import { soundManager } from '../game/sound';
import { ArenaLogo } from './ArenaLogo';

interface CharacterSelectScreenProps {
  selectedId: CharacterId;
  onSelect: (id: CharacterId, customName?: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  selectedId,
  onSelect,
  onClose,
  isModal = false,
}) => {
  const [activeId, setActiveId] = useState<CharacterId>(selectedId);
  const [customModelName, setCustomModelName] = useState<string>('');
  const [customModelBuffer, setCustomModelBuffer] = useState<ArrayBuffer | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [glbYOffset, setGlbYOffset] = useState<number>(getCustomGlbAdjustments().yOffset);
  const [glbScaleMultiplier, setGlbScaleMultiplier] = useState<number>(getCustomGlbAdjustments().scaleMultiplier);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<SelectionPreviewStage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize 3D preview stage
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const stage = new SelectionPreviewStage(canvasContainerRef.current);
    stageRef.current = stage;

    // Load initial character
    stage.setCharacter(activeId, customModelBuffer);

    const handleResize = () => stage.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      stage.dispose();
      stageRef.current = null;
    };
  }, []);

  // Update 3D preview when activeId, buffer or GLB adjustments change
  useEffect(() => {
    if (stageRef.current) {
      setCustomGlbAdjustments(glbYOffset, glbScaleMultiplier);
      stageRef.current.setCharacter(activeId, customModelBuffer);
    }
  }, [activeId, customModelBuffer, glbYOffset, glbScaleMultiplier]);

  const currentPreset = CHARACTER_PRESETS.find((c) => c.id === activeId) || CHARACTER_PRESETS[0];

  const handleFileUpload = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      setUploadError('Por favor envie um arquivo com extensão .glb ou .gltf');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        storeCustomGlb('custom_glb', buffer);
        setCustomModelBuffer(buffer);
        setCustomModelName(file.name);
        setActiveId('custom_glb');
        setIsUploading(false);
        soundManager.playClick();
      }
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler o arquivo GLB.');
      setIsUploading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = () => {
    soundManager.playClick();
    onSelect(activeId, activeId === 'custom_glb' ? customModelName || 'Custom Model' : undefined);
    if (onClose) onClose();
  };

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 ${isModal ? 'fixed inset-0 z-50 p-4 md:p-8 bg-slate-950/95 backdrop-blur-md' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
            <ArenaLogo variant="mark" size="sm" colorTheme="cyan" />
            SELEÇÃO DE <span className="text-cyan-400">PERSONAGENS 3D</span>
          </h2>
          <p className="text-xs text-slate-400">
            Gire o modelo com o mouse e teste movimentos antes de entrar no combate
          </p>
        </div>

        {isModal && onClose && (
          <button
            id="btn-close-select"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        )}
      </div>

      {/* Main Content: Split 3D Viewport & Info */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left / Center: 3D Turntable Preview */}
        <div className="lg:col-span-7 relative flex flex-col bg-radial from-slate-900 to-slate-950">
          <div
            ref={canvasContainerRef}
            className="w-full flex-1 cursor-grab active:cursor-grabbing relative overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          />

          {/* Turntable Action Testing Floating Toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 shadow-xl">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mr-1">
              Testar Animação:
            </span>
            <button
              id="btn-test-attack"
              onClick={() => {
                soundManager.playAttack();
                stageRef.current?.triggerAction('attack');
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
            >
              <ArenaLogo variant="mark" size="xs" colorTheme="cyan" /> Ataque
            </button>
            <button
              id="btn-test-special"
              onClick={() => {
                soundManager.playSpecial();
                stageRef.current?.triggerAction('special');
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
            >
              <ArenaLogo variant="mark" size="xs" colorTheme="purple" /> Especial
            </button>
            <button
              id="btn-test-block"
              onClick={() => {
                soundManager.playBlock();
                stageRef.current?.triggerAction('block');
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-sky-400" /> Defesa
            </button>
          </div>

          {/* Model Status Badge */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Three.js Real-time Render
            </span>
          </div>
        </div>

        {/* Right Side: Roster & Stats Panel */}
        <div className="lg:col-span-5 flex flex-col p-6 overflow-y-auto border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/40">
          {/* Fighter Roster Buttons */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Guerreiros Disponíveis
              </span>
              <button
                id="btn-trigger-upload-glb"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
              >
                <Upload className="w-3.5 h-3.5" /> Enviar GLB
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {CHARACTER_PRESETS.map((preset) => {
                const isSelected = activeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    id={`btn-select-character-${preset.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      setActiveId(preset.id);
                    }}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-md shadow-cyan-950/50'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-sm text-white">{preset.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <span className="text-xs text-slate-400">{preset.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom GLB Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-3 p-3.5 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
                activeId === 'custom_glb'
                  ? 'border-purple-400 bg-purple-950/30'
                  : 'border-slate-800 hover:border-purple-500/60 bg-slate-950/40'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-purple-300 text-xs font-semibold mb-1">
                <Upload className="w-4 h-4" />
                {customModelName ? `Modelo: ${customModelName}` : 'Arraste ou clique para carregar arquivo .GLB'}
              </div>
              <p className="text-[11px] text-slate-400">
                Suporta qualquer modelo 3D GLTF/GLB com malhas, materiais e animações.
              </p>
            </div>
            {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}

            {/* Custom GLB Grounding & Scale Fine-Tuning Controls */}
            {activeId === 'custom_glb' && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-purple-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Calibragem de Solo e Escala
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGlbYOffset(0);
                      setGlbScaleMultiplier(1.0);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    Resetar
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Ajuste Vertical (Solo / Flutuação):</span>
                    <span className="font-mono text-cyan-400">{glbYOffset > 0 ? `+${glbYOffset.toFixed(2)}` : glbYOffset.toFixed(2)}m</span>
                  </div>
                  <input
                    type="range"
                    min="-0.8"
                    max="0.8"
                    step="0.02"
                    value={glbYOffset}
                    onChange={(e) => setGlbYOffset(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                    <span>Mais baixo</span>
                    <span>Nível 0 (Padrão)</span>
                    <span>Mais alto</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                    <span>Multiplicador de Tamanho:</span>
                    <span className="font-mono text-purple-400">{glbScaleMultiplier.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.8"
                    step="0.05"
                    value={glbScaleMultiplier}
                    onChange={(e) => setGlbScaleMultiplier(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Fighter Profile & Stats */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {currentPreset.title}
                </span>
                <h3 className="text-2xl font-black text-white">{currentPreset.name}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{currentPreset.description}</p>
                <p className="text-xs italic text-slate-400 mt-1.5">"{currentPreset.quote}"</p>
              </div>

              {/* Combat Stats Bars */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-red-400" /> Vitalidade (HP)
                  </span>
                  <span className="font-bold text-white">{currentPreset.stats.hp}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentPreset.stats.hp / 150) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-amber-400" /> Ataque Base
                  </span>
                  <span className="font-bold text-white">{currentPreset.stats.attack}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentPreset.stats.attack / 35) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Defesa
                  </span>
                  <span className="font-bold text-white">{currentPreset.stats.defense}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentPreset.stats.defense / 30) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" /> Velocidade
                  </span>
                  <span className="font-bold text-white">{currentPreset.stats.speed}</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(currentPreset.stats.speed / 16) * 100}%` }}
                  />
                </div>
              </div>

              {/* Special Ability Card */}
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/50">
                <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs mb-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Habilidade Especial: {currentPreset.specialName}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentPreset.specialDescription}
                </p>
              </div>
            </div>

            {/* Selection Confirm Button */}
            <div className="pt-6">
              <button
                id="btn-confirm-character"
                onClick={handleConfirm}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-lg shadow-cyan-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <ArenaLogo variant="mark" size="sm" colorTheme="cyan" />
                Confirmar Guerreiro: {currentPreset.name}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
