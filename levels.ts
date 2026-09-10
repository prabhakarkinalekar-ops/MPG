import { SectorLevel, EnemyType } from '../types';

export interface BestiaryEntry {
  type: EnemyType | 'asteroid';
  name: string;
  codename: string;
  unlockedLevel: number;
  sectorName: string;
  role: string;
  threatLevel: 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EXTREME' | 'BOSS THREAT';
  color: string;
  description: string;
  tacticalAdvice: string;
  stats: {
    hp: string;
    speed: string;
    damage: string;
  };
}

export const SECTOR_LEVELS: SectorLevel[] = [
  {
    level: 1,
    name: 'SECTOR ALPHA',
    subtitle: 'ORBITAL DEFENSE PERIMETER',
    theme: 'orbital',
    nebulaColor: 'rgba(0, 160, 255, 0.08)',
    accentColor: '#00f0ff',
    bossName: 'GOLIATH MK-I SENTINEL',
    bossSubtitle: 'HEAVY ARTILLERY DREADNOUGHT',
    bossThemeColor: '#00f0ff',
    scoreThreshold: 3000,
    unlockedMobs: ['drone', 'interceptor', 'cruiser'],
    bossDescription:
      'A heavily reinforced orbital bastion with twin alternating laser gatlings, micro-missile silos, and secondary pulse cannons.',
    bossMechanics: [
      'Twin Gatling Sweeps: Alternating high-velocity laser volleys across the flight corridor.',
      'Rocket Barrage: Dual homing micro-rockets calibrated to player position.',
      'Core Overdrive (Phase 2): Unleashes 12-way radial plasma flak rings.',
    ],
  },
  {
    level: 2,
    name: 'SECTOR BETA',
    subtitle: 'NEON ASTEROID BELT',
    theme: 'asteroid_field',
    nebulaColor: 'rgba(168, 85, 247, 0.12)',
    accentColor: '#a855f7',
    bossName: 'OBSIDIAN VANGUARD',
    bossSubtitle: 'STEALTH BATTLECRUISER',
    bossThemeColor: '#a855f7',
    scoreThreshold: 7500,
    unlockedMobs: ['swarmer', 'sentinel'],
    bossDescription:
      'Angular stealth dreadnought with dark composite plating, twin railgun capacitors, and an automated Aegis escort escort bay.',
    bossMechanics: [
      'Aegis Forcefield Protocol: Summons twin Aegis Sentinels. The boss is 100% immune until both sentinels are neutralized!',
      'Twin Sniper Rails: Emits high-visibility targeting lasers before unleashing armor-piercing kinetic slugs.',
      'Asteroid Shockwave: Ejects rock clusters and debris into the combat sector.',
    ],
  },
  {
    level: 3,
    name: 'SECTOR GAMMA',
    subtitle: 'CYBER TEMPEST ANOMALY',
    theme: 'ion_storm',
    nebulaColor: 'rgba(16, 185, 129, 0.12)',
    accentColor: '#10b981',
    bossName: 'TEMPEST LEVIATHAN',
    bossSubtitle: 'CYBER-SERPENT WARSHIP',
    bossThemeColor: '#10b981',
    scoreThreshold: 13500,
    unlockedMobs: ['stalker', 'mortar', 'disruptor'],
    bossDescription:
      'Biomechanical cyber-serpent dreadnought with oscillating wing segments, cluster mortar turrets, and EMP generator coils.',
    bossMechanics: [
      'EMP Lightning Arc: Sends expanding electric storm arcs across the battlefield.',
      'Cluster Mortars: Launches dual high-arc plasma mortars that detonate into 12 radial bomblets.',
      'Hatch Deployment: Releases squads of Kamikaze Swarmers from ventral ports.',
    ],
  },
  {
    level: 4,
    name: 'SECTOR OMEGA',
    subtitle: 'VOID CITADEL CORE',
    theme: 'void_core',
    nebulaColor: 'rgba(239, 68, 68, 0.14)',
    accentColor: '#f43f5e',
    bossName: 'CARRIER OVERLORD PRIME',
    bossSubtitle: 'SUPER-CARRIER FLAGSHIP',
    bossThemeColor: '#f43f5e',
    scoreThreshold: 22000,
    unlockedMobs: ['phaser', 'behemoth'],
    bossDescription:
      'A colossal citadel warship equipped with a central Spinal Ion Beam Cannon, rotating bullet-hell emitters, and automated hangar bays.',
    bossMechanics: [
      'Mega Ion Cannon: A massive central laser charges for 1.6s before blasting a devastating full-screen vertical death beam.',
      'Strike Wing Scramble: Deploys Interceptor and Phase-Shifter strike wings.',
      'Spiral Bullet Ring: Rotates a high-density spiral curtain of energy projectiles.',
    ],
  },
  {
    level: 5,
    name: 'SECTOR NEXUS',
    subtitle: 'QUANTUM SINGULARITY CHASM',
    theme: 'singularity_nexus',
    nebulaColor: 'rgba(245, 158, 11, 0.16)',
    accentColor: '#eab308',
    bossName: 'CHRONOS TITAN PRIME',
    bossSubtitle: 'SINGULARITY GOD-ENGINE',
    bossThemeColor: '#eab308',
    scoreThreshold: 32000,
    unlockedMobs: ['minelayer', 'carrier_drone'],
    bossDescription:
      'An ancient golden celestial warmachine engineered at the event horizon of a quantum black hole, manipulating spacetime coordinates.',
    bossMechanics: [
      'Quantum Phase Warp: Teleports across top coordinates with blinding particle flares.',
      'Graviton Singularity: Spawns gravitational vortex wells that attract incoming fire and pull the player.',
      'Kaleidoscope Mandala: 16-way geometric bullet curtains pulsing in opposing rotations.',
      'Chrono-Frenzy (HP < 35%): Rapid-fire cross-warp strikes and hyper-density projectile storms.',
    ],
  },
];

export const ENEMY_BESTIARY: BestiaryEntry[] = [
  {
    type: 'drone',
    name: 'Scout Skirmisher Drone',
    codename: 'VX-01 RECON',
    unlockedLevel: 1,
    sectorName: 'Sector Alpha',
    role: 'Fast Skirmisher',
    threatLevel: 'MODERATE',
    color: '#ff0055',
    description: 'Lightweight autonomous drones with unpredictable zigzag maneuvering and twin pulse blasters.',
    tacticalAdvice: 'Shoot early before they close distance. Use rapid or spread fire to clear swarms.',
    stats: { hp: 'Low', speed: 'Fast', damage: 'Moderate' },
  },
  {
    type: 'interceptor',
    name: 'Delta Interceptor',
    codename: 'INT-9 VIPER',
    unlockedLevel: 1,
    sectorName: 'Sector Alpha',
    role: 'Strike Fighter',
    threatLevel: 'HIGH',
    color: '#ff9900',
    description: 'Agile swept-wing fighter that conducts high-speed vertical dives while firing concentrated red laser salvos.',
    tacticalAdvice: 'Sidestep their linear dive path and return fire with heavy plasma.',
    stats: { hp: 'Medium', speed: 'High', damage: 'High' },
  },
  {
    type: 'cruiser',
    name: 'Armored Patrol Cruiser',
    codename: 'CRU-88 BULWARK',
    unlockedLevel: 1,
    sectorName: 'Sector Alpha',
    role: 'Heavy Escort',
    threatLevel: 'HIGH',
    color: '#bf00ff',
    description: 'Armored support vessel firing wide 3-way spreading plasma rings with high defensive plating.',
    tacticalAdvice: 'Stay between projectile gaps and focus fire on the primary core.',
    stats: { hp: 'High', speed: 'Slow', damage: 'High' },
  },
  {
    type: 'swarmer',
    name: 'Kamikaze Swarmer',
    codename: 'SW-12 STINGER',
    unlockedLevel: 2,
    sectorName: 'Sector Beta',
    role: 'Suicide Divebomber',
    threatLevel: 'HIGH',
    color: '#ef4444',
    description: 'Razor-winged suicide drone that locks onto player coordinates and triggers maximum afterburners for impact explosion.',
    tacticalAdvice: 'Prioritize and eliminate immediately before they ignite boost. Dash through them with ram shield if trapped.',
    stats: { hp: 'Low', speed: 'Extreme', damage: 'Critical' },
  },
  {
    type: 'sentinel',
    name: 'Aegis Shield Sentinel',
    codename: 'AEG-04 GUARDIAN',
    unlockedLevel: 2,
    sectorName: 'Sector Beta',
    role: 'Forcefield Support',
    threatLevel: 'CRITICAL',
    color: '#10b981',
    description: 'Hexagonal drone projecting emerald tether beams that render allied cruisers and bosses totally impervious to all damage.',
    tacticalAdvice: 'Always destroy Sentinels first! Shielded targets take zero damage while tether is active.',
    stats: { hp: 'Medium', speed: 'Slow', damage: 'Low' },
  },
  {
    type: 'stalker',
    name: 'Spectre Stealth Stalker',
    codename: 'STK-07 PHANTOM',
    unlockedLevel: 3,
    sectorName: 'Sector Gamma',
    role: 'Sniper Predator',
    threatLevel: 'CRITICAL',
    color: '#a855f7',
    description: 'Cloaked predator utilizing optical camouflage (75% damage reduction). Uncloaks to track you with a laser before firing a sniper rail.',
    tacticalAdvice: 'Watch for the magenta aiming laser. Evade perpendicular right before the sniper bolt fires.',
    stats: { hp: 'Medium', speed: 'Moderate', damage: 'Extreme' },
  },
  {
    type: 'mortar',
    name: 'Plasma Mortar Battery',
    codename: 'MOR-55 SIEGE',
    unlockedLevel: 3,
    sectorName: 'Sector Gamma',
    role: 'Heavy Artillery',
    threatLevel: 'CRITICAL',
    color: '#f59e0b',
    description: 'Armored artillery ship launching slow-moving cluster mortar shells that detonate mid-flight into 6-directional radial bomblets.',
    tacticalAdvice: 'Anticipate mortar cluster burst height and weave between radial projectiles.',
    stats: { hp: 'Very High', speed: 'Slow', damage: 'Extreme' },
  },
  {
    type: 'disruptor',
    name: 'Ion Disruptor Frigate',
    codename: 'DIS-90 EMP',
    unlockedLevel: 3,
    sectorName: 'Sector Gamma',
    role: 'Electronic Warfare',
    threatLevel: 'CRITICAL',
    color: '#06b6d4',
    description: 'Emits expanding cyan EMP shock rings that scramble pilot HUD and fire dual homing plasma bolts.',
    tacticalAdvice: 'Keep distance from the EMP ring emitter. Use EMP blast to disrupt its homing torpedoes.',
    stats: { hp: 'High', speed: 'Slow', damage: 'High' },
  },
  {
    type: 'phaser',
    name: 'Quantum Phase Shifter',
    codename: 'QPS-33 WARP',
    unlockedLevel: 4,
    sectorName: 'Sector Omega',
    role: 'Teleporting Skirmisher',
    threatLevel: 'EXTREME',
    color: '#38bdf8',
    description: 'Warp-capable vessel that glitched-teleports across the combat grid, reappearing on pilot flanks to unleash concentrated crossfire.',
    tacticalAdvice: 'Listen for the warp charge audio. Turn immediately to target its new coordinates upon materialization.',
    stats: { hp: 'Medium', speed: 'Instant (Warp)', damage: 'Very High' },
  },
  {
    type: 'behemoth',
    name: 'Siege Dreadnought Behemoth',
    codename: 'BHM-99 TITAN',
    unlockedLevel: 4,
    sectorName: 'Sector Omega',
    role: 'Heavy Mini-Boss',
    threatLevel: 'EXTREME',
    color: '#e11d48',
    description: 'Massive fortress tank boasting multi-turret gatlings, heavy armor plating, and broadside laser batteries. Drops guaranteed powerups.',
    tacticalAdvice: 'Employ EMP or overdrive boost to penetrate its heavy hull armor.',
    stats: { hp: 'Extreme', speed: 'Very Slow', damage: 'Extreme' },
  },
  {
    type: 'minelayer',
    name: 'Singularity Minelayer',
    codename: 'MNL-09 GRAV',
    unlockedLevel: 5,
    sectorName: 'Sector Nexus',
    role: 'Hazard Deployer',
    threatLevel: 'EXTREME',
    color: '#f59e0b',
    description: 'Deploys floating proximity pulse mines and graviton wells across the screen that detonate into dangerous shrapnel rings.',
    tacticalAdvice: 'Detonate mines from safe distance before they restrict your flight maneuvering corridor.',
    stats: { hp: 'High', speed: 'Moderate', damage: 'Devastating' },
  },
  {
    type: 'carrier_drone',
    name: 'Nanite Reconstructor Hive',
    codename: 'HIV-77 NANITE',
    unlockedLevel: 5,
    sectorName: 'Sector Nexus',
    role: 'Fleet Repair Unit',
    threatLevel: 'EXTREME',
    color: '#84cc16',
    description: 'Deploys micro-repair swarms that regenerate health on damaged hostiles while discharging bio-plasma arcs.',
    tacticalAdvice: 'Destroy immediately to prevent Behemoths and Cruisers from repairing their shields and hulls.',
    stats: { hp: 'High', speed: 'Moderate', damage: 'Moderate' },
  },
];

export function getSectorForScore(score: number): SectorLevel {
  for (let i = SECTOR_LEVELS.length - 1; i >= 0; i--) {
    if (score >= SECTOR_LEVELS[i].scoreThreshold) {
      return SECTOR_LEVELS[i];
    }
  }
  return SECTOR_LEVELS[0];
}

export function getSectorForLevel(level: number): SectorLevel {
  const index = Math.max(0, Math.min(SECTOR_LEVELS.length - 1, level - 1));
  return SECTOR_LEVELS[index];
}
