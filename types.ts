export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'hangar' | 'dossier';

export type PcMovementMode = 'keyboard' | 'mouse_follow' | 'hybrid';
export type MobileMovementMode = 'finger_drag' | 'virtual_joystick' | 'relative_drag';
export type FireMode = 'auto' | 'manual';
export type ButtonLayout = 'right_handed' | 'left_handed';

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  fire: string;
  dash: string;
  emp: string;
  pause: string;
}

export interface ControlSettings {
  // PC / Desktop
  pcMovementMode: PcMovementMode;
  pcFireMode: FireMode;
  mouseSensitivity: number; // 0.5 to 2.5
  mouseReticleEnabled: boolean;
  keyPreset: 'wasd' | 'arrows' | 'custom';
  customKeys: KeyBindings;

  // Mobile / Touch
  mobileMovementMode: MobileMovementMode;
  mobileFireMode: FireMode;
  touchSensitivity: number; // 0.5 to 2.5
  fingerYOffset: number; // in px, e.g. 0 to 80
  buttonLayout: ButtonLayout;
  joystickSize: 'small' | 'medium' | 'large';
  hapticFeedback: boolean;
}

export interface PilotProfile {
  callsign: string;
  rank: string;
  credits: number;
  highScore: number;
  totalKills: number;
  totalBossesDefeated: number;
  missionsFlown: number;
  selectedShipId: string;
  unlockedShipIds: string[];
  upgrades: Record<string, number>; // upgradeId -> level
  soundEnabled: boolean;
  musicEnabled: boolean;
  controls: ControlSettings;
}

export interface Starship {
  id: string;
  name: string;
  model: string;
  description: string;
  price: number;
  baseHp: number;
  baseSpeed: number;
  baseShield: number;
  primaryColor: string;
  accentColor: string;
  weaponType: 'plasma' | 'twin_laser' | 'heavy_cannon';
  fireRate: number; // ms between shots
  dashSpeed: number;
  unlockedByDefault?: boolean;
}

export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  getBonusText: (level: number) => string;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  isPlayer: boolean;
  piercing?: boolean;
  isMortarCluster?: boolean;
}

export type EnemyType =
  | 'drone'
  | 'interceptor'
  | 'cruiser'
  | 'boss'
  | 'stalker'
  | 'mortar'
  | 'sentinel'
  | 'swarmer'
  | 'disruptor'
  | 'phaser'
  | 'behemoth'
  | 'minelayer'
  | 'carrier_drone';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  color: string;
  scoreValue: number;
  creditsValue: number;
  shootCooldown: number;
  lastShootTime: number;
  phase?: number;
  patternTimer?: number;

  // Stealth Stalker
  cloaked?: boolean;
  cloakAlpha?: number;
  cloakTimer?: number;

  // Sniper / Rail
  chargeLaserTimer?: number;
  isChargingBeam?: boolean;
  aimedPlayerX?: number;
  aimedPlayerY?: number;

  // Aegis Sentinel Tether
  tetherTargetId?: number;
  isShielded?: boolean;

  // Mortar
  mortarExplodeTimer?: number;

  // Kamikaze Swarmer
  isDiving?: boolean;
  diveAngle?: number;
  diveTimer?: number;

  // Disruptor EMP fields
  empPulseRadius?: number;
  empCooldown?: number;

  // Phaser Warp mechanics
  warpCooldown?: number;
  isWarping?: boolean;
  warpBurstCount?: number;

  // Behemoth / Siege Heavy
  turretAngle?: number;

  // Minelayer & Floating Graviton Mines
  isMine?: boolean;
  mineDetonateTimer?: number;

  // Carrier / Nanite Drone
  healTargetId?: number;

  // Boss Flagship Identity & Specialized Mechanics
  bossLevel?: number;
  bossName?: string;
  bossSubtitle?: string;
  bossBeamCharging?: boolean;
  bossBeamChargeTimer?: number;
  bossBeamActive?: boolean;
  bossBeamActiveTimer?: number;
  bossBeamX?: number;
  bossBeamWidth?: number;
  bossInvulnerable?: boolean;
  escortSentinelIds?: number[];
  bossSpiralAngle?: number;
  bossOverdrive?: boolean;
  bossTeleportTimer?: number;
  bossLightningTimer?: number;
}

export interface AsteroidHazard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  rotation: number;
  rotationSpeed: number;
  points: number;
  credits: number;
  vertices: { x: number; y: number }[];
}

export interface SectorLevel {
  level: number;
  name: string;
  subtitle: string;
  theme: string;
  nebulaColor: string;
  accentColor: string;
  bossName: string;
  bossSubtitle: string;
  bossThemeColor: string;
  scoreThreshold: number;
  unlockedMobs: EnemyType[];
  bossDescription: string;
  bossMechanics: string[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
}

export interface DropItem {
  id: number;
  type: 'credit' | 'shield' | 'repair' | 'emp' | 'rapid' | 'triple';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  duration: number;
  color: string;
}

export interface GameStats {
  score: number;
  creditsEarned: number;
  enemiesDestroyed: number;
  wave: number;
  levelReached?: number;
  sectorsCleared?: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
}
