// src/components/landing/LandingProcess.tsx
import type { LandingProcessSection } from '../../types/landing';

interface LandingProcessProps {
  data: LandingProcessSection;
}

export default function LandingProcess({ data }: LandingProcessProps) {
  if (!data || !data.steps || data.steps.length === 0) return null;

  return (
    <section id="proceso" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-500 font-semibold mb-3">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-3xl md:text-4xl font-black text-gray-900">
            {data.title}
          </h2>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute left-0 right-0 top-6 h-px bg-fuchsia-200" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {data.steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative z-10 mx-auto mb-4 w-12 h-12 rounded-full border-2 border-fuchsia-500 text-fuchsia-600 flex items-center justify-center font-bold bg-white">
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
