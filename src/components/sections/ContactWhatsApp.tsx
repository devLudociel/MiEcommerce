// src/components/sections/ContactWhatsApp.tsx
// Sección de contacto: WhatsApp primario + newsletter secundario + info dirección/horarios
import { useState } from 'react';
import { logger } from '../../lib/logger';

export default function ContactWhatsApp() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const WHATSAPP_URL = 'https://wa.me/34645341452?text=Hola%2C%20me%20gustar%C3%ADa%20pedir%20m%C3%A1s%20informaci%C3%B3n%20sobre%20un%20producto.';

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Introduce un email válido');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setEmail('');
        logger.info('[ContactWhatsApp] Newsletter subscription', { email });
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Error al suscribirse. Inténtalo de nuevo.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('Error de conexión. Inténtalo más tarde.');
    }
  };

  return (
    <section style={{ backgroundColor: '#F5F0E8', padding: '5rem 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Tarjeta central */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 24,
          padding: 'clamp(2rem, 4vw, 3.5rem)',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '3rem',
          alignItems: 'start',
        }}
          className="contact-grid"
        >
          {/* Columna izquierda */}
          <div>
            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: '0.8rem',
            }}>
              ¿Tienes una idea pero no sabes cómo arrancar?
            </p>

            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
              fontWeight: 500,
              color: '#1A1A1A',
              lineHeight: 1.2,
              margin: '0 0 1rem',
            }}>
              Cuéntanosla por{' '}
              <em style={{ fontStyle: 'italic' }}>WhatsApp</em>.{' '}
              <br className="hidden md:block" />
              Te respondemos en menos de 1 hora.
            </h2>

            <p style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.92rem',
              color: '#666',
              lineHeight: 1.7,
              maxWidth: 520,
              marginBottom: '2rem',
            }}>
              Sin compromiso. Te asesoramos gratis sobre técnicas, materiales
              y plazos — como si vinieras a vernos al taller.
            </p>

            {/* CTA WhatsApp */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#25D366',
                color: '#fff',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: '0.9rem',
                padding: '14px 28px',
                borderRadius: 50,
                textDecoration: 'none',
                transition: 'background 0.2s, transform 0.15s',
                marginBottom: '2.5rem',
              }}
              onMouseEnter={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.backgroundColor = '#20ba5a'; a.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { const a = e.currentTarget as HTMLAnchorElement; a.style.backgroundColor = '#25D366'; a.style.transform = 'translateY(0)'; }}
            >
              {/* WhatsApp icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Escribir por WhatsApp
            </a>

            {/* Newsletter */}
            <div style={{
              borderTop: '1px solid #f0ebe3',
              paddingTop: '1.75rem',
            }}>
              <p style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#888',
                marginBottom: '0.8rem',
                letterSpacing: '0.04em',
              }}>
                O recibe novedades y ofertas en tu email:
              </p>

              {status === 'success' ? (
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.85rem',
                  color: '#22c55e',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  ¡Suscrito! Te avisamos de las novedades.
                </div>
              ) : (
                <form onSubmit={handleNewsletter} style={{ display: 'flex', gap: 8, maxWidth: 440 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={status === 'loading'}
                    style={{
                      flex: 1,
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '0.85rem',
                      padding: '11px 16px',
                      borderRadius: 50,
                      border: status === 'error' ? '1.5px solid #EC008C' : '1.5px solid #e0dbd3',
                      backgroundColor: '#faf8f5',
                      color: '#1A1A1A',
                      outline: 'none',
                    }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#00AEEF'; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = status === 'error' ? '#EC008C' : '#e0dbd3'; }}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      padding: '11px 22px',
                      borderRadius: 50,
                      border: 'none',
                      backgroundColor: '#1A1A1A',
                      color: '#fff',
                      cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      opacity: status === 'loading' ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { if (status !== 'loading') (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EC008C'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A'; }}
                  >
                    {status === 'loading' ? 'Enviando...' : 'Suscribirme'}
                  </button>
                </form>
              )}
              {status === 'error' && errorMsg && (
                <p style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.75rem',
                  color: '#EC008C',
                  marginTop: 6,
                }}>
                  {errorMsg}
                </p>
              )}
            </div>
          </div>

          {/* Columna derecha — info */}
          <div
            style={{
              backgroundColor: '#F5F0E8',
              borderRadius: 16,
              padding: '1.5rem',
              minWidth: 220,
              maxWidth: 280,
            }}
            className="contact-info-box"
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#EC008C',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#EC008C', display: 'inline-block' }} />
                Visítanos
              </p>
              <p style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.78rem',
                color: '#444',
                lineHeight: 1.7,
                margin: 0,
              }}>
                Los Llanos de Aridane<br />
                La Palma · Islas Canarias
              </p>
            </div>

            <div>
              <p style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#00AEEF',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#00AEEF', display: 'inline-block' }} />
                Horario
              </p>
              <p style={{
                fontFamily: "'Montserrat', monospace",
                fontSize: '0.74rem',
                color: '#444',
                lineHeight: 1.8,
                margin: 0,
              }}>
                L–V · 9:30–14:00 / 17:00–20:00<br />
                S · 10:00–14:00
              </p>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(26,26,26,0.08)' }}>
              <a
                href="mailto:hola@imprimearte.es"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#1A1A1A',
                  textDecoration: 'none',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                hola@imprimearte.es
              </a>
              <a
                href="https://www.instagram.com/imprimearte_lapalma"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#888',
                  textDecoration: 'none',
                }}
              >
                @imprimearte
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
          }
          .contact-info-box {
            max-width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
}
