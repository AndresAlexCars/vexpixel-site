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
      <div class="am-txt" data-online-uid="${esc(con)}"><strong>${esc(p.username)}</strong><small class="online-text">Desconectado</small></div>
    </div>
    <div class="ch-msgs" id="ch-msgs"></div>
    <form class="ch-form" id="ch-form">
      <input id="ch-in" maxlength="500" placeholder="Escribe un mensaje" autocomplete="off" required>
      <button type="submit" class="pv-btn pv-btn-main">Enviar</button>
    </form>`;

  const box = document.getElementById('ch-msgs');
  const vistos = new Set();
  let ultimo = new Date(0).toISOString();
  let timerEscribe = null;

  function quitarEscribiendo() {
    document.getElementById('ch-typing')?.remove();
  }
  function mostrarEscribiendo() {
    if (!document.getElementById('ch-typing')) {
      box.insertAdjacentHTML('beforeend', '<div class="ch-b suyo ch-typing" id="ch-typing"><span class="dots"><i></i><i></i><i></i></span></div>');
      box.scrollTop = box.scrollHeight;
    }
    clearTimeout(timerEscribe);
    timerEscribe = setTimeout(quitarEscribiendo, 2500);
  }

  function agregar(m) {
    if (vistos.has(m.id)) return;
    vistos.add(m.id);
    if (m.created_at > ultimo) ultimo = m.created_at;
    const propio = m.sender === me;
    if (!propio) quitarEscribiendo();
    box.insertAdjacentHTML('beforeend', `<div class="ch-b ${propio ? 'mio' : 'suyo'}"><span>${esc(m.body)}</span><small>${hora(m.created_at)}</small></div>`);
    box.scrollTop = box.scrollHeight;
  }

  const filtroPar = `and(sender.eq.${me},receiver.eq.${con}),and(sender.eq.${con},receiver.eq.${me})`;
  const { data: viejos } = await sb.from('messages').select('id,sender,receiver,body,created_at')
    .or(filtroPar).order('created_at', { ascending: true }).limit(200);
  (viejos || []).forEach(agregar);
  box.scrollTop = box.scrollHeight;

  // Respaldo: consulta mensajes nuevos cada 2 segundos
  setInterval(async () => {
    const { data } = await sb.from('messages').select('id,sender,receiver,body,created_at')
      .or(filtroPar).gt('created_at', ultimo).order('created_at', { ascending: true }).limit(50);
    (data || []).forEach(agregar);
  }, 2000);

  // "Escribiendo..." en tiempo real (sin pasar por la base de datos)
  const canalEscribe = sb.channel('typing-' + [me, con].sort().join('_'), { config: { broadcast: { self: false } } });
  canalEscribe.on('broadcast', { event: 'typing' }, ({ payload }) => {
    if (payload?.from === con) mostrarEscribiendo();
  }).subscribe();

  const input = document.getElementById('ch-in');
  let ultimoAviso = 0;
  input.addEventListener('input', () => {
    const ahora = Date.now();
    if (ahora - ultimoAviso > 1500) {
      canalEscribe.send({ type: 'broadcast', event: 'typing', payload: { from: me } });
      ultimoAviso = ahora;
    }
  });

  document.getElementById('ch-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    const { data, error } = await sb.from('messages').insert({ sender: me, receiver: con, body: texto }).select().single();
    if (error) { alert('No se pudo enviar: ' + error.message); input.value = texto; return; }
    agregar(data);
  });
}

iniciar();
