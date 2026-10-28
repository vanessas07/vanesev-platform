import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, MessageCircle, ShieldCheck } from 'lucide-react';
import { SalonApi, type EstadoWhatsapp } from '../services/salonApi';

/*
 * WhatsApp del salón con la API de Meta en su propio número (C-01; G-054, G-062).
 * La dueña conecta SU WhatsApp Business Platform: sus datos de acceso se guardan cifrados y no vuelven a mostrarse.
 * Desde aquí activa los avisos a sus clientas, el aviso a su equipo y el agente que responde con sus datos.
 */

const PLANTILLAS = [
  { nombre: 'vanesev_cita_confirmada', para: 'Clienta', texto: 'Hola {{1}}, tu cita en {{2}} está confirmada: {{3}}, {{4}}. Si necesitas cambiarla, responde a este mensaje.' },
  { nombre: 'vanesev_cita_cambiada', para: 'Clienta', texto: 'Hola {{1}}, tu cita en {{2}} ha cambiado: {{3}}, {{4}}. Si no te viene bien, responde a este mensaje.' },
  { nombre: 'vanesev_cita_cancelada', para: 'Clienta', texto: 'Hola {{1}}, tu cita en {{2}} de {{3}}, {{4}}, se ha cancelado. Cuando quieras, reserva otra respondiendo a este mensaje.' },
  { nombre: 'vanesev_recordatorio', para: 'Clienta', texto: 'Hola {{1}}, te recordamos tu cita en {{2}}: {{3}}, {{4}}. ¡Te esperamos!' },
  { nombre: 'vanesev_nueva_reserva', para: 'Tu equipo', texto: 'Nueva reserva en {{1}}: {{2}} ({{3}}), {{4}}, {{5}}. Confírmala en tu panel.' },
];

const PASOS = [
  { t: 'Crea tu app de Meta', d: 'Entra en developers.facebook.com con la cuenta de Facebook de tu negocio → «Crear app» → tipo «Empresa» → añade el producto «WhatsApp».', enlace: 'https://developers.facebook.com/apps' },
  { t: 'Añade tu número', d: 'En WhatsApp → «Configuración de la API», añade el número de tu salón y verifícalo con el código que te llega. Si ese número usa hoy la app de WhatsApp Business, Meta te guía para pasarlo sin perder el número.' },
  { t: 'Crea tu token permanente', d: 'En business.facebook.com → Configuración → Usuarios del sistema: crea uno con rol de administrador, asígnale tu app y tu cuenta de WhatsApp y genera un token con los permisos whatsapp_business_messaging y whatsapp_business_management.', enlace: 'https://business.facebook.com/settings/system-users' },
  { t: 'Copia tus datos aquí abajo', d: 'Identificador del número de teléfono y de la cuenta de WhatsApp Business (en «Configuración de la API»), el token del paso 3 y la clave secreta de la app (Configuración de la app → Básica).' },
  { t: 'Conecta el webhook', d: 'En WhatsApp → Configuración → Webhook, pega la URL y el token de verificación que te damos al conectar, y suscríbete al campo «messages». Así el agente puede responder.' },
  { t: 'Crea las plantillas', d: 'En el Administrador de WhatsApp → Plantillas, crea las cinco de abajo con el mismo nombre, categoría «Utilidad» e idioma «Español». Meta las aprueba en minutos u horas.', enlace: 'https://business.facebook.com/wa/manage/message-templates/' },
];

const Interruptor: React.FC<{ activo: boolean; onClick: () => void; etiqueta: string; disabled?: boolean }> = ({ activo, onClick, etiqueta, disabled }) => (
  <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} disabled={disabled} onClick={onClick} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 cursor-pointer ${activo ? 'bg-[#1F1226]' : 'bg-[#D9D3DF]'}`}>
    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${activo ? 'left-6' : 'left-1'}`} />
  </button>
);

const Copiable: React.FC<{ etiqueta: string; valor: string }> = ({ etiqueta, valor }) => {
  const [hecho, setHecho] = useState(false);
  return (
    <div className="rounded-2xl bg-[#F4F0EA] p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7D6438]">{etiqueta}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all text-[13px] text-[#1A1020]">{valor}</code>
        <button type="button" aria-label={`Copiar ${etiqueta}`} onClick={() => { navigator.clipboard?.writeText(valor).then(() => { setHecho(true); setTimeout(() => setHecho(false), 1500); }).catch(() => undefined); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#1A1020] ring-1 ring-[#1A1020]/10 cursor-pointer">
          {hecho ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
};

const campo = 'w-full rounded-xl border border-[#1A1020]/15 bg-white px-3 py-2.5 text-[14px] text-[#1A1020] focus:border-[#4A1F5C] focus:outline-none';

export const SalonWhatsappCard: React.FC<{ tenantSlug: string }> = ({ tenantSlug }) => {
  const [wa, setWa] = useState<EstadoWhatsapp | null>(null);
  const [guia, setGuia] = useState(false);
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', token: '', appSecret: '' });
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [telPrueba, setTelPrueba] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    let vivo = true;
    SalonApi.admin(tenantSlug).then((r) => {
      if (vivo && r.ok) setWa(r.data.whatsapp || { conectado: false, webhookUrl: `https://vanesev.com/api/whatsapp/${tenantSlug}` });
    });
    return () => { vivo = false; };
  }, [tenantSlug]);

  const conectar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true); setError(null); setAviso(null);
    const r = await SalonApi.conectarWhatsapp(tenantSlug, form);
    if (r.ok) { setWa(r.data.whatsapp); setEditando(false); setForm({ phoneNumberId: '', wabaId: '', token: '', appSecret: '' }); setAviso('Conectado. Ahora conecta el webhook (paso 5).'); }
    else setError(r.error);
    setOcupado(false);
  };

  const opciones = async (cambio: Partial<{ agente: boolean; avisosClienta: boolean; avisosEquipo: boolean }>) => {
    if (!wa?.conectado) return;
    setOcupado(true); setError(null);
    const r = await SalonApi.opcionesWhatsapp(tenantSlug, { agente: wa.agente !== false, avisosClienta: wa.avisosClienta !== false, avisosEquipo: wa.avisosEquipo !== false, ...cambio });
    if (r.ok) setWa(r.data.whatsapp); else setError(r.error);
    setOcupado(false);
  };

  const probar = async () => {
    setOcupado(true); setError(null); setAviso(null);
    const r = await SalonApi.probarWhatsapp(tenantSlug, telPrueba);
    if (r.ok) setAviso('Mensaje de prueba enviado. Míralo en ese móvil.'); else setError(r.error);
    setOcupado(false);
  };

  const desconectar = async () => {
    if (!confirmar) { setConfirmar(true); return; }
    setConfirmar(false);
    setOcupado(true); setError(null);
    const r = await SalonApi.desconectarWhatsapp(tenantSlug);
    if (r.ok) setWa(r.data.whatsapp); else setError(r.error);
    setOcupado(false);
  };

  const verificada = wa?.conectado && wa.estado === 'verificada';
  const mostrarFormulario = wa && (!wa.conectado || editando || wa.estado === 'error');

  return (
    <div className="rounded-3xl border border-[#1A1020]/10 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1F1226] text-[#E7CF9C]">
          <MessageCircle className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-lujo text-lg text-[#1A1020]">WhatsApp de tu salón</p>
            {wa && (
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${verificada ? 'bg-emerald-50 text-emerald-800' : wa.conectado ? 'bg-rose-50 text-rose-800' : 'bg-[#F4F0EA] text-[#6E6478]'}`}>
                {verificada ? `Conectado · ${wa.numero || wa.phoneNumberId}` : wa.conectado ? 'Revisa los datos' : 'Sin conectar'}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#6E6478]">
            Con la API oficial de Meta en tu propio número: confirmaciones y recordatorios por WhatsApp a tus clientas, aviso a tu especialista con cada reserva y un agente que responde con tus horarios, precios, ofertas y tu enlace para reservar. Las cuotas de Meta las pagas tú, directamente a Meta.
          </p>
        </div>
      </div>

      {/* Guía paso a paso */}
      <button type="button" aria-expanded={guia} onClick={() => setGuia((v) => !v)} className="mt-5 flex w-full items-center justify-between rounded-2xl bg-[#F4F0EA] px-4 py-3 text-left text-[14px] font-bold text-[#1A1020] cursor-pointer">
        Guía paso a paso para activarlo (unos 20 minutos)
        <ChevronDown className={`h-4 w-4 transition-transform ${guia ? 'rotate-180' : ''}`} />
      </button>
      {guia && (
        <div className="mt-3 space-y-4">
          <ol className="space-y-3">
            {PASOS.map((p, i) => (
              <li key={p.t} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F1226] text-[12px] font-bold text-[#E7CF9C]">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#1A1020]">{p.t}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#4A4150]">{p.d}</p>
                  {p.enlace && <a href={p.enlace} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-[#4A1F5C]">Abrir <ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
              </li>
            ))}
          </ol>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7D6438]">Las cinco plantillas</p>
            <div className="mt-2 space-y-2">
              {PLANTILLAS.map((p) => (
                <div key={p.nombre} className="rounded-2xl border border-[#1A1020]/10 p-3">
                  <p className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-bold text-[#1A1020]"><code>{p.nombre}</code><span className="text-[11px] font-semibold text-[#6E6478]">Para: {p.para}</span></p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#4A4150]">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conexión */}
      {mostrarFormulario && (
        <form onSubmit={conectar} className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-bold text-[#1A1020]">Identificador del número de teléfono
              <input required inputMode="numeric" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value.trim() })} className={`mt-1 ${campo}`} />
            </label>
            <label className="block text-[12px] font-bold text-[#1A1020]">Identificador de la cuenta de WhatsApp Business
              <input inputMode="numeric" value={form.wabaId} onChange={(e) => setForm({ ...form, wabaId: e.target.value.trim() })} className={`mt-1 ${campo}`} />
            </label>
          </div>
          <label className="block text-[12px] font-bold text-[#1A1020]">Token permanente
            <input required type="password" autoComplete="off" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value.trim() })} className={`mt-1 ${campo}`} />
          </label>
          <label className="block text-[12px] font-bold text-[#1A1020]">Clave secreta de la app
            <input required type="password" autoComplete="off" value={form.appSecret} onChange={(e) => setForm({ ...form, appSecret: e.target.value.trim() })} className={`mt-1 ${campo}`} />
          </label>
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[#6E6478]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#4A1F5C]" /> El token y la clave se guardan cifrados y no vuelven a mostrarse, ni a ti ni a nadie. Si los cambias en Meta, vuelve a pegarlos aquí.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={ocupado} className="rounded-full bg-[#1F1226] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-50 cursor-pointer">{ocupado ? 'Comprobando con Meta…' : 'Conectar mi WhatsApp'}</button>
            {editando && <button type="button" onClick={() => setEditando(false)} className="rounded-full border border-[#1A1020]/15 px-5 py-3 text-[14px] font-bold text-[#1A1020] cursor-pointer">Cancelar</button>}
          </div>
        </form>
      )}

      {wa?.conectado && (
        <div className="mt-5 space-y-3">
          {wa.verifyToken && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Copiable etiqueta="URL del webhook" valor={wa.webhookUrl} />
              <Copiable etiqueta="Token de verificación" valor={wa.verifyToken} />
            </div>
          )}
          <p className="text-[12px] text-[#6E6478]">{wa.webhookVisto ? 'Webhook conectado: Meta ya habló con tu panel.' : 'Webhook aún sin conectar (paso 5 de la guía).'}</p>
          {[
            ['avisosClienta', 'Confirmaciones y recordatorios a tus clientas', 'El día antes y 2 horas antes, desde tu número.'],
            ['avisosEquipo', 'Aviso a tu especialista con cada reserva', 'A su móvil, si lo tiene en su ficha del equipo.'],
            ['agente', 'Agente que responde por ti', 'Con tus horarios, precios en $ y Bs, ofertas y tu enlace. Si la clienta escribe «persona», se calla 12 horas y te deja el chat.'],
          ].map(([k, t, d]) => (
            <div key={k} className="flex items-start justify-between gap-3 rounded-2xl border border-[#1A1020]/8 p-3">
              <div>
                <p className="text-[14px] font-bold text-[#1A1020]">{t}</p>
                <p className="text-[12px] leading-relaxed text-[#6E6478]">{d}</p>
              </div>
              <Interruptor etiqueta={t} disabled={ocupado || !verificada} activo={(wa as any)[k] !== false} onClick={() => opciones({ [k]: (wa as any)[k] === false })} />
            </div>
          ))}
          {verificada && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={telPrueba} onChange={(e) => setTelPrueba(e.target.value)} placeholder="Tu móvil para la prueba (58 414…)" inputMode="tel" className={campo} />
              <button type="button" disabled={ocupado || !telPrueba} onClick={probar} className="shrink-0 rounded-full bg-[#1F1226] px-5 py-3 text-[14px] font-bold text-white disabled:opacity-50 cursor-pointer">Enviar prueba</button>
            </div>
          )}
          {wa.ultimoError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-800">Último aviso de Meta: {wa.ultimoError}</p>}
          <div className="flex flex-wrap gap-2">
            {!editando && <button type="button" onClick={() => setEditando(true)} className="rounded-full border border-[#1A1020]/15 px-4 py-2 text-[13px] font-bold text-[#1A1020] cursor-pointer">Cambiar mis datos de Meta</button>}
            <button type="button" disabled={ocupado} onClick={desconectar} className="rounded-full px-4 py-2 text-[13px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer">{confirmar ? 'Sí, desconectar mi WhatsApp' : 'Desconectar'}</button>
            {confirmar && <button type="button" onClick={() => setConfirmar(false)} className="rounded-full px-4 py-2 text-[13px] font-bold text-[#1A1020] cursor-pointer">No</button>}
          </div>
        </div>
      )}

      {aviso && <p className="mt-3 text-[13px] font-bold text-emerald-800">{aviso}</p>}
      {error && <p className="mt-3 text-[13px] font-bold text-rose-700">{error}</p>}
    </div>
  );
};
