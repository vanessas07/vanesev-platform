import React, { useState, useEffect, useRef } from 'react';
import { QREncoder } from '../utils/qrEncoder';
import { SalonLaunchKit } from './SalonLaunchKit';
import { SalonThemeConfig, getSalonThemeConfig } from '../utils/salonThemeEngine';
import {
  QrCode,
  Download,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Edit3,
  Plus,
  Eye,
  Smartphone,
  Globe,
  TrendingUp,
    Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface DynamicQrItem {
  id: string;
  code: string;
  tenant_id: string;
  label: string;
  target_url: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScanEvent {
  id: number;
  code: string;
  tenant_id: string;
  scanned_at: string;
  device_type: string;
  country: string;
}

interface DynamicQrManagerProps {
  tenantSlug: 'capra-studio' | 'andrea-nails' | 'all';
  tenantName: string;
  salonTheme?: SalonThemeConfig;
  onClose?: () => void;
}

export const DynamicQrManager: React.FC<DynamicQrManagerProps> = ({
  tenantSlug,
  tenantName,
  onClose,
}) => {
  const [qrList, setQrList] = useState<DynamicQrItem[]>([]);
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([]);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [scansToday, setScansToday] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedQr, setSelectedQr] = useState<DynamicQrItem | null>(null);

  // Edit target state
  const [editingQr, setEditingQr] = useState<DynamicQrItem | null>(null);
  const [editTargetInput, setEditTargetInput] = useState<string>('');
  const [editLabelInput, setEditLabelInput] = useState<string>('');
  const [isSavingTarget, setIsSavingTarget] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [editError, setEditError] = useState<string>('');

  // Create new QR state
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('');
  const [newTarget, setNewTarget] = useState<string>('');
  const [createError, setCreateError] = useState<string>('');

  // Custom styling state for the QR Vector Studio
  const [fgColor, setFgColor] = useState<string>(
    tenantSlug === 'capra-studio' ? '#B5838D' : '#1F1417'
  );
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [centerBadgeText, setCenterBadgeText] = useState<string>(
    tenantSlug === 'capra-studio' ? 'CAPRA' : 'VANESEV'
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch data from /api/qr
  const fetchQrData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/qr?tenant=${tenantSlug}`);
      if (res.ok) {
        const data = await res.json();
        setQrList(data.qrCodes || []);
        setRecentScans(data.recentScans || []);
        setTotalScans(data.totalScans || 0);
        setScansToday(data.scansToday || 0);
        if (data.qrCodes && data.qrCodes.length > 0 && !selectedQr) {
          setSelectedQr(data.qrCodes[0]);
        }
      }
    } catch (e) {
      console.error('Error loading QR data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQrData();
  }, [tenantSlug]);

  // Generate SVG string
  const getSelectedQrUrl = () => {
    if (!selectedQr) return 'https://vanesev.com';
    return `https://vanesev.com/r/${selectedQr.code}`;
  };

  const qrSvgString = React.useMemo(() => {
    try {
      const url = getSelectedQrUrl();
      const matrix = QREncoder.generateMatrix(url);
      return QREncoder.toSVG(matrix, {
        fgColor,
        bgColor,
        centerText: centerBadgeText.trim() ? centerBadgeText.trim() : undefined,
      });
    } catch (err) {
      console.error('Error generating QR SVG:', err);
      return '';
    }
  }, [selectedQr, fgColor, bgColor, centerBadgeText]);

  // Copy short link to clipboard
  const handleCopyLink = (code: string) => {
    const full = `https://vanesev.com/r/${code}`;
    navigator.clipboard.writeText(full);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Open Edit Modal
  const handleOpenEdit = (qr: DynamicQrItem) => {
    setEditingQr(qr);
    setEditTargetInput(qr.target_url);
    setEditLabelInput(qr.label);
    setSaveSuccessMsg('');
  };

  // Save new target destination (Instant update in DB without changing physical print)
  const handleSaveTarget = async () => {
    if (!editingQr || !editTargetInput.trim()) return;
    setIsSavingTarget(true);
    setSaveSuccessMsg('');

    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_target',
          code: editingQr.code,
          targetUrl: editTargetInput.trim(),
          label: editLabelInput.trim() || editingQr.label,
        }),
      });

      if (res.ok) {
        setSaveSuccessMsg('¡Destino actualizado en vivo! El QR físico impreso sigue siendo el mismo.');
        await fetchQrData();
        setTimeout(() => {
          setEditingQr(null);
          setSaveSuccessMsg('');
        }, 1800);
      } else {
        const err = await res.json();
        alert(`Error al guardar: ${err.error || 'Intente nuevamente'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar destino');
    } finally {
      setIsSavingTarget(false);
    }
  };

  // Create new QR Code
    const handleCreateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTarget.trim()) {
      setCreateError('Por favor complete el código y la URL de destino');
      return;
    }

    const cleanCode = newCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanTenant = tenantSlug === 'all' ? 'capra-studio' : tenantSlug;
    const target = newTarget.trim();
    if (!target.startsWith(`/${cleanTenant}`) && !target.startsWith(`/m/${cleanTenant}`)) {
      setCreateError(`El destino debe ser una página del salón (/${cleanTenant} o /m/${cleanTenant})`);
      return;
    }

    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          code: cleanCode,
          tenantId: cleanTenant,
          label: newLabel.trim() || cleanCode,
          targetUrl: target,
        }),
      });

      if (res.ok) {
        setIsCreatingNew(false);
        setNewCode('');
        setNewLabel('');
        setNewTarget('');
        setCreateError('');
        await fetchQrData();
      } else {
        const data = await res.json();
        setCreateError(data.error || 'Error al crear código');
      }
    } catch (err: any) {
      setCreateError(err?.message || 'Error al conectar con la base de datos');
    }
  };

  // Download High-Resolution 300 DPI PNG
  const handleDownloadPng = () => {
    if (!selectedQr || !qrSvgString) return;

    const img = new Image();
    const svgBlob = new Blob([qrSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // High-resolution 1800x1800 px for crisp 300 DPI physical prints
      canvas.width = 1800;
      canvas.height = 1800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 1800, 1800);
        ctx.drawImage(img, 0, 0, 1800, 1800);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `qr-vanesev-${selectedQr.code}-300dpi.png`;
        link.href = pngUrl;
        link.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Download Vector SVG
  const handleDownloadSvg = () => {
    if (!selectedQr || !qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-vanesev-${selectedQr.code}-vectorial.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white text-[#0F172A] rounded-2xl border border-[#E2E8F0] shadow-xs p-6 lg:p-8 space-y-8">
            {/* Switcher: QR Dinamicos vs Kit de Lanzamiento */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
        <button
          type="button"
          onClick={() => setSeccionActual("qr")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${seccionActual === "qr" ? "bg-[#18181B] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          Códigos QR Dinámicos &amp; Analítica
        </button>
        <button
          type="button"
          onClick={() => setSeccionActual("kit")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${seccionActual === "kit" ? "bg-[#5B2A6E] text-white shadow-xs" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Kit de Lanzamiento Imprimible &amp; Redes (5 Piezas)</span>
        </button>
      </div>

      {seccionActual === "kit" ? (
        <SalonLaunchKit
          tenantSlug={tenantSlug}
          salonTheme={salonTheme || getSalonThemeConfig(tenantSlug)}
          activeQrCode={selectedQr?.code || qrList.find((q) => q.is_active)?.code}
        />
      ) : (
        <>
          {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
            <QrCode className="w-3.5 h-3.5 text-amber-600" />
            Tecnología QR Dinámico VANESEV
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-[#0F172A] tracking-tight">
            Motor de Códigos QR Dinámicos &amp; Analítica
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {tenantName} · El código físico se imprime <strong className="text-[#0F172A]">una sola vez</strong>. El destino se cambia en tiempo real desde este panel y cada escaneo se registra al instante.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQrData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nuevo QR Dinámico</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Escaneos Hoy</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold text-[#0F172A]">{scansToday}</div>
          <p className="text-[11px] text-emerald-700 mt-1">Registrados en tiempo real</p>
        </div>

        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Escaneos Histórico</span>
            <Smartphone className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-[#0F172A]">{totalScans}</div>
          <p className="text-[11px] text-slate-500 mt-1">Acumulado en todos los códigos</p>
        </div>

        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Códigos Dinámicos Activos</span>
            <QrCode className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-3xl font-bold text-[#0F172A]">{qrList.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Listos con redirección 302</p>
        </div>
      </div>

      {/* Main Studio: Left QR Preview & Customizer, Right Codes List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: QR Vector Studio (5 cols) */}
        <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A] tracking-wide uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Estudio Vectorial de Impresión
            </h3>
            {selectedQr && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold">
                /r/{selectedQr.code}
              </span>
            )}
          </div>

          {/* Live SVG Preview Box */}
          <div className="relative aspect-square max-w-[280px] mx-auto p-4 rounded-2xl bg-white shadow-md border border-[#E2E8F0] flex items-center justify-center">
            {qrSvgString ? (
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: qrSvgString }}
              />
            ) : (
              <div className="text-slate-400 text-xs">Cargando matriz QR...</div>
            )}
          </div>

          {/* Color Palettes */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">
              Paleta de Color de Autor:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFgColor('#B5838D');
                  setBgColor('#FFFFFF');
                  setCenterBadgeText('CAPRA');
                }}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                  fgColor === '#B5838D' ? 'border-[#B5838D] bg-pink-50 text-[#7A4953]' : 'border-[#CBD5E1] text-slate-700 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#B5838D]" />
                <span>Capra Velvet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFgColor('#C5A059');
                  setBgColor('#0F172A');
                  setCenterBadgeText('GOLD');
                }}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                  fgColor === '#C5A059' ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-[#CBD5E1] text-slate-700 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#C5A059]" />
                <span>Oro Dark</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFgColor('#0F172A');
                  setBgColor('#FFFFFF');
                  setCenterBadgeText('VN');
                }}
                className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                  fgColor === '#0F172A' ? 'border-slate-900 bg-slate-100 text-slate-900 font-bold' : 'border-[#CBD5E1] text-slate-700 hover:border-slate-400 bg-white'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#0F172A]" />
                <span>Editorial</span>
              </button>
            </div>
          </div>

          {/* Monogram Badge text */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Monograma Central (Nivel de Corrección H - 30%):
            </label>
            <input
              type="text"
              value={centerBadgeText}
              maxLength={6}
              onChange={(e) => setCenterBadgeText(e.target.value.toUpperCase())}
              placeholder="Ej: CAPRA, AL, VIP"
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Export / Download Buttons */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleDownloadPng}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] text-white hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PNG Alta Resolución (300 DPI)</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Descargar SVG Vectorial (Imprenta / Acrílico)</span>
            </button>

            {selectedQr && (
              <a
                href={`https://vanesev.com/r/${selectedQr.code}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-4 rounded-xl border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 transition text-center bg-white"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                <span>Probar Redirección en Vivo (/r/{selectedQr.code})</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic QR List & Real-time Destination Editing (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A] tracking-wide uppercase flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-600" />
              Códigos Activos ({qrList.length})
            </h3>
            <span className="text-xs text-slate-500">
              Selecciona uno para visualizar o editar su destino
            </span>
          </div>

          {qrList.length === 0 && !isLoading ? (
            <div className="p-8 text-center rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-slate-500 text-sm">
              No hay códigos registrados todavía. Haz clic en "Nuevo QR Dinámico".
            </div>
          ) : (
            <div className="space-y-3">
              {qrList.map((qr) => {
                const isSelected = selectedQr?.code === qr.code;
                return (
                  <div
                    key={qr.code}
                    onClick={() => setSelectedQr(qr)}
                    className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-xs ring-1 ring-amber-400/20'
                        : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0F172A] text-sm">{qr.label}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-amber-800 font-semibold">
                          vanesev.com/r/{qr.code}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                          {qr.scan_count} escaneos
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span className="text-slate-400">Destino actual:</span>
                        <span className="font-mono text-slate-800 truncate max-w-[260px]">
                          {qr.target_url}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(qr.code);
                        }}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                        title="Copiar enlace corto"
                      >
                        {copiedCode === qr.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(qr);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Cambiar Destino</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Scans Feed */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] space-y-3">
            <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Últimos Escaneos en Tiempo Real
            </h4>
            {recentScans.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Aún no hay escaneos registrados hoy. Escanea tu QR de prueba con el móvil para ver la fila aparecer aquí.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-slate-500 text-[10px] uppercase bg-[#F8FAFC]">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Dispositivo</th>
                      <th className="py-2.5 px-3">País</th>
                      <th className="py-2.5 px-3 text-right">Fecha / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {recentScans.slice(0, 8).map((scan) => (
                      <tr key={scan.id} className="text-slate-800 hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-amber-800 font-semibold">/r/{scan.code}</td>
                        <td className="py-2.5 px-3 capitalize">{scan.device_type || 'Móvil'}</td>
                        <td className="py-2.5 px-3">{scan.country || 'VE / Global'}</td>
                        <td className="py-2.5 px-3 text-right text-slate-500">
                          {new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Edit Dynamic Destination (The core feature) */}
      {editingQr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-600" />
                  Cambiar Destino del QR Dinámico
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Código: <strong className="text-amber-800 font-mono">/r/{editingQr.code}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingQr(null)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  Cero Re-impresión Física
                </p>
                <p className="text-[11px] text-slate-700">
                  Cualquier persona que escanee el código impreso en tu salón, cartas o flyers irá de inmediato a esta nueva dirección.
                </p>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">
                  Nombre descriptivo del código:
                </label>
                <input
                  type="text"
                  value={editLabelInput}
                  onChange={(e) => setEditLabelInput(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">
                  URL de Destino Dinámico (donde aterriza el cliente):
                </label>
                <input
                  type="text"
                  value={editTargetInput}
                  onChange={(e) => setEditTargetInput(e.target.value)}
                  placeholder={`Ej: /${tenantSlug === "all" ? "capra-studio" : tenantSlug} o /m/${tenantSlug === "all" ? "capra-studio" : tenantSlug}`}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Destinos permitidos exclusivamente dentro del salón: <code className="text-slate-800 font-bold">/{tenantSlug === 'all' ? 'salón' : tenantSlug}...</code> o <code className="text-slate-800 font-bold">/m/{tenantSlug === 'all' ? 'salón' : tenantSlug}...</code>.
                </p>
              </div>

              
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}
              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setEditingQr(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTarget}
                disabled={isSavingTarget}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                {isSavingTarget ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en Neon DB...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Guardar Destino Instantáneo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </>
      )}

      {/* MODAL: Create New Dynamic QR */}
      {isCreatingNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQr}
            className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-600" />
                  Crear Nuevo Código QR Dinámico
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Genera una URL corta propia protegida con analítica de escaneos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-semibold">
                  Identificador corto (Slug para vanesev.com/r/...):
                </label>
                <div className="flex items-center bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A]">
                  <span className="text-slate-400 select-none">vanesev.com/r/</span>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="ej: promo-noviembre, flyer-mesa"
                    className="w-full bg-transparent focus:outline-none text-[#0F172A] font-mono pl-1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">
                  Nombre descriptivo / Etiqueta:
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="ej: Cartel de Entrada, Mesa 4, Campaña Black Friday"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-semibold">
                  URL Inicial de Destino:
                </label>
                <input
                  type="text"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="ej: /capra-studio, /capra-studio#servicios"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A] font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                  required
                />
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{createError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Crear Código</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
