import React, { useState, useRef, useEffect } from 'react';
import { ControlSettings, PilotProfile, KeyBindings } from '../types';
import { DEFAULT_CONTROLS, STARSHIPS } from '../utils/storage';
import { sound } from '../utils/audio';
import {
  Mouse,
  Smartphone,
  Keyboard,
  Sliders,
  Crosshair,
  RotateCcw,
  Check,
  X,
  Zap,
  Target,
  Hand,
  Vibrate,
  Shield,
  Radio,
  Play,
} from 'lucide-react';

interface ControlsModalProps {
  pilot: PilotProfile;
  onUpdateControls: (updatedControls: ControlSettings) => void;
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({
  pilot,
  onUpdateControls,
  onClose,
}) => {
  const [settings, setSettings] = useState<ControlSettings>({
    ...DEFAULT_CONTROLS,
    ...(pilot.controls || {}),
    customKeys: {
      ...DEFAULT_CONTROLS.customKeys,
      ...(pilot.controls?.customKeys || {}),
    },
  });

  const [activeTab, setActiveTab] = useState<'pc' | 'mobile' | 'test'>('pc');
  const [rebindingAction, setRebindingAction] = useState<keyof KeyBindings | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  // Test bench canvas state
  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const testShipRef = useRef({ x: 150, y: 120, vx: 0, vy: 0, tilt: 0 });
  const testTouchRef = useRef({ active: false, x: 150, y: 120 });
  const testKeysRef = useRef<{ [key: string]: boolean }>({});

  const ship = STARSHIPS.find((s) => s.id === pilot.selectedShipId) || STARSHIPS[0];

  // Key listening for remapping
  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      sound.playPickup('credit');

      setSettings((prev) => ({
        ...prev,
        keyPreset: 'custom',
        customKeys: {
          ...prev.customKeys,
          [rebindingAction]: e.code,
        },
      }));
      setRebindingAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [rebindingAction]);

  // Test Bench Interactive Canvas Loop
  useEffect(() => {
    if (activeTab !== 'test') return;
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      testKeysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      testKeysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const ts = testShipRef.current;

      // Update test ship movement
      let mx = 0;
      let my = 0;

      // Keyboard
      if (settings.pcMovementMode !== 'mouse_follow') {
        const k = testKeysRef.current;
        if (k[settings.customKeys.moveLeft] || k['ArrowLeft'] || k['KeyA']) mx -= 1;
        if (k[settings.customKeys.moveRight] || k['ArrowRight'] || k['KeyD']) mx += 1;
        if (k[settings.customKeys.moveUp] || k['ArrowUp'] || k['KeyW']) my -= 1;
        if (k[settings.customKeys.moveDown] || k['ArrowDown'] || k['KeyS']) my += 1;
      }

      // Mouse follow or touch drag in test bench
      if (testTouchRef.current.active) {
        const targetY = testTouchRef.current.y - (settings.fingerYOffset || 0);
        const dx = testTouchRef.current.x - ts.x;
        const dy = targetY - ts.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          const speed = 7 * settings.touchSensitivity;
          ts.x += (dx / dist) * Math.min(dist, speed);
          ts.y += (dy / dist) * Math.min(dist, speed);
          ts.tilt = (dx / 40);
        }
      } else if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        const speed = 5.5 * settings.mouseSensitivity;
        ts.x += (mx / len) * speed;
        ts.y += (my / len) * speed;
        ts.tilt = mx * 0.4;
      } else {
        ts.tilt *= 0.8;
      }

      // Clamp test bounds
      ts.x = Math.max(25, Math.min(w - 25, ts.x));
      ts.y = Math.max(25, Math.min(h - 25, ts.y));

      // Draw background
      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // If touch is active, draw touch pointer & offset line
      if (testTouchRef.current.active) {
        // Finger point
        ctx.fillStyle = 'rgba(255, 230, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(testTouchRef.current.x, testTouchRef.current.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffe600';
        ctx.stroke();

        // Finger offset guide line
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(testTouchRef.current.x, testTouchRef.current.y);
        ctx.lineTo(ts.x, ts.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Test Ship
      ctx.save();
      ctx.translate(ts.x, ts.y);
      ctx.rotate(ts.tilt);

      // Ship Thruster glow
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 14, 5 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();

      // Ship body
      ctx.fillStyle = ship.primaryColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(14, 14);
      ctx.lineTo(0, 8);
      ctx.lineTo(-14, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTab, settings, ship.primaryColor]);

  const handleSave = () => {
    sound.playPickup('credit');
    onUpdateControls(settings);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleResetDefaults = () => {
    sound.playLaser('player');
    setSettings({ ...DEFAULT_CONTROLS });
  };

  const formatKeyName = (code: string) => {
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('Arrow', '↑ ')
      .replace('Left', ' L')
      .replace('Right', ' R');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#090d1a] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.2)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black font-display tracking-wide text-white uppercase">
                  FLIGHT CONTROLS
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-900/60 border border-cyan-400 text-cyan-300">
                  v3.0 CALIBRATION
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Configure touch gestures, mouse steering, sensitivity curve, and keyboard layout
              </p>
            </div>
          </div>

          <button
            id="controls-modal-close-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-800/80 bg-black/40">
          <button
            id="tab-pc-btn"
            onClick={() => {
              sound.playLaser('player');
              setActiveTab('pc');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-display font-bold tracking-wider rounded-t-lg transition border-b-2 ${
              activeTab === 'pc'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mouse className="w-4 h-4" />
            <span>PC & MOUSE</span>
          </button>

          <button
            id="tab-mobile-btn"
            onClick={() => {
              sound.playLaser('player');
              setActiveTab('mobile');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-display font-bold tracking-wider rounded-t-lg transition border-b-2 ${
              activeTab === 'mobile'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>MOBILE & TOUCH</span>
          </button>

          <button
            id="tab-test-btn"
            onClick={() => {
              sound.playLaser('player');
              setActiveTab('test');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-display font-bold tracking-wider rounded-t-lg transition border-b-2 ${
              activeTab === 'test'
                ? 'border-amber-400 text-amber-400 bg-amber-950/30'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>LIVE TEST BENCH</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: PC & MOUSE */}
          {activeTab === 'pc' && (
            <div className="space-y-6">
              {/* PC Movement Mode */}
              <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mouse className="w-4 h-4 text-cyan-400" />
                    <span className="font-display font-bold text-sm text-white">
                      STEERING MODE
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    ACTIVE: {settings.pcMovementMode.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playLaser('player');
                      setSettings({ ...settings, pcMovementMode: 'hybrid' });
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      settings.pcMovementMode === 'hybrid'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase flex items-center justify-between">
                      <span>Hybrid Mode</span>
                      {settings.pcMovementMode === 'hybrid' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Full Mouse follow + Keyboard keys simultaneously active.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playLaser('player');
                      setSettings({ ...settings, pcMovementMode: 'mouse_follow' });
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      settings.pcMovementMode === 'mouse_follow'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase flex items-center justify-between">
                      <span>Mouse Steering</span>
                      {settings.pcMovementMode === 'mouse_follow' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Ship tracks cursor location dynamically across screen.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playLaser('player');
                      setSettings({ ...settings, pcMovementMode: 'keyboard' });
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      settings.pcMovementMode === 'keyboard'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase flex items-center justify-between">
                      <span>Keyboard Only</span>
                      {settings.pcMovementMode === 'keyboard' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Pure arcade WASD or directional arrow navigation.
                    </p>
                  </button>
                </div>
              </div>

              {/* Firing & Reticle Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fire Trigger Mode */}
                <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                  <span className="font-display font-bold text-sm text-white block mb-2">
                    WEAPON TRIGGER MODE
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pcFireMode: 'auto' })}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        settings.pcFireMode === 'auto'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>AUTO-FIRE (ON)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pcFireMode: 'manual' })}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        settings.pcFireMode === 'manual'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <span>MANUAL (HOLD)</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    Auto-fire delivers nonstop plasma rounds so you can concentrate purely on evasive maneuvers.
                  </p>
                </div>

                {/* Cyber Crosshair Reticle */}
                <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-cyan-400" />
                      CYBER RETICLE
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          mouseReticleEnabled: !settings.mouseReticleEnabled,
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition ${
                        settings.mouseReticleEnabled
                          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {settings.mouseReticleEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    Draws a neon tactical HUD cursor with lock-on vectors to your mouse coordinate.
                  </p>
                </div>
              </div>

              {/* Mouse Sensitivity Slider */}
              <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm text-white">
                    MOUSE SENSITIVITY & LERP
                  </span>
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {settings.mouseSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    setSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>0.5x (Precise)</span>
                  <span>1.2x (Balanced)</span>
                  <span>2.5x (Hyper Agile)</span>
                </div>
              </div>

              {/* Keyboard Remapping Presets & Custom Bindings */}
              <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Keyboard className="w-4 h-4 text-cyan-400" />
                    <span className="font-display font-bold text-sm text-white">
                      KEYBOARD BINDINGS
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          keyPreset: 'wasd',
                          customKeys: { ...DEFAULT_CONTROLS.customKeys },
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                        settings.keyPreset === 'wasd'
                          ? 'bg-cyan-950 border border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      }`}
                    >
                      WASD Preset
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          keyPreset: 'arrows',
                          customKeys: {
                            moveUp: 'ArrowUp',
                            moveDown: 'ArrowDown',
                            moveLeft: 'ArrowLeft',
                            moveRight: 'ArrowRight',
                            fire: 'Space',
                            dash: 'ShiftRight',
                            emp: 'KeyC',
                            pause: 'Escape',
                          },
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                        settings.keyPreset === 'arrows'
                          ? 'bg-cyan-950 border border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                      }`}
                    >
                      Arrows Preset
                    </button>
                  </div>
                </div>

                {/* Key Bindings Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
                  {(
                    [
                      { id: 'moveUp', label: 'Move Up' },
                      { id: 'moveDown', label: 'Move Down' },
                      { id: 'moveLeft', label: 'Move Left' },
                      { id: 'moveRight', label: 'Move Right' },
                      { id: 'fire', label: 'Shoot / Fire' },
                      { id: 'dash', label: 'Warp Dash' },
                      { id: 'emp', label: 'EMP Blast' },
                      { id: 'pause', label: 'Tactical Pause' },
                    ] as const
                  ).map((action) => {
                    const isRebinding = rebindingAction === action.id;
                    const keyVal = settings.customKeys[action.id];
                    return (
                      <div
                        key={action.id}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2.5 flex flex-col justify-between"
                      >
                        <span className="text-[11px] text-zinc-400">{action.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            sound.playLaser('player');
                            setRebindingAction(action.id);
                          }}
                          className={`mt-1.5 py-1.5 px-2 rounded font-mono font-bold text-xs tracking-wider transition ${
                            isRebinding
                              ? 'bg-amber-500 text-black animate-pulse'
                              : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300'
                          }`}
                        >
                          {isRebinding ? 'PRESS KEY...' : formatKeyName(keyVal)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE & TOUCH */}
          {activeTab === 'mobile' && (
            <div className="space-y-6">
              {/* Touch Movement Mode */}
              <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hand className="w-4 h-4 text-cyan-400" />
                    <span className="font-display font-bold text-sm text-white">
                      TOUCH GESTURE SCHEME
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    {settings.mobileMovementMode.toUpperCase().replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playLaser('player');
                      setSettings({ ...settings, mobileMovementMode: 'finger_drag' });
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      settings.mobileMovementMode === 'finger_drag'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase flex items-center justify-between">
                      <span>Finger Touch Follow</span>
                      {settings.mobileMovementMode === 'finger_drag' && (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Ship directly glides to touch position with ergonomic finger offset.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playLaser('player');
                      setSettings({ ...settings, mobileMovementMode: 'virtual_joystick' });
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      settings.mobileMovementMode === 'virtual_joystick'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase flex items-center justify-between">
                      <span>Virtual Joystick</span>
                      {settings.mobileMovementMode === 'virtual_joystick' && (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Floating 360° on-screen analog thumbstick.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playLaser('player');
                      setSettings({ ...settings, mobileMovementMode: 'relative_drag' });
                    }}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      settings.mobileMovementMode === 'relative_drag'
                        ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-display font-bold text-xs uppercase flex items-center justify-between">
                      <span>Relative Swipe</span>
                      {settings.mobileMovementMode === 'relative_drag' && (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Swipe anywhere on glass to shift ship delta without jumping.
                    </p>
                  </button>
                </div>
              </div>

              {/* Ergonomic Finger Y-Offset Slider */}
              <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span className="font-display font-bold text-sm text-white">
                      FINGER Y-OFFSET (SIGHTLINE CLEARANCE)
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    +{settings.fingerYOffset}px Above Finger
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3">
                  Offsets the starship above your touching finger so your thumb never obscures the ship or incoming laser projectiles!
                </p>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={settings.fingerYOffset}
                  onChange={(e) =>
                    setSettings({ ...settings, fingerYOffset: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>0px (Direct Under Thumb)</span>
                  <span>45px (Optimal Clearance)</span>
                  <span>80px (High Visibility)</span>
                </div>
              </div>

              {/* Mobile Sensitivity & Button Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Touch Sensitivity */}
                <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-white">
                      TOUCH SENSITIVITY
                    </span>
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {settings.touchSensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={settings.touchSensitivity}
                    onChange={(e) =>
                      setSettings({ ...settings, touchSensitivity: parseFloat(e.target.value) })
                    }
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                    <span>0.5x Smooth</span>
                    <span>1.2x Standard</span>
                    <span>2.5x High-Gear</span>
                  </div>
                </div>

                {/* Handedness Layout */}
                <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                  <span className="font-display font-bold text-sm text-white block mb-2">
                    MOBILE BUTTON HANDEDNESS
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, buttonLayout: 'right_handed' })}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                        settings.buttonLayout === 'right_handed'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      RIGHT-HANDED
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, buttonLayout: 'left_handed' })}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition ${
                        settings.buttonLayout === 'left_handed'
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      LEFT-HANDED
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-2">
                    Places the DASH and EMP combat trigger buttons on your preferred screen edge.
                  </p>
                </div>
              </div>

              {/* Mobile Auto-Fire & Haptics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      MOBILE AUTO-FIRE
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          mobileFireMode: settings.mobileFireMode === 'auto' ? 'manual' : 'auto',
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition ${
                        settings.mobileFireMode === 'auto'
                          ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {settings.mobileFireMode === 'auto' ? 'ACTIVE' : 'MANUAL'}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    When active, weapons discharge automatically during touch navigation.
                  </p>
                </div>

                <div className="bg-black/40 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-white flex items-center gap-2">
                      <Vibrate className="w-4 h-4 text-cyan-400" />
                      HAPTIC VIBRATIONS
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          hapticFeedback: !settings.hapticFeedback,
                        })
                      }
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition ${
                        settings.hapticFeedback
                          ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {settings.hapticFeedback ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Vibrates smartphone haptic motors upon impact, EMP detonate, or warp dash.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE TEST BENCH */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between">
                <div className="text-xs text-cyan-300">
                  <span className="font-bold">INTERACTIVE SIMULATION:</span> Test your sensitivity,
                  finger Y-offset, and mouse navigation inside this virtual test arena!
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Offset: +{settings.fingerYOffset}px
                </div>
              </div>

              {/* Canvas viewport */}
              <div
                className="relative w-full h-64 rounded-xl border-2 border-cyan-500/40 overflow-hidden bg-black shadow-inner touch-none cursor-crosshair"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  testTouchRef.current = {
                    active: true,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  };
                }}
                onMouseLeave={() => {
                  testTouchRef.current.active = false;
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (touch) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    testTouchRef.current = {
                      active: true,
                      x: touch.clientX - rect.left,
                      y: touch.clientY - rect.top,
                    };
                  }
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  if (touch) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    testTouchRef.current = {
                      active: true,
                      x: touch.clientX - rect.left,
                      y: touch.clientY - rect.top,
                    };
                  }
                }}
                onTouchEnd={() => {
                  testTouchRef.current.active = false;
                }}
              >
                <canvas
                  ref={testCanvasRef}
                  width={680}
                  height={256}
                  className="w-full h-full block"
                />

                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] font-mono text-zinc-400 pointer-events-none">
                  DRAG FINGER OR MOVE MOUSE HERE TO TEST CALIBRATION
                </div>
              </div>

              {/* Quick test adjustments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/40 border border-zinc-800 p-3 rounded-xl">
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span>Quick Offset:</span>
                    <span className="font-mono text-amber-400">{settings.fingerYOffset}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={settings.fingerYOffset}
                    onChange={(e) =>
                      setSettings({ ...settings, fingerYOffset: parseInt(e.target.value) })
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-300 mb-1">
                    <span>Quick Sensitivity:</span>
                    <span className="font-mono text-cyan-400">
                      {settings.mouseSensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={settings.mouseSensitivity}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mouseSensitivity: parseFloat(e.target.value),
                        touchSensitivity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-zinc-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <button
            id="controls-reset-btn"
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>

          <div className="flex items-center gap-3">
            {saveToast && (
              <span className="text-xs font-mono text-emerald-400 animate-pulse flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> CALIBRATION SAVED
              </span>
            )}

            <button
              id="controls-save-btn"
              type="button"
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-display font-black text-xs tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] active:scale-95 transition"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>SAVE & APPLY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
