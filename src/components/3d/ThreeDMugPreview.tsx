import { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDMugPreviewProps {
  imageUrl?: string;
  productType?: 'mug' | 'thermos' | 'bottle';
  backgroundColor?: string;
}

function MugModel({ imageUrl, productType = 'mug' }: { imageUrl?: string; productType: 'mug' | 'thermos' | 'bottle' }) {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  console.log('[MugModel] Rendering with:', { imageUrl, productType, hasTexture: !!texture });

  // Cargar textura cuando cambie imageUrl
  useEffect(() => {
    console.log('[MugModel] useEffect triggered, imageUrl:', imageUrl);
    if (!imageUrl) {
      setTexture(null);
      return;
    }

    const loader = new THREE.TextureLoader();
    console.log('[MugModel] Loading texture from:', imageUrl);
    loader.load(
      imageUrl,
      (loadedTexture) => {
        console.log('[MugModel] Texture loaded successfully');
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.repeat.set(1, 1);
        loadedTexture.needsUpdate = true;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('[MugModel] Error loading texture:', error);
        setTexture(null);
      }
    );
  }, [imageUrl]);

  // Auto-rotación suave
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Dimensiones según tipo de producto
  const dimensions = useMemo(() => {
    const dims = (() => {
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
    })();
    console.log('[MugModel] Dimensions calculated:', dims);
    return dims;
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

  // Material metálico para detalles
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
      {/* TEST: Cubo simple para verificar que Canvas funciona */}
      <mesh position={[0, 3, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="red" />
      </mesh>

      {/* Cuerpo principal */}
      <mesh material={bodyMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[
          dimensions.radius,
          dimensions.radius,
          dimensions.height,
          dimensions.radialSegments,
        ]} />
      </mesh>

      {/* Asa (solo para tazas) */}
      {dimensions.hasHandle && (
        <group position={[0.75, 0.1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={metalMaterial}>
            <torusGeometry args={[0.4, 0.09, 24, 48, Math.PI * 0.8]} />
          </mesh>
          {/* Conexión superior del asa */}
          <mesh position={[0, 0.32, 0]} castShadow material={metalMaterial}>
            <sphereGeometry args={[0.11, 16, 16]} />
          </mesh>
          {/* Conexión inferior del asa */}
          <mesh position={[0, -0.32, 0]} castShadow material={metalMaterial}>
            <sphereGeometry args={[0.11, 16, 16]} />
          </mesh>
        </group>
      )}

      {/* Base */}
      <mesh position={[0, -dimensions.height / 2 - 0.03, 0]} receiveShadow material={metalMaterial}>
        <cylinderGeometry args={[dimensions.baseRadius, dimensions.baseRadius, 0.06, dimensions.radialSegments]} />
      </mesh>

      {/* Anillo inferior decorativo */}
      <mesh position={[0, -dimensions.height / 2 + 0.05, 0]} material={metalMaterial}>
        <torusGeometry args={[dimensions.radius + 0.02, 0.03, 16, dimensions.radialSegments]} />
      </mesh>

      {/* Borde superior */}
      <mesh position={[0, dimensions.height / 2, 0]} material={metalMaterial}>
        <cylinderGeometry args={[dimensions.capRadius, dimensions.radius, 0.08, dimensions.radialSegments]} />
      </mesh>

      {/* Anillo superior decorativo */}
      <mesh position={[0, dimensions.height / 2 - 0.08, 0]} material={metalMaterial}>
        <torusGeometry args={[dimensions.radius + 0.02, 0.025, 16, dimensions.radialSegments]} />
      </mesh>

      {/* Interior visible (tope) */}
      <mesh position={[0, dimensions.height / 2 - 0.02, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[dimensions.capRadius - 0.05, dimensions.capRadius - 0.05, 0.04, dimensions.radialSegments]} />
        <meshStandardMaterial color={0x404040} metalness={0.3} roughness={0.7} />
      </mesh>
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

  return (
    <div style={{ width: '100%', height: '500px', background: backgroundColor, borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0.3, 5]} fov={45} />

        {/* Iluminación mejorada */}
        <ambientLight intensity={0.6} />

        {/* Luz principal */}
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* Luces de relleno */}
        <pointLight position={[-5, 3, -3]} intensity={0.4} color="#fff" />
        <pointLight position={[3, -2, 4]} intensity={0.3} color="#b8e6ff" />
        <spotLight position={[0, 10, 0]} intensity={0.3} angle={0.3} penumbra={1} castShadow />

        {/* Modelo 3D */}
        <Suspense fallback={<LoadingFallback />}>
          <MugModel imageUrl={imageUrl} productType={productType} />
        </Suspense>

        {/* Controles de órbita */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2.5}
          maxDistance={10}
          maxPolarAngle={Math.PI / 1.6}
          minPolarAngle={Math.PI / 4}
          autoRotate={false}
          autoRotateSpeed={1}
        />

        {/* Plano de sombra con gradiente */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
          <planeGeometry args={[15, 15]} />
          <shadowMaterial opacity={0.25} />
        </mesh>

        {/* Plano reflectante sutil */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
          <planeGeometry args={[15, 15]} />
          <meshStandardMaterial color="#f0f0f0" metalness={0.1} roughness={0.8} />
        </mesh>
      </Canvas>

      {/* Indicador de carga */}
      {imageUrl && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(16, 185, 129, 0.9)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 'bold',
        }}>
          ✓ Diseño cargado
        </div>
      )}

      {/* Controles de ayuda */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.75)',
        color: 'white',
        padding: '10px 18px',
        borderRadius: '24px',
        fontSize: '12px',
        fontWeight: '500',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
      }}>
        🖱️ Arrastra para rotar • 🔍 Scroll para zoom
      </div>
    </div>
  );
}
