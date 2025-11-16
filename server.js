import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const APP_ROOT = process.cwd();

// Создаем папки для загрузок если их нет
const UPLOAD_DIR = join(APP_ROOT, 'uploads');
const IMAGES_DIR = join(UPLOAD_DIR, 'images');
const VIDEOS_DIR = join(UPLOAD_DIR, 'videos');
const AUDIO_DIR = join(UPLOAD_DIR, 'audio');
const FILES_DIR = join(UPLOAD_DIR, 'files');

(async () => {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        await fs.mkdir(VIDEOS_DIR, { recursive: true });
        await fs.mkdir(AUDIO_DIR, { recursive: true });
        await fs.mkdir(FILES_DIR, { recursive: true });
        console.log('✅ Папки для загрузок созданы');
    } catch (error) {
        console.log('⚠️ Папки для загрузок уже существуют');
    }
})();

// Функция для сохранения base64 файлов
async function saveBase64File(base64Data, filename, type) {
    try {
        // Определяем папку для сохранения
        let uploadDir = FILES_DIR;
        if (type.startsWith('image/')) uploadDir = IMAGES_DIR;
        else if (type.startsWith('video/')) uploadDir = VIDEOS_DIR;
        else if (type.startsWith('audio/')) uploadDir = AUDIO_DIR;

        // Извлекаем данные из base64
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 string');
        }

        const fileBuffer = Buffer.from(matches[2], 'base64');
        const filePath = join(uploadDir, filename);
        
        await fs.writeFile(filePath, fileBuffer);
        
        // Возвращаем относительный путь для веб-доступа
        return `/uploads/${type.startsWith('image/') ? 'images' : type.startsWith('video/') ? 'videos' : type.startsWith('audio/') ? 'audio' : 'files'}/${filename}`;
    } catch (error) {
        console.error('Ошибка сохранения файла:', error);
        throw error;
    }
}

// Функция для генерации уникального имени файла
function generateFileName(originalName, type) {
    const extension = originalName.split('.').pop() || 
                     (type.startsWith('image/') ? 'png' : 
                      type.startsWith('video/') ? 'mp4' : 
                      type.startsWith('audio/') ? 'mp3' : 'bin');
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${extension}`;
}

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
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(join(APP_ROOT, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

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

// ==================== FILE UPLOAD ENDPOINTS ====================
app.post('/api/upload/file', async (req, res) => {
    try {
        const { fileData, fileName, fileType } = req.body;
        
        if (!fileData || !fileName) {
            return res.status(400).json({ error: 'File data and file name are required' });
        }
        
        const savedPath = await saveBase64File(fileData, fileName, fileType);
        
        res.json({
            success: true,
            filePath: savedPath,
            fileName: fileName
        });
        
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

app.post('/api/upload/image', async (req, res) => {
    try {
        const { imageData, fileName = `image-${Date.now()}.png` } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required' });
        }
        
        const savedPath = await saveBase64File(imageData, fileName, 'image/png');
        
        res.json({
            success: true,
            imageUrl: savedPath,
            fileName: fileName
        });
        
    } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
        res.status(500).json({ error: 'Image upload failed' });
    }
});

app.post('/api/upload/video', async (req, res) => {
    try {
        const { videoData, fileName = `video-${Date.now()}.mp4` } = req.body;
        
        if (!videoData) {
            return res.status(400).json({ error: 'Video data is required' });
        }
        
        const savedPath = await saveBase64File(videoData, fileName, 'video/mp4');
        
        res.json({
            success: true,
            videoUrl: savedPath,
            fileName: fileName
        });
        
    } catch (error) {
        console.error('Ошибка загрузки видео:', error);
        res.status(500).json({ error: 'Video upload failed' });
    }
});

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

app.post('/api/webapp/marathons/:marathonId/submit-day', async (req, res) => {
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
    
    let submission_image_url = null;
    if (submission_image) {
        try {
            const fileName = `marathon-${marathonId}-day-${day}-${userId}-${Date.now()}.png`;
            submission_image_url = await saveBase64File(submission_image, fileName, 'image/png');
        } catch (error) {
            console.error('Ошибка сохранения изображения марафона:', error);
        }
    }
    
    if (submission_text || submission_image_url) {
        db.marathon_submissions.push({
            id: Date.now(),
            user_id: userId,
            marathon_id: marathonId,
            day: day,
            submission_text: submission_text,
            submission_image: submission_image_url,
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

app.post('/api/webapp/upload-work', async (req, res) => {
    const { userId, title, description, imageUrl, type } = req.body;
    
    if (!userId || !title || !imageUrl) {
        return res.status(400).json({ error: 'User ID, title and image are required' });
    }
    
    let image_url = imageUrl;
    
    // Если это base64, сохраняем файл
    if (imageUrl.startsWith('data:image')) {
        try {
            const fileName = `work-${userId}-${Date.now()}.png`;
            image_url = await saveBase64File(imageUrl, fileName, 'image/png');
        } catch (error) {
            console.error('Ошибка сохранения изображения работы:', error);
            return res.status(500).json({ error: 'Ошибка загрузки изображения' });
        }
    }
    
    const work = {
        id: Date.now(),
        user_id: userId,
        title: title,
        description: description || '',
        image_url: image_url,
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

// ==================== COMPLIMENT CHALLENGE ====================
app.post('/api/webapp/compliment-challenge', (req, res) => {
    const { userId, compliment } = req.body;
    
    if (!userId || !compliment) {
        return res.status(400).json({ error: 'User ID and compliment are required' });
    }
    
    // Проверяем, не участвовал ли пользователь сегодня
    const today = new Date().toDateString();
    const todayCompliment = db.activities.find(a => 
        a.user_id === userId && 
        a.activity_type === 'compliment' &&
        new Date(a.created_at).toDateString() === today
    );
    
    if (todayCompliment) {
        return res.status(400).json({ error: 'Вы уже участвовали в челлендже сегодня' });
    }
    
    const sparksEarned = SPARKS_SYSTEM.COMPLIMENT_CHALLENGE;
    addSparks(userId, sparksEarned, 'compliment', 'Челлендж комплиментов');
    
    res.json({
        success: true,
        message: `Спасибо за комплимент! +${sparksEarned}✨`,
        sparksEarned: sparksEarned
    });
});

// ==================== ADMIN API ENDPOINTS ====================

// Получить всех пользователей
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = db.users.map(user => {
        const stats = getUserStats(user.user_id);
        return {
            ...user,
            stats: stats
        };
    });
    
    res.json({ users });
});

// Получить все роли
app.get('/api/admin/roles', requireAdmin, (req, res) => {
    res.json({ roles: db.roles });
});

// Создать/обновить роль
app.post('/api/admin/roles', requireAdmin, (req, res) => {
    const { name, description, icon, is_active } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Role name is required' });
    }
    
    const newRole = {
        id: Date.now(),
        name,
        description: description || '',
        icon: icon || '🎭',
        available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.roles.push(newRole);
    
    res.json({ success: true, role: newRole });
});

// Получить всех персонажей
app.get('/api/admin/characters', requireAdmin, (req, res) => {
    const characters = db.characters.map(character => {
        const role = db.roles.find(r => r.id === character.role_id);
        return {
            ...character,
            role_name: role ? role.name : 'Unknown'
        };
    });
    
    res.json({ characters });
});

// Создать/обновить персонажа
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
        bonus_value: bonus_value || '0',
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.characters.push(newCharacter);
    
    res.json({ success: true, character: newCharacter });
});

// Получить все квизы
app.get('/api/admin/quizzes', requireAdmin, (req, res) => {
    res.json({ quizzes: db.quizzes });
});

// Создать/обновить квиз
app.post('/api/admin/quizzes', requireAdmin, (req, res) => {
    const { title, description, questions, sparks_per_correct, sparks_perfect_bonus, cooldown_hours, allow_retake, is_active } = req.body;
    
    if (!title || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Title and questions array are required' });
    }
    
    const newQuiz = {
        id: Date.now(),
        title,
        description: description || '',
        questions: questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: parseInt(q.correctAnswer)
        })),
        sparks_per_correct: parseFloat(sparks_per_correct) || 1,
        sparks_perfect_bonus: parseFloat(sparks_perfect_bonus) || 5,
        cooldown_hours: parseInt(cooldown_hours) || 24,
        allow_retake: allow_retake !== undefined ? allow_retake : true,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.quizzes.push(newQuiz);
    
    res.json({ success: true, quiz: newQuiz });
});

// Получить все марафоны
app.get('/api/admin/marathons', requireAdmin, (req, res) => {
    res.json({ marathons: db.marathons });
});

// Создать/обновить марафон
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
        tasks: tasks.map(t => ({
            day: parseInt(t.day),
            title: t.title,
            description: t.description,
            requires_submission: t.requires_submission !== undefined ? t.requires_submission : false,
            submission_type: t.submission_type || 'text'
        })),
        sparks_per_day: parseFloat(sparks_per_day) || 7,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.marathons.push(newMarathon);
    
    res.json({ success: true, marathon: newMarathon });
});

// Получить все интерактивы
app.get('/api/admin/interactives', requireAdmin, (req, res) => {
    res.json({ interactives: db.interactives });
});

// Создать/обновить интерактив
app.post('/api/admin/interactives', requireAdmin, (req, res) => {
    const { title, description, type, category, image_url, question, options, correct_answer, sparks_reward, allow_retake, is_active } = req.body;
    
    if (!title || !question || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Title, question and options array are required' });
    }
    
    const newInteractive = {
        id: Date.now(),
        title,
        description: description || '',
        type: type || 'guess_era',
        category: category || 'art',
        image_url: image_url || '',
        question,
        options,
        correct_answer: parseInt(correct_answer) || 0,
        sparks_reward: parseFloat(sparks_reward) || 3,
        allow_retake: allow_retake !== undefined ? allow_retake : false,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.interactives.push(newInteractive);
    
    res.json({ success: true, interactive: newInteractive });
});

// Получить все товары магазина
app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
    res.json({ items: db.shop_items });
});

// Создать/обновить товар
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
        price: parseFloat(price) || 10,
        content_text: content_text || '',
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString()
    };
    
    db.shop_items.push(newItem);
    
    res.json({ success: true, item: newItem });
});

// Получить все посты
app.get('/api/admin/channel-posts', requireAdmin, (req, res) => {
    res.json({ posts: db.channel_posts });
});

// Создать/обновить пост
app.post('/api/admin/channel-posts', requireAdmin, (req, res) => {
    const { post_id, title, content, image_url, video_url, media_type, is_active } = req.body;
    
    if (!post_id || !title || !content) {
        return res.status(400).json({ error: 'Post ID, title and content are required' });
    }
    
    const newPost = {
        id: Date.now(),
        post_id,
        title,
        content,
        image_url: image_url || '',
        video_url: video_url || null,
        media_type: media_type || 'text',
        admin_id: req.admin.user_id,
        is_active: is_active !== undefined ? is_active : true,
        created_at: new Date().toISOString(),
        telegram_message_id: null,
        action_type: null,
        action_target: null
    };
    
    db.channel_posts.push(newPost);
    
    res.json({ success: true, post: newPost });
});

// Получить всех админов
app.get('/api/admin/admins', requireAdmin, (req, res) => {
    res.json({ admins: db.admins });
});

// Добавить админа
app.post('/api/admin/admins', requireAdmin, (req, res) => {
    const { user_id, username, role } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const existingAdmin = db.admins.find(a => a.user_id == user_id);
    if (existingAdmin) {
        return res.status(400).json({ error: 'Admin already exists' });
    }
    
    const newAdmin = {
        id: Date.now(),
        user_id: parseInt(user_id),
        username: username || null,
        role: role || 'moderator',
        created_at: new Date().toISOString()
    };
    
    db.admins.push(newAdmin);
    
    res.json({ success: true, admin: newAdmin });
});

// Получить работы для модерации
app.get('/api/admin/works/moderation', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    let works = db.user_works;
    if (status !== 'all') {
        works = works.filter(work => work.status === status);
    }
    
    // Добавляем информацию о пользователе
    const worksWithUser = works.map(work => {
        const user = db.users.find(u => u.user_id === work.user_id);
        return {
            ...work,
            user_name: user ? user.tg_first_name : 'Unknown',
            user_role: user ? user.class : 'Unknown'
        };
    });
    
    res.json({ works: worksWithUser });
});

// Обновить статус работы
app.post('/api/admin/works/:workId/status', requireAdmin, (req, res) => {
    const workId = parseInt(req.params.workId);
    const { status, admin_comment } = req.body;
    
    const work = db.user_works.find(w => w.id === workId);
    if (!work) {
        return res.status(404).json({ error: 'Work not found' });
    }
    
    work.status = status;
    work.moderated_at = new Date().toISOString();
    work.moderator_id = req.admin.user_id;
    work.admin_comment = admin_comment || null;
    
    // Если работа одобрена, начисляем искры
    if (status === 'approved') {
        addSparks(work.user_id, 15, 'work_approved', `Работа одобрена: ${work.title}`);
    }
    
    res.json({ success: true, work });
});

// Получить отзывы для модерации
app.get('/api/admin/reviews/moderation', requireAdmin, (req, res) => {
    const { status = 'pending' } = req.query;
    
    let reviews = db.post_reviews;
    if (status !== 'all') {
        reviews = reviews.filter(review => review.status === status);
    }
    
    // Добавляем информацию о пользователе и посте
    const reviewsWithInfo = reviews.map(review => {
        const user = db.users.find(u => u.user_id === review.user_id);
        const post = db.channel_posts.find(p => p.post_id === review.post_id);
        
        return {
            ...review,
            user_name: user ? user.tg_first_name : 'Unknown',
            post_title: post ? post.title : 'Unknown Post'
        };
    });
    
    res.json({ reviews: reviewsWithInfo });
});

// Обновить статус отзыва
app.post('/api/admin/reviews/:reviewId/status', requireAdmin, (req, res) => {
    const reviewId = parseInt(req.params.reviewId);
    const { status, admin_comment } = req.body;
    
    const review = db.post_reviews.find(r => r.id === reviewId);
    if (!review) {
        return res.status(404).json({ error: 'Review not found' });
    }
    
    review.status = status;
    review.moderated_at = new Date().toISOString();
    review.moderator_id = req.admin.user_id;
    review.admin_comment = admin_comment || null;
    
    res.json({ success: true, review });
});

// Получить все покупки
app.get('/api/admin/purchases', requireAdmin, (req, res) => {
    const purchases = db.purchases.map(purchase => {
        const user = db.users.find(u => u.user_id === purchase.user_id);
        const item = db.shop_items.find(i => i.id === purchase.item_id);
        
        return {
            ...purchase,
            user_name: user ? user.tg_first_name : 'Unknown',
            item_title: item ? item.title : 'Unknown Item'
        };
    });
    
    res.json({ purchases });
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
    console.log(`📁 Uploads: ${process.env.APP_URL || `http://localhost:${PORT}`}/uploads`);
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
