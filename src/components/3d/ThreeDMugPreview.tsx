import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDMugPreviewProps {
  imageUrl?: string;
  productType?: 'mug' | 'thermos' | 'bottle';
  backgroundColor?: string;
}

/**
 * Modelo procedural de fallback (cuando no hay .glb)
 */
function ProceduralMugModel({
  imageUrl,
  productType = 'mug'
}: {
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Cargar textura
  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.repeat.set(1, 1);
        loadedTexture.needsUpdate = true;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('[ProceduralMugModel] Error loading texture:', error);
        setTexture(null);
      }
    );
  }, [imageUrl]);

  // Auto-rotación
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Dimensiones según tipo
  const dimensions = useMemo(() => {
    switch (productType) {
      case 'thermos':
        return {
          radius: 0.45,
          height: 2.8,
          radialSegments: 64,
          hasHandle: false,
          capRadius: 0.48,
          baseRadius: 0.47
        };
      case 'bottle':
        return {
          radius: 0.38,
          height: 2.2,
          radialSegments: 64,
          hasHandle: false,
          capRadius: 0.35,
          baseRadius: 0.40
        };
      case 'mug':
      default:
        return {
          radius: 0.55,
          height: 1.4,
          radialSegments: 64,
          hasHandle: true,
          capRadius: 0.58,
          baseRadius: 0.56
        };
    }
  }, [productType]);

  // Material del cuerpo
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: texture ? 0xffffff : 0xf8f8f8,
      metalness: 0.15,
      roughness: 0.25,
      envMapIntensity: 0.8,
    });
  }, [texture]);

  // Material metálico
  const metalMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      metalness: 0.85,
      roughness: 0.15,
      envMapIntensity: 1.2,
    });
  }, []);

  return (
    <group ref={groupRef}>
      {/* Cuerpo principal */}
      <mesh material={bodyMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[
          dimensions.radius,
          dimensions.radius,
          dimensions.height,
          dimensions.radialSegments,
        ]} />
      </mesh>

      {/* Asa (solo tazas) */}
      {dimensions.hasHandle && (
        <group position={[0.75, 0.1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={metalMaterial}>
            <torusGeometry args={[0.4, 0.09, 24, 48, Math.PI * 0.8]} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow material={metalMaterial}>
            <sphereGeometry args={[0.11, 16, 16]} />
          </mesh>
          <mesh position={[0, -0.32, 0]} castShadow material={metalMaterial}>
            <sphereGeometry args={[0.11, 16, 16]} />
          </mesh>
        </group>
      )}

      {/* Base */}
      <mesh position={[0, -dimensions.height / 2 - 0.03, 0]} receiveShadow material={metalMaterial}>
        <cylinderGeometry args={[dimensions.baseRadius, dimensions.baseRadius, 0.06, dimensions.radialSegments]} />
      </mesh>

      {/* Anillo inferior */}
      <mesh position={[0, -dimensions.height / 2 + 0.05, 0]} material={metalMaterial}>
        <torusGeometry args={[dimensions.radius + 0.02, 0.03, 16, dimensions.radialSegments]} />
      </mesh>

      {/* Borde superior */}
      <mesh position={[0, dimensions.height / 2, 0]} material={metalMaterial}>
        <cylinderGeometry args={[dimensions.capRadius, dimensions.radius, 0.08, dimensions.radialSegments]} />
      </mesh>

      {/* Anillo superior */}
      <mesh position={[0, dimensions.height / 2 - 0.08, 0]} material={metalMaterial}>
        <torusGeometry args={[dimensions.radius + 0.02, 0.025, 16, dimensions.radialSegments]} />
      </mesh>

      {/* Interior visible */}
      <mesh position={[0, dimensions.height / 2 - 0.02, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[dimensions.capRadius - 0.05, dimensions.capRadius - 0.05, 0.04, dimensions.radialSegments]} />
        <meshStandardMaterial color={0x404040} metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

/**
 * Modelo GLB profesional
 */
function GLBModel({
  modelPath,
  imageUrl,
  productType
}: {
  modelPath: string;
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle';
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  console.log('[GLBModel] Model loaded successfully:', modelPath);

  // Cargar textura
  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        console.log('[GLBModel] Texture loaded successfully');
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.needsUpdate = true;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('[GLBModel] Error loading texture:', error);
        setTexture(null);
      }
    );
  }, [imageUrl]);

  // Aplicar textura al modelo
  useEffect(() => {
    if (!scene) return;

    console.log('[GLBModel] Applying texture to model');
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).map !== undefined) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (texture) {
            material.map = texture;
            material.needsUpdate = true;
          } else {
            material.map = null;
            material.needsUpdate = true;
          }
        }
      }
    });
  }, [scene, texture]);

  // Auto-rotación
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Escalar según tipo
  const scale = useMemo(() => {
    switch (productType) {
      case 'thermos': return 1.0;
      case 'bottle': return 0.8;
      case 'mug':
      default: return 1.2;
    }
  }, [productType]);

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} scale={scale} />
    </group>
  );
}

/**
 * Wrapper con manejo de errores
 */
function ModelWithFallback({
  modelPath,
  imageUrl,
  productType,
  useGLB
}: {
  modelPath: string;
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle';
  useGLB: boolean;
}) {
  const [error, setError] = useState(false);

  if (!useGLB || error) {
    console.log('[ModelWithFallback] Using procedural model');
    return <ProceduralMugModel imageUrl={imageUrl} productType={productType} />;
  }

  return (
    <ErrorBoundary fallback={<ProceduralMugModel imageUrl={imageUrl} productType={productType} />}>
      <Suspense fallback={<LoadingFallback />}>
        <GLBModel
          modelPath={modelPath}
          imageUrl={imageUrl}
          productType={productType}
        />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Error Boundary para capturar errores de carga de GLB
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    console.error('[ErrorBoundary] GLB load failed, using fallback:', error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#e0e0e0" />
    </mesh>
  );
}

export default function ThreeDMugPreview({
  imageUrl,
  productType = 'mug',
  backgroundColor = '#f5f5f5'
}: ThreeDMugPreviewProps) {
  console.log('[ThreeDMugPreview] Rendering with:', { imageUrl, productType, backgroundColor });

  // Determinar qué modelo cargar
  const modelPath = useMemo(() => {
    switch (productType) {
      case 'thermos': return '/models/thermos.glb';
      case 'bottle': return '/models/bottle.glb';
      case 'mug':
      default: return '/models/mug.glb';
    }
  }, [productType]);

  // Intentar usar GLB (si falla, usará modelo procedural)
  const [useGLB] = useState(true);

  return (
    <div style={{ width: '100%', height: '500px', background: backgroundColor, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
        {/* Iluminación */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-5, 3, -3]} intensity={0.5} color="#ffffff" />
        <pointLight position={[3, -2, 4]} intensity={0.4} color="#b8e6ff" />
        <spotLight position={[0, 10, 0]} intensity={0.4} angle={0.3} penumbra={1} castShadow />

        {/* Modelo 3D con fallback automático */}
        <ModelWithFallback
          modelPath={modelPath}
          imageUrl={imageUrl}
          productType={productType}
          useGLB={useGLB}
        />

        {/* Controles */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={3}
          maxDistance={12}
          maxPolarAngle={Math.PI / 1.5}
          minPolarAngle={Math.PI / 6}
          autoRotate={false}
        />

        {/* Plano de sombra */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <shadowMaterial opacity={0.3} />
        </mesh>

        {/* Plano reflectante */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.1} roughness={0.8} />
        </mesh>
      </Canvas>

      {/* Badge cuando hay imagen */}
      {imageUrl && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white',
          padding: '8px 14px',
          borderRadius: '24px',
          fontSize: '12px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
        }}>
          ✓ Diseño aplicado
        </div>
      )}

      {/* Controles */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '28px',
        fontSize: '13px',
        fontWeight: '500',
        pointerEvents: 'none',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      }}>
        🖱️ Arrastra para rotar • 🔍 Scroll para zoom
      </div>
    </div>
  );
}
