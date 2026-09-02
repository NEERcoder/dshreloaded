import { useEffect, useRef } from "react";
import "./InteractiveDotGrid.css";

export type BackgroundPreset =
  | "home"
  | "explore"
  | "directory"
  | "college"
  | "media"
  | "mentors"
  | "opportunities"
  | "team"
  | "admin";

type PresetConfig = {
  gridSpacing: number;
  baseOpacity: number;
  redDotRatio: number; // probability interval (e.g. 17 means 1 in 17 dots is red)
  freeParticlesDesktop: number;
  freeParticlesMobile: number;
  connectionMaxDist: number;
  repulsionForce: number;
  interactionRadius: number;
  enableRipples: boolean;
  enableRadarSweep: boolean;
  enablePackets: boolean;
  enableGlyphs: boolean;
  flowVx: number;
  flowVy: number;
  convergencePull: number;
  parallaxFactor: number;
};

const PRESET_CONFIGS: Record<BackgroundPreset, PresetConfig> = {
  home: {
    gridSpacing: 40,
    baseOpacity: 0.42,
    redDotRatio: 17,
    freeParticlesDesktop: 55,
    freeParticlesMobile: 28,
    connectionMaxDist: 68,
    repulsionForce: 22,
    interactionRadius: 135,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: true,
    enableGlyphs: true,
    flowVx: 0,
    flowVy: 0,
    convergencePull: 0,
    parallaxFactor: 0.06,
  },
  explore: {
    gridSpacing: 42,
    baseOpacity: 0.40,
    redDotRatio: 15,
    freeParticlesDesktop: 50,
    freeParticlesMobile: 26,
    connectionMaxDist: 76,
    repulsionForce: 24,
    interactionRadius: 140,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: true, // Digital university data streaming between campus nodes
    enableGlyphs: true,
    flowVx: 0.05,
    flowVy: 0.02,
    convergencePull: 0,
    parallaxFactor: 0.07,
  },
  directory: {
    gridSpacing: 42,
    baseOpacity: 0.38,
    redDotRatio: 19,
    freeParticlesDesktop: 40,
    freeParticlesMobile: 20,
    connectionMaxDist: 66,
    repulsionForce: 20,
    interactionRadius: 130,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: false,
    enableGlyphs: false,
    flowVx: 0,
    flowVy: 0,
    convergencePull: 0,
    parallaxFactor: 0.05,
  },
  college: {
    gridSpacing: 44,
    baseOpacity: 0.34,
    redDotRatio: 22,
    freeParticlesDesktop: 34,
    freeParticlesMobile: 18,
    connectionMaxDist: 64,
    repulsionForce: 18,
    interactionRadius: 125,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: false,
    enableGlyphs: false,
    flowVx: 0,
    flowVy: 0,
    convergencePull: 0,
    parallaxFactor: 0.09, // Deep vertical scroll responsiveness
  },
  media: {
    gridSpacing: 40,
    baseOpacity: 0.42,
    redDotRatio: 14,
    freeParticlesDesktop: 48,
    freeParticlesMobile: 24,
    connectionMaxDist: 72,
    repulsionForce: 24,
    interactionRadius: 145,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: true,
    enableGlyphs: false,
    flowVx: -0.08,
    flowVy: 0.04,
    convergencePull: 0,
    parallaxFactor: 0.06,
  },
  mentors: {
    gridSpacing: 40,
    baseOpacity: 0.38,
    redDotRatio: 16,
    freeParticlesDesktop: 44,
    freeParticlesMobile: 22,
    connectionMaxDist: 74,
    repulsionForce: 20,
    interactionRadius: 135,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: true,
    enableGlyphs: false,
    flowVx: 0,
    flowVy: 0,
    convergencePull: 0.08,
    parallaxFactor: 0.05,
  },
  opportunities: {
    gridSpacing: 38,
    baseOpacity: 0.44,
    redDotRatio: 11, // More urgency / deadline red highlights
    freeParticlesDesktop: 60,
    freeParticlesMobile: 30,
    connectionMaxDist: 70,
    repulsionForce: 24,
    interactionRadius: 140,
    enableRipples: true,
    enableRadarSweep: true, // Futuristic radar beam sweeping for opportunities
    enablePackets: true,
    enableGlyphs: true,
    flowVx: 0.32, // Forward momentum / directional sweep
    flowVy: -0.12,
    convergencePull: 0,
    parallaxFactor: 0.07,
  },
  team: {
    gridSpacing: 40,
    baseOpacity: 0.40,
    redDotRatio: 14,
    freeParticlesDesktop: 52,
    freeParticlesMobile: 26,
    connectionMaxDist: 72,
    repulsionForce: 22,
    interactionRadius: 135,
    enableRipples: true,
    enableRadarSweep: false,
    enablePackets: true,
    enableGlyphs: true,
    flowVx: 0,
    flowVy: 0,
    convergencePull: 0.18, // Collaborative convergence: particles pull gently toward active cards
    parallaxFactor: 0.06,
  },
  admin: {
    gridSpacing: 48,
    baseOpacity: 0.16,
    redDotRatio: 35,
    freeParticlesDesktop: 12,
    freeParticlesMobile: 6,
    connectionMaxDist: 50,
    repulsionForce: 10,
    interactionRadius: 90,
    enableRipples: false,
    enableRadarSweep: false,
    enablePackets: false,
    enableGlyphs: false,
    flowVx: 0,
    flowVy: 0,
    convergencePull: 0,
    parallaxFactor: 0.02,
  },
};

type GridDot = {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  isRed: boolean;
  scale: number;
  opacity: number;
};

type FreeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isRed: boolean;
  alpha: number;
  layer: number;
};

type Ripple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  isRed: boolean;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  isRed: boolean;
};

type Glyph = {
  xRatio: number;
  yRatio: number;
  type: "plus" | "diamond" | "ring" | "crosshair" | "hex";
  size: number;
  angle: number;
  rotSpeed: number;
  isRed: boolean;
};

type Packet = {
  dotIdxA: number;
  dotIdxB: number;
  progress: number;
  speed: number;
  isRed: boolean;
};

type InteractiveDotGridProps = {
  background?: boolean;
  preset?: BackgroundPreset;
};

export default function InteractiveDotGrid({
  background = false,
  preset = "home",
}: InteractiveDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = PRESET_CONFIGS[preset] || PRESET_CONFIGS.home;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animFrame = 0;
    let lastTime = performance.now();
    let isTabVisible = true;

    // Pointer state
    const pointer = {
      x: -9999,
      y: -9999,
      prevX: -9999,
      prevY: -9999,
      vx: 0,
      vy: 0,
      speed: 0,
      active: false,
    };

    // Scroll parallax tracking
    let scrollY = window.scrollY || 0;
    let targetScrollY = scrollY;

    // Attractor state for hovered cards & CTAs
    const attractor = {
      x: -9999,
      y: -9999,
      active: false,
      strength: 0,
    };

    // Radar sweep angle (for opportunities preset)
    let radarAngle = 0;

    // Entity collections
    let dots: GridDot[] = [];
    let freeParticles: FreeParticle[] = [];
    const ripples: Ripple[] = [];
    const sparks: Spark[] = [];
    const packets: Packet[] = [];

    // Ambient floating glyphs
    const glyphs: Glyph[] = config.enableGlyphs
      ? [
          { xRatio: 0.12, yRatio: 0.22, type: "plus", size: 9, angle: 0, rotSpeed: 0.003, isRed: false },
          { xRatio: 0.88, yRatio: 0.18, type: "diamond", size: 10, angle: 0, rotSpeed: -0.0025, isRed: true },
          { xRatio: 0.82, yRatio: 0.65, type: "ring", size: 12, angle: 0, rotSpeed: 0.002, isRed: false },
          { xRatio: 0.18, yRatio: 0.78, type: "crosshair", size: 11, angle: 0, rotSpeed: -0.003, isRed: false },
          { xRatio: 0.5, yRatio: 0.92, type: "hex", size: 10, angle: 0, rotSpeed: 0.002, isRed: true },
          { xRatio: 0.92, yRatio: 0.42, type: "plus", size: 8, angle: 0, rotSpeed: 0.0035, isRed: false },
        ]
      : [];

    let lastRippleTime = 0;
    let ambientPulseTimer = 0;

    // Initialize grid & entities
    const init = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.5 : 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = isTouchDevice ? Math.max(config.gridSpacing, 34) : config.gridSpacing;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const xOffset = (width - (cols - 1) * spacing) / 2;
      const yOffset = (height - (rows - 1) * spacing) / 2;

      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = xOffset + c * spacing;
          const y = yOffset + r * spacing;
          dots.push({
            originX: x,
            originY: y,
            x,
            y,
            vx: 0,
            vy: 0,
            phase: (c * 0.73 + r * 1.17) % (Math.PI * 2),
            isRed: (c * 7 + r * 13) % config.redDotRatio === 0,
            scale: 1,
            opacity: config.baseOpacity,
          });
        }
      }

      // Free-drifting particles
      const count = isTouchDevice ? config.freeParticlesMobile : config.freeParticlesDesktop;
      freeParticles = [];
      for (let i = 0; i < count; i++) {
        const isRed = i % 7 === 0;
        const layer = i % 3;
        freeParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (0.3 + layer * 0.25) + config.flowVx,
          vy: (Math.random() - 0.5) * (0.3 + layer * 0.25) + config.flowVy,
          radius: layer === 2 ? 2.4 : layer === 1 ? 1.8 : 1.2,
          isRed,
          alpha: layer === 2 ? 0.65 : layer === 1 ? 0.45 : 0.25,
          layer,
        });
      }

      // Traveling data packets (representing university signals)
      packets.length = 0;
      if (config.enablePackets && dots.length > 10) {
        const packetCount = isTouchDevice ? 4 : 8;
        for (let k = 0; k < packetCount; k++) {
          const idxA = Math.floor(Math.random() * (dots.length - 1));
          packets.push({
            dotIdxA: idxA,
            dotIdxB: Math.min(dots.length - 1, idxA + 1),
            progress: Math.random(),
            speed: 0.012 + Math.random() * 0.016,
            isRed: k % 3 === 0,
          });
        }
      }
    };

    const addRipple = (x: number, y: number, isRed = false, maxRad = 190) => {
      if (!config.enableRipples) return;
      if (ripples.length >= 5) ripples.shift();
      ripples.push({
        x,
        y,
        radius: 4,
        maxRadius: maxRad,
        speed: 4.8,
        alpha: 0.5,
        isRed,
      });
    };

    const addSparks = (x: number, y: number, count = 8, isRed = false) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const spd = 1.8 + Math.random() * 2.8;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          alpha: 0.9,
          decay: 0.035 + Math.random() * 0.02,
          isRed: Math.random() > 0.6 ? !isRed : isRed,
        });
      }
    };

    // Accessibility static frame
    if (prefersReducedMotion) {
      init();
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        ctx.beginPath();
        ctx.arc(dot.originX, dot.originY, dot.isRed ? 2.6 : 2.0, 0, Math.PI * 2);
        ctx.fillStyle = dot.isRed
          ? `rgba(230, 57, 70, ${config.baseOpacity * 0.9})`
          : `rgba(29, 78, 137, ${config.baseOpacity * 0.8})`;
        ctx.fill();
      }
      return;
    }

    const interactionRadiusSq = config.interactionRadius * config.interactionRadius;
    const connectionMaxDistSq = config.connectionMaxDist * config.connectionMaxDist;

    // MAIN RENDER LOOP
    const render = (time: number) => {
      if (!isTabVisible) {
        animFrame = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min(time - lastTime, 35);
      lastTime = time;
      const tSec = time * 0.001;

      scrollY += (targetScrollY - scrollY) * 0.1;
      const scrollParallax = scrollY * config.parallaxFactor;

      ctx.clearRect(0, 0, width, height);

      // Radar Sweep (Opportunities Radar)
      if (config.enableRadarSweep) {
        radarAngle += 0.006 * (dt / 16);
        const rLen = Math.max(width, height) * 0.8;
        const radarTargetX = width * 0.5 + Math.cos(radarAngle) * rLen;
        const radarTargetY = height * 0.35 + Math.sin(radarAngle) * rLen;

        const radarGrad = ctx.createLinearGradient(width * 0.5, height * 0.35, radarTargetX, radarTargetY);
        radarGrad.addColorStop(0, "rgba(29, 78, 137, 0.05)");
        radarGrad.addColorStop(1, "rgba(29, 78, 137, 0)");

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height * 0.35);
        ctx.arc(width * 0.5, height * 0.35, rLen, radarAngle - 0.25, radarAngle);
        ctx.closePath();
        ctx.fillStyle = radarGrad;
        ctx.fill();
        ctx.restore();
      }

      // Ambient Energy Pulse (every 5.5s)
      if (config.enableRipples) {
        ambientPulseTimer += dt;
        if (ambientPulseTimer > 5500) {
          ambientPulseTimer = 0;
          const pulseX = width * (0.2 + Math.random() * 0.6);
          const pulseY = height * (0.25 + Math.random() * 0.5);
          addRipple(pulseX, pulseY, Math.random() > 0.5, 160);
        }
      }

      // Attractor decay / smoothing
      if (attractor.active && attractor.strength < 1) {
        attractor.strength = Math.min(1, attractor.strength + 0.08);
      } else if (!attractor.active && attractor.strength > 0) {
        attractor.strength = Math.max(0, attractor.strength - 0.06);
      }

      // 1. Process Ripples
      for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
        const rip = ripples[rIdx];
        rip.radius += rip.speed * (dt / 16);
        rip.alpha = Math.max(0, rip.alpha - 0.012 * (dt / 16));

        if (rip.radius >= rip.maxRadius || rip.alpha <= 0) {
          ripples.splice(rIdx, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rip.isRed
          ? `rgba(230, 57, 70, ${rip.alpha * 0.35})`
          : `rgba(29, 78, 137, ${rip.alpha * 0.28})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 2. Process Sparks
      for (let sIdx = sparks.length - 1; sIdx >= 0; sIdx--) {
        const spk = sparks[sIdx];
        spk.x += spk.vx * (dt / 16);
        spk.y += spk.vy * (dt / 16);
        spk.vx *= 0.94;
        spk.vy *= 0.94;
        spk.alpha -= spk.decay * (dt / 16);

        if (spk.alpha <= 0) {
          sparks.splice(sIdx, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(spk.x, spk.y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = spk.isRed
          ? `rgba(230, 57, 70, ${spk.alpha})`
          : `rgba(29, 78, 137, ${spk.alpha})`;
        ctx.fill();
      }

      // 3. Update & Render Grid Nodes
      const activeExcitedDots: GridDot[] = [];

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Breathing oscillation
        const idleX = Math.sin(tSec * 0.85 + dot.phase) * 2.2;
        const idleY = Math.cos(tSec * 0.72 + dot.phase) * 2.2;

        let targetX = dot.originX + idleX;
        let targetY = dot.originY + idleY - scrollParallax * 0.3;

        let totalInfluence = 0;

        // Convergence pull (Team / Mentors preset)
        if (config.convergencePull > 0) {
          const cdx = (width * 0.5) - dot.x;
          const cdy = (height * 0.4) - dot.y;
          targetX += cdx * config.convergencePull * 0.015;
          targetY += cdy * config.convergencePull * 0.015;
        }

        // Pointer proximity physics
        if (pointer.active) {
          const dx = dot.x - pointer.x;
          const dy = dot.y - pointer.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < interactionRadiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / config.interactionRadius;
            totalInfluence += factor;

            const repelForce = factor * config.repulsionForce;
            targetX += (dx / dist) * repelForce;
            targetY += (dy / dist) * repelForce;

            targetX += pointer.vx * factor * 0.35;
            targetY += pointer.vy * factor * 0.35;

            activeExcitedDots.push(dot);
          }
        }

        // Ripple impact
        for (let r = 0; r < ripples.length; r++) {
          const rip = ripples[r];
          const rx = dot.x - rip.x;
          const ry = dot.y - rip.y;
          const rDist = Math.sqrt(rx * rx + ry * ry);
          const waveDelta = Math.abs(rDist - rip.radius);

          if (waveDelta < 18 && rDist > 0) {
            const waveStrength = (1 - waveDelta / 18) * rip.alpha;
            targetX += (rx / rDist) * waveStrength * 12;
            targetY += (ry / rDist) * waveStrength * 12;
            totalInfluence = Math.max(totalInfluence, waveStrength * 1.5);
          }
        }

        // Radar beam illumination impact
        if (config.enableRadarSweep) {
          const rAngleToDot = Math.atan2(dot.y - height * 0.35, dot.x - width * 0.5);
          const normalizedDiff = Math.abs(((rAngleToDot - radarAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
          if (normalizedDiff < 0.15) {
            totalInfluence += (1 - normalizedDiff / 0.15) * 0.4;
          }
        }

        // Attractor Pull
        if (attractor.strength > 0) {
          const ax = attractor.x - dot.x;
          const ay = attractor.y - dot.y;
          const aDistSq = ax * ax + ay * ay;
          if (aDistSq < 32400 && aDistSq > 0) {
            const aDist = Math.sqrt(aDistSq);
            const aFactor = (1 - aDist / 180) * attractor.strength;
            targetX += (ax / aDist) * aFactor * 9;
            targetY += (ay / aDist) * aFactor * 9;
            totalInfluence = Math.max(totalInfluence, aFactor * 0.8);
          }
        }

        // Velocity integration
        const ax = (targetX - dot.x) * 0.18;
        const ay = (targetY - dot.y) * 0.18;
        dot.vx = (dot.vx + ax) * 0.78;
        dot.vy = (dot.vy + ay) * 0.78;
        dot.x += dot.vx * (dt / 16);
        dot.y += dot.vy * (dt / 16);

        dot.scale = 1 + totalInfluence * 0.85;
        dot.opacity = Math.min(0.95, config.baseOpacity + totalInfluence * 0.5);

        // Draw node
        ctx.beginPath();
        const baseRadius = dot.isRed ? 2.8 : 2.2;
        ctx.arc(dot.x, dot.y, baseRadius * dot.scale, 0, Math.PI * 2);

        if (dot.isRed) {
          ctx.fillStyle = `rgba(230, 57, 70, ${dot.opacity})`;
        } else {
          ctx.fillStyle = `rgba(29, 78, 137, ${dot.opacity * 0.85})`;
        }
        ctx.fill();
      }

      // 4. Render Ethereal Constellation Filaments Between Neighboring Nodes
      if (activeExcitedDots.length > 1) {
        for (let j = 0; j < activeExcitedDots.length; j++) {
          const d1 = activeExcitedDots[j];
          for (let k = j + 1; k < activeExcitedDots.length; k++) {
            const d2 = activeExcitedDots[k];
            const distSq = (d1.x - d2.x) * (d1.x - d2.x) + (d1.y - d2.y) * (d1.y - d2.y);

            if (distSq < connectionMaxDistSq) {
              const segDist = Math.sqrt(distSq);
              const lineAlpha = (1 - segDist / config.connectionMaxDist) * 0.32;
              ctx.beginPath();
              ctx.moveTo(d1.x, d1.y);
              ctx.lineTo(d2.x, d2.y);
              ctx.strokeStyle = d1.isRed || d2.isRed
                ? `rgba(230, 57, 70, ${lineAlpha * 0.9})`
                : `rgba(29, 78, 137, ${lineAlpha})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }
      }

      // 5. Render Traveling Data Packets (Digital University signals)
      if (config.enablePackets && packets.length > 0 && dots.length > 0) {
        for (let pI = 0; pI < packets.length; pI++) {
          const pkt = packets[pI];
          pkt.progress += pkt.speed * (dt / 16);

          if (pkt.progress >= 1) {
            pkt.progress = 0;
            pkt.dotIdxA = pkt.dotIdxB;
            // Pick an adjacent or nearby node
            pkt.dotIdxB = Math.floor(Math.random() * dots.length);
          }

          const dotA = dots[pkt.dotIdxA];
          const dotB = dots[pkt.dotIdxB];
          if (dotA && dotB) {
            const pkx = dotA.x + (dotB.x - dotA.x) * pkt.progress;
            const pky = dotA.y + (dotB.y - dotA.y) * pkt.progress;

            ctx.beginPath();
            ctx.arc(pkx, pky, 2.0, 0, Math.PI * 2);
            ctx.fillStyle = pkt.isRed ? "rgba(230, 57, 70, 0.75)" : "rgba(29, 78, 137, 0.75)";
            ctx.fill();
          }
        }
      }

      // 6. Free-Drifting Campus Energy Particles
      for (let pIdx = 0; pIdx < freeParticles.length; pIdx++) {
        const p = freeParticles[pIdx];

        const layerSpeed = 0.4 + p.layer * 0.3;
        p.x += (p.vx + config.flowVx) * layerSpeed * (dt / 16);
        p.y += (p.vy + config.flowVy) * layerSpeed * (dt / 16);

        if (p.x < -20) p.x = width + 10;
        if (p.x > width + 20) p.x = -10;
        if (p.y < -20) p.y = height + 10;
        if (p.y > height + 20) p.y = -10;

        // Pointer fluid wake
        if (pointer.active) {
          const pdx = p.x - pointer.x;
          const pdy = p.y - pointer.y;
          const pDistSq = pdx * pdx + pdy * pdy;
          if (pDistSq < 16000 && pDistSq > 0) {
            const pDist = Math.sqrt(pDistSq);
            const push = (1 - pDist / 126) * 1.5;
            p.vx += (pdx / pDist) * push * 0.2;
            p.vy += (pdy / pDist) * push * 0.2;
          }
        }

        // Attractor magnetic attraction
        if (attractor.strength > 0) {
          const adx = attractor.x - p.x;
          const ady = attractor.y - p.y;
          const aDistSq = adx * adx + ady * ady;
          if (aDistSq < 40000 && aDistSq > 0) {
            const aDist = Math.sqrt(aDistSq);
            const aPull = (1 - aDist / 200) * attractor.strength * 0.4;
            p.vx += (adx / aDist) * aPull;
            p.vy += (ady / aDist) * aPull;
          }
        }

        p.vx *= 0.985;
        p.vy *= 0.985;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isRed
          ? `rgba(230, 57, 70, ${p.alpha})`
          : `rgba(29, 78, 137, ${p.alpha})`;
        ctx.fill();
      }

      // 7. Floating Minimalist Campus Glyphs
      for (let g = 0; g < glyphs.length; g++) {
        const glyph = glyphs[g];
        glyph.angle += glyph.rotSpeed;

        const gx = glyph.xRatio * width;
        const gy = glyph.yRatio * height - scrollParallax * 0.5;

        let gAlpha = 0.18;
        let gScale = 1;
        if (pointer.active) {
          const gdx = gx - pointer.x;
          const gdy = gy - pointer.y;
          const gDist = Math.hypot(gdx, gdy);
          if (gDist < 160) {
            const gFactor = 1 - gDist / 160;
            gAlpha += gFactor * 0.45;
            gScale += gFactor * 0.35;
          }
        }

        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(glyph.angle);
        ctx.scale(gScale, gScale);
        ctx.strokeStyle = glyph.isRed
          ? `rgba(230, 57, 70, ${gAlpha})`
          : `rgba(29, 78, 137, ${gAlpha})`;
        ctx.lineWidth = 1.2;

        const s = glyph.size;
        if (glyph.type === "plus") {
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.moveTo(0, -s);
          ctx.lineTo(0, s);
          ctx.stroke();
        } else if (glyph.type === "diamond") {
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s, 0);
          ctx.closePath();
          ctx.stroke();
        } else if (glyph.type === "ring") {
          ctx.beginPath();
          ctx.arc(0, 0, s, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(s * 0.7, 0, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
        } else if (glyph.type === "crosshair") {
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(-s * 0.5, 0);
          ctx.moveTo(s * 0.5, 0);
          ctx.lineTo(s, 0);
          ctx.moveTo(0, -s);
          ctx.lineTo(0, -s * 0.5);
          ctx.moveTo(0, s * 0.5);
          ctx.lineTo(0, s);
          ctx.stroke();
        } else if (glyph.type === "hex") {
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const hAngle = (Math.PI / 3) * h;
            const hx = Math.cos(hAngle) * s;
            const hy = Math.sin(hAngle) * s;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
      }

      animFrame = requestAnimationFrame(render);
    };

    // Event Handlers
    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (pointer.active) {
        pointer.vx = x - pointer.prevX;
        pointer.vy = y - pointer.prevY;
        pointer.speed = Math.hypot(pointer.vx, pointer.vy);

        const now = performance.now();
        if (pointer.speed > 28 && now - lastRippleTime > 320) {
          lastRippleTime = now;
          addRipple(x, y, Math.random() > 0.6, 170);
        }
      } else {
        pointer.vx = 0;
        pointer.vy = 0;
        pointer.speed = 0;
      }

      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      attractor.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      addRipple(e.clientX, e.clientY, Math.random() > 0.5, 220);
      addSparks(e.clientX, e.clientY, 8, Math.random() > 0.5);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        pointer.x = touch.clientX;
        pointer.y = touch.clientY;
        pointer.prevX = touch.clientX;
        pointer.prevY = touch.clientY;
        pointer.active = true;

        addRipple(touch.clientX, touch.clientY, Math.random() > 0.5, 180);
        addSparks(touch.clientX, touch.clientY, 6, Math.random() > 0.5);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        pointer.vx = touch.clientX - pointer.prevX;
        pointer.vy = touch.clientY - pointer.prevY;
        pointer.prevX = pointer.x;
        pointer.prevY = pointer.y;
        pointer.x = touch.clientX;
        pointer.y = touch.clientY;
        pointer.active = true;
      }
    };

    const handleTouchEnd = () => {
      pointer.active = false;
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY || 0;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest("a, button, .card, [data-cursor]") as HTMLElement | null;
      if (interactive) {
        const rect = interactive.getBoundingClientRect();
        attractor.x = rect.left + rect.width / 2;
        attractor.y = rect.top + rect.height / 2;
        attractor.active = true;
      } else {
        attractor.active = false;
      }
    };

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastTime = performance.now();
      }
    };

    init();
    window.addEventListener("resize", init);
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (!isTouchDevice) {
      window.addEventListener("mousemove", handlePointerMove, { passive: true });
      window.addEventListener("mouseleave", handlePointerLeave);
      window.addEventListener("click", handleClick, { passive: true });
      document.addEventListener("mouseover", handleMouseOver, { passive: true });
    } else {
      window.addEventListener("touchstart", handleTouchStart, { passive: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleTouchEnd, { passive: true });
    }

    animFrame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", init);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (!isTouchDevice) {
        window.removeEventListener("mousemove", handlePointerMove);
        window.removeEventListener("mouseleave", handlePointerLeave);
        window.removeEventListener("click", handleClick);
        document.removeEventListener("mouseover", handleMouseOver);
      } else {
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [preset, config]);

  const canvas = (
    <canvas
      ref={canvasRef}
      className="dot-grid-canvas"
      aria-hidden="true"
    />
  );

  if (background) {
    return <div className="dot-grid-background pointer-events-none">{canvas}</div>;
  }

  return (
    <main className="dot-grid-page">
      {canvas}
      <p className="sr-only">Living DU Science Hub Digital Campus Network</p>
    </main>
  );
}