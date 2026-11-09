/* NEXLAB Beta 0.26.82 — fluxo de autenticação reconstruído: usuário + senha. */
import { Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-oficial-consolidado";

export function normalizeUsername(value){
  return String(value||'')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9._-]+/g,'')
    .replace(/^\.+|\.+$/g,'');
}

function authError(code,message){
  const error=new Error(message);
  error.code=code;
  return error;
}

export async function loginByUsername(username,password){
  const normalized=normalizeUsername(username);
  if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized)||!String(password||'')){
    throw authError('invalid_credentials','Usuário ou senha inválidos.');
  }

  const {data,error}=await supabase.functions.invoke('nexlab-login-username',{
    body:{username:normalized,password:String(password)}
  });

  if(error||!data?.ok||!data?.session?.access_token||!data?.session?.refresh_token){
    const status=Number(error?.context?.status||0);
    if(status===429||data?.error==='too_many_attempts'){
      throw authError('too_many_attempts','Muitas tentativas. Aguarde alguns minutos e tente novamente.');
    }
    if(status===503||data?.error==='temporarily_unavailable'){
      throw authError('temporarily_unavailable','O acesso está temporariamente indisponível. Tente novamente em instantes.');
    }
    throw authError('invalid_credentials','Usuário ou senha inválidos.');
  }

  const {data:sessionData,error:setError}=await supabase.auth.setSession({
    access_token:data.session.access_token,
    refresh_token:data.session.refresh_token,
  });
  if(setError||!sessionData?.session){
    throw authError('session_failed','Não foi possível iniciar a sessão. Tente novamente.');
  }
  return sessionData;
}

export async function registerAccount({username,email,password,nome}){
  const normalized=normalizeUsername(username);
  const recoveryEmail=String(email||'').trim().toLowerCase();
  const fullName=String(nome||'').trim();
  const secret=String(password||'');

  if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized)){
    throw authError('invalid_username','Use de 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.');
  }
  if(!fullName) throw authError('missing_name','Preencha o nome completo.');
  if(!/^\S+@\S+\.\S+$/.test(recoveryEmail)) throw authError('invalid_email','Informe um e-mail válido para recuperação de senha.');
  if(secret.length<8) throw authError('weak_password','A senha deve ter pelo menos 8 caracteres.');

  const {data:availability,error:availabilityError}=await supabase.functions.invoke('nexlab-login-username',{
    body:{action:'username_available',username:normalized}
  });
  if(availabilityError||!availability?.ok){
    throw authError('availability_failed','Não foi possível validar o usuário agora. Tente novamente.');
  }
  if(availability.available!==true) throw authError('username_taken','Esse usuário já está em uso. Escolha outro.');

  const {data,error}=await supabase.auth.signUp({
    email:recoveryEmail,
    password:secret,
    options:{data:{nome:fullName,username:normalized}}
  });
  if(error){
    const text=String(error.message||'').toLowerCase();
    if(text.includes('already')||text.includes('registered')){
      throw authError('email_registered','Esse e-mail de recuperação já está vinculado a uma conta.');
    }
    throw error;
  }
  return data;
}

export async function requestPasswordReset(email,redirectTo){
  const recoveryEmail=String(email||'').trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(recoveryEmail)){
    throw authError('invalid_email','Informe um e-mail válido.');
  }
  const options=redirectTo?{redirectTo}:undefined;
  const {error}=await supabase.auth.resetPasswordForEmail(recoveryEmail,options);
  if(error) throw error;
  return true;
}
