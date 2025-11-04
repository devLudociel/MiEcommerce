import { useEffect, useState, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

export default function CursorFollowMascot() {
  const [eyePosition, setEyePosition] = useState<Position>({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!mascotRef.current) return;

      const rect = mascotRef.current.getBoundingClientRect();
      const mascotCenterX = rect.left + rect.width / 2;
      const mascotCenterY = rect.top + rect.height / 2;

      // Calcular ángulo y distancia del cursor respecto a la mascota
      const deltaX = e.clientX - mascotCenterX;
      const deltaY = e.clientY - mascotCenterY;
      const angle = Math.atan2(deltaY, deltaX);

      // Limitar el movimiento de los ojos (max 8px de desplazamiento)
      const maxDistance = 8;
      const distance = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 30, maxDistance);

      const eyeX = Math.cos(angle) * distance;
      const eyeY = Math.sin(angle) * distance;

      setEyePosition({ x: eyeX, y: eyeY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Parpadeo aleatorio
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 3000 + Math.random() * 2000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(blinkInterval);
    };
  }, []);

  return (
    <div
      ref={mascotRef}
      className="fixed bottom-8 right-8 z-50 pointer-events-none select-none"
      style={{
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: 'float 3s ease-in-out infinite',
        }}
      >
        {/* Orejas */}
        <path
          d="M30 35 L20 15 L40 25 Z"
          fill="#FF6B9D"
          stroke="#FF4D8F"
          strokeWidth="2"
        />
        <path
          d="M90 35 L100 15 L80 25 Z"
          fill="#FF6B9D"
          stroke="#FF4D8F"
          strokeWidth="2"
        />

        {/* Cara */}
        <circle cx="60" cy="55" r="35" fill="#FFB3D9" stroke="#FF4D8F" strokeWidth="2" />

        {/* Ojos */}
        <g transform={`translate(${eyePosition.x}, ${eyePosition.y})`}>
          {isBlinking ? (
            <>
              {/* Ojos cerrados */}
              <path
                d="M 45 50 Q 50 53 55 50"
                stroke="#FF1493"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 65 50 Q 70 53 75 50"
                stroke="#FF1493"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              {/* Ojo izquierdo */}
              <circle cx="50" cy="50" r="8" fill="white" />
              <circle cx="52" cy="50" r="5" fill="#2D3748" />
              <circle cx="53" cy="48" r="2" fill="white" />

              {/* Ojo derecho */}
              <circle cx="70" cy="50" r="8" fill="white" />
              <circle cx="72" cy="50" r="5" fill="#2D3748" />
              <circle cx="73" cy="48" r="2" fill="white" />
            </>
          )}
        </g>

        {/* Nariz */}
        <path d="M 60 60 L 57 65 L 63 65 Z" fill="#FF1493" />

        {/* Boca */}
        <path
          d="M 60 65 Q 50 72 42 68"
          stroke="#FF1493"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 60 65 Q 70 72 78 68"
          stroke="#FF1493"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Bigotes */}
        <line x1="35" y1="55" x2="15" y2="50" stroke="#FF1493" strokeWidth="2" />
        <line x1="35" y1="58" x2="15" y2="60" stroke="#FF1493" strokeWidth="2" />
        <line x1="85" y1="55" x2="105" y2="50" stroke="#FF1493" strokeWidth="2" />
        <line x1="85" y1="58" x2="105" y2="60" stroke="#FF1493" strokeWidth="2" />

        {/* Mejillas sonrojadas */}
        <circle cx="38" cy="62" r="6" fill="#FF9EC4" opacity="0.5" />
        <circle cx="82" cy="62" r="6" fill="#FF9EC4" opacity="0.5" />

        {/* Cuerpo */}
        <ellipse cx="60" cy="95" rx="25" ry="20" fill="#FFB3D9" stroke="#FF4D8F" strokeWidth="2" />

        {/* Patas delanteras */}
        <rect x="48" y="105" width="8" height="12" rx="4" fill="#FF6B9D" />
        <rect x="64" y="105" width="8" height="12" rx="4" fill="#FF6B9D" />
      </svg>

      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>
    </div>
  );
}
