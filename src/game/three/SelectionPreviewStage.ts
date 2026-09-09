import * as THREE from 'three';
import { CharacterId } from '../../types';
import { CharacterMeshHandle, loadCharacterModel } from './modelLoader';

export class SelectionPreviewStage {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private characterHandle: CharacterMeshHandle | null = null;
  private pedestal: THREE.Group;
  private particles: THREE.Points;
  private animFrameId: number = 0;
  private clock: THREE.Clock = new THREE.Clock();

  // Test action state
  private testAction: string = 'idle';
  private actionTimer: number = 0;
  private isUserInteracting: boolean = false;
  private targetRotationY: number = 0;
  private currentRotationY: number = 0;
  private previousMouseX: number = 0;
  private currentLoadToken: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.04);

    // Camera
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);
    this.camera.position.set(0, 1.6, 4.5);
    this.camera.lookAt(0, 1.1, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    rimLight.position.set(-4, 4, -4);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xa855f7, 2, 8);
    fillLight.position.set(0, 0.5, 2);
    this.scene.add(fillLight);

    // Turntable Pedestal
    this.pedestal = new THREE.Group();
    const platGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.3, 32);
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.8,
      roughness: 0.2,
    });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = -0.15;
    plat.receiveShadow = true;
    this.pedestal.add(plat);

    // Neon accent ring
    const ringGeo = new THREE.TorusGeometry(1.65, 0.04, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.5,
    });
    const neonRing = new THREE.Mesh(ringGeo, ringMat);
    neonRing.rotation.x = Math.PI / 2;
    neonRing.position.y = 0;
    this.pedestal.add(neonRing);

    // Grid disc on top
    const gridHelper = new THREE.PolarGridHelper(1.5, 8, 4, 32, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0.01;
    this.pedestal.add(gridHelper);

    this.scene.add(this.pedestal);

    // Ambient floating particles
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 6;
      positions[i + 1] = Math.random() * 4;
      positions[i + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x06b6d4,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particles);

    // Event listeners
    this.setupInteraction();
    this.startLoop();
  }

  private setupInteraction() {
    const el = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.isUserInteracting = true;
      this.previousMouseX = e.clientX;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isUserInteracting) return;
      const deltaX = e.clientX - this.previousMouseX;
      this.previousMouseX = e.clientX;
      this.targetRotationY += deltaX * 0.01;
    };

    const onPointerUp = () => {
      this.isUserInteracting = false;
    };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  public async setCharacter(characterId: CharacterId, customBuffer?: ArrayBuffer | null) {
    const token = ++this.currentLoadToken;
    if (this.characterHandle) {
      this.pedestal.remove(this.characterHandle.root);
      this.characterHandle = null;
    }

    try {
      const handle = await loadCharacterModel(characterId, customBuffer);
      if (token !== this.currentLoadToken) {
        // Obsolete load! A newer character selection superseded this one.
        return;
      }
      this.characterHandle = handle;
      this.pedestal.add(handle.root);
    } catch (e) {
      console.error('Error loading character in preview:', e);
    }
  }

  public triggerAction(action: 'attack' | 'special' | 'block') {
    this.testAction = action;
    this.actionTimer = 0;
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
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      // Auto-rotation if user is not actively dragging
      if (!this.isUserInteracting) {
        this.targetRotationY += delta * 0.4;
      }
      this.currentRotationY = THREE.MathUtils.lerp(this.currentRotationY, this.targetRotationY, 0.1);
      this.pedestal.rotation.y = this.currentRotationY;

      // Particle floating animation
      const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += delta * 0.3;
        if (arr[i] > 4) {
          arr[i] = 0;
        }
      }
      posAttr.needsUpdate = true;

      // Update test action timers
      let attackProg = 0;
      let specialProg = 0;
      let isBlocking = false;

      if (this.testAction === 'attack') {
        this.actionTimer += delta * 2.5;
        attackProg = Math.min(this.actionTimer, 1);
        if (this.actionTimer >= 1) {
          this.testAction = 'idle';
        }
      } else if (this.testAction === 'special') {
        this.actionTimer += delta * 1.5;
        specialProg = Math.min(this.actionTimer, 1);
        if (this.actionTimer >= 1) {
          this.testAction = 'idle';
        }
      } else if (this.testAction === 'block') {
        this.actionTimer += delta;
        isBlocking = true;
        if (this.actionTimer >= 1.5) {
          this.testAction = 'idle';
        }
      }

      if (this.characterHandle) {
        this.characterHandle.animate(delta, {
          action: this.testAction,
          isMoving: false,
          speed: 0,
          isBlocking,
          attackProgress: attackProg,
          specialProgress: specialProg,
          hitProgress: 0,
          isDead: false,
        });
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public dispose() {
    cancelAnimationFrame(this.animFrameId);
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
