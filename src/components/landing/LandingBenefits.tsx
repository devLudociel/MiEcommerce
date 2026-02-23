// src/components/landing/LandingBenefits.tsx
import type { LandingBenefit } from '../../types/landing';
import Icon from '../ui/Icon';

interface LandingBenefitsProps {
  benefits: LandingBenefit[];
}

export default function LandingBenefits({ benefits }: LandingBenefitsProps) {
  if (!benefits || benefits.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
            Por que elegirnos
          </h2>
          <div className="w-20 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group p-6 md:p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-xl border border-transparent hover:border-gray-100 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300">
                <Icon name={benefit.icon} size={28} />
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-3">
                {benefit.title}
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
