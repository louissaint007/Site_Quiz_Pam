import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import { useGLTF } from '@react-three/drei';

interface Mascotte3DProps {
  gameState: 'idle' | 'win' | 'lose';
  modelUrl?: string;
}

export const Mascotte3D: React.FC<Mascotte3DProps> = ({ gameState, modelUrl }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Load the downloaded 3D model or custom
  const urlToParse = modelUrl || '/mascotte.glb';
  const { scene } = useGLTF(urlToParse);

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
        {/* We clone or drop the scene as primitive directly. In React Three Fiber, 
            Primitive handles the generic GLTF objects safely */}
        <primitive object={scene} />
    </animated.group>
  );
};

// Preload the default model
useGLTF.preload('/mascotte.glb');
