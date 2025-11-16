import { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDMugPreviewProps {
  imageUrl?: string;
  productType?: 'mug' | 'thermos' | 'bottle';
  backgroundColor?: string;
}

/**
 * Componente que carga un modelo 3D .glb y aplica la textura personalizada
 */
function GLBModel({
  modelPath,
  imageUrl,
  productType
}: {
  modelPath: string;
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle'
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  console.log('[GLBModel] Loading model:', modelPath);

  // Cargar textura personalizada del usuario
  useEffect(() => {
    console.log('[GLBModel] Texture effect triggered, imageUrl:', imageUrl);
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

    console.log('[GLBModel] Applying texture to model meshes');
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Si el material es el cuerpo del producto (no metales)
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).map !== undefined) {
          const material = mesh.material as THREE.MeshStandardMaterial;

          if (texture) {
            // Aplicar la textura del usuario
            material.map = texture;
            material.needsUpdate = true;
            console.log('[GLBModel] Texture applied to mesh:', mesh.name);
          } else {
            // Restablecer color original
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

  // Escalar según tipo de producto
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

  // Determinar qué modelo cargar según el tipo
  const modelPath = useMemo(() => {
    switch (productType) {
      case 'thermos':
        return '/models/thermos.glb';
      case 'bottle':
        return '/models/bottle.glb';
      case 'mug':
      default:
        return '/models/mug.glb';
    }
  }, [productType]);

  return (
    <div style={{ width: '100%', height: '500px', background: backgroundColor, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
        {/* Iluminación profesional */}
        <ambientLight intensity={0.5} />

        {/* Luz principal direccional */}
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

        {/* Luces de relleno para realismo */}
        <pointLight position={[-5, 3, -3]} intensity={0.5} color="#ffffff" />
        <pointLight position={[3, -2, 4]} intensity={0.4} color="#b8e6ff" />
        <spotLight
          position={[0, 10, 0]}
          intensity={0.4}
          angle={0.3}
          penumbra={1}
          castShadow
        />

        {/* Modelo 3D GLB */}
        <Suspense fallback={<LoadingFallback />}>
          <GLBModel
            modelPath={modelPath}
            imageUrl={imageUrl}
            productType={productType}
          />
        </Suspense>

        {/* Controles de órbita */}
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

      {/* Badge cuando hay imagen cargada */}
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

      {/* Controles de ayuda */}
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

// Precargar modelos para mejorar rendimiento
useGLTF.preload('/models/mug.glb');
useGLTF.preload('/models/thermos.glb');
useGLTF.preload('/models/bottle.glb');
