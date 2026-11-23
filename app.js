const ids = ['activity-title','subject','student-name','student-group','activity-date'];
const templateInfo = {
  standard: ['Guía de trabajo', 'Presenta el tema, desarrolla tus ideas y escribe una conclusión.'],
  report: ['Estructura sugerida para informe', 'Incluye introducción, objetivo, desarrollo, conclusiones y fuentes consultadas.'],
  exercise: ['Estructura sugerida para ejercicios', 'Copia el planteamiento, muestra el procedimiento y escribe con claridad la respuesta final.']
};
const templateSelect = document.getElementById('template-select');
const content = document.getElementById('work-content');
const board = document.getElementById('diagram-board');
const storageKey = 'actform-general-v1';
const themeSelect = document.getElementById('theme-select');
const savedTheme = localStorage.getItem('actform-theme') || 'blue';
document.documentElement.dataset.theme = savedTheme;
themeSelect.value = savedTheme;
themeSelect.addEventListener('change', () => { document.documentElement.dataset.theme = themeSelect.value; localStorage.setItem('actform-theme', themeSelect.value); });

function safeContent(html) {
  const allowed = new Set(['B','STRONG','I','EM','H2','H3','P','BR','UL','OL','LI','BLOCKQUOTE','SPAN']);
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const clean = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowed.has(child.tagName)) { child.replaceWith(...child.childNodes); return; }
        [...child.attributes].forEach(attr => child.removeAttribute(attr.name));
        clean(child);
      }
    });
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}
function saveState() {
  const values = Object.fromEntries(ids.map(id => [id, document.getElementById(id).value]));
  const items = [...board.querySelectorAll('.board-item')].map(el => ({
    type: el.dataset.type, text: el.innerText, left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height
  }));
  try { localStorage.setItem(storageKey, JSON.stringify({ values, template: templateSelect.value, content: content.innerHTML, items })); } catch { /* El trabajo puede seguir editándose sin almacenamiento local. */ }
}
function updateGuide() { saveState(); }
function addBoardItem(type, text = '', left = '35px', top = '30px', width = '', height = '') {
  const item = document.createElement('div');
  item.className = `board-item ${type === 'text' ? 'text-item' : type}`;
  item.dataset.type = type;
  item.style.left = left;
  item.style.top = top;
  if (width) item.style.width = width;
  if (height) item.style.height = height;
  if (type === 'text') {
    item.contentEditable = 'true';
    item.setAttribute('aria-label', 'Cuadro de texto flotante');
    item.dataset.placeholder = 'Escribe una nota';
    item.textContent = text || 'Escribe una nota';
    item.addEventListener('focus', () => { if (item.textContent === 'Escribe una nota') item.textContent = ''; });
    item.addEventListener('blur', () => { if (!item.textContent.trim()) item.textContent = 'Escribe una nota'; saveState(); });
  } else if (type === 'arrow') item.setAttribute('aria-label', 'Flecha de diagrama');
  else item.setAttribute('aria-label', type === 'circle' ? 'Círculo' : 'Rectángulo');
  item.addEventListener('input', saveState);
  board.append(item);
  saveState();
  return item;
}

try {
  const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (state.template && templateInfo[state.template]) templateSelect.value = state.template;
  ids.forEach(id => { if (typeof state.values?.[id] === 'string') document.getElementById(id).value = state.values[id]; });
  if (state.content) content.innerHTML = safeContent(state.content);
  state.items?.forEach(item => addBoardItem(item.type, item.text, item.left, item.top, item.width, item.height));
} catch { /* ActForm inicia vacío cuando el almacenamiento está dañado o no disponible. */ }
updateGuide();
if (!document.getElementById('activity-date').value) document.getElementById('activity-date').value = new Date().toISOString().slice(0,10);
ids.forEach(id => document.getElementById(id).addEventListener('input', saveState));
templateSelect.addEventListener('change', updateGuide);
content.addEventListener('input', saveState);

document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  content.focus();
  const command = button.dataset.command;
  document.execCommand(command, false, command === 'formatBlock' ? button.dataset.value : null);
  saveState();
}));
function selectBoardItem(item) {
  board.querySelectorAll('.board-item.selected').forEach(node => node.classList.remove('selected'));
  if (item) item.classList.add('selected');
}
function deleteSelectedItem() {
  const selected = board.querySelector('.board-item.selected');
  if (selected) { selected.remove(); saveState(); }
}
document.getElementById('delete-selected').addEventListener('click', deleteSelectedItem);
document.getElementById('clear-shapes').addEventListener('click', () => {
  board.querySelectorAll('.board-item').forEach(item => item.remove());
  saveState();
});
board.addEventListener('click', event => {
  const item = event.target.closest('.board-item');
  if (item) selectBoardItem(item);
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Delete' && event.key !== 'Backspace') return;
  const target = event.target;
  if (target.isContentEditable || ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(target.tagName)) return;
  if (board.querySelector('.board-item.selected')) { event.preventDefault(); deleteSelectedItem(); }
});
document.querySelectorAll('[data-shape]').forEach(button => button.addEventListener('click', () => {
  const type = button.dataset.shape;
  const item = addBoardItem(type);
  if (type === 'text') { item.focus(); item.textContent = ''; }
}));
board.addEventListener('pointerdown', event => {
  const item = event.target.closest('.board-item');
  if (!item || (item.isContentEditable && !event.shiftKey)) return;
  const rect = item.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  const dx = event.clientX - rect.left;
  const dy = event.clientY - rect.top;
  item.setPointerCapture(event.pointerId);
  const move = moveEvent => {
    item.style.left = `${Math.max(0, Math.min(board.clientWidth - item.offsetWidth, moveEvent.clientX - boardRect.left - dx))}px`;
    item.style.top = `${Math.max(0, Math.min(board.clientHeight - item.offsetHeight, moveEvent.clientY - boardRect.top - dy))}px`;
  };
  const end = () => { item.removeEventListener('pointermove', move); item.removeEventListener('pointerup', end); saveState(); };
  item.addEventListener('pointermove', move);
  item.addEventListener('pointerup', end);
});

document.getElementById('inline-image').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    content.focus();
    document.execCommand('insertImage', false, reader.result);
    saveState();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
});
document.getElementById('attachment-image').addEventListener('change', event => {
  const preview = document.getElementById('image-preview');
  preview.replaceChildren();
  const file = event.target.files?.[0];
  if (!file) return;
  const image = document.createElement('img');
  image.alt = 'Imagen adjunta a la actividad';
  image.src = URL.createObjectURL(file);
  preview.append(image);
});

function getShareData() {
  return {
    fields: Object.fromEntries(ids.map(id => [id, document.getElementById(id).value])),
    template: templateSelect.value,
    content: content.innerHTML,
    board: [...board.querySelectorAll('.board-item')].map(el => ({ type: el.dataset.type, text: el.innerText, left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height }))
  };
}
async function shareUrl() {
  const bytes = new TextEncoder().encode(JSON.stringify(getShareData()));
  if (!('CompressionStream' in window)) {
    const payload = encodeURIComponent(new TextDecoder().decode(bytes));
    return `${location.href.split('#')[0]}#share=${payload}`;
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  compressed.forEach(byte => { binary += String.fromCharCode(byte); });
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${location.href.split('#')[0]}#sharez=${payload}`;
}
async function importSharedWork() {
  const compressedMatch = location.hash.match(/^#sharez=([\w-]+)$/);
  const match = location.hash.match(/^#share=(.+)$/);
  if (!compressedMatch && !match) return;
  try {
    let data;
    if (compressedMatch && 'DecompressionStream' in window) {
      const base64 = compressedMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
      data = JSON.parse(await new Response(stream).text());
    } else data = JSON.parse(decodeURIComponent(match[1]));
    ids.forEach(id => { if (typeof data.fields?.[id] === 'string') document.getElementById(id).value = data.fields[id]; });
    if (templateInfo[data.template]) templateSelect.value = data.template;
    if (typeof data.content === 'string') content.innerHTML = safeContent(data.content);
    board.querySelectorAll('.board-item').forEach(item => item.remove());
    data.board?.forEach(item => addBoardItem(item.type, item.text, item.left, item.top, item.width, item.height));
    updateGuide();
    saveState();
    document.getElementById('share-note').textContent = 'Trabajo compartido cargado. Puedes revisarlo o editar una copia.';
  } catch { document.getElementById('share-note').textContent = 'No se pudo leer este enlace compartido.'; }
}
importSharedWork();

document.getElementById('email-share').addEventListener('click', async () => {
  const title = document.getElementById('activity-title').value || 'Actividad escolar';
  const body = `Hola, comparto mi trabajo: ${await shareUrl()}`;
  location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
});
document.getElementById('copy-link').addEventListener('click', async event => {
  try { await navigator.clipboard.writeText(await shareUrl()); event.currentTarget.textContent = 'Enlace copiado'; }
  catch { document.getElementById('share-note').textContent = 'No se pudo copiar. Selecciona y copia la dirección de la página.'; }
  setTimeout(() => { event.currentTarget.textContent = 'Copiar enlace'; }, 1600);
});
document.getElementById('show-qr').addEventListener('click', async () => {
  const dialog = document.getElementById('qr-dialog');
  const holder = document.getElementById('qr-code');
  holder.replaceChildren();
  const status = document.createElement('p');
  status.textContent = 'Generando código QR…';
  holder.append(status);
  dialog.showModal();
  const image = document.createElement('img');
  image.alt = 'Código QR para abrir el trabajo compartido';
  image.width = 240;
  image.height = 240;
  image.onload = () => holder.replaceChildren(image);
  image.onerror = () => { holder.textContent = 'No se pudo generar el QR. Copia el enlace y ábrelo en una página publicada para compartirlo.'; };
  image.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encodeURIComponent(await shareUrl())}`;
});
document.getElementById('copy-qr-link').addEventListener('click', () => document.getElementById('copy-link').click());

document.getElementById('print-activity').addEventListener('click', () => { window.focus(); window.print(); });

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  document.querySelectorAll('.intro,.workspace').forEach((node, index) => { node.classList.add('reveal'); node.style.transitionDelay = `${index * 100}ms`; observer.observe(node); });
} else document.querySelectorAll('.intro,.workspace').forEach(node => node.classList.add('visible'));
