import * as CANNON from 'cannon-es';
import type { SceneAnimation } from '../../shared/sceneSpec';

export type CarTransform = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
};

export type CarWheelTransform = CarTransform & {
  spin: number;
};

export type CarPhysicsFrame = {
  chassis: CarTransform;
  wheels: CarWheelTransform[];
};

const physicsStep = 1 / 120;
const physicsStepsPerFrame = 4;

export function simulateCarDrive(frameCount: number, animation?: SceneAnimation): CarPhysicsFrame[] {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  const solver = new CANNON.GSSolver();
  solver.iterations = 12;
  world.solver = solver;
  world.defaultContactMaterial.friction = 0.65;

  const chassisMaterial = new CANNON.Material('chassis');
  const groundMaterial = new CANNON.Material('ground');
  world.addContactMaterial(new CANNON.ContactMaterial(chassisMaterial, groundMaterial, {
    friction: 0.65,
    restitution: 0,
    contactEquationStiffness: 1e7,
  }));

  const ground = new CANNON.Body({ mass: 0, material: groundMaterial });
  ground.addShape(new CANNON.Plane());
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);

  const chassisBody = new CANNON.Body({
    mass: 1200,
    material: chassisMaterial,
    position: new CANNON.Vec3(0, 0.92, 0),
    linearDamping: 0.015,
    angularDamping: 0.28,
  });
  chassisBody.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.24, 0.69)));
  world.addBody(chassisBody);

  const vehicle = new CANNON.RaycastVehicle({
    chassisBody,
    indexRightAxis: 2,
    indexUpAxis: 1,
    indexForwardAxis: 0,
  });
  const wheelOptions = {
    radius: 0.37,
    directionLocal: new CANNON.Vec3(0, -1, 0),
    suspensionStiffness: 32,
    suspensionRestLength: 0.32,
    frictionSlip: 5,
    dampingRelaxation: 2.3,
    dampingCompression: 4.4,
    maxSuspensionForce: 100000,
    rollInfluence: 0.01,
    axleLocal: new CANNON.Vec3(0, 0, 1),
    maxSuspensionTravel: 0.3,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
  };
  for (const [x, z, isFrontWheel] of [
    [1.05, 0.73, true],
    [1.05, -0.73, true],
    [-1.05, 0.73, false],
    [-1.05, -0.73, false],
  ] as const) {
    vehicle.addWheel({
      ...wheelOptions,
      chassisConnectionPointLocal: new CANNON.Vec3(x, -0.05, z),
      isFrontWheel,
    });
  }
  vehicle.addToWorld(world);

  const advance = (engineForce: number) => {
    vehicle.applyEngineForce(engineForce, 2);
    vehicle.applyEngineForce(engineForce, 3);
    vehicle.setSteeringValue(0, 0);
    vehicle.setSteeringValue(0, 1);
    const forwardSpeed = chassisBody.velocity.x;
    const drag = -0.5 * 1.225 * 0.65 * forwardSpeed * Math.abs(forwardSpeed);
    const rollingResistance = forwardSpeed === 0 ? 0 : -Math.sign(forwardSpeed) * 0.015 * chassisBody.mass * 9.82;
    chassisBody.applyForce(new CANNON.Vec3(drag + rollingResistance, 0, 0));
    world.step(physicsStep);
  };

  for (let step = 0; step < 120; step += 1) advance(0);

  const frames: CarPhysicsFrame[] = [];
  for (let frame = 0; frame < frameCount; frame += 1) {
    const elapsedDriveFrames = animation ? frame - animation.startFrame : -1;
    const isDriving = animation?.kind === 'car-drive'
      && elapsedDriveFrames >= 0
      && elapsedDriveFrames < animation.durationInFrames;
    const throttle = isDriving ? Math.min(elapsedDriveFrames / 18, 1) : 0;
    const speedLimitFactor = Math.max(0, 1 - Math.abs(chassisBody.velocity.x) / 55);
    const engineForce = 4500 * throttle * speedLimitFactor;
    for (let step = 0; step < physicsStepsPerFrame; step += 1) advance(engineForce);

    const chassis = {
      position: [chassisBody.position.x, chassisBody.position.y, chassisBody.position.z] as [number, number, number],
      quaternion: chassisBody.quaternion.toArray(),
    };
    const wheels = vehicle.wheelInfos.map((wheel, index) => {
      vehicle.updateWheelTransform(index);
      const transform = wheel.worldTransform;
      return {
        position: [transform.position.x, transform.position.y, transform.position.z] as [number, number, number],
        quaternion: transform.quaternion.toArray(),
        spin: wheel.rotation,
      };
    });
    frames.push({ chassis, wheels });
  }

  return frames;
}
