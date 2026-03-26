// Глобальное состояние
let campaigns = [];
let currentCampaignId = null;
let selectedFile = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initWeekFilter();
    renderCampaigns();
    updateStats();
});

// Работа с localStorage
function saveData() {
    localStorage.setItem('wb_campaigns', JSON.stringify(campaigns));
}

function loadData() {
    const data = localStorage.getItem('wb_campaigns');
    if (data) {
        campaigns = JSON.parse(data);
    }
}

// Модальные окна
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    if (modalId === 'campaignModal') {
        // Установка периода по умолчанию (текущая неделя ПН-ВС)
        const week = getCurrentWeek();
        document.getElementById('periodStart').value = week.start;
        document.getElementById('periodEnd').value = week.end;
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    resetForms();
}

function resetForms() {
    document.getElementById('campaignForm').reset();
    selectedFile = null;
    currentCampaignId = null;
}

// Извлечение названия из URL
function extractCampaignName(url) {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        
        // Пробуем разные возможные параметры
        const name = params.get('name') || 
                     params.get('campaignName') || 
                     params.get('title') ||
                     urlObj.pathname.split('/').filter(Boolean).pop() ||
                     'Кампания #' + (campaigns.length + 1);
        
        return decodeURIComponent(name.replace(/[-_]/g, ' '));
    } catch (e) {
        return 'Кампания #' + (campaigns.length + 1);
    }
}

// Сохранение кампании
function saveCampaign(event) {
    event.preventDefault();
    
    const url = document.getElementById('campaignUrl').value;
    const name = extractCampaignName(url);
    
    const campaign = {
        id: Date.now(),
        name: name,
        url: url,
        type: document.getElementById('campaignType').value,
        cost: parseFloat(document.getElementById('campaignCost').value),
        impressions: parseInt(document.getElementById('campaignImpressions').value),
        ctr: parseFloat(document.getElementById('campaignCTR').value),
        orders: parseInt(document.getElementById('campaignOrders').value),
        share: parseFloat(document.getElementById('campaignShare').value),
        period: {
            start: document.getElementById('periodStart').value,
            end: document.getElementById('periodEnd').value
        },
        files: [],
        createdAt: new Date().toISOString()
    };
    
    campaigns.push(campaign);
    saveData();
    renderCampaigns();
    updateStats();
    closeModal('campaignModal');
    
    alert('Кампания успешно добавлена!');
}

// Рендеринг кампаний
function renderCampaigns() {
    const container = document.getElementById('campaignsList');
    const filterStart = document.getElementById('filterStart').value;
    const filterEnd = document.getElementById('filterEnd').value;
    
    let filtered = campaigns;
    
    if (filterStart && filterEnd) {
        filtered = campaigns.filter(c => {
            return c.period.start >= filterStart && c.period.end <= filterEnd;
        });
    }
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Нет кампаний для отображения</p>';
        return;
    }
    
    container.innerHTML = filtered.map(campaign => `
        <div class="campaign-card">
            <div class="campaign-header">
                <a href="${campaign.url}" target="_blank" class="campaign-title">${campaign.name}</a>
                <span class="campaign-type ${campaign.type === 'CPM' ? 'cpm' : ''}">${campaign.type}</span>
            </div>
            <div class="campaign-stats">
                <div class="campaign-stat">
                    <div class="campaign-stat-label">Затраты</div>
                    <div class="campaign-stat-value">${campaign.cost.toLocaleString()} ₽</div>
                </div>
                <div class="campaign-stat">
                    <div class="campaign-stat-label">Показы</div>
                    <div class="campaign-stat-value">${campaign.impressions.toLocaleString()}</div>
                </div>
                <div class="campaign-stat">
                    <div class="campaign-stat-label">CTR</div>
                    <div class="campaign-stat-value">${campaign.ctr}%</div>
                </div>
                <div class="campaign-stat">
                    <div class="campaign-stat-label">Заказы</div>
                    <div class="campaign-stat-value">${campaign.orders}</div>
                </div>
            </div>
            <div class="campaign-period">
                📅 ${formatDate(campaign.period.start)} — ${formatDate(campaign.period.end)}
            </div>
            <div class="campaign-actions">
                <button class="btn btn-primary" onclick="openDetailModal(${campaign.id})">📊 Статистика</button>
                <button class="btn btn-danger" onclick="deleteCampaign(${campaign.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

// Обновление сводной статистики
function updateStats() {
    const filterStart = document.getElementById('filterStart').value;
    const filterEnd = document.getElementById('filterEnd').value;
    
    let filtered = campaigns;
    
    if (filterStart && filterEnd) {
        filtered = campaigns.filter(c => {
            return c.period.start >= filterStart && c.period.end <= filterEnd;
        });
    }
    
    const totalCost = filtered.reduce((sum, c) => sum + c.cost, 0);
    const totalImpressions = filtered.reduce((sum, c) => sum + c.impressions, 0);
    const totalOrders = filtered.reduce((sum, c) => sum + c.orders, 0);
    const avgCTR = filtered.length > 0 
        ? (filtered.reduce((sum, c) => sum + c.ctr, 0) / filtered.length).toFixed(2)
        : 0;
    
    document.getElementById('totalCost').textContent = totalCost.toLocaleString() + ' ₽';
    document.getElementById('totalImpressions').textContent = totalImpressions.toLocaleString();
    document.getElementById('avgCTR').textContent = avgCTR + '%';
    document.getElementById('totalOrders').textContent = totalOrders.toLocaleString();
}

// Удаление кампании
function deleteCampaign(id) {
    if (confirm('Вы уверены, что хотите удалить эту кампанию?')) {
        campaigns = campaigns.filter(c => c.id !== id);
        saveData();
        renderCampaigns();
        updateStats();
    }
}

// Открытие детальной статистики
function openDetailModal(campaignId) {
    currentCampaignId = campaignId;
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (!campaign) return;
    
    document.getElementById('detailTitle').textContent = campaign.name;
    document.getElementById('campaignInfo').innerHTML = `
        <p><strong>URL:</strong> <a href="${campaign.url}" target="_blank">${campaign.url}</a></p>
        <p><strong>Тип:</strong> ${campaign.type}</p>
        <p><strong>Период:</strong> ${formatDate(campaign.period.start)} — ${formatDate(campaign.period.end)}</p>
        <p><strong>Затраты:</strong> ${campaign.cost.toLocaleString()} ₽</p>
        <p><strong>Показы:</strong> ${campaign.impressions.toLocaleString()}</p>
        <p><strong>CTR:</strong> ${campaign.ctr}%</p>
        <p><strong>Заказы:</strong> ${campaign.orders}</p>
        <p><strong>Доля затрат:</strong> ${campaign.share}%</p>
    `;
    
    // Установка периода для файла по умолчанию
    document.getElementById('filePeriodStart').value = campaign.period.start;
    document.getElementById('filePeriodEnd').value = campaign.period.end;
    
    renderFilesList(campaign);
    renderExtendedStats(campaign);
    
    openModal('detailModal');
}

// Загрузка файлов
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        selectedFile = files[0];
        updateDropZoneText();
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        selectedFile = e.target.files[0];
        updateDropZoneText();
    }
});

function updateDropZoneText() {
    if (selectedFile) {
        dropZone.querySelector('p').textContent = `Выбран файл: ${selectedFile.name}`;
    }
}

function uploadFile() {
    if (!selectedFile) {
        alert('Пожалуйста, выберите файл');
        return;
    }
    
    const periodStart = document.getElementById('filePeriodStart').value;
    const periodEnd = document.getElementById('filePeriodEnd').value;
    
    if (!periodStart || !periodEnd) {
        alert('Пожалуйста, укажите период для файла');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        let jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Удаляем последнюю строку (итоговую), если она есть
        if (jsonData.length > 0) {
            // Проверяем, является ли последняя строка итоговой
            // Обычно в итоговой строке первое поле содержит "Итого" или аналогичное значение
            const lastRow = jsonData[jsonData.length - 1];
            const firstValue = Object.values(lastRow)[0];
            
            // Если первая ячейка последней строки содержит "Итого", "Total" или пустая - удаляем её
            if (firstValue && typeof firstValue === 'string' && 
                (firstValue.toLowerCase().includes('итого') || 
                 firstValue.toLowerCase().includes('total') ||
                 firstValue.trim() === '')) {
                jsonData.pop();
            } else {
                // В любом случае удаляем последнюю строку, так как это требование
                jsonData.pop();
            }
        }
        
        const campaign = campaigns.find(c => c.id === currentCampaignId);
        if (campaign) {
            campaign.files.push({
                id: Date.now(),
                name: selectedFile.name,
                period: { start: periodStart, end: periodEnd },
                data: jsonData,
                uploadedAt: new Date().toISOString()
            });
            
            saveData();
            renderFilesList(campaign);
            renderExtendedStats(campaign);
            
            alert('Файл успешно загружен!');
            selectedFile = null;
            fileInput.value = '';
            updateDropZoneText();
        }
    };
    reader.readAsArrayBuffer(selectedFile);
}

// Рендеринг списка файлов
function renderFilesList(campaign) {
    const container = document.getElementById('uploadedFiles');
    
    if (!campaign.files || campaign.files.length === 0) {
        container.innerHTML = '<p style="color: #666;">Файлы не загружены</p>';
        return;
    }
    
    container.innerHTML = campaign.files.map(file => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-name">📄 ${file.name}</div>
                <div class="file-period">${formatDate(file.period.start)} — ${formatDate(file.period.end)}</div>
            </div>
            <div class="file-actions">
                <button class="btn btn-secondary" onclick="viewFileData(${file.id})">Просмотр</button>
                <button class="btn btn-danger" onclick="deleteFile(${file.id})">Удалить</button>
            </div>
        </div>
    `).join('');
}

// Просмотр данных файла
function viewFileData(fileId) {
    const campaign = campaigns.find(c => c.id === currentCampaignId);
    const file = campaign.files.find(f => f.id === fileId);
    
    if (file && file.data) {
        alert(`Файл: ${file.name}\nЗаписей: ${file.data.length}\n\nПервые 3 строки:\n${JSON.stringify(file.data.slice(0, 3), null, 2)}`);
    }
}

// Удаление файла
function deleteFile(fileId) {
    if (confirm('Удалить этот файл?')) {
        const campaign = campaigns.find(c => c.id === currentCampaignId);
        campaign.files = campaign.files.filter(f => f.id !== fileId);
        saveData();
        renderFilesList(campaign);
        renderExtendedStats(campaign);
    }
}

// Рендеринг расширенной статистики
function renderExtendedStats(campaign) {
    const container = document.getElementById('statsTable');
    
    if (!campaign.files || campaign.files.length === 0) {
        container.innerHTML = '<p style="color: #666;">Нет данных для отображения</p>';
        return;
    }
    
    // Агрегируем данные из всех файлов
    let allData = [];
    campaign.files.forEach(file => {
        if (file.data && Array.isArray(file.data)) {
            allData = allData.concat(file.data);
        }
    });
    
    if (allData.length === 0) {
        container.innerHTML = '<p style="color: #666;">Данные в файлах не найдены</p>';
        return;
    }
    
    // Создаём таблицу с первыми 100 строками
    const keys = Object.keys(allData[0]);
    let html = '<table class="stats-table"><thead><tr>';
    keys.forEach(key => {
        html += `<th>${key}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    allData.slice(0, 100).forEach(row => {
        html += '<tr>';
        keys.forEach(key => {
            html += `<td>${row[key] !== undefined ? row[key] : '-'}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    if (allData.length > 100) {
        html += `<p style="color: #666; margin-top: 10px;">Показано 100 из ${allData.length} записей</p>`;
    }
    
    container.innerHTML = html;
}

// Фильтр по неделям
function initWeekFilter() {
    const week = getCurrentWeek();
    document.getElementById('filterStart').value = week.start;
    document.getElementById('filterEnd').value = week.end;
    updatePeriodDisplay(week.start, week.end);
}

function navigateWeek(offset) {
    const currentStart = new Date(document.getElementById('filterStart').value || new Date());
    const monday = getMonday(currentStart);
    monday.setDate(monday.getDate() + (offset * 7));
    
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    const startStr = formatDateForInput(monday);
    const endStr = formatDateForInput(sunday);
    
    document.getElementById('filterStart').value = startStr;
    document.getElementById('filterEnd').value = endStr;
    
    updatePeriodDisplay(startStr, endStr);
    applyDateFilter();
}

function applyDateFilter() {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    
    if (start && end) {
        updatePeriodDisplay(start, end);
    }
    
    renderCampaigns();
    updateStats();
}

function updatePeriodDisplay(start, end) {
    document.getElementById('currentPeriod').textContent = `${formatDate(start)} — ${formatDate(end)}`;
}

// Вспомогательные функции для дат
function getCurrentWeek() {
    const now = new Date();
    const monday = getMonday(now);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    return {
        start: formatDateForInput(monday),
        end: formatDateForInput(sunday)
    };
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Закрытие модальных окон по клику вне
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        resetForms();
    }
}
