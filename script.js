// Основное приложение
const app = {
    data: {
        campaigns: [],
        currentUser: null
    },

    // Тестовые пользователи
    users: [
        { login: 'admin', password: 'admin123', role: 'admin', name: 'Администратор' },
        { login: 'analyst', password: 'analyst123', role: 'user', name: 'Аналитик' }
    ],

    init() {
        // Загрузка данных из localStorage
        const stored = localStorage.getItem('wb_promo_data');
        if (stored) {
            this.data.campaigns = JSON.parse(stored);
        }

        // Инициализация обработчиков
        this.setupEventListeners();

        // Показать экран авторизации
        this.showAuthScreen();
    },

    showAuthScreen() {
        // Скрыть все секции
        document.querySelectorAll('.role-screen, .view-section, .auth-screen').forEach(el => {
            el.classList.remove('active');
        });
        document.getElementById('auth-screen').classList.add('active');
    },

    authenticate(login, password) {
        const user = this.users.find(u => u.login === login && u.password === password);
        if (user) {
            this.data.currentUser = user;
            return true;
        }
        return false;
    },


    setRole(role) {
        // Скрыть все секции
        document.querySelectorAll('.role-screen, .view-section').forEach(el => {
            el.classList.remove('active');
        });

        if (role === 'selection') {
            document.getElementById('role-selection').classList.add('active');
        } else if (role === 'admin') {
            document.getElementById('admin-view').classList.add('active');
            this.renderAdminTable();
            this.updateCampaignSelect();
        } else if (role === 'user') {
            document.getElementById('user-view').classList.add('active');
            this.renderUserTable();
            this.calculateSummary();
        }
    },

    setupEventListeners() {
        // Форма добавления кампании
        document.getElementById('campaign-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCampaign();
        });

        // Drag & Drop для файлов
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('excel-input');

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
                this.handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
    },

    addCampaign() {
        const url = document.getElementById('camp-url').value;
        const type = document.getElementById('camp-type').value;
        const period = document.getElementById('camp-period').value;
        const cost = parseFloat(document.getElementById('camp-cost').value);
        const impressions = parseInt(document.getElementById('camp-impressions').value);
        const ctr = parseFloat(document.getElementById('camp-ctr').value);
        const orders = parseInt(document.getElementById('camp-orders').value);
        const drr = parseFloat(document.getElementById('camp-drr').value);

        // Извлечение названия из URL (последняя часть после /)
        let name = 'Кампания';
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(p => p);
            if (pathParts.length > 0) {
                name = decodeURIComponent(pathParts[pathParts.length - 1]);
            }
        } catch (e) {
            name = 'Кампания ' + (this.data.campaigns.length + 1);
        }

        const campaign = {
            id: Date.now(),
            name,
            url,
            type,
            period,
            cost,
            impressions,
            ctr,
            orders,
            drr,
            hasDetailData: false,
            detailData: null
        };

        this.data.campaigns.push(campaign);
        this.saveData();
        
        // Очистка формы
        document.getElementById('campaign-form').reset();
        alert('Кампания успешно добавлена!');
        
        this.renderAdminTable();
        this.updateCampaignSelect();
    },

    handleFile(file) {
        const campaignId = document.getElementById('file-campaign-select').value;
        const statusEl = document.getElementById('upload-status');

        if (!campaignId) {
            statusEl.textContent = '❌ Сначала выберите кампанию!';
            statusEl.className = 'status-msg error';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // Конвертация в JSON с заголовками
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Обработка данных
                const processedData = this.processExcelData(jsonData);
                
                // Сохранение в кампанию
                const campaign = this.data.campaigns.find(c => c.id == campaignId);
                if (campaign) {
                    campaign.hasDetailData = true;
                    campaign.detailData = processedData;
                    this.saveData();
                    
                    statusEl.textContent = `✅ Файл загружен! Обработано строк: ${processedData.length}`;
                    statusEl.className = 'status-msg success';
                    
                    this.renderAdminTable();
                }
            } catch (error) {
                console.error(error);
                statusEl.textContent = '❌ Ошибка при чтении файла: ' + error.message;
                statusEl.className = 'status-msg error';
            }
        };
        reader.readAsArrayBuffer(file);
    },

    processExcelData(rawData) {
        if (rawData.length < 2) return [];

        // Получаем заголовки (первая строка)
        const headers = rawData[0].map(h => String(h).trim());
        
        // Находим индексы нужных колонок
        const idx = {
            type: headers.findIndex(h => h.toLowerCase().includes('тип конверсии')),
            cost: headers.findIndex(h => h.toLowerCase().includes('затраты'))
        };

        // Обрабатываем строки данных (пропускаем первую - заголовки, и последнюю - итоги)
        const processed = [];
        
        for (let i = 1; i < rawData.length - 1; i++) {
            const row = rawData[i];
            
            // Пропускаем пустые строки
            if (!row || row.length === 0) continue;

            // Проверка на "Всего по кампании" в любой ячейке
            const rowText = row.join(' ').toLowerCase();
            if (rowText.includes('всего по кампании') || rowText.includes('итого')) {
                continue;
            }

            // Фильтр: Тип конверсии != "Мультикарточка"
            if (idx.type !== -1 && row[idx.type]) {
                const typeVal = String(row[idx.type]).toLowerCase();
                if (typeVal.includes('мультикарточка')) {
                    continue;
                }
            }

            // Фильтр: Затраты != 0
            if (idx.cost !== -1 && row[idx.cost]) {
                const costVal = parseFloat(row[idx.cost]);
                if (costVal === 0 || isNaN(costVal)) {
                    continue;
                }
            }

            // Создаем объект строки
            const rowObj = {};
            headers.forEach((h, index) => {
                rowObj[h] = row[index];
            });
            
            processed.push(rowObj);
        }

        return processed;
    },

    deleteCampaign(id) {
        if (confirm('Вы уверены, что хотите удалить эту кампанию?')) {
            this.data.campaigns = this.data.campaigns.filter(c => c.id !== id);
            this.saveData();
            this.renderAdminTable();
            this.updateCampaignSelect();
        }
    },

    updateCampaignSelect() {
        const select = document.getElementById('file-campaign-select');
        select.innerHTML = '<option value="">-- Выберите кампанию --</option>';
        
        this.data.campaigns.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = `${c.name} (${c.period})`;
            select.appendChild(option);
        });
    },

    renderAdminTable() {
        const tbody = document.getElementById('admin-campaigns-body');
        tbody.innerHTML = '';

        if (this.data.campaigns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Список пуст</td></tr>';
            return;
        }

        this.data.campaigns.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><a href="${c.url}" target="_blank" style="color: var(--primary-color);">${c.name}</a></td>
                <td>${c.type}</td>
                <td>${c.period}</td>
                <td>${c.cost.toLocaleString()} ₽</td>
                <td>${c.hasDetailData ? '✅ Да' : '❌ Нет'}</td>
                <td>
                    <button class="btn-danger" onclick="app.deleteCampaign(${c.id})">Удалить</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderUserTable() {
        const tbody = document.getElementById('user-campaigns-body');
        tbody.innerHTML = '';

        if (this.data.campaigns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Нет данных</td></tr>';
            return;
        }

        this.data.campaigns.forEach(c => {
            // Основная строка
            const mainRow = document.createElement('tr');
            mainRow.innerHTML = `
                <td>
                    <button class="expand-btn" onclick="app.toggleDetail(${c.id})">▶</button>
                </td>
                <td><a href="${c.url}" target="_blank" style="color: var(--primary-color); text-decoration: none;">${c.name}</a></td>
                <td>${c.type}</td>
                <td>${c.period}</td>
                <td>${c.cost.toLocaleString()}</td>
                <td>${c.impressions.toLocaleString()}</td>
                <td>${c.ctr}%</td>
                <td>${c.orders}</td>
                <td>${c.drr}%</td>
            `;
            tbody.appendChild(mainRow);

            // Строка с деталями
            const detailRow = document.createElement('tr');
            detailRow.className = 'detail-row';
            detailRow.id = `detail-${c.id}`;
            
            let detailContent = '<td colspan="9"><div class="detail-content">';
            
            if (c.hasDetailData && c.detailData && c.detailData.length > 0) {
                const headers = Object.keys(c.detailData[0]);
                
                detailContent += '<h4 style="margin-bottom: 10px;">📊 Детальная статистика</h4>';
                detailContent += '<table class="detail-table"><thead><tr>';
                headers.forEach(h => {
                    detailContent += `<th>${h}</th>`;
                });
                detailContent += '</tr></thead><tbody>';
                
                c.detailData.forEach(row => {
                    detailContent += '<tr>';
                    headers.forEach(h => {
                        let val = row[h];
                        if (typeof val === 'number') {
                            val = val.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
                        }
                        detailContent += `<td>${val || '-'}</td>`;
                    });
                    detailContent += '</tr>';
                });
                
                detailContent += '</tbody></table>';
            } else {
                detailContent += '<p style="color: var(--text-muted);">Детальные данные не загружены</p>';
            }
            
            detailContent += '</div></td>';
            detailRow.innerHTML = detailContent;
            tbody.appendChild(detailRow);
        });
    },

    toggleDetail(id) {
        const detailRow = document.getElementById(`detail-${id}`);
        const btn = detailRow.previousElementSibling.querySelector('.expand-btn');
        
        if (detailRow.classList.contains('active')) {
            detailRow.classList.remove('active');
            btn.classList.remove('rotated');
            btn.textContent = '▶';
        } else {
            detailRow.classList.add('active');
            btn.classList.add('rotated');
            btn.textContent = '▼';
        }
    },

    calculateSummary() {
        const totalCost = this.data.campaigns.reduce((sum, c) => sum + c.cost, 0);
        const totalImpressions = this.data.campaigns.reduce((sum, c) => sum + c.impressions, 0);
        const totalOrders = this.data.campaigns.reduce((sum, c) => sum + c.orders, 0);
        
        const avgCtr = this.data.campaigns.length > 0 
            ? (this.data.campaigns.reduce((sum, c) => sum + c.ctr, 0) / this.data.campaigns.length).toFixed(2)
            : 0;

        const container = document.getElementById('summary-stats');
        container.innerHTML = `
            <div class="stat-card">
                <h3>Общие затраты</h3>
                <div class="value">${totalCost.toLocaleString('ru-RU')} ₽</div>
            </div>
            <div class="stat-card">
                <h3>Показы</h3>
                <div class="value">${totalImpressions.toLocaleString('ru-RU')}</div>
            </div>
            <div class="stat-card">
                <h3>Заказы</h3>
                <div class="value">${totalOrders.toLocaleString('ru-RU')}</div>
            </div>
            <div class="stat-card">
                <h3>Средний CTR</h3>
                <div class="value">${avgCtr}%</div>
            </div>
        `;
    },

    saveData() {
        localStorage.setItem('wb_promo_data', JSON.stringify(this.data.campaigns));
    }
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
