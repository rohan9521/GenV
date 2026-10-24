import { describe, expect, it } from 'vitest';
import { AnimationSchema } from '../../shared/sceneSpec';
import { simulateCarDrive } from './carPhysics';

describe('car raycast-vehicle simulation', () => {
  it('settles onto its suspension and stays grounded while idle', () => {
    const frames = simulateCarDrive(30);
    const finalFrame = frames[frames.length - 1];

    expect(finalFrame.chassis.position[1]).toBeGreaterThan(0.6);
    expect(finalFrame.chassis.position[1]).toBeLessThan(1.2);
    expect(finalFrame.chassis.position[0]).toBeCloseTo(0, 2);
    expect(finalFrame.wheels).toHaveLength(4);
    expect(finalFrame.wheels.every((wheel) => wheel.position[1] > 0.1 && wheel.position[1] < 0.7)).toBe(true);
  });

  it('accelerates the chassis and rolls the simulated wheels', () => {
    const animation = AnimationSchema.parse({ kind: 'car-drive', startFrame: 0, durationInFrames: 90 });
    const frames = simulateCarDrive(90, animation);
    const firstFrame = frames[0];
    const finalFrame = frames[frames.length - 1];

    expect(finalFrame.chassis.position[0] - firstFrame.chassis.position[0]).toBeGreaterThan(1);
    expect(finalFrame.wheels[2].quaternion).not.toEqual(firstFrame.wheels[2].quaternion);
  });
});
