import React, { useState } from 'react';
import { PilotProfile } from '../types';
import { getRankTitle } from '../utils/storage';
import { sound } from '../utils/audio';
import {
  User,
  Award,
  Crosshair,
  Skull,
  Zap,
  Volume2,
  VolumeX,
  Music,
  X,
  Check,
  Edit2,
} from 'lucide-react';

interface PilotModalProps {
  pilot: PilotProfile;
  onUpdateProfile: (updated: PilotProfile) => void;
  onClose: () => void;
}

export const PilotModal: React.FC<PilotModalProps> = ({
  pilot,
  onUpdateProfile,
  onClose,
}) => {
  const [isEditingCallsign, setIsEditingCallsign] = useState(false);
  const [callsignInput, setCallsignInput] = useState(pilot.callsign);

  const currentRank = getRankTitle(pilot.highScore, pilot.totalKills);

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsignInput.trim()) return;
    sound.playPickup('credit');
    onUpdateProfile({
      ...pilot,
      callsign: callsignInput.trim().toUpperCase(),
    });
    setIsEditingCallsign(false);
  };

  const toggleSound = () => {
    const next = !pilot.soundEnabled;
    sound.setMuted(!next);
    onUpdateProfile({ ...pilot, soundEnabled: next });
    if (next) sound.playPickup('credit');
  };

  const toggleMusic = () => {
    const next = !pilot.musicEnabled;
    if (next) {
      sound.startCyberBgm();
    } else {
      sound.stopCyberBgm();
    }
    onUpdateProfile({ ...pilot, musicEnabled: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-fadeIn">
      <div className="w-full max-w-xl bg-[#090d19] border border-cyan-500/40 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.2)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
                CYBERNETIC COMMAND
              </span>
              <h2 className="text-xl font-black font-display text-white">
                PILOT DOSSIER
              </h2>
            </div>
          </div>

          <button
            id="pilot-modal-close-btn"
            onClick={() => {
              sound.playPickup('credit');
              onClose();
            }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Callsign & Rank Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-zinc-400">CALLSIGN</span>
              {isEditingCallsign ? (
                <form onSubmit={handleSaveCallsign} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={callsignInput}
                    onChange={(e) => setCallsignInput(e.target.value)}
                    maxLength={14}
                    className="bg-black border border-cyan-400 px-2 py-1 rounded text-cyan-300 font-display font-bold text-sm outline-none uppercase"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1 rounded bg-cyan-500 text-black hover:bg-cyan-400"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-display font-black text-xl text-cyan-300 tracking-wider">
                    {pilot.callsign}
                  </span>
                  <button
                    id="edit-callsign-btn"
                    onClick={() => setIsEditingCallsign(true)}
                    className="text-zinc-500 hover:text-cyan-400 p-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono text-zinc-400">ACTIVE RANK</span>
              <div className="flex items-center gap-1.5 text-amber-400 font-display font-bold text-sm mt-0.5">
                <Award className="w-4 h-4" />
                <span>{currentRank}</span>
              </div>
            </div>
          </div>

          {/* Career Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                <Award className="w-3 h-3" /> ALL-TIME RECORD
              </span>
              <span className="text-lg font-mono font-bold text-white mt-1 block">
                {pilot.highScore.toLocaleString()} PTS
              </span>
            </div>

            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                <Crosshair className="w-3 h-3" /> HOSTILES KILLED
              </span>
              <span className="text-lg font-mono font-bold text-white mt-1 block">
                {pilot.totalKills.toLocaleString()}
              </span>
            </div>

            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                <Skull className="w-3 h-3" /> BOSSES DEFEATED
              </span>
              <span className="text-lg font-mono font-bold text-white mt-1 block">
                {pilot.totalBossesDefeated}
              </span>
            </div>

            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <Zap className="w-3 h-3" /> MISSIONS FLOWN
              </span>
              <span className="text-lg font-mono font-bold text-white mt-1 block">
                {pilot.missionsFlown}
              </span>
            </div>

            <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80 col-span-2 sm:col-span-2">
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                ⚡ CURRENT WALLET
              </span>
              <span className="text-lg font-mono font-bold text-amber-300 mt-1 block">
                {pilot.credits.toLocaleString()} CYBER CREDITS
              </span>
            </div>
          </div>

          {/* Audio & Synth Settings */}
          <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800">
            <span className="text-xs font-mono text-zinc-400">AUDIO SYNTHESIS SYSTEM</span>
            <div className="flex items-center gap-4">
              <button
                id="toggle-sound-btn"
                onClick={toggleSound}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-mono text-xs font-bold transition ${
                  pilot.soundEnabled
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                {pilot.soundEnabled ? (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>SFX: ONLINE</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>SFX: MUTED</span>
                  </>
                )}
              </button>

              <button
                id="toggle-music-btn"
                onClick={toggleMusic}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-mono text-xs font-bold transition ${
                  pilot.musicEnabled
                    ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <Music className="w-4 h-4" />
                <span>SYNTH BGM: {pilot.musicEnabled ? 'ACTIVE' : 'OFF'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-black/40 flex justify-end">
          <button
            id="pilot-save-close-btn"
            onClick={() => {
              sound.playPickup('credit');
              onClose();
            }}
            className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-display font-black text-xs tracking-wider transition"
          >
            CONFIRM & RETURN
          </button>
        </div>
      </div>
    </div>
  );
};
