import React, { useState } from 'react';
import { ServiceItem, ServiceCategory } from '../types';
import { Clock, Check, Award, Heart, ArrowRight, Shield } from 'lucide-react';

interface ServiceCatalogProps {
  services: ServiceItem[];
  exchangeRate: number;
  onSelectServiceForBooking: (service: ServiceItem) => void;
  customCategories?: { id: string; label: string }[];
  studioSubtitle?: string;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  services,
  exchangeRate,
  onSelectServiceForBooking,
  customCategories,
  studioSubtitle,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = customCategories || [
    { id: 'all', label: 'Todos los Servicios' },
    { id: 'natural', label: 'Uña Natural & Salud' },
    { id: 'extensions', label: 'Extensiones & Esculpido' },
    { id: 'pedicure', label: 'Pedicure & Spa' },
  ];

  const filteredServices = services.filter((service) => {
    // Borradores de la carta inicial por oficio (G-065): ocultos y sin precio hasta que la dueña los publique.
    if (!service.isAvailable && !(Number(service.priceUSD) > 0)) return false;
    const matchesCategory =
      selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="catalogo" className="py-16 sm:py-20 bg-warm-50 border-t border-sage-200/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold tracking-[0.2em] text-sage-700 uppercase font-sans">
            Catálogo Oficial de Servicios
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-warm-900 font-bold">
            Encuentra tu estilo ideal
          </h2>
          <div className="w-16 h-0.5 bg-sage-400 mx-auto"></div>
          <p className="text-sm sm:text-base text-warm-900 font-normal">
            {studioSubtitle || 'Cada cliente tiene necesidades distintas, así que te ofrezco distintas opciones para que elijamos juntas la técnica perfecta para ti:'}
          </p>
        </div>

        {/* Category Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white rounded-2xl border border-sage-200 shadow-sm">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-sage-800 text-white shadow-sm'
                    : 'text-warm-900 hover:text-sage-800 hover:bg-sage-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Buscar servicio o técnica..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-sage-200 bg-white focus:outline-none focus:ring-2 focus:ring-sage-400/40 focus:border-sage-500 transition-all placeholder:text-sage-500 text-warm-900 font-medium"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service) => {
            const priceVES = service.priceUSD * exchangeRate;

            return (
              <div
                key={service.id}
                id={`service-${service.id}`}
                className="group bg-white rounded-3xl border border-sage-200/80 overflow-hidden shadow-soft hover:shadow-luxury transition-all duration-300 flex flex-col justify-between scroll-mt-24"
              >
                <div>
                  {/* Service Image */}
                  <div className="relative aspect-[16/11] overflow-hidden bg-sage-100">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    
                    {/* Floating Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
                      {service.badgeText ? (
                        <span className={`px-3 py-1 text-white text-[11px] font-bold tracking-wider uppercase rounded-full shadow-md flex items-center gap-1.5 ${service.badgeColor || 'bg-sage-800'}`}>
                          <Award className="w-3 h-3 text-amber-300" strokeWidth={1.5} />
                          <span>{service.badgeText}</span>
                        </span>
                      ) : service.isPopular ? (
                        <span className="px-3 py-1 bg-sage-800 text-white text-[11px] font-bold tracking-wider uppercase rounded-full shadow-md flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-300" strokeWidth={1.5} />
                          <span>Recomendado</span>
                        </span>
                      ) : null}
                      <span className="px-3 py-1 bg-black/65 backdrop-blur-md text-white text-[11px] font-bold rounded-full shadow-sm flex items-center gap-1 border border-white/20">
                        <Clock className="w-3 h-3 text-amber-300" />
                        <span>{service.durationMinutes} min</span>
                      </span>
                    </div>

                    {/* Pricing Pill */}
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-soft border border-sage-200 text-right z-10">
                      <span className="text-[10px] text-sage-700 font-bold block uppercase tracking-wider">
                        Precio
                      </span>
                      <span className="font-serif text-xl font-bold text-sage-900">
                        ${service.priceUSD.toFixed(2)} USD
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-serif text-2xl font-bold text-warm-900 group-hover:text-sage-800 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-sage-800 font-semibold italic">
                        {service.shortDescription}
                      </p>
                    </div>

                    <p className="text-sm text-warm-900 font-normal leading-relaxed">
                      {service.fullDescription}
                    </p>

                    {/* "Ideal para" feature callout */}
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/70 text-xs text-warm-900">
                      <span className="font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>Recomendado para:</span>
                      </span>
                      <span className="text-warm-900 leading-relaxed font-medium">{service.idealFor}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {service.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-sage-100 text-sage-900 text-[11px] font-semibold rounded-lg border border-sage-200/80"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => onSelectServiceForBooking(service)}
                    disabled={!service.isAvailable}
                    className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      service.isAvailable
                        ? 'bg-sage-800 hover:bg-sage-900 text-white shadow-soft hover:shadow-luxury transform active:scale-98'
                        : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{service.isAvailable ? 'Seleccionar y Agendar Cita' : 'No disponible temporalmente'}</span>
                    {service.isAvailable && <ArrowRight className="w-4 h-4 text-amber-300" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
