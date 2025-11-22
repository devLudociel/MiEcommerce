import React, { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

interface Mug3DColors {
  body: string;
  handle: string;
  interior: string;
}

interface ThreeDMugPreviewProps {
  imageUrl?: string;
  productType?: 'mug' | 'thermos' | 'bottle';
  backgroundColor?: string;
  productColor?: string;
  autoRotate?: boolean;
  mugColors?: Mug3DColors;
}

/**
 * Iluminación cinematográfica profesional de estudio
 * Sistema de iluminación de 3 puntos mejorado con luces de acento
 */
function StudioLighting() {
  return (
    <>
      {/* Luz ambiental base - más intensa para resaltar materiales */}
      <ambientLight intensity={0.6} color="#ffffff" />

      {/* Luz principal (Key Light) - más intensa y dramática */}
      <directionalLight
        position={[6, 8, 6]}
        intensity={2.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={25}
        shadow-bias={-0.00005}
      />

      {/* Luz de relleno (Fill Light) - más suave y fría */}
      <directionalLight
        position={[-5, 4, 5]}
        intensity={1.2}
        color="#e8f0ff"
      />

      {/* Luz trasera (Rim Light) - más cálida y potente */}
      <directionalLight
        position={[-3, 3, -5]}
        intensity={1.8}
        color="#fff5e6"
      />

      {/* Luces de acento para reflejos espectaculares */}
      <pointLight position={[4, 6, 4]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-4, 3, -3]} intensity={0.8} color="#d0e8ff" />
      <pointLight position={[0, 8, 0]} intensity={1.0} color="#fffaf0" />
      <pointLight position={[2, -1, 3]} intensity={0.6} color="#ffffff" />

      {/* Spotlight cenital potente para brillo superior */}
      <spotLight
        position={[0, 12, 0]}
        intensity={1.2}
        angle={0.5}
        penumbra={0.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Luces hemisféricas para ambiente completo */}
      <hemisphereLight
        args={['#ffffff', '#606060', 0.8]}
        position={[0, 10, 0]}
      />
    </>
  );
}

/**
 * Modelo procedural de fallback (cuando no hay .glb)
 */
function ProceduralMugModel({
  imageUrl,
  productType = 'mug',
  productColor = '#ffffff',
  mugColors
}: {
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle';
  productColor?: string;
  mugColors?: Mug3DColors;
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

        // Configuración básica para verificar que la textura se ve
        loadedTexture.rotation = 0;
        loadedTexture.repeat.set(1, 1);
        loadedTexture.offset.set(0, 0);

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

  // Dimensiones según tipo - Mejoradas para realismo
  const dimensions = useMemo(() => {
    switch (productType) {
      case 'thermos':
        return {
          radius: 0.45,
          height: 2.8,
          radialSegments: 96,
          hasHandle: false,
          capRadius: 0.48,
          baseRadius: 0.47
        };
      case 'bottle':
        return {
          radius: 0.76,
          height: 4.4,
          radialSegments: 96,
          hasHandle: false,
          capRadius: 0.70,
          baseRadius: 0.80
        };
      case 'mug':
      default:
        return {
          radius: 1.16,  // Aumentado 2x para mejor visibilidad
          height: 3.0,   // Aumentado 2x
          radialSegments: 96,
          hasHandle: true,
          capRadius: 1.24,  // Aumentado 2x
          baseRadius: 1.20  // Aumentado 2x
        };
    }
  }, [productType]);

  // Material del cuerpo - Cerámica ultra profesional con acabado esmaltado brillante
  const bodyMaterial = useMemo(() => {
    // Determinar color: mugColors.body > productColor > blanco (si hay textura)
    let bodyColor;
    if (mugColors?.body) {
      bodyColor = new THREE.Color(mugColors.body);
    } else if (texture) {
      bodyColor = new THREE.Color(0xffffff);
    } else {
      bodyColor = new THREE.Color(productColor);
    }

    return new THREE.MeshPhysicalMaterial({
      map: texture,
      color: bodyColor,
      metalness: 0.02,
      roughness: 0.08,
      envMapIntensity: 2.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
      ior: 1.52,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xffffff),
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
    });
  }, [texture, productColor, mugColors]);

  // Material metálico/asa - Cromado espejado ultra brillante
  const handleMaterial = useMemo(() => {
    const handleColor = mugColors?.handle ? new THREE.Color(mugColors.handle) : new THREE.Color(0xe8e8e8);

    return new THREE.MeshPhysicalMaterial({
      color: handleColor,
      metalness: 0.98,
      roughness: 0.02,
      envMapIntensity: 3.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
      ior: 2.5,
    });
  }, [mugColors]);

  // Material del interior
  const interiorMaterial = useMemo(() => {
    const interiorColor = mugColors?.interior ? new THREE.Color(mugColors.interior) : new THREE.Color(0x2a2a2a);

    return new THREE.MeshPhysicalMaterial({
      color: interiorColor,
      metalness: 0.1,
      roughness: 0.9,
      envMapIntensity: 0.3,
    });
  }, [mugColors]);

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
        <group position={[1.5, 0.2, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow material={handleMaterial}>
            <torusGeometry args={[0.8, 0.18, 24, 48, Math.PI * 0.8]} />
          </mesh>
          <mesh position={[0, 0.64, 0]} castShadow material={handleMaterial}>
            <sphereGeometry args={[0.22, 16, 16]} />
          </mesh>
          <mesh position={[0, -0.64, 0]} castShadow material={handleMaterial}>
            <sphereGeometry args={[0.22, 16, 16]} />
          </mesh>
        </group>
      )}

      {/* Base */}
      <mesh position={[0, -dimensions.height / 2 - 0.06, 0]} receiveShadow material={handleMaterial}>
        <cylinderGeometry args={[dimensions.baseRadius, dimensions.baseRadius, 0.12, dimensions.radialSegments]} />
      </mesh>

      {/* Anillo inferior */}
      <mesh position={[0, -dimensions.height / 2 + 0.1, 0]} material={handleMaterial}>
        <torusGeometry args={[dimensions.radius + 0.04, 0.06, 16, dimensions.radialSegments]} />
      </mesh>

      {/* Borde superior */}
      <mesh position={[0, dimensions.height / 2, 0]} material={handleMaterial}>
        <cylinderGeometry args={[dimensions.capRadius, dimensions.radius, 0.16, dimensions.radialSegments]} />
      </mesh>

      {/* Anillo superior */}
      <mesh position={[0, dimensions.height / 2 - 0.16, 0]} material={handleMaterial}>
        <torusGeometry args={[dimensions.radius + 0.04, 0.05, 16, dimensions.radialSegments]} />
      </mesh>

      {/* Interior visible - Acabado mate oscuro */}
      <mesh position={[0, dimensions.height / 2 - 0.04, 0]} rotation={[Math.PI, 0, 0]} material={interiorMaterial}>
        <cylinderGeometry args={[dimensions.capRadius - 0.1, dimensions.capRadius - 0.1, 0.08, dimensions.radialSegments]} />
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
  productType,
  mugColors
}: {
  modelPath: string;
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle';
  mugColors?: Mug3DColors;
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

        // Configuración básica para verificar que la textura se ve
        loadedTexture.rotation = 0;
        loadedTexture.repeat.set(1, 1);
        loadedTexture.offset.set(0, 0);

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

  // Aplicar textura, colores y mejorar materiales del modelo GLB
  useEffect(() => {
    if (!scene) return;

    console.log('[GLBModel] Applying texture, colors and enhancing materials', { mugColors });
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        if (mesh.material) {
          // Manejar array de materiales o material único
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

          const newMaterials = materials.map((oldMaterial) => {
            const newMaterial = new THREE.MeshPhysicalMaterial();

            // Copiar propiedades básicas si es un MeshStandardMaterial
            if (oldMaterial instanceof THREE.MeshStandardMaterial) {
              newMaterial.color.copy(oldMaterial.color);
              newMaterial.map = oldMaterial.map;
              newMaterial.metalness = oldMaterial.metalness;
              newMaterial.roughness = oldMaterial.roughness;
            }

            // Aplicar textura si está disponible
            if (texture) {
              newMaterial.map = texture;
            }

            // Mejorar propiedades físicas basadas en el nombre del mesh
            const meshName = mesh.name.toLowerCase();

            // Aplicar colores personalizados según el nombre del mesh
            if (mugColors) {
              if (meshName.includes('handle') || meshName.includes('asa')) {
                // Color del asa
                newMaterial.color.set(mugColors.handle);
                console.log('[GLBModel] Applied handle color to', mesh.name, mugColors.handle);
              } else if (meshName.includes('interior') || meshName.includes('inside') || meshName.includes('inner')) {
                // Color del interior
                newMaterial.color.set(mugColors.interior);
                console.log('[GLBModel] Applied interior color to', mesh.name, mugColors.interior);
              } else if (meshName.includes('body') || meshName.includes('cylinder') || meshName.includes('cup') || meshName.includes('mug')) {
                // Color del cuerpo - solo si no tiene textura
                if (!texture) {
                  newMaterial.color.set(mugColors.body);
                  console.log('[GLBModel] Applied body color to', mesh.name, mugColors.body);
                }
              }
            }

            if (meshName.includes('body') || meshName.includes('cylinder') || !meshName.includes('metal')) {
              // Material cerámico esmaltado ultra brillante
              newMaterial.metalness = 0.02;
              newMaterial.roughness = 0.08;
              newMaterial.clearcoat = 1.0;
              newMaterial.clearcoatRoughness = 0.05;
              newMaterial.envMapIntensity = 2.5;
              newMaterial.ior = 1.52;
              newMaterial.sheen = 0.3;
              newMaterial.sheenColor = new THREE.Color(0xffffff);
              newMaterial.specularIntensity = 1.0;
              newMaterial.specularColor = new THREE.Color(0xffffff);
            } else {
              // Material cromado espejado
              newMaterial.metalness = 0.98;
              newMaterial.roughness = 0.02;
              newMaterial.clearcoat = 0.8;
              newMaterial.clearcoatRoughness = 0.02;
              newMaterial.envMapIntensity = 3.0;
              newMaterial.ior = 2.5;
              newMaterial.reflectivity = 1.0;
            }

            return newMaterial;
          });

          // Asignar material(es) nuevo(s)
          mesh.material = Array.isArray(mesh.material) ? newMaterials : newMaterials[0];

          // Habilitar sombras
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });
  }, [scene, texture, mugColors]);

  // Auto-rotación
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Escalar según tipo - Aumentado para mejor visualización
  const scale = useMemo(() => {
    switch (productType) {
      case 'thermos': return 2.5;
      case 'bottle': return 2.0;
      case 'mug':
      default: return 4.0; // Aumentado significativamente para mejor visibilidad
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
  useGLB,
  productColor,
  mugColors
}: {
  modelPath: string;
  imageUrl?: string;
  productType: 'mug' | 'thermos' | 'bottle';
  useGLB: boolean;
  productColor?: string;
  mugColors?: Mug3DColors;
}) {
  const [error, setError] = useState(false);

  if (!useGLB || error) {
    console.log('[ModelWithFallback] Using procedural model');
    return <ProceduralMugModel imageUrl={imageUrl} productType={productType} productColor={productColor} mugColors={mugColors} />;
  }

  return (
    <ErrorBoundary fallback={<ProceduralMugModel imageUrl={imageUrl} productType={productType} mugColors={mugColors} />}>
      <Suspense fallback={<LoadingFallback />}>
        <GLBModel
          modelPath={modelPath}
          imageUrl={imageUrl}
          productType={productType}
          mugColors={mugColors}
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
  backgroundColor = '#f5f5f5',
  productColor = '#ffffff',
  autoRotate = false,
  mugColors
}: ThreeDMugPreviewProps) {
  console.log('[ThreeDMugPreview] Rendering with:', { imageUrl, productType, backgroundColor, productColor, autoRotate, mugColors });

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
        {/* Iluminación profesional de estudio */}
        <StudioLighting />

        {/* Modelo 3D con fallback automático */}
        <ModelWithFallback
          modelPath={modelPath}
          imageUrl={imageUrl}
          productType={productType}
          useGLB={useGLB}
          productColor={productColor}
          mugColors={mugColors}
        />

        {/* Sombras de contacto ultra suaves y realistas */}
        <ContactShadows
          position={[0, -2, 0]}
          opacity={0.5}
          scale={12}
          blur={3}
          far={4.5}
          resolution={512}
          color="#000000"
        />

        {/* Plano reflectante profesional tipo estudio */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]} receiveShadow>
          <planeGeometry args={[25, 25]} />
          <MeshReflectorMaterial
            blur={[400, 150]}
            resolution={1024}
            mixBlur={1.2}
            mixStrength={0.8}
            roughness={0.7}
            depthScale={1.5}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.6}
            color="#fafafa"
            metalness={0.15}
            mirror={0.5}
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
          autoRotate={autoRotate}
          autoRotateSpeed={2.0}
        />

        {/* Efectos de post-procesamiento cinematográficos */}
        <EffectComposer multisampling={16}>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.95}
            mipmapBlur={true}
            radius={0.8}
          />
          <ToneMapping
            mode={ToneMappingMode.ACES_FILMIC}
            resolution={256}
          />
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
