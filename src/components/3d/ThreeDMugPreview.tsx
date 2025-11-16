import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
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

  // Material del cuerpo - Cerámica profesional con acabado brillante
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      color: texture ? 0xffffff : 0xfafafa,
      metalness: 0.05,
      roughness: 0.15,
      envMapIntensity: 1.5,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      reflectivity: 0.6,
      ior: 1.5,
    });
  }, [texture]);

  // Material metálico - Acero inoxidable pulido
  const metalMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: 0xdcdcdc,
      metalness: 0.95,
      roughness: 0.08,
      envMapIntensity: 2.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
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

      {/* Interior visible - Acabado mate oscuro */}
      <mesh position={[0, dimensions.height / 2 - 0.02, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[dimensions.capRadius - 0.05, dimensions.capRadius - 0.05, 0.04, dimensions.radialSegments]} />
        <meshPhysicalMaterial
          color={0x2a2a2a}
          metalness={0.1}
          roughness={0.9}
          envMapIntensity={0.3}
        />
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

  // Aplicar textura y mejorar materiales del modelo GLB
  useEffect(() => {
    if (!scene) return;

    console.log('[GLBModel] Applying texture and enhancing materials');
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (mesh.material) {
          // Convertir a MeshPhysicalMaterial para mejor calidad
          const oldMaterial = mesh.material as THREE.MeshStandardMaterial;
          const newMaterial = new THREE.MeshPhysicalMaterial();

          // Copiar propiedades básicas
          newMaterial.copy(oldMaterial);

          // Aplicar textura si está disponible
          if (texture) {
            newMaterial.map = texture;
          }

          // Mejorar propiedades físicas basadas en el nombre del mesh
          const meshName = mesh.name.toLowerCase();

          if (meshName.includes('body') || meshName.includes('cylinder') || !meshName.includes('metal')) {
            // Material cerámico brillante
            newMaterial.metalness = 0.05;
            newMaterial.roughness = 0.15;
            newMaterial.clearcoat = 0.8;
            newMaterial.clearcoatRoughness = 0.2;
            newMaterial.envMapIntensity = 1.5;
            newMaterial.ior = 1.5;
          } else {
            // Material metálico pulido
            newMaterial.metalness = 0.95;
            newMaterial.roughness = 0.08;
            newMaterial.clearcoat = 0.3;
            newMaterial.clearcoatRoughness = 0.1;
            newMaterial.envMapIntensity = 2.0;
          }

          // Habilitar sombras
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          mesh.material = newMaterial;
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
      <Canvas
        shadows
        camera={{ position: [0, 1, 5], fov: 45 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        {/* Iluminación HDR profesional */}
        <Environment
          preset="studio"
          background={false}
          blur={0.3}
        />

        {/* Luces complementarias para resaltar detalles */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={20}
          shadow-bias={-0.0001}
        />
        <spotLight
          position={[-3, 4, 2]}
          intensity={0.8}
          angle={0.5}
          penumbra={1}
          castShadow
        />
        <pointLight position={[0, 3, -3]} intensity={0.4} color="#ffeedd" />

        {/* Modelo 3D con fallback automático */}
        <ModelWithFallback
          modelPath={modelPath}
          imageUrl={imageUrl}
          productType={productType}
          useGLB={useGLB}
        />

        {/* Sombras de contacto realistas */}
        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
          resolution={256}
          color="#000000"
        />

        {/* Plano reflectante profesional */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={512}
            mixBlur={1}
            mixStrength={0.5}
            roughness={0.8}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#f8f8f8"
            metalness={0.1}
          />
        </mesh>

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

        {/* Efectos de post-procesamiento */}
        <EffectComposer multisampling={8}>
          <SSAO
            samples={31}
            radius={0.1}
            intensity={30}
            luminanceInfluence={0.6}
          />
          <Bloom
            intensity={0.3}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
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
