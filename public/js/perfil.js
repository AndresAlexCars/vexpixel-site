// Página de perfil (/perfil): tarjeta de perfil, reproductor y canciones.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage,
            lock: async (_n, _t, fn) => await fn() } },
);


const NOMBRE_OK = /^[A-Za-z0-9_]{3,24}$/;
const PALABRAS_NO = ['puta', 'puto', 'mierda', 'idiota', 'cabron', 'pendejo', 'verga', 'fuck', 'shit', 'bitch', 'nigger', 'fag'];
function nombreValido(n) {
  if (!NOMBRE_OK.test(n)) return 'Usa solo letras, números o _ (de 3 a 24 caracteres).';
  const b = n.toLowerCase();
  if (PALABRAS_NO.some((w) => b.includes(w))) return 'Ese nombre no está permitido.';
  return '';
}
const MSG_USADO = 'Este nombre de usuario ya está usado.';

const root = document.getElementById('perfil-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GENERO = { hombre: 'Hombre', mujer: 'Mujer', otro: 'Otro' };

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

// ── Reproductor único: una sola canción a la vez ──
const audio = new Audio();
audio.preload = 'metadata';
let lista = [];
let actual = -1;

function pintarEstado() {
  const btn = document.getElementById('pv-toggle');
  if (btn) btn.textContent = audio.paused ? '▶' : '❚❚';
  document.querySelectorAll('.pv-song').forEach((el) => {
    el.classList.toggle('on', Number(el.dataset.i) === actual);
  });
}

function cargar(i) {
  actual = i;
  audio.src = lista[i].file_url;
  document.getElementById('pv-title').textContent = lista[i].title;
  document.getElementById('pv-sub').textContent = `Canción ${i + 1} de ${lista.length}`;
  pintarEstado();
}

function reproducir(i) {
  if (i !== actual) cargar(i);
  audio.play().catch(() => {});
  pintarEstado();
}

function alternar() {
  if (!lista.length) return;
  if (actual < 0) return reproducir(0);
  if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  pintarEstado();
}

audio.addEventListener('play', pintarEstado);
audio.addEventListener('pause', pintarEstado);
audio.addEventListener('ended', () => {
  if (actual + 1 < lista.length) reproducir(actual + 1);
  else pintarEstado();
});
audio.addEventListener('timeupdate', () => {
  const seek = document.getElementById('pv-seek');
  if (seek && audio.duration) seek.value = String(Math.round((audio.currentTime / audio.duration) * 100));
});

// ── Carga inicial ──
async function iniciar() {
  let session = null;
  try {
    const { data } = await conTiempo(sb.auth.getSession(), 10000, 'sesión');
    session = data.session;
  } catch { session = null; }
  if (!session) {
    root.innerHTML = `<div class="pp-card"><p>Para ver tu perfil primero inicia sesión.</p>
      <a class="pv-btn pv-btn-main" href="/?login=1">Iniciar sesión</a></div>`;
    return;
  }
  const uid = session.user.id;
  try {
    const [pr, sg] = await Promise.all([
      conTiempo(sb.from('profiles').select('username,age,gender,bio,avatar_url,banner_url').eq('id', uid).single(), 10000, 'perfil'),
      conTiempo(sb.from('songs').select('id,title,file_url').eq('user_id', uid).order('created_at', { ascending: false }), 10000, 'canciones'),
    ]);
    if (pr.error) throw pr.error;
    lista = sg.data || [];
    pintar(uid, pr.data || {});
  } catch (err) {
    root.innerHTML = `<p class="pp-error">Error al cargar: ${esc(err?.message || err)}</p>`;
  }
}

function idCorto(uid) {
  return '#' + uid.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function pintar(uid, p) {
  const nombre = p.username || 'Usuario';
  root.innerHTML = `
    <section class="pv">
      <div class="pv-banner" id="pv-banner" style="${p.banner_url ? `background-image:url('${esc(p.banner_url)}')` : ''}">
        <label class="pv-pick">Cambiar banner<input type="file" accept="image/*" id="pf-banner-file" hidden></label>
        <div class="pv-name"><span>${esc(nombre)}</span> <small class="pv-id">ID ${esc(idCorto(uid))}</small></div>
      </div>

      <div class="pv-row">
        <label class="pv-avatar" id="pf-avatar">
          ${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : '<span>Foto</span>'}
          <input type="file" accept="image/*" id="pf-avatar-file" hidden>
          <i class="pv-dot"></i>
        </label>
        <div class="pv-info">
          <div class="pv-online" data-online-uid="${esc(uid)}"><i></i><span class="online-text">Desconectado</span></div>
          <div class="pv-tags">
            ${p.gender ? `<span class="tag tag-g">${esc(GENERO[p.gender] || p.gender)}</span>` : ''}
            ${p.age ? `<span class="tag tag-a">${esc(p.age)}</span>` : ''}
            <span class="tag">Español</span>
          </div>
        </div>
      </div>

      <div class="pv-player">
        <button type="button" id="pv-toggle" class="pv-play" aria-label="Reproducir">▶</button>
        <div class="pv-meta">
          <span id="pv-title">${lista.length ? 'Toca una canción' : 'Sin canciones'}</span>
          <small id="pv-sub">${lista.length ? `${lista.length} canción(es)` : 'Agrega una canción abajo'}</small>
          <input type="range" id="pv-seek" min="0" max="100" value="0" aria-label="Progreso">
        </div>
      </div>

      <div class="pv-actions">
        <button type="button" class="pv-btn pv-btn-main" id="pv-edit-go">Editar perfil</button>
        <button type="button" class="pv-btn pv-btn-danger" id="pv-signout">Cerrar sesión</button>
      </div>

      ${p.bio ? `<p class="pv-bio">${esc(p.bio)}</p>` : ''}

      <h3 class="pv-h">Canciones</h3>
      <div id="pv-songs" class="pv-songs"></div>

      <details class="pv-edit" id="pv-edit-box">
        <summary>Editar perfil y subir canción</summary>
        <form id="profile-form" class="pv-form">
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
          <p class="pv-msg" id="pmsg" role="status"></p>
          <button type="submit" class="pv-btn pv-btn-main">Guardar</button>
        </form>
        <form id="song-form" class="pv-form">
          <label>Título de la canción<input name="title" maxlength="60" required></label>
          <label>Archivo de audio<input name="file" type="file" accept="audio/*" required></label>
          <p class="pv-msg" id="smsg" role="status"></p>
          <button type="submit" class="pv-btn pv-btn-main">Agregar canción</button>
        </form>
      </details>
    </section>`;

  const pmsg = document.getElementById('pmsg');
  const smsg = document.getElementById('smsg');
  const pform = document.getElementById('profile-form');
  const sform = document.getElementById('song-form');

  document.getElementById('pv-toggle').addEventListener('click', alternar);
  document.getElementById('pv-edit-go').addEventListener('click', () => {
    document.getElementById('pv-edit-box').open = true;
    document.getElementById('pv-edit-box').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('pv-seek').addEventListener('input', (e) => {
    if (audio.duration) audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
  });
  document.getElementById('pv-signout').addEventListener('click', async () => {
    await sb.auth.signOut();
    location.href = '/';
  });

  pform.addEventListener('submit', async (e) => {
    e.preventDefault();
    pmsg.textContent = '';
    const f = Object.fromEntries(new FormData(pform));
    const age = Number(f.age);
    if (!age || age < 18) { pmsg.textContent = 'Debes tener 18 años o más.'; return; }
    const errN = nombreValido(f.username.trim());
    if (errN) { pmsg.textContent = errN; return; }
    const { data: ocupado } = await sb.from('profiles').select('id').ilike('username', f.username.trim()).neq('id', uid).limit(1);
    if (ocupado && ocupado.length) { pmsg.textContent = MSG_USADO; return; }
    try {
      const { error } = await conTiempo(
        sb.from('profiles').update({ username: f.username.trim(), age, gender: f.gender, bio: f.bio.trim() }).eq('id', uid),
        15000, 'guardar');
      if (error) throw error;
      pmsg.textContent = 'Guardado.';
    } catch (err) { pmsg.textContent = err?.code === '23505' ? MSG_USADO : (err?.message || 'No se pudo guardar.'); }
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
        document.getElementById('pf-avatar').innerHTML = `<img alt="" src="${esc(url)}"><input type="file" accept="image/*" id="pf-avatar-file" hidden><i class="pv-dot"></i>`;
        document.getElementById('pf-avatar-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) alSubir('avatars', 'avatar', f); });
      } else {
        document.getElementById('pv-banner').style.backgroundImage = `url('${esc(url)}')`;
      }
      pmsg.textContent = 'Guardado.';
    } catch (err) {
      pmsg.textContent = 'Error al subir: ' + (err?.message || err);
      alert('Error al subir: ' + (err?.message || err));
    }
  }
  document.getElementById('pf-avatar-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) alSubir('avatars', 'avatar', f); });
  document.getElementById('pf-banner-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) alSubir('banners', 'banner', f); });

  pintarCanciones();

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
      await recargarCanciones(uid);
    } catch (err) { smsg.textContent = err?.message || 'No se pudo subir.'; }
  });

  async function recargarCanciones(id) {
    const { data } = await sb.from('songs').select('id,title,file_url').eq('user_id', id).order('created_at', { ascending: false });
    lista = data || [];
    actual = -1;
    audio.pause();
    pintarCanciones();
    const t = document.getElementById('pv-title');
    t.textContent = lista.length ? 'Toca una canción' : 'Sin canciones';
    document.getElementById('pv-sub').textContent = lista.length ? `${lista.length} canción(es)` : 'Agrega una canción abajo';
  }

  function pintarCanciones() {
    const box = document.getElementById('pv-songs');
    if (!lista.length) { box.innerHTML = '<p class="pv-empty">Aún no hay canciones.</p>'; return; }
    box.innerHTML = lista.map((c, i) => `
      <div class="pv-song-row">
        <button type="button" class="pv-song" data-i="${i}">
          <span class="num">${i + 1}</span>
          <span class="t">${esc(c.title)}</span>
          <span class="ico">▶</span>
        </button>
        <button type="button" class="pv-del" data-del="${esc(c.id)}" data-url="${esc(c.file_url)}">Borrar</button>
      </div>`).join('');
    box.querySelectorAll('.pv-song').forEach((b) => b.addEventListener('click', () => reproducir(Number(b.dataset.i))));
    box.querySelectorAll('.pv-del').forEach((b) => b.addEventListener('click', async () => {
      try {
        const path = decodeURIComponent(new URL(b.dataset.url).pathname.split('/canciones/')[1] || '');
        if (path) await sb.storage.from('canciones').remove([path]);
        await sb.from('songs').delete().eq('id', b.dataset.del);
        await recargarCanciones(uid);
      } catch (err) { alert('No se pudo borrar: ' + (err?.message || err)); }
    }));
    pintarEstado();
  }
}

iniciar();
