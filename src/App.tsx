import React, { useState } from 'react';
import { CharacterId } from './types';
import { useGameSocket } from './game/useGameSocket';
import { HomeLobbyBrowser } from './components/HomeLobbyBrowser';
import { LobbyView } from './components/LobbyView';
import { BattleView } from './components/BattleView';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { loadBattleProgress, computePlayerBuffs } from './game/battleProgress';

export default function App() {
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('arena_player_name') || `Guerreiro-${Math.floor(100 + Math.random() * 900)}`;
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>(() => {
    return (localStorage.getItem('arena_character_id') as CharacterId) || 'cyber_samurai';
  });

  const [customGlbName, setCustomGlbName] = useState<string | undefined>();
  const [isCharacterSelectModalOpen, setIsCharacterSelectModalOpen] = useState(false);

  const {
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
  } = useGameSocket();

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('arena_player_name', name);
  };

  const handleSelectCharacter = (id: CharacterId, customName?: string) => {
    setSelectedCharacterId(id);
    setCustomGlbName(customName);
    localStorage.setItem('arena_character_id', id);
    if (currentRoom) {
      selectCharacter(id, customName);
    }
  };

  const handleStartPractice = () => {
    const progress = loadBattleProgress();
    const buffs = computePlayerBuffs(progress);
    startPractice(playerName, selectedCharacterId, customGlbName, {
      playerWins: progress.wins,
      level: buffs.activeLevel,
      bonusHp: buffs.totalMaxHpBonus,
      attackMultiplier: 1 + buffs.totalAttackBonusPct / 100,
      blockDefenseBonusPct: buffs.totalBlockDefenseBonusPct,
      equippedSealTitle: buffs.equippedSeal?.title,
      equippedSealRarity: buffs.equippedSeal?.rarity,
    });
  };

  const handleStartBattleRoyale = () => {
    const progress = loadBattleProgress();
    const buffs = computePlayerBuffs(progress);
    startBattleRoyale(playerName, selectedCharacterId, customGlbName, {
      playerWins: progress.wins,
      level: buffs.activeLevel,
      bonusHp: buffs.totalMaxHpBonus,
      attackMultiplier: 1 + buffs.totalAttackBonusPct / 100,
      blockDefenseBonusPct: buffs.totalBlockDefenseBonusPct,
      equippedSealTitle: buffs.equippedSeal?.title,
      equippedSealRarity: buffs.equippedSeal?.rarity,
    });
  };

  const handleCreateRoom = (roomName: string) => {
    createRoom(roomName, playerName, selectedCharacterId, customGlbName);
  };

  const handleJoinRoom = (roomId: string) => {
    joinRoom(roomId, playerName, selectedCharacterId, customGlbName);
  };

  const isInBattle = currentRoom && (currentRoom.status === 'battle' || currentRoom.status === 'ended');
  const isInLobby = currentRoom && (currentRoom.status === 'lobby' || currentRoom.status === 'countdown');

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 font-sans select-none overflow-hidden">
      {/* Global Error Banner if any */}
      {errorMsg && (
        <div className="bg-rose-600 text-white text-xs py-1.5 px-4 text-center font-bold z-50 animate-fade-in flex items-center justify-center gap-2">
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main View Router */}
      {isInBattle ? (
        <BattleView
          room={currentRoom}
          localPlayerId={localPlayerId}
          ping={ping}
          callbacksRef={callbacksRef}
          onSendPlayerInput={sendPlayerInput}
          onSendPlayerAttack={sendPlayerAttack}
          onSendHitAck={sendHitAck}
          onRematch={(extraStats) => sendRematch(extraStats)}
          onExitToLobby={leaveRoom}
        />
      ) : isInLobby ? (
        <LobbyView
          room={currentRoom}
          localPlayerId={localPlayerId}
          chatMessages={chatMessages}
          countdown={countdown}
          onSelectCharacterClick={() => setIsCharacterSelectModalOpen(true)}
          onToggleReady={() => toggleReady()}
          onStartGame={startGame}
          onLeaveRoom={leaveRoom}
          onSendChat={sendChatMessage}
        />
      ) : (
        <HomeLobbyBrowser
          playerName={playerName}
          setPlayerName={handleUpdatePlayerName}
          selectedCharacterId={selectedCharacterId}
          customGlbName={customGlbName}
          onOpenCharacterSelect={() => setIsCharacterSelectModalOpen(true)}
          onStartPractice={handleStartPractice}
          onStartBattleRoyale={handleStartBattleRoyale}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          roomList={roomList}
          onRefreshRooms={refreshRooms}
          isConnected={isConnected}
          ping={ping}
        />
      )}

      {/* Character Selection Modal */}
      {isCharacterSelectModalOpen && (
        <CharacterSelectScreen
          isModal
          selectedId={selectedCharacterId}
          onSelect={handleSelectCharacter}
          onClose={() => setIsCharacterSelectModalOpen(false)}
        />
      )}
    </div>
  );
}
