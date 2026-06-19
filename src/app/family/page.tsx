'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { FamilyMember } from '@/types'
import { daysUntil, formatDate } from '@/lib/utils'
import {
  Users, Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  User, Mail, Phone, CreditCard, Heart, Car, Pencil, Trash2, X, Save,
  FileText, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

type DocStatus = 'ok' | 'warn' | 'expired' | 'missing'

function docStatus(expiry?: string | null): DocStatus {
  if (expiry === 'indefinido') return 'ok'
  if (!expiry) return 'missing'
  const d = daysUntil(expiry)
  if (d === null) return 'missing'
  if (d < 0) return 'expired'
  if (d <= 90) return 'warn'
  return 'ok'
}

const STATUS_STYLE: Record<DocStatus, string> = {
  ok:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn:    'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  missing: 'bg-slate-50 text-slate-300 border-slate-200',
}

function DocBadge({ label, status }: { label: string; status: DocStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
      {status === 'ok' && <CheckCircle2 size={9} strokeWidth={2.5} />}
      {(status === 'warn' || status === 'expired') && <AlertTriangle size={9} strokeWidth={2.5} />}
      {status === 'missing' && <div className="w-2 h-2 rounded-full border border-current" />}
      {label}
    </span>
  )
}

const EMPTY: Partial<FamilyMember> = {
  name: '', birthdate: '', email: '', phone: '', dni: '',
  passport_number: '', passport_issue: '', passport_expiry: '',
  esta_number: '', esta_expiry: '',
  tse_number: '', tse_expiry: '',
  health_ins_number: '', health_ins_expiry: '', health_ins_phone: '',
  drive_license: '', drive_license_expiry: '',
}

// ── Document links per member ─────────────────────────────────────
const DOC_SLOTS = [
  { type: 'passport',      label: 'Pasaporte' },
  { type: 'dni',           label: 'DNI' },
  { type: 'tse',           label: 'TSE' },
  { type: 'health_ins',    label: 'Seguro médico' },
  { type: 'drive_license', label: 'Carnet de conducir' },
  { type: 'vaccines',      label: 'Vacunas / Certificados' },
]

function MemberDocs({ memberId }: { memberId: string }) {
  const [docs, setDocs] = useState<any[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    supabase.from('member_documents')
      .select('*').eq('family_member_id', memberId).is('trip_id', null)
      .then(({ data }) => setDocs(data || []))
  }, [memberId])

  async function save(type: string, label: string) {
    if (!url.trim()) { setEditing(null); return }
    const existing = docs.find(d => d.type === type)
    if (existing) {
      await supabase.from('member_documents').update({ file_url: url.trim() }).eq('id', existing.id)
      setDocs(prev => prev.map(d => d.type === type ? { ...d, file_url: url.trim() } : d))
    } else {
      const { data: newDoc } = await supabase.from('member_documents').insert({
        family_member_id: memberId, trip_id: null, type, label, file_url: url.trim(), file_name: label,
      }).select().single()
      if (newDoc) setDocs(prev => [...prev, newDoc])
    }
    setUrl(''); setEditing(null)
  }

  async function remove(type: string) {
    const doc = docs.find(d => d.type === type)
    if (!doc) return
    await supabase.from('member_documents').delete().eq('id', doc.id)
    setDocs(prev => prev.filter(d => d.type !== type))
  }

  return (
    <div className="px-4 py-3 border-t border-slate-50">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
        Documentos (enlaces)
      </p>
      <div className="space-y-2">
        {DOC_SLOTS.map(slot => {
          const doc = docs.find(d => d.type === slot.type)
          const isEditing = editing === slot.type
          return (
            <div key={slot.type}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-600 flex-1">{slot.label}</span>
                {doc && !isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <a href={doc.file_url} target="_blank" rel="noopener"
                      className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                      <ExternalLink size={10} strokeWidth={2} /> Ver
                    </a>
                    <button onClick={() => { setEditing(slot.type); setUrl(doc.file_url) }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                      ↻
                    </button>
                    <button onClick={() => remove(slot.type)}
                      className="text-slate-300 hover:text-red-500 transition-colors">
                      <X size={11} strokeWidth={2} />
                    </button>
                  </div>
                ) : !isEditing ? (
                  <button onClick={() => { setEditing(slot.type); setUrl('') }}
                    className="text-xs text-slate-400 hover:text-violet-600 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                    <ExternalLink size={10} strokeWidth={2} /> Añadir enlace
                  </button>
                ) : null}
              </div>
              {isEditing && (
                <div className="mt-1.5 flex gap-1.5">
                  <input className="input text-xs py-1.5 font-mono flex-1"
                    placeholder="https://drive.google.com/..."
                    value={url} onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && save(slot.type, slot.label)} />
                  <button onClick={() => save(slot.type, slot.label)}
                    className="bg-blue-600 text-white text-xs px-3 rounded-xl hover:bg-blue-700 transition-colors">
                    OK
                  </button>
                  <button onClick={() => { setEditing(null); setUrl('') }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2">
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


export default function FamilyPage() {
  const router = useRouter()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<FamilyMember>>({})
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState<Partial<FamilyMember>>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)
      supabase.from('family_members')
        .select('*')
        .eq('user_id', data.user.id)
        .order('name')
        .then(({ data: m }) => { setMembers(m || []); setLoading(false) })
    })
  }, [])

  function upd(k: keyof FamilyMember, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function updNew(k: keyof FamilyMember, v: string) {
    setNewForm(f => ({ ...f, [k]: v }))
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('family_members').update(form).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...form } : m))
    setEditing(null)
    setSaving(false)
  }

  async function createMember() {
    if (!newForm.name?.trim() || !userId) return
    setSaving(true)
    const { data } = await supabase.from('family_members')
      .insert({ ...newForm, user_id: userId })
      .select().single()
    if (data) {
      setMembers(prev => [...prev, data])
      setExpanded(data.id)
    }
    setNewForm({ ...EMPTY })
    setShowNew(false)
    setSaving(false)
  }

  async function deleteMember(id: string) {
    if (!confirm('¿Eliminar este viajero? Se eliminará también de todos los viajes.')) return
    await supabase.from('family_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-violet-700 flex items-center justify-center">
      <div className="text-white/60 animate-pulse">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-violet-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Link href="/trips" className="text-blue-200 hover:text-white text-sm flex items-center gap-1.5 mb-3 transition-colors">
            ← Mis viajes
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <Users size={20} strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Mi familia</h1>
                <p className="text-blue-200 text-xs">{members.length} viajero{members.length !== 1 ? 's' : ''} registrado{members.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-xl transition-colors">
              <Plus size={14} strokeWidth={2.5} /> Añadir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">

        {/* New member form */}
        {showNew && (
          <div className="card p-5 border-blue-200 bg-blue-50/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Nuevo viajero</h3>
              <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <MemberForm form={newForm} upd={updNew} />
            <div className="flex gap-2 mt-4">
              <button onClick={createMember} disabled={saving || !newForm.name?.trim()}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                <Save size={14} /> {saving ? 'Guardando...' : 'Crear viajero'}
              </button>
              <button onClick={() => setShowNew(false)} className="btn-secondary px-4">Cancelar</button>
            </div>
          </div>
        )}

        {/* Members list */}
        {members.length === 0 && !showNew ? (
          <div className="card p-12 text-center">
            <Users size={40} className="mx-auto text-slate-200 mb-3" strokeWidth={1} />
            <p className="text-slate-400 mb-2">Sin viajeros todavía</p>
            <p className="text-slate-300 text-sm mb-5">Añade a tu familia para poder asignarlos a viajes</p>
            <button onClick={() => setShowNew(true)} className="btn-primary inline-flex items-center gap-2 px-6">
              <Plus size={15} /> Añadir primer viajero
            </button>
          </div>
        ) : members.map(m => {
          const isOpen = expanded === m.id
          const isEditing = editing === m.id
          const initials = m.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
          const statuses = {
            passport: docStatus(m.passport_expiry),
            esta: docStatus(m.esta_expiry),
            tse: docStatus(m.tse_expiry),
            health: docStatus(m.health_ins_expiry),
          }
          const hasAlert = Object.values(statuses).some(s => s === 'warn' || s === 'expired')

          return (
            <div key={m.id} className="card overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : m.id)}>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{m.name}</p>
                    {hasAlert && <AlertTriangle size={13} className="text-amber-500" strokeWidth={2} />}
                  </div>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <DocBadge label="Pasaporte" status={statuses.passport} />
                    <DocBadge label="ESTA" status={statuses.esta} />
                    <DocBadge label="TSE" status={statuses.tse} />
                    <DocBadge label="Seguro" status={statuses.health} />
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setEditing(isEditing ? null : m.id); setForm(m); setExpanded(m.id) }}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteMember(m.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : m.id)}
                    className="p-2 text-slate-300">
                    {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {/* Expanded — view or edit */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {isEditing ? (
                    <div className="p-4">
                      <MemberForm form={form} upd={upd} />
                      <div className="flex gap-2 mt-4">
                        <button onClick={() => saveEdit(m.id)} disabled={saving}
                          className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                          <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button onClick={() => setEditing(null)} className="btn-secondary px-4">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <MemberView member={m} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Member form (reusable) ────────────────────────────────────────────────────
function MemberForm({ form, upd }: {
  form: Partial<FamilyMember>
  upd: (k: keyof FamilyMember, v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nombre completo *</label>
        <input className="input" value={form.name || ''} onChange={e => upd('name', e.target.value)} placeholder="Juan García López" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Fecha nacimiento</label>
          <input className="input" type="date" value={form.birthdate || ''} onChange={e => upd('birthdate', e.target.value)} />
        </div>
        <div>
          <label className="label">DNI / NIE</label>
          <input className="input font-mono" value={form.dni || ''} onChange={e => upd('dni', e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-1"><Mail size={10} /> Email</label>
          <input className="input" type="email" value={form.email || ''} onChange={e => upd('email', e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-1"><Phone size={10} /> Teléfono</label>
          <input className="input" type="tel" value={form.phone || ''} onChange={e => upd('phone', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <CreditCard size={12} strokeWidth={2} className="text-blue-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Documentos de viaje</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Pasaporte nº</label>
            <input className="input font-mono" placeholder="AAA123456" value={form.passport_number || ''} onChange={e => upd('passport_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad pasaporte</label>
            <input className="input" type="date" value={form.passport_expiry || ''} onChange={e => upd('passport_expiry', e.target.value)} />
          </div>
          <div>
            <label className="label">ESTA nº</label>
            <input className="input font-mono" placeholder="E123456789" value={form.esta_number || ''} onChange={e => upd('esta_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad ESTA</label>
            <input className="input" type="date" value={form.esta_expiry || ''} onChange={e => upd('esta_expiry', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Heart size={12} strokeWidth={2} className="text-rose-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Sanidad</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">TSE nº</label>
            <input className="input font-mono" placeholder="ES1234567890" value={form.tse_number || ''} onChange={e => upd('tse_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad TSE</label>
            <input className="input" type="date" value={form.tse_expiry || ''} onChange={e => upd('tse_expiry', e.target.value)} />
          </div>
          <div>
            <label className="label">Seguro médico nº</label>
            <input className="input font-mono" placeholder="POL-123456" value={form.health_ins_number || ''} onChange={e => upd('health_ins_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad seguro</label>
            {form.health_ins_expiry === 'indefinido' ? (
              <div className="flex items-center gap-2">
                <div className="input flex items-center gap-2 text-emerald-600 bg-emerald-50 border-emerald-200">
                  <CheckCircle2 size={14} strokeWidth={2} /> Suscripción activa
                </div>
                <button type="button" onClick={() => upd('health_ins_expiry', '')}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 border border-slate-200 rounded-xl">
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <input className="input" type="date" value={form.health_ins_expiry || ''} onChange={e => upd('health_ins_expiry', e.target.value)} />
                <button type="button" onClick={() => upd('health_ins_expiry', 'indefinido')}
                  className="text-xs text-slate-400 hover:text-blue-600 text-left transition-colors">
                  Sin caducidad (suscripción mensual) →
                </button>
              </div>
            )}
          </div>
          <div className="col-span-2">
            <label className="label flex items-center gap-1"><Phone size={10} /> Teléfono emergencias seguro</label>
            <input className="input" type="tel" placeholder="+34 900 000 000" value={form.health_ins_phone || ''} onChange={e => upd('health_ins_phone', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Car size={12} strokeWidth={2} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conducción</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Carnet conducir nº</label>
            <input className="input font-mono" value={form.drive_license || ''} onChange={e => upd('drive_license', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad carnet</label>
            <input className="input" type="date" value={form.drive_license_expiry || ''} onChange={e => upd('drive_license_expiry', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Member view (read-only) ───────────────────────────────────────────────────
function MemberView({ member: m }: { member: FamilyMember }) {
  function Row({ label, value, expiry }: { label: string; value?: string; expiry?: string }) {
    if (!value && !expiry) return null
    const s = docStatus(expiry)
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-slate-600">{label}</span>
          {value && <span className="text-xs font-mono text-slate-400">{value}</span>}
        </div>
        {expiry && (
          <span className={`text-xs flex-shrink-0 ml-2 ${
            s === 'expired' ? 'text-red-500' : s === 'warn' ? 'text-amber-600' :
            s === 'ok' ? 'text-emerald-600' : 'text-slate-300'
          }`}>
            {s === 'expired' ? '⚠️ Caducado' : `hasta ${formatDate(expiry, 'd MMM yyyy')}`}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-50 text-sm">
      {(m.email || m.phone || m.birthdate || m.dni) && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Personal</p>
          {m.birthdate && <Row label="Nacimiento" value={formatDate(m.birthdate, 'd MMM yyyy')} />}
          {m.email && <Row label="Email" value={m.email} />}
          {m.phone && <Row label="Teléfono" value={m.phone} />}
          {m.dni && <Row label="DNI" value={m.dni} />}
        </div>
      )}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Viaje</p>
        <Row label="Pasaporte" value={m.passport_number} expiry={m.passport_expiry} />
        <Row label="ESTA" value={m.esta_number} expiry={m.esta_expiry} />
      </div>
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sanidad</p>
        <Row label="TSE" value={m.tse_number} expiry={m.tse_expiry} />
        <Row label="Seguro médico" value={m.health_ins_number} expiry={m.health_ins_expiry} />
        {m.health_ins_phone && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-slate-600">Emergencias</span>
            <a href={`tel:${m.health_ins_phone}`} className="text-xs text-blue-600 font-mono hover:underline">
              {m.health_ins_phone}
            </a>
          </div>
        )}
      </div>
      {(m.drive_license || m.drive_license_expiry) && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Conducción</p>
          <Row label="Carnet" value={m.drive_license} expiry={m.drive_license_expiry} />
        </div>
      )}
    </div>
  )
}
