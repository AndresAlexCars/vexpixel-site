// Estado en línea en tiempo real. Todos los elementos con data-online-uid cambian a verde o gris.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage,
            lock: async (_n, _t, fn) => await fn() } },
);

let conectados = new Set();

function pintar() {
  document.querySelectorAll('[data-online-uid]').forEach((el) => {
    const on = conectados.has(el.dataset.onlineUid);
    el.classList.toggle('on', on);
    const txt = el.querySelector('.online-text');
    if (txt) txt.textContent = on ? 'En línea' : 'Desconectado';
  });
}

const canal = sb.channel('vexpixel-online', { config: { presence: { key: 'web' } } });

canal.on('presence', { event: 'sync' }, () => {
  const estado = canal.presenceState();
  conectados = new Set();
  Object.values(estado).flat().forEach((m) => { if (m.uid) conectados.add(m.uid); });
  pintar();
});

canal.subscribe(async (status) => {
  if (status !== 'SUBSCRIBED') return;
  const { data } = await sb.auth.getSession();
  if (data.session) await canal.track({ uid: data.session.user.id });
  pintar();
});

// Si el usuario entra o sale en esta página, actualiza su estado
sb.auth.onAuthStateChange(async (_e, session) => {
  if (session) await canal.track({ uid: session.user.id });
  else await canal.untrack();
});
