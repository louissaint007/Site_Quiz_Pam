import React, { useRef, Suspense } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { useGLTF } from '@react-three/drei';

interface Mascotte3DProps {
  gameState: 'idle' | 'win' | 'lose' | 'waiting';
  modelUrl?: string;
}

const Model: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

export const Mascotte3D: React.FC<Mascotte3DProps> = ({ gameState, modelUrl }) => {
  const meshRef = useRef<THREE.Group>(null);

  // Fallback to a safe box if model is missing or loading
  // We know '/mascotte.glb' is missing, so we'll only try to load if it's a custom URL
  const validModelUrl = modelUrl && modelUrl !== '/mascotte.glb' ? modelUrl : null;

  // Animate based on game state using react-spring for 3D overall grouping wrapper
  const { position, rotation, scale } = useSpring({
    position: gameState === 'win'
      ? [0, 1.5, 0]
      : gameState === 'lose' ? [0, -1.2, 0] : [0, -0.8, 0], // Base Y offset adjusted for a standing character
    rotation: gameState === 'win'
      ? [0, Math.PI * 2, 0]
      : gameState === 'lose' ? [Math.PI / 4, 0, 0] : [0, 0, 0],
    scale: gameState === 'win' ? [1.5, 1.5, 1.5] : [1.2, 1.2, 1.2],
    config: { tension: 170, friction: 12 }
  });

  // Idle hover animation
  useFrame((state) => {
    if (meshRef.current && gameState === 'idle') {
      meshRef.current.position.y = -0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <animated.group ref={meshRef} position={position as any} rotation={rotation as any} scale={scale as any}>
      {validModelUrl ? (
        <Suspense fallback={
          <mesh>
            <boxGeometry args={[0.8, 1.2, 0.8]} />
            <meshStandardMaterial color="#6366f1" opacity={0.5} transparent />
          </mesh>
        }>
          <Model url={validModelUrl} />
        </Suspense>
      ) : (
        /* Fallback 3D Character (Simple Box with "Face") */
        <mesh>
          <boxGeometry args={[1, 1.5, 1]} />
          <meshStandardMaterial color={gameState === 'win' ? '#fbbf24' : '#6366f1'} />
          <mesh position={[0, 0.4, 0.51]}>
            <planeGeometry args={[0.6, 0.2]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </mesh>
      )}
    </animated.group>
  );
};
