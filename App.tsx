import React, { useState, useEffect, useRef } from 'react';
import { GameState, PilotProfile, GameStats } from './types';
import { loadPilotProfile, savePilotProfile, STARSHIPS } from './utils/storage';
import { sound } from './utils/audio';
import { GameCanvas } from './components/GameCanvas';
import { HangarLab } from './components/HangarLab';
import { PilotModal } from './components/PilotModal';
import { GameOverModal } from './components/GameOverModal';
import { ControlsModal } from './components/ControlsModal';
import { AutoSaveToast, AutoSaveNotification } from './components/AutoSaveToast';
import {
  Play,
  Wrench,
  User,
  Volume2,
  VolumeX,
  Music,
  Shield,
  Zap,
  RotateCcw,
  Sparkles,
  Sliders,
  Mouse,
  Smartphone,
} from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [pilot, setPilot] = useState<PilotProfile>(loadPilotProfile);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showDossier, setShowDossier] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [lastStats, setLastStats] = useState<GameStats | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [autoSaveNotification, setAutoSaveNotification] = useState<AutoSaveNotification | null>(null);

  const isMountedRef = useRef<boolean>(false);
  const prevPilotRef = useRef<PilotProfile>(pilot);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutoSaveToast = (notif: AutoSaveNotification) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setAutoSaveNotification(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setAutoSaveNotification(null);
    }, 2800);
  };

  // Sync profile to localStorage on changes & display subtle corner auto-save indicator
  useEffect(() => {
    savePilotProfile(pilot);
    sound.setMuted(!pilot.soundEnabled);
    if (pilot.musicEnabled && gameState === 'playing') {
      sound.startCyberBgm();
    } else {
      sound.stopCyberBgm();
    }

    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevPilotRef.current = pilot;
      return;
    }

    const prev = prevPilotRef.current;

    // Check if upgrades level changed (after an upgrade)
    const prevUpgradesCount = Object.values(prev.upgrades || {}).reduce<number>(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
    const currentUpgradesCount = Object.values(pilot.upgrades || {}).reduce<number>(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
    const upgraded = currentUpgradesCount > prevUpgradesCount;

    // Check if missions completed (after a mission)
    const missionCompleted = pilot.missionsFlown > prev.missionsFlown;

    // Check if new hull purchased/unlocked
    const shipUnlocked = pilot.unlockedShipIds.length > prev.unlockedShipIds.length;

    // Check if active ship swapped
    const shipSwapped = pilot.selectedShipId !== prev.selectedShipId;

    // Check if flight controls calibrated
    const controlsUpdated = pilot.controls !== prev.controls;

    // Check if callsign updated
    const callsignUpdated = pilot.callsign !== prev.callsign;

    if (upgraded) {
      triggerAutoSaveToast({
        id: Date.now(),
        title: 'UPGRADE SAVED',
        detail: 'Systems boosted & synchronized to drive',
        type: 'upgrade',
      });
    } else if (missionCompleted) {
      const earnedCredits = pilot.credits - prev.credits;
      triggerAutoSaveToast({
        id: Date.now(),
        title: 'MISSION TELEMETRY SAVED',
        detail: `Combat record secured • +${Math.max(0, earnedCredits).toLocaleString()} CR`,
        type: 'mission',
      });
    } else if (shipUnlocked) {
      triggerAutoSaveToast({
        id: Date.now(),
        title: 'STARSHIP ACQUIRED',
        detail: 'New starfighter registered in hangar database',
        type: 'vessel',
      });
    } else if (shipSwapped) {
      const activeShip = STARSHIPS.find((s) => s.id === pilot.selectedShipId);
      triggerAutoSaveToast({
        id: Date.now(),
        title: 'VESSEL READY',
        detail: `${activeShip?.name || 'Starfighter'} set as active combat ship`,
        type: 'vessel',
      });
    } else if (controlsUpdated) {
      triggerAutoSaveToast({
        id: Date.now(),
        title: 'CONTROLS SAVED',
        detail: 'Flight calibration synchronized',
        type: 'sync',
      });
    } else if (callsignUpdated) {
      triggerAutoSaveToast({
        id: Date.now(),
        title: 'DOSSIER UPDATED',
        detail: `Pilot callsign saved as "${pilot.callsign}"`,
        type: 'sync',
      });
    }

    prevPilotRef.current = pilot;
  }, [pilot, gameState]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleUpdateProfile = (updated: PilotProfile) => {
    setPilot(updated);
  };

  const handleStartMission = () => {
    sound.playLaser('player');
    setIsPaused(false);
    setGameState('playing');
    if (pilot.musicEnabled) {
      sound.startCyberBgm();
    }
  };

  const handleGameOver = (stats: GameStats) => {
    sound.stopCyberBgm();
    const isRecord = stats.score > pilot.highScore;
    setIsNewRecord(isRecord);
    setLastStats(stats);

    // Update pilot career metrics
    const updatedPilot: PilotProfile = {
      ...pilot,
      credits: pilot.credits + stats.creditsEarned,
      highScore: Math.max(pilot.highScore, stats.score),
      totalKills: pilot.totalKills + stats.enemiesDestroyed,
      missionsFlown: pilot.missionsFlown + 1,
    };
    setPilot(updatedPilot);
    setGameState('gameover');
  };

  const handleLiveCreditReward = (credits: number) => {
    setPilot((prev) => ({
      ...prev,
      credits: prev.credits + credits,
    }));
  };

  const currentShip = STARSHIPS.find((s) => s.id === pilot.selectedShipId) || STARSHIPS[0];

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#05070f] text-[#e2f1ff] flex flex-col font-sans select-none relative">
      {/* 1. MAIN MENU SCREEN */}
      {gameState === 'menu' && (
        <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 overflow-y-auto">
          {/* Ambient Cyber Grid & Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(#172554_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Bar with Pilot Card & Audio Settings */}
          <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between">
            {/* Version & Status */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono tracking-widest text-cyan-400 font-semibold uppercase">
                DEFENSE GRID • SYS ONLINE v3.0
              </span>
              <span className="hidden md:inline px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300">
                TOUCH & MOUSE ENABLED
              </span>
            </div>

            {/* Pilot Profile Chip & Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Controls Customization Shortcut */}
              <button
                id="menu-controls-btn"
                onClick={() => {
                  sound.playPickup('credit');
                  setShowControls(true);
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-400 text-zinc-200 hover:text-cyan-300 transition text-xs font-semibold shadow-sm"
                title="Calibrate Controls (v3.0 PC & Mobile)"
              >
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">CONTROLS (v3.0)</span>
              </button>

              <button
                id="menu-pilot-btn"
                onClick={() => {
                  sound.playPickup('credit');
                  setShowDossier(true);
                }}
                className="flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-400 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-display font-bold text-xs text-white">
                    {pilot.callsign}
                  </div>
                  <div className="text-[10px] text-amber-400 font-mono">
                    ⚡ {pilot.credits.toLocaleString()} CR
                  </div>
                </div>
              </button>

              {/* Sound Toggle */}
              <button
                id="menu-sound-toggle-btn"
                onClick={() => {
                  const next = !pilot.soundEnabled;
                  sound.setMuted(!next);
                  setPilot({ ...pilot, soundEnabled: next });
                  if (next) sound.playPickup('credit');
                }}
                className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 hover:border-zinc-500 text-zinc-300 transition"
                title={pilot.soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
              >
                {pilot.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-zinc-500" />
                )}
              </button>

              {/* Music Toggle */}
              <button
                id="menu-music-toggle-btn"
                onClick={() => {
                  const next = !pilot.musicEnabled;
                  if (next) sound.startCyberBgm();
                  else sound.stopCyberBgm();
                  setPilot({ ...pilot, musicEnabled: next });
                }}
                className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700 hover:border-zinc-500 text-zinc-300 transition"
                title={pilot.musicEnabled ? 'Stop Synth BGM' : 'Start Synth BGM'}
              >
                <Music
                  className={`w-5 h-5 ${
                    pilot.musicEnabled ? 'text-purple-400' : 'text-zinc-500'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Center Hero & Logo */}
          <div className="relative z-10 w-full max-w-4xl mx-auto text-center my-auto py-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Sparkles className="w-3.5 h-3.5" /> ARCADE SCI-FI SHOOTER • v3.0 CYBER EDITION
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-display tracking-tight text-white uppercase drop-shadow-[0_0_30px_rgba(0,240,255,0.6)]">
              CYBER STRIKE
            </h1>
            <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 mt-1 uppercase">
              NEON OVERLOAD v3.0
            </div>

            <p className="max-w-xl mx-auto text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed font-sans">
              Intercept rogue drone swarms, engage dreadnought flagships, salvage cyber credits,
              and customize your flight controls for PC mouse, keyboard, or mobile touch gestures.
            </p>

            {/* Ship Indicator Pill */}
            <div className="inline-flex items-center gap-3 bg-black/60 border border-zinc-800 px-4 py-2 rounded-xl mt-6">
              <span className="text-xs text-zinc-400 font-mono">ACTIVE VESSEL:</span>
              <span className="font-display font-bold text-sm text-cyan-300">
                {currentShip.name}
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                [{currentShip.weaponType.replace('_', ' ').toUpperCase()}]
              </span>
            </div>

            {/* Launch Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button
                id="launch-mission-btn"
                onClick={handleStartMission}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-base tracking-wider flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,240,255,0.5)] active:scale-95 transition"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>LAUNCH SORTIE</span>
              </button>

              <button
                id="open-hangar-btn"
                onClick={() => {
                  sound.playPickup('credit');
                  setGameState('hangar');
                }}
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-400 text-zinc-200 hover:text-amber-300 font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2.5 transition active:scale-95"
              >
                <Wrench className="w-5 h-5" />
                <span>HANGAR & LAB</span>
              </button>

              <button
                id="open-controls-hero-btn"
                onClick={() => {
                  sound.playPickup('credit');
                  setShowControls(true);
                }}
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-400 text-zinc-200 hover:text-cyan-300 font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2.5 transition active:scale-95"
              >
                <Sliders className="w-5 h-5 text-cyan-400" />
                <span>CONTROLS (v3.0)</span>
              </button>
            </div>
          </div>

          {/* Bottom Controls / Flight Manual Card */}
          <div className="relative z-10 w-full max-w-4xl mx-auto bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" /> FLIGHT CONTROLS & TEST BENCH
              </span>
              <button
                id="quick-customize-btn"
                onClick={() => setShowControls(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline font-mono font-semibold"
              >
                Customize Controls & Test Bench →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-cyan-400">
                  WASD
                </div>
                <span className="text-zinc-400">Keys or Mouse</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-cyan-400">
                  TOUCH
                </div>
                <span className="text-zinc-400">Finger / Joystick</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-cyan-400">
                  SHIFT
                </div>
                <span className="text-zinc-400">Warp Dash</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-cyan-400">
                  E / B
                </div>
                <span className="text-zinc-400">EMP Shockwave</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVE COMBAT CANVAS VIEW */}
      {(gameState === 'playing' || gameState === 'paused' || gameState === 'gameover') && (
        <div className="relative w-full h-full">
          <GameCanvas
            pilot={pilot}
            onGameOver={handleGameOver}
            onUpdateCredits={handleLiveCreditReward}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((prev) => !prev)}
            onOpenControls={() => {
              setIsPaused(true);
              setShowControls(true);
            }}
          />

          {/* Tactical Pause Modal Overlay */}
          {isPaused && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-zinc-950 border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
                <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase font-bold">
                  TACTICAL SUSPENSION
                </span>
                <h2 className="text-2xl font-display font-black text-white mt-1">
                  MISSION PAUSED
                </h2>

                <div className="w-full flex flex-col gap-3 mt-6">
                  <button
                    id="resume-btn"
                    onClick={() => {
                      sound.playLaser('player');
                      setIsPaused(false);
                    }}
                    className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-display font-black text-sm tracking-wider transition active:scale-95 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                  >
                    RESUME SORTIE
                  </button>

                  <button
                    id="pause-controls-btn"
                    onClick={() => {
                      sound.playPickup('credit');
                      setShowControls(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-cyan-400 text-zinc-300 hover:text-cyan-300 font-display font-bold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    CALIBRATE CONTROLS (v3.0)
                  </button>

                  <button
                    id="pause-hangar-btn"
                    onClick={() => {
                      sound.playPickup('credit');
                      setIsPaused(false);
                      setGameState('hangar');
                    }}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-300 font-display font-bold text-xs transition"
                  >
                    UPGRADES LAB
                  </button>

                  <button
                    id="abort-mission-btn"
                    onClick={() => {
                      sound.playPickup('credit');
                      setIsPaused(false);
                      setGameState('menu');
                    }}
                    className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500 text-zinc-400 hover:text-rose-400 font-display font-bold text-xs transition"
                  >
                    ABORT MISSION TO MENU
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game Over Debriefing Modal */}
          {gameState === 'gameover' && lastStats && (
            <GameOverModal
              stats={lastStats}
              pilot={pilot}
              isNewHighScore={isNewRecord}
              onRestart={handleStartMission}
              onGoToHangar={() => setGameState('hangar')}
              onGoToMenu={() => setGameState('menu')}
            />
          )}
        </div>
      )}

      {/* 3. STARSHIP HANGAR & UPGRADES LAB */}
      {gameState === 'hangar' && (
        <HangarLab
          pilot={pilot}
          onUpdateProfile={handleUpdateProfile}
          onBack={() => setGameState('menu')}
          onLaunchMission={handleStartMission}
        />
      )}

      {/* 4. PILOT DOSSIER MODAL */}
      {showDossier && (
        <PilotModal
          pilot={pilot}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowDossier(false)}
        />
      )}

      {/* 5. CONTROLS CUSTOMIZATION MODAL (v3.0) */}
      {showControls && (
        <ControlsModal
          pilot={pilot}
          onUpdateProfile={handleUpdateProfile}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* 6. CORNER AUTO-SAVE TOAST INDICATOR */}
      <AutoSaveToast notification={autoSaveNotification} />
    </div>
  );
}
