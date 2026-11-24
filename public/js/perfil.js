// Página de perfil (/perfil): datos, foto, banner, descripción y canciones.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage,
            lock: async (_n, _t, fn) => await fn() } },
);

const root = document.getElementById('perfil-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function conTiempo(promesa, ms, paso) {
  return Promise.race([
    promesa,
    new Promise((_, rej) => setTimeout(() => rej(new Error('Se quedó en el paso: ' + paso)), ms)),
  ]);
}

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

function mostrarSinSesion() {
  root.innerHTML = `
    <div class="pp-card">
      <p>Para ver tu perfil primero inicia sesión.</p>
      <a class="auth-submit pp-btn" href="/?login=1">Iniciar sesión</a>
    </div>`;
}

async function iniciar() {
  let session = null;
  try {
    const { data } = await conTiempo(sb.auth.getSession(), 10000, 'sesión');
    session = data.session;
  } catch {
    session = null;
  }
  if (!session) { mostrarSinSesion(); return; }
  const uid = session.user.id;

  let p = null;
  try {
    const { data } = await conTiempo(
      sb.from('profiles').select('username,age,gender,bio,avatar_url,banner_url').eq('id', uid).single(),
      10000, 'cargar perfil');
    p = data;
  } catch (err) {
    root.innerHTML = `<p class="pp-error">Error al cargar: ${esc(err?.message || err)}</p>`;
    return;
  }

  pintar(uid, p || {});
}

function pintar(uid, p) {
  root.innerHTML = `
    <section class="pf pp-card">
      <div class="pf-banner" id="pf-banner" style="${p.banner_url ? `background-image:url('${esc(p.banner_url)}')` : ''}">
        <label class="pf-pick">Banner<input type="file" accept="image/*" id="pf-banner-file" hidden></label>
      </div>
      <div class="pf-head">
        <label class="pf-avatar" id="pf-avatar">
          ${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : 'Foto de perfil'}
          <input type="file" accept="image/*" id="pf-avatar-file" hidden>
        </label>
      </div>

      <form id="profile-form" class="auth-form">
        <label>Nombre de usuario<input name="username" maxlength="24" required value="${esc(p.username)}"></label>
        <label>Edad<input name="age" type="number" min="18" max="120" required value="${esc(p.age)}"></label>
        <label>Género
          <select name="gender">
            <option value="hombre" ${p.gender === 'hombre' ? 'selected' : ''}>Hombre</option>
            <option value="mujer" ${p.gender === 'mujer' ? 'selected' : ''}>Mujer</option>
            <option value="otro" ${p.gender === 'otro' ? 'selected' : ''}>Otro</option>
          </select>
        </label>
        <label>Descripción<textarea name="bio" maxlength="300" rows="3">${esc(p.bio)}</textarea></label>
        <p class="auth-msg" id="pmsg" role="status"></p>
        <div class="auth-actions">
          <button type="button" class="auth-signout" id="signout">Cerrar sesión</button>
          <button type="submit" class="auth-submit">Guardar</button>
        </div>
      </form>

      <div class="pf-songs">
        <h3>Canciones</h3>
        <div id="pf-song-list"></div>
        <form id="song-form" class="auth-form">
          <label>Título de la canción<input name="title" maxlength="60" required></label>
          <label>Archivo de audio<input name="file" type="file" accept="audio/*" required></label>
          <p class="auth-msg" id="smsg" role="status"></p>
          <button type="submit" class="auth-submit">Agregar canción</button>
        </form>
      </div>
    </section>`;

  const pmsg = document.getElementById('pmsg');
  const smsg = document.getElementById('smsg');
  const pform = document.getElementById('profile-form');
  const sform = document.getElementById('song-form');

  document.getElementById('signout').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.href = '/';
  });

  pform.addEventListener('submit', async (e) => {
    e.preventDefault();
    pmsg.textContent = '';
    const f = Object.fromEntries(new FormData(pform));
    const age = Number(f.age);
    if (!age || age < 18) { pmsg.textContent = 'Debes tener 18 años o más.'; return; }
    try {
      const { error } = await conTiempo(
        sb.from('profiles').update({ username: f.username.trim(), age, gender: f.gender, bio: f.bio.trim() }).eq('id', uid),
        15000, 'guardar');
      if (error) throw error;
      pmsg.textContent = 'Guardado.';
    } catch (err) {
      pmsg.textContent = err?.message || 'No se pudo guardar.';
    }
  });

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

  async function alSubir(bucket, campo, file) {
    try {
      const url = await subirImagen(bucket, campo, file);
      if (campo === 'avatar') {
        document.getElementById('pf-avatar').innerHTML = `<img alt="" src="${esc(url)}"><input type="file" accept="image/*" id="pf-avatar-file" hidden>`;
        bindAvatar();
      } else {
        document.getElementById('pf-banner').style.backgroundImage = `url('${esc(url)}')`;
      }
      pmsg.textContent = 'Guardado.';
    } catch (err) {
      pmsg.textContent = 'Error al subir: ' + (err?.message || err);
      alert('Error al subir: ' + (err?.message || err));
    }
  }

  function bindAvatar() {
    document.getElementById('pf-avatar-file')?.addEventListener('change', (e) => {
      const file = e.target.files[0]; if (file) alSubir('avatars', 'avatar', file);
    });
  }
  bindAvatar();
  document.getElementById('pf-banner-file').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (file) alSubir('banners', 'banner', file);
  });

  async function cargarCanciones() {
    const list = document.getElementById('pf-song-list');
    const { data, error } = await conTiempo(
      sb.from('songs').select('id,title,file_url').eq('user_id', uid).order('created_at', { ascending: false }),
      10000, 'cargar canciones');
    if (error) { list.textContent = error.message; return; }
    if (!data.length) { list.innerHTML = '<p class="pf-empty">Aún no hay canciones.</p>'; return; }
    list.innerHTML = data.map((c) => `
      <div class="pf-song">
        <strong>${esc(c.title)}</strong>
        <audio controls preload="none" src="${esc(c.file_url)}"></audio>
        <button type="button" class="auth-cancel" data-del="${esc(c.id)}" data-url="${esc(c.file_url)}">Borrar</button>
      </div>`).join('');
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      try {
        const path = decodeURIComponent(new URL(b.dataset.url).pathname.split('/canciones/')[1] || '');
        if (path) await sb.storage.from('canciones').remove([path]);
        await sb.from('songs').delete().eq('id', b.dataset.del);
        cargarCanciones();
      } catch (err) { alert('No se pudo borrar: ' + (err?.message || err)); }
    }));
  }

  sform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(sform);
    const title = String(fd.get('title') || '').trim();
    const file = fd.get('file');
    smsg.textContent = 'Subiendo...';
    try {
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: upErr } = await conTiempo(
        sb.storage.from('canciones').upload(path, file, { contentType: file.type }), 120000, 'subir canción');
      if (upErr) throw upErr;
      const url = sb.storage.from('canciones').getPublicUrl(path).data.publicUrl;
      const { error } = await sb.from('songs').insert({ user_id: uid, title, file_url: url });
      if (error) throw error;
      sform.reset();
      smsg.textContent = '';
      cargarCanciones();
    } catch (err) {
      smsg.textContent = err?.message || 'No se pudo subir.';
    }
  });

  cargarCanciones();
}

iniciar();
