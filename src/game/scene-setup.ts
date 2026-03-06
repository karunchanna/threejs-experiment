/**
 * Scene Setup
 *
 * Initializes the Three.js scene with lighting, fog, sky, and post-processing.
 * Designed to complement the Marble/SparkJS world rendering.
 */

import * as THREE from 'three';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020810);
  scene.fog = new THREE.FogExp2(0x040c1a, 0.004);

  // Camera - dramatic first person
  const camera = new THREE.PerspectiveCamera(
    72,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 15, 60);
  camera.lookAt(0, 10, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;

  // Lighting
  setupLighting(scene);

  // Sky
  setupSky(scene);

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}

function setupLighting(scene: THREE.Scene): void {
  // Ambient - very subtle blue
  const ambient = new THREE.AmbientLight(0x0a1530, 0.4);
  scene.add(ambient);

  // Main directional (moonlight)
  const moonlight = new THREE.DirectionalLight(0x4466aa, 0.6);
  moonlight.position.set(50, 80, 30);
  moonlight.castShadow = true;
  moonlight.shadow.mapSize.width = 2048;
  moonlight.shadow.mapSize.height = 2048;
  moonlight.shadow.camera.near = 0.5;
  moonlight.shadow.camera.far = 200;
  moonlight.shadow.camera.left = -80;
  moonlight.shadow.camera.right = 80;
  moonlight.shadow.camera.top = 80;
  moonlight.shadow.camera.bottom = -80;
  scene.add(moonlight);

  // Subtle rim light
  const rimLight = new THREE.DirectionalLight(0x220044, 0.3);
  rimLight.position.set(-40, 30, -60);
  scene.add(rimLight);

  // Central monument uplighting
  const uplight = new THREE.PointLight(0x2244aa, 2, 60);
  uplight.position.set(0, 2, 0);
  scene.add(uplight);

  // Hemisphere light for subtle ambient color variation
  const hemiLight = new THREE.HemisphereLight(0x0a1530, 0x1a0a30, 0.3);
  scene.add(hemiLight);
}

function setupSky(scene: THREE.Scene): void {
  // Star field
  const starCount = 3000;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Distribute on a large sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 400;

    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // Only upper hemisphere
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const brightness = 0.3 + Math.random() * 0.7;
    const tint = Math.random();
    starColors[i * 3] = brightness * (tint > 0.7 ? 1.0 : 0.8);
    starColors[i * 3 + 1] = brightness * 0.9;
    starColors[i * 3 + 2] = brightness;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 1.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });

  const stars = new THREE.Points(starGeo, starMat);
  stars.name = 'stars';
  scene.add(stars);

  // Nebula planes for atmosphere
  const nebulaColors = [0x1a0a3a, 0x0a1a2a, 0x0a0a2a];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(600, 300);
    const mat = new THREE.MeshBasicMaterial({
      color: nebulaColors[i],
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const nebula = new THREE.Mesh(geo, mat);
    nebula.position.set(
      (Math.random() - 0.5) * 100,
      100 + i * 40,
      (Math.random() - 0.5) * 100
    );
    nebula.rotation.x = -0.3 + Math.random() * 0.6;
    nebula.rotation.z = Math.random() * Math.PI;
    scene.add(nebula);
  }
}

/** Create a portal effect for the final world event */
export function createPortal(scene: THREE.Scene, position: THREE.Vector3): THREE.Group {
  const portal = new THREE.Group();
  portal.position.copy(position);
  portal.position.y += 15;

  // Outer ring
  const outerGeo = new THREE.TorusGeometry(6, 0.4, 16, 48);
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0x00ffaa,
    emissive: 0x00ffaa,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.8,
  });
  const outerRing = new THREE.Mesh(outerGeo, outerMat);
  outerRing.name = 'portal-ring';
  portal.add(outerRing);

  // Inner swirl
  const innerGeo = new THREE.CircleGeometry(5.5, 48);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.name = 'portal-inner';
  portal.add(inner);

  // Portal light
  const portalLight = new THREE.PointLight(0x00ffaa, 8, 60);
  portal.add(portalLight);

  // Particle halo
  const haloCount = 500;
  const haloPositions = new Float32Array(haloCount * 3);
  for (let i = 0; i < haloCount; i++) {
    const angle = (i / haloCount) * Math.PI * 2;
    const r = 5.5 + (Math.random() - 0.5) * 3;
    haloPositions[i * 3] = Math.cos(angle) * r;
    haloPositions[i * 3 + 1] = Math.sin(angle) * r;
    haloPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPositions, 3));
  const haloMat = new THREE.PointsMaterial({
    color: 0x00ffcc,
    size: 0.3,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Points(haloGeo, haloMat);
  halo.name = 'portal-halo';
  portal.add(halo);

  portal.visible = false;
  portal.name = 'world-portal';
  scene.add(portal);

  return portal;
}
