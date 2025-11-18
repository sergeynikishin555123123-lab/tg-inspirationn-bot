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

async loadPosts() {
    try {
        const response = await fetch(`/api/admin/posts?userId=${this.userId}`);
        const data = await response.json();
        
        const postsSection = document.getElementById('postsSection');
        postsSection.innerHTML = this.createPostsManagementHTML(data.posts);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки постов:', error);
        this.showMessage('Ошибка загрузки постов', 'error');
    }
}

createPostsManagementHTML(posts) {
    return `
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление постами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreatePostForm()">
                        <i class="fas fa-plus"></i>
                        Создать пост
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Заголовок</th>
                            <th>Тип</th>
                            <th>Просмотры</th>
                            <th>Лайки</th>
                            <th>Отзывы</th>
                            <th>Рейтинг</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="postsTable">
                        ${posts.length === 0 ? `
                        <tr>
                            <td colspan="9" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">📰</div>
                                    <div class="empty-state-title">Посты не найдены</div>
                                    <div class="empty-state-description">Создайте первый пост</div>
                                </div>
                            </td>
                        </tr>
                        ` : posts.map(post => `
                        <tr>
                            <td>${post.id}</td>
                            <td>
                                <div style="font-weight: 600;">${post.title}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${post.excerpt}
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${post.media_type === 'text' ? 'status-active' : 'status-completed'}">
                                    ${post.media_type}
                                </span>
                            </td>
                            <td>${post.views_count}</td>
                            <td>${post.likes_count}</td>
                            <td>${post.reviews_count}</td>
                            <td>
                                ${post.average_rating > 0 ? `
                                <div style="display: flex; align-items: center; gap: 4px;">
                                    <i class="fas fa-star" style="color: var(--warning-color);"></i>
                                    ${post.average_rating.toFixed(1)}
                                </div>
                                ` : 'Нет оценок'}
                            </td>
                            <td>
                                <span class="status-badge ${post.is_active ? 'status-active' : 'status-inactive'}">
                                    ${post.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                                ${post.featured ? '<br><span class="status-badge status-completed" style="margin-top: 4px;">⭐ Избранный</span>' : ''}
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewPost(${post.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editPost(${post.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${post.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.togglePostStatus(${post.id}, ${!post.is_active})">
                                        <i class="fas fa-${post.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    ${!post.featured ? `
                                    <button class="btn btn-info btn-sm" onclick="adminApp.featurePost(${post.id})" title="В избранное">
                                        <i class="fas fa-star"></i>
                                    </button>
                                    ` : ''}
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

async loadShopItems() {
    try {
        const response = await fetch(`/api/admin/shop/items?userId=${this.userId}`);
        const items = await response.json();
        
        const shopSection = document.getElementById('shopSection');
        shopSection.innerHTML = this.createShopManagementHTML(items);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки товаров:', error);
        this.showMessage('Ошибка загрузки товаров', 'error');
    }
}

createShopManagementHTML(items) {
    const totalRevenue = items.reduce((sum, item) => sum + item.total_revenue, 0);
    const totalItems = items.length;
    const activeItems = items.filter(item => item.is_active).length;

    return `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">🛒</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        8%
                    </div>
                </div>
                <div class="stat-value">${totalItems}</div>
                <div class="stat-label">Всего товаров</div>
            </div>

            <div class="stat-card success">
                <div class="stat-header">
                    <div class="stat-icon">💰</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        15%
                    </div>
                </div>
                <div class="stat-value">${Math.round(totalRevenue)}✨</div>
                <div class="stat-label">Общий доход</div>
            </div>

            <div class="stat-card warning">
                <div class="stat-header">
                    <div class="stat-icon">✅</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        5%
                    </div>
                </div>
                <div class="stat-value">${activeItems}</div>
                <div class="stat-label">Активных товаров</div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление товарами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateItemForm()">
                        <i class="fas fa-plus"></i>
                        Создать товар
                    </button>
                    <button class="btn btn-secondary" onclick="adminApp.exportShopData()">
                        <i class="fas fa-download"></i>
                        Экспорт
                    </button>
                </div>
            </div>

            <div class="search-filters">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" id="shopSearch" placeholder="Поиск товаров...">
                </div>
                <div class="filter-group">
                    <select class="form-control" id="shopCategoryFilter">
                        <option value="">Все категории</option>
                        <option value="painting">Живопись</option>
                        <option value="art_history">История искусства</option>
                        <option value="fashion">Мода</option>
                        <option value="photography">Фотография</option>
                        <option value="general">Общее</option>
                    </select>
                    <select class="form-control" id="shopStatusFilter">
                        <option value="">Все статусы</option>
                        <option value="active">Активные</option>
                        <option value="inactive">Неактивные</option>
                        <option value="featured">Избранные</option>
                    </select>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Название</th>
                            <th>Тип</th>
                            <th>Цена</th>
                            <th>Покупки</th>
                            <th>Доход</th>
                            <th>Студенты</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="shopTable">
                        ${items.length === 0 ? `
                        <tr>
                            <td colspan="9" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🛒</div>
                                    <div class="empty-state-title">Товары не найдены</div>
                                    <div class="empty-state-description">Создайте первый товар</div>
                                </div>
                            </td>
                        </tr>
                        ` : items.map(item => `
                        <tr>
                            <td>${item.id}</td>
                            <td>
                                <div style="font-weight: 600;">${item.title}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${item.category} • ${item.difficulty}
                                </div>
                            </td>
                            <td>${this.getShopItemType(item.type)}</td>
                            <td>
                                <div style="font-weight: 600;">${item.price}✨</div>
                                ${item.discount_percent > 0 ? `
                                <div style="font-size: 12px; color: var(--success-color);">
                                    -${item.discount_percent}%
                                </div>
                                ` : ''}
                            </td>
                            <td>${item.purchases_count}</td>
                            <td>
                                <div style="font-weight: 600; color: var(--success-color);">
                                    ${item.total_revenue}✨
                                </div>
                            </td>
                            <td>${item.students_count}</td>
                            <td>
                                <span class="status-badge ${item.is_active ? 'status-active' : 'status-inactive'}">
                                    ${item.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                                ${item.featured ? '<br><span class="status-badge status-completed" style="margin-top: 4px;">⭐ Избранный</span>' : ''}
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewItem(${item.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editItem(${item.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${item.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleItemStatus(${item.id}, ${!item.is_active})">
                                        <i class="fas fa-${item.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="adminApp.viewItemStats(${item.id})" title="Статистика">
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

async loadPurchases() {
    try {
        const response = await fetch(`/api/admin/full-stats?userId=${this.userId}`);
        const stats = await response.json();
        
        const purchasesSection = document.getElementById('purchasesSection');
        purchasesSection.innerHTML = this.createPurchasesManagementHTML(stats);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки покупок:', error);
        this.showMessage('Ошибка загрузки покупок', 'error');
    }
}

createPurchasesManagementHTML(stats) {
    const revenueByItem = stats.revenue.by_item || [];
    const totalPurchases = stats.activities.total_purchases;

    return `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">💰</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        12%
                    </div>
                </div>
                <div class="stat-value">${totalPurchases}</div>
                <div class="stat-label">Всего покупок</div>
            </div>

            <div class="stat-card success">
                <div class="stat-header">
                    <div class="stat-icon">📈</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        18%
                    </div>
                </div>
                <div class="stat-value">${Math.round(stats.revenue.total)}✨</div>
                <div class="stat-label">Общий доход</div>
            </div>

            <div class="stat-card warning">
                <div class="stat-header">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        7%
                    </div>
                </div>
                <div class="stat-value">${revenueByItem.length}</div>
                <div class="stat-label">Товаров с продажами</div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Статистика продаж по товарам</h3>
                <div class="table-actions">
                    <button class="btn btn-secondary" onclick="adminApp.exportSalesReport()">
                        <i class="fas fa-download"></i>
                        Отчет по продажам
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Товар</th>
                            <th>Тип</th>
                            <th>Цена</th>
                            <th>Покупки</th>
                            <th>Доход</th>
                            <th>Средний чек</th>
                            <th>Популярность</th>
                        </tr>
                    </thead>
                    <tbody id="purchasesTable">
                        ${revenueByItem.length === 0 ? `
                        <tr>
                            <td colspan="7" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">💰</div>
                                    <div class="empty-state-title">Продажи не найдены</div>
                                    <div class="empty-state-description">Пока нет данных о продажах</div>
                                </div>
                            </td>
                        </tr>
                        ` : revenueByItem.map(item => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${item.item}</div>
                            </td>
                            <td>
                                <span class="status-badge status-active">
                                    ${this.getShopItemType(item.type)}
                                </span>
                            </td>
                            <td>${item.price || 'N/A'}✨</td>
                            <td>${item.purchases}</td>
                            <td>
                                <div style="font-weight: 600; color: var(--success-color);">
                                    ${item.revenue}✨
                                </div>
                            </td>
                            <td>${item.purchases > 0 ? Math.round(item.revenue / item.purchases) : 0}✨</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 100px; height: 6px; background: var(--border-color); border-radius: 3px; overflow: hidden;">
                                        <div style="width: ${(item.purchases / totalPurchases) * 100}%; height: 100%; background: var(--primary-color);"></div>
                                    </div>
                                    <span style="font-size: 12px; color: var(--text-muted);">
                                        ${Math.round((item.purchases / totalPurchases) * 100)}%
                                    </span>
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Последние покупки</h3>
            </div>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Пользователь</th>
                            <th>Товар</th>
                            <th>Цена</th>
                            <th>Дата</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.purchases && stats.purchases.slice(0, 10).map(purchase => `
                        <tr>
                            <td>${purchase.id}</td>
                            <td>
                                <div style="font-weight: 600;">User #${purchase.user_id}</div>
                            </td>
                            <td>${purchase.item_title || 'Unknown Item'}</td>
                            <td>${purchase.price_paid}✨</td>
                            <td>${this.formatTime(purchase.purchased_at)}</td>
                            <td>
                                <span class="status-badge status-completed">
                                    ✅ Завершено
                                </span>
                            </td>
                        </tr>
                        `).join('') || `
                        <tr>
                            <td colspan="6" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">📦</div>
                                    <div class="empty-state-title">Покупки не найдены</div>
                                </div>
                            </td>
                        </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async loadRoles() {
    try {
        const response = await fetch(`/api/admin/roles?userId=${this.userId}`);
        const roles = await response.json();
        
        const rolesSection = document.getElementById('rolesSection');
        rolesSection.innerHTML = this.createRolesManagementHTML(roles);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки ролей:', error);
        this.showMessage('Ошибка загрузки ролей', 'error');
    }
}

createRolesManagementHTML(roles) {
    const totalUsers = roles.reduce((sum, role) => sum + (role.users_count || 0), 0);

    return `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">🎭</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        5%
                    </div>
                </div>
                <div class="stat-value">${roles.length}</div>
                <div class="stat-label">Всего ролей</div>
            </div>

            <div class="stat-card success">
                <div class="stat-header">
                    <div class="stat-icon">👥</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        12%
                    </div>
                </div>
                <div class="stat-value">${totalUsers}</div>
                <div class="stat-label">Пользователей с ролями</div>
            </div>

            <div class="stat-card warning">
                <div class="stat-header">
                    <div class="stat-icon">✅</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        3%
                    </div>
                </div>
                <div class="stat-value">${roles.filter(r => r.is_active).length}</div>
                <div class="stat-label">Активных ролей</div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление ролями</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateRoleForm()">
                        <i class="fas fa-plus"></i>
                        Создать роль
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Роль</th>
                            <th>Описание</th>
                            <th>Пользователи</th>
                            <th>Разрешения</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="rolesTable">
                        ${roles.length === 0 ? `
                        <tr>
                            <td colspan="7" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🎭</div>
                                    <div class="empty-state-title">Роли не найдены</div>
                                    <div class="empty-state-description">Создайте первую роль</div>
                                </div>
                            </td>
                        </tr>
                        ` : roles.map(role => `
                        <tr>
                            <td>${role.id}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="font-size: 20px;">${role.icon}</div>
                                    <div>
                                        <div style="font-weight: 600;">${role.name}</div>
                                        <div style="font-size: 12px; color: var(--text-muted);">
                                            ${role.requirements}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="max-width: 200px;">
                                    ${role.description}
                                </div>
                            </td>
                            <td>
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-lg); font-weight: 800; color: var(--primary-color);">
                                        ${role.users_count || 0}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        пользователей
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 12px;">
                                    ${role.available_buttons ? role.available_buttons.slice(0, 3).join(', ') : 'Нет'}${role.available_buttons && role.available_buttons.length > 3 ? '...' : ''}
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${role.is_active ? 'status-active' : 'status-inactive'}">
                                    ${role.is_active ? 'Активна' : 'Неактивна'}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewRole(${role.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editRole(${role.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${role.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleRoleStatus(${role.id}, ${!role.is_active})">
                                        <i class="fas fa-${role.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    ${role.users_count === 0 ? `
                                    <button class="btn btn-danger btn-sm" onclick="adminApp.deleteRole(${role.id})" title="Удалить">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <h4 style="margin-bottom: 16px;">📊 Распределение по ролям</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                ${roles.filter(role => role.users_count > 0).map(role => `
                <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; margin-bottom: 8px;">${role.icon}</div>
                    <div style="font-size: var(--font-lg); font-weight: 800; color: var(--primary-color);">
                        ${role.users_count}
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">
                        ${role.name}
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                        ${Math.round((role.users_count / totalUsers) * 100)}%
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
    `;
}

async loadCharacters() {
    try {
        const response = await fetch(`/api/admin/characters?userId=${this.userId}`);
        const characters = await response.json();
        
        const charactersSection = document.getElementById('charactersSection');
        charactersSection.innerHTML = this.createCharactersManagementHTML(characters);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки персонажей:', error);
        this.showMessage('Ошибка загрузки персонажей', 'error');
    }
}

createCharactersManagementHTML(characters) {
    return `
        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление персонажами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateCharacterForm()">
                        <i class="fas fa-plus"></i>
                        Создать персонажа
                    </button>
                </div>
            </div>

            <div class="search-filters">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" id="charactersSearch" placeholder="Поиск персонажей...">
                </div>
                <div class="filter-group">
                    <select class="form-control" id="charactersRoleFilter">
                        <option value="">Все роли</option>
                        ${[...new Set(characters.map(c => c.role_name))].filter(name => name).map(name => `
                            <option value="${name}">${name}</option>
                        `).join('')}
                    </select>
                    <select class="form-control" id="charactersRarityFilter">
                        <option value="">Все редкости</option>
                        <option value="common">Обычный</option>
                        <option value="rare">Редкий</option>
                        <option value="epic">Эпический</option>
                        <option value="legendary">Легендарный</option>
                    </select>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Персонаж</th>
                            <th>Роль</th>
                            <th>Бонус</th>
                            <th>Пользователи</th>
                            <th>Редкость</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="charactersTable">
                        ${characters.length === 0 ? `
                        <tr>
                            <td colspan="8" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">👤</div>
                                    <div class="empty-state-title">Персонажи не найдены</div>
                                    <div class="empty-state-description">Создайте первого персонажа</div>
                                </div>
                            </td>
                        </tr>
                        ` : characters.map(character => `
                        <tr>
                            <td>${character.id}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="font-size: 24px;">${character.avatar}</div>
                                    <div>
                                        <div style="font-weight: 600;">${character.name}</div>
                                        <div style="font-size: 12px; color: var(--text-muted); max-width: 200px;">
                                            ${character.description}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge status-active">
                                    ${character.role_name}
                                </span>
                            </td>
                            <td>
                                <div style="font-size: 12px;">
                                    <strong>${character.bonus_type}:</strong> ${character.bonus_value}<br>
                                    <span style="color: var(--text-muted);">${character.bonus_description}</span>
                                </div>
                            </td>
                            <td>${character.users_count || 0}</td>
                            <td>
                                <span class="status-badge ${this.getRarityBadgeClass(character.rarity)}">
                                    ${this.getRarityLabel(character.rarity)}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${character.is_active ? 'status-active' : 'status-inactive'}">
                                    ${character.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewCharacter(${character.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editCharacter(${character.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${character.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleCharacterStatus(${character.id}, ${!character.is_active})">
                                        <i class="fas fa-${character.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    ${character.users_count === 0 ? `
                                    <button class="btn btn-danger btn-sm" onclick="adminApp.deleteCharacter(${character.id})" title="Удалить">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ` : ''}
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

// Вспомогательные методы для редкости
getRarityBadgeClass(rarity) {
    const classes = {
        'common': 'status-active',
        'rare': 'status-completed',
        'epic': 'status-pending',
        'legendary': 'status-inactive'
    };
    return classes[rarity] || 'status-active';
}

getRarityLabel(rarity) {
    const labels = {
        'common': 'Обычный',
        'rare': 'Редкий',
        'epic': 'Эпический',
        'legendary': 'Легендарный'
    };
    return labels[rarity] || rarity;
}

async loadAchievements() {
    try {
        const response = await fetch(`/api/admin/achievements?userId=${this.userId}`);
        const data = await response.json();
        
        const achievementsSection = document.getElementById('achievementsSection');
        achievementsSection.innerHTML = this.createAchievementsManagementHTML(data.achievements || []);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки достижений:', error);
        this.showMessage('Ошибка загрузки достижений', 'error');
    }
}

createAchievementsManagementHTML(achievements) {
    const totalEarned = achievements.reduce((sum, a) => sum + (a.earned_count || 0), 0);
    const activeAchievements = achievements.filter(a => a.is_active).length;

    return `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        8%
                    </div>
                </div>
                <div class="stat-value">${achievements.length}</div>
                <div class="stat-label">Всего достижений</div>
            </div>

            <div class="stat-card success">
                <div class="stat-header">
                    <div class="stat-icon">✅</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        15%
                    </div>
                </div>
                <div class="stat-value">${totalEarned}</div>
                <div class="stat-label">Всего получено</div>
            </div>

            <div class="stat-card warning">
                <div class="stat-header">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        5%
                    </div>
                </div>
                <div class="stat-value">${activeAchievements}</div>
                <div class="stat-label">Активных достижений</div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление достижениями</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateAchievementForm()">
                        <i class="fas fa-plus"></i>
                        Создать достижение
                    </button>
                </div>
            </div>

            <div class="search-filters">
                <div class="search-box">
                    <i class="fas fa-search search-icon"></i>
                    <input type="text" class="search-input" id="achievementsSearch" placeholder="Поиск достижений...">
                </div>
                <div class="filter-group">
                    <select class="form-control" id="achievementsCategoryFilter">
                        <option value="">Все категории</option>
                        <option value="general">Общие</option>
                        <option value="quizzes">Квизы</option>
                        <option value="marathons">Марафоны</option>
                        <option value="works">Работы</option>
                        <option value="social">Социальные</option>
                    </select>
                    <select class="form-control" id="achievementsRarityFilter">
                        <option value="">Все редкости</option>
                        <option value="common">Обычные</option>
                        <option value="rare">Редкие</option>
                        <option value="epic">Эпические</option>
                        <option value="legendary">Легендарные</option>
                    </select>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Достижение</th>
                            <th>Условие</th>
                            <th>Награда</th>
                            <th>Получено</th>
                            <th>Категория</th>
                            <th>Редкость</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="achievementsTable">
                        ${achievements.length === 0 ? `
                        <tr>
                            <td colspan="8" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🏆</div>
                                    <div class="empty-state-title">Достижения не найдены</div>
                                    <div class="empty-state-description">Создайте первое достижение</div>
                                </div>
                            </td>
                        </tr>
                        ` : achievements.map(achievement => `
                        <tr>
                            <td>${achievement.id}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="font-size: 20px;">${achievement.icon}</div>
                                    <div>
                                        <div style="font-weight: 600;">${achievement.title}</div>
                                        <div style="font-size: 12px; color: var(--text-muted);">
                                            ${achievement.description}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 12px;">
                                    <strong>${this.getConditionLabel(achievement.condition_type)}:</strong><br>
                                    ${achievement.condition_value}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 600; color: var(--success-color);">
                                    ${achievement.sparks_reward}✨
                                </div>
                                <div style="font-size: 12px; color: var(--text-muted);">
                                    ${achievement.points} очков
                                </div>
                            </td>
                            <td>
                                <div style="text-align: center;">
                                    <div style="font-size: var(--font-lg); font-weight: 800; color: var(--primary-color);">
                                        ${achievement.earned_count || 0}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        пользователей
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge status-active">
                                    ${achievement.category}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${this.getRarityBadgeClass(achievement.rarity)}">
                                    ${this.getRarityLabel(achievement.rarity)}
                                </span>
                                ${achievement.hidden ? '<br><span class="status-badge status-inactive" style="margin-top: 4px;">👻 Скрытое</span>' : ''}
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-secondary btn-sm" onclick="adminApp.viewAchievement(${achievement.id})" title="Просмотр">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editAchievement(${achievement.id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${achievement.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleAchievementStatus(${achievement.id}, ${!achievement.is_active})">
                                        <i class="fas fa-${achievement.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="adminApp.viewAchievementStats(${achievement.id})" title="Статистика">
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

getConditionLabel(conditionType) {
    const labels = {
        'registration': 'Регистрация',
        'quiz_completion': 'Завершение квизов',
        'work_upload': 'Загрузка работ',
        'sparks_total': 'Всего искр',
        'marathon_completion': 'Завершение марафонов',
        'perfect_quiz': 'Идеальный квиз',
        'interactive_completion': 'Завершение интерактивов',
        'level_reached': 'Достижение уровня'
    };
    return labels[conditionType] || conditionType;
}

async loadModeration() {
    try {
        // Загружаем данные для модерации
        const [worksResponse, reviewsResponse] = await Promise.all([
            fetch(`/api/admin/moderation/works?userId=${this.userId}`),
            fetch(`/api/admin/moderation/reviews?userId=${this.userId}`)
        ]);
        
        const worksData = await worksResponse.json();
        const reviewsData = await reviewsResponse.json();
        
        const moderationSection = document.getElementById('moderationSection');
        moderationSection.innerHTML = this.createModerationManagementHTML(worksData, reviewsData);
        
        this.initModerationEventListeners();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных модерации:', error);
        this.showMessage('Ошибка загрузки данных модерации', 'error');
    }
}

createModerationManagementHTML(worksData, reviewsData) {
    const pendingWorks = worksData.pending_count || 0;
    const pendingReviews = reviewsData.pending_count || 0;
    const totalPending = pendingWorks + pendingReviews;

    return `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card ${pendingWorks > 0 ? 'warning' : ''}">
                <div class="stat-header">
                    <div class="stat-icon">🖼️</div>
                    <div class="stat-trend ${pendingWorks > 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-${pendingWorks > 0 ? 'arrow-up' : 'check'}"></i>
                        ${pendingWorks > 0 ? `${pendingWorks} ожидают` : 'Все проверены'}
                    </div>
                </div>
                <div class="stat-value">${pendingWorks}</div>
                <div class="stat-label">Работ на модерации</div>
            </div>

            <div class="stat-card ${pendingReviews > 0 ? 'warning' : ''}">
                <div class="stat-header">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-trend ${pendingReviews > 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-${pendingReviews > 0 ? 'arrow-up' : 'check'}"></i>
                        ${pendingReviews > 0 ? `${pendingReviews} ожидают` : 'Все проверены'}
                    </div>
                </div>
                <div class="stat-value">${pendingReviews}</div>
                <div class="stat-label">Отзывов на модерации</div>
            </div>

            <div class="stat-card ${totalPending > 0 ? 'danger' : 'success'}">
                <div class="stat-header">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-trend ${totalPending > 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-${totalPending > 0 ? 'exclamation' : 'check'}"></i>
                        ${totalPending > 0 ? 'Требуют внимания' : 'Все чисто'}
                    </div>
                </div>
                <div class="stat-value">${totalPending}</div>
                <div class="stat-label">Всего ожидает модерации</div>
            </div>
        </div>

        <div class="tabs" id="moderationTabs">
            <button class="tab active" data-tab="works">Работы (${pendingWorks})</button>
            <button class="tab" data-tab="reviews">Отзывы (${pendingReviews})</button>
        </div>

        <div class="tab-content active" id="worksTab">
            <div class="table-card">
                <div class="table-header">
                    <h3 class="table-title">Модерация работ</h3>
                    <div class="table-actions">
                        ${pendingWorks > 0 ? `
                        <button class="btn btn-success" onclick="adminApp.approveAllWorks()">
                            <i class="fas fa-check-double"></i>
                            Одобрить все
                        </button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="adminApp.loadModeration()">
                            <i class="fas fa-sync-alt"></i>
                            Обновить
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th width="50">
                                    <input type="checkbox" id="selectAllWorks" onchange="adminApp.toggleSelectAllWorks(this.checked)">
                                </th>
                                <th>Работа</th>
                                <th>Пользователь</th>
                                <th>Категория</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="worksModerationTable">
                            ${worksData.works && worksData.works.length > 0 ? worksData.works.map(work => `
                            <tr>
                                <td>
                                    <input type="checkbox" class="work-checkbox" value="${work.id}">
                                </td>
                                <td>
                                    <div style="font-weight: 600;">${work.title}</div>
                                    <div style="font-size: 12px; color: var(--text-muted); max-width: 300px;">
                                        ${work.description || 'Нет описания'}
                                    </div>
                                    ${work.image_url ? `
                                    <div style="margin-top: 8px;">
                                        <img src="${work.image_url}" alt="${work.title}" style="max-width: 100px; max-height: 80px; border-radius: var(--radius-sm);">
                                    </div>
                                    ` : ''}
                                </td>
                                <td>
                                    <div style="font-weight: 600;">${work.user_name}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        @${work.user_username} • ${work.user_level}
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge status-active">
                                        ${work.category}
                                    </span>
                                </td>
                                <td>${this.formatTime(work.created_at)}</td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-success btn-sm" onclick="adminApp.moderateWork(${work.id}, 'approved')" title="Одобрить">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="adminApp.moderateWork(${work.id}, 'rejected')" title="Отклонить">
                                            <i class="fas fa-times"></i>
                                        </button>
                                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewWorkDetails(${work.id})" title="Просмотр">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            `).join('') : `
                            <tr>
                                <td colspan="6" class="text-center">
                                    <div class="empty-state" style="padding: 20px;">
                                        <div class="empty-state-icon">✅</div>
                                        <div class="empty-state-title">Все работы проверены</div>
                                        <div class="empty-state-description">Нет работ, ожидающих модерации</div>
                                    </div>
                                </td>
                            </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="tab-content" id="reviewsTab">
            <div class="table-card">
                <div class="table-header">
                    <h3 class="table-title">Модерация отзывов</h3>
                    <div class="table-actions">
                        <button class="btn btn-secondary" onclick="adminApp.loadModeration()">
                            <i class="fas fa-sync-alt"></i>
                            Обновить
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Отзыв</th>
                                <th>Пользователь</th>
                                <th>Пост</th>
                                <th>Оценка</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="reviewsModerationTable">
                            ${reviewsData.reviews && reviewsData.reviews.length > 0 ? reviewsData.reviews.map(review => `
                            <tr>
                                <td>
                                    <div style="max-width: 300px;">
                                        <div style="font-weight: 600;">${review.review_text}</div>
                                    </div>
                                </td>
                                <td>
                                    <div style="font-weight: 600;">${review.user_name}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        @${review.user_username}
                                    </div>
                                </td>
                                <td>
                                    <div style="font-size: 12px;">
                                        ${review.post_title}
                                    </div>
                                </td>
                                <td>
                                    <div style="color: var(--warning-color); font-weight: 600;">
                                        ${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                                    </div>
                                </td>
                                <td>${this.formatTime(review.created_at)}</td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-success btn-sm" onclick="adminApp.moderateReview(${review.id}, 'approved')" title="Одобрить">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="adminApp.moderateReview(${review.id}, 'rejected')" title="Отклонить">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            `).join('') : `
                            <tr>
                                <td colspan="6" class="text-center">
                                    <div class="empty-state" style="padding: 20px;">
                                        <div class="empty-state-icon">✅</div>
                                        <div class="empty-state-title">Все отзывы проверены</div>
                                        <div class="empty-state-description">Нет отзывов, ожидающих модерации</div>
                                    </div>
                                </td>
                            </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async loadAdmins() {
    try {
        const response = await fetch(`/api/admin/admins?userId=${this.userId}`);
        const data = await response.json();
        
        const adminsSection = document.getElementById('adminsSection');
        adminsSection.innerHTML = this.createAdminsManagementHTML(data.admins || []);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки администраторов:', error);
        this.showMessage('Ошибка загрузки администраторов', 'error');
    }
}

createAdminsManagementHTML(admins) {
    const superAdmins = admins.filter(a => a.role === 'superadmin').length;
    const moderators = admins.filter(a => a.role === 'moderator').length;
    const activeAdmins = admins.filter(a => a.is_active).length;

    return `
        <div class="stats-grid" style="margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-header">
                    <div class="stat-icon">🔧</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        2%
                    </div>
                </div>
                <div class="stat-value">${admins.length}</div>
                <div class="stat-label">Всего администраторов</div>
            </div>

            <div class="stat-card success">
                <div class="stat-header">
                    <div class="stat-icon">👑</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        0%
                    </div>
                </div>
                <div class="stat-value">${superAdmins}</div>
                <div class="stat-label">Суперадминов</div>
            </div>

            <div class="stat-card warning">
                <div class="stat-header">
                    <div class="stat-icon">🛡️</div>
                    <div class="stat-trend trend-up">
                        <i class="fas fa-arrow-up"></i>
                        5%
                    </div>
                </div>
                <div class="stat-value">${moderators}</div>
                <div class="stat-label">Модераторов</div>
            </div>
        </div>

        <div class="table-card">
            <div class="table-header">
                <h3 class="table-title">Управление администраторами</h3>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="adminApp.showCreateAdminForm()">
                        <i class="fas fa-plus"></i>
                        Добавить администратора
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Администратор</th>
                            <th>Роль</th>
                            <th>Разрешения</th>
                            <th>Активность</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody id="adminsTable">
                        ${admins.length === 0 ? `
                        <tr>
                            <td colspan="7" class="text-center">
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-icon">🔧</div>
                                    <div class="empty-state-title">Администраторы не найдены</div>
                                    <div class="empty-state-description">Добавьте первого администратора</div>
                                </div>
                            </td>
                        </tr>
                        ` : admins.map(admin => `
                        <tr>
                            <td>${admin.user_id}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div class="admin-avatar" style="width: 32px; height: 32px; font-size: 14px;">
                                        ${admin.tg_first_name ? admin.tg_first_name.charAt(0).toUpperCase() : 'A'}
                                    </div>
                                    <div>
                                        <div style="font-weight: 600;">${admin.tg_first_name || admin.username}</div>
                                        <div style="font-size: 12px; color: var(--text-muted);">
                                            @${admin.username}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${admin.role === 'superadmin' ? 'status-completed' : 'status-active'}">
                                    ${this.getAdminRoleLabel(admin.role)}
                                </span>
                            </td>
                            <td>
                                <div style="font-size: 12px;">
                                    ${admin.permissions ? admin.permissions.slice(0, 3).join(', ') : 'Нет'}${admin.permissions && admin.permissions.length > 3 ? '...' : ''}
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 12px;">
                                    <div>Создан: ${this.formatTime(admin.created_at)}</div>
                                    <div>Активность: ${admin.last_login ? this.formatTime(admin.last_login) : 'Никогда'}</div>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${admin.is_active ? 'status-active' : 'status-inactive'}">
                                    ${admin.is_active ? 'Активен' : 'Неактивен'}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 4px;">
                                    ${admin.user_id !== this.userId ? `
                                    <button class="btn btn-warning btn-sm" onclick="adminApp.editAdmin(${admin.user_id})" title="Редактировать">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-${admin.is_active ? 'danger' : 'success'} btn-sm" 
                                            onclick="adminApp.toggleAdminStatus(${admin.user_id}, ${!admin.is_active})">
                                        <i class="fas fa-${admin.is_active ? 'pause' : 'play'}"></i>
                                    </button>
                                    ${admin.role !== 'superadmin' ? `
                                    <button class="btn btn-danger btn-sm" onclick="adminApp.deleteAdmin(${admin.user_id})" title="Удалить">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                    ` : ''}
                                    ` : `
                                    <span style="color: var(--text-muted); font-size: 12px;">Это вы</span>
                                    `}
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <h4 style="margin-bottom: 16px;">📊 Распределение по ролям</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1)); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; margin-bottom: 8px;">👑</div>
                    <div style="font-size: var(--font-lg); font-weight: 800; color: var(--primary-color);">
                        ${superAdmins}
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">
                        Суперадмины
                    </div>
                </div>
                
                <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, rgba(72, 187, 120, 0.1), rgba(56, 178, 172, 0.1)); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; margin-bottom: 8px;">🛡️</div>
                    <div style="font-size: var(--font-lg); font-weight: 800; color: var(--success-color);">
                        ${moderators}
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">
                        Модераторы
                    </div>
                </div>
                
                <div style="text-align: center; padding: 16px; background: linear-gradient(135deg, rgba(237, 137, 54, 0.1), rgba(231, 108, 84, 0.1)); border-radius: var(--radius-md);">
                    <div style="font-size: 20px; margin-bottom: 8px;">👁️</div>
                    <div style="font-size: var(--font-lg); font-weight: 800; color: var(--warning-color);">
                        ${admins.length - superAdmins - moderators}
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">
                        Обычные админы
                    </div>
                </div>
            </div>
        </div>
    `;
}

async loadSettings() {
    try {
        const response = await fetch(`/api/admin/settings?userId=${this.userId}`);
        const settings = await response.json();
        
        const settingsSection = document.getElementById('settingsSection');
        settingsSection.innerHTML = this.createSettingsManagementHTML(settings);
        
        this.initSettingsEventListeners();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error);
        this.showMessage('Ошибка загрузки настроек', 'error');
    }
}

createSettingsManagementHTML(settings) {
    return `
        <div class="tabs" id="settingsTabs">
            <button class="tab active" data-tab="general">Основные настройки</button>
            <button class="tab" data-tab="sparks">Система искр</button>
            <button class="tab" data-tab="content">Настройки контента</button>
            <button class="tab" data-tab="system">Системные настройки</button>
            <button class="tab" data-tab="danger">Опасные настройки</button>
        </div>

        <div class="tab-content active" id="generalTab">
            <div class="form-card">
                <h3 class="form-title">Основные настройки приложения</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Название приложения</label>
                        <input type="text" class="form-control" id="appName" 
                               value="${this.getSettingValue(settings, 'app_name', 'Мастерская Вдохновения')}">
                        <div class="form-hint">Отображается в заголовке и уведомлениях</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Версия приложения</label>
                        <input type="text" class="form-control" id="appVersion" 
                               value="${this.getSettingValue(settings, 'app_version', '9.0.0')}">
                        <div class="form-hint">Текущая версия системы</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Контактный email</label>
                        <input type="email" class="form-control" id="contactEmail" 
                               value="${this.getSettingValue(settings, 'contact_email', 'support@inspiration.ru')}">
                        <div class="form-hint">Для связи с пользователями</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Максимальный размер загрузки (МБ)</label>
                        <input type="number" class="form-control" id="maxUploadSize" 
                               value="${this.getSettingValue(settings, 'max_upload_size', '10')}">
                        <div class="form-hint">Максимальный размер загружаемых файлов</div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="adminApp.saveSettings('general')">
                        <i class="fas fa-save"></i>
                        Сохранить настройки
                    </button>
                </div>
            </div>
        </div>

        <div class="tab-content" id="sparksTab">
            <div class="form-card">
                <h3 class="form-title">Настройки системы искр</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Искры при регистрации</label>
                        <input type="number" class="form-control" id="registrationSparks" 
                               value="${this.getSettingValue(settings, 'default_sparks', '10')}">
                        <div class="form-hint">Количество искр при регистрации нового пользователя</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Искры за правильный ответ</label>
                        <input type="number" class="form-control" id="quizCorrectSparks" 
                               value="${this.getSettingValue(settings, 'quiz_sparks_correct', '2')}">
                        <div class="form-hint">Награда за каждый правильный ответ в квизе</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Бонус за идеальный квиз</label>
                        <input type="number" class="form-control" id="quizPerfectSparks" 
                               value="${this.getSettingValue(settings, 'quiz_sparks_perfect', '10')}">
                        <div class="form-hint">Дополнительная награда за все правильные ответы</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Искры за загрузку работы</label>
                        <input type="number" class="form-control" id="workUploadSparks" 
                               value="${this.getSettingValue(settings, 'work_upload_sparks', '5')}">
                        <div class="form-hint">Награда за загрузку новой работы</div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="adminApp.saveSettings('sparks')">
                        <i class="fas fa-save"></i>
                        Сохранить настройки
                    </button>
                </div>
            </div>
        </div>

        <div class="tab-content" id="contentTab">
            <div class="form-card">
                <h3 class="form-title">Настройки контента</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Максимум работ в день</label>
                        <input type="number" class="form-control" id="maxWorksPerDay" 
                               value="${this.getSettingValue(settings, 'max_works_per_day', '5')}">
                        <div class="form-hint">Максимальное количество работ, которые пользователь может загрузить за день</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Максимум попыток квиза в день</label>
                        <input type="number" class="form-control" id="maxQuizAttempts" 
                               value="${this.getSettingValue(settings, 'max_quiz_attempts', '3')}">
                        <div class="form-hint">Максимальное количество попыток прохождения квиза за день</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Время охлаждения квиза (часы)</label>
                        <input type="number" class="form-control" id="quizCooldown" 
                               value="${this.getSettingValue(settings, 'quiz_cooldown_hours', '24')}">
                        <div class="form-hint">Время до возможности повторного прохождения квиза</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Разрешена регистрация</label>
                        <select class="form-control" id="registrationEnabled">
                            <option value="true" ${this.getSettingValue(settings, 'registration_enabled', 'true') === 'true' ? 'selected' : ''}>Да</option>
                            <option value="false" ${this.getSettingValue(settings, 'registration_enabled', 'true') === 'false' ? 'selected' : ''}>Нет</option>
                        </select>
                        <div class="form-hint">Разрешить новым пользователям регистрироваться</div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="adminApp.saveSettings('content')">
                        <i class="fas fa-save"></i>
                        Сохранить настройки
                    </button>
                </div>
            </div>
        </div>

        <div class="tab-content" id="systemTab">
            <div class="form-card">
                <h3 class="form-title">Системные настройки</h3>
                
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Режим обслуживания</label>
                        <select class="form-control" id="maintenanceMode">
                            <option value="false" ${this.getSettingValue(settings, 'maintenance_mode', 'false') === 'false' ? 'selected' : ''}>Выключен</option>
                            <option value="true" ${this.getSettingValue(settings, 'maintenance_mode', 'false') === 'true' ? 'selected' : ''}>Включен</option>
                        </select>
                        <div class="form-hint">При включении пользователи увидят сообщение о техобслуживании</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Логирование действий</label>
                        <select class="form-control" id="activityLogging">
                            <option value="true" selected>Включено</option>
                            <option value="false">Выключено</option>
                        </select>
                        <div class="form-hint">Записывать все действия пользователей и администраторов</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Автоочистка логов (дни)</label>
                        <input type="number" class="form-control" id="logRetention" value="30">
                        <div class="form-hint">Автоматически удалять логи старше указанного количества дней</div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Лимит запросов в минуту</label>
                        <input type="number" class="form-control" id="rateLimit" value="100">
                        <div class="form-hint">Максимальное количество запросов от одного пользователя в минуту</div>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="adminApp.saveSettings('system')">
                        <i class="fas fa-save"></i>
                        Сохранить настройки
                    </button>
                </div>
            </div>
        </div>

        <div class="tab-content" id="dangerTab">
            <div class="card danger" style="border-color: var(--danger-color);">
                <h3 style="color: var(--danger-color); margin-bottom: 16px;">⚠️ Опасные операции</h3>
                <p style="margin-bottom: 20px; color: var(--text-muted);">
                    Эти операции могут привести к необратимому удалению данных. 
                    Выполняйте их только если полностью понимаете последствия.
                </p>
                
                <div style="display: grid; gap: 16px;">
                    <div style="padding: 16px; background: rgba(245, 101, 101, 0.1); border-radius: var(--radius-md);">
                        <h4 style="margin-bottom: 8px; color: var(--danger-color);">Очистка активностей</h4>
                        <p style="margin-bottom: 12px; color: var(--text-muted); font-size: 14px;">
                            Удалить всю историю активностей пользователей. Это освободит место в базе данных.
                        </p>
                        <button class="btn btn-danger" onclick="adminApp.showResetConfirmation('activities')">
                            <i class="fas fa-trash"></i>
                            Очистить активности
                        </button>
                    </div>
                    
                    <div style="padding: 16px; background: rgba(245, 101, 101, 0.1); border-radius: var(--radius-md);">
                        <h4 style="margin-bottom: 8px; color: var(--danger-color);">Сброс пользователей</h4>
                        <p style="margin-bottom: 12px; color: var(--text-muted); font-size: 14px;">
                            Удалить всех пользователей кроме администраторов. Все данные пользователей будут потеряны.
                        </p>
                        <button class="btn btn-danger" onclick="adminApp.showResetConfirmation('users')">
                            <i class="fas fa-users-slash"></i>
                            Сбросить пользователей
                        </button>
                    </div>
                    
                    <div style="padding: 16px; background: rgba(245, 101, 101, 0.1); border-radius: var(--radius-md);">
                        <h4 style="margin-bottom: 8px; color: var(--danger-color);">Сброс контента</h4>
                        <p style="margin-bottom: 12px; color: var(--text-muted); font-size: 14px;">
                            Удалить весь пользовательский контент и вернуть систему к базовому состоянию.
                        </p>
                        <button class="btn btn-danger" onclick="adminApp.showResetConfirmation('content')">
                            <i class="fas fa-undo"></i>
                            Сбросить контент
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Вспомогательные методы для настроек
getSettingValue(settings, key, defaultValue) {
    const setting = settings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
}

initSettingsEventListeners() {
    // Инициализация вкладок настроек
    document.querySelectorAll('#settingsTabs .tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.getAttribute('data-tab');
            this.switchSettingsTab(tabName);
        });
    });
}

switchSettingsTab(tabName) {
    // Переключение вкладок настроек
    document.querySelectorAll('#settingsTabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}
    
getAdminRoleLabel(role) {
    const labels = {
        'superadmin': 'Суперадмин',
        'admin': 'Администратор',
        'moderator': 'Модератор',
        'content_manager': 'Менеджер контента'
    };
    return labels[role] || role;
}

    
// Вспомогательные методы для админки
getDifficultyBadgeClass(difficulty) {
    const classes = {
        'beginner': 'status-active',
        'intermediate': 'status-completed',
        'advanced': 'status-pending',
        'expert': 'status-inactive'
    };
    return classes[difficulty] || 'status-active';
}

getShopItemType(type) {
    const types = {
        'video_course': 'Видеокурс',
        'ebook': 'Электронная книга',
        'course': 'Курс',
        'material': 'Материалы',
        'tool': 'Инструмент'
    };
    return types[type] || type;
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
