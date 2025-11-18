// Админ панель - Мастерская Вдохновения v8.0
class AdminPanel {
    constructor() {
        this.currentAdmin = null;
        this.currentTab = 'dashboard';
        this.data = {
            users: [],
            roles: [],
            characters: [],
            quizzes: [],
            marathons: [],
            shopItems: [],
            posts: [],
            interactives: [],
            admins: [],
            stats: {},
            moderation: {
                works: [],
                reviews: []
            },
            settings: []
        };
        
        this.init();
    }

    init() {
        this.getUserIdFromURL();
        this.setupEventListeners();
        this.loadAdminInfo();
        this.loadAllData();
    }

    getUserIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (!userId) {
            this.showError('User ID не найден в URL. Добавьте ?userId=YOUR_USER_ID к адресу');
            return;
        }
        
        this.currentAdmin = { user_id: parseInt(userId) };
        console.log('Admin ID:', this.currentAdmin.user_id);
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.showTab(tab);
            });
        });

        // Поиск пользователей
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.filterUsers(e.target.value);
            });
        }

        // Фильтры
        const roleFilter = document.getElementById('roleFilter');
        const levelFilter = document.getElementById('levelFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (roleFilter) {
            roleFilter.addEventListener('change', () => this.filterUsers());
        }
        if (levelFilter) {
            levelFilter.addEventListener('change', () => this.filterUsers());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.filterUsers());
        }

        // Вкладки модерации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.showModerationTab(tab);
            });
        });
    }

    async loadAdminInfo() {
        try {
            const response = await fetch(`/api/users/${this.currentAdmin.user_id}`);
            const data = await response.json();
            
            if (data.user) {
                document.getElementById('adminName').textContent = data.user.tg_first_name || 'Администратор';
                document.getElementById('adminId').textContent = this.currentAdmin.user_id;
                
                // Проверяем права админа
                const adminResponse = await fetch(`/api/admin/stats?userId=${this.currentAdmin.user_id}`);
                if (adminResponse.ok) {
                    document.getElementById('adminRole').textContent = 'Супер администратор';
                } else {
                    document.getElementById('adminRole').textContent = 'Модератор';
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки информации админа:', error);
        }
    }

    async loadAllData() {
        try {
            await Promise.all([
                this.loadStats(),
                this.loadUsers(),
                this.loadRoles(),
                this.loadCharacters(),
                this.loadQuizzes(),
                this.loadMarathons(),
                this.loadShopItems(),
                this.loadPosts(),
                this.loadInteractives(),
                this.loadAdmins(),
                this.loadModerationData(),
                this.loadSettings()
            ]);
            
            this.showMessage('Данные успешно загружены!', 'success');
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showError('Ошибка загрузки данных: ' + error.message);
        }
    }

    async loadStats() {
        try {
            const response = await fetch(`/api/admin/stats?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к статистике');
            
            const data = await response.json();
            this.data.stats = data;
            this.updateStatsDisplay(data);
            
            // Загружаем детальную статистику для дашборда
            if (this.currentTab === 'dashboard') {
                await this.loadDetailedStats();
            }
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    updateStatsDisplay(stats) {
        const statsGrid = document.getElementById('dashboardStats');
        if (!statsGrid) return;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-number">${stats.totalUsers}</div>
                <div class="stat-label">Всего пользователей</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-number">${stats.registeredUsers}</div>
                <div class="stat-label">Зарегистрировано</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🎯</div>
                <div class="stat-number">${stats.activeQuizzes}</div>
                <div class="stat-label">Активных квизов</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🏃‍♂️</div>
                <div class="stat-number">${stats.activeMarathons}</div>
                <div class="stat-label">Активных марафонов</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🛒</div>
                <div class="stat-number">${stats.shopItems}</div>
                <div class="stat-label">Товаров в магазине</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✨</div>
                <div class="stat-number">${stats.totalSparks.toFixed(0)}</div>
                <div class="stat-label">Всего искр</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-number">${stats.totalActivities}</div>
                <div class="stat-label">Всего активностей</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚖️</div>
                <div class="stat-number">${stats.pendingReviews + stats.pendingWorks}</div>
                <div class="stat-label">На модерации</div>
            </div>
        `;
    }

    async loadDetailedStats() {
        try {
            const response = await fetch(`/api/admin/full-stats?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) return;
            
            const data = await response.json();
            this.updateDetailedStats(data);
            this.createCharts(data);
        } catch (error) {
            console.error('Ошибка загрузки детальной статистики:', error);
        }
    }

    updateDetailedStats(stats) {
        const container = document.getElementById('detailedStats');
        if (!container) return;

        container.innerHTML = `
            <div class="grid-2">
                <div class="chart-container">
                    <h3>📈 Активность пользователей</h3>
                    <p>Активных сегодня: ${stats.users.active_today}</p>
                    <p>Активных за неделю: ${stats.users.active_week}</p>
                    <p>Новых сегодня: ${stats.users.new_today}</p>
                </div>
                <div class="chart-container">
                    <h3>💰 Финансы</h3>
                    <p>Всего заработано искр: ${stats.activities.earned_sparks}</p>
                    <p>Всего потрачено искр: ${stats.activities.spent_sparks}</p>
                    <p>Общий доход: ${stats.revenue.total}✨</p>
                </div>
            </div>
            <div class="chart-container mt-3">
                <h3>📊 Распределение по ролям</h3>
                <div class="grid-4">
                    ${stats.users.by_role.map(role => `
                        <div>
                            <strong>${role.role}</strong>
                            <div class="text-muted">${role.count} пользователей</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    createCharts(stats) {
        // Chart для активности
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            new Chart(activityCtx, {
                type: 'line',
                data: {
                    labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
                    datasets: [{
                        label: 'Активность пользователей',
                        data: [65, 59, 80, 81, 56, 55, 40],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            });
        }

        // Chart для распределения по ролям
        const rolesCtx = document.getElementById('rolesChart');
        if (rolesCtx) {
            new Chart(rolesCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.users.by_role.map(r => r.role),
                    datasets: [{
                        data: stats.users.by_role.map(r => r.count),
                        backgroundColor: [
                            '#667eea', '#4ECDC4', '#45B7D1', '#96CEB4', 
                            '#FECA57', '#FF9FF3', '#FF6B6B'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        }
    }

    async loadUsers() {
        try {
            const response = await fetch(`/api/admin/users-report?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к пользователям');
            
            const data = await response.json();
            this.data.users = data.users;
            this.updateUsersDisplay();
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
        }
    }

    updateUsersDisplay() {
        const container = document.getElementById('usersList');
        if (!container) return;

        if (this.data.users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>Пользователи не найдены</h3>
                    <p>В системе пока нет зарегистрированных пользователей.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя</th>
                            <th>Роль</th>
                            <th>Уровень</th>
                            <th>Искры</th>
                            <th>Активность</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.data.users.forEach(user => {
            const lastActive = new Date(user.last_active);
            const now = new Date();
            const daysAgo = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
            const isActive = daysAgo <= 7;
            
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td>
                        <strong>${user.name}</strong>
                        ${user.username ? `<br><small class="text-muted">@${user.username}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge badge-info">${user.role || 'Не указана'}</span>
                    </td>
                    <td>
                        <span class="badge badge-secondary">${user.level}</span>
                    </td>
                    <td>
                        <strong>${user.sparks.toFixed(1)}</strong> ✨
                    </td>
                    <td>
                        <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">
                            ${isActive ? 'Активен' : `Неактивен ${daysAgo}д`}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="adminPanel.viewUserDetails(${user.id})">
                                👁️ Просмотр
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="adminPanel.editUser(${user.id})">
                                ✏️ Редактировать
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    filterUsers(searchTerm = '') {
        const roleFilter = document.getElementById('roleFilter').value;
        const levelFilter = document.getElementById('levelFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        let filteredUsers = this.data.users;

        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (roleFilter) {
            filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }

        if (levelFilter) {
            filteredUsers = filteredUsers.filter(user => user.level === levelFilter);
        }

        if (statusFilter === 'active') {
            filteredUsers = filteredUsers.filter(user => {
                const lastActive = new Date(user.last_active);
                const now = new Date();
                const daysAgo = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
                return daysAgo <= 7;
            });
        } else if (statusFilter === 'inactive') {
            filteredUsers = filteredUsers.filter(user => {
                const lastActive = new Date(user.last_active);
                const now = new Date();
                const daysAgo = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
                return daysAgo > 7;
            });
        }

        this.updateFilteredUsersDisplay(filteredUsers);
    }

    updateFilteredUsersDisplay(users) {
        const container = document.getElementById('usersList');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>Пользователи не найдены</h3>
                    <p>Попробуйте изменить параметры поиска или фильтры.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя</th>
                            <th>Роль</th>
                            <th>Уровень</th>
                            <th>Искры</th>
                            <th>Активность</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        users.forEach(user => {
            const lastActive = new Date(user.last_active);
            const now = new Date();
            const daysAgo = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
            const isActive = daysAgo <= 7;
            
            html += `
                <tr>
                    <td>${user.id}</td>
                    <td>
                        <strong>${user.name}</strong>
                        ${user.username ? `<br><small class="text-muted">@${user.username}</small>` : ''}
                    </td>
                    <td>
                        <span class="badge badge-info">${user.role || 'Не указана'}</span>
                    </td>
                    <td>
                        <span class="badge badge-secondary">${user.level}</span>
                    </td>
                    <td>
                        <strong>${user.sparks.toFixed(1)}</strong> ✨
                    </td>
                    <td>
                        <span class="badge ${isActive ? 'badge-success' : 'badge-warning'}">
                            ${isActive ? 'Активен' : `Неактивен ${daysAgo}д`}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="adminPanel.viewUserDetails(${user.id})">
                                👁️ Просмотр
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="adminPanel.editUser(${user.id})">
                                ✏️ Редактировать
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    viewUserDetails(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return;

        const detailsHtml = `
            <div class="content-card">
                <div class="card-header">
                    <h2 class="card-title">👤 Детали пользователя</h2>
                </div>
                <div class="grid-2">
                    <div>
                        <h3>Основная информация</h3>
                        <p><strong>ID:</strong> ${user.id}</p>
                        <p><strong>Имя:</strong> ${user.name}</p>
                        <p><strong>Username:</strong> ${user.username || 'Не указан'}</p>
                        <p><strong>Роль:</strong> ${user.role}</p>
                        <p><strong>Уровень:</strong> ${user.level}</p>
                        <p><strong>Искры:</strong> ${user.sparks.toFixed(1)}</p>
                    </div>
                    <div>
                        <h3>Статистика</h3>
                        <p><strong>Квизов пройдено:</strong> ${user.total_quizzes}</p>
                        <p><strong>Марафонов завершено:</strong> ${user.total_marathons}</p>
                        <p><strong>Работ загружено:</strong> ${user.total_works}</p>
                        <p><strong>Одобрено работ:</strong> ${user.approved_works}</p>
                        <p><strong>Покупок совершено:</strong> ${user.total_purchases}</p>
                        <p><strong>Потрачено искр:</strong> ${user.total_spent}</p>
                    </div>
                </div>
                <div class="mt-3">
                    <h3>Активность</h3>
                    <p><strong>Зарегистрирован:</strong> ${new Date(user.registration_date).toLocaleDateString()}</p>
                    <p><strong>Последняя активность:</strong> ${new Date(user.last_active).toLocaleDateString()}</p>
                    <p><strong>Всего активностей:</strong> ${user.total_activities}</p>
                </div>
            </div>
        `;

        // Создаем модальное окно для просмотра деталей
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">Детали пользователя: ${user.name}</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${detailsHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    editUser(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return;

        this.showMessage('Функционал редактирования пользователей в разработке', 'info');
    }

    async loadRoles() {
        try {
            const response = await fetch(`/api/admin/roles?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к ролям');
            
            const data = await response.json();
            this.data.roles = data;
            this.updateRolesDisplay();
            
            // Обновляем фильтр ролей
            this.updateRoleFilter();
        } catch (error) {
            console.error('Ошибка загрузки ролей:', error);
        }
    }

    updateRolesDisplay() {
        const container = document.getElementById('rolesList');
        if (!container) return;

        if (this.data.roles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎭</div>
                    <h3>Роли не найдены</h3>
                    <p>Создайте первую роль для пользователей.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.roles.forEach(role => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">
                                <span style="font-size: 24px; margin-right: 8px;">${role.icon}</span>
                                ${role.name}
                            </div>
                            <div class="item-description">${role.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${role.is_active ? 'badge-success' : 'badge-danger'}">
                                ${role.is_active ? 'Активна' : 'Неактивна'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${role.users_count || 0} пользователей</span>
                        <span class="badge badge-secondary" style="background-color: ${role.color}; color: white;">
                            ${role.color}
                        </span>
                    </div>
                    <div class="item-footer">
                        <div>
                            <small class="text-muted">
                                Создана: ${new Date(role.created_at).toLocaleDateString()}
                            </small>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editRole(${role.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteRole(${role.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateRoleFilter() {
        const roleFilter = document.getElementById('roleFilter');
        if (!roleFilter) return;

        let html = '<option value="">Все роли</option>';
        this.data.roles.forEach(role => {
            html += `<option value="${role.name}">${role.name}</option>`;
        });

        roleFilter.innerHTML = html;
    }

    showRoleForm(roleId = null) {
        const modal = document.getElementById('roleModal');
        const title = document.getElementById('roleModalTitle');
        const form = document.getElementById('roleForm');
        
        if (roleId) {
            // Редактирование существующей роли
            const role = this.data.roles.find(r => r.id === roleId);
            if (!role) return;
            
            title.textContent = 'Редактирование роли';
            document.getElementById('roleId').value = role.id;
            document.getElementById('roleName').value = role.name;
            document.getElementById('roleDescription').value = role.description;
            document.getElementById('roleIcon').value = role.icon;
            document.getElementById('roleColor').value = role.color;
            document.getElementById('roleRequirements').value = role.requirements || '';
            document.getElementById('roleActive').checked = role.is_active;
            
            // Заполняем чекбоксы доступных кнопок
            this.updateRoleButtons(role.available_buttons);
        } else {
            // Создание новой роли
            title.textContent = 'Добавление новой роли';
            form.reset();
            document.getElementById('roleId').value = '';
            document.getElementById('roleActive').checked = true;
            this.updateRoleButtons(['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role']);
        }
        
        modal.classList.add('active');
    }

    updateRoleButtons(selectedButtons = []) {
        const buttonsContainer = document.getElementById('roleButtons');
        const availableButtons = [
            { id: 'quiz', title: 'Квизы', description: 'Доступ к прохождению квизов' },
            { id: 'marathon', title: 'Марафоны', description: 'Доступ к участию в марафонах' },
            { id: 'works', title: 'Работы', description: 'Доступ к загрузке работ' },
            { id: 'activities', title: 'Активности', description: 'Доступ к просмотру истории активностей' },
            { id: 'posts', title: 'Посты', description: 'Доступ к просмотру постов канала' },
            { id: 'shop', title: 'Магазин', description: 'Доступ к магазину товаров' },
            { id: 'invite', title: 'Приглашения', description: 'Доступ к системе приглашений' },
            { id: 'interactives', title: 'Интерактивы', description: 'Доступ к интерактивным заданиям' },
            { id: 'change_role', title: 'Смена роли', description: 'Возможность сменить роль' }
        ];

        let html = '';
        availableButtons.forEach(button => {
            const isChecked = selectedButtons.includes(button.id);
            html += `
                <div class="checkbox-item">
                    <input type="checkbox" id="button_${button.id}" value="${button.id}" ${isChecked ? 'checked' : ''}>
                    <div class="checkbox-label">
                        <div class="checkbox-title">${button.title}</div>
                        <div class="checkbox-description">${button.description}</div>
                    </div>
                </div>
            `;
        });

        buttonsContainer.innerHTML = html;
    }

    closeRoleModal() {
        document.getElementById('roleModal').classList.remove('active');
    }

    async saveRole() {
        const form = document.getElementById('roleForm');
        const formData = new FormData(form);
        
        const roleData = {
            name: document.getElementById('roleName').value,
            description: document.getElementById('roleDescription').value,
            icon: document.getElementById('roleIcon').value,
            color: document.getElementById('roleColor').value,
            requirements: document.getElementById('roleRequirements').value,
            is_active: document.getElementById('roleActive').checked,
            available_buttons: []
        };

        // Собираем выбранные кнопки
        const checkboxes = document.querySelectorAll('#roleButtons input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            roleData.available_buttons.push(checkbox.value);
        });

        const roleId = document.getElementById('roleId').value;
        const url = roleId ? `/api/admin/roles/${roleId}?userId=${this.currentAdmin.user_id}` : `/api/admin/roles?userId=${this.currentAdmin.user_id}`;
        const method = roleId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeRoleModal();
                this.loadRoles();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения роли:', error);
            this.showError('Ошибка сохранения роли: ' + error.message);
        }
    }

    editRole(roleId) {
        this.showRoleForm(roleId);
    }

    async deleteRole(roleId) {
        if (!confirm('Вы уверены, что хотите удалить эту роль?')) return;

        try {
            const response = await fetch(`/api/admin/roles/${roleId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadRoles();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления роли:', error);
            this.showError('Ошибка удаления роли: ' + error.message);
        }
    }

    async loadCharacters() {
        try {
            const response = await fetch(`/api/admin/characters?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к персонажам');
            
            const data = await response.json();
            this.data.characters = data;
            this.updateCharactersDisplay();
        } catch (error) {
            console.error('Ошибка загрузки персонажей:', error);
        }
    }

    updateCharactersDisplay() {
        const container = document.getElementById('charactersList');
        if (!container) return;

        if (this.data.characters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <h3>Персонажи не найдены</h3>
                    <p>Создайте первого персонажа для пользователей.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.characters.forEach(character => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">
                                <span style="font-size: 24px; margin-right: 8px;">${character.avatar}</span>
                                ${character.name}
                            </div>
                            <div class="item-description">${character.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${character.is_active ? 'badge-success' : 'badge-danger'}">
                                ${character.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${character.role_name}</span>
                        <span class="badge badge-warning">${character.bonus_description}</span>
                        <span class="badge badge-secondary">${character.users_count || 0} пользователей</span>
                    </div>
                    <div class="item-footer">
                        <div>
                            <small class="text-muted">
                                Создан: ${new Date(character.created_at).toLocaleDateString()}
                            </small>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editCharacter(${character.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteCharacter(${character.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    showCharacterForm(characterId = null) {
        const modal = document.getElementById('characterModal');
        const title = document.getElementById('characterModalTitle');
        
        if (characterId) {
            // Редактирование существующего персонажа
            const character = this.data.characters.find(c => c.id === characterId);
            if (!character) return;
            
            title.textContent = 'Редактирование персонажа';
            document.getElementById('characterId').value = character.id;
            document.getElementById('characterRole').value = character.role_id;
            document.getElementById('characterName').value = character.name;
            document.getElementById('characterDescription').value = character.description;
            document.getElementById('characterBonusType').value = character.bonus_type;
            document.getElementById('characterBonusValue').value = character.bonus_value;
            document.getElementById('characterBonusDescription').value = character.bonus_description;
            document.getElementById('characterAvatar').value = character.avatar;
            document.getElementById('characterPersonality').value = character.personality || '';
            document.getElementById('characterActive').checked = character.is_active;
        } else {
            // Создание нового персонажа
            title.textContent = 'Добавление нового персонажа';
            document.getElementById('characterForm').reset();
            document.getElementById('characterId').value = '';
            document.getElementById('characterActive').checked = true;
        }
        
        // Заполняем список ролей
        this.updateCharacterRoles();
        
        modal.classList.add('active');
    }

    updateCharacterRoles() {
        const roleSelect = document.getElementById('characterRole');
        let html = '<option value="">Выберите роль</option>';
        
        this.data.roles.forEach(role => {
            html += `<option value="${role.id}">${role.name}</option>`;
        });
        
        roleSelect.innerHTML = html;
    }

    closeCharacterModal() {
        document.getElementById('characterModal').classList.remove('active');
    }

    async saveCharacter() {
        const formData = {
            role_id: document.getElementById('characterRole').value,
            name: document.getElementById('characterName').value,
            description: document.getElementById('characterDescription').value,
            bonus_type: document.getElementById('characterBonusType').value,
            bonus_value: document.getElementById('characterBonusValue').value,
            bonus_description: document.getElementById('characterBonusDescription').value,
            avatar: document.getElementById('characterAvatar').value,
            personality: document.getElementById('characterPersonality').value,
            is_active: document.getElementById('characterActive').checked
        };

        const characterId = document.getElementById('characterId').value;
        const url = characterId ? `/api/admin/characters/${characterId}?userId=${this.currentAdmin.user_id}` : `/api/admin/characters?userId=${this.currentAdmin.user_id}`;
        const method = characterId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeCharacterModal();
                this.loadCharacters();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения персонажа:', error);
            this.showError('Ошибка сохранения персонажа: ' + error.message);
        }
    }

    editCharacter(characterId) {
        this.showCharacterForm(characterId);
    }

    async deleteCharacter(characterId) {
        if (!confirm('Вы уверены, что хотите удалить этого персонажа?')) return;

        try {
            const response = await fetch(`/api/admin/characters/${characterId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadCharacters();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления персонажа:', error);
            this.showError('Ошибка удаления персонажа: ' + error.message);
        }
    }

    async loadQuizzes() {
        try {
            const response = await fetch(`/api/admin/quizzes?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к квизам');
            
            const data = await response.json();
            this.data.quizzes = data;
            this.updateQuizzesDisplay();
        } catch (error) {
            console.error('Ошибка загрузки квизов:', error);
        }
    }

    updateQuizzesDisplay() {
        const container = document.getElementById('quizzesList');
        if (!container) return;

        if (this.data.quizzes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <h3>Квизы не найдены</h3>
                    <p>Создайте первый квиз для пользователей.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.quizzes.forEach(quiz => {
            const difficultyBadge = quiz.difficulty === 'beginner' ? 'badge-success' : 
                                  quiz.difficulty === 'intermediate' ? 'badge-warning' : 'badge-danger';
            const difficultyText = quiz.difficulty === 'beginner' ? 'Начинающий' :
                                 quiz.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый';
            
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${quiz.title}</div>
                            <div class="item-description">${quiz.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${quiz.is_active ? 'badge-success' : 'badge-danger'}">
                                ${quiz.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge ${difficultyBadge}">${difficultyText}</span>
                        <span class="badge badge-info">${quiz.questions.length} вопросов</span>
                        <span class="badge badge-secondary">${quiz.completions_count || 0} прохождений</span>
                        <span class="badge badge-warning">${quiz.average_score?.toFixed(1) || 0}/5 средний балл</span>
                    </div>
                    <div class="item-footer">
                        <div>
                            <small class="text-muted">
                                Создан: ${new Date(quiz.created_at).toLocaleDateString()}
                            </small>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editQuiz(${quiz.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteQuiz(${quiz.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    showQuizForm(quizId = null) {
        const modal = document.getElementById('quizModal');
        const title = document.getElementById('quizModalTitle');
        
        if (quizId) {
            // Редактирование существующего квиза
            const quiz = this.data.quizzes.find(q => q.id === quizId);
            if (!quiz) return;
            
            title.textContent = 'Редактирование квиза';
            document.getElementById('quizId').value = quiz.id;
            document.getElementById('quizTitle').value = quiz.title;
            document.getElementById('quizDescription').value = quiz.description;
            document.getElementById('quizSparksPerCorrect').value = quiz.sparks_per_correct;
            document.getElementById('quizSparksPerfectBonus').value = quiz.sparks_perfect_bonus;
            document.getElementById('quizCooldownHours').value = quiz.cooldown_hours;
            document.getElementById('quizDurationMinutes').value = quiz.duration_minutes;
            document.getElementById('quizDifficulty').value = quiz.difficulty;
            document.getElementById('quizCategory').value = quiz.category;
            document.getElementById('quizAllowRetake').checked = quiz.allow_retake;
            document.getElementById('quizActive').checked = quiz.is_active;
            
            // Заполняем вопросы
            this.updateQuizQuestions(quiz.questions);
        } else {
            // Создание нового квиза
            title.textContent = 'Создание нового квиза';
            document.getElementById('quizForm').reset();
            document.getElementById('quizId').value = '';
            document.getElementById('quizAllowRetake').checked = true;
            document.getElementById('quizActive').checked = true;
            this.updateQuizQuestions([]);
        }
        
        modal.classList.add('active');
    }

    updateQuizQuestions(questions) {
        const container = document.getElementById('quizQuestions');
        let html = '';

        questions.forEach((question, index) => {
            html += this.createQuestionHtml(question, index);
        });

        container.innerHTML = html || '<div class="text-muted">Вопросы не добавлены</div>';
    }

    createQuestionHtml(question, index) {
        const questionNumber = index + 1;
        let optionsHtml = '';

        question.options.forEach((option, optIndex) => {
            const isCorrect = optIndex === question.correctAnswer;
            optionsHtml += `
                <div class="form-group">
                    <label class="form-label">Вариант ${optIndex + 1} ${isCorrect ? '(правильный)' : ''}</label>
                    <input type="text" class="form-control" value="${option}" 
                           onchange="adminPanel.updateQuestionOption(${index}, ${optIndex}, this.value)">
                </div>
            `;
        });

        return `
            <div class="content-card mb-3">
                <div class="card-header">
                    <h4>Вопрос ${questionNumber}</h4>
                    <button type="button" class="btn btn-sm btn-danger" onclick="adminPanel.removeQuestion(${index})">
                        🗑️ Удалить
                    </button>
                </div>
                <div class="form-group">
                    <label class="form-label">Текст вопроса:</label>
                    <input type="text" class="form-control" value="${question.question}" 
                           onchange="adminPanel.updateQuestionText(${index}, this.value)">
                </div>
                <div class="form-group">
                    <label class="form-label">Объяснение:</label>
                    <textarea class="form-control" rows="2" 
                              onchange="adminPanel.updateQuestionExplanation(${index}, this.value)">${question.explanation}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Правильный ответ:</label>
                    <select class="form-control" onchange="adminPanel.updateCorrectAnswer(${index}, this.value)">
                        ${question.options.map((_, optIndex) => `
                            <option value="${optIndex}" ${optIndex === question.correctAnswer ? 'selected' : ''}>
                                Вариант ${optIndex + 1}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="options-container">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    addQuestion() {
        const newQuestion = {
            id: Date.now(),
            question: 'Новый вопрос',
            options: ['Вариант 1', 'Вариант 2', 'Вариант 3', 'Вариант 4'],
            correctAnswer: 0,
            explanation: 'Объяснение правильного ответа'
        };

        const container = document.getElementById('quizQuestions');
        const questionHtml = this.createQuestionHtml(newQuestion, this.getCurrentQuestions().length);
        
        if (container.innerHTML.includes('Вопросы не добавлены')) {
            container.innerHTML = questionHtml;
        } else {
            container.innerHTML += questionHtml;
        }
    }

    getCurrentQuestions() {
        // Этот метод должен собирать вопросы из DOM
        // В реальной реализации здесь будет логика сбора данных из формы
        return [];
    }

    updateQuestionText(index, value) {
        // Обновление текста вопроса
    }

    updateQuestionOption(questionIndex, optionIndex, value) {
        // Обновление варианта ответа
    }

    updateQuestionExplanation(questionIndex, value) {
        // Обновление объяснения
    }

    updateCorrectAnswer(questionIndex, value) {
        // Обновление правильного ответа
    }

    removeQuestion(index) {
        // Удаление вопроса
        const questions = document.querySelectorAll('#quizQuestions > .content-card');
        if (questions[index]) {
            questions[index].remove();
        }
    }

    closeQuizModal() {
        document.getElementById('quizModal').classList.remove('active');
    }

    async saveQuiz() {
        const formData = {
            title: document.getElementById('quizTitle').value,
            description: document.getElementById('quizDescription').value,
            questions: this.getCurrentQuestions(),
            sparks_per_correct: parseInt(document.getElementById('quizSparksPerCorrect').value),
            sparks_perfect_bonus: parseInt(document.getElementById('quizSparksPerfectBonus').value),
            cooldown_hours: parseInt(document.getElementById('quizCooldownHours').value),
            duration_minutes: parseInt(document.getElementById('quizDurationMinutes').value),
            difficulty: document.getElementById('quizDifficulty').value,
            category: document.getElementById('quizCategory').value,
            allow_retake: document.getElementById('quizAllowRetake').checked,
            is_active: document.getElementById('quizActive').checked
        };

        const quizId = document.getElementById('quizId').value;
        const url = quizId ? `/api/admin/quizzes/${quizId}?userId=${this.currentAdmin.user_id}` : `/api/admin/quizzes?userId=${this.currentAdmin.user_id}`;
        const method = quizId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.closeQuizModal();
                this.loadQuizzes();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения квиза:', error);
            this.showError('Ошибка сохранения квиза: ' + error.message);
        }
    }

    editQuiz(quizId) {
        this.showQuizForm(quizId);
    }

    async deleteQuiz(quizId) {
        if (!confirm('Вы уверены, что хотите удалить этот квиз?')) return;

        try {
            const response = await fetch(`/api/admin/quizzes/${quizId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadQuizzes();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления квиза:', error);
            this.showError('Ошибка удаления квиза: ' + error.message);
        }
    }

    // Аналогичные методы для других разделов (marathons, interactives, shop, posts, etc.)
    async loadMarathons() {
        try {
            const response = await fetch(`/api/admin/marathons?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к марафонам');
            
            const data = await response.json();
            this.data.marathons = data;
            this.updateMarathonsDisplay();
        } catch (error) {
            console.error('Ошибка загрузки марафонов:', error);
        }
    }

    updateMarathonsDisplay() {
        const container = document.getElementById('marathonsList');
        if (!container) return;

        if (this.data.marathons.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏃‍♂️</div>
                    <h3>Марафоны не найдены</h3>
                    <p>Создайте первый марафон для пользователей.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.marathons.forEach(marathon => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${marathon.title}</div>
                            <div class="item-description">${marathon.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${marathon.is_active ? 'badge-success' : 'badge-danger'}">
                                ${marathon.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${marathon.duration_days} дней</span>
                        <span class="badge badge-warning">${marathon.participants_count || 0} участников</span>
                        <span class="badge badge-success">${marathon.completion_rate || 0}% завершения</span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadInteractives() {
        try {
            const response = await fetch(`/api/admin/interactives?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к интерактивам');
            
            const data = await response.json();
            this.data.interactives = data;
            this.updateInteractivesDisplay();
        } catch (error) {
            console.error('Ошибка загрузки интерактивов:', error);
        }
    }

    updateInteractivesDisplay() {
        const container = document.getElementById('interactivesList');
        if (!container) return;

        if (this.data.interactives.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎮</div>
                    <h3>Интерактивы не найдены</h3>
                    <p>Создайте первый интерактив для пользователей.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.interactives.forEach(interactive => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${interactive.title}</div>
                            <div class="item-description">${interactive.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${interactive.is_active ? 'badge-success' : 'badge-danger'}">
                                ${interactive.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${interactive.type}</span>
                        <span class="badge badge-warning">${interactive.attempts_count || 0} попыток</span>
                        <span class="badge badge-success">${interactive.success_rate || 0}% успеха</span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadShopItems() {
        try {
            const response = await fetch(`/api/admin/shop/items?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к товарам');
            
            const data = await response.json();
            this.data.shopItems = data;
            this.updateShopItemsDisplay();
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
        }
    }

    updateShopItemsDisplay() {
        const container = document.getElementById('shopItemsList');
        if (!container) return;

        if (this.data.shopItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <h3>Товары не найдены</h3>
                    <p>Добавьте первый товар в магазин.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.shopItems.forEach(item => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${item.title}</div>
                            <div class="item-description">${item.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${item.is_active ? 'badge-success' : 'badge-danger'}">
                                ${item.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${item.price} ✨</span>
                        <span class="badge badge-warning">${item.purchases_count || 0} покупок</span>
                        <span class="badge badge-success">${item.total_revenue || 0} ✨ доход</span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadPosts() {
        try {
            const response = await fetch(`/api/admin/channel-posts?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к постам');
            
            const data = await response.json();
            this.data.posts = data.posts;
            this.updatePostsDisplay();
        } catch (error) {
            console.error('Ошибка загрузки постов:', error);
        }
    }

    updatePostsDisplay() {
        const container = document.getElementById('postsList');
        if (!container) return;

        if (this.data.posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📰</div>
                    <h3>Посты не найдены</h3>
                    <p>Создайте первый пост для канала.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.posts.forEach(post => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${post.title}</div>
                            <div class="item-description">${post.content.substring(0, 100)}...</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge ${post.is_active ? 'badge-success' : 'badge-danger'}">
                                ${post.is_active ? 'Активен' : 'Неактивен'}
                            </span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${post.reviews_count || 0} отзывов</span>
                        <span class="badge badge-warning">Рейтинг: ${post.average_rating?.toFixed(1) || 0}</span>
                        <span class="badge badge-secondary">${post.admin_username}</span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadAdmins() {
        try {
            const response = await fetch(`/api/admin/admins?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к администраторам');
            
            const data = await response.json();
            this.data.admins = data;
            this.updateAdminsDisplay();
        } catch (error) {
            console.error('Ошибка загрузки администраторов:', error);
        }
    }

    updateAdminsDisplay() {
        const container = document.getElementById('adminsList');
        if (!container) return;

        if (this.data.admins.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔧</div>
                    <h3>Администраторы не найдены</h3>
                    <p>Добавьте первого администратора.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.admins.forEach(admin => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${admin.tg_first_name || admin.username}</div>
                            <div class="item-description">@${admin.username} • ${admin.role}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge badge-info">${admin.role}</span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-secondary">ID: ${admin.user_id}</span>
                        <span class="badge badge-warning">
                            Последний вход: ${new Date(admin.last_login).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            ${admin.user_id !== this.currentAdmin.user_id ? `
                                <button class="btn btn-sm btn-danger" onclick="adminPanel.removeAdmin(${admin.user_id})">
                                    🗑️ Удалить
                                </button>
                            ` : '<span class="text-muted">Текущий пользователь</span>'}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async loadModerationData() {
        try {
            const [worksResponse, reviewsResponse] = await Promise.all([
                fetch(`/api/admin/user-works?status=pending&userId=${this.currentAdmin.user_id}`),
                fetch(`/api/admin/reviews?status=pending&userId=${this.currentAdmin.user_id}`)
            ]);

            if (worksResponse.ok) {
                const worksData = await worksResponse.json();
                this.data.moderation.works = worksData.works;
            }

            if (reviewsResponse.ok) {
                const reviewsData = await reviewsResponse.json();
                this.data.moderation.reviews = reviewsData.reviews;
            }

            this.updateModerationDisplay();
        } catch (error) {
            console.error('Ошибка загрузки данных модерации:', error);
        }
    }

    updateModerationDisplay() {
        // Обновляем счетчики
        document.getElementById('pendingWorksCount').textContent = `${this.data.moderation.works.length} на модерации`;
        document.getElementById('pendingReviewsCount').textContent = `${this.data.moderation.reviews.length} на модерации`;

        // Обновляем списки
        this.updateWorksModerationList();
        this.updateReviewsModerationList();
    }

    updateWorksModerationList() {
        const container = document.getElementById('worksModerationList');
        if (!container) return;

        if (this.data.moderation.works.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🖼️</div>
                    <h3>Нет работ для модерации</h3>
                    <p>Все работы проверены.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.moderation.works.forEach(work => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">${work.title}</div>
                            <div class="item-description">${work.description}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge badge-warning">На модерации</span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">${work.user_name}</span>
                        <span class="badge badge-secondary">${work.category}</span>
                        <span class="badge badge-warning">
                            ${new Date(work.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-success" onclick="adminPanel.moderateWork(${work.id}, 'approved')">
                                ✅ Одобрить
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.moderateWork(${work.id}, 'rejected')">
                                ❌ Отклонить
                            </button>
                            <button class="btn btn-sm btn-info" onclick="adminPanel.viewWork(${work.id})">
                                👁️ Просмотр
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateReviewsModerationList() {
        const container = document.getElementById('reviewsModerationList');
        if (!container) return;

        if (this.data.moderation.reviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <h3>Нет отзывов для модерации</h3>
                    <p>Все отзывы проверены.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.data.moderation.reviews.forEach(review => {
            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div>
                            <div class="item-title">Отзыв от ${review.tg_first_name}</div>
                            <div class="item-description">${review.review_text}</div>
                        </div>
                        <div class="action-buttons">
                            <span class="badge badge-warning">На модерации</span>
                        </div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">Рейтинг: ${review.rating}/5</span>
                        <span class="badge badge-secondary">Пост: ${review.post_title}</span>
                        <span class="badge badge-warning">
                            ${new Date(review.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div class="item-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-success" onclick="adminPanel.moderateReview(${review.id}, 'approved')">
                                ✅ Одобрить
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.moderateReview(${review.id}, 'rejected')">
                                ❌ Отклонить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async moderateWork(workId, status) {
        const comment = prompt(status === 'approved' ? 'Введите комментарий (опционально):' : 'Введите причину отклонения:');
        
        try {
            const response = await fetch(`/api/admin/user-works/${workId}/moderate?userId=${this.currentAdmin.user_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    admin_comment: comment
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadModerationData();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка модерации работы:', error);
            this.showError('Ошибка модерации работы: ' + error.message);
        }
    }

    async moderateReview(reviewId, status) {
        const comment = prompt(status === 'approved' ? 'Введите комментарий (опционально):' : 'Введите причину отклонения:');
        
        try {
            const response = await fetch(`/api/admin/reviews/${reviewId}/moderate?userId=${this.currentAdmin.user_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    admin_comment: comment
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadModerationData();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка модерации отзыва:', error);
            this.showError('Ошибка модерации отзыва: ' + error.message);
        }
    }

    async loadSettings() {
        try {
            const response = await fetch(`/api/admin/settings?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к настройкам');
            
            const data = await response.json();
            this.data.settings = data;
            this.updateSettingsDisplay();
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
        }
    }

    updateSettingsDisplay() {
        const container = document.getElementById('settingsList');
        if (!container) return;

        let html = `
            <div class="content-card">
                <h3>⚙️ Основные настройки</h3>
                <form id="settingsForm">
        `;

        this.data.settings.forEach(setting => {
            html += `
                <div class="form-group">
                    <label class="form-label">${setting.description}:</label>
                    <input type="text" class="form-control" name="${setting.key}" value="${setting.value}">
                    <small class="text-muted">Ключ: ${setting.key}</small>
                </div>
            `;
        });

        html += `
                    <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                        <button type="button" class="btn btn-primary" onclick="adminPanel.saveSettings()">
                            💾 Сохранить настройки
                        </button>
                    </div>
                </form>
            </div>
        `;

        container.innerHTML = html;
    }

    async saveSettings() {
        const form = document.getElementById('settingsForm');
        const formData = new FormData(form);
        
        const settings = [];
        for (let [key, value] of formData.entries()) {
            settings.push({ key, value });
        }

        try {
            const response = await fetch(`/api/admin/settings?userId=${this.currentAdmin.user_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ settings })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadSettings();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            this.showError('Ошибка сохранения настроек: ' + error.message);
        }
    }

    showTab(tab) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Убираем активный класс со всех пунктов меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Показываем выбранную вкладку
        document.getElementById(tab).classList.add('active');
        
        // Активируем соответствующий пункт меню
        document.querySelector(`.nav-item[data-tab="${tab}"]`).classList.add('active');
        
        // Обновляем заголовок страницы
        document.getElementById('pageTitle').textContent = this.getTabTitle(tab);
        
        // Сохраняем текущую вкладку
        this.currentTab = tab;
        
        // Загружаем данные для вкладки, если нужно
        if (tab === 'dashboard') {
            this.loadStats();
        }
    }

    showModerationTab(tab) {
        // Скрываем все вкладки модерации
        document.querySelectorAll('.moderation-tab').forEach(content => {
            content.style.display = 'none';
        });
        
        // Убираем активный класс со всех кнопок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Показываем выбранную вкладку
        document.getElementById(tab).style.display = 'block';
        
        // Активируем соответствующую кнопку
        document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
    }

    getTabTitle(tab) {
        const titles = {
            'dashboard': 'Дашборд',
            'users': 'Пользователи',
            'roles': 'Роли',
            'characters': 'Персонажи',
            'quizzes': 'Квизы',
            'marathons': 'Марафоны',
            'interactives': 'Интерактивы',
            'shop': 'Магазин',
            'posts': 'Посты',
            'moderation': 'Модерация',
            'admins': 'Администраторы',
            'settings': 'Настройки'
        };
        
        return titles[tab] || 'Админ панель';
    }

    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('messageArea');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        messageArea.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSystemInfo() {
        const infoHtml = `
            <div class="content-card">
                <h2>ℹ️ Информация о системе</h2>
                <div class="grid-2">
                    <div>
                        <h3>Версия системы</h3>
                        <p><strong>Версия:</strong> 8.0.0</p>
                        <p><strong>Сборка:</strong> Production</p>
                        <p><strong>Дата сборки:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                        <h3>Статистика</h3>
                        <p><strong>Пользователей:</strong> ${this.data.users.length}</p>
                        <p><strong>Квизов:</strong> ${this.data.quizzes.length}</p>
                        <p><strong>Марафонов:</strong> ${this.data.marathons.length}</p>
                        <p><strong>Товаров:</strong> ${this.data.shopItems.length}</p>
                    </div>
                </div>
            </div>
        `;

        // Создаем модальное окно для информации о системе
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">Информация о системе</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${infoHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    exportUsers() {
        this.showMessage('Функционал экспорта в разработке', 'info');
    }

    showUserStats() {
        this.showMessage('Функционал статистики пользователей в разработке', 'info');
    }

    // Заглушки для остальных методов форм
    showMarathonForm() {
        this.showMessage('Функционал создания марафонов в разработке', 'info');
    }

    showInteractiveForm() {
        this.showMessage('Функционал создания интерактивов в разработке', 'info');
    }

    showShopItemForm() {
        this.showMessage('Функционал добавления товаров в разработке', 'info');
    }

    showPostForm() {
        this.showMessage('Функционал создания постов в разработке', 'info');
    }

    showAdminForm() {
        this.showMessage('Функционал добавления администраторов в разработке', 'info');
    }

    removeAdmin(userId) {
        if (!confirm('Вы уверены, что хотите удалить этого администратора?')) return;
        this.showMessage('Функционал удаления администраторов в разработке', 'info');
    }

    viewWork(workId) {
        this.showMessage('Функционал просмотра работ в разработке', 'info');
    }
}

// Инициализация админ панели
const adminPanel = new AdminPanel();
