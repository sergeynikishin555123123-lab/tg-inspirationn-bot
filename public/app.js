// Мастерская Вдохновения - WebApp v8.0
class InspirationApp {
    constructor() {
        this.tg = null;
        this.user = null;
        this.currentSection = 'main';
        this.selectedRole = null;
        this.selectedCharacter = null;
        this.quizAnswers = [];
        this.currentQuiz = null;
        this.currentQuestionIndex = 0;
        this.marathonData = null;
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Инициализация приложения...');
            
            // Инициализация Telegram WebApp
            this.tg = window.Telegram.WebApp;
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            
            // Устанавливаем цветовую схему
            this.tg.setHeaderColor('#6366f1');
            this.tg.setBackgroundColor('#6366f1');
            
            // Создаем анимированный фон
            this.createAnimatedBackground();
            
            // Получаем данные пользователя
            const userData = this.tg.initDataUnsafe?.user;
            if (userData) {
                console.log('👤 Получены данные пользователя:', userData);
                await this.loadUserData(userData.id);
            } else {
                console.warn('⚠️ Данные пользователя не получены');
                this.showError('Не удалось получить данные пользователя. Пожалуйста, перезагрузите приложение.');
            }
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError('Ошибка загрузки приложения: ' + error.message);
        }
    }

    createAnimatedBackground() {
        const bgAnimation = document.getElementById('bgAnimation');
        const particlesCount = 15;
        
        for (let i = 0; i < particlesCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'bg-particle';
            
            // Случайные параметры
            const size = Math.random() * 60 + 20;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 10 + 10;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            particle.style.opacity = Math.random() * 0.3 + 0.1;
            
            bgAnimation.appendChild(particle);
        }
    }

    async loadUserData(userId) {
        try {
            this.showLoading('Загрузка данных пользователя...');
            
            const response = await fetch(`/api/users/${userId}`);
            if (!response.ok) throw new Error('Ошибка сети');
            
            const data = await response.json();
            
            if (data.exists) {
                console.log('✅ Пользователь найден:', data.user);
                this.user = data.user;
                this.showDashboard();
            } else {
                console.log('🆕 Новый пользователь:', data.user);
                this.user = data.user;
                this.showRegistration();
            }
            
            // Загружаем уведомления
            await this.loadNotifications();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки пользователя:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки данных пользователя: ' + error.message);
        }
    }

    showRegistration() {
        this.hideAllSections();
        document.getElementById('registrationSection').classList.remove('hidden');
        this.currentSection = 'registration';
        
        this.loadRoles();
    }

    async loadRoles() {
        try {
            this.showLoading('Загрузка ролей...');
            
            const response = await fetch('/api/webapp/roles');
            if (!response.ok) throw new Error('Ошибка загрузки ролей');
            
            const roles = await response.json();
            
            const container = document.getElementById('roleSelection');
            container.innerHTML = roles.map(role => `
                <div class="role-option" onclick="app.selectRole(${role.id}, this)">
                    <div class="role-icon">${role.icon}</div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                </div>
            `).join('');
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ролей:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки списка ролей: ' + error.message);
        }
    }

    selectRole(roleId, element) {
        this.selectedRole = roleId;
        
        // Убираем выделение у всех ролей
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Добавляем выделение выбранной роли
        element.classList.add('selected');
        
        // Показываем раздел выбора персонажа
        document.getElementById('characterSection').classList.remove('hidden');
        
        // Загружаем персонажей для выбранной роли
        this.loadCharacters(roleId);
    }

    async loadCharacters(roleId) {
        try {
            this.showLoading('Загрузка персонажей...');
            
            const response = await fetch(`/api/webapp/characters/${roleId}`);
            if (!response.ok) throw new Error('Ошибка загрузки персонажей');
            
            const characters = await response.json();
            
            const container = document.getElementById('characterSelection');
            if (characters.length > 0) {
                container.innerHTML = characters.map(character => `
                    <div class="character-option" onclick="app.selectCharacter(${character.id}, this)">
                        <div class="character-name">
                            <span style="font-size: 24px; margin-right: 8px;">${character.avatar}</span>
                            ${character.name}
                        </div>
                        <div class="character-description">${character.description}</div>
                        <div class="character-bonus">${character.bonus_description}</div>
                    </div>
                `).join('');
                
                document.getElementById('registerBtn').classList.remove('hidden');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <h3>Персонажи не найдены</h3>
                        <p>Для этой роли пока нет доступных персонажей</p>
                    </div>
                `;
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки списка персонажей: ' + error.message);
        }
    }

    selectCharacter(characterId, element) {
        this.selectedCharacter = characterId;
        
        // Убираем выделение у всех персонажей
        document.querySelectorAll('.character-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Добавляем выделение выбранному персонажу
        element.classList.add('selected');
    }

    async completeRegistration() {
        if (!this.selectedRole || !this.selectedCharacter) {
            this.showError('Выберите роль и персонажа');
            return;
        }

        try {
            this.showLoading('Регистрация...');
            
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    firstName: this.tg.initDataUnsafe?.user?.first_name || 'Пользователь',
                    roleId: this.selectedRole,
                    characterId: this.selectedCharacter
                })
            });

            if (!response.ok) throw new Error('Ошибка регистрации');

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.showMessage('🎉 Регистрация успешна! Добро пожаловать в Мастерскую Вдохновения!', 'success');
                this.showDashboard();
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            this.hideLoading();
            this.showError('Ошибка регистрации: ' + error.message);
        }
    }

    showDashboard() {
        this.hideAllSections();
        document.getElementById('dashboardSection').classList.remove('hidden');
        this.currentSection = 'dashboard';
        
        this.updateUserInfo();
        this.loadRecentActivities();
    }

    updateUserInfo() {
        if (!this.user) return;
        
        // Обновляем аватар
        const avatarElement = document.getElementById('userAvatar');
        avatarElement.textContent = this.user.tg_first_name?.charAt(0)?.toUpperCase() || 'U';
        
        // Обновляем информацию
        document.getElementById('userName').textContent = this.user.tg_first_name || 'Пользователь';
        document.getElementById('userRole').textContent = this.user.class || 'Роль не выбрана';
        document.getElementById('userLevel').textContent = this.user.level;
        document.getElementById('sparksAmount').textContent = this.user.sparks.toFixed(1);
        document.getElementById('quizzesCount').textContent = this.user.completed_quizzes || 0;
        document.getElementById('marathonsCount').textContent = this.user.completed_marathons || 0;
        document.getElementById('worksCount').textContent = this.user.uploaded_works || 0;
    }

    async loadRecentActivities() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/activities`);
            if (!response.ok) return;
            
            const data = await response.json();
            
            const container = document.getElementById('recentActivities');
            if (data.activities && data.activities.length > 0) {
                container.innerHTML = data.activities.slice(0, 5).map(activity => `
                    <div class="activity-item">
                        <div class="activity-info">
                            <div class="activity-title">${activity.description}</div>
                            <div class="activity-date">${this.formatDate(activity.created_at)}</div>
                        </div>
                        <div class="activity-sparks">+${activity.sparks_earned}✨</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 20px;">
                        <div class="empty-state-icon">📊</div>
                        <p>Активности пока нет</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки активностей:', error);
        }
    }

    async showSection(sectionName) {
        if (this.isLoading) return;
        
        this.hideAllSections();
        
        switch (sectionName) {
            case 'quizzes':
                await this.showQuizzes();
                break;
            case 'marathons':
                await this.showMarathons();
                break;
            case 'interactives':
                await this.showInteractives();
                break;
            case 'works':
                await this.showWorks();
                break;
            case 'shop':
                await this.showShop();
                break;
            case 'posts':
                await this.showPosts();
                break;
            case 'achievements':
                await this.showAchievements();
                break;
            case 'activities':
                await this.showActivities();
                break;
            case 'purchases':
                await this.showPurchases();
                break;
            case 'changeRole':
                await this.showChangeRole();
                break;
            default:
                this.showDashboard();
                return;
        }
        
        document.getElementById(sectionName + 'Section').classList.remove('hidden');
        this.currentSection = sectionName;
    }

    async showQuizzes() {
        try {
            this.showLoading('Загрузка квизов...');
            
            const response = await fetch(`/api/webapp/quizzes?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки квизов');
            
            const quizzes = await response.json();
            
            const container = document.getElementById('quizzesList');
            if (quizzes.length > 0) {
                container.innerHTML = quizzes.map((quiz, index) => {
                    const difficultyBadge = quiz.difficulty === 'beginner' ? 'badge-success' : 
                                          quiz.difficulty === 'intermediate' ? 'badge-warning' : 'badge-danger';
                    const difficultyText = quiz.difficulty === 'beginner' ? 'Начинающий' :
                                         quiz.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый';
                    
                    let buttonText = 'Начать квиз';
                    let buttonClass = 'primary';
                    let disabled = false;
                    
                    if (quiz.completed) {
                        if (quiz.can_retake) {
                            buttonText = 'Пройти снова';
                            buttonClass = 'warning';
                        } else {
                            buttonText = 'Пройден';
                            buttonClass = 'secondary';
                            disabled = true;
                        }
                    }
                    
                    return `
                        <div class="quiz-card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <div class="quiz-title">${quiz.title}</div>
                            <div class="quiz-description">${quiz.description}</div>
                            <div class="quiz-meta">
                                <span class="badge ${difficultyBadge}">${difficultyText}</span>
                                <span class="badge badge-info">${quiz.total_questions} вопросов</span>
                                <span class="badge badge-secondary">${quiz.sparks_per_correct}✨ за ответ</span>
                                ${quiz.completed && (
                                    `<span class="badge badge-success">Результат: ${quiz.user_score}/${quiz.total_questions}</span>`
                                )}
                            </div>
                            <button class="action-btn ${buttonClass}" ${disabled ? 'disabled' : ''} 
                                    onclick="app.startQuiz(${quiz.id})">
                                ${buttonText}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🎯', 'Квизы не найдены', 'Скоро появятся новые квизы!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки квизов:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки квизов: ' + error.message);
        }
    }

    async startQuiz(quizId) {
        try {
            this.showLoading('Загрузка квиза...');
            
            const response = await fetch(`/api/webapp/quizzes?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки квиза');
            
            const quizzes = await response.json();
            const quiz = quizzes.find(q => q.id === quizId);
            
            if (!quiz) {
                throw new Error('Квиз не найден');
            }
            
            this.currentQuiz = quiz;
            this.quizAnswers = [];
            this.currentQuestionIndex = 0;
            
            this.showQuizQuestion();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка начала квиза:', error);
            this.hideLoading();
            this.showError('Ошибка начала квиза: ' + error.message);
        }
    }

    showQuizQuestion() {
        if (!this.currentQuiz || !this.currentQuiz.questions[this.currentQuestionIndex]) {
            this.showQuizResults();
            return;
        }
        
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        const progress = ((this.currentQuestionIndex) / this.currentQuiz.questions.length) * 100;
        
        const quizHTML = `
            <div class="quiz-container">
                <div class="quiz-progress">
                    <div class="quiz-progress-bar" style="width: ${progress}%"></div>
                </div>
                
                <div class="question-number">Вопрос ${this.currentQuestionIndex + 1} из ${this.currentQuiz.questions.length}</div>
                <div class="question-text">${question.question}</div>
                
                <div class="options-list">
                    ${question.options.map((option, index) => `
                        <div class="option-item" onclick="app.selectQuizAnswer(${index})">
                            ${option}
                        </div>
                    `).join('')}
                </div>
                
                <button class="btn btn-primary" onclick="app.nextQuizQuestion()" 
                        ${this.quizAnswers[this.currentQuestionIndex] === undefined ? 'disabled' : ''}>
                    ${this.currentQuestionIndex === this.currentQuiz.questions.length - 1 ? 'Завершить квиз' : 'Следующий вопрос'}
                </button>
            </div>
        `;
        
        document.getElementById('quizzesList').innerHTML = quizHTML;
    }

    selectQuizAnswer(answerIndex) {
        // Убираем выделение у всех вариантов
        document.querySelectorAll('.option-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Добавляем выделение выбранному варианту
        event.currentTarget.classList.add('selected');
        
        // Сохраняем ответ
        this.quizAnswers[this.currentQuestionIndex] = answerIndex;
        
        // Активируем кнопку продолжения
        document.querySelector('#quizzesList .btn').disabled = false;
    }

    nextQuizQuestion() {
        if (this.quizAnswers[this.currentQuestionIndex] === undefined) {
            this.showError('Выберите вариант ответа');
            return;
        }
        
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.currentQuiz.questions.length) {
            this.showQuizQuestion();
        } else {
            this.submitQuiz();
        }
    }

    async submitQuiz() {
        try {
            this.showLoading('Проверка ответов...');
            
            const response = await fetch(`/api/webapp/quizzes/${this.currentQuiz.id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    answers: this.quizAnswers
                })
            });

            if (!response.ok) throw new Error('Ошибка отправки квиза');

            const data = await response.json();

            if (data.success) {
                this.showQuizResults(data);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка отправки квиза:', error);
            this.hideLoading();
            this.showError('Ошибка отправки квиза: ' + error.message);
        }
    }

    showQuizResults(results) {
        const resultsHTML = `
            <div class="quiz-results">
                <div class="results-score">${results.scorePercentage}%</div>
                <div class="results-message">${results.message}</div>
                
                <div class="results-details">
                    <h3 style="margin-bottom: 16px;">Детали результатов:</h3>
                    ${results.results.map((result, index) => `
                        <div class="result-item">
                            <div class="result-question">${result.question}</div>
                            <div class="result-answer">
                                Ваш ответ: ${result.userAnswer !== undefined ? 
                                    this.currentQuiz.questions[index].options[result.userAnswer] : 'Нет ответа'}
                            </div>
                            <div class="result-correct">
                                Правильный ответ: ${this.currentQuiz.questions[index].options[result.correctAnswer]}
                            </div>
                            ${result.explanation && `
                                <div class="result-explanation">${result.explanation}</div>
                            `}
                        </div>
                    `).join('')}
                </div>
                
                <button class="btn btn-primary" onclick="app.showSection('quizzes')">
                    Вернуться к списку квизов
                </button>
            </div>
        `;
        
        document.getElementById('quizzesList').innerHTML = resultsHTML;
        
        // Обновляем данные пользователя
        this.loadUserData(this.user.user_id);
    }

    async showMarathons() {
        try {
            this.showLoading('Загрузка марафонов...');
            
            const response = await fetch(`/api/webapp/marathons?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки марафонов');
            
            const marathons = await response.json();
            
            const container = document.getElementById('marathonsList');
            if (marathons.length > 0) {
                container.innerHTML = marathons.map((marathon, index) => {
                    const progress = marathon.progress || 0;
                    let buttonText = 'Начать марафон';
                    let buttonClass = 'primary';
                    
                    if (marathon.completed) {
                        buttonText = 'Завершено 🎉';
                        buttonClass = 'success';
                    } else if (marathon.can_continue) {
                        buttonText = 'Продолжить';
                        buttonClass = 'warning';
                    }
                    
                    return `
                        <div class="marathon-card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <div class="marathon-title">${marathon.title}</div>
                            <div class="marathon-description">${marathon.description}</div>
                            <div class="marathon-meta">
                                <span class="badge badge-info">${marathon.duration_days} дней</span>
                                <span class="badge badge-warning">${marathon.sparks_per_day}✨ в день</span>
                                <span class="badge badge-success">${marathon.sparks_completion_bonus}✨ за завершение</span>
                            </div>
                            
                            ${marathon.can_continue && !marathon.completed && progress > 0 && (`
                                <div class="progress-container">
                                    <div class="progress-label">
                                        <span>Прогресс</span>
                                        <span>${progress}%</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${progress}%"></div>
                                    </div>
                                </div>
                            `)}
                            
                            <button class="action-btn ${buttonClass}" onclick="app.startMarathon(${marathon.id})">
                                ${buttonText}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🏃‍♂️', 'Марафоны не найдены', 'Скоро появятся новые марафоны!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки марафонов:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки марафонов: ' + error.message);
        }
    }

    async startMarathon(marathonId) {
        try {
            this.showLoading('Загрузка марафона...');
            
            const response = await fetch(`/api/webapp/marathons?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки марафона');
            
            const marathons = await response.json();
            const marathon = marathons.find(m => m.id === marathonId);
            
            if (!marathon) {
                throw new Error('Марафон не найден');
            }
            
            this.marathonData = marathon;
            this.showMarathonDay(marathon, marathon.current_day);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка начала марафона:', error);
            this.hideLoading();
            this.showError('Ошибка начала марафона: ' + error.message);
        }
    }

    showMarathonDay(marathon, day) {
        const task = marathon.tasks.find(t => t.day === day);
        if (!task) {
            this.showError('Задание не найдено');
            return;
        }
        
        const dayHTML = `
            <div class="content-card">
                <h3 style="margin-bottom: 16px;">День ${day}: ${task.title}</h3>
                <div class="marathon-description" style="margin-bottom: 20px;">${task.description}</div>
                
                ${task.instructions && (`
                    <div class="card" style="background: #f0f9ff; border-color: #bfdbfe;">
                        <h4 style="margin-bottom: 12px; color: #1e40af;">📋 Инструкции:</h4>
                        <p style="color: #374151; line-height: 1.5;">${task.instructions}</p>
                    </div>
                `)}
                
                ${task.tips && task.tips.length > 0 && (`
                    <div class="card" style="background: #f0fff4; border-color: #bbf7d0; margin-top: 16px;">
                        <h4 style="margin-bottom: 12px; color: #166534;">💡 Советы:</h4>
                        <ul style="color: #374151; padding-left: 20px;">
                            ${task.tips.map(tip => `<li style="margin-bottom: 8px;">${tip}</li>`).join('')}
                        </ul>
                    </div>
                `)}
                
                ${task.requires_submission && (`
                    <div class="form-group" style="margin-top: 20px;">
                        <label class="form-label">Ваша работа:</label>
                        <textarea class="form-control" id="marathonSubmission" placeholder="Опишите вашу работу или прикрепите ссылку на изображение..." rows="4"></textarea>
                    </div>
                `)}
                
                <button class="btn btn-success" onclick="app.submitMarathonDay(${marathon.id}, ${day})" style="margin-top: 20px;">
                    ${day === marathon.duration_days ? 'Завершить марафон' : 'Завершить день'}
                </button>
            </div>
        `;
        
        // Показываем навигацию по дням
        const navigationHTML = `
            <div class="days-navigation">
                ${marathon.tasks.map(t => `
                    <button class="day-button 
                        ${t.day === day ? 'active' : ''}
                        ${t.day < day ? 'completed' : ''}
                        ${t.day > day && !marathon.can_continue ? 'disabled' : ''}"
                        onclick="app.showMarathonDay(marathonData, ${t.day})"
                        ${t.day > day && !marathon.can_continue ? 'disabled' : ''}>
                        День ${t.day}
                    </button>
                `).join('')}
            </div>
        `;
        
        // Сохраняем marathonData в глобальной области видимости для использования в onclick
        window.marathonData = marathon;
        
        document.getElementById('marathonsList').innerHTML = navigationHTML + dayHTML;
    }

    async submitMarathonDay(marathonId, day) {
        try {
            const submissionText = document.getElementById('marathonSubmission')?.value || '';
            
            if (this.marathonData.tasks.find(t => t.day === day)?.requires_submission && !submissionText) {
                this.showError('Это задание требует отправки работы');
                return;
            }

            this.showLoading('Отправка работы...');
            
            const response = await fetch(`/api/webapp/marathons/${marathonId}/submit-day`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    day: day,
                    submission_text: submissionText
                })
            });

            if (!response.ok) throw new Error('Ошибка отправки дня марафона');

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                
                if (data.completed) {
                    this.showSection('marathons');
                } else {
                    // Показываем следующий день
                    const marathonsResponse = await fetch(`/api/webapp/marathons?userId=${this.user.user_id}`);
                    const marathons = await marathonsResponse.json();
                    const marathon = marathons.find(m => m.id === marathonId);
                    this.showMarathonDay(marathon, data.currentDay);
                }
                
                // Обновляем данные пользователя
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка отправки дня марафона:', error);
            this.hideLoading();
            this.showError('Ошибка отправки дня марафона: ' + error.message);
        }
    }

    async showInteractives() {
        try {
            this.showLoading('Загрузка интерактивов...');
            
            const response = await fetch(`/api/webapp/interactives?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки интерактивов');
            
            const interactives = await response.json();
            
            const container = document.getElementById('interactivesList');
            if (interactives.length > 0) {
                container.innerHTML = interactives.map((interactive, index) => {
                    let buttonText = 'Начать';
                    let buttonClass = 'primary';
                    let disabled = false;
                    
                    if (interactive.completed && !interactive.can_retake) {
                        buttonText = 'Завершено';
                        buttonClass = 'secondary';
                        disabled = true;
                    } else if (interactive.completed && interactive.can_retake) {
                        buttonText = 'Повторить';
                        buttonClass = 'warning';
                    }
                    
                    return `
                        <div class="interactive-card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <div class="interactive-title">${interactive.title}</div>
                            <div class="interactive-description">${interactive.description}</div>
                            <div class="interactive-meta">
                                <span class="badge badge-info">${interactive.type}</span>
                                <span class="badge badge-warning">${interactive.sparks_reward}✨ награда</span>
                                ${interactive.completed && (`
                                    <span class="badge badge-success">Пройдено</span>
                                `)}
                            </div>
                            <button class="action-btn ${buttonClass}" ${disabled ? 'disabled' : ''} 
                                    onclick="app.startInteractive(${interactive.id})">
                                ${buttonText}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🎮', 'Интерактивы не найдены', 'Скоро появятся новые интерактивы!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки интерактивов:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки интерактивов: ' + error.message);
        }
    }

    async startInteractive(interactiveId) {
        try {
            this.showLoading('Загрузка интерактива...');
            
            const response = await fetch(`/api/webapp/interactives?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки интерактива');
            
            const interactives = await response.json();
            const interactive = interactives.find(i => i.id === interactiveId);
            
            if (!interactive) {
                throw new Error('Интерактив не найден');
            }
            
            const interactiveHTML = `
                <div class="interactive-container">
                    <div class="interactive-title">${interactive.title}</div>
                    <div class="interactive-description">${interactive.description}</div>
                    
                    ${interactive.image_url && (`
                        <img src="${interactive.image_url}" class="interactive-image" alt="${interactive.title}">
                    `)}
                    
                    <div class="question-text">${interactive.question}</div>
                    
                    <div class="options-list">
                        ${interactive.options.map((option, index) => `
                            <div class="option-item" onclick="app.selectInteractiveAnswer(${interactive.id}, ${index})">
                                ${option}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            document.getElementById('interactivesList').innerHTML = interactiveHTML;
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка начала интерактива:', error);
            this.hideLoading();
            this.showError('Ошибка начала интерактива: ' + error.message);
        }
    }

    async selectInteractiveAnswer(interactiveId, answerIndex) {
        try {
            this.showLoading('Проверка ответа...');
            
            const response = await fetch(`/api/webapp/interactives/${interactiveId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    answer: answerIndex
                })
            });

            if (!response.ok) throw new Error('Ошибка отправки ответа');

            const data = await response.json();

            if (data.success) {
                // Показываем результат
                const resultHTML = `
                    <div class="content-card" style="text-align: center;">
                        <div style="font-size: 80px; margin-bottom: 20px;">
                            ${data.correct ? '🎉' : '😔'}
                        </div>
                        <h2 style="margin-bottom: 16px;">${data.correct ? 'Правильно!' : 'Попробуйте еще раз!'}</h2>
                        <p style="font-size: 18px; margin: 20px 0; line-height: 1.5;">
                            ${data.message}
                        </p>
                        ${data.correct && (`
                            <div style="font-size: 32px; color: #10b981; font-weight: 700; margin: 20px 0;">
                                +${data.sparksEarned}✨
                            </div>
                        `)}
                        <button class="btn btn-primary" onclick="app.showSection('interactives')" style="margin-top: 20px;">
                            Вернуться к списку
                        </button>
                    </div>
                `;
                
                document.getElementById('interactivesList').innerHTML = resultHTML;
                
                // Обновляем данные пользователя
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка отправки ответа:', error);
            this.hideLoading();
            this.showError('Ошибка отправки ответа: ' + error.message);
        }
    }

    async showShop() {
        try {
            this.showLoading('Загрузка магазина...');
            
            const response = await fetch('/api/webapp/shop/items');
            if (!response.ok) throw new Error('Ошибка загрузки магазина');
            
            const items = await response.json();
            
            const container = document.getElementById('shopItemsList');
            if (items.length > 0) {
                container.innerHTML = items.map((item, index) => {
                    const canAfford = this.user.sparks >= item.price;
                    
                    return `
                        <div class="shop-item-card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <div class="shop-item-title">${item.title}</div>
                            <div class="shop-item-description">${item.description}</div>
                                                        <div class="shop-item-meta">
                                <span class="badge badge-warning">${item.price}✨</span>
                                <span class="badge badge-info">${item.type}</span>
                                <span class="badge badge-success">${item.difficulty}</span>
                            </div>
                            
                            ${item.features && item.features.length > 0 && (`
                                <div style="margin: 16px 0;">
                                    <strong>Включает:</strong>
                                    <ul style="padding-left: 20px; margin-top: 8px;">
                                        ${item.features.map(feature => `<li style="margin-bottom: 4px;">${feature}</li>`).join('')}
                                    </ul>
                                </div>
                            `)}
                            
                            <button class="action-btn ${canAfford ? 'primary' : 'secondary'}" 
                                    ${!canAfford ? 'disabled' : ''}
                                    onclick="app.purchaseItem(${item.id})">
                                ${canAfford ? '🛒 Купить' : 'Недостаточно искр'}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🛒', 'Магазин пуст', 'Скоро появятся новые товары!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки магазина:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки магазина: ' + error.message);
        }
    }

    async purchaseItem(itemId) {
        if (!confirm('Вы уверены, что хотите купить этот товар?')) {
            return;
        }

        try {
            this.showLoading('Покупка...');
            
            const response = await fetch('/api/webapp/shop/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    itemId: itemId
                })
            });

            if (!response.ok) throw new Error('Ошибка покупки');

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.user.sparks = data.remainingSparks;
                this.updateUserInfo();
                this.showSection('shop');
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка покупки:', error);
            this.hideLoading();
            this.showError('Ошибка покупки: ' + error.message);
        }
    }

    async showWorks() {
        try {
            this.showLoading('Загрузка работ...');
            
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/works`);
            if (!response.ok) throw new Error('Ошибка загрузки работ');

            const data = await response.json();
            
            const container = document.getElementById('worksList');
            if (data.works && data.works.length > 0) {
                container.innerHTML = data.works.map((work, index) => {
                    const statusBadge = work.status === 'approved' ? 'badge-success' : 
                                      work.status === 'rejected' ? 'badge-danger' : 'badge-warning';
                    const statusText = work.status === 'approved' ? 'Одобрено' : 
                                     work.status === 'rejected' ? 'Отклонено' : 'На модерации';
                    
                    return `
                        <div class="card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <h3 style="margin-bottom: 12px;">${work.title}</h3>
                            ${work.description && (`
                                <p style="margin-bottom: 12px; color: #666; line-height: 1.4;">${work.description}</p>
                            `)}
                            <div style="margin-bottom: 16px;">
                                <span class="badge ${statusBadge}">${statusText}</span>
                                <span class="badge badge-secondary">${this.formatDate(work.created_at)}</span>
                            </div>
                            ${work.admin_comment && work.status === 'rejected' && (`
                                <div style="background: #fef2f2; padding: 12px; border-radius: 8px; margin-top: 12px;">
                                    <strong>Комментарий модератора:</strong> ${work.admin_comment}
                                </div>
                            `)}
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🖼️</div>
                        <h3>Работы не найдены</h3>
                        <p>Загрузите свою первую работу!</p>
                        <button class="btn btn-primary" onclick="app.showUploadWorkForm()" style="margin-top: 20px;">
                            ➕ Загрузить работу
                        </button>
                    </div>
                `;
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки работ:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки работ: ' + error.message);
        }
    }

    showUploadWorkForm() {
        const formHTML = `
            <div class="card">
                <h3 style="margin-bottom: 20px;">📤 Загрузка работы</h3>
                
                <div class="form-group">
                    <label class="form-label">Название работы:</label>
                    <input type="text" class="form-control" id="workTitle" placeholder="Введите название работы">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Описание:</label>
                    <textarea class="form-control" id="workDescription" placeholder="Опишите вашу работу..." rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Ссылка на изображение:</label>
                    <input type="url" class="form-control" id="workImageUrl" placeholder="https://example.com/image.jpg">
                    <small style="color: #666; margin-top: 8px; display: block;">
                        Вставьте ссылку на изображение вашей работы (Imgur, Google Drive и т.д.)
                    </small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Категория:</label>
                    <select class="form-control" id="workCategory">
                        <option value="painting">Живопись</option>
                        <option value="drawing">Рисунок</option>
                        <option value="digital">Цифровое искусство</option>
                        <option value="photography">Фотография</option>
                        <option value="craft">Рукоделие</option>
                        <option value="other">Другое</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-secondary" onclick="app.showSection('works')" style="flex: 1;">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="app.uploadWork()" style="flex: 1;">
                        Загрузить
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('worksList').innerHTML = formHTML;
    }

    async uploadWork() {
        const title = document.getElementById('workTitle').value.trim();
        const description = document.getElementById('workDescription').value.trim();
        const imageUrl = document.getElementById('workImageUrl').value.trim();
        const category = document.getElementById('workCategory').value;

        if (!title) {
            this.showError('Введите название работы');
            return;
        }

        if (!imageUrl) {
            this.showError('Введите ссылку на изображение');
            return;
        }

        try {
            this.showLoading('Загрузка работы...');
            
            const response = await fetch('/api/webapp/upload-work', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    title: title,
                    description: description,
                    imageUrl: imageUrl,
                    category: category
                })
            });

            if (!response.ok) throw new Error('Ошибка загрузки работы');

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.showSection('works');
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки работы:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки работы: ' + error.message);
        }
    }

    async showPosts() {
        try {
            this.showLoading('Загрузка постов...');
            
            const response = await fetch(`/api/webapp/channel-posts?userId=${this.user.user_id}`);
            if (!response.ok) throw new Error('Ошибка загрузки постов');

            const data = await response.json();
            
            const container = document.getElementById('postsList');
            if (data.posts && data.posts.length > 0) {
                container.innerHTML = data.posts.map((post, index) => {
                    const hasReview = post.user_review !== null;
                    
                    return `
                        <div class="post-card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <div class="post-title">${post.title}</div>
                            <div class="post-content">${post.content}</div>
                            
                            ${post.image_url && (`
                                <div style="margin: 16px 0;">
                                    <img src="${post.image_url}" style="max-width: 100%; border-radius: 8px;" alt="${post.title}">
                                </div>
                            `)}
                            
                            <div class="post-meta">
                                <span>${this.formatDate(post.created_at)}</span>
                                <span>${post.reviews_count} отзывов</span>
                            </div>
                            
                            <button class="btn ${hasReview ? 'btn-secondary' : 'btn-primary'}" 
                                    onclick="app.showPostReviewForm(${index}, '${post.post_id}')"
                                    style="margin-top: 16px; width: 100%;"
                                    ${hasReview ? 'disabled' : ''}>
                                ${hasReview ? '✓ Отзыв оставлен' : '✍️ Написать отзыв'}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('📰', 'Посты не найдены', 'Скоро появятся новые посты!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки постов:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки постов: ' + error.message);
        }
    }

    showPostReviewForm(postIndex, postId) {
        const formHTML = `
            <div class="card">
                <h3 style="margin-bottom: 20px;">✍️ Написать отзыв</h3>
                
                <div class="form-group">
                    <label class="form-label">Ваш отзыв:</label>
                    <textarea class="form-control" id="reviewText" placeholder="Поделитесь вашим мнением о посте..." rows="4"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Оценка:</label>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <button type="button" class="btn btn-secondary" 
                                    onclick="app.setReviewRating(${star})"
                                    id="star-${star}"
                                    style="flex: 1; padding: 12px;">
                                ${star} ⭐
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <input type="hidden" id="reviewRating" value="5">
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-secondary" onclick="app.showSection('posts')" style="flex: 1;">
                        Отмена
                    </button>
                    <button class="btn btn-primary" onclick="app.submitPostReview('${postId}')" style="flex: 1;">
                        Отправить отзыв
                    </button>
                </div>
            </div>
        `;
        
        // Сохраняем индекс поста для возврата
        this.currentPostIndex = postIndex;
        
        document.getElementById('postsList').innerHTML = formHTML;
        this.setReviewRating(5); // Устанавливаем рейтинг по умолчанию
    }

    setReviewRating(rating) {
        document.getElementById('reviewRating').value = rating;
        
        // Обновляем стили кнопок
        for (let i = 1; i <= 5; i++) {
            const starBtn = document.getElementById(`star-${i}`);
            if (i <= rating) {
                starBtn.classList.remove('btn-secondary');
                starBtn.classList.add('btn-warning');
            } else {
                starBtn.classList.remove('btn-warning');
                starBtn.classList.add('btn-secondary');
            }
        }
    }

    async submitPostReview(postId) {
        const reviewText = document.getElementById('reviewText').value.trim();
        const rating = parseInt(document.getElementById('reviewRating').value);

        if (!reviewText) {
            this.showError('Введите текст отзыва');
            return;
        }

        try {
            this.showLoading('Отправка отзыва...');
            
            const response = await fetch(`/api/webapp/posts/${postId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    reviewText: reviewText,
                    rating: rating
                })
            });

            if (!response.ok) throw new Error('Ошибка отправки отзыва');

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.showSection('posts');
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка отправки отзыва:', error);
            this.hideLoading();
            this.showError('Ошибка отправки отзыва: ' + error.message);
        }
    }

    async showAchievements() {
        try {
            this.showLoading('Загрузка достижений...');
            
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/achievements`);
            if (!response.ok) throw new Error('Ошибка загрузки достижений');

            const data = await response.json();
            
            const container = document.getElementById('achievementsList');
            
            // Показываем полученные достижения
            if (data.earned && data.earned.length > 0) {
                const earnedHTML = `
                    <h3 style="margin-bottom: 16px;">🎉 Полученные достижения</h3>
                    <div class="achievements-grid">
                        ${data.earned.map((achievement, index) => `
                            <div class="achievement-card earned stagger-item" style="animation-delay: ${index * 0.1}s">
                                <div class="achievement-icon">${achievement.icon}</div>
                                <div class="achievement-title">${achievement.title}</div>
                                <div class="achievement-description">${achievement.description}</div>
                                <div class="achievement-reward">+${achievement.sparks_reward}✨</div>
                                ${!achievement.sparks_claimed && (`
                                    <button class="btn btn-success" onclick="app.claimAchievement(${achievement.achievement_id})" style="margin-top: 12px; width: 100%;">
                                        Забрать награду
                                    </button>
                                `)}
                            </div>
                        `).join('')}
                    </div>
                `;
                
                container.innerHTML = earnedHTML;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🏆</div>
                        <h3>Достижений пока нет</h3>
                        <p>Участвуйте в активностях, чтобы получить достижения!</p>
                    </div>
                `;
            }
            
            // Показываем доступные достижения
            if (data.available && data.available.length > 0) {
                const availableHTML = `
                    <h3 style="margin: 32px 0 16px 0;">🎯 Доступные достижения</h3>
                    <div class="achievements-grid">
                        ${data.available.filter(a => !a.earned).map((achievement, index) => `
                            <div class="achievement-card stagger-item" style="animation-delay: ${index * 0.1}s">
                                <div class="achievement-icon">${achievement.icon}</div>
                                <div class="achievement-title">${achievement.title}</div>
                                <div class="achievement-description">${achievement.description}</div>
                                <div class="achievement-reward">+${achievement.sparks_reward}✨</div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                container.innerHTML += availableHTML;
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки достижений:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки достижений: ' + error.message);
        }
    }

    async claimAchievement(achievementId) {
        try {
            this.showLoading('Получение награды...');
            
            const response = await fetch(`/api/webapp/achievements/${achievementId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id
                })
            });

            if (!response.ok) throw new Error('Ошибка получения награды');

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.showSection('achievements');
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка получения награды:', error);
            this.hideLoading();
            this.showError('Ошибка получения награды: ' + error.message);
        }
    }

    async showActivities() {
        try {
            this.showLoading('Загрузка активностей...');
            
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/activities`);
            if (!response.ok) throw new Error('Ошибка загрузки активностей');

            const data = await response.json();
            
            const container = document.getElementById('activitiesList');
            if (data.activities && data.activities.length > 0) {
                container.innerHTML = data.activities.map((activity, index) => `
                    <div class="activity-item stagger-item" style="animation-delay: ${index * 0.05}s">
                        <div class="activity-info">
                            <div class="activity-title">${activity.description}</div>
                            <div class="activity-date">${this.formatDate(activity.created_at)}</div>
                        </div>
                        <div class="activity-sparks">+${activity.sparks_earned}✨</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.createEmptyState('📊', 'Активности не найдены', 'Начните участвовать в активностях!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки активностей:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки активностей: ' + error.message);
        }
    }

    async showPurchases() {
        try {
            this.showLoading('Загрузка покупок...');
            
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/purchases`);
            if (!response.ok) throw new Error('Ошибка загрузки покупок');

            const data = await response.json();
            
            const container = document.getElementById('purchasesList');
            if (data.purchases && data.purchases.length > 0) {
                container.innerHTML = data.purchases.map((purchase, index) => {
                    const fileUrl = purchase.file_url || purchase.file_data;
                    
                    return `
                        <div class="purchase-card stagger-item" style="animation-delay: ${index * 0.1}s">
                            <div class="purchase-header">
                                <div>
                                    <div class="purchase-title">${purchase.title}</div>
                                    <div class="purchase-description">${purchase.description}</div>
                                </div>
                                <div class="purchase-price">-${purchase.price_paid}✨</div>
                            </div>
                            
                            <div class="purchase-meta">
                                <span class="badge badge-info">${purchase.type}</span>
                                <span class="badge badge-secondary">${this.formatDate(purchase.purchased_at)}</span>
                            </div>
                            
                            ${fileUrl && (`
                                <a href="${fileUrl}" class="file-download" target="_blank" download>
                                    📥 Скачать материалы
                                </a>
                            `)}
                            
                            ${purchase.content_text && !fileUrl && (`
                                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 12px;">
                                    <strong>Содержание:</strong>
                                    <p style="margin-top: 8px; line-height: 1.5;">${purchase.content_text}</p>
                                </div>
                            `)}
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('📦', 'Покупок нет', 'Купите что-нибудь в магазине!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки покупок:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки покупок: ' + error.message);
        }
    }

    async showChangeRole() {
        try {
            this.showLoading('Загрузка ролей...');
            
            // Показываем текущую роль
            document.getElementById('currentRole').textContent = this.user.class || 'Не выбрана';
            
            // Загружаем все роли
            const response = await fetch('/api/webapp/roles');
            if (!response.ok) throw new Error('Ошибка загрузки ролей');
            
            const roles = await response.json();
            
            const container = document.getElementById('changeRoleSelection');
            container.innerHTML = roles.map(role => `
                <div class="role-option" onclick="app.selectChangeRole(${role.id}, this)">
                    <div class="role-icon">${role.icon}</div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                </div>
            `).join('');
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки ролей:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки ролей: ' + error.message);
        }
    }

    async selectChangeRole(roleId, element) {
        this.selectedRole = roleId;
        
        // Убираем выделение у всех ролей
        document.querySelectorAll('#changeRoleSelection .role-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Добавляем выделение выбранной роли
        element.classList.add('selected');
        
        // Показываем раздел выбора персонажа
        document.getElementById('changeCharacterSection').classList.remove('hidden');
        
        // Загружаем персонажей для выбранной роли
        await this.loadChangeCharacters(roleId);
        
        // Показываем кнопку смены роли
        document.getElementById('changeRoleBtn').classList.remove('hidden');
    }

    async loadChangeCharacters(roleId) {
        try {
            this.showLoading('Загрузка персонажей...');
            
            const response = await fetch(`/api/webapp/characters/${roleId}`);
            if (!response.ok) throw new Error('Ошибка загрузки персонажей');
            
            const characters = await response.json();
            
            const container = document.getElementById('changeCharacterSelection');
            if (characters.length > 0) {
                container.innerHTML = characters.map(character => `
                    <div class="character-option" onclick="app.selectChangeCharacter(${character.id}, this)">
                        <div class="character-name">
                            <span style="font-size: 24px; margin-right: 8px;">${character.avatar}</span>
                            ${character.name}
                        </div>
                        <div class="character-description">${character.description}</div>
                        <div class="character-bonus">${character.bonus_description}</div>
                    </div>
                `).join('');
                
                // Выбираем первого персонажа по умолчанию
                if (characters.length > 0) {
                    this.selectChangeCharacter(characters[0].id, container.firstElementChild);
                }
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👤</div>
                        <p>Для этой роли пока нет персонажей</p>
                    </div>
                `;
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки персонажей:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки персонажей: ' + error.message);
        }
    }

    selectChangeCharacter(characterId, element) {
        this.selectedCharacter = characterId;
        
        // Убираем выделение у всех персонажей
        document.querySelectorAll('#changeCharacterSelection .character-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Добавляем выделение выбранному персонажу
        element.classList.add('selected');
    }

    async changeRole() {
        if (!this.selectedRole || !this.selectedCharacter) {
            this.showError('Выберите роль и персонажа');
            return;
        }

        if (!confirm('Вы уверены, что хотите сменить роль? Это повлияет на доступные активности.')) {
            return;
        }

        try {
            this.showLoading('Смена роли...');
            
            const response = await fetch('/api/users/change-role', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    roleId: this.selectedRole,
                    characterId: this.selectedCharacter
                })
            });

            if (!response.ok) throw new Error('Ошибка смены роли');

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.showMessage(data.message, 'success');
                this.showDashboard();
            } else {
                throw new Error(data.error || 'Неизвестная ошибка');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка смены роли:', error);
            this.hideLoading();
            this.showError('Ошибка смены роли: ' + error.message);
        }
    }

    async showNotifications() {
        try {
            this.showLoading('Загрузка уведомлений...');
            
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/notifications`);
            if (!response.ok) throw new Error('Ошибка загрузки уведомлений');

            const data = await response.json();
            
            const container = document.getElementById('notificationsList');
            if (data.notifications && data.notifications.length > 0) {
                container.innerHTML = data.notifications.map((notification, index) => `
                    <div class="notification-item ${!notification.is_read ? 'unread' : ''} stagger-item" 
                         style="animation-delay: ${index * 0.1}s">
                        <div class="notification-title">${notification.title}</div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-meta">
                            <span>${this.formatDate(notification.created_at)}</span>
                            ${!notification.is_read && (`
                                <button class="btn btn-sm btn-primary" 
                                        onclick="app.markNotificationRead(${notification.id})">
                                    Отметить прочитанным
                                </button>
                            `)}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.createEmptyState('🔔', 'Уведомлений нет', 'Здесь появятся ваши уведомления!');
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка загрузки уведомлений:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки уведомлений: ' + error.message);
        }
    }

    async markNotificationRead(notificationId) {
        try {
            const response = await fetch(`/api/webapp/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id
                })
            });

            if (response.ok) {
                this.showNotifications();
                this.loadNotifications(); // Обновляем бейдж
            }
        } catch (error) {
            console.error('❌ Ошибка отметки уведомления:', error);
        }
    }

    async markAllNotificationsRead() {
        try {
            this.showLoading('Отметка уведомлений...');
            
            const response = await fetch('/api/webapp/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id
                })
            });

            if (response.ok) {
                this.showMessage('Все уведомления отмечены как прочитанные', 'success');
                this.showNotifications();
                this.loadNotifications(); // Обновляем бейдж
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Ошибка отметки уведомлений:', error);
            this.hideLoading();
        }
    }

    async loadNotifications() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/notifications?unread_only=true`);
            if (!response.ok) return;
            
            const data = await response.json();
            const unreadCount = data.notifications ? data.notifications.length : 0;
            
            const badge = document.getElementById('notificationBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки уведомлений:', error);
        }
    }

    // Вспомогательные методы
    hideAllSections() {
        const sections = document.querySelectorAll('[id$="Section"]');
        sections.forEach(section => {
            section.classList.add('hidden');
        });
    }

    showLoading(message = 'Загрузка...') {
        this.isLoading = true;
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <div>${message}</div>
            </div>
        `;
    }

    hideLoading() {
        this.isLoading = false;
    }

    showMessage(text, type = 'info') {
        const messageArea = document.getElementById('messageArea');
        messageArea.innerHTML = `
            <div class="message ${type}">
                ${text}
            </div>
        `;
        
        // Автоматически скрываем сообщение через 5 секунд
        setTimeout(() => {
            messageArea.innerHTML = '';
        }, 5000);
    }

    showError(text) {
        this.showMessage(text, 'error');
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

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'только что';
        } else if (diffMins < 60) {
            return `${diffMins} мин. назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч. назад`;
        } else if (diffDays < 7) {
            return `${diffDays} д. назад`;
        } else {
            return date.toLocaleDateString('ru-RU');
        }
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', function() {
    app = new InspirationApp();
});
                               
