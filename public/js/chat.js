// Chat con amigos: lista de amigos y conversación en tiempo real.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage,
            lock: async (_n, _t, fn) => await fn() } },
);
const root = document.getElementById('chat-root');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hora = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

async function iniciar() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    root.innerHTML = '<div class="pp-card"><p>Para chatear primero inicia sesión.</p><a class="pv-btn pv-btn-main" href="/?login=1">Iniciar sesión</a></div>';
    return;
  }
  const me = session.user.id;
  const con = new URLSearchParams(location.search).get('con');
  if (con) return conversacion(me, con);
  return lista(me);
}

async function lista(me) {
  const { data: rel } = await sb.from('friendships').select('requester,addressee')
    .eq('status', 'accepted').or(`requester.eq.${me},addressee.eq.${me}`);
  const ids = [...new Set((rel || []).map((r) => (r.requester === me ? r.addressee : r.requester)))];
  if (!ids.length) {
    root.innerHTML = '<p class="pv-empty">Aún no tienes amigos. Agrega a alguien desde <a href="/amigos">Amigos</a>.</p>';
    return;
  }
  const { data: perfiles } = await sb.from('profiles').select('id,username,avatar_url').in('id', ids);
  root.innerHTML = `<div class="am-list">${(perfiles || []).map((p) => `
    <a class="am-card" href="/chat?con=${esc(p.id)}">
      <div class="am-who">
        <div class="am-av">${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : '<span>Foto</span>'}<i class="am-st" data-online-uid="${esc(p.id)}"></i></div>
        <div class="am-txt"><strong>${esc(p.username)}</strong><small class="online-text">Desconectado</small></div>
      </div>
    </a>`).join('')}</div>`;
}

async function conversacion(me, con) {
  const { data: p } = await sb.from('profiles').select('username,avatar_url').eq('id', con).single();
  if (!p) { root.innerHTML = '<p class="pv-empty">No encontramos a esa persona.</p>'; return; }
  root.innerHTML = `
    <div class="ch-head">
      <a href="/chat" class="back-link">←</a>
      <div class="am-av sm">${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : '<span>Foto</span>'}<i class="am-st" data-online-uid="${esc(con)}"></i></div>
      <div class="am-txt"><strong>${esc(p.username)}</strong><small class="online-text">Desconectado</small></div>
    </div>
    <div class="ch-msgs" id="ch-msgs"></div>
    <form class="ch-form" id="ch-form">
      <input id="ch-in" maxlength="500" placeholder="Escribe un mensaje" autocomplete="off" required>
      <button type="submit" class="pv-btn pv-btn-main">Enviar</button>
    </form>`;

  const box = document.getElementById('ch-msgs');
  const vistos = new Set();
  function agregar(m) {
    if (vistos.has(m.id)) return;
    vistos.add(m.id);
    const propio = m.sender === me;
    box.insertAdjacentHTML('beforeend', `<div class="ch-b ${propio ? 'mio' : 'suyo'}"><span>${esc(m.body)}</span><small>${hora(m.created_at)}</small></div>`);
    box.scrollTop = box.scrollHeight;
  }

  const { data: viejos } = await sb.from('messages').select('id,sender,receiver,body,created_at')
    .or(`and(sender.eq.${me},receiver.eq.${con}),and(sender.eq.${con},receiver.eq.${me})`)
    .order('created_at', { ascending: true }).limit(200);
  (viejos || []).forEach(agregar);
  box.scrollTop = box.scrollHeight;

  // Mensajes nuevos en tiempo real
  sb.channel('chat-' + me)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver=eq.${me}` },
      (payload) => { if (payload.new.sender === con) agregar(payload.new); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender=eq.${me}` },
      (payload) => { if (payload.new.receiver === con) agregar(payload.new); })
    .subscribe();

  document.getElementById('ch-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('ch-in');
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    const { data, error } = await sb.from('messages').insert({ sender: me, receiver: con, body: texto }).select().single();
    if (error) { alert('No se pudo enviar: ' + error.message); input.value = texto; return; }
    agregar(data);
  });
}

iniciar();
