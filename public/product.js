const qs = new URLSearchParams(location.search);
const id = Math.max(1, Number(qs.get('design') || 1));
const priceDefault = 200;
let qty = 1;
let side = 'front';
let back = 'default';
let backImage = null;
let photoData = null;
let product = null;
let backDesigns = [];

const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');
const fields = ['name', 'date', 'message', 'request'].map(x => document.getElementById(x));
const $ = key => document.getElementById(key);

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(window.__twsToast);
  window.__twsToast = setTimeout(() => el.classList.remove('show'), 2200);
}

function normalizeImage(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src) || src.startsWith('/')) return src;
  return '/' + src.replace(/^\.\//, '');
}

function imageCandidates(src, fallbackId) {
  const clean = normalizeImage(src);
  const n = String(fallbackId).padStart(2, '0');
  const candidates = [];
  if (clean) candidates.push(clean);
  candidates.push(`/design-${n}.jpg`, `/design-${n}.JPG`, `/assets/products/design-${n}.jpg`, `/assets/products/design-${n}.JPG`);
  return [...new Set(candidates)];
}

function loadImage(candidates) {
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      if (i >= candidates.length) return reject(new Error('Image not found. Tried: ' + candidates.join(', ')));
      const img = new Image();
      const src = candidates[i++];
      img.onload = () => resolve(img);
      img.onerror = tryNext;
      img.src = src;
    };
    tryNext();
  });
}

function fitImage(img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function drawText() {
  if (side !== 'back') return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '700 48px DM Sans';
  ctx.fillText(fields[0].value || 'I LOVE YOU', canvas.width / 2, canvas.height - 210);
  ctx.font = '500 25px DM Sans';
  ctx.fillText(fields[1].value || '', canvas.width / 2, canvas.height - 160);
  ctx.font = '400 24px DM Sans';
  wrap(fields[2].value || '', canvas.width / 2, canvas.height - 115, canvas.width - 100, 30);
  ctx.restore();
}

function wrap(text, x, y, max, lineHeight) {
  let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

async function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    if (side === 'front') {
      if (photoData) {
        const img = await loadImage([photoData]);
        fitImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        const src = product?.image;
        const img = await loadImage(imageCandidates(src, id));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    } else {
      let img;
      if (back === 'default' && backImage) {
        img = await loadImage(imageCandidates(backImage, id));
      } else {
        const useId = back === 'default' ? 35 : back;
        const selected = backDesigns.find(d => Number(d.id) === Number(useId));
        img = await loadImage(imageCandidates(selected?.image, useId));
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawText();
    }
  } catch (err) {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = '#ffdd55';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    wrap('DEBUG: ' + (err && err.message ? err.message : String(err)), 12, 40, canvas.width - 24, 18);
    wrap('side=' + side + ' id=' + id + ' src=' + JSON.stringify(product?.image), 12, 90, canvas.width - 24, 18);
    ctx.restore();
    if (side === 'back') drawText();
  }
}

async function loadProduct() {
  try {
    const r = await fetch(`/api/products/${id}`);
    if (r.ok) {
      product = await r.json();
      backImage = product.back_image || null;
      $('productName').textContent = product.name || `Design ${String(id).padStart(2, '0')}`;
      $('price').textContent = product.price || priceDefault;
      if (product.description) $('description').textContent = product.description;
    }
  } catch (_) {
    $('productName').textContent = `Design ${String(id).padStart(2, '0')}`;
  }
}

async function loadBackDesigns() {
  try {
    const r = await fetch('/api/designs');
    if (r.ok) {
      const data = await r.json();
      backDesigns = Array.isArray(data) ? data.filter(d => Number(d.id) >= 35 && Number(d.id) <= 65) : [];
    }
  } catch (_) {}

  if (!backDesigns.length) {
    backDesigns = Array.from({ length: 31 }, (_, i) => ({ id: 35 + i, name: `Design ${35 + i}`, image: `design-${35 + i}.jpg` }));
  }

  const grid = $('designGrid');
  grid.innerHTML = '';
  $('designCount').textContent = `${backDesigns.length} designs`;

  backDesigns.forEach((d, index) => {
    const n = Number(d.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `design-option${n === back ? ' active' : ''}`;
    button.setAttribute('aria-label', `Choose back design ${n}`);

    const img = document.createElement('img');
    img.alt = `Design ${n}`;
    img.src = normalizeImage(d.image) || `/design-${String(n).padStart(2, '0')}.jpg`;
    img.onerror = () => {
      const fallback = `/design-${String(n).padStart(2, '0')}.jpg`;
      if (img.src !== location.origin + fallback) img.src = fallback;
    };

    const label = document.createElement('span');
    label.textContent = `NO. ${n}`;
    button.append(img, label);
    button.onclick = () => {
      back = n;
      document.querySelectorAll('.design-option').forEach(x => x.classList.remove('active'));
      button.classList.add('active');
      draw();
    };
    grid.appendChild(button);
  });
}

$('photo').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    photoData = reader.result;
    side = 'front';
    document.querySelectorAll('[data-side]').forEach(x => x.classList.toggle('active', x.dataset.side === 'front'));
    $('frontEditor').classList.remove('hidden');
    $('backEditor').classList.add('hidden');
    draw();
  };
  reader.readAsDataURL(file);
});

fields.forEach(el => el.addEventListener('input', draw));

document.querySelectorAll('[data-side]').forEach(button => {
  button.onclick = () => {
    side = button.dataset.side;
    document.querySelectorAll('[data-side]').forEach(x => x.classList.toggle('active', x === button));
    $('frontEditor').classList.toggle('hidden', side !== 'front');
    $('backEditor').classList.toggle('hidden', side !== 'back');
    draw();
  };
});

$('minus').onclick = () => {
  qty = Math.max(1, qty - 1);
  $('quantity').textContent = qty;
};
$('plus').onclick = () => {
  qty += 1;
  $('quantity').textContent = qty;
};

function item() {
  return {
    cartItemId: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    id,
    productName: $('productName').textContent,
    unitPrice: Number($('price').textContent) || priceDefault,
    quantity: qty,
    frontPhoto: photoData,
    productImage: product?.image || `design-${String(id).padStart(2, '0')}.jpg`,
    backDesign: back,
    name: fields[0].value,
    date: fields[1].value,
    message: fields[2].value,
    request: fields[3].value,
    preview: canvas.toDataURL('image/jpeg', 0.82)
  };
}

function cartTotalQty(cart) {
  return cart.reduce((s, x) => s + (Number(x.quantity) || 1), 0);
}

function save() {
  const cart = JSON.parse(localStorage.getItem('twsCart') || '[]');
  cart.push(item());
  localStorage.setItem('twsCart', JSON.stringify(cart));
  $('cartCount').textContent = cartTotalQty(cart);
}

$('add').onclick = () => {
  save();
  toast('Added to cart');
};
$('buy').onclick = () => {
  save();
  location.href = 'checkout.html';
};

(async function init() {
  $('productName').textContent = `Design ${String(id).padStart(2, '0')}`;
  $('price').textContent = priceDefault;
  $('cartCount').textContent = cartTotalQty(JSON.parse(localStorage.getItem('twsCart') || '[]'));
  await Promise.all([loadProduct(), loadBackDesigns()]);
  await draw();
})();
