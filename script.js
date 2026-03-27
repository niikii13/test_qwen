// Глобальные переменные
let supabase = null;
let currentUser = null;
let userProfile = null;

// --- 1. Инициализация и Конфигурация ---

window.addEventListener('DOMContentLoaded', () => {
    const savedUrl = localStorage.getItem('sb_url');
    const savedKey = localStorage.getItem('sb_key');

    if (savedUrl && savedKey) {
        initSupabase(savedUrl, savedKey);
        checkSession();
    } else {
        showSetupScreen();
    }
});

function initSupabase(url, key) {
    // Проверка наличия библиотеки (если подключена через CDN)
    if (typeof supabase !== 'undefined') {
        supabase = supabase.createClient(url, key);
    } else {
        // Fallback если скрипт не загрузился (редкий случай)
        console.error("Supabase JS library not loaded");
        alert("Ошибка загрузки библиотеки. Проверьте интернет.");
    }
}

function saveSupabaseConfig() {
    const url = document.getElementById('sb-url').value.trim();
    const key = document.getElementById('sb-key').value.trim();

    if (!url || !key) {
        alert("Заполните оба поля!");
        return;
    }

    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb-key', key);
    
    initSupabase(url, key);
    document.getElementById('setup-screen').classList.add('hidden-section');
    checkSession();
}

function showSetupScreen() {
    document.getElementById('setup-screen').classList.remove('hidden-section');
    document.getElementById('auth-screen').classList.add('hidden-section');
    document.getElementById('app-screen').classList.add('hidden-section');
}

function toggleSetupScreen() {
    const screen = document.getElementById('setup-screen');
    if (screen.classList.contains('hidden-section')) {
        screen.classList.remove('hidden-section');
        // Заполняем текущими значениями
        document.getElementById('sb-url').value = localStorage.getItem('sb_url');
        document.getElementById('sb-key').value = localStorage.getItem('sb-key');
    } else {
        screen.classList.add('hidden-section');
    }
}

// --- 2. Аутентификация ---

async function checkSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await fetchUserProfile();
    } else {
        showAuthScreen();
    }
}

function showAuthScreen() {
    document.getElementById('setup-screen').classList.add('hidden-section');
    document.getElementById('auth-screen').classList.remove('hidden-section');
    document.getElementById('app-screen').classList.add('hidden-section');
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    } else {
        currentUser = data.user;
        errorEl.classList.add('hidden');
        await fetchUserProfile();
    }
}

async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    } else {
        alert("Регистрация успешна! Проверьте почту для подтверждения входа.\nПо умолчанию вам присвоена роль 'observer'.");
        errorEl.classList.add('hidden');
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    currentUser = null;
    userProfile = null;
    showAuthScreen();
}

async function fetchUserProfile() {
    if (!currentUser) return;

    // Пытаемся получить профиль
    let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (error || !profile) {
        // Если профиля нет, создаем его с ролью observer
        const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: currentUser.id, email: currentUser.email, role: 'observer' }])
            .select()
            .single();
        
        if (insertError) {
            console.error("Ошибка создания профиля:", insertError);
            alert("Ошибка доступа к профилю.");
            handleLogout();
            return;
        }
        profile = newProfile;
    }

    userProfile = profile;
    setupInterfaceByRole();
}

// --- 3. Управление интерфейсом по ролям ---

function setupInterfaceByRole() {
    document.getElementById('auth-screen').classList.add('hidden-section');
    document.getElementById('app-screen').classList.remove('hidden-section');
    
    const role = userProfile.role;
    const badge = document.getElementById('user-role-badge');
    const navCampaigns = document.getElementById('nav-campaigns');
    const navUpload = document.getElementById('nav-upload');
    const adminBtn = document.getElementById('admin-settings-btn');

    // Отображение роли
    const roleNames = { 'admin': 'Администратор', 'marketer': 'Маркетолог', 'observer': 'Наблюдатель' };
    badge.textContent = roleNames[role] || role;
    
    // Стили бейджа
    badge.className = `ml-3 px-2 py-1 text-xs font-semibold rounded ${
        role === 'admin' ? 'bg-red-100 text-red-800' : 
        role === 'marketer' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'
    }`;

    // Логика видимости меню
    if (role === 'admin' || role === 'marketer') {
        navCampaigns.classList.remove('hidden');
        navUpload.classList.remove('hidden');
        switchTab('campaigns'); // По умолчанию переходим к работе
    } else {
        navCampaigns.classList.add('hidden');
        navUpload.classList.add('hidden');
        switchTab('dashboard'); // Только дашборд
    }

    // Кнопка настроек только для админа
    if (role === 'admin') {
        adminBtn.classList.remove('hidden');
    } else {
        adminBtn.classList.add('hidden');
    }

    loadData();
}

function switchTab(tabName) {
    // Скрыть все табы
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-section'));
    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('border-blue-500', 'text-blue-600');
        el.classList.add('border-transparent', 'text-gray-500');
    });

    // Показать нужный
    document.getElementById(`tab-${tabName}`).classList.remove('hidden-section');
    
    // Подсветка кнопки (упрощенно)
    const btn = document.querySelector(`button[onclick="switchTab('${tabName}')"]`);
    if(btn) {
        btn.classList.remove('border-transparent', 'text-gray-500');
        btn.classList.add('border-blue-500', 'text-blue-600');
    }
}

// --- 4. Работа с данными (Кампании) ---

async function loadData() {
    if (!supabase) return;
    
    // Загрузка кампаний
    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Ошибка загрузки:", error);
        return;
    }

    renderDashboard(campaigns);
    renderCampaignsTable(campaigns);
}

function renderDashboard(campaigns) {
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const budget = campaigns.reduce((sum, c) => sum + (parseFloat(c.budget) || 0), 0);

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-budget').textContent = budget.toLocaleString('ru-RU') + ' ₽';

    const tbody = document.getElementById('dashboard-table-body');
    tbody.innerHTML = campaigns.slice(0, 5).map(c => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${c.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.type}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(c.status)}">
                    ${c.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.start_date || '-'}</td>
        </tr>
    `).join('');
}

function renderCampaignsTable(campaigns) {
    const tbody = document.getElementById('campaigns-table-body');
    if (!campaigns || campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">Нет данных</td></tr>';
        return;
    }
    tbody.innerHTML = campaigns.map(c => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${c.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.type}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(c.status)}">
                    ${c.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${c.start_date || '-'} ${c.end_date ? '— ' + c.end_date : ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="deleteCampaign('${c.id}')" class="text-red-600 hover:text-red-900">Удалить</button>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'draft') return 'bg-gray-100 text-gray-800';
    if (status === 'stopped') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
}

// Создание кампании
async function createCampaign(e) {
    e.preventDefault();
    const name = document.getElementById('camp-name').value;
    const type = document.getElementById('camp-type').value;
    const status = document.getElementById('camp-status').value;
    const start = document.getElementById('camp-start').value;
    const budget = document.getElementById('camp-budget').value;

    const { error } = await supabase.from('campaigns').insert([{
        name, type, status, start_date: start, budget: budget || 0,
        created_by: currentUser.id
    }]);

    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        closeModal();
        document.getElementById('new-campaign-form').reset();
        loadData();
    }
}

async function deleteCampaign(id) {
    if(!confirm("Удалить эту кампанию?")) return;
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) alert("Ошибка удаления");
    else loadData();
}

// Модалка
function openModal() { document.getElementById('campaign-modal').classList.remove('hidden-section'); }
function closeModal() { document.getElementById('campaign-modal').classList.add('hidden-section'); }

// --- 5. Загрузка Excel ---

function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        await uploadExcelData(jsonData);
    };
    reader.readAsArrayBuffer(file);
}

async function uploadExcelData(rows) {
    const statusDiv = document.getElementById('upload-status');
    statusDiv.textContent = `Обработано строк: ${rows.length}. Загрузка...`;
    statusDiv.className = "mt-4 text-sm font-medium text-blue-600";

    // Предполагаем, что в Excel колонки называются: Name, Type, Status, StartDate, Budget
    // Маппинг полей может потребовать адаптации под ваш реальный файл
    const formattedData = rows.map(row => ({
        name: row.Name || row.name || "Без названия",
        type: row.Type || row.type || "search",
        status: row.Status || row.status || "draft",
        start_date: row.StartDate || row.start_date || new Date().toISOString().split('T')[0],
        budget: row.Budget || row.budget || 0,
        created_by: currentUser.id
    }));

    const { error } = await supabase.from('campaigns').insert(formattedData);

    if (error) {
        statusDiv.textContent = `Ошибка: ${error.message}`;
        statusDiv.className = "mt-4 text-sm font-medium text-red-600";
    } else {
        statusDiv.textContent = `Успешно загружено ${formattedData.length} записей!`;
        statusDiv.className = "mt-4 text-sm font-medium text-green-600";
        loadData();
    }
}