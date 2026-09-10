import React, { useState } from 'react';
import { PilotProfile, Starship } from '../types';
import { STARSHIPS, UPGRADES, getUpgradeCost } from '../utils/storage';
import { sound } from '../utils/audio';
import { Ship3DPreview } from './Ship3DPreview';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Flame,
  Magnet,
  Radio,
  ArrowLeft,
  Lock,
  Check,
  Sparkles,
} from 'lucide-react';

interface HangarLabProps {
  pilot: PilotProfile;
  onUpdateProfile: (updated: PilotProfile) => void;
  onBack: () => void;
  onLaunchMission: () => void;
}

export const HangarLab: React.FC<HangarLabProps> = ({
  pilot,
  onUpdateProfile,
  onBack,
  onLaunchMission,
}) => {
  const [activeTab, setActiveTab] = useState<'ships' | 'upgrades'>('ships');
  const [selectedShipPreview, setSelectedShipPreview] = useState<Starship>(
    STARSHIPS.find((s) => s.id === pilot.selectedShipId) || STARSHIPS[0]
  );

  const iconMap: Record<string, React.ReactNode> = {
    ShieldAlert: <ShieldAlert className="w-5 h-5 text-rose-400" />,
    ShieldCheck: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
    Zap: <Zap className="w-5 h-5 text-amber-400" />,
    Flame: <Flame className="w-5 h-5 text-orange-400" />,
    Magnet: <Magnet className="w-5 h-5 text-purple-400" />,
    Radio: <Radio className="w-5 h-5 text-blue-400" />,
  };

  const handleSelectShip = (ship: Starship) => {
    sound.playPickup('credit');
    setSelectedShipPreview(ship);
    if (pilot.unlockedShipIds.includes(ship.id)) {
      onUpdateProfile({
        ...pilot,
        selectedShipId: ship.id,
      });
    }
  };

  const handleBuyShip = (ship: Starship) => {
    if (pilot.credits < ship.price) {
      sound.playLaser('enemy');
      return;
    }
    sound.playPickup('powerup');
    const newUnlocked = [...pilot.unlockedShipIds, ship.id];
    onUpdateProfile({
      ...pilot,
      credits: pilot.credits - ship.price,
      unlockedShipIds: newUnlocked,
      selectedShipId: ship.id,
    });
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    const currentLevel = pilot.upgrades[upgradeId] || 0;
    if (currentLevel >= upgrade.maxLevel) return;

    const cost = getUpgradeCost(upgrade, currentLevel);
    if (pilot.credits < cost) {
      sound.playLaser('enemy');
      return;
    }

    sound.playPickup('powerup');
    onUpdateProfile({
      ...pilot,
      credits: pilot.credits - cost,
      upgrades: {
        ...pilot.upgrades,
        [upgradeId]: currentLevel + 1,
      },
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#05070f] text-[#e2f1ff] overflow-y-auto p-4 sm:p-6 select-none">
      {/* Header bar */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b border-zinc-800">
        <button
          id="hangar-back-button"
          onClick={() => {
            sound.playPickup('credit');
            onBack();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-cyan-400 text-zinc-300 hover:text-cyan-300 transition text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO BRIDGE</span>
        </button>

        {/* Credits Pill */}
        <div className="flex items-center gap-3 bg-zinc-900/90 border border-amber-500/40 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(255,200,0,0.15)]">
          <span className="text-amber-400 font-bold text-xs">CYBER CREDITS:</span>
          <span className="font-mono text-amber-200 font-black text-lg">
            ⚡ {pilot.credits.toLocaleString()}
          </span>
        </div>

        <button
          id="hangar-launch-button"
          onClick={() => {
            sound.playLaser('player');
            onLaunchMission();
          }}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black tracking-wider text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition"
        >
          DEPLOY TO COMBAT
        </button>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-6xl mx-auto mt-6 flex gap-4">
        <button
          id="tab-hangar-ships"
          onClick={() => {
            sound.playPickup('credit');
            setActiveTab('ships');
          }}
          className={`px-6 py-2.5 rounded-lg font-display font-bold text-sm tracking-wide transition border ${
            activeTab === 'ships'
              ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          STARSHIP HANGAR ({STARSHIPS.length})
        </button>
        <button
          id="tab-hangar-upgrades"
          onClick={() => {
            sound.playPickup('credit');
            setActiveTab('upgrades');
          }}
          className={`px-6 py-2.5 rounded-lg font-display font-bold text-sm tracking-wide transition border ${
            activeTab === 'upgrades'
              ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          CYBERNETICS LAB ({UPGRADES.length} MODULES)
        </button>
      </div>

      {/* TAB CONTENT: SHIPS */}
      {activeTab === 'ships' && (
        <div className="w-full max-w-6xl mx-auto mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ship Selection List */}
          <div className="flex flex-col gap-4">
            {STARSHIPS.map((s) => {
              const isUnlocked = pilot.unlockedShipIds.includes(s.id);
              const isSelected = pilot.selectedShipId === s.id;
              const isPreviewed = selectedShipPreview.id === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectShip(s)}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    isPreviewed
                      ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-base text-white">
                        {s.name}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 font-mono mt-0.5">
                      {s.model}
                    </span>
                  </div>

                  <div>
                    {isUnlocked ? (
                      <span className="p-2 rounded-lg bg-zinc-800/80 text-cyan-400 block">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 bg-amber-950/30 px-2.5 py-1 rounded-md border border-amber-500/30">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{s.price} CR</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ship Detail Blueprint Visualizer */}
          <div className="lg:col-span-2 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase">
                    VESSEL SCHEMATIC
                  </span>
                  <h2 className="text-2xl font-black font-display text-white mt-1">
                    {selectedShipPreview.name}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    {selectedShipPreview.model}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-md"
                    style={{ backgroundColor: selectedShipPreview.primaryColor }}
                    title="Primary Hull Color"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-md"
                    style={{ backgroundColor: selectedShipPreview.accentColor }}
                    title="Secondary Glow Color"
                  />
                </div>
              </div>

              {/* 3D Interactive Vessel Visualizer & Weapon Simulator */}
              <div className="my-5">
                <Ship3DPreview ship={selectedShipPreview} pilot={pilot} />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold mb-1">
                  VESSEL DOSSIER OVERVIEW
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {selectedShipPreview.description}
                </p>
              </div>
            </div>

            {/* Action Bar for this Ship */}
            <div className="mt-8 pt-4 border-t border-zinc-800 flex items-center justify-between">
              {pilot.unlockedShipIds.includes(selectedShipPreview.id) ? (
                pilot.selectedShipId === selectedShipPreview.id ? (
                  <div className="flex items-center gap-2 text-cyan-400 font-display font-bold text-sm">
                    <Check className="w-5 h-5" />
                    <span>STARSHIP ASSIGNED TO PILOT</span>
                  </div>
                ) : (
                  <button
                    id="select-ship-btn"
                    onClick={() => handleSelectShip(selectedShipPreview)}
                    className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-display font-black text-sm tracking-wider transition active:scale-95"
                  >
                    SELECT AS ACTIVE SHIP
                  </button>
                )
              ) : (
                <button
                  id="buy-ship-btn"
                  onClick={() => handleBuyShip(selectedShipPreview)}
                  disabled={pilot.credits < selectedShipPreview.price}
                  className={`px-6 py-3 rounded-xl font-display font-black text-sm tracking-wider flex items-center gap-2 transition ${
                    pilot.credits >= selectedShipPreview.price
                      ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_15px_rgba(255,200,0,0.4)] active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AUTHORIZE SHIP FOR {selectedShipPreview.price} CR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: UPGRADES */}
      {activeTab === 'upgrades' && (
        <div className="w-full max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {UPGRADES.map((upgrade) => {
            const currentLvl = pilot.upgrades[upgrade.id] || 0;
            const isMax = currentLvl >= upgrade.maxLevel;
            const cost = getUpgradeCost(upgrade, currentLvl);
            const canAfford = pilot.credits >= cost && !isMax;

            return (
              <div
                key={upgrade.id}
                className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between relative hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                      {iconMap[upgrade.icon] || <Zap className="w-5 h-5 text-cyan-400" />}
                    </div>

                    {/* Level Pips */}
                    <div className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1 rounded-md border border-zinc-800">
                      {Array.from({ length: upgrade.maxLevel }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-3.5 rounded-sm ${
                            idx < currentLvl
                              ? 'bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.7)]'
                              : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-mono font-bold text-zinc-400 ml-1">
                        LV {currentLvl}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-base text-white mt-3">
                    {upgrade.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                    {upgrade.description}
                  </p>

                  <div className="mt-3 text-xs font-mono text-cyan-300 font-bold bg-cyan-950/30 px-2.5 py-1 rounded border border-cyan-900/40 inline-block">
                    {upgrade.getBonusText(currentLvl + (isMax ? 0 : 1))}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  {isMax ? (
                    <span className="text-xs font-display font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> MAX LEVEL REACHED
                    </span>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          UPGRADE COST
                        </span>
                        <span className="font-mono text-sm font-bold text-amber-300">
                          ⚡ {cost} CR
                        </span>
                      </div>

                      <button
                        id={`upgrade-btn-${upgrade.id}`}
                        onClick={() => handleBuyUpgrade(upgrade.id)}
                        disabled={!canAfford}
                        className={`px-4 py-2 rounded-lg font-display font-bold text-xs tracking-wider transition ${
                          canAfford
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_12px_rgba(0,240,255,0.3)] active:scale-95'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                        }`}
                      >
                        UPGRADE
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
