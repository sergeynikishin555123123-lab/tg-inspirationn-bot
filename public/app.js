// app.js - Полная версия клиентского приложения Мастерской Вдохновения v9.0

class InspirationWorkshop {
    constructor() {
        this.user = null;
        this.userId = null;
        this.initData = null;
        this.sections = {};
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.quizAnswers = [];
        this.quizStartTime = null;
        
        this.init();
    }

    async init() {
        console.log('🎨 Мастерская Вдохновения - Инициализация приложения v9.0');
        
        try {
            // Инициализация Telegram WebApp
            if (window.Telegram && Telegram.WebApp) {
                this.initData = Telegram.WebApp.initData;
                this.userId = Telegram.WebApp.initDataUnsafe.user?.id;
                Telegram.WebApp.expand();
                Telegram.WebApp.enableClosingConfirmation();
                
                console.log('✅ Telegram WebApp инициализирован');
                console.log('👤 User ID:', this.userId);
            } else {
                // Режим разработки - используем тестовый ID
                this.userId = 12345;
                console.log('🔧 Режим разработки - тестовый User ID:', this.userId);
            }

            // Загрузка пользователя
            await this.loadUser();
            
            // Инициализация интерфейса
            this.initEventListeners();
            this.updateUI();
            
            // Загрузка начальных данных
            this.loadInitialData();

        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showMessage('Ошибка загрузки приложения. Пожалуйста, перезагрузите страницу.', 'error');
        }
    }

    async loadUser() {
        try {
            const response = await fetch(`/api/users/${this.userId}`);
            const data = await response.json();
            
            if (data.exists) {
                this.user = data.user;
                console.log('✅ Пользователь загружен:', this.user);
                
                if (!this.user.is_registered) {
                    this.showRegistration();
                }
            } else {
                console.log('❌ Пользователь не найден, показываем регистрацию');
                this.showRegistration();
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователя:', error);
            this.showRegistration();
        }
    }

    showRegistration() {
        document.getElementById('mainContent').classList.remove('active');
        document.getElementById('registrationSection').classList.add('active');
        this.loadRoles();
    }

    async loadRoles() {
        try {
            const response = await fetch('/api/webapp/roles');
            const roles = await response.json();
            
            const roleSelection = document.getElementById('roleSelection');
            roleSelection.innerHTML = '';
            
            roles.forEach(role => {
                const roleCard = document.createElement('div');
                roleCard.className = 'role-card';
                roleCard.innerHTML = `
                    <div class="role-icon">${role.icon}</div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                    <div class="role-requirements">${role.requirements}</div>
                `;
                
                roleCard.addEventListener('click', () => this.selectRole(role));
                roleSelection.appendChild(roleCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ролей:', error);
            this.showMessage('Ошибка загрузки ролей', 'error');
        }
    }

    selectRole(role) {
        // Убираем выделение со всех карточек
        document.querySelectorAll('.role-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем выбранную карточку
        event.currentTarget.classList.add('selected');
        
        this.selectedRole = role;
        this.loadCharacters(role.id);
        
        // Показываем раздел выбора персонажа
        document.getElementById('characterSection').classList.remove('hidden');
        document.getElementById('registerBtn').classList.remove('hidden');
    }

    async loadCharacters(roleId) {
        try {
            const response = await fetch(`/api/webapp/characters/${roleId}`);
            const characters = await response.json();
            
            const characterSelection = document.getElementById('characterSelection');
            characterSelection.innerHTML = '';
            
            characters.forEach(character => {
                const characterCard = document.createElement('div');
                characterCard.className = 'character-card';
                characterCard.innerHTML = `
                    <div class="character-header">
                        <div class="character-avatar">${character.avatar}</div>
                        <div class="character-name">${character.name}</div>
                    </div>
                    <div class="character-description">${character.description}</div>
                    <div class="character-bonus">${character.bonus_description}</div>
                `;
                
                characterCard.addEventListener('click', () => this.selectCharacter(character));
                characterSelection.appendChild(characterCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей:', error);
            this.showMessage('Ошибка загрузки персонажей', 'error');
        }
    }

    selectCharacter(character) {
        // Убираем выделение со всех карточек
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем выбранную карточку
        event.currentTarget.classList.add('selected');
        
        this.selectedCharacter = character;
    }

    async completeRegistration() {
        if (!this.selectedRole || !this.selectedCharacter) {
            this.showMessage('Пожалуйста, выберите роль и персонажа', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    firstName: this.initData?.user?.first_name || 'Пользователь',
                    username: this.initData?.user?.username,
                    roleId: this.selectedRole.id,
                    characterId: this.selectedCharacter.id
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.user = data.user;
                this.showMessage(data.message, 'success');
                this.showDashboard();
                this.updateUI();
            } else {
                this.showMessage(data.error || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            this.showMessage('Ошибка регистрации', 'error');
        }
    }

    showDashboard() {
        // Скрываем все секции
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Показываем главную панель
        document.getElementById('mainContent').classList.add('active');
    }

// НАХОДИМ в app.js функцию showSection и ЗАМЕНЯЕМ её:
showSection(sectionName) {
    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    const section = document.getElementById(sectionName + 'Section');
    if (section) {
        section.classList.add('active');
        this.currentSection = sectionName;
        
        // Загружаем данные для секции
        this.loadSectionData(sectionName);
    }
    
    // Всегда скрываем регистрационную секцию при переключении разделов
    document.getElementById('registrationSection').classList.remove('active');
}

// ДОБАВЛЯЕМ функцию для показа главной панели:
showDashboard() {
    // Скрываем все секции
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем главную панель
    document.getElementById('mainContent').classList.add('active');
}

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'quizzes':
                this.loadQuizzes();
                break;
            case 'marathons':
                this.loadMarathons();
                break;
            case 'interactives':
                this.loadInteractives();
                break;
            case 'works':
                this.loadWorks();
                break;
            case 'shop':
                this.loadShopItems();
                break;
            case 'posts':
                this.loadPosts();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
            case 'activities':
                this.loadActivities();
                break;
            case 'purchases':
                this.loadPurchases();
                break;
            case 'changeRole':
                this.loadChangeRole();
                break;
            case 'notifications':
                this.loadNotifications();
                break;
            case 'profile':
                this.loadProfile();
                break;
        }
    }

    updateUI() {
        if (!this.user) return;

        // Обновляем информацию пользователя
        document.getElementById('userName').textContent = this.user.tg_first_name;
        document.getElementById('userRole').textContent = this.user.class || 'Не выбрана';
        document.getElementById('userLevel').textContent = this.user.level;
        document.getElementById('sparksAmount').textContent = this.user.sparks.toFixed(1);
        
        // Обновляем аватар
        const avatar = document.getElementById('userAvatar');
        avatar.textContent = this.user.tg_first_name?.charAt(0) || 'U';
        
        // Обновляем статистику
        if (this.user.stats) {
            document.getElementById('quizzesCount').textContent = this.user.stats.totalQuizzesCompleted || 0;
            document.getElementById('marathonsCount').textContent = this.user.stats.totalMarathonsCompleted || 0;
            document.getElementById('worksCount').textContent = this.user.stats.totalWorks || 0;
            
            // Обновляем прогресс уровня
            document.getElementById('userLevelDisplay').textContent = this.user.level;
            document.getElementById('levelProgressPercent').textContent = 
                Math.round(this.user.stats.levelProgress || 0) + '%';
            document.getElementById('levelProgressBar').style.width = 
                (this.user.stats.levelProgress || 0) + '%';
        }

        // Загружаем последние активности
        this.loadRecentActivities();
        
        // Проверяем уведомления
        this.checkNotifications();
    }

    async loadRecentActivities() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/activities?limit=5`);
            const data = await response.json();
            
            const activitiesList = document.getElementById('recentActivities');
            
            if (data.activities.length === 0) {
                activitiesList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-title">Пока нет активностей</div>
                        <div class="empty-state-description">Начните с прохождения квиза или загрузки работы!</div>
                    </div>
                `;
                return;
            }
            
            activitiesList.innerHTML = '';
            
            data.activities.forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                
                const icon = this.getActivityIcon(activity.activity_type);
                const time = this.formatTime(activity.created_at);
                
                activityItem.innerHTML = `
                    <div class="activity-icon">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.description}</div>
                        <div class="activity-time">${time}</div>
                    </div>
                    <div class="activity-sparks">+${activity.sparks_earned}✨</div>
                `;
                
                activitiesList.appendChild(activityItem);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки активностей:', error);
        }
    }

    async loadQuizzes() {
        try {
            const response = await fetch(`/api/webapp/quizzes?userId=${this.userId}`);
            const quizzes = await response.json();
            
            const quizzesList = document.getElementById('quizzesList');
            
            if (quizzes.length === 0) {
                quizzesList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🎯</div>
                        <div class="empty-state-title">Пока нет доступных квизов</div>
                        <div class="empty-state-description">Новые квизы появятся скоро!</div>
                    </div>
                `;
                return;
            }
            
            quizzesList.innerHTML = '';
            
            quizzes.forEach(quiz => {
                const quizCard = document.createElement('div');
                quizCard.className = 'card';
                
                const status = quiz.completed ? 
                    `<span style="color: var(--success-color);">✅ Пройден (${quiz.user_score}/${quiz.total_questions})</span>` :
                    `<span style="color: var(--primary-color);">🆕 Доступен</span>`;
                
                const buttonText = quiz.completed ? 
                    (quiz.can_retake ? 'Пройти снова' : 'Просмотреть') : 
                    'Начать квиз';
                
                const buttonClass = quiz.completed ? 
                    (quiz.can_retake ? 'btn-primary' : 'btn-secondary') : 
                    'btn-primary';
                
                quizCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${quiz.title}</div>
                            <div class="card-description">${quiz.description}</div>
                        </div>
                        <div style="text-align: right;">
                            ${status}
                        </div>
                    </div>
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-star"></i>
                            ${quiz.difficulty}
                        </div>
                        <div class="tag">
                            <i class="fas fa-clock"></i>
                            ${quiz.duration_minutes} мин
                        </div>
                        <div class="tag">
                            <i class="fas fa-question"></i>
                            ${quiz.total_questions} вопросов
                        </div>
                        ${quiz.attempts_left !== undefined ? `
                        <div class="tag">
                            <i class="fas fa-sync-alt"></i>
                            ${quiz.attempts_left} попыток сегодня
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Сложность</span>
                            <span>${quiz.average_score ? quiz.average_score.toFixed(1) : '0'}/5</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(quiz.average_score || 0) * 20}%"></div>
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn ${buttonClass}" onclick="app.startQuiz(${quiz.id})">
                            <i class="fas fa-play"></i>
                            ${buttonText}
                        </button>
                        ${quiz.completed ? `
                        <button class="btn btn-secondary" onclick="app.viewQuizResults(${quiz.id})">
                            <i class="fas fa-chart-bar"></i>
                            Результаты
                        </button>
                        ` : ''}
                    </div>
                `;
                
                quizzesList.appendChild(quizCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки квизов:', error);
            this.showMessage('Ошибка загрузки квизов', 'error');
        }
    }

    async startQuiz(quizId) {
        try {
            const response = await fetch(`/api/webapp/quizzes/${quizId}?userId=${this.userId}`);
            const quiz = await response.json();
            
            if (!quiz) {
                this.showMessage('Квиз не найден', 'error');
                return;
            }
            
            this.currentQuiz = quiz;
            this.currentQuestionIndex = 0;
            this.quizAnswers = [];
            this.quizStartTime = Date.now();
            
            this.showQuizQuestion();
            
        } catch (error) {
            console.error('❌ Ошибка начала квиза:', error);
            this.showMessage('Ошибка начала квиза', 'error');
        }
    }

    showQuizQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        
        const quizHTML = `
            <div class="quiz-container">
                <div class="quiz-progress">
                    <div class="quiz-progress-bar" style="width: ${((this.currentQuestionIndex + 1) / this.currentQuiz.questions.length) * 100}%"></div>
                </div>
                
                <div class="question-number">
                    Вопрос ${this.currentQuestionIndex + 1} из ${this.currentQuiz.questions.length}
                </div>
                
                <div class="question-text">
                    ${question.question}
                </div>
                
                ${question.image_url ? `
                <div style="text-align: center; margin: 20px 0;">
                    <img src="${question.image_url}" alt="Иллюстрация" style="max-width: 100%; border-radius: var(--radius-md);">
                </div>
                ` : ''}
                
                <div class="options-list">
                    ${question.options.map((option, index) => `
                        <div class="option-item" onclick="app.selectQuizAnswer(${index})">
                            ${option}
                        </div>
                    `).join('')}
                </div>
                
                <div class="card-actions">
                    ${this.currentQuestionIndex > 0 ? `
                    <button class="btn btn-secondary" onclick="app.previousQuizQuestion()">
                        <i class="fas fa-arrow-left"></i>
                        Назад
                    </button>
                    ` : ''}
                    
                    <button class="btn btn-primary" onclick="app.nextQuizQuestion()" id="nextQuizBtn" ${this.quizAnswers[this.currentQuestionIndex] === undefined ? 'disabled' : ''}>
                        ${this.currentQuestionIndex === this.currentQuiz.questions.length - 1 ? 'Завершить квиз' : 'Следующий вопрос'}
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('quizzesList').innerHTML = quizHTML;
    }

    selectQuizAnswer(answerIndex) {
        // Убираем выделение со всех вариантов
        document.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Выделяем выбранный вариант
        event.currentTarget.classList.add('selected');
        
        this.quizAnswers[this.currentQuestionIndex] = answerIndex;
        document.getElementById('nextQuizBtn').disabled = false;
    }

    previousQuizQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showQuizQuestion();
        }
    }

    nextQuizQuestion() {
        if (this.quizAnswers[this.currentQuestionIndex] === undefined) {
            this.showMessage('Пожалуйста, выберите ответ', 'warning');
            return;
        }
        
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuizQuestion();
        } else {
            this.submitQuiz();
        }
    }

    async submitQuiz() {
        try {
            const timeSpent = Math.round((Date.now() - this.quizStartTime) / 1000);
            
            const response = await fetch(`/api/webapp/quizzes/${this.currentQuiz.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    answers: this.quizAnswers,
                    timeSpent: timeSpent
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showQuizResults(data);
            } else {
                this.showMessage(data.error || 'Ошибка отправки квиза', 'error');
                this.loadQuizzes(); // Возвращаемся к списку квизов
            }
        } catch (error) {
            console.error('❌ Ошибка отправки квиза:', error);
            this.showMessage('Ошибка отправки квиза', 'error');
        }
    }

    showQuizResults(results) {
        const resultsHTML = `
            <div class="results-container">
                <div class="results-score">
                    ${results.correctAnswers}/${results.totalQuestions}
                </div>
                
                <div class="results-message">
                    ${results.perfectScore ? 
                        '🎉 Идеальный результат! Поздравляем!' : 
                        results.correctAnswers === results.totalQuestions ? 
                        '🎉 Отличный результат!' :
                        'Хорошая работа! Продолжайте в том же духе!'}
                </div>
                
                <div class="card" style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--success-color); margin-bottom: 8px;">
                        +${results.sparksEarned}✨
                    </div>
                    <div style="color: var(--text-muted);">
                        ${results.message}
                    </div>
                    ${results.character_bonus ? `
                    <div style="margin-top: 12px; padding: 12px; background: rgba(102, 126, 234, 0.1); border-radius: var(--radius-md);">
                        <i class="fas fa-star"></i> Бонус персонажа: ${results.character_bonus}
                    </div>
                    ` : ''}
                </div>
                
                ${results.attempts_left !== undefined ? `
                <div class="card" style="text-align: center;">
                    <div style="font-weight: 600; margin-bottom: 8px;">Осталось попыток сегодня: ${results.attempts_left}</div>
                </div>
                ` : ''}
                
                <div class="card-actions" style="justify-content: center; margin-top: 24px;">
                    <button class="btn btn-primary" onclick="app.loadQuizzes()">
                        <i class="fas fa-list"></i>
                        К списку квизов
                    </button>
                    <button class="btn btn-secondary" onclick="app.viewQuizDetails(${this.currentQuiz.id})">
                        <i class="fas fa-chart-bar"></i>
                        Детали результатов
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('quizzesList').innerHTML = resultsHTML;
        
        // Обновляем данные пользователя
        this.loadUser();
    }

    async loadMarathons() {
        try {
            const response = await fetch(`/api/webapp/marathons?userId=${this.userId}`);
            const marathons = await response.json();
            
            const marathonsList = document.getElementById('marathonsList');
            
            if (marathons.length === 0) {
                marathonsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏃‍♂️</div>
                        <div class="empty-state-title">Пока нет доступных марафонов</div>
                        <div class="empty-state-description">Новые марафоны появятся скоро!</div>
                    </div>
                `;
                return;
            }
            
            marathonsList.innerHTML = '';
            
            marathons.forEach(marathon => {
                const marathonCard = document.createElement('div');
                marathonCard.className = 'card';
                
                const status = marathon.completed ? 
                    `<span style="color: var(--success-color);">✅ Завершен</span>` :
                    marathon.started_at ? 
                    `<span style="color: var(--primary-color);">🔄 В процессе (день ${marathon.current_day})</span>` :
                    `<span style="color: var(--warning-color);">🆕 Доступен</span>`;
                
                const buttonText = marathon.completed ? 
                    'Просмотреть' : 
                    marathon.started_at ? 
                    'Продолжить' : 
                    'Начать марафон';
                
                const buttonClass = marathon.completed ? 
                    'btn-secondary' : 'btn-primary';
                
                marathonCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${marathon.title}</div>
                            <div class="card-description">${marathon.description}</div>
                        </div>
                        <div style="text-align: right;">
                            ${status}
                        </div>
                    </div>
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-calendar"></i>
                            ${marathon.duration_days} дней
                        </div>
                        <div class="tag">
                            <i class="fas fa-star"></i>
                            ${marathon.difficulty}
                        </div>
                        <div class="tag">
                            <i class="fas fa-users"></i>
                            ${marathon.participants_count} участников
                        </div>
                        <div class="tag">
                            <i class="fas fa-trophy"></i>
                            ${marathon.completion_rate}% завершают
                        </div>
                    </div>
                    
                    ${marathon.started_at ? `
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Прогресс</span>
                            <span>${marathon.progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${marathon.progress}%"></div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="card-actions">
                        <button class="btn ${buttonClass}" onclick="app.${marathon.completed ? 'viewMarathon' : marathon.started_at ? 'continueMarathon' : 'startMarathon'}(${marathon.id})">
                            <i class="fas fa-${marathon.completed ? 'eye' : marathon.started_at ? 'play' : 'flag'}"></i>
                            ${buttonText}
                        </button>
                    </div>
                `;
                
                marathonsList.appendChild(marathonCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки марафонов:', error);
            this.showMessage('Ошибка загрузки марафонов', 'error');
        }
    }

    async startMarathon(marathonId) {
        try {
            const response = await fetch(`/api/webapp/marathons/${marathonId}/submit-day`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    day: 1
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage('Марафон начат! ' + data.message, 'success');
                this.loadMarathons();
            } else {
                this.showMessage(data.error || 'Ошибка начала марафона', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка начала марафона:', error);
            this.showMessage('Ошибка начала марафона', 'error');
        }
    }

    async continueMarathon(marathonId) {
        // Показываем текущий день марафона
        this.showMarathonDay(marathonId);
    }

    async showMarathonDay(marathonId) {
        try {
            const response = await fetch(`/api/webapp/marathons/${marathonId}?userId=${this.userId}`);
            const marathon = await response.json();
            
            if (!marathon) {
                this.showMessage('Марафон не найден', 'error');
                return;
            }
            
            const currentTask = marathon.current_task;
            
            const marathonHTML = `
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">${marathon.title} - День ${marathon.current_day}</div>
                            <div class="card-description">${currentTask.title}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: var(--primary-color);">🔄 День ${marathon.current_day} из ${marathon.duration_days}</span>
                        </div>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Прогресс марафона</span>
                            <span>${marathon.progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${marathon.progress}%"></div>
                        </div>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <h3 style="margin-bottom: 12px;">📝 Задание</h3>
                        <p style="margin-bottom: 16px; line-height: 1.6;">${currentTask.description}</p>
                        
                        ${currentTask.instructions ? `
                        <div style="background: var(--light-color); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                            <strong>Инструкции:</strong><br>
                            ${currentTask.instructions}
                        </div>
                        ` : ''}
                        
                        ${currentTask.tips && currentTask.tips.length > 0 ? `
                        <div style="background: rgba(255, 193, 7, 0.1); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
                            <strong>💡 Советы:</strong><br>
                            <ul style="margin: 8px 0 0 20px;">
                                ${currentTask.tips.map(tip => `<li>${tip}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${currentTask.requires_submission ? `
                    <div class="form-group">
                        <label class="form-label">Ваша работа или ответ</label>
                        <textarea class="form-control" id="marathonSubmission" placeholder="Опишите вашу работу или прикрепите ссылку на изображение..." rows="4"></textarea>
                    </div>
                    ` : ''}
                    
                    <div class="card-actions">
                        <button class="btn btn-primary" onclick="app.submitMarathonDay(${marathon.id}, ${marathon.current_day})">
                            <i class="fas fa-check"></i>
                            ${currentTask.requires_submission ? 'Отправить работу' : 'Завершить день'}
                        </button>
                        <button class="btn btn-secondary" onclick="app.loadMarathons()">
                            <i class="fas fa-arrow-left"></i>
                            Назад
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('marathonsList').innerHTML = marathonHTML;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки дня марафона:', error);
            this.showMessage('Ошибка загрузки дня марафона', 'error');
        }
    }

    async submitMarathonDay(marathonId, day) {
        try {
            const submissionText = document.getElementById('marathonSubmission')?.value || '';
            
            const response = await fetch(`/api/webapp/marathons/${marathonId}/submit-day`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    day: day,
                    submission_text: submissionText
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                
                if (data.completed) {
                    this.loadMarathons(); // Возвращаемся к списку
                } else {
                    this.showMarathonDay(marathonId); // Показываем следующий день
                }
                
                // Обновляем данные пользователя
                this.loadUser();
            } else {
                this.showMessage(data.error || 'Ошибка отправки дня', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки дня марафона:', error);
            this.showMessage('Ошибка отправки дня марафона', 'error');
        }
    }

    async loadInteractives() {
        try {
            const response = await fetch(`/api/webapp/interactives?userId=${this.userId}`);
            const interactives = await response.json();
            
            const interactivesList = document.getElementById('interactivesList');
            
            if (interactives.length === 0) {
                interactivesList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🎮</div>
                        <div class="empty-state-title">Пока нет доступных интерактивов</div>
                        <div class="empty-state-description">Новые интерактивы появятся скоро!</div>
                    </div>
                `;
                return;
            }
            
            interactivesList.innerHTML = '';
            
            interactives.forEach(interactive => {
                const interactiveCard = document.createElement('div');
                interactiveCard.className = 'card';
                
                const status = interactive.completed ? 
                    `<span style="color: var(--success-color);">✅ Пройден</span>` :
                    `<span style="color: var(--primary-color);">🆕 Доступен</span>`;
                
                const buttonText = interactive.completed ? 
                    (interactive.can_retake ? 'Попробовать снова' : 'Просмотреть') : 
                    'Начать';
                
                const buttonClass = interactive.completed ? 
                    (interactive.can_retake ? 'btn-primary' : 'btn-secondary') : 
                    'btn-primary';
                
                interactiveCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${interactive.title}</div>
                            <div class="card-description">${interactive.description}</div>
                        </div>
                        <div style="text-align: right;">
                            ${status}
                        </div>
                    </div>
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-star"></i>
                            ${interactive.difficulty}
                        </div>
                        <div class="tag">
                            <i class="fas fa-clock"></i>
                            ${interactive.time_limit} сек
                        </div>
                        <div class="tag">
                            <i class="fas fa-trophy"></i>
                            +${interactive.sparks_reward} искр
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn ${buttonClass}" onclick="app.startInteractive(${interactive.id})">
                            <i class="fas fa-play"></i>
                            ${buttonText}
                        </button>
                    </div>
                `;
                
                interactivesList.appendChild(interactiveCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки интерактивов:', error);
            this.showMessage('Ошибка загрузки интерактивов', 'error');
        }
    }

    async startInteractive(interactiveId) {
        try {
            const response = await fetch(`/api/webapp/interactives/${interactiveId}?userId=${this.userId}`);
            const interactive = await response.json();
            
            if (!interactive) {
                this.showMessage('Интерактив не найден', 'error');
                return;
            }
            
            this.currentInteractive = interactive;
            this.showInteractiveQuestion();
            
        } catch (error) {
            console.error('❌ Ошибка начала интерактива:', error);
            this.showMessage('Ошибка начала интерактива', 'error');
        }
    }

    showInteractiveQuestion() {
        const interactive = this.currentInteractive;
        
        const interactiveHTML = `
            <div class="quiz-container">
                <div class="question-text">
                    ${interactive.question}
                </div>
                
                ${interactive.image_url ? `
                <div style="text-align: center; margin: 20px 0;">
                    <img src="${interactive.image_url}" alt="Иллюстрация" style="max-width: 100%; border-radius: var(--radius-md);">
                </div>
                ` : ''}
                
                <div class="options-list">
                    ${interactive.options.map((option, index) => `
                        <div class="option-item" onclick="app.selectInteractiveAnswer(${index})">
                            ${option}
                        </div>
                    `).join('')}
                </div>
                
                ${interactive.hints && interactive.hints.length > 0 ? `
                <div style="margin-top: 20px;">
                    <details>
                        <summary style="cursor: pointer; font-weight: 600; color: var(--primary-color);">
                            <i class="fas fa-lightbulb"></i> Подсказки
                        </summary>
                        <div style="margin-top: 12px; padding: 12px; background: var(--light-color); border-radius: var(--radius-md);">
                            <ul style="margin: 0;">
                                ${interactive.hints.map(hint => `<li style="margin-bottom: 8px;">${hint}</li>`).join('')}
                            </ul>
                        </div>
                    </details>
                </div>
                ` : ''}
                
                <div class="card-actions">
                    <button class="btn btn-primary" onclick="app.submitInteractiveAnswer()" id="submitInteractiveBtn" disabled>
                        <i class="fas fa-paper-plane"></i>
                        Проверить ответ
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('interactivesList').innerHTML = interactiveHTML;
    }

    selectInteractiveAnswer(answerIndex) {
        // Убираем выделение со всех вариантов
        document.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Выделяем выбранный вариант
        event.currentTarget.classList.add('selected');
        
        this.selectedInteractiveAnswer = answerIndex;
        document.getElementById('submitInteractiveBtn').disabled = false;
    }

    async submitInteractiveAnswer() {
        if (this.selectedInteractiveAnswer === undefined) {
            this.showMessage('Пожалуйста, выберите ответ', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/webapp/interactives/${this.currentInteractive.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    answer: this.selectedInteractiveAnswer
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showInteractiveResults(data);
            } else {
                this.showMessage(data.error || 'Ошибка отправки ответа', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки интерактива:', error);
            this.showMessage('Ошибка отправки интерактива', 'error');
        }
    }

    showInteractiveResults(results) {
        const interactive = this.currentInteractive;
        
        const resultsHTML = `
            <div class="results-container">
                <div class="results-score" style="font-size: ${results.correct ? 'var(--font-4xl)' : 'var(--font-3xl)'}; color: ${results.correct ? 'var(--success-color)' : 'var(--danger-color)'};">
                    ${results.correct ? '✅ Правильно!' : '❌ Неправильно'}
                </div>
                
                ${results.correct ? `
                <div class="card" style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--success-color); margin-bottom: 8px;">
                        +${results.sparksEarned}✨
                    </div>
                    <div style="color: var(--text-muted);">
                        ${results.message}
                    </div>
                </div>
                ` : ''}
                
                ${interactive.explanation ? `
                <div class="card" style="margin-bottom: 20px;">
                    <h3 style="margin-bottom: 12px;">📚 Объяснение</h3>
                    <p style="line-height: 1.6;">${interactive.explanation}</p>
                </div>
                ` : ''}
                
                <div class="card-actions" style="justify-content: center;">
                    <button class="btn btn-primary" onclick="app.loadInteractives()">
                        <i class="fas fa-list"></i>
                        К списку интерактивов
                    </button>
                    ${results.correct && interactive.allow_retake ? `
                    <button class="btn btn-secondary" onclick="app.startInteractive(${interactive.id})">
                        <i class="fas fa-redo"></i>
                        Попробовать снова
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('interactivesList').innerHTML = resultsHTML;
        
        // Обновляем данные пользователя
        this.loadUser();
    }

    async loadWorks() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/works`);
            const data = await response.json();
            
            const worksList = document.getElementById('worksList');
            
            if (data.works.length === 0) {
                worksList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🖼️</div>
                        <div class="empty-state-title">У вас пока нет работ</div>
                        <div class="empty-state-description">Загрузите свою первую работу и покажите ее сообществу!</div>
                    </div>
                `;
                return;
            }
            
            worksList.innerHTML = '';
            
            data.works.forEach(work => {
                const workCard = document.createElement('div');
                workCard.className = 'card';
                
                const status = work.status === 'approved' ? 
                    `<span style="color: var(--success-color);">✅ Одобрено</span>` :
                    work.status === 'rejected' ? 
                    `<span style="color: var(--danger-color);">❌ Отклонено</span>` :
                    `<span style="color: var(--warning-color);">⏳ На модерации</span>`;
                
                workCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${work.title}</div>
                            <div class="card-description">${work.description}</div>
                        </div>
                        <div style="text-align: right;">
                            ${status}
                        </div>
                    </div>
                    
                    ${work.image_url ? `
                    <div style="text-align: center; margin: 16px 0;">
                        <img src="${work.image_url}" alt="${work.title}" style="max-width: 100%; max-height: 300px; border-radius: var(--radius-md);">
                    </div>
                    ` : ''}
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-tag"></i>
                            ${work.category}
                        </div>
                        <div class="tag">
                            <i class="fas fa-calendar"></i>
                            ${this.formatTime(work.created_at)}
                        </div>
                        ${work.likes_count > 0 ? `
                        <div class="tag">
                            <i class="fas fa-heart"></i>
                            ${work.likes_count}
                        </div>
                        ` : ''}
                    </div>
                    
                    ${work.admin_comment ? `
                    <div style="margin: 16px 0; padding: 12px; background: var(--light-color); border-radius: var(--radius-md);">
                        <strong>Комментарий модератора:</strong><br>
                        ${work.admin_comment}
                    </div>
                    ` : ''}
                `;
                
                worksList.appendChild(workCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки работ:', error);
            this.showMessage('Ошибка загрузки работ', 'error');
        }
    }

    // ИСПРАВИТЬ метод showUploadWorkForm в public/app.js
showUploadWorkForm() {
    const formHTML = `
        <div class="card">
            <h3 style="margin-bottom: 16px;">📤 Загрузка новой работы</h3>
            
            <form id="uploadWorkForm" enctype="multipart/form-data">
                <div class="form-group">
                    <label class="form-label">Название работы *</label>
                    <input type="text" class="form-control" id="workTitle" placeholder="Введите название вашей работы" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Описание</label>
                    <textarea class="form-control" id="workDescription" placeholder="Опишите вашу работу, технику, идею..." rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Изображение работы *</label>
                    <input type="file" class="form-control" id="workImage" accept="image/*" required>
                    <small style="color: var(--text-muted); margin-top: 4px; display: block;">
                        Выберите файл изображения (JPG, PNG, до 10MB)
                    </small>
                    <div id="imagePreview" style="margin-top: 12px; display: none;">
                        <img id="previewImage" style="max-width: 200px; max-height: 200px; border-radius: var(--radius-md);">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Категория</label>
                    <select class="form-control" id="workCategory">
                        <option value="painting">Живопись</option>
                        <option value="drawing">Рисунок</option>
                        <option value="digital">Цифровое искусство</option>
                        <option value="photography">Фотография</option>
                        <option value="fashion">Мода и стиль</option>
                        <option value="other">Другое</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Теги (через запятую)</label>
                    <input type="text" class="form-control" id="workTags" placeholder="акварель, пейзаж, природа">
                </div>
                
                <div class="card-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-upload"></i>
                        Загрузить работу
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="app.loadWorks()">
                        <i class="fas fa-arrow-left"></i>
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('worksList').innerHTML = formHTML;
    
    // Добавляем обработчик предпросмотра изображения
    document.getElementById('workImage').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('imagePreview');
                const img = document.getElementById('previewImage');
                img.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Добавляем обработчик отправки формы
    document.getElementById('uploadWorkForm').addEventListener('submit', (e) => {
        e.preventDefault();
        this.uploadWork();
    });
}

// ИСПРАВИТЬ метод uploadWork в public/app.js
async uploadWork() {
    const title = document.getElementById('workTitle').value.trim();
    const description = document.getElementById('workDescription').value.trim();
    const imageFile = document.getElementById('workImage').files[0];
    const category = document.getElementById('workCategory').value;
    const tags = document.getElementById('workTags').value;
    
    if (!title || !imageFile) {
        this.showMessage('Пожалуйста, заполните обязательные поля', 'warning');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('userId', this.userId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', imageFile);
        formData.append('category', category);
        formData.append('tags', tags);

        const response = await fetch('/api/webapp/upload-work', {
            method: 'POST',
            body: formData
            // Не устанавливаем Content-Type - браузер сделает это сам с boundary
        });

        const data = await response.json();
        
        if (data.success) {
            this.showMessage(data.message, 'success');
            this.loadWorks(); // Обновляем список работ
        } else {
            this.showMessage(data.error || 'Ошибка загрузки работы', 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки работы:', error);
        this.showMessage('Ошибка загрузки работы', 'error');
    }
}

    async loadShopItems() {
        try {
            const response = await fetch('/api/webapp/shop/items');
            const items = await response.json();
            
            const shopList = document.getElementById('shopItemsList');
            
            if (items.length === 0) {
                shopList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🛒</div>
                        <div class="empty-state-title">Магазин пока пуст</div>
                        <div class="empty-state-description">Новые товары появятся скоро!</div>
                    </div>
                `;
                return;
            }
            
            shopList.innerHTML = '';
            
            items.forEach(item => {
                const itemCard = document.createElement('div');
                itemCard.className = 'card';
                
                const finalPrice = item.discount_percent > 0 ? 
                    Math.round(item.price * (1 - item.discount_percent / 100)) : 
                    item.price;
                
                const priceHTML = item.discount_percent > 0 ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: var(--font-xl); font-weight: 800; color: var(--success-color);">
                            ${finalPrice}✨
                        </span>
                        <span style="text-decoration: line-through; color: var(--text-muted);">
                            ${item.price}✨
                        </span>
                        <span style="background: var(--danger-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: var(--font-xs); font-weight: 700;">
                            -${item.discount_percent}%
                        </span>
                    </div>
                ` : `
                    <div style="font-size: var(--font-xl); font-weight: 800; color: var(--success-color); margin-bottom: 8px;">
                        ${item.price}✨
                    </div>
                `;
                
                itemCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${item.title}</div>
                            <div class="card-description">${item.description}</div>
                        </div>
                    </div>
                    
                    ${priceHTML}
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-${this.getShopItemIcon(item.type)}"></i>
                            ${this.getShopItemType(item.type)}
                        </div>
                        <div class="tag">
                            <i class="fas fa-star"></i>
                            ${item.difficulty}
                        </div>
                        <div class="tag">
                            <i class="fas fa-clock"></i>
                            ${item.duration}
                        </div>
                        <div class="tag">
                            <i class="fas fa-users"></i>
                            ${item.students_count} студентов
                        </div>
                    </div>
                    
                    ${item.features && item.features.length > 0 ? `
                    <div style="margin: 16px 0;">
                        <strong>Включает:</strong>
                        <ul style="margin: 8px 0 0 20px;">
                            ${item.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <div class="card-actions">
                        <button class="btn btn-primary" onclick="app.purchaseItem(${item.id})" ${this.user.sparks < finalPrice ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i>
                            Купить за ${finalPrice}✨
                        </button>
                        <button class="btn btn-secondary" onclick="app.viewItemDetails(${item.id})">
                            <i class="fas fa-info-circle"></i>
                            Подробнее
                        </button>
                    </div>
                    
                    ${this.user.sparks < finalPrice ? `
                    <div style="margin-top: 12px; text-align: center; color: var(--danger-color); font-weight: 600;">
                        ❌ Недостаточно искр. Нужно еще ${finalPrice - this.user.sparks}✨
                    </div>
                    ` : ''}
                `;
                
                shopList.appendChild(itemCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки товаров:', error);
            this.showMessage('Ошибка загрузки товаров', 'error');
        }
    }

    async purchaseItem(itemId) {
        if (!confirm('Вы уверены, что хотите купить этот товар?')) {
            return;
        }

        try {
            const response = await fetch('/api/webapp/shop/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    itemId: itemId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadShopItems(); // Обновляем список товаров
                this.loadUser(); // Обновляем данные пользователя
            } else {
                this.showMessage(data.error || 'Ошибка покупки', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка покупки:', error);
            this.showMessage('Ошибка покупки', 'error');
        }
    }

    async loadPosts() {
        try {
            const response = await fetch(`/api/webapp/channel-posts?userId=${this.userId}&limit=20`);
            const data = await response.json();
            
            const postsList = document.getElementById('postsList');
            
            if (data.posts.length === 0) {
                postsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📰</div>
                        <div class="empty-state-title">Пока нет постов</div>
                        <div class="empty-state-description">Новые посты появятся скоро!</div>
                    </div>
                `;
                return;
            }
            
            postsList.innerHTML = '';
            
            data.posts.forEach(post => {
                const postCard = document.createElement('div');
                postCard.className = 'card';
                
                postCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${post.title}</div>
                            <div class="card-description">${post.content}</div>
                        </div>
                    </div>
                    
                    ${post.image_url ? `
                    <div style="text-align: center; margin: 16px 0;">
                        <img src="${post.image_url}" alt="${post.title}" style="max-width: 100%; border-radius: var(--radius-md);">
                    </div>
                    ` : ''}
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-calendar"></i>
                            ${this.formatTime(post.created_at)}
                        </div>
                        <div class="tag">
                            <i class="fas fa-eye"></i>
                            ${post.views_count} просмотров
                        </div>
                        <div class="tag">
                            <i class="fas fa-heart"></i>
                            ${post.likes_count} лайков
                        </div>
                        <div class="tag">
                            <i class="fas fa-comment"></i>
                            ${post.comments_count} комментариев
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn btn-primary" onclick="app.viewPost(${post.id})">
                            <i class="fas fa-eye"></i>
                            Читать полностью
                        </button>
                        <button class="btn btn-secondary" onclick="app.writePostReview('${post.post_id}')">
                            <i class="fas fa-star"></i>
                            Оставить отзыв
                        </button>
                    </div>
                `;
                
                postsList.appendChild(postCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки постов:', error);
            this.showMessage('Ошибка загрузки постов', 'error');
        }
    }

    async writePostReview(postId) {
        const reviewText = prompt('Напишите ваш отзыв о посте:');
        if (!reviewText) return;

        const rating = prompt('Оцените пост от 1 до 5 звезд:');
        if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
            this.showMessage('Пожалуйста, введите корректную оценку от 1 до 5', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/webapp/posts/${postId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    reviewText: reviewText,
                    rating: parseInt(rating)
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadUser(); // Обновляем данные пользователя
            } else {
                this.showMessage(data.error || 'Ошибка отправки отзыва', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки отзыва:', error);
            this.showMessage('Ошибка отправки отзыва', 'error');
        }
    }

    async loadAchievements() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/achievements`);
            const data = await response.json();
            
            const achievementsList = document.getElementById('achievementsList');
            
            achievementsList.innerHTML = '';
            
            // Показываем заработанные достижения
            if (data.earned.length > 0) {
                const earnedSection = document.createElement('div');
                earnedSection.innerHTML = `
                    <h2 class="section-title" style="margin: 24px 0 16px;">
                        <i class="fas fa-trophy"></i>
                        Ваши достижения (${data.earned.length})
                    </h2>
                `;
                achievementsList.appendChild(earnedSection);
                
                const earnedGrid = document.createElement('div');
                earnedGrid.className = 'achievement-grid';
                
                data.earned.forEach(achievement => {
                    const achievementCard = document.createElement('div');
                    achievementCard.className = 'achievement-card earned';
                    achievementCard.innerHTML = `
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-reward">
                            ${achievement.sparks_claimed ? 
                                `✅ ${achievement.sparks_reward}✨ получено` : 
                                `<button class="btn btn-success" onclick="app.claimAchievement(${achievement.achievement_id})" style="padding: 8px 16px; font-size: var(--font-sm);">
                                    Получить ${achievement.sparks_reward}✨
                                </button>`
                            }
                        </div>
                    `;
                    earnedGrid.appendChild(achievementCard);
                });
                
                achievementsList.appendChild(earnedGrid);
            }
            
            // Показываем доступные достижения
            if (data.available.filter(a => !a.earned).length > 0) {
                const availableSection = document.createElement('div');
                availableSection.innerHTML = `
                    <h2 class="section-title" style="margin: 24px 0 16px;">
                        <i class="fas fa-lock"></i>
                        Доступные достижения
                    </h2>
                `;
                achievementsList.appendChild(availableSection);
                
                const availableGrid = document.createElement('div');
                availableGrid.className = 'achievement-grid';
                
                data.available.filter(a => !a.earned).forEach(achievement => {
                    const achievementCard = document.createElement('div');
                    achievementCard.className = 'achievement-card';
                    achievementCard.innerHTML = `
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div class="achievement-title">${achievement.title}</div>
                        <div class="achievement-description">${achievement.description}</div>
                        <div class="achievement-reward" style="color: var(--text-muted);">
                            Награда: ${achievement.sparks_reward}✨
                        </div>
                    `;
                    availableGrid.appendChild(achievementCard);
                });
                
                achievementsList.appendChild(availableGrid);
            }
            
            if (data.earned.length === 0 && data.available.filter(a => !a.earned).length === 0) {
                achievementsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏆</div>
                        <div class="empty-state-title">Пока нет достижений</div>
                        <div class="empty-state-description">Выполняйте задания и получайте достижения!</div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки достижений:', error);
            this.showMessage('Ошибка загрузки достижений', 'error');
        }
    }

    async claimAchievement(achievementId) {
        try {
            const response = await fetch(`/api/webapp/achievements/${achievementId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadAchievements(); // Обновляем список достижений
                this.loadUser(); // Обновляем данные пользователя
            } else {
                this.showMessage(data.error || 'Ошибка получения награды', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка получения награды:', error);
            this.showMessage('Ошибка получения награды', 'error');
        }
    }

    async loadActivities() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/activities?limit=50`);
            const data = await response.json();
            
            const activitiesList = document.getElementById('activitiesList');
            
            if (data.activities.length === 0) {
                activitiesList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div class="empty-state-title">Пока нет активностей</div>
                        <div class="empty-state-description">Ваша история активностей появится здесь</div>
                    </div>
                `;
                return;
            }
            
            activitiesList.innerHTML = '';
            
            let currentDate = '';
            
            data.activities.forEach(activity => {
                const activityDate = new Date(activity.created_at).toDateString();
                
                // Добавляем заголовок даты если она изменилась
                if (activityDate !== currentDate) {
                    currentDate = activityDate;
                    const dateHeader = document.createElement('div');
                    dateHeader.className = 'section-title';
                    dateHeader.style.margin = '24px 0 16px';
                    dateHeader.textContent = this.formatDate(activity.created_at);
                    activitiesList.appendChild(dateHeader);
                }
                
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                
                const icon = this.getActivityIcon(activity.activity_type);
                const time = this.formatTime(activity.created_at);
                
                activityItem.innerHTML = `
                    <div class="activity-icon">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.description}</div>
                        <div class="activity-time">${time}</div>
                    </div>
                    <div class="activity-sparks" style="color: ${activity.sparks_earned >= 0 ? 'var(--success-color)' : 'var(--danger-color)'};">
                        ${activity.sparks_earned >= 0 ? '+' : ''}${activity.sparks_earned}✨
                    </div>
                `;
                
                activitiesList.appendChild(activityItem);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки активностей:', error);
            this.showMessage('Ошибка загрузки активностей', 'error');
        }
    }

    async loadPurchases() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/purchases`);
            const data = await response.json();
            
            const purchasesList = document.getElementById('purchasesList');
            
            if (data.purchases.length === 0) {
                purchasesList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <div class="empty-state-title">У вас пока нет покупок</div>
                        <div class="empty-state-description">Приобретайте курсы и материалы в магазине!</div>
                    </div>
                `;
                return;
            }
            
            purchasesList.innerHTML = '';
            
            data.purchases.forEach(purchase => {
                const purchaseCard = document.createElement('div');
                purchaseCard.className = 'card';
                
                purchaseCard.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${purchase.title}</div>
                            <div class="card-description">${purchase.description}</div>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: var(--success-color);">✅ Куплено</span>
                        </div>
                    </div>
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-${this.getShopItemIcon(purchase.type)}"></i>
                            ${this.getShopItemType(purchase.type)}
                        </div>
                        <div class="tag">
                            <i class="fas fa-calendar"></i>
                            ${this.formatTime(purchase.purchased_at)}
                        </div>
                        <div class="tag">
                            <i class="fas fa-coins"></i>
                            ${purchase.price_paid}✨
                        </div>
                    </div>
                    
                    ${purchase.download_count !== undefined ? `
                    <div style="margin: 16px 0;">
                        <strong>Скачиваний:</strong> ${purchase.download_count}
                    </div>
                    ` : ''}
                    
                    <div class="card-actions">
                        <button class="btn btn-primary" onclick="app.downloadPurchase(${purchase.id})">
                            <i class="fas fa-download"></i>
                            Скачать
                        </button>
                        <button class="btn btn-secondary" onclick="app.viewPurchaseContent(${purchase.id})">
                            <i class="fas fa-eye"></i>
                            Просмотреть
                        </button>
                    </div>
                `;
                
                purchasesList.appendChild(purchaseCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки покупок:', error);
            this.showMessage('Ошибка загрузки покупок', 'error');
        }
    }

    async loadChangeRole() {
        try {
            // Загружаем текущую роль
            document.getElementById('currentRole').textContent = this.user.class || 'Не выбрана';
            
            // Загружаем доступные роли
            const response = await fetch('/api/webapp/roles');
            const roles = await response.json();
            
            const roleSelection = document.getElementById('changeRoleSelection');
            roleSelection.innerHTML = '';
            
            roles.forEach(role => {
                if (role.name === this.user.class) return; // Пропускаем текущую роль
                
                const roleCard = document.createElement('div');
                roleCard.className = 'role-card';
                roleCard.innerHTML = `
                    <div class="role-icon">${role.icon}</div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                    <div class="role-requirements">${role.requirements}</div>
                `;
                
                roleCard.addEventListener('click', () => this.selectChangeRole(role));
                roleSelection.appendChild(roleCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ролей для смены:', error);
            this.showMessage('Ошибка загрузки ролей', 'error');
        }
    }

    selectChangeRole(role) {
        // Убираем выделение со всех карточек
        document.querySelectorAll('#changeRoleSelection .role-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем выбранную карточку
        event.currentTarget.classList.add('selected');
        
        this.selectedChangeRole = role;
        this.loadChangeCharacters(role.id);
        
        // Показываем раздел выбора персонажа
        document.getElementById('changeCharacterSection').classList.remove('hidden');
        document.getElementById('changeRoleBtn').classList.remove('hidden');
    }

    async loadChangeCharacters(roleId) {
        try {
            const response = await fetch(`/api/webapp/characters/${roleId}`);
            const characters = await response.json();
            
            const characterSelection = document.getElementById('changeCharacterSelection');
            characterSelection.innerHTML = '';
            
            characters.forEach(character => {
                const characterCard = document.createElement('div');
                characterCard.className = 'character-card';
                characterCard.innerHTML = `
                    <div class="character-header">
                        <div class="character-avatar">${character.avatar}</div>
                        <div class="character-name">${character.name}</div>
                    </div>
                    <div class="character-description">${character.description}</div>
                    <div class="character-bonus">${character.bonus_description}</div>
                `;
                
                characterCard.addEventListener('click', () => this.selectChangeCharacter(character));
                characterSelection.appendChild(characterCard);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей для смены:', error);
            this.showMessage('Ошибка загрузки персонажей', 'error');
        }
    }

    selectChangeCharacter(character) {
        // Убираем выделение со всех карточек
        document.querySelectorAll('#changeCharacterSelection .character-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Выделяем выбранную карточку
        event.currentTarget.classList.add('selected');
        
        this.selectedChangeCharacter = character;
    }

    async changeRole() {
        if (!this.selectedChangeRole || !this.selectedChangeCharacter) {
            this.showMessage('Пожалуйста, выберите роль и персонажа', 'warning');
            return;
        }

        if (!confirm(`Вы уверены, что хотите сменить роль на "${this.selectedChangeRole.name}"?`)) {
            return;
        }

        try {
            const response = await fetch('/api/users/change-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    roleId: this.selectedChangeRole.id,
                    characterId: this.selectedChangeCharacter.id
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.user = data.user;
                this.showMessage(data.message, 'success');
                this.showDashboard();
                this.updateUI();
            } else {
                this.showMessage(data.error || 'Ошибка смены роли', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка смены роли:', error);
            this.showMessage('Ошибка смены роли', 'error');
        }
    }

    async loadNotifications() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/notifications?unread_only=false&limit=50`);
            const data = await response.json();
            
            const notificationsList = document.getElementById('notificationsList');
            
            if (data.notifications.length === 0) {
                notificationsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔔</div>
                        <div class="empty-state-title">У вас нет уведомлений</div>
                        <div class="empty-state-description">Новые уведомления появятся здесь</div>
                    </div>
                `;
                return;
            }
            
            notificationsList.innerHTML = '';
            
            data.notifications.forEach(notification => {
                const notificationItem = document.createElement('div');
                notificationItem.className = 'card';
                notificationItem.style.opacity = notification.is_read ? '0.7' : '1';
                
                const icon = this.getNotificationIcon(notification.type);
                const time = this.formatTime(notification.created_at);
                
                notificationItem.innerHTML = `
                    <div class="card-header">
                        <div>
                            <div class="card-title">${icon} ${notification.title}</div>
                            <div class="card-description">${notification.message}</div>
                        </div>
                        ${!notification.is_read ? `
                        <div style="text-align: right;">
                            <span style="background: var(--primary-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: var(--font-xs); font-weight: 700;">
                                НОВОЕ
                            </span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-clock"></i>
                            ${time}
                        </div>
                        <div class="tag">
                            <i class="fas fa-bell"></i>
                            ${this.getNotificationType(notification.type)}
                        </div>
                    </div>
                    
                    <div class="card-actions">
                        ${!notification.is_read ? `
                        <button class="btn btn-primary" onclick="app.markNotificationRead(${notification.id})">
                            <i class="fas fa-check"></i>
                            Отметить прочитанным
                        </button>
                        ` : ''}
                        ${notification.action_url ? `
                        <button class="btn btn-secondary" onclick="app.handleNotificationAction('${notification.action_url}')">
                            ${notification.action_text || 'Перейти'}
                        </button>
                        ` : ''}
                    </div>
                `;
                
                notificationsList.appendChild(notificationItem);
            });
            
        } catch (error) {
            console.error('❌ Ошибка загрузки уведомлений:', error);
            this.showMessage('Ошибка загрузки уведомлений', 'error');
        }
    }

    async markNotificationRead(notificationId) {
        try {
            const response = await fetch(`/api/webapp/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.loadNotifications(); // Обновляем список
                this.checkNotifications(); // Обновляем бейдж
            } else {
                this.showMessage('Ошибка отметки уведомления', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка отметки уведомления:', error);
            this.showMessage('Ошибка отметки уведомления', 'error');
        }
    }

    async markAllNotificationsRead() {
        try {
            const response = await fetch('/api/webapp/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(`Отмечено ${data.marked_count} уведомлений как прочитанные`, 'success');
                this.loadNotifications(); // Обновляем список
                this.checkNotifications(); // Обновляем бейдж
            } else {
                this.showMessage('Ошибка отметки уведомлений', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка отметки уведомлений:', error);
            this.showMessage('Ошибка отметки уведомлений', 'error');
        }
    }

    async checkNotifications() {
        try {
            const response = await fetch(`/api/webapp/users/${this.userId}/notifications?unread_only=true&limit=1`);
            const data = await response.json();
            
            const badge = document.getElementById('notificationBadge');
            
            if (data.unread_count > 0) {
                badge.textContent = data.unread_count > 99 ? '99+' : data.unread_count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (error) {
            console.error('❌ Ошибка проверки уведомлений:', error);
        }
    }

    async loadProfile() {
        // Заполняем форму профиля
        document.getElementById('profileName').value = this.user.tg_first_name || '';
        document.getElementById('profileBio').value = this.user.bio || '';
        
        // Загружаем статистику профиля
        if (this.user.stats) {
            const stats = this.user.stats;
            document.getElementById('profileStats').innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalActivities}</div>
                        <div class="stat-label">Всего активностей</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalSparksEarned}</div>
                        <div class="stat-label">Заработано искр</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.streak}</div>
                        <div class="stat-label">Дней подряд</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalAchievements}</div>
                        <div class="stat-label">Достижений</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalQuizzesCompleted}</div>
                        <div class="stat-label">Пройдено квизов</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.totalMarathonsCompleted}</div>
                        <div class="stat-label">Завершено марафонов</div>
                    </div>
                </div>
                
                <div style="margin-top: 16px; text-align: center; color: var(--text-muted);">
                    <i class="fas fa-calendar"></i>
                    Участник с ${this.formatDate(stats.registrationDate)}
                </div>
            `;
        }
    }

    async updateProfile() {
        const name = document.getElementById('profileName').value.trim();
        const bio = document.getElementById('profileBio').value.trim();
        
        if (!name) {
            this.showMessage('Имя не может быть пустым', 'warning');
            return;
        }

        // В реальном приложении здесь был бы API вызов для обновления профиля
        this.user.tg_first_name = name;
        this.user.bio = bio;
        
        this.showMessage('Профиль успешно обновлен', 'success');
        this.updateUI();
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
            messageEl.remove();
        }, 5000);
    }

    getActivityIcon(activityType) {
        const icons = {
            'registration': '👋',
            'quiz': '🎯',
            'marathon': '🏃‍♂️',
            'marathon_day': '📅',
            'marathon_completion': '🏆',
            'upload_work': '🖼️',
            'work_approved': '✅',
            'purchase': '🛒',
            'post_review': '⭐',
            'interactive': '🎮',
            'achievement': '🏆',
            'role_change': '🔄'
        };
        
        return icons[activityType] || '📊';
    }


validateRegistrationForm(role, character) {
    const errors = [];
    
    if (!role) {
        errors.push('Пожалуйста, выберите роль');
    }
    
    if (!character) {
        errors.push('Пожалуйста, выберите персонажа');
    }
    
    return errors;
}

validateWorkForm(title, imageUrl, description) {
    const errors = [];
    
    if (!title || title.trim().length < 3) {
        errors.push('Название работы должно быть не менее 3 символов');
    }
    
    if (!imageUrl || imageUrl.trim().length === 0) {
        errors.push('URL изображения обязателен');
    } else if (!this.isValidUrl(imageUrl)) {
        errors.push('Пожалуйста, введите корректный URL изображения');
    }
    
    if (description && description.length > 500) {
        errors.push('Описание не должно превышать 500 символов');
    }
    
    return errors;
}

isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

validateQuizAnswer(questionIndex, answer) {
    if (answer === undefined || answer === null) {
        return 'Пожалуйста, выберите ответ';
    }
    
    if (answer < 0 || answer >= this.currentQuiz.questions[questionIndex].options.length) {
        return 'Некорректный ответ';
    }
    
    return null;
}
    
    getNotificationIcon(notificationType) {
        const icons = {
            'welcome': '👋',
            'achievement': '🏆',
            'purchase': '🛒',
            'work_approved': '✅',
            'work_rejected': '❌',
            'info': 'ℹ️',
            'warning': '⚠️',
            'error': '❌'
        };
        
        return icons[notificationType] || '🔔';
    }

    getNotificationType(notificationType) {
        const types = {
            'welcome': 'Приветствие',
            'achievement': 'Достижение',
            'purchase': 'Покупка',
            'work_approved': 'Работа одобрена',
            'work_rejected': 'Работа отклонена',
            'info': 'Информация',
            'warning': 'Предупреждение',
            'error': 'Ошибка'
        };
        
        return types[notificationType] || 'Уведомление';
    }

cache = {
    users: {},
    quizzes: {},
    marathons: {},
    shopItems: {},
    posts: {}
};

setCache(key, data, ttl = 300000) { // 5 минут по умолчанию
    this.cache[key] = {
        data: data,
        expiry: Date.now() + ttl,
        key: key
    };
    
    // Автоочистка старых записей
    this.cleanupCache();
}

getCache(key) {
    const item = this.cache[key];
    
    if (item && item.expiry > Date.now()) {
        console.log('📦 Данные получены из кэша:', key);
        return item.data;
    }
    
    // Удаляем просроченные данные
    if (item) {
        delete this.cache[key];
    }
    
    return null;
}

cleanupCache() {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
        if (this.cache[key].expiry <= now) {
            delete this.cache[key];
        }
    });
}

clearCache(pattern = null) {
    if (pattern) {
        Object.keys(this.cache).forEach(key => {
            if (key.includes(pattern)) {
                delete this.cache[key];
            }
        });
    } else {
        this.cache = {
            users: {},
            quizzes: {},
            marathons: {},
            shopItems: {},
            posts: {}
        };
    }
}
    
    getShopItemIcon(itemType) {
        const icons = {
            'video_course': 'video',
            'ebook': 'book',
            'course': 'graduation-cap',
            'material': 'file',
            'tool': 'tools'
        };
        
        return icons[itemType] || 'shopping-cart';
    }

    getShopItemType(itemType) {
        const types = {
            'video_course': 'Видеокурс',
            'ebook': 'Электронная книга',
            'course': 'Курс',
            'material': 'Материалы',
            'tool': 'Инструмент'
        };
        
        return types[itemType] || 'Товар';
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    initEventListeners() {
        // Обработка глобальных событий
        document.addEventListener('click', (e) => {
            // Закрытие сообщений при клике на них
            if (e.target.classList.contains('message')) {
                e.target.remove();
            }
        });
        
        // Обработка клавиатуры
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.showDashboard();
            }
        });
    }

    loadInitialData() {
        // Загружаем дополнительные данные в фоне
        this.checkNotifications();
    }

async viewQuizResults(quizId) {
    try {
        // Используем кэш для результатов
        const cacheKey = `quiz_results_${quizId}_${this.userId}`;
        const cached = this.getCache(cacheKey);
        
        if (cached) {
            this.showQuizDetailedResults(cached);
            return;
        }

        const response = await fetch(`/api/webapp/quizzes/${quizId}/results?userId=${this.userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch quiz results');
        }
        
        const data = await response.json();
        
        if (data.success) {
            this.setCache(cacheKey, data.results, 60000); // Кэшируем на 1 минуту
            this.showQuizDetailedResults(data.results);
        } else {
            this.showMessage(data.error || 'Ошибка загрузки результатов', 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки результатов квиза:', error);
        this.showMessage('Ошибка загрузки результатов квиза', 'error');
        this.loadQuizzes(); // Возвращаем к списку квизов
    }
}

showQuizDetailedResults(results) {
    const resultsHTML = `
        <div class="card">
            <div class="card-header">
                <h3 style="margin-bottom: 8px;">📊 Детальные результаты</h3>
                <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--success-color);">
                    ${results.scorePercentage}%
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 20px 0;">
                <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                    <div style="font-size: var(--font-xl); font-weight: 800; color: var(--primary-color);">
                        ${results.correctAnswers}/${results.totalQuestions}
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">Правильных ответов</div>
                </div>
                
                <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                    <div style="font-size: var(--font-xl); font-weight: 800; color: var(--success-color);">
                        +${results.sparksEarned}✨
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">Заработано искр</div>
                </div>
                
                <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                    <div style="font-size: var(--font-xl); font-weight: 800; color: var(--warning-color);">
                        ${results.timeSpent}с
                    </div>
                    <div style="font-size: var(--font-sm); color: var(--text-muted);">Время прохождения</div>
                </div>
            </div>

            ${results.character_bonus ? `
            <div style="padding: 12px; background: rgba(102, 126, 234, 0.1); border-radius: var(--radius-md); margin-bottom: 16px;">
                <i class="fas fa-star" style="color: var(--primary-color);"></i>
                <strong>Бонус персонажа:</strong> ${results.character_bonus}
            </div>
            ` : ''}
        </div>
        
        <div class="card">
            <h4 style="margin-bottom: 16px;">📝 Детали по вопросам</h4>
            <div style="max-height: 400px; overflow-y: auto;">
                ${results.detailedResults.map((result, index) => `
                    <div style="padding: 16px; border-bottom: 1px solid var(--border-color); ${!result.isCorrect ? 'background: rgba(245, 101, 101, 0.05);' : ''}">
                        <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 8px;">
                            <div style="font-weight: 600; flex: 1;">
                                Вопрос ${index + 1}: ${result.question}
                            </div>
                            <div style="margin-left: 12px;">
                                <span class="status-badge ${result.isCorrect ? 'status-active' : 'status-inactive'}">
                                    ${result.isCorrect ? '✅ Правильно' : '❌ Неправильно'}
                                </span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <strong>Ваш ответ:</strong> 
                            <span style="color: ${result.isCorrect ? 'var(--success-color)' : 'var(--danger-color)'};">
                                ${result.userAnswerText}
                            </span>
                        </div>
                        
                        ${!result.isCorrect ? `
                        <div style="margin-bottom: 8px;">
                            <strong>Правильный ответ:</strong> 
                            <span style="color: var(--success-color);">${result.correctAnswerText}</span>
                        </div>
                        ` : ''}
                        
                        ${result.explanation ? `
                        <div style="padding: 12px; background: var(--light-color); border-radius: var(--radius-sm); margin-top: 8px;">
                            <strong>💡 Объяснение:</strong> ${result.explanation}
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="card-actions">
            <button class="btn btn-primary" onclick="app.loadQuizzes()">
                <i class="fas fa-arrow-left"></i>
                Назад к списку квизов
            </button>
            <button class="btn btn-secondary" onclick="app.startQuiz(${results.quizId})">
                <i class="fas fa-redo"></i>
                Пройти снова
            </button>
        </div>
    `;
    
    document.getElementById('quizzesList').innerHTML = resultsHTML;
}

async viewQuizDetails(quizId) {
    try {
        const response = await fetch(`/api/webapp/quizzes/${quizId}?userId=${this.userId}`);
        const quiz = await response.json();
        
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        
        const detailsHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="margin-bottom: 8px;">${quiz.title}</h3>
                    <div>
                        <span class="status-badge status-active">${quiz.difficulty}</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p>${quiz.description}</p>
                </div>
                
                <div class="card-meta">
                    <div class="tag">
                        <i class="fas fa-clock"></i>
                        ${quiz.duration_minutes} минут
                    </div>
                    <div class="tag">
                        <i class="fas fa-question"></i>
                        ${quiz.questions.length} вопросов
                    </div>
                    <div class="tag">
                        <i class="fas fa-users"></i>
                        ${quiz.attempts_count} попыток
                    </div>
                    <div class="tag">
                        <i class="fas fa-star"></i>
                        Рейтинг: ${quiz.rating}/5
                    </div>
                </div>
                
                ${quiz.requirements ? `
                <div style="margin: 16px 0; padding: 12px; background: var(--light-color); border-radius: var(--radius-md);">
                    <strong>📋 Требования:</strong><br>
                    Минимальный уровень: ${quiz.requirements.min_level}<br>
                    Максимум попыток в день: ${quiz.requirements.max_attempts_per_day}
                </div>
                ` : ''}
                
                ${quiz.tags && quiz.tags.length > 0 ? `
                <div style="margin: 16px 0;">
                    <strong>🏷️ Теги:</strong>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                        ${quiz.tags.map(tag => `
                            <span style="padding: 4px 8px; background: var(--light-color); border-radius: 12px; font-size: 12px;">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="card">
                <h4 style="margin-bottom: 16px;">📝 Примеры вопросов</h4>
                ${quiz.questions.slice(0, 3).map((question, index) => `
                    <div style="padding: 12px; border-bottom: 1px solid var(--border-color);">
                        <div style="font-weight: 600; margin-bottom: 8px;">
                            Вопрос ${index + 1}: ${question.question}
                        </div>
                        <div style="font-size: 14px; color: var(--text-muted);">
                            Варианты ответов: ${question.options.slice(0, 2).join(', ')}...
                        </div>
                    </div>
                `).join('')}
                ${quiz.questions.length > 3 ? `
                <div style="text-align: center; padding: 16px; color: var(--text-muted);">
                    ... и еще ${quiz.questions.length - 3} вопросов
                </div>
                ` : ''}
            </div>
            
            <div class="card-actions">
                <button class="btn btn-primary" onclick="app.startQuiz(${quizId})">
                    <i class="fas fa-play"></i>
                    Начать квиз
                </button>
                <button class="btn btn-secondary" onclick="app.loadQuizzes()">
                    <i class="fas fa-arrow-left"></i>
                    Назад
                </button>
            </div>
        `;
        
        document.getElementById('quizzesList').innerHTML = detailsHTML;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки деталей квиза:', error);
        this.showMessage('Ошибка загрузки деталей квиза', 'error');
        this.loadQuizzes();
    }
}

async viewMarathon(marathonId) {
    try {
        const response = await fetch(`/api/webapp/marathons/${marathonId}?userId=${this.userId}`);
        const marathon = await response.json();
        
        if (!marathon) {
            throw new Error('Marathon not found');
        }
        
        const completion = marathon.completed ? '✅ Завершен' : 
                          marathon.started_at ? '🔄 В процессе' : '🆕 Доступен';
        
        const marathonHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="margin-bottom: 8px;">${marathon.title}</h3>
                    <div>
                        <span class="status-badge ${marathon.completed ? 'status-completed' : marathon.started_at ? 'status-active' : 'status-pending'}">
                            ${completion}
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p>${marathon.description}</p>
                </div>
                
                <div class="card-meta">
                    <div class="tag">
                        <i class="fas fa-calendar"></i>
                        ${marathon.duration_days} дней
                    </div>
                    <div class="tag">
                        <i class="fas fa-star"></i>
                        ${marathon.difficulty}
                    </div>
                    <div class="tag">
                        <i class="fas fa-users"></i>
                        ${marathon.participants_count} участников
                    </div>
                    <div class="tag">
                        <i class="fas fa-trophy"></i>
                        ${marathon.completion_rate}% завершают
                    </div>
                </div>
                
                ${marathon.started_at ? `
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Прогресс</span>
                        <span>${marathon.progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${marathon.progress}%"></div>
                    </div>
                </div>
                ` : ''}
                
                ${marathon.requirements ? `
                <div style="margin: 16px 0; padding: 12px; background: var(--light-color); border-radius: var(--radius-md);">
                    <strong>📋 Требования:</strong><br>
                    ${marathon.requirements}
                </div>
                ` : ''}
                
                ${marathon.tags && marathon.tags.length > 0 ? `
                <div style="margin: 16px 0;">
                    <strong>🏷️ Теги:</strong>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                        ${marathon.tags.map(tag => `
                            <span style="padding: 4px 8px; background: var(--light-color); border-radius: 12px; font-size: 12px;">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="card">
                <h4 style="margin-bottom: 16px;">📅 План марафона</h4>
                ${marathon.tasks.map((task, index) => `
                    <div style="padding: 16px; border-bottom: 1px solid var(--border-color); 
                         ${marathon.current_day === task.day ? 'background: rgba(102, 126, 234, 0.05); border-left: 4px solid var(--primary-color);' : ''}">
                        <div style="display: flex; justify-content: between; align-items: flex-start; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 600;">День ${task.day}: ${task.title}</div>
                                <div style="font-size: 14px; color: var(--text-muted); margin-top: 4px;">
                                    ${task.description}
                                </div>
                            </div>
                            <div>
                                ${marathon.current_day > task.day ? '✅' : 
                                  marathon.current_day === task.day ? '🔄' : '⏳'}
                            </div>
                        </div>
                        
                        ${task.requires_submission ? `
                        <div style="font-size: 14px; color: var(--warning-color); margin-top: 8px;">
                            <i class="fas fa-upload"></i> Требуется загрузка работы
                        </div>
                        ` : ''}
                        
                        ${task.sparks_reward ? `
                        <div style="font-size: 14px; color: var(--success-color); margin-top: 4px;">
                            <i class="fas fa-bolt"></i> Награда: ${task.sparks_reward}✨
                        </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="card">
                <h4 style="margin-bottom: 16px;">🎯 Награды за завершение</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                        <div style="font-size: var(--font-lg); font-weight: 800; color: var(--success-color);">
                            +${marathon.sparks_completion_bonus}✨
                        </div>
                        <div style="font-size: var(--font-sm); color: var(--text-muted);">Бонус завершения</div>
                    </div>
                    <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                        <div style="font-size: var(--font-lg); font-weight: 800; color: var(--primary-color);">
                            🏆
                        </div>
                        <div style="font-size: var(--font-sm); color: var(--text-muted);">Достижение</div>
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                ${!marathon.completed ? `
                <button class="btn btn-primary" onclick="app.${marathon.started_at ? 'continueMarathon' : 'startMarathon'}(${marathonId})">
                    <i class="fas fa-${marathon.started_at ? 'play' : 'flag'}"></i>
                    ${marathon.started_at ? 'Продолжить' : 'Начать марафон'}
                </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="app.loadMarathons()">
                    <i class="fas fa-arrow-left"></i>
                    Назад к списку
                </button>
            </div>
        `;
        
        document.getElementById('marathonsList').innerHTML = marathonHTML;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки марафона:', error);
        this.showMessage('Ошибка загрузки марафона', 'error');
        this.loadMarathons();
    }
}

async viewItemDetails(itemId) {
    try {
        const response = await fetch(`/api/webapp/shop/items/${itemId}`);
        const item = await response.json();
        
        if (!item) {
            throw new Error('Item not found');
        }
        
        const finalPrice = item.discount_percent > 0 ? 
            Math.round(item.price * (1 - item.discount_percent / 100)) : 
            item.price;
        
        const canAfford = this.user.sparks >= finalPrice;
        const hasPurchased = await this.checkItemPurchase(itemId);
        
        const detailsHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="margin-bottom: 8px;">${item.title}</h3>
                    <div>
                        ${item.featured ? `
                        <span class="status-badge status-active" style="background: var(--premium-gradient);">
                            ⭐ Рекомендуемый
                        </span>
                        ` : ''}
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <p>${item.description}</p>
                </div>
                
                ${item.discount_percent > 0 ? `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, rgba(255, 154, 158, 0.1), rgba(254, 207, 239, 0.1)); border-radius: var(--radius-md);">
                    <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--success-color);">
                        ${finalPrice}✨
                    </div>
                    <div style="text-decoration: line-through; color: var(--text-muted);">
                        ${item.price}✨
                    </div>
                    <div style="background: var(--danger-color); color: white; padding: 4px 8px; border-radius: 12px; font-size: var(--font-sm); font-weight: 700;">
                        -${item.discount_percent}%
                    </div>
                </div>
                ` : `
                <div style="font-size: var(--font-2xl); font-weight: 800; color: var(--success-color); margin-bottom: 16px;">
                    ${item.price}✨
                </div>
                `}
                
                <div class="card-meta">
                    <div class="tag">
                        <i class="fas fa-${this.getShopItemIcon(item.type)}"></i>
                        ${this.getShopItemType(item.type)}
                    </div>
                    <div class="tag">
                        <i class="fas fa-star"></i>
                        ${item.difficulty}
                    </div>
                    <div class="tag">
                        <i class="fas fa-clock"></i>
                        ${item.duration}
                    </div>
                    <div class="tag">
                        <i class="fas fa-users"></i>
                        ${item.students_count} студентов
                    </div>
                </div>
                
                ${item.instructor ? `
                <div style="margin: 16px 0; padding: 12px; background: var(--light-color); border-radius: var(--radius-md);">
                    <strong>👨‍🏫 Инструктор:</strong> ${item.instructor}
                </div>
                ` : ''}
                
                ${item.what_you_learn && item.what_you_learn.length > 0 ? `
                <div style="margin: 16px 0;">
                    <strong>🎯 Чему вы научитесь:</strong>
                    <ul style="margin: 8px 0 0 20px;">
                        ${item.what_you_learn.map(skill => `<li>${skill}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${item.features && item.features.length > 0 ? `
                <div style="margin: 16px 0;">
                    <strong>📦 Включает:</strong>
                    <ul style="margin: 8px 0 0 20px;">
                        ${item.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${item.requirements ? `
                <div style="margin: 16px 0; padding: 12px; background: var(--light-color); border-radius: var(--radius-md);">
                    <strong>📋 Требования:</strong><br>
                    ${item.requirements}
                </div>
                ` : ''}
                
                ${item.tags && item.tags.length > 0 ? `
                <div style="margin: 16px 0;">
                    <strong>🏷️ Теги:</strong>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                        ${item.tags.map(tag => `
                            <span style="padding: 4px 8px; background: var(--light-color); border-radius: 12px; font-size: 12px;">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="card-actions">
                ${hasPurchased ? `
                <button class="btn btn-success" onclick="app.downloadPurchase(${itemId})">
                    <i class="fas fa-download"></i>
                    Скачать
                </button>
                <button class="btn btn-secondary" onclick="app.viewPurchaseContent(${itemId})">
                    <i class="fas fa-eye"></i>
                    Просмотреть
                </button>
                ` : `
                <button class="btn btn-primary" onclick="app.purchaseItem(${itemId})" ${!canAfford ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i>
                    Купить за ${finalPrice}✨
                </button>
                `}
                
                <button class="btn btn-secondary" onclick="app.loadShopItems()">
                    <i class="fas fa-arrow-left"></i>
                    Назад
                </button>
            </div>
            
            ${!canAfford && !hasPurchased ? `
            <div class="card" style="text-align: center;">
                <div style="color: var(--danger-color); font-weight: 600; margin-bottom: 8px;">
                    ❌ Недостаточно искр
                </div>
                <div style="color: var(--text-muted);">
                    Вам нужно еще ${finalPrice - this.user.sparks}✨ для покупки
                </div>
            </div>
            ` : ''}
        `;
        
        document.getElementById('shopItemsList').innerHTML = detailsHTML;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки деталей товара:', error);
        this.showMessage('Ошибка загрузки деталей товара', 'error');
        this.loadShopItems();
    }
}

async checkItemPurchase(itemId) {
    try {
        const response = await fetch(`/api/webapp/users/${this.userId}/purchases`);
        const data = await response.json();
        return data.purchases.some(purchase => purchase.item_id === itemId);
    } catch (error) {
        console.error('❌ Ошибка проверки покупки:', error);
        return false;
    }
}

async viewPost(postId) {
    try {
        const response = await fetch(`/api/webapp/channel-posts/${postId}?userId=${this.userId}`);
        const post = await response.json();
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        const postHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 style="margin-bottom: 8px;">${post.title}</h3>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="status-badge ${post.featured ? 'status-completed' : 'status-active'}">
                            ${post.featured ? '⭐ Избранный' : '📰 Пост'}
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px; color: var(--text-muted);">
                    <i class="fas fa-calendar"></i> ${this.formatTime(post.created_at)}
                    ${post.views_count > 0 ? ` • <i class="fas fa-eye"></i> ${post.views_count} просмотров` : ''}
                    ${post.likes_count > 0 ? ` • <i class="fas fa-heart"></i> ${post.likes_count}` : ''}
                    ${post.comments_count > 0 ? ` • <i class="fas fa-comment"></i> ${post.comments_count}` : ''}
                </div>
                
                ${post.image_url ? `
                <div style="text-align: center; margin: 20px 0;">
                    <img src="${post.image_url}" alt="${post.title}" style="max-width: 100%; border-radius: var(--radius-md);">
                </div>
                ` : ''}
                
                <div style="line-height: 1.8; font-size: var(--font-md); margin-bottom: 24px;">
                    ${post.content.split('\n').map(paragraph => `
                        <p style="margin-bottom: 16px;">${paragraph}</p>
                    `).join('')}
                </div>
                
                ${post.tags && post.tags.length > 0 ? `
                <div style="margin: 24px 0;">
                    <strong>🏷️ Теги:</strong>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                        ${post.tags.map(tag => `
                            <span style="padding: 6px 12px; background: var(--light-color); border-radius: 16px; font-size: 12px; font-weight: 600;">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${post.action_type && post.action_target ? `
                <div style="margin: 24px 0; padding: 16px; background: rgba(102, 126, 234, 0.1); border-radius: var(--radius-md); text-align: center;">
                    <strong>🎯 Призыв к действию:</strong>
                    <div style="margin-top: 12px;">
                        <button class="btn btn-primary" onclick="app.handlePostAction('${post.action_type}', '${post.action_target}')">
                            ${post.action_text || 'Перейти'}
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="card">
                <h4 style="margin-bottom: 16px;">💬 Отзывы (${post.reviews_count})</h4>
                
                ${post.user_review ? `
                <div style="padding: 16px; background: rgba(72, 187, 120, 0.1); border-radius: var(--radius-md); margin-bottom: 16px;">
                    <div style="font-weight: 600; margin-bottom: 8px;">Ваш отзыв</div>
                    <div style="margin-bottom: 8px;">${post.user_review.review_text}</div>
                    <div style="color: var(--warning-color);">
                        ${'⭐'.repeat(post.user_review.rating)}${'☆'.repeat(5 - post.user_review.rating)}
                    </div>
                </div>
                ` : `
                <div style="text-align: center; padding: 20px;">
                    <button class="btn btn-primary" onclick="app.writePostReview('${post.post_id}')">
                        <i class="fas fa-star"></i>
                        Написать отзыв
                    </button>
                </div>
                `}
                
                ${post.average_rating > 0 ? `
                <div style="text-align: center; padding: 16px; background: var(--light-color); border-radius: var(--radius-md);">
                    <div style="font-size: var(--font-lg); font-weight: 700; color: var(--warning-color); margin-bottom: 8px;">
                        ${post.average_rating.toFixed(1)}/5
                    </div>
                    <div style="color: var(--text-muted);">
                        Средняя оценка на основе ${post.reviews_count} отзывов
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="app.loadPosts()">
                    <i class="fas fa-arrow-left"></i>
                    Назад к списку постов
                </button>
                <button class="btn btn-primary" onclick="app.writePostReview('${post.post_id}')">
                    <i class="fas fa-star"></i>
                    Оставить отзыв
                </button>
            </div>
        `;
        
        document.getElementById('postsList').innerHTML = postHTML;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки поста:', error);
        this.showMessage('Ошибка загрузки поста', 'error');
        this.loadPosts();
    }
}

async downloadPurchase(purchaseId) {
    try {
        this.showMessage('Подготовка скачивания...', 'info');
        
        const response = await fetch(`/api/webapp/purchases/${purchaseId}/download?userId=${this.userId}`);
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        const data = await response.json();
        
        if (data.success && data.download_url) {
            // Создаем временную ссылку для скачивания
            const link = document.createElement('a');
            link.href = data.download_url;
            link.download = data.filename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('Скачивание началось!', 'success');
            
            // Обновляем счетчик скачиваний
            this.loadPurchases();
        } else {
            this.showMessage(data.error || 'Ошибка скачивания', 'error');
        }
        
    } catch (error) {
        console.error('❌ Ошибка скачивания:', error);
        this.showMessage('Ошибка скачивания файла', 'error');
    }
}

async viewPurchaseContent(purchaseId) {
    try {
        const response = await fetch(`/api/webapp/purchases/${purchaseId}/content?userId=${this.userId}`);
        const data = await response.json();
        
        if (data.success) {
            const contentHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3 style="margin-bottom: 8px;">${data.purchase.title}</h3>
                        <div>
                            <span class="status-badge status-completed">✅ Куплено</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 16px;">
                        <p>${data.purchase.description}</p>
                    </div>
                    
                    <div class="card-meta">
                        <div class="tag">
                            <i class="fas fa-${this.getShopItemIcon(data.purchase.type)}"></i>
                            ${this.getShopItemType(data.purchase.type)}
                        </div>
                        <div class="tag">
                            <i class="fas fa-calendar"></i>
                            ${this.formatTime(data.purchase.purchased_at)}
                        </div>
                        <div class="tag">
                            <i class="fas fa-download"></i>
                            ${data.purchase.download_count || 0} скачиваний
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h4 style="margin-bottom: 16px;">📚 Содержание</h4>
                    
                    ${data.purchase.content_text ? `
                    <div style="line-height: 1.6; margin-bottom: 20px;">
                        ${data.purchase.content_text}
                    </div>
                    ` : `
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                        <div style="font-size: 48px; margin-bottom: 16px;">📖</div>
                        <div style="font-size: var(--font-lg); font-weight: 600; margin-bottom: 8px;">
                            Содержание товара
                        </div>
                        <div>
                            Здесь будет отображаться содержимое приобретенного материала
                        </div>
                    </div>
                    `}
                    
                    ${data.purchase.file_url ? `
                    <div style="text-align: center; margin-top: 24px;">
                        <button class="btn btn-primary" onclick="app.downloadPurchase(${purchaseId})">
                            <i class="fas fa-download"></i>
                            Скачать файл
                        </button>
                    </div>
                    ` : ''}
                </div>
                
                <div class="card-actions">
                    <button class="btn btn-secondary" onclick="app.loadPurchases()">
                        <i class="fas fa-arrow-left"></i>
                        Назад к покупкам
                    </button>
                    ${data.purchase.file_url ? `
                    <button class="btn btn-primary" onclick="app.downloadPurchase(${purchaseId})">
                        <i class="fas fa-download"></i>
                        Скачать
                    </button>
                    ` : ''}
                </div>
            `;
            
            document.getElementById('purchasesList').innerHTML = contentHTML;
        } else {
            this.showMessage(data.error || 'Ошибка загрузки контента', 'error');
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки контента покупки:', error);
        this.showMessage('Ошибка загрузки контента', 'error');
        this.loadPurchases();
    }
}

handleNotificationAction(actionUrl) {
    if (!actionUrl) return;
    
    // Обрабатываем разные типы действий
    if (actionUrl.startsWith('/')) {
        // Внутренняя навигация
        const section = actionUrl.replace('/', '');
        if (section && this[`show${section.charAt(0).toUpperCase() + section.slice(1)}`]) {
            this[`show${section.charAt(0).toUpperCase() + section.slice(1)}`]();
        } else {
            this.showSection(section);
        }
    } else if (actionUrl.startsWith('http')) {
        // Внешняя ссылка
        window.open(actionUrl, '_blank');
    } else {
        console.log('Обработка действия:', actionUrl);
        this.showMessage(`Выполняется действие: ${actionUrl}`, 'info');
    }
}

handlePostAction(actionType, actionTarget) {
    const actions = {
        'quiz': () => {
            this.showSection('quizzes');
            this.showMessage('Переход к квизам', 'info');
        },
        'marathon': () => {
            this.showSection('marathons');
            this.showMessage('Переход к марафонам', 'info');
        },
        'shop': () => {
            this.showSection('shop');
            this.showMessage('Переход к магазину', 'info');
        },
        'profile': () => {
            this.showSection('profile');
            this.showMessage('Переход к профилю', 'info');
        },
        'external': () => {
            window.open(actionTarget, '_blank');
        }
    };
    
    if (actions[actionType]) {
        actions[actionType]();
    } else {
        this.showMessage(`Действие: ${actionType}`, 'info');
    }
}

    showNotifications() {
        this.showSection('notifications');
    }
}

// Инициализация приложения
const app = new InspirationWorkshop();

// Глобальные функции для обработчиков событий
window.app = app;

// Обработка ошибок
window.addEventListener('error', (event) => {
    console.error('Глобальная ошибка:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Необработанный промис:', event.reason);
});

console.log('🎨 Приложение Мастерская Вдохновения v9.0 загружено!');
