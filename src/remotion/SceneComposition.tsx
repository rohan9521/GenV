import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, interpolate, Easing, staticFile } from 'remotion';
import { Environment, Text, useGLTF } from '@react-three/drei';
import type { ReactNode } from 'react';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { useMemo, useRef } from 'react';
import type { SceneObject, SceneSpec, Vector3 } from '../../shared/sceneSpec';
import { simulateCarDrive } from './carPhysics';

const easingMap = { linear: Easing.linear, 'ease-in': Easing.in(Easing.ease), 'ease-out': Easing.out(Easing.ease), 'ease-in-out': Easing.inOut(Easing.ease) };
function animated(object: SceneObject, frame: number) {
  const animation = object.animation; if (!animation || frame < animation.startFrame) return { position: object.position, rotation: object.rotation, scale: object.scale, opacity: 1 };
  const progress = interpolate(frame, [animation.startFrame, animation.startFrame + animation.durationInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easingMap[animation.easing] });
  const p = animation.params;
  if (animation.kind === 'rotate') return { position: object.position, rotation: [object.rotation[0] + progress * Number(p.x ?? 0), object.rotation[1] + progress * Number(p.y ?? Math.PI * 2), object.rotation[2] + progress * Number(p.z ?? 0)] as Vector3, scale: object.scale, opacity: 1 };
  if (animation.kind === 'float') return { position: [object.position[0], object.position[1] + Math.sin(progress * Math.PI * 2) * Number(p.amplitude ?? 0.3), object.position[2]] as Vector3, rotation: object.rotation, scale: object.scale, opacity: 1 };
  if (animation.kind === 'scale-in') return { position: object.position, rotation: object.rotation, scale: object.scale.map((v) => v * progress) as Vector3, opacity: 1 };
  if (animation.kind === 'scale-pulse') { const pulse = 1 + Math.sin(progress * Math.PI * 2) * Number(p.amplitude ?? 0.15); return { position: object.position, rotation: object.rotation, scale: object.scale.map((v) => v * pulse) as Vector3, opacity: 1 }; }
  if (animation.kind === 'fade-in') return { position: object.position, rotation: object.rotation, scale: object.scale, opacity: progress };
  if (animation.kind === 'move-to') { const target = (p.target as Vector3 | undefined) ?? object.position; return { position: object.position.map((v, i) => v + (target[i] - v) * progress) as Vector3, rotation: object.rotation, scale: object.scale, opacity: 1 }; }
  if (animation.kind === 'football-kick') return { position: object.position, rotation: object.rotation, scale: object.scale, opacity: 1 };
  if (animation.kind === 'football-roll') { const target = (p.target as Vector3 | undefined) ?? object.position; return { position: object.position.map((v, i) => v + (target[i] - v) * progress) as Vector3, rotation: [object.rotation[0], object.rotation[1], object.rotation[2] - progress * Math.PI * 8] as Vector3, scale: object.scale, opacity: 1 }; }
  if (animation.kind === 'orbit') { const angle = progress * Math.PI * 2; const radius = Number(p.radius ?? 1.5); return { position: [object.position[0] + Math.cos(angle) * radius, object.position[1], object.position[2] + Math.sin(angle) * radius] as Vector3, rotation: object.rotation, scale: object.scale, opacity: 1 }; }
  return { position: object.position, rotation: object.rotation, scale: object.scale, opacity: 1 };
}

function SceneMesh({ object, durationInFrames }: { object: SceneObject; durationInFrames: number }) {
  const frame = useCurrentFrame(); const mesh = useRef<Mesh>(null); const values = animated(object, frame);
  const common = { position: values.position, rotation: values.rotation, scale: values.scale, ref: mesh, castShadow: true, receiveShadow: true };
  const opacity = values.opacity * (object.material?.opacity ?? 1);
  const material = <meshStandardMaterial color={object.color} metalness={object.material?.metalness ?? 0.25} roughness={object.material?.roughness ?? 0.4} emissive={object.material?.emissive ?? '#000000'} transparent={object.material?.transparent === true || opacity < 1} opacity={opacity} />;
  if (object.type === 'car') return <CarScene object={object} frame={frame} durationInFrames={durationInFrames} />;
  if (object.type === 'footballer') {
    const animation = object.animation;
    const progress = animation?.kind === 'football-kick' && frame >= animation.startFrame
      ? interpolate(frame, [animation.startFrame, animation.startFrame + animation.durationInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easingMap[animation.easing] })
      : 0;
    const phase = progress * Math.PI * 4;
    const kick = Math.pow(Math.max(0, Math.sin(phase)), 4);
    const stride = Math.sin(phase);
    const part = (color: string) => <meshStandardMaterial color={color} roughness={0.82} />;
    return <group position={values.position} rotation={values.rotation} scale={values.scale}>
      <group position={[0, 0.03 + Math.abs(stride) * 0.025, 0]} rotation={[0, 0, -kick * 0.12]}>
        <mesh position={[0, 1.38, 0]} castShadow>{/* jersey */}<boxGeometry args={[0.58, 0.66, 0.34]} />{part(object.color)}</mesh>
        <mesh position={[0, 0.93, 0]} castShadow>{/* shorts */}<boxGeometry args={[0.54, 0.3, 0.36]} />{part('#17233f')}</mesh>
        <mesh position={[0, 1.99, 0]} castShadow><sphereGeometry args={[0.205, 20, 16]} />{part('#b97953')}</mesh>
        <mesh position={[0, 2.13, -0.015]} castShadow><sphereGeometry args={[0.205, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />{part('#20202a')}</mesh>
        {([-1, 1] as const).map((side) => <group key={`arm-${side}`} position={[side * 0.34, 1.63, 0]} rotation={[0, 0, side * (-0.28 + stride * 0.16)]}>
          <mesh position={[side * 0.035, -0.24, 0]} rotation={[0, 0, -side * 0.08]} castShadow><cylinderGeometry args={[0.095, 0.075, 0.47, 10]} />{part('#b97953')}</mesh>
          <mesh position={[side * 0.055, -0.51, 0]} castShadow><sphereGeometry args={[0.09, 12, 10]} />{part('#b97953')}</mesh>
        </group>)}
        {([-1, 1] as const).map((side) => {
          const legKick = side === 1 ? kick * 0.92 : -stride * 0.22;
          return <group key={`leg-${side}`} position={[side * 0.16, 0.82, 0]} rotation={[0, 0, legKick]}>
            <mesh position={[0, -0.2, 0]} castShadow><cylinderGeometry args={[0.14, 0.12, 0.43, 10]} />{part('#17233f')}</mesh>
            <group position={[0, -0.42, 0]} rotation={[0, 0, -legKick * 0.2]}>
              <mesh position={[0, -0.18, 0]} castShadow><cylinderGeometry args={[0.105, 0.075, 0.39, 10]} />{part('#f2f0e9')}</mesh>
              <mesh position={[0, -0.4, 0.07]} castShadow><boxGeometry args={[0.18, 0.12, 0.32]} />{part('#e54a42')}</mesh>
            </group>
          </group>;
        })}
      </group>
    </group>;
  }
  if (object.type === 'football') {
    return <group position={values.position} rotation={values.rotation} scale={values.scale}>
      <mesh castShadow receiveShadow><sphereGeometry args={[0.5, 24, 18]} />{partMaterial('#f4f2ea')}</mesh>
      {[[0.31, 0.2, 0.2], [-0.3, 0.22, 0.18], [0.24, -0.29, 0.18], [-0.2, -0.3, 0.26], [0.05, 0.16, -0.42], [-0.06, -0.16, 0.43]].map(([x, y, z], index) => <mesh key={index} position={[x, y, z]}><sphereGeometry args={[0.105, 8, 6]} />{partMaterial('#20232b')}</mesh>)}
    </group>;
  }
  if (object.type === 'text') return <Text {...common} fontSize={0.8} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#ffffff">{object.text}</Text>;
  const geometry: Record<Exclude<SceneObject['type'], 'text' | 'footballer' | 'football' | 'car'>, ReactNode> = { box: <boxGeometry args={[1, 1, 1]} />, sphere: <sphereGeometry args={[0.65, 32, 24]} />, cylinder: <cylinderGeometry args={[0.5, 0.5, 1, 8]} />, torus: <torusGeometry args={[0.65, 0.22, 20, 48]} />, plane: <planeGeometry args={[2, 2]} /> };
  return <mesh {...common}>{geometry[object.type]}{material}</mesh>;
}

function partMaterial(color: string) { return <meshStandardMaterial color={color} roughness={0.75} />; }

function quaternionToEuler([x, y, z, w]: [number, number, number, number]): [number, number, number] {
  const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (x * z + w * y))));
  return [
    Math.atan2(2 * (w * x - y * z), 1 - 2 * (x * x + y * y)),
    pitch,
    Math.atan2(2 * (w * z - x * y), 1 - 2 * (y * y + z * z)),
  ];
}

function CarScene({ object, frame, durationInFrames }: { object: SceneObject; frame: number; durationInFrames: number }) {
  const animation = object.animation?.kind === 'car-drive' ? object.animation : undefined;
  const physicsFrames = useMemo(() => simulateCarDrive(durationInFrames, animation), [durationInFrames, animation]);
  const state = physicsFrames[Math.min(Math.max(frame, 0), physicsFrames.length - 1)];
  if (!state) throw new Error(`Car physics simulation returned no frame for duration ${durationInFrames}.`);
  const { scene: sourceModel } = useGLTF(staticFile('models/car/rx7.glb'), staticFile('draco-gltf/'));
  const carModel = useMemo(() => {
    const model = sourceModel.clone(true);
    model.rotation.y = Math.PI / 2;
    model.position.set(0, -physicsFrames[0].chassis.position[1] - 0.035, 0);
    model.traverse((node) => {
      if (node.type !== 'Mesh') return;
      const mesh = node as Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const clonedMaterials = Array.isArray(mesh.material)
        ? mesh.material.map((material) => material.clone())
        : mesh.material.clone();
      mesh.material = clonedMaterials;
      for (const material of Array.isArray(clonedMaterials) ? clonedMaterials : [clonedMaterials]) {
        if (material.name.includes('Car_paint') && 'color' in material) {
          (material as MeshStandardMaterial).color.set(object.color);
        }
        if ('envMapIntensity' in material) (material as MeshStandardMaterial).envMapIntensity = 2;
      }
    });
    const wheelPivots = ['RX7_GROUPCircle008', 'RX7_GROUPCircle009', 'RX7_GROUPCircle010', 'RX7_GROUPCircle012']
      .map((name) => model.getObjectByName(name));
    if (wheelPivots.some((wheel) => !wheel)) {
      const availableWheelNames: string[] = [];
      model.traverse((node) => { if (/wheel|circle/i.test(node.name)) availableWheelNames.push(node.name); });
      throw new Error(`The RX-7 model is missing wheel pivots. Available nodes: ${availableWheelNames.join(', ') || 'none'}.`);
    }
    const wheels = wheelPivots.filter((wheel): wheel is Object3D => Boolean(wheel));
    return { model, wheels };
  }, [sourceModel, physicsFrames, object.color]);
  const [chassisX, , chassisZ] = state.chassis.position;
  const chassisRotation = quaternionToEuler(state.chassis.quaternion);
  const roadDashSpacing = 3.6;
  const roadScroll = ((chassisX % roadDashSpacing) + roadDashSpacing) % roadDashSpacing;
  state.wheels.forEach((wheel, index) => {
    carModel.wheels[index].rotation.x = -wheel.spin;
  });

  return <group position={[object.position[0] - chassisX, object.position[1], object.position[2] - chassisZ]} rotation={object.rotation} scale={object.scale}>
    <group position={[chassisX - roadScroll, 0, 0]}>
      <mesh position={[0, -0.07, 0]} receiveShadow><boxGeometry args={[72, 0.12, 6.2]} /><meshStandardMaterial color="#20242d" roughness={0.9} /></mesh>
      {[-1, 1].map((side) => <mesh key={`edge-${side}`} position={[0, 0.001, side * 2.65]}><boxGeometry args={[72, 0.015, 0.035]} /><meshStandardMaterial color="#7c8593" roughness={0.65} /></mesh>)}
      {Array.from({ length: 21 }, (_, index) => <mesh key={`dash-${index}`} position={[(index - 10) * roadDashSpacing, 0.001, 0]}><boxGeometry args={[1.8, 0.016, 0.055]} /><meshStandardMaterial color="#d7d7ce" roughness={0.65} /></mesh>)}
    </group>
    <group position={state.chassis.position} rotation={chassisRotation}>
      <primitive object={carModel.model} />
    </group>
  </group>;
}

export function SceneComposition({ spec }: { spec: SceneSpec }) {
  const hasGradientBackground = spec.background.startsWith('linear-gradient(');
  const hasCar = spec.objects.some((object) => object.type === 'car');
  const frame = useCurrentFrame();
  const orbit = spec.camera.orbit;
  const cameraPosition: Vector3 = orbit
    ? (() => {
      const [x, y, z] = spec.camera.position.map((value, index) => value - spec.camera.lookAt[index]) as Vector3;
      const angle = (frame / spec.durationInFrames) * orbit.turns * Math.PI * 2;
      return [x * Math.cos(angle) + z * Math.sin(angle), y, -x * Math.sin(angle) + z * Math.cos(angle)];
    })()
    : spec.camera.position;
  const cameraRotation: Vector3 | undefined = orbit
    ? [
      -Math.atan2(cameraPosition[1], Math.hypot(cameraPosition[0], cameraPosition[2])),
      Math.atan2(cameraPosition[0], cameraPosition[2]),
      0,
    ]
    : undefined;
  const cameraConfig = cameraRotation
    ? { position: cameraPosition, rotation: cameraRotation, fov: 45 }
    : { position: cameraPosition, fov: 45 };
  return <ThreeCanvas width={1280} height={720} camera={cameraConfig} gl={{ alpha: true }} style={{ width: '100%', height: '100%', background: spec.background }}>
    {!hasGradientBackground && <color attach="background" args={[spec.background]} />}
    {hasCar && <Environment files={staticFile('environment/blouberg_sunrise_2_1k.hdr')} ground={{ height: 4, radius: 80, scale: 500 }} environmentIntensity={0.8} />}
    {spec.lights.map((light) => light.type === 'ambient' ? <ambientLight key={light.id} color={light.color} intensity={light.intensity} /> : light.type === 'directional' ? <directionalLight key={light.id} color={light.color} intensity={light.intensity} position={light.position ?? [4, 5, 6]} /> : <pointLight key={light.id} color={light.color} intensity={light.intensity} position={light.position ?? [0, 4, 0]} />)}
    <group position={spec.camera.lookAt.map((v) => -v) as Vector3}>{spec.objects.map((object) => <SceneMesh key={object.id} object={object} durationInFrames={spec.durationInFrames} />)}</group>
  </ThreeCanvas>;
}
