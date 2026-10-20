import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { Text } from '@react-three/drei';
import type { ReactNode } from 'react';
import type { Mesh } from 'three';
import { useRef } from 'react';
import type { SceneObject, SceneSpec, Vector3 } from '../../shared/sceneSpec';

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
  const angle = progress * Math.PI * 2; const radius = Number(p.radius ?? 1.5);
  return { position: [object.position[0] + Math.cos(angle) * radius, object.position[1], object.position[2] + Math.sin(angle) * radius] as Vector3, rotation: object.rotation, scale: object.scale, opacity: 1 };
}

function SceneMesh({ object }: { object: SceneObject }) {
  const frame = useCurrentFrame(); const mesh = useRef<Mesh>(null); const values = animated(object, frame);
  const common = { position: values.position, rotation: values.rotation, scale: values.scale, ref: mesh, castShadow: true, receiveShadow: true };
  const opacity = values.opacity * (object.material?.opacity ?? 1);
  const material = <meshStandardMaterial color={object.color} metalness={object.material?.metalness ?? 0.25} roughness={object.material?.roughness ?? 0.4} emissive={object.material?.emissive ?? '#000000'} transparent={object.material?.transparent === true || opacity < 1} opacity={opacity} />;
  if (object.type === 'text') return <Text {...common} fontSize={0.8} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#ffffff">{object.text}</Text>;
  const geometry: Record<Exclude<SceneObject['type'], 'text'>, ReactNode> = { box: <boxGeometry args={[1, 1, 1]} />, sphere: <sphereGeometry args={[0.65, 32, 24]} />, cylinder: <cylinderGeometry args={[0.5, 0.5, 1, 8]} />, torus: <torusGeometry args={[0.65, 0.22, 20, 48]} />, plane: <planeGeometry args={[2, 2]} /> };
  return <mesh {...common}>{geometry[object.type]}{material}</mesh>;
}

export function SceneComposition({ spec }: { spec: SceneSpec }) {
  const hasGradientBackground = spec.background.startsWith('linear-gradient(');
  return <ThreeCanvas width={1280} height={720} camera={{ position: spec.camera.position, fov: 45 }} gl={{ alpha: true }} style={{ width: '100%', height: '100%', background: spec.background }}>
    {!hasGradientBackground && <color attach="background" args={[spec.background]} />}
    {spec.lights.map((light) => light.type === 'ambient' ? <ambientLight key={light.id} color={light.color} intensity={light.intensity} /> : light.type === 'directional' ? <directionalLight key={light.id} color={light.color} intensity={light.intensity} position={light.position ?? [4, 5, 6]} /> : <pointLight key={light.id} color={light.color} intensity={light.intensity} position={light.position ?? [0, 4, 0]} />)}
    <group position={spec.camera.lookAt.map((v) => -v) as Vector3}>{spec.objects.map((object) => <SceneMesh key={object.id} object={object} />)}</group>
  </ThreeCanvas>;
}
