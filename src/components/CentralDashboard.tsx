import React, { useState, useEffect } from 'react';
import {
  Shield, Layers, CheckCircle2, AlertTriangle, MessageSquare, FileText,
  Globe, Plus, RefreshCw, ExternalLink, Send, Check, XCircle,
  Clock, Server, Database, HardDrive, GitBranch, ArrowUpRight, Users,
  MapPin, DollarSign, Crown, Eye, Terminal, Activity, Lock, QrCode, Crosshair,
  Palette, Sliders, X, LogOut, Copy, UserPlus, KeyRound
} from 'lucide-react';
import { motion } from 'framer-motion';
import { authClient } from '../lib/authClient';
import { CentralAuthGate } from './CentralAuthGate';
import { DynamicQrManager } from './DynamicQrManager';
import { CentralCompetitors } from './CentralCompetitors';
import { SalonThemeStudio } from './SalonThemeStudio';
import {
  SALON_PALETTES,
  SALON_TYPOGRAPHIES,
  SALON_LAYOUTS,
  getSalonThemeConfig,
  saveSalonThemeConfig,
  getPaletteById,
  SalonPaletteId,
  SalonTypographyId,
  SalonCardLayoutId,
} from '../utils/salonThemeEngine';

interface CentralDashboardProps {
  onNavigateToTenant: (tenantSlug: string, openAdmin?: boolean) => void;
  onNavigateToSaaSLanding: () => void;
}

export const CentralDashboard: React.FC<CentralDashboardProps> = ({
  onNavigateToTenant,
  onNavigateToSaaSLanding,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'sessions' | 'incidents' | 'mailbox' | 'tasks_roadmap' | 'docs' | 'qr' | 'competitors'>('overview');
  const [overviewTier, setOverviewTier] = useState<'zones' | 'database' | 'governance'>('zones');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingTenantThemeSlug, setEditingTenantThemeSlug] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(true);

  const [data, setData] = useState<any>(null);

  // Session feedback state
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});

  // New Incident Form
  const [incTitle, setIncTitle] = useState('');
  const [incDesc, setIncDesc] = useState('');
  const [incSeverity, setIncSeverity] = useState<'critical' | 'high' | 'medium'>('critical');
  const [incZone, setIncZone] = useState('ZONA 2 · CENTRAL');
  const [incTenant, setIncTenant] = useState('all');

  // New Mailbox Message Form
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgPriority, setMsgPriority] = useState<'high' | 'normal'>('high');

  // New Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskZone, setTaskZone] = useState('ZONA 2 · CENTRAL');
  const [taskPriority, setTaskPriority] = useState('critical');

  // New / Edit Tenant 1-Click Wizard Form
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    id: '',
    customSubdomain: '',
    businessName: '',
    niche: 'multi_studio',
    slogan: 'Excelencia, armonía y atención personalizada',
    ownerName: '',
    ownerEmail: '',
    whatsappPhone: '58424',
    instagramHandle: '@',
    city: 'San Cristóbal, Táchira',
    paletteId: 'rose-cashmere' as SalonPaletteId,
    typographyId: 'haute-couture' as SalonTypographyId,
    layoutId: 'editorial-magazine' as SalonCardLayoutId,
    primaryColor: '#9E475B',
    accentColor: '#C89B7B',
    loyaltyStampsTarget: 5,
    loyaltyRewardTitle: 'Ritual VIP de Cortesía 100% Gratis',
    monthlyFeeUsd: 29,
    initialZonesCsv: 'Cejas & Pestañas, Estilismo & Colorimetría, Cabina Facial & Spa',
    initialStaffCsv: 'Directora Principal, Especialista Senior',
  });

  // Selected Document Viewer
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  // ─── ALTA DE PERSONAL (create-staff) ─────────────────────────────
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffFormEmail, setStaffFormEmail] = useState('');
  const [staffFormOrg, setStaffFormOrg] = useState('');
  const [staffFormRole, setStaffFormRole] = useState<'owner' | 'admin' | 'staff'>('staff');
  const [staffFormName, setStaffFormName] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [createdStaffResult, setCreatedStaffResult] = useState<{
    email: string;
    organizationSlug: string;
    role: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setStaffLoading(true);
    try {
      const res = await fetch('/api/central', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-staff',
          payload: {
            email: staffFormEmail.trim().toLowerCase(),
            name: staffFormName.trim() || undefined,
            organizationSlug: staffFormOrg.trim().toLowerCase(),
            role: staffFormRole,
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setStaffError(resData.error || 'Error al dar de alta el personal.');
        return;
      }
      setCreatedStaffResult({
        email: resData.email,
        organizationSlug: resData.organizationSlug,
        role: resData.role,
        temporaryPassword: resData.temporaryPassword,
      });
      setStaffFormEmail('');
      setStaffFormName('');
      setStaffFormOrg('');
    } catch (err: any) {
      setStaffError(err?.message || 'Error de conexión con el servidor.');
    } finally {
      setStaffLoading(false);
    }
  };

  // ─── PUESTA A PUNTO: ACCESOS DE PRUEBA (create-trial-owner / reset-trial-password) ─
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialModalType, setTrialModalType] = useState<'create' | 'reset'>('create');
  const [trialModalOrg, setTrialModalOrg] = useState('');
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [trialResult, setTrialResult] = useState<{
    email: string;
    organizationSlug: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedTrialPassword, setCopiedTrialPassword] = useState(false);

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrialError(null);
    setTrialLoading(true);
    try {
      const res = await fetch('/api/central', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: trialModalType === 'create' ? 'create-trial-owner' : 'reset-trial-password',
          payload: {
            organizationSlug: trialModalOrg.trim().toLowerCase(),
          },
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setTrialError(resData.error || 'Error al gestionar acceso de prueba.');
        return;
      }
      setTrialResult({
        email: resData.email,
        organizationSlug: resData.organizationSlug,
        temporaryPassword: resData.temporaryPassword,
      });
      fetchCentralState();
    } catch (err: any) {
      setTrialError(err?.message || 'Error de conexión.');
    } finally {
      setTrialLoading(false);
    }
  };

  const handleUpdatePeticionEstado = async (id: string, nuevoEstado: string) => {
    try {
      const res = await fetch('/api/central', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'puesta_a_punto_estado',
          payload: {
            id,
            estado: nuevoEstado,
          },
        }),
      });
      if (res.ok) {
        fetchCentralState();
      }
    } catch (err) {
      console.error('Error al actualizar estado de petición:', err);
    }
  };

  // ─── QR DE CAMPAÑA (scope=campaigns) ─────────────────────────────
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campCode, setCampCode] = useState('');
  const [campName, setCampName] = useState('');
  const [campTarget, setCampTarget] = useState('');
  const [savingCamp, setSavingCamp] = useState(false);
  const [copiedCampCode, setCopiedCampCode] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    setCampaignError(null);
    try {
      const res = await fetch('/api/qr?scope=campaigns');
      if (res.ok) {
        const json = await res.json();
        setCampaigns(json.campaigns || []);
      } else {
        const err = await res.json();
        setCampaignError(err.error || 'Error al cargar campañas.');
      }
    } catch (e: any) {
      setCampaignError(e?.message || 'Error de conexión al cargar campañas.');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCamp(true);
    setCampaignError(null);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'campaign_upsert',
          code: campCode.trim().toLowerCase(),
          name: campName.trim(),
          targetUrl: campTarget.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCampaignError(json.error || 'Error al guardar campaña.');
        return;
      }
      setShowCampaignModal(false);
      setCampCode('');
      setCampName('');
      setCampTarget('');
      await fetchCampaigns();
    } catch (e: any) {
      setCampaignError(e?.message || 'Error al guardar campaña.');
    } finally {
      setSavingCamp(false);
    }
  };

  const handleToggleCampaign = async (code: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'campaign_toggle',
          code,
          isActive: !currentActive,
        }),
      });
      if (res.ok) {
        await fetchCampaigns();
      }
    } catch (e) {
      console.error('Error conmutando campaña:', e);
    }
  };


  const fetchCentralState = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/central');
      if (res.status === 401 || res.status === 403) {
        setAuthRequired(true);
        setData(null);
        return;
      }
      if (res.ok) {
        try {
          const json = await res.json();
          if (json && typeof json === 'object' && Array.isArray(json.tenants)) {
            setData(json);
            setAuthRequired(false);
            if (json.docs?.length > 0 && !selectedDoc) {
              setSelectedDoc(json.docs[0]);
            }
          } else {
            setAuthRequired(true);
            setData(null);
          }
        } catch {
          setAuthRequired(true);
          setData(null);
        }
      } else {
        setAuthRequired(true);
        setData(null);
      }
    } catch (e) {
      console.error('Error loading Central:', e);
      setAuthRequired(true);
      setData(null);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      setAuthRequired(true);
      setData(null);
    } catch (e) {
      console.error('Error logging out:', e);
    }
  };

  useEffect(() => {
    fetchCentralState();
  }, []);

  const postAction = async (action: string, payload: any) => {
    setSyncing(true);
    try {
      const res = await fetch('/api/central', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      if (res.ok) {
        await fetchCentralState();
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleReviewSession = async (id: string, reviewStatus: 'approved' | 'changes_requested') => {
    const karc0Feedback = feedbackMap[id] || (reviewStatus === 'approved' ? 'Aprobado por karc0 en Central.' : 'Solicito ajustes.');
    await postAction('review_session', { id, reviewStatus, karc0Feedback });
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle.trim()) return;
    await postAction('create_incident', {
      severity: incSeverity,
      affectedZone: incZone,
      affectedTenant: incTenant,
      title: incTitle,
      description: incDesc,
    });
    setIncTitle('');
    setIncDesc('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgSubject.trim() || !msgBody.trim()) return;
    await postAction('send_mailbox_message', {
      sender: 'karc0',
      recipient: 'antigravity',
      subject: msgSubject,
      body: msgBody,
      category: 'order',
      priority: msgPriority,
    });
    setMsgSubject('');
    setMsgBody('');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await postAction('upsert_task', {
      title: taskTitle,
      description: taskDesc,
      zone: taskZone,
      priority: taskPriority,
      status: 'pending',
      assignedTo: 'antigravity',
      dueLabel: 'Asignado desde Central',
    });
    setTaskTitle('');
    setTaskDesc('');
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.businessName.trim() || !tenantForm.customSubdomain.trim()) return;
    const chosenPalette = getPaletteById(tenantForm.paletteId);
    const slug = tenantForm.id || tenantForm.businessName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Save Author Theme Config immediately for this new salon
    saveSalonThemeConfig(slug, {
      tenantSlug: slug,
      salonName: tenantForm.businessName.trim(),
      tagline: `${tenantForm.niche === 'spa' ? 'Spa & Wellness' : 'Beauty Atelier'} · ${tenantForm.city}`,
      heroHeadline: tenantForm.businessName.trim(),
      heroSubheadline: tenantForm.slogan,
      paletteId: tenantForm.paletteId,
      typographyId: tenantForm.typographyId,
      layoutId: tenantForm.layoutId,
      whatsappPhone: tenantForm.whatsappPhone,
      instagramHandle: tenantForm.instagramHandle,
      addressLine: tenantForm.city,
      loyaltyStampsGoal: tenantForm.loyaltyStampsTarget,
      loyaltyRewardTitle: tenantForm.loyaltyRewardTitle,
      showVipPassport: true,
      showCurrencyDual: true,
    });

    const initialZones = tenantForm.initialZonesCsv
      .split(',')
      .map((z) => z.trim())
      .filter(Boolean)
      .map((name) => ({ name, description: `Área especializada de ${name}`, capacity: 2 }));
    const initialStaff = tenantForm.initialStaffCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((fullName, idx) => ({
        fullName,
        roleTitle: idx === 0 ? 'Directora & Master Artist' : 'Especialista Certificada',
        commissionPct: idx === 0 ? 100 : 50,
      }));
    await postAction('create_tenant_wizard', {
      ...tenantForm,
      id: slug,
      primaryColor: chosenPalette.primary,
      accentColor: chosenPalette.secondary,
      initialZones,
      initialStaff,
    });
    setShowTenantModal(false);
  };

  if (authRequired) {
    return (
      <CentralAuthGate
        onAuthenticated={() => {
          setAuthRequired(false);
          fetchCentralState();
        }}
        onNavigateToSaaS={onNavigateToSaaSLanding}
      />
    );
  }

  const openIncidentsCount = (data?.incidents || []).filter((i: any) => i.status !== 'resolved').length;
  const pendingSessionsCount = (data?.sessions || []).filter((s: any) => s.review_status === 'pending_review').length;
  const pendingTasksCount = (data?.tasks || []).filter((t: any) => t.status !== 'completed').length;

  const CENTRAL_HEADINGS: Record<string, { title: string; subtitle: string }> = {
    overview: {
      title: 'Gobernanza & Ecosistema VANESEV',
      subtitle: 'Control maestro de sedes activas, diseño de autor, motor QR y analítica de mercado.',
    },
    tenants: {
      title: 'Salones & Fichas de Clientes',
      subtitle: 'Da de alta nuevos salones en 1 clic, edita su paleta visual o entra a su panel administrativo.',
    },
    qr: {
      title: 'Motor QR & Analítica de Escaneos',
      subtitle: 'Genera y audita los códigos QR permanentes (/m/<slug>) de todos los salones.',
    },
    competitors: {
      title: 'Radar de Competidores Beauty Tech',
      subtitle: 'Mapa comparativo de virtudes, debilidades y diferenciación de VANESEV en el sector.',
    },
    mailbox: {
      title: 'Buzón Directo karc0 ↔ Agente',
      subtitle: 'Canal de órdenes prioritarias y seguimiento operativo sincronizado en Neon DB.',
    },
    sessions: {
      title: 'Auditoría de Sesiones & Reportes',
      subtitle: 'Historial de despliegues, aprobaciones de karc0 y estado de la infraestructura.',
    },
    tasks_roadmap: {
      title: 'Tareas & Hoja de Ruta',
      subtitle: 'Planificación técnica y comercial por zonas operativas.',
    },
    incidents: {
      title: 'Control de Incidencias',
      subtitle: 'Registro y resolución de alertas en tiempo real.',
    },
    docs: {
      title: 'Documentación & Manuales',
      subtitle: 'Repositorio técnico sincronizado con la base de datos central.',
    },
  };

  const currentHeading = CENTRAL_HEADINGS[activeTab] || CENTRAL_HEADINGS.overview;
  const tenantsCount = Math.max(2, (data?.tenants || []).length);

  return (
    <div className="min-h-screen bg-[#E6E6EB] text-[#18181B] font-sans p-2 sm:p-4 lg:p-6">
      {/* ── VERTIX OUTER ROUNDED APPLICATION CONTAINER ── */}
      <div className="max-w-[1440px] mx-auto bg-[#F5F5F8] rounded-[28px] sm:rounded-[34px] p-4 sm:p-6 lg:p-7 shadow-[0_14px_45px_rgba(0,0,0,0.05)] border border-white min-h-[calc(100vh-48px)] flex flex-col">

        {/* ── VERTIX TOP HEADER BAR (1 SINGLE CLEAN ROW) ── */}
        <header className="flex items-center justify-between gap-3">
          {/* Left: Circular Coral Brand Mark + Crisp Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white shadow-xs"
              style={{ background: 'linear-gradient(135deg, #F26A3D 0%, #D94824 100%)' }}
            >
              V
            </div>
            <span className="font-bold text-[#18181B] text-sm sm:text-base tracking-tight truncate">
              Vanesev Central
            </span>
          </div>

          {/* Center: Floating White Capsule Pill Bar (6 Clean 1-Word Tabs like Vertix Screenshot 1) */}
          <nav className="hidden lg:flex items-center gap-1 bg-white rounded-full p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03]">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'tenants', label: 'Salones' },
              { id: 'qr', label: 'Motor QR' },
              { id: 'competitors', label: 'Mercado' },
              { id: 'mailbox', label: 'Buzón' },
              { id: 'sessions', label: 'Reportes' },
            ].map((pill) => {
              const active = activeTab === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveTab(pill.id as any)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#18181B] text-white shadow-2xs'
                      : 'text-[#52525B] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Two Floating White Capsules (Utility Icons Pill + karc0 Profile Pill) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="bg-white rounded-full px-2.5 sm:px-3.5 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tenants');
                  setShowTenantModal(true);
                }}
                className="text-[#F26A3D] hover:text-[#D94824] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                title="Crear Nuevo Salón Cliente"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Nuevo Salón</span>
              </button>
              <button
                type="button"
                onClick={fetchCentralState}
                disabled={syncing}
                className="text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
                title="Sincronizar Neon DB"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#F26A3D]' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onNavigateToSaaSLanding}
                className="text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                title="Abrir Web Comercial vanesev.com"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Web</span>
              </button>
            </div>

            <div className="bg-white rounded-full pl-1.5 pr-3 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #18181B 0%, #3F3F46 100%)' }}
              >
                K
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-[11px] font-bold text-[#18181B]">karc0 &bull; Super-Admin</p>
                <p className="text-[9px] text-[#10B981] font-semibold">● Neon DB Live</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 text-[#A1A1AA] hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                title="Cerrar Sesión de Central"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* ── MOBILE HORIZONTAL CAPSULE SWITCHER ── */}
        <div className="lg:hidden mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar bg-white rounded-full p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03]">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'tenants', label: 'Salones' },
            { id: 'qr', label: 'Motor QR' },
            { id: 'competitors', label: 'Mercado' },
            { id: 'mailbox', label: 'Buzón' },
            { id: 'sessions', label: 'Reportes' },
            { id: 'tasks_roadmap', label: 'Tareas' },
            { id: 'docs', label: 'Docs' },
          ].map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  active
                    ? 'bg-[#18181B] text-white shadow-2xs'
                    : 'text-[#52525B] hover:text-[#18181B]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ── VERTIX BODY WORKSPACE (LEFT 3 FLOATING ICON CAPSULES + MAIN BENTO WORKSPACE) ── */}
        <div className="flex gap-5 lg:gap-7 mt-5 sm:mt-6 flex-1">

          {/* Left Column: 3 Floating Vertical White Icon Capsules */}
          <aside className="hidden md:flex flex-col justify-between items-center w-11 shrink-0 select-none">
            {/* Top Mini Capsule */}
            <div className="w-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] py-2 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tenants');
                  setShowTenantModal(true);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#F26A3D] hover:bg-[#FFF0EC] transition-all cursor-pointer"
                title="Alta de Nuevo Salón"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tenants');
                  setEditingTenantThemeSlug('capra-studio');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6] transition-all cursor-pointer"
                title="Personalizar Tema de Capra Studio"
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Main Capsule (7 Icons) */}
            <div className="w-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] py-2.5 flex flex-col items-center gap-2">
              {[
                { id: 'overview', Icon: Activity, title: 'Overview General' },
                { id: 'tenants', Icon: Crown, title: 'Salones & Fichas de Clientes' },
                { id: 'qr', Icon: QrCode, title: 'Motor QR & Escaneos' },
                { id: 'competitors', Icon: Crosshair, title: 'Radar de Competidores' },
                { id: 'mailbox', Icon: MessageSquare, title: 'Buzón karc0 ↔ Agente' },
                { id: 'tasks_roadmap', Icon: Layers, title: 'Tareas & Hoja de Ruta' },
                { id: 'docs', Icon: FileText, title: 'Documentación & Reportes' },
              ].map(({ id, Icon, title }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id as any)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      active
                        ? 'bg-[#18181B] text-white shadow-xs'
                        : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                    }`}
                    title={title}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Bottom Mini Capsule */}
            <div className="w-11 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-black/[0.03] py-2 flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeTab === 'incidents'
                    ? 'bg-[#18181B] text-white'
                    : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6]'
                }`}
                title="Incidencias"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNavigateToSaaSLanding}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F6] transition-all cursor-pointer"
                title="Ir a Web Comercial vanesev.com"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </aside>

          {/* ── MAIN CONTENT AREA ── */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* Dynamic Vertix Page Title + 1-Line Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-[#18181B] tracking-tight leading-tight">
                  {currentHeading.title}
                </h1>
                <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
                  {currentHeading.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onNavigateToTenant('capra-studio', false)}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FFF0EC] text-[#E35633] border border-[#F5CFC4] text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Carta Capra</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTenant('capra-studio', true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#18181B] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <span>Admin Capra</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TAB 0: OVERVIEW — EXACT VERTIX 2x2 BENTO GRID (SCREENSHOT 1)
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* BENTO 1 (TOP-LEFT, 7 COLS): WARM CORAL-TERRACOTTA HERO CARD WITH PROGRESS BAR */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="lg:col-span-7 rounded-[24px] p-6 sm:p-7 text-white shadow-sm flex flex-col justify-between min-h-[240px] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #F27449 0%, #E35633 55%, #C94122 100%)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md font-semibold text-[11px]">
                      <Crown className="w-3.5 h-3.5" />
                      <span>Super-Admin Multi-Sede &bull; karc0</span>
                    </span>
                    <span className="text-[11px] text-white/85 font-medium">
                      Neon Postgres 18 Activo
                    </span>
                  </div>

                  <div className="my-5">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
                        {tenantsCount} Sedes
                      </span>
                      <span className="text-sm text-white/90 font-medium">
                        activas &bull; {(data.staff || []).length || 4} especialistas &bull; {(data.zones || []).length || 6} cabinas
                      </span>
                    </div>

                    {/* Vertix Progress Bar with Diagonal Hash Track */}
                    <div className="mt-4 h-2.5 w-full rounded-full overflow-hidden flex items-center bg-black/15 p-0.5">
                      <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: '68%' }} />
                      <div
                        className="h-full flex-1 ml-1 rounded-r-full"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(-55deg, rgba(255,255,255,0.45), rgba(255,255,255,0.45) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/85 mt-1.5 font-medium">
                      <span>Arquitectura 4 Zonas Aisladas</span>
                      <span>Enrutamiento /m/&lt;slug&gt; sin subdominios</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('tenants');
                        setShowTenantModal(true);
                      }}
                      className="px-4 py-2 rounded-full bg-white text-[#18181B] text-xs font-bold shadow-xs hover:scale-[1.02] transition-transform flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#E35633]" />
                      <span>Alta de Nuevo Salón</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tenants')}
                      className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md transition-colors cursor-pointer"
                    >
                      Ver Fichas de Clientes
                    </button>
                  </div>
                </motion.div>

                {/* BENTO 2 (TOP-RIGHT, 5 COLS): WHITE TIER BENEFITS / ESTADO DE ZONAS CARD */}
                <div className="lg:col-span-5 bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#18181B]">Estado de Arquitectura &amp; Zonas</h3>

                    <div className="mt-3 bg-[#F4F4F6] rounded-full p-1 inline-flex items-center gap-1">
                      {[
                        { id: 'zones' as const, label: '4 Zonas' },
                        { id: 'database' as const, label: 'Neon Cloud' },
                        { id: 'governance' as const, label: 'Gobernanza' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOverviewTier(tab.id)}
                          className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            overviewTier === tab.id
                              ? 'bg-white text-[#18181B] shadow-2xs'
                              : 'text-[#71717A] hover:text-[#18181B]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {(overviewTier === 'zones'
                        ? [
                            'Zona 1 (vanesev.com): Web Comercial SaaS sin enlaces a Central',
                            'Zona 2 (/central): Super-Admin exclusivo de karc0',
                            'Zona 3 (/<slug>/admin): Panel Vertix aislado por salón',
                            'Zona 4 (/m/<slug>): Catálogo QR y Pasaporte VIP para clientas',
                          ]
                        : overviewTier === 'database'
                        ? [
                            `${tenantsCount} salones registrados con aislamiento multi-tenant`,
                            'Motor de temas de autor (6 paletas + 3 tipografías + 3 layouts)',
                            'Fotografía editorial local verificada libre de errores externos',
                            'Sincronización atómica de servicios, citas y sellos VIP',
                          ]
                        : [
                            `${pendingSessionsCount} sesiones listas para auditoría en Central`,
                            `${pendingTasksCount} tareas operativas en hoja de ruta`,
                            '4 competidores auditados en Radar de Mercado',
                            'Despliegue continuo en Vercel Cloud sin compilación local',
                          ]
                      ).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-[#27272A]">
                          <span className="w-4 h-4 rounded-full bg-[#FFF0EC] text-[#E35633] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#A1A1AA] mt-4 pt-3 border-t border-zinc-100">
                    Aislamiento estricto entre Web Comercial, Central, Admin y Catálogos QR
                  </p>
                </div>

                {/* BENTO 3 (BOTTOM-LEFT, 7 COLS): WHITE OFFERS / ACCESOS RÁPIDOS CARD (3 SUB-CARDS) */}
                <div className="lg:col-span-7 bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#18181B]">Módulos &amp; Sedes Destacadas</h3>
                      <p className="text-xs text-[#71717A] mt-0.5">
                        Inspecciona o personaliza cualquier sede y herramienta desde un solo lugar.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0EC] text-[#E35633] text-[10px] font-bold">
                      Operativo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
                    {/* Sub-Card 1 */}
                    <div className="rounded-[18px] p-4 bg-[#FFF8F6] border border-[#F5CFC4] flex flex-col justify-between min-h-[155px]">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#E35633] mb-3">
                          <Crown className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#18181B]">Capra Studio (Sede #1)</p>
                        <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                          Cejas, Pestañas, Alisados, Maquillaje &amp; Capra Academy.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <button
                          type="button"
                          onClick={() => onNavigateToTenant('capra-studio', false)}
                          className="text-[10px] font-bold text-[#E35633] hover:underline cursor-pointer"
                        >
                          Ver Carta
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateToTenant('capra-studio', true)}
                          className="px-3 py-1 rounded-full bg-[#F26A3D] text-white text-[10px] font-bold cursor-pointer shadow-2xs"
                        >
                          Abrir Admin
                        </button>
                      </div>
                    </div>

                    {/* Sub-Card 2 */}
                    <div className="rounded-[18px] p-4 bg-[#F8F8FA] border border-black/[0.04] flex flex-col justify-between min-h-[155px]">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#18181B] mb-3">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#18181B]">Generador QR `/m/`</p>
                        <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                          Crea códigos QR de recepción y enlaces para nuevos clientes.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <span className="text-[10px] text-[#A1A1AA] font-medium">Sin subdominios</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('qr')}
                          className="px-3 py-1 rounded-full bg-[#18181B] text-white text-[10px] font-bold cursor-pointer"
                        >
                          Gestionar
                        </button>
                      </div>
                    </div>

                    {/* Sub-Card 3 */}
                    <div className="rounded-[18px] p-4 bg-[#F8F8FA] border border-black/[0.04] flex flex-col justify-between min-h-[155px]">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-black/5 flex items-center justify-center text-[#18181B] mb-3">
                          <Crosshair className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#18181B]">Radar Competencia</p>
                        <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">
                          Auditoría de Fresha, AgendaPro, Booksy y Treatwell.
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-3 mt-2">
                        <span className="text-[10px] text-[#A1A1AA] font-medium">4 auditados</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('competitors')}
                          className="px-3 py-1 rounded-full bg-[#18181B] text-white text-[10px] font-bold cursor-pointer"
                        >
                          Ver Mapa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BENTO 4 (BOTTOM-RIGHT, 5 COLS): WHITE SALONES & ACTIVIDAD RECIENTE CARD */}
                <div className="lg:col-span-5 bg-white rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-black/[0.03] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-[#18181B]">Salones Registrados en Red</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tenants')}
                        className="text-[11px] font-semibold text-[#E35633] hover:underline cursor-pointer"
                      >
                        Ver todos &rarr;
                      </button>
                    </div>

                    <div className="divide-y divide-zinc-100">
                      {[
                        {
                          id: 'capra-studio',
                          name: 'Capra Studio · By María Capra',
                          sub: '/m/capra-studio · Paleta Rose Cashmere',
                          amount: '$29/mes',
                        },
                        {
                          id: 'andrea-nails',
                          name: 'Andrea Labrador Nails Studio',
                          sub: 'Cliente Externo Legacy Aislado',
                          amount: '$19/mes',
                        },
                        ...(data.tenants || [])
                          .filter((t: any) => t.id !== 'capra-studio' && t.id !== 'andrea-nails')
                          .slice(0, 2)
                          .map((t: any) => ({
                            id: t.id,
                            name: t.business_name,
                            sub: `/m/${t.custom_subdomain || t.id}`,
                            amount: `$${t.monthly_fee_usd || 29}/mes`,
                          })),
                      ].map((row) => (
                        <div key={row.id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#FFF3EF] text-[#E35633] flex items-center justify-center shrink-0">
                              <Crown className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#18181B] truncate">{row.name}</p>
                              <p className="text-[10px] text-[#A1A1AA] truncate">{row.sub}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-[#10B981] tabular-nums">{row.amount}</span>
                            <button
                              type="button"
                              onClick={() => onNavigateToTenant(row.id, true)}
                              className="px-2.5 py-1 rounded-full bg-[#F4F4F6] hover:bg-[#18181B] hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Admin
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && activeTab !== 'overview' ? (
              <div className="p-16 text-center rounded-[24px] bg-white border border-black/[0.03] shadow-xs">
                <RefreshCw className="w-8 h-8 text-[#E35633] animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#71717A]">Sincronizando ecosistema de salones desde Neon Postgres 18...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: REVISIÓN DE SESIONES & APROBACIÓN DE KARC0 */}
                {activeTab === 'sessions' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-amber-200 shadow-xs">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-amber-800 font-bold">
                      AUDITORÍA PAUSADA & APROBACIÓN EJECUTIVA
                    </span>
                    <h2 className="text-xl font-bold text-[#0F172A] mt-1">
                      Bitácora de Sesiones de Antigravity (Persistida en Neon DB)
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Aquí te dejo cargado cada elemento construido, decisiones tomadas y archivos modificados en cada sesión. Puedes revisarlo con calma, dejarme tus instrucciones y pulsar <b>Aprobar</b> o <b>Pedir Cambios</b>.
                    </p>
                  </div>
                </div>

                {(data.sessions || []).map((ses: any) => {
                  const elements = Array.isArray(ses.elements_built) ? ses.elements_built : [];
                  const decisions = Array.isArray(ses.decisions_logged) ? ses.decisions_logged : [];
                  const isApproved = ses.review_status === 'approved';
                  const isChanges = ses.review_status === 'changes_requested';

                  return (
                    <div key={ses.id} className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden shadow-xs">
                      <div className="p-6 border-b border-[#E2E8F0] flex flex-wrap items-start justify-between gap-4 bg-[#F8FAFC]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5 mb-2">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200">
                              ID: {ses.id}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                              Agente: {ses.agent_name}
                            </span>
                            <span
                              className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isChanges
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isApproved ? '✓ APROBADA POR KARC0' : isChanges ? '⚠ CAMBIOS SOLICITADOS' : '⏳ PENDIENTE DE TU REVISIÓN'}
                            </span>
                          </div>
                          <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">{ses.title}</h3>
                          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ses.summary}</p>
                        </div>
                      </div>

                      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Elements Built */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-800 font-bold">
                            Elementos Construidos y Entregados en esta Sesión
                          </h4>
                          <div className="space-y-2">
                            {elements.map((el: any, i: number) => (
                              <div key={i} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-3">
                                <span className="text-sm text-slate-800 font-medium">{el.item}</span>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                  {el.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Decisions Logged */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-800 font-bold">
                            Decisiones Arquitectónicas Registradas
                          </h4>
                          <div className="space-y-2">
                            {decisions.map((dec: any, i: number) => (
                              <div key={i} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                                <p className="text-sm font-bold text-[#0F172A]">{dec.decision}</p>
                                <p className="text-xs text-slate-600 mt-1">{dec.rationale}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Karc0 Review & Response Box */}
                      <div className="p-6 bg-[#F8FAFC] border-t border-[#E2E8F0] space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-amber-900 font-bold">
                            Tu Respuesta / Instrucciones sobre esta Sesión (Se guarda en Neon DB para el Agente):
                          </label>
                          {ses.karc0_feedback && (
                            <span className="text-xs text-emerald-700 font-mono">
                              Última nota guardada: "{ses.karc0_feedback}"
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={feedbackMap[ses.id] ?? ses.karc0_feedback ?? ''}
                            onChange={(e) => setFeedbackMap({ ...feedbackMap, [ses.id]: e.target.value })}
                            placeholder="Escribe aquí tus observaciones, qué aprobar o qué ajustar en la siguiente sesión..."
                            className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleReviewSession(ses.id, 'approved')}
                              className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
                            >
                              <Check className="w-4 h-4" />
                              Aprobar Sesión
                            </button>
                            <button
                              onClick={() => handleReviewSession(ses.id, 'changes_requested')}
                              className="px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                            >
                              <XCircle className="w-4 h-4" />
                              Pedir Cambios
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: BUZÓN DE EMERGENCIA (REPORTE INMEDIATO DE FALLOS EN VIVO) */}
            {activeTab === 'incidents' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-4 h-fit">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <h3 className="text-base font-bold uppercase tracking-wider text-[#0F172A]">Reportar Fallo o Emergencia</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Si mientras pruebas desde tu móvil o PC ves cualquier detalle que falle o quieras corregir al instante, anótalo aquí. Queda grabado en Neon DB como prioridad máxima.
                  </p>
                  <form onSubmit={handleCreateIncident} className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Severidad</label>
                      <select
                        value={incSeverity}
                        onChange={(e) => setIncSeverity(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] focus:bg-white"
                      >
                        <option value="critical">🔥 Crítica (Atacar de inmediato)</option>
                        <option value="high">⚡ Alta (Corregir en la sesión actual)</option>
                        <option value="medium">🔧 Media (Ajuste visual o funcional)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Zona Afectada</label>
                      <select
                        value={incZone}
                        onChange={(e) => setIncZone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] focus:bg-white"
                      >
                        <option value="ZONA 1 · LANDING VANESEV">ZONA 1 · Web Comercial vanesev.com</option>
                        <option value="ZONA 2 · CENTRAL">ZONA 2 · Panel Central de karc0</option>
                        <option value="ZONA 3 · ADMIN PRO V2">ZONA 3 · Admin Pro V2 del Salón</option>
                        <option value="ZONA 4 · CATÁLOGO & FICHA VIP">ZONA 4 · Catálogo & Ficha VIP Cliente</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Negocio / Salón</label>
                      <select
                        value={incTenant}
                        onChange={(e) => setIncTenant(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A] focus:bg-white"
                      >
                        <option value="all">Todos / Plataforma General</option>
                        <option value="capra-studio">Capra Studio (@caprastudio_)</option>
                        <option value="andrea-nails">Andrea Labrador Nails</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Título corto del fallo</label>
                      <input
                        type="text"
                        required
                        value={incTitle}
                        onChange={(e) => setIncTitle(e.target.value)}
                        placeholder="Ej: Botón de reserva en móvil no abre..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Detalle de lo que viste</label>
                      <textarea
                        rows={3}
                        value={incDesc}
                        onChange={(e) => setIncDesc(e.target.value)}
                        placeholder="Describe qué hiciste y qué debería pasar..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
                    >
                      Registrar en Buzón de Emergencia
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-[#0F172A]">Historial de Incidencias & Errores Solucionados</h3>
                  {(data.incidents || []).map((inc: any) => (
                    <div
                      key={inc.id}
                      className={`p-5 rounded-2xl border ${
                        inc.status === 'resolved'
                          ? 'bg-white border-[#E2E8F0]'
                          : 'bg-rose-50/60 border-rose-300'
                      } space-y-3 shadow-xs`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase font-bold ${
                              inc.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {inc.status === 'resolved' ? '✓ SOLUCIONADO' : '🔥 ABIERTO · ' + inc.severity}
                          </span>
                          <span className="text-xs font-mono text-slate-500">{inc.affected_zone}</span>
                          <span className="text-xs font-mono text-amber-800">({inc.affected_tenant})</span>
                        </div>
                        {inc.status !== 'resolved' && (
                          <button
                            onClick={() => postAction('update_incident', { id: inc.id, status: 'resolved', resolutionNote: 'Marcado como resuelto desde Central.' })}
                            className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                          >
                            Marcar Resuelto
                          </button>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-[#0F172A]">{inc.title}</h4>
                      <p className="text-sm text-slate-600">{inc.description}</p>
                      {inc.agent_resolution_note && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                          <b>Solución aplicada por Agente:</b> {inc.agent_resolution_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: BUZÓN INTERACTIVO KARC0 <-> AGENTE */}
            {activeTab === 'mailbox' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-4 h-fit">
                  <div className="flex items-center gap-2 text-amber-800">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-bold uppercase tracking-wider text-[#0F172A]">Dejar Orden o Nota al Agente</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Escribe aquí cualquier idea, requerimiento, cambio de precios o instrucción mientras navegas. Cuando abras sesión conmigo y me digas <i>"lee el buzón de Central"</i>, lo tendré todo cargado al instante.
                  </p>
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Asunto / Tema</label>
                      <input
                        type="text"
                        required
                        value={msgSubject}
                        onChange={(e) => setMsgSubject(e.target.value)}
                        placeholder="Ej: Nuevos servicios para Capra Studio..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Prioridad</label>
                      <select
                        value={msgPriority}
                        onChange={(e) => setMsgPriority(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A]"
                      >
                        <option value="high">Alta Prioridad</option>
                        <option value="normal">Normal / Idea futura</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 block mb-1">Mensaje detallado para Antigravity</label>
                      <textarea
                        rows={4}
                        required
                        value={msgBody}
                        onChange={(e) => setMsgBody(e.target.value)}
                        placeholder="Escribe aquí todo lo que quieras que ejecute..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <Send className="w-4 h-4" />
                      Guardar en Buzón de Neon DB
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-[#0F172A]">Bandeja de Comunicaciones (karc0 ↔ Antigravity)</h3>
                  {(data.mailbox || []).map((m: any) => {
                    const fromKarc0 = m.sender === 'karc0';
                    return (
                      <div
                        key={m.id}
                        className={`p-5 rounded-2xl border ${
                          fromKarc0
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-white border-[#E2E8F0]'
                        } space-y-2 shadow-xs`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase ${
                                fromKarc0 ? 'bg-amber-500 text-white' : 'bg-purple-50 text-purple-800 border border-purple-200'
                              }`}
                            >
                              {fromKarc0 ? '👑 DE: KARC0 (DIRECTOR)' : '🤖 DE: ANTIGRAVITY'}
                            </span>
                            <span className="text-xs font-mono text-slate-500">→ PARA: {m.recipient.toUpperCase()}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(m.created_at).toLocaleString('es-VE')}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#0F172A]">{m.subject}</h4>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{m.body}</p>
                        {m.related_doc_path && (
                          <p className="text-xs font-mono text-amber-800 pt-1">
                            📄 Doc vinculado: {m.related_doc_path}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: TAREAS PENDIENTES, CRONOGRAMA DE LANZAMIENTO & ARQUITECTURA */}
            {activeTab === 'tasks_roadmap' && (
              <div className="space-y-8">
                {/* ARCHITECTURE COMPARISON: ACTUAL VS PROYECTADA */}
                <div className="p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-amber-800 font-bold">
                        MAPA DE INGENIERÍA EN VIVO
                      </span>
                      <h3 className="text-xl font-bold text-[#0F172A]">Estructura Actual vs. Proyectada de las 4 Zonas</h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      {
                        zone: 'ZONA 1 · COMERCIAL',
                        title: 'Web de Venta vanesev.com',
                        status: 'OPERATIVA EN STAGING',
                        desc: 'Landing SaaS de autor para captar salones, barberías y clínicas estéticas en Venezuela con acceso directo a demos.',
                      },
                      {
                        zone: 'ZONA 2 · CENTRAL',
                        title: 'Super-Admin de karc0 (/central)',
                        status: '100% OPERATIVA EN NEON',
                        desc: 'Revisión de sesiones, buzón de emergencia, buzón interactivo, tareas, documentación y creador de salones con subdominio.',
                      },
                      {
                        zone: 'ZONA 3 · ADMIN PRO V2',
                        title: 'ERP del Salón (/admin)',
                        status: '100% OPERATIVA EN NEON',
                        desc: 'Agenda, Finanzas USD/Bs BCV, Personal y Comisiones (staff_members), Zonas (studio_zones) y Fidelización de 5 sellos.',
                      },
                      {
                        zone: 'ZONA 4 · PWA & FICHA VIP',
                        title: 'Catálogo + App de Clienta',
                        status: '100% OPERATIVA EN NEON',
                        desc: 'Perfiles de Andrea Labrador V2 y Capra Studio (6 áreas + Cursos) con Ficha VIP conectada a citas reales y guía visual.',
                      },
                    ].map((z, i) => (
                      <div key={i} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold">{z.zone}</span>
                          <h4 className="text-base font-bold text-[#0F172A] mt-1">{z.title}</h4>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{z.desc}</p>
                        </div>
                        <span className="inline-block w-fit px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ● {z.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TASKS BACKLOG + ADD TASK */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-4 h-fit">
                    <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider">Agregar Tarea Pendiente</h3>
                    <form onSubmit={handleCreateTask} className="space-y-3">
                      <input
                        type="text"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Título de la tarea..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-amber-500"
                      />
                      <select
                        value={taskZone}
                        onChange={(e) => setTaskZone(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A]"
                      >
                        <option value="ZONA 2 · CENTRAL">ZONA 2 · CENTRAL</option>
                        <option value="ZONA 4 · CAPRA STUDIO">ZONA 4 · CAPRA STUDIO</option>
                        <option value="ZONA 3 · ANDREA V2">ZONA 3 · ANDREA V2</option>
                        <option value="ZONA 1 · WEB COMERCIAL">ZONA 1 · WEB COMERCIAL</option>
                        <option value="INFRAESTRUCTURA CLOUD">INFRAESTRUCTURA CLOUD</option>
                      </select>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm text-[#0F172A]"
                      >
                        <option value="critical">Prioridad Crítica</option>
                        <option value="high">Prioridad Alta</option>
                        <option value="medium">Prioridad Media</option>
                      </select>
                      <textarea
                        rows={3}
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        placeholder="Especificaciones para el agente..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs uppercase tracking-wider shadow-xs"
                      >
                        Guardar Tarea en Neon DB
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-[#0F172A]">Tablero de Tareas Pendientes & Cronograma</h3>
                    {(data.tasks || []).map((t: any) => (
                      <div key={t.id} className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">{t.zone}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-100 text-slate-700">
                              Resp: {t.assigned_to}
                            </span>
                            <span className="text-xs font-mono text-emerald-700">{t.due_label}</span>
                          </div>
                          <h4 className="text-sm font-bold text-[#0F172A]">{t.title}</h4>
                          <p className="text-xs text-slate-600">{t.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={t.status}
                            onChange={(e) => postAction('upsert_task', { ...t, assignedTo: t.assigned_to, dueLabel: t.due_label, karc0Notes: t.karc0_notes, status: e.target.value })}
                            className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0F172A]"
                          >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="in_progress">⚡ En Curso</option>
                            <option value="completed">✓ Completada</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: SALONES (TENANTS), FICHAS DE CLIENTES & PERSONALIZADOR DE TEMAS */}
            {activeTab === 'tenants' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-[#1E181A]/8 shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E475B] block mb-1">
                      GOBERNADOR MULTI-SEDE &bull; LIBERTAD ABSOLUTA DE EDICIÓN
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#1E181A]">
                      Salones Activos, Fichas de Clientes &amp; Diseño de Cartas
                    </h2>
                    <p className="text-xs sm:text-sm text-[#6E6266] mt-1">
                      Crea nuevos clientes, edita su paleta de colores y tipografía en vivo, o entra directamente a su Admin para gestionar sus servicios, citas y equipo.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTenantModal(true)}
                    className="px-5 py-3 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer hover:opacity-95"
                    style={{ background: 'linear-gradient(135deg, #9E475B 0%, #C87D65 100%)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Crear Nuevo Salón / Cliente
                  </button>
                  <button
                    onClick={() => {
                      setCreatedStaffResult(null);
                      setStaffError(null);
                      setShowStaffModal(true);
                    }}
                    className="px-5 py-3 rounded-full bg-[#18181B] hover:bg-black text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Alta de Personal
                  </button>
                </div>

                {/* EMBEDDED SALON THEME STUDIO WHEN EDITING A CLIENT'S DESIGN */}
                {editingTenantThemeSlug && (
                  <div className="bg-white rounded-[32px] border-2 border-[#9E475B]/25 shadow-xl p-6 sm:p-8 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1E181A]/10">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-full bg-[#FAF0F2] text-[#9E475B] text-[10px] font-bold uppercase tracking-widest">
                          Modo Super-Admin &bull; Edición en Vivo
                        </span>
                        <span className="text-xs font-mono text-[#6E6266]">
                          Sede: <strong>{editingTenantThemeSlug}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigateToTenant(editingTenantThemeSlug, true)}
                          className="px-4 py-2 rounded-full bg-[#1E181A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Ir al Admin Completo de esta Sede</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTenantThemeSlug(null)}
                          className="p-2 rounded-full bg-[#FAF7F2] hover:bg-rose-50 text-[#1E181A] hover:text-rose-700 border border-[#1E181A]/10 cursor-pointer"
                          title="Cerrar editor de diseño"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <SalonThemeStudio
                      tenantSlug={editingTenantThemeSlug}
                      onOpenPublicCatalog={() => onNavigateToTenant(editingTenantThemeSlug, false)}
                      onSaved={() => fetchCentralState()}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(data.tenants || []).map((ten: any) => {
                    const tenantStaff = (data.staff || []).filter((s: any) => s.tenant_id === ten.id);
                    const tenantZones = (data.zones || []).filter((z: any) => z.tenant_id === ten.id);
                    const liveTheme = getSalonThemeConfig(ten.id);
                    const livePalette = getPaletteById(liveTheme.paletteId);
                    const isLegacyAndrea = ten.id === 'andrea-nails';

                    return (
                      <motion.div
                        key={ten.id}
                        whileHover={{ y: -3 }}
                        className="rounded-[28px] bg-white border border-[#1E181A]/8 shadow-xs overflow-hidden flex flex-col justify-between"
                      >
                        <div className="p-6 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div
                                className="w-13 h-13 rounded-2xl flex items-center justify-center font-display font-bold text-lg text-white shadow-md shrink-0"
                                style={{ background: isLegacyAndrea ? '#16291F' : livePalette.heroGradient }}
                              >
                                {(liveTheme.salonName || ten.business_name).slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-display text-lg font-bold text-[#1E181A]">
                                    {liveTheme.salonName || ten.business_name}
                                  </h3>
                                  {isLegacyAndrea ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                      Cliente Externo Aislado
                                    </span>
                                  ) : (
                                    <span
                                      className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                                      style={{ backgroundColor: livePalette.badgeBg, color: livePalette.badgeText }}
                                    >
                                      Paleta: {livePalette.name}
                                    </span>
                                  )}
                                  {ten.en_prueba && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
                                      En puesta a punto
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#6E6266] mt-0.5">
                                  {ten.owner_name} &bull; {liveTheme.instagramHandle || ten.instagram_handle} &bull; +{liveTheme.whatsappPhone || ten.whatsapp_phone}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {ten.subscription_status}
                            </span>
                          </div>

                          <p className="text-xs text-[#6E6266] italic">
                            &ldquo;{liveTheme.heroSubheadline || ten.slogan}&rdquo;
                          </p>

                          {/* Clean QR Route & Subdomain */}
                          <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#1E181A]/8 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E475B] block">
                              Rutas Activas (Generador QR `/m/` &amp; Subdominio):
                            </span>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#1E181A]">
                              <span className="font-bold">vanesev.com/m/{ten.id}</span>
                              <span className="text-[#9A8C90]">|</span>
                              <span>{ten.custom_subdomain}.vanesev.com</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5 text-center">
                            <div className="p-2.5 rounded-2xl bg-[#FAF7F2] border border-[#1E181A]/6">
                              <p className="text-[10px] text-[#9A8C90] uppercase font-bold">Equipo</p>
                              <p className="text-sm font-bold text-[#1E181A] mt-0.5">{tenantStaff.length} Pros</p>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-[#FAF7F2] border border-[#1E181A]/6">
                              <p className="text-[10px] text-[#9A8C90] uppercase font-bold">Cabinas</p>
                              <p className="text-sm font-bold text-[#1E181A] mt-0.5">{tenantZones.length} Áreas</p>
                            </div>
                            <div className="p-2.5 rounded-2xl bg-[#FAF7F2] border border-[#1E181A]/6">
                              <p className="text-[10px] text-[#9A8C90] uppercase font-bold">Pasaporte VIP</p>
                              <p className="text-sm font-bold text-[#9E475B] mt-0.5">
                                {liveTheme.loyaltyStampsGoal || ten.loyalty_stamps_target} Visitas
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-[#FAF7F2] border-t border-[#1E181A]/8 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTenantThemeSlug(ten.id)}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#FAF0F2] border border-[#9E475B]/30 text-[#9E475B] text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>Diseño &amp; Ficha</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToTenant(ten.id, true)}
                            className="py-2.5 px-3 rounded-xl bg-[#1E181A] hover:bg-[#33292C] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5 text-[#E6B89C]" />
                            <span>Entrar al Admin</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateToTenant(ten.id, false)}
                            className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#1E181A]/12 text-[#1E181A] text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#9E475B]" />
                            <span>Carta Pública</span>
                          </button>
                        </div>
                        <div className="p-3 bg-[#FAF7F2] border-t border-[#1E181A]/8 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setTrialModalType('create');
                              setTrialModalOrg(ten.id);
                              setTrialResult(null);
                              setTrialError(null);
                              setShowTrialModal(true);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                            <span>Crear acceso de prueba</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTrialModalType('reset');
                              setTrialModalOrg(ten.id);
                              setTrialResult(null);
                              setTrialError(null);
                              setShowTrialModal(true);
                            }}
                            className="py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-zinc-600" />
                            <span>Regenerar contraseña</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Sección de Peticiones de Puesta a Punto (Orden B1-c §2.3) */}
                <div className="bg-white rounded-[28px] border border-[#1E181A]/8 shadow-xs p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E181A]/8">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#1E181A]">Peticiones de Puesta a Punto</h3>
                      <p className="text-xs text-[#6E6266] mt-0.5">Historial y seguimiento de solicitudes enviadas por los salones en puesta a punto.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      {(data?.peticionesPuestaAPunto || []).length} Registradas
                    </span>
                  </div>
                  {(data?.peticionesPuestaAPunto || []).length === 0 ? (
                    <p className="text-xs text-[#9A8C90] py-6 text-center">No hay peticiones de puesta a punto registradas todavía.</p>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {(data?.peticionesPuestaAPunto || []).map((p: any) => (
                        <div key={p.id} className="py-3.5 flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1.5 min-w-0 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#18181B] bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200">
                                {p.sender}
                              </span>
                              {p.priority === 'high' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                  Requiere llamada
                                </span>
                              )}
                              <span className="text-[11px] text-zinc-400">
                                {p.created_at ? new Date(p.created_at).toLocaleString('es-ES') : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">{p.body}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                              p.estado === 'hecha' ? 'bg-emerald-100 text-emerald-800' :
                              p.estado === 'en_curso' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {p.estado || 'recibida'}
                            </span>
                            <select
                              value={p.estado || 'recibida'}
                              onChange={(e) => handleUpdatePeticionEstado(p.id, e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-zinc-300 text-xs bg-white text-zinc-800 cursor-pointer"
                            >
                              <option value="recibida">Recibida</option>
                              <option value="en_curso">En curso</option>
                              <option value="hecha">Hecha</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {showTenantModal && (
                  <div className="fixed inset-0 z-50 bg-[#1E181A]/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white border border-[#1E181A]/10 rounded-[32px] max-w-2xl w-full p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto shadow-2xl">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E475B] block">
                            ALTA DE CLIENTE MULTI-TENANT &bull; SIN PLANTILLAS HEREDADAS
                          </span>
                          <h3 className="font-display text-xl font-bold text-[#1E181A] mt-1">
                            Crear Nuevo Salón con Identidad de Autor Propia
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowTenantModal(false)}
                          className="p-2 rounded-full bg-[#FAF7F2] text-[#6E6266] hover:text-[#1E181A] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveTenant} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">Nombre del Salón / Clínica</label>
                            <input
                              type="text"
                              required
                              value={tenantForm.businessName}
                              onChange={(e) => {
                                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                                setTenantForm({ ...tenantForm, businessName: e.target.value, id: slug, customSubdomain: slug.replace(/-/g, '') });
                              }}
                              placeholder="Ej: Lumière Hair & Spa"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-sm text-[#1E181A] font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">Ruta QR (`/m/slug`) y Subdominio</label>
                            <input
                              type="text"
                              required
                              value={tenantForm.customSubdomain}
                              onChange={(e) => setTenantForm({ ...tenantForm, customSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                              placeholder="lumierespa"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-sm text-[#9E475B] font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Selector de Paleta de Autor */}
                        <div>
                          <label className="text-xs font-bold text-[#1E181A] block mb-2">
                            Selecciona la Paleta de Color del Salón (Modificable luego por la clienta):
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {SALON_PALETTES.map((pal) => {
                              const selected = tenantForm.paletteId === pal.id;
                              return (
                                <button
                                  key={pal.id}
                                  type="button"
                                  onClick={() =>
                                    setTenantForm({
                                      ...tenantForm,
                                      paletteId: pal.id,
                                      primaryColor: pal.primary,
                                      accentColor: pal.secondary,
                                    })
                                  }
                                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                    selected
                                      ? 'border-[#1E181A] bg-[#FAF7F2] shadow-xs ring-2 ring-[#1E181A]/10'
                                      : 'border-[#1E181A]/10 bg-white hover:border-[#1E181A]/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: pal.bgPrimary }} />
                                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: pal.primary }} />
                                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: pal.secondary }} />
                                  </div>
                                  <p className="text-xs font-bold text-[#1E181A]">{pal.name}</p>
                                  <p className="text-[10px] text-[#6E6266] truncate">{pal.subtitle}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Selector de Tipografía y Layout */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">Tipografía Editorial</label>
                            <select
                              value={tenantForm.typographyId}
                              onChange={(e) => setTenantForm({ ...tenantForm, typographyId: e.target.value as SalonTypographyId })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-xs font-bold text-[#1E181A]"
                            >
                              {SALON_TYPOGRAPHIES.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">Disposición de Tarjetas</label>
                            <select
                              value={tenantForm.layoutId}
                              onChange={(e) => setTenantForm({ ...tenantForm, layoutId: e.target.value as SalonCardLayoutId })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-xs font-bold text-[#1E181A]"
                            >
                              {SALON_LAYOUTS.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">Directora / Propietaria</label>
                            <input
                              type="text"
                              value={tenantForm.ownerName}
                              onChange={(e) => setTenantForm({ ...tenantForm, ownerName: e.target.value })}
                              placeholder="Nombre y Apellido"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-sm text-[#1E181A]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">WhatsApp de Recepción (con código país)</label>
                            <input
                              type="text"
                              value={tenantForm.whatsappPhone}
                              onChange={(e) => setTenantForm({ ...tenantForm, whatsappPhone: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-sm text-[#1E181A]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#1E181A] block mb-1">Propuesta de Valor / Slogan de Portada</label>
                          <input
                            type="text"
                            value={tenantForm.slogan}
                            onChange={(e) => setTenantForm({ ...tenantForm, slogan: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-sm text-[#1E181A]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">
                              Áreas / Cabinas Iniciales (separadas por coma)
                            </label>
                            <input
                              type="text"
                              value={tenantForm.initialZonesCsv}
                              onChange={(e) => setTenantForm({ ...tenantForm, initialZonesCsv: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-xs text-[#1E181A]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-[#1E181A] block mb-1">
                              Especialistas Iniciales (separadas por coma)
                            </label>
                            <input
                              type="text"
                              value={tenantForm.initialStaffCsv}
                              onChange={(e) => setTenantForm({ ...tenantForm, initialStaffCsv: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#1E181A]/12 text-xs text-[#1E181A]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1E181A]/10">
                          <button
                            type="button"
                            onClick={() => setShowTenantModal(false)}
                            className="px-5 py-2.5 rounded-full bg-[#FAF7F2] hover:bg-[#F0EBE3] text-[#1E181A] text-xs font-bold cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider shadow-md cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #9E475B 0%, #C87D65 100%)' }}
                          >
                            Crear Salón + Diseño + Equipo en 1 Clic
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: DOCUMENTACIÓN COMPARTIDA SINCRONIZADA CON ESCRITORIO */}
            {activeTab === 'docs' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-3">
                  <h3 className="text-base font-bold text-[#0F172A] uppercase tracking-wider">
                    Documentos en `Desktop\vanesev app`
                  </h3>
                  {(data.docs || []).map((doc: any) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedDoc?.id === doc.id
                          ? 'bg-amber-50/80 border-amber-500 text-[#0F172A] ring-1 ring-amber-500/20'
                          : 'bg-white border-[#E2E8F0] text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase text-amber-800 font-bold">{doc.category} · {doc.version}</span>
                      <h4 className="text-sm font-bold mt-1 text-[#0F172A]">{doc.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.summary}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-2 truncate">{doc.local_path}</p>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
                  {selectedDoc ? (
                    <div className="space-y-4">
                      <div className="border-b border-[#E2E8F0] pb-4">
                        <span className="text-xs font-mono text-amber-800 font-semibold">{selectedDoc.local_path}</span>
                        <h3 className="text-xl font-bold text-[#0F172A] mt-1">{selectedDoc.title}</h3>
                      </div>
                      <pre className="text-xs sm:text-sm text-slate-800 font-mono whitespace-pre-wrap leading-relaxed bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0] max-h-[600px] overflow-y-auto">
                        {selectedDoc.content_markdown}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Selecciona un documento a la izquierda para inspeccionarlo.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: MOTOR QR DINÁMICO & ANALÍTICA DE ESCANEOS */}
            {activeTab === 'qr' && (
              <DynamicQrManager
                tenantSlug="all"
                tenantName="VANESEV Central (Todos los Salones)"
              />
            )}

            {/* TAB 8: RADAR DE COMPETIDORES & GUERRA COMERCIAL */}
            {activeTab === 'competitors' && (
              <CentralCompetitors />
            )}
              </>
            )}
          </main>
        </div>

      {/* ─── MODAL ALTA DE PERSONAL ─── */}
      {showTrialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#18181B]">
                  {trialModalType === 'create' ? 'Crear Acceso de Prueba' : 'Regenerar Contraseña de Prueba'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTrialModal(false);
                  setTrialResult(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trialResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Contraseña Temporal Generada</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Copia y entrega estas credenciales a la dueña. Esta contraseña <strong>solo se muestra una vez</strong>.
                  </p>
                  <div className="space-y-1.5 text-xs font-mono pt-1">
                    <div><strong>Correo:</strong> {trialResult.email}</div>
                    <div><strong>Salón:</strong> {trialResult.organizationSlug}</div>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={trialResult.temporaryPassword}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-mono select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(trialResult.temporaryPassword);
                          setCopiedTrialPassword(true);
                          setTimeout(() => setCopiedTrialPassword(false), 2000);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        {copiedTrialPassword ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedTrialPassword ? 'Copiada' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowTrialModal(false);
                    setTrialResult(null);
                  }}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleTrialSubmit} className="space-y-4">
                {trialError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{trialError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug del Salón / Organización *
                  </label>
                  <input
                    type="text"
                    required
                    value={trialModalOrg}
                    onChange={(e) => setTrialModalOrg(e.target.value)}
                    placeholder="slug-del-salon"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    El usuario será <code>{trialModalOrg.trim().toLowerCase() || 'slug'}@prueba.vanesev.internal</code> con rol <code>owner</code>.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTrialModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={trialLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {trialLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : (
                      <span>{trialModalType === 'create' ? 'Crear Acceso' : 'Regenerar Contraseña'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F26A3D]/10 text-[#F26A3D] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#18181B]">Alta de Personal de Salón</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowStaffModal(false);
                  setCreatedStaffResult(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdStaffResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Contraseña Temporal Generada</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    <strong>AVISO CRÍTICO:</strong> Esta contraseña solo se muestra <strong>UNA SOLA VEZ</strong>. Cópiala y envíala al usuario por un canal seguro. La cuenta tiene activa la política obligatoria de cambio de contraseña en su primer inicio de sesión.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 text-white font-mono text-center text-sm tracking-wider select-all">
                  {createdStaffResult.temporaryPassword}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdStaffResult.temporaryPassword);
                    setCopiedTempPassword(true);
                    setTimeout(() => setCopiedTempPassword(false), 2000);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#F26A3D] hover:bg-[#D94824] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  {copiedTempPassword ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>¡Contraseña copiada al portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Contraseña Temporal</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-xs text-slate-500 text-center">
                  Usuario: <strong>{createdStaffResult.email}</strong> &bull; Salón: <strong>{createdStaffResult.organizationSlug}</strong> &bull; Rol: <strong>{createdStaffResult.role}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowStaffModal(false);
                    setCreatedStaffResult(null);
                  }}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateStaff} className="space-y-4">
                {staffError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={staffFormEmail}
                    onChange={(e) => setStaffFormEmail(e.target.value)}
                    placeholder="especialista@salon.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#F26A3D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo (opcional)
                  </label>
                  <input
                    type="text"
                    value={staffFormName}
                    onChange={(e) => setStaffFormName(e.target.value)}
                    placeholder="Nombre y Apellidos"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#F26A3D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salón (Organización) *
                  </label>
                  <select
                    required
                    value={staffFormOrg}
                    onChange={(e) => setStaffFormOrg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#F26A3D] bg-white"
                  >
                    <option value="">Selecciona un salón...</option>
                    {(data?.tenants || []).map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.business_name || t.businessName || t.id} ({t.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol en el Salón *
                  </label>
                  <select
                    value={staffFormRole}
                    onChange={(e) => setStaffFormRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#F26A3D] bg-white"
                  >
                    <option value="staff">Especialista / Personal (Staff)</option>
                    <option value="admin">Administrador del Salón (Admin)</option>
                    <option value="owner">Propietario / Dueño (Owner)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStaffModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#F26A3D] hover:bg-[#D94824] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {staffLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando alta...</span>
                      </>
                    ) : (
                      <span>Crear Personal</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVA CAMPAÑA QR ─── */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/10 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F26A3D]/10 text-[#F26A3D] flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#18181B]">Nueva Campaña QR</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCampaignModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              {campaignError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{campaignError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Campaña (/q/&lt;código&gt;) *
                </label>
                <input
                  type="text"
                  required
                  value={campCode}
                  onChange={(e) => setCampCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="ej: promo-otono"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#F26A3D]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">3-32 caracteres a-z, 0-9 o guiones.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  required
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="ej: Campaña Otoño 2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#F26A3D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destino Interno *
                </label>
                <input
                  type="text"
                  required
                  value={campTarget}
                  onChange={(e) => setCampTarget(e.target.value)}
                  placeholder="ej: /capra-studio o /"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#F26A3D]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Debe ser una ruta interna que comience por una sola «/».</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCamp}
                  className="px-5 py-2.5 rounded-xl bg-[#F26A3D] hover:bg-[#D94824] text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {savingCamp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Campaña</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
