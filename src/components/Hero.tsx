import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Award, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { InstagramIcon } from './Icons';
import { GallerySlide } from '../types';
import { AppStore } from '../services/store';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectServiceById?: (serviceId: string) => void;
  gallerySlides?: GallerySlide[];
}

interface NailDesignSlide {
  id: string;
  name: string;
  technique: string;
  imageUrl: string;
  tag: string;
}

const NAIL_DESIGN_SLIDES: NailDesignSlide[] = [
  {
    id: 'semipermanente',
    name: 'Esmaltado Semipermanente',
    technique: 'Rosa Glaseado & Cutícula Rusa',
    imageUrl: '/images/esmaltado-semipermanente.png',
    tag: 'Brillo hasta 3 semanas'
  },
  {
    id: 'base-rubber',
    name: 'Nivelación de Base Rubber',
    technique: 'Cherry Deep & Ápice Armónico',
    imageUrl: '/images/base-rubber.png',
    tag: 'Refuerzo para uña natural'
  },
  {
    id: 'jelly-tips',
    name: 'Extensiones Jelly Tips',
    technique: 'Red Waves & Simetría Perfecta',
    imageUrl: '/images/jelly-tips.jpg',
    tag: 'Longitud inmediata en gel'
  },
  {
    id: 'polygel-extensions',
    name: 'Extensiones en Polygel',
    technique: 'Nude Esculpido a Medida',
    imageUrl: '/images/polygel-extensions.png',
    tag: 'Máxima resistencia y durabilidad'
  },
  {
    id: 'polygel-capping',
    name: 'Capping de Polygel',
    technique: 'Milky Soft Natural',
    imageUrl: '/images/polygel-capping.png',
    tag: 'Protección sin extensiones'
  },
  {
    id: 'pedicure',
    name: 'Pedicure Spa Integral',
    technique: 'Limpieza, Exfoliación & Masaje',
    imageUrl: '/images/pedicure-spa.jpg',
    tag: 'Cuidado y relajación total'
  },
];

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, gallerySlides }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use dynamic gallery slides passed from store/DB, fallback to local
  const slides = (gallerySlides && gallerySlides.length > 0) 
    ? gallerySlides 
    : AppStore.getGallery();

  const totalSlides = slides.length || 1;
  const currentSlide = slides[currentSlideIndex % totalSlides] || slides[0] || NAIL_DESIGN_SLIDES[0];

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, totalSlides]);

  const handlePrev = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  return (
    <section className="relative overflow-hidden pt-4 sm:pt-8 pb-14 lg:py-16 bg-gradient-to-b from-sage-50/70 via-warm-100 to-warm-100">
      {/* Soft botanical green background accents */}
      <div className="absolute top-0 right-0 -mr-28 -mt-24 w-[420px] h-[420px] rounded-full bg-sage-200/45 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-28 -mb-28 w-[380px] h-[380px] rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Andrea's Presentation with Photo immediately visible */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Andrea's Header Profile Card (Visible on mobile & desktop) */}
            <div className="flex items-center gap-4 p-3 sm:p-4 rounded-3xl bg-white border border-sage-200 shadow-soft">
              <div className="relative flex-shrink-0">
                <img
                  src="/images/andrea-labrador-hero.png"
                  alt="Andrea Labrador Manicurista Profesional"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover object-top border-2 border-sage-400 shadow-sm"
                />
                <span className="absolute -bottom-1.5 -right-1.5 p-1 bg-sage-700 text-white rounded-full shadow-sm" title="7 Años de Experiencia">
                  <Award className="w-3.5 h-3.5 text-amber-300" />
                </span>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sage-100 text-[10px] sm:text-xs font-bold text-sage-800 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-sage-600" />
                  <span>7 Años de Experiencia</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-warm-900 leading-none">
                  Andrea Labrador
                </h2>
                <p className="text-xs sm:text-sm text-sage-700 font-semibold">
                  Técnico Especialista en Uñas &bull; Cordero &amp; San Cristóbal, Táchira
                </p>
              </div>
            </div>

            {/* Slogan from PDF */}
            <div className="space-y-2">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-warm-900 font-bold leading-tight">
                Belleza, Estilo & <br />
                <span className="italic font-normal text-sage-700 underline decoration-sage-400/50 decoration-wavy decoration-1 underline-offset-8">
                  Manos que hablan
                </span>
              </h1>
            </div>

            {/* Literal Copy from PDF Page 2 */}
            <div className="space-y-3 text-sm sm:text-base text-warm-900 leading-relaxed font-normal">
              <p>
                ¡Hola! Soy <strong>Andrea</strong>, técnico especialista en el cuidado y embellecimiento de tus uñas con <strong>7 años de experiencia</strong> en este rubro.
              </p>
              <div className="p-4 rounded-2xl bg-sage-50/90 border-l-4 border-sage-600 border-y border-r border-sage-200/80 space-y-1.5">
                <p className="font-serif italic text-base sm:text-lg text-sage-900 font-medium leading-snug">
                  &ldquo;Mi pasión es resaltar la belleza de tus manos y pies, priorizando siempre la salud de tu uña natural.&rdquo;
                </p>
                <p className="text-xs sm:text-sm text-warm-800">
                  Me mantengo en constante actualización para ofrecerte siempre las mejores técnicas y productos del mercado, garantizando resultados impecables, duraderos y totalmente personalizados.
                </p>
              </div>
            </div>

            {/* Main Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenBooking}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-sage-800 hover:bg-sage-900 text-white text-sm font-bold rounded-full shadow-luxury hover:shadow-soft transition-all transform active:scale-95"
              >
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Agendar Cita</span>
              </button>

              <a
                href="#catalogo"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-sage-50 text-sage-900 text-sm font-bold rounded-full border border-sage-300 shadow-sm transition-all"
              >
                <span>Ver Servicios & Precios</span>
                <ArrowRight className="w-4 h-4 text-sage-600" />
              </a>
            </div>

          </div>

          {/* Right Column: PURE NAIL ART LOOKBOOK (Only Designs, No Internal Booking Buttons) */}
          <div className="lg:col-span-5 space-y-4">
            <div 
              className="relative mx-auto max-w-md select-none"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              {/* Outer decorative card frame */}
              <div className="relative bg-white p-3 sm:p-4 rounded-3xl shadow-luxury border border-sage-200">
                
                {/* Visual Label */}
                <div className="flex items-center justify-between px-1 pb-2.5 text-xs">
                  <span className="font-bold uppercase tracking-wider text-sage-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Diseños & Técnicas Reales
                  </span>
                  <span className="text-[11px] font-semibold text-warm-600">
                    {currentSlideIndex + 1} de {totalSlides}
                  </span>
                </div>

                {/* Pure Image Showcase */}
                <div className="overflow-hidden rounded-2xl aspect-[4/5] relative bg-sage-950 group">
                  <img
                    key={currentSlide.id}
                    src={currentSlide.imageUrl}
                    alt={currentSlide.name}
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-all duration-700"
                    loading="eager"
                  />

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Tag */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-3 py-1 bg-sage-800/90 backdrop-blur-md text-white text-[11px] font-bold rounded-full shadow-md">
                      {currentSlide.tag || 'Diseño Real'}
                    </span>
                  </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-sage-900 flex items-center justify-center shadow-lg transition-all active:scale-95 z-20"
                    title="Anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-sage-900 flex items-center justify-center shadow-lg transition-all active:scale-95 z-20"
                    title="Siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Minimal Bottom Overlay: Strictly Service Name */}
                  <div className="absolute bottom-3 inset-x-3 bg-black/65 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-white z-10">
                    <h3 className="font-serif text-lg font-bold leading-tight">
                      {currentSlide.name}
                    </h3>
                  </div>

                </div>

                {/* Dots indicator */}
                <div className="flex items-center justify-center gap-1.5 pt-3">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-1.5 rounded-full transition-all ${
                        currentSlideIndex === idx
                          ? 'w-6 bg-sage-700'
                          : 'w-2 bg-sage-200 hover:bg-sage-400'
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

              </div>
            </div>

            {/* PROMINENT SOCIAL MEDIA BAR DIRECTLY BELOW CAROUSEL */}
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
              <a
                href="https://wa.me/584241360937"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-soft transition-all transform active:scale-98"
                title="Escríbeme por WhatsApp"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">0424-1360937</span>
              </a>

              <a
                href="https://instagram.com/andrealabradorl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-soft transition-all transform active:scale-98"
                title="Sígueme en Instagram"
              >
                <InstagramIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">@andrealabradorl</span>
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
