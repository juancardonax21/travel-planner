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
    const toSave: any = { ...form }
    try { toSave.entry_permits = JSON.parse(toSave.entry_permits_json || '[]') } catch {}
    try { toSave.vaccines = JSON.parse(toSave.vaccines_json || '[]') } catch {}
    delete toSave.entry_permits_json
    delete toSave.vaccines_json
    await supabase.from('family_members').update(toSave).eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...toSave } : m))
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
                  <button onClick={() => {
                      setEditing(isEditing ? null : m.id)
                      setForm({
                        ...m,
                        entry_permits_json: JSON.stringify((m as any).entry_permits || []),
                        vaccines_json: JSON.stringify((m as any).vaccines || []),
                      } as any)
                      setExpanded(m.id)
                    }}
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
  upd: (k: any, v: any) => void
}) {
  const permits: any[] = (() => { try { return JSON.parse((form as any).entry_permits_json || '[]') } catch { return [] } })()
  const vaccines: any[] = (() => { try { return JSON.parse((form as any).vaccines_json || '[]') } catch { return [] } })()

  // Doc URLs from member_documents
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!(form as any).id) return
    supabase.from('member_documents').select('type,file_url,id')
      .eq('family_member_id', (form as any).id).is('trip_id', null)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        ;(data || []).forEach((d: any) => { map[d.type] = d.file_url })
        setDocUrls(map)
      })
  }, [(form as any).id])

  async function saveDocUrl(type: string, url: string) {
    const memberId = (form as any).id
    if (!memberId) return
    const labels: Record<string, string> = {
      passport: 'Pasaporte', dni: 'DNI', tse: 'TSE',
      health_ins: 'Seguro médico', drive_license: 'Carnet de conducir'
    }
    const existing = await supabase.from('member_documents')
      .select('id').eq('family_member_id', memberId).eq('type', type).is('trip_id', null).single()
    if (url.trim()) {
      if (existing.data?.id) {
        await supabase.from('member_documents').update({ file_url: url }).eq('id', existing.data.id)
      } else {
        await supabase.from('member_documents').insert({
          family_member_id: memberId, trip_id: null, type,
          label: labels[type] || type, file_url: url, file_name: labels[type] || type
        })
      }
    } else if (existing.data?.id) {
      await supabase.from('member_documents').delete().eq('id', existing.data.id)
    }
    setDocUrls(prev => ({ ...prev, [type]: url }))
  }

  function UrlField({ type }: { type: string }) {
    const [val, setVal] = useState(docUrls[type] || '')
    useEffect(() => setVal(docUrls[type] || ''), [docUrls[type]])
    return (
      <div className="col-span-2">
        <label className="label flex items-center gap-1"><ExternalLink size={10} strokeWidth={1.8} /> Enlace documento</label>
        <input className="input font-mono text-xs" placeholder="https://drive.google.com/..."
          value={val} onChange={e => setVal(e.target.value)}
          onBlur={() => saveDocUrl(type, val)} />
      </div>
    )
  }

  function updPermit(i: number, k: string, v: string) {
    const a = [...permits]; a[i] = { ...a[i], [k]: v }
    upd('entry_permits_json', JSON.stringify(a))
  }
  function addPermit() { upd('entry_permits_json', JSON.stringify([...permits, { type: '', number: '', expiry: '', doc_url: '' }])) }
  function removePermit(i: number) { upd('entry_permits_json', JSON.stringify(permits.filter((_: any, j: number) => j !== i))) }

  function updVaccine(i: number, k: string, v: string) {
    const a = [...vaccines]; a[i] = { ...a[i], [k]: v }
    upd('vaccines_json', JSON.stringify(a))
  }
  function addVaccine() { upd('vaccines_json', JSON.stringify([...vaccines, { name: '', date: '', doc_url: '' }])) }
  function removeVaccine(i: number) { upd('vaccines_json', JSON.stringify(vaccines.filter((_: any, j: number) => j !== i))) }

  return (
    <div className="space-y-5">

      {/* Personal */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Personal</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Nombre completo *</label>
            <input className="input" value={form.name || ''} onChange={e => upd('name', e.target.value)} placeholder="Juan García López" />
          </div>
          <div>
            <label className="label">Fecha nacimiento</label>
            <input className="input" type="date" value={form.birthdate || ''} onChange={e => upd('birthdate', e.target.value)} />
          </div>
          <div>
            <label className="label">DNI / NIE</label>
            <input className="input font-mono" value={form.dni || ''} onChange={e => upd('dni', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email || ''} onChange={e => upd('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" type="tel" value={form.phone || ''} onChange={e => upd('phone', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Identificación */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Identificación</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">DNI / NIE</label>
            <input className="input font-mono" value={form.dni || ''} onChange={e => upd('dni', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad DNI</label>
            <input className="input" type="date" value={(form as any).dni_expiry || ''} onChange={e => upd('dni_expiry' as any, e.target.value)} />
          </div>
          <UrlField type="dni" />
          <div>
            <label className="label">Pasaporte nº</label>
            <input className="input font-mono" placeholder="AAA123456" value={form.passport_number || ''} onChange={e => upd('passport_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad pasaporte</label>
            <input className="input" type="date" value={form.passport_expiry || ''} onChange={e => upd('passport_expiry', e.target.value)} />
          </div>
          <UrlField type="passport" />
          <div>
            <label className="label">Carnet conducir nº</label>
            <input className="input font-mono" value={form.drive_license || ''} onChange={e => upd('drive_license', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad carnet</label>
            <input className="input" type="date" value={form.drive_license_expiry || ''} onChange={e => upd('drive_license_expiry', e.target.value)} />
          </div>
          <UrlField type="drive_license" />
        </div>

        {/* Entry permits */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Permisos de entrada (ESTA, ETA...)</p>
            <button type="button" onClick={addPermit}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Añadir</button>
          </div>
          {permits.map((p: any, i: number) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 rounded-xl p-3 relative">
              <button type="button" onClick={() => removePermit(i)}
                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors">
                <X size={13} strokeWidth={2} />
              </button>
              <div>
                <label className="label">Tipo</label>
                <input className="input font-mono text-sm" placeholder="ESTA / ETA / eTA..." value={p.type || ''}
                  onChange={e => updPermit(i, 'type', e.target.value)} />
              </div>
              <div>
                <label className="label">Número</label>
                <input className="input font-mono text-sm" placeholder="E123456789" value={p.number || ''}
                  onChange={e => updPermit(i, 'number', e.target.value)} />
              </div>
              <div>
                <label className="label">Caducidad</label>
                <input className="input text-sm" type="date" value={p.expiry || ''}
                  onChange={e => updPermit(i, 'expiry', e.target.value)} />
              </div>
              <div>
                <label className="label">Enlace doc</label>
                <input className="input font-mono text-xs" placeholder="https://drive.google.com/..." value={p.doc_url || ''}
                  onChange={e => updPermit(i, 'doc_url', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sanidad */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Sanidad</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">TSE nº</label>
            <input className="input font-mono" placeholder="ES1234567890" value={form.tse_number || ''} onChange={e => upd('tse_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad TSE</label>
            <input className="input" type="date" value={form.tse_expiry || ''} onChange={e => upd('tse_expiry', e.target.value)} />
          </div>
          <UrlField type="tse" />
          <div>
            <label className="label">Seguro médico nº</label>
            <input className="input font-mono" placeholder="POL-123456" value={form.health_ins_number || ''} onChange={e => upd('health_ins_number', e.target.value)} />
          </div>
          <div>
            <label className="label">Caducidad seguro</label>
            {form.health_ins_expiry === 'indefinido' ? (
              <div className="flex items-center gap-2">
                <div className="input flex items-center gap-2 text-emerald-600 bg-emerald-50 border-emerald-200 text-sm">
                  <CheckCircle2 size={13} strokeWidth={2} /> Suscripción activa
                </div>
                <button type="button" onClick={() => upd('health_ins_expiry', '')}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 border border-slate-200 rounded-xl">
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <input className="input" type="date" value={form.health_ins_expiry || ''} onChange={e => upd('health_ins_expiry', e.target.value)} />
                <button type="button" onClick={() => upd('health_ins_expiry', 'indefinido')}
                  className="text-xs text-slate-400 hover:text-blue-600 text-left transition-colors">
                  Sin caducidad →
                </button>
              </div>
            )}
          </div>
          <UrlField type="health_ins" />
          <div className="col-span-2">
            <label className="label">Tel. emergencias seguro</label>
            <input className="input" type="tel" placeholder="+34 900 000 000" value={form.health_ins_phone || ''} onChange={e => upd('health_ins_phone', e.target.value)} />
          </div>
        </div>

        {/* Vaccines */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vacunas</p>
            <button type="button" onClick={addVaccine}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Añadir</button>
          </div>
          {vaccines.map((v: any, i: number) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-2 bg-slate-50 rounded-xl p-3 relative">
              <button type="button" onClick={() => removeVaccine(i)}
                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors">
                <X size={13} strokeWidth={2} />
              </button>
              <div>
                <label className="label">Vacuna</label>
                <input className="input text-sm" placeholder="COVID-19, Fiebre amarilla..." value={v.name || ''}
                  onChange={e => updVaccine(i, 'name', e.target.value)} />
              </div>
              <div>
                <label className="label">Fecha</label>
                <input className="input text-sm" type="date" value={v.date || ''}
                  onChange={e => updVaccine(i, 'date', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Enlace certificado</label>
                <input className="input font-mono text-xs" placeholder="https://drive.google.com/..." value={v.doc_url || ''}
                  onChange={e => updVaccine(i, 'doc_url', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}


// ── Member view (read-only) ───────────────────────────────────────────────────
function MemberView({ member: m }: { member: FamilyMember }) {
  const [docsState, setDocsState] = useState<any[]>([])

  useEffect(() => {
    supabase.from('member_documents')
      .select('*').eq('family_member_id', m.id).is('trip_id', null)
      .then(({ data }) => setDocsState(data || []))
  }, [m.id])

  function docUrl(type: string) {
    return docsState.find(d => d.type === type)?.file_url
  }

  function Row({ label, value, expiry, docType }: {
    label: string; value?: string; expiry?: string; docType?: string
  }) {
    const url = docType ? docUrl(docType) : undefined
    if (!value && !expiry && !url) return null
    const s = docStatus(expiry)
    return (
      <div className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
        <span className="text-sm text-slate-500 w-36 flex-shrink-0">{label}</span>
        <span className="text-sm font-mono text-slate-800 flex-1 truncate">{value || ''}</span>
        {expiry && (
          <span className={`text-xs flex-shrink-0 w-20 text-right ${
            s === 'expired' ? 'text-red-500' : s === 'warn' ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {s === 'expired' ? 'Caducado' : formatDate(expiry, 'd MMM yy')}
          </span>
        )}
        {!expiry && <span className="w-20 flex-shrink-0" />}
        {url
          ? <a href={url} target="_blank" rel="noopener"
              className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 w-8 flex-shrink-0">
              <ExternalLink size={10} strokeWidth={2} /> Ver
            </a>
          : <span className="w-8 flex-shrink-0" />
        }
      </div>
    )
  }

  const permits: any[] = (m as any).entry_permits || []
  const vaccines: any[] = (m as any).vaccines || []

  return (
    <div className="divide-y divide-slate-50 text-sm">

      {/* Personal */}
      {(m.email || m.phone || m.birthdate) && (
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Personal</p>
          {m.birthdate && <Row label="Nacimiento" value={formatDate(m.birthdate, 'd MMM yyyy')} />}
          {m.email && <Row label="Email" value={m.email} />}
          {m.phone && <Row label="Teléfono" value={m.phone} />}
        </div>
      )}

      {/* Identificación */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Identificación</p>
        <Row label="DNI / NIE" value={m.dni} expiry={(m as any).dni_expiry} docType="dni" />
        <Row label="Pasaporte" value={m.passport_number} expiry={m.passport_expiry} docType="passport" />
        <Row label="Carnet conducir" value={m.drive_license} expiry={m.drive_license_expiry} docType="drive_license" />
        {permits.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500 w-36 flex-shrink-0">{p.type || 'Permiso'}</span>
            <span className="text-sm font-mono text-slate-800 flex-1 truncate">{p.number || ''}</span>
            {p.expiry
              ? <span className={`text-xs flex-shrink-0 w-20 text-right ${
                  docStatus(p.expiry) === 'expired' ? 'text-red-500' :
                  docStatus(p.expiry) === 'warn' ? 'text-amber-600' : 'text-emerald-600'
                }`}>{formatDate(p.expiry, 'd MMM yy')}</span>
              : <span className="w-20 flex-shrink-0" />
            }
            {p.doc_url
              ? <a href={p.doc_url} target="_blank" rel="noopener"
                  className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 w-8 flex-shrink-0">
                  <ExternalLink size={10} strokeWidth={2} /> Ver
                </a>
              : <span className="w-8 flex-shrink-0" />
            }
          </div>
        ))}
      </div>

      {/* Sanidad */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Sanidad</p>
        <Row label="TSE" value={m.tse_number} expiry={m.tse_expiry} docType="tse" />
        <Row label="Seguro médico" value={m.health_ins_number} expiry={m.health_ins_expiry} docType="health_ins" />
        {m.health_ins_phone && (
          <div className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
            <span className="text-sm text-slate-500 w-36 flex-shrink-0">Emergencias</span>
            <a href={`tel:${m.health_ins_phone}`} className="text-sm text-blue-600 font-mono hover:underline flex-1">
              {m.health_ins_phone}
            </a>
          </div>
        )}
        {(vaccines.length > 0) && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Vacunas</p>
            {vaccines.map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500 w-36 flex-shrink-0">{v.name || 'Vacuna'}</span>
                <span className="text-sm text-slate-800 flex-1">{v.date ? formatDate(v.date, 'd MMM yyyy') : ''}</span>
                <span className="w-20 flex-shrink-0" />
                {v.doc_url
                  ? <a href={v.doc_url} target="_blank" rel="noopener"
                      className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 w-8 flex-shrink-0">
                      <ExternalLink size={10} strokeWidth={2} /> Ver
                    </a>
                  : <span className="w-8 flex-shrink-0" />
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
