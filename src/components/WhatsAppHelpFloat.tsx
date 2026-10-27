import React from 'react';
import { MessageCircle } from 'lucide-react';

interface WhatsAppHelpFloatProps {
  phone?: string;
  message?: string;
  className?: string;
}

export const WhatsAppHelpFloat: React.FC<WhatsAppHelpFloatProps> = ({
  phone = '584223794800',
  message = 'Hola, quiero más información sobre VANESEV para mi salón de belleza.',
  className = '',
}) => {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hablar con asesor por WhatsApp"
      className={`fixed bottom-5 left-5 z-40 w-13 h-13 rounded-full bg-v-surface border border-v-line text-v-brand hover:bg-v-brand hover:text-white shadow-luxury flex items-center justify-center transition-all hover:scale-105 active:scale-95 group ${className}`}
    >
      <MessageCircle className="w-6 h-6 stroke-[2] transition-colors" />
    </a>
  );
};
