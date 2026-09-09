import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CharacterId } from '../../types';

export interface CharacterAnimationState {
  action: string;
  isMoving: boolean;
  speed: number;
  isBlocking: boolean;
  attackProgress: number; // 0 to 1
  attackCombo?: number; // 0: horizontal, 1: uppercut, 2: 360 cyclone
  specialProgress: number; // 0 to 1
  hitProgress: number; // 0 to 1
  isDead: boolean;
  isDashing?: boolean;
  dashProgress?: number;
  isDoubleJumping?: boolean;
  flipRotation?: number; // radians for front acrobatic somersault
  isGroundSlam?: boolean;
  slamProgress?: number;
}

export interface CharacterMeshHandle {
  root: THREE.Group;
  mixer?: THREE.AnimationMixer;
  actions?: Record<string, THREE.AnimationAction>;
  parts?: {
    head?: THREE.Object3D;
    torso?: THREE.Object3D;
    leftArm?: THREE.Object3D;
    rightArm?: THREE.Object3D;
    leftLeg?: THREE.Object3D;
    rightLeg?: THREE.Object3D;
    weapon?: THREE.Object3D;
    shield?: THREE.Object3D;
    core?: THREE.Mesh;
    wings?: THREE.Object3D;
  };
  isCustomGlb: boolean;
  animate: (delta: number, state: CharacterAnimationState) => void;
}

// Custom GLB fine-tuning parameters
let customGlbYOffset = 0;
let customGlbScaleMultiplier = 1.0;

export function setCustomGlbAdjustments(yOffset: number, scaleMultiplier: number) {
  customGlbYOffset = yOffset;
  customGlbScaleMultiplier = scaleMultiplier;
}

export function getCustomGlbAdjustments() {
  return { yOffset: customGlbYOffset, scaleMultiplier: customGlbScaleMultiplier };
}

// In-memory store for custom GLB ArrayBuffers or Blobs
const customGlbCache: Map<string, ArrayBuffer> = new Map();

export function storeCustomGlb(id: string, buffer: ArrayBuffer) {
  customGlbCache.set(id, buffer);
}

export function getCustomGlb(id: string): ArrayBuffer | undefined {
  return customGlbCache.get(id);
}

export async function loadCharacterModel(
  characterId: CharacterId,
  customBuffer?: ArrayBuffer | null
): Promise<CharacterMeshHandle> {
  const gltfLoader = new GLTFLoader();

  // If custom GLB buffer is provided or cached
  const buffer = customBuffer || customGlbCache.get(characterId);
  if (characterId === 'custom_glb' && buffer) {
    return new Promise((resolve, reject) => {
      gltfLoader.parse(
        buffer,
        '',
        (gltf) => {
          const handle = setupGlbHandle(gltf);
          resolve(handle);
        },
        (error) => {
          console.error('Failed to parse GLB:', error);
          // Fallback to procedural model if custom parse fails
          resolve(createProceduralCharacter('cyber_samurai'));
        }
      );
    });
  }

  // Otherwise, load procedural fighter
  return Promise.resolve(createProceduralCharacter(characterId));
}

function setupGlbHandle(gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }): CharacterMeshHandle {
  const root = new THREE.Group();
  const model = gltf.scene;

  // animPivot will receive animations and walk bounce, while model stays grounded
  const animPivot = new THREE.Group();
  root.add(animPivot);

  // Update matrices to ensure accurate bounding measurements
  model.updateMatrixWorld(true);

  // Compute bounding box accurately across all meshes
  const box = new THREE.Box3();
  let meshCount = 0;
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshCount++;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.geometry) {
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }
        if (mesh.geometry.boundingBox) {
          const meshBox = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
          box.union(meshBox);
        }
      }
    }
  });

  if (meshCount === 0 || box.isEmpty()) {
    box.setFromObject(model);
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Target standard fighter height (~2.2 units) adjusted by user multiplier
  const baseTargetHeight = 2.2;
  const targetHeight = baseTargetHeight * Math.max(0.4, Math.min(2.5, customGlbScaleMultiplier));
  const scale = size.y > 0.05 ? targetHeight / size.y : 1;
  model.scale.set(scale, scale, scale);

  // Position model so its feet/lowest vertex rests exactly on y = 0
  // and horizontal center is at (0, 0)
  const minY = box.min.y * scale;
  const centerX = center.x * scale;
  const centerZ = center.z * scale;

  model.position.x = -centerX;
  model.position.y = -minY + customGlbYOffset;
  model.position.z = -centerZ;

  animPivot.add(model);

  // Add a protective circular shadow decal / base ring at ground
  const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);

  // Setup AnimationMixer if animations exist
  let mixer: THREE.AnimationMixer | undefined;
  const actions: Record<string, THREE.AnimationAction> = {};

  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
      const name = clip.name.toLowerCase();
      actions[name] = mixer!.clipAction(clip);
    });
    // Start first animation if available
    const firstAction = Object.values(actions)[0];
    if (firstAction) {
      firstAction.play();
    }
  }

  // Energy shield mesh for blocking
  const shieldGeo = new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    roughness: 0.1,
    metalness: 0.8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
  });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(0, 1.1, 0.4);
  root.add(shield);

  let walkCycle = 0;

  return {
    root,
    mixer,
    actions,
    parts: { shield },
    isCustomGlb: true,
    animate: (delta, state) => {
      if (mixer) {
        mixer.update(delta);
      }

      // Shield visibility
      if (shield) {
        const targetOpacity = state.isBlocking ? 0.6 : 0;
        shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, targetOpacity, 0.2);
        shield.visible = shieldMat.opacity > 0.01;
        if (state.isBlocking) {
          shield.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.04);
        }
      }

      // If no skeletal animation mixer, apply procedural locomotion to animPivot without moving model base
      if (!mixer || Object.keys(actions).length === 0) {
        if (state.isDead) {
          animPivot.rotation.x = THREE.MathUtils.lerp(animPivot.rotation.x, -Math.PI / 2, 0.15);
          animPivot.position.y = THREE.MathUtils.lerp(animPivot.position.y, 0.15, 0.15);
          return;
        }

        // Acrobatic double-jump somersault
        if (state.isDoubleJumping && state.flipRotation !== undefined) {
          animPivot.rotation.x = state.flipRotation;
          animPivot.rotation.z = THREE.MathUtils.lerp(animPivot.rotation.z, 0, 0.2);
          animPivot.position.y = 0.1;
          return;
        }

        // Aerial ground slam
        if (state.isGroundSlam) {
          animPivot.rotation.x = 0.35;
          animPivot.position.y = -0.2;
          return;
        }

        // Dash forward lean
        if (state.isDashing) {
          animPivot.rotation.x = THREE.MathUtils.lerp(animPivot.rotation.x, 0.5, 0.3);
          animPivot.position.y = THREE.MathUtils.lerp(animPivot.position.y, -0.15, 0.3);
          return;
        }

        if (state.isMoving) {
          walkCycle += delta * 10;
          animPivot.position.y = Math.abs(Math.sin(walkCycle)) * 0.12;
          animPivot.rotation.z = Math.sin(walkCycle * 0.5) * 0.06;
          animPivot.rotation.x = THREE.MathUtils.lerp(animPivot.rotation.x, 0.1, 0.2);
        } else {
          walkCycle += delta * 2;
          animPivot.position.y = Math.sin(walkCycle) * 0.02;
          animPivot.rotation.z = THREE.MathUtils.lerp(animPivot.rotation.z, 0, 0.1);
          animPivot.rotation.x = THREE.MathUtils.lerp(animPivot.rotation.x, 0, 0.1);
        }

        if (state.attackProgress > 0) {
          const combo = state.attackCombo || 0;
          const p = state.attackProgress;
          if (combo === 0) {
            // Horizontal sweep
            animPivot.rotation.y = Math.sin(p * Math.PI) * 0.8;
            animPivot.position.z = Math.sin(p * Math.PI) * 0.3;
          } else if (combo === 1) {
            // Rising uppercut
            animPivot.rotation.x = -Math.sin(p * Math.PI) * 0.45;
            animPivot.position.y = Math.sin(p * Math.PI) * 0.35;
          } else {
            // 360 Cyclone spin
            animPivot.rotation.y = p * Math.PI * 2;
            animPivot.position.y = Math.sin(p * Math.PI) * 0.25;
          }
        } else {
          animPivot.rotation.y = THREE.MathUtils.lerp(animPivot.rotation.y, 0, 0.2);
          animPivot.position.z = THREE.MathUtils.lerp(animPivot.position.z, 0, 0.2);
        }

        if (state.hitProgress > 0) {
          animPivot.position.z = -Math.sin(state.hitProgress * Math.PI) * 0.3;
          animPivot.rotation.x = -Math.sin(state.hitProgress * Math.PI) * 0.25;
        }
      }
    },
  };
}

export function createProceduralCharacter(id: CharacterId): CharacterMeshHandle {
  const root = new THREE.Group();

  let primaryColor = 0x06b6d4;
  let secondaryColor = 0x3b82f6;
  let emissiveColor = 0x00ffff;
  let armorType = 'samurai';

  if (id === 'mecha_titan') {
    primaryColor = 0xd97706;
    secondaryColor = 0xef4444;
    emissiveColor = 0xf59e0b;
    armorType = 'titan';
  } else if (id === 'neon_valkyrie') {
    primaryColor = 0xdb2777;
    secondaryColor = 0x8b5cf6;
    emissiveColor = 0xf472b6;
    armorType = 'valkyrie';
  } else if (id === 'shadow_assassin') {
    primaryColor = 0x059669;
    secondaryColor = 0x1e293b;
    emissiveColor = 0x10b981;
    armorType = 'assassin';
  }

  // Base pivot
  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 1.0;
  root.add(bodyGroup);

  // Materials
  const armorMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    metalness: 0.8,
    roughness: 0.25,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    metalness: 0.6,
    roughness: 0.4,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: emissiveColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  // Torso
  const torsoGeo = armorType === 'titan' 
    ? new THREE.BoxGeometry(0.9, 0.8, 0.6) 
    : new THREE.BoxGeometry(0.65, 0.7, 0.45);
  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Core reactor / badge
  const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
  const core = new THREE.Mesh(coreGeo, glowMat);
  core.rotation.x = Math.PI / 2;
  core.position.set(0, 0.1, 0.26);
  torso.add(core);

  // Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.55, 0);
  torso.add(headGroup);

  const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.38);
  const head = new THREE.Mesh(headGeo, darkMat);
  head.castShadow = true;
  headGroup.add(head);

  // Visor
  const visorGeo = new THREE.BoxGeometry(0.32, 0.1, 0.1);
  const visor = new THREE.Mesh(visorGeo, glowMat);
  visor.position.set(0, 0.05, 0.18);
  headGroup.add(visor);

  // Shoulders & Arms
  const leftArmGroup = new THREE.Group();
  const rightArmGroup = new THREE.Group();
  const armOffset = armorType === 'titan' ? 0.55 : 0.42;

  leftArmGroup.position.set(-armOffset, 0.25, 0);
  rightArmGroup.position.set(armOffset, 0.25, 0);
  torso.add(leftArmGroup);
  torso.add(rightArmGroup);

  // Shoulder pads
  const padGeo = new THREE.BoxGeometry(0.28, 0.24, 0.3);
  const padL = new THREE.Mesh(padGeo, armorMat);
  const padR = new THREE.Mesh(padGeo, armorMat);
  padL.castShadow = true;
  padR.castShadow = true;
  leftArmGroup.add(padL);
  rightArmGroup.add(padR);

  // Arm limbs
  const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.55, 8);
  const armL = new THREE.Mesh(armGeo, darkMat);
  const armR = new THREE.Mesh(armGeo, darkMat);
  armL.position.y = -0.3;
  armR.position.y = -0.3;
  armL.castShadow = true;
  armR.castShadow = true;
  leftArmGroup.add(armL);
  rightArmGroup.add(armR);

  // Legs
  const leftLegGroup = new THREE.Group();
  const rightLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.2, -0.4, 0);
  rightLegGroup.position.set(0.2, -0.4, 0);
  torso.add(leftLegGroup);
  torso.add(rightLegGroup);

  const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.65, 8);
  const legL = new THREE.Mesh(legGeo, armorMat);
  const legR = new THREE.Mesh(legGeo, armorMat);
  legL.position.y = -0.35;
  legR.position.y = -0.35;
  legL.castShadow = true;
  legR.castShadow = true;
  leftLegGroup.add(legL);
  rightLegGroup.add(legR);

  // Weapons & Special attachments
  const weaponGroup = new THREE.Group();
  rightArmGroup.add(weaponGroup);
  weaponGroup.position.set(0, -0.5, 0.2);

  let wingsGroup: THREE.Group | undefined;

  if (armorType === 'samurai') {
    // Cyber Katana
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35), darkMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.02), glowMat);
    blade.position.y = 0.65;
    weaponGroup.add(hilt);
    weaponGroup.add(blade);
    weaponGroup.rotation.x = Math.PI / 4;
  } else if (armorType === 'titan') {
    // Heavy cannon gauntlet
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.7, 12), darkMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.z = 0.2;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), glowMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.z = 0.58;
    weaponGroup.add(cannon);
    weaponGroup.add(nozzle);
  } else if (armorType === 'valkyrie') {
    // Photon Lance
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6), darkMat);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.4, 8), glowMat);
    tip.position.y = 0.9;
    weaponGroup.add(shaft);
    weaponGroup.add(tip);
    weaponGroup.rotation.x = Math.PI / 3;

    // Energy Wings
    wingsGroup = new THREE.Group();
    wingsGroup.position.set(0, 0.1, -0.3);
    torso.add(wingsGroup);

    const wingGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,   1.2, 0.8, -0.2,   0.8, 0, -0.1,
      0, 0, 0,  -1.2, 0.8, -0.2,  -0.8, 0, -0.1,
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0xec4899,
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wingsGroup.add(wings);
  } else {
    // Assassin dual daggers
    const dagger1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.02), glowMat);
    dagger1.position.y = 0.25;
    weaponGroup.add(dagger1);

    const dagger2Group = new THREE.Group();
    leftArmGroup.add(dagger2Group);
    dagger2Group.position.set(0, -0.5, 0.2);
    const dagger2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.02), glowMat);
    dagger2.position.y = 0.25;
    dagger2Group.add(dagger2);
  }

  // Energy shield
  const shieldGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.05, 6);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.rotation.x = Math.PI / 2;
  shield.position.set(0, 0, 0.6);
  torso.add(shield);

  // Ground base aura ring
  const baseRingGeo = new THREE.RingGeometry(0.45, 0.65, 32);
  const baseRingMat = new THREE.MeshBasicMaterial({
    color: primaryColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });
  const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.02;
  root.add(baseRing);

  let walkCycle = 0;

  return {
    root,
    isCustomGlb: false,
    parts: {
      head: headGroup,
      torso,
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      weapon: weaponGroup,
      shield,
      core,
      wings: wingsGroup,
    },
    animate: (delta, state) => {
      // Glow pulse on core
      if (core) {
        glowMat.emissiveIntensity = 0.8 + Math.sin(Date.now() * 0.006) * 0.3;
      }

      // Wings flap if valkyrie
      if (wingsGroup) {
        wingsGroup.rotation.y = Math.sin(Date.now() * 0.005) * 0.25;
      }

      // Shield
      const targetShieldOpacity = state.isBlocking ? 0.75 : 0;
      shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, targetShieldOpacity, 0.2);
      shield.visible = shieldMat.opacity > 0.01;

      // Death animation
      if (state.isDead) {
        bodyGroup.position.y = THREE.MathUtils.lerp(bodyGroup.position.y, 0.25, 0.1);
        bodyGroup.rotation.x = THREE.MathUtils.lerp(bodyGroup.rotation.x, -Math.PI / 2, 0.12);
        leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, 0.2, 0.1);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -0.2, 0.1);
        return;
      }

      // 1. Acrobatic Double Jump Front-Flip
      if (state.isDoubleJumping && state.flipRotation !== undefined) {
        bodyGroup.rotation.x = state.flipRotation;
        // Tuck limbs into somersault
        leftLegGroup.rotation.x = THREE.MathUtils.lerp(leftLegGroup.rotation.x, -1.2, 0.3);
        rightLegGroup.rotation.x = THREE.MathUtils.lerp(rightLegGroup.rotation.x, -1.2, 0.3);
        leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, -1.4, 0.3);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -1.4, 0.3);
        return;
      }

      // 2. Aerial Ground Slam Plunge
      if (state.isGroundSlam) {
        bodyGroup.rotation.x = THREE.MathUtils.lerp(bodyGroup.rotation.x, 0.4, 0.3);
        bodyGroup.position.y = 0.85;
        // Both hands pointed downward grasping weapon
        rightArmGroup.rotation.x = -Math.PI * 0.75;
        leftArmGroup.rotation.x = -Math.PI * 0.75;
        rightArmGroup.rotation.y = 0.25;
        leftArmGroup.rotation.y = -0.25;
        leftLegGroup.rotation.x = 0.4;
        rightLegGroup.rotation.x = -0.2;
        return;
      }

      // 3. Evasive High-Speed Dash Pose
      if (state.isDashing) {
        bodyGroup.position.y = THREE.MathUtils.lerp(bodyGroup.position.y, 0.72, 0.35);
        bodyGroup.rotation.x = THREE.MathUtils.lerp(bodyGroup.rotation.x, 0.55, 0.35);
        // Ninja sprint pose: weapon and right arm trailed behind, left arm forward
        rightArmGroup.rotation.x = -Math.PI * 0.65;
        rightArmGroup.rotation.y = -0.3;
        leftArmGroup.rotation.x = 0.5;
        leftArmGroup.rotation.y = 0.2;
        leftLegGroup.rotation.x = 0.7;
        rightLegGroup.rotation.x = -0.7;
        return;
      }

      // Reset base pitch if recovering from dash/flip
      bodyGroup.rotation.x = THREE.MathUtils.lerp(bodyGroup.rotation.x, 0, 0.2);

      // Movement animations
      if (state.isMoving) {
        walkCycle += delta * (state.speed > 10 ? 12 : 8);
        const swing = Math.sin(walkCycle) * 0.65;
        leftLegGroup.rotation.x = swing;
        rightLegGroup.rotation.x = -swing;
        leftLegGroup.rotation.z = 0;
        rightLegGroup.rotation.z = 0;

        if (state.attackProgress === 0 && !state.isBlocking && state.specialProgress === 0) {
          leftArmGroup.rotation.x = -swing * 0.75;
          rightArmGroup.rotation.x = swing * 0.75;
          leftArmGroup.rotation.y = 0;
          rightArmGroup.rotation.y = 0;
        }

        bodyGroup.position.y = 1.0 + Math.abs(Math.sin(walkCycle)) * 0.12;
        torso.scale.set(1, 1, 1);
      } else {
        // Idle breathing & dynamic weight shifting
        walkCycle += delta * 2.2;
        leftLegGroup.rotation.x = THREE.MathUtils.lerp(leftLegGroup.rotation.x, 0, 0.12);
        rightLegGroup.rotation.x = THREE.MathUtils.lerp(rightLegGroup.rotation.x, 0, 0.12);

        // Gentle weight shift
        const weightShift = Math.sin(walkCycle * 0.5) * 0.04;
        leftLegGroup.rotation.z = weightShift;
        rightLegGroup.rotation.z = -weightShift;

        // Breathing chest rise and fall
        const breath = Math.sin(walkCycle);
        bodyGroup.position.y = 1.0 + breath * 0.035;
        torso.scale.set(1 + breath * 0.02, 1 + breath * 0.015, 1 + breath * 0.02);

        // Idle combat ready arms
        if (state.attackProgress === 0 && !state.isBlocking && state.specialProgress === 0) {
          rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -0.3 + breath * 0.04, 0.1);
          rightArmGroup.rotation.y = THREE.MathUtils.lerp(rightArmGroup.rotation.y, -0.15, 0.1);
          leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, -0.25 + breath * 0.03, 0.1);
          leftArmGroup.rotation.y = THREE.MathUtils.lerp(leftArmGroup.rotation.y, 0.2, 0.1);
        }
      }

      // Blocking stance
      if (state.isBlocking) {
        leftArmGroup.rotation.x = THREE.MathUtils.lerp(leftArmGroup.rotation.x, -Math.PI / 2.8, 0.25);
        leftArmGroup.rotation.y = THREE.MathUtils.lerp(leftArmGroup.rotation.y, Math.PI / 3.8, 0.25);
        rightArmGroup.rotation.x = THREE.MathUtils.lerp(rightArmGroup.rotation.x, -Math.PI / 2.8, 0.25);
        rightArmGroup.rotation.y = THREE.MathUtils.lerp(rightArmGroup.rotation.y, -Math.PI / 3.8, 0.25);
        torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0.15, 0.2);
      }

      // Combat Combo Attack Swings
      if (state.attackProgress > 0) {
        const combo = state.attackCombo || 0;
        const p = state.attackProgress;

        if (combo === 0) {
          // COMBO 1: Horizontal Cyber Slash
          if (p < 0.28) {
            // Windup: right arm pulled right & back
            rightArmGroup.rotation.x = -0.4;
            rightArmGroup.rotation.y = -1.2;
            rightArmGroup.rotation.z = 0.2;
            torso.rotation.y = -0.45;
            leftArmGroup.rotation.x = 0.4;
          } else {
            // Fierce horizontal cross slash
            const swingP = (p - 0.28) / 0.72;
            rightArmGroup.rotation.x = 0.1;
            rightArmGroup.rotation.y = -1.2 + swingP * 2.5;
            rightArmGroup.rotation.z = 0.1;
            torso.rotation.y = -0.45 + swingP * 0.9;
            leftArmGroup.rotation.x = -0.4;
            bodyGroup.position.z = Math.sin(p * Math.PI) * 0.22;
          }
        } else if (combo === 1) {
          // COMBO 2: Rising Uppercut Slash
          if (p < 0.25) {
            // Crouch down low
            bodyGroup.position.y = 0.82;
            rightArmGroup.rotation.x = 0.8;
            rightArmGroup.rotation.y = -0.2;
            torso.rotation.x = 0.25;
            leftLegGroup.rotation.x = 0.3;
          } else {
            // Explosive leap upward
            const swingP = (p - 0.25) / 0.75;
            bodyGroup.position.y = 1.0 + Math.sin(swingP * Math.PI) * 0.4;
            rightArmGroup.rotation.x = 0.8 - swingP * 2.8;
            rightArmGroup.rotation.y = 0.3;
            torso.rotation.x = -0.3;
            leftArmGroup.rotation.x = 0.5;
          }
        } else {
          // COMBO 3: 360° Cyclone Whirlwind Spin
          bodyGroup.rotation.y = p * Math.PI * 2;
          bodyGroup.position.y = 1.0 + Math.sin(p * Math.PI) * 0.3;
          // Dual arms extended horizontally outwards
          rightArmGroup.rotation.x = 0;
          rightArmGroup.rotation.y = 0;
          rightArmGroup.rotation.z = Math.PI * 0.45;
          leftArmGroup.rotation.x = 0;
          leftArmGroup.rotation.y = 0;
          leftArmGroup.rotation.z = -Math.PI * 0.45;
        }
      } else if (!state.isBlocking && state.specialProgress === 0) {
        torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, 0, 0.15);
        torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, 0.15);
      }

      // Special skill animation
      if (state.specialProgress > 0) {
        const sp = state.specialProgress;
        if (sp < 0.35) {
          // Charge pose: both arms pulled back, glowing, levitating
          rightArmGroup.rotation.x = -Math.PI * 0.85;
          leftArmGroup.rotation.x = -Math.PI * 0.85;
          rightArmGroup.rotation.y = -0.3;
          leftArmGroup.rotation.y = 0.3;
          bodyGroup.position.y = 1.0 + Math.sin(sp * Math.PI) * 0.7;
          bodyGroup.rotation.y = sp * Math.PI * 2;
        } else {
          // Surge forward thrust
          rightArmGroup.rotation.x = -Math.PI * 0.5;
          leftArmGroup.rotation.x = -Math.PI * 0.5;
          rightArmGroup.rotation.y = 0.1;
          leftArmGroup.rotation.y = -0.1;
          bodyGroup.position.z = Math.sin((sp - 0.35) * Math.PI) * 0.35;
        }
      } else if (state.attackProgress === 0 && !state.isBlocking && !state.isDashing) {
        bodyGroup.rotation.y = THREE.MathUtils.lerp(bodyGroup.rotation.y, 0, 0.15);
      }

      // Hit recoil
      if (state.hitProgress > 0) {
        bodyGroup.position.z = -Math.sin(state.hitProgress * Math.PI) * 0.4;
        torso.rotation.x = -Math.sin(state.hitProgress * Math.PI) * 0.45;
        headGroup.rotation.x = Math.sin(state.hitProgress * Math.PI) * 0.35;
      } else {
        bodyGroup.position.z = THREE.MathUtils.lerp(bodyGroup.position.z, 0, 0.2);
        torso.rotation.x = THREE.MathUtils.lerp(torso.rotation.x, 0, 0.2);
        headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, 0, 0.2);
      }
    },
  };
}
