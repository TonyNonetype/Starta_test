let products = [];
let compareList = JSON.parse(localStorage.getItem('compare')) || [];

const PER_PAGE = 12;

async function loadProducts() {
    const res = await fetch('/data/products.json');
    products = await res.json();
    restoreState();
}

function restoreState() {
    const params = new URLSearchParams(location.search);
    populateCategories();
    document.getElementById('search').value = params.get('q') || '';
    document.getElementById('category').value = params.get('cat') || '';
    document.getElementById('minPrice').value = params.get('min') || '';
    document.getElementById('maxPrice').value = params.get('max') || '';
    document.getElementById('inStock').checked = params.get('inStock') === '1';
    document.getElementById('sort').value = params.get('sort') || 'price_asc';
    const page = parseInt(params.get('page')) || 1;
    render(page);
}

function updateURL(page) {
    const params = new URLSearchParams({
        q: document.getElementById('search').value,
        cat: document.getElementById('category').value,
        min: document.getElementById('minPrice').value,
        max: document.getElementById('maxPrice').value,
        inStock: document.getElementById('inStock').checked ? '1' : '',
        sort: document.getElementById('sort').value,
        page
    });
    history.pushState(null, '', `?${params.toString()}`);
}

function filterProducts() {
    let filtered = products;
    const q = document.getElementById('search').value.toLowerCase();
    if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    const cat = document.getElementById('category').value;
    if (cat) filtered = filtered.filter(p => p.category === cat);
    const min = parseFloat(document.getElementById('minPrice').value);
    if (min) filtered = filtered.filter(p => p.price >= min);
    const max = parseFloat(document.getElementById('maxPrice').value);
    if (max) filtered = filtered.filter(p => p.price <= max);
    if (document.getElementById('inStock').checked) filtered = filtered.filter(p => p.stock > 0);
    return filtered;
}

function sortProducts(list) {
    const sort = document.getElementById('sort').value;
    if (sort === 'price_asc') return list.sort((a,b) => a.price - b.price);
    if (sort === 'price_desc') return list.sort((a,b) => b.price - a.price);
    if (sort === 'rating_desc') return list.sort((a,b) => b.rating - a.rating);
    if (sort === 'created_at_desc') return list.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
}

function getBadges(product, medians) {
    const badges = [];
    const now = new Date();
    const created = new Date(product.created_at);
    if ((now - created) / (1000 * 3600 * 24) <= 30) badges.push('Новинка');
    if (product.rating >= 4.7 && product.reviews_count >= 50) badges.push('Топ-рейтинг');
    const median = medians[product.category];
    if (median && product.price <= median * 0.85) badges.push('Выгодно');
    if (product.stock <= 3 && product.stock > 0) badges.push('Последний');
    return badges.slice(0, 2);
}

function calculateMedians() {
    const cats = {};
    products.forEach(p => {
        if (!cats[p.category]) cats[p.category] = [];
        cats[p.category].push(p.price);
    });
    for (let cat in cats) {
        cats[cat].sort((a,b) => a-b);
        const n = cats[cat].length;
        cats[cat] = n % 2 ? cats[cat][Math.floor(n/2)] : (cats[cat][n/2 - 1] + cats[cat][n/2]) / 2;
    }
    return cats;
}

function buildCardHTML(p, medians) {
    const badges = getBadges(p, medians).map(badge => {
        let cls = 'badge';
        if (badge === 'Новинка') cls += ' badge--new';
        else if (badge === 'Топ-рейтинг') cls += ' badge--top';
        else if (badge === 'Выгодно') cls += ' badge--sale';
        else if (badge === 'Последний') cls += ' badge--last';
        return `<span class="${cls}">${badge}</span>`;
    }).join('');
    const stars = '★'.repeat(Math.floor(p.rating)) + '☆'.repeat(5 - Math.floor(p.rating));
    const stockClass = p.stock > 0 ? 'in-stock' : 'out-of-stock';
    const stockText = p.stock > 0 ? `В наличии (${p.stock} шт.)` : 'Нет в наличии';
    return `
        <div class="card">
            <img src="${p.image}" alt="${p.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuKdpO+4jzwvdGV4dD48L3N2Zz4='">
            <h3>${p.name}</h3>
            <div class="card__price">${p.price.toLocaleString()} ₽</div>
            <div class="card__rating">
                <span class="stars">${stars}</span>
                <span>${p.rating}</span>
            </div>
            <div class="card__stock ${stockClass}">${stockText}</div>
            <div class="card__badges">${badges}</div>
            <div class="card__compare">
                <input type="checkbox" id="compare-${p.id}" ${compareList.includes(p.id) ? 'checked' : ''} data-id="${p.id}">
                <label for="compare-${p.id}">Сравнить</label>
            </div>
        </div>
    `;
}

function renderPagination(pages, page) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    if (pages <= 1) return;
    if (page > 1) {
        const prev = document.createElement('button');
        prev.textContent = '←';
        prev.onclick = () => { updateURL(page - 1); render(page - 1); };
        pagination.appendChild(prev);
    }
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.onclick = () => { updateURL(i); render(i); };
        if (i === page) btn.disabled = true;
        pagination.appendChild(btn);
    }
    if (page < pages) {
        const next = document.createElement('button');
        next.textContent = '→';
        next.onclick = () => { updateURL(page + 1); render(page + 1); };
        pagination.appendChild(next);
    }
}

function render(page = 1) {
    const medians = calculateMedians();
    let filtered = filterProducts();
    filtered = sortProducts(filtered);
    const total = filtered.length;
    const pages = Math.ceil(total / PER_PAGE);
    const start = (page - 1) * PER_PAGE;
    const slice = filtered.slice(start, start + PER_PAGE);

    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    
    if (slice.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #6c757d;">
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
            </div>
        `;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    slice.forEach(p => {
        grid.insertAdjacentHTML('beforeend', buildCardHTML(p, medians));
    });

    renderPagination(pages, page);

    renderComparison();
}

function populateCategories() {
    const select = document.getElementById('category');
    if (select.options.length > 1) return;
    const cats = [...new Set(products.map(p => p.category))];
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

function renderComparison() {
    const block = document.getElementById('comparison');
    const countElement = document.getElementById('compareCount');
    
    if (!compareList.length) {
        block.style.display = 'none';
        return;
    }
    
    block.style.display = 'block';
    countElement.textContent = compareList.length;
    
    const tbody = block.querySelector('tbody');
    tbody.innerHTML = '';
    
    compareList.forEach(id => {
        const p = products.find(p => p.id === id);
        if (!p) return;
        
        const row = document.createElement('tr');
        const stars = '★'.repeat(Math.floor(p.rating)) + '☆'.repeat(5 - Math.floor(p.rating));
        const stockClass = p.stock > 0 ? 'in-stock' : 'out-of-stock';
        const stockText = p.stock > 0 ? `В наличии (${p.stock} шт.)` : 'Нет в наличии';
        
        row.innerHTML = `
            <td class="comparison__product-name">${p.name}</td>
            <td class="comparison__price">${p.price.toLocaleString()} ₽</td>
            <td class="comparison__rating">
                <span class="stars">${stars}</span>
                <span>${p.rating}</span>
            </td>
            <td class="comparison__stock ${stockClass}">${stockText}</td>
            <td class="comparison__category">${p.category}</td>
        `;
        tbody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', loadProducts);

window.addEventListener('popstate', () => {
    restoreState();
});

const debounce = (fn, ms) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
};

const inputs = ['search', 'minPrice', 'maxPrice', 'category', 'sort', 'inStock'];
inputs.forEach(id => {
    const el = document.getElementById(id);
    const handler = debounce(() => { updateURL(1); render(1); }, id === 'search' ? 300 : 0);
    el.addEventListener(id === 'search' ? 'input' : 'change', handler);
});

document.getElementById('grid').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const id = parseInt(e.target.dataset.id);
    if (e.target.checked) {
        if (compareList.length < 4) compareList.push(id);
    } else {
        compareList = compareList.filter(i => i !== id);
    }
    localStorage.setItem('compare', JSON.stringify(compareList));
    renderComparison();
});

document.getElementById('clearCompare').addEventListener('click', () => {
    compareList = [];
    localStorage.removeItem('compare');
    renderComparison();
    render(new URLSearchParams(location.search).get('page') || 1);
});