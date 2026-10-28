import React, { useState, useEffect } from 'react';
import { SalonApi, TarjetaRegalo } from '../services/salonApi';
import { 
  Gift, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Ban, 
  Copy, 
  Check, 
  AlertTriangle, 
  Calendar, 
  User, 
  DollarSign, 
  FileText,
  CreditCard,
  Lock
} from 'lucide-react';

interface SalonTarjetasTabProps {
  tenantSlug: string;
}

export const SalonTarjetasTab: React.FC<SalonTarjetasTabProps> = ({ tenantSlug }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tarjetas, setTarjetas] = useState<TarjetaRegalo[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Formulario emitir
  const [showEmitirModal, setShowEmitirModal] = useState(false);
  const [saldoUSD, setSaldoUSD] = useState<string>('');
  const [beneficiaria, setBeneficiaria] = useState('');
  const [nota, setNota] = useState('');
  const [caduca, setCaduca] = useState('');

  // Modal de código revelado UNA VEZ
  const [tarjetaCreada, setTarjetaCreada] = useState<{
    codigo: string;
    saldoUSD: number;
    beneficiaria?: string;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargarTarjetas = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await SalonApi.admin(tenantSlug);
    if (res.ok) {
      setTarjetas(res.data.tarjetas || []);
    } else {
      setErrorMsg(res.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarTarjetas();
  }, [tenantSlug]);

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const saldoNum = parseFloat(saldoUSD);
    if (isNaN(saldoNum) || saldoNum < 1 || saldoNum > 10000) {
      setErrorMsg('El saldo debe estar entre 1 y 10.000 $ USD.');
      setSaving(false);
      return;
    }

    const res = await SalonApi.crearTarjeta(tenantSlug, {
      saldoUSD: saldoNum,
      beneficiaria: beneficiaria.trim() || undefined,
      nota: nota.trim() || undefined,
      caduca: caduca || null,
    });
    setSaving(false);

    if (res.ok) {
      setShowEmitirModal(false);
      setTarjetaCreada({
        codigo: res.data.codigo,
        saldoUSD: res.data.saldoUSD,
        beneficiaria: beneficiaria.trim() || undefined,
      });
      // Reset form
      setSaldoUSD('');
      setBeneficiaria('');
      setNota('');
      setCaduca('');
      cargarTarjetas();
    } else {
      setErrorMsg(res.error);
    }
  };

  const handleAnular = async (id: string) => {
    if (!window.confirm('¿Deseas anular esta tarjeta regalo? La clienta ya no podrá utilizarla en sus reservas.')) return;
    setErrorMsg(null);
    const res = await SalonApi.anularTarjeta(tenantSlug, id);
    if (res.ok) {
      setSuccessMsg('Tarjeta regalo anulada.');
      cargarTarjetas();
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error);
    }
  };

  const copiarCodigo = () => {
    if (!tarjetaCreada) return;
    navigator.clipboard.writeText(tarjetaCreada.codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Guía corta de sección */}
      <div className="p-4 rounded-2xl bg-[#FBFAFC] border border-[#1A1020]/10 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-[#1F1226]/10 text-[#4A1F5C] shrink-0 mt-0.5">
          <HelpCircle className="w-4 h-4" />
        </div>
        <div className="text-xs text-[#6E6478] leading-relaxed">
          <p className="font-bold text-[#1A1020] text-sm mb-0.5">Tarjetas Regalo Prepagadas</p>
          <p>
            Emite tarjetas de consumo con saldo prepagado tras recibir el cobro de la clienta en recepción o por transferencia.
            La clienta puede canjear el código en su reserva web y el saldo se descontará de forma transparente.
          </p>
        </div>
      </div>

      {/* Aviso operativo */}
      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5 font-medium">
        <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
        <span>
          <strong>Cobro previo fuera de la plataforma:</strong> Emite la tarjeta regalo únicamente tras haber cobrado
          su importe íntegro por tus vías habituales (efectivo, pago móvil, Zelle o Binance).
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cabecera y botón emitir */}
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
          <Gift className="w-4 h-4 text-[#4A1F5C]" />
          <span>Tarjetas Emitidas ({tarjetas.length})</span>
        </h4>
        <button
          type="button"
          onClick={() => setShowEmitirModal(true)}
          className="px-4 py-2 bg-[#1F1226] hover:bg-[#2E1A38] text-white rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Emitir Tarjeta Regalo</span>
        </button>
      </div>

      {/* Modal / Alerta: CÓDIGO REVELADO UNA SOLA VEZ */}
      {tarjetaCreada && (
        <div className="p-6 rounded-2xl bg-[#1A1020] text-white space-y-4 shadow-xl border-2 border-[#C5A059]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#C5A059] uppercase tracking-widest flex items-center gap-1.5">
              <Gift className="w-4 h-4" />
              <span>Tarjeta Regalo Emitida con Éxito</span>
            </span>
            <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full font-mono">
              Saldo: ${tarjetaCreada.saldoUSD.toFixed(2)} USD
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-[#6E6478]">
              {tarjetaCreada.beneficiaria ? `Para: ${tarjetaCreada.beneficiaria}` : 'Código de canje al portador:'}
            </p>
            <div className="flex items-center gap-3 p-3.5 bg-black/40 rounded-xl border border-white/10 font-mono text-xl sm:text-2xl font-bold tracking-widest text-[#F6ECEC]">
              <span className="select-all flex-1 text-center">{tarjetaCreada.codigo}</span>
              <button
                type="button"
                onClick={copiarCodigo}
                className="px-4 py-2 bg-[#C5A059] hover:bg-[#8A6A2E] text-stone-950 font-sans font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">Guárdalo o entrégalo ahora: no se volverá a mostrar.</p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                Por motivos de seguridad y privacidad criptográfica, el servidor solo almacena los últimos 4 dígitos.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setTarjetaCreada(null)}
              className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Entendido y Copiado
            </button>
          </div>
        </div>
      )}

      {/* Modal para emitir nueva tarjeta */}
      {showEmitirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#1A1020]/10">
            <div className="flex items-center justify-between pb-2 border-b border-[#1A1020]/10">
              <h5 className="text-sm font-bold text-[#1A1020] flex items-center gap-2">
                <Gift className="w-4 h-4 text-[#4A1F5C]" />
                <span>Emitir Nueva Tarjeta Regalo</span>
              </h5>
              <button
                type="button"
                onClick={() => setShowEmitirModal(false)}
                className="text-[#6E6478] hover:text-[#1A1020] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmitir} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1A1020]">
                  Saldo Inicial ($ USD) * (1 a 10.000 $)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="10000"
                  required
                  value={saldoUSD}
                  onChange={(e) => setSaldoUSD(e.target.value)}
                  placeholder="Ej: 50"
                  className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1A1020]">Beneficiaria / Destinataria (Opcional)</label>
                <input
                  type="text"
                  value={beneficiaria}
                  onChange={(e) => setBeneficiaria(e.target.value)}
                  placeholder="Ej: Camila Rojas"
                  className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1A1020]">Nota o Motivo (Opcional)</label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Regalo de Cumpleaños / Aniversario"
                  className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#1A1020]">Fecha de Caducidad (Opcional)</label>
                <input
                  type="date"
                  value={caduca}
                  onChange={(e) => setCaduca(e.target.value)}
                  className="w-full p-2.5 bg-[#FBFAFC] border border-[#1A1020]/15 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4A1F5C]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 text-[11px] text-amber-900 border border-amber-200">
                Al emitirla se generará un código único. Debes entregarlo a la clienta en el momento, pues no se almacena en texto claro.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmitirModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#6E6478] hover:text-[#1A1020] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#1F1226] hover:bg-[#2E1A38] text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Emitiendo...' : 'Generar Tarjeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Listado de Tarjetas */}
      {loading ? (
        <div className="py-10 text-center text-xs text-[#6E6478]">Cargando tarjetas regalo del salón...</div>
      ) : tarjetas.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#1A1020]/10 text-center space-y-2">
          <Gift className="w-8 h-8 text-[#6E6478]/40 mx-auto" />
          <p className="text-xs font-bold text-[#1A1020]">No hay tarjetas regalo emitidas</p>
          <p className="text-[11px] text-[#6E6478]">
            Pulsa en "Emitir Tarjeta Regalo" cuando una clienta adquiera una tarjeta de consumo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tarjetas.map((t) => {
            const agotada = t.saldoUSD <= 0;
            return (
              <div
                key={t.id}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#1A1020]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#1A1020] bg-[#1A1020]/5 px-2.5 py-0.5 rounded-lg">
                      •••• {t.codigoFinal}
                    </span>
                    {t.activa && !agotada ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Activa
                      </span>
                    ) : agotada ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F2F7] text-[#4A4150]">
                        Saldo agotado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        Anulada
                      </span>
                    )}
                    {t.beneficiaria && (
                      <span className="text-xs font-bold text-[#1A1020]">
                        Para: {t.beneficiaria}
                      </span>
                    )}
                  </div>

                  {t.nota && <p className="text-xs text-[#6E6478]">{t.nota}</p>}

                  <div className="flex items-center gap-3 text-xs text-[#6E6478] flex-wrap">
                    <span className="font-bold text-emerald-800">
                      Saldo actual: ${t.saldoUSD.toFixed(2)} USD
                    </span>
                    <span className="text-[11px]">
                      (Inicial: ${t.saldoInicialUSD.toFixed(2)} USD)
                    </span>
                    {t.caduca && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-[#4A1F5C]" />
                        <span>Caduca: {t.caduca}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.activa && (
                    <button
                      type="button"
                      onClick={() => handleAnular(t.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Anular tarjeta regalo"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Anular</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
