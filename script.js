const products = [
  { id: 1, name: "Photo Memory", category: "photo", tags: ["photo","memories"], image: "design-01.jpg" },
  { id: 2, name: "Upload Your Photo", category: "photo", tags: ["photo"], image: "design-02.jpg" },
  { id: 3, name: "Tree of Love", category: "couples", tags: ["couples","memories"], image: "design-03.jpg" },
  { id: 4, name: "Love Note", category: "couples", tags: ["couples","quotes"], image: "design-06.jpg" },
  { id: 5, name: "Instagram Memory", category: "memories", tags: ["memories","photo"], image: "design-04.jpg" },
  { id: 6, name: "Distance Card", category: "distance", tags: ["couples","memories"], image: "design-07.jpg" },
  { id: 7, name: "Together", category: "music", tags: ["music","couples"], image: "design-05.jpg" },
  { id: 8, name: "Special Date", category: "memories", tags: ["memories","couples"], image: "design-09.jpg" },
  { id: 9, name: "Photo + Message", category: "photo", tags: ["photo","quotes"], image: "design-08.jpg" },
  { id: 10, name: "Calendar Memory", category: "memories", tags: ["memories","couples"], image: "design-12.jpg" },
  { id: 11, name: "Photo + Date", category: "photo", tags: ["photo","memories"], image: "design-11.jpg" },
  { id: 12, name: "Best Friend", category: "friendship", tags: ["friendship","quotes"], image: "design-10.jpg" },
  { id: 13, name: "Illustrated Couple", category: "couples", tags: ["couples","illustrated"], image: "design-13.jpg" },
  { id: 14, name: "Sweet Message", category: "friendship", tags: ["friendship","quotes"], image: "design-14.jpg" },
  { id: 15, name: "Love Bank", category: "photo", tags: ["photo","couple"], image: "design-15.JPG" },
  { id: 16, name: "photo memory", category: "photo", tags: ["photo","memories"], image: "design-16.jpg" },
  { id: 17, name: "Love Journey Date", category: "photo", tags: ["photo","memories"], image: "design-17.JPG" },
  { id: 18, name: "Dad Son", category: "photo", tags: ["photo","memories"], image: "design-18.JPG" },
  { id: 19, name: "I Miss You", category: "photo", tags: ["photo","memories"], image: "design-19.JPG" },
  { id: 20, name: "Best mom", category: "photo", tags: ["photo","memories"], image: "design-20.JPG" },
  { id: 21, name: "Specials Date", category: "photo", tags: ["photo","memories"], image: "design-21.JPG" },
  { id: 22, name: "Unlimited Memories", category: "photo", tags: ["photo","memories"], image: "design-22.JPG" },
  { id: 23, name: "Newly married", category: "photo", tags: ["photo","memories"], image: "design-23.JPG" },
  { id: 24, name: "Love Rope", category: "photo", tags: ["photo","memories"], image: "design-24.jpg" },
  { id: 25, name: "Married memory", category: "photo", tags: ["photo","memories"], image: "design-25.jpg" }
];

const grid = document.getElementById("productGrid");
const toast = document.getElementById("toast");
const header = document.getElementById("siteHeader");

function categoryLabel(category) {
  const labels = {
    photo: "Photo",
    couples: "Couples",
    music: "Music",
    memories: "Memories",
    friendship: "Friendship",
    distance: "Distance",
    illustrated: "Illustrated"
  };

  return labels[category] || category;
}

function renderProducts(filter = "all") {
  if (!grid) return;

  const filtered =
    filter === "all"
      ? products
      : products.filter(
          p => p.category === filter || p.tags.includes(filter)
        );

  grid.innerHTML = filtered
    .map(
      (p, index) => `
        <article class="product" style="animation-delay:${Math.min(index * 45, 400)}ms">
          <div class="product-media">
            <img
              src="${p.image}"
              alt="${p.name} — The Wallet Studio Design ${String(p.id).padStart(2, "0")}"
              loading="lazy"
            >
            <span class="edition">
              NO. ${String(p.id).padStart(2, "0")}
            </span>
          </div>

          <div class="product-info">
            <div class="product-meta">
              <p class="product-title">${p.name}</p>
              <span class="product-category">
                ${categoryLabel(p.category)}
              </span>
            </div>

            <button
              class="order-link"
              type="button"
              data-design="${String(p.id).padStart(2, "0")}"
            >
              Order This Design ↗
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

async function openInstagram(design = "DM") {
  const message =
    design === "DM"
      ? "Hi! I'd like to order a wallet card from The Wallet Studio."
      : `Hi! I'd like to order Design ${design} from your website.`;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(message);
      showToast(`Message copied: "${message}"`);
    } else {
      showToast(`Instagram message: ${message}`);
    }
  } catch (_) {
    showToast(`Instagram message: ${message}`);
  }

  setTimeout(() => {
    window.open(
      "https://ig.me/m/the.walletstudio",
      "_blank",
      "noopener"
    );
  }, 450);
}

document.addEventListener("click", e => {
  const orderButton = e.target.closest("[data-design]");

  if (orderButton) {
    openInstagram(orderButton.dataset.design);
  }

  const dmButton = e.target.closest("[data-order]");

  if (dmButton) {
    openInstagram("DM");
  }

  const filterButton = e.target.closest(".filter");

  if (filterButton) {
    document
      .querySelectorAll(".filter")
      .forEach(btn => btn.classList.remove("active"));

    filterButton.classList.add("active");

    renderProducts(filterButton.dataset.filter);

    const designs = document.getElementById("designs");
    if (designs) {
      designs.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }
});

if (header) {
  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("scrolled", window.scrollY > 20);
    },
    { passive: true }
  );
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document
    .querySelectorAll(".reveal")
    .forEach(el => observer.observe(el));
} else {
  document
    .querySelectorAll(".reveal")
    .forEach(el => el.classList.add("visible"));
}

renderProducts();
