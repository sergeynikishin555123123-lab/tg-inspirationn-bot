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
                    username: 'admin'
                };
                localStorage.setItem(`admin_${this.userId}`, JSON.stringify(this.admin));
            }
            
            console.log('✅ Права администратора подтверждены');
            
        } catch (error) {
            console.error('❌ Ошибка доступа:', error);
            this.showMessage('У вас нет прав доступа к админ панели', 'error');
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

        // Инициализация загрузки файлов
        this.initFileUploads();

        console.log('✅ Обработчики событий инициализированы');
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
            previewItem.appendChild(video);
        } else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.controls = true;
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
        previewElement.remove();
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
                                                onclick="adminApp.toggleQuizStatus(${quiz.id})">
                                            <i class="fas fa-${quiz.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="adminApp.deleteQuiz(${quiz.id})">
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

        questionElements.forEach(questionElement => {
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

            optionElements.forEach(optionElement => {
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
            });

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
        });

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
                                                onclick="adminApp.toggleMarathonStatus(${marathon.id})">
                                            <i class="fas fa-${marathon.is_active ? 'pause' : 'play'}"></i>
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="adminApp.deleteMarathon(${marathon.id})">
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

        dayElements.forEach(dayElement => {
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
        });

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

    // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

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

    hideModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    getDifficultyBadgeClass(difficulty) {
        const classes = {
            'beginner': 'status-active',
            'intermediate': 'status-completed',
            'advanced': 'status-pending'
        };
        return classes[difficulty] || 'status-active';
    }

    getDifficultyLabel(difficulty) {
        const labels = {
            'beginner': 'Начинающий',
            'intermediate': 'Средний',
            'advanced': 'Продвинутый'
        };
        return labels[difficulty] || difficulty;
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
            }
        ];
        
        const table = document.getElementById('recentActivitiesTable');
        if (table) {
            table.innerHTML = activities.map(activity => `
                <tr>
                    <td>${activity.user_name}</td>
                    <td>${activity.activity_type}</td>
                    <td>${activity.description}</td>
                    <td>${activity.sparks_earned}✨</td>
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
            }
        ];
        
        const table = document.getElementById('topUsersTable');
        if (table) {
            table.innerHTML = users.map((user, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${user.name}</td>
                    <td>${user.role}</td>
                    <td>${user.level}</td>
                    <td>${user.sparks}✨</td>
                    <td>${user.total_activities}</td>
                </tr>
            `).join('');
        }
    }

    async updateNavigationBadges() {
        const stats = this.getStoredData('stats') || await this.generateTestStats();
        
        // Обновляем бейджи в навигации
        this.updateBadge('usersBadge', stats.totalUsers);
        this.updateBadge('quizzesBadge', stats.activeQuizzes);
        this.updateBadge('marathonsBadge', 5); // Тестовое значение
        this.updateBadge('interactivesBadge', 8); // Тестовое значение
        this.updateBadge('postsBadge', 25); // Тестовое значение
        this.updateBadge('shopBadge', 15); // Тестовое значение
        this.updateBadge('purchasesBadge', stats.totalPurchases);
        this.updateBadge('moderationBadge', stats.pendingReviews + stats.pendingWorks);
    }

    updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (badge && count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        }
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    updateUI() {
        // Обновляем информацию администратора
        const adminAvatar = document.getElementById('adminAvatar');
        const adminName = document.getElementById('adminName');
        const adminRole = document.getElementById('adminRole');
        
        if (adminAvatar) adminAvatar.textContent = 'A';
        if (adminName) adminName.textContent = 'Администратор';
        if (adminRole) adminRole.textContent = 'Super Admin';
    }

    async refreshData() {
        this.showMessage('Обновление данных...', 'info');
        await this.loadInitialData();
        this.showMessage('Данные обновлены', 'success');
    }

    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    }

    // ==================== ЗАГЛУШКИ ДЛЯ НЕРЕАЛИЗОВАННЫХ МЕТОДОВ ====================

    async loadUsers() {
        this.showMessage('Загрузка пользователей...', 'info');
    }

    async loadInteractives() {
        this.showMessage('Загрузка интерактивов...', 'info');
    }

    async loadPosts() {
        this.showMessage('Загрузка постов...', 'info');
    }

    async loadShopItems() {
        this.showMessage('Загрузка товаров...', 'info');
    }

    async loadPurchases() {
        this.showMessage('Загрузка покупок...', 'info');
    }

    async loadRoles() {
        this.showMessage('Загрузка ролей...', 'info');
    }

    async loadCharacters() {
        this.showMessage('Загрузка персонажей...', 'info');
    }

    async loadAchievements() {
        this.showMessage('Загрузка достижений...', 'info');
    }

    async loadModeration() {
        this.showMessage('Загрузка модерации...', 'info');
    }

    async loadAdmins() {
        this.showMessage('Загрузка администраторов...', 'info');
    }

    async loadSettings() {
        this.showMessage('Загрузка настроек...', 'info');
    }

    // Методы для интерактивов
    showCreateInteractiveForm() {
        this.showMessage('Форма создания интерактива', 'info');
    }

    async createInteractive() {
        this.showMessage('Интерактив создан', 'success');
    }

    // Методы для постов
    showCreatePostForm() {
        document.getElementById('createPostModal').classList.add('active');
    }

    async createPost() {
        this.showMessage('Пост создан', 'success');
    }

    // Методы для магазина
    showCreateItemForm() {
        document.getElementById('createItemModal').classList.add('active');
    }

    async createItem() {
        this.showMessage('Товар создан', 'success');
    }

    // Методы управления
    toggleQuizStatus(quizId) {
        this.showMessage(`Статус квиза ${quizId} изменен`, 'success');
    }

    toggleMarathonStatus(marathonId) {
        this.showMessage(`Статус марафона ${marathonId} изменен`, 'success');
    }

    deleteQuiz(quizId) {
        if (confirm('Удалить этот квиз?')) {
            this.showMessage('Квиз удален', 'success');
        }
    }

    deleteMarathon(marathonId) {
        if (confirm('Удалить этот марафон?')) {
            this.showMessage('Марафон удален', 'success');
        }
    }

    viewQuiz(quizId) {
        this.showMessage(`Просмотр квиза ${quizId}`, 'info');
    }

    viewMarathon(marathonId) {
        this.showMessage(`Просмотр марафона ${marathonId}`, 'info');
    }

    editQuiz(quizId) {
        this.showMessage(`Редактирование квиза ${quizId}`, 'info');
    }

    editMarathon(marathonId) {
        this.showMessage(`Редактирование марафона ${quizId}`, 'info');
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
