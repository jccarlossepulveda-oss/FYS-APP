import { useState } from 'react'
import { supabase } from './supabase'
export default function Login({onLogin}){
const[correo,setCorreo]=useState('')
const[pw,setPw]=useState('')
const[loading,setLoading]=useState(false)
const[error,setError]=useState('')
const r='#C8001E',w='#fff',m='#6B6B68',br='0.5px solid #E0DFDC'
async function entrar(){
setLoading(true);setError('')
const{data,error:e}=await supabase.auth.signInWithPassword({email:correo,password:pw})
if(e){setError('Correo o contraseña incorrectos');setLoading(false);return}
const{data:p}=await supabase.from('perfiles').select('rol').eq('id',data.user.id).single()
onLogin(data.user,p?.rol||'chofer')
setLoading(false)
}
return(
<div style={{minHeight:'100vh',background:'#F7F7F6',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
<div style={{background:w,border:br,borderRadius:16,padding:32,width:320,boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
<div style={{textAlign:'center',marginBottom:24}}>
<div style={{background:r,color:w,fontSize:18,fontWeight:700,padding:'8px 16px',borderRadius:8,display:'inline-block'}}>FYS</div>
<div style={{fontSize:11,color:m,marginTop:6}}>Servicios Integrales del Sureste</div>
<div style={{fontSize:14,fontWeight:600,marginTop:16}}>Iniciar sesión</div>
</div>
<div style={{marginBottom:12}}><label style={{fontSize:11,color:m,display:'block',marginBottom:4}}>Correo</label><input type="email" value={correo} onChange={e=>setCorreo(e.target.value)} placeholder="tu@correo.com" style={{width:'100%',padding:'8px 12px',border:br,borderRadius:8,fontSize:13,boxSizing:'border-box'}}/></div>
<div style={{marginBottom:16}}><label style={{fontSize:11,color:m,display:'block',marginBottom:4}}>Contraseña</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&entrar()} style={{width:'100%',padding:'8px 12px',border:br,borderRadius:8,fontSize:13,boxSizing:'border-box'}}/></div>
{error&&<div style={{background:'#FCEBEB',color:'#A32D2D',fontSize:12,padding:'8px 12px',borderRadius:8,marginBottom:12}}>{error}</div>}
<button onClick={entrar} disabled={loading} style={{width:'100%',background:r,color:w,border:'none',padding:10,borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>{loading?'Entrando...':'Entrar'}</button>
</div>
</div>
)
}