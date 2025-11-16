import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const APP_ROOT = process.cwd();

console.log('🎨 Мастерская Вдохновения - Запуск системы v8.0...');

// ==================== УЛУЧШЕННАЯ IN-MEMORY БАЗА ДАННЫХ ====================
let db = {
    users: [
        {
            id: 1,
            user_id: 898508164,
            tg_first_name: 'Администратор',
            tg_username: 'admin',
            sparks: 1000.0,
            level: 'Мастер',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString()
        }
    ],
    roles: [
        {
            id: 1,
            name: 'Художники',
            description: 'Творцы изобразительного искусства',
            icon: '🎨',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Стилисты',
            description: 'Мастера создания образов',
            icon: '👗',
            available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    characters: [
        { 
            id: 1, 
            role_id: 1, 
            name: 'Лука Цветной', 
            description: 'Рисует с детства, любит эксперименты с цветом', 
            bonus_type: 'percent_bonus', 
            bonus_value: '10', 
            is_active: true,
            created_at: new Date().toISOString()
        },
        { 
            id: 2, 
            role_id: 2, 
            name: 'Эстелла Моде', 
            description: 'Бывший стилист, обучает восприятию образа', 
            bonus_type: 'percent_bonus', 
            bonus_value: '5', 
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    quizzes: [
        {
            id: 1,
            title: "🎨 Основы живописи",
            description: "Проверьте свои знания основ живописи",
            questions: [
                {
                    question: "Кто написал картину 'Мона Лиза'?",
                    options: ["Винсент Ван Гог", "Леонардо да Винчи", "Пабло Пикассо", "Клод Моне"],
                    correctAnswer: 1
                },
                {
                    question: "Какие цвета являются основными?",
                    options: ["Красный, синий, зеленый", "Красный, желтый, синий", "Фиолетовый, оранжевый, зеленый", "Черный, белый, серый"],
                    correctAnswer: 1
                }
            ],
            sparks_per_correct: 1,
            sparks_perfect_bonus: 5,
            cooldown_hours: 24,
            allow_retake: true,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    marathons: [
        {
            id: 1,
            title: "🏃‍♂️ Марафон акварели",
            description: "7-дневный марафон по основам акварельной живописи",
            duration_days: 7,
            tasks: [
                { 
                    day: 1, 
                    title: "Основные техники", 
                    description: "Изучите основные техники работы с акварелью",
                    requires_submission: true,
                    submission_type: "text"
                }
            ],
            sparks_per_day: 7,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    shop_items: [
        {
            id: 1,
            title: "🎨 Урок акварели для начинающих",
            description: "Полный видеоурок по основам акварельной живописи",
            type: "video",
            file_url: "",
            preview_url: "",
            price: 15,
            content_text: "В этом уроке вы научитесь основам работы с акварелью",
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    activities: [],
    admins: [
        { 
            id: 1, 
            user_id: 898508164, 
            username: 'admin', 
            role: 'superadmin', 
            created_at: new Date().toISOString() 
        }
    ],
    purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: "post_art_basics",
            title: "🎨 Основы композиции в живописи",
            content: "Сегодня поговорим о фундаментальных принципах построения композиции.",
            image_url: "",
            video_url: null,
            media_type: 'text',
            admin_id: 898508164,
            is_active: true,
            created_at: new Date().toISOString(),
            telegram_message_id: null,
            action_type: null,
            action_target: null
        }
    ],
    post_reviews: [],
    user_works: [],
    work_reviews: [],
    marathon_completions: [],
    quiz_completions: [],
    daily_reviews: [],
    interactives: [
        {
            id: 1,
            title: "🎨 Угадай эпоху картины",
            description: "Определите эпоху по фрагменту картины",
            type: "guess_era",
            category: "history",
            image_url: "",
            question: "Какой эпохе принадлежит этот фрагмент?",
            options: ["Ренессанс", "Барокко", "Импрессионизм", "Кубизм"],
            correct_answer: 0,
            sparks_reward: 3,
            allow_retake: false,
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    interactive_completions: [],
    interactive_submissions: [],
    marathon_submissions: []
};

// ==================== СИСТЕМА ИСКР ====================
const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    MARATHON_DAY_COMPLETION: 7,
    INVITE_FRIEND: 10,
    WRITE_REVIEW: 3,
    DAILY_COMMENT: 1,
    UPLOAD_WORK: 5,
    WORK_APPROVED: 15,
    REGISTRATION_BONUS: 10,
    PARTICIPATE_POLL: 2,
    INTERACTIVE_COMPLETION: 3,
    INTERACTIVE_SUBMISSION: 2,
    COMPLIMENT_CHALLENGE: 0.5,
    MARATHON_SUBMISSION: 5,
    ROLE_CHANGE: 0
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function calculateLevel(sparks) {
    if (sparks >= 400) return 'Наставник';
    if (sparks >= 300) return 'Мастер';
    if (sparks >= 150) return 'Знаток';
    if (sparks >= 50) return 'Искатель';
    return 'Ученик';
}

function addSparks(userId, sparks, activityType, description) {
    const user = db.users.find(u => u.user_id == userId);
    if (user) {
        user.sparks = Math.max(0, user.sparks + sparks);
        user.level = calculateLevel(user.sparks);
        user.last_active = new Date().toISOString();
        
        const activity = {
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: sparks,
            description: description,
            created_at: new Date().toISOString()
        };
        
        db.activities.push(activity);
        return activity;
    }
    return null;
}

function getUserStats(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return null;
    
    const activities = db.activities.filter(a => a.user_id == userId);
    const purchases = db.purchases.filter(p => p.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(q => q.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(m => m.user_id == userId);
    const interactiveCompletions = db.interactive_completions.filter(i => i.user_id == userId);
    
    return {
        totalActivities: activities.length,
        totalPurchases: purchases.length,
        totalWorks: works.length,
        approvedWorks: works.filter(w => w.status === 'approved').length,
        totalQuizzesCompleted: quizCompletions.length,
        totalMarathonsCompleted: marathonCompletions.filter(m => m.completed).length,
        totalInteractivesCompleted: interactiveCompletions.length,
        totalSparksEarned: activities.reduce((sum, a) => sum + a.sparks_earned, 0)
    };
}

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(APP_ROOT, 'public')));

const requireAdmin = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
    }
    
    const admin = db.admins.find(a => a.user_id == userId);
    if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.admin = admin;
    next();
};

// ==================== BASIC ROUTES ====================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '8.0.0',
        database: 'In-Memory',
        users: db.users.length,
        quizzes: db.quizzes.length,
        marathons: db.marathons.length,
        shop_items: db.shop_items.length,
        interactives: db.interactives.length
    });
});

// ==================== WEBAPP API ====================
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    let user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        const stats = getUserStats(userId);
        res.json({ 
            exists: true, 
            user: {
                ...user,
                stats: stats
            }
        });
    } else {
        // Создаем нового пользователя
        const newUser = {
            id: Date.now(),
            user_id: userId,
            tg_first_name: 'Новый пользователь',
            sparks: 0,
            level: 'Ученик',
            is_registered: false,
            class: null,
            character_id: null,
            character_name: null,
            available_buttons: [],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString()
        };
        db.users.push(newUser);
        res.json({ 
            exists: false, 
            user: newUser 
        });
    }
});

app.post('/api/users/register', (req, res) => {
    const { userId, firstName, roleId, characterId } = req.body;
    
    if (!userId || !firstName || !roleId) {
        return res.status(400).json({ error: 'User ID, first name and role are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !role) {
        return res.status(404).json({ error: 'User or role not found' });
    }
    
    const isNewUser = !user.is_registered;
    
    // Обновляем данные пользователя
    user.tg_first_name = firstName;
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.is_registered = true;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    
    let message = 'Регистрация успешна!';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = SPARKS_SYSTEM.REGISTRATION_BONUS;
        addSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = `Регистрация успешна! +${sparksAdded}✨`;
    }
    
    res.json({ 
        success: true, 
        message, 
        sparksAdded,
        user: user
    });
});

app.post('/api/users/change-role', (req, res) => {
    const { userId, roleId, characterId } = req.body;
    
    if (!userId || !roleId) {
        return res.status(400).json({ error: 'User ID and role are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !role) {
        return res.status(404).json({ error: 'User or role not found' });
    }
    
    if (!user.is_registered) {
        return res.status(400).json({ error: 'User not registered' });
    }
    
    const oldRole = user.class;
    
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    
    addSparks(userId, SPARKS_SYSTEM.ROLE_CHANGE, 'role_change', `Смена роли: ${oldRole} → ${role.name}`);
    
    res.json({ 
        success: true, 
        message: 'Роль успешно изменена!',
        user: user
    });
});

// ==================== ROLES & CHARACTERS ====================
app.get('/api/webapp/roles', (req, res) => {
    const roles = db.roles.filter(role => role.is_active);
    res.json(roles);
});

app.get('/api/webapp/characters/:roleId', (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const characters = db.characters.filter(char => char.role_id === roleId && char.is_active);
    res.json(characters);
});

// ==================== QUIZZES ====================
app.get('/api/webapp/quizzes', (req, res) => {
    const userId = parseInt(req.query.userId);
    const quizzes = db.quizzes.filter(q => q.is_active);
    
    const quizzesWithStatus = quizzes.map(quiz => {
        const completion = db.quiz_completions.find(
            qc => qc.user_id === userId && qc.quiz_id === quiz.id
        );
        
        let canRetake = quiz.allow_retake;
        if (completion && quiz.cooldown_hours > 0) {
            const lastCompletion = new Date(completion.completed_at);
            const now = new Date();
            const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
            canRetake = hoursSinceCompletion >= quiz.cooldown_hours;
        }
        
        return {
            ...quiz,
            completed: !!completion,
            user_score: completion ? completion.score : 0,
            total_questions: quiz.questions.length,
            can_retake: canRetake && quiz.allow_retake,
            last_completion: completion ? completion.completed_at : null
        };
    });
    
    res.json(quizzesWithStatus);
});

app.post('/api/webapp/quizzes/:quizId/submit', (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { userId, answers } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    const existingCompletion = db.quiz_completions.find(
        qc => qc.user_id === userId && qc.quiz_id === quizId
    );
    
    if (existingCompletion && !quiz.allow_retake) {
        return res.status(400).json({ error: 'Этот квиз нельзя пройти повторно' });
    }
    
    if (existingCompletion && quiz.cooldown_hours > 0) {
        const lastCompletion = new Date(existingCompletion.completed_at);
        const now = new Date();
        const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion < quiz.cooldown_hours) {
            const hoursLeft = Math.ceil(quiz.cooldown_hours - hoursSinceCompletion);
            return res.status(400).json({ 
                error: `Квиз можно пройти повторно через ${hoursLeft} часов` 
            });
        }
    }
    
    let correctAnswers = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });
    
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    sparksEarned = correctAnswers * quiz.sparks_per_correct;
    
    if (perfectScore) {
        sparksEarned += quiz.sparks_perfect_bonus;
    }
    
    if (existingCompletion) {
        existingCompletion.score = correctAnswers;
        existingCompletion.sparks_earned = sparksEarned;
        existingCompletion.perfect_score = perfectScore;
        existingCompletion.completed_at = new Date().toISOString();
    } else {
        db.quiz_completions.push({
            id: Date.now(),
            user_id: userId,
            quiz_id: quizId,
            completed_at: new Date().toISOString(),
            score: correctAnswers,
            sparks_earned: sparksEarned,
            perfect_score: perfectScore
        });
    }
    
    if (sparksEarned > 0) {
        addSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title}`);
    }
    
    res.json({
        success: true,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        sparksEarned,
        perfectScore,
        scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
        message: perfectScore ? 
            `Идеально! 🎉 +${sparksEarned}✨` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨`
    });
});

// ==================== MARATHONS ====================
app.get('/api/webapp/marathons', (req, res) => {
    const userId = parseInt(req.query.userId);
    const marathons = db.marathons.filter(m => m.is_active);
    
    const marathonsWithStatus = marathons.map(marathon => {
        const completion = db.marathon_completions.find(
            mc => mc.user_id === userId && mc.marathon_id === marathon.id
        );
        
        const currentTask = completion ? marathon.tasks[completion.current_day - 1] : marathon.tasks[0];
        
        return {
            ...marathon,
            completed: completion ? completion.completed : false,
            current_day: completion ? completion.current_day : 1,
            progress: completion ? completion.progress : 0,
            started_at: completion ? completion.started_at : null,
            current_task: currentTask
        };
    });
    
    res.json(marathonsWithStatus);
});

app.post('/api/webapp/marathons/:marathonId/submit-day', (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const { userId, day, submission_text, submission_image } = req.body;
    
    if (!userId || !day) {
        return res.status(400).json({ error: 'User ID and day are required' });
    }
    
    const marathon = db.marathons.find(m => m.id === marathonId);
    if (!marathon) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    const task = marathon.tasks.find(t => t.day === day);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    
    if (task.requires_submission && !submission_text && !submission_image) {
        return res.status(400).json({ error: 'Это задание требует отправки работы' });
    }
    
    let completion = db.marathon_completions.find(
        mc => mc.user_id === userId && mc.marathon_id === marathonId
    );
    
    if (!completion) {
        completion = {
            id: Date.now(),
            user_id: userId,
            marathon_id: marathonId,
            current_day: 1,
            progress: 0,
            completed: false,
            started_at: new Date().toISOString()
        };
        db.marathon_completions.push(completion);
    }
    
    if (completion.current_day !== day) {
        return res.status(400).json({ error: 'Неверный день марафона' });
    }
    
    if (submission_text || submission_image) {
        db.marathon_submissions.push({
            id: Date.now(),
            user_id: userId,
            marathon_id: marathonId,
            day: day,
            submission_text: submission_text,
            submission_image: submission_image,
            submitted_at: new Date().toISOString(),
            status: 'pending'
        });
    }
    
    const sparksEarned = marathon.sparks_per_day;
    addSparks(userId, sparksEarned, 'marathon_day', `Марафон: ${marathon.title} - день ${day}`);
    
    completion.current_day = day + 1;
    completion.progress = Math.round((day / marathon.duration_days) * 100);
    
    if (day >= marathon.duration_days) {
        completion.completed = true;
        completion.progress = 100;
        
        const marathonBonus = marathon.sparks_per_day * 2;
        addSparks(userId, marathonBonus, 'marathon_completion', `Завершение марафона: ${marathon.title}`);
    }
    
    res.json({
        success: true,
        message: `День ${day} завершен! +${sparksEarned}✨`,
        completed: completion.completed,
        nextDay: completion.current_day,
        progress: completion.progress
    });
});

// ==================== INTERACTIVES ====================
app.get('/api/webapp/interactives', (req, res) => {
    const userId = parseInt(req.query.userId);
    const interactives = db.interactives.filter(i => i.is_active);
    
    const interactivesWithStatus = interactives.map(interactive => {
        const completion = db.interactive_completions.find(
            ic => ic.user_id === userId && ic.interactive_id === interactive.id
        );
        
        return {
            ...interactive,
            completed: !!completion,
            can_retake: interactive.allow_retake && !completion
        };
    });
    
    res.json(interactivesWithStatus);
});

app.post('/api/webapp/interactives/:interactiveId/submit', (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { userId, answer } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const interactive = db.interactives.find(i => i.id === interactiveId);
    if (!interactive) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    const existingCompletion = db.interactive_completions.find(
        ic => ic.user_id === userId && ic.interactive_id === interactiveId
    );
    
    if (existingCompletion && !interactive.allow_retake) {
        return res.status(400).json({ error: 'Этот интерактив нельзя пройти повторно' });
    }
    
    const isCorrect = answer === interactive.correct_answer;
    let sparksEarned = 0;
    
    if (isCorrect) {
        sparksEarned = interactive.sparks_reward;
        
        if (!existingCompletion) {
            db.interactive_completions.push({
                id: Date.now(),
                user_id: userId,
                interactive_id: interactiveId,
                completed_at: new Date().toISOString(),
                answer_given: answer,
                is_correct: true,
                sparks_earned: sparksEarned
            });
            
            addSparks(userId, sparksEarned, 'interactive', `Интерактив: ${interactive.title}`);
        }
    }
    
    res.json({
        success: true,
        correct: isCorrect,
        sparksEarned: isCorrect ? sparksEarned : 0,
        message: isCorrect ? 
            `Правильно! +${sparksEarned}✨` : 
            'Неправильно. Попробуйте еще раз!'
    });
});

// ==================== SHOP ====================
app.get('/api/webapp/shop/items', (req, res) => {
    const items = db.shop_items.filter(item => item.is_active);
    res.json(items);
});

app.post('/api/webapp/shop/purchase', (req, res) => {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
        return res.status(400).json({ error: 'User ID and item ID are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const item = db.shop_items.find(i => i.id == itemId);
    
    if (!user || !item) {
        return res.status(404).json({ error: 'User or item not found' });
    }
    
    if (user.sparks < item.price) {
        return res.status(400).json({ error: 'Недостаточно искр' });
    }
    
    const existingPurchase = db.purchases.find(
        p => p.user_id === userId && p.item_id === itemId
    );
    
    if (existingPurchase) {
        return res.status(400).json({ error: 'Товар уже куплен' });
    }
    
    user.sparks -= item.price;
    
    const purchase = {
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        item_title: item.title,
        price_paid: item.price,
        purchased_at: new Date().toISOString()
    };
    
    db.purchases.push(purchase);
    
    res.json({
        success: true,
        message: `Товар "${item.title}" куплен за ${item.price}✨`,
        purchase: purchase,
        remainingSparks: user.sparks
    });
});

app.get('/api/webapp/users/:userId/purchases', (req, res) => {
    const userId = parseInt(req.params.userId);
    const purchases = db.purchases
        .filter(p => p.user_id === userId)
        .map(purchase => {
            const item = db.shop_items.find(i => i.id === purchase.item_id);
            return {
                ...purchase,
                ...item
            };
        });
    
    res.json({ purchases });
});

// ==================== WORKS ====================
app.get('/api/webapp/users/:userId/works', (req, res) => {
    const userId = parseInt(req.params.userId);
    const works = db.user_works.filter(w => w.user_id === userId);
    
    res.json({ works });
});

app.post('/api/webapp/upload-work', (req, res) => {
    const { userId, title, description, imageUrl, type } = req.body;
    
    if (!userId || !title || !imageUrl) {
        return res.status(400).json({ error: 'User ID, title and image are required' });
    }
    
    const work = {
        id: Date.now(),
        user_id: userId,
        title: title,
        description: description || '',
        image_url: imageUrl,
        type: type || 'image',
        status: 'pending',
        created_at: new Date().toISOString(),
        moderated_at: null,
        moderator_id: null,
        admin_comment: null
    };
    
    db.user_works.push(work);
    
    const sparksEarned = SPARKS_SYSTEM.UPLOAD_WORK;
    addSparks(userId, sparksEarned, 'work_upload', `Загрузка работы: ${title}`);
    
    res.json({
        success: true,
        message: `Работа загружена! +${sparksEarned}✨`,
        work: work
    });
});

// ==================== ACTIVITIES ====================
app.get('/api/webapp/users/:userId/activities', (req, res) => {
    const userId = parseInt(req.params.userId);
    const activities = db.activities
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    
    res.json({ activities });
});

// ==================== POSTS ====================
app.get('/api/webapp/channel-posts', (req, res) => {
    const posts = db.channel_posts
        .filter(p => p.is_active)
        .map(post => {
            const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
            const averageRating = reviews.length > 0 ? 
                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
            
            return {
                ...post,
                reviews_count: reviews.length,
                average_rating: averageRating
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ posts });
});

app.post('/api/webapp/posts/:postId/review', (req, res) => {
    const postId = req.params.postId;
    const { userId, reviewText, rating } = req.body;
    
    if (!userId || !reviewText) {
        return res.status(400).json({ error: 'User ID and review text are required' });
    }
    
    const post = db.channel_posts.find(p => p.post_id === postId);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    const existingReview = db.post_reviews.find(
        r => r.user_id === userId && r.post_id === postId
    );
    
    if (existingReview) {
        return res.status(400).json({ error: 'Отзыв уже оставлен' });
    }
    
    const review = {
        id: Date.now(),
        user_id: userId,
        post_id: postId,
        review_text: reviewText,
        rating: rating || 5,
        status: 'pending',
        created_at: new Date().toISOString(),
        moderated_at: null,
        moderator_id: null,
        admin_comment: null
    };
    
    db.post_reviews.push(review);
    
    const sparksEarned = SPARKS_SYSTEM.WRITE_REVIEW;
    addSparks(userId, sparksEarned, 'post_review', `Отзыв к посту: ${post.title}`);
    
    res.json({
        success: true,
        message: `Отзыв отправлен! +${sparksEarned}✨`,
        review: review
    });
});

// ==================== ADMIN API ====================
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {
        totalUsers: db.users.length,
        registeredUsers: db.users.filter(u => u.is_registered).length,
        activeQuizzes: db.quizzes.filter(q => q.is_active).length,
        activeMarathons: db.marathons.filter(m => m.is_active).length,
        shopItems: db.shop_items.filter(i => i.is_active).length,
        totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
        totalAdmins: db.admins.length,
        pendingReviews: db.post_reviews.filter(r => r.status === 'pending').length,
        pendingWorks: db.user_works.filter(w => w.status === 'pending').length,
        totalPosts: db.channel_posts.length,
        totalPurchases: db.purchases.length,
        totalActivities: db.activities.length
    };
    
    res.json(stats);
});

app.get('/api/admin/full-stats', requireAdmin, (req, res) => {
    const stats = {
        users: {
            total: db.users.length,
            registered: db.users.filter(u => u.is_registered).length,
            by_role: db.roles.map(role => ({
                role: role.name,
                count: db.users.filter(u => u.class === role.name).length
            })),
            active_today: db.users.filter(u => {
                const today = new Date();
                const lastActive = new Date(u.last_active);
                return lastActive.toDateString() === today.toDateString();
            }).length
        },
        content: {
            quizzes: db.quizzes.length,
            marathons: db.marathons.length,
            shop_items: db.shop_items.length,
            posts: db.channel_posts.length,
            interactives: db.interactives.length
        },
        activities: {
            total_sparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
            total_purchases: db.purchases.length,
            total_works: db.user_works.length,
            pending_moderation: {
                works: db.user_works.filter(w => w.status === 'pending').length,
                reviews: db.post_reviews.filter(r => r.status === 'pending').length
            }
        },
        completions: {
            quizzes: db.quiz_completions.length,
            marathons: db.marathon_completions.filter(m => m.completed).length,
            interactives: db.interactive_completions.length
        }
    };
    
    res.json(stats);
});

app.get('/api/admin/users-report', requireAdmin, (req, res) => {
    const users = db.users
        .filter(u => u.is_registered)
        .map(user => {
            const stats = getUserStats(user.user_id);
            const works = db.user_works.filter(w => w.user_id === user.user_id);
            const quizCompletions = db.quiz_completions.filter(q => q.user_id === user.user_id);
            const marathonCompletions = db.marathon_completions.filter(m => m.user_id === user.user_id);
            const interactiveCompletions = db.interactive_completions.filter(i => i.user_id === user.user_id);
            
            const totalActivities = 
                quizCompletions.length + 
                marathonCompletions.filter(m => m.completed).length + 
                interactiveCompletions.length + 
                works.length;
            
            return {
                id: user.user_id,
                name: user.tg_first_name,
                username: user.tg_username,
                role: user.class,
                character: user.character_name,
                sparks: user.sparks,
                level: user.level,
                total_quizzes: quizCompletions.length,
                total_marathons: marathonCompletions.filter(m => m.completed).length,
                total_interactives: interactiveCompletions.length,
                total_works: works.length,
                approved_works: works.filter(w => w.status === 'approved').length,
                total_activities: totalActivities,
                registration_date: user.registration_date,
                last_active: user.last_active
            };
        })
        .sort((a, b) => b.total_activities - a.total_activities);
    
    res.json({ users });
});

// ==================== ADMIN MANAGEMENT ====================
app.get('/api/admin/admins', requireAdmin, (req, res) => {
    res.json(db.admins);
});

app.post('/api/admin/admins', requireAdmin, (req, res) => {
    const { user_id, username, role } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const existingAdmin = db.admins.find(a => a.user_id == user_id);
    if (existingAdmin) {
        return res.status(400).json({ error: 'Admin already exists' });
    }
    
    const userExists = db.users.find(u => u.user_id == user_id);
    if (!userExists) {
        return res.status(404).json({ error: 'User not found in system' });
    }
    
    const newAdmin = {
        id: Date.now(),
        user_id: parseInt(user_id),
        username: username || userExists.tg_username || '',
        role: role || 'moderator',
        created_at: new Date().toISOString()
    };
    
    db.admins.push(newAdmin);
    
    res.json({ 
        success: true, 
        message: 'Админ успешно добавлен',
        admin: newAdmin
    });
});

app.delete('/api/admin/admins/:userId', requireAdmin, (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (userId === req.admin.user_id) {
        return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    
    const adminIndex = db.admins.findIndex(a => a.user_id === userId);
    if (adminIndex === -1) {
        return res.status(404).json({ error: 'Admin not found' });
    }
    
    const removedAdmin = db.admins.splice(adminIndex, 1)[0];
    
    res.json({ 
        success: true, 
        message: 'Админ удален',
        removedAdmin: removedAdmin
    });
});

// ==================== ROLES MANAGEMENT ====================
app.get('/api/admin/roles', requireAdmin, (req, res) => {
    res.json(db.roles);
});

app.post('/api/admin/roles', requireAdmin, (req, res) => {
    const { name, description, icon, available_buttons, is_active } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Role name is required' });
    }
    
    const newRole = {
        id: Date.now(),
        name,
        description: description || '',
        icon: icon || '🎨',
        available_buttons: available_buttons || [],
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.roles.push(newRole);
    
    res.json({ 
        success: true, 
        message: 'Роль успешно создана',
        role: newRole
    });
});

app.put('/api/admin/roles/:roleId', requireAdmin, (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const { name, description, icon, available_buttons, is_active } = req.body;
    
    const role = db.roles.find(r => r.id === roleId);
    if (!role) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    if (name) role.name = name;
    if (description) role.description = description;
    if (icon) role.icon = icon;
    if (available_buttons) role.available_buttons = available_buttons;
    if (is_active !== undefined) role.is_active = is_active;
    
    res.json({ 
        success: true, 
        message: 'Роль успешно обновлена',
        role: role
    });
});

app.delete('/api/admin/roles/:roleId', requireAdmin, (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const roleIndex = db.roles.findIndex(r => r.id === roleId);
    
    if (roleIndex === -1) {
        return res.status(404).json({ error: 'Role not found' });
    }
    
    const usersWithRole = db.users.filter(u => u.class === db.roles[roleIndex].name);
    if (usersWithRole.length > 0) {
        return res.status(400).json({ error: 'Cannot delete role with assigned users' });
    }
    
    db.roles.splice(roleIndex, 1);
    res.json({ success: true, message: 'Роль удалена' });
});

// ==================== CHARACTERS MANAGEMENT ====================
app.get('/api/admin/characters', requireAdmin, (req, res) => {
    const characters = db.characters.map(character => {
        const role = db.roles.find(r => r.id === character.role_id);
        return {
            ...character,
            role_name: role ? role.name : 'Unknown'
        };
    });
    
    res.json(characters);
});

app.post('/api/admin/characters', requireAdmin, (req, res) => {
    const { role_id, name, description, bonus_type, bonus_value, is_active } = req.body;
    
    if (!role_id || !name) {
        return res.status(400).json({ error: 'Role ID and name are required' });
    }
    
    const newCharacter = {
        id: Date.now(),
        role_id: parseInt(role_id),
        name,
        description: description || '',
        bonus_type: bonus_type || 'percent_bonus',
        bonus_value: bonus_value || '10',
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.characters.push(newCharacter);
    
    res.json({ 
        success: true, 
        message: 'Персонаж успешно создан',
        character: newCharacter
    });
});

app.put('/api/admin/characters/:characterId', requireAdmin, (req, res) => {
    const characterId = parseInt(req.params.characterId);
    const { role_id, name, description, bonus_type, bonus_value, is_active } = req.body;
    
    const character = db.characters.find(c => c.id === characterId);
    if (!character) {
        return res.status(404).json({ error: 'Character not found' });
    }
    
    if (role_id) character.role_id = parseInt(role_id);
    if (name) character.name = name;
    if (description) character.description = description;
    if (bonus_type) character.bonus_type = bonus_type;
    if (bonus_value) character.bonus_value = bonus_value;
    if (is_active !== undefined) character.is_active = is_active;
    
    res.json({ 
        success: true, 
        message: 'Персонаж успешно обновлен',
        character: character
    });
});

app.delete('/api/admin/characters/:characterId', requireAdmin, (req, res) => {
    const characterId = parseInt(req.params.characterId);
    const characterIndex = db.characters.findIndex(c => c.id === characterId);
    
    if (characterIndex === -1) {
        return res.status(404).json({ error: 'Character not found' });
    }
    
    const usersWithCharacter = db.users.filter(u => u.character_id === characterId);
    if (usersWithCharacter.length > 0) {
        return res.status(400).json({ error: 'Cannot delete character assigned to users' });
    }
    
    db.characters.splice(characterIndex, 1);
    res.json({ success: true, message: 'Персонаж удален' });
});

// ==================== QUIZZES MANAGEMENT ====================
app.get('/api/admin/quizzes', requireAdmin, (req, res) => {
    const quizzes = db.quizzes.map(quiz => {
        const completions = db.quiz_completions.filter(qc => qc.quiz_id === quiz.id);
        const averageScore = completions.length > 0 ? 
            completions.reduce((sum, c) => sum + c.score, 0) / completions.length : 0;
        
        return {
            ...quiz,
            completions_count: completions.length,
            average_score: averageScore
        };
    });
    
    res.json(quizzes);
});

app.post('/api/admin/quizzes', requireAdmin, (req, res) => {
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake, is_active } = req.body;
    
    if (!title || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Title and questions array are required' });
    }
    
    const newQuiz = {
        id: Date.now(),
        title,
        description: description || '',
        questions: questions,
        sparks_per_correct: sparks_per_correct || 1,
        sparks_perfect_bonus: sparks_perfect_bonus || 5,
        cooldown_hours: cooldown_hours || 24,
        allow_retake: allow_retake !== undefined ? allow_retake : true,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.quizzes.push(newQuiz);
    
    res.json({ 
        success: true, 
        message: 'Квиз успешно создан',
        quiz: newQuiz
    });
});

app.put('/api/admin/quizzes/:quizId', requireAdmin, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake, is_active } = req.body;
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    if (title) quiz.title = title;
    if (description) quiz.description = description;
    if (questions && Array.isArray(questions)) quiz.questions = questions;
    if (sparks_per_correct) quiz.sparks_per_correct = sparks_per_correct;
    if (sparks_perfect_bonus) quiz.sparks_perfect_bonus = sparks_perfect_bonus;
    if (cooldown_hours) quiz.cooldown_hours = cooldown_hours;
    if (allow_retake !== undefined) quiz.allow_retake = allow_retake;
    if (is_active !== undefined) quiz.is_active = is_active;
    
    res.json({ 
        success: true, 
        message: 'Квиз успешно обновлен',
        quiz: quiz
    });
});

app.delete('/api/admin/quizzes/:quizId', requireAdmin, (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const quizIndex = db.quizzes.findIndex(q => q.id === quizId);
    
    if (quizIndex === -1) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    db.quizzes.splice(quizIndex, 1);
    res.json({ success: true, message: 'Квиз удален' });
});

// ==================== MARATHONS MANAGEMENT ====================
app.get('/api/admin/marathons', requireAdmin, (req, res) => {
    const marathons = db.marathons.map(marathon => {
        const completions = db.marathon_completions.filter(mc => mc.marathon_id === marathon.id);
        const activeUsers = db.marathon_completions.filter(mc => mc.marathon_id === marathon.id && !mc.completed).length;
        
        return {
            ...marathon,
            completions_count: completions.filter(mc => mc.completed).length,
            active_users: activeUsers
        };
    });
    
    res.json(marathons);
});

app.post('/api/admin/marathons', requireAdmin, (req, res) => {
    const { title, description, duration_days, tasks, sparks_per_day, is_active } = req.body;
    
    if (!title || !duration_days || !tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Title, duration and tasks array are required' });
    }
    
    const newMarathon = {
        id: Date.now(),
        title,
        description: description || '',
        duration_days: parseInt(duration_days),
        tasks: tasks,
        sparks_per_day: sparks_per_day || 7,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.marathons.push(newMarathon);
    
    res.json({ 
        success: true, 
        message: 'Марафон успешно создан',
        marathon: newMarathon
    });
});

app.put('/api/admin/marathons/:marathonId', requireAdmin, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const { title, description, duration_days, tasks, sparks_per_day, is_active } = req.body;
    
    const marathon = db.marathons.find(m => m.id === marathonId);
    if (!marathon) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    if (title) marathon.title = title;
    if (description) marathon.description = description;
    if (duration_days) marathon.duration_days = parseInt(duration_days);
    if (tasks && Array.isArray(tasks)) marathon.tasks = tasks;
    if (sparks_per_day) marathon.sparks_per_day = sparks_per_day;
    if (is_active !== undefined) marathon.is_active = is_active;
    
    res.json({ 
        success: true, 
        message: 'Марафон успешно обновлен',
        marathon: marathon
    });
});

app.delete('/api/admin/marathons/:marathonId', requireAdmin, (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const marathonIndex = db.marathons.findIndex(m => m.id === marathonId);
    
    if (marathonIndex === -1) {
        return res.status(404).json({ error: 'Marathon not found' });
    }
    
    db.marathons.splice(marathonIndex, 1);
    res.json({ success: true, message: 'Марафон удален' });
});

// ==================== INTERACTIVES MANAGEMENT ====================
app.get('/api/admin/interactives', requireAdmin, (req, res) => {
    const interactives = db.interactives.map(interactive => {
        const completions = db.interactive_completions.filter(ic => ic.interactive_id === interactive.id);
        const averageScore = completions.length > 0 ? 
            completions.filter(ic => ic.is_correct).length / completions.length * 100 : 0;
        
        return {
            ...interactive,
            completions_count: completions.length,
            average_score: averageScore
        };
    });
    
    res.json(interactives);
});

app.post('/api/admin/interactives', requireAdmin, (req, res) => {
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake, is_active } = req.body;
    
    if (!title || !type || !category || !question) {
        return res.status(400).json({ error: 'Title, type, category and question are required' });
    }
    
    const newInteractive = {
        id: Date.now(),
        title,
        description: description || '',
        type,
        category,
        image_url: image_url || '',
        question,
        options: options || [],
        correct_answer: correct_answer || 0,
        sparks_reward: sparks_reward || 3,
        allow_retake: allow_retake !== undefined ? allow_retake : false,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.interactives.push(newInteractive);
    
    res.json({ 
        success: true, 
        message: 'Интерактив успешно создан',
        interactive: newInteractive
    });
});

app.put('/api/admin/interactives/:interactiveId', requireAdmin, (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake, is_active } = req.body;
    
    const interactive = db.interactives.find(i => i.id === interactiveId);
    if (!interactive) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    if (title) interactive.title = title;
    if (description) interactive.description = description;
    if (type) interactive.type = type;
    if (category) interactive.category = category;
    if (image_url) interactive.image_url = image_url;
    if (question) interactive.question = question;
    if (options) interactive.options = options;
    if (correct_answer !== undefined) interactive.correct_answer = correct_answer;
    if (sparks_reward) interactive.sparks_reward = sparks_reward;
    if (allow_retake !== undefined) interactive.allow_retake = allow_retake;
    if (is_active !== undefined) interactive.is_active = is_active;
    
    res.json({ 
        success: true, 
        message: 'Интерактив успешно обновлен',
        interactive: interactive
    });
});

app.delete('/api/admin/interactives/:interactiveId', requireAdmin, (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const interactiveIndex = db.interactives.findIndex(i => i.id === interactiveId);
    
    if (interactiveIndex === -1) {
        return res.status(404).json({ error: 'Interactive not found' });
    }
    
    db.interactives.splice(interactiveIndex, 1);
    res.json({ success: true, message: 'Интерактив удален' });
});

// ==================== SHOP MANAGEMENT ====================
app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
    res.json(db.shop_items);
});

app.post('/api/admin/shop/items', requireAdmin, (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text, is_active } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }
    
    const newItem = {
        id: Date.now(),
        title,
        description: description || '',
        type: type || 'text',
        file_url: file_url || '',
        preview_url: preview_url || '',
        price: parseFloat(price),
        content_text: content_text || '',
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.shop_items.push(newItem);
    
    res.json({ 
        success: true, 
        message: 'Товар успешно создан',
        item: newItem
    });
});

app.put('/api/admin/shop/items/:itemId', requireAdmin, (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const { title, description, type, file_url, preview_url, price, content_text, is_active } = req.body;
    
    const item = db.shop_items.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    if (title) item.title = title;
    if (description) item.description = description;
    if (type) item.type = type;
    if (file_url) item.file_url = file_url;
    if (preview_url) item.preview_url = preview_url;
    if (price) item.price = parseFloat(price);
    if (content_text) item.content_text = content_text;
    if (is_active !== undefined) item.is_active = is_active;
    
    res.json({ 
        success: true, 
        message: 'Товар успешно обновлен',
        item: item
    });
});

app.delete('/api/admin/shop/items/:itemId', requireAdmin, (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const itemIndex = db.shop_items.findIndex(i => i.id === itemId);
    
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    db.shop_items.splice(itemIndex, 1);
    res.json({ success: true, message: 'Товар удален' });
});

// ==================== POSTS MANAGEMENT ====================
app.get('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const posts = db.channel_posts.map(post => {
        const admin = db.admins.find(a => a.user_id === post.admin_id);
        const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
        return {
            ...post,
            admin_username: admin?.username,
            reviews_count: reviews.length
        };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json({ posts });
});

app.post('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const { post_id, title, content, image_url, video_url, media_type, action_type, action_target } = req.body;
    
    if (!post_id || !title) {
        return res.status(400).json({ error: 'Post ID and title are required' });
    }
    
    const existingPost = db.channel_posts.find(p => p.post_id === post_id);
    if (existingPost) {
        return res.status(400).json({ error: 'Post with this ID already exists' });
    }
    
    const newPost = {
        id: Date.now(),
        post_id,
        title,
        content: content || '',
        image_url: image_url || '',
        video_url: video_url || '',
        media_type: media_type || 'text',
        admin_id: req.admin.user_id,
        created_at: new Date().toISOString(),
        is_active: true,
        telegram_message_id: null,
        action_type: action_type || null,
        action_target: action_target || null
    };
    
    db.channel_posts.push(newPost);
    
    res.json({ 
        success: true, 
        message: 'Пост успешно создан', 
        postId: newPost.id,
        post: newPost
    });
});

app.put('/api/admin/channel-posts/:postId', requireAdmin, (req, res) => {
    const postId = parseInt(req.params.postId);
    const { title, content, image_url, video_url, media_type, is_active, action_type, action_target } = req.body;
    
    const post = db.channel_posts.find(p => p.id === postId);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    if (title) post.title = title;
    if (content) post.content = content;
    if (image_url) post.image_url = image_url;
    if (video_url) post.video_url = video_url;
    if (media_type) post.media_type = media_type;
    if (is_active !== undefined) post.is_active = is_active;
    if (action_type !== undefined) post.action_type = action_type;
    if (action_target !== undefined) post.action_target = action_target;
    
    res.json({ 
        success: true, 
        message: 'Пост успешно обновлен',
        post: post
    });
});

app.delete('/api/admin/channel-posts/:postId', requireAdmin, (req, res) => {
    const postId = parseInt(req.params.postId);
    const postIndex = db.channel_posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    db.channel_posts.splice(postIndex, 1);
    res.json({ success: true, message: 'Пост удален' });
});

// ==================== MODERATION ====================
app.get('/api/admin/user-works', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    const works = db.user_works
        .filter(w => w.status === status)
        .map(work => {
            const user = db.users.find(u => u.user_id === work.user_id);
            const moderator = db.admins.find(a => a.user_id === work.moderator_id);
            return {
                ...work,
                user_name: user?.tg_first_name,
                user_username: user?.tg_username,
                moderator_username: moderator?.username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ works });
});

app.post('/api/admin/user-works/:workId/moderate', requireAdmin, (req, res) => {
    const workId = parseInt(req.params.workId);
    const { status, admin_comment } = req.body;
    const adminId = req.admin.user_id;
    
    const work = db.user_works.find(w => w.id === workId);
    if (!work) {
        return res.status(404).json({ error: 'Work not found' });
    }
    
    work.status = status;
    work.moderated_at = new Date().toISOString();
    work.moderator_id = adminId;
    work.admin_comment = admin_comment || null;
    
    if (status === 'approved') {
        addSparks(work.user_id, SPARKS_SYSTEM.WORK_APPROVED, 'work_approved', `Работа одобрена: ${work.title}`);
    }
    
    res.json({ 
        success: true, 
        message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
        work: work
    });
});

app.get('/api/admin/reviews', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    const reviews = db.post_reviews
        .filter(r => r.status === status)
        .map(review => {
            const user = db.users.find(u => u.user_id === review.user_id);
            const post = db.channel_posts.find(p => p.post_id === review.post_id);
            const moderator = db.admins.find(a => a.user_id === review.moderator_id);
            return {
                ...review,
                tg_first_name: user?.tg_first_name,
                tg_username: user?.tg_username,
                post_title: post?.title,
                moderator_username: moderator?.username
            };
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    res.json({ reviews });
});

app.post('/api/admin/reviews/:reviewId/moderate', requireAdmin, (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    const { status, admin_comment } = req.body;
    const adminId = req.admin.user_id;
    
    const review = db.post_reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    review.status = status;
    review.moderated_at = new Date().toISOString();
    review.moderator_id = adminId;
    review.admin_comment = admin_comment || null;
    
    res.json({ 
        success: true, 
        message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`,
        review: review
    });
});

// ==================== TELEGRAM BOT ====================
let bot;
if (process.env.BOT_TOKEN) {
    try {
        bot = new TelegramBot(process.env.BOT_TOKEN, { 
            polling: {
                timeout: 10,
                interval: 300,
                autoStart: false
            }
        });
        
        setTimeout(() => {
            bot.startPolling().catch(error => {
                if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
                    console.log('⚠️  Другой инстанс бота уже запущен, продолжаем без polling');
                } else {
                    console.error('❌ Ошибка запуска бота:', error.message);
                }
            });
        }, 1000);
        
        console.log('✅ Telegram Bot инициализирован');
        
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.first_name || 'Друг';
            const userId = msg.from.id;
            
            let user = db.users.find(u => u.user_id === userId);
            if (!user) {
                user = {
                    id: Date.now(),
                    user_id: userId,
                    tg_first_name: msg.from.first_name,
                    tg_username: msg.from.username,
                    sparks: 0,
                    level: 'Ученик',
                    is_registered: false,
                    class: null,
                    character_id: null,
                    character_name: null,
                    available_buttons: [],
                    registration_date: new Date().toISOString(),
                    last_active: new Date().toISOString()
                };
                db.users.push(user);
            } else {
                user.last_active = new Date().toISOString();
            }
            
            const welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерская Вдохновения**!

✨ Откройте личный кабинет чтобы:
• 🎯 Проходить квизы и получать искры
• 🏃‍♂️ Участвовать в марафонах  
• 🖼️ Загружать свои работы
• 🎮 Выполнять интерактивные задания
• 🔄 Менять роль и персонажа
• 📊 Отслеживать прогресс
• 🛒 Покупать обучающие материалы

Нажмите кнопку ниже чтобы начать!`;
            
            const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "📱 Открыть Личный Кабинет",
                        web_app: { url: baseUrl }
                    }
                ]]
            };

            bot.sendMessage(chatId, welcomeText, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        bot.onText(/\/admin/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId);
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
                return;
            }
            
            const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
            const adminUrl = `${baseUrl}/admin.html?userId=${userId}`;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "🔧 Открыть Админ Панель",
                        url: adminUrl
                    }
                ]]
            };
            
            bot.sendMessage(chatId, `🔧 Панель администратора\n\nНажмите кнопку ниже чтобы открыть админ панель:`, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        bot.onText(/\/stats/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId);
            if (!admin) {
                bot.sendMessage(chatId, '❌ У вас нет прав доступа.');
                return;
            }
            
            const stats = {
                totalUsers: db.users.length,
                registeredUsers: db.users.filter(u => u.is_registered).length,
                activeQuizzes: db.quizzes.filter(q => q.is_active).length,
                activeMarathons: db.marathons.filter(m => m.is_active).length,
                shopItems: db.shop_items.filter(i => i.is_active).length,
                totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0)
            };
            
            const statsText = `📊 Статистика бота:
            
👥 Пользователи: ${stats.totalUsers}
✅ Зарегистрировано: ${stats.registeredUsers}
🎯 Активных квизов: ${stats.activeQuizzes}
🏃‍♂️ Активных марафонов: ${stats.activeMarathons}
🛒 Товаров в магазине: ${stats.shopItems}
✨ Всего искр: ${stats.totalSparks.toFixed(1)}`;
            
            bot.sendMessage(chatId, statsText);
        });

    } catch (error) {
        console.error('❌ Ошибка инициализации бота:', error);
    }
}

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin.html`);
    console.log(`🎯 Квизов: ${db.quizzes.length}`);
    console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
    console.log(`🎮 Интерактивов: ${db.interactives.length}`);
    console.log(`🛒 Товаров: ${db.shop_items.length}`);
    console.log(`👥 Пользователей: ${db.users.length}`);
    console.log('✅ Все системы работают!');
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
    res.json({
        users: db.users.length,
        admins: db.admins,
        roles: db.roles.length,
        characters: db.characters.length,
        quizzes: db.quizzes.length,
        marathons: db.marathons.length,
        shop_items: db.shop_items.length,
        interactives: db.interactives.length
    });
});
