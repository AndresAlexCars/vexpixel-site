// Inicio de sesión y registro con Supabase (correo + contraseña).
// La clave publicable puede estar en el navegador; la seguridad la dan las políticas RLS de la tabla profiles.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://mimwoqvbssiexkstvqbo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const L = {
  es: { signin: 'Iniciar sesión', signout: 'Cerrar sesión', login: 'Entrar', signup: 'Crear cuenta',
        email: 'Correo', password: 'Contraseña', username: 'Nombre de usuario', age: 'Edad',
        gender: 'Género', male: 'Hombre', female: 'Mujer', other: 'Otro', submit: 'Continuar',
        ageErr: 'Debes tener 18 años o más.', confirm: 'Revisa tu correo para confirmar la cuenta.',
        err: 'No se pudo completar. Revisa tus datos.' },
  en: { signin: 'Sign in', signout: 'Sign out', login: 'Log in', signup: 'Create account',
        email: 'Email', password: 'Password', username: 'Username', age: 'Age',
        gender: 'Gender', male: 'Male', female: 'Female', other: 'Other', submit: 'Continue',
        ageErr: 'You must be 18 or older.', confirm: 'Check your email to confirm the account.',
        err: 'Could not complete. Check your details.' },
};
const lang = () => (document.documentElement.lang || navigator.language || 'es').startsWith('en') ? 'en' : 'es';
const tx = () => L[lang()];

const btn = document.getElementById('signin-btn');
if (btn) {
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet auth-dialog';
  dlg.innerHTML = `
    <form method="dialog" class="auth-form" id="auth-form">
      <div class="auth-tabs">
        <button type="button" data-mode="login" class="on"></button>
        <button type="button" data-mode="signup"></button>
      </div>
      <label><span data-f="email"></span><input name="email" type="email" required autocomplete="email"></label>
      <label><span data-f="password"></span><input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
      <div class="auth-signup" hidden>
        <label><span data-f="username"></span><input name="username" maxlength="24" autocomplete="username"></label>
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

  let mode = 'login';
  const form = dlg.querySelector('#auth-form');
  const msg = dlg.querySelector('.auth-msg');

  function paint() {
    const s = tx();
    dlg.querySelector('[data-mode="login"]').textContent = s.login;
    dlg.querySelector('[data-mode="signup"]').textContent = s.signup;
    dlg.querySelectorAll('[data-f]').forEach((el) => (el.textContent = s[el.dataset.f]));
    dlg.querySelectorAll('[data-g]').forEach((el) => (el.textContent = s[el.dataset.g]));
    dlg.querySelector('.auth-submit').textContent = mode === 'login' ? s.login : s.signup;
    dlg.querySelectorAll('.auth-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    dlg.querySelector('.auth-signup').hidden = mode !== 'signup';
    form.password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  }

  dlg.querySelectorAll('.auth-tabs button').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode; msg.textContent = ''; paint();
  }));
  dlg.querySelector('.auth-cancel').addEventListener('click', () => dlg.close());

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

  btn.addEventListener('click', async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      if (confirm(tx().signout + '?')) await sb.auth.signOut();
      return;
    }
    mode = 'login'; msg.textContent = ''; paint();
    dlg.showModal();
  });

  sb.auth.onAuthStateChange((_event, session) => {
    btn.textContent = session ? tx().signout : tx().signin;
  });
}
