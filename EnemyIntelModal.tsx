import React, { useState } from 'react';
import { SECTOR_LEVELS, ENEMY_BESTIARY, BestiaryEntry } from '../utils/levels';
import { sound } from '../utils/audio';
import {
  Skull,
  Shield,
  Zap,
  AlertTriangle,
  Eye,
  Crosshair,
  X,
  Target,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';

interface EnemyIntelModalProps {
  currentLevelReached?: number;
  onClose: () => void;
}

export const EnemyIntelModal: React.FC<EnemyIntelModalProps> = ({
  currentLevelReached = 1,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'mobs' | 'bosses' | 'sectors'>('mobs');
  const [selectedMob, setSelectedMob] = useState<BestiaryEntry>(ENEMY_BESTIARY[0]);
  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number>(0);

  const activeSector = SECTOR_LEVELS[selectedSectorIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#080c16] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-cyan-950/50 via-zinc-950 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Skull className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                TACTICAL RECON DATABASE • SYS INTEL
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-wide">
                HOSTILE BESTIARY & BOSS ARCHIVE
              </h2>
            </div>
          </div>

          <button
            id="enemy-intel-close-btn"
            onClick={() => {
              sound.playPickup('credit');
              onClose();
            }}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => {
              sound.playPickup('credit');
              setActiveTab('mobs');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition flex items-center gap-2 ${
              activeTab === 'mobs'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            HOSTILE MOBS ({ENEMY_BESTIARY.length})
          </button>
          <button
            onClick={() => {
              sound.playPickup('credit');
              setActiveTab('bosses');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition flex items-center gap-2 ${
              activeTab === 'bosses'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Skull className="w-3.5 h-3.5" />
            SECTOR BOSSES ({SECTOR_LEVELS.length})
          </button>
          <button
            onClick={() => {
              sound.playPickup('credit');
              setActiveTab('sectors');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider transition flex items-center gap-2 ${
              activeTab === 'sectors'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            SECTOR PROGRESSION
          </button>
        </div>

        {/* Tab 1: MOBS BESTIARY */}
        {activeTab === 'mobs' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
            {/* Left list */}
            <div className="md:col-span-5 border-r border-zinc-800/80 p-3.5 overflow-y-auto max-h-[60vh] space-y-2">
              <div className="text-[10px] font-mono text-zinc-400 px-2 py-1 uppercase tracking-wider font-semibold">
                HOSTILE UNITS UNLOCKED BY LEVEL
              </div>
              {ENEMY_BESTIARY.map((entry) => {
                const isSelected = selectedMob.type === entry.type;
                const isUnlocked = currentLevelReached >= entry.unlockedLevel;

                return (
                  <button
                    key={entry.type}
                    onClick={() => {
                      sound.playPickup('credit');
                      setSelectedMob(entry);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/70 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-100">{entry.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-zinc-800 text-zinc-300">
                            LVL {entry.unlockedLevel}+
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{entry.sectorName}</span>
                          <span>•</span>
                          <span
                            className={
                              entry.threatLevel === 'CRITICAL' || entry.threatLevel === 'EXTREME'
                                ? 'text-rose-400 font-bold'
                                : 'text-amber-400 font-semibold'
                            }
                          >
                            {entry.threatLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 transition ${
                        isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Right Details */}
            <div className="md:col-span-7 p-5 overflow-y-auto max-h-[60vh] flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                      {selectedMob.codename} • {selectedMob.sectorName}
                    </span>
                    <h3 className="text-xl font-black font-display text-white mt-0.5">
                      {selectedMob.name}
                    </h3>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                      COMBAT ROLE: <span className="text-zinc-200">{selectedMob.role}</span>
                    </div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold border"
                    style={{
                      borderColor: selectedMob.color,
                      color: selectedMob.color,
                      backgroundColor: `${selectedMob.color}15`,
                    }}
                  >
                    THREAT: {selectedMob.threatLevel}
                  </div>
                </div>

                {/* Visual Accent Display */}
                <div className="my-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-around">
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">HULL ARMOR</span>
                    <div className="text-sm font-bold font-mono text-white mt-0.5">
                      {selectedMob.stats.hp}
                    </div>
                  </div>
                  <div className="w-[1px] h-8 bg-zinc-800" />
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">VELOCITY</span>
                    <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                      {selectedMob.stats.speed}
                    </div>
                  </div>
                  <div className="w-[1px] h-8 bg-zinc-800" />
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">FIREPOWER</span>
                    <div className="text-sm font-bold font-mono text-rose-300 mt-0.5">
                      {selectedMob.stats.damage}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <div className="text-xs font-mono text-zinc-400 font-bold uppercase mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    SYSTEM TELEMETRY
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    {selectedMob.description}
                  </p>
                </div>

                {/* Tactical Advice */}
                <div>
                  <div className="text-xs font-mono text-amber-400 font-bold uppercase mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    PILOT COUNTERMEASURE ADVICE
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-950/20 p-3 rounded-lg border border-amber-500/30">
                    {selectedMob.tacticalAdvice}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>SECTOR UNLOCKED: LEVEL {selectedMob.unlockedLevel}</span>
                <span className="text-cyan-400">DEFENSE GRID REGISTRY ACTIVE</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SECTOR BOSSES */}
        {activeTab === 'bosses' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[65vh]">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              FLAGSHIP DREADNOUGHT THREATS ENCOUNTERED AS LEVEL INCREASES
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SECTOR_LEVELS.map((sec) => (
                <div
                  key={sec.level}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        LEVEL {sec.level} BOSS
                      </span>
                      <span
                        className="text-xs font-mono font-bold"
                        style={{ color: sec.bossThemeColor }}
                      >
                        {sec.name}
                      </span>
                    </div>

                    <h4 className="text-lg font-black font-display text-white">
                      {sec.bossName}
                    </h4>
                    <div className="text-[11px] text-zinc-400 font-mono mb-2">
                      {sec.bossSubtitle}
                    </div>

                    <p className="text-xs text-zinc-300 mb-3 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/70">
                      {sec.bossDescription}
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                        SIGNATURE ATTACK MECHANICS:
                      </span>
                      {sec.bossMechanics.map((mech, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-zinc-300 font-sans flex items-start gap-1.5"
                        >
                          <span className="text-rose-400 font-bold">•</span>
                          <span>{mech}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-500">SPAWN THRESHOLD:</span>
                    <span className="text-cyan-400 font-bold">
                      {sec.scoreThreshold.toLocaleString()} PTS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: SECTOR PROGRESSION */}
        {activeTab === 'sectors' && (
          <div className="flex-1 overflow-y-auto p-5 max-h-[65vh] space-y-4">
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              TACTICAL CAMPAIGN SECTORS & ESCALATING WAR ZONES
            </div>

            <div className="space-y-3">
              {SECTOR_LEVELS.map((sec) => (
                <div
                  key={sec.level}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-black font-display text-lg shrink-0 border"
                      style={{
                        borderColor: sec.accentColor,
                        backgroundColor: `${sec.accentColor}20`,
                        color: sec.accentColor,
                      }}
                    >
                      {sec.level}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black font-display text-white">{sec.name}</h4>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase">
                          ({sec.subtitle})
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">
                        CAPITAL BOSS: <span className="text-white font-bold">{sec.bossName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] font-mono text-zinc-500">NEW HOSTILES:</span>
                        {sec.unlockedMobs.map((m) => (
                          <span
                            key={m}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-cyan-300 uppercase font-semibold"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono text-zinc-500">QUALIFICATION SCORE</div>
                    <div className="text-sm font-bold font-mono text-cyan-400">
                      {sec.scoreThreshold.toLocaleString()} PTS
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>5 SECTORS • 12 HOSTILE CLASSIFICATIONS ACTIVE</span>
          </div>
          <button
            onClick={() => {
              sound.playPickup('credit');
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition text-xs"
          >
            DISMISS INTEL
          </button>
        </div>
      </div>
    </div>
  );
};
