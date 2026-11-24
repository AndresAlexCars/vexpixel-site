// Perfil público de un usuario (/usuario?id=...). Solo lectura.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage,
            lock: async (_n, _t, fn) => await fn() } },
);
const root = document.getElementById('usuario-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GENERO = { hombre: 'Hombre', mujer: 'Mujer', otro: 'Otro' };

// Reproductor: una canción a la vez, la siguiente empieza sola
const audio = new Audio();
let lista = [];
let actual = -1;
function pintarEstado() {
  const b = document.getElementById('u-toggle');
  if (b) b.textContent = audio.paused ? '▶' : '❚❚';
  document.querySelectorAll('.pv-song').forEach((el) => el.classList.toggle('on', Number(el.dataset.i) === actual));
}
function reproducir(i) {
  if (i !== actual) {
    actual = i;
    audio.src = lista[i].file_url;
    document.getElementById('u-title').textContent = lista[i].title;
    document.getElementById('u-sub').textContent = `Canción ${i + 1} de ${lista.length}`;
  }
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
audio.addEventListener('ended', () => { if (actual + 1 < lista.length) reproducir(actual + 1); else pintarEstado(); });

async function iniciar() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { root.innerHTML = '<p class="pp-empty">Perfil no encontrado.</p><a class="pv-btn" href="/perfiles">Ver perfiles</a>'; return; }
  try {
    const [pr, sg] = await Promise.all([
      sb.from('profiles').select('username,age,gender,bio,avatar_url,banner_url').eq('id', id).single(),
      sb.from('songs').select('id,title,file_url').eq('user_id', id).order('created_at', { ascending: false }),
    ]);
    if (pr.error || !pr.data) { root.innerHTML = '<p class="pp-empty">Perfil no encontrado.</p><a class="pv-btn" href="/perfiles">Ver perfiles</a>'; return; }
    const p = pr.data;
    lista = sg.data || [];
    document.title = `${p.username} · VexPixel`;
    pintar(id, p);
  } catch (err) {
    root.innerHTML = `<p class="pp-error">Error: ${esc(err?.message || err)}</p>`;
  }
}

function pintar(id, p) {
  const idCorto = '#' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  root.innerHTML = `
    <section class="pv">
      <div class="pv-banner" style="${p.banner_url ? `background-image:url('${esc(p.banner_url)}')` : ''}">
        <div class="pv-name"><span>${esc(p.username)}</span> <small class="pv-id">ID ${esc(idCorto)}</small></div>
      </div>
      <div class="pv-row">
        <div class="pv-avatar">${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : '<span>Foto</span>'}<i class="pv-dot"></i></div>
        <div class="pv-info">
          <div class="pv-online" data-online-uid="${esc(id)}"><i></i><span class="online-text">Desconectado</span></div>
          <div class="pv-tags">
            ${p.gender ? `<span class="tag tag-g">${esc(GENERO[p.gender] || p.gender)}</span>` : ''}
            ${p.age ? `<span class="tag tag-a">${esc(p.age)}</span>` : ''}
            <span class="tag">Español</span>
          </div>
        </div>
      </div>
      <div class="pv-player">
        <button type="button" id="u-toggle" class="pv-play" aria-label="Reproducir">▶</button>
        <div class="pv-meta">
          <span id="u-title">${lista.length ? 'Toca una canción' : 'Sin canciones'}</span>
          <small id="u-sub">${lista.length ? `${lista.length} canción(es)` : ''}</small>
        </div>
      </div>
      ${p.bio ? `<p class="pv-bio">${esc(p.bio)}</p>` : ''}
      <div class="pv-amigo" id="pv-amigo"></div>
      <div class="hz-wrap" id="pv-corazon"></div>
      <h3 class="pv-h">Canciones</h3>
      <div class="pv-songs">
        ${lista.length ? lista.map((c, i) => `
          <div class="pv-song-row"><button type="button" class="pv-song" data-i="${i}">
            <span class="num">${i + 1}</span><span class="t">${esc(c.title)}</span><span class="ico">▶</span>
          </button></div>`).join('') : '<p class="pv-empty">Aún no hay canciones.</p>'}
      </div>
    </section>`;
  document.getElementById('u-toggle').addEventListener('click', alternar);
  document.querySelectorAll('.pv-song').forEach((b) => b.addEventListener('click', () => reproducir(Number(b.dataset.i))));
}

async function cargarAmistad(id) {
  const box = document.getElementById('pv-amigo');
  if (!box) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    box.innerHTML = '<a class="pv-btn pv-btn-main" href="/?login=1">Inicia sesión para agregar amigos</a>';
    return;
  }
  const me = session.user.id;
  if (me === id) { box.innerHTML = '<a class="pv-btn" href="/amigos">Ver mis amigos</a>'; return; }
  const { data: f } = await sb.from('friendships').select('id,requester,addressee,status')
    .or(`and(requester.eq.${me},addressee.eq.${id}),and(requester.eq.${id},addressee.eq.${me})`).maybeSingle();
  if (!f) box.innerHTML = '<button type="button" class="pv-btn pv-btn-main" data-act="add">Agregar amigo</button>';
  else if (f.status === 'accepted') box.innerHTML = '<button type="button" class="pv-btn" data-act="remove">Amigos ✓ · Quitar</button>';
  else if (f.requester === me) box.innerHTML = '<button type="button" class="pv-btn" data-act="cancel">Solicitud enviada · Cancelar</button>';
  else box.innerHTML = '<button type="button" class="pv-btn pv-btn-main" data-act="accept">Aceptar solicitud</button> <button type="button" class="pv-btn" data-act="reject">Rechazar</button>';

  box.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
    try {
      const act = b.dataset.act;
      if (act === 'add') await sb.from('friendships').insert({ requester: me, addressee: id }).throwOnError();
      else if (act === 'accept') await sb.from('friendships').update({ status: 'accepted' }).eq('id', f.id).throwOnError();
      else await sb.from('friendships').delete().eq('id', f.id).throwOnError();
      cargarAmistad(id);
    } catch (err) { alert('No se pudo: ' + (err?.message || err)); }
  }));
}

async function cargarCorazon(id) {
  const box = document.getElementById('pv-corazon');
  if (!box) return;
  const { data: { session } } = await sb.auth.getSession();
  const me = session?.user.id;
  const { count } = await sb.from('hearts').select('giver', { count: 'exact', head: true }).eq('receiver', id);
  const total = count || 0;
  if (me === id) {
    box.innerHTML = `<div class="hz-stat"><span class="hz-ico">♥</span> ${total} corazón${total === 1 ? '' : 'es'} recibido${total === 1 ? '' : 's'}</div>`;
    return;
  }
  let dado = false;
  if (me) {
    const { data } = await sb.from('hearts').select('giver').eq('giver', me).eq('receiver', id).maybeSingle();
    dado = !!data;
  }
  box.innerHTML = `<button type="button" class="hz-btn${dado ? ' on' : ''}" id="hz-btn" aria-pressed="${dado}">
      <span class="hz-ico">♥</span><span class="hz-n">${total}</span>
    </button>`;
  document.getElementById('hz-btn').addEventListener('click', async () => {
    if (!me) { location.href = '/?login=1'; return; }
    const btn = document.getElementById('hz-btn');
    btn.disabled = true;
    try {
      if (dado) await sb.from('hearts').delete().eq('giver', me).eq('receiver', id).throwOnError();
      else await sb.from('hearts').insert({ giver: me, receiver: id }).throwOnError();
      cargarCorazon(id);
    } catch (err) {
      alert('No se pudo: ' + (err?.message || err));
      btn.disabled = false;
    }
  });
}

iniciar().then(() => {
  const id = new URLSearchParams(location.search).get('id');
  if (id) { cargarAmistad(id); cargarCorazon(id); }
});
