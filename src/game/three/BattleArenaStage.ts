import * as THREE from 'three';
import { CharacterId, PlayerAction, PlayerState } from '../../types';
import { soundManager } from '../sound';
import { CharacterMeshHandle, loadCharacterModel } from './modelLoader';

export interface Projectile {
  id: string;
  mesh: THREE.Mesh;
  ownerId: string;
  velocity: THREE.Vector3;
  damage: number;
  lifetime: number;
  maxLifetime: number;
}

export interface HitEffect {
  mesh: THREE.Object3D;
  lifetime: number;
}

export interface FloatingText {
  id: string;
  position: THREE.Vector3;
  text: string;
  color: string;
  lifetime: number;
}

export class BattleArenaStage {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock = new THREE.Clock();
  private animFrameId: number = 0;

  // Local player tracking
  private localPlayerId: string;
  private localYaw: number = 0;
  private isJumping: boolean = false;
  private verticalVelocity: number = 0;
  private jumpCount: number = 0;
  private isDoubleJumping: boolean = false;
  private flipRotation: number = 0;
  private isGroundSlam: boolean = false;
  private slamProgress: number = 0;

  // Dash locomotion
  private isDashing: boolean = false;
  private dashProgress: number = 0;
  private dashCooldown: number = 0;
  private dashVelocity: THREE.Vector3 = new THREE.Vector3();
  private ghostTrailTimer: number = 0;

  // Combat states
  private isAttacking: boolean = false;
  private attackProgress: number = 0;
  private isSpecialActive: boolean = false;
  private specialProgress: number = 0;
  private isHitStun: boolean = false;
  private hitProgress: number = 0;
  private attackCombo: number = 0;
  private lastAttackTime: number = 0;

  // Camera dynamics
  private cameraShake: number = 0;
  private cameraFovTarget: number = 55;

  // Stage visual elements
  private ambientParticles?: THREE.Points;
  private arenaCrystals: THREE.Mesh[] = [];
  private arenaRing2Mat?: THREE.MeshBasicMaterial;

  // Key tracking
  private keys: Record<string, boolean> = {};

  // Track pending model loads to prevent duplicate/triplicate instances
  private loadingPlayerIds: Set<string> = new Set();
  private disposed: boolean = false;

  // Players map: playerId -> { handle, state, targetPos, targetRot, isLocal }
  private playerRigs: Map<string, {
    handle: CharacterMeshHandle;
    state: PlayerState;
    targetPos: THREE.Vector3;
    targetRot: number;
    currentPos: THREE.Vector3;
    currentRot: number;
    attackProg: number;
    attackCombo?: number;
    specialProg: number;
    hitProg: number;
    isDashing?: boolean;
    dashProg?: number;
    isDoubleJumping?: boolean;
    flipRot?: number;
    isGroundSlam?: boolean;
  }> = new Map();

  // Arena dimensions
  public readonly ARENA_RADIUS = 20;

  // Projectiles and effects
  private projectiles: Projectile[] = [];
  private hitEffects: HitEffect[] = [];
  public floatingTexts: FloatingText[] = [];

  // Callbacks
  public onStateUpdate?: (pos: [number, number, number], rot: number, action: PlayerAction, isBlocking: boolean) => void;
  public onAttackTriggered?: (type: 'light' | 'special', origin: [number, number, number], direction: [number, number, number]) => void;
  public onHitTarget?: (targetId: string, damage: number, type: string) => void;

  // Movement audio feedback timers
  private footstepTimer: number = 0;
  private footstepAlternate: boolean = false;

  constructor(container: HTMLElement, localPlayerId: string) {
    this.container = container;
    this.localPlayerId = localPlayerId;

    // Start subtle atmospheric cyber arena drone
    soundManager.startAmbientDrone();

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.025);

    // Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 150);
    this.camera.position.set(0, 5, 8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.buildArenaEnvironment();
    this.setupControls();
    this.startLoop();
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 60;
    const d = 25;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Cyan and Magenta rim spotlights
    const light1 = new THREE.PointLight(0x06b6d4, 3, 30);
    light1.position.set(-18, 5, -18);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xec4899, 3, 30);
    light2.position.set(18, 5, 18);
    this.scene.add(light2);
  }

  private buildArenaEnvironment() {
    // Floor
    const floorGeo = new THREE.CylinderGeometry(this.ARENA_RADIUS, this.ARENA_RADIUS + 1, 1, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Arena Floor Markings: Concentric Glowing Rings
    const ring1 = new THREE.Mesh(
      new THREE.RingGeometry(this.ARENA_RADIUS - 0.4, this.ARENA_RADIUS, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.02;
    this.scene.add(ring1);

    const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(6, 6.3, 48),
      ring2Mat
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.02;
    this.scene.add(ring2);
    this.arenaRing2Mat = ring2Mat;

    // Grid pattern
    const grid = new THREE.PolarGridHelper(this.ARENA_RADIUS - 1, 12, 6, 48, 0x1e293b, 0x0f172a);
    grid.position.y = 0.03;
    this.scene.add(grid);

    // Perimeter energy barrier pillars
    const pillarCount = 16;
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const x = Math.cos(angle) * (this.ARENA_RADIUS - 0.3);
      const z = Math.sin(angle) * (this.ARENA_RADIUS - 0.3);

      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 3, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
      );
      pillar.position.set(x, 1.5, z);
      pillar.castShadow = true;
      this.scene.add(pillar);

      // Neon crystal on top
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x06b6d4 : 0xec4899 })
      );
      crystal.position.set(x, 3.2, z);
      this.scene.add(crystal);
      this.arenaCrystals.push(crystal);
    }

    // Ambient floating Cyber Motes / Particles
    const motesCount = 70;
    const motesGeo = new THREE.BufferGeometry();
    const motesPos = new Float32Array(motesCount * 3);
    for (let i = 0; i < motesCount * 3; i += 3) {
      const r = Math.random() * (this.ARENA_RADIUS - 1.5);
      const theta = Math.random() * Math.PI * 2;
      motesPos[i] = Math.cos(theta) * r;
      motesPos[i + 1] = 0.4 + Math.random() * 4.2;
      motesPos[i + 2] = Math.sin(theta) * r;
    }
    motesGeo.setAttribute('position', new THREE.BufferAttribute(motesPos, 3));
    const motesMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.1,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    this.ambientParticles = new THREE.Points(motesGeo, motesMat);
    this.scene.add(this.ambientParticles);

    // 4 Energy Obelisks for tactical cover inside arena
    const coverCoords = [
      [-7, -7],
      [7, 7],
      [-7, 7],
      [7, -7],
    ];
    coverCoords.forEach(([cx, cz]) => {
      const obelisk = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.8, 1.6),
        new THREE.MeshStandardMaterial({
          color: 0x1e1e38,
          metalness: 0.9,
          roughness: 0.2,
        })
      );
      obelisk.position.set(cx, 1.4, cz);
      obelisk.castShadow = true;
      obelisk.receiveShadow = true;
      this.scene.add(obelisk);

      // Glowing groove line
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 2.6, 1.62),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      line.position.set(cx, 1.4, cz);
      this.scene.add(line);
    });
  }

  private setupControls() {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this.keys[key] = true;

      // Jump & Acrobatic Double Jump
      if (e.code === 'Space') {
        const localRig = this.playerRigs.get(this.localPlayerId);
        if (!this.isJumping) {
          this.isJumping = true;
          this.jumpCount = 1;
          this.verticalVelocity = 8.8;
          soundManager.playJump();
          if (localRig) this.createDustPuffVfx(localRig.currentPos, 0.9);
        } else if (this.isJumping && this.jumpCount === 1) {
          this.jumpCount = 2;
          this.verticalVelocity = 9.8;
          this.isDoubleJumping = true;
          this.flipRotation = 0;
          soundManager.playDoubleJump();
          if (localRig) this.createAirPulseVfx(localRig.currentPos);
        }
      }

      // High-speed evasive Dash (Q or C)
      if (key === 'q' || key === 'c') {
        this.triggerLocalDash();
      }

      // Attack / Combo / Aerial Ground Slam
      if (key === 'j' || key === 'f') {
        this.triggerLocalAttack();
      }

      // Special
      if (key === 'k' || key === 'e') {
        this.triggerLocalSpecial();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.key.toLowerCase()] = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      // Avoid firing when clicking UI buttons
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      if (e.button === 0) {
        this.triggerLocalAttack();
      } else if (e.button === 2) {
        this.triggerLocalSpecial();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.container.addEventListener('mousedown', onMouseDown);
    this.container.addEventListener('contextmenu', onContextMenu);
  }

  public async syncPlayer(playerState: PlayerState, customBuffer?: ArrayBuffer | null) {
    if (this.disposed) return;
    let rig = this.playerRigs.get(playerState.id);
    if (!rig) {
      if (this.loadingPlayerIds.has(playerState.id)) {
        // Prevent concurrent async creation of duplicate/triplicate models for the same player
        return;
      }
      this.loadingPlayerIds.add(playerState.id);

      try {
        const handle = await loadCharacterModel(playerState.characterId, customBuffer);
        if (this.disposed) {
          return;
        }

        // If player rig was added while awaiting, avoid duplicate
        if (this.playerRigs.has(playerState.id)) {
          this.scene.remove(handle.root);
          return;
        }

        this.scene.add(handle.root);

        rig = {
          handle,
          state: { ...playerState },
          targetPos: new THREE.Vector3(...playerState.position),
          targetRot: playerState.rotation,
          currentPos: new THREE.Vector3(...playerState.position),
          currentRot: playerState.rotation,
          attackProg: 0,
          specialProg: 0,
          hitProg: 0,
        };
        this.playerRigs.set(playerState.id, rig);

        handle.root.position.copy(rig.currentPos);
        handle.root.rotation.y = rig.currentRot + Math.PI;

        if (playerState.id === this.localPlayerId) {
          this.localYaw = playerState.rotation;
        }
      } catch (err) {
        console.error('Failed to sync player 3D rig:', err);
      } finally {
        this.loadingPlayerIds.delete(playerState.id);
      }
    } else {
      // If character ID changed, hot-swap model cleanly
      if (rig.state.characterId !== playerState.characterId) {
        this.scene.remove(rig.handle.root);
        try {
          const handle = await loadCharacterModel(playerState.characterId, customBuffer);
          if (!this.disposed && this.playerRigs.has(playerState.id)) {
            this.scene.add(handle.root);
            rig.handle = handle;
          }
        } catch (e) {
          console.error('Error swapping character model:', e);
        }
      }
      // Update targets
      rig.state = { ...playerState };
      rig.targetPos.set(...playerState.position);
      rig.targetRot = playerState.rotation;
    }
  }

  public removePlayer(playerId: string) {
    const rig = this.playerRigs.get(playerId);
    if (rig) {
      this.scene.remove(rig.handle.root);
      this.playerRigs.delete(playerId);
    }
  }

  public cleanupStalePlayers(activePlayerIds: string[]) {
    const activeSet = new Set(activePlayerIds);
    this.playerRigs.forEach((rig, id) => {
      if (!activeSet.has(id)) {
        this.scene.remove(rig.handle.root);
        this.playerRigs.delete(id);
      }
    });
  }

  public triggerLocalDash(): boolean {
    if (this.isDashing || this.isHitStun || this.dashCooldown > 0) return false;
    const localRig = this.playerRigs.get(this.localPlayerId);
    if (!localRig || localRig.state.hp <= 0) return false;

    this.isDashing = true;
    this.dashProgress = 0;
    this.dashCooldown = 0.85;
    this.ghostTrailTimer = 0;

    // Determine direction from keys
    let moveX = 0;
    let moveZ = 0;
    if (this.keys['w'] || this.keys['arrowup']) moveZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    // If standing still, dash straight forward
    if (moveX === 0 && moveZ === 0) {
      moveZ = -1;
    }

    const inputDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
    // Rotate input direction by localYaw
    this.dashVelocity.copy(inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.localYaw)).multiplyScalar(28);

    soundManager.playDash();
    this.cameraShake = 0.18;
    this.cameraFovTarget = 62; // wide-angle rush effect

    this.createDustPuffVfx(localRig.currentPos, 1.2);
    this.createDashGhost(localRig.currentPos, this.localYaw);

    return true;
  }

  public getDashCooldownProgress(): number {
    return Math.max(0, this.dashCooldown / 0.85);
  }

  public triggerLocalAttack() {
    if (this.isAttacking || this.isSpecialActive || this.isHitStun || this.isDashing) return;
    const localRig = this.playerRigs.get(this.localPlayerId);
    if (!localRig || localRig.state.hp <= 0) return;

    // Aerial Ground Slam
    if (this.isJumping && !this.isGroundSlam) {
      this.isGroundSlam = true;
      this.verticalVelocity = -26; // plunge downward with intense speed
      soundManager.playAttack(1, localRig.state.characterId);
      this.createSlashVfx(
        [localRig.currentPos.x, localRig.currentPos.y, localRig.currentPos.z],
        this.localYaw,
        1
      );
      if (this.onAttackTriggered) {
        this.onAttackTriggered('light', [localRig.currentPos.x, localRig.currentPos.y, localRig.currentPos.z], [0, -1, 0]);
      }
      return;
    }

    // Ground Combo Attack
    this.isAttacking = true;
    this.attackProgress = 0;
    const now = performance.now();
    if (now - this.lastAttackTime < 900) {
      this.attackCombo = (this.attackCombo + 1) % 3;
    } else {
      this.attackCombo = 0;
    }
    this.lastAttackTime = now;

    soundManager.playAttack(this.attackCombo, localRig.state.characterId);

    // Direction vector facing forward
    const dir = new THREE.Vector3(
      -Math.sin(this.localYaw),
      0,
      -Math.cos(this.localYaw)
    ).normalize();

    const origin: [number, number, number] = [
      localRig.currentPos.x + dir.x * 1.1,
      localRig.currentPos.y + (this.attackCombo === 1 ? 1.5 : 1.1),
      localRig.currentPos.z + dir.z * 1.1,
    ];

    this.createSlashVfx(origin, this.localYaw, this.attackCombo);

    if (this.onAttackTriggered) {
      this.onAttackTriggered('light', origin, [dir.x, dir.y, dir.z]);
    }

    // Finisher camera shake and radius boost
    const baseDmg = 20 + this.attackCombo * 6;
    const hitRadius = this.attackCombo === 2 ? 3.4 : 2.6;
    if (this.attackCombo === 2) {
      this.cameraShake = 0.28;
    }

    // Check hit immediately on local opponents
    this.checkHitBox(origin, hitRadius, baseDmg, 'light');
  }

  public triggerLocalSpecial() {
    if (this.isAttacking || this.isSpecialActive || this.isHitStun || this.isDashing) return;
    const localRig = this.playerRigs.get(this.localPlayerId);
    if (!localRig || localRig.state.hp <= 0 || localRig.state.energy < 40) return;

    this.isSpecialActive = true;
    this.specialProgress = 0;
    soundManager.playSpecial(localRig.state.characterId);

    const dir = new THREE.Vector3(
      -Math.sin(this.localYaw),
      0,
      -Math.cos(this.localYaw)
    ).normalize();

    const origin: [number, number, number] = [
      localRig.currentPos.x + dir.x * 1.1,
      localRig.currentPos.y + 1.2,
      localRig.currentPos.z + dir.z * 1.1,
    ];

    // Spawn projectile / shockwave
    this.spawnSpecialProjectile(this.localPlayerId, origin, dir);

    if (this.onAttackTriggered) {
      this.onAttackTriggered('special', origin, [dir.x, dir.y, dir.z]);
    }
  }

  public spawnRemoteAttack(sourceId: string, type: 'light' | 'special', origin: [number, number, number], dir: [number, number, number]) {
    if (sourceId === this.localPlayerId) return; // already spawned locally

    const rig = this.playerRigs.get(sourceId);
    if (type === 'light') {
      const currentCombo = (rig?.attackCombo ?? 0);
      soundManager.playAttack(currentCombo, rig?.state.characterId);
      const yaw = Math.atan2(-dir[0], -dir[2]);
      this.createSlashVfx(origin, yaw, currentCombo);
      if (rig) {
        rig.attackProg = 0.01;
        rig.attackCombo = (currentCombo + 1) % 3;
      }
    } else {
      soundManager.playSpecial(rig?.state.characterId);
      this.spawnSpecialProjectile(sourceId, origin, new THREE.Vector3(...dir));
      if (rig) rig.specialProg = 0.01;
    }
  }

  private createSlashVfx(origin: [number, number, number], yaw: number, combo: number = 0) {
    if (combo === 2) {
      // COMBO 3: Dual 360 Cyclone Wave!
      const ringGeo = new THREE.RingGeometry(1.2, 2.6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xec4899,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const cyclone = new THREE.Mesh(ringGeo, ringMat);
      cyclone.position.set(...origin);
      cyclone.rotation.x = -Math.PI / 2;
      this.scene.add(cyclone);
      this.hitEffects.push({ mesh: cyclone, lifetime: 0.32 });

      const innerGeo = new THREE.RingGeometry(0.5, 1.4, 32);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const inner = new THREE.Mesh(innerGeo, innerMat);
      inner.position.set(...origin);
      inner.rotation.x = -Math.PI / 2;
      this.scene.add(inner);
      this.hitEffects.push({ mesh: inner, lifetime: 0.28 });
    } else if (combo === 1) {
      // COMBO 2: Rising Uppercut Slash (vertical golden crescent)
      const geo = new THREE.RingGeometry(0.9, 1.7, 24, 1, -Math.PI * 0.45, Math.PI * 0.9);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const slash = new THREE.Mesh(geo, mat);
      slash.position.set(...origin);
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      slash.lookAt(slash.position.clone().add(forward));
      slash.rotateZ(Math.PI / 2); // vertical orientation
      this.scene.add(slash);
      this.hitEffects.push({ mesh: slash, lifetime: 0.24 });
    } else {
      // COMBO 1: Horizontal Crescent Slash (cyan)
      const geo = new THREE.RingGeometry(0.8, 1.5, 20, 1, -Math.PI * 0.45, Math.PI * 0.9);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const slash = new THREE.Mesh(geo, mat);
      slash.position.set(...origin);
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      slash.lookAt(slash.position.clone().add(forward));
      slash.rotateX(Math.PI / 4);
      this.scene.add(slash);
      this.hitEffects.push({ mesh: slash, lifetime: 0.22 });
    }
  }

  private createGroundSlamVfx(pos: THREE.Vector3) {
    // Ground shockwave crater ring
    const shockwaveGeo = new THREE.RingGeometry(0.6, 4.0, 36);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const shockwave = new THREE.Mesh(shockwaveGeo, shockwaveMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.set(pos.x, 0.05, pos.z);
    this.scene.add(shockwave);
    this.hitEffects.push({ mesh: shockwave, lifetime: 0.38 });

    // Inner bright core ring
    const innerGeo = new THREE.RingGeometry(0.2, 2.0, 28);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(pos.x, 0.06, pos.z);
    this.scene.add(inner);
    this.hitEffects.push({ mesh: inner, lifetime: 0.3 });

    // Radial impact debris sparks
    const sparkGroup = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const sp = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xf43f5e : 0xfbbf24 })
      );
      sp.position.set(pos.x + Math.cos(angle) * 1.5, 0.3, pos.z + Math.sin(angle) * 1.5);
      sparkGroup.add(sp);
    }
    this.scene.add(sparkGroup);
    this.hitEffects.push({ mesh: sparkGroup, lifetime: 0.38 });
  }

  private createAirPulseVfx(pos: THREE.Vector3) {
    const pulseGeo = new THREE.RingGeometry(0.3, 1.8, 24);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.rotation.x = -Math.PI / 2;
    pulse.position.set(pos.x, pos.y - 0.2, pos.z);
    this.scene.add(pulse);
    this.hitEffects.push({ mesh: pulse, lifetime: 0.26 });
  }

  private createDustPuffVfx(pos: THREE.Vector3, scale: number = 1.0) {
    const dustGeo = new THREE.RingGeometry(0.25 * scale, 1.0 * scale, 16);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0x64748b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const dust = new THREE.Mesh(dustGeo, dustMat);
    dust.rotation.x = -Math.PI / 2;
    dust.position.set(pos.x, 0.03, pos.z);
    this.scene.add(dust);
    this.hitEffects.push({ mesh: dust, lifetime: 0.22 });
  }

  private createDashGhost(pos: THREE.Vector3, rot: number) {
    const ghostGeo = new THREE.BoxGeometry(0.7, 1.8, 0.5);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.45,
      wireframe: true,
    });
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    ghost.position.set(pos.x, pos.y + 0.9, pos.z);
    ghost.rotation.y = rot + Math.PI;
    this.scene.add(ghost);
    this.hitEffects.push({ mesh: ghost, lifetime: 0.25 });
  }

  private spawnSpecialProjectile(ownerId: string, origin: [number, number, number], dir: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(0.6, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0xa855f7,
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...origin);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      mesh,
      ownerId,
      velocity: dir.clone().multiplyScalar(18),
      damage: 38,
      lifetime: 0,
      maxLifetime: 2.2,
    });
  }

  private checkHitBox(origin: [number, number, number], radius: number, damage: number, type: string) {
    const center = new THREE.Vector3(...origin);
    this.playerRigs.forEach((rig, id) => {
      if (id === this.localPlayerId || rig.state.hp <= 0) return;

      const dist = rig.currentPos.distanceTo(center);
      if (dist < radius) {
        if (this.onHitTarget) {
          this.onHitTarget(id, damage, type);
        }
      }
    });
  }

  public applyDamageVisual(targetId: string, damage: number, isBlocked: boolean, position?: [number, number, number]) {
    const rig = this.playerRigs.get(targetId);
    const pos = position 
      ? new THREE.Vector3(...position) 
      : (rig ? rig.currentPos.clone().add(new THREE.Vector3(0, 2, 0)) : new THREE.Vector3(0, 2, 0));

    if (isBlocked) {
      soundManager.playBlock();
      this.floatingTexts.push({
        id: Math.random().toString(),
        position: pos,
        text: `DEFESA! -${damage}`,
        color: '#38bdf8',
        lifetime: 0,
      });
    } else {
      soundManager.playHit(damage, damage >= 30);
      this.floatingTexts.push({
        id: Math.random().toString(),
        position: pos,
        text: `-${damage}`,
        color: damage > 30 ? '#ef4444' : '#f59e0b',
        lifetime: 0,
      });
      if (rig) {
        rig.hitProg = 0.01;
      }
      if (targetId === this.localPlayerId) {
        this.isHitStun = true;
        this.hitProgress = 0;
      }
    }

    // Spark particles
    const sparks = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: isBlocked ? 0x38bdf8 : 0xef4444 })
      );
      p.position.copy(pos);
      p.position.x += (Math.random() - 0.5) * 0.5;
      p.position.y += (Math.random() - 0.5) * 0.5;
      p.position.z += (Math.random() - 0.5) * 0.5;
      sparks.add(p);
    }
    this.scene.add(sparks);
    this.hitEffects.push({ mesh: sparks, lifetime: 0.35 });
  }

  public resize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startLoop() {
    let lastNetworkTick = 0;

    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);
      const now = performance.now();

      // Dynamic Stage Elements
      if (this.ambientParticles) {
        const posAttr = this.ambientParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 1; i < arr.length; i += 3) {
          arr[i] += delta * 0.45;
          if (arr[i] > 5) arr[i] = 0.4;
        }
        posAttr.needsUpdate = true;
      }

      this.arenaCrystals.forEach((c, idx) => {
        c.rotation.y += delta * (0.8 + (idx % 3) * 0.2);
        c.position.y = 3.2 + Math.sin(now * 0.003 + idx) * 0.12;
      });

      if (this.arenaRing2Mat) {
        this.arenaRing2Mat.opacity = 0.5 + Math.sin(now * 0.004) * 0.25;
      }

      this.updateLocalPlayer(delta);
      this.updateRemotePlayers(delta);
      this.updateProjectiles(delta);
      this.updateEffects(delta);
      this.updateCamera(delta);

      // Emit network tick at ~25 Hz
      if (now - lastNetworkTick > 40 && this.onStateUpdate) {
        lastNetworkTick = now;
        const localRig = this.playerRigs.get(this.localPlayerId);
        if (localRig) {
          const isMoving = this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d'] ||
            this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright'];
          const isBlocking = !!(this.keys['shift'] || this.keys['l']);
          let action: PlayerAction = 'idle';
          if (localRig.state.hp <= 0) action = 'death';
          else if (this.isDashing) action = 'dash';
          else if (this.isGroundSlam) action = 'ground_slam';
          else if (this.isHitStun) action = 'hit';
          else if (this.isSpecialActive) action = 'special';
          else if (this.isAttacking) action = 'attack';
          else if (isBlocking) action = 'block';
          else if (this.isJumping) action = 'jump';
          else if (isMoving) action = 'walk';

          this.onStateUpdate(
            [localRig.currentPos.x, localRig.currentPos.y, localRig.currentPos.z],
            this.localYaw,
            action,
            isBlocking
          );
        }
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private updateLocalPlayer(delta: number) {
    const rig = this.playerRigs.get(this.localPlayerId);
    if (!rig || rig.state.hp <= 0) return;

    const isBlocking = !!(this.keys['shift'] || this.keys['l']);

    // Dash cooldown timer
    if (this.dashCooldown > 0) {
      this.dashCooldown -= delta;
    }

    // Hit stun timer
    if (this.isHitStun) {
      this.hitProgress += delta * 4;
      if (this.hitProgress >= 1) {
        this.isHitStun = false;
        this.hitProgress = 0;
      }
    }

    // Attack timer
    if (this.isAttacking) {
      this.attackProgress += delta * 3.2;
      if (this.attackProgress >= 1) {
        this.isAttacking = false;
        this.attackProgress = 0;
      }
    }

    // Special timer
    if (this.isSpecialActive) {
      this.specialProgress += delta * 1.8;
      if (this.specialProgress >= 1) {
        this.isSpecialActive = false;
        this.specialProgress = 0;
      }
    }

    // Turn rotation (A/D or Left/Right arrows)
    if (this.keys['a'] || this.keys['arrowleft']) {
      this.localYaw += delta * 3.5;
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      this.localYaw -= delta * 3.5;
    }

    // Dash locomotion execution
    if (this.isDashing) {
      this.dashProgress += delta * 3.8;
      this.ghostTrailTimer += delta;
      if (this.ghostTrailTimer > 0.055) {
        this.ghostTrailTimer = 0;
        this.createDashGhost(rig.currentPos, this.localYaw);
      }
      const nextX = rig.currentPos.x + this.dashVelocity.x * delta;
      const nextZ = rig.currentPos.z + this.dashVelocity.z * delta;
      const dist = Math.hypot(nextX, nextZ);
      if (dist < this.ARENA_RADIUS - 1.2) {
        rig.currentPos.x = nextX;
        rig.currentPos.z = nextZ;
      }
      if (this.dashProgress >= 1) {
        this.isDashing = false;
        this.dashProgress = 0;
        this.createDustPuffVfx(rig.currentPos, 0.8);
      }
    }

    // Move forward/backwards (W/S or Up/Down arrows)
    let moveSpeed = 0;
    const baseSpeed = isBlocking ? 4 : (rig.state.characterId === 'mecha_titan' ? 8 : 11);

    if (!this.isDashing && !this.isSpecialActive) {
      if (this.keys['w'] || this.keys['arrowup']) {
        moveSpeed = baseSpeed;
      } else if (this.keys['s'] || this.keys['arrowdown']) {
        moveSpeed = -baseSpeed * 0.6;
      }
    }

    if (moveSpeed !== 0) {
      const dx = -Math.sin(this.localYaw) * moveSpeed * delta;
      const dz = -Math.cos(this.localYaw) * moveSpeed * delta;

      const nextX = rig.currentPos.x + dx;
      const nextZ = rig.currentPos.z + dz;

      // Keep within arena radius
      const distFromCenter = Math.hypot(nextX, nextZ);
      if (distFromCenter < this.ARENA_RADIUS - 1.2) {
        rig.currentPos.x = nextX;
        rig.currentPos.z = nextZ;
      }
    }

    // Movement footstep audio feedback in the game loop
    if (moveSpeed !== 0 && !this.isJumping && !this.isDashing) {
      const isTitan = rig.state.characterId === 'mecha_titan';
      const stepInterval = isTitan ? 0.42 : 0.32;
      this.footstepTimer += delta;
      if (this.footstepTimer >= stepInterval) {
        this.footstepTimer = 0;
        this.footstepAlternate = !this.footstepAlternate;
        const pitch = this.footstepAlternate ? 1.05 : 0.95;
        soundManager.playFootstep(pitch, Math.abs(moveSpeed) / baseSpeed);
      }
    } else {
      this.footstepTimer = 0.22;
    }

    // Acrobatic double-jump flip progression
    if (this.isDoubleJumping) {
      this.flipRotation += delta * 14;
      if (this.flipRotation >= Math.PI * 2) {
        this.flipRotation = Math.PI * 2;
      }
    }

    // Jumping physics and landing
    if (this.isJumping) {
      if (this.isGroundSlam) {
        this.verticalVelocity -= 48 * delta;
      } else {
        this.verticalVelocity -= 22 * delta;
      }
      rig.currentPos.y += this.verticalVelocity * delta;

      if (rig.currentPos.y <= 0) {
        rig.currentPos.y = 0;
        if (this.isGroundSlam) {
          soundManager.playGroundSlam();
          this.createGroundSlamVfx(rig.currentPos);
          this.cameraShake = 0.55;
          // Seismic crater AoE damage to nearby opponents
          this.checkHitBox([rig.currentPos.x, 0.8, rig.currentPos.z], 4.5, 34, 'slam');
          this.isGroundSlam = false;
        } else {
          soundManager.playLand(Math.abs(this.verticalVelocity));
          this.createDustPuffVfx(rig.currentPos, 0.9);
        }
        this.isJumping = false;
        this.jumpCount = 0;
        this.isDoubleJumping = false;
        this.flipRotation = 0;
        this.verticalVelocity = 0;
      }
    }

    rig.currentRot = this.localYaw;
    rig.handle.root.position.copy(rig.currentPos);
    rig.handle.root.rotation.y = rig.currentRot + Math.PI;

    // Animate local rig with all new locomotion parameters
    rig.handle.animate(delta, {
      action: rig.state.action,
      isMoving: moveSpeed !== 0 || this.isDashing,
      speed: this.isDashing ? 28 : Math.abs(moveSpeed),
      isBlocking,
      attackProgress: this.attackProgress,
      attackCombo: this.attackCombo,
      specialProgress: this.specialProgress,
      hitProgress: this.hitProgress,
      isDead: rig.state.hp <= 0,
      isDashing: this.isDashing,
      dashProgress: this.dashProgress,
      isDoubleJumping: this.isDoubleJumping,
      flipRotation: this.flipRotation,
      isGroundSlam: this.isGroundSlam,
    });
  }

  private updateRemotePlayers(delta: number) {
    this.playerRigs.forEach((rig, id) => {
      if (id === this.localPlayerId) return;

      // Smooth lerp towards network target position and rotation
      rig.currentPos.lerp(rig.targetPos, 0.25);
      rig.currentRot = THREE.MathUtils.lerp(rig.currentRot, rig.targetRot, 0.25);

      rig.handle.root.position.copy(rig.currentPos);
      rig.handle.root.rotation.y = rig.currentRot + Math.PI;

      // Update action progress for remotes
      if (rig.attackProg > 0) {
        rig.attackProg += delta * 3.2;
        if (rig.attackProg >= 1) rig.attackProg = 0;
      }
      if (rig.specialProg > 0) {
        rig.specialProg += delta * 1.8;
        if (rig.specialProg >= 1) rig.specialProg = 0;
      }
      if (rig.hitProg > 0) {
        rig.hitProg += delta * 4;
        if (rig.hitProg >= 1) rig.hitProg = 0;
      }

      const dist = rig.currentPos.distanceTo(rig.targetPos);
      const isMoving = dist > 0.05;
      const isRemoteDashing = rig.state.action === 'dash';
      const isRemoteSlam = rig.state.action === 'ground_slam';

      rig.handle.animate(delta, {
        action: rig.state.action,
        isMoving: isMoving || isRemoteDashing,
        speed: isRemoteDashing ? 26 : (isMoving ? 10 : 0),
        isBlocking: rig.state.isBlocking,
        attackProgress: rig.attackProg,
        attackCombo: rig.attackCombo,
        specialProgress: rig.specialProg,
        hitProgress: rig.hitProg,
        isDead: rig.state.hp <= 0,
        isDashing: isRemoteDashing,
        isGroundSlam: isRemoteSlam,
      });
    });
  }

  private updateProjectiles(delta: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime += delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Hit detection
      if (p.ownerId === this.localPlayerId) {
        this.playerRigs.forEach((targetRig, targetId) => {
          if (targetId === this.localPlayerId || targetRig.state.hp <= 0) return;
          if (targetRig.currentPos.distanceTo(p.mesh.position) < 1.6) {
            soundManager.playSpecialExplosion();
            if (this.onHitTarget) {
              this.onHitTarget(targetId, p.damage, 'special');
            }
            p.lifetime = p.maxLifetime; // destroy projectile
          }
        });
      }

      // Check arena bounds or lifetime expiry
      if (p.lifetime >= p.maxLifetime || p.mesh.position.length() > this.ARENA_RADIUS) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEffects(delta: number) {
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      const ef = this.hitEffects[i];
      ef.lifetime -= delta;
      if (ef.lifetime <= 0) {
        this.scene.remove(ef.mesh);
        this.hitEffects.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.lifetime += delta;
      ft.position.y += delta * 1.5;
      if (ft.lifetime >= 1.2) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateCamera(delta: number) {
    const localRig = this.playerRigs.get(this.localPlayerId);
    if (!localRig) return;

    // Camera FOV dynamic response to speed/dash
    this.cameraFovTarget = this.isDashing ? 62 : 55;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.cameraFovTarget, 0.15);
    this.camera.updateProjectionMatrix();

    // Follow camera offset behind player
    const offset = new THREE.Vector3(
      Math.sin(this.localYaw) * 5.5,
      2.8,
      Math.cos(this.localYaw) * 5.5
    );

    const targetCamPos = localRig.currentPos.clone().add(offset);

    // Apply camera shake if active
    if (this.cameraShake > 0) {
      const shakeAmt = this.cameraShake * 0.35;
      targetCamPos.x += (Math.random() - 0.5) * shakeAmt;
      targetCamPos.y += (Math.random() - 0.5) * shakeAmt;
      targetCamPos.z += (Math.random() - 0.5) * shakeAmt;
      this.cameraShake = Math.max(0, this.cameraShake - delta * 2.6);
    }

    this.camera.position.lerp(targetCamPos, 0.14);

    const lookAtTarget = localRig.currentPos.clone().add(
      new THREE.Vector3(-Math.sin(this.localYaw) * 1.2, 1.3, -Math.cos(this.localYaw) * 1.2)
    );
    this.camera.lookAt(lookAtTarget);
  }

  public getPlayerScreenCoords(worldPos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const clone = worldPos.clone();
    clone.project(this.camera);

    const isBehind = clone.z > 1;
    const x = (clone.x * 0.5 + 0.5) * this.container.clientWidth;
    const y = (-(clone.y * 0.5) + 0.5) * this.container.clientHeight;

    return { x, y, visible: !isBehind };
  }

  public getPlayerRigPositions(): Array<{ id: string; name: string; hp: number; maxHp: number; x: number; y: number; visible: boolean; isPrimaryAttacker?: boolean }> {
    const res: Array<{ id: string; name: string; hp: number; maxHp: number; x: number; y: number; visible: boolean; isPrimaryAttacker?: boolean }> = [];
    this.playerRigs.forEach((rig, id) => {
      if (id === this.localPlayerId) return;
      const headPos = rig.currentPos.clone().add(new THREE.Vector3(0, 2.4, 0));
      const screen = this.getPlayerScreenCoords(headPos);
      res.push({
        id,
        name: rig.state.name,
        hp: rig.state.hp,
        maxHp: rig.state.maxHp,
        x: screen.x,
        y: screen.y,
        visible: screen.visible,
        isPrimaryAttacker: !!rig.state.isPrimaryAttacker,
      });
    });
    return res;
  }

  public dispose() {
    this.disposed = true;
    soundManager.stopAmbientDrone();
    cancelAnimationFrame(this.animFrameId);
    this.playerRigs.forEach((rig) => {
      this.scene.remove(rig.handle.root);
    });
    this.playerRigs.clear();
    this.loadingPlayerIds.clear();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
