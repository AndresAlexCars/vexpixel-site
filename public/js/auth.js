// Inicio de sesión, registro y perfil con Supabase (correo + contraseña).
// La clave publicable puede estar en el navegador; la seguridad la dan las políticas RLS de la tabla profiles.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://mimwoqvbssiexkstvqbo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const L = {
  es: { signin: 'Iniciar sesión', signout: 'Cerrar sesión', login: 'Entrar', signup: 'Crear cuenta',
        email: 'Correo', password: 'Contraseña', username: 'Nombre de usuario', age: 'Edad',
        gender: 'Género', male: 'Hombre', female: 'Mujer', other: 'Otro', save: 'Guardar',
        profile: 'Mi perfil', saved: 'Guardado.', ageErr: 'Debes tener 18 años o más.',
        confirm: 'Revisa tu correo para confirmar la cuenta.', err: 'No se pudo completar. Revisa tus datos.' },
  en: { signin: 'Sign in', signout: 'Sign out', login: 'Log in', signup: 'Create account',
        email: 'Email', password: 'Password', username: 'Username', age: 'Age',
        gender: 'Gender', male: 'Male', female: 'Female', other: 'Other', save: 'Save',
        profile: 'My profile', saved: 'Saved.', ageErr: 'You must be 18 or older.',
        confirm: 'Check your email to confirm the account.', err: 'Could not complete. Check your details.' },
};
const lang = () => (document.documentElement.lang || navigator.language || 'es').startsWith('en') ? 'en' : 'es';
const tx = () => L[lang()];

const btn = document.getElementById('signin-btn');
if (btn) {
  // ── Diálogo de entrar / crear cuenta ──
  const dlg = document.createElement('dialog');
  dlg.className = 'auth-dialog';
  dlg.innerHTML = `
    <form method="dialog" class="auth-form" id="auth-form">
      <div class="auth-tabs">
        <button type="button" data-mode="login" class="on"></button>
        <button type="button" data-mode="signup"></button>
      </div>
      <label><span data-f="email"></span><input name="email" type="email" required autocomplete="email"></label>
      <label><span data-f="password"></span><input name="password" type="password" required minlength="6"></label>
      <div class="auth-signup" hidden>
        <label><span data-f="username"></span><input name="username" maxlength="24"></label>
        <label><span data-f="age"></span><input name="age" type="number" min="18" max="120"></label>
        <label><span data-f="gender"></span>
          <select name="gender">
            <option value="hombre" data-g="male"></option>
            <option value="mujer" data-g="female"></option>
            <option value="otro" data-g="other"></option>
          </select>
        </label>
      </div>
      <p class="auth-msg" role="status"></p>
      <div class="auth-actions">
        <button type="button" class="auth-cancel">×</button>
        <button type="submit" class="auth-submit"></button>
      </div>
    </form>`;
  document.body.appendChild(dlg);

  // ── Diálogo de perfil (cuando ya hay sesión) ──
  const pdlg = document.createElement('dialog');
  pdlg.className = 'auth-dialog';
  pdlg.innerHTML = `
    <form method="dialog" class="auth-form" id="profile-form">
      <p class="auth-title" data-p="profile"></p>
      <label><span data-f="username"></span><input name="username" maxlength="24" required></label>
      <label><span data-f="age"></span><input name="age" type="number" min="18" max="120" required></label>
      <label><span data-f="gender"></span>
        <select name="gender">
          <option value="hombre" data-g="male"></option>
          <option value="mujer" data-g="female"></option>
          <option value="otro" data-g="other"></option>
        </select>
      </label>
      <p class="auth-msg" role="status"></p>
      <div class="auth-actions">
        <button type="button" class="auth-signout"></button>
        <button type="button" class="auth-cancel">×</button>
        <button type="submit" class="auth-submit"></button>
      </div>
    </form>`;
  document.body.appendChild(pdlg);

  let mode = 'login';
  let profile = null;
  const form = dlg.querySelector('#auth-form');
  const msg = dlg.querySelector('.auth-msg');
  const pform = pdlg.querySelector('#profile-form');
  const pmsg = pdlg.querySelector('.auth-msg');

  function paint() {
    const s = tx();
    dlg.querySelector('[data-mode="login"]').textContent = s.login;
    dlg.querySelector('[data-mode="signup"]').textContent = s.signup;
    dlg.querySelectorAll('[data-f]').forEach((el) => (el.textContent = s[el.dataset.f]));
    dlg.querySelectorAll('[data-g]').forEach((el) => (el.textContent = s[el.dataset.g]));
    dlg.querySelector('.auth-submit').textContent = mode === 'login' ? s.login : s.signup;
    dlg.querySelectorAll('.auth-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    dlg.querySelector('.auth-signup').hidden = mode !== 'signup';

    pdlg.querySelector('[data-p="profile"]').textContent = s.profile;
    pdlg.querySelectorAll('[data-f]').forEach((el) => (el.textContent = s[el.dataset.f]));
    pdlg.querySelectorAll('[data-g]').forEach((el) => (el.textContent = s[el.dataset.g]));
    pdlg.querySelector('.auth-submit').textContent = s.save;
    pdlg.querySelector('.auth-signout').textContent = s.signout;
  }

  dlg.querySelectorAll('.auth-tabs button').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode; msg.textContent = ''; paint();
  }));
  dlg.querySelector('.auth-cancel').addEventListener('click', () => dlg.close());
  pdlg.querySelector('.auth-cancel').addEventListener('click', () => pdlg.close());
  pdlg.querySelector('.auth-signout').addEventListener('click', async () => {
    await sb.auth.signOut();
    pdlg.close();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = tx();
    const f = Object.fromEntries(new FormData(form));
    msg.textContent = '';
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        dlg.close();
      } else {
        const age = Number(f.age);
        if (!age || age < 18) { msg.textContent = s.ageErr; return; }
        const { data, error } = await sb.auth.signUp({ email: f.email, password: f.password });
        if (error) throw error;
        if (data.session) {
          const { error: upErr } = await sb.from('profiles').update({
            username: f.username.trim() || f.email.split('@')[0],
            age, gender: f.gender,
          }).eq('id', data.user.id);
          if (upErr) throw upErr;
          dlg.close();
        } else {
          msg.textContent = s.confirm;
        }
      }
    } catch (err) {
      msg.textContent = err?.message ? err.message : s.err;
    }
  });

  pform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = tx();
    const f = Object.fromEntries(new FormData(pform));
    pmsg.textContent = '';
    const age = Number(f.age);
    if (!age || age < 18) { pmsg.textContent = s.ageErr; return; }
    try {
      const { data: { session } } = await sb.auth.getSession();
      const { error } = await sb.from('profiles').update({
        username: f.username.trim(), age, gender: f.gender,
      }).eq('id', session.user.id);
      if (error) throw error;
      profile = { username: f.username.trim(), age, gender: f.gender };
      btn.textContent = profile.username;
      pmsg.textContent = s.saved;
    } catch (err) {
      pmsg.textContent = err?.message ? err.message : s.err;
    }
  });

  async function loadProfile(session) {
    const { data } = await sb.from('profiles').select('username,age,gender').eq('id', session.user.id).single();
    profile = data;
    return data;
  }

  btn.addEventListener('click', async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      const p = profile || await loadProfile(data.session);
      pform.username.value = p?.username || '';
      pform.age.value = p?.age || '';
      pform.gender.value = p?.gender || 'hombre';
      pmsg.textContent = '';
      paint();
      pdlg.showModal();
      return;
    }
    mode = 'login'; msg.textContent = ''; paint();
    dlg.showModal();
  });

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      const p = await loadProfile(session);
      btn.textContent = p?.username || tx().signout;
    } else {
      profile = null;
      btn.textContent = tx().signin;
    }
  });
}
