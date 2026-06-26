import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function App({ usuario, rol, onLogout }) {
  const [view, setView] = useState('inicio')
  const [viewC, setViewC] = useState('mis-viajes')
  const [camiones, setCamiones] = useState([])
  const [choferes, setChoferes] = useState([])
  const [viajes, setViajes] = useState([])
  const [facturas, setFacturas] = useState([])
  const [gasolina, setGasolina] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(null)
  const [confirmar, setConfirmar] = useState(null)
  const [form, setForm] = useState({})
  const [gasForm, setGasForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [filtroV, setFiltroV] = useState('todos')
  const [filtroF, setFiltroF] = useState('todas')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    load()
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function load() {
    if (rol === 'chofer') {
      const [a, b, c] = await Promise.all([
        supabase.from('camiones').select('*').order('economico'),
        supabase.from('choferes').select('*').order('nombre'),
        supabase.from('viajes').select('*').order('created_at', { ascending: false }),
      ])
      if (a.data) setCamiones(a.data)
      if (b.data) setChoferes(b.data)
      if (c.data) setViajes(c.data)
    } else {
      const [a, b, c, d, e] = await Promise.all([
        supabase.from('camiones').select('*').order('economico'),
        supabase.from('choferes').select('*').order('nombre'),
        supabase.from('viajes').select('*').order('created_at', { ascending: false }),
        supabase.from('facturas').select('*').order('created_at', { ascending: false }),
        supabase.from('gasolina').select('*').order('created_at', { ascending: false }),
      ])
      if (a.data) setCamiones(a.data)
      if (b.data) setChoferes(b.data)
      if (c.data) setViajes(c.data)
      if (d.data) setFacturas(d.data)
      if (e.data) setGasolina(e.data)
    }
  }

  async function loadUsuarios() {
    const { data } = await supabase.rpc('get_users_emails')
    if (data) setUsuarios(data)
  }

  async function eliminar(tabla, id, msg) {
    setConfirmar({ msg, fn: async () => { await supabase.from(tabla).delete().eq('id', id); await load(); setConfirmar(null) } })
  }

  async function crearChofer() {
    if (!form.nombre || !form.user_id) { alert('Nombre y usuario son requeridos'); return }
    setLoading(true)
    try {
      const { error } = await supabase.from('choferes').insert([{
        nombre: form.nombre, telefono: form.telefono || null,
        licencia: form.licencia || null, licencia_vence: form.licencia_vence || null,
        user_id: form.user_id, activo: true
      }])
      if (error) throw error
      await supabase.from('perfiles').upsert([{ id: form.user_id, nombre: form.nombre, rol: 'chofer' }])
      await load(); setModal(null); setForm({})
      alert('✓ Chofer creado')
    } catch (e) { alert('Error: ' + e.message) }
    setLoading(false)
  }

  async function crearViaje() {
    setLoading(true)
    try {
      // Verificar que el camión no tenga viaje activo
      if (form.camion_id) {
        const { data: viajeActivo } = await supabase
          .from('viajes')
          .select('id')
          .eq('camion_id', form.camion_id)
          .in('estatus', ['programado', 'en_ruta', 'cargando'])
          .maybeSingle()
        if (viajeActivo) {
          alert('⚠️ Este camión ya tiene un viaje activo')
          setLoading(false)
          return
        }
      }
      await supabase.from('viajes').insert([{
        ...form,
        folio: 'VJ-' + String(viajes.length + 1).padStart(3, '0'),
        estatus: 'programado'
      }])
      if (form.camion_id) {
        await supabase.from('camiones').update({ estatus: 'en_ruta' }).eq('id', form.camion_id)
      }
      await load(); setModal(null); setForm({})
    } catch (e) { alert('Error: ' + e.message) }
    setLoading(false)
  }

  async function entregarViaje(v) {
    await supabase.from('viajes').update({ estatus: 'entregado' }).eq('id', v.id)
    if (v.camion_id) await supabase.from('camiones').update({ estatus: 'disponible' }).eq('id', v.camion_id)
    await load()
  }

  async function iniciarViaje(v) {
    await supabase.from('viajes').update({ estatus: 'en_ruta' }).eq('id', v.id)
    await load()
  }

  const r = '#C8001E', w = '#fff', b = '#1a1a1a', m = '#6B6B68', br = '0.5px solid #E0DFDC'
  const card = { background: w, border: br, borderRadius: 12, padding: 14 }
  const btnR = { background: r, color: w, border: 'none', padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }
  const btnD = { background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F09595', padding: '4px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer' }
  const btnG = { background: w, color: b, border: br, padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer' }
  const inp = { width: '100%', padding: '10px', border: br, borderRadius: 8, fontSize: 16, background: w, color: b, boxSizing: 'border-box', marginBottom: 10 }
  const th = { fontWeight: 500, color: m, textAlign: 'left', padding: '4px 8px', borderBottom: br, fontSize: 11 }
  const td = { padding: '7px 8px', borderBottom: br, fontSize: 12 }

  const badge = (s) => {
    const map = { disponible: ['#eaf3de','#3B6D11','Disponible'], en_ruta: ['#eaf3de','#3B6D11','En ruta'], mantenimiento: ['#faeeda','#854F0B','Mantenimiento'], fuera_de_servicio: ['#FCEBEB','#A32D2D','Fuera de servicio'], programado: ['#faeeda','#854F0B','Programado'], cargando: ['#E6F1FB','#185FA5','Cargando'], entregado: ['#eaf3de','#3B6D11','Entregado'], cancelado: ['#FCEBEB','#A32D2D','Cancelado'], cobrada: ['#eaf3de','#3B6D11','Cobrada'], pendiente: ['#faeeda','#854F0B','Pendiente'], vencida: ['#FCEBEB','#A32D2D','Vencida'] }
    const [bg, c, l] = map[s] || ['#eee', '#666', s]
    return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500, background: bg, color: c }}>{l}</span>
  }

  const vAct = viajes.filter(v => ['en_ruta', 'cargando'].includes(v.estatus)).length
  const fPend = facturas.filter(f => f.estatus === 'pendiente')
  const vF = filtroV === 'todos' ? viajes : viajes.filter(v => v.estatus === filtroV)
  const fF = filtroF === 'todas' ? facturas : facturas.filter(f => f.estatus === filtroF)
  const totalGas = gasolina.reduce((a, g) => a + Number(g.monto || 0), 0)
  const viewTitle = { inicio: 'Inicio', flota: 'Flota', choferes: 'Choferes', viajes: 'Viajes', gasolina: 'Gasolina', facturas: 'Facturas', mantenimiento: 'Mantenimiento', reportes: 'Reportes' }

  const navLinks = [
    { v: 'inicio', icon: '🏠', label: 'Inicio' },
    { v: 'flota', icon: '🚛', label: 'Flota' },
    { v: 'choferes', icon: '👷', label: 'Choferes' },
    { v: 'viajes', icon: '📍', label: 'Viajes', count: vAct || null },
    { v: 'gasolina', icon: '⛽', label: 'Gasolina' },
    { v: 'facturas', icon: '📄', label: 'Facturas', count: fPend.length || null },
    { v: 'mantenimiento', icon: '🔧', label: 'Mantenimiento' },
    { v: 'reportes', icon: '📊', label: 'Reportes' },
  ]

  const modalContent = modal && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }} onClick={e => e.target === e.currentTarget && setModal(null)}>
      <div style={{ background: w, borderRadius: 12, padding: 20, width: 'calc(100% - 32px)', maxWidth: 400, margin: '40px auto 40px', position: 'relative' }}>
        <button onClick={() => setModal(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: m, lineHeight: 1 }}>✕</button>

        {modal === 'viaje' && <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nuevo viaje</div>
          {[['cliente','Cliente','text'],['origen','Origen','text'],['destino','Destino','text'],['fecha','Fecha','date'],['tipo_carga','Tipo de carga','text'],['notas','Notas','text']].map(([k,l,t]) =>
            <div key={k}><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>{l}</label><input style={inp} type={t} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
          <div><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>Chofer</label>
            <select style={inp} onChange={e => setForm({ ...form, chofer_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {choferes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>Camión</label>
            <select style={inp} onChange={e => setForm({ ...form, camion_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {camiones.filter(c => c.estatus === 'disponible').map(c => <option key={c.id} value={c.id}>{c.economico}</option>)}
            </select>
          </div>
          <button style={{ ...btnR, width: '100%', padding: 12, fontSize: 14, marginTop: 4 }} onClick={crearViaje}>
            {loading ? 'Guardando...' : '✓ Crear viaje'}
          </button>
        </>}

        {modal === 'camion' && <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Agregar unidad</div>
          {[['economico','Económico','text'],['placas','Placas','text'],['marca','Marca','text'],['modelo','Modelo','text'],['anio','Año','number'],['capacidad','Capacidad','text']].map(([k,l,t]) =>
            <div key={k}><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>{l}</label><input style={inp} type={t} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
          <button style={{ ...btnR, width: '100%', padding: 12, fontSize: 14, marginTop: 4 }} onClick={async () => {
            setLoading(true)
            await supabase.from('camiones').insert([{ ...form, estatus: 'disponible' }])
            await load(); setModal(null); setForm({}); setLoading(false)
          }}>{loading ? 'Guardando...' : '✓ Guardar'}</button>
        </>}

        {modal === 'chofer' && <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Agregar chofer</div>
          {[['nombre','Nombre completo','text'],['telefono','Teléfono','text'],['licencia','No. Licencia','text'],['licencia_vence','Licencia vence','date']].map(([k,l,t]) =>
            <div key={k}><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>{l}</label><input style={inp} type={t} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
          <div style={{ borderTop: br, paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: m, marginBottom: 8 }}>Vincular con usuario</div>
            <select style={inp} onChange={e => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Seleccionar usuario...</option>
              {usuarios.filter(u => !choferes.find(c => c.user_id === u.id)).map(u =>
                <option key={u.id} value={u.id}>{u.email}</option>
              )}
            </select>
          </div>
          <button style={{ ...btnR, width: '100%', padding: 12, fontSize: 14, marginTop: 4 }} onClick={crearChofer}>
            {loading ? 'Guardando...' : '✓ Guardar chofer'}
          </button>
        </>}

        {modal === 'factura' && <>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nueva factura</div>
          {[['cliente','Cliente','text'],['monto','Monto','number'],['fecha','Fecha emisión','date'],['fecha_vence','Fecha vencimiento','date']].map(([k,l,t]) =>
            <div key={k}><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>{l}</label><input style={inp} type={t} onChange={e => setForm({ ...form, [k]: e.target.value })} /></div>)}
          <button style={{ ...btnR, width: '100%', padding: 12, fontSize: 14, marginTop: 4 }} onClick={async () => {
            setLoading(true)
            await supabase.from('facturas').insert([{ ...form, folio: 'FYS-' + String(facturas.length + 101).padStart(4, '0'), estatus: 'pendiente' }])
            await load(); setModal(null); setForm({}); setLoading(false)
          }}>{loading ? 'Guardando...' : '✓ Guardar'}</button>
        </>}
      </div>
    </div>
  )

  const confirmarModal = confirmar && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: w, borderRadius: 12, padding: 24, width: '100%', maxWidth: 300, textAlign: 'center' }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>🗑</div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>¿Confirmar eliminación?</div>
        <div style={{ fontSize: 12, color: m, marginBottom: 18 }}>{confirmar.msg}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={{ ...btnG, padding: '10px 20px' }} onClick={() => setConfirmar(null)}>Cancelar</button>
          <button style={{ ...btnR, padding: '10px 20px' }} onClick={confirmar.fn}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )

  // ─── VISTA CHOFER ───────────────────────────────────────────────────────────
  if (rol === 'chofer') {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F6', fontFamily: 'system-ui,sans-serif', fontSize: 13, color: b, paddingBottom: 70 }}>
        <div style={{ background: r, color: w, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 14 }}>FYS</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Panel del operador</span>
          </div>
          <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', color: w, border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Salir</button>
        </div>
        <div style={{ padding: 16 }}>
          {viewC === 'mis-viajes' && <>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: m }}>Mis viajes</div>
            {viajes.length === 0 && <div style={{ ...card, textAlign: 'center', color: m, padding: 30 }}>No tienes viajes asignados</div>}
            {viajes.map(v => (
              <div key={v.id} style={{ ...card, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{v.folio}</span>{badge(v.estatus)}
                </div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>📦 {v.cliente}</div>
                <div style={{ fontSize: 12, color: m, marginBottom: 8 }}>📍 {v.origen} → {v.destino}</div>
                <div style={{ fontSize: 11, color: m, marginBottom: 10 }}>📅 {v.fecha}</div>
                {v.notas && <div style={{ fontSize: 11, color: m, marginBottom: 10, background: '#F7F7F6', borderRadius: 6, padding: '6px 8px' }}>📝 {v.notas}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  {v.estatus === 'programado' && <button style={{ ...btnR, flex: 1, textAlign: 'center', padding: 10 }} onClick={() => iniciarViaje(v)}>▶ Iniciar viaje</button>}
                  {v.estatus === 'en_ruta' && <button style={{ ...btnR, flex: 1, textAlign: 'center', padding: 10 }} onClick={() => entregarViaje(v)}>✓ Marcar entregado</button>}
                </div>
              </div>
            ))}
          </>}
          {viewC === 'gasolina' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>⛽ Registrar gasolina</div>
              <label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>Unidad</label>
              <select style={inp} onChange={e => setGasForm({ ...gasForm, camion_id: e.target.value })}>
                <option value="">Seleccionar...</option>
                {camiones.map(c => <option key={c.id} value={c.id}>{c.economico}</option>)}
              </select>
              {[['litros','Litros','number','120'],['monto','Monto ($)','number','2400'],['gasolinera','Gasolinera','text','PEMEX'],['kilometraje','Kilometraje','number','124500']].map(([k,l,t,ph]) => (
                <div key={k}><label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>{l}</label><input style={inp} type={t} placeholder={ph} onChange={e => setGasForm({ ...gasForm, [k]: e.target.value })} /></div>
              ))}
              <label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>Fecha</label>
              <input style={inp} type="date" onChange={e => setGasForm({ ...gasForm, fecha: e.target.value })} />
              <button style={{ ...btnR, width: '100%', textAlign: 'center', padding: 12 }} onClick={async () => { setLoading(true); await supabase.from('gasolina').insert([gasForm]); setGasForm({}); setLoading(false); alert('✓ Guardado') }}>{loading ? 'Guardando...' : '✓ Guardar'}</button>
            </div>
          )}
          {viewC === 'incidencias' && (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>⚠️ Reportar incidencia</div>
              <label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>Tipo</label>
              <select style={inp} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="">Seleccionar...</option>
                <option value="accidente">Accidente</option>
                <option value="falla">Falla mecánica</option>
                <option value="retraso">Retraso</option>
                <option value="robo">Robo / Asalto</option>
                <option value="otro">Otro</option>
              </select>
              <label style={{ fontSize: 12, color: m, display: 'block', marginBottom: 4 }}>Descripción</label>
              <textarea style={{ ...inp, height: 100, resize: 'none' }} placeholder="Describe qué pasó..." onChange={e => setForm({ ...form, descripcion: e.target.value })} />
              <button style={{ ...btnR, width: '100%', textAlign: 'center', padding: 12 }} onClick={async () => { setLoading(true); await supabase.from('incidencias').insert([form]); setForm({}); setLoading(false); alert('✓ Reporte enviado') }}>{loading ? 'Enviando...' : '📤 Enviar reporte'}</button>
            </div>
          )}
        </div>
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: w, borderTop: br, display: 'flex' }}>
          {[['mis-viajes','📍','Viajes'],['gasolina','⛽','Gasolina'],['incidencias','⚠️','Incidencias']].map(([v,icon,lbl]) => (
            <div key={v} onClick={() => setViewC(v)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', cursor: 'pointer', color: viewC === v ? r : m, fontSize: 10, fontWeight: viewC === v ? 600 : 400 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>{lbl}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── CONTENIDO ADMIN ────────────────────────────────────────────────────────
  const mainContent = (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '12px' : '16px 18px' }}>
      {view === 'inicio' && <>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
          {[[camiones.filter(c => c.estatus === 'en_ruta').length,'🚛 Activas','de '+camiones.length+' en flota'],[vAct,'📍 En curso',viajes.filter(v=>v.estatus==='programado').length+' programados'],[fPend.length,'📄 Pendientes','$'+fPend.reduce((a,f)=>a+Number(f.monto||0),0).toLocaleString()],[choferes.filter(c=>c.activo).length,'👷 Choferes','de '+choferes.length]].map(([val,lbl,sub]) => (
            <div key={lbl} style={{ background: w, border: br, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: m, marginBottom: 5 }}>{lbl}</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{val}</div>
              <div style={{ fontSize: 10, color: '#9E9E9B', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
          <div style={card}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>🚛 Flota</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr><th style={th}>Unidad</th><th style={th}>Placas</th><th style={th}>Estatus</th></tr></thead>
              <tbody>{camiones.map(c => <tr key={c.id}><td style={{ ...td, fontWeight: 600 }}>{c.economico}</td><td style={td}>{c.placas}</td><td style={td}>{badge(c.estatus)}</td></tr>)}</tbody>
            </table>
          </div>
          <div style={card}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>📍 Viajes activos</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr><th style={th}>Cliente</th><th style={th}>Ruta</th><th style={th}>Estatus</th></tr></thead>
              <tbody>{viajes.filter(v=>['en_ruta','cargando'].includes(v.estatus)).slice(0,5).map(v=><tr key={v.id}><td style={td}>{v.cliente}</td><td style={td}>{v.origen}→{v.destino}</td><td style={td}>{badge(v.estatus)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </>}

      {view === 'flota' && <div style={{ overflowX: 'auto' }}><div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 400 }}>
          <thead><tr><th style={th}>Económico</th><th style={th}>Marca</th><th style={th}>Placas</th><th style={th}>Estatus</th><th style={th}></th></tr></thead>
          <tbody>{camiones.map(c => <tr key={c.id}>
            <td style={{ ...td, fontWeight: 600 }}>{c.economico}</td><td style={td}>{c.marca}</td><td style={td}>{c.placas}</td>
            <td style={td}><select style={{ border: br, borderRadius: 6, fontSize: 11, padding: '3px 6px' }} value={c.estatus} onChange={async e => { await supabase.from('camiones').update({ estatus: e.target.value }).eq('id', c.id); await load() }}><option value="disponible">Disponible</option><option value="en_ruta">En ruta</option><option value="mantenimiento">Mantenimiento</option><option value="fuera_de_servicio">Fuera de servicio</option></select></td>
            <td style={td}><button style={btnD} onClick={() => eliminar('camiones', c.id, '¿Eliminar '+c.economico+'?')}>🗑</button></td>
          </tr>)}</tbody>
        </table>
      </div></div>}

      {view === 'choferes' && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 10 }}>
        {choferes.map(c => {
          const dias = c.licencia_vence ? Math.round((new Date(c.licencia_vence)-new Date())/864e5) : 999
          return <div key={c.id} style={{ ...card, padding: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff0f2', color: r, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{c.nombre.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{c.nombre}</div>
            <div style={{ fontSize: 11, color: m, marginBottom: 6 }}>{c.licencia}</div>
            <div style={{ fontSize: 11, color: m, marginBottom: 8 }}>
              <div>📞 {c.telefono||'—'}</div>
              <div style={{ color: dias<60?'#854F0B':m }}>🪪 {c.licencia_vence||'—'}{dias<60?' ⚠️':''}</div>
              <div style={{ marginTop: 4, color: c.user_id ? '#3B6D11' : '#854F0B' }}>{c.user_id ? '🔗 Cuenta vinculada' : '⚠️ Sin cuenta'}</div>
            </div>
            <button style={{ ...btnD, width: '100%', textAlign: 'center', padding: 10 }} onClick={() => eliminar('choferes', c.id, '¿Eliminar a '+c.nombre+'?')}>🗑 Eliminar</button>
          </div>
        })}
      </div>}

      {view === 'viajes' && <>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {['todos','programado','en_ruta','entregado','cancelado'].map(f=><button key={f} onClick={()=>setFiltroV(f)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: filtroV===f?r:w, color: filtroV===f?w:m, border: filtroV===f?'1px solid '+r:br }}>{f==='todos'?'Todos':f==='en_ruta'?'En ruta':f.charAt(0).toUpperCase()+f.slice(1)}</button>)}
        </div>
        {isMobile ? (
          <div>{vF.map(v => {
            const chofer = choferes.find(c => c.id === v.chofer_id)
            return <div key={v.id} style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>{v.folio}</span>{badge(v.estatus)}
              </div>
              <div style={{ fontSize: 12, marginBottom: 3 }}>📦 {v.cliente}</div>
              <div style={{ fontSize: 12, color: m, marginBottom: 3 }}>📍 {v.origen} → {v.destino}</div>
              <div style={{ fontSize: 11, color: m, marginBottom: 3 }}>👷 {chofer?.nombre || 'Sin asignar'}</div>
              <div style={{ fontSize: 11, color: m, marginBottom: 10 }}>📅 {v.fecha}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {v.estatus==='programado'&&<button style={{ ...btnG, flex: 1, textAlign: 'center', padding: 8 }} onClick={() => iniciarViaje(v)}>▶ Iniciar</button>}
                {v.estatus==='en_ruta'&&<button style={{ ...btnR, flex: 1, textAlign: 'center', padding: 8 }} onClick={() => entregarViaje(v)}>✓ Entregar</button>}
                <button style={{ ...btnD, padding: '8px 12px' }} onClick={()=>eliminar('viajes',v.id,'¿Eliminar '+v.folio+'?')}>🗑</button>
              </div>
            </div>
          })}</div>
        ) : (
          <div style={card}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={th}>Folio</th><th style={th}>Cliente</th><th style={th}>Ruta</th><th style={th}>Chofer</th><th style={th}>Fecha</th><th style={th}>Estatus</th><th style={th}>Acción</th><th style={th}></th></tr></thead>
            <tbody>{vF.map(v=>{
              const chofer = choferes.find(c => c.id === v.chofer_id)
              return <tr key={v.id}>
                <td style={{ ...td, fontWeight: 600 }}>{v.folio}</td><td style={td}>{v.cliente}</td><td style={td}>{v.origen}→{v.destino}</td>
                <td style={td}>{chofer?.nombre || <span style={{ color: m }}>Sin asignar</span>}</td>
                <td style={td}>{v.fecha}</td><td style={td}>{badge(v.estatus)}</td>
                <td style={td}>
                  {v.estatus==='programado'&&<button style={btnG} onClick={() => iniciarViaje(v)}>▶ Iniciar</button>}
                  {v.estatus==='en_ruta'&&<button style={btnR} onClick={() => entregarViaje(v)}>✓ Entregar</button>}
                </td>
                <td style={td}><button style={btnD} onClick={()=>eliminar('viajes',v.id,'¿Eliminar '+v.folio+'?')}>🗑</button></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </>}

      {view === 'facturas' && <>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {['todas','pendiente','cobrada','vencida'].map(f=><button key={f} onClick={()=>setFiltroF(f)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', background: filtroF===f?r:w, color: filtroF===f?w:m, border: filtroF===f?'1px solid '+r:br }}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>)}
        </div>
        {isMobile ? (
          <div>{fF.map(f => <div key={f.id} style={{ ...card, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>{f.folio}</span>{badge(f.estatus)}
            </div>
            <div style={{ fontSize: 12, marginBottom: 3 }}>🏢 {f.cliente}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>${Number(f.monto||0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: m, marginBottom: 10 }}>Vence: {f.fecha_vence}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {f.estatus==='pendiente'&&<button style={{ ...btnR, flex: 1, textAlign: 'center', padding: 8 }} onClick={async()=>{ await supabase.from('facturas').update({estatus:'cobrada'}).eq('id',f.id); await load() }}>✓ Cobrar</button>}
              <button style={{ ...btnD, padding: '8px 12px' }} onClick={()=>eliminar('facturas',f.id,'¿Eliminar '+f.folio+'?')}>🗑</button>
            </div>
          </div>)}</div>
        ) : (
          <div style={card}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr><th style={th}>Folio</th><th style={th}>Cliente</th><th style={th}>Fecha</th><th style={th}>Monto</th><th style={th}>Vence</th><th style={th}>Estatus</th><th style={th}></th></tr></thead>
            <tbody>{fF.map(f=><tr key={f.id}>
              <td style={{ ...td, fontWeight: 600 }}>{f.folio}</td><td style={td}>{f.cliente}</td><td style={td}>{f.fecha}</td><td style={{ ...td, fontWeight: 600 }}>${Number(f.monto||0).toLocaleString()}</td><td style={td}>{f.fecha_vence}</td><td style={td}>{badge(f.estatus)}</td>
              <td style={td}>{f.estatus==='pendiente'&&<button style={{ ...btnR, fontSize: 10, padding: '3px 8px', marginRight: 4 }} onClick={async()=>{ await supabase.from('facturas').update({estatus:'cobrada'}).eq('id',f.id); await load() }}>✓ Cobrar</button>}<button style={btnD} onClick={()=>eliminar('facturas',f.id,'¿Eliminar '+f.folio+'?')}>🗑</button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </>}

      {view === 'gasolina' && <>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: w, border: br, borderRadius: 8, padding: 12 }}><div style={{ fontSize: 11, color: m, marginBottom: 5 }}>⛽ Registros</div><div style={{ fontSize: 20, fontWeight: 600 }}>{gasolina.length}</div></div>
          <div style={{ background: w, border: br, borderRadius: 8, padding: 12 }}><div style={{ fontSize: 11, color: m, marginBottom: 5 }}>💰 Gasto total</div><div style={{ fontSize: 20, fontWeight: 600, color: r }}>${totalGas.toLocaleString()}</div></div>
          <div style={{ background: w, border: br, borderRadius: 8, padding: 12 }}><div style={{ fontSize: 11, color: m, marginBottom: 5 }}>🚛 Unidades</div><div style={{ fontSize: 20, fontWeight: 600 }}>{camiones.length}</div></div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>📋 Historial</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 350 }}>
              <thead><tr><th style={th}>Fecha</th><th style={th}>Unidad</th><th style={th}>Litros</th><th style={th}>Monto</th><th style={th}>Gasolinera</th></tr></thead>
              <tbody>{gasolina.map(g => {
                const cam = camiones.find(c => c.id === g.camion_id)
                return <tr key={g.id}><td style={td}>{g.fecha}</td><td style={{ ...td, fontWeight: 600 }}>{cam?.economico||'—'}</td><td style={td}>{g.litros} lts</td><td style={{ ...td, fontWeight: 600 }}>${Number(g.monto||0).toLocaleString()}</td><td style={td}>{g.gasolinera}</td></tr>
              })}</tbody>
            </table>
          </div>
          {gasolina.length === 0 && <div style={{ textAlign: 'center', color: m, fontSize: 12, padding: 20 }}>No hay registros aún</div>}
        </div>
      </>}

      {view === 'mantenimiento' && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
        {camiones.map(c=><div key={c.id} style={card}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🚛 {c.economico}</div>{['Aceite','Llantas','Frenos','Seguro','Verificación'].map(t=><div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: br, fontSize: 11 }}><span>{t}</span><span style={{ color: '#9E9E9B', fontSize: 10 }}>Pendiente</span></div>)}</div>)}
      </div>}

      {view === 'reportes' && <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,minmax(0,1fr))', gap: 10 }}>
        {[['📍',viajes.length,'Viajes totales'],['✅',viajes.filter(v=>v.estatus==='entregado').length,'Entregados'],['📄',facturas.length,'Facturas'],['💰','$'+facturas.filter(f=>f.estatus==='cobrada').reduce((a,f)=>a+Number(f.monto||0),0).toLocaleString(),'Cobrado'],['⛽','$'+totalGas.toLocaleString(),'Gasolina'],['🚛',camiones.length,'Unidades']].map(([i,v,l])=><div key={l} style={{ ...card, textAlign: 'center' }}><div style={{ fontSize: 22, color: r, marginBottom: 6 }}>{i}</div><div style={{ fontSize: 18, fontWeight: 600 }}>{v}</div><div style={{ fontSize: 10, color: m }}>{l}</div></div>)}
      </div>}
    </div>
  )

  // ─── LAYOUT MÓVIL CON HAMBURGUESA ───────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F7F6', fontFamily: 'system-ui,sans-serif', fontSize: 13, color: b }}>
        <div style={{ background: r, color: w, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: w, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1 }}>☰</button>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 14 }}>FYS</div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{viewTitle[view]}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {view === 'viajes' && <button style={{ ...btnR, fontSize: 11, padding: '5px 10px' }} onClick={() => setModal('viaje')}>+ Viaje</button>}
            {view === 'flota' && <button style={{ ...btnR, fontSize: 11, padding: '5px 10px' }} onClick={() => setModal('camion')}>+ Unidad</button>}
            {view === 'choferes' && <button style={{ ...btnR, fontSize: 11, padding: '5px 10px' }} onClick={() => { loadUsuarios(); setModal('chofer') }}>+ Chofer</button>}
            {view === 'facturas' && <button style={{ ...btnR, fontSize: 11, padding: '5px 10px' }} onClick={() => setModal('factura')}>+ Factura</button>}
          </div>
        </div>

        {menuOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setMenuOpen(false)}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 260, background: w, boxShadow: '4px 0 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              <div style={{ background: r, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: w, fontWeight: 700, fontSize: 16 }}>FYS</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Servicios Integrales del Sureste</div>
                </div>
                <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: w, fontSize: 22, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ padding: '12px 16px', borderBottom: br, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: r, color: w, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{usuario?.email?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{usuario?.email?.split('@')[0]}</div>
                  <div style={{ fontSize: 10, color: m }}>Administrador</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {[['Principal', navLinks.slice(0,1)], ['Operaciones', navLinks.slice(1,4)], ['Finanzas', navLinks.slice(4,6)], ['Gestión', navLinks.slice(6)]].map(([section, links]) => (
                  <div key={section}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9E9E9B', padding: '10px 16px 4px', textTransform: 'uppercase', letterSpacing: .7 }}>{section}</div>
                    {links.map(({ v, icon, label, count }) => (
                      <div key={v} onClick={() => { setView(v); setMenuOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderLeft: view === v ? '3px solid ' + r : '3px solid transparent', background: view === v ? '#fff0f2' : 'transparent', color: view === v ? r : b, fontSize: 14 }}>
                        <span style={{ fontSize: 20 }}>{icon}</span>
                        <span>{label}</span>
                        {count ? <span style={{ marginLeft: 'auto', background: r, color: w, fontSize: 10, padding: '2px 7px', borderRadius: 10 }}>{count}</span> : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px', borderTop: br }}>
                <button onClick={onLogout} style={{ ...btnG, width: '100%', textAlign: 'center', padding: 12, fontSize: 13 }}>Cerrar sesión</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: 12 }}>{mainContent}</div>
        {modalContent}
        {confirmarModal}
      </div>
    )
  }

  // ─── LAYOUT DESKTOP ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui,sans-serif', fontSize: 13, color: b, background: '#F7F7F6' }}>
      <div style={{ width: 190, flexShrink: 0, background: w, borderRight: br, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 14px 12px', borderBottom: br }}>
          <div style={{ background: r, color: w, fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 6, display: 'inline-block' }}>FYS</div>
          <div style={{ fontSize: 10, color: m, marginTop: 3 }}>Servicios Integrales del Sureste</div>
        </div>
        <div style={{ margin: '10px 14px 0', background: '#F7F7F6', border: br, borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: r }} />
          <div><div style={{ fontSize: 11, fontWeight: 500 }}>{usuario?.email?.split('@')[0]}</div><div style={{ fontSize: 10, color: m }}>Administrador</div></div>
        </div>
        <div style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
          {[['Principal', navLinks.slice(0,1)], ['Operaciones', navLinks.slice(1,4)], ['Finanzas', navLinks.slice(4,6)], ['Gestión', navLinks.slice(6)]].map(([section, links]) => (
            <div key={section}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#9E9E9B', padding: '10px 14px 4px', textTransform: 'uppercase', letterSpacing: .7 }}>{section}</div>
              {links.map(({v, icon, label, count}) => (
                <div key={v} onClick={() => setView(v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', borderLeft: view === v ? '2px solid ' + r : '2px solid transparent', background: view === v ? '#fff0f2' : 'transparent', color: view === v ? r : m, fontSize: 12, fontWeight: view === v ? 500 : 400 }}>
                  <span>{icon}</span>{label}
                  {count ? <span style={{ marginLeft: 'auto', background: r, color: w, fontSize: 9, padding: '1px 5px', borderRadius: 10 }}>{count}</span> : null}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: br }}>
          <button onClick={onLogout} style={{ ...btnG, width: '100%', textAlign: 'center', fontSize: 11 }}>Cerrar sesión</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{ background: w, borderBottom: br, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{viewTitle[view]}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {view === 'viajes' && <button style={btnR} onClick={() => setModal('viaje')}>+ Nuevo viaje</button>}
            {view === 'flota' && <button style={btnR} onClick={() => setModal('camion')}>+ Agregar unidad</button>}
            {view === 'choferes' && <button style={btnR} onClick={() => { loadUsuarios(); setModal('chofer') }}>+ Agregar chofer</button>}
            {view === 'facturas' && <button style={btnR} onClick={() => setModal('factura')}>+ Nueva factura</button>}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: r, color: w, fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{usuario?.email?.[0]?.toUpperCase()}</div>
          </div>
        </div>
        {mainContent}
      </div>
      {modalContent}
      {confirmarModal}
    </div>
  )
}
