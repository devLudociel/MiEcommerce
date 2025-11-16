import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDMugPreviewProps {
  imageUrl?: string;
  productType?: 'mug' | 'thermos' | 'bottle';
  backgroundColor?: string;
}

function MugModel({ imageUrl, productType = 'mug' }: { imageUrl?: string; productType: 'mug' | 'thermos' | 'bottle' }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Auto-rotación suave
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  // Cargar textura desde URL
  const texture = useMemo(() => {
    if (!imageUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(imageUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }, [imageUrl]);

  // Dimensiones según tipo de producto
  const dimensions = useMemo(() => {
    switch (productType) {
      case 'thermos':
        return { radius: 0.4, height: 2.5, radialSegments: 32 };
      case 'bottle':
        return { radius: 0.35, height: 2.0, radialSegments: 32 };
      case 'mug':
      default:
        return { radius: 0.5, height: 1.2, radialSegments: 32 };
    }
  }, [productType]);

  // Material
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: texture ? 0xffffff : 0xe0e0e0,
      metalness: 0.3,
      roughness: 0.4,
      envMapIntensity: 0.5,
    });
  }, [texture]);

  return (
    <group>
      {/* Cuerpo cilíndrico de la taza/termo */}
      <mesh ref={meshRef} material={material} castShadow receiveShadow>
        <cylinderGeometry args={[
          dimensions.radius,
          dimensions.radius,
          dimensions.height,
          dimensions.radialSegments,
        ]} />
      </mesh>

      {/* Asa de la taza (solo para mugs) */}
      {productType === 'mug' && (
        <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.35, 0.08, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.3} roughness={0.4} />
        </mesh>
      )}

      {/* Base */}
      <mesh position={[0, -dimensions.height / 2, 0]} receiveShadow>
        <cylinderGeometry args={[dimensions.radius + 0.05, dimensions.radius + 0.05, 0.1, 32]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Borde superior */}
      <mesh position={[0, dimensions.height / 2, 0]}>
        <cylinderGeometry args={[dimensions.radius + 0.05, dimensions.radius, 0.1, 32]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#cccccc" />
    </mesh>
  );
}

export default function ThreeDMugPreview({
  imageUrl,
  productType = 'mug',
  backgroundColor = '#f5f5f5'
}: ThreeDMugPreviewProps) {
  return (
    <div style={{ width: '100%', height: '500px', background: backgroundColor, borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />

        {/* Iluminación */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.3} />

        {/* Modelo 3D */}
        <Suspense fallback={<LoadingFallback />}>
          <MugModel imageUrl={imageUrl} productType={productType} />
        </Suspense>

        {/* Entorno (iluminación ambiental realista) */}
        {/* <Environment preset="studio" /> */}

        {/* Controles de órbita (arrastrar para rotar) */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={8}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 3}
        />

        {/* Plano de sombra */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <shadowMaterial opacity={0.3} />
        </mesh>
      </Canvas>

      {/* Controles de ayuda */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '12px',
        pointerEvents: 'none',
      }}>
        🖱️ Arrastra para rotar • 🔍 Scroll para zoom
      </div>
    </div>
  );
}
