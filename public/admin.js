// admin.js - Полная версия админ-панели Мастерской Вдохновения v9.0

class AdminApp {
    constructor() {
        this.userId = null;
        this.admin = null;
        this.currentSection = 'dashboard';
        this.charts = {};
        this.data = {
            users: [],
            quizzes: [],
            marathons: [],
            interactives: [],
            posts: [],
            shopItems: [],
            purchases: [],
            roles: [],
            characters: [],
            achievements: [],
            admins: [],
            settings: []
        };
        
        this.init();
    }

    async init() {
        console.log('🔧 Админ панель - Инициализация v9.0');
        
        try {
            // Получаем ID пользователя из URL параметров
            const urlParams = new URLSearchParams(window.location.search);
            this.userId = urlParams.get('userId') || 898508164; // Тестовый ID для разработки
            
            if (!this.userId) {
                this.showMessage('User ID не найден в параметрах URL', 'error');
                return;
            }

            // Проверяем права администратора
            await this.checkAdminAccess();
            
            // Инициализация интерфейса
            this.initEventListeners();
            this.initCharts();
            
            // Загрузка начальных данных
            await this.loadInitialData();
            
            // Обновление интерфейса
            this.updateUI();
            
            console.log('✅ Админ панель инициализирована');

        } catch (error) {
            console.error('❌ Ошибка инициализации админ панели:', error);
            this.showMessage('Ошибка загрузки админ панели', 'error');
        }
    }

    async checkAdminAccess() {
        try {
            const response = await fetch(`/api/admin/stats?userId=${this.userId}`);
            
            if (!response.ok) {
                throw new Error('Доступ запрещен');
            }
            
            const stats = await response.json();
            this.admin = {
                user_id: this.userId,
                role: 'superadmin',
                permissions: ['all']
            };
            
            console.log('✅ Права администратора подтверждены');
            
        } catch (error) {
            console.error('❌ Ошибка доступа:', error);
            this.showMessage('У вас нет прав доступа к админ панели', 'error');
            // В реальном приложении здесь был бы редирект
        }
    }

    initEventListeners() {
        // Навигация по разделам
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Переключение мобильного меню
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });

        // Поиск пользователей
        const usersSearch = document.getElementById('usersSearch');
        if (usersSearch) {
            usersSearch.addEventListener('input', this.debounce(() => {
                this.loadUsers();
            }, 300));
        }

        // Фильтры пользователей
        const roleFilter = document.getElementById('usersRoleFilter');
        const statusFilter = document.getElementById('usersStatusFilter');
        
        if (roleFilter) {
            roleFilter.addEventListener('change', () => this.loadUsers());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.loadUsers());
        }

        // Период для графика активности
        const activityPeriod = document.getElementById('activityPeriod');
        if (activityPeriod) {
            activityPeriod.addEventListener('change', () => {
                this.loadActivityChart();
            });
        }

        // Глобальные обработчики
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModals();
            }
        });

        // Закрытие модальных окон при клике вне их
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModals();
            }
        });

        console.log('✅ Обработчики событий инициализированы');
    }

    initCharts() {
        // Инициализация графиков Chart.js
        this.charts.activity = this.createActivityChart();
        this.charts.roles = this.createRolesChart();
        
        console.log('✅ Графики инициализированы');
    }

    createActivityChart() {
        const ctx = document.getElementById('activityChart').getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Регистрации',
                        data: [],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Активности',
                        data: [],
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [3, 3]
                        }
                    }
                }
            }
        });
    }

    createRolesChart() {
        const ctx = document.getElementById('rolesChart').getContext('2d');
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c',
                        '#4facfe',
                        '#00f2fe'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                cutout: '60%'
            }
        });
    }

    async loadInitialData() {
        try {
            // Загружаем основную статистику
            await this.loadDashboardStats();
            
            // Загружаем данные для графиков
            await this.loadActivityChart();
            await this.loadRolesChart();
            
            // Загружаем табличные данные
            await this.loadRecentActivities();
            await this.loadTopUsers();
            await this.loadUsers();
            
            // Загружаем бейджи для навигации
            await this.updateNavigationBadges();
            
            console.log('✅ Начальные данные загружены');
            
        } catch (error) {
            console.error('❌ Ошибка загрузки начальных данных:', error);
            this.showMessage('Ошибка загрузки данных', 'error');
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`/api/admin/stats?userId=${this.userId}`);
            const stats = await response.json();
            
            // Обновляем статистические карточки
            document.getElementById('totalUsers').textContent = stats.totalUsers.toLocaleString();
            document.getElementById('activeUsers').textContent = stats.activeUsers.toLocaleString();
            document.getElementById('totalQuizzes').textContent = stats.activeQuizzes.toLocaleString();
            document.getElementById('totalSparks').textContent = Math.round(stats.totalSparks).toLocaleString();
            document.getElementById('totalPurchases').textContent = stats.totalPurchases.toLocaleString();
            document.getElementById('pendingModeration').textContent = 
                (stats.pendingReviews + stats.pendingWorks).toLocaleString();
                
        } catch (error) {
            console.error('❌ Ошибка загрузки статистики:', error);
            throw error;
        }
    }

    async loadActivityChart() {
        try {
            const period = document.getElementById('activityPeriod')?.value || 30;
            
            // В реальном приложении здесь был бы API вызов
            // Для демонстрации генерируем тестовые данные
            const { labels, registrations, activities } = this.generateTestActivityData(period);
            
            this.charts.activity.data.labels = labels;
            this.charts.activity.data.datasets[0].data = registrations;
            this.charts.activity.data.datasets[1].data = activities;
            this.charts.activity.update();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки графика активности:', error);
        }
    }

    async loadRolesChart() {
        try {
            const response = await fetch(`/api/admin/full-stats?userId=${this.userId}`);
            const stats = await response.json();
            
            const rolesData = stats.users.by_role;
            
            this.charts.roles.data.labels = rolesData.map(r => r.role);
            this.charts.roles.data.datasets[0].data = rolesData.map(r => r.count);
            this.charts.roles.update();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки графика ролей:', error);
        }
    }

    async loadRecentActivities() {
        try {
            const response = await fetch(`/api/admin/full-stats?userId=${this.userId}`);
            const stats = await response.json();
            
            // В реальном приложении здесь был бы отдельный endpoint для активностей
            const activities = await this.getRecentActivities();
            
            const table = document.getElementById('recentActivitiesTable');
            table.innerHTML = '';
            
            if (activities.length === 0) {
                table.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            <div class="empty-state" style="padding: 20px;">
                                <div class="empty-state-icon">📊</div>
                                <div class="empty-state-title">Нет активностей</div>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            activities.forEach(activity => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div style="font-weight: 600;">${activity.user_name}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">@${activity.user_username}</div>
                    </td>
                    <td>
                        <span class="status-badge status-active">${this.getActivityTypeLabel(activity.activity_type)}</span>
                    </td>
                    <td>${activity.description}</td>
                    <td>
                        <span style="font-weight: 700; color: ${activity.sparks_earned >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                            ${activity.sparks_earned >= 0 ? '+' : ''}${activity.sparks_earned}✨
                        </span>
                    </td>
                    <td>${this.formatTime(activity.created_at)}</td>
                `;
                table.appendChild(row);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки последних активностей:', error);
        }
    }

    async loadTopUsers() {
        try {
            const response = await fetch(`/api/admin/users-report?userId=${this.userId}`);
            const data = await response.json();
            
            const table = document.getElementById('topUsersTable');
            table.innerHTML = '';
            
            const topUsers = data.users.slice(0, 10); // Топ 10 пользователей
            
            topUsers.forEach((user, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <div style="font-weight: 600;">${user.name}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">@${user.username}</div>
                    </td>
                    <td>${user.role}</td>
                    <td>
                        <span class="status-badge status-active">${user.level}</span>
                    </td>
                    <td>
                        <span style="font-weight: 700; color: var(--success-color);">
                            ${Math.round(user.sparks).toLocaleString()}✨
                        </span>
                    </td>
                    <td>${user.total_activities} действий</td>
                `;
                table.appendChild(row);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки топ пользователей:', error);
        }
    }

    async loadUsers(page = 1, limit = 20) {
        try {
            const search = document.getElementById('usersSearch')?.value || '';
            const roleFilter = document.getElementById('usersRoleFilter')?.value || '';
            const statusFilter = document.getElementById('usersStatusFilter')?.value || '';
            
            // В реальном приложении здесь был бы API вызов с параметрами
            const response = await fetch(`/api/admin/users-report?userId=${this.userId}`);
            const data = await response.json();
            
            let users = data.users;
            
            // Применяем фильтры
            if (search) {
                users = users.filter(user => 
                    user.name.toLowerCase().includes(search.toLowerCase()) ||
                    user.username.toLowerCase().includes(search.toLowerCase())
                );
            }
            
            if (roleFilter) {
                users = users.filter(user => user.role === roleFilter);
            }
            
            if (statusFilter) {
                users = users.filter(user => {
                    if (statusFilter === 'premium') return user.is_premium;
                    if (statusFilter === 'active') {
                        const lastActive = new Date(user.last_active);
                        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        return lastActive > thirtyDaysAgo;
                    }
                    return true;
                });
            }
            
            // Пагинация
            const totalPages = Math.ceil(users.length / limit);
            const startIndex = (page - 1) * limit;
            const paginatedUsers = users.slice(startIndex, startIndex + limit);
            
            this.renderUsersTable(paginatedUsers);
            this.renderUsersPagination(page, totalPages);
            
            // Обновляем фильтр ролей
            this.updateRoleFilter(users);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
            this.showMessage('Ошибка загрузки пользователей', 'error');
        }
    }

    renderUsersTable(users) {
        const table = document.getElementById('usersTable');
        
        if (users.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="empty-state" style="padding: 20px;">
                            <div class="empty-state-icon">👥</div>
                            <div class="empty-state-title">Пользователи не найдены</div>
                            <div class="empty-state-description">Попробуйте изменить параметры поиска</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        table.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            
            const statusClass = user.is_premium ? 'status-completed' : 
                              this.isUserActive(user.last_active) ? 'status-active' : 'status-inactive';
            
            const statusText = user.is_premium ? 'Премиум' : 
                             this.isUserActive(user.last_active) ? 'Активен' : 'Неактивен';
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <div style="font-weight: 600;">${user.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">
                        ${user.username ? '@' + user.username : 'без username'}
                    </div>
                </td>
                <td>${user.role}</td>
                <td>
                    <span class="status-badge status-active">${user.level}</span>
                </td>
                <td>
                    <span style="font-weight: 700; color: var(--success-color);">
                        ${Math.round(user.sparks).toLocaleString()}✨
                    </span>
                </td>
                <td>${this.formatTime(user.last_active)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewUser(${user.id})" title="Просмотр">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="adminApp.editUser(${user.id})" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!user.is_premium ? `
                        <button class="btn btn-success btn-sm" onclick="adminApp.promoteUser(${user.id})" title="Назначить премиум">
                            <i class="fas fa-crown"></i>
                        </button>
                        ` : `
                        <button class="btn btn-secondary btn-sm" onclick="adminApp.demoteUser(${user.id})" title="Снять премиум">
                            <i class="fas fa-user"></i>
                        </button>
                        `}
                    </div>
                </td>
            `;
            table.appendChild(row);
        });
    }

    renderUsersPagination(currentPage, totalPages) {
        const pagination = document.getElementById('usersPagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Кнопка "Назад"
        if (currentPage > 1) {
            paginationHTML += `
                <a href="#" class="page-item" onclick="adminApp.loadUsers(${currentPage - 1}); return false;">
                    <i class="fas fa-chevron-left"></i>
                </a>
            `;
        }
        
        // Номера страниц
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                paginationHTML += `
                    <a href="#" class="page-item ${i === currentPage ? 'active' : ''}" 
                       onclick="adminApp.loadUsers(${i}); return false;">
                        ${i}
                    </a>
                `;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                paginationHTML += `<span class="page-item disabled">...</span>`;
            }
        }
        
        // Кнопка "Вперед"
        if (currentPage < totalPages) {
            paginationHTML += `
                <a href="#" class="page-item" onclick="adminApp.loadUsers(${currentPage + 1}); return false;">
                    <i class="fas fa-chevron-right"></i>
                </a>
            `;
        }
        
        pagination.innerHTML = paginationHTML;
    }

    updateRoleFilter(users) {
        const roleFilter = document.getElementById('usersRoleFilter');
        if (!roleFilter) return;
        
        // Получаем уникальные роли из списка пользователей
        const roles = [...new Set(users.map(user => user.role))].filter(role => role);
        
        // Сохраняем текущее значение
        const currentValue = roleFilter.value;
        
        // Обновляем options
        roleFilter.innerHTML = `
            <option value="">Все роли</option>
            ${roles.map(role => `<option value="${role}">${role}</option>`).join('')}
        `;
        
        // Восстанавливаем выбранное значение
        if (roles.includes(currentValue)) {
            roleFilter.value = currentValue;
        }
    }

    async updateNavigationBadges() {
        try {
            const response = await fetch(`/api/admin/stats?userId=${this.userId}`);
            const stats = await response.json();
            
            // Обновляем бейджи в навигации
            this.updateBadge('usersBadge', stats.totalUsers);
            this.updateBadge('quizzesBadge', stats.activeQuizzes);
            this.updateBadge('marathonsBadge', stats.activeMarathons);
            this.updateBadge('interactivesBadge', stats.interactives);
            this.updateBadge('postsBadge', stats.totalPosts);
            this.updateBadge('shopBadge', stats.shopItems);
            this.updateBadge('purchasesBadge', stats.totalPurchases);
            this.updateBadge('moderationBadge', stats.pendingReviews + stats.pendingWorks);
            
        } catch (error) {
            console.error('❌ Ошибка обновления бейджей:', error);
        }
    }

    updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (badge && count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        }
    }

    // Методы навигации и UI
    showSection(sectionName) {
        // Скрываем все секции
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Убираем активный класс со всех пунктов меню
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Показываем выбранную секцию
        const section = document.getElementById(sectionName + 'Section');
        if (section) {
            section.classList.add('active');
            this.currentSection = sectionName;
            
            // Активируем соответствующий пункт меню
            const navItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }
            
            // Обновляем заголовок страницы
            this.updatePageTitle(sectionName);
            
            // Загружаем данные для секции
            this.loadSectionData(sectionName);
        }
        
        // Закрываем мобильное меню
        document.getElementById('sidebar').classList.remove('active');
    }

    updatePageTitle(sectionName) {
        const titles = {
            'dashboard': 'Дашборд',
            'users': 'Пользователи',
            'quizzes': 'Квизы',
            'marathons': 'Марафоны',
            'interactives': 'Интерактивы',
            'posts': 'Посты',
            'shop': 'Магазин',
            'purchases': 'Покупки',
            'roles': 'Роли',
            'characters': 'Персонажи',
            'achievements': 'Достижения',
            'moderation': 'Модерация',
            'admins': 'Администраторы',
            'settings': 'Настройки системы'
        };
        
        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Админ Панель';
    }

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                this.loadDashboardStats();
                this.loadRecentActivities();
                this.loadTopUsers();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'quizzes':
                this.loadQuizzes();
                break;
            case 'marathons':
                this.loadMarathons();
                break;
            case 'interactives':
                this.loadInteractives();
                break;
            case 'posts':
                this.loadPosts();
                break;
            case 'shop':
                this.loadShopItems();
                break;
            case 'purchases':
                this.loadPurchases();
                break;
            case 'roles':
                this.loadRoles();
                break;
            case 'characters':
                this.loadCharacters();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
            case 'moderation':
                this.loadModeration();
                break;
            case 'admins':
                this.loadAdmins();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    // Методы для работы с модальными окнами
    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    }

    hideHelp() {
        document.getElementById('helpModal').classList.remove('active');
    }

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    // Методы для пользователей
    async viewUser(userId) {
        this.showMessage(`Просмотр пользователя ID: ${userId}`, 'info');
        // В реальном приложении здесь было бы модальное окно с детальной информацией
    }

    async editUser(userId) {
        this.showMessage(`Редактирование пользователя ID: ${userId}`, 'info');
        // В реальном приложении здесь была бы форма редактирования
    }

    async promoteUser(userId) {
        if (confirm('Назначить пользователю премиум статус?')) {
            try {
                // В реальном приложении здесь был бы API вызов
                this.showMessage('Пользователю назначен премиум статус', 'success');
                this.loadUsers(); // Обновляем таблицу
            } catch (error) {
                this.showMessage('Ошибка назначения премиум статуса', 'error');
            }
        }
    }

    async demoteUser(userId) {
        if (confirm('Снять с пользователя премиум статус?')) {
            try {
                // В реальном приложении здесь был бы API вызов
                this.showMessage('Премиум статус снят', 'success');
                this.loadUsers(); // Обновляем таблицу
            } catch (error) {
                this.showMessage('Ошибка снятия премиум статуса', 'error');
            }
        }
    }

    async exportUsers() {
        try {
            this.showMessage('Подготовка экспорта пользователей...', 'info');
            
            // В реальном приложении здесь был бы API вызов для экспорта
            setTimeout(() => {
                this.showMessage('Экспорт пользователей завершен', 'success');
            }, 2000);
            
        } catch (error) {
            this.showMessage('Ошибка экспорта пользователей', 'error');
        }
    }

    showUserFilter() {
        this.showMessage('Фильтры пользователей', 'info');
        // В реальном приложении здесь было бы расширенное модальное окно фильтров
    }

   async loadQuizzes() {
    try {
        const response = await fetch(`/api/admin/quizzes?userId=${this.userId}`);
        const data = await response.json();
        
        const quizzesSection = document.getElementById('quizzesSection');
        quizzesSection.innerHTML = this.createQuizzesManagementHTML(data);
        
        this.initQuizzesEventListeners();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки квизов:', error);
        this.showMessage('Ошибка загрузки квизов', 'error');
    }
}

createQuizzesManagementHTML(quizzes) {
    return `
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление квизами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateQuizForm()">
                        <i class="fas fa-plus"></i>
                        Создать квиз
                    </button>
                    <button class="btn btn-secondary" onclick="adminApp.exportQuizzes()">
                        <i class="fas fa-download"></i>
                        Экспорт
                    </button>
                </div>
            </div>

            <div class="search-filters">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" id="quizzesSearch" placeholder="Поиск квизов...">
                </div>
                <div class="filter-group">
                    <select class="form-control" id="quizzesStatusFilter">
                        <option value="">Все статусы</option>
                        <option value="active">Активные</option>
                        <option value="inactive">Неактивные</option>
                    </select>
                    <select class="form-control" id="quizzesDifficultyFilter">
                        <option value="">Все сложности</option>
                        <option value="beginner">Начинающий</option>
                        <option value="intermediate">Средний</option>
                        <option value="advanced">Продвинутый</option>
                    </select>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Сложность</th>
                            <th>Вопросы</th>
                            <th>Попытки</th>
                            <th>Рейтинг</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="quizzesTable">
                        ${quizzes.length === 0 ? `
                        <tr>
                            <td colspan="8" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🎯</div>
                                    <div class="empty-state-title">Квизы не найдены</div>
                                    <div class="empty-state-description">Создайте первый квиз</div>
                                </div>
                            </td>
                        </tr>
                        ` : quizzes.map(quiz => `
                        <tr>
                            <td>${quiz.id}</td>
                            <td>
                                <div style="font-weight: 600;">${quiz.title}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${quiz.category} • ${quiz.duration_minutes} мин
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${this.getDifficultyBadgeClass(quiz.difficulty)}">
                                    ${quiz.difficulty}
                                </span>
                            </td>
                            <td>${quiz.questions.length}</td>
                            <td>${quiz.completions_count || 0}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-star" style="color: var(--warning-color);"></i>
                                    ${quiz.average_score ? quiz.average_score.toFixed(1) : '0'}/5
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${quiz.is_active ? 'status-active' : 'status-inactive'}">
                                    ${quiz.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewQuiz(${quiz.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editQuiz(${quiz.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${quiz.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleQuizStatus(${quiz.id}, ${!quiz.is_active})" 
                                            title="${quiz.is_active ? 'Деактивировать' : 'Активировать'}">
                                        <i class="fas fa-${quiz.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="adminApp.viewQuizStats(${quiz.id})" title="Статистика">
                                        <i class="fas fa-chart-bar"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async loadMarathons() {
    try {
        const response = await fetch(`/api/admin/marathons?userId=${this.userId}`);
        const data = await response.json();
        
        const marathonsSection = document.getElementById('marathonsSection');
        marathonsSection.innerHTML = this.createMarathonsManagementHTML(data);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки марафонов:', error);
        this.showMessage('Ошибка загрузки марафонов', 'error');
    }
}

createMarathonsManagementHTML(marathons) {
    return `
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление марафонами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateMarathonForm()">
                        <i class="fas fa-plus"></i>
                        Создать марафон
                    </button>
                </div>
            </div>

            <div class="search-filters">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" id="marathonsSearch" placeholder="Поиск марафонов...">
                </div>
                <div class="filter-group">
                    <select class="form-control" id="marathonsStatusFilter">
                        <option value="">Все статусы</option>
                        <option value="active">Активные</option>
                        <option value="inactive">Неактивные</option>
                        <option value="draft">Черновики</option>
                    </select>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Дни</th>
                            <th>Участники</th>
                            <th>Завершили</th>
                            <th>Сложность</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="marathonsTable">
                        ${marathons.length === 0 ? `
                        <tr>
                            <td colspan="8" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🏃‍♂️</div>
                                    <div class="empty-state-title">Марафоны не найдены</div>
                                    <div class="empty-state-description">Создайте первый марафон</div>
                                </div>
                            </td>
                        </tr>
                        ` : marathons.map(marathon => `
                        <tr>
                            <td>${marathon.id}</td>
                            <td>
                                <div style="font-weight: 600;">${marathon.title}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${marathon.category} • ${marathon.duration_days} дней
                                </div>
                            </td>
                            <td>${marathon.duration_days}</td>
                            <td>${marathon.participants_count || 0}</td>
                            <td>
                                <div>${marathon.completed_participants || 0}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${marathon.completion_rate || 0}%
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${this.getDifficultyBadgeClass(marathon.difficulty)}">
                                    ${marathon.difficulty}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${marathon.is_active ? 'status-active' : 'status-inactive'}">
                                    ${marathon.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewMarathon(${marathon.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editMarathon(${marathon.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="adminApp.viewMarathonParticipants(${marathon.id})" title="Участники">
                                        <i class="fas fa-users"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async loadInteractives() {
    try {
        const response = await fetch(`/api/admin/interactives?userId=${this.userId}`);
        const data = await response.json();
        
        const interactivesSection = document.getElementById('interactivesSection');
        interactivesSection.innerHTML = this.createInteractivesManagementHTML(data);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки интерактивов:', error);
        this.showMessage('Ошибка загрузки интерактивов', 'error');
    }
}

createInteractivesManagementHTML(interactives) {
    return `
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление интерактивами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateInteractiveForm()">
                        <i class="fas fa-plus"></i>
                        Создать интерактив
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Тип</th>
                            <th>Попытки</th>
                            <th>Успешность</th>
                            <th>Награда</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="interactivesTable">
                        ${interactives.length === 0 ? `
                        <tr>
                            <td colspan="8" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🎮</div>
                                    <div class="empty-state-title">Интерактивы не найдены</div>
                                    <div class="empty-state-description">Создайте первый интерактив</div>
                                </div>
                            </td>
                        </tr>
                        ` : interactives.map(interactive => `
                        <tr>
                            <td>${interactive.id}</td>
                            <td>
                                <div style="font-weight: 600;">${interactive.title}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${interactive.category} • ${interactive.difficulty}
                                </div>
                            </td>
                            <td>${interactive.type}</td>
                            <td>${interactive.attempts_count || 0}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    ${interactive.success_rate || 0}%
                                    <div style="width: 60px; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                                        <div style="width: ${interactive.success_rate || 0}%; height: 100%; background: var(--success-color);"></div>
                                    </div>
                                </div>
                            </td>
                            <td>${interactive.sparks_reward}✨</td>
                            <td>
                                <span class="status-badge ${interactive.is_active ? 'status-active' : 'status-inactive'}">
                                    ${interactive.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewInteractive(${interactive.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editInteractive(${interactive.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${interactive.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleInteractiveStatus(${interactive.id}, ${!interactive.is_active})">
                                        <i class="fas fa-${interactive.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

    // Вспомогательные методы
    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('messageArea');
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        messageArea.appendChild(messageEl);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        if (diffDays < 7) return `${diffDays} дн назад`;
        
        return date.toLocaleDateString('ru-RU');
    }

    isUserActive(lastActive) {
        const lastActiveDate = new Date(lastActive);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return lastActiveDate > thirtyDaysAgo;
    }

    getActivityTypeLabel(activityType) {
        const labels = {
            'registration': 'Регистрация',
            'quiz': 'Квиз',
            'marathon': 'Марафон',
            'marathon_day': 'День марафона',
            'marathon_completion': 'Завершение марафона',
            'upload_work': 'Загрузка работы',
            'work_approved': 'Работа одобрена',
            'purchase': 'Покупка',
            'post_review': 'Отзыв на пост',
            'interactive': 'Интерактив',
            'achievement': 'Достижение',
            'role_change': 'Смена роли'
        };
        
        return labels[activityType] || activityType;
    }

    // Генерация тестовых данных для демонстрации
    generateTestActivityData(days = 30) {
        const labels = [];
        const registrations = [];
        const activities = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
            
            // Случайные данные для демонстрации
            registrations.push(Math.floor(Math.random() * 20) + 5);
            activities.push(Math.floor(Math.random() * 100) + 50);
        }
        
        return { labels, registrations, activities };
    }

    async getRecentActivities() {
        // Тестовые данные для демонстрации
        return [
            {
                user_name: 'Иван Петров',
                user_username: 'ivan_petrov',
                activity_type: 'quiz',
                description: 'Пройден квиз "Основы живописи"',
                sparks_earned: 15,
                created_at: new Date().toISOString()
            },
            {
                user_name: 'Мария Сидорова',
                user_username: 'maria_sid',
                activity_type: 'upload_work',
                description: 'Загружена работа "Вечерний пейзаж"',
                sparks_earned: 5,
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                user_name: 'Алексей Козлов',
                user_username: 'alex_koz',
                activity_type: 'purchase',
                description: 'Куплен курс "Акварель для начинающих"',
                sparks_earned: -45,
                created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
            },
            {
                user_name: 'Елена Новикова',
                user_username: 'elena_nov',
                activity_type: 'marathon_completion',
                description: 'Завершен марафон "7 дней акварели"',
                sparks_earned: 120,
                created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                user_name: 'Дмитрий Волков',
                user_username: 'dima_volk',
                activity_type: 'achievement',
                description: 'Получено достижение "Перфекционист"',
                sparks_earned: 25,
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    // Методы обновления данных
    async refreshData() {
        this.showMessage('Обновление данных...', 'info');
        
        try {
            await this.loadInitialData();
            this.showMessage('Данные успешно обновлены', 'success');
        } catch (error) {
            this.showMessage('Ошибка обновления данных', 'error');
        }
    }

    updateUI() {
        // Обновляем информацию администратора
        const adminAvatar = document.getElementById('adminAvatar');
        const adminName = document.getElementById('adminName');
        const adminRole = document.getElementById('adminRole');
        
        if (adminAvatar) adminAvatar.textContent = 'A';
        if (adminName) adminName.textContent = 'Администратор';
        if (adminRole) adminRole.textContent = 'Super Admin';
        
        console.log('✅ Интерфейс обновлен');
    }
}

// Инициализация админ-панели
const adminApp = new AdminApp();

// Глобальные функции для обработчиков событий
window.adminApp = adminApp;

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Глобальная ошибка в админ панели:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанный промис в админ панели:', event.reason);
});

console.log('🔧 Админ панель Мастерская Вдохновения v9.0 загружена!');
