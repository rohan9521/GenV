import { Composition, registerRoot } from 'remotion';
import { SceneComposition } from './SceneComposition';
import { demoScene } from '../../shared/sceneSpec';
const RemotionRoot = () => <Composition id="PromptToVideo" component={SceneComposition} durationInFrames={demoScene.durationInFrames} calculateMetadata={({ props }) => ({ durationInFrames: props.spec.durationInFrames })} fps={30} width={1280} height={720} defaultProps={{ spec: demoScene }} />;
registerRoot(RemotionRoot);
