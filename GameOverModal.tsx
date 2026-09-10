import React from 'react';
import { GameStats, PilotProfile } from '../types';
import { sound } from '../utils/audio';
import { Award, Zap, Crosshair, Target, RotateCcw, Wrench, Home } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  pilot: PilotProfile;
  isNewHighScore: boolean;
  onRestart: () => void;
  onGoToHangar: () => void;
  onGoToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  pilot,
  isNewHighScore,
  onRestart,
  onGoToHangar,
  onGoToMenu,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg select-none animate-fadeIn">
      <div className="w-full max-w-lg bg-[#080c18] border-2 border-rose-600/60 rounded-2xl shadow-[0_0_50px_rgba(255,0,55,0.25)] overflow-hidden flex flex-col">
        {/* Banner */}
        <div className="bg-gradient-to-b from-rose-950/60 via-rose-950/20 to-transparent p-6 text-center border-b border-rose-900/30">
          <span className="text-xs font-mono tracking-widest text-rose-400 font-bold uppercase">
            COMBAT TELEMETRY LOG
          </span>
          <h1 className="text-3xl sm:text-4xl font-black font-display text-white mt-1 drop-shadow-[0_0_15px_rgba(255,0,60,0.7)]">
            HULL COMPROMISED
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            PILOT EJECTION SUCCESSFUL • TELEMETRY RETRIEVED
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="p-6 flex flex-col gap-5">
          {/* Main Score & New Record Pill */}
          <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800 text-center relative overflow-hidden">
            {isNewHighScore && (
              <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-300 text-black font-black text-[10px] px-2.5 py-0.5 rounded-full font-display uppercase shadow-md animate-bounce">
                NEW RECORD!
              </div>
            )}
            <span className="text-xs font-mono text-zinc-400 uppercase">
              FINAL MISSION SCORE
            </span>
            <div className="text-4xl font-black font-display text-white mt-1 tracking-wider drop-shadow-[0_0_12px_rgba(0,240,255,0.5)]">
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex items-center gap-3">
              <div className="p-2 rounded bg-amber-500/10 text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block">
                  SALVAGED CREDITS
                </span>
                <span className="font-mono font-bold text-base text-amber-300">
                  +{stats.creditsEarned} CR
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex items-center gap-3">
              <div className="p-2 rounded bg-rose-500/10 text-rose-400">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block">
                  HOSTILES CLEARED
                </span>
                <span className="font-mono font-bold text-base text-rose-300">
                  {stats.enemiesDestroyed}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex items-center gap-3">
              <div className="p-2 rounded bg-cyan-500/10 text-cyan-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block">
                  WAVES REACHED
                </span>
                <span className="font-mono font-bold text-base text-cyan-300">
                  WAVE {stats.wave}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 flex items-center gap-3">
              <div className="p-2 rounded bg-purple-500/10 text-purple-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block">
                  FIRING ACCURACY
                </span>
                <span className="font-mono font-bold text-base text-purple-300">
                  {stats.accuracy}%
                </span>
              </div>
            </div>
          </div>

          {/* Current Bank Balance */}
          <div className="text-center text-xs font-mono text-zinc-400">
            TOTAL CYBER WALLET: <span className="text-amber-400 font-bold">⚡ {pilot.credits.toLocaleString()} CR</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-5 border-t border-zinc-800 bg-black/50 flex flex-col sm:flex-row items-center gap-3">
          <button
            id="gameover-restart-btn"
            onClick={() => {
              sound.playLaser('player');
              onRestart();
            }}
            className="w-full flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RE-ENGAGE MISSION</span>
          </button>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <button
              id="gameover-hangar-btn"
              onClick={() => {
                sound.playPickup('credit');
                onGoToHangar();
              }}
              className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-zinc-300 hover:text-amber-300 font-display font-bold text-xs flex items-center justify-center gap-2 transition"
              title="Open Upgrades Lab"
            >
              <Wrench className="w-4 h-4" />
              <span>UPGRADE LAB</span>
            </button>

            <button
              id="gameover-menu-btn"
              onClick={() => {
                sound.playPickup('credit');
                onGoToMenu();
              }}
              className="py-3 px-3 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center transition"
              title="Return to Main Menu"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
