import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Brain() {
  const meshRef = useRef();
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#000000"
        emissive="#00ff00"
        emissiveIntensity={0.3}
        metalness={0.2}
        roughness={0.6}
        wireframe={true}
      />
    </mesh>
  );
}

function Neurons() {
  const pointsRef = useRef(null);
  const [positions] = useState(() => {
    const points = [];
    for (let i = 0; i < 100; i++) {
      points.push(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      );
    }
    return new Float32Array(points);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#00ff00" size={0.08} />
    </points>
  );
}

export default function BrainVisualization() {
  const canvasRef = useRef(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const handleContextLoss = () => {
      console.warn('WebGL context lost');
      setContextLost(true);
    };

    const handleContextRestoration = () => {
      console.log('WebGL context restored');
      setContextLost(false);
    };

    canvas.addEventListener('webglcontextlost', handleContextLoss);
    canvas.addEventListener('webglcontextrestored', handleContextRestoration);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLoss);
      canvas.removeEventListener('webglcontextrestored', handleContextRestoration);
    };
  }, []);

  return (
    <div className="w-full h-96 bg-black rounded-lg overflow-hidden border-2 border-gray-800" ref={canvasRef}>
      {contextLost && (
        <div className="w-full h-full flex items-center justify-center bg-black text-white">
          <p>Visualization temporarily unavailable. Refresh if needed.</p>
        </div>
      )}
      <Canvas 
        camera={{ position: [0, 0, 3], fov: 75 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, 10]} intensity={0.3} color="#00ff00" />
        
        <Brain />
        <Neurons />
        
        <OrbitControls
          autoRotate
          autoRotateSpeed={1.5}
          enableZoom={false}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
}
