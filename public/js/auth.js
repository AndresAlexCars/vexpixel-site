// Inicio de sesión, registro y perfil con Supabase (correo + contraseña).
// La clave publicable puede estar en el navegador; la seguridad la dan las políticas RLS y de Storage.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const SUPABASE_URL = 'https://mimwoqvbssiexkstvqbo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    lock: async (_name, _timeout, fn) => await fn(),
  },
});

const L = {
  es: { signin: 'Iniciar sesión', signout: 'Cerrar sesión', login: 'Entrar', signup: 'Crear cuenta',
        email: 'Correo', password: 'Contraseña', username: 'Nombre de usuario', age: 'Edad',
        gender: 'Género', male: 'Hombre', female: 'Mujer', other: 'Otro', save: 'Guardar',
        profile: 'Mi perfil', saved: 'Guardado.', bio: 'Descripción', avatar: 'Foto de perfil',
        banner: 'Banner', songs: 'Canciones', songTitle: 'Título de la canción', songFile: 'Archivo de audio',
        addSong: 'Agregar canción', del: 'Borrar', noSongs: 'Aún no hay canciones.',
        ageErr: 'Debes tener 18 años o más.', confirm: 'Revisa tu correo para confirmar la cuenta.',
        err: 'No se pudo completar. Revisa tus datos.', uploading: 'Subiendo...' },
  en: { signin: 'Sign in', signout: 'Sign out', login: 'Log in', signup: 'Create account',
        email: 'Email', password: 'Password', username: 'Username', age: 'Age',
        gender: 'Gender', male: 'Male', female: 'Female', other: 'Other', save: 'Save',
        profile: 'My profile', saved: 'Saved.', bio: 'Description', avatar: 'Profile photo',
        banner: 'Banner', songs: 'Songs', songTitle: 'Song title', songFile: 'Audio file',
        addSong: 'Add song', del: 'Delete', noSongs: 'No songs yet.',
        ageErr: 'You must be 18 or older.', confirm: 'Check your email to confirm the account.',
        err: 'Could not complete. Check your details.', uploading: 'Uploading...' },
};
const lang = () => (document.documentElement.lang || navigator.language || 'es').startsWith('en') ? 'en' : 'es';
const tx = () => L[lang()];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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

  // ── Diálogo de perfil ──
  const pdlg = document.createElement('dialog');
  pdlg.className = 'auth-dialog profile-dialog';
  pdlg.innerHTML = `
    <div class="pf">
      <div class="pf-banner" id="pf-banner"><label class="pf-pick"><span data-p="banner"></span>
        <input type="file" accept="image/*" id="pf-banner-file" hidden></label></div>
      <div class="pf-head">
        <label class="pf-avatar" id="pf-avatar"><img alt=""><span data-p="avatar"></span>
          <input type="file" accept="image/*" id="pf-avatar-file" hidden></label>
        <button type="button" class="auth-cancel pf-close">×</button>
      </div>
      <form id="profile-form" class="auth-form">
        <label><span data-f="username"></span><input name="username" maxlength="24" required></label>
        <label><span data-f="age"></span><input name="age" type="number" min="18" max="120" required></label>
        <label><span data-f="gender"></span>
          <select name="gender">
            <option value="hombre" data-g="male"></option>
            <option value="mujer" data-g="female"></option>
            <option value="otro" data-g="other"></option>
          </select>
        </label>
        <label><span data-p="bio"></span><textarea name="bio" maxlength="300" rows="3"></textarea></label>
        <p class="auth-msg" role="status"></p>
        <div class="auth-actions">
          <button type="button" class="auth-signout"></button>
          <button type="submit" class="auth-submit"></button>
        </div>
      </form>
      <div class="pf-songs">
        <h3 data-p="songs"></h3>
        <div id="pf-song-list"></div>
        <form id="song-form" class="auth-form">
          <label><span data-p="songTitle"></span><input name="title" maxlength="60" required></label>
          <label><span data-p="songFile"></span><input name="file" type="file" accept="audio/*" required></label>
          <p class="auth-msg" role="status"></p>
          <button type="submit" class="auth-submit" data-p="addSong"></button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(pdlg);

  let mode = 'login';
  let profile = null;
  let uid = null;
  const form = dlg.querySelector('#auth-form');
  const msg = dlg.querySelector('.auth-msg');
  const pform = pdlg.querySelector('#profile-form');
  const pmsg = pform.querySelector('.auth-msg');
  const sform = pdlg.querySelector('#song-form');
  const smsg = sform.querySelector('.auth-msg');

  function paint() {
    const s = tx();
    dlg.querySelector('[data-mode="login"]').textContent = s.login;
    dlg.querySelector('[data-mode="signup"]').textContent = s.signup;
    dlg.querySelectorAll('[data-f]').forEach((el) => (el.textContent = s[el.dataset.f]));
    dlg.querySelectorAll('[data-g]').forEach((el) => (el.textContent = s[el.dataset.g]));
    dlg.querySelector('.auth-submit').textContent = mode === 'login' ? s.login : s.signup;
    dlg.querySelectorAll('.auth-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    dlg.querySelector('.auth-signup').hidden = mode !== 'signup';

    pdlg.querySelectorAll('[data-p]').forEach((el) => (el.textContent = s[el.dataset.p]));
    pdlg.querySelectorAll('[data-f]').forEach((el) => (el.textContent = s[el.dataset.f]));
    pdlg.querySelectorAll('[data-g]').forEach((el) => (el.textContent = s[el.dataset.g]));
    pform.querySelector('.auth-submit').textContent = s.save;
    pform.querySelector('.auth-signout').textContent = s.signout;
  }

  dlg.querySelectorAll('.auth-tabs button').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode; msg.textContent = ''; paint();
  }));
  dlg.querySelector('.auth-cancel').addEventListener('click', () => dlg.close());
  pdlg.querySelector('.pf-close').addEventListener('click', () => pdlg.close());
  pform.querySelector('.auth-signout').addEventListener('click', async () => {
    await sb.auth.signOut();
    pdlg.close();
  });

  // ── Entrar / registrar ──
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
            username: f.username.trim() || f.email.split('@')[0], age, gender: f.gender,
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

  // ── Guardar datos del perfil ──
  pform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = tx();
    const f = Object.fromEntries(new FormData(pform));
    pmsg.textContent = '';
    const age = Number(f.age);
    if (!age || age < 18) { pmsg.textContent = s.ageErr; return; }
    try {
      const username = f.username.trim();
      const { error } = await sb.from('profiles').update({
        username, age, gender: f.gender, bio: f.bio.trim(),
      }).eq('id', uid);
      if (error) throw error;
      profile = { ...profile, username, age, gender: f.gender, bio: f.bio.trim() };
      btn.textContent = username;
      pmsg.textContent = s.saved;
    } catch (err) {
      pmsg.textContent = err?.message ? err.message : s.err;
    }
  });

  // ── Subir foto y banner ──
  async function reducirImagen(file, maxLado = 1600) {
    if (!file.type.startsWith('image/')) return file;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob || file;
  }

  // Espera una promesa, pero avisa si tarda más de lo permitido
  function conTiempo(promesa, ms, paso) {
    return Promise.race([
      promesa,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Se quedó en el paso: ' + paso)), ms)),
    ]);
  }

  async function subirImagen(bucket, campo, file) {
    pmsg.textContent = 'Paso 1/3: reduciendo la imagen...';
    const img = await conTiempo(reducirImagen(file), 30000, 'reducir imagen');

    pmsg.textContent = 'Paso 2/3: subiendo el archivo...';
    const path = `${uid}/${campo}-${Date.now()}.jpg`;
    const { error: upErr } = await conTiempo(
      sb.storage.from(bucket).upload(path, img, { contentType: 'image/jpeg' }), 90000, 'subir archivo');
    if (upErr) throw upErr;

    pmsg.textContent = 'Paso 3/3: guardando el enlace...';
    const url = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const { error } = await conTiempo(
      sb.from('profiles').update({ [campo === 'avatar' ? 'avatar_url' : 'banner_url']: url }).eq('id', uid),
      30000, 'guardar enlace');
    if (error) throw error;
    return url;
  }

  async function alSubirImagen(bucket, campo, file) {
    pmsg.textContent = tx().uploading;
    try {
      const url = await subirImagen(bucket, campo, file);
      profile = { ...profile, [campo === 'avatar' ? 'avatar_url' : 'banner_url']: url };
      pintarPerfil();
      pmsg.textContent = tx().saved;
    } catch (err) {
      const texto = (err?.message || tx().err);
      pmsg.textContent = 'Error al subir: ' + texto;
      alert('Error al subir: ' + texto);
    }
  }
  pdlg.querySelector('#pf-avatar-file').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (file) alSubirImagen('avatars', 'avatar', file);
  });
  pdlg.querySelector('#pf-banner-file').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (file) alSubirImagen('banners', 'banner', file);
  });

  // ── Canciones ──
  async function cargarCanciones() {
    const list = pdlg.querySelector('#pf-song-list');
    const { data, error } = await sb.from('songs').select('id,title,file_url').eq('user_id', uid).order('created_at', { ascending: false });
    if (error) { list.textContent = error.message; return; }
    if (!data.length) { list.innerHTML = `<p class="pf-empty">${esc(tx().noSongs)}</p>`; return; }
    list.innerHTML = data.map((c) => `
      <div class="pf-song" data-id="${esc(c.id)}">
        <strong>${esc(c.title)}</strong>
        <audio controls preload="none" src="${esc(c.file_url)}"></audio>
        <button type="button" class="auth-cancel" data-del="${esc(c.id)}">${esc(tx().del)}</button>
      </div>`).join('');
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const row = data.find((c) => c.id === b.dataset.del);
      const path = decodeURIComponent(new URL(row.file_url).pathname.split('/canciones/')[1] || '');
      if (path) await sb.storage.from('canciones').remove([path]);
      await sb.from('songs').delete().eq('id', row.id);
      cargarCanciones();
    }));
  }

  sform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = tx();
    const fd = new FormData(sform);
    const title = String(fd.get('title') || '').trim();
    const file = fd.get('file');
    smsg.textContent = s.uploading;
    try {
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: upErr } = await sb.storage.from('canciones').upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const url = sb.storage.from('canciones').getPublicUrl(path).data.publicUrl;
      const { error } = await sb.from('songs').insert({ user_id: uid, title, file_url: url });
      if (error) throw error;
      sform.reset();
      smsg.textContent = '';
      cargarCanciones();
    } catch (err) {
      smsg.textContent = err?.message || s.err;
    }
  });

  // ── Pintar el perfil ──
  function pintarPerfil() {
    const banner = pdlg.querySelector('#pf-banner');
    banner.style.backgroundImage = profile?.banner_url ? `url("${profile.banner_url}")` : '';
    const img = pdlg.querySelector('#pf-avatar img');
    img.src = profile?.avatar_url || '';
    img.hidden = !profile?.avatar_url;
    pform.username.value = profile?.username || '';
    pform.age.value = profile?.age || '';
    pform.gender.value = profile?.gender || 'hombre';
    pform.bio.value = profile?.bio || '';
  }

  async function loadProfile() {
    const { data } = await sb.from('profiles')
      .select('username,age,gender,bio,avatar_url,banner_url').eq('id', uid).single();
    profile = data;
    return data;
  }

  // ── Perfil como página propia (#perfil) con carga visible ──
  function abrirPerfil() {
    paint();
    pmsg.textContent = '';
    pdlg.classList.add('loading');
    if (!pdlg.open) pdlg.showModal();
    conTiempo(loadProfile(), 15000, 'cargar perfil')
      .then(() => {
        pintarPerfil();
        pdlg.classList.remove('loading');
        conTiempo(cargarCanciones(), 15000, 'cargar canciones')
          .catch((err) => { pmsg.textContent = 'Canciones: ' + (err?.message || err); });
      })
      .catch((err) => {
        pdlg.classList.remove('loading');
        pmsg.textContent = 'Error al cargar: ' + (err?.message || err);
      });
  }

  // Tocar el botón con sesión lleva a #perfil; sin sesión, abre el formulario de entrar.
  btn.addEventListener('click', () => {
    if (uid) {
      location.hash = 'perfil';
      return;
    }
    mode = 'login'; msg.textContent = ''; paint();
    dlg.showModal();
  });

  // El botón de atrás del celular cierra el perfil y vuelve a la galería.
  window.addEventListener('hashchange', () => {
    if (location.hash === '#perfil') {
      if (uid) abrirPerfil();
    } else if (pdlg.open) {
      pdlg.close();
    }
  });
  pdlg.addEventListener('close', () => {
    if (location.hash === '#perfil') history.back();
  });

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      uid = session.user.id;
      const p = await loadProfile();
      btn.textContent = p?.username || tx().signout;
    } else {
      uid = null;
      profile = null;
      btn.textContent = tx().signin;
    }
  });
}
