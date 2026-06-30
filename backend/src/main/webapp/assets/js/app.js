const api = {
  get: (url) => $.getJSON(`api${url}`).then(r => r.data),
  post: (url, data) => $.ajax({ url: `api${url}`, method: 'POST', contentType: 'application/json', data: JSON.stringify(data || {}) }).then(r => r.data),
  put: (url, data) => $.ajax({ url: `api${url}`, method: 'PUT', contentType: 'application/json', data: JSON.stringify(data || {}) }).then(r => r.data),
  del: (url, data) => $.ajax({ url: `api${url}`, method: 'DELETE', contentType: 'application/json', data: JSON.stringify(data || {}) }).then(r => r.data)
};

let currentUser = null;
let categories = [];

$(async function () {
  bindShell();
  await loadSession();
  window.addEventListener('hashchange', route);
  route();
});

function bindShell() {
  $('#navLinks').on('click', '[data-action="login"]', loginModal);
  $('#navLinks').on('click', '[data-action="logout"]', async () => {
    await api.post('/users/logout');
    currentUser = null;
    refreshSessionUi();
    location.hash = '#/';
  });
  $('#closeModal').on('click', closeModal);
  $('#modal').on('click', e => { if (e.target.id === 'modal') closeModal(); });
}

async function loadSession() {
  currentUser = await api.get('/session');
  refreshSessionUi();
  if (currentUser) await refreshCartBadge();
}

function refreshSessionUi() {
  if (currentUser && currentUser.role === 'ADMIN') {
    $('#navLinks').html(`
      <a href="#/admin/products">商品管理</a>
      <a href="#/admin/categories">分类管理</a>
      <a href="#/admin/ads">广告管理</a>
      <a href="#/admin/orders">订单管理</a>
      <a href="#/admin/users">用户管理</a>
      <span class="muted">管理员：admin</span>
      <button type="button" data-action="logout">退出后台</button>
    `);
    return;
  }

  if (currentUser && currentUser.role === 'USER') {
    $('#navLinks').html(`
      <a href="#/">首页</a>
      <a href="#/products">商品</a>
      <a href="#/cart">购物车 <span id="cartBadge" class="nav-cart-badge">0</span></a>
      <a href="#/orders">我的订单</a>
      <span class="muted">用户：${esc(currentUser.username)}</span>
      <button type="button" data-action="logout">退出登录</button>
    `);
    return;
  }

  $('#navLinks').html(`
    <a href="#/">首页</a>
    <a href="#/products">商品</a>
    <button type="button" data-action="login">登录</button>
  `);
}

async function route() {
  const hash = location.hash || '#/';
  try {
    if (hash === '#/') await renderHome();
    else if (hash.startsWith('#/products/')) await renderProductDetail(hash.split('/')[2]);
    else if (hash.startsWith('#/products')) await renderProducts();
    else if (hash === '#/cart') await requireCustomer(renderCart);
    else if (hash === '#/checkout') await requireCustomer(renderCheckout);
    else if (hash.startsWith('#/orders/')) await requireCustomer(() => renderOrderDetail(hash.split('/')[2]));
    else if (hash === '#/orders') await requireCustomer(renderOrders);
    else if (hash.startsWith('#/admin')) await requireAdmin(renderAdmin);
    else await renderHome();
  } catch (error) {
    showError(error);
  }
}

async function renderHome() {
  const ads = await api.get('/ads');
  const products = await api.get('/products');
  const cats = await api.get('/categories');
  $('#app').html(`
    <section class="hero">
      <div class="hero-eyebrow">精选电子商务系统</div>
      <h1 class="hero-title">好物、分类、订单一站式管理</h1>
      <a class="btn btn-primary" href="#/products">浏览商品</a>
    </section>
    <section class="section container">
      <h2 class="section-title">首页广告</h2>
      <div class="grid grid-3">${ads.slice(0, 3).map(adCard).join('') || empty('暂无广告')}</div>
    </section>
    <section class="section container">
      <h2 class="section-title">商品分类</h2>
      <div class="grid grid-4">${cats.slice(0, 8).map(c => `<a class="card card-body" href="#/products?categoryId=${c.id}"><strong>${esc(c.name)}</strong><p class="muted">查看分类商品</p></a>`).join('')}</div>
    </section>
    <section class="section container">
      <h2 class="section-title">推荐商品</h2>
      <div class="grid grid-3">${products.slice(0, 6).map(productCard).join('')}</div>
    </section>
  `);
}

async function renderProducts() {
  categories = await api.get('/categories');
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const query = [];
  if (params.get('categoryId')) query.push(`categoryId=${params.get('categoryId')}`);
  if (params.get('keyword')) query.push(`keyword=${encodeURIComponent(params.get('keyword'))}`);
  const products = await api.get(`/products${query.length ? '?' + query.join('&') : ''}`);
  $('#app').html(`
    <section class="section container">
      <h1 class="section-title">商品列表</h1>
      <div class="toolbar">
        <select id="categoryFilter"><option value="">全部分类</option>${categories.map(c => `<option value="${c.id}" ${String(c.id) === params.get('categoryId') ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <input id="keywordFilter" placeholder="搜索商品" value="${esc(params.get('keyword') || '')}">
        <button class="btn btn-primary" id="searchBtn">搜索</button>
      </div>
      <div class="grid grid-3">${products.map(productCard).join('') || empty('暂无商品')}</div>
    </section>
  `);
  $('#searchBtn').on('click', () => {
    const q = new URLSearchParams();
    if ($('#categoryFilter').val()) q.set('categoryId', $('#categoryFilter').val());
    if ($('#keywordFilter').val()) q.set('keyword', $('#keywordFilter').val());
    location.hash = `#/products${q.toString() ? '?' + q.toString() : ''}`;
  });
}

async function renderProductDetail(id) {
  const p = await api.get(`/products/${id}`);
  const cover = firstMedia(p) || 'https://dummyimage.com/900x520/f5f5f7/86868b&text=Product';
  $('#app').html(`
    <section class="section container grid grid-2">
      <div class="card"><img class="product-img" style="height:520px" src="${esc(cover)}" alt=""></div>
      <div>
        <p class="muted">${esc(p.category_name || '')}</p>
        <h1>${esc(p.name)}</h1>
        <p class="muted">${esc(p.subtitle || '')}</p>
        <p class="price">￥${p.price}</p>
        <p>库存：${p.stock}　销量：${p.sales}</p>
        <button class="btn btn-primary" id="addCart">加入购物车</button>
      </div>
    </section>
    <section class="section container">
      <h2 class="section-title">商品资料</h2>
      <div class="grid grid-3">${(p.media || []).map(mediaCard).join('') || empty('暂无资料')}</div>
    </section>
    <section class="section container">
      <h2 class="section-title">规格参数</h2>
      <table class="table">${(p.infos2 || []).map(i => `<tr><th>${esc(i.spec_key)}</th><td>${esc(i.spec_value)}</td></tr>`).join('') || '<tr><td>暂无参数</td></tr>'}</table>
    </section>
  `);
  $('#addCart').on('click', async () => {
    await requireLogin(async () => {
      await api.post('/cart', { productId: p.id, quantity: 1 });
      await refreshCartBadge();
      alert('已加入购物车');
    });
  });
}

async function renderCart() {
  const rows = await api.get('/cart');
  $('#app').html(`
    <section class="section container">
      <h1 class="section-title">购物车</h1>
      <table class="table">
        <thead><tr><th>商品</th><th>价格</th><th>数量</th><th>操作</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${esc(r.product_name)}</td><td>￥${r.price}</td><td><input class="qty" data-id="${r.id}" value="${r.quantity}" style="width:80px"></td><td><button class="btn btn-danger remove" data-id="${r.id}">删除</button></td></tr>`).join('') || '<tr><td colspan="4">购物车为空</td></tr>'}</tbody>
      </table>
      <p><a class="btn btn-primary" href="#/checkout">去结算</a></p>
    </section>
  `);
  $('.qty').on('change', async function () { await api.put(`/cart/${$(this).data('id')}`, { quantity: Number($(this).val()) }); await refreshCartBadge(); });
  $('.remove').on('click', async function () { await api.del('/cart', { ids: [$(this).data('id')] }); await renderCart(); await refreshCartBadge(); });
}

async function renderCheckout() {
  $('#app').html(`
    <section class="section container">
      <h1 class="section-title">结算下单</h1>
      <form class="form card card-body" id="checkoutForm">
        <label>收货人<input name="receiverName" required value="张三"></label>
        <label>手机号<input name="receiverPhone" required value="13800000000"></label>
        <label>收货地址<input name="receiverAddress" required value="北京市朝阳区"></label>
        <button class="btn btn-primary">提交订单</button>
      </form>
    </section>
  `);
  $('#checkoutForm').on('submit', async e => {
    e.preventDefault();
    const order = await api.post('/orders/checkout', formData(e.target));
    await refreshCartBadge();
    location.hash = `#/orders/${order.id}`;
  });
}

async function renderOrders() {
  const orders = await api.get('/orders');
  $('#app').html(`<section class="section container"><h1 class="section-title">我的订单</h1>${orderTable(orders, false)}</section>`);
}

async function renderOrderDetail(id) {
  const o = await api.get(`/orders/${id}`);
  $('#app').html(`
    <section class="section container">
      <h1 class="section-title">订单 ${esc(o.order_no)}</h1>
      <div class="notice">状态：${statusText(o.status)}　金额：￥${o.total_amount}</div>
      <table class="table"><thead><tr><th>商品</th><th>价格</th><th>数量</th></tr></thead><tbody>${(o.items || []).map(i => `<tr><td>${esc(i.product_name)}</td><td>￥${i.price}</td><td>${i.quantity}</td></tr>`).join('')}</tbody></table>
      <p><button class="btn btn-primary" id="payBtn">模拟支付</button> <button class="btn btn-light" id="cancelBtn">取消订单</button></p>
    </section>
  `);
  $('#payBtn').on('click', async () => { await api.post(`/orders/${id}/pay`); await renderOrderDetail(id); });
  $('#cancelBtn').on('click', async () => { await api.post(`/orders/${id}/cancel`); await renderOrderDetail(id); });
}

async function renderAdmin() {
  const tab = (location.hash.split('/')[2] || 'products');
  $('#app').html(`
    <section class="section container layout">
      <aside class="side">
        <a href="#/admin/products">商品管理</a>
        <a href="#/admin/categories">分类管理</a>
        <a href="#/admin/ads">广告管理</a>
        <a href="#/admin/orders">订单管理</a>
        <a href="#/admin/users">用户管理</a>
      </aside>
      <div id="adminPanel"></div>
    </section>
  `);
  if (tab === 'categories') await adminCategories();
  else if (tab === 'ads') await adminAds();
  else if (tab === 'orders') await adminOrders();
  else if (tab === 'users') await adminUsers();
  else await adminProducts();
}

async function adminProducts() {
  categories = await api.get('/admin/categories');
  const filters = readAdminFilters(['id', 'name', 'stock', 'price', 'status']);
  const rows = await api.get('/admin/products' + queryString(filters));
  $('#adminPanel').html(`
    <h1>商品管理</h1>
    <form class="toolbar" id="productFilter">
      <input name="id" placeholder="商品ID" value="${esc(filters.id || '')}">
      <input name="name" placeholder="商品名称" value="${esc(filters.name || '')}">
      <input name="stock" placeholder="库存" value="${esc(filters.stock || '')}">
      <input name="price" placeholder="价格" value="${esc(filters.price || '')}">
      <select name="status"><option value="">全部状态</option><option value="1" ${filters.status === '1' ? 'selected' : ''}>上架</option><option value="0" ${filters.status === '0' ? 'selected' : ''}>下架</option></select>
      <button class="btn btn-primary">筛选</button>
      <button class="btn btn-light" type="button" id="clearProductFilter">清空</button>
    </form>
    <form class="form card card-body" id="productForm">${productFormFields()}</form>
    <table class="table"><thead><tr><th>ID</th><th>商品</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${p.price}</td><td>${p.stock}</td><td>${p.status}</td><td><button class="btn btn-light editProduct" data-row='${attr(p)}'>编辑</button> <button class="btn btn-light mediaProduct" data-id="${p.id}">资料</button> <button class="btn btn-light info1Product" data-id="${p.id}">图文</button> <button class="btn btn-light info2Product" data-id="${p.id}">参数</button> <button class="btn btn-light skuProduct" data-id="${p.id}">SKU</button> <button class="btn btn-danger delProduct" data-id="${p.id}">下架</button></td></tr>`).join('')}</tbody></table>
  `);
  $('#productFilter').on('submit', e => { e.preventDefault(); writeAdminFilters(formData(e.target)); adminProducts(); });
  $('#clearProductFilter').on('click', () => { writeAdminFilters({}); adminProducts(); });
  $('#productForm').on('submit', saveProduct);
  $('.editProduct').on('click', function () { fillForm('#productForm', $(this).data('row')); });
  $('.delProduct').on('click', async function () { await api.del(`/admin/products/${$(this).data('id')}`); await adminProducts(); });
  $('.mediaProduct').on('click', function () { mediaModal($(this).data('id')); });
  $('.info1Product').on('click', function () { info1Modal($(this).data('id')); });
  $('.info2Product').on('click', function () { info2Modal($(this).data('id')); });
  $('.skuProduct').on('click', function () { skuModal($(this).data('id')); });
}

function productFormFields() {
  return `
    <input type="hidden" name="id">
    <label>名称<input name="name" required></label>
    <label>副标题<input name="subtitle"></label>
    <label>分类<select name="categoryId">${categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
    <label>价格<input name="price" type="number" step="0.01" required></label>
    <label>库存<input name="stock" type="number" required></label>
    <label>状态<select name="status"><option value="1">上架</option><option value="0">下架</option></select></label>
    <button class="btn btn-primary">保存商品</button>`;
}

async function saveProduct(e) {
  e.preventDefault();
  const data = formData(e.target);
  data.categoryId = Number(data.categoryId);
  data.stock = Number(data.stock);
  data.status = Number(data.status);
  if (data.id) await api.put(`/admin/products/${data.id}`, data); else await api.post('/admin/products', data);
  await adminProducts();
}

async function mediaModal(productId) {
  const rows = await api.get(`/admin/products/${productId}/media`);
  openModal('商品资料', `
    <form class="form" id="mediaForm">
      <label>资料地址<input name="url" required placeholder="http://localhost:9000/mall-media/xxx.jpg"></label>
      <label>类型<select name="mediaType"><option>IMAGE</option><option>VIDEO</option></select></label>
      <label>排序<input name="sortOrder" type="number" value="0"></label>
      <button class="btn btn-primary">添加资料</button>
    </form>
    <table class="table"><tbody>${rows.map(r => `<tr><td>${esc(r.media_type)}</td><td>${esc(r.url)}</td><td><button class="btn btn-danger delMedia" data-id="${r.id}">删除</button></td></tr>`).join('')}</tbody></table>
  `);
  $('#mediaForm').on('submit', async e => { e.preventDefault(); const d = formData(e.target); d.sortOrder = Number(d.sortOrder); await api.post(`/admin/products/${productId}/media`, d); await mediaModal(productId); });
  $('.delMedia').on('click', async function () { await api.del(`/admin/products/${productId}/media/${$(this).data('id')}`); await mediaModal(productId); });
}

async function info1Modal(productId) {
  const rows = await api.get(`/admin/products/${productId}/info1`);
  openModal('商品子信息1：图文详情', `
    <form class="form" id="info1Form">
      <label>图片地址<input name="imageUrl" placeholder="http://localhost:9000/mall-media/detail.jpg"></label>
      <label>详情文本/HTML<textarea name="detailHtml" rows="4" placeholder="商品详情描述"></textarea></label>
      <label>排序<input name="sortOrder" type="number" value="0"></label>
      <button class="btn btn-primary">添加图文详情</button>
    </form>
    <table class="table"><thead><tr><th>图片</th><th>详情</th><th>排序</th><th>操作</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.image_url || '')}</td><td>${esc(r.detail_html || '')}</td><td>${r.sort_order}</td><td><button class="btn btn-danger delInfo1" data-id="${r.id}">删除</button></td></tr>`).join('') || '<tr><td colspan="4">暂无图文详情</td></tr>'}</tbody></table>
  `);
  $('#info1Form').on('submit', async e => { e.preventDefault(); const d = formData(e.target); d.sortOrder = Number(d.sortOrder); await api.post(`/admin/products/${productId}/info1`, d); await info1Modal(productId); });
  $('.delInfo1').on('click', async function () { await api.del(`/admin/products/${productId}/info1/${$(this).data('id')}`); await info1Modal(productId); });
}

async function info2Modal(productId) {
  const rows = await api.get(`/admin/products/${productId}/info2`);
  openModal('商品子信息2：规格参数', `
    <form class="form" id="info2Form">
      <label>参数名<input name="specKey" required placeholder="材质"></label>
      <label>参数值<input name="specValue" required placeholder="纯棉"></label>
      <label>排序<input name="sortOrder" type="number" value="0"></label>
      <button class="btn btn-primary">添加规格参数</button>
    </form>
    <table class="table"><thead><tr><th>参数名</th><th>参数值</th><th>排序</th><th>操作</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.spec_key)}</td><td>${esc(r.spec_value)}</td><td>${r.sort_order}</td><td><button class="btn btn-danger delInfo2" data-id="${r.id}">删除</button></td></tr>`).join('') || '<tr><td colspan="4">暂无规格参数</td></tr>'}</tbody></table>
  `);
  $('#info2Form').on('submit', async e => { e.preventDefault(); const d = formData(e.target); d.sortOrder = Number(d.sortOrder); await api.post(`/admin/products/${productId}/info2`, d); await info2Modal(productId); });
  $('.delInfo2').on('click', async function () { await api.del(`/admin/products/${productId}/info2/${$(this).data('id')}`); await info2Modal(productId); });
}

async function skuModal(productId) {
  const rows = await api.get(`/admin/products/${productId}/skus`);
  openModal('商品 SKU', `
    <form class="form" id="skuForm">
      <label>SKU 编码<input name="skuCode" required placeholder="SKU-001"></label>
      <label>规格描述<input name="specDesc" placeholder="颜色: 黑色; 尺码: L"></label>
      <label>价格<input name="price" type="number" step="0.01" required></label>
      <label>库存<input name="stock" type="number" value="0" required></label>
      <label>图片<input name="image" placeholder="http://localhost:9000/mall-media/sku.jpg"></label>
      <label>状态<select name="status"><option value="1">启用</option><option value="0">禁用</option></select></label>
      <button class="btn btn-primary">添加 SKU</button>
    </form>
    <table class="table"><thead><tr><th>编码</th><th>规格</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.sku_code)}</td><td>${esc(r.spec_desc || '')}</td><td>${r.price}</td><td>${r.stock}</td><td>${r.status}</td><td><button class="btn btn-danger delSku" data-id="${r.id}">删除</button></td></tr>`).join('') || '<tr><td colspan="6">暂无 SKU</td></tr>'}</tbody></table>
  `);
  $('#skuForm').on('submit', async e => { e.preventDefault(); const d = formData(e.target); d.price = Number(d.price); d.stock = Number(d.stock); d.status = Number(d.status); await api.post(`/admin/products/${productId}/skus`, d); await skuModal(productId); });
  $('.delSku').on('click', async function () { await api.del(`/admin/products/${productId}/skus/${$(this).data('id')}`); await skuModal(productId); });
}

async function adminCategories() {
  const filters = readAdminFilters(['name', 'parentId', 'status']);
  const rows = await api.get('/admin/categories' + queryString(filters));
  $('#adminPanel').html(`<h1>分类管理</h1><form class="toolbar" id="catFilter"><input name="name" placeholder="分类名称" value="${esc(filters.name || '')}"><input name="parentId" placeholder="父级ID" value="${esc(filters.parentId || '')}"><select name="status"><option value="">全部状态</option><option value="1" ${filters.status === '1' ? 'selected' : ''}>启用</option><option value="0" ${filters.status === '0' ? 'selected' : ''}>禁用</option></select><button class="btn btn-primary">筛选</button><button class="btn btn-light" type="button" id="clearCatFilter">清空</button></form><form class="form card card-body" id="catForm"><input type="hidden" name="id"><label>名称<input name="name" required></label><label>父级ID<input name="parentId" value="0"></label><label>状态<select name="status"><option value="1">启用</option><option value="0">禁用</option></select></label><button class="btn btn-primary">保存分类</button></form><table class="table"><thead><tr><th>ID</th><th>名称</th><th>父级ID</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(c => `<tr><td>${c.id}</td><td>${esc(c.name)}</td><td>${c.parent_id}</td><td>${c.status}</td><td><button class="btn btn-light editCat" data-row='${attr(c)}'>编辑</button> <button class="btn btn-danger delCat" data-id="${c.id}">禁用</button></td></tr>`).join('')}</tbody></table>`);
  $('#catFilter').on('submit', e => { e.preventDefault(); writeAdminFilters(formData(e.target)); adminCategories(); });
  $('#clearCatFilter').on('click', () => { writeAdminFilters({}); adminCategories(); });
  $('#catForm').on('submit', async e => { e.preventDefault(); const d = normalizeCamel(formData(e.target)); d.parentId = Number(d.parentId); d.sortOrder = 0; d.status = Number(d.status); if (d.id) await api.put(`/admin/categories/${d.id}`, d); else await api.post('/admin/categories', d); await adminCategories(); });
  $('.editCat').on('click', function () { fillForm('#catForm', normalizeCamel($(this).data('row'))); });
  $('.delCat').on('click', async function () { await api.del(`/admin/categories/${$(this).data('id')}`); await adminCategories(); });
}

async function adminAds() {
  const cats = await api.get('/admin/ads/categories');
  const filters = readAdminFilters(['title', 'categoryId', 'status']);
  const rows = await api.get('/admin/ads' + queryString(filters));
  $('#adminPanel').html(`<h1>广告管理</h1><form class="toolbar" id="adFilter"><input name="title" placeholder="广告标题" value="${esc(filters.title || '')}"><select name="categoryId"><option value="">全部广告分类</option>${cats.map(c => `<option value="${c.id}" ${String(c.id) === filters.categoryId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><select name="status"><option value="">全部状态</option><option value="1" ${filters.status === '1' ? 'selected' : ''}>启用</option><option value="0" ${filters.status === '0' ? 'selected' : ''}>禁用</option></select><button class="btn btn-primary">筛选</button><button class="btn btn-light" type="button" id="clearAdFilter">清空</button></form><form class="form card card-body" id="adForm"><input type="hidden" name="id"><label>标题<input name="title" required></label><label>广告分类<select name="categoryId">${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>图片地址<input name="imageUrl" required></label><label>链接<input name="linkUrl"></label><label>排序<input name="sortOrder" value="0"></label><label>状态<select name="status"><option value="1">启用</option><option value="0">禁用</option></select></label><button class="btn btn-primary">保存广告</button></form><table class="table"><thead><tr><th>ID</th><th>标题</th><th>广告分类</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(a => `<tr><td>${a.id}</td><td>${esc(a.title)}</td><td>${esc(a.category_name || '')}</td><td>${a.status}</td><td><button class="btn btn-light editAd" data-row='${attr(a)}'>编辑</button> <button class="btn btn-danger delAd" data-id="${a.id}">禁用</button></td></tr>`).join('')}</tbody></table>`);
  $('#adFilter').on('submit', e => { e.preventDefault(); writeAdminFilters(formData(e.target)); adminAds(); });
  $('#clearAdFilter').on('click', () => { writeAdminFilters({}); adminAds(); });
  $('#adForm').on('submit', async e => { e.preventDefault(); const d = normalizeCamel(formData(e.target)); d.categoryId = Number(d.categoryId); d.sortOrder = Number(d.sortOrder); d.status = Number(d.status); if (d.id) await api.put(`/admin/ads/${d.id}`, d); else await api.post('/admin/ads', d); await adminAds(); });
  $('.editAd').on('click', function () { fillForm('#adForm', normalizeCamel($(this).data('row'))); });
  $('.delAd').on('click', async function () { await api.del(`/admin/ads/${$(this).data('id')}`); await adminAds(); });
}

async function adminOrders() {
  const rows = await api.get('/admin/orders');
  $('#adminPanel').html(`<h1>订单管理</h1>${orderTable(rows, true)}`);
  $('.adminStatus').on('change', async function () { await api.put(`/admin/orders/${$(this).data('id')}/status`, { status: Number($(this).val()) }); });
}

async function adminUsers() {
  const filters = readAdminFilters(['id', 'username', 'role']);
  const rows = await api.get('/admin/users' + queryString(filters));
  $('#adminPanel').html(`<h1>用户管理</h1><form class="toolbar" id="userFilter"><input name="id" placeholder="用户ID" value="${esc(filters.id || '')}"><input name="username" placeholder="用户名" value="${esc(filters.username || '')}"><select name="role"><option value="">全部角色</option><option value="USER" ${filters.role === 'USER' ? 'selected' : ''}>普通用户</option><option value="ADMIN" ${filters.role === 'ADMIN' ? 'selected' : ''}>管理员</option></select><button class="btn btn-primary">筛选</button><button class="btn btn-light" type="button" id="clearUserFilter">清空</button></form><table class="table"><thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows.map(u => `<tr><td>${u.id}</td><td>${esc(u.username)}</td><td>${esc(u.role)}</td><td>${u.status}</td><td><button class="btn btn-light userStatus" data-id="${u.id}" data-status="${u.status == 1 ? 0 : 1}">${u.status == 1 ? '禁用' : '启用'}</button></td></tr>`).join('')}</tbody></table>`);
  $('#userFilter').on('submit', e => { e.preventDefault(); writeAdminFilters(formData(e.target)); adminUsers(); });
  $('#clearUserFilter').on('click', () => { writeAdminFilters({}); adminUsers(); });
  $('.userStatus').on('click', async function () { await api.put(`/admin/users/${$(this).data('id')}/status`, { status: Number($(this).data('status')) }); await adminUsers(); });
}

function loginModal() {
  openModal('登录', `<form class="form" id="loginForm"><label>用户名<input name="username" required></label><label>密码<input name="password" type="password" required></label><button class="btn btn-primary">登录</button><button class="btn btn-light" type="button" id="showRegister">注册</button><p class="notice hidden" id="loginError"></p></form>`);
  $('#loginForm').on('submit', async e => {
    e.preventDefault();
    $('#loginError').addClass('hidden').text('');
    try {
      currentUser = await api.post('/users/login', formData(e.target));
      closeModal();
      refreshSessionUi();
      if (currentUser.role === 'ADMIN') {
        location.hash = '#/admin/products';
      } else {
        await refreshCartBadge();
        location.hash = '#/';
      }
      route();
    } catch (error) {
      $('#loginError').removeClass('hidden').text(error.responseJSON?.message || error.message || '不存在此用户或者密码错误');
    }
  });
  $('#showRegister').on('click', registerModal);
}

function registerModal() {
  openModal('用户注册', `<form class="form" id="registerForm"><label>用户名<input name="username" required></label><label>密码<input name="password" type="password" required></label><label>手机号<input name="phone"></label><label>邮箱<input name="email" type="email" required></label><button class="btn btn-light" type="button" id="sendRegisterCode">发送邮箱验证码</button><p class="muted" id="sendCodeTip">验证码会发送到上面填写的邮箱。</p><label>验证码<input name="code" required></label><button class="btn btn-primary">注册</button></form>`);
  $('#sendRegisterCode').on('click', async () => {
    const email = $('#registerForm input[name="email"]').val();
    if (!email) { alert('请先填写邮箱'); return; }
    try {
      await api.post('/users/send-code', { email });
      $('#sendCodeTip').text('验证码已发送，请查看邮箱，5 分钟内有效。');
    } catch (error) {
      $('#sendCodeTip').text(error.responseJSON?.message || error.message || '验证码发送失败，请检查邮箱配置');
    }
  });
  $('#registerForm').on('submit', async e => {
    e.preventDefault();
    try {
      await api.post('/users/register', formData(e.target));
      alert('注册成功，请登录');
      loginModal();
    } catch (error) {
      alert(error.responseJSON?.message || error.message || '注册失败');
    }
  });
}

async function requireLogin(fn) {
  if (!currentUser) {
    loginModal();
    throw new Error('请先登录');
  }
  return fn();
}


async function requireCustomer(fn) {
  await requireLogin(async () => {});
  if (currentUser.role !== 'USER') {
    alert('普通用户功能，请退出后台后使用用户账号登录');
    location.hash = '#/admin/products';
    return;
  }
  return fn();
}
async function requireAdmin(fn) {
  await requireLogin(async () => {});
  if (currentUser.role !== 'ADMIN') {
    alert('需要管理员权限');
    location.hash = '#/';
    return;
  }
  return fn();
}

async function refreshCartBadge() {
  if (!currentUser) { $('#cartBadge').text(0); return; }
  try { $('#cartBadge').text((await api.get('/cart')).length); } catch { $('#cartBadge').text(0); }
}

function productCard(p) {
  return `<a class="card" href="#/products/${p.id}"><img class="product-img" src="${esc(p.cover || 'https://dummyimage.com/600x360/f5f5f7/86868b&text=Product')}"><div class="card-body"><h3 class="product-title">${esc(p.name)}</h3><p class="muted">${esc(p.subtitle || '')}</p><p class="price">￥${p.price}</p></div></a>`;
}

function mediaCard(media) {
  const type = String(media.media_type || '').toUpperCase();
  if (type === 'VIDEO') {
    return `<div class="card"><video class="product-img" src="${esc(media.url)}" controls preload="metadata"></video><div class="card-body">视频资料</div></div>`;
  }
  return `<div class="card"><img class="product-img" src="${esc(media.url)}" alt=""><div class="card-body">图片资料</div></div>`;
}

function adCard(a) {
  const target = a.category_id ? `#/products?categoryId=${a.category_id}` : normalizeAdLink(a.link_url);
  return `<a class="card" href="${esc(target)}"><img class="ad-img" src="${esc(a.image_url)}"><div class="card-body"><strong>${esc(a.title)}</strong></div></a>`;
}

function normalizeAdLink(link) {
  if (!link) return '#/products';
  if (link.startsWith('#/')) return link;
  if (link.startsWith('/products')) return `#${link}`;
  return link;
}

function orderTable(rows, admin) {
  return `<table class="table"><thead><tr><th>订单号</th><th>用户</th><th>金额</th><th>状态</th><th>收货信息</th><th>操作</th></tr></thead><tbody>${rows.map(o => `<tr><td>${esc(o.order_no)}</td><td>${esc(o.username || '')}</td><td>￥${o.total_amount}</td><td>${admin ? `<select class="adminStatus" data-id="${o.id}">${[0,1,2,3,4].map(s => `<option value="${s}" ${o.status == s ? 'selected' : ''}>${statusText(s)}</option>`).join('')}</select>` : statusText(o.status)}</td><td>${esc(o.receiver_name)} ${esc(o.receiver_phone)}<br>${esc(o.receiver_address)}</td><td><a class="btn btn-light" href="#/orders/${o.id}">详情</a></td></tr>`).join('') || '<tr><td colspan="6">暂无订单</td></tr>'}</tbody></table>`;
}

function statusText(status) {
  return ['待支付', '已支付', '已发货', '已完成', '已取消'][Number(status)] || '未知';
}

function firstMedia(p) {
  const image = (p.media || []).find(item => String(item.media_type || '').toUpperCase() !== 'VIDEO');
  return image ? image.url : p.cover;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function readAdminFilters(keys) {
  const raw = sessionStorage.getItem(`filters:${location.hash}`) || '{}';
  const saved = JSON.parse(raw);
  const filters = {};
  keys.forEach(key => {
    if (saved[key] !== undefined && saved[key] !== null && String(saved[key]).trim() !== '') {
      filters[key] = String(saved[key]).trim();
    }
  });
  return filters;
}

function writeAdminFilters(values) {
  const filters = {};
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      filters[key] = String(value).trim();
    }
  });
  sessionStorage.setItem(`filters:${location.hash}`, JSON.stringify(filters));
}

function queryString(values) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query.set(key, String(value).trim());
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function normalizeCamel(row) {
  const copy = { ...row };
  if ('category_id' in copy) copy.categoryId = copy.category_id;
  if ('image_url' in copy) copy.imageUrl = copy.image_url;
  if ('link_url' in copy) copy.linkUrl = copy.link_url;
  if ('sort_order' in copy) copy.sortOrder = copy.sort_order;
  if ('parent_id' in copy) copy.parentId = copy.parent_id;
  return copy;
}

function fillForm(selector, row) {
  Object.entries(row).forEach(([key, value]) => $(`${selector} [name="${key}"]`).val(value));
}

function openModal(title, body) {
  $('#modalTitle').text(title);
  $('#modalBody').html(body);
  $('#modal').removeClass('hidden');
}

function closeModal() {
  $('#modal').addClass('hidden');
}

function showError(error) {
  if (String(error.message || error).includes('请先登录')) return;
  $('#app').html(`<section class="section container"><div class="notice">加载失败：${esc(error.responseJSON?.message || error.message || error)}</div></section>`);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function attr(row) {
  return esc(JSON.stringify(normalizeCamel(row)));
}

function empty(text) {
  return `<div class="notice">${text}</div>`;
}


