import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Starship, PilotProfile } from '../types';
import { sound } from '../utils/audio';
import {
  Rotate3d,
  Crosshair,
  Zap,
  Shield,
  Activity,
  Flame,
  Gauge,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface Ship3DPreviewProps {
  ship: Starship;
  pilot: PilotProfile;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Face {
  indices: number[];
  color?: string;
  isEngine?: boolean;
}

interface SimulatedBullet {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  radius: number;
  type: string;
}

export const Ship3DPreview: React.FC<Ship3DPreviewProps> = ({ ship, pilot }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 3D rotation state (in radians)
  const rotationRef = useRef<{ yaw: number; pitch: number; roll: number }>({
    yaw: 0.45,
    pitch: -0.3,
    roll: 0.05,
  });

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [testFiring, setTestFiring] = useState<boolean>(false);
  const [targetDroneHit, setTargetDroneHit] = useState<number>(0);
  const [readoutYaw, setReadoutYaw] = useState<number>(25);
  const [readoutPitch, setReadoutPitch] = useState<number>(-17);

  // Simulated live bullets in the 3D preview
  const bulletsRef = useRef<SimulatedBullet[]>([]);
  const particlesRef = useRef<
    { x: number; y: number; z: number; vx: number; vy: number; vz: number; color: string; alpha: number }[]
  >([]);
  const recoilRef = useRef<number>(0);

  // Upgrade bonuses
  const hullLevel = pilot.upgrades?.hull || 0;
  const shieldLevel = pilot.upgrades?.shields || 0;
  const speedLevel = pilot.upgrades?.thrusters || 0;
  const capacitorLevel = pilot.upgrades?.capacitors || 0;

  const totalHp = ship.baseHp + hullLevel * 20;
  const totalShield = ship.baseShield + shieldLevel * 15;
  const totalSpeed = Math.round(ship.baseSpeed * (1 + speedLevel * 0.07) * 10);
  const effectiveFireRate = Math.round(ship.fireRate / (1 + capacitorLevel * 0.08));

  // Reset 3D camera
  const handleResetCamera = () => {
    rotationRef.current = { yaw: 0.4, pitch: -0.25, roll: 0 };
    setReadoutYaw(Math.round((0.4 * 180) / Math.PI));
    setReadoutPitch(Math.round((-0.25 * 180) / Math.PI));
  };

  // Test Fire Simulation
  const handleTestFire = useCallback(() => {
    setTestFiring(true);
    sound.playLaser(ship.weaponType === 'heavy_cannon' ? 'heavy' : 'player');
    recoilRef.current = 14;

    const bSpeed = 16;
    const bullets = bulletsRef.current;

    if (ship.weaponType === 'heavy_cannon') {
      // Twin heavy piercing slugs
      bullets.push(
        { x: -28, y: -4, z: 20, vx: 0, vy: 0, vz: bSpeed, color: '#bd00ff', radius: 6.5, type: 'heavy' },
        { x: 28, y: -4, z: 20, vx: 0, vy: 0, vz: bSpeed, color: '#bd00ff', radius: 6.5, type: 'heavy' }
      );
    } else if (ship.weaponType === 'twin_laser') {
      // Triple converging high-velocity laser beams
      bullets.push(
        { x: -32, y: -6, z: 22, vx: 0.6, vy: 0, vz: bSpeed * 1.2, color: '#39ff14', radius: 3.5, type: 'laser' },
        { x: 0, y: -10, z: 32, vx: 0, vy: 0, vz: bSpeed * 1.25, color: '#ffe600', radius: 4, type: 'laser' },
        { x: 32, y: -6, z: 22, vx: -0.6, vy: 0, vz: bSpeed * 1.2, color: '#39ff14', radius: 3.5, type: 'laser' }
      );
    } else {
      // Twin rapid plasma bolts
      bullets.push(
        { x: -24, y: -8, z: 24, vx: 0, vy: 0, vz: bSpeed, color: '#00f0ff', radius: 4.5, type: 'plasma' },
        { x: 24, y: -8, z: 24, vx: 0, vy: 0, vz: bSpeed, color: '#00f0ff', radius: 4.5, type: 'plasma' }
      );
    }

    // Spawn muzzle flash particles
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x: (Math.random() - 0.5) * 40,
        y: -6 + (Math.random() - 0.5) * 10,
        z: 25,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        vz: Math.random() * 5 + 3,
        color: ship.accentColor,
        alpha: 1,
      });
    }

    setTimeout(() => {
      setTestFiring(false);
    }, 180);
  }, [ship]);

  // Main 3D Rendering Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let targetDronePulse = 0;

    // Build 3D mesh for the current ship
    const getShipMesh = (
      shipId: string
    ): { vertices: Vec3[]; faces: Face[]; weaponMounts: Vec3[] } => {
      if (shipId === 'viper_neon') {
        // High-velocity Stealth Skimmer: sleek split needle prongs & swept diamond hull
        const vertices: Vec3[] = [
          // 0: Left Needle Tip
          { x: -18, y: -4, z: 75 },
          // 1: Right Needle Tip
          { x: 18, y: -4, z: 75 },
          // 2: Nose Split Center Inset
          { x: 0, y: -2, z: 45 },
          // 3: Cockpit Canopy Top
          { x: 0, y: -18, z: 5 },
          // 4: Left Wingtip Swept
          { x: -85, y: -2, z: -35 },
          // 5: Right Wingtip Swept
          { x: 85, y: -2, z: -35 },
          // 6: Left Wing Inset
          { x: -35, y: 3, z: -55 },
          // 7: Right Wing Inset
          { x: 35, y: 3, z: -55 },
          // 8: Engine Center Exhaust
          { x: 0, y: 6, z: -68 },
          // 9: Keel Bottom
          { x: 0, y: 14, z: -10 },
          // 10: Left Top Fin
          { x: -28, y: -22, z: -40 },
          // 11: Right Top Fin
          { x: 28, y: -22, z: -40 },
        ];

        const faces: Face[] = [
          { indices: [2, 0, 3], color: '#162b1e' },
          { indices: [1, 2, 3], color: '#1a3324' },
          { indices: [0, 4, 3], color: '#0d1f14' },
          { indices: [3, 5, 1], color: '#142c1c' },
          { indices: [4, 6, 3], color: '#162b1e' },
          { indices: [3, 7, 5], color: '#183020' },
          { indices: [6, 8, 3], color: '#0f2416' },
          { indices: [3, 8, 7], color: '#12281a' },
          { indices: [9, 0, 2], color: '#0a170f' },
          { indices: [9, 2, 1], color: '#0a170f' },
          { indices: [9, 4, 0], color: '#08140c' },
          { indices: [9, 1, 5], color: '#08140c' },
          { indices: [9, 6, 4], color: '#061009' },
          { indices: [9, 5, 7], color: '#061009' },
          { indices: [9, 8, 6], color: '#040d07' },
          { indices: [9, 7, 8], color: '#040d07' },
          // Fins
          { indices: [6, 10, 3], color: '#1b3b24' },
          { indices: [3, 11, 7], color: '#1b3b24' },
        ];

        const weaponMounts: Vec3[] = [
          { x: -18, y: -4, z: 75 },
          { x: 18, y: -4, z: 75 },
          { x: 0, y: -16, z: 10 },
        ];

        return { vertices, faces, weaponMounts };
      } else if (shipId === 'aegis_titan') {
        // Heavy Dread-Fighter: Hex-armored reinforced battering bow & massive flak pods
        const vertices: Vec3[] = [
          // 0: Nose Top Center
          { x: 0, y: -8, z: 62 },
          // 1: Nose Bottom Center
          { x: 0, y: 12, z: 58 },
          // 2: Left Flak Cannons
          { x: -38, y: -6, z: 52 },
          // 3: Right Flak Cannons
          { x: 38, y: -6, z: 52 },
          // 4: Cockpit Armored Cupola
          { x: 0, y: -24, z: 8 },
          // 5: Heavy Left Armor Plate
          { x: -75, y: -2, z: -15 },
          // 6: Heavy Right Armor Plate
          { x: 75, y: -2, z: -15 },
          // 7: Left Rear Manifold
          { x: -48, y: 8, z: -65 },
          // 8: Right Rear Manifold
          { x: 48, y: 8, z: -65 },
          // 9: Center Heavy Thruster
          { x: 0, y: 10, z: -70 },
          // 10: Lower Heavy Keel
          { x: 0, y: 22, z: -5 },
        ];

        const faces: Face[] = [
          { indices: [0, 2, 4], color: '#251230' },
          { indices: [0, 4, 3], color: '#2c1539' },
          { indices: [2, 5, 4], color: '#1d0d26' },
          { indices: [4, 6, 3], color: '#210f2c' },
          { indices: [5, 7, 4], color: '#281333' },
          { indices: [4, 8, 6], color: '#2a1436' },
          { indices: [7, 9, 4], color: '#190a21' },
          { indices: [4, 9, 8], color: '#1c0c24' },
          // Bottom plates
          { indices: [1, 10, 2], color: '#14081c' },
          { indices: [1, 3, 10], color: '#14081c' },
          { indices: [2, 10, 5], color: '#0f0514' },
          { indices: [3, 6, 10], color: '#0f0514' },
          { indices: [5, 10, 7], color: '#0a030f' },
          { indices: [6, 8, 10], color: '#0a030f' },
          { indices: [7, 10, 9], color: '#08020d' },
          { indices: [8, 9, 10], color: '#08020d' },
        ];

        const weaponMounts: Vec3[] = [
          { x: -38, y: -6, z: 52 },
          { x: 38, y: -6, z: 52 },
        ];

        return { vertices, faces, weaponMounts };
      } else {
        // Apex Falcon: Strike Interceptor with needle nose & delta wings
        const vertices: Vec3[] = [
          // 0: Needle Nose Tip
          { x: 0, y: -4, z: 78 },
          // 1: Cockpit Canopy Top
          { x: 0, y: -20, z: 12 },
          // 2: Left Wing Tip
          { x: -78, y: -2, z: -25 },
          // 3: Right Wing Tip
          { x: 78, y: -2, z: -25 },
          // 4: Left Wing Inset
          { x: -30, y: 4, z: -48 },
          // 5: Right Wing Inset
          { x: 30, y: 4, z: -48 },
          // 6: Engine Exhaust
          { x: 0, y: 6, z: -62 },
          // 7: Keel Bottom
          { x: 0, y: 15, z: 0 },
          // 8: Left Wing Cannon
          { x: -45, y: -3, z: 15 },
          // 9: Right Wing Cannon
          { x: 45, y: -3, z: 15 },
        ];

        const faces: Face[] = [
          { indices: [0, 8, 1], color: '#0b2438' },
          { indices: [0, 1, 9], color: '#0e2d45' },
          { indices: [8, 2, 1], color: '#091c2b' },
          { indices: [1, 3, 9], color: '#0c263b' },
          { indices: [2, 4, 1], color: '#0f324d' },
          { indices: [1, 5, 3], color: '#123957' },
          { indices: [4, 6, 1], color: '#081a29' },
          { indices: [1, 6, 5], color: '#0a2033' },
          // Underside
          { indices: [0, 7, 8], color: '#05111a' },
          { indices: [0, 9, 7], color: '#05111a' },
          { indices: [8, 7, 2], color: '#040d14' },
          { indices: [9, 3, 7], color: '#040d14' },
          { indices: [2, 7, 4], color: '#030a0f' },
          { indices: [3, 5, 7], color: '#030a0f' },
          { indices: [4, 7, 6], color: '#02070a' },
          { indices: [5, 6, 7], color: '#02070a' },
        ];

        const weaponMounts: Vec3[] = [
          { x: -45, y: -3, z: 25 },
          { x: 45, y: -3, z: 25 },
        ];

        return { vertices, faces, weaponMounts };
      }
    };

    const mesh = getShipMesh(ship.id);

    // Light source vector (normalized)
    const lightDir: Vec3 = { x: 0.45, y: -0.7, z: -0.55 };
    const lLen = Math.hypot(lightDir.x, lightDir.y, lightDir.z) || 1;
    lightDir.x /= lLen;
    lightDir.y /= lLen;
    lightDir.z /= lLen;

    const render = () => {
      animId = requestAnimationFrame(render);

      // Auto-rotation
      if (autoRotate && !isDraggingRef.current) {
        rotationRef.current.yaw += 0.012;
      }

      // Recoil recovery
      if (recoilRef.current > 0) {
        recoilRef.current *= 0.88;
        if (recoilRef.current < 0.2) recoilRef.current = 0;
      }

      const rot = rotationRef.current;
      setReadoutYaw(Math.round(((rot.yaw % (Math.PI * 2)) * 180) / Math.PI));
      setReadoutPitch(Math.round((rot.pitch * 180) / Math.PI));

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + 10;
      const focalLength = 340;
      const cameraDist = 260;

      // 1. Draw 3D Circular Hangar Platform / Grid
      ctx.save();
      const platformRadius = 140;
      const platformY = 55;

      // Draw perspective hangar rings
      for (let r = 35; r <= platformRadius; r += 35) {
        ctx.beginPath();
        const segments = 36;
        for (let s = 0; s <= segments; s++) {
          const theta = (s / segments) * Math.PI * 2;
          const px = Math.cos(theta) * r;
          const pz = Math.sin(theta) * r;

          // Rotate around X (pitch) and Y (yaw)
          const cosY = Math.cos(rot.yaw);
          const sinY = Math.sin(rot.yaw);
          const cosX = Math.cos(rot.pitch);
          const sinX = Math.sin(rot.pitch);

          // World to camera
          const x1 = px * cosY - pz * sinY;
          const z1 = px * sinY + pz * cosY;
          const y1 = platformY;

          const y2 = y1 * cosX - z1 * sinX;
          const z2 = y1 * sinX + z1 * cosX;

          const zProj = z2 + cameraDist;
          if (zProj <= 20) continue;
          const screenX = cx + (x1 * focalLength) / zProj;
          const screenY = cy + (y2 * focalLength) / zProj;

          if (s === 0) ctx.moveTo(screenX, screenY);
          else ctx.lineTo(screenX, screenY);
        }
        ctx.strokeStyle = r === platformRadius ? ship.primaryColor : 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = r === platformRadius ? 1.5 : 1;
        ctx.stroke();
      }
      ctx.restore();

      // 2. Transform Vertices
      const cosY = Math.cos(rot.yaw);
      const sinY = Math.sin(rot.yaw);
      const cosX = Math.cos(rot.pitch);
      const sinX = Math.sin(rot.pitch);
      const cosZ = Math.cos(rot.roll);
      const sinZ = Math.sin(rot.roll);

      const transformedVertices: { x: number; y: number; z: number; sx: number; sy: number }[] = [];

      for (const v of mesh.vertices) {
        // Apply recoil along z axis
        const vz = v.z - recoilRef.current;

        // Yaw (around Y)
        let x1 = v.x * cosY - vz * sinY;
        let z1 = v.x * sinY + vz * cosY;
        let y1 = v.y;

        // Pitch (around X)
        let y2 = y1 * cosX - z1 * sinX;
        let z2 = y1 * sinX + z1 * cosX;
        let x2 = x1;

        // Roll (around Z)
        let x3 = x2 * cosZ - y2 * sinZ;
        let y3 = x2 * sinZ + y2 * cosZ;
        let z3 = z2;

        const zProj = z3 + cameraDist;
        const sx = cx + (x3 * focalLength) / Math.max(10, zProj);
        const sy = cy + (y3 * focalLength) / Math.max(10, zProj);

        transformedVertices.push({ x: x3, y: y3, z: z3, sx, sy });
      }

      // 3. Compute face depths and normals for Painter's sorting
      const sortedFaces: {
        face: Face;
        avgZ: number;
        normalZ: number;
        lightIntensity: number;
      }[] = [];

      for (const face of mesh.faces) {
        const v0 = transformedVertices[face.indices[0]];
        const v1 = transformedVertices[face.indices[1]];
        const v2 = transformedVertices[face.indices[2]];

        const avgZ = (v0.z + v1.z + v2.z) / 3;

        // Face normal in 3D camera space
        const ax = v1.x - v0.x;
        const ay = v1.y - v0.y;
        const az = v1.z - v0.z;

        const bx = v2.x - v0.x;
        const by = v2.y - v0.y;
        const bz = v2.z - v0.z;

        // Cross product
        let nx = ay * bz - az * by;
        let ny = az * bx - ax * bz;
        let nz = ax * by - ay * bx;

        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen;
        ny /= nLen;
        nz /= nLen;

        // Lighting intensity
        const dot = Math.max(0.15, nx * lightDir.x + ny * lightDir.y + nz * lightDir.z);
        sortedFaces.push({
          face,
          avgZ,
          normalZ: nz,
          lightIntensity: dot,
        });
      }

      // Back-to-front sorting
      sortedFaces.sort((a, b) => a.avgZ - b.avgZ);

      // 4. Render 3D Engine Thruster Plume & Particles
      // Engine particle emitter in 3D
      if (Math.random() < 0.7) {
        particlesRef.current.push({
          x: (Math.random() - 0.5) * 12,
          y: 4 + (Math.random() - 0.5) * 6,
          z: -65,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          vz: -Math.random() * 6 - 8,
          color: ship.accentColor,
          alpha: 0.9,
        });
      }

      // Update & render engine particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z += pt.vz;
        pt.alpha -= 0.04;

        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        // Project particle
        let x1 = pt.x * cosY - pt.z * sinY;
        let z1 = pt.x * sinY + pt.z * cosY;
        let y2 = pt.y * cosX - z1 * sinX;
        let z2 = pt.y * sinX + z1 * cosX;

        const zProj = z2 + cameraDist;
        if (zProj > 10) {
          const psx = cx + (x1 * focalLength) / zProj;
          const psy = cy + (y2 * focalLength) / zProj;
          const pr = Math.max(1, (3.5 * focalLength) / zProj);

          ctx.save();
          ctx.globalAlpha = pt.alpha;
          ctx.fillStyle = pt.color;
          ctx.shadowColor = pt.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(psx, psy, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Draw Ship Faces
      for (const item of sortedFaces) {
        const { face, lightIntensity } = item;
        const pts = face.indices.map((idx) => transformedVertices[idx]);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].sx, pts[i].sy);
        }
        ctx.closePath();

        if (isWireframe) {
          ctx.fillStyle = 'rgba(10, 20, 35, 0.4)';
          ctx.fill();
          ctx.strokeStyle = ship.primaryColor;
          ctx.lineWidth = 1.2;
          ctx.shadowColor = ship.primaryColor;
          ctx.shadowBlur = 6;
          ctx.stroke();
        } else {
          // Shaded Hull Plates
          const baseColor = face.color || '#102030';
          ctx.fillStyle = baseColor;
          ctx.fill();

          // Highlight overlay based on directional light
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.45, lightIntensity * 0.4)})`;
          ctx.fill();

          // Cyber glow outline
          ctx.strokeStyle = ship.primaryColor;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = ship.primaryColor;
          ctx.shadowBlur = 4;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 6. Draw Cockpit Glow & Wing Highlights
      const canopyIdx = 1;
      if (transformedVertices[canopyIdx]) {
        const cv = transformedVertices[canopyIdx];
        ctx.save();
        ctx.fillStyle = ship.accentColor;
        ctx.shadowColor = ship.accentColor;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(cv.sx, cv.sy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. Render Simulated Weapons Test-Fire in 3D
      targetDronePulse += 0.05;
      const droneZ = 160;
      // Holographic Target Drone in 3D space
      let dx1 = 0 * cosY - droneZ * sinY;
      let dz1 = 0 * sinY + droneZ * cosY;
      let dy2 = -15 * cosX - dz1 * sinX;
      let dz2 = -15 * sinX + dz1 * cosX;

      const droneZProj = dz2 + cameraDist;
      let droneSx = cx + (dx1 * focalLength) / Math.max(10, droneZProj);
      let droneSy = cy + (dy2 * focalLength) / Math.max(10, droneZProj);

      // Draw Holographic Target Drone
      ctx.save();
      const targetGlow = targetDroneHit > 0 ? '#ff0055' : 'rgba(0, 240, 255, 0.7)';
      ctx.strokeStyle = targetGlow;
      ctx.lineWidth = targetDroneHit > 0 ? 2.5 : 1.5;
      ctx.shadowColor = targetGlow;
      ctx.shadowBlur = targetDroneHit > 0 ? 18 : 8;

      ctx.beginPath();
      const drSize = 22 + Math.sin(targetDronePulse) * 2;
      ctx.arc(droneSx, droneSy, drSize, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs inside drone
      ctx.beginPath();
      ctx.moveTo(droneSx - drSize - 4, droneSy);
      ctx.lineTo(droneSx + drSize + 4, droneSy);
      ctx.moveTo(droneSx, droneSy - drSize - 4);
      ctx.lineTo(droneSx, droneSy + drSize + 4);
      ctx.stroke();

      // Drone Label
      ctx.font = '10px "Orbitron", monospace';
      ctx.fillStyle = targetGlow;
      ctx.textAlign = 'center';
      ctx.fillText(
        targetDroneHit > 0 ? 'CALIBRATION HIT!' : 'SIM TARGET DOCK',
        droneSx,
        droneSy - drSize - 8
      );
      ctx.restore();

      // Decrement hit flash
      if (targetDroneHit > 0) {
        setTargetDroneHit((prev) => Math.max(0, prev - 1));
      }

      // Update and render active test-fire bullets
      for (let b = bulletsRef.current.length - 1; b >= 0; b--) {
        const bullet = bulletsRef.current[b];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.z += bullet.vz;

        // Project bullet into 3D view
        let bx1 = bullet.x * cosY - bullet.z * sinY;
        let bz1 = bullet.x * sinY + bullet.z * cosY;
        let by2 = bullet.y * cosX - bz1 * sinX;
        let bz2 = bullet.y * sinX + bz1 * cosX;

        const bzProj = bz2 + cameraDist;
        if (bzProj > 10) {
          const bsx = cx + (bx1 * focalLength) / bzProj;
          const bsy = cy + (by2 * focalLength) / bzProj;
          const br = Math.max(2, (bullet.radius * focalLength) / bzProj);

          ctx.save();
          ctx.fillStyle = bullet.color;
          ctx.shadowColor = bullet.color;
          ctx.shadowBlur = 12;

          if (bullet.type === 'laser') {
            // High velocity beam line
            ctx.strokeStyle = bullet.color;
            ctx.lineWidth = br * 1.2;
            ctx.beginPath();
            ctx.moveTo(bsx, bsy - 12);
            ctx.lineTo(bsx, bsy + 12);
            ctx.stroke();
          } else {
            // Plasma / Heavy slug sphere
            ctx.beginPath();
            ctx.arc(bsx, bsy, br, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Check impact with simulation drone
        if (bullet.z >= droneZ - 10) {
          setTargetDroneHit(8);
          // Spawn impact burst
          for (let p = 0; p < 8; p++) {
            particlesRef.current.push({
              x: bullet.x + (Math.random() - 0.5) * 15,
              y: bullet.y + (Math.random() - 0.5) * 15,
              z: droneZ,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              vz: (Math.random() - 0.5) * 4,
              color: bullet.color,
              alpha: 1,
            });
          }
          bulletsRef.current.splice(b, 1);
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [ship, autoRotate, isWireframe, targetDroneHit]);

  // Pointer interaction for 3D rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    rotationRef.current.yaw += dx * 0.012;
    rotationRef.current.pitch = Math.max(
      -1.2,
      Math.min(1.2, rotationRef.current.pitch + dy * 0.012)
    );
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Weapon details configuration
  const getWeaponSpecs = (wType: string) => {
    switch (wType) {
      case 'heavy_cannon':
        return {
          title: 'HEAVY ANTIMATTER FLAK CANNON',
          caliber: 'Twin 88mm Ion-Slugs',
          spread: 'Linear Dual Column',
          penetration: 'CLASS-A PIERCING (Penetrates armor & shields)',
          dps: 'VERY HIGH (45 DMG / slug)',
          visual: 'Dense violet ionized shells with kinetic shockwave blooms',
          badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-500/40',
        };
      case 'twin_laser':
        return {
          title: 'HYPER-FREQUENCY LASER ARRAY',
          caliber: 'Triple Prism Photonic Splitter',
          spread: 'Triple Converging Spread',
          penetration: 'RAPID COHERENT BURN (Pinpoint accuracy)',
          dps: 'BURST BALANCED (22 - 26 DMG x 3)',
          visual: 'Neon green and solar amber high-cadence beam ribbons',
          badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40',
        };
      default:
        return {
          title: 'TWIN COHERENT PLASMA BLASTERS',
          caliber: 'Dual Magnetic Acceleration Coils',
          spread: 'Dual Parallel Stream',
          penetration: 'SUPERHEATED ION FLOW (Rapid suppression)',
          dps: 'SUSTAINED RELIABLE (25 DMG x 2)',
          visual: 'Cyan electric plasma bolts with ionized wake trails',
          badgeColor: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/40',
        };
    }
  };

  const weaponSpecs = getWeaponSpecs(ship.weaponType);

  return (
    <div
      id="hangar-3d-preview-module"
      ref={containerRef}
      className="w-full flex flex-col gap-6"
    >
      {/* 3D Visualizer Card */}
      <div className="relative w-full rounded-2xl bg-[#060a16] border border-cyan-500/30 overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.08)]">
        {/* Holographic HUD Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 border-b border-cyan-950/80">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase block">
                3D VESSEL DIAGNOSTIC INTERACTION
              </span>
              <span className="text-xs font-display font-black text-white">
                {ship.name} • {ship.model}
              </span>
            </div>
          </div>

          {/* 3D Viewport Controls */}
          <div className="flex items-center gap-2">
            <button
              id="hangar-3d-wireframe-toggle"
              onClick={() => setIsWireframe(!isWireframe)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition border ${
                isWireframe
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
              title="Toggle Holographic Wireframe"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isWireframe ? 'WIREFRAME' : 'SOLID HULL'}</span>
            </button>

            <button
              id="hangar-3d-autorotate-toggle"
              onClick={() => setAutoRotate(!autoRotate)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition border ${
                autoRotate
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-700 hover:text-zinc-200'
              }`}
              title="Toggle Continuous Orbit"
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>{autoRotate ? 'ORBIT ON' : 'ORBIT PAUSED'}</span>
            </button>

            <button
              id="hangar-3d-reset-btn"
              onClick={handleResetCamera}
              className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 transition"
              title="Reset View Angle"
            >
              RESET
            </button>
          </div>
        </div>

        {/* The 3D Canvas Viewport */}
        <div className="relative w-full h-80 sm:h-96 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a162e] via-[#050b17] to-[#02050d] cursor-grab active:cursor-grabbing">
          {/* Subtle Cyber Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff08_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff08_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

          {/* Real-time 3D Canvas */}
          <canvas
            ref={canvasRef}
            width={720}
            height={400}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full object-contain relative z-10 touch-none"
          />

          {/* Left HUD Telemetry Overlay */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-1.5">
            <div className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
              YAW: {readoutYaw}° • PITCH: {readoutPitch}°
            </div>
            <div className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-cyan-500/20 text-[10px] font-mono text-zinc-400">
              DRAG TO ROTATE 360°
            </div>
          </div>

          {/* Right Live Weapon Test Trigger Button */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
            <button
              id="hangar-test-fire-btn"
              onClick={handleTestFire}
              className={`px-4 py-2.5 rounded-xl font-display font-bold text-xs tracking-wider flex items-center gap-2 border transition active:scale-95 shadow-lg ${
                testFiring
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_20px_rgba(255,0,85,0.6)]'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-black border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.4)]'
              }`}
            >
              <Zap className="w-4 h-4 text-black fill-black" />
              <span>TEST FIRE WEAPONS</span>
            </button>
            <span className="text-[9px] font-mono text-cyan-300/80 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/20">
              SHOOTS PROJECTILES AT SIM DOCK
            </span>
          </div>

          {/* Bottom Left Ship Color Palette Signature */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-400">SIGNATURE:</span>
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: ship.primaryColor }}
              title="Primary Hull Armor"
            />
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: ship.accentColor }}
              title="Sub-light Glow & Thruster"
            />
          </div>
        </div>

        {/* UNIQUE WEAPON ARCHITECTURE ANALYSIS CARD */}
        <div className="p-5 bg-zinc-950/90 border-t border-cyan-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Crosshair className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
                    WEAPON SYSTEMS ANALYSIS
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${weaponSpecs.badgeColor}`}
                  >
                    {ship.weaponType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-display font-black text-white mt-0.5">
                  {weaponSpecs.title}
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  {weaponSpecs.visual}
                </p>
              </div>
            </div>

            {/* Tactical Specs Badges */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">SPREAD PATTERN</span>
                <span className="text-white font-bold">{weaponSpecs.spread}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">CALIBER / BARRELS</span>
                <span className="text-white font-bold">{weaponSpecs.caliber}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400 text-[10px] block">PENETRATION PROFILE</span>
                <span className="text-cyan-300 font-bold">{weaponSpecs.penetration}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE COMBAT STAT GAUGES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hull Health */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-rose-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              MAX HULL INTEGRITY
            </span>
            {hullLevel > 0 && (
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                +{hullLevel * 20} LV.{hullLevel}
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-display font-black text-white">
                {totalHp} <span className="text-xs text-zinc-400 font-mono">HP</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                BASE {ship.baseHp}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalHp / 260) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Shield Buffer */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-cyan-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              SHIELD DEFLECTOR
            </span>
            {shieldLevel > 0 && (
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                +{shieldLevel * 15} LV.{shieldLevel}
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-display font-black text-white">
                {totalShield} <span className="text-xs text-zinc-400 font-mono">SP</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                BASE {ship.baseShield}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalShield / 160) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sub-light Velocity */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-amber-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              FLIGHT VELOCITY
            </span>
            {speedLevel > 0 && (
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                +{Math.round(speedLevel * 7)}% LV.{speedLevel}
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-display font-black text-white">
                {totalSpeed} <span className="text-xs text-zinc-400 font-mono">M/S</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                DASH {ship.dashSpeed * 10}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalSpeed / 130) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Fire Cadence */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-purple-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              FIRE RATE CYCLE
            </span>
            {capacitorLevel > 0 && (
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                +{capacitorLevel * 8}% LV.{capacitorLevel}
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-display font-black text-white">
                {effectiveFireRate} <span className="text-xs text-zinc-400 font-mono">MS</span>
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {weaponSpecs.dps}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 mt-2 overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(20, (1 - effectiveFireRate / 240) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
