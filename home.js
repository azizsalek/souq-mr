import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  "https://bvqrwpzpjgmimhyafica.supabase.co",
  "sb_publishable_rEFYJQlo___LbBQ0eJ54Og_At6IVpki"
);

const grid = document.getElementById("souqProductGrid");
const desktopSearch = document.getElementById("souqSearchDesktop");
const mobileSearch = document.getElementById("souqSearchMobile");
let allProducts = [];
let selectedCategory = "";

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[ch]));
const formatPrice = value => new Intl.NumberFormat("ar-MR").format(Number(value || 0));
const imageURL = path => path
  ? supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl
  : "";

function categoryForLabel(label) {
  const map = {
    "هواتف وإلكترونيات": ["هواتف", "إلكترونيات"],
    "سيارات ومركبات": ["سيارات"],
    "عقارات وأراضي": ["عقارات"],
    "ملابس وأزياء": ["ملابس"],
    "أثاث ومنزل": ["منزل وأثاث", "أثاث"]
  };
  return map[label] || [];
}

function renderProducts() {
  const q = (desktopSearch?.value || mobileSearch?.value || "").trim().toLocaleLowerCase();
  const filtered = allProducts.filter(p => {
    const matchesCategory = !selectedCategory || categoryForLabel(selectedCategory).includes(p.category);
    const text = [p.title, p.description, p.category, p.city].join(" ").toLocaleLowerCase();
    return matchesCategory && (!q || text.includes(q));
  });

  if (!filtered.length) {
    grid.innerHTML = '<div class="col-span-full text-center bg-white rounded-2xl p-8 text-slate-500 text-sm">لا توجد منتجات منشورة تطابق بحثك حاليًا.</div>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const img = imageURL(p.image_path);
    return `
      <article class="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition group">
        <div class="relative h-44 bg-slate-100 overflow-hidden">
          ${img ? `<img src="${escapeHTML(img)}" alt="${escapeHTML(p.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">` : '<div class="w-full h-full flex items-center justify-center text-5xl">📦</div>'}
          <button type="button" data-favorite="${escapeHTML(p.id)}" aria-label="إضافة للمفضلة" class="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 text-rose-500 flex items-center justify-center">♡</button>
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1"><span>⌖ ${escapeHTML(p.city || "موريتانيا")}</span><span>${escapeHTML(p.category || "")}</span></div>
          <h3 class="font-bold text-slate-800 text-sm mb-2 line-clamp-1">${escapeHTML(p.title)}</h3>
          <div class="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
            <div class="text-brand-800 font-black text-base">${formatPrice(p.price_mru)} <span class="text-xs font-bold">MRU</span></div>
            <a href="/product.html?id=${encodeURIComponent(p.id)}" class="text-xs font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition">التفاصيل</a>
          </div>
        </div>
      </article>`;
  }).join("");

  grid.querySelectorAll("[data-favorite]").forEach(button => {
    button.addEventListener("click", () => addFavorite(button.dataset.favorite));
  });
}

async function addFavorite(productId) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    location.href = "/login.html";
    return;
  }
  const { error } = await supabase.from("favorites").upsert(
    { user_id: data.user.id, product_id: productId },
    { onConflict: "user_id,product_id" }
  );
  alert(error ? "تعذرت إضافة المنتج للمفضلة." : "تمت إضافة المنتج إلى المفضلة.");
}

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id,title,description,price_mru,category,city,image_path,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Souq MR products:", error);
    grid.innerHTML = '<div class="col-span-full text-center bg-white rounded-2xl p-8 text-slate-500 text-sm">تعذر تحميل المنتجات الآن. حاول مرة أخرى لاحقًا.</div>';
    return;
  }
  allProducts = data || [];
  renderProducts();
}

desktopSearch?.addEventListener("input", () => {
  if (mobileSearch) mobileSearch.value = desktopSearch.value;
  renderProducts();
});
mobileSearch?.addEventListener("input", () => {
  if (desktopSearch) desktopSearch.value = mobileSearch.value;
  renderProducts();
});

document.querySelectorAll("[data-souq-category]").forEach(link => {
  link.addEventListener("click", () => {
    const label = link.dataset.souqCategory;
    selectedCategory = label === "جميع الأقسام" || selectedCategory === label ? "" : label;
    setTimeout(() => {
      renderProducts();
      document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  });
});

window.openAddModal = async () => {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    location.href = "/login.html";
    return;
  }
  const { data: profile } = await supabase.from("profiles")
    .select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "seller") {
    alert("إضافة الإعلانات متاحة لحسابات البائعين. يمكنك إنشاء حساب بائع أو تسجيل الدخول به.");
    return;
  }
  location.href = "/dashboard.html";
};

const oldShowSection = window.showSection;
window.showSection = async sectionId => {
  if (sectionId === "profile-section") {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      location.href = "/login.html";
      return;
    }
    location.href = "/dashboard.html";
    return;
  }
  if (typeof oldShowSection === "function") oldShowSection(sectionId);
};

loadProducts();
