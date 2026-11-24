// Lista de perfiles públicos (/perfiles).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';

const sb = createClient(
  'https://mimwoqvbssiexkstvqbo.supabase.co',
  'sb_publishable_JRWU4J2TrpVF5eahhVBxaA_8JB4633R',
  { auth: { persistSession: false } },
);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GENERO = { hombre: 'Hombre', mujer: 'Mujer', otro: 'Otro' };

async function iniciar() {
  const lista = document.getElementById('lista');
  const { data, error } = await sb.from('profiles')
    .select('id,username,avatar_url,age,gender,banner_url')
    .not('username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) { lista.innerHTML = `<p class="pp-error">Error: ${esc(error.message)}</p>`; return; }
  if (!data.length) { lista.innerHTML = '<p class="pp-empty">Todavía no hay perfiles.</p>'; return; }
  lista.innerHTML = data.map((p) => `
    <a class="pl-card" href="/usuario?id=${esc(p.id)}">
      <div class="pl-av">${p.avatar_url ? `<img alt="" src="${esc(p.avatar_url)}">` : '<span>Foto</span>'}<i class="pl-st" data-online-uid="${esc(p.id)}"></i></div>
      <div class="pl-txt">
        <strong>${esc(p.username)}</strong>
        <small>${[p.gender && (GENERO[p.gender] || p.gender), p.age].filter(Boolean).map(esc).join(' · ')}</small>
      </div>
    </a>`).join('');
}
iniciar();
