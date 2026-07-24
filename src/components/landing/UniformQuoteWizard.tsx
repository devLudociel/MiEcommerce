import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  HardHat,
  Lightbulb,
  MapPin,
  Package2,
  Palette,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { trackLandingFormSubmit } from '../../lib/analytics/landingTracking';
import './UniformQuoteWizard.css';

type FormState = {
  project: string;
  quantity: string;
  island: string;
  deadline: string;
  design: string;
  name: string;
  phone: string;
  email: string;
  consent: boolean;
};

type Choice = {
  value: string;
  label: string;
  note: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

const LANDING_SLUG = 'uniformes-canarias';
const WHATSAPP_NUMBER = '34645341452';
const PRODUCT_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/ecommerce-ia-2ecf4.firebasestorage.app/o/products%2F1775415684674_0_poloPersonalizado.png?alt=media&token=890c17e2-41b7-40c6-811e-26a05d214fd5';

const initialForm: FormState = {
  project: '',
  quantity: '',
  island: '',
  deadline: '',
  design: '',
  name: '',
  phone: '',
  email: '',
  consent: false,
};

const projectChoices: Choice[] = [
  {
    value: 'Uniformes para empresa',
    label: 'Uniformes para empresa',
    note: 'Camisas, polos, delantales y ropa laboral',
    icon: BriefcaseBusiness,
  },
  {
    value: 'Camisetas para grupo o viaje',
    label: 'Grupo o viaje',
    note: 'Excursiones, asociaciones, equipos y celebraciones',
    icon: Users,
  },
  {
    value: 'Ropa laboral personalizada',
    label: 'Ropa laboral',
    note: 'Prendas resistentes con nombre o logotipo',
    icon: HardHat,
  },
  {
    value: 'Otro proyecto personalizado',
    label: 'Tengo otra idea',
    note: 'Cuéntanosla y te ayudamos a darle forma',
    icon: Sparkles,
  },
];

const quantityChoices: Choice[] = [
  { value: '5–10 prendas', label: '5–10', note: 'Un equipo pequeño', icon: Package2 },
  { value: '11–25 prendas', label: '11–25', note: 'Grupo o negocio', icon: Package2 },
  { value: '26–50 prendas', label: '26–50', note: 'Pedido mediano', icon: Package2 },
  {
    value: 'Más de 50 prendas',
    label: 'Más de 50',
    note: 'Gran grupo o plantilla',
    icon: Package2,
  },
];

const islandChoices: Choice[] = [
  'Tenerife',
  'Gran Canaria',
  'La Palma',
  'Lanzarote',
  'Fuerteventura',
  'La Gomera',
  'El Hierro',
  'La Graciosa',
].map((island) => ({
  value: island,
  label: island,
  note: '',
  icon: MapPin,
}));

const deadlineChoices: Choice[] = [
  { value: 'En 1–2 semanas', label: '1–2 semanas', note: 'Lo necesito pronto', icon: CalendarClock },
  { value: 'En 3–4 semanas', label: '3–4 semanas', note: 'Tengo algo de margen', icon: CalendarClock },
  { value: 'En 1–2 meses', label: '1–2 meses', note: 'Estoy organizándolo', icon: CalendarClock },
  { value: 'Todavía no lo sé', label: 'Sin fecha', note: 'Quiero orientarme primero', icon: Lightbulb },
];

const designChoices: Choice[] = [
  { value: 'Tengo el logo o diseño listo', label: 'Lo tengo listo', note: 'Ya dispongo del archivo', icon: CheckCircle2 },
  { value: 'Tengo una idea, pero necesito ayuda', label: 'Tengo una idea', note: 'Necesito ayuda para prepararla', icon: Palette },
  { value: 'Necesito ayuda desde cero', label: 'Desde cero', note: 'Quiero que me asesoren', icon: Sparkles },
];

function ChoiceGrid({
  choices,
  selected,
  onChoose,
  compact = false,
}: {
  choices: Choice[];
  selected: string;
  onChoose: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`uq-choice-grid ${compact ? 'uq-choice-grid--compact' : ''}`}>
      {choices.map((choice) => {
        const Icon = choice.icon;

        return (
          <button
            className={`uq-choice-card ${selected === choice.value ? 'is-selected' : ''}`}
            key={choice.value}
            onClick={() => onChoose(choice.value)}
            type="button"
          >
            <span className="uq-choice-icon" aria-hidden="true">
              <Icon size={21} strokeWidth={1.8} />
            </span>
            <span>
              <strong>{choice.label}</strong>
              {choice.note && <small>{choice.note}</small>}
            </span>
            <span className="uq-choice-check" aria-hidden="true">
              <Check size={13} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function UniformQuoteWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [complete, setComplete] = useState(false);

  const questions = useMemo(
    () => [
      {
        eyebrow: 'Empezamos por lo importante',
        title: '¿Qué quieres personalizar?',
        helper: 'Elige la opción que más se parezca a tu idea.',
        field: 'project' as const,
        choices: projectChoices,
      },
      {
        eyebrow: 'Así calculamos mejor',
        title: '¿Cuántas prendas necesitas?',
        helper: 'Una estimación es suficiente por ahora.',
        field: 'quantity' as const,
        choices: quantityChoices,
      },
      {
        eyebrow: 'Llegamos a toda Canarias',
        title: '¿En qué isla lo recibirás?',
        helper: 'Prepararemos el presupuesto teniendo en cuenta la entrega.',
        field: 'island' as const,
        choices: islandChoices,
      },
      {
        eyebrow: 'Organizamos los tiempos',
        title: '¿Para cuándo lo necesitas?',
        helper: 'Si aún no tienes fecha, también podemos orientarte.',
        field: 'deadline' as const,
        choices: deadlineChoices,
      },
      {
        eyebrow: 'Último detalle creativo',
        title: '¿Cómo llevas el diseño?',
        helper: 'No pasa nada si todavía es solo una idea.',
        field: 'design' as const,
        choices: designChoices,
      },
    ],
    []
  );

  const progress = complete ? 100 : ((step + 1) / 6) * 100;

  const choose = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    window.setTimeout(() => setStep((current) => Math.min(current + 1, 5)), 180);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.consent) return;

    trackLandingFormSubmit(LANDING_SLUG, {
      project_type: form.project,
      quantity_range: form.quantity,
      island: form.island,
      deadline: form.deadline,
      design_status: form.design,
    });

    const message = [
      '¡Hola ImprimeArte! 👋 He completado el formulario de presupuesto.',
      '',
      `👕 Proyecto: ${form.project}`,
      `🔢 Cantidad: ${form.quantity}`,
      `🏝️ Isla: ${form.island}`,
      `📅 Plazo: ${form.deadline}`,
      `🎨 Diseño: ${form.design}`,
      '',
      `👤 Nombre: ${form.name}`,
      `📞 Teléfono: ${form.phone}`,
      form.email ? `✉️ Email: ${form.email}` : '',
      '',
      '¿Podrían ayudarme con un presupuesto?',
    ]
      .filter(Boolean)
      .join('\n');

    setComplete(true);
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const reset = () => {
    setForm(initialForm);
    setStep(0);
    setComplete(false);
  };

  return (
    <div className="uq-page">
      <section className="uq-grid">
        <aside className="uq-hero">
          <div>
            <span className="uq-pill">Presupuesto sin compromiso</span>
            <h1>
              Vuestra idea.
              <br />
              <em>Vuestro uniforme.</em>
            </h1>
            <p className="uq-hero-copy">
              Camisas, polos y camisetas personalizadas para empresas, equipos,
              asociaciones y grupos de viaje de todas las Islas Canarias.
            </p>
          </div>

          <div className="uq-product">
            <div className="uq-product-halo" />
            <img src={PRODUCT_IMAGE} alt="Polo personalizado de ImprimeArte" />
            <span className="uq-product-tag uq-product-tag--one">Tu logo</span>
            <span className="uq-product-tag uq-product-tag--two">Tu equipo</span>
            <span className="uq-product-tag uq-product-tag--three">Tu estilo</span>
          </div>

          <div className="uq-trust" aria-label="Ventajas de ImprimeArte">
            <span>
              <b>+1.200</b> pedidos
            </span>
            <span>
              <b>
                4,9 <Star size={14} fill="currentColor" />
              </b>{' '}
              en Google
            </span>
            <span>
              <b>8 islas</b> con envío
            </span>
          </div>
        </aside>

        <section className="uq-form-panel" aria-live="polite">
          <div className="uq-progress-wrap">
            <div className="uq-progress-label">
              <span>{complete ? '¡Solicitud preparada!' : `Paso ${step + 1} de 6`}</span>
              <strong>{Math.round(progress)}%</strong>
            </div>
            <div className="uq-progress-track">
              <div className="uq-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {complete ? (
            <div className="uq-complete">
              <div className="uq-complete-icon">
                <Check size={36} strokeWidth={2.5} />
              </div>
              <span className="uq-eyebrow">Todo listo</span>
              <h2>Tu solicitud se ha preparado en WhatsApp.</h2>
              <p>
                Solo tienes que pulsar “Enviar” en la conversación. Te responderemos con
                los siguientes pasos para preparar el presupuesto.
              </p>
              <a
                className="uq-primary"
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir WhatsApp
              </a>
              <button className="uq-text-button" type="button" onClick={reset}>
                Preparar otra solicitud
              </button>
            </div>
          ) : step < 5 ? (
            <div className="uq-question" key={step}>
              <span className="uq-eyebrow">{questions[step].eyebrow}</span>
              <h2>{questions[step].title}</h2>
              <p>{questions[step].helper}</p>
              <ChoiceGrid
                choices={questions[step].choices}
                selected={form[questions[step].field]}
                onChoose={(value) => choose(questions[step].field, value)}
                compact={step === 2}
              />
              {step > 0 && (
                <button className="uq-back" type="button" onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={15} /> Volver
                </button>
              )}
            </div>
          ) : (
            <form className="uq-question uq-contact" onSubmit={submit}>
              <span className="uq-eyebrow">Ya casi está</span>
              <h2>¿Dónde te enviamos el presupuesto?</h2>
              <p>Estos datos solo se usarán para responder a tu solicitud.</p>

              <label>
                <span>Tu nombre</span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Por ejemplo, María"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>

              <div className="uq-field-row">
                <label>
                  <span>Teléfono o WhatsApp</span>
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="600 000 000"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </label>
                <label>
                  <span>
                    Email <small>(opcional)</small>
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </label>
              </div>

              <label className="uq-consent">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(event) => setForm({ ...form, consent: event.target.checked })}
                />
                <span>
                  Acepto que ImprimeArte use estos datos para responder a mi solicitud,
                  según su{' '}
                  <a href="/politica-privacidad" target="_blank" rel="noreferrer">
                    política de privacidad
                  </a>
                  .
                </span>
              </label>

              <button className="uq-primary" type="submit">
                Preparar mi solicitud en WhatsApp
                <ArrowRight size={17} />
              </button>
              <button className="uq-back" type="button" onClick={() => setStep(4)}>
                <ArrowLeft size={15} /> Volver
              </button>
            </form>
          )}

          <div className="uq-form-footer">
            <span>
              <ShieldCheck size={14} /> Tus datos están protegidos
            </span>
            <span>Respuesta habitual en menos de 1 hora</span>
          </div>
        </section>
      </section>
    </div>
  );
}
