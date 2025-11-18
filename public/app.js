// Мастерская Вдохновения - WebApp
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
        
        this.init();
    }

    async init() {
        try {
            // Инициализация Telegram WebApp
            this.tg = window.Telegram.WebApp;
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            
            // Устанавливаем цветовую схему
            this.tg.setHeaderColor('#667eea');
            this.tg.setBackgroundColor('#667eea');
            
            // Получаем данные пользователя
            const userData = this.tg.initDataUnsafe?.user;
            if (userData) {
                await this.loadUserData(userData.id);
            } else {
                this.showError('Не удалось получить данные пользователя');
            }
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError('Ошибка загрузки приложения');
        }
    }

    async loadUserData(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            
            if (data.exists) {
                this.user = data.user;
                this.showDashboard();
            } else {
                this.user = data.user;
                this.showRegistration();
            }
            
            // Загружаем уведомления
            await this.loadNotifications();
            
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            this.showError('Ошибка загрузки данных пользователя');
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
            const response = await fetch('/api/webapp/roles');
            const roles = await response.json();
            
            const container = document.getElementById('roleSelection');
            container.innerHTML = roles.map(role => `
                <div class="role-option" onclick="app.selectRole(${role.id})">
                    <div class="role-icon">${role.icon}</div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Ошибка загрузки ролей:', error);
            this.showError('Ошибка загрузки списка ролей');
        }
    }

    async selectRole(roleId) {
        this.selectedRole = roleId;
        
        // Добавляем класс selected к выбранной роли
        document.querySelectorAll('.role-option').forEach(option => {
            option.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Показываем раздел выбора персонажа
        document.getElementById('characterSection').classList.remove('hidden');
        
        // Загружаем персонажей для выбранной роли
        await this.loadCharacters(roleId);
    }

    async loadCharacters(roleId) {
        try {
            const response = await fetch(`/api/webapp/characters/${roleId}`);
            const characters = await response.json();
            
            const container = document.getElementById('characterSelection');
            if (characters.length > 0) {
                container.innerHTML = characters.map(character => `
                    <div class="character-option" onclick="app.selectCharacter(${character.id})">
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
                container.innerHTML = '<p>Для этой роли пока нет персонажей</p>';
            }
            
        } catch (error) {
            console.error('Ошибка загрузки персонажей:', error);
            this.showError('Ошибка загрузки списка персонажей');
        }
    }

    selectCharacter(characterId) {
        this.selectedCharacter = characterId;
        
        // Добавляем класс selected к выбранному персонажу
        document.querySelectorAll('.character-option').forEach(option => {
            option.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
    }

    async completeRegistration() {
        if (!this.selectedRole || !this.selectedCharacter) {
            this.showError('Выберите роль и персонажа');
            return;
        }

        try {
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

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.showMessage('Регистрация успешна! Добро пожаловать!', 'success');
                this.showDashboard();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
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
        
        document.getElementById('userAvatar').textContent = this.user.tg_first_name?.charAt(0) || 'U';
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
            const data = await response.json();
            
            const container = document.getElementById('recentActivities');
            if (data.activities && data.activities.length > 0) {
                container.innerHTML = data.activities.slice(0, 5).map(activity => `
                    <div class="activity-item">
                        <div class="activity-info">
                            <div class="activity-title">${activity.description}</div>
                            <div class="activity-date">${new Date(activity.created_at).toLocaleDateString()}</div>
                        </div>
                        <div class="activity-sparks">+${activity.sparks_earned}✨</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-muted">Активности пока нет</p>';
            }
        } catch (error) {
            console.error('Ошибка загрузки активностей:', error);
        }
    }

    async showSection(sectionName) {
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
            const response = await fetch(`/api/webapp/quizzes?userId=${this.user.user_id}`);
            const quizzes = await response.json();
            
            const container = document.getElementById('quizzesList');
            if (quizzes.length > 0) {
                container.innerHTML = quizzes.map(quiz => {
                    const difficultyBadge = quiz.difficulty === 'beginner' ? 'badge-success' : 
                                          quiz.difficulty === 'intermediate' ? 'badge-warning' : 'badge-danger';
                    const difficultyText = quiz.difficulty === 'beginner' ? 'Начинающий' :
                                         quiz.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый';
                    
                    let buttonText = 'Начать';
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
                        <div class="quiz-card">
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
        } catch (error) {
            console.error('Ошибка загрузки квизов:', error);
            this.showError('Ошибка загрузки квизов');
        }
    }

    async startQuiz(quizId) {
        try {
            const response = await fetch(`/api/webapp/quizzes?userId=${this.user.user_id}`);
            const quizzes = await response.json();
            const quiz = quizzes.find(q => q.id === quizId);
            
            if (!quiz) {
                this.showError('Квиз не найден');
                return;
            }
            
            this.currentQuiz = quiz;
            this.quizAnswers = [];
            this.currentQuestionIndex = 0;
            
            this.showQuizQuestion();
            
        } catch (error) {
            console.error('Ошибка начала квиза:', error);
            this.showError('Ошибка начала квиза');
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
                    ${this.currentQuestionIndex === this.currentQuiz.questions.length - 1 ? 'Завершить' : 'Следующий вопрос'}
                </button>
            </div>
        `;
        
        this.hideAllSections();
        document.getElementById('quizzesSection').classList.remove('hidden');
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

            const data = await response.json();

            if (data.success) {
                this.showQuizResults(data);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка отправки квиза:', error);
            this.showError('Ошибка отправки квиза: ' + error.message);
        }
    }

    showQuizResults(results) {
        const resultsHTML = `
            <div class="quiz-results">
                <div class="results-score">${results.scorePercentage}%</div>
                <div class="results-message">${results.message}</div>
                
                <div class="results-details">
                    <h3>Детали результатов:</h3>
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
            const response = await fetch(`/api/webapp/marathons?userId=${this.user.user_id}`);
            const marathons = await response.json();
            
            const container = document.getElementById('marathonsList');
            if (marathons.length > 0) {
                container.innerHTML = marathons.map(marathon => {
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
                        <div class="marathon-card">
                            <div class="marathon-title">${marathon.title}</div>
                            <div class="marathon-description">${marathon.description}</div>
                            <div class="marathon-meta">
                                <span class="badge badge-info">${marathon.duration_days} дней</span>
                                <span class="badge badge-warning">${marathon.sparks_per_day}✨ в день</span>
                                <span class="badge badge-success">${marathon.sparks_completion_bonus}✨ за завершение</span>
                            </div>
                            
                            ${marathon.can_continue && !marathon.completed && (
                                `<div class="progress-container">
                                    <div class="progress-label">
                                        <span>Прогресс</span>
                                        <span>${progress}%</span>
                                    </div>
                                    <div class="progress-bar-large">
                                        <div class="progress-fill-large" style="width: ${progress}%"></div>
                                    </div>
                                </div>`
                            )}
                            
                            <button class="action-btn ${buttonClass}" onclick="app.startMarathon(${marathon.id})">
                                ${buttonText}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🏃‍♂️', 'Марафоны не найдены', 'Скоро появятся новые марафоны!');
            }
        } catch (error) {
            console.error('Ошибка загрузки марафонов:', error);
            this.showError('Ошибка загрузки марафонов');
        }
    }

    async startMarathon(marathonId) {
        try {
            const response = await fetch(`/api/webapp/marathons?userId=${this.user.user_id}`);
            const marathons = await response.json();
            const marathon = marathons.find(m => m.id === marathonId);
            
            if (!marathon) {
                this.showError('Марафон не найден');
                return;
            }
            
            this.showMarathonDay(marathon, marathon.current_day);
            
        } catch (error) {
            console.error('Ошибка начала марафона:', error);
            this.showError('Ошибка начала марафона');
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
                <h3>День ${day}: ${task.title}</h3>
                <div class="marathon-description">${task.description}</div>
                
                ${task.instructions && (
                    `<div class="content-card" style="background: #f0f9ff;">
                        <h4>📋 Инструкции:</h4>
                        <p>${task.instructions}</p>
                    </div>`
                )}
                
                ${task.tips && task.tips.length > 0 && (
                    `<div class="content-card" style="background: #f0fff4;">
                        <h4>💡 Советы:</h4>
                        <ul>
                            ${task.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>`
                )}
                
                ${task.requires_submission && (
                    `<div class="form-group">
                        <label class="form-label">Ваша работа:</label>
                        <textarea class="form-control" id="marathonSubmission" placeholder="Опишите вашу работу или прикрепите ссылку на изображение..." rows="4"></textarea>
                    </div>`
                )}
                
                <button class="btn btn-success" onclick="app.submitMarathonDay(${marathon.id}, ${day})">
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
                        onclick="app.showMarathonDay(${marathon.id}, ${t.day})"
                        ${t.day > day && !marathon.can_continue ? 'disabled' : ''}>
                        День ${t.day}
                    </button>
                `).join('')}
            </div>
        `;
        
        this.hideAllSections();
        document.getElementById('marathonsSection').classList.remove('hidden');
        document.getElementById('marathonsList').innerHTML = navigationHTML + dayHTML;
    }

    async submitMarathonDay(marathonId, day) {
        try {
            const submissionText = document.getElementById('marathonSubmission')?.value || '';
            
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
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка отправки дня марафона:', error);
            this.showError('Ошибка отправки дня марафона: ' + error.message);
        }
    }

    async showInteractives() {
        try {
            const response = await fetch(`/api/webapp/interactives?userId=${this.user.user_id}`);
            const interactives = await response.json();
            
            const container = document.getElementById('interactivesList');
            if (interactives.length > 0) {
                container.innerHTML = interactives.map(interactive => {
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
                        <div class="interactive-card">
                            <div class="interactive-title">${interactive.title}</div>
                            <div class="interactive-description">${interactive.description}</div>
                            <div class="interactive-meta">
                                <span class="badge badge-info">${interactive.type}</span>
                                <span class="badge badge-warning">${interactive.sparks_reward}✨ награда</span>
                                ${interactive.completed && (
                                    `<span class="badge badge-success">Пройдено</span>`
                                )}
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
        } catch (error) {
            console.error('Ошибка загрузки интерактивов:', error);
            this.showError('Ошибка загрузки интерактивов');
        }
    }

    async startInteractive(interactiveId) {
        try {
            const response = await fetch(`/api/webapp/interactives?userId=${this.user.user_id}`);
            const interactives = await response.json();
            const interactive = interactives.find(i => i.id === interactiveId);
            
            if (!interactive) {
                this.showError('Интерактив не найден');
                return;
            }
            
            const interactiveHTML = `
                <div class="interactive-container">
                    <div class="interactive-title">${interactive.title}</div>
                    <div class="interactive-description">${interactive.description}</div>
                    
                    ${interactive.image_url && (
                        `<img src="${interactive.image_url}" class="interactive-image" alt="${interactive.title}">`
                    )}
                    
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
            
            this.hideAllSections();
            document.getElementById('interactivesSection').classList.remove('hidden');
            document.getElementById('interactivesList').innerHTML = interactiveHTML;
            
        } catch (error) {
            console.error('Ошибка начала интерактива:', error);
            this.showError('Ошибка начала интерактива');
        }
    }

    async selectInteractiveAnswer(interactiveId, answerIndex) {
        try {
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

            const data = await response.json();

            if (data.success) {
                // Показываем результат
                const resultHTML = `
                    <div class="content-card text-center">
                        <div style="font-size: 64px; margin-bottom: 20px;">
                            ${data.correct ? '🎉' : '😔'}
                        </div>
                        <h2>${data.correct ? 'Правильно!' : 'Попробуйте еще раз!'}</h2>
                        <p style="font-size: var(--font-xlarge); margin: 20px 0;">
                            ${data.message}
                        </p>
                        ${data.correct && (
                            `<div style="font-size: var(--font-xxlarge); color: var(--success-color); font-weight: bold;">
                                +${data.sparksEarned}✨
                            </div>`
                        )}
                        <button class="btn btn-primary" onclick="app.showSection('interactives')" style="margin-top: 20px;">
                            Вернуться к списку
                        </button>
                    </div>
                `;
                
                document.getElementById('interactivesList').innerHTML = resultHTML;
                
                // Обновляем данные пользователя
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка отправки ответа:', error);
            this.showError('Ошибка отправки ответа: ' + error.message);
        }
    }

    async showShop() {
        try {
            const response = await fetch('/api/webapp/shop/items');
            const items = await response.json();
            
            const container = document.getElementById('shopItemsList');
            if (items.length > 0) {
                container.innerHTML = items.map(item => {
                    const canAfford = this.user.sparks >= item.price;
                    
                    return `
                        <div class="shop-item-card">
                            <div class="shop-item-title">${item.title}</div>
                            <div class="shop-item-description">${item.description}</div>
                            <div class="shop-item-meta">
                                <span class="badge badge-warning">${item.price} ✨</span>
                                <span class="badge badge-info">${item.type}</span>
                                <span class="badge badge-success">${item.difficulty}</span>
                            </div>
                            <button class="action-btn ${canAfford ? 'primary' : 'secondary'}" 
                                    ${!canAfford ? 'disabled' : ''}
                                    onclick="app.purchaseItem(${item.id})">
                                ${canAfford ? 'Купить' : 'Недостаточно искр'}
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🛒', 'Товары не найдены', 'Скоро появятся новые товары!');
            }
        } catch (error) {
            console.error('Ошибка загрузки магазина:', error);
            this.showError('Ошибка загрузки магазина');
        }
    }

    async purchaseItem(itemId) {
        if (!confirm('Вы уверены, что хотите купить этот товар?')) return;

        try {
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

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.user.sparks = data.remainingSparks;
                this.updateUserInfo();
                this.showSection('shop');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка покупки:', error);
            this.showError('Ошибка покупки: ' + error.message);
        }
    }

    async showWorks() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/works`);
            const data = await response.json();
            
            const container = document.getElementById('worksList');
            if (data.works && data.works.length > 0) {
                container.innerHTML = data.works.map(work => {
                    const statusBadge = work.status === 'approved' ? 'badge-success' :
                                      work.status === 'rejected' ? 'badge-danger' : 'badge-warning';
                    const statusText = work.status === 'approved' ? 'Одобрено' :
                                     work.status === 'rejected' ? 'Отклонено' : 'На модерации';
                    
                    return `
                        <div class="content-card">
                            <h3>${work.title}</h3>
                            <p>${work.description}</p>
                            <div class="post-meta">
                                <span class="badge ${statusBadge}">${statusText}</span>
                                <span>${new Date(work.created_at).toLocaleDateString()}</span>
                            </div>
                            ${work.admin_comment && (
                                `<div style="margin-top: 12px; padding: 12px; background: #f7fafc; border-radius: 8px;">
                                    <strong>Комментарий модератора:</strong> ${work.admin_comment}
                                </div>`
                            )}
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('🖼️', 'Работы не найдены', 'Загрузите свою первую работу!');
            }
        } catch (error) {
            console.error('Ошибка загрузки работ:', error);
            this.showError('Ошибка загрузки работ');
        }
    }

    showUploadWorkForm() {
        const formHTML = `
            <div class="content-card">
                <h3>📤 Загрузка работы</h3>
                <form id="uploadWorkForm">
                    <div class="form-group">
                        <label class="form-label">Название работы:</label>
                        <input type="text" class="form-control" id="workTitle" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Описание:</label>
                        <textarea class="form-control" id="workDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Ссылка на изображение:</label>
                        <input type="url" class="form-control" id="workImageUrl" placeholder="https://example.com/image.jpg" required>
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
                    <button type="button" class="btn btn-success" onclick="app.uploadWork()">
                        📤 Загрузить работу
                    </button>
                </form>
            </div>
        `;
        
        document.getElementById('worksList').innerHTML = formHTML;
    }

    async uploadWork() {
        const title = document.getElementById('workTitle').value;
        const description = document.getElementById('workDescription').value;
        const imageUrl = document.getElementById('workImageUrl').value;
        const category = document.getElementById('workCategory').value;
        
        if (!title || !imageUrl) {
            this.showError('Заполните название и ссылку на изображение');
            return;
        }

        try {
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
                    category: category,
                    type: 'image'
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.showSection('works');
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки работы:', error);
            this.showError('Ошибка загрузки работы: ' + error.message);
        }
    }

    async showPosts() {
        try {
            const response = await fetch(`/api/webapp/channel-posts?userId=${this.user.user_id}`);
            const data = await response.json();
            
            const container = document.getElementById('postsList');
            if (data.posts && data.posts.length > 0) {
                container.innerHTML = data.posts.map(post => {
                    return `
                        <div class="post-card">
                            <div class="post-title">${post.title}</div>
                            <div class="post-content">${post.content}</div>
                            <div class="post-meta">
                                <span>${post.reviews_count} отзывов</span>
                                <span>Рейтинг: ${post.average_rating?.toFixed(1) || 0}/5</span>
                            </div>
                            <button class="btn btn-primary" onclick="app.showPostReview(${post.post_id})" style="margin-top: 12px;">
                                💬 Оставить отзыв
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = this.createEmptyState('📰', 'Посты не найдены', 'Скоро появятся новые посты!');
            }
        } catch (error) {
            console.error('Ошибка загрузки постов:', error);
            this.showError('Ошибка загрузки постов');
        }
    }

    showPostReview(postId) {
        const reviewHTML = `
            <div class="content-card">
                <h3>💬 Написать отзыв</h3>
                <form id="postReviewForm">
                    <div class="form-group">
                        <label class="form-label">Ваш отзыв:</label>
                        <textarea class="form-control" id="reviewText" rows="4" placeholder="Поделитесь вашим мнением о посте..." required></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Оценка:</label>
                        <select class="form-control" id="reviewRating">
                            <option value="5">⭐⭐⭐⭐⭐ (5) Отлично</option>
                            <option value="4">⭐⭐⭐⭐ (4) Хорошо</option>
                            <option value="3">⭐⭐⭐ (3) Нормально</option>
                            <option value="2">⭐⭐ (2) Плохо</option>
                            <option value="1">⭐ (1) Очень плохо</option>
                        </select>
                    </div>
                    <button type="button" class="btn btn-success" onclick="app.submitPostReview('${postId}')">
                        📤 Отправить отзыв
                    </button>
                </form>
            </div>
        `;
        
        document.getElementById('postsList').innerHTML = reviewHTML;
    }

    async submitPostReview(postId) {
        const reviewText = document.getElementById('reviewText').value;
        const rating = document.getElementById('reviewRating').value;
        
        if (!reviewText) {
            this.showError('Напишите текст отзыва');
            return;
        }

        try {
            const response = await fetch(`/api/webapp/posts/${postId}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id,
                    reviewText: reviewText,
                    rating: parseInt(rating)
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.showSection('posts');
                this.loadUserData(this.user.user_id);
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка отправки отзыва:', error);
            this.showError('Ошибка отправки отзыва: ' + error.message);
        }
    }

    async showAchievements() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/achievements`);
            const data = await response.json();
            
            const container = document.getElementById('achievementsList');
            
            if (data.earned.length > 0 || data.available.length > 0) {
                let html = '';
                
                if (data.earned.length > 0) {
                    html += `<h3>🏆 Полученные достижения</h3>`;
                    html += `<div class="achievements-grid">`;
                    html += data.earned.map(achievement => `
                        <div class="achievement-card earned">
                            <div class="achievement-icon">${achievement.icon}</div>
                            <div class="achievement-title">${achievement.title}</div>
                            <div class="achievement-description">${achievement.description}</div>
                            <div class="achievement-reward">+${achievement.sparks_reward}✨</div>
                        </div>
                    `).join('');
                    html += `</div>`;
                }
                
                if (data.available.length > 0) {
                    html += `<h3 style="margin-top: 24px;">🎯 Доступные достижения</h3>`;
                    html += `<div class="achievements-grid">`;
                    html += data.available.filter(a => !a.earned).map(achievement => `
                        <div class="achievement-card">
                            <div class="achievement-icon">${achievement.icon}</div>
                            <div class="achievement-title">${achievement.title}</div>
                            <div class="achievement-description">${achievement.description}</div>
                            <div class="achievement-reward">+${achievement.sparks_reward}✨</div>
                        </div>
                    `).join('');
                    html += `</div>`;
                }
                
                container.innerHTML = html;
            } else {
                container.innerHTML = this.createEmptyState('🏆', 'Достижения не найдены', 'Выполняйте задания чтобы получать достижения!');
            }
        } catch (error) {
            console.error('Ошибка загрузки достижений:', error);
            this.showError('Ошибка загрузки достижений');
        }
    }

    async showActivities() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/activities`);
            const data = await response.json();
            
            const container = document.getElementById('activitiesList');
            if (data.activities && data.activities.length > 0) {
                container.innerHTML = data.activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-info">
                            <div class="activity-title">${activity.description}</div>
                            <div class="activity-date">${new Date(activity.created_at).toLocaleString()}</div>
                        </div>
                        <div class="activity-sparks">+${activity.sparks_earned}✨</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.createEmptyState('📊', 'Активности не найдены', 'Начните использовать приложение чтобы увидеть вашу активность!');
            }
        } catch (error) {
            console.error('Ошибка загрузки активностей:', error);
            this.showError('Ошибка загрузки активностей');
        }
    }

    async showPurchases() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/purchases`);
            const data = await response.json();
            
            const container = document.getElementById('purchasesList');
            if (data.purchases && data.purchases.length > 0) {
                container.innerHTML = data.purchases.map(purchase => `
                    <div class="purchase-card">
                        <div class="purchase-header">
                            <div class="purchase-title">${purchase.title}</div>
                            <div class="purchase-price">${purchase.price_paid} ✨</div>
                        </div>
                        <div class="purchase-description">${purchase.description}</div>
                        <div class="purchase-meta">
                            <span class="badge badge-info">${purchase.type}</span>
                            <span class="badge badge-secondary">${new Date(purchase.purchased_at).toLocaleDateString()}</span>
                        </div>
                        ${purchase.file_url && (
                            `<a href="${purchase.file_url}" class="file-download" download>
                                📥 Скачать файл
                            </a>`
                        )}
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.createEmptyState('📦', 'Покупки не найдены', 'Купите товары в магазине чтобы они появились здесь!');
            }
        } catch (error) {
            console.error('Ошибка загрузки покупок:', error);
            this.showError('Ошибка загрузки покупок');
        }
    }

    async showChangeRole() {
        try {
            // Загружаем доступные роли
            const rolesResponse = await fetch('/api/webapp/roles');
            const roles = await rolesResponse.json();
            
            document.getElementById('currentRole').textContent = this.user.class || 'Не выбрана';
            
            const container = document.getElementById('changeRoleSelection');
            container.innerHTML = roles.map(role => `
                <div class="role-option ${role.name === this.user.class ? 'selected' : ''}" 
                     onclick="app.selectChangeRole(${role.id})">
                    <div class="role-icon">${role.icon}</div>
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Ошибка загрузки ролей:', error);
            this.showError('Ошибка загрузки списка ролей');
        }
    }

    async selectChangeRole(roleId) {
        this.selectedRole = roleId;
        
        // Добавляем класс selected к выбранной роли
        document.querySelectorAll('#changeRoleSelection .role-option').forEach(option => {
            option.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
        
        // Загружаем персонажей для выбранной роли
        await this.loadChangeCharacters(roleId);
    }

    async loadChangeCharacters(roleId) {
        try {
            const response = await fetch(`/api/webapp/characters/${roleId}`);
            const characters = await response.json();
            
            const container = document.getElementById('changeCharacterSelection');
            if (characters.length > 0) {
                container.innerHTML = characters.map(character => `
                    <div class="character-option" onclick="app.selectChangeCharacter(${character.id})">
                        <div class="character-name">
                            <span style="font-size: 24px; margin-right: 8px;">${character.avatar}</span>
                            ${character.name}
                        </div>
                        <div class="character-description">${character.description}</div>
                        <div class="character-bonus">${character.bonus_description}</div>
                    </div>
                `).join('');
                
                document.getElementById('changeCharacterSection').classList.remove('hidden');
                document.getElementById('changeRoleBtn').classList.remove('hidden');
            } else {
                container.innerHTML = '<p>Для этой роли пока нет персонажей</p>';
            }
            
        } catch (error) {
            console.error('Ошибка загрузки персонажей:', error);
            this.showError('Ошибка загрузки списка персонажей');
        }
    }

    selectChangeCharacter(characterId) {
        this.selectedCharacter = characterId;
        
        // Добавляем класс selected к выбранному персонажу
        document.querySelectorAll('#changeCharacterSelection .character-option').forEach(option => {
            option.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
    }

    async changeRole() {
        if (!this.selectedRole || !this.selectedCharacter) {
            this.showError('Выберите роль и персонажа');
            return;
        }

        try {
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

            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.showMessage('Роль успешно изменена!', 'success');
                this.showDashboard();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка смены роли:', error);
            this.showError('Ошибка смены роли: ' + error.message);
        }
    }

    async showNotifications() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/notifications`);
            const data = await response.json();
            
            const container = document.getElementById('notificationsList');
            if (data.notifications && data.notifications.length > 0) {
                container.innerHTML = data.notifications.map(notification => `
                    <div class="content-card ${!notification.is_read ? 'unread' : ''}">
                        <h3>${notification.title}</h3>
                        <p>${notification.message}</p>
                        <div class="post-meta">
                            <span>${new Date(notification.created_at).toLocaleString()}</span>
                            ${!notification.is_read && (
                                `<button class="btn btn-sm btn-primary" onclick="app.markNotificationRead(${notification.id})">
                                    Отметить прочитанным
                                </button>`
                            )}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = this.createEmptyState('🔔', 'Уведомлений нет', 'Здесь будут появляться ваши уведомления!');
            }
            
            this.hideAllSections();
            document.getElementById('notificationsSection').classList.remove('hidden');
            this.currentSection = 'notifications';
            
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
            this.showError('Ошибка загрузки уведомлений');
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

            const data = await response.json();

            if (data.success) {
                this.showNotifications(); // Перезагружаем уведомления
                this.loadNotifications(); // Обновляем бейдж
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка отметки уведомления:', error);
            this.showError('Ошибка отметки уведомления');
        }
    }

    async markAllNotificationsRead() {
        try {
            const response = await fetch('/api/webapp/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.user.user_id
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage(data.message, 'success');
                this.showNotifications();
                this.loadNotifications();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка отметки всех уведомлений:', error);
            this.showError('Ошибка отметки всех уведомлений');
        }
    }

    async loadNotifications() {
        try {
            const response = await fetch(`/api/webapp/users/${this.user.user_id}/notifications?unread_only=true`);
            const data = await response.json();
            
            const badge = document.getElementById('notificationBadge');
            if (data.notifications && data.notifications.length > 0) {
                badge.textContent = data.notifications.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
        }
    }

    hideAllSections() {
        const sections = document.querySelectorAll('[id$="Section"]');
        sections.forEach(section => {
            section.classList.add('hidden');
        });
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

    createEmptyState(icon, title, description) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">${icon}</div>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;
    }
}

// Инициализация приложения
const app = new InspirationApp();
