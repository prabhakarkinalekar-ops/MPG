import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PilotProfile,
  Starship,
  Projectile,
  Enemy,
  EnemyType,
  Particle,
  FloatingText,
  DropItem,
  GameStats,
  AsteroidHazard,
  SectorLevel,
} from '../types';
import { STARSHIPS, UPGRADES, DEFAULT_CONTROLS } from '../utils/storage';
import { sound } from '../utils/audio';
import { SECTOR_LEVELS, getSectorForScore } from '../utils/levels';
import { Sliders, Zap, Crosshair, Compass, ShieldAlert } from 'lucide-react';

interface GameCanvasProps {
  pilot: PilotProfile;
  onGameOver: (finalStats: GameStats) => void;
  onUpdateCredits: (earned: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenControls?: () => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  pilot,
  onGameOver,
  onUpdateCredits,
  isPaused,
  onTogglePause,
  onOpenControls,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Starship Blueprint & calculated stats from Upgrades
  const ship = STARSHIPS.find((s) => s.id === pilot.selectedShipId) || STARSHIPS[0];
  const controls = pilot.controls || DEFAULT_CONTROLS;
  const hullBonus = (pilot.upgrades.hull || 0) * 20;
  const shieldBonus = (pilot.upgrades.shields || 0) * 15;
  const speedBonus = 1 + (pilot.upgrades.thrusters || 0) * 0.07;
  const capacitorBonus = 1 + (pilot.upgrades.capacitors || 0) * 0.08;
  const magnetBonus = (pilot.upgrades.magnet || 0) * 40;
  const empBonus = 1 + (pilot.upgrades.emp || 0) * 0.25;

  const maxHp = ship.baseHp + hullBonus;
  const maxShield = ship.baseShield + shieldBonus;
  const moveSpeed = ship.baseSpeed * speedBonus;
  const attackDelay = Math.max(70, Math.round(ship.fireRate / capacitorBonus));
  const magnetRadius = 80 + magnetBonus;

  // Real-time HUD states passed up/visible
  const [hudHp, setHudHp] = useState(maxHp);
  const [hudShield, setHudShield] = useState(maxShield);
  const [hudScore, setHudScore] = useState(0);
  const [hudCredits, setHudCredits] = useState(0);
  const [hudEmp, setHudEmp] = useState(100);
  const [bossActive, setBossActive] = useState(false);
  const [bossHp, setBossHp] = useState(100);
  const [bossMaxHp, setBossMaxHp] = useState(100);
  const [combo, setCombo] = useState(1);
  const [weaponMode, setWeaponMode] = useState<string>('Standard');
  const [currentSector, setCurrentSector] = useState<SectorLevel>(SECTOR_LEVELS[0]);
  const [sectorBanner, setSectorBanner] = useState<{ title: string; subtitle: string } | null>({
    title: SECTOR_LEVELS[0].name,
    subtitle: SECTOR_LEVELS[0].subtitle,
  });

  // Input states
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mousePosRef = useRef<{ active: boolean; x: number; y: number; isDown: boolean }>({
    active: false,
    x: 0,
    y: 0,
    isDown: false,
  });
  const touchStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    playerStartX: number;
    playerStartY: number;
    joystickActive: boolean;
    joystickOriginX: number;
    joystickOriginY: number;
    joystickKnobX: number;
    joystickKnobY: number;
    isManualFiring: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    playerStartX: 0,
    playerStartY: 0,
    joystickActive: false,
    joystickOriginX: 0,
    joystickOriginY: 0,
    joystickKnobX: 0,
    joystickKnobY: 0,
    isManualFiring: false,
  });

  const triggerHaptic = useCallback(
    (pattern: number | number[]) => {
      if (controls.hapticFeedback && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(pattern);
        } catch (_) {}
      }
    },
    [controls.hapticFeedback]
  );

  // Internal Game Loop State
  const gameStateRef = useRef({
    running: true,
    score: 0,
    creditsSession: 0,
    enemiesKilled: 0,
    shotsFired: 0,
    shotsHit: 0,
    wave: 1,
    lastSpawnTime: 0,
    lastShootTime: 0,
    bossSpawnScore: 2500,
    isBossFight: false,
    comboCount: 0,
    comboTimer: 0,
    screenShake: 0,
    currentSectorLevel: 1,
    lastAsteroidSpawnTime: 0,
    warpFxTimer: 0,

    // Player Entity
    player: {
      x: 300,
      y: 600,
      hp: maxHp,
      shield: maxShield,
      shieldRegenTimer: 0,
      empCharge: 100,
      isDashing: false,
      dashTimer: 0,
      dashCooldown: 0,
      powerupTripleTimer: 0,
      powerupRapidTimer: 0,
      tilt: 0,
    },

    // Object pools
    projectiles: [] as Projectile[],
    enemies: [] as Enemy[],
    asteroids: [] as AsteroidHazard[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    drops: [] as DropItem[],
    stars: [] as Star[],
    empShockwave: null as { x: number; y: number; radius: number; maxRadius: number } | null,
  });

  // Setup stars
  useEffect(() => {
    const starList: Star[] = [];
    const starColors = ['#ffffff', '#aeefff', '#ff99dd', '#ffe882'];
    for (let i = 0; i < 90; i++) {
      starList.push({
        x: Math.random() * 1200,
        y: Math.random() * 900,
        size: Math.random() < 0.2 ? 2.5 : Math.random() * 1.5 + 0.5,
        speed: Math.random() * 1.8 + 0.6,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }
    gameStateRef.current.stars = starList;
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      keysRef.current[e.key.toLowerCase()] = true;

      const ck = controls.customKeys || DEFAULT_CONTROLS.customKeys;

      // Special triggers
      if (e.code === 'KeyP' || e.code === 'Escape' || e.code === ck.pause) {
        onTogglePause();
      }
      if (e.code === 'KeyE' || e.code === 'KeyB' || e.code === ck.emp) {
        triggerEmp();
      }
      if (
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight' ||
        e.code === 'KeyK' ||
        e.code === ck.dash
      ) {
        triggerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onTogglePause, controls.customKeys]);

  // Dash & EMP triggers
  const triggerDash = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.player.dashCooldown <= 0) {
      gs.player.isDashing = true;
      gs.player.dashTimer = 16; // 16 frames of invincible dash
      gs.player.dashCooldown = 60; // 1 second cooldown
      sound.playLaser('heavy');
      triggerHaptic(25);
      // Create trailing burst particles
      for (let i = 0; i < 18; i++) {
        gs.particles.push({
          x: gs.player.x + (Math.random() - 0.5) * 20,
          y: gs.player.y + 15,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 8 + 4,
          radius: Math.random() * 4 + 2,
          color: ship.primaryColor,
          alpha: 1,
          decay: 0.05,
        });
      }
    }
  }, [ship.primaryColor, triggerHaptic]);

  const triggerEmp = useCallback(() => {
    const gs = gameStateRef.current;
    if (gs.player.empCharge >= 100) {
      gs.player.empCharge = 0;
      setHudEmp(0);
      sound.playEmp();
      triggerHaptic([30, 40, 50]);
      gs.screenShake = 18;

      // Trigger massive shockwave
      gs.empShockwave = {
        x: gs.player.x,
        y: gs.player.y,
        radius: 10,
        maxRadius: 850,
      };

      // Clear all enemy projectiles
      gs.projectiles = gs.projectiles.filter((p) => p.isPlayer);

      // Damage all enemies
      gs.enemies.forEach((en) => {
        const dmg = en.type === 'boss' ? 150 : 80;
        en.hp -= dmg;
        gs.floatingTexts.push({
          id: Math.random(),
          text: `EMP -${dmg}`,
          x: en.x,
          y: en.y,
          color: '#00f0ff',
          alpha: 1,
          vy: -2,
        });
      });
    }
  }, []);

  // Main Canvas & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let lastTime = performance.now();

    // Canvas resize observer
    const handleResize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        if (gameStateRef.current.player.x > rect.width) {
          gameStateRef.current.player.x = rect.width / 2;
        }
        if (gameStateRef.current.player.y > rect.height) {
          gameStateRef.current.player.y = rect.height - 80;
        }
      }
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Spawn regular & new specialized enemies
    const spawnEnemy = (canvasWidth: number) => {
      const gs = gameStateRef.current;
      const now = performance.now();
      if (gs.isBossFight) return;

      const spawnInterval = Math.max(650, 1750 - gs.wave * 110);
      if (now - gs.lastSpawnTime < spawnInterval) return;
      gs.lastSpawnTime = now;

      // Determine enemy type by wave, sector and randomness
      const r = Math.random();
      const sector = gs.currentSectorLevel;
      let type: EnemyType = 'drone';
      let hp = 20 + gs.wave * 4;
      let radius = 16;
      let color = '#ff0055';
      let scoreVal = 100;
      let creditVal = 10;
      let speed = 2.5 + Math.random() * 1.5;
      let shootCd = 2200;

      // Unlocked progressively by sector level:
      if (sector >= 5 && r > 0.85) {
        // SINGULARITY MINELAYER (Sector 5+)
        type = 'minelayer';
        hp = 120 + gs.wave * 15;
        radius = 28;
        color = '#f59e0b';
        scoreVal = 520;
        creditVal = 50;
        speed = 1.1;
        shootCd = 3200;
      } else if (sector >= 5 && r > 0.72) {
        // NANITE RECONSTRUCTOR HIVE (Sector 5+)
        type = 'carrier_drone';
        hp = 100 + gs.wave * 12;
        radius = 26;
        color = '#84cc16';
        scoreVal = 480;
        creditVal = 45;
        speed = 1.6;
        shootCd = 2600;
      } else if (sector >= 4 && r > 0.82) {
        // SIEGE DREADNOUGHT BEHEMOTH (Sector 4+)
        type = 'behemoth';
        hp = 180 + gs.wave * 25;
        radius = 36;
        color = '#e11d48';
        scoreVal = 650;
        creditVal = 65;
        speed = 0.8;
        shootCd = 1900;
      } else if (sector >= 4 && r > 0.68) {
        // QUANTUM PHASE SHIFTER (Sector 4+)
        type = 'phaser';
        hp = 65 + gs.wave * 10;
        radius = 22;
        color = '#38bdf8';
        scoreVal = 420;
        creditVal = 42;
        speed = 1.8;
        shootCd = 2400;
      } else if (sector >= 3 && r > 0.78) {
        // ION DISRUPTOR FRIGATE (Sector 3+)
        type = 'disruptor';
        hp = 90 + gs.wave * 12;
        radius = 26;
        color = '#06b6d4';
        scoreVal = 390;
        creditVal = 38;
        speed = 1.3;
        shootCd = 2800;
      } else if (sector >= 3 && r > 0.64) {
        // PLASMA MORTAR (Sector 3+)
        type = 'mortar';
        hp = 95 + gs.wave * 12;
        radius = 26;
        color = '#f59e0b';
        scoreVal = 380;
        creditVal = 38;
        speed = 1.0;
        shootCd = 3600;
      } else if (sector >= 3 && r > 0.50) {
        // STEALTH STALKER (Sector 3+)
        type = 'stalker';
        hp = 55 + gs.wave * 8;
        radius = 22;
        color = '#a855f7';
        scoreVal = 340;
        creditVal = 35;
        speed = 1.8;
        shootCd = 3400;
      } else if (sector >= 2 && r > 0.72) {
        // AEGIS SENTINEL (Sector 2+)
        type = 'sentinel';
        hp = 75 + gs.wave * 10;
        radius = 24;
        color = '#10b981';
        scoreVal = 290;
        creditVal = 28;
        speed = 1.4;
        shootCd = 2600;
      } else if (sector >= 2 && r > 0.48 && gs.wave >= 2) {
        // KAMIKAZE SWARMER (Sector 2+)
        type = 'swarmer';
        hp = 28 + gs.wave * 5;
        radius = 15;
        color = '#ef4444';
        scoreVal = 160;
        creditVal = 15;
        speed = 3.6;
        shootCd = 99999;
      } else if (r > 0.25 && gs.wave >= 2) {
        type = 'cruiser';
        hp = 85 + gs.wave * 15;
        radius = 28;
        color = '#bf00ff';
        scoreVal = 350;
        creditVal = 35;
        speed = 1.2;
        shootCd = 1600;
      } else if (r > 0.10 && gs.wave >= 1) {
        type = 'interceptor';
        hp = 42 + gs.wave * 8;
        radius = 20;
        color = '#ff9900';
        scoreVal = 200;
        creditVal = 20;
        speed = 3.2;
        shootCd = 1900;
      }

      const newEnemy: Enemy = {
        id: Math.random(),
        type,
        x: 40 + Math.random() * (canvasWidth - 80),
        y: -40,
        vx: (Math.random() - 0.5) * (type === 'drone' ? 2.5 : 1),
        vy: speed,
        hp,
        maxHp: hp,
        radius,
        color,
        scoreValue: scoreVal,
        creditsValue: creditVal,
        shootCooldown: shootCd,
        lastShootTime: now + Math.random() * 600,
        patternTimer: Math.random() * 100,
        cloaked: type === 'stalker',
        cloakAlpha: type === 'stalker' ? 0.2 : 1,
        cloakTimer: type === 'stalker' ? 140 : 0,
        isDiving: false,
        diveTimer: 0,
        empCooldown: type === 'disruptor' ? 120 : 0,
        empPulseRadius: 0,
        warpCooldown: type === 'phaser' ? 80 : 0,
        turretAngle: 0,
      };

      gs.enemies.push(newEnemy);

      // If swarmer, spawn wingman in formation
      if (type === 'swarmer' && Math.random() < 0.65) {
        gs.enemies.push({
          ...newEnemy,
          id: Math.random(),
          x: Math.max(30, Math.min(canvasWidth - 30, newEnemy.x + (Math.random() > 0.5 ? 40 : -40))),
          y: -75,
        });
      }
    };

    // Spawn Destructible Asteroid Hazards
    const spawnAsteroid = (canvasWidth: number) => {
      const gs = gameStateRef.current;
      const now = performance.now();
      if (gs.currentSectorLevel < 2 && gs.wave < 2) return;
      const asteroidCooldown = gs.currentSectorLevel >= 3 ? 2400 : 3800;
      if (now - gs.lastAsteroidSpawnTime < asteroidCooldown) return;
      gs.lastAsteroidSpawnTime = now;

      const radius = Math.random() * 20 + 22; // 22 to 42 px
      const numVertices = Math.floor(Math.random() * 4) + 6;
      const vertices: { x: number; y: number }[] = [];
      for (let i = 0; i < numVertices; i++) {
        const angle = (i / numVertices) * Math.PI * 2;
        const rOffset = radius * (0.75 + Math.random() * 0.5);
        vertices.push({
          x: Math.cos(angle) * rOffset,
          y: Math.sin(angle) * rOffset,
        });
      }

      const hp = Math.round(radius * 1.5);
      gs.asteroids.push({
        id: Math.random(),
        x: Math.random() * (canvasWidth - 80) + 40,
        y: -50,
        vx: (Math.random() - 0.5) * 1.2,
        vy: Math.random() * 1.4 + 1.2,
        hp,
        maxHp: hp,
        radius,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        vertices,
        scoreValue: 150,
        creditsValue: 15,
      });
    };

    // Spawn Dreadnought / Sector Boss
    const spawnBoss = (canvasWidth: number) => {
      const gs = gameStateRef.current;
      if (gs.isBossFight) return;
      gs.isBossFight = true;
      setBossActive(true);
      sound.playBossWarning();

      const sectorData = SECTOR_LEVELS[Math.min(SECTOR_LEVELS.length - 1, gs.currentSectorLevel - 1)];
      const bossHpValue = 1300 + gs.wave * 450 + gs.currentSectorLevel * 500;
      setBossMaxHp(bossHpValue);
      setBossHp(bossHpValue);

      setSectorBanner({
        title: `WARNING: ${sectorData.bossName}`,
        subtitle: `LEVEL ${gs.currentSectorLevel} CAPITAL THREAT • ${sectorData.bossSubtitle || sectorData.name}`,
      });

      const bossId = 999999;
      const isLevel2 = gs.currentSectorLevel === 2;
      const bossColor = sectorData.bossThemeColor || sectorData.accentColor || '#ff0033';

      const bossEnemy: Enemy = {
        id: bossId,
        type: 'boss',
        bossLevel: gs.currentSectorLevel,
        bossName: sectorData.bossName,
        bossSubtitle: sectorData.bossSubtitle,
        x: canvasWidth / 2,
        y: -120,
        vx: 2.2,
        vy: 1.0,
        hp: bossHpValue,
        maxHp: bossHpValue,
        radius: 66 + gs.currentSectorLevel * 4,
        color: bossColor,
        scoreValue: 5000 + gs.currentSectorLevel * 1200,
        creditsValue: 250 + gs.currentSectorLevel * 60,
        shootCooldown: Math.max(480, 820 - gs.currentSectorLevel * 65),
        lastShootTime: performance.now(),
        phase: 1,
        patternTimer: 0,
        bossInvulnerable: isLevel2, // Level 2 starts shielded by Aegis Sentinels
        bossSpiralAngle: 0,
        bossBeamCharging: false,
        bossBeamChargeTimer: 0,
        bossBeamActive: false,
        bossBeamActiveTimer: 0,
        bossBeamX: canvasWidth / 2,
        bossBeamWidth: 50,
        bossTeleportTimer: 180,
      };

      gs.enemies.push(bossEnemy);

      // Level 2 Special Mechanic: Summon 2 Aegis Escorts protecting Obsidian Vanguard!
      if (isLevel2) {
        const escort1 = 999991;
        const escort2 = 999992;
        bossEnemy.escortSentinelIds = [escort1, escort2];

        gs.enemies.push({
          id: escort1,
          type: 'sentinel',
          x: canvasWidth / 2 - 85,
          y: -90,
          vx: 0,
          vy: 1.1,
          hp: 140 + gs.wave * 12,
          maxHp: 140 + gs.wave * 12,
          radius: 24,
          color: '#10b981',
          scoreValue: 450,
          creditsValue: 35,
          shootCooldown: 2200,
          lastShootTime: performance.now(),
          patternTimer: 0,
          tetherTargetId: bossId,
        });

        gs.enemies.push({
          id: escort2,
          type: 'sentinel',
          x: canvasWidth / 2 + 85,
          y: -90,
          vx: 0,
          vy: 1.1,
          hp: 140 + gs.wave * 12,
          maxHp: 140 + gs.wave * 12,
          radius: 24,
          color: '#10b981',
          scoreValue: 450,
          creditsValue: 35,
          shootCooldown: 2200,
          lastShootTime: performance.now() + 600,
          patternTimer: 0,
          tetherTargetId: bossId,
        });
      }
    };

    // Game Loop
    const loop = (currentTime: number) => {
      animFrameId = requestAnimationFrame(loop);
      if (isPaused) return;

      const dt = Math.min(currentTime - lastTime, 64);
      lastTime = currentTime;

      const width = canvas.width;
      const height = canvas.height;
      const gs = gameStateRef.current;
      const player = gs.player;

      // Handle screen shake
      if (gs.screenShake > 0) {
        gs.screenShake *= 0.9;
        if (gs.screenShake < 0.2) gs.screenShake = 0;
      }

      // Check Boss Spawn trigger
      if (gs.score >= gs.bossSpawnScore && !gs.isBossFight) {
        spawnBoss(width);
        gs.bossSpawnScore += 6000;
      }

      // Player Movement Logic
      let moveX = 0;
      let moveY = 0;
      const keys = keysRef.current;
      const ck = controls.customKeys || DEFAULT_CONTROLS.customKeys;

      // 1. Keyboard Controls (WASD / Arrows / Custom keys)
      if (controls.pcMovementMode !== 'mouse_follow') {
        if (keys[ck.moveLeft] || keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys[ck.moveRight] || keys['KeyD'] || keys['ArrowRight']) moveX += 1;
        if (keys[ck.moveUp] || keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
        if (keys[ck.moveDown] || keys['KeyS'] || keys['ArrowDown']) moveY += 1;
      }

      const effectiveSpeed = player.isDashing ? ship.dashSpeed : moveSpeed;

      // Apply Keyboard movement if active
      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        player.x += (moveX / len) * effectiveSpeed;
        player.y += (moveY / len) * effectiveSpeed;
        player.tilt = moveX * 0.35;
      }

      // 2. PC Mouse Steering (if mouse is active inside canvas & not touching)
      const mouse = mousePosRef.current;
      if (
        (controls.pcMovementMode === 'mouse_follow' || controls.pcMovementMode === 'hybrid') &&
        mouse.active &&
        !touchStateRef.current.active
      ) {
        const dx = mouse.x - player.x;
        const dy = mouse.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const mSpeed =
            (player.isDashing ? ship.dashSpeed : moveSpeed) * controls.mouseSensitivity * 1.35;
          const step = Math.min(dist, mSpeed);
          player.x += (dx / dist) * step;
          player.y += (dy / dist) * step;
          player.tilt = Math.max(-0.6, Math.min(0.6, dx / 35));
        } else if (moveX === 0) {
          player.tilt *= 0.8;
        }
      }

      // 3. Mobile Touch Gestures & Schemes
      const touchState = touchStateRef.current;
      if (touchState.active) {
        if (controls.mobileMovementMode === 'finger_drag') {
          // Direct Touch Follow with Ergonomic Finger Y-Offset!
          const targetY = touchState.currentY - (controls.fingerYOffset ?? 45);
          const dx = touchState.currentX - player.x;
          const dy = targetY - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 4) {
            const tSpeed =
              (player.isDashing ? ship.dashSpeed : moveSpeed) * controls.touchSensitivity * 1.45;
            const step = Math.min(dist, tSpeed);
            player.x += (dx / dist) * step;
            player.y += (dy / dist) * step;
            player.tilt = Math.max(-0.6, Math.min(0.6, dx / 30));
          } else {
            player.tilt *= 0.8;
          }
        } else if (controls.mobileMovementMode === 'virtual_joystick' && touchState.joystickActive) {
          const jdx = touchState.joystickKnobX - touchState.joystickOriginX;
          const jdy = touchState.joystickKnobY - touchState.joystickOriginY;
          const jdist = Math.hypot(jdx, jdy);
          if (jdist > 6) {
            const maxRadius = 45;
            const ratio = Math.min(1, jdist / maxRadius);
            const jspeed = effectiveSpeed * controls.touchSensitivity * ratio;
            player.x += (jdx / jdist) * jspeed;
            player.y += (jdy / jdist) * jspeed;
            player.tilt = (jdx / jdist) * 0.35 * ratio;
          } else {
            player.tilt *= 0.8;
          }
        } else if (controls.mobileMovementMode === 'relative_drag') {
          const deltaX = (touchState.currentX - touchState.startX) * controls.touchSensitivity;
          const deltaY = (touchState.currentY - touchState.startY) * controls.touchSensitivity;
          player.x = touchState.playerStartX + deltaX;
          player.y = touchState.playerStartY + deltaY;
          player.tilt = Math.max(-0.5, Math.min(0.5, deltaX * 0.04));
        }
      }

      if (moveX === 0 && !mouse.active && !touchState.active) {
        player.tilt *= 0.8;
      }

      // Constrain player to screen bounds
      player.x = Math.max(30, Math.min(width - 30, player.x));
      player.y = Math.max(50, Math.min(height - 50, player.y));

      // Dash timers
      if (player.dashTimer > 0) {
        player.dashTimer--;
        if (player.dashTimer <= 0) player.isDashing = false;
      }
      if (player.dashCooldown > 0) player.dashCooldown--;

      // EMP gradual recharge
      if (player.empCharge < 100) {
        player.empCharge = Math.min(100, player.empCharge + 0.05 * empBonus);
        setHudEmp(Math.floor(player.empCharge));
      }

      // Shield Regen (if not taking damage for 4 seconds)
      player.shieldRegenTimer += dt;
      if (player.shieldRegenTimer > 4000 && player.shield < maxShield) {
        player.shield = Math.min(maxShield, player.shield + 0.25);
        setHudShield(Math.floor(player.shield));
      }

      // Powerup Timers
      if (player.powerupTripleTimer > 0) {
        player.powerupTripleTimer -= dt;
        if (player.powerupTripleTimer <= 0) setWeaponMode('Standard');
      }
      if (player.powerupRapidTimer > 0) {
        player.powerupRapidTimer -= dt;
      }

      // Player Firing Logic
      const isAuto = touchState.active
        ? controls.mobileFireMode === 'auto'
        : controls.pcFireMode === 'auto';

      const isFiring =
        isAuto ||
        keys[ck.fire] ||
        keys['Space'] ||
        keys['KeyJ'] ||
        mouse.isDown ||
        touchState.isManualFiring;
      const currentDelay = player.powerupRapidTimer > 0 ? attackDelay * 0.55 : attackDelay;

      if (isFiring && currentTime - gs.lastShootTime >= currentDelay) {
        gs.lastShootTime = currentTime;
        gs.shotsFired++;
        sound.playLaser(ship.weaponType === 'heavy_cannon' ? 'heavy' : 'player');

        const bulletColor = ship.primaryColor;
        const bSpeed = -13;

        if (player.powerupTripleTimer > 0 || ship.weaponType === 'twin_laser') {
          // Triple / Spread Shot
          gs.projectiles.push(
            {
              x: player.x - 14,
              y: player.y - 12,
              vx: -1.5,
              vy: bSpeed,
              radius: 4,
              color: bulletColor,
              damage: 22,
              isPlayer: true,
            },
            {
              x: player.x,
              y: player.y - 18,
              vx: 0,
              vy: bSpeed,
              radius: 4,
              color: bulletColor,
              damage: 26,
              isPlayer: true,
            },
            {
              x: player.x + 14,
              y: player.y - 12,
              vx: 1.5,
              vy: bSpeed,
              radius: 4,
              color: bulletColor,
              damage: 22,
              isPlayer: true,
            }
          );
        } else if (ship.weaponType === 'heavy_cannon') {
          // Heavy Cannon: Piercing plasma blast
          gs.projectiles.push(
            {
              x: player.x - 12,
              y: player.y - 10,
              vx: 0,
              vy: bSpeed * 0.9,
              radius: 6,
              color: '#bd00ff',
              damage: 45,
              isPlayer: true,
              piercing: true,
            },
            {
              x: player.x + 12,
              y: player.y - 10,
              vx: 0,
              vy: bSpeed * 0.9,
              radius: 6,
              color: '#bd00ff',
              damage: 45,
              isPlayer: true,
              piercing: true,
            }
          );
        } else {
          // Standard Twin Plasma
          gs.projectiles.push(
            {
              x: player.x - 10,
              y: player.y - 12,
              vx: 0,
              vy: bSpeed,
              radius: 3.5,
              color: bulletColor,
              damage: 25,
              isPlayer: true,
            },
            {
              x: player.x + 10,
              y: player.y - 12,
              vx: 0,
              vy: bSpeed,
              radius: 3.5,
              color: bulletColor,
              damage: 25,
              isPlayer: true,
            }
          );
        }

        // Engine recoil particle
        gs.particles.push({
          x: player.x,
          y: player.y + 15,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 4 + 2,
          radius: 3,
          color: '#ffdd00',
          alpha: 0.8,
          decay: 0.08,
        });
      }

      // Spawn regular enemies
      spawnEnemy(width);

      // Update Wave
      const waveThreshold = gs.wave * 1200;
      if (gs.score > waveThreshold && !gs.isBossFight) {
        gs.wave++;
        gs.floatingTexts.push({
          id: Math.random(),
          text: `WAVE ${gs.wave} DETECTED`,
          x: width / 2,
          y: height * 0.3,
          color: '#00f0ff',
          alpha: 1,
          vy: -1,
        });
      }

      // Combo Decay
      if (gs.comboTimer > 0) {
        gs.comboTimer -= dt;
        if (gs.comboTimer <= 0) {
          gs.comboCount = 0;
          setCombo(1);
        }
      }

      // UPDATE PROJECTILES
      for (let i = gs.projectiles.length - 1; i >= 0; i--) {
        const p = gs.projectiles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Despawn off-screen
        if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) {
          gs.projectiles.splice(i, 1);
          continue;
        }

        // Mortar Cluster Detonation
        if (p.isMortarCluster && !p.isPlayer && p.vy > 0 && p.y > height * 0.6) {
          sound.playExplosion(false);
          gs.screenShake = 6;
          for (let b = 0; b < 6; b++) {
            const angle = (b / 6) * Math.PI * 2;
            gs.projectiles.push({
              x: p.x,
              y: p.y,
              vx: Math.cos(angle) * 4.2,
              vy: Math.sin(angle) * 4.2,
              radius: 4,
              color: '#f59e0b',
              damage: 14,
              isPlayer: false,
            });
          }
          for (let k = 0; k < 8; k++) {
            gs.particles.push({
              x: p.x,
              y: p.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              radius: 3,
              color: '#f97316',
              alpha: 1,
              decay: 0.08,
            });
          }
          gs.projectiles.splice(i, 1);
          continue;
        }

        // PLAYER PROJECTILE vs ENEMIES
        if (p.isPlayer) {
          let hitEnemy = false;
          for (let j = gs.enemies.length - 1; j >= 0; j--) {
            const en = gs.enemies[j];
            const dist = Math.hypot(p.x - en.x, p.y - en.y);
            if (dist < en.radius + p.radius) {
              hitEnemy = true;
              gs.shotsHit++;

              // Check if shielded by Aegis Sentinel or Boss Invulnerability
              if (en.bossInvulnerable || (en.isShielded && en.type !== 'sentinel')) {
                sound.playShieldHit();
                gs.floatingTexts.push({
                  id: Math.random(),
                  text: en.bossInvulnerable ? 'IMMUNE (DESTROY ESCORTS)' : 'SHIELDED',
                  x: en.x,
                  y: en.y - 14,
                  color: en.bossInvulnerable ? '#f43f5e' : '#10b981',
                  alpha: 1,
                  vy: -1.2,
                });
                for (let k = 0; k < 5; k++) {
                  gs.particles.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    radius: 2.5,
                    color: en.bossInvulnerable ? '#f43f5e' : '#10b981',
                    alpha: 1,
                    decay: 0.08,
                  });
                }
                break;
              }

              // Stalker cloaked resistance
              let effectiveDamage = p.damage;
              if (en.type === 'stalker' && en.cloaked) {
                effectiveDamage = Math.max(3, Math.round(p.damage * 0.25));
                for (let k = 0; k < 3; k++) {
                  gs.particles.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    radius: 2,
                    color: '#a855f7',
                    alpha: 1,
                    decay: 0.12,
                  });
                }
              }

              en.hp -= effectiveDamage;

              // Spark FX
              for (let k = 0; k < 3; k++) {
                gs.particles.push({
                  x: p.x,
                  y: p.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  radius: 2,
                  color: p.color,
                  alpha: 1,
                  decay: 0.1,
                });
              }

              // Enemy Dead?
              if (en.hp <= 0) {
                sound.playExplosion(en.type === 'boss');
                gs.enemiesKilled++;
                gs.screenShake = en.type === 'boss' ? 24 : 4;

                // Release any shielded ally if sentinel dies
                if (en.type === 'sentinel' && en.tetherTargetId) {
                  const ally = gs.enemies.find((e) => e.id === en.tetherTargetId);
                  if (ally) ally.isShielded = false;
                }

                // Increase combo
                gs.comboCount++;
                gs.comboTimer = 2500;
                const multiplier = Math.min(5, 1 + Math.floor(gs.comboCount / 4) * 0.5);
                setCombo(multiplier);

                const earnedPoints = Math.round(en.scoreValue * multiplier);
                const earnedCredits = Math.round(en.creditsValue * (1 + (multiplier - 1) * 0.2));
                gs.score += earnedPoints;
                gs.creditsSession += earnedCredits;
                setHudScore(gs.score);
                setHudCredits(gs.creditsSession);
                onUpdateCredits(earnedCredits);

                // Floating text
                gs.floatingTexts.push({
                  id: Math.random(),
                  text: `+${earnedPoints}`,
                  x: en.x,
                  y: en.y - 15,
                  color: en.type === 'boss' ? '#ffe600' : '#00f0ff',
                  alpha: 1,
                  vy: -1.5,
                });

                // Spawn Explosion debris
                const particleCount = en.type === 'boss' ? 60 : 16;
                for (let k = 0; k < particleCount; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = Math.random() * (en.type === 'boss' ? 9 : 4) + 1;
                  gs.particles.push({
                    x: en.x,
                    y: en.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    radius: Math.random() * (en.type === 'boss' ? 6 : 3) + 1.5,
                    color: Math.random() < 0.5 ? en.color : '#ffe600',
                    alpha: 1,
                    decay: en.type === 'boss' ? 0.02 : 0.05,
                  });
                }

                // Drop items / Powerups
                const dropRand = Math.random();
                if (en.type === 'boss') {
                  // Boss drops multiple high-value powerups & credits
                  for (let d = 0; d < 6; d++) {
                    gs.drops.push({
                      id: Math.random(),
                      type: d === 0 ? 'shield' : d === 1 ? 'emp' : 'credit',
                      x: en.x + (Math.random() - 0.5) * 80,
                      y: en.y + (Math.random() - 0.5) * 40,
                      vx: (Math.random() - 0.5) * 3,
                      vy: Math.random() * 2 + 1,
                      radius: 12,
                      duration: 12000,
                      color: '#ffe600',
                    });
                  }
                  gs.isBossFight = false;
                  setBossActive(false);

                  // Sector Progression & Warp Transition!
                  const nextLevel = Math.min(SECTOR_LEVELS.length, gs.currentSectorLevel + 1);
                  if (nextLevel > gs.currentSectorLevel) {
                    gs.currentSectorLevel = nextLevel;
                    const nextSec = SECTOR_LEVELS[nextLevel - 1];
                    setCurrentSector(nextSec);
                    setSectorBanner({
                      title: `SECTOR CLEARED • WARPING TO ${nextSec.name}`,
                      subtitle: nextSec.subtitle,
                    });
                    gs.warpFxTimer = 220;
                    sound.playPickup('powerup');
                    gs.screenShake = 16;
                    const clearBonus = 600 * nextLevel;
                    gs.creditsSession += clearBonus;
                    setHudCredits(gs.creditsSession);
                    onUpdateCredits(clearBonus);
                  }
                } else if (dropRand < 0.45) {
                  let dropType: DropItem['type'] = 'credit';
                  let dropColor = '#ffe600';
                  if (dropRand < 0.06) {
                    dropType = 'shield';
                    dropColor = '#00f0ff';
                  } else if (dropRand < 0.12) {
                    dropType = 'repair';
                    dropColor = '#39ff14';
                  } else if (dropRand < 0.18) {
                    dropType = 'triple';
                    dropColor = '#bf00ff';
                  } else if (dropRand < 0.24) {
                    dropType = 'rapid';
                    dropColor = '#ff9900';
                  } else if (dropRand < 0.28) {
                    dropType = 'emp';
                    dropColor = '#00e5ff';
                  }

                  gs.drops.push({
                    id: Math.random(),
                    type: dropType,
                    x: en.x,
                    y: en.y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 1.8,
                    radius: 10,
                    duration: 9000,
                    color: dropColor,
                  });
                }

                gs.enemies.splice(j, 1);
              } else if (en.type === 'boss') {
                setBossHp(Math.max(0, en.hp));
              }

              if (!p.piercing) break;
            }
          }

          if (!hitEnemy) {
            for (let a = gs.asteroids.length - 1; a >= 0; a--) {
              const ast = gs.asteroids[a];
              const dist = Math.hypot(p.x - ast.x, p.y - ast.y);
              if (dist < ast.radius + p.radius) {
                hitEnemy = true;
                gs.shotsHit++;
                ast.hp -= p.damage;

                for (let k = 0; k < 3; k++) {
                  gs.particles.push({
                    x: p.x,
                    y: p.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    radius: 2,
                    color: '#94a3b8',
                    alpha: 0.9,
                    decay: 0.1,
                  });
                }

                if (ast.hp <= 0) {
                  sound.playExplosion(false);
                  gs.screenShake = 4;
                  const pts = ast.scoreValue;
                  const cr = ast.creditsValue;
                  gs.score += pts;
                  gs.creditsSession += cr;
                  setHudScore(gs.score);
                  setHudCredits(gs.creditsSession);
                  onUpdateCredits(cr);

                  // Floating text
                  gs.floatingTexts.push({
                    id: Math.random(),
                    text: `+${pts}`,
                    x: ast.x,
                    y: ast.y - 10,
                    color: '#38bdf8',
                    alpha: 1,
                    vy: -1.2,
                  });

                  for (let k = 0; k < 12; k++) {
                    const angle = Math.random() * Math.PI * 2;
                    const spd = Math.random() * 4 + 1;
                    gs.particles.push({
                      x: ast.x,
                      y: ast.y,
                      vx: Math.cos(angle) * spd,
                      vy: Math.sin(angle) * spd,
                      radius: Math.random() * 3 + 1,
                      color: '#64748b',
                      alpha: 1,
                      decay: 0.05,
                    });
                  }

                  if (Math.random() < 0.6) {
                    gs.drops.push({
                      id: Math.random(),
                      type: 'credit',
                      x: ast.x,
                      y: ast.y,
                      vx: (Math.random() - 0.5) * 2,
                      vy: Math.random() * 2 + 1,
                      radius: 10,
                      duration: 9000,
                      color: '#ffe600',
                    });
                  }
                  gs.asteroids.splice(a, 1);
                }
                break;
              }
            }
          }

          if (hitEnemy && !p.piercing) {
            gs.projectiles.splice(i, 1);
            continue;
          }
        }
        // ENEMY PROJECTILE vs PLAYER
        else {
          const distToPlayer = Math.hypot(p.x - player.x, p.y - player.y);
          if (distToPlayer < 18 + p.radius && !player.isDashing) {
            // Player takes damage
            sound.playShieldHit();
            gs.screenShake = 9;

            let remainingDmg = p.damage;
            if (player.shield > 0) {
              if (player.shield >= remainingDmg) {
                player.shield -= remainingDmg;
                remainingDmg = 0;
              } else {
                remainingDmg -= player.shield;
                player.shield = 0;
              }
              setHudShield(Math.floor(player.shield));
            }

            if (remainingDmg > 0) {
              player.hp -= remainingDmg;
              setHudHp(Math.max(0, Math.floor(player.hp)));
            }
            player.shieldRegenTimer = 0;

            // Damage sparks
            for (let k = 0; k < 6; k++) {
              gs.particles.push({
                x: player.x,
                y: player.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                radius: 3,
                color: '#ff0055',
                alpha: 1,
                decay: 0.08,
              });
            }

            // Check Player Death
            if (player.hp <= 0) {
              sound.playExplosion(true);
              gs.running = false;
              const accuracy =
                gs.shotsFired > 0 ? Math.round((gs.shotsHit / gs.shotsFired) * 100) : 0;
              onGameOver({
                score: gs.score,
                creditsEarned: gs.creditsSession,
                enemiesDestroyed: gs.enemiesKilled,
                wave: gs.wave,
                accuracy,
                shotsFired: gs.shotsFired,
                shotsHit: gs.shotsHit,
              });
              return;
            }

            gs.projectiles.splice(i, 1);
          }
        }
      }

      // UPDATE ENEMIES
      for (let i = gs.enemies.length - 1; i >= 0; i--) {
        const en = gs.enemies[i];
        en.patternTimer = (en.patternTimer || 0) + 0.04;

        if (en.type === 'boss') {
          // Check Escort Sentinels for Level 2 (Obsidian Vanguard)
          if (en.escortSentinelIds && en.escortSentinelIds.length > 0) {
            en.escortSentinelIds = en.escortSentinelIds.filter((id) =>
              gs.enemies.some((other) => other.id === id)
            );
            if (en.escortSentinelIds.length === 0) {
              en.bossInvulnerable = false;
              en.isShielded = false;
              setSectorBanner({
                title: 'VANGUARD SHIELD OFFLINE!',
                subtitle: 'OBSIDIAN VANGUARD IS NOW VULNERABLE TO FIRE',
              });
              sound.playShieldHit();
            } else {
              en.bossInvulnerable = true;
              en.isShielded = true;
            }
          }

          // Mega Ion Death Beam logic (Level 4 Carrier Overlord Prime)
          if (en.bossLevel === 4) {
            if (en.bossBeamCharging) {
              en.bossBeamChargeTimer = (en.bossBeamChargeTimer || 70) - 1;
              en.bossBeamX = en.x;
              if (Math.random() < 0.4) {
                gs.particles.push({
                  x: en.x + (Math.random() - 0.5) * 20,
                  y: en.y + 40,
                  vx: (Math.random() - 0.5) * 3,
                  vy: Math.random() * 8 + 4,
                  radius: 3,
                  color: '#f43f5e',
                  alpha: 0.9,
                  decay: 0.08,
                });
              }
              if (en.bossBeamChargeTimer <= 0) {
                en.bossBeamCharging = false;
                en.bossBeamActive = true;
                en.bossBeamActiveTimer = 65;
                sound.playLaser('heavy');
                gs.screenShake = 18;
              }
            } else if (en.bossBeamActive) {
              en.bossBeamActiveTimer = (en.bossBeamActiveTimer || 65) - 1;
              gs.screenShake = Math.max(gs.screenShake, 6);
              // Beam collision with player
              const beamHalfW = (en.bossBeamWidth || 50) / 2;
              const inBeam =
                player.x >= (en.bossBeamX || en.x) - beamHalfW - 14 &&
                player.x <= (en.bossBeamX || en.x) + beamHalfW + 14 &&
                player.y > en.y;

              if (inBeam && !player.isDashing) {
                let beamDmg = 1.2;
                if (player.shield > 0) {
                  player.shield = Math.max(0, player.shield - beamDmg * 1.5);
                  setHudShield(Math.floor(player.shield));
                } else {
                  player.hp = Math.max(0, player.hp - beamDmg);
                  setHudHp(Math.floor(player.hp));
                }
              }

              if (en.bossBeamActiveTimer <= 0) {
                en.bossBeamActive = false;
              }
            } else {
              // Trigger Mega Beam periodically
              if (Math.random() < 0.005) {
                en.bossBeamCharging = true;
                en.bossBeamChargeTimer = 75;
                en.bossBeamX = en.x;
                sound.playBeamCharge();
              }
            }
          }

          // Quantum Warp Teleportation (Level 5 Chronos Titan Prime)
          if (en.bossLevel === 5) {
            en.bossTeleportTimer = (en.bossTeleportTimer || 180) - 1;
            if (en.bossTeleportTimer <= 0) {
              en.bossTeleportTimer = 190;
              sound.playWarp();
              gs.screenShake = 12;
              // Teleport sparks
              for (let t = 0; t < 16; t++) {
                const ang = Math.random() * Math.PI * 2;
                gs.particles.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 5,
                  vy: Math.sin(ang) * 5,
                  radius: 3,
                  color: '#eab308',
                  alpha: 1,
                  decay: 0.07,
                });
              }
              en.x = 100 + Math.random() * (width - 200);
              en.y = 80 + Math.random() * 60;
            }
          }

          // Boss Flight Navigation
          if (en.bossLevel === 3) {
            // Tempest Leviathan: Undulating serpentine motion
            if (en.y < 110) en.y += 1.0;
            en.x = width / 2 + Math.sin(en.patternTimer * 1.4) * (width * 0.36);
            en.y = 110 + Math.cos(en.patternTimer * 2.4) * 28;
          } else {
            // General Boss Flight
            if (en.y < 115) {
              en.y += 1.1;
            } else {
              if (!en.bossBeamCharging && !en.bossBeamActive) {
                en.x += en.vx;
                if (en.x < 100 || en.x > width - 100) en.vx *= -1;
              }
            }
          }

          // Boss Attack Executions
          const bossEffectiveCd =
            en.hp < en.maxHp * 0.35 ? en.shootCooldown * 0.65 : en.shootCooldown;
          if (currentTime - en.lastShootTime > bossEffectiveCd) {
            en.lastShootTime = currentTime;
            sound.playLaser('enemy');

            if (en.bossLevel === 1) {
              // GOLIATH MK-I: Gatling sweep + rocket salvos
              const bulletCount = 6;
              for (let b = 0; b < bulletCount; b++) {
                const angle = Math.PI / 2 + (b - Math.floor(bulletCount / 2)) * 0.24;
                gs.projectiles.push({
                  x: en.x,
                  y: en.y + 35,
                  vx: Math.cos(angle) * 4.6,
                  vy: Math.sin(angle) * 4.6,
                  radius: 5,
                  color: en.color || '#00f0ff',
                  damage: 20,
                  isPlayer: false,
                });
              }
              // Overdrive radial burst when damaged
              if (en.hp < en.maxHp * 0.5) {
                for (let k = 0; k < 8; k++) {
                  const radAngle = (k / 8) * Math.PI * 2 + en.patternTimer;
                  gs.projectiles.push({
                    x: en.x,
                    y: en.y,
                    vx: Math.cos(radAngle) * 3.8,
                    vy: Math.sin(radAngle) * 3.8,
                    radius: 4.5,
                    color: '#00f0ff',
                    damage: 18,
                    isPlayer: false,
                  });
                }
              }
            } else if (en.bossLevel === 2) {
              // OBSIDIAN VANGUARD: Twin Railgun Snipers + Debris Shrapnel
              sound.playLaser('heavy');
              const dx = player.x - en.x;
              const dy = player.y - en.y;
              const dist = Math.hypot(dx, dy) || 1;
              // Twin sniper rails
              gs.projectiles.push(
                {
                  x: en.x - 30,
                  y: en.y + 25,
                  vx: (dx / dist) * 7.5,
                  vy: (dy / dist) * 7.5,
                  radius: 5,
                  color: '#a855f7',
                  damage: 26,
                  isPlayer: false,
                },
                {
                  x: en.x + 30,
                  y: en.y + 25,
                  vx: (dx / dist) * 7.5,
                  vy: (dy / dist) * 7.5,
                  radius: 5,
                  color: '#a855f7',
                  damage: 26,
                  isPlayer: false,
                }
              );
              // Scatter flak
              for (let f = -1; f <= 1; f++) {
                gs.projectiles.push({
                  x: en.x,
                  y: en.y + 30,
                  vx: f * 2.8,
                  vy: 4.2,
                  radius: 4,
                  color: '#e879f9',
                  damage: 16,
                  isPlayer: false,
                });
              }
            } else if (en.bossLevel === 3) {
              // TEMPEST LEVIATHAN: Cluster Mortars & EMP Lightning Arcs
              sound.playLaser('heavy');
              gs.projectiles.push(
                {
                  x: en.x - 35,
                  y: en.y + 20,
                  vx: (player.x - en.x) * 0.006 - 1.2,
                  vy: 3.4,
                  radius: 7,
                  color: '#10b981',
                  damage: 24,
                  isPlayer: false,
                  isMortarCluster: true,
                },
                {
                  x: en.x + 35,
                  y: en.y + 20,
                  vx: (player.x - en.x) * 0.006 + 1.2,
                  vy: 3.4,
                  radius: 7,
                  color: '#10b981',
                  damage: 24,
                  isPlayer: false,
                  isMortarCluster: true,
                }
              );
              // 5-way emerald wave
              for (let w = -2; w <= 2; w++) {
                gs.projectiles.push({
                  x: en.x,
                  y: en.y + 35,
                  vx: w * 2.2,
                  vy: 4.8,
                  radius: 4.5,
                  color: '#34d399',
                  damage: 18,
                  isPlayer: false,
                });
              }
            } else if (en.bossLevel === 4) {
              // CARRIER OVERLORD PRIME: Spiral bullet-hell & strike wing spawns
              en.bossSpiralAngle = ((en.bossSpiralAngle || 0) + 0.35) % (Math.PI * 2);
              for (let sp = 0; sp < 4; sp++) {
                const sAngle = (en.bossSpiralAngle || 0) + (sp * Math.PI) / 2;
                gs.projectiles.push({
                  x: en.x,
                  y: en.y + 25,
                  vx: Math.cos(sAngle) * 4.2,
                  vy: Math.sin(sAngle) * 4.2,
                  radius: 5,
                  color: '#f43f5e',
                  damage: 22,
                  isPlayer: false,
                });
              }
              // Spawn fighter drone wing
              if (gs.enemies.length < 8 && Math.random() < 0.4) {
                gs.enemies.push({
                  id: Math.random(),
                  type: 'phaser',
                  x: en.x + (Math.random() > 0.5 ? 60 : -60),
                  y: en.y + 20,
                  vx: (Math.random() - 0.5) * 2,
                  vy: 2.2,
                  hp: 55,
                  maxHp: 55,
                  radius: 20,
                  color: '#38bdf8',
                  scoreValue: 220,
                  creditsValue: 20,
                  shootCooldown: 2200,
                  lastShootTime: currentTime,
                  warpCooldown: 90,
                });
              }
            } else if (en.bossLevel === 5) {
              // CHRONOS TITAN PRIME: 16-way geometric mandala bullet curtain
              sound.playLaser('heavy');
              const rays = 16;
              const rotOffset = en.patternTimer * 1.2;
              for (let ray = 0; ray < rays; ray++) {
                const rayAngle = (ray / rays) * Math.PI * 2 + rotOffset;
                gs.projectiles.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(rayAngle) * 4.0,
                  vy: Math.sin(rayAngle) * 4.0,
                  radius: 5.5,
                  color: '#eab308',
                  damage: 25,
                  isPlayer: false,
                });
              }
              // Chrono homing bolts
              const pAngle = Math.atan2(player.y - en.y, player.x - en.x);
              gs.projectiles.push({
                x: en.x,
                y: en.y + 35,
                vx: Math.cos(pAngle) * 6.5,
                vy: Math.sin(pAngle) * 6.5,
                radius: 6,
                color: '#fde047',
                damage: 28,
                isPlayer: false,
              });
            }
          }
        } else if (en.type === 'disruptor') {
          // ION DISRUPTOR FRIGATE (Sector 3+)
          en.x += Math.sin(en.patternTimer * 0.9) * 1.8;
          en.y += en.vy * 0.9;

          // Expanding EMP Ring Pulse
          en.empPulseRadius = ((en.empPulseRadius || 0) + 1.8) % 110;
          if (en.empPulseRadius < 5) {
            // Burst particles at start of pulse
            for (let ep = 0; ep < 6; ep++) {
              const ang = (ep / 6) * Math.PI * 2;
              gs.particles.push({
                x: en.x,
                y: en.y,
                vx: Math.cos(ang) * 2,
                vy: Math.sin(ang) * 2,
                radius: 2.5,
                color: '#06b6d4',
                alpha: 0.8,
                decay: 0.1,
              });
            }
          }

          // Twin homing plasma bolts
          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 30 && en.y < height - 80) {
            en.lastShootTime = currentTime;
            sound.playLaser('enemy');
            const angToP = Math.atan2(player.y - en.y, player.x - en.x);
            gs.projectiles.push(
              {
                x: en.x - 14,
                y: en.y + 16,
                vx: Math.cos(angToP - 0.2) * 4.4,
                vy: Math.sin(angToP - 0.2) * 4.4,
                radius: 4.5,
                color: '#06b6d4',
                damage: 18,
                isPlayer: false,
              },
              {
                x: en.x + 14,
                y: en.y + 16,
                vx: Math.cos(angToP + 0.2) * 4.4,
                vy: Math.sin(angToP + 0.2) * 4.4,
                radius: 4.5,
                color: '#06b6d4',
                damage: 18,
                isPlayer: false,
              }
            );
          }
        } else if (en.type === 'phaser') {
          // QUANTUM PHASE SHIFTER (Sector 4+)
          en.warpCooldown = (en.warpCooldown || 90) - 1;
          if (en.warpCooldown <= 0) {
            en.warpCooldown = 130 + Math.random() * 40;
            sound.playWarp();
            // Quantum glitch sparks
            for (let q = 0; q < 10; q++) {
              gs.particles.push({
                x: en.x,
                y: en.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                radius: 2.5,
                color: '#38bdf8',
                alpha: 0.9,
                decay: 0.12,
              });
            }
            // Warp to flank player
            en.x = Math.max(50, Math.min(width - 50, player.x + (Math.random() > 0.5 ? 90 : -90)));
            en.y = Math.max(70, Math.min(height * 0.5, player.y - 140));

            // Instant triple laser burst!
            sound.playLaser('enemy');
            const angle = Math.atan2(player.y - en.y, player.x - en.x);
            for (let b = 0; b < 3; b++) {
              setTimeout(() => {
                if (gs.running) {
                  gs.projectiles.push({
                    x: en.x,
                    y: en.y + 12,
                    vx: Math.cos(angle) * 6.2,
                    vy: Math.sin(angle) * 6.2,
                    radius: 4,
                    color: '#38bdf8',
                    damage: 16,
                    isPlayer: false,
                  });
                }
              }, b * 90);
            }
          } else {
            en.x += Math.sin(en.patternTimer) * 1.5;
            en.y += en.vy * 0.7;
          }
        } else if (en.type === 'behemoth') {
          // SIEGE DREADNOUGHT BEHEMOTH (Sector 4+)
          en.x += Math.sin(en.patternTimer * 0.5) * 0.8;
          en.y += en.vy * 0.75;
          en.turretAngle = Math.atan2(player.y - en.y, player.x - en.x);

          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 30 && en.y < height - 80) {
            en.lastShootTime = currentTime;
            sound.playLaser('heavy');
            // Dual heavy turret cannons
            const tAng = en.turretAngle || Math.PI / 2;
            gs.projectiles.push(
              {
                x: en.x - 16,
                y: en.y + 18,
                vx: Math.cos(tAng) * 5.2,
                vy: Math.sin(tAng) * 5.2,
                radius: 6,
                color: '#e11d48',
                damage: 26,
                isPlayer: false,
              },
              {
                x: en.x + 16,
                y: en.y + 18,
                vx: Math.cos(tAng) * 5.2,
                vy: Math.sin(tAng) * 5.2,
                radius: 6,
                color: '#e11d48',
                damage: 26,
                isPlayer: false,
              }
            );
            // 4-way broadside flak
            for (let bs = -2; bs <= 2; bs += 4) {
              gs.projectiles.push({
                x: en.x,
                y: en.y + 20,
                vx: bs * 1.8,
                vy: 4.2,
                radius: 4,
                color: '#fb7185',
                damage: 16,
                isPlayer: false,
              });
            }
          }
        } else if (en.type === 'minelayer') {
          // SINGULARITY MINELAYER (Sector 5+)
          en.x += en.vx * 1.8;
          if (en.x < 60 || en.x > width - 60) en.vx *= -1;
          if (en.y < 120) en.y += 0.8;

          // Deploy floating proximity mines
          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 50) {
            en.lastShootTime = currentTime;
            sound.playLaser('enemy');
            gs.projectiles.push({
              x: en.x,
              y: en.y + 25,
              vx: 0,
              vy: 0.9,
              radius: 9,
              color: '#f59e0b',
              damage: 32,
              isPlayer: false,
              isMortarCluster: true, // will explode into shrapnel
            });
            for (let m = 0; m < 5; m++) {
              gs.particles.push({
                x: en.x,
                y: en.y + 25,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 2,
                radius: 2.5,
                color: '#f59e0b',
                alpha: 1,
                decay: 0.08,
              });
            }
          }
        } else if (en.type === 'carrier_drone') {
          // NANITE RECONSTRUCTOR HIVE (Sector 5+)
          en.x += en.vx + Math.sin(en.patternTimer * 1.2) * 1.6;
          en.y += en.vy * 0.8;

          // Find damaged ally to repair
          const damagedAlly = gs.enemies.find(
            (other) => other.id !== en.id && other.hp < other.maxHp
          );
          if (damagedAlly) {
            en.healTargetId = damagedAlly.id;
            damagedAlly.hp = Math.min(damagedAlly.maxHp, damagedAlly.hp + 0.3);
            if (Math.random() < 0.25) {
              gs.particles.push({
                x: damagedAlly.x + (Math.random() - 0.5) * damagedAlly.radius,
                y: damagedAlly.y + (Math.random() - 0.5) * damagedAlly.radius,
                vx: 0,
                vy: -1.5,
                radius: 2,
                color: '#84cc16',
                alpha: 0.9,
                decay: 0.1,
              });
            }
          } else {
            en.healTargetId = undefined;
          }

          // Defensive bio-plasma darts
          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 30 && en.y < height - 80) {
            en.lastShootTime = currentTime;
            sound.playLaser('enemy');
            const angle = Math.atan2(player.y - en.y, player.x - en.x);
            gs.projectiles.push({
              x: en.x,
              y: en.y + 14,
              vx: Math.cos(angle) * 5.0,
              vy: Math.sin(angle) * 5.0,
              radius: 4,
              color: '#84cc16',
              damage: 16,
              isPlayer: false,
            });
          }
        } else if (en.type === 'stalker') {
          // STEALTH STALKER: Optical Cloaking & Sniper Rail
          en.x += Math.cos(en.patternTimer * 0.8) * 2.2;
          en.y += en.vy * 0.8;

          if (en.cloaked) {
            en.cloakTimer = (en.cloakTimer || 140) - 1;
            en.cloakAlpha = Math.max(0.14, (en.cloakAlpha || 1) - 0.03);
            if (en.cloakTimer <= 0) {
              en.cloaked = false;
              en.isChargingBeam = true;
              en.chargeLaserTimer = 65;
            }
          } else if (en.isChargingBeam) {
            en.cloakAlpha = Math.min(1, (en.cloakAlpha || 0) + 0.06);
            en.aimedPlayerX = player.x;
            en.aimedPlayerY = player.y;
            en.chargeLaserTimer = (en.chargeLaserTimer || 0) - 1;

            if (en.chargeLaserTimer <= 0) {
              sound.playLaser('heavy');
              const dx = player.x - en.x;
              const dy = player.y - en.y;
              const dist = Math.hypot(dx, dy) || 1;
              gs.projectiles.push({
                x: en.x,
                y: en.y + 15,
                vx: (dx / dist) * 9.5,
                vy: (dy / dist) * 9.5,
                radius: 5,
                color: '#a855f7',
                damage: 26,
                isPlayer: false,
              });
              en.isChargingBeam = false;
              en.cloaked = true;
              en.cloakTimer = 180;
            }
          }
        } else if (en.type === 'mortar') {
          // PLASMA MORTAR: Heavy Cluster Battery
          if (en.y < 115) {
            en.y += en.vy;
          } else {
            en.x += Math.sin(en.patternTimer * 0.7) * 1.4;
            en.y += Math.sin(en.patternTimer * 1.5) * 0.3;
          }

          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 30) {
            en.lastShootTime = currentTime;
            sound.playLaser('heavy');
            gs.projectiles.push({
              x: en.x,
              y: en.y + 20,
              vx: (player.x - en.x) * 0.007,
              vy: 3.2,
              radius: 8,
              color: '#f59e0b',
              damage: 22,
              isPlayer: false,
              isMortarCluster: true,
            });
          }
        } else if (en.type === 'sentinel') {
          // AEGIS SENTINEL: Escort Shielder
          if (!en.tetherTargetId) {
            const ally = gs.enemies.find(
              (e) => e.id !== en.id && e.type !== 'sentinel' && !e.isShielded
            );
            if (ally) {
              en.tetherTargetId = ally.id;
              ally.isShielded = true;
            }
          }

          const targetAlly = en.tetherTargetId
            ? gs.enemies.find((e) => e.id === en.tetherTargetId)
            : null;

          if (targetAlly) {
            targetAlly.isShielded = true;
            const targetX = targetAlly.x + (en.id % 2 === 0 ? -48 : 48);
            const targetY = targetAlly.y + 12;
            en.x += (targetX - en.x) * 0.05;
            en.y += (targetY - en.y) * 0.05;
          } else {
            en.tetherTargetId = undefined;
            en.x += en.vx + Math.sin(en.patternTimer) * 1.2;
            en.y += en.vy;
          }

          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 20 && en.y < height - 100) {
            en.lastShootTime = currentTime;
            sound.playLaser('enemy');
            const angle = Math.atan2(player.y - en.y, player.x - en.x);
            gs.projectiles.push({
              x: en.x,
              y: en.y + 15,
              vx: Math.cos(angle) * 4.6,
              vy: Math.sin(angle) * 4.6,
              radius: 4,
              color: '#10b981',
              damage: 14,
              isPlayer: false,
            });
          }
        } else if (en.type === 'swarmer') {
          // KAMIKAZE SWARMER: High-Speed Divebomb
          if (!en.isDiving) {
            en.x += (player.x - en.x) * 0.07;
            en.y += en.vy;
            en.diveTimer = (en.diveTimer || 0) + 1;
            if (en.diveTimer > 55 || Math.abs(player.x - en.x) < 22) {
              en.isDiving = true;
              sound.playLaser('heavy');
            }
          } else {
            en.vy = Math.min(11, en.vy + 0.35);
            en.y += en.vy;
            if (Math.random() < 0.6) {
              gs.particles.push({
                x: en.x + (Math.random() - 0.5) * 6,
                y: en.y - 12,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 4 - 2,
                radius: 2.5,
                color: '#ef4444',
                alpha: 0.9,
                decay: 0.1,
              });
            }

            const distToPlayer = Math.hypot(en.x - player.x, en.y - player.y);
            if (distToPlayer < en.radius + 24) {
              sound.playExplosion(false);
              gs.screenShake = 14;
              if (!player.isDashing) {
                player.hp -= 28;
                setHudHp(Math.max(0, Math.floor(player.hp)));
              }
              for (let k = 0; k < 18; k++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * 6 + 1;
                gs.particles.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  radius: Math.random() * 4 + 1.5,
                  color: '#ef4444',
                  alpha: 1,
                  decay: 0.06,
                });
              }
              gs.enemies.splice(i, 1);
              continue;
            }
          }
        } else {
          // Regular enemy movement
          en.x += en.vx + Math.sin(en.patternTimer) * 1.5;
          en.y += en.vy;

          // Enemy shooting
          if (currentTime - en.lastShootTime > en.shootCooldown && en.y > 20 && en.y < height - 100) {
            en.lastShootTime = currentTime;
            sound.playLaser('enemy');

            if (en.type === 'cruiser') {
              // Twin heavy blasts
              gs.projectiles.push(
                {
                  x: en.x - 12,
                  y: en.y + 20,
                  vx: 0,
                  vy: 5.5,
                  radius: 5,
                  color: '#bf00ff',
                  damage: 20,
                  isPlayer: false,
                },
                {
                  x: en.x + 12,
                  y: en.y + 20,
                  vx: 0,
                  vy: 5.5,
                  radius: 5,
                  color: '#bf00ff',
                  damage: 20,
                  isPlayer: false,
                }
              );
            } else {
              // Aimed shot towards player
              const dx = player.x - en.x;
              const dy = player.y - en.y;
              const dist = Math.hypot(dx, dy) || 1;
              gs.projectiles.push({
                x: en.x,
                y: en.y + 12,
                vx: (dx / dist) * 4.5,
                vy: (dy / dist) * 4.5,
                radius: 3.5,
                color: '#ff3366',
                damage: 12,
                isPlayer: false,
              });
            }
          }

          // Enemy ship collision with player
          const distToPlayer = Math.hypot(en.x - player.x, en.y - player.y);
          if (distToPlayer < en.radius + 18 && !player.isDashing) {
            sound.playShieldHit();
            player.hp -= 25;
            setHudHp(Math.max(0, Math.floor(player.hp)));
            en.hp -= 40;
            gs.screenShake = 12;

            if (player.hp <= 0) {
              sound.playExplosion(true);
              gs.running = false;
              onGameOver({
                score: gs.score,
                creditsEarned: gs.creditsSession,
                enemiesDestroyed: gs.enemiesKilled,
                wave: gs.wave,
                accuracy:
                  gs.shotsFired > 0 ? Math.round((gs.shotsHit / gs.shotsFired) * 100) : 0,
                shotsFired: gs.shotsFired,
                shotsHit: gs.shotsHit,
              });
              return;
            }
          }

          // Despawn when passed bottom
          if (en.y > height + 60) {
            gs.enemies.splice(i, 1);
          }
        }
      }

      // UPDATE ASTEROID HAZARDS
      for (let a = gs.asteroids.length - 1; a >= 0; a--) {
        const ast = gs.asteroids[a];
        ast.x += ast.vx;
        ast.y += ast.vy;
        ast.rotation += ast.rotSpeed;

        // Collision with player
        const distToPlayer = Math.hypot(ast.x - player.x, ast.y - player.y);
        if (distToPlayer < ast.radius + 18) {
          if (player.isDashing) {
            // Ramming through asteroid with boost dash!
            sound.playExplosion(false);
            gs.screenShake = 6;
            const pts = ast.scoreValue * 2;
            gs.score += pts;
            setHudScore(gs.score);
            gs.floatingTexts.push({
              id: Math.random(),
              text: `RAM STRIKE +${pts}`,
              x: ast.x,
              y: ast.y - 12,
              color: '#ffe600',
              alpha: 1,
              vy: -1.5,
            });
            for (let k = 0; k < 12; k++) {
              gs.particles.push({
                x: ast.x,
                y: ast.y,
                vx: (Math.random() - 0.5) * 7,
                vy: (Math.random() - 0.5) * 7,
                radius: 3,
                color: '#64748b',
                alpha: 1,
                decay: 0.06,
              });
            }
            gs.asteroids.splice(a, 1);
            continue;
          } else {
            sound.playShieldHit();
            gs.screenShake = 12;
            player.hp -= 20;
            setHudHp(Math.max(0, Math.floor(player.hp)));
            ast.hp -= 30;

            if (player.hp <= 0) {
              sound.playExplosion(true);
              gs.running = false;
              onGameOver({
                score: gs.score,
                creditsEarned: gs.creditsSession,
                enemiesDestroyed: gs.enemiesKilled,
                wave: gs.wave,
                accuracy: gs.shotsFired > 0 ? Math.round((gs.shotsHit / gs.shotsFired) * 100) : 0,
                shotsFired: gs.shotsFired,
                shotsHit: gs.shotsHit,
              });
              return;
            }

            if (ast.hp <= 0) {
              gs.asteroids.splice(a, 1);
              continue;
            }
          }
        }

        // Despawn off bottom
        if (ast.y > height + 60) {
          gs.asteroids.splice(a, 1);
        }
      }

      // UPDATE DROPS & TRACTOR BEAM
      for (let i = gs.drops.length - 1; i >= 0; i--) {
        const d = gs.drops[i];
        d.x += d.vx;
        d.y += d.vy;

        // Magnet attraction towards player
        const dist = Math.hypot(player.x - d.x, player.y - d.y);
        if (dist < magnetRadius) {
          const pull = 5.5;
          d.vx += ((player.x - d.x) / dist) * pull;
          d.vy += ((player.y - d.y) / dist) * pull;
        }

        // Pickup collision
        if (dist < 26) {
          sound.playPickup(d.type === 'credit' ? 'credit' : 'powerup');

          if (d.type === 'credit') {
            const val = 15;
            gs.creditsSession += val;
            setHudCredits(gs.creditsSession);
            onUpdateCredits(val);
            gs.floatingTexts.push({
              id: Math.random(),
              text: `+${val} CR`,
              x: d.x,
              y: d.y,
              color: '#ffe600',
              alpha: 1,
              vy: -1.5,
            });
          } else if (d.type === 'shield') {
            player.shield = maxShield;
            setHudShield(maxShield);
            gs.floatingTexts.push({
              id: Math.random(),
              text: 'SHIELDS RESTORED',
              x: player.x,
              y: player.y - 25,
              color: '#00f0ff',
              alpha: 1,
              vy: -1.5,
            });
          } else if (d.type === 'repair') {
            player.hp = Math.min(maxHp, player.hp + 45);
            setHudHp(Math.floor(player.hp));
            gs.floatingTexts.push({
              id: Math.random(),
              text: '+45 HP REPAIR',
              x: player.x,
              y: player.y - 25,
              color: '#39ff14',
              alpha: 1,
              vy: -1.5,
            });
          } else if (d.type === 'triple') {
            player.powerupTripleTimer = 10000;
            setWeaponMode('Hyper Spread');
            gs.floatingTexts.push({
              id: Math.random(),
              text: 'HYPER SPREAD ENGAGED',
              x: player.x,
              y: player.y - 25,
              color: '#bf00ff',
              alpha: 1,
              vy: -1.5,
            });
          } else if (d.type === 'rapid') {
            player.powerupRapidTimer = 8000;
            setWeaponMode('Overdrive Rapid');
            gs.floatingTexts.push({
              id: Math.random(),
              text: 'OVERDRIVE RAPID FIRE',
              x: player.x,
              y: player.y - 25,
              color: '#ff9900',
              alpha: 1,
              vy: -1.5,
            });
          } else if (d.type === 'emp') {
            player.empCharge = 100;
            setHudEmp(100);
            gs.floatingTexts.push({
              id: Math.random(),
              text: 'EMP OVERCHARGED',
              x: player.x,
              y: player.y - 25,
              color: '#00e5ff',
              alpha: 1,
              vy: -1.5,
            });
          }

          gs.drops.splice(i, 1);
          continue;
        }

        if (d.y > height + 40) {
          gs.drops.splice(i, 1);
        }
      }

      // UPDATE PARTICLES
      for (let i = gs.particles.length - 1; i >= 0; i--) {
        const pt = gs.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;
        if (pt.alpha <= 0) {
          gs.particles.splice(i, 1);
        }
      }

      // UPDATE FLOATING TEXTS
      for (let i = gs.floatingTexts.length - 1; i >= 0; i--) {
        const ft = gs.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.018;
        if (ft.alpha <= 0) {
          gs.floatingTexts.splice(i, 1);
        }
      }

      // UPDATE EMP SHOCKWAVE
      if (gs.empShockwave) {
        gs.empShockwave.radius += 24;
        if (gs.empShockwave.radius >= gs.empShockwave.maxRadius) {
          gs.empShockwave = null;
        }
      }

      // UPDATE PARALLAX STARS
      for (let s of gs.stars) {
        s.y += s.speed * (player.isDashing ? 4 : 1);
        if (s.y > height) {
          s.y = 0;
          s.x = Math.random() * width;
        }
      }

      // ==========================================
      // RENDERING SECTION
      // ==========================================
      ctx.save();

      // Screen Shake translation
      if (gs.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * gs.screenShake;
        const shakeY = (Math.random() - 0.5) * gs.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // Deep space backdrop
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, width, height);

      // Sector-specific Nebula atmosphere
      const nebulaColor = currentSector.nebulaColor || 'rgba(12, 28, 55, 0.45)';
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.4,
        40,
        width * 0.5,
        height * 0.5,
        width * 0.85
      );
      grad.addColorStop(0, nebulaColor);
      grad.addColorStop(0.65, 'rgba(8, 10, 24, 0.3)');
      grad.addColorStop(1, 'rgba(5, 7, 15, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Warp speed star streaks
      const isWarping = (gs.warpFxTimer || 0) > 0;
      if (isWarping) {
        gs.warpFxTimer = (gs.warpFxTimer || 0) - 1;
      }

      // Render Stars
      for (let s of gs.stars) {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        if (isWarping) {
          ctx.rect(s.x, s.y, s.size * 1.5, s.size * 22);
        } else if (player.isDashing) {
          ctx.rect(s.x, s.y, s.size, s.size * 6);
        } else {
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      // Render Drops
      for (let d of gs.drops) {
        ctx.save();
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render EMP Shockwave
      if (gs.empShockwave) {
        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(
          gs.empShockwave.x,
          gs.empShockwave.y,
          gs.empShockwave.radius,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      // Render Projectiles
      for (let p of gs.projectiles) {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        if (p.isPlayer) {
          // Elongated laser bolt
          ctx.ellipse(p.x, p.y, p.radius, p.radius * 2.5, 0, 0, Math.PI * 2);
        } else {
          // Plasma energy sphere
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }

      // Render Asteroids
      for (let ast of gs.asteroids) {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);
        ctx.shadowColor = '#475569';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const pts = 7;
        for (let p = 0; p < pts; p++) {
          const ang = (p / pts) * Math.PI * 2;
          const r = ast.radius * (0.8 + 0.3 * Math.sin(p * 2.2));
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (p === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crater details
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-ast.radius * 0.3, -ast.radius * 0.2, ast.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ast.radius * 0.25, ast.radius * 0.35, ast.radius * 0.22, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Render Sentinel Shield Tethers
      for (let en of gs.enemies) {
        if (en.type === 'sentinel' && en.tetherTargetId) {
          const ally = gs.enemies.find((e) => e.id === en.tetherTargetId);
          if (ally) {
            ctx.save();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 12;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(en.x, en.y);
            ctx.lineTo(ally.x, ally.y);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Nanite Repair Tether (Carrier Drone)
        if (en.type === 'carrier_drone' && en.healTargetId) {
          const ally = gs.enemies.find((e) => e.id === en.healTargetId);
          if (ally) {
            ctx.save();
            ctx.strokeStyle = '#84cc16';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#84cc16';
            ctx.shadowBlur = 10;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(en.x, en.y);
            ctx.lineTo(ally.x, ally.y);
            ctx.stroke();
            ctx.restore();
          }
        }

        // EMP Shockwave Ring (Disruptor)
        if (en.type === 'disruptor' && en.empPulseRadius && en.empPulseRadius > 0) {
          ctx.save();
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(en.x, en.y, en.empPulseRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Render Stalker Sniper Charging Aim Line
      for (let en of gs.enemies) {
        if (en.type === 'stalker' && en.isChargingBeam) {
          ctx.save();
          ctx.strokeStyle = Math.random() < 0.5 ? '#ec4899' : '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(en.x, en.y + 12);
          ctx.lineTo(en.aimedPlayerX || player.x, en.aimedPlayerY || player.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Render Mega Ion Death Beam (Carrier Overlord Prime)
      for (let en of gs.enemies) {
        if (en.type === 'boss' && en.bossLevel === 4) {
          const beamW = en.bossBeamWidth || 50;
          const beamX = en.bossBeamX || en.x;
          if (en.bossBeamCharging) {
            ctx.save();
            ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
            ctx.fillRect(beamX - beamW / 2, en.y, beamW, height - en.y);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(beamX - beamW / 2, en.y, beamW, height - en.y);
            ctx.restore();
          } else if (en.bossBeamActive) {
            ctx.save();
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(244, 63, 94, 0.75)';
            ctx.fillRect(beamX - beamW / 2, en.y, beamW, height - en.y);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(beamX - (beamW * 0.45) / 2, en.y, beamW * 0.45, height - en.y);
            ctx.restore();
          }
        }
      }

      // Render Enemies
      for (let en of gs.enemies) {
        ctx.save();
        ctx.translate(en.x, en.y);

        if (en.type === 'stalker') {
          ctx.globalAlpha = en.cloakAlpha ?? 1;
        }

        if (en.type === 'boss') {
          // Bespoke Dreadnought Renderings by Sector Level
          ctx.shadowColor = en.color || '#ff0033';
          ctx.shadowBlur = 24;

          if (en.bossLevel === 1) {
            // GOLIATH MK-I: Heavy Artillery Fortress
            ctx.fillStyle = '#101726';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.moveTo(0, 60);
            ctx.lineTo(65, 15);
            ctx.lineTo(55, -45);
            ctx.lineTo(25, -65);
            ctx.lineTo(-25, -65);
            ctx.lineTo(-55, -45);
            ctx.lineTo(-65, 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Blue Reactor Core
            ctx.fillStyle = '#00f0ff';
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fill();

            // Twin Gatling Cannons
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-50, -10, 10, 32);
            ctx.fillRect(40, -10, 10, 32);
          } else if (en.bossLevel === 2) {
            // OBSIDIAN VANGUARD: Sleek Delta Stealth Battlecruiser
            ctx.fillStyle = '#180829';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 70);
            ctx.lineTo(75, -25);
            ctx.lineTo(40, -55);
            ctx.lineTo(0, -35);
            ctx.lineTo(-40, -55);
            ctx.lineTo(-75, -25);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Neon Energy Conduit Wings
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(-60, -15);
            ctx.lineTo(0, 35);
            ctx.lineTo(60, -15);
            ctx.stroke();

            // Twin Railgun Muzzles
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(-22, 10, 6, 28);
            ctx.fillRect(16, 10, 6, 28);
          } else if (en.bossLevel === 3) {
            // TEMPEST LEVIATHAN: Biomechanical Jade Serpent
            ctx.fillStyle = '#042217';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3.2;

            // Segmented carapace
            for (let seg = 3; seg >= 0; seg--) {
              const segW = 68 - seg * 12;
              const segY = -45 + seg * 24;
              ctx.beginPath();
              ctx.ellipse(0, segY, segW, 16, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }

            // Emerald Wing Fins
            const finFlap = Math.sin((en.patternTimer || 0) * 3) * 10;
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-60, 0);
            ctx.lineTo(-90 + finFlap, 15);
            ctx.lineTo(-60, 30);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(60, 0);
            ctx.lineTo(90 - finFlap, 15);
            ctx.lineTo(60, 30);
            ctx.stroke();

            // Central Plasma Rib Core
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(0, 10, 16, 0, Math.PI * 2);
            ctx.fill();
          } else if (en.bossLevel === 4) {
            // CARRIER OVERLORD PRIME: Imperial Crimson Super-Carrier
            ctx.fillStyle = '#260a14';
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(0, 75);
            ctx.lineTo(75, 30);
            ctx.lineTo(65, -60);
            ctx.lineTo(20, -70);
            ctx.lineTo(-20, -70);
            ctx.lineTo(-65, -60);
            ctx.lineTo(-75, 30);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Central Spinal Mega Cannon Emitter
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(-14, 15, 28, 35);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-6, 30, 12, 22);

            // Glowing Twin Hangar Bays
            ctx.fillStyle = '#fb7185';
            ctx.fillRect(-52, -20, 16, 28);
            ctx.fillRect(36, -20, 16, 28);
          } else {
            // CHRONOS TITAN PRIME: Celestial Golden Singularity Engine
            ctx.fillStyle = '#261b04';
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 3.5;

            // Rotating Concentric Geometry Rings
            const rot = (en.patternTimer || 0) * 1.5;
            ctx.save();
            ctx.rotate(rot);
            ctx.beginPath();
            for (let c = 0; c < 8; c++) {
              const ca = (c / 8) * Math.PI * 2;
              const cx = Math.cos(ca) * 65;
              const cy = Math.sin(ca) * 65;
              if (c === 0) ctx.moveTo(cx, cy);
              else ctx.lineTo(cx, cy);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // Inner Ring
            ctx.save();
            ctx.rotate(-rot * 1.4);
            ctx.beginPath();
            for (let c = 0; c < 6; c++) {
              const ca = (c / 6) * Math.PI * 2;
              const cx = Math.cos(ca) * 44;
              const cy = Math.sin(ca) * 44;
              if (c === 0) ctx.moveTo(cx, cy);
              else ctx.lineTo(cx, cy);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();

            // Singularity Core
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (en.type === 'disruptor') {
          // Ion Disruptor Frigate (Sector 3+)
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#06202a';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(0, 22);
          ctx.lineTo(26, 4);
          ctx.lineTo(20, -22);
          ctx.lineTo(6, -14);
          ctx.lineTo(0, -24);
          ctx.lineTo(-6, -14);
          ctx.lineTo(-20, -22);
          ctx.lineTo(-26, 4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Twin Ion Fork Prongs
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(-18, 6, 5, 14);
          ctx.fillRect(13, 6, 5, 14);
        } else if (en.type === 'phaser') {
          // Quantum Phase Shifter (Sector 4+)
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#081f33';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(0, 22);
          ctx.lineTo(20, -12);
          ctx.lineTo(6, -20);
          ctx.lineTo(0, -10);
          ctx.lineTo(-6, -20);
          ctx.lineTo(-20, -12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Cyan Quantum Core
          ctx.fillStyle = '#7dd3fc';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (en.type === 'behemoth') {
          // Siege Dreadnought Behemoth (Sector 4+)
          ctx.shadowColor = '#e11d48';
          ctx.shadowBlur = 16;
          ctx.fillStyle = '#280a14';
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(0, 34);
          ctx.lineTo(34, 10);
          ctx.lineTo(28, -28);
          ctx.lineTo(-28, -28);
          ctx.lineTo(-34, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Rotating Turret Cannons
          ctx.save();
          ctx.rotate(en.turretAngle || 0);
          ctx.fillStyle = '#fb7185';
          ctx.fillRect(-4, -4, 8, 24);
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (en.type === 'minelayer') {
          // Singularity Minelayer (Sector 5+)
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#2b1704';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 26);
          ctx.lineTo(28, 12);
          ctx.lineTo(24, -22);
          ctx.lineTo(-24, -22);
          ctx.lineTo(-28, 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Rear Mine Dispenser Core
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 6, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (en.type === 'carrier_drone') {
          // Nanite Reconstructor Hive (Sector 5+)
          ctx.shadowColor = '#84cc16';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#142704';
          ctx.strokeStyle = '#84cc16';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const ha = (h / 6) * Math.PI * 2;
            const hx = Math.cos(ha) * 22;
            const hy = Math.sin(ha) * 22;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Honeycomb Core
          ctx.fillStyle = '#a3e635';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
        } else if (en.type === 'stalker') {
          // Stealth Stalker
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#1e102e';
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(0, 22);
          ctx.lineTo(24, -8);
          ctx.lineTo(12, -22);
          ctx.lineTo(0, -12);
          ctx.lineTo(-12, -22);
          ctx.lineTo(-24, -8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Railgun fin & core
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(-2, 6, 4, 16);
          ctx.fillStyle = '#e879f9';
          ctx.beginPath();
          ctx.arc(0, -2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (en.type === 'mortar') {
          // Plasma Mortar Battery
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#291403';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(0, 26);
          ctx.lineTo(28, 6);
          ctx.lineTo(22, -22);
          ctx.lineTo(-22, -22);
          ctx.lineTo(-28, 6);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mortar Cannon Barrel
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-6, -4, 12, 28);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(-3, 14, 6, 12);
        } else if (en.type === 'sentinel') {
          // Aegis Sentinel (Shield Drone)
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 16;
          ctx.fillStyle = '#06261c';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const hAngle = (h / 6) * Math.PI * 2;
            const hx = Math.cos(hAngle) * 22;
            const hy = Math.sin(hAngle) * 22;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Rotating Emerald Core
          ctx.fillStyle = '#34d399';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (en.type === 'swarmer') {
          // Kamikaze Swarmer
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#2b0707';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 18);
          ctx.lineTo(13, -12);
          ctx.lineTo(0, -6);
          ctx.lineTo(-13, -12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Core flare
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(0, 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (en.type === 'cruiser') {
          // Heavy Cruiser
          ctx.shadowColor = en.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#1e112a';
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(0, 24);
          ctx.lineTo(26, -10);
          ctx.lineTo(16, -26);
          ctx.lineTo(-16, -26);
          ctx.lineTo(-26, -10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Plasma cannon glow
          ctx.fillStyle = en.color;
          ctx.fillRect(-12, 10, 5, 12);
          ctx.fillRect(7, 10, 5, 12);
        } else if (en.type === 'interceptor') {
          // Swept-wing Interceptor
          ctx.shadowColor = en.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#1e1710';
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(0, 20);
          ctx.lineTo(20, -18);
          ctx.lineTo(0, -8);
          ctx.lineTo(-20, -18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Drone Swarm (Razor shape)
          ctx.shadowColor = en.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#190a12';
          ctx.strokeStyle = en.color;
          ctx.lineWidth = 1.8;

          ctx.beginPath();
          ctx.moveTo(0, 16);
          ctx.lineTo(14, -14);
          ctx.lineTo(0, -6);
          ctx.lineTo(-14, -14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Shield Bubble if Aegis Protected or Boss Invulnerable
        if (en.isShielded || en.bossInvulnerable) {
          ctx.save();
          const shieldColor = en.bossInvulnerable ? '#f43f5e' : '#10b981';
          ctx.strokeStyle = shieldColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = shieldColor;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, en.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = en.bossInvulnerable
            ? 'rgba(244, 63, 94, 0.18)'
            : 'rgba(16, 185, 129, 0.15)';
          ctx.fill();

          if (en.bossInvulnerable) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('IMMUNE (DESTROY ESCORTS)', 0, -en.radius - 12);
          }
          ctx.restore();
        }

        ctx.restore();
      }

      // Render Player Starfighter
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.tilt);

      // Dash trail / Invulnerability Glow
      if (player.isDashing) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 25;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shield Aura
      if (player.shield > 0) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Engine Thruster Flame
      const flameHeight = 16 + Math.random() * 12 + (player.isDashing ? 18 : 0);
      const flameGrad = ctx.createLinearGradient(0, 15, 0, 15 + flameHeight);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, ship.primaryColor);
      flameGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-7, 15);
      ctx.lineTo(0, 15 + flameHeight);
      ctx.lineTo(7, 15);
      ctx.closePath();
      ctx.fill();

      // Ship Hull Geometry
      ctx.shadowColor = ship.primaryColor;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#0a101f';
      ctx.strokeStyle = ship.primaryColor;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -26); // Nose
      ctx.lineTo(18, 16); // Right wingtip
      ctx.lineTo(8, 12); // Right inset
      ctx.lineTo(0, 18); // Engine center
      ctx.lineTo(-8, 12); // Left inset
      ctx.lineTo(-18, 16); // Left wingtip
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit Canopy Glow
      ctx.fillStyle = ship.accentColor;
      ctx.beginPath();
      ctx.ellipse(0, -6, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wing Cannons
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-15, 2, 2.5, 8);
      ctx.fillRect(12.5, 2, 2.5, 8);

      ctx.restore();

      // Render Particles
      for (let pt of gs.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Floating Combat Text
      for (let ft of gs.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = '700 16px "Orbitron", sans-serif';
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Render Mouse Reticle if enabled
      if (
        controls.mouseReticleEnabled &&
        mousePosRef.current.active &&
        !touchStateRef.current.active
      ) {
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;

        ctx.save();
        // Dotted targeting laser from ship to crosshair
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 26);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshair reticle
        ctx.strokeStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mx - 18, my);
        ctx.lineTo(mx - 14, my);
        ctx.moveTo(mx + 14, my);
        ctx.lineTo(mx + 18, my);
        ctx.moveTo(mx, my - 18);
        ctx.lineTo(mx, my - 14);
        ctx.moveTo(mx, my + 14);
        ctx.lineTo(mx, my + 18);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Virtual Joystick if active
      if (
        controls.mobileMovementMode === 'virtual_joystick' &&
        touchStateRef.current.joystickActive
      ) {
        const ox = touchStateRef.current.joystickOriginX;
        const oy = touchStateRef.current.joystickOriginY;
        const kx = touchStateRef.current.joystickKnobX;
        const ky = touchStateRef.current.joystickKnobY;

        ctx.save();
        // Outer glow base
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.fillStyle = 'rgba(0, 20, 40, 0.35)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ox, oy, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Direction indicators
        ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
        const dirOffset = 36;
        ctx.fillRect(ox - 2, oy - dirOffset - 4, 4, 8);
        ctx.fillRect(ox - 2, oy + dirOffset - 4, 4, 8);
        ctx.fillRect(ox - dirOffset - 4, oy - 2, 8, 4);
        ctx.fillRect(ox + dirOffset - 4, oy - 2, 8, 4);

        // Center stick knob
        const knobGrad = ctx.createRadialGradient(kx, ky, 2, kx, ky, 20);
        knobGrad.addColorStop(0, '#ffffff');
        knobGrad.addColorStop(0.5, '#00f0ff');
        knobGrad.addColorStop(1, '#005588');
        ctx.fillStyle = knobGrad;
        ctx.beginPath();
        ctx.arc(kx, ky, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
    };
  }, [
    isPaused,
    ship,
    maxHp,
    maxShield,
    moveSpeed,
    attackDelay,
    magnetRadius,
    empBonus,
    onGameOver,
    onUpdateCredits,
    controls,
  ]);

  // Touch Controller Listeners for Mobile & Tablets
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      const p = gameStateRef.current.player;

      const ts = touchStateRef.current;
      ts.active = true;
      ts.startX = tx;
      ts.startY = ty;
      ts.currentX = tx;
      ts.currentY = ty;
      ts.playerStartX = p.x;
      ts.playerStartY = p.y;

      if (controls.mobileMovementMode === 'virtual_joystick') {
        ts.joystickActive = true;
        ts.joystickOriginX = tx;
        ts.joystickOriginY = ty;
        ts.joystickKnobX = tx;
        ts.joystickKnobY = ty;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (touch && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;

      const ts = touchStateRef.current;
      ts.currentX = tx;
      ts.currentY = ty;

      if (controls.mobileMovementMode === 'virtual_joystick' && ts.joystickActive) {
        const dx = tx - ts.joystickOriginX;
        const dy = ty - ts.joystickOriginY;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;
        if (dist > maxRadius) {
          ts.joystickKnobX = ts.joystickOriginX + (dx / dist) * maxRadius;
          ts.joystickKnobY = ts.joystickOriginY + (dy / dist) * maxRadius;
        } else {
          ts.joystickKnobX = tx;
          ts.joystickKnobY = ty;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    const ts = touchStateRef.current;
    ts.active = false;
    ts.joystickActive = false;
  };

  return (
    <div
      ref={containerRef}
      id="game-viewport-container"
      className="relative w-full h-full select-none overflow-hidden bg-[#05070f] touch-none cursor-crosshair"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseMove={(e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          mousePosRef.current.active = true;
          mousePosRef.current.x = e.clientX - rect.left;
          mousePosRef.current.y = e.clientY - rect.top;
        }
      }}
      onMouseEnter={() => {
        mousePosRef.current.active = true;
      }}
      onMouseLeave={() => {
        mousePosRef.current.active = false;
        mousePosRef.current.isDown = false;
      }}
      onMouseDown={(e) => {
        if (e.button === 0) {
          mousePosRef.current.isDown = true;
        }
      }}
      onMouseUp={(e) => {
        if (e.button === 0) {
          mousePosRef.current.isDown = false;
        }
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Scanline CRT overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* TOP TACTICAL HUD */}
      <div className="absolute top-0 inset-x-0 p-4 pointer-events-none flex flex-col gap-2">
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          {/* Health & Shield Bars */}
          <div className="flex flex-col gap-1.5 w-48 sm:w-64 bg-black/60 backdrop-blur-md p-2.5 rounded-lg border border-cyan-500/30">
            {/* HP Bar */}
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-rose-400 flex items-center gap-1">
                HULL
              </span>
              <span className="text-zinc-300 font-mono">
                {hudHp}/{maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-rose-950">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150"
                style={{ width: `${Math.max(0, (hudHp / maxHp) * 100)}%` }}
              />
            </div>

            {/* Shield Bar */}
            <div className="flex items-center justify-between text-xs font-semibold mt-1">
              <span className="text-cyan-400">SHIELD</span>
              <span className="text-zinc-300 font-mono">
                {hudShield}/{maxShield}
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-cyan-950">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300 transition-all duration-150"
                style={{ width: `${Math.max(0, (hudShield / maxShield) * 100)}%` }}
              />
            </div>
          </div>

          {/* Center Score & Combo Banner */}
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-display">
              MISSION SCORE
            </span>
            <span className="text-2xl sm:text-3xl font-black font-display tracking-wider text-white drop-shadow-[0_0_12px_rgba(0,240,255,0.7)]">
              {hudScore.toLocaleString()}
            </span>
            {combo > 1 && (
              <span className="text-xs sm:text-sm font-bold text-amber-400 animate-pulse drop-shadow-[0_0_8px_rgba(255,230,0,0.6)]">
                {combo}X STRIKE MULTIPLIER
              </span>
            )}
          </div>

          {/* Credits, Pause & Controls Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-amber-500/30 flex items-center gap-2">
              <span className="text-amber-400 text-sm font-semibold">⚡ CR</span>
              <span className="font-mono text-amber-200 font-bold text-base">
                {hudCredits}
              </span>
            </div>

            {/* Flight Controls Calibration Button */}
            {onOpenControls && (
              <button
                id="game-controls-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenControls();
                }}
                className="pointer-events-auto w-10 h-10 rounded-lg bg-zinc-900/80 border border-zinc-700 hover:border-cyan-400 flex items-center justify-center text-zinc-300 hover:text-cyan-400 transition shadow-md"
                title="Calibrate Controls (v3.0)"
              >
                <Sliders className="w-4 h-4" />
              </button>
            )}

            {/* Pause Button */}
            <button
              id="game-pause-button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePause();
              }}
              className="pointer-events-auto w-10 h-10 rounded-lg bg-zinc-900/80 border border-zinc-700 hover:border-cyan-400 flex items-center justify-center text-zinc-300 hover:text-cyan-400 transition"
              title="Pause Game"
            >
              {isPaused ? '▶' : '❚❚'}
            </button>
          </div>
        </div>

        {/* Boss Health Bar if Boss is Active */}
        {bossActive && (
          <div className="w-full max-w-xl mx-auto bg-black/80 backdrop-blur-md p-3 rounded-lg border-2 border-rose-600 shadow-[0_0_20px_rgba(255,0,50,0.4)] animate-pulse">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400 font-display mb-1.5">
              <span>WARNING: DREADNOUGHT OMEGA</span>
              <span>{Math.round((bossHp / bossMaxHp) * 100)}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-rose-900">
              <div
                className="h-full bg-gradient-to-r from-rose-700 via-rose-500 to-amber-400 transition-all duration-200"
                style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION HUD & MOBILE CONTROLS */}
      <div
        className={`absolute bottom-4 inset-x-4 pointer-events-none flex items-end justify-between max-w-5xl mx-auto ${
          controls.buttonLayout === 'left_handed' ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Weapon & Boost Status */}
        <div className="hidden sm:flex flex-col gap-1 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-cyan-500/20 text-xs font-mono text-zinc-400">
          <div>
            SHIP: <span className="text-cyan-300 font-bold">{ship.name}</span>
          </div>
          <div>
            FIRE MODE:{' '}
            <span className="text-amber-300 font-bold">
              {controls.pcFireMode === 'auto' ? 'Auto-Fire' : weaponMode}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            [WASD/Arrows/Mouse] Fly | [Space/Click] Fire | [Shift] Dash | [E/B] EMP
          </div>
        </div>

        {/* Action Buttons (Dash, EMP, and Optional Manual Fire) */}
        <div className="pointer-events-auto flex items-center gap-3">
          {controls.mobileFireMode === 'manual' && (
            <button
              id="hud-manual-fire-button"
              onTouchStart={(e) => {
                e.stopPropagation();
                touchStateRef.current.isManualFiring = true;
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                touchStateRef.current.isManualFiring = false;
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                touchStateRef.current.isManualFiring = true;
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                touchStateRef.current.isManualFiring = false;
              }}
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-2 border-amber-400 text-amber-300 font-bold text-xs flex flex-col items-center justify-center active:scale-95 shadow-[0_0_15px_rgba(255,200,0,0.3)] transition"
              title="Hold to Fire"
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span className="text-[10px] tracking-wider">FIRE</span>
            </button>
          )}

          <button
            id="hud-dash-button"
            onClick={(e) => {
              e.stopPropagation();
              triggerDash();
            }}
            className="w-14 h-14 rounded-xl bg-zinc-900/90 border border-zinc-700 hover:border-cyan-400 active:scale-95 text-cyan-400 font-bold text-xs flex flex-col items-center justify-center transition shadow-lg"
          >
            <span>DASH</span>
            <span className="text-[10px] text-zinc-400">[SHIFT]</span>
          </button>

          <button
            id="hud-emp-button"
            onClick={(e) => {
              e.stopPropagation();
              triggerEmp();
            }}
            disabled={hudEmp < 100}
            className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-display font-black text-xs transition shadow-lg ${
              hudEmp >= 100
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-2 border-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.7)] animate-bounce active:scale-95'
                : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800'
            }`}
          >
            <span>EMP</span>
            <span className="text-[10px] font-mono mt-0.5">{hudEmp}%</span>
          </button>
        </div>
      </div>
    </div>
  );
};
