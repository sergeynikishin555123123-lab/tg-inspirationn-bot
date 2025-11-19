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
        settings: [],
        moderation: {
            works: [],
            reviews: []
        }
    };
    
    // Хранилище файлов
    this.uploadedFiles = {
        quizzes: {},
        marathons: {},
        interactives: {},
        posts: {},
        shop: {}
    };

    // Текущие редактируемые элементы
    this.editingItem = null;
    
    // ==================== СИСТЕМА СИНХРОНИЗАЦИИ С ПРИЛОЖЕНИЕМ ====================
    this.syncMethods = {
        clearCache: this.clearCache.bind(this),
        forceSync: this.forceSync.bind(this),
        getCacheStatus: this.getCacheStatus.bind(this)
    };
    
    this.init();
}

async init() {
    console.log('🔧 Админ панель - Инициализация v9.0');
    
    try {
        // Получаем ID пользователя из URL параметров
        const urlParams = new URLSearchParams(window.location.search);
        this.userId = urlParams.get('userId') || 898508164;
        
        if (!this.userId) {
            this.showMessage('User ID не найден в параметрах URL', 'error');
            return;
        }

        // Проверяем права администратора
        await this.checkAdminAccess();
        
        // ==================== ПРОВЕРКА СИНХРОНИЗАЦИИ С СЕРВЕРОМ ====================
        console.log('🔄 Проверка соединения с сервером...');
        await this.checkServerConnection();
        
        // Инициализация интерфейса
        this.initEventListeners();
        this.initCharts();
            
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
        // В реальном приложении здесь был бы API вызов
        // Для демонстрации используем localStorage
        const adminData = localStorage.getItem(`admin_${this.userId}`);
        
        if (adminData) {
            this.admin = JSON.parse(adminData);
        } else {
            // Создаем тестового администратора
            this.admin = {
                user_id: this.userId,
                role: 'superadmin',
                permissions: ['all'],
                tg_first_name: 'Администратор',
                username: 'admin',
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                is_active: true
            };
            localStorage.setItem(`admin_${this.userId}`, JSON.stringify(this.admin));
        }
        
        console.log('✅ Права администратора подтверждены');
        
    } catch (error) {
        console.error('❌ Ошибка доступа:', error);
        this.showMessage('У вас нет прав доступа к админ панели', 'error');
    }
}

// ==================== МЕТОДЫ СИНХРОНИЗАЦИИ С ПРИЛОЖЕНИЕМ ====================

// Проверка соединения с сервером
async checkServerConnection() {
    try {
        const response = await fetch('/health');
        if (!response.ok) throw new Error('Server not responding');
        
        const data = await response.json();
        console.log('✅ Соединение с сервером установлено:', data.status);
        return true;
    } catch (error) {
        console.error('❌ Ошибка соединения с сервером:', error);
        this.showMessage('Ошибка соединения с сервером. Проверьте подключение.', 'error');
        return false;
    }
}

// Метод для очистки кэша на сервере
async clearCache(cacheType = null) {
    try {
        const response = await fetch('/api/admin/clear-cache', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cacheType: cacheType,
                userId: this.userId
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`🔄 Кэш очищен: ${cacheType || 'all'}`);
            return true;
        } else {
            console.error('❌ Ошибка очистки кэша:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка очистки кэша:', error);
        this.showMessage('Ошибка очистки кэша. Проверьте соединение.', 'error');
        return false;
    }
}

// Метод для принудительной синхронизации данных
async forceSync(dataType) {
    try {
        this.showMessage(`Синхронизация ${dataType}...`, 'info');
        
        // Очищаем кэш на сервере
        const cacheCleared = await this.clearCache(dataType);
        
        if (cacheCleared) {
            // Перезагружаем данные в админ-панели
            this.loadSectionData(this.currentSection);
            
            // Обновляем статус кэша
            await this.getCacheStatus();
            
            this.showMessage(`✅ Данные "${dataType}" синхронизированы с приложением`, 'success');
            
            // Логируем действие
            console.log(`🔄 Синхронизировано: ${dataType}`, {
                admin: this.admin.username,
                timestamp: new Date().toISOString()
            });
        } else {
            this.showMessage(`❌ Ошибка синхронизации ${dataType}`, 'error');
        }
        
        return cacheCleared;
    } catch (error) {
        console.error('❌ Ошибка синхронизации:', error);
        this.showMessage('Ошибка синхронизации', 'error');
        return false;
    }
}

// Получение статуса кэша с сервера
async getCacheStatus() {
    try {
        const response = await fetch('/api/admin/cache-status');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const status = await response.json();
        console.log('📊 Статус кэша:', status);
        return status;
    } catch (error) {
        console.error('❌ Ошибка получения статуса кэша:', error);
        return null;
    }
}

// Универсальный метод для создания контента с синхронизацией
async createContentWithSync(type, formData, storageKey) {
    try {
        if (!formData) return;

        const items = this.getStoredData(storageKey) || [];
        const newItem = {
            id: Date.now(),
            ...formData,
            created_at: new Date().toISOString(),
            is_active: true,
            created_by: this.admin.username,
            created_by_id: this.userId
        };

        items.push(newItem);
        this.setStoredData(storageKey, items);

        // СИНХРОНИЗАЦИЯ: Очищаем кэш на сервере
        await this.forceSync(type);

        this.showMessage(`${this.getTypeLabel(type)} успешно создан и синхронизирован!`, 'success');
        this.hideModals();
        
        // Перезагружаем соответствующий раздел
        this.loadSectionData(type);

        return true;

    } catch (error) {
        console.error(`❌ Ошибка создания ${type}:`, error);
        this.showMessage(`Ошибка создания ${this.getTypeLabel(type)}`, 'error');
        return false;
    }
}

// Обновленные методы создания с синхронизацией
async createQuiz() {
    const formData = this.getQuizFormData();
    await this.createContentWithSync('quizzes', formData, 'quizzes');
}

async createMarathon() {
    const formData = this.getMarathonFormData();
    await this.createContentWithSync('marathons', formData, 'marathons');
}

async createInteractive() {
    const formData = this.getInteractiveFormData();
    await this.createContentWithSync('interactives', formData, 'interactives');
}

async createPost() {
    const formData = this.getPostFormData();
    await this.createContentWithSync('posts', formData, 'posts');
}

async createItem() {
    const formData = this.getItemFormData();
    await this.createContentWithSync('shopItems', formData, 'shopItems');
}

// Вспомогательный метод для получения русских названий типов
getTypeLabel(type) {
    const labels = {
        'quizzes': 'Квиз',
        'marathons': 'Марафон', 
        'interactives': 'Интерактив',
        'posts': 'Пост',
        'shopItems': 'Товар',
        'users': 'Пользователь',
        'roles': 'Роль',
        'characters': 'Персонаж'
    };
    return labels[type] || type;
}

// Инициализация интерфейса
this.initEventListeners();

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

        // Инициализация загрузки файлов
        this.initFileUploads();

        // Обработчики для динамического контента
        this.initDynamicEventListeners();

        console.log('✅ Обработчики событий инициализированы');
    }

    initDynamicEventListeners() {
        // Обработчики для элементов, которые создаются динамически
        document.addEventListener('click', (e) => {
            // Обработка переключения статусов
            if (e.target.closest('[data-toggle-status]')) {
                const button = e.target.closest('[data-toggle-status]');
                const type = button.dataset.type;
                const id = parseInt(button.dataset.id);
                this.toggleStatus(type, id);
            }

            // Обработка удаления элементов
            if (e.target.closest('[data-delete-item]')) {
                const button = e.target.closest('[data-delete-item]');
                const type = button.dataset.type;
                const id = parseInt(button.dataset.id);
                this.deleteItem(type, id);
            }

            // Обработка просмотра деталей
            if (e.target.closest('[data-view-item]')) {
                const button = e.target.closest('[data-view-item]');
                const type = button.dataset.type;
                const id = parseInt(button.dataset.id);
                this.viewItem(type, id);
            }
        });
    }

    initFileUploads() {
        // Инициализация всех загрузчиков файлов
        this.initFileUpload('quizImageUpload', 'quizImageFile', 'quizImagePreview', 'quizzes');
        this.initFileUpload('marathonImageUpload', 'marathonImageFile', 'marathonImagePreview', 'marathons');
        this.initFileUpload('interactiveMediaUpload', 'interactiveMediaFile', 'interactiveMediaPreview', 'interactives');
        this.initFileUpload('postImagesUpload', 'postImagesFile', 'postImagesPreview', 'posts');
        this.initFileUpload('postVideosUpload', 'postVideosFile', 'postVideosPreview', 'posts');
        this.initFileUpload('itemMainImageUpload', 'itemMainImageFile', 'itemMainImagePreview', 'shop');
        this.initFileUpload('itemImagesUpload', 'itemImagesFile', 'itemImagesPreview', 'shop');
        this.initFileUpload('itemVideosUpload', 'itemVideosFile', 'itemVideosPreview', 'shop');
        this.initFileUpload('itemAudioUpload', 'itemAudioFile', 'itemAudioPreview', 'shop');
    }

    initFileUpload(uploadAreaId, fileInputId, previewAreaId, category) {
        const uploadArea = document.getElementById(uploadAreaId);
        const fileInput = document.getElementById(fileInputId);
        const previewArea = document.getElementById(previewAreaId);

        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.handleFiles(files, fileInput, previewArea, category);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files, fileInput, previewArea, category);
        });
    }

    handleFiles(files, fileInput, previewArea, category) {
        Array.from(files).forEach(file => {
            if (!this.validateFile(file)) return;

            const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Сохраняем файл в хранилище
            if (!this.uploadedFiles[category]) this.uploadedFiles[category] = {};
            this.uploadedFiles[category][fileId] = file;

            // Создаем превью
            this.createFilePreview(file, fileId, previewArea, category);
        });

        // Очищаем input
        fileInput.value = '';
    }

    validateFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = {
            'image/jpeg': true,
            'image/png': true,
            'image/gif': true,
            'video/mp4': true,
            'video/quicktime': true,
            'audio/mpeg': true,
            'audio/wav': true
        };

        if (file.size > maxSize) {
            this.showMessage('Файл слишком большой. Максимальный размер: 100MB', 'error');
            return false;
        }

        if (!allowedTypes[file.type]) {
            this.showMessage('Неподдерживаемый тип файла', 'error');
            return false;
        }

        return true;
    }

    createFilePreview(file, fileId, previewArea, category) {
        const previewItem = document.createElement('div');
        previewItem.className = 'file-preview-item';
        previewItem.dataset.fileId = fileId;

        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            previewItem.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            video.style.maxWidth = '100%';
            previewItem.appendChild(video);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.controls = true;
            audio.style.width = '100%';
            previewItem.appendChild(audio);
        } else {
            const icon = document.createElement('div');
            icon.className = 'file-upload-icon';
            icon.innerHTML = '<i class="fas fa-file"></i>';
            previewItem.appendChild(icon);
            
            const name = document.createElement('div');
            name.textContent = file.name;
            name.style.fontSize = '12px';
            name.style.textAlign = 'center';
            previewItem.appendChild(name);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.onclick = () => this.removeFile(fileId, category, previewItem);
        previewItem.appendChild(removeBtn);

        previewArea.appendChild(previewItem);
    }

    removeFile(fileId, category, previewElement) {
        delete this.uploadedFiles[category][fileId];
        if (previewElement) {
            previewElement.remove();
        }
    }

    initCharts() {
        // Инициализация графиков Chart.js
        const activityCtx = document.getElementById('activityChart');
        const rolesCtx = document.getElementById('rolesChart');
        
        if (activityCtx) {
            this.charts.activity = this.createActivityChart();
        }
        if (rolesCtx) {
            this.charts.roles = this.createRolesChart();
        }
        
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
                }
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
            // Загружаем данные из localStorage или создаем тестовые
            const stats = this.getStoredData('stats') || await this.generateTestStats();
            
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
            const { labels, registrations, activities } = this.generateTestActivityData(period);
            
            if (this.charts.activity) {
                this.charts.activity.data.labels = labels;
                this.charts.activity.data.datasets[0].data = registrations;
                this.charts.activity.data.datasets[1].data = activities;
                this.charts.activity.update();
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки графика активности:', error);
        }
    }

    async loadRolesChart() {
        try {
            const stats = this.getStoredData('stats') || await this.generateTestStats();
            const rolesData = stats.users.by_role || [];
            
            if (this.charts.roles) {
                this.charts.roles.data.labels = rolesData.map(r => r.role);
                this.charts.roles.data.datasets[0].data = rolesData.map(r => r.count);
                this.charts.roles.update();
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки графика ролей:', error);
        }
    }

    // ==================== СИСТЕМА ХРАНЕНИЯ ДАННЫХ ====================

    getStoredData(key) {
        try {
            const data = localStorage.getItem(`admin_data_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Ошибка чтения данных:', error);
            return null;
        }
    }

    setStoredData(key, data) {
        try {
            localStorage.setItem(`admin_data_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения данных:', error);
            return false;
        }
    }

    // ==================== МЕТОДЫ ДЛЯ КВИЗОВ ====================

    async loadQuizzes() {
        try {
            const quizzes = this.getStoredData('quizzes') || [];
            const quizzesSection = document.getElementById('quizzesSection');
            quizzesSection.innerHTML = this.createQuizzesManagementHTML(quizzes);
            
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
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Вопросы</th>
                                <th>Сложность</th>
                                <th>Награда</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="quizzesTable">
                            ${quizzes.length === 0 ? `
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="empty-state">
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
                                <td>${quiz.questions.length}</td>
                                <td>
                                    <span class="status-badge ${this.getDifficultyBadgeClass(quiz.difficulty)}">
                                        ${this.getDifficultyLabel(quiz.difficulty)}
                                    </span>
                                </td>
                                <td>${quiz.reward}✨</td>
                                <td>
                                    <span class="status-badge ${quiz.is_active ? 'status-active' : 'status-inactive'}">
                                        ${quiz.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewQuiz(${quiz.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-warning btn-sm" onclick="adminApp.editQuiz(${quiz.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-${quiz.is_active ? 'danger' : 'success'} btn-sm" 
                                                data-toggle-status="quiz" data-id="${quiz.id}">
                                            <i class="fas fa-${quiz.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" data-delete-item="quiz" data-id="${quiz.id}">
                                            <i class="fas fa-trash"></i>
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

    showCreateQuizForm() {
        document.getElementById('createQuizModal').classList.add('active');
        this.resetQuizForm();
    }

    resetQuizForm() {
        document.getElementById('newQuizTitle').value = '';
        document.getElementById('newQuizCategory').value = '';
        document.getElementById('newQuizDescription').value = '';
        document.getElementById('newQuizDifficulty').value = 'beginner';
        document.getElementById('newQuizDuration').value = '15';
        document.getElementById('newQuizReward').value = '25';
        
        document.getElementById('quizQuestionsContainer').innerHTML = '';
        document.getElementById('quizImagePreview').innerHTML = '';
        this.uploadedFiles.quizzes = {};
        this.addQuestion(); // Добавляем первый вопрос по умолчанию
    }

    addQuestion() {
        const container = document.getElementById('quizQuestionsContainer');
        const questionCount = container.children.length + 1;
        
        const questionHTML = `
            <div class="question-builder" data-question-id="${questionCount}">
                <div class="question-header">
                    <div class="question-number">Вопрос ${questionCount}</div>
                    <div class="question-actions">
                        <button type="button" class="btn btn-danger btn-sm" onclick="adminApp.removeQuestion(${questionCount})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Текст вопроса *</label>
                    <textarea class="form-control" name="question_text" placeholder="Введите текст вопроса" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Изображение вопроса (опционально)</label>
                    <div class="file-upload" id="questionImageUpload_${questionCount}">
                        <div class="file-upload-icon">
                            <i class="fas fa-image"></i>
                        </div>
                        <div class="file-upload-text">Добавить изображение к вопросу</div>
                        <input type="file" id="questionImageFile_${questionCount}" accept="image/*" style="display: none;">
                    </div>
                    <div class="file-preview" id="questionImagePreview_${questionCount}"></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Варианты ответов *</label>
                    <div class="options-container" id="optionsContainer_${questionCount}">
                        <!-- Варианты ответов будут добавляться здесь -->
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adminApp.addOption(${questionCount})">
                        <i class="fas fa-plus"></i> Добавить вариант
                    </button>
                </div>
                <div class="form-group">
                    <label class="form-label">Объяснение ответа</label>
                    <textarea class="form-control" name="question_explanation" placeholder="Объяснение правильного ответа"></textarea>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', questionHTML);
        
        // Инициализируем загрузку файлов для нового вопроса
        this.initFileUpload(`questionImageUpload_${questionCount}`, `questionImageFile_${questionCount}`, `questionImagePreview_${questionCount}`, 'quizzes');
        
        // Добавляем 4 варианта ответа по умолчанию
        for (let i = 0; i < 4; i++) {
            this.addOption(questionCount);
        }
    }

    removeQuestion(questionId) {
        const questionElement = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionElement) {
            questionElement.remove();
            this.renumberQuestions();
        }
    }

    renumberQuestions() {
        const questions = document.querySelectorAll('.question-builder');
        questions.forEach((question, index) => {
            const questionId = index + 1;
            question.dataset.questionId = questionId;
            const numberElement = question.querySelector('.question-number');
            if (numberElement) {
                numberElement.textContent = `Вопрос ${questionId}`;
            }
        });
    }

    addOption(questionId) {
        const container = document.getElementById(`optionsContainer_${questionId}`);
        const optionCount = container.children.length + 1;
        
        const optionHTML = `
            <div class="option-item" data-option-id="${optionCount}">
                <input type="radio" name="correct_option_${questionId}" value="${optionCount}" 
                       ${optionCount === 1 ? 'checked' : ''} onchange="adminApp.markCorrectOption(this)">
                <div class="option-input">
                    <input type="text" class="form-control" name="option_text_${questionId}_${optionCount}" 
                           placeholder="Текст варианта ответа" required>
                </div>
                <div class="option-actions">
                    <button type="button" class="btn btn-danger btn-sm" onclick="adminApp.removeOption(${questionId}, ${optionCount})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', optionHTML);
    }

    removeOption(questionId, optionId) {
        const optionElement = document.querySelector(`[data-question-id="${questionId}"] [data-option-id="${optionId}"]`);
        if (optionElement) {
            optionElement.remove();
        }
    }

    markCorrectOption(radio) {
        // Снимаем выделение со всех вариантов в этом вопросе
        const questionElement = radio.closest('.question-builder');
        questionElement.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('correct');
        });
        
        // Выделяем правильный вариант
        radio.closest('.option-item').classList.add('correct');
    }

    async createQuiz() {
        try {
            const formData = this.getQuizFormData();
            if (!formData) return;

            const quizzes = this.getStoredData('quizzes') || [];
            const newQuiz = {
                id: Date.now(),
                ...formData,
                created_at: new Date().toISOString(),
                is_active: true,
                completions_count: 0,
                average_score: 0
            };

            quizzes.push(newQuiz);
            this.setStoredData('quizzes', quizzes);

            this.showMessage('Квиз успешно создан!', 'success');
            this.hideModals();
            this.loadQuizzes();

        } catch (error) {
            console.error('❌ Ошибка создания квиза:', error);
            this.showMessage('Ошибка создания квиза', 'error');
        }
    }

    getQuizFormData() {
        const title = document.getElementById('newQuizTitle').value;
        const category = document.getElementById('newQuizCategory').value;
        const description = document.getElementById('newQuizDescription').value;
        const difficulty = document.getElementById('newQuizDifficulty').value;
        const duration = parseInt(document.getElementById('newQuizDuration').value);
        const reward = parseInt(document.getElementById('newQuizReward').value);

        if (!title || !category || !difficulty || !duration) {
            this.showMessage('Заполните все обязательные поля', 'error');
            return null;
        }

        // Собираем вопросы
        const questions = [];
        const questionElements = document.querySelectorAll('.question-builder');
        
        if (questionElements.length === 0) {
            this.showMessage('Добавьте хотя бы один вопрос', 'error');
            return null;
        }

        for (let i = 0; i < questionElements.length; i++) {
            const questionElement = questionElements[i];
            const questionText = questionElement.querySelector('textarea[name="question_text"]').value;
            const explanation = questionElement.querySelector('textarea[name="question_explanation"]').value;
            
            if (!questionText) {
                this.showMessage('Заполните текст всех вопросов', 'error');
                return null;
            }

            // Собираем варианты ответов
            const options = [];
            const optionElements = questionElement.querySelectorAll('.option-item');
            let hasCorrectOption = false;

            for (let j = 0; j < optionElements.length; j++) {
                const optionElement = optionElements[j];
                const optionText = optionElement.querySelector('input[type="text"]').value;
                const isCorrect = optionElement.querySelector('input[type="radio"]').checked;
                
                if (!optionText) {
                    this.showMessage('Заполните все варианты ответов', 'error');
                    return null;
                }

                options.push({
                    text: optionText,
                    is_correct: isCorrect
                });

                if (isCorrect) hasCorrectOption = true;
            }

            if (!hasCorrectOption) {
                this.showMessage('Выберите правильный вариант для каждого вопроса', 'error');
                return null;
            }

            if (options.length < 2) {
                this.showMessage('Добавьте хотя бы 2 варианта ответа для каждого вопроса', 'error');
                return null;
            }

            questions.push({
                text: questionText,
                options: options,
                explanation: explanation,
                image: null // В реальном приложении здесь была бы загрузка изображения
            });
        }

        return {
            title,
            category,
            description,
            difficulty,
            duration_minutes: duration,
            reward,
            questions
        };
    }

    // ==================== МЕТОДЫ ДЛЯ МАРАФОНОВ ====================

    async loadMarathons() {
        try {
            const marathons = this.getStoredData('marathons') || [];
            const marathonsSection = document.getElementById('marathonsSection');
            marathonsSection.innerHTML = this.createMarathonsManagementHTML(marathons);
            
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

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Дни</th>
                                <th>Цель</th>
                                <th>Награда</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="marathonsTable">
                            ${marathons.length === 0 ? `
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="empty-state">
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
                                <td>${marathon.days.length}</td>
                                <td style="max-width: 200px;">${marathon.goal}</td>
                                <td>${marathon.reward}✨</td>
                                <td>
                                    <span class="status-badge ${marathon.is_active ? 'status-active' : 'status-inactive'}">
                                        ${marathon.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewMarathon(${marathon.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-warning btn-sm" onclick="adminApp.editMarathon(${marathon.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-${marathon.is_active ? 'danger' : 'success'} btn-sm" 
                                                data-toggle-status="marathon" data-id="${marathon.id}">
                                            <i class="fas fa-${marathon.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" data-delete-item="marathon" data-id="${marathon.id}">
                                            <i class="fas fa-trash"></i>
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

    showCreateMarathonForm() {
        document.getElementById('createMarathonModal').classList.add('active');
        this.resetMarathonForm();
    }

    resetMarathonForm() {
        document.getElementById('newMarathonTitle').value = '';
        document.getElementById('newMarathonCategory').value = '';
        document.getElementById('newMarathonDescription').value = '';
        document.getElementById('newMarathonGoal').value = '';
        document.getElementById('newMarathonDuration').value = '7';
        document.getElementById('newMarathonDifficulty').value = 'beginner';
        document.getElementById('newMarathonReward').value = '100';
        
        document.getElementById('marathonDaysContainer').innerHTML = '';
        document.getElementById('marathonImagePreview').innerHTML = '';
        this.uploadedFiles.marathons = {};
        this.addMarathonDay(); // Добавляем первый день по умолчанию
    }

    addMarathonDay() {
        const container = document.getElementById('marathonDaysContainer');
        const dayCount = container.children.length + 1;
        
        const dayHTML = `
            <div class="marathon-day" data-day-id="${dayCount}">
                <div class="day-header">
                    <div class="day-number">День ${dayCount}</div>
                    <div class="day-actions">
                        <button type="button" class="btn btn-danger btn-sm" onclick="adminApp.removeMarathonDay(${dayCount})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Задание дня *</label>
                    <textarea class="form-control" name="day_task" placeholder="Опишите задание для этого дня" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Материалы дня</label>
                    <textarea class="form-control" name="day_materials" placeholder="Необходимые материалы или ресурсы"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Подсказки</label>
                    <textarea class="form-control" name="day_hints" placeholder="Подсказки для выполнения задания"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Награда за день (искры)</label>
                    <input type="number" class="form-control" name="day_reward" value="10" min="0" max="1000">
                </div>
                <div class="form-group">
                    <label class="form-label">Изображение/Видео дня</label>
                    <div class="file-upload" id="dayMediaUpload_${dayCount}">
                        <div class="file-upload-icon">
                            <i class="fas fa-file-upload"></i>
                        </div>
                        <div class="file-upload-text">Добавить медиафайлы для дня</div>
                        <input type="file" id="dayMediaFile_${dayCount}" accept="image/*,video/*" style="display: none;" multiple>
                    </div>
                    <div class="file-preview" id="dayMediaPreview_${dayCount}"></div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', dayHTML);
        
        // Инициализируем загрузку файлов для нового дня
        this.initFileUpload(`dayMediaUpload_${dayCount}`, `dayMediaFile_${dayCount}`, `dayMediaPreview_${dayCount}`, 'marathons');
    }

    removeMarathonDay(dayId) {
        const dayElement = document.querySelector(`[data-day-id="${dayId}"]`);
        if (dayElement) {
            dayElement.remove();
            this.renumberMarathonDays();
        }
    }

    renumberMarathonDays() {
        const days = document.querySelectorAll('.marathon-day');
        days.forEach((day, index) => {
            const dayId = index + 1;
            day.dataset.dayId = dayId;
            const numberElement = day.querySelector('.day-number');
            if (numberElement) {
                numberElement.textContent = `День ${dayId}`;
            }
        });
    }

    async createMarathon() {
        try {
            const formData = this.getMarathonFormData();
            if (!formData) return;

            const marathons = this.getStoredData('marathons') || [];
            const newMarathon = {
                id: Date.now(),
                ...formData,
                created_at: new Date().toISOString(),
                is_active: true,
                participants_count: 0,
                completed_participants: 0
            };

            marathons.push(newMarathon);
            this.setStoredData('marathons', marathons);

            this.showMessage('Марафон успешно создан!', 'success');
            this.hideModals();
            this.loadMarathons();

        } catch (error) {
            console.error('❌ Ошибка создания марафона:', error);
            this.showMessage('Ошибка создания марафона', 'error');
        }
    }

    getMarathonFormData() {
        const title = document.getElementById('newMarathonTitle').value;
        const category = document.getElementById('newMarathonCategory').value;
        const description = document.getElementById('newMarathonDescription').value;
        const goal = document.getElementById('newMarathonGoal').value;
        const duration = parseInt(document.getElementById('newMarathonDuration').value);
        const difficulty = document.getElementById('newMarathonDifficulty').value;
        const reward = parseInt(document.getElementById('newMarathonReward').value);

        if (!title || !category || !goal || !duration) {
            this.showMessage('Заполните все обязательные поля', 'error');
            return null;
        }

        // Собираем дни марафона
        const days = [];
        const dayElements = document.querySelectorAll('.marathon-day');
        
        if (dayElements.length === 0) {
            this.showMessage('Добавьте хотя бы один день', 'error');
            return null;
        }

        if (dayElements.length !== duration) {
            this.showMessage('Количество дней должно соответствовать длительности марафона', 'error');
            return null;
        }

        for (let i = 0; i < dayElements.length; i++) {
            const dayElement = dayElements[i];
            const task = dayElement.querySelector('textarea[name="day_task"]').value;
            const materials = dayElement.querySelector('textarea[name="day_materials"]').value;
            const hints = dayElement.querySelector('textarea[name="day_hints"]').value;
            const dayReward = parseInt(dayElement.querySelector('input[name="day_reward"]').value);
            
            if (!task) {
                this.showMessage('Заполните задание для всех дней', 'error');
                return null;
            }

            days.push({
                day_number: parseInt(dayElement.dataset.dayId),
                task,
                materials: materials || '',
                hints: hints || '',
                reward: dayReward || 0,
                media: [] // В реальном приложении здесь были бы медиафайлы
            });
        }

        return {
            title,
            category,
            description,
            goal,
            duration_days: duration,
            difficulty,
            reward,
            days
        };
    }

    // ==================== МЕТОДЫ ДЛЯ ИНТЕРАКТИВОВ ====================

    async loadInteractives() {
        try {
            const interactives = this.getStoredData('interactives') || [];
            const interactivesSection = document.getElementById('interactivesSection');
            interactivesSection.innerHTML = this.createInteractivesManagementHTML(interactives);
            
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
                                <th>Сложность</th>
                                <th>Награда</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="interactivesTable">
                            ${interactives.length === 0 ? `
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="empty-state">
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
                                        ${interactive.category}
                                    </div>
                                </td>
                                <td>${this.getInteractiveTypeLabel(interactive.type)}</td>
                                <td>
                                    <span class="status-badge ${this.getDifficultyBadgeClass(interactive.difficulty)}">
                                        ${this.getDifficultyLabel(interactive.difficulty)}
                                    </span>
                                </td>
                                <td>${interactive.reward}✨</td>
                                <td>
                                    <span class="status-badge ${interactive.is_active ? 'status-active' : 'status-inactive'}">
                                        ${interactive.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewInteractive(${interactive.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-warning btn-sm" onclick="adminApp.editInteractive(${interactive.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-${interactive.is_active ? 'danger' : 'success'} btn-sm" 
                                                data-toggle-status="interactive" data-id="${interactive.id}">
                                            <i class="fas fa-${interactive.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" data-delete-item="interactive" data-id="${interactive.id}">
                                            <i class="fas fa-trash"></i>
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

    showCreateInteractiveForm() {
        document.getElementById('createInteractiveModal').classList.add('active');
        this.resetInteractiveForm();
    }

    resetInteractiveForm() {
        document.getElementById('newInteractiveTitle').value = '';
        document.getElementById('newInteractiveType').value = 'quiz';
        document.getElementById('newInteractiveCategory').value = '';
        document.getElementById('newInteractiveDescription').value = '';
        document.getElementById('newInteractiveDifficulty').value = 'beginner';
        document.getElementById('newInteractiveReward').value = '50';
        
        document.getElementById('interactiveMediaPreview').innerHTML = '';
        this.uploadedFiles.interactives = {};
        this.updateInteractiveContent();
    }

    updateInteractiveContent() {
        const type = document.getElementById('newInteractiveType').value;
        const container = document.getElementById('interactiveQuestionsContainer');
        
        switch (type) {
            case 'quiz':
                container.innerHTML = this.createQuizInteractiveContent();
                break;
            case 'puzzle':
                container.innerHTML = this.createPuzzleInteractiveContent();
                break;
            case 'memory':
                container.innerHTML = this.createMemoryInteractiveContent();
                break;
            case 'matching':
                container.innerHTML = this.createMatchingInteractiveContent();
                break;
            case 'creative':
                container.innerHTML = this.createCreativeInteractiveContent();
                break;
        }
    }

    createQuizInteractiveContent() {
        return `
            <div class="form-group">
                <label class="form-label">Вопрос</label>
                <textarea class="form-control" name="interactive_question" placeholder="Введите вопрос"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Правильный ответ</label>
                <input type="text" class="form-control" name="correct_answer" placeholder="Правильный ответ">
            </div>
            <div class="form-group">
                <label class="form-label">Неправильные ответы (через запятую)</label>
                <input type="text" class="form-control" name="wrong_answers" placeholder="Неправильный ответ 1, Неправильный ответ 2">
            </div>
        `;
    }

    createPuzzleInteractiveContent() {
        return `
            <div class="form-group">
                <label class="form-label">Изображение для пазла</label>
                <div class="file-upload" id="puzzleImageUpload">
                    <div class="file-upload-icon">
                        <i class="fas fa-puzzle-piece"></i>
                    </div>
                    <div class="file-upload-text">Загрузите изображение для пазла</div>
                    <input type="file" id="puzzleImageFile" accept="image/*" style="display: none;">
                </div>
                <div class="file-preview" id="puzzleImagePreview"></div>
            </div>
            <div class="form-group">
                <label class="form-label">Количество частей</label>
                <select class="form-control" name="puzzle_pieces">
                    <option value="4">4 части</option>
                    <option value="9">9 частей</option>
                    <option value="16">16 частей</option>
                    <option value="25">25 частей</option>
                </select>
            </div>
        `;
    }

    createMemoryInteractiveContent() {
        return `
            <div class="form-group">
                <label class="form-label">Карточки для игры в память (пары через запятую)</label>
                <textarea class="form-control" name="memory_cards" placeholder="Карточка 1, Карточка 2, Карточка 3, Карточка 4" rows="4"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Изображения для карточек</label>
                <div class="file-upload" id="memoryImagesUpload">
                    <div class="file-upload-icon">
                        <i class="fas fa-images"></i>
                    </div>
                    <div class="file-upload-text">Загрузите изображения для карточек</div>
                    <input type="file" id="memoryImagesFile" accept="image/*" style="display: none;" multiple>
                </div>
                <div class="file-preview" id="memoryImagesPreview"></div>
            </div>
        `;
    }

    createMatchingInteractiveContent() {
        return `
            <div class="form-group">
                <label class="form-label">Элементы для сопоставления (формат: ключ=значение, каждый с новой строки)</label>
                <textarea class="form-control" name="matching_pairs" placeholder="Художник=Картина, Композитор=Музыка, Писатель=Книга" rows="4"></textarea>
            </div>
        `;
    }

    createCreativeInteractiveContent() {
        return `
            <div class="form-group">
                <label class="form-label">Творческое задание</label>
                <textarea class="form-control" name="creative_task" placeholder="Опишите творческое задание" rows="4"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Критерии оценки</label>
                <textarea class="form-control" name="evaluation_criteria" placeholder="Критерии для оценки работы" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Примеры работ</label>
                <div class="file-upload" id="creativeExamplesUpload">
                    <div class="file-upload-icon">
                        <i class="fas fa-image"></i>
                    </div>
                    <div class="file-upload-text">Загрузите примеры работ</div>
                    <input type="file" id="creativeExamplesFile" accept="image/*" style="display: none;" multiple>
                </div>
                <div class="file-preview" id="creativeExamplesPreview"></div>
            </div>
        `;
    }

    async createInteractive() {
        try {
            const formData = this.getInteractiveFormData();
            if (!formData) return;

            const interactives = this.getStoredData('interactives') || [];
            const newInteractive = {
                id: Date.now(),
                ...formData,
                created_at: new Date().toISOString(),
                is_active: true,
                attempts_count: 0,
                success_rate: 0
            };

            interactives.push(newInteractive);
            this.setStoredData('interactives', interactives);

            this.showMessage('Интерактив успешно создан!', 'success');
            this.hideModals();
            this.loadInteractives();

        } catch (error) {
            console.error('❌ Ошибка создания интерактива:', error);
            this.showMessage('Ошибка создания интерактива', 'error');
        }
    }

    getInteractiveFormData() {
        const title = document.getElementById('newInteractiveTitle').value;
        const type = document.getElementById('newInteractiveType').value;
        const category = document.getElementById('newInteractiveCategory').value;
        const description = document.getElementById('newInteractiveDescription').value;
        const difficulty = document.getElementById('newInteractiveDifficulty').value;
        const reward = parseInt(document.getElementById('newInteractiveReward').value);

        if (!title || !type || !category || !difficulty) {
            this.showMessage('Заполните все обязательные поля', 'error');
            return null;
        }

        // Собираем контент в зависимости от типа
        let content = {};
        switch (type) {
            case 'quiz':
                content = {
                    question: document.querySelector('textarea[name="interactive_question"]').value,
                    correct_answer: document.querySelector('input[name="correct_answer"]').value,
                    wrong_answers: document.querySelector('input[name="wrong_answers"]').value.split(',').map(s => s.trim())
                };
                break;
            case 'puzzle':
                content = {
                    pieces: parseInt(document.querySelector('select[name="puzzle_pieces"]').value)
                };
                break;
            case 'memory':
                content = {
                    cards: document.querySelector('textarea[name="memory_cards"]').value.split(',').map(s => s.trim())
                };
                break;
            case 'matching':
                const pairsText = document.querySelector('textarea[name="matching_pairs"]').value;
                const pairs = {};
                pairsText.split('\n').forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && value) pairs[key.trim()] = value.trim();
                });
                content = { pairs };
                break;
            case 'creative':
                content = {
                    task: document.querySelector('textarea[name="creative_task"]').value,
                    criteria: document.querySelector('textarea[name="evaluation_criteria"]').value
                };
                break;
        }

        return {
            title,
            type,
            category,
            description,
            difficulty,
            reward,
            content
        };
    }

    getInteractiveTypeLabel(type) {
        const labels = {
            'quiz': 'Квиз',
            'puzzle': 'Пазл',
            'memory': 'Память',
            'matching': 'Сопоставление',
            'creative': 'Творчество'
        };
        return labels[type] || type;
    }

    // ==================== МЕТОДЫ ДЛЯ ПОСТОВ ====================

    async loadPosts() {
        try {
            const posts = this.getStoredData('posts') || [];
            const postsSection = document.getElementById('postsSection');
            postsSection.innerHTML = this.createPostsManagementHTML(posts);
            
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
                                <th>Категория</th>
                                <th>Статус</th>
                                <th>Дата</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="postsTable">
                            ${posts.length === 0 ? `
                            <tr>
                                <td colspan="7" class="text-center">
                                    <div class="empty-state">
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
                                    <div style="font-size: 12px; color: var(--text-muted); max-width: 300px;">
                                        ${post.content.substring(0, 100)}...
                                    </div>
                                </td>
                                <td>${this.getPostTypeLabel(post.type)}</td>
                                <td>${post.category}</td>
                                <td>
                                    <span class="status-badge ${post.is_active ? 'status-active' : 'status-inactive'}">
                                        ${post.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                    ${post.featured ? '<span class="status-badge status-completed" style="margin-left: 4px;">⭐</span>' : ''}
                                </td>
                                <td>${this.formatDate(post.created_at)}</td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewPost(${post.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-warning btn-sm" onclick="adminApp.editPost(${post.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-${post.is_active ? 'danger' : 'success'} btn-sm" 
                                                data-toggle-status="post" data-id="${post.id}">
                                            <i class="fas fa-${post.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" data-delete-item="post" data-id="${post.id}">
                                            <i class="fas fa-trash"></i>
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

    showCreatePostForm() {
        document.getElementById('createPostModal').classList.add('active');
        this.resetPostForm();
    }

    resetPostForm() {
        document.getElementById('newPostTitle').value = '';
        document.getElementById('newPostType').value = 'article';
        document.getElementById('newPostCategory').value = 'painting';
        document.getElementById('newPostContent').value = '';
        document.getElementById('newPostTags').value = '';
        
        document.getElementById('postImagesPreview').innerHTML = '';
        document.getElementById('postVideosPreview').innerHTML = '';
        this.uploadedFiles.posts = {};
    }

    async createPost() {
        try {
            const formData = this.getPostFormData();
            if (!formData) return;

            const posts = this.getStoredData('posts') || [];
            const newPost = {
                id: Date.now(),
                ...formData,
                created_at: new Date().toISOString(),
                is_active: true,
                featured: false,
                views_count: 0,
                likes_count: 0,
                reviews_count: 0,
                average_rating: 0
            };

            posts.push(newPost);
            this.setStoredData('posts', posts);

            this.showMessage('Пост успешно создан!', 'success');
            this.hideModals();
            this.loadPosts();

        } catch (error) {
            console.error('❌ Ошибка создания поста:', error);
            this.showMessage('Ошибка создания поста', 'error');
        }
    }

    getPostFormData() {
        const title = document.getElementById('newPostTitle').value;
        const type = document.getElementById('newPostType').value;
        const category = document.getElementById('newPostCategory').value;
        const content = document.getElementById('newPostContent').value;
        const tags = document.getElementById('newPostTags').value;

        if (!title || !type || !category || !content) {
            this.showMessage('Заполните все обязательные поля', 'error');
            return null;
        }

        return {
            title,
            type,
            category,
            content,
            tags: tags.split(',').map(tag => tag.trim()),
            images: [], // В реальном приложении здесь были бы изображения
            videos: [] // В реальном приложении здесь были бы видео
        };
    }

    getPostTypeLabel(type) {
        const labels = {
            'article': 'Статья',
            'news': 'Новость',
            'tutorial': 'Обучение',
            'inspiration': 'Вдохновение'
        };
        return labels[type] || type;
    }

    // ==================== МЕТОДЫ ДЛЯ МАГАЗИНА ====================

    async loadShopItems() {
        try {
            const items = this.getStoredData('shopItems') || [];
            const shopSection = document.getElementById('shopSection');
            shopSection.innerHTML = this.createShopManagementHTML(items);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров:', error);
            this.showMessage('Ошибка загрузки товаров', 'error');
        }
    }

    createShopManagementHTML(items) {
        const totalRevenue = items.reduce((sum, item) => sum + (item.total_revenue || 0), 0);
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
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Товар</th>
                                <th>Тип</th>
                                <th>Цена</th>
                                <th>Покупки</th>
                                <th>Доход</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="shopTable">
                            ${items.length === 0 ? `
                            <tr>
                                <td colspan="8" class="text-center">
                                    <div class="empty-state">
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
                                <td>${this.getShopItemTypeLabel(item.type)}</td>
                                <td>
                                    <div style="font-weight: 600;">${item.price}✨</div>
                                    ${item.discount_percent > 0 ? `
                                    <div style="font-size: 12px; color: var(--success-color);">
                                        -${item.discount_percent}%
                                    </div>
                                    ` : ''}
                                </td>
                                <td>${item.purchases_count || 0}</td>
                                <td>
                                    <div style="font-weight: 600; color: var(--success-color);">
                                        ${item.total_revenue || 0}✨
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge ${item.is_active ? 'status-active' : 'status-inactive'}">
                                        ${item.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                    ${item.featured ? '<span class="status-badge status-completed" style="margin-left: 4px;">⭐</span>' : ''}
                                </td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-secondary btn-sm" onclick="adminApp.viewItem(${item.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn btn-warning btn-sm" onclick="adminApp.editItem(${item.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-${item.is_active ? 'danger' : 'success'} btn-sm" 
                                                data-toggle-status="shopItem" data-id="${item.id}">
                                            <i class="fas fa-${item.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" data-delete-item="shopItem" data-id="${item.id}">
                                            <i class="fas fa-trash"></i>
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

    showCreateItemForm() {
        document.getElementById('createItemModal').classList.add('active');
        this.resetItemForm();
    }

    resetItemForm() {
        document.getElementById('newItemTitle').value = '';
        document.getElementById('newItemType').value = 'video_course';
        document.getElementById('newItemCategory').value = 'painting';
        document.getElementById('newItemDescription').value = '';
        document.getElementById('newItemPrice').value = '100';
        document.getElementById('newItemDiscount').value = '0';
        document.getElementById('newItemDifficulty').value = 'beginner';
        document.getElementById('newItemDuration').value = '';
        
        document.getElementById('itemMainImagePreview').innerHTML = '';
        document.getElementById('itemImagesPreview').innerHTML = '';
        document.getElementById('itemVideosPreview').innerHTML = '';
        document.getElementById('itemAudioPreview').innerHTML = '';
        this.uploadedFiles.shop = {};
    }

    async createItem() {
        try {
            const formData = this.getItemFormData();
            if (!formData) return;

            const items = this.getStoredData('shopItems') || [];
            const newItem = {
                id: Date.now(),
                ...formData,
                created_at: new Date().toISOString(),
                is_active: true,
                featured: false,
                purchases_count: 0,
                total_revenue: 0,
                students_count: 0
            };

            items.push(newItem);
            this.setStoredData('shopItems', items);

            this.showMessage('Товар успешно создан!', 'success');
            this.hideModals();
            this.loadShopItems();

        } catch (error) {
            console.error('❌ Ошибка создания товара:', error);
            this.showMessage('Ошибка создания товара', 'error');
        }
    }

    getItemFormData() {
        const title = document.getElementById('newItemTitle').value;
        const type = document.getElementById('newItemType').value;
        const category = document.getElementById('newItemCategory').value;
        const description = document.getElementById('newItemDescription').value;
        const price = parseInt(document.getElementById('newItemPrice').value);
        const discount = parseInt(document.getElementById('newItemDiscount').value) || 0;
        const difficulty = document.getElementById('newItemDifficulty').value;
        const duration = document.getElementById('newItemDuration').value;

        if (!title || !type || !category || !description || !price) {
            this.showMessage('Заполните все обязательные поля', 'error');
            return null;
        }

        return {
            title,
            type,
            category,
            description,
            price,
            discount_percent: discount,
            difficulty,
            duration,
            main_image: null, // В реальном приложении здесь было бы главное изображение
            images: [], // В реальном приложении здесь были бы дополнительные изображения
            videos: [], // В реальном приложении здесь были бы видео
            audio: [] // В реальном приложении здесь были бы аудио
        };
    }

    getShopItemTypeLabel(type) {
        const labels = {
            'video_course': 'Видеокурс',
            'ebook': 'Электронная книга',
            'course': 'Курс',
            'material': 'Материалы',
            'tool': 'Инструмент',
            'brush_set': 'Набор кистей',
            'paint_set': 'Набор красок'
        };
        return labels[type] || type;
    }

    // ==================== ОСНОВНЫЕ МЕТОДЫ ИНТЕРФЕЙСА ====================

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
        
        const titleElement = document.getElementById('pageTitle');
        if (titleElement) {
            titleElement.textContent = titles[sectionName] || 'Админ Панель';
        }
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

    // ==================== УНИВЕРСАЛЬНЫЕ МЕТОДЫ УПРАВЛЕНИЯ ====================

    async toggleStatus(type, id) {
        try {
            const dataKey = this.getDataKeyByType(type);
            const items = this.getStoredData(dataKey) || [];
            const itemIndex = items.findIndex(item => item.id === id);
            
            if (itemIndex !== -1) {
                items[itemIndex].is_active = !items[itemIndex].is_active;
                this.setStoredData(dataKey, items);
                
                this.showMessage(`Статус ${type} #${id} изменен`, 'success');
                this.loadSectionData(this.currentSection);
            }
        } catch (error) {
            console.error('❌ Ошибка изменения статуса:', error);
            this.showMessage('Ошибка изменения статуса', 'error');
        }
    }

    async deleteItem(type, id) {
        if (!confirm(`Вы уверены, что хотите удалить ${this.getTypeLabel(type)} #${id}?`)) {
            return;
        }

        try {
            const dataKey = this.getDataKeyByType(type);
            const items = this.getStoredData(dataKey) || [];
            const filteredItems = items.filter(item => item.id !== id);
            
            this.setStoredData(dataKey, filteredItems);
            
            this.showMessage(`${this.getTypeLabel(type)} #${id} удален`, 'success');
            this.loadSectionData(this.currentSection);
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            this.showMessage('Ошибка удаления', 'error');
        }
    }

    getDataKeyByType(type) {
        const mapping = {
            'quiz': 'quizzes',
            'marathon': 'marathons',
            'interactive': 'interactives',
            'post': 'posts',
            'shopItem': 'shopItems',
            'user': 'users',
            'role': 'roles',
            'character': 'characters',
            'achievement': 'achievements',
            'admin': 'admins'
        };
        return mapping[type] || type;
    }

    getTypeLabel(type) {
        const labels = {
            'quiz': 'Квиз',
            'marathon': 'Марафон',
            'interactive': 'Интерактив',
            'post': 'Пост',
            'shopItem': 'Товар',
            'user': 'Пользователь',
            'role': 'Роль',
            'character': 'Персонаж',
            'achievement': 'Достижение',
            'admin': 'Администратор'
        };
        return labels[type] || type;
    }

    // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('messageArea');
        if (!messageArea) return;

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

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        this.editingItem = null;
    }

    getDifficultyBadgeClass(difficulty) {
        const classes = {
            'beginner': 'status-active',
            'intermediate': 'status-completed',
            'advanced': 'status-pending',
            'all': 'status-inactive'
        };
        return classes[difficulty] || 'status-active';
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'beginner': 'Начинающий',
            'intermediate': 'Средний',
            'advanced': 'Продвинутый',
            'all': 'Для всех'
        };
        return labels[difficulty] || difficulty;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // ==================== ГЕНЕРАЦИЯ ТЕСТОВЫХ ДАННЫХ ====================

    async generateTestStats() {
        return {
            totalUsers: 1542,
            activeUsers: 892,
            activeQuizzes: 23,
            totalSparks: 45890,
            totalPurchases: 342,
            pendingReviews: 12,
            pendingWorks: 8,
            users: {
                by_role: [
                    { role: 'Студент', count: 1200 },
                    { role: 'Художник', count: 250 },
                    { role: 'Преподаватель', count: 92 }
                ]
            },
            revenue: {
                total: 12500,
                by_item: [
                    { item: 'Курс акварели', type: 'video_course', price: 500, purchases: 25, revenue: 12500 },
                    { item: 'Набор кистей', type: 'brush_set', price: 300, purchases: 15, revenue: 4500 }
                ]
            }
        };
    }

    generateTestActivityData(days = 30) {
        const labels = [];
        const registrations = [];
        const activities = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
            
            registrations.push(Math.floor(Math.random() * 20) + 5);
            activities.push(Math.floor(Math.random() * 100) + 50);
        }
        
        return { labels, registrations, activities };
    }

    async loadRecentActivities() {
        // Тестовые данные
        const activities = [
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
                activity_type: 'marathon',
                description: 'Завершен марафон "7 дней акварели"',
                sparks_earned: 120,
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        const table = document.getElementById('recentActivitiesTable');
        if (table) {
            table.innerHTML = activities.map(activity => `
                <tr>
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
                </tr>
            `).join('');
        }
    }

    async loadTopUsers() {
        // Тестовые данные
        const users = [
            {
                name: 'Анна Смирнова',
                username: 'anna_art',
                role: 'Художник',
                level: 15,
                sparks: 12500,
                total_activities: 342
            },
            {
                name: 'Петр Иванов',
                username: 'peter_art',
                role: 'Студент',
                level: 8,
                sparks: 8900,
                total_activities: 215
            }
        ];
        
        const table = document.getElementById('topUsersTable');
        if (table) {
            table.innerHTML = users.map((user, index) => `
                <tr>
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
                </tr>
            `).join('');
        }
    }

    getActivityTypeLabel(activityType) {
        const labels = {
            'registration': 'Регистрация',
            'quiz': 'Квиз',
            'marathon': 'Марафон',
            'upload_work': 'Загрузка работы',
            'purchase': 'Покупка',
            'achievement': 'Достижение'
        };
        return labels[activityType] || activityType;
    }

    async updateNavigationBadges() {
        const stats = this.getStoredData('stats') || await this.generateTestStats();
        const quizzes = this.getStoredData('quizzes') || [];
        const marathons = this.getStoredData('marathons') || [];
        const interactives = this.getStoredData('interactives') || [];
        const posts = this.getStoredData('posts') || [];
        const shopItems = this.getStoredData('shopItems') || [];
        
        // Обновляем бейджи в навигации
        this.updateBadge('usersBadge', stats.totalUsers);
        this.updateBadge('quizzesBadge', quizzes.length);
        this.updateBadge('marathonsBadge', marathons.length);
        this.updateBadge('interactivesBadge', interactives.length);
        this.updateBadge('postsBadge', posts.length);
        this.updateBadge('shopBadge', shopItems.length);
        this.updateBadge('purchasesBadge', stats.totalPurchases);
        this.updateBadge('moderationBadge', stats.pendingReviews + stats.pendingWorks);
    }

    updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    updateUI() {
        // Обновляем информацию администратора
        const adminAvatar = document.getElementById('adminAvatar');
        const adminName = document.getElementById('adminName');
        const adminRole = document.getElementById('adminRole');
        
        if (adminAvatar) adminAvatar.textContent = 'A';
        if (adminName) adminName.textContent = this.admin?.tg_first_name || 'Администратор';
        if (adminRole) adminRole.textContent = this.getAdminRoleLabel(this.admin?.role);
    }

    getAdminRoleLabel(role) {
        const labels = {
            'superadmin': 'Супер администратор',
            'admin': 'Администратор',
            'moderator': 'Модератор'
        };
        return labels[role] || role;
    }

    async refreshData() {
        this.showMessage('Обновление данных...', 'info');
        await this.loadInitialData();
        this.showMessage('Данные обновлены', 'success');
    }

    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    }

    // ==================== МЕТОДЫ ДЛЯ ОСТАЛЬНЫХ РАЗДЕЛОВ ====================

    async loadUsers() {
        try {
            const users = this.getStoredData('users') || await this.generateTestUsers();
            const usersSection = document.getElementById('usersSection');
            usersSection.innerHTML = this.createUsersManagementHTML(users);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователей:', error);
            this.showMessage('Ошибка загрузки пользователей', 'error');
        }
    }

    async loadPurchases() {
        try {
            const purchases = this.getStoredData('purchases') || [];
            const purchasesSection = document.getElementById('purchasesSection');
            purchasesSection.innerHTML = this.createPurchasesManagementHTML(purchases);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки покупок:', error);
            this.showMessage('Ошибка загрузки покупок', 'error');
        }
    }

    async loadRoles() {
        try {
            const roles = this.getStoredData('roles') || await this.generateTestRoles();
            const rolesSection = document.getElementById('rolesSection');
            rolesSection.innerHTML = this.createRolesManagementHTML(roles);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ролей:', error);
            this.showMessage('Ошибка загрузки ролей', 'error');
        }
    }

    async loadCharacters() {
        try {
            const characters = this.getStoredData('characters') || [];
            const charactersSection = document.getElementById('charactersSection');
            charactersSection.innerHTML = this.createCharactersManagementHTML(characters);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей:', error);
            this.showMessage('Ошибка загрузки персонажей', 'error');
        }
    }

    async loadAchievements() {
        try {
            const achievements = this.getStoredData('achievements') || [];
            const achievementsSection = document.getElementById('achievementsSection');
            achievementsSection.innerHTML = this.createAchievementsManagementHTML(achievements);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки достижений:', error);
            this.showMessage('Ошибка загрузки достижений', 'error');
        }
    }

    async loadModeration() {
        try {
            const moderation = this.getStoredData('moderation') || { works: [], reviews: [] };
            const moderationSection = document.getElementById('moderationSection');
            moderationSection.innerHTML = this.createModerationManagementHTML(moderation);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки модерации:', error);
            this.showMessage('Ошибка загрузки модерации', 'error');
        }
    }

    async loadAdmins() {
        try {
            const admins = this.getStoredData('admins') || [this.admin];
            const adminsSection = document.getElementById('adminsSection');
            adminsSection.innerHTML = this.createAdminsManagementHTML(admins);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки администраторов:', error);
            this.showMessage('Ошибка загрузки администраторов', 'error');
        }
    }

    async loadSettings() {
        try {
            const settings = this.getStoredData('settings') || await this.generateDefaultSettings();
            const settingsSection = document.getElementById('settingsSection');
            settingsSection.innerHTML = this.createSettingsManagementHTML(settings);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки настроек:', error);
            this.showMessage('Ошибка загрузки настроек', 'error');
        }
    }

    // ==================== ЗАГЛУШКИ ДЛЯ НЕРЕАЛИЗОВАННЫХ МЕТОДОВ ====================

    async generateTestUsers() {
        return [
            {
                id: 1,
                name: 'Тестовый пользователь',
                username: 'test_user',
                role: 'student',
                level: 1,
                sparks: 100,
                is_premium: false,
                last_active: new Date().toISOString()
            }
        ];
    }

    async generateTestRoles() {
        return [
            {
                id: 1,
                name: 'Студент',
                description: 'Основная роль для учащихся',
                requirements: 'Регистрация в системе',
                icon: '🎓',
                users_count: 1200,
                is_active: true
            }
        ];
    }

    async generateDefaultSettings() {
        return [
            { key: 'app_name', value: 'Мастерская Вдохновения' },
            { key: 'app_version', value: '9.0.0' },
            { key: 'contact_email', value: 'support@inspiration.ru' }
        ];
    }

    // Методы просмотра (заглушки)
    viewQuiz(quizId) {
        this.showMessage(`Просмотр квиза #${quizId}`, 'info');
    }

    viewMarathon(marathonId) {
        this.showMessage(`Просмотр марафона #${marathonId}`, 'info');
    }

    viewInteractive(interactiveId) {
        this.showMessage(`Просмотр интерактива #${interactiveId}`, 'info');
    }

    viewPost(postId) {
        this.showMessage(`Просмотр поста #${postId}`, 'info');
    }

    viewItem(itemId) {
        this.showMessage(`Просмотр товара #${itemId}`, 'info');
    }

    // Методы редактирования (заглушки)
    editQuiz(quizId) {
        this.showMessage(`Редактирование квиза #${quizId}`, 'info');
    }

    editMarathon(marathonId) {
        this.showMessage(`Редактирование марафона #${marathonId}`, 'info');
    }

    editInteractive(interactiveId) {
        this.showMessage(`Редактирование интерактива #${interactiveId}`, 'info');
    }

    editPost(postId) {
        this.showMessage(`Редактирование поста #${postId}`, 'info');
    }

    editItem(itemId) {
        this.showMessage(`Редактирование товара #${itemId}`, 'info');
    }

    // HTML генераторы для остальных разделов (упрощенные)
    createUsersManagementHTML(users) {
        return `<div class="table-card"><p>Управление пользователями - ${users.length} пользователей</p></div>`;
    }

    createPurchasesManagementHTML(purchases) {
        return `<div class="table-card"><p>Управление покупками - ${purchases.length} покупок</p></div>`;
    }

    createRolesManagementHTML(roles) {
        return `<div class="table-card"><p>Управление ролями - ${roles.length} ролей</p></div>`;
    }

    createCharactersManagementHTML(characters) {
        return `<div class="table-card"><p>Управление персонажами - ${characters.length} персонажей</p></div>`;
    }

    createAchievementsManagementHTML(achievements) {
        return `<div class="table-card"><p>Управление достижениями - ${achievements.length} достижений</p></div>`;
    }

    createModerationManagementHTML(moderation) {
        return `<div class="table-card"><p>Модерация - ${moderation.works.length} работ, ${moderation.reviews.length} отзывов</p></div>`;
    }

    createAdminsManagementHTML(admins) {
        return `<div class="table-card"><p>Управление администраторами - ${admins.length} администраторов</p></div>`;
    }

    createSettingsManagementHTML(settings) {
        return `<div class="table-card"><p>Настройки системы - ${settings.length} параметров</p></div>`;
    }
}

// Инициализация админ-панели
const adminApp = new AdminApp();

// Глобальные функции для обработчиков событий
window.adminApp = adminApp;

// Обработка изменения типа интерактива
document.addEventListener('DOMContentLoaded', function() {
    const interactiveTypeSelect = document.getElementById('newInteractiveType');
    if (interactiveTypeSelect) {
        interactiveTypeSelect.addEventListener('change', function() {
            adminApp.updateInteractiveContent();
        });
    }
});

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Глобальная ошибка в админ панели:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанный промис в админ панели:', event.reason);
});

console.log('🔧 Админ панель Мастерская Вдохновения v9.0 загружена!');
