import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://bvqrwpzpjgmimhyafica.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_rEFYJQlo___LbBQ0eJ54Og_At6IVpki";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const categories=[{name:"الكل",icon:"✦"},{name:"هواتف",icon:"📱"},{name:"إلكترونيات",icon:"💻"},{name:"ملابس",icon:"👕"},{name:"منزل وأثاث",icon:"🛋️"},{name:"سيارات",icon:"🚗"},{name:"أخرى",icon:"📦"}];
let products=[], activeCategory="الكل", currentUser=null, currentProfile=null, isLogin=false;
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("ar-MR").format(n)+" MRU";
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),3000)}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderCategories(){$("categoryGrid").innerHTML=categories.slice(1).map(c=>'<button class="category '+(activeCategory===c.name?'active':'')+'" data-category="'+c.name+'"><span>'+c.icon+'</span><b>'+c.name+'</b></button>').join("");$("productCategory").innerHTML=categories.slice(1).map(c=>'<option>'+c.name+'</option>').join("");document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{activeCategory=activeCategory===b.dataset.category?"الكل":b.dataset.category;renderCategories();renderProducts()})}
async function loadProducts(){const {data,error}=await supabase.from("products").select("id,seller_id,title,description,price_mru,category,city,image_path,created_at,brand,product_condition,stock,product_details").eq("status","published").order("created_at",{ascending:false});if(error){console.error(error);toast("تعذر تحميل المنتجات. تحقق من اتصال قاعدة البيانات.");return}products=data||[];renderProducts()}
function imageUrl(path){if(!path)return "";return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl}
function renderProducts(){const q=$("searchInput").value.trim().toLowerCase(),city=$("cityFilter").value,sort=$("sortFilter").value;let list=products.filter(p=>(activeCategory==="الكل"||p.category===activeCategory)&&(!city||p.city===city)&&(!q||(p.title+" "+p.description+" "+p.category).toLowerCase().includes(q)));list.sort((a,b)=>sort==="low"?a.price_mru-b.price_mru:sort==="high"?b.price_mru-a.price_mru:new Date(b.created_at)-new Date(a.created_at));$("resultCount").textContent=list.length+" منتج";$("emptyState").hidden=!!list.length;$("productGrid").innerHTML=list.map(p=>'<a class="product-card" href="product.html?id='+encodeURIComponent(p.id)+'"><div class="product-image">'+(p.image_path?'<img src="'+escapeHtml(imageUrl(p.image_path))+'" alt="'+escapeHtml(p.title)+'">':"📦")+'</div><div class="product-info"><h3>'+escapeHtml(p.title)+'</h3><div class="price">'+money(p.price_mru)+'</div><div class="product-meta"><span>⌖ '+escapeHtml(p.city)+'</span><span>'+escapeHtml(p.category)+'</span></div></div></a>').join("")}
async function refreshSession(){const {data}=await supabase.auth.getSession();currentUser=data.session?.user||null;currentProfile=null;if(currentUser){const {data:profile,error}=await supabase.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();if(!error)currentProfile=profile}$("loginOpen").textContent=currentUser?(currentProfile?.display_name||"حسابي"):"تسجيل الدخول";$("loginOpen").href=currentUser?"dashboard.html":"login.html"}
function showProduct(id){const p=products.find(x=>x.id===id);if(!p)return;$("productDetails").innerHTML='<span class="eyebrow">تفاصيل المنتج</span><h2>'+escapeHtml(p.title)+'</h2><div class="product-image" style="border-radius:12px;margin:15px 0">'+(p.image_path?'<img src="'+escapeHtml(imageUrl(p.image_path))+'" alt="">':"📦")+'</div><div class="price">'+money(p.price_mru)+'</div><p>'+escapeHtml(p.description||"لا يوجد وصف.")+'</p><p class="product-meta">⌖ '+escapeHtml(p.city)+'　·　'+escapeHtml(p.category)+'</p><button class="primary-btn full" id="orderProduct">طلب المنتج</button><button class="outline-btn full" id="favoriteProduct" style="margin-top:8px">♡ أضف إلى المفضلة</button><p class="demo-warning">الطلب يسجل داخل الموقع، والدفع والتوصيل يتمان بالتواصل المباشر بين المشتري والبائع حاليًا.</p>';$("productDialog").showModal();$("orderProduct").onclick=()=>createOrder(p);$("favoriteProduct").onclick=()=>saveFavorite(p)}
async function saveFavorite(p){if(!currentUser){location.href="login.html";return}if(currentProfile?.role!=="buyer"){toast("المفضلة متاحة لحسابات المشترين.");return}const{error}=await supabase.from("favorites").upsert({user_id:currentUser.id,product_id:p.id});if(error)toast("تعذر حفظ المنتج: "+error.message);else toast("تمت إضافة المنتج إلى المفضلة.")}
async function createOrder(p){if(!currentUser){$("productDialog").close();openAuth(true);toast("سجّل الدخول كمشتري أولاً.");return}if(currentProfile?.role!=="buyer"){toast("الطلب متاح لحساب المشتري فقط.");return}const phone=currentProfile.phone||prompt("أدخل رقم هاتف للتواصل:");if(!phone)return;const {data:order,error}=await supabase.from("orders").insert({buyer_id:currentUser.id,delivery_city:currentProfile.city||p.city,delivery_phone:phone}).select().single();if(error){toast("تعذر إنشاء الطلب: "+error.message);return}const {error:itemError}=await supabase.from("order_items").insert({order_id:order.id,product_id:p.id,seller_id:p.seller_id,quantity:1,unit_price_mru:p.price_mru});if(itemError){await supabase.from("orders").delete().eq("id",order.id);toast("تعذر إضافة المنتج إلى الطلب.");return}$("productDialog").close();toast("تم تسجيل طلبك بنجاح.")}
function openAuth(login=false){
  isLogin=login;
  const form=$("authForm");
  $("authTitle").textContent=login?"تسجيل الدخول":"إنشاء حساب";
  $("authForm").querySelectorAll("[data-signup-only]").forEach(el=>{el.hidden=login;const input=el.querySelector("input,select");if(input)input.required=!login&&input.name==="name"});
  $("authForm").querySelectorAll("[data-login-only]").forEach(el=>el.hidden=!login);
  $("authNote").textContent=login?"أدخل البريد الإلكتروني وكلمة المرور واختر نوع حسابك.":"أدخل بياناتك لإنشاء حساب جديد.";
  $("authHelp").hidden=login;
  form.elements.email.autocomplete="email";
  form.elements.password.autocomplete=login?"current-password":"new-password";
  form.querySelector('button[type="submit"]').textContent=login?"تسجيل الدخول":"إنشاء الحساب";
  $("switchAuth").textContent=login?"إنشاء حساب جديد":"تسجيل الدخول";
  $("authDialog").showModal();
}
function openSell(){if(!currentUser){toast("سجّل الدخول أولاً لإنشاء إعلان.");openAuth();return}if(currentProfile?.role!=="seller"){toast("هذه الميزة متاحة لحسابات البائعين.");return}$("sellDialog").showModal()}
$("authForm").onsubmit=async e=>{
  e.preventDefault();
  const form=e.currentTarget, f=new FormData(form);
  const email=String(f.get("email")||"").trim().toLowerCase();
  const password=String(f.get("password")||"");
  const submit=form.querySelector('button[type="submit"]');
  if(!email||!password){toast("أدخل البريد الإلكتروني وكلمة المرور.");return}
  submit.disabled=true;
  try{
    if(isLogin){
      const requestedRole=String(f.get("loginRole")||"");
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
      await refreshSession();
      if(!currentProfile || currentProfile.role!==requestedRole){
        await supabase.auth.signOut();
        await refreshSession();
        const roleName=requestedRole==="seller"?"بائع":"مشتري";
        throw new Error("هذا الحساب ليس مسجلاً كـ"+roleName+". اختر نوع الحساب الصحيح.");
      }
      $("authDialog").close();
      form.reset();
      toast("تم تسجيل الدخول بنجاح.");
      return;
    }
    const display_name=String(f.get("name")||"").trim();
    if(!display_name){toast("أدخل اسمك الكامل لإنشاء الحساب.");return}
    const {data,error}=await supabase.auth.signUp({
      email,password,
      options:{data:{
        display_name,
        phone:String(f.get("phone")||"").trim(),
        city:String(f.get("city")||""),
        role:String(f.get("role")||"buyer")
      }}
    });
    if(error)throw error;
    $("authDialog").close();
    form.reset();
    if(data.session){
      await refreshSession();
      toast("تم إنشاء الحساب وتسجيل دخولك بنجاح.");
    }else{
      toast("تم إنشاء الحساب. افتح رسالة التأكيد في بريدك الإلكتروني، ثم سجّل الدخول بالبريد وكلمة المرور.");
    }
  }catch(error){
    const msg=error?.message||"حدث خطأ غير متوقع.";
    const friendly={
      "Invalid login credentials":"البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "Email not confirmed":"أكد بريدك الإلكتروني أولاً من الرسالة التي وصلتك.",
      "User already registered":"هذا البريد مسجل مسبقًا. سجّل الدخول بدل إنشاء حساب جديد.",
      "Password should be at least 6 characters":"يجب أن تتكون كلمة المرور من 6 أحرف على الأقل."
    };
    toast(friendly[msg]||msg);
  }finally{submit.disabled=false}
};
$("switchAuth").onclick=()=>{$("authDialog").close();openAuth(!isLogin)};
$("productForm").onsubmit=async e=>{e.preventDefault();if(!currentUser||currentProfile?.role!=="seller"){toast("يجب تسجيل الدخول بحساب بائع.");return}const f=new FormData(e.target),file=f.get("image");let image_path=null;if(file&&file.size){if(!file.type.startsWith("image/")||file.size>5*1024*1024){toast("اختر صورة أقل من 5 ميغابايت.");return}image_path=currentUser.id+"/"+crypto.randomUUID()+"."+file.name.split(".").pop().toLowerCase();const {error:uploadError}=await supabase.storage.from("product-images").upload(image_path,file,{upsert:false,contentType:file.type});if(uploadError){toast("فشل رفع الصورة: "+uploadError.message);return}}const parseLines=value=>String(value||"").split("\n").map(x=>x.trim()).filter(Boolean);const specifications={};parseLines(f.get("specifications")).forEach(line=>{const i=line.indexOf(":");if(i>0)specifications[line.slice(0,i).trim()]=line.slice(i+1).trim()});const product_details={features:parseLines(f.get("features")),warranty:String(f.get("warranty")||"").trim(),delivery:String(f.get("delivery")||"").trim(),specifications};const {error}=await supabase.from("products").insert({seller_id:currentUser.id,title:f.get("title"),price_mru:Number(f.get("price")),category:f.get("category"),city:f.get("city"),image_path,description:f.get("description"),brand:String(f.get("brand")||"").trim(),product_condition:f.get("condition"),stock:Number(f.get("stock")||1),product_details});if(error){if(image_path)await supabase.storage.from("product-images").remove([image_path]);toast("تعذر نشر الإعلان: "+error.message);return}$("sellDialog").close();e.target.reset();await loadProducts();toast("تم نشر إعلانك بنجاح.");};
$("loginOpen").onclick=e=>{e.preventDefault();location.href=currentUser?"dashboard.html":"login.html"};["sellOpen","heroSell","bannerSell"].forEach(id=>$(id).onclick=openSell);$("searchForm").onsubmit=e=>{e.preventDefault();renderProducts();$("listings").scrollIntoView()};$("searchInput").oninput=renderProducts;$("cityFilter").onchange=renderProducts;$("sortFilter").onchange=renderProducts;$("clearCategory").onclick=()=>{activeCategory="الكل";renderCategories();renderProducts()};$("year").textContent=new Date().getFullYear();
supabase.auth.onAuthStateChange(()=>{setTimeout(async()=>{await refreshSession();},0)});
await refreshSession();renderCategories();await loadProducts();
