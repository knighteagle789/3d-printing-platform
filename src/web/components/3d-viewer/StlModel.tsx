'use client';

import { useEffect, useRef } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

interface StlModelProps {
  url: string;
}

export function StlModel({ url }: StlModelProps) {
  const geometry = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!geometry) return;

    geometry.computeBoundingBox();
    geometry.center();

    const bbox = geometry.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Position camera based on model size
    const distance = maxDim * 2;
    (camera as THREE.PerspectiveCamera).position.set(distance, distance * 0.6, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [geometry, camera]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#3b82f6"
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}