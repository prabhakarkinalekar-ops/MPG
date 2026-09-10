import { ControlSettings, PilotProfile, Starship, UpgradeItem } from '../types';

export const DEFAULT_CONTROLS: ControlSettings = {
  pcMovementMode: 'hybrid', // supports both mouse follow/drag AND keyboard simultaneously
  pcFireMode: 'auto',
  mouseSensitivity: 1.2,
  mouseReticleEnabled: true,
  keyPreset: 'wasd',
  customKeys: {
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    fire: 'Space',
    dash: 'ShiftLeft',
    emp: 'KeyE',
    pause: 'Escape',
  },
  mobileMovementMode: 'finger_drag', // direct touch follow with finger offset
  mobileFireMode: 'auto',
  touchSensitivity: 1.2,
  fingerYOffset: 45, // 45px above finger touch position so ship and incoming enemy bullets are fully visible!
  buttonLayout: 'right_handed',
  joystickSize: 'medium',
  hapticFeedback: true,
};

export const STARSHIPS: Starship[] = [
  {
    id: 'apex_falcon',
    name: 'Apex Falcon',
    model: 'NX-700 Strike Interceptor',
    description: 'Balanced frontline attack fighter equipped with rapid twin plasma blasters.',
    price: 0,
    baseHp: 100,
    baseSpeed: 7.5,
    baseShield: 50,
    primaryColor: '#00f0ff',
    accentColor: '#ff0055',
    weaponType: 'plasma',
    fireRate: 140,
    dashSpeed: 14,
    unlockedByDefault: true,
  },
  {
    id: 'viper_neon',
    name: 'Viper Neon',
    model: 'VX-Ghost Stealth Skimmer',
    description: 'Hyper-maneuverable lightweight skimmer with high-velocity laser arrays.',
    price: 1200,
    baseHp: 75,
    baseSpeed: 9.0,
    baseShield: 35,
    primaryColor: '#39ff14',
    accentColor: '#ffe600',
    weaponType: 'twin_laser',
    fireRate: 110,
    dashSpeed: 16,
  },
  {
    id: 'aegis_titan',
    name: 'Aegis Titan',
    model: 'MK-IV Heavy Dread-Fighter',
    description: 'Heavily armored gunship with crushing flak cannons and reinforced kinetic deflectors.',
    price: 2800,
    baseHp: 160,
    baseSpeed: 6.2,
    baseShield: 80,
    primaryColor: '#bd00ff',
    accentColor: '#00f0ff',
    weaponType: 'heavy_cannon',
    fireRate: 190,
    dashSpeed: 11,
  },
];

export const UPGRADES: UpgradeItem[] = [
  {
    id: 'hull',
    name: 'Nanite Hull Plating',
    description: 'Self-repairing molecular lattice reinforcing ship structural integrity.',
    icon: 'ShieldAlert',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.8,
    getBonusText: (level) => `+${level * 20} Max HP`,
  },
  {
    id: 'shields',
    name: 'Overcharged Deflector',
    description: 'Boosts electromagnetic barrier capacity and mitigates incoming plasma.',
    icon: 'ShieldCheck',
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 1.9,
    getBonusText: (level) => `+${level * 15} Shield Buffer`,
  },
  {
    id: 'thrusters',
    name: 'Vector Warp Thrusters',
    description: 'Optimized antimatter injection for superior combat speed and agility.',
    icon: 'Zap',
    maxLevel: 5,
    baseCost: 220,
    costMultiplier: 1.75,
    getBonusText: (level) => `+${level * 7}% Flight Velocity`,
  },
  {
    id: 'capacitors',
    name: 'Plasma Overclock',
    description: 'Accelerates laser bank recharge cycle for devastating rate of fire.',
    icon: 'Flame',
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 2.0,
    getBonusText: (level) => `+${level * 8}% Attack Velocity`,
  },
  {
    id: 'magnet',
    name: 'Gravity Tractor Beam',
    description: 'Attracts credits and combat salvage drops from greater distances.',
    icon: 'Magnet',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
    getBonusText: (level) => `+${level * 40}px Salvage Radius`,
  },
  {
    id: 'emp',
    name: 'EMP Burst Capacitor',
    description: 'Improves EMP pulse charge rate and shockwave clearing radius.',
    icon: 'Radio',
    maxLevel: 3,
    baseCost: 500,
    costMultiplier: 2.2,
    getBonusText: (level) => `+${level * 25}% EMP Recharge Speed`,
  },
];

const STORAGE_KEY = 'cyber_strike_pilot_data_v1';

export const DEFAULT_PROFILE: PilotProfile = {
  callsign: 'SPECTRE-01',
  rank: 'Flight Cadet',
  credits: 300,
  highScore: 0,
  totalKills: 0,
  totalBossesDefeated: 0,
  missionsFlown: 0,
  selectedShipId: 'apex_falcon',
  unlockedShipIds: ['apex_falcon'],
  upgrades: {
    hull: 0,
    shields: 0,
    thrusters: 0,
    capacitors: 0,
    magnet: 0,
    emp: 0,
  },
  soundEnabled: true,
  musicEnabled: true,
  controls: { ...DEFAULT_CONTROLS },
};

export function loadPilotProfile(): PilotProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE, controls: { ...DEFAULT_CONTROLS } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      upgrades: { ...DEFAULT_PROFILE.upgrades, ...(parsed.upgrades || {}) },
      unlockedShipIds: parsed.unlockedShipIds || ['apex_falcon'],
      controls: {
        ...DEFAULT_CONTROLS,
        ...(parsed.controls || {}),
        customKeys: {
          ...DEFAULT_CONTROLS.customKeys,
          ...(parsed.controls?.customKeys || {}),
        },
      },
    };
  } catch (e) {
    console.error('Failed to load pilot profile', e);
    return { ...DEFAULT_PROFILE, controls: { ...DEFAULT_CONTROLS } };
  }
}

export function savePilotProfile(profile: PilotProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save pilot profile', e);
  }
}

export function getRankTitle(score: number, kills: number): string {
  if (score > 50000 || kills > 250) return 'Vanguard Commander';
  if (score > 30000 || kills > 150) return 'Cyber Ace';
  if (score > 15000 || kills > 80) return 'Strike Veteran';
  if (score > 5000 || kills > 30) return 'Ensign Pilot';
  return 'Flight Cadet';
}

export function getUpgradeCost(upgrade: UpgradeItem, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) return 0;
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}
