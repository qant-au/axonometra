// Camera projection (lab prototype): a placed camera's current picture is cast onto the plan like a slide projector –
// floors, outdoor areas, walls and the ground show the real picture where the camera looks. A depth picture taken
// from the camera keeps the image off everything the camera cannot see (behind a wall, inside the house). Flat
// surfaces read right from any side; what stands up (people, cars) lies flat on the ground behind it.

import {
  DepthTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderTarget,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
  Matrix4,
  Vector3,
} from "three";
import { makeFoldable, type FoldMasks } from "./fold.ts";

/** Layer of the meshes that may block a camera's view (floors, walls and outdoor areas, the ground). */
export const PROJECTION_LAYER = 5;
const DEPTH_SIZE = 512;
/** What lies closer to the lens than this (m) neither blocks the view nor gets the picture: the wall the camera hangs on. */
const NEAR = 0.7;

/** Where a camera hangs and where it looks, in world coordinates. */
export interface ProjectorPose {
  position: Vector3;
  /** Unit vector of its view. */
  direction: Vector3;
  /** Horizontal opening angle in degrees. */
  fov: number;
  /** How far the picture is cast (m). */
  reach: number;
}

/** A surface the pictures fall on: its geometry, the object it hangs on, and the fold masks of its floor (walls fold). */
export interface ProjectionSurface {
  key: string;
  geometry: BufferGeometry;
  parent: Object3D;
  masks: FoldMasks | null;
  visible: boolean;
}

interface Projector {
  id: string;
  /** The newest picture asked for, and whether one is on its way (a slow camera never has two loads at once). */
  url: string;
  loading: boolean;
  shown: string;
  texture: Texture | null;
  aspect: number;
  camera: PerspectiveCamera;
  target: WebGLRenderTarget;
  matrix: Matrix4;
  uniforms: { uProjMat: { value: Matrix4 }; uProjTex: { value: Texture | null }; uDepth: { value: Texture | null }; uNearFar: { value: [number, number] } };
  overlays: Map<string, Mesh>;
  poseKey: string;
  noPoseLogged?: boolean;
}

export class CameraProjections {
  private projectors = new Map<string, Projector>();
  private loader = new TextureLoader();
  private loggedIds = "";
  private depthMaterial = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide });

  private onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  get active(): boolean {
    return this.projectors.size > 0;
  }

  /** The cameras that project now, with their current picture URL. */
  set(list: readonly { id: string; url: string }[]): void {
    const wanted = new Map(list.map((c) => [c.id, c.url]));
    for (const [id, p] of this.projectors) if (!wanted.has(id)) this.drop(p);
    for (const [id, url] of wanted) {
      let p = this.projectors.get(id);
      if (!p) {
        const target = new WebGLRenderTarget(DEPTH_SIZE, DEPTH_SIZE);
        target.depthTexture = new DepthTexture(DEPTH_SIZE, DEPTH_SIZE);
        p = {
          id,
          url: "",
          loading: false,
          shown: "",
          texture: null,
          aspect: 16 / 9,
          camera: new PerspectiveCamera(60, 16 / 9, NEAR, 40),
          target,
          matrix: new Matrix4(),
          uniforms: { uProjMat: { value: new Matrix4() }, uProjTex: { value: null }, uDepth: { value: target.depthTexture }, uNearFar: { value: [0.15, 40] } },
          overlays: new Map(),
          poseKey: "",
        };
        p.camera.layers.set(PROJECTION_LAYER);
        this.projectors.set(id, p);
      }
      p.url = url;
      this.fetch(p);
    }
    const ids = [...this.projectors.keys()].join(",");
    if (ids !== this.loggedIds) {
      this.loggedIds = ids;
      console.info(`Axonometra lab: camera projection for ${this.projectors.size} camera(s)`, ids);
    }
  }

  /** Load the newest picture unless one is still on its way; a picture that arrives is always shown. */
  private fetch(p: Projector): void {
    if (p.loading || p.url === p.shown || !p.url) return;
    const url = p.url;
    p.loading = true;
    this.loader.load(
      url,
      (tex) => {
        p.loading = false;
        p.shown = url;
        if (this.projectors.get(p.id) !== p) {
          tex.dispose();
          return;
        }
        tex.colorSpace = SRGBColorSpace;
        const img = tex.image as { width?: number; height?: number } | undefined;
        if (img?.width && img.height) p.aspect = img.width / img.height;
        if (!p.texture) console.info(`Axonometra lab: first picture of ${p.id}`, img?.width, "x", img?.height);
        p.texture?.dispose();
        p.texture = tex;
        p.uniforms.uProjTex.value = tex;
        p.poseKey = "";
        this.onChange();
        // a newer picture was asked for meanwhile: fetch it now
        this.fetch(p);
      },
      undefined,
      () => {
        p.loading = false;
        p.shown = url;
        console.warn(`Axonometra lab: the picture of ${p.id} could not be loaded`);
      },
    );
  }

  /**
   * Before a frame: place every projector at its camera, retake its depth picture when the camera or the plan moved,
   * and keep one overlay per surface (sharing the surface's geometry).
   */
  update(renderer: WebGLRenderer, scene: Scene, surfaces: readonly ProjectionSurface[], poseOf: (id: string) => ProjectorPose | null, layoutKey: string): void {
    for (const p of this.projectors.values()) {
      const pose = p.texture ? poseOf(p.id) : null;
      if (p.texture && !pose && !p.noPoseLogged) {
        p.noPoseLogged = true;
        console.warn(`Axonometra lab: ${p.id} is not drawn as a camera in 3D (no position), so its picture is not cast`);
      }
      if (!pose) {
        for (const o of p.overlays.values()) o.visible = false;
        continue;
      }
      // overlays: one per surface, following its geometry when the floor is rebuilt
      const keys = new Set(surfaces.map((s) => s.key));
      for (const [key, o] of p.overlays) {
        if (keys.has(key)) continue;
        o.parent?.remove(o);
        (o.material as Material).dispose();
        p.overlays.delete(key);
      }
      for (const s of surfaces) {
        let o = p.overlays.get(s.key);
        if (!o || o.parent !== s.parent) {
          if (o) {
            o.parent?.remove(o);
            (o.material as Material).dispose();
          }
          o = new Mesh(s.geometry, this.material(p, s.masks));
          o.renderOrder = 2.5;
          o.frustumCulled = false;
          s.parent.add(o);
          p.overlays.set(s.key, o);
        }
        if (o.geometry !== s.geometry) o.geometry = s.geometry;
        o.visible = s.visible;
      }
      const key = `${pose.position.toArray().map((v) => v.toFixed(3))},${pose.direction.toArray().map((v) => v.toFixed(3))},${pose.fov},${pose.reach},${p.aspect.toFixed(3)},${layoutKey}`;
      if (key === p.poseKey) continue;
      p.poseKey = key;
      const cam = p.camera;
      const h = Math.min(150, Math.max(20, pose.fov)) * (Math.PI / 180);
      cam.fov = (2 * Math.atan(Math.tan(h / 2) / p.aspect) * 180) / Math.PI;
      cam.aspect = p.aspect;
      cam.far = pose.reach;
      // a camera usually sits just inside the wall it hangs on: the first stretch in front of the lens (the wall's
      // thickness) is left out, or that wall would hide everything the camera sees outside
      cam.near = NEAR;
      cam.position.copy(pose.position);
      cam.lookAt(pose.position.clone().add(pose.direction));
      cam.updateProjectionMatrix();
      p.uniforms.uNearFar.value = [cam.near, cam.far];
      cam.updateMatrixWorld();
      p.uniforms.uProjMat.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      // what the camera sees: a depth picture of the blocking surfaces only (no overlays, glows or labels)
      const hidden: Mesh[] = [];
      for (const q of this.projectors.values()) for (const o of q.overlays.values()) if (o.visible) hidden.push(o);
      for (const o of hidden) o.visible = false;
      const before = renderer.getRenderTarget();
      const override = scene.overrideMaterial;
      scene.overrideMaterial = this.depthMaterial;
      renderer.setRenderTarget(p.target);
      renderer.clear();
      renderer.render(scene, cam);
      renderer.setRenderTarget(before);
      scene.overrideMaterial = override;
      for (const o of hidden) o.visible = true;
    }
  }

  dispose(): void {
    for (const p of [...this.projectors.values()]) this.drop(p);
    this.depthMaterial.dispose();
  }

  private drop(p: Projector): void {
    for (const o of p.overlays.values()) {
      o.parent?.remove(o);
      (o.material as Material).dispose();
    }
    p.texture?.dispose();
    p.target.dispose();
    this.projectors.delete(p.id);
    this.onChange();
  }

  /** The overlay material: the picture where this camera sees the surface, nothing elsewhere; walls fold like the plan's. */
  private material(p: Projector, masks: FoldMasks | null): MeshBasicMaterial {
    const m = new MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    const fold = masks ? makeFoldable(m, masks, "solid").onBeforeCompile : null;
    m.onBeforeCompile = (shader, renderer) => {
      fold?.(shader, renderer);
      Object.assign(shader.uniforms, p.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform mat4 uProjMat;\nvarying vec4 vProj;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvProj = uProjMat * modelMatrix * vec4(transformed, 1.0);");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform sampler2D uProjTex;\nuniform sampler2D uDepth;\nuniform vec2 uNearFar;\nvarying vec4 vProj;\nfloat fp3dLinear(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNearFar.x * uNearFar.y / (uNearFar.y + uNearFar.x - z * (uNearFar.y - uNearFar.x)); }")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          if (vProj.w <= 0.0) discard;
          vec3 fp3dNdc = vProj.xyz / vProj.w;
          if (abs(fp3dNdc.x) > 1.0 || abs(fp3dNdc.y) > 1.0 || abs(fp3dNdc.z) > 1.0) discard;
          vec2 fp3dUv = fp3dNdc.xy * 0.5 + 0.5;
          // hidden from the camera (something nearer in its depth picture): no picture here; compared in metres
          float fp3dSeen = fp3dLinear(texture2D(uDepth, fp3dUv).x);
          float fp3dHere = fp3dLinear(fp3dNdc.z * 0.5 + 0.5);
          if (fp3dHere > fp3dSeen + 0.06 + 0.01 * fp3dHere) discard;
          vec4 fp3dPic = texture2D(uProjTex, fp3dUv);
          float fp3dEdge = smoothstep(0.0, 0.05, min(min(fp3dUv.x, 1.0 - fp3dUv.x), min(fp3dUv.y, 1.0 - fp3dUv.y)));
          // far away the picture fades out (what lies near the horizon would be smeared across the whole plot)
          float fp3dFar = 1.0 - smoothstep(0.65 * uNearFar.y, uNearFar.y, fp3dHere);
          diffuseColor = vec4(fp3dPic.rgb, 0.94 * fp3dEdge * fp3dFar);`,
        );
    };
    m.customProgramCacheKey = () => `fp3d-projection-${masks ? "fold" : "plain"}`;
    return m;
  }
}
