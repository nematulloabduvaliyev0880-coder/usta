const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE_KEY = "ustaos_mvp_v1";

const seed = {
  business: { name: "Usta servis", owner: "Ne'matullo", phone: "" },
  customers: [
    { id: 1, name: "Aziz Karimov", phone: "+998 90 123 45 67" },
    { id: 2, name: "Dilshod Rahimov", phone: "+998 91 234 56 78" },
    { id: 3, name: "Malika Sobirova", phone: "+998 93 345 67 89" }
  ],
  services: [
    { id: 1, name: "Telefon ta'mirlash", price: 150000, description: "Diagnostika va ta'mirlash" },
    { id: 2, name: "Ekran almashtirish", price: 350000, description: "Ekran va displey xizmati" },
    { id: 3, name: "Dasturiy sozlash", price: 80000, description: "Dastur o‘rnatish va sozlash" }
  ],
  orders: [
    { id: 1001, customerId: 1, serviceId: 1, date: new Date().toISOString().slice(0,10), amount: 150000, status: "Yakunlangan", note: "" },
    { id: 1002, customerId: 2, serviceId: 2, date: new Date().toISOString().slice(0,10), amount: 350000, status: "Jarayonda", note: "" },
    { id: 1003, customerId: 3, serviceId: 3, date: new Date().toISOString().slice(0,10), amount: 80000, status: "Kutilmoqda", note: "" }
  ],
  expenses: []
};

let data = loadData();
let editing = null;
let modalType = null;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); renderAll(); }
function money(value) { return new Intl.NumberFormat("uz-UZ").format(Number(value) || 0) + " so‘m"; }
function shortDate(value) {
  if (!value) return "—";
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function customer(id) { return data.customers.find(x => x.id === Number(id)); }
function service(id) { return data.services.find(x => x.id === Number(id)); }
function nextId(list) { return Math.max(0, ...list.map(x => Number(x.id) || 0)) + 1; }
function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}
function navigate(page) {
  $$(".page").forEach(p => p.classList.toggle("active-page", p.id === `page-${page}`));
  $$(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  const active = $(`.nav-link[data-page="${page}"]`);
  $("#breadcrumbTitle").textContent = active ? active.textContent.trim().replace(/\d+$/, "").trim() : "Boshqaruv paneli";
  $("#sidebar").classList.remove("open");
  renderAll();
}
$$(".nav-link").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.page)));
$$("[data-goto]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.goto)));
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#helpBtn").addEventListener("click", () => toast("Yordam markazi tez orada ishga tushadi."));

function renderAll() {
  $("#businessNameSide").textContent = data.business.name;
  $("#orderNavCount").textContent = data.orders.length;
  renderDashboard(); renderOrders(); renderCustomers(); renderServices(); renderFinance(); renderReports(); renderSettings();
}
function renderDashboard() {
  const today = new Date().toISOString().slice(0,10);
  const completed = data.orders.filter(o => o.status === "Yakunlangan");
  const todayIncome = completed.filter(o => o.date === today).reduce((s,o) => s + Number(o.amount), 0);
  const expenseTotal = data.expenses.reduce((s,e) => s + Number(e.amount), 0);
  $("#todayRevenue").textContent = money(todayIncome);
  $("#totalOrders").textContent = data.orders.length;
  $("#pendingOrders").textContent = data.orders.filter(o => o.status === "Jarayonda").length + " ta";
  $("#totalCustomers").textContent = data.customers.length;
  $("#totalExpenses").textContent = money(expenseTotal);
  $("#statusTotal").innerHTML = `${data.orders.length}<small> jami</small>`;
  $("#completedCount").textContent = completed.length;
  $("#progressCount").textContent = data.orders.filter(o => o.status === "Jarayonda").length;
  $("#waitingCount").textContent = data.orders.filter(o => o.status === "Kutilmoqda").length;
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-6); weekStart.setHours(0,0,0,0);
  const weekOrders = completed.filter(o => new Date(o.date+"T00:00:00") >= weekStart);
  const weekTotal = weekOrders.reduce((s,o)=>s+Number(o.amount),0);
  $("#weekRevenue").textContent = money(weekTotal);
  const days = Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);const key=d.toISOString().slice(0,10);return {key,label:d.toLocaleDateString("uz-UZ",{weekday:"short"}),value:weekOrders.filter(o=>o.date===key).reduce((s,o)=>s+Number(o.amount),0)}});
  const max = Math.max(1,...days.map(d=>d.value));
  $("#revenueChart").innerHTML = days.every(d=>d.value===0) ? '<div class="chart-empty">Ma’lumotlar paydo bo‘lishi uchun buyurtmalarni yakunlang.</div>' : days.map(d=>`<div class="bar-wrap"><div class="bar" title="${money(d.value)}" style="height:${Math.max(4,d.value/max*100)}%"></div><span class="bar-label">${d.label}</span></div>`).join("");
  const recent = [...data.orders].sort((a,b)=>b.id-a.id).slice(0,5);
  $("#recentOrders").innerHTML = recent.map(orderRow).join("");
  $("#recentEmpty").style.display = recent.length ? "none" : "block";
}
function orderRow(o, actions=false) {
  const c=customer(o.customerId), s=service(o.serviceId);
  return `<tr><td class="order-id">#UST-${o.id}</td><td>${escapeHTML(c?.name || "O‘chirilgan mijoz")}</td><td>${escapeHTML(s?.name || "Xizmat")}</td><td>${shortDate(o.date)}</td><td class="amount">${money(o.amount)}</td><td><span class="status status-${o.status.toLowerCase()}">${o.status}</span></td>${actions?`<td><div class="row-actions"><button class="small-action" data-edit-order="${o.id}">Tahrir</button><button class="small-action" data-delete-order="${o.id}">O‘chirish</button></div></td>`:""}</tr>`;
}
function renderOrders() {
  const q=($("#orderSearch")?.value||"").toLowerCase(), filter=$("#orderFilter")?.value||"all";
  const list=[...data.orders].filter(o=>{const c=customer(o.customerId);return (filter==="all"||o.status===filter)&&(`#ust-${o.id}`.includes(q)||(c?.name||"").toLowerCase().includes(q));}).sort((a,b)=>b.id-a.id);
  $("#ordersTable").innerHTML=list.map(o=>orderRow(o,true)).join("");
  $("#ordersEmpty").style.display=list.length?"none":"block";
  $$("[data-edit-order]").forEach(b=>b.addEventListener("click",()=>openOrderModal(Number(b.dataset.editOrder))));
  $$("[data-delete-order]").forEach(b=>b.addEventListener("click",()=>deleteItem("orders",Number(b.dataset.deleteOrder))));
}
function renderCustomers() {
  const q=($("#customerSearch")?.value||"").toLowerCase();
  const list=data.customers.filter(c=>c.name.toLowerCase().includes(q)||c.phone.toLowerCase().includes(q));
  $("#customerGrid").innerHTML=list.map(c=>`<article class="customer-card"><div class="customer-top"><div class="customer-avatar">${escapeHTML(c.name.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div><div><strong>${escapeHTML(c.name)}</strong><p>${escapeHTML(c.phone||"Telefon kiritilmagan")}</p></div></div><div class="customer-meta"><span>${data.orders.filter(o=>o.customerId===c.id).length} ta buyurtma</span><button class="small-action" data-delete-customer="${c.id}">O‘chirish</button></div></article>`).join("");
  $("#customersEmpty").style.display=list.length?"none":"block";
  $$("[data-delete-customer]").forEach(b=>b.addEventListener("click",()=>deleteItem("customers",Number(b.dataset.deleteCustomer))));
}
function renderServices() {
  $("#serviceGrid").innerHTML=data.services.map(s=>`<article class="service-card"><div class="service-symbol">⚒</div><strong>${escapeHTML(s.name)}</strong><p>${escapeHTML(s.description||"Xizmat")}</p><div class="service-price">${money(s.price)} <small>/ xizmat</small></div><div class="customer-meta" style="margin-top:13px"><span>Faol xizmat</span><button class="small-action" data-delete-service="${s.id}">O‘chirish</button></div></article>`).join("");
  $("#servicesEmpty").style.display=data.services.length?"none":"block";
  $$("[data-delete-service]").forEach(b=>b.addEventListener("click",()=>deleteItem("services",Number(b.dataset.deleteService))));
}
function renderFinance() {
  const income=data.orders.filter(o=>o.status==="Yakunlangan").reduce((s,o)=>s+Number(o.amount),0);
  const expense=data.expenses.reduce((s,e)=>s+Number(e.amount),0);
  $("#financeIncome").textContent=money(income);$("#financeExpense").textContent=money(expense);$("#financeProfit").textContent=money(income-expense);
  $("#expenseTable").innerHTML=[...data.expenses].sort((a,b)=>b.id-a.id).map(e=>`<tr><td>${escapeHTML(e.note)}</td><td>${shortDate(e.date)}</td><td class="amount">${money(e.amount)}</td><td><button class="small-action" data-delete-expense="${e.id}">O‘chirish</button></td></tr>`).join("");
  $("#expensesEmpty").style.display=data.expenses.length?"none":"block";
  $$("[data-delete-expense]").forEach(b=>b.addEventListener("click",()=>deleteItem("expenses",Number(b.dataset.deleteExpense))));
}
function renderReports() {
  const done=data.orders.filter(o=>o.status==="Yakunlangan"), income=done.reduce((s,o)=>s+Number(o.amount),0);
  $("#reportOrders").textContent=data.orders.length;$("#reportCompleted").textContent=done.length;$("#averageCheck").textContent=money(done.length?income/done.length:0);
  $("#reportSummary").textContent=`Jami ${data.orders.length} ta buyurtma qayd etilgan. Shundan ${done.length} tasi yakunlangan. Yakunlangan buyurtmalar bo‘yicha tushum ${money(income)}. Xarajatlar ${money(data.expenses.reduce((s,e)=>s+Number(e.amount),0))}.`;
}
function renderSettings() {
  $("#businessName").value=data.business.name;$("#ownerName").value=data.business.owner;$("#businessPhone").value=data.business.phone||"";
}
function openModal(title, fields, onSave) {
  modalType=onSave;$("#modalTitle").textContent=title;$("#modalFields").innerHTML=fields;
  $("#modalBackdrop").classList.add("show");
}
function closeModal(){ $("#modalBackdrop").classList.remove("show");$("#modalFields").innerHTML="";modalType=null; }
$("#closeModal").addEventListener("click",closeModal);$("#cancelModal").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target.id==="modalBackdrop")closeModal();});
function field(label,name,type="text",value="",extra="") {
  return `<label>${label}<input name="${name}" type="${type}" value="${escapeHTML(value)}" ${extra} required></label>`;
}
function openOrderModal(id=null) {
  if(!data.customers.length||!data.services.length){toast("Avval kamida bitta mijoz va xizmat qo‘shing.");return;}
  const old=data.orders.find(o=>o.id===id);
  const customerOptions=data.customers.map(c=>`<option value="${c.id}" ${old?.customerId===c.id?"selected":""}>${escapeHTML(c.name)}</option>`).join("");
  const serviceOptions=data.services.map(s=>`<option value="${s.id}" ${old?.serviceId===s.id?"selected":""}>${escapeHTML(s.name)}</option>`).join("");
  const fields=`<label>Mijoz<select name="customerId">${customerOptions}</select></label><label>Xizmat<select name="serviceId">${serviceOptions}</select></label>${field("Sana","date","date",old?.date||new Date().toISOString().slice(0,10))}${field("Summa (so‘m)","amount","number",old?.amount??"", 'min="0" step="1000"') }<label>Holati<select name="status">${["Kutilmoqda","Jarayonda","Yakunlangan"].map(s=>`<option ${old?.status===s?"selected":""}>${s}</option>`).join("")}</select></label><label class="full">Izoh<input name="note" value="${escapeHTML(old?.note||"")}" placeholder="Qo‘shimcha ma'lumot"></label>`;
  openModal(old?"Buyurtmani tahrirlash":"Yangi buyurtma",fields,form=>{
    const f=new FormData(form),item={id:old?.id||nextId(data.orders),customerId:Number(f.get("customerId")),serviceId:Number(f.get("serviceId")),date:f.get("date"),amount:Number(f.get("amount")),status:f.get("status"),note:f.get("note")};
    if(item.amount<0||!Number.isFinite(item.amount))return toast("Summani to‘g‘ri kiriting.");
    if(old)data.orders=data.orders.map(o=>o.id===old.id?item:o);else data.orders.push(item);
    closeModal();saveData();toast(old?"Buyurtma yangilandi":"Buyurtma qo‘shildi");
  });
}
function openCustomerModal(){
  openModal("Yangi mijoz",`${field("Mijoz ismi","name")}${field("Telefon raqami","phone","tel","","placeholder='+998 90 123 45 67'")}`,form=>{
    const f=new FormData(form);data.customers.push({id:nextId(data.customers),name:f.get("name").trim(),phone:f.get("phone").trim()});closeModal();saveData();toast("Mijoz qo‘shildi");
  });
}
function openServiceModal(){
  openModal("Yangi xizmat",`${field("Xizmat nomi","name")}${field("Narxi (so‘m)","price","number","","min='0' step='1000'")}<label class="full">Qisqacha izoh<input name="description" placeholder="Xizmat haqida"></label>`,form=>{
    const f=new FormData(form),price=Number(f.get("price"));if(price<0||!Number.isFinite(price))return toast("Narxni tekshiring.");
    data.services.push({id:nextId(data.services),name:f.get("name").trim(),price,description:f.get("description").trim()});closeModal();saveData();toast("Xizmat qo‘shildi");
  });
}
function openExpenseModal(){
  openModal("Yangi xarajat",`${field("Xarajat nomi","note")}${field("Summa (so‘m)","amount","number","","min='0' step='1000'")}${field("Sana","date","date",new Date().toISOString().slice(0,10))}`,form=>{
    const f=new FormData(form),amount=Number(f.get("amount"));if(amount<0||!Number.isFinite(amount))return toast("Summani tekshiring.");
    data.expenses.push({id:nextId(data.expenses),note:f.get("note").trim(),amount,date:f.get("date")});closeModal();saveData();toast("Xarajat qo‘shildi");
  });
}
$("#modalForm").addEventListener("submit",e=>{e.preventDefault();if(modalType)modalType(e.currentTarget);});
function deleteItem(collection,id){
  if(!confirm("Ushbu ma'lumotni o‘chirishni xohlaysizmi?"))return;
  data[collection]=data[collection].filter(x=>x.id!==id);saveData();toast("Ma'lumot o‘chirildi");
}
$("#quickAdd").addEventListener("click",()=>openOrderModal());
$("#addOrderBtn").addEventListener("click",()=>openOrderModal());
$("#addCustomerBtn").addEventListener("click",openCustomerModal);
$("#addServiceBtn").addEventListener("click",openServiceModal);
$("#addExpenseBtn").addEventListener("click",openExpenseModal);
$("#orderSearch").addEventListener("input",renderOrders);$("#orderFilter").addEventListener("change",renderOrders);$("#customerSearch").addEventListener("input",renderCustomers);
$("#settingsForm").addEventListener("submit",e=>{e.preventDefault();data.business={name:$("#businessName").value.trim(),owner:$("#ownerName").value.trim(),phone:$("#businessPhone").value.trim()};saveData();toast("Sozlamalar saqlandi");});
$("#resetData").addEventListener("click",()=>{if(confirm("Barcha ma'lumotlar o‘chirilsinmi? Bu amalni ortga qaytarib bo‘lmaydi.")){data={...structuredClone(seed),orders:[],customers:[],services:[],expenses:[]};saveData();toast("Demo ma'lumotlari tozalandi");}});
$("#exportBtn").addEventListener("click",()=>{
  const rows=[["Buyurtma","Mijoz","Xizmat","Sana","Summa","Holat"],...data.orders.map(o=>[o.id,customer(o.customerId)?.name||"",service(o.serviceId)?.name||"",o.date,o.amount,o.status])];
  const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="ustaos-hisobot.csv";a.click();URL.revokeObjectURL(url);
});
$("#todayLabel").textContent=new Date().toLocaleDateString("uz-UZ",{day:"numeric",month:"long",year:"numeric"});
renderAll();