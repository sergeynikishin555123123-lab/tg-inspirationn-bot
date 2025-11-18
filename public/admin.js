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
            <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div class="stat-icon">👥</div>
                <div class="stat-number">${stats.totalUsers}</div>
                <div class="stat-label">Всего пользователей</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white;">
                <div class="stat-icon">✅</div>
                <div class="stat-number">${stats.registeredUsers}</div>
                <div class="stat-label">Зарегистрировано</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: white;">
                <div class="stat-icon">🎯</div>
                <div class="stat-number">${stats.activeQuizzes}</div>
                <div class="stat-label">Активных квизов</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #9f7aea 0%, #805ad5 100%); color: white;">
                <div class="stat-icon">🏃‍♂️</div>
                <div class="stat-number">${stats.activeMarathons}</div>
                <div class="stat-label">Активных марафонов</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ed64a6 0%, #d53f8c 100%); color: white;">
                <div class="stat-icon">🛒</div>
                <div class="stat-number">${stats.shopItems}</div>
                <div class="stat-label">Товаров в магазине</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%); color: white;">
                <div class="stat-icon">✨</div>
                <div class="stat-number">${stats.totalSparks.toFixed(0)}</div>
                <div class="stat-label">Всего искр</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white;">
                <div class="stat-icon">📊</div>
                <div class="stat-number">${stats.totalActivities}</div>
                <div class="stat-label">Всего активностей</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); color: white;">
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
            <div class="grid-3">
                <div class="content-card">
                    <h3>👥 Пользователи</h3>
                    <div class="stats-grid" style="grid-template-columns: 1fr;">
                        <div class="stat-item">
                            <div class="stat-number">${stats.users.active_today}</div>
                            <div class="stat-label">Активных сегодня</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.users.active_week}</div>
                            <div class="stat-label">Активных за неделю</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.users.new_today}</div>
                            <div class="stat-label">Новых сегодня</div>
                        </div>
                    </div>
                </div>
                
                <div class="content-card">
                    <h3>💰 Финансы</h3>
                    <div class="stats-grid" style="grid-template-columns: 1fr;">
                        <div class="stat-item">
                            <div class="stat-number">${stats.activities.earned_sparks}</div>
                            <div class="stat-label">Заработано искр</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.activities.spent_sparks}</div>
                            <div class="stat-label">Потрачено искр</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.revenue.total}</div>
                            <div class="stat-label">Общий доход</div>
                        </div>
                    </div>
                </div>
                
                <div class="content-card">
                    <h3>📊 Контент</h3>
                    <div class="stats-grid" style="grid-template-columns: 1fr;">
                        <div class="stat-item">
                            <div class="stat-number">${stats.content.quizzes}</div>
                            <div class="stat-label">Всего квизов</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.content.marathons}</div>
                            <div class="stat-label">Всего марафонов</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.content.shop_items}</div>
                            <div class="stat-label">Товаров</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="content-card mt-3">
                <h3>📈 Распределение по ролям</h3>
                <div class="grid-4">
                    ${stats.users.by_role.map(role => `
                        <div class="text-center">
                            <div style="font-size: 24px; margin-bottom: 8px;">${this.getRoleIcon(role.role)}</div>
                            <strong>${role.role}</strong>
                            <div class="text-muted">${role.count} пользователей</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="content-card mt-3">
                <h3>🚀 Быстрая навигация</h3>
                <div class="action-buttons">
                    <button class="btn btn-success" onclick="adminPanel.showTab('users')">
                        <span>👥</span>
                        Управление пользователями
                    </button>
                    <button class="btn btn-info" onclick="adminPanel.showTab('moderation')">
                        <span>⚖️</span>
                        Модерация
                    </button>
                    <button class="btn btn-warning" onclick="adminPanel.showTab('quizzes')">
                        <span>🎯</span>
                        Квизы
                    </button>
                    <button class="btn btn-purple" onclick="adminPanel.showTab('marathons')">
                        <span>🏃‍♂️</span>
                        Марафоны
                    </button>
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
            container.innerHTML = this.createEmptyState('👥', 'Пользователи не найдены', 'В системе пока нет зарегистрированных пользователей.');
            return;
        }

        // Добавляем фильтры и поиск
        container.innerHTML = `
            <div class="filters">
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="userSearch" class="search-input" placeholder="Поиск по имени или username..." oninput="adminPanel.filterUsers()">
                </div>
                <select class="filter-select" id="userRoleFilter" onchange="adminPanel.filterUsers()">
                    <option value="">Все роли</option>
                    ${[...new Set(this.data.users.map(u => u.role))].filter(r => r).map(role => 
                        `<option value="${role}">${role}</option>`
                    ).join('')}
                </select>
                <select class="filter-select" id="userLevelFilter" onchange="adminPanel.filterUsers()">
                    <option value="">Все уровни</option>
                    <option value="Ученик">Ученик</option>
                    <option value="Искатель">Искатель</option>
                    <option value="Знаток">Знаток</option>
                    <option value="Мастер">Мастер</option>
                    <option value="Наставник">Наставник</option>
                    <option value="Легенда">Легенда</option>
                </select>
            </div>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Пользователь</th>
                            <th>Роль</th>
                            <th>Уровень</th>
                            <th>Искры</th>
                            <th>Активность</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        ${this.data.users.map(user => this.createUserRow(user)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    createUserRow(user) {
        const lastActive = new Date(user.last_active);
        const now = new Date();
        const daysAgo = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
        const isActive = daysAgo <= 7;
        
        return `
            <tr>
                <td>${user.id}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${user.name}</strong>
                            ${user.username ? `<br><small class="text-muted">@${user.username}</small>` : ''}
                        </div>
                    </div>
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
                        <button class="btn btn-sm btn-info" onclick="adminPanel.viewUserDetails(${user.id})" title="Просмотр">
                            👁️
                        </button>
                        <button class="btn btn-sm btn-warning" onclick="adminPanel.editUser(${user.id})" title="Редактировать">
                            ✏️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    filterUsers() {
        const searchTerm = document.getElementById('userSearch').value.toLowerCase();
        const roleFilter = document.getElementById('userRoleFilter').value;
        const levelFilter = document.getElementById('userLevelFilter').value;

        const filteredUsers = this.data.users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm) ||
                                 (user.username && user.username.toLowerCase().includes(searchTerm));
            const matchesRole = !roleFilter || user.role === roleFilter;
            const matchesLevel = !levelFilter || user.level === levelFilter;
            
            return matchesSearch && matchesRole && matchesLevel;
        });

        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = filteredUsers.map(user => this.createUserRow(user)).join('');
        }
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

    async editUser(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">✏️ Редактирование пользователя</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <div class="form-group">
                            <label class="form-label">Имя:</label>
                            <input type="text" class="form-control" id="editUserName" value="${user.name}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Искры:</label>
                            <input type="number" class="form-control" id="editUserSparks" value="${user.sparks}" step="0.1" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Уровень:</label>
                            <select class="form-control" id="editUserLevel">
                                <option value="Ученик" ${user.level === 'Ученик' ? 'selected' : ''}>Ученик</option>
                                <option value="Искатель" ${user.level === 'Искатель' ? 'selected' : ''}>Искатель</option>
                                <option value="Знаток" ${user.level === 'Знаток' ? 'selected' : ''}>Знаток</option>
                                <option value="Мастер" ${user.level === 'Мастер' ? 'selected' : ''}>Мастер</option>
                                <option value="Наставник" ${user.level === 'Наставник' ? 'selected' : ''}>Наставник</option>
                                <option value="Легенда" ${user.level === 'Легенда' ? 'selected' : ''}>Легенда</option>
                            </select>
                        </div>
                        <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                            <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="adminPanel.saveUser(${user.id})">Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async saveUser(userId) {
        const name = document.getElementById('editUserName').value;
        const sparks = parseFloat(document.getElementById('editUserSparks').value);
        const level = document.getElementById('editUserLevel').value;

        try {
            // В реальной системе здесь будет вызов API для обновления пользователя
            // Покажем сообщение об успехе
            this.showMessage('Функционал редактирования пользователей будет доступен в следующем обновлении', 'info');
            document.querySelector('#editUserForm').closest('.modal').remove();
            
        } catch (error) {
            console.error('Ошибка сохранения пользователя:', error);
            this.showError('Ошибка сохранения пользователя: ' + error.message);
        }
    }

    async loadRoles() {
        try {
            const response = await fetch(`/api/admin/roles?userId=${this.currentAdmin.user_id}`);
            if (!response.ok) throw new Error('Нет доступа к ролям');
            
            const data = await response.json();
            this.data.roles = data;
            this.updateRolesDisplay();
        } catch (error) {
            console.error('Ошибка загрузки ролей:', error);
        }
    }

    updateRolesDisplay() {
        const container = document.getElementById('rolesList');
        if (!container) return;

        if (this.data.roles.length === 0) {
            container.innerHTML = this.createEmptyState('🎭', 'Роли не найдены', 'Создайте первую роль для пользователей.');
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
            container.innerHTML = this.createEmptyState('👤', 'Персонажи не найдены', 'Создайте первого персонажа для пользователей.');
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
            container.innerHTML = this.createEmptyState('🎯', 'Квизы не найдены', 'Создайте первый квиз для пользователей.');
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
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        if (quizId) {
            // Редактирование существующего квиза
            const quiz = this.data.quizzes.find(q => q.id === quizId);
            if (!quiz) return;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Редактирование квиза</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="quizForm">
                            <input type="hidden" id="quizId" value="${quiz.id}">
                            <div class="form-group">
                                <label class="form-label">Название квиза:</label>
                                <input type="text" id="quizTitle" class="form-control" value="${quiz.title}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="quizDescription" class="form-control" rows="3" required>${quiz.description}</textarea>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Искр за правильный ответ:</label>
                                    <input type="number" id="quizSparksPerCorrect" class="form-control" value="${quiz.sparks_per_correct}" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Бонус за идеальный результат:</label>
                                    <input type="number" id="quizSparksPerfectBonus" class="form-control" value="${quiz.sparks_perfect_bonus}" min="0" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="quizActive" ${quiz.is_active ? 'checked' : ''}> Активный квиз
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveQuiz()">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } else {
            // Создание нового квиза
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">➕ Создание нового квиза</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="quizForm">
                            <input type="hidden" id="quizId" value="">
                            <div class="form-group">
                                <label class="form-label">Название квиза:</label>
                                <input type="text" id="quizTitle" class="form-control" placeholder="Основы живописи" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="quizDescription" class="form-control" rows="3" placeholder="Описание квиза..." required></textarea>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Искр за правильный ответ:</label>
                                    <input type="number" id="quizSparksPerCorrect" class="form-control" value="2" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Бонус за идеальный результат:</label>
                                    <input type="number" id="quizSparksPerfectBonus" class="form-control" value="10" min="0" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="quizActive" checked> Активный квиз
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveQuiz()">Создать квиз</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    }

    async saveQuiz() {
        const quizData = {
            title: document.getElementById('quizTitle').value,
            description: document.getElementById('quizDescription').value,
            sparks_per_correct: parseInt(document.getElementById('quizSparksPerCorrect').value),
            sparks_perfect_bonus: parseInt(document.getElementById('quizSparksPerfectBonus').value),
            is_active: document.getElementById('quizActive').checked,
            questions: [
                {
                    id: 1,
                    question: "Пример вопроса",
                    options: ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
                    correctAnswer: 0,
                    explanation: "Объяснение правильного ответа"
                }
            ]
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
                body: JSON.stringify(quizData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                document.querySelector('#quizForm').closest('.modal').remove();
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
            container.innerHTML = this.createEmptyState('🏃‍♂️', 'Марафоны не найдены', 'Создайте первый марафон для пользователей.');
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
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editMarathon(${marathon.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteMarathon(${marathon.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async showMarathonForm(marathonId = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        if (marathonId) {
            // Редактирование существующего марафона
            const marathon = this.data.marathons.find(m => m.id === marathonId);
            if (!marathon) return;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Редактирование марафона</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="marathonForm">
                            <input type="hidden" id="marathonId" value="${marathon.id}">
                            <div class="form-group">
                                <label class="form-label">Название марафона:</label>
                                <input type="text" id="marathonTitle" class="form-control" value="${marathon.title}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="marathonDescription" class="form-control" rows="3" required>${marathon.description}</textarea>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Длительность (дней):</label>
                                    <input type="number" id="marathonDuration" class="form-control" value="${marathon.duration_days}" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Искр за день:</label>
                                    <input type="number" id="marathonSparksPerDay" class="form-control" value="${marathon.sparks_per_day}" min="1" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="marathonActive" ${marathon.is_active ? 'checked' : ''}> Активный марафон
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveMarathon()">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } else {
            // Создание нового марафона
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">➕ Создание нового марафона</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="marathonForm">
                            <input type="hidden" id="marathonId" value="">
                            <div class="form-group">
                                <label class="form-label">Название марафона:</label>
                                <input type="text" id="marathonTitle" class="form-control" placeholder="7-дневный марафон акварели" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="marathonDescription" class="form-control" rows="3" placeholder="Описание марафона..." required></textarea>
                            </div>
                            <div class="grid-2">
                                <div class="form-group">
                                    <label class="form-label">Длительность (дней):</label>
                                    <input type="number" id="marathonDuration" class="form-control" value="7" min="1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Искр за день:</label>
                                    <input type="number" id="marathonSparksPerDay" class="form-control" value="10" min="1" required>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="marathonActive" checked> Активный марафон
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveMarathon()">Создать марафон</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    }

    async saveMarathon() {
        const marathonData = {
            title: document.getElementById('marathonTitle').value,
            description: document.getElementById('marathonDescription').value,
            duration_days: parseInt(document.getElementById('marathonDuration').value),
            sparks_per_day: parseInt(document.getElementById('marathonSparksPerDay').value),
            sparks_completion_bonus: 50,
            is_active: document.getElementById('marathonActive').checked,
            tasks: [
                {
                    day: 1,
                    title: "День 1",
                    description: "Первое задание марафона",
                    requires_submission: true,
                    submission_type: "image"
                }
            ]
        };

        const marathonId = document.getElementById('marathonId').value;
        const url = marathonId ? `/api/admin/marathons/${marathonId}?userId=${this.currentAdmin.user_id}` : `/api/admin/marathons?userId=${this.currentAdmin.user_id}`;
        const method = marathonId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(marathonData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                document.querySelector('#marathonForm').closest('.modal').remove();
                this.loadMarathons();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения марафона:', error);
            this.showError('Ошибка сохранения марафона: ' + error.message);
        }
    }

    editMarathon(marathonId) {
        this.showMarathonForm(marathonId);
    }

    async deleteMarathon(marathonId) {
        if (!confirm('Вы уверены, что хотите удалить этот марафон?')) return;

        try {
            const response = await fetch(`/api/admin/marathons/${marathonId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadMarathons();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления марафона:', error);
            this.showError('Ошибка удаления марафона: ' + error.message);
        }
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
            container.innerHTML = this.createEmptyState('🎮', 'Интерактивы не найдены', 'Создайте первый интерактив для пользователей.');
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
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editInteractive(${interactive.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteInteractive(${interactive.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async showInteractiveForm(interactiveId = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        if (interactiveId) {
            // Редактирование существующего интерактива
            const interactive = this.data.interactives.find(i => i.id === interactiveId);
            if (!interactive) return;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Редактирование интерактива</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="interactiveForm">
                            <input type="hidden" id="interactiveId" value="${interactive.id}">
                            <div class="form-group">
                                <label class="form-label">Название интерактива:</label>
                                <input type="text" id="interactiveTitle" class="form-control" value="${interactive.title}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="interactiveDescription" class="form-control" rows="3" required>${interactive.description}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Награда (искры):</label>
                                <input type="number" id="interactiveSparks" class="form-control" value="${interactive.sparks_reward}" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="interactiveActive" ${interactive.is_active ? 'checked' : ''}> Активный интерактив
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveInteractive()">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } else {
            // Создание нового интерактива
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">➕ Создание нового интерактива</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="interactiveForm">
                            <input type="hidden" id="interactiveId" value="">
                            <div class="form-group">
                                <label class="form-label">Название интерактива:</label>
                                <input type="text" id="interactiveTitle" class="form-control" placeholder="Угадай эпоху картины" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="interactiveDescription" class="form-control" rows="3" placeholder="Описание интерактива..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Награда (искры):</label>
                                <input type="number" id="interactiveSparks" class="form-control" value="5" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="interactiveActive" checked> Активный интерактив
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveInteractive()">Создать интерактив</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    }

    async saveInteractive() {
        const interactiveData = {
            title: document.getElementById('interactiveTitle').value,
            description: document.getElementById('interactiveDescription').value,
            sparks_reward: parseInt(document.getElementById('interactiveSparks').value),
            is_active: document.getElementById('interactiveActive').checked,
            type: "guess_era",
            category: "art_history",
            question: "Какой эпохе принадлежит этот фрагмент?",
            options: ["Ренессанс", "Барокко", "Импрессионизм", "Кубизм"],
            correct_answer: 0,
            allow_retake: false
        };

        const interactiveId = document.getElementById('interactiveId').value;
        const url = interactiveId ? `/api/admin/interactives/${interactiveId}?userId=${this.currentAdmin.user_id}` : `/api/admin/interactives?userId=${this.currentAdmin.user_id}`;
        const method = interactiveId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(interactiveData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                document.querySelector('#interactiveForm').closest('.modal').remove();
                this.loadInteractives();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения интерактива:', error);
            this.showError('Ошибка сохранения интерактива: ' + error.message);
        }
    }

    editInteractive(interactiveId) {
        this.showInteractiveForm(interactiveId);
    }

    async deleteInteractive(interactiveId) {
        if (!confirm('Вы уверены, что хотите удалить этот интерактив?')) return;

        try {
            const response = await fetch(`/api/admin/interactives/${interactiveId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadInteractives();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления интерактива:', error);
            this.showError('Ошибка удаления интерактива: ' + error.message);
        }
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
            container.innerHTML = this.createEmptyState('🛒', 'Товары не найдены', 'Добавьте первый товар в магазин.');
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
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editShopItem(${item.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deleteShopItem(${item.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async showShopItemForm(shopItemId = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        if (shopItemId) {
            // Редактирование существующего товара
            const item = this.data.shopItems.find(i => i.id === shopItemId);
            if (!item) return;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Редактирование товара</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="shopItemForm">
                            <input type="hidden" id="shopItemId" value="${item.id}">
                            <div class="form-group">
                                <label class="form-label">Название товара:</label>
                                <input type="text" id="shopItemTitle" class="form-control" value="${item.title}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="shopItemDescription" class="form-control" rows="3" required>${item.description}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Цена (искры):</label>
                                <input type="number" id="shopItemPrice" class="form-control" value="${item.price}" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="shopItemActive" ${item.is_active ? 'checked' : ''}> Активный товар
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveShopItem()">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } else {
            // Создание нового товара
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">➕ Добавление нового товара</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="shopItemForm">
                            <input type="hidden" id="shopItemId" value="">
                            <div class="form-group">
                                <label class="form-label">Название товара:</label>
                                <input type="text" id="shopItemTitle" class="form-control" placeholder="Курс акварели для начинающих" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Описание:</label>
                                <textarea id="shopItemDescription" class="form-control" rows="3" placeholder="Описание товара..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Цена (искры):</label>
                                <input type="number" id="shopItemPrice" class="form-control" value="45" min="1" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="shopItemActive" checked> Активный товар
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.saveShopItem()">Добавить товар</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    }

    async saveShopItem() {
        const shopItemData = {
            title: document.getElementById('shopItemTitle').value,
            description: document.getElementById('shopItemDescription').value,
            price: parseInt(document.getElementById('shopItemPrice').value),
            is_active: document.getElementById('shopItemActive').checked,
            type: "video_course",
            category: "painting"
        };

        const shopItemId = document.getElementById('shopItemId').value;
        const url = shopItemId ? `/api/admin/shop/items/${shopItemId}?userId=${this.currentAdmin.user_id}` : `/api/admin/shop/items?userId=${this.currentAdmin.user_id}`;
        const method = shopItemId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(shopItemData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                document.querySelector('#shopItemForm').closest('.modal').remove();
                this.loadShopItems();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения товара:', error);
            this.showError('Ошибка сохранения товара: ' + error.message);
        }
    }

    editShopItem(shopItemId) {
        this.showShopItemForm(shopItemId);
    }

    async deleteShopItem(shopItemId) {
        if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

        try {
            const response = await fetch(`/api/admin/shop/items/${shopItemId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadShopItems();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления товара:', error);
            this.showError('Ошибка удаления товара: ' + error.message);
        }
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
            container.innerHTML = this.createEmptyState('📰', 'Посты не найдены', 'Создайте первый пост для канала.');
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
                            <button class="btn btn-sm btn-info" onclick="adminPanel.editPost(${post.id})">
                                ✏️ Редактировать
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="adminPanel.deletePost(${post.id})">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async showPostForm(postId = null) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        if (postId) {
            // Редактирование существующего поста
            const post = this.data.posts.find(p => p.id === postId);
            if (!post) return;
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">✏️ Редактирование поста</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="postForm">
                            <input type="hidden" id="postId" value="${post.id}">
                            <div class="form-group">
                                <label class="form-label">Заголовок поста:</label>
                                <input type="text" id="postTitle" class="form-control" value="${post.title}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Содержание:</label>
                                <textarea id="postContent" class="form-control" rows="6" required>${post.content}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="postActive" ${post.is_active ? 'checked' : ''}> Активный пост
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.savePost()">Сохранить</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        } else {
            // Создание нового поста
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">➕ Создание нового поста</h3>
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="postForm">
                            <input type="hidden" id="postId" value="">
                            <div class="form-group">
                                <label class="form-label">Заголовок поста:</label>
                                <input type="text" id="postTitle" class="form-control" placeholder="Новый пост в канале" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Содержание:</label>
                                <textarea id="postContent" class="form-control" rows="6" placeholder="Содержание поста..." required></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="postActive" checked> Активный пост
                                </label>
                            </div>
                            <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                                <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                                <button type="button" class="btn btn-primary" onclick="adminPanel.savePost()">Создать пост</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(modal);
    }

    async savePost() {
        const postData = {
            title: document.getElementById('postTitle').value,
            content: document.getElementById('postContent').value,
            is_active: document.getElementById('postActive').checked,
            post_id: `post_${Date.now()}`,
            media_type: 'text'
        };

        const postId = document.getElementById('postId').value;
        const url = postId ? `/api/admin/channel-posts/${postId}?userId=${this.currentAdmin.user_id}` : `/api/admin/channel-posts?userId=${this.currentAdmin.user_id}`;
        const method = postId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                document.querySelector('#postForm').closest('.modal').remove();
                this.loadPosts();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка сохранения поста:', error);
            this.showError('Ошибка сохранения поста: ' + error.message);
        }
    }

    editPost(postId) {
        this.showPostForm(postId);
    }

    async deletePost(postId) {
        if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;

        try {
            const response = await fetch(`/api/admin/channel-posts/${postId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadPosts();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления поста:', error);
            this.showError('Ошибка удаления поста: ' + error.message);
        }
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
            container.innerHTML = this.createEmptyState('🔧', 'Администраторы не найдены', 'Добавьте первого администратора.');
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

    async showAdminForm() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title">➕ Добавить администратора</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="adminForm">
                        <div class="form-group">
                            <label class="form-label">ID пользователя:</label>
                            <input type="number" id="adminUserId" class="form-control" placeholder="Введите Telegram ID пользователя" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Роль:</label>
                            <select id="adminRole" class="form-control" required>
                                <option value="moderator">Модератор</option>
                                <option value="admin">Администратор</option>
                                <option value="superadmin">Супер администратор</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Права доступа:</label>
                            <div class="checkbox-group">
                                <div class="checkbox-item">
                                    <input type="checkbox" id="perm_users" value="users" checked>
                                    <div class="checkbox-label">
                                        <div class="checkbox-title">👥 Управление пользователями</div>
                                        <div class="checkbox-description">Просмотр и редактирование пользователей</div>
                                    </div>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="perm_content" value="content" checked>
                                    <div class="checkbox-label">
                                        <div class="checkbox-title">🎯 Управление контентом</div>
                                        <div class="checkbox-description">Квизы, марафоны, интерактивы</div>
                                    </div>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="perm_shop" value="shop" checked>
                                    <div class="checkbox-label">
                                        <div class="checkbox-title">🛒 Управление магазином</div>
                                        <div class="checkbox-description">Товары и категории</div>
                                    </div>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="perm_moderation" value="moderation" checked>
                                    <div class="checkbox-label">
                                        <div class="checkbox-title">⚖️ Модерация</div>
                                        <div class="checkbox-description">Работы и отзывы</div>
                                    </div>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="perm_admins" value="admins">
                                    <div class="checkbox-label">
                                        <div class="checkbox-title">🔧 Управление админами</div>
                                        <div class="checkbox-description">Добавление и удаление администраторов</div>
                                    </div>
                                </div>
                                <div class="checkbox-item">
                                    <input type="checkbox" id="perm_settings" value="settings">
                                    <div class="checkbox-label">
                                        <div class="checkbox-title">⚙️ Настройки системы</div>
                                        <div class="checkbox-description">Системные настройки</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="action-buttons" style="justify-content: flex-end; margin-top: 24px;">
                            <button type="button" class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.parentElement.remove()">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="adminPanel.saveAdmin()">Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async saveAdmin() {
        const userId = document.getElementById('adminUserId').value;
        const role = document.getElementById('adminRole').value;
        
        if (!userId) {
            this.showError('Введите ID пользователя');
            return;
        }

        // Собираем выбранные права доступа
        const permissions = [];
        const checkboxes = document.querySelectorAll('#adminForm input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            permissions.push(checkbox.value);
        });

        const adminData = {
            user_id: parseInt(userId),
            username: '', // Будет заполнено на сервере
            role: role,
            permissions: permissions
        };

        try {
            const response = await fetch(`/api/admin/admins?userId=${this.currentAdmin.user_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                document.querySelector('#adminForm').closest('.modal').remove();
                this.loadAdmins();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка добавления администратора:', error);
            this.showError('Ошибка добавления администратора: ' + error.message);
        }
    }

    async removeAdmin(userId) {
        if (userId === this.currentAdmin.user_id) {
            this.showError('Нельзя удалить самого себя');
            return;
        }

        if (!confirm('Вы уверены, что хотите удалить этого администратора?')) return;

        try {
            const response = await fetch(`/api/admin/admins/${userId}?userId=${this.currentAdmin.user_id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadAdmins();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка удаления администратора:', error);
            this.showError('Ошибка удаления администратора: ' + error.message);
        }
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
        // Обновляем счетчики с иконками
        document.getElementById('pendingWorksCount').innerHTML = `🖼️ ${this.data.moderation.works.length} работ`;
        document.getElementById('pendingReviewsCount').innerHTML = `💬 ${this.data.moderation.reviews.length} отзывов`;

        this.updateWorksModerationList();
        this.updateReviewsModerationList();
    }

    updateWorksModerationList() {
        const container = document.getElementById('worksModerationList');
        if (!container) return;

        if (this.data.moderation.works.length === 0) {
            container.innerHTML = this.createEmptyState('🖼️', 'Нет работ для модерации', 'Все работы проверены.');
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
            container.innerHTML = this.createEmptyState('💬', 'Нет отзывов для модерации', 'Все отзывы проверены.');
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

    async viewWork(workId) {
        const work = this.data.moderation.works.find(w => w.id === workId);
        if (!work) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 class="modal-title">🖼️ Просмотр работы</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="content-card">
                        <h3>${work.title}</h3>
                        <p><strong>Автор:</strong> ${work.user_name} (${work.user_username ? '@' + work.user_username : 'без username'})</p>
                        <p><strong>Категория:</strong> ${work.category}</p>
                        <p><strong>Описание:</strong> ${work.description}</p>
                        <p><strong>Дата загрузки:</strong> ${new Date(work.created_at).toLocaleString()}</p>
                        
                        ${work.image_url && (
                            `<div style="margin-top: 16px;">
                                <img src="${work.image_url}" alt="${work.title}" style="max-width: 100%; border-radius: 8px;">
                            </div>`
                        )}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
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

    getRoleIcon(roleName) {
        const icons = {
            'Художники': '🎨',
            'Стилисты': '👗',
            'Фотографы': '📷',
            'Дизайнеры': '✏️',
            'Блогеры': '📱',
            'Рукодельники': '🧵'
        };
        return icons[roleName] || '👤';
    }

    createEmptyState(icon, title, description) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;
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
        // Создаем CSV содержимое
        const headers = ['ID', 'Имя', 'Username', 'Роль', 'Уровень', 'Искры', 'Квизы', 'Марафоны', 'Работы', 'Дата регистрации'];
        const csvContent = [
            headers.join(','),
            ...this.data.users.map(user => [
                user.id,
                `"${user.name}"`,
                `"${user.username || ''}"`,
                `"${user.role || ''}"`,
                `"${user.level}"`,
                user.sparks,
                user.total_quizzes,
                user.total_marathons,
                user.total_works,
                new Date(user.registration_date).toLocaleDateString()
            ].join(','))
        ].join('\n');

        // Создаем и скачиваем файл
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showMessage('Экспорт пользователей завершен!', 'success');
    }

    showUserStats() {
        const stats = this.calculateUserStats();
        
        const statsHtml = `
            <div class="content-card">
                <h2>📈 Статистика пользователей</h2>
                <div class="grid-3">
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalUsers}</div>
                        <div class="stat-label">Всего пользователей</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.activeUsers}</div>
                        <div class="stat-label">Активных пользователей</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.newUsersToday}</div>
                        <div class="stat-label">Новых сегодня</div>
                    </div>
                </div>
                
                <div class="content-card mt-3">
                    <h3>📊 Распределение по уровням</h3>
                    <div class="grid-4">
                        ${Object.entries(stats.levels).map(([level, count]) => `
                            <div class="text-center">
                                <div class="stat-number">${count}</div>
                                <div class="stat-label">${level}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="content-card mt-3">
                    <h3>🎯 Активность пользователей</h3>
                    <div class="grid-2">
                        <div>
                            <p><strong>Среднее количество искр:</strong> ${stats.avgSparks.toFixed(1)}</p>
                            <p><strong>Среднее количество квизов:</strong> ${stats.avgQuizzes.toFixed(1)}</p>
                            <p><strong>Среднее количество марафонов:</strong> ${stats.avgMarathons.toFixed(1)}</p>
                        </div>
                        <div>
                            <p><strong>Среднее количество работ:</strong> ${stats.avgWorks.toFixed(1)}</p>
                            <p><strong>Процент завершенных марафонов:</strong> ${stats.marathonCompletionRate}%</p>
                            <p><strong>Процент активных пользователей:</strong> ${stats.activeUserPercentage}%</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3 class="modal-title">📈 Статистика пользователей</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${statsHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    calculateUserStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const activeUsers = this.data.users.filter(user => {
            const lastActive = new Date(user.last_active);
            const daysAgo = (now - lastActive) / (1000 * 60 * 60 * 24);
            return daysAgo <= 7;
        }).length;

        const newUsersToday = this.data.users.filter(user => {
            const regDate = new Date(user.registration_date);
            return regDate >= today;
        }).length;

        const levels = {};
        this.data.users.forEach(user => {
            levels[user.level] = (levels[user.level] || 0) + 1;
        });

        const avgSparks = this.data.users.reduce((sum, user) => sum + user.sparks, 0) / this.data.users.length;
        const avgQuizzes = this.data.users.reduce((sum, user) => sum + user.total_quizzes, 0) / this.data.users.length;
        const avgMarathons = this.data.users.reduce((sum, user) => sum + user.total_marathons, 0) / this.data.users.length;
        const avgWorks = this.data.users.reduce((sum, user) => sum + user.total_works, 0) / this.data.users.length;

        const marathonCompletionRate = this.data.users.length > 0 ? 
            (this.data.users.filter(user => user.total_marathons > 0).length / this.data.users.length * 100).toFixed(1) : 0;

        const activeUserPercentage = (activeUsers / this.data.users.length * 100).toFixed(1);

        return {
            totalUsers: this.data.users.length,
            activeUsers,
            newUsersToday,
            levels,
            avgSparks,
            avgQuizzes,
            avgMarathons,
            avgWorks,
            marathonCompletionRate,
            activeUserPercentage
        };
    }
}

// Инициализация админ панели
const adminPanel = new AdminPanel();
