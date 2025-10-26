interface MockupPreviewProps {
  imageUrl: string;
  mockupType: 'shirt-black' | 'shirt-white' | 'hoodie' | 'mug' | 'canvas' | 'cap';
  mockupName: string;
}

// URLs de los mockups en Firebase
const MOCKUP_IMAGES = {
  'shirt-black':
    'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/mockups%2Fshirt-black.png?alt=media&token=4ca44117-4c33-4824-8970-5548ea8a6e28',
  'shirt-white':
    'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/mockups%2Fshirt-white.png?alt=media&token=7ce932a5-a8d8-4990-8cb3-e8624f02d641',
  hoodie:
    'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/mockups%2Fhoodie.png?alt=media&token=656e2b56-8805-4aab-89c2-4868c1de0e2f',
  mug: 'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/mockups%2Fmug.png?alt=media&token=e338d6aa-34e1-4ffe-9fdc-7603df90030a',
  canvas:
    'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/mockups%2Fcanvas.png?alt=media&token=6ad4015d-cfb9-404d-a3b4-c7d62768c484',
  cap: 'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/mockups%2Fcap.png?alt=media&token=1ef31e3a-de4c-4159-9904-669abdb9f71e',
};

export default function MockupPreview({ imageUrl, mockupType, mockupName }: MockupPreviewProps) {
  const mockupImageUrl = MOCKUP_IMAGES[mockupType];

  const getPositioning = () => {
    switch (mockupType) {
      case 'shirt-black':
        return { x: '40%', y: '35%', width: '20%', height: '30%' };
      case 'shirt-white':
        return { x: '35%', y: '32%', width: '35%', height: '35%' };
      case 'hoodie':
        return { x: '32%', y: '30%', width: '40%', height: '40%' };
      case 'mug':
        return { x: '30%', y: '35%', width: '40%', height: '40%' };
      case 'canvas':
        return { x: '28%', y: '20%', width: '50%', height: '60%' };
      case 'cap':
        return { x: '37%', y: '25%', width: '30%', height: '35%' };
      default:
        return { x: '25%', y: '25%', width: '50%', height: '50%' };
    }
  };

  const positioning = getPositioning();

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{
          position: 'relative',
          width: '240px',
          height: '240px',
          backgroundImage: `url(${mockupImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Contenedor fijo para la imagen */}
        <div
          style={{
            position: 'absolute',
            left: positioning.x,
            top: positioning.y,
            width: positioning.width,
            height: positioning.height,
            overflow: 'hidden',
            borderRadius: '2px',
          }}
        >
          {/* Imagen que se ajusta al contenedor */}
          <img
            src={imageUrl}
            alt={mockupName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
            }}
          />
        </div>
      </div>
      <p className="text-xs font-medium text-gray-700">{mockupName}</p>
    </div>
  );
}
