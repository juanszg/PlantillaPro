const ids = ['activity-title','subject','student-name','student-group','activity-date'];
const templateInfo = {
  standard: ['Guía de trabajo', 'Presenta el tema, desarrolla tus ideas y escribe una conclusión.'],
  report: ['Estructura sugerida para informe', 'Incluye introducción, objetivo, desarrollo, conclusiones y fuentes consultadas.'],
  exercise: ['Estructura sugerida para ejercicios', 'Copia el planteamiento, muestra el procedimiento y escribe con claridad la respuesta final.']
};
const templateSelect = document.getElementById('template-select');
const content = document.getElementById('work-content');
const fontSelect = document.getElementById('font-family');
const allowedFonts = new Set(['Alata','Anonymous Pro','BioRhyme','Bitter','Cantarell','Federo','Fondamento','Fredericka the Great','Kumar One','Major Mono Display','Mukta Malar','Poppins','Stardos Stencil']);
const board = document.getElementById('diagram-board');
const shapeResizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => saveState()) : null;
const storageKey = 'actform-general-v1';
const themeSelect = document.getElementById('theme-select');
const savedTheme = localStorage.getItem('actform-theme') || 'blue';
document.documentElement.dataset.theme = savedTheme;
themeSelect.value = savedTheme;
themeSelect.addEventListener('change', () => { document.documentElement.dataset.theme = themeSelect.value; localStorage.setItem('actform-theme', themeSelect.value); });

function safeContent(html) {
  const allowed = new Set(['B','STRONG','I','EM','H2','H3','P','BR','UL','OL','LI','BLOCKQUOTE','SPAN','FONT','IMG']);
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const clean = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!allowed.has(child.tagName)) { clean(child); child.replaceWith(...child.childNodes); return; }
        [...child.attributes].forEach(attr => {
          if (child.tagName === 'FONT' && attr.name === 'face' && allowedFonts.has(attr.value)) return;
          if (child.tagName === 'FONT' && attr.name === 'color' && /^#[0-9a-f]{3,8}$/i.test(attr.value)) return;
          if (child.tagName === 'IMG' && attr.name === 'src' && attr.value.startsWith('data:image/')) return;
          if (child.tagName === 'IMG' && attr.name === 'alt') return;
          if (child.tagName === 'IMG' && attr.name === 'style') {
            const style = child.style;
            const safe = ['position','left','top','width','height','z-index','opacity','max-width'];
            [...style].forEach(property => {
              const value = style.getPropertyValue(property).trim();
              const numeric = /^-?(?:\d+\.?\d*|\.\d+)(px|%)?$/.test(value);
              if (!safe.includes(property) || (property !== 'position' && property !== 'z-index' && property !== 'opacity' && !numeric) || (property === 'position' && !['absolute','relative'].includes(value)) || (property === 'z-index' && !/^\d+$/.test(value)) || (property === 'opacity' && !/^(?:0|1|0?\.\d+)$/.test(value))) style.removeProperty(property);
            });
            return;
          }
          child.removeAttribute(attr.name);
        });
        if (child.tagName === 'FONT' && !allowedFonts.has(child.getAttribute('face'))) { clean(child); child.replaceWith(...child.childNodes); }
        else if (child.tagName === 'IMG' && !child.getAttribute('src')?.startsWith('data:image/')) child.remove();
        else clean(child);
      }
    });
  };
  clean(parsed.body);
  return parsed.body.innerHTML;
}
function saveState() {
  const values = Object.fromEntries(ids.map(id => [id, document.getElementById(id).value]));
  const items = [...board.querySelectorAll('.board-item')].map(el => ({
    type: el.dataset.type, text: el.querySelector('.shape-label')?.innerText || '', left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height, radius: el.style.borderRadius
  }));
  try { localStorage.setItem(storageKey, JSON.stringify({ values, template: templateSelect.value, content: content.innerHTML, lineSpacing: document.getElementById('line-spacing').value, fontFamily: fontSelect.value, items })); } catch { /* El trabajo puede seguir editándose sin almacenamiento local. */ }
}
function updateGuide() { saveState(); }
function addBoardItem(type, text = '', left = '35px', top = '30px', width = '', height = '', radius = '') {
  const item = document.createElement('div');
  item.className = `board-item ${type === 'text' ? 'text-item' : type}`;
  item.dataset.type = type;
  const shapeIndex = board.querySelectorAll('.board-item').length;
  item.style.left = left === '35px' ? `${35 + (shapeIndex % 6) * 22}px` : left;
  item.style.top = top === '30px' ? `${30 + (shapeIndex % 6) * 18}px` : top;
  if (width) item.style.width = width;
  if (height) item.style.height = height;
  if (radius) item.style.borderRadius = radius;
  if (!width) item.style.width = type === 'arrow' ? '120px' : type === 'circle' ? '90px' : '110px';
  if (!height) item.style.height = type === 'arrow' ? '24px' : type === 'circle' ? '90px' : '64px';
  const label = document.createElement('div');
  label.className = 'shape-label';
  label.textContent = text || (type === 'text' ? 'Escribe una nota' : '');
  if (type === 'text') {
    label.contentEditable = 'true';
    label.setAttribute('aria-label', 'Texto de la forma');
  }
  label.addEventListener('input', saveState);
  label.addEventListener('dblclick', () => {
    if (type !== 'arrow') { label.contentEditable = 'true'; label.focus(); }
  });
  label.addEventListener('blur', () => { if (type !== 'text') label.contentEditable = 'false'; saveState(); });
  item.append(label);
  const move = document.createElement('button');
  move.type = 'button'; move.className = 'shape-handle move-handle';
  move.title = 'Arrastrar para mover'; move.setAttribute('aria-label', 'Mover forma'); move.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v14M1 8h14M8 1 5.5 3.5M8 1l2.5 2.5M15 8l-2.5-2.5M15 8l-2.5 2.5M8 15l-2.5-2.5M8 15l2.5-2.5M1 8l2.5-2.5M1 8l2.5 2.5"/></svg>';
  const resize = document.createElement('button');
  resize.type = 'button'; resize.className = 'shape-handle resize-handle';
  resize.title = 'Arrastrar para cambiar tamaño'; resize.setAttribute('aria-label', 'Redimensionar forma'); resize.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M7 13h6V7"/></svg>';
  item.append(move, resize);
  item.setAttribute('aria-label', type === 'arrow' ? 'Conector con flecha' : 'Forma de diagrama');
  board.append(item);
  shapeResizeObserver?.observe(item);
  saveState();
  return item;
}

try {
  const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
  if (state.template && templateInfo[state.template]) templateSelect.value = state.template;
  ids.forEach(id => { if (typeof state.values?.[id] === 'string') document.getElementById(id).value = state.values[id]; });
  if (state.content) content.innerHTML = safeContent(state.content);
  if (state.lineSpacing) { document.getElementById('line-spacing').value = state.lineSpacing; content.style.lineHeight = state.lineSpacing; }
  if (allowedFonts.has(state.fontFamily)) fontSelect.value = state.fontFamily;
  state.items?.forEach(item => addBoardItem(item.type, item.text, item.left, item.top, item.width, item.height, item.radius));
} catch { /* ActForm inicia vacío cuando el almacenamiento está dañado o no disponible. */ }
updateGuide();
function updateAutoDate() {
  const now = new Date();
  const localIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  document.getElementById('activity-date').value = localIso;
  document.getElementById('auto-date').textContent = new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric'}).format(now);
}
updateAutoDate();
ids.forEach(id => document.getElementById(id).addEventListener('input', saveState));
templateSelect.addEventListener('change', updateGuide);
content.addEventListener('input', saveState);
document.getElementById('line-spacing').addEventListener('change', event => { content.style.lineHeight = event.currentTarget.value; saveState(); });
fontSelect.addEventListener('change', event => {
  content.focus();
  document.execCommand('fontName', false, event.currentTarget.value);
  saveState();
});

document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
  content.focus();
  const command = button.dataset.command;
  document.execCommand(command, false, command === 'formatBlock' ? button.dataset.value : null);
  saveState();
}));
const textColors = ['#111827','#374151','#6b7280','#ffffff','#b91c1c','#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#2563eb','#4f46e5','#8b5cf6','#d946ef'];
const colorPalette = document.getElementById('text-color-palette');
textColors.forEach(color => {
  const swatch = document.createElement('button'); swatch.type='button'; swatch.className='color-swatch'; swatch.style.backgroundColor=color; swatch.title=color; swatch.setAttribute('aria-label',`Color ${color}`);
  swatch.addEventListener('click', () => applyTextColor(color)); colorPalette.append(swatch);
});
function applyTextColor(color) { content.focus(); document.execCommand('foreColor', false, color); colorPalette.hidden=true; saveState(); }
document.getElementById('color-text-button').addEventListener('click', () => { colorPalette.hidden=!colorPalette.hidden; });
document.getElementById('custom-text-color').addEventListener('input', event => applyTextColor(event.currentTarget.value));
function selectBoardItem(item) {
  board.querySelectorAll('.board-item.selected').forEach(node => node.classList.remove('selected'));
  if (item) item.classList.add('selected');
}
function deleteSelectedItem() {
  const selected = board.querySelector('.board-item.selected');
  if (selected) { selected.remove(); saveState(); }
}
document.getElementById('clear-shapes').addEventListener('click', () => {
  board.querySelectorAll('.board-item').forEach(item => item.remove());
  saveState();
});
document.getElementById('minimize-shapes').addEventListener('click', event => {
  const section = document.querySelector('.diagram-tools');
  const minimized = section.classList.toggle('minimized');
  event.currentTarget.textContent = minimized ? '+' : '−';
  event.currentTarget.setAttribute('aria-label', minimized ? 'Expandir sección de formas' : 'Minimizar sección de formas');
  event.currentTarget.title = minimized ? 'Expandir sección' : 'Minimizar sección';
  event.currentTarget.setAttribute('aria-expanded', String(!minimized));
});
document.getElementById('roundness-control').addEventListener('input', event => {
  const selected = board.querySelector('.board-item.selected');
  if (!selected) return;
  selected.style.borderRadius = `${event.currentTarget.value}%`;
  saveState();
});
board.querySelectorAll('.board-item').forEach(item => shapeResizeObserver?.observe(item));

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
  if (type === 'text') { const label = item.querySelector('.shape-label'); label.focus(); label.textContent = ''; }
}));
board.addEventListener('pointerdown', event => {
  const handle = event.target.closest('.shape-handle');
  if (!handle) return;
  const item = handle.closest('.board-item');
  if (!item) return;
  event.preventDefault();
  event.stopPropagation();
  selectBoardItem(item);
  const boardRect = board.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = item.offsetLeft;
  const startTop = item.offsetTop;
  const startWidth = item.offsetWidth;
  const startHeight = item.offsetHeight;
  const resizing = handle.classList.contains('resize-handle');
  handle.setPointerCapture(event.pointerId);
  const move = moveEvent => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (resizing) {
      const width = Math.max(56, startWidth + dx);
      const height = Math.max(34, startHeight + dy);
      item.style.width = `${Math.min(board.clientWidth - startLeft, width)}px`;
      item.style.height = item.dataset.type === 'arrow' ? '24px' : `${height}px`;
      if (item.dataset.type === 'circle') {
        const diameter = Math.max(56, Math.min(width, height));
        item.style.width = `${diameter}px`; item.style.height = `${diameter}px`;
      }
    } else {
      const grid = moveEvent.altKey ? 1 : 11;
      const left = Math.max(0, Math.min(board.clientWidth - item.offsetWidth, startLeft + dx));
      const top = Math.max(0, Math.min(board.clientHeight - item.offsetHeight, startTop + dy));
      item.style.left = `${Math.round(left / grid) * grid}px`;
      item.style.top = `${Math.round(top / grid) * grid}px`;
    }
  };
  const end = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
    saveState();
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
});

document.getElementById('inline-image').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    content.focus();
    document.execCommand('insertImage', false, reader.result);
    const inserted = content.querySelectorAll('img');
    const image = inserted[inserted.length - 1];
    if (image) { image.classList.add('work-image'); selectEditorImage(image); }
    saveState();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
});
let activeImage = null;
const imageOptions = document.getElementById('image-options');
const positionImageButton = document.getElementById('position-image');
const resizeImageButton = document.getElementById('resize-image');
function clampEditorImage(image) {
  if (!image || image.style.position !== 'absolute') return;
  const maxLeft = Math.max(0, content.clientWidth - image.offsetWidth);
  const maxTop = Math.max(0, content.clientHeight - image.offsetHeight);
  const left = Math.min(maxLeft, Math.max(0, parseFloat(image.style.left) || 0));
  const top = Math.min(maxTop, Math.max(0, parseFloat(image.style.top) || 0));
  image.style.left = `${left}px`; image.style.top = `${top}px`;
}
function selectEditorImage(image) {
  content.querySelectorAll('img.editor-image-selected').forEach(node => node.classList.remove('editor-image-selected'));
  activeImage = image;
  if (!image) { positionImageButton.disabled = true; resizeImageButton.disabled = true; imageOptions.hidden = true; return; }
  image.classList.add('editor-image-selected');
  positionImageButton.disabled = false; resizeImageButton.disabled = false;
  imageOptions.hidden = false;
  const layout = image.style.position === 'absolute' ? (image.style.zIndex === '0' ? 'free-back' : 'free-front') : 'inline';
  document.getElementById('image-position').value = layout;
  const size = Math.round(parseFloat(image.style.width) || 50);
  document.getElementById('image-size').value = size;
  document.getElementById('image-size-value').textContent = `${size}%`;
}
content.addEventListener('click', event => {
  const image = event.target.closest('img');
  if (image) selectEditorImage(image);
  else if (!event.target.closest('#image-options')) selectEditorImage(null);
});
positionImageButton.addEventListener('click', () => { if (activeImage) { imageOptions.hidden = false; document.getElementById('image-position').focus(); } });
resizeImageButton.addEventListener('click', () => { if (activeImage) { imageOptions.hidden = false; document.getElementById('image-size').focus(); } });
document.getElementById('image-position').addEventListener('change', event => {
  if (!activeImage) return;
  const layout = event.currentTarget.value;
  if (layout === 'inline') { activeImage.style.position = ''; activeImage.style.left = ''; activeImage.style.top = ''; activeImage.style.zIndex = ''; activeImage.style.opacity = ''; activeImage.style.maxWidth = '100%'; }
  else {
    activeImage.style.position = 'absolute';
    activeImage.style.left ||= '24px'; activeImage.style.top ||= '24px';
    activeImage.style.zIndex = layout === 'free-back' ? '0' : '5';
    activeImage.style.opacity = layout === 'free-back' ? '.28' : '1';
    activeImage.style.maxWidth = '100%';
  }
  requestAnimationFrame(() => clampEditorImage(activeImage));
  saveState();
});
document.getElementById('image-size').addEventListener('input', event => {
  if (!activeImage) return;
  const size = event.currentTarget.value;
  activeImage.style.width = `${size}%`;
  requestAnimationFrame(() => clampEditorImage(activeImage));
  document.getElementById('image-size-value').textContent = `${size}%`;
  saveState();
});
content.addEventListener('pointerdown', event => {
  const image = event.target.closest('img');
  if (!image || image.style.position !== 'absolute' || event.button !== 0) return;
  event.preventDefault(); selectEditorImage(image);
  const startX = event.clientX, startY = event.clientY;
  const startLeft = parseFloat(image.style.left) || 0, startTop = parseFloat(image.style.top) || 0;
  image.setPointerCapture(event.pointerId);
  const move = moveEvent => {
    const maxLeft = Math.max(0, content.clientWidth - image.offsetWidth);
    const maxTop = Math.max(0, content.clientHeight - image.offsetHeight);
    image.style.left = `${Math.min(maxLeft, Math.max(0, startLeft + moveEvent.clientX - startX))}px`;
    image.style.top = `${Math.min(maxTop, Math.max(0, startTop + moveEvent.clientY - startY))}px`;
  };
  const end = () => { image.removeEventListener('pointermove', move); image.removeEventListener('pointerup', end); image.removeEventListener('pointercancel', end); saveState(); };
  image.addEventListener('pointermove', move); image.addEventListener('pointerup', end); image.addEventListener('pointercancel', end);
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
    lineSpacing: document.getElementById('line-spacing').value,
    fontFamily: fontSelect.value,
    board: [...board.querySelectorAll('.board-item')].map(el => ({ type: el.dataset.type, text: el.querySelector('.shape-label')?.innerText || '', left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height, radius: el.style.borderRadius }))
  };
}
async function shareUrl() {
  const bytes = new TextEncoder().encode(JSON.stringify(getShareData()));
  if (!('CompressionStream' in window)) {
    const payload = encodeURIComponent(new TextDecoder().decode(bytes));
    return `${location.href.split('#')[0]}#share=${payload}`;
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  compressed.forEach(byte => { binary += String.fromCharCode(byte); });
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${location.href.split('#')[0]}#actform=${payload}`;
}
async function importSharedWork() {
  const compressedMatch = location.hash.match(/^#(?:actform|sharez)=([\w-]+)$/);
  const match = location.hash.match(/^#share=(.+)$/);
  if (!compressedMatch && !match) return;
  try {
    let data;
    if (compressedMatch && 'DecompressionStream' in window) {
      const base64 = compressedMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      data = JSON.parse(await new Response(stream).text());
    } else data = JSON.parse(decodeURIComponent(match[1]));
    ids.forEach(id => { if (typeof data.fields?.[id] === 'string') document.getElementById(id).value = data.fields[id]; });
    if (templateInfo[data.template]) templateSelect.value = data.template;
    if (typeof data.content === 'string') content.innerHTML = safeContent(data.content);
    if (data.lineSpacing) { document.getElementById('line-spacing').value = data.lineSpacing; content.style.lineHeight = data.lineSpacing; }
    if (allowedFonts.has(data.fontFamily)) fontSelect.value = data.fontFamily;
    board.querySelectorAll('.board-item').forEach(item => item.remove());
    data.board?.forEach(item => addBoardItem(item.type, item.text, item.left, item.top, item.width, item.height, item.radius));
    updateGuide();
    saveState();
    document.getElementById('share-note').textContent = 'Expediente compartido cargado. Usa “Descargar PDF” para guardarlo o imprimirlo.';
    document.body.classList.add('shared-work');
  } catch { document.getElementById('share-note').textContent = 'No se pudo leer este enlace compartido.'; }
}
importSharedWork();

document.getElementById('email-share').addEventListener('click', async () => {
  const title = document.getElementById('activity-title').value || 'Actividad escolar';
  const body = `Hola, comparto mi trabajo: ${await shareUrl()}`;
  location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
});
document.getElementById('save-work').addEventListener('click', async event => {
  saveState();
  const button = event.currentTarget;
  try { await navigator.clipboard.writeText(await shareUrl()); button.textContent = 'GUARDADO · ENLACE COPIADO'; }
  catch { button.textContent = 'GUARDADO'; document.getElementById('share-note').textContent = 'Trabajo guardado en este navegador. Para copiar el enlace, usa “Copiar enlace”.'; }
  setTimeout(() => { button.textContent = 'GUARDAR'; }, 2400);
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
  const encoded = encodeURIComponent(await shareUrl());
  let fallbackTimer = setTimeout(() => { image.src = `https://quickchart.io/qr?size=240&text=${encoded}`; }, 7000);
  let usedFallback = false;
  image.onload = () => { clearTimeout(fallbackTimer); holder.replaceChildren(image); };
  image.onerror = () => {
    if (!usedFallback) { usedFallback = true; clearTimeout(fallbackTimer); image.src = `https://quickchart.io/qr?size=240&text=${encoded}`; return; }
    clearTimeout(fallbackTimer);
    status.textContent = 'No se pudo cargar el QR. Usa “Copiar enlace” para compartir el trabajo.';
  };
  image.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=png&data=${encoded}`;
});
document.getElementById('copy-qr-link').addEventListener('click', () => document.getElementById('copy-link').click());
document.getElementById('download-pdf').addEventListener('click', () => { document.getElementById('qr-dialog').close(); window.focus(); window.print(); });

document.getElementById('print-activity').addEventListener('click', () => { window.focus(); window.print(); });

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .12 });
  document.querySelectorAll('.intro,.workspace').forEach((node, index) => { node.classList.add('reveal'); node.style.transitionDelay = `${index * 100}ms`; observer.observe(node); });
} else document.querySelectorAll('.intro,.workspace').forEach(node => node.classList.add('visible'));
