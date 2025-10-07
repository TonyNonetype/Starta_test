let metricsData = null;

async function loadMetrics() {
    try {
        const res = await fetch('/api/metrics.php');
        if (!res.ok) throw new Error('Ошибка загрузки данных');
        
        const data = await res.json();
        metricsData = data;
        
        renderTable(data.categories);
        document.getElementById('inStockPercent').textContent = data.inStockPercent;
        drawBarChart(data.categories);
        drawLineChart(data.categories);
        
        document.getElementById('download').onclick = () => downloadJSON(data);
        document.getElementById('refresh').onclick = () => {
            document.getElementById('refresh').textContent = 'Обновление...';
            loadMetrics().finally(() => {
                document.getElementById('refresh').textContent = 'Обновить данные';
            });
        };
    } catch (error) {
        console.error('Ошибка загрузки метрик:', error);
        showError('Не удалось загрузить данные отчётов');
    }
}

function renderTable(cats) {
    const tbody = document.querySelector('#metricsTable tbody');
    tbody.innerHTML = '';
    
    for (let cat in cats) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="table__category">${cat}</td>
            <td class="table__count">${cats[cat].count}</td>
            <td class="table__median">${cats[cat].median.toLocaleString()} ₽</td>
            <td class="table__average">${cats[cat].average.toLocaleString()} ₽</td>
        `;
        tbody.appendChild(row);
    }
}

function showError(message) {
    const container = document.querySelector('.reports');
    container.innerHTML = `
        <div class="reports__error">
            <div class="error__icon">⚠️</div>
            <div class="error__message">${message}</div>
        </div>
    `;
}

function drawBarChart(cats) {
    const canvas = document.getElementById('barChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const labels = Object.keys(cats);
    const values = labels.map(c => cats[c].count);
    const maxVal = Math.max(...values);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const barWidth = chartWidth / labels.length * 0.8;
    const barSpacing = chartWidth / labels.length;
    
    ctx.fillStyle = '#007bff';
    labels.forEach((label, i) => {
        const barHeight = (values[i] / maxVal) * chartHeight;
        const x = padding + i * barSpacing + (barSpacing - barWidth) / 2;
        const y = padding + chartHeight - barHeight;
        
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(values[i].toString(), x + barWidth / 2, y - 5);

        ctx.fillText(label, x + barWidth / 2, canvas.height - 10);
    });
}

function drawLineChart(cats) {
    const canvas = document.getElementById('lineChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const labels = Object.keys(cats);
    const medians = labels.map(c => cats[c].median);
    const averages = labels.map(c => cats[c].average);
    const maxVal = Math.max(...[...medians, ...averages]);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const pointSpacing = chartWidth / (labels.length - 1);
    
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 3;
    medians.forEach((v, i) => {
        const x = padding + i * pointSpacing;
        const y = padding + chartHeight - (v / maxVal * chartHeight);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    ctx.beginPath();
    ctx.strokeStyle = '#dc3545';
    ctx.lineWidth = 3;
    averages.forEach((v, i) => {
        const x = padding + i * pointSpacing;
        const y = padding + chartHeight - (v / maxVal * chartHeight);
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    ctx.fillStyle = '#007bff';
    medians.forEach((v, i) => {
        const x = padding + i * pointSpacing;
        const y = padding + chartHeight - (v / maxVal * chartHeight);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    ctx.fillStyle = '#dc3545';
    averages.forEach((v, i) => {
        const x = padding + i * pointSpacing;
        const y = padding + chartHeight - (v / maxVal * chartHeight);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
        const x = padding + i * pointSpacing;
        ctx.fillText(label, x, canvas.height - 10);
    });
    
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#007bff';
    ctx.fillText('Медианная цена', 20, 30);
    ctx.fillStyle = '#dc3545';
    ctx.fillText('Средняя цена', 20, 50);
}

function downloadJSON(data) {
    const pretty = JSON.stringify(data, null, 2);
    const blob = new Blob([pretty], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.json';
    a.click();
}

document.addEventListener('DOMContentLoaded', loadMetrics);