import React, { useState, useRef, useEffect } from 'react';
import { QREncoder } from '../utils/qrEncoder';
import { SalonThemeConfig, getPaletteById } from '../utils/salonThemeEngine';
import { 
  Printer, 
  Download, 
  Smartphone, 
HelpCircle, 
  Check, 
  Copy, 
  ExternalLink,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

interface SalonLaunchKitProps {
  tenantSlug: string;
  salonTheme: SalonThemeConfig;
  activeQrCode?: string; // /r/<codigo> o vacio
}

export const SalonLaunchKit: React.FC<SalonLaunchKitProps> = ({
  tenantSlug,
  salonTheme,
  activeQrCode,
}) => {
  const palette = getPaletteById(salonTheme.paletteId);
  const targetUrl = activeQrCode
    ? `https://vanesev.com/r/${activeQrCode}`
    : `https://vanesev.com/${tenantSlug}`;

  const salonNombre = salonTheme.businessName || salonTheme.salonName || 'Capra Studio';
  const salonEslogan = salonTheme.tagline || 'Beauty Atelier & Academy';

  // SVG QR data string
  const qrSvg = React.useMemo(() => {
    return QREncoder.generateSvgString(targetUrl, {
      fgColor: palette.primary || '#7A3E4A',
      bgColor: '#FFFFFF',
      margin: 1,
      centerText: tenantSlug === 'capra-studio' ? 'CS' : 'V',
    });
  }, [targetUrl, palette.primary, tenantSlug]);

  // Canvases para Historia y Post
  const storyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const postCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadingStory, setDownloadingStory] = useState(false);
  const [downloadingPost, setDownloadingPost] = useState(false);

  // Renderizar canvas de Instagram Historia (1080x1920)
  const drawStory = () => {
    const canvas = storyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1080;
    const h = 1920;
    canvas.width = w;
    canvas.height = h;

    // Fondo degradado editorial
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2D1B20');
    grad.addColorStop(0.5, '#3B2228');
    grad.addColorStop(1, '#1A0E12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Detalles sutiles dorados
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 3;
    ctx.strokeRect(60, 60, w - 120, h - 120);

    // Encabezado
    ctx.fillStyle = '#C5A059';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESTUDIO BOUTIQUE & ALTA ESTÉTICA', w / 2, 220);

    // Nombre del salón
    ctx.fillStyle = '#F6ECEC';
    ctx.font = 'bold 74px serif';
    ctx.fillText(salonNombre, w / 2, 330);

    // Eslogan
    ctx.fillStyle = '#EEDCDC';
    ctx.font = '34px sans-serif';
    ctx.fillText(salonEslogan, w / 2, 410);

    // Tarjeta central blanca contenedora del QR
    const cardW = 720;
    const cardH = 820;
    const cardX = (w - cardW) / 2;
    const cardY = 540;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 36);
    ctx.fill();

    // Dibujar QR dentro de la tarjeta
    const qrMatrix = QREncoder.encode(targetUrl, 'M');
    const qrPixelSize = 14;
    const qrTotalPx = qrMatrix.size * qrPixelSize;
    const qrX = cardX + (cardW - qrTotalPx) / 2;
    const qrY = cardY + 70;

    ctx.fillStyle = palette.primary || '#7A3E4A';
    for (let r = 0; r < qrMatrix.size; r++) {
      for (let c = 0; c < qrMatrix.size; c++) {
        if (qrMatrix.data[r][c]) {
          ctx.fillRect(qrX + c * qrPixelSize, qrY + r * qrPixelSize, qrPixelSize, qrPixelSize);
        }
      }
    }

    // Texto bajo el QR en tarjeta
    ctx.fillStyle = '#3B2228';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Escanea con tu cámara', w / 2, cardY + cardH - 120);

    ctx.fillStyle = '#6B4A52';
    ctx.font = '26px sans-serif';
    ctx.fillText('Consulta la carta de servicios y agenda tu cita en 15 segundos', w / 2, cardY + cardH - 65);

    // Llamada a la acción inferior
    ctx.fillStyle = '#F6ECEC';
    ctx.font = 'bold 36px serif';
    ctx.fillText('Reserva confirmada al instante en WhatsApp', w / 2, 1520);

    ctx.fillStyle = '#C5A059';
    ctx.font = '30px sans-serif';
    ctx.fillText(targetUrl.replace('https://', ''), w / 2, 1600);

    // Ciudad y atención
    ctx.fillStyle = '#8A6A2E';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(salonTheme.addressLine || 'San Cristóbal, Táchira', w / 2, 1750);
  };

  // Renderizar canvas de Instagram Post (1080x1080)
  const drawPost = () => {
    const canvas = postCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 1080;
    canvas.width = size;
    canvas.height = size;

    // Fondo cálido velvet
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#F6ECEC');
    grad.addColorStop(1, '#EEDCDC');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Marco exterior fino
    ctx.strokeStyle = '#E4CFD3';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, size - 80, size - 80);

    // Cabecera post
    ctx.fillStyle = '#7A3E4A';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NUEVA CARTA DIGITAL & RESERVAS', size / 2, 120);

    ctx.fillStyle = '#3B2228';
    ctx.font = 'bold 56px serif';
    ctx.fillText(salonNombre, size / 2, 200);

    ctx.fillStyle = '#6B4A52';
    ctx.font = '24px sans-serif';
    ctx.fillText(salonEslogan, size / 2, 250);

    // Contenedor blanco del QR
    const cardSize = 520;
    const cardX = (size - cardSize) / 2;
    const cardY = 310;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardSize, cardSize, 28);
    ctx.fill();
    ctx.strokeStyle = '#E4CFD3';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dibujar QR
    const qrMatrix = QREncoder.encode(targetUrl, 'M');
    const qrPixelSize = 10;
    const qrTotalPx = qrMatrix.size * qrPixelSize;
    const qrX = cardX + (cardSize - qrTotalPx) / 2;
    const qrY = cardY + (cardSize - qrTotalPx) / 2;

    ctx.fillStyle = '#7A3E4A';
    for (let r = 0; r < qrMatrix.size; r++) {
      for (let c = 0; c < qrMatrix.size; c++) {
        if (qrMatrix.data[r][c]) {
          ctx.fillRect(qrX + c * qrPixelSize, qrY + r * qrPixelSize, qrPixelSize, qrPixelSize);
        }
      }
    }

    // Pie de post
    ctx.fillStyle = '#3B2228';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('Escanea con tu móvil para elegir tu tratamiento', size / 2, 910);

    ctx.fillStyle = '#8A6A2E';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(targetUrl.replace('https://', ''), size / 2, 970);
  };

  useEffect(() => {
    drawStory();
    drawPost();
  }, [targetUrl, salonNombre, salonEslogan, palette.primary]);

  const descargarStory = () => {
    const canvas = storyCanvasRef.current;
    if (!canvas) return;
    setDownloadingStory(true);
    const link = document.createElement('a');
    link.download = `Historia-Instagram-${tenantSlug}-1080x1920.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => setDownloadingStory(false), 1500);
  };

  const descargarPost = () => {
    const canvas = postCanvasRef.current;
    if (!canvas) return;
    setDownloadingPost(true);
    const link = document.createElement('a');
    link.download = `Post-Instagram-${tenantSlug}-1080x1080.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setTimeout(() => setDownloadingPost(false), 1500);
  };

  const imprimirKit = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Guía corta de sección */}
      <div className="p-4 rounded-2xl bg-[#FBFAFC] border border-[#24152B]/10 flex items-start gap-3.5 print:hidden">
        <div className="p-2 rounded-xl bg-[#5B2A6E]/10 text-[#5B2A6E] shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#6E6478] leading-relaxed">
          <p className="font-bold text-[#24152B] text-sm mb-0.5">Kit de Lanzamiento & Cartelería Oficial</p>
          <p>
            Genera automáticamente las piezas físicas para recepción, espejos de tocador y tarjetas de visita,
            además de las creatividades digitales en alta resolución (1080 px) para historias y publicaciones de Instagram.
            Todo alineado con los colores oficiales de tu salón y tu código QR activo.
          </p>
        </div>
      </div>

      {/* Barra de acciones print & download */}
      <div className="p-4 rounded-2xl bg-white border border-[#24152B]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-xs font-bold text-[#24152B] block">Piezas Listas para Producción</span>
          <span className="text-[11px] text-[#6E6478]">
            Destino configurado: <strong className="text-[#5B2A6E] font-mono">{targetUrl}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={imprimirKit}
            className="px-4 py-2 rounded-full bg-[#5B2A6E] hover:bg-[#4A2159] text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Piezas Físicas (A5, Tarjeta, Pegatina)</span>
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 1: PIEZAS FÍSICAS IMPRIMIBLES (@media print) ── */}
      <div id="salon-kit-printable" className="space-y-8">

        {/* PIEZA 1: Cartel A5 Recepción o Espejo (148 x 210 mm) */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#F6ECEC] border-2 border-[#E4CFD3] max-w-lg mx-auto shadow-md print:shadow-none print:border-none print:m-0 print:p-8 print:w-full print:max-w-none print-page-break">
          <div className="border border-[#7A3E4A]/30 p-6 sm:p-8 rounded-2xl bg-white text-center space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#8A6A2E]">
                CARTA DIGITAL & RESERVA DIRECTA
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#3B2228]">
                {salonNombre}
              </h2>
              <p className="text-xs text-[#6B4A52] max-w-xs mx-auto">
                {salonEslogan}
              </p>
            </div>

            {/* QR SVG */}
            <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl border border-[#E4CFD3] shadow-inner flex items-center justify-center">
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-sm font-bold text-[#3B2228]">
                Escanea con la cámara de tu móvil
              </p>
              <p className="text-xs text-[#6B4A52] leading-relaxed max-w-xs mx-auto">
                Accede a nuestro catálogo completo de servicios, precios en divisas y reserva tu cita en 15 segundos.
              </p>
              <p className="text-[11px] font-bold text-[#8A6A2E] pt-2">
                Confirmación inmediata en WhatsApp
              </p>
            </div>

            <div className="pt-3 border-t border-[#E4CFD3] text-[10px] text-[#6B4A52]">
              <p>{salonTheme.addressLine || 'San Cristóbal, Táchira'}</p>
              <p className="font-mono text-[#7A3E4A] font-bold mt-0.5">{targetUrl.replace('https://', '')}</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-[#6B4A52] mt-3 print:hidden">
            <strong>Pieza 1:</strong> Cartel A5 vertical para tocador, espejo o mostrador de recepción.
          </p>
        </div>

        {/* PIEZA 2 & 3: Tarjeta de visita (85x55 mm) y Pegatina redonda (60 mm) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto print-page-break">
          {/* Tarjeta de visita 85 x 55 mm */}
          <div className="p-5 rounded-2xl bg-white border border-[#24152B]/15 shadow-sm space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A3E4A] block print:hidden">
              Pieza 2: Tarjeta de Visita (85 × 55 mm)
            </span>
            <div className="w-[320px] h-[190px] mx-auto p-4 rounded-xl bg-[#2D1B20] text-[#F6ECEC] flex items-center justify-between gap-3 border border-[#C5A059]/40 shadow-sm">
              <div className="space-y-2 flex-1">
                <span className="text-[9px] uppercase tracking-widest text-[#C5A059] font-bold block">
                  CARTA EXCLUSIVA
                </span>
                <p className="font-serif font-bold text-lg leading-tight text-white">{salonNombre}</p>
                <p className="text-[10px] text-stone-300 leading-tight">Escanea para consultar disponibilidad y tarifas.</p>
                <p className="text-[9px] text-[#C5A059] font-mono">{targetUrl.replace('https://', '')}</p>
              </div>
              <div className="w-24 h-24 p-1.5 bg-white rounded-lg shrink-0 flex items-center justify-center">
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
            </div>
          </div>

          {/* Pegatina redonda 60 mm */}
          <div className="p-5 rounded-2xl bg-white border border-[#24152B]/15 shadow-sm space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A3E4A] block print:hidden">
              Pieza 3: Pegatina Redonda (Diámetro 60 mm)
            </span>
            <div className="w-[200px] h-[200px] mx-auto rounded-full bg-[#F6ECEC] border-2 border-dashed border-[#7A3E4A] p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <span className="text-[9px] font-bold text-[#7A3E4A] uppercase tracking-wider">
                {salonNombre}
              </span>
              <div className="w-24 h-24 p-1 bg-white rounded-xl shadow-xs my-1 flex items-center justify-center">
                <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              </div>
              <span className="text-[8px] font-bold text-[#8A6A2E] tracking-tight">
                ESCANEA PARA RESERVAR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN 2: CREATIVIDADES DIGITALES PARA REDES SOCIALES ── */}
      <div className="space-y-4 print:hidden pt-4 border-t border-[#24152B]/10">
        <div>
          <h4 className="text-sm font-bold text-[#24152B] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#5B2A6E]" />
            <span>Creatividades Digitales para Redes Sociales</span>
          </h4>
          <p className="text-xs text-[#6E6478] mt-0.5">
            Archivos PNG en alta resolución (1080 px) listos para publicar en tus historias o en tu muro de Instagram.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pieza 4: Historia de Instagram (1080x1920) */}
          <div className="p-5 rounded-2xl bg-white border border-[#24152B]/10 space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#24152B] block">Historia de Instagram (1080 × 1920 PNG)</span>
              <p className="text-[11px] text-[#6E6478]">Formato vertical ideal para historias destacadas o publicaciones temporales.</p>
              <div className="mt-3 p-3 bg-stone-100 rounded-xl flex items-center justify-center overflow-hidden max-h-[300px]">
                <canvas ref={storyCanvasRef} className="w-auto h-[260px] rounded-lg shadow-sm" />
              </div>
            </div>
            <button
              type="button"
              onClick={descargarStory}
              disabled={downloadingStory}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#5B2A6E] hover:bg-[#4A2159] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingStory ? 'Generando PNG...' : 'Descargar Historia PNG (1080 × 1920)'}</span>
            </button>
          </div>

          {/* Pieza 5: Post de Instagram (1080x1080) */}
          <div className="p-5 rounded-2xl bg-white border border-[#24152B]/10 space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-[#24152B] block">Post de Instagram (1080 × 1080 PNG)</span>
              <p className="text-[11px] text-[#6E6478]">Formato cuadrado de alta fidelidad para el feed o carruseles promocionales.</p>
              <div className="mt-3 p-3 bg-stone-100 rounded-xl flex items-center justify-center overflow-hidden max-h-[300px]">
                <canvas ref={postCanvasRef} className="w-auto h-[260px] rounded-lg shadow-sm" />
              </div>
            </div>
            <button
              type="button"
              onClick={descargarPost}
              disabled={downloadingPost}
              className="w-full mt-2 py-2.5 rounded-xl bg-[#5B2A6E] hover:bg-[#4A2159] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingPost ? 'Generando PNG...' : 'Descargar Post PNG (1080 × 1080)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Estilos específicos de impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #salon-kit-printable, #salon-kit-printable * {
            visibility: visible;
          }
          #salon-kit-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .print-page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
};
