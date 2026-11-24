// Página de amigos: solicitudes recibidas, enviadas y lista de amigos.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage,
            lock: async (_n, _t, fn) => await fn() } },
);
const root = document.getElementById('amigos-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tarjeta(p, acciones = '') {
  return `
    <div class="am-card">
      <a class="am-who" href="/usuario?id=${esc(p.id)}">
        <div class="am-av">${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : '<span>Foto</span>'}<i class="am-st" data-online-uid="${esc(p.id)}"></i></div>
        <div class="am-txt"><strong>${esc(p.username)}</strong>
          <small class="online-text">Desconectado</small></div>
      </a>
      <div class="am-acc">${acciones}</div>
    </div>`;
}

async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    root.innerHTML = '<div class="pp-card"><p>Para ver tus amigos primero inicia sesión.</p><a class="pv-btn pv-btn-main" href="/?login=1">Iniciar sesión</a></div>';
    return;
  }
  const me = session.user.id;
  const { data: rel, error } = await sb.from('friendships').select('id,requester,addressee,status')
    .or(`requester.eq.${me},addressee.eq.${me}`);
  if (error) { root.innerHTML = `<p class="pp-error">Error: ${esc(error.message)}</p>`; return; }

  const otros = [...new Set(rel.map((r) => (r.requester === me ? r.addressee : r.requester)))];
  let perfiles = {};
  if (otros.length) {
    const { data } = await sb.from('profiles').select('id,username,avatar_url').in('id', otros);
    (data || []).forEach((p) => { perfiles[p.id] = p; });
  }
  const pid = (r) => (r.requester === me ? r.addressee : r.requester);
  const recibidas = rel.filter((r) => r.status === 'pending' && r.addressee === me);
  const enviadas = rel.filter((r) => r.status === 'pending' && r.requester === me);
  const amigos = rel.filter((r) => r.status === 'accepted');

  const bloque = (titulo, items, fn) => `
    <h3 class="pv-h">${titulo} <span class="am-n">${items.length}</span></h3>
    <div class="am-list">${items.length ? items.map(fn).join('') : '<p class="pv-empty">Nada por aquí.</p>'}</div>`;

  root.innerHTML = `
    <section class="am">
      ${bloque('Solicitudes recibidas', recibidas, (r) => tarjeta(perfiles[pid(r)] || { id: pid(r), username: 'Usuario' },
        `<button type="button" class="pv-btn pv-btn-main" data-act="accept" data-id="${r.id}">Aceptar</button>
         <button type="button" class="pv-btn" data-act="reject" data-id="${r.id}">Rechazar</button>`))}
      ${bloque('Solicitudes enviadas', enviadas, (r) => tarjeta(perfiles[pid(r)] || { id: pid(r), username: 'Usuario' },
        `<button type="button" class="pv-btn" data-act="cancel" data-id="${r.id}">Cancelar</button>`))}
      ${bloque('Mis amigos', amigos, (r) => tarjeta(perfiles[pid(r)] || { id: pid(r), username: 'Usuario' },
        `<button type="button" class="pv-btn" data-act="remove" data-id="${r.id}">Quitar</button>`))}
    </section>`;

  // ── Buscar personas para agregar ──
  const conRel = new Set(otros);
  root.querySelector('section.am').insertAdjacentHTML('beforeend', `
    <h3 class="pv-h">Buscar personas</h3>
    <input id="am-q" class="am-q" placeholder="Escribe un nombre de usuario" maxlength="24">
    <div id="am-res" class="am-list"></div>`);
  let temporizador = null;
  document.getElementById('am-q').addEventListener('input', (e) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => mostrarPersonas(me, conRel, e.target.value.trim().replace(/[%_]/g, '')), 300);
  });
  mostrarPersonas(me, conRel, '');

  root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
    try {
      const act = b.dataset.act;
      if (act === 'accept') await sb.from('friendships').update({ status: 'accepted' }).eq('id', b.dataset.id).throwOnError();
      else await sb.from('friendships').delete().eq('id', b.dataset.id).throwOnError();
      iniciar();
    } catch (err) { alert('No se pudo: ' + (err?.message || err)); }
  }));
}

async function mostrarPersonas(me, conRel, q) {
  let consulta = sb.from('profiles').select('id,username,avatar_url').neq('id', me).not('username', 'is', null).limit(30);
  consulta = q ? consulta.ilike('username', `%${q}%`) : consulta.order('created_at', { ascending: false });
  const { data } = await consulta;
  const res = document.getElementById('am-res');
  if (!res) return;
  res.innerHTML = data?.length
    ? data.map((p) => tarjeta(p, conRel.has(p.id)
        ? '<span class="am-tag">Ya conectado</span>'
        : `<button type="button" class="pv-btn pv-btn-main" data-add="${esc(p.id)}">Agregar</button>`)).join('')
    : '<p class="pv-empty">No encontramos a nadie.</p>';
  res.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await sb.from('friendships').insert({ requester: me, addressee: b.dataset.add }).throwOnError();
      b.outerHTML = '<span class="am-tag">Solicitud enviada</span>';
    } catch (err) { alert('No se pudo: ' + (err?.message || err)); }
  }));
}

iniciar();
