let cart = JSON.parse(localStorage.getItem('twsCart') || '[]');
let verified = false;
const $ = id => document.getElementById(id);
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); setTimeout(() => e.classList.remove('show'), 2200) }

function persist() {
  localStorage.setItem('twsCart', JSON.stringify(cart));
}

function render() {
  let sub = 0;
  $('items').innerHTML = cart.map(x => {
    sub += x.unitPrice * x.quantity;
    return `<div class="summary-item" data-cart-id="${x.cartItemId}">
      <img src="${x.preview || x.frontPhoto || `design-${String(x.id).padStart(2, '0')}.jpg`}" alt="">
      <div style="flex:1">
        <b>${x.productName}</b>
        <div>₹${x.unitPrice} each</div>
        <small>Back design ${x.backDesign}</small>
        <div class="qty" style="margin-top:8px">
          <button type="button" class="btn btn-light" data-qty-minus="${x.cartItemId}" style="padding:6px 12px">−</button>
          <strong>${x.quantity}</strong>
          <button type="button" class="btn btn-light" data-qty-plus="${x.cartItemId}" style="padding:6px 12px">+</button>
          <button type="button" class="btn btn-light" data-remove="${x.cartItemId}" style="margin-left:auto">Remove</button>
        </div>
      </div>
    </div>`;
  }).join('');
  $('subtotal').textContent = '₹' + sub;
  $('total').textContent = '₹' + (cart.length ? sub + 50 : 0);
}

$('items').addEventListener('click', e => {
  const plus = e.target.closest('[data-qty-plus]');
  const minus = e.target.closest('[data-qty-minus]');
  const remove = e.target.closest('[data-remove]');
  if (plus) {
    const it = cart.find(x => x.cartItemId === plus.dataset.qtyPlus);
    if (it) it.quantity += 1;
  } else if (minus) {
    const it = cart.find(x => x.cartItemId === minus.dataset.qtyMinus);
    if (it) it.quantity = Math.max(1, it.quantity - 1);
  } else if (remove) {
    cart = cart.filter(x => x.cartItemId !== remove.dataset.remove);
    toast('Removed from cart');
  } else {
    return;
  }
  persist();
  render();
});

render();

$('sendOtp').onclick = () => {
  if (!/^\d{10}$/.test($('mobile').value)) return toast('Enter a valid 10-digit mobile number');
  verified = true;
  $('otpBox').classList.remove('hidden');
  $('otpNote').textContent = 'Demo verification is enabled in this build. Connect an SMS provider before production.';
  toast('OTP step enabled');
};

$('pincode').addEventListener('input', () => {
  if (/^\d{6}$/.test($('pincode').value)) {
    $('shipping').textContent = '₹50 — location/pincode shipping';
    render();
  }
});

$('place').onclick = async () => {
  if (!cart.length) return toast('Your cart is empty');
  if (!verified) return toast('Verify your mobile number first');
  if (!$('name').value || !/^[0-9]{6}$/.test($('pincode').value)) return toast('Complete name and pincode');
  const subtotal = cart.reduce((s, x) => s + x.unitPrice * x.quantity, 0);
  const customer = {
    name: $('name').value,
    mobile: $('mobile').value,
    pincode: $('pincode').value,
    address: { house: $('house').value, area: $('area').value, landmark: $('landmark').value, city: $('city').value, state: $('state').value }
  };
  const r = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer, items: cart, subtotal, shipping: 50, total: subtotal + 50 })
  });
  const d = await r.json();
  if (!d.ok) return toast(d.error || 'Unable to place order');
  localStorage.removeItem('twsCart');
  location.href = 'track.html?order=' + encodeURIComponent(d.orderNo);
};
