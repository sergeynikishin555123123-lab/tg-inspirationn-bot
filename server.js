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

// In-memory база данных (для начала)
let db = {
    users: [
        {
            id: 1,
            user_id: 12345,
            tg_first_name: 'Тестовый Пользователь',
            sparks: 25.5,
            level: 'Ученик',
            is_registered: true,
            class: 'Художники',
            character_id: 1,
            character_name: 'Лука Цветной',
            available_buttons: ['quiz', 'shop', 'activities', 'invite']
        }
    ],
    characters: [
        { id: 1, class: 'Художники', character_name: 'Лука Цветной', description: 'Рисует с детства, любит эксперименты с цветом', bonus_type: 'percent_bonus', bonus_value: '10', is_active: true },
        { id: 2, class: 'Художники', character_name: 'Марина Кисть', description: 'Строгая преподавательница академической живописи', bonus_type: 'forgiveness', bonus_value: '1', is_active: true },
        { id: 3, class: 'Художники', character_name: 'Феликс Штрих', description: 'Экспериментатор, мастер зарисовок', bonus_type: 'random_gift', bonus_value: '1-3', is_active: true },
        { id: 4, class: 'Стилисты', character_name: 'Эстелла Моде', description: 'Бывший стилист, обучает восприятию образа', bonus_type: 'percent_bonus', bonus_value: '5', is_active: true },
        { id: 5, class: 'Стилисты', character_name: 'Роза Ателье', description: 'Мастер практического шитья', bonus_type: 'secret_advice', bonus_value: '2weeks', is_active: true },
        { id: 6, class: 'Стилисты', character_name: 'Гертруда Линия', description: 'Ценит детали и аксессуары', bonus_type: 'series_bonus', bonus_value: '1', is_active: true },
        { id: 7, class: 'Мастера', character_name: 'Тихон Творец', description: 'Ремесленник, любит простые техники', bonus_type: 'photo_bonus', bonus_value: '1', is_active: true },
        { id: 8, class: 'Мастера', character_name: 'Агата Узор', description: 'Любит неожиданные материалы', bonus_type: 'weekly_surprise', bonus_value: '6', is_active: true },
        { id: 9, class: 'Мастера', character_name: 'Борис Клей', description: 'Весёлый мастер импровизаций', bonus_type: 'mini_quest', bonus_value: '2', is_active: true },
        { id: 10, class: 'Историки', character_name: 'Профессор Артёмий', description: 'Любитель архивов и фактов', bonus_type: 'quiz_hint', bonus_value: '1', is_active: true },
        { id: 11, class: 'Историки', character_name: 'Соня Гравюра', description: 'Рассказывает истории картин', bonus_type: 'fact_star', bonus_value: '1', is_active: true },
        { id: 12, class: 'Историки', character_name: 'Михаил Эпоха', description: 'Любит хронологию и эпохи', bonus_type: 'streak_multiplier', bonus_value: '2', is_active: true }
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
            sparks_reward: 2,
            is_active: true
        },
        {
            id: 2,
            title: "👗 История моды",
            description: "Тест по истории моды и стиля",
            questions: [
                {
                    question: "В каком веке появился первый кринолин?",
                    options: ["16 век", "17 век", "18 век", "19 век"],
                    correctAnswer: 2
                }
            ],
            sparks_reward: 1.5,
            is_active: true
        }
    ],
    shop_items: [
        {
            id: 1,
            title: "🎨 Урок акварели для начинающих",
            description: "Полный видеоурок по основам акварельной живописи",
            type: "video",
            file_url: "https://example.com/watercolor-course.mp4",
            preview_url: "https://via.placeholder.com/300x200/667eea/ffffff?text=Акварель",
            price: 15,
            content_text: "В этом уроке вы научитесь основам работы с акварелью, смешиванию цветов и созданию первых работ. Продолжительность: 45 минут.",
            is_active: true
        },
        {
            id: 2,
            title: "📚 Гайд по композиции",
            description: "PDF руководство по построению гармоничной композиции",
            type: "pdf",
            file_url: "https://example.com/composition-guide.pdf",
            preview_url: "https://via.placeholder.com/300x200/48bb78/ffffff?text=Композиция",
            price: 10,
            content_text: null,
            is_active: true
        },
        {
            id: 3,
            title: "💡 Секреты цветовых сочетаний",
            description: "Текстовый материал о психологии цвета и гармоничных сочетаниях",
            type: "text",
            file_url: null,
            preview_url: "https://via.placeholder.com/300x200/ed8936/ffffff?text=Цвета",
            price: 8,
            content_text: "Цвет - это мощный инструмент в руках художника. В этом материале вы узнаете о психологическом воздействии цветов и научитесь создавать гармоничные палитры. Основные принципы: контраст, нюанс, тёплые и холодные тона.",
            is_active: true
        }
    ],
    activities: [],
    admins: [
        { id: 1, user_id: 898508164, username: 'admin', role: 'superadmin' }
    ],
    purchases: [],
    channel_posts: [
        {
            id: 1,
            post_id: "post_art_basics",
            title: "🎨 Основы композиции в живописи",
            content: "Сегодня поговорим о фундаментальных принципах построения композиции. Золотое сечение, правило третей и многое другое!",
            image_url: "https://via.placeholder.com/400x300/764ba2/ffffff?text=Композиция",
            admin_id: 898508164,
            is_active: true
        },
        {
            id: 2,
            post_id: "post_color_psychology", 
            title: "🌈 Психология цвета в искусстве",
            content: "Как цвета влияют на восприятие artwork? Красный - страсть, синий - спокойствие, жёлтый - энергия. Узнайте больше!",
            image_url: "https://via.placeholder.com/400x300/f56565/ffffff?text=Цвета",
            admin_id: 898508164,
            is_active: true
        }
    ],
    post_reviews: []
};

app.use(express.json({ limit: '50mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use('/admin', express.static(join(__dirname, 'admin')));

console.log('🎨 Мастерская Вдохновения - Запуск...');

// ==================== СИСТЕМА НАЧИСЛЕНИЯ ИСКР ====================

const SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 1,
    QUIZ_PERFECT_BONUS: 5,
    DAILY_COMMENT: 1,
    INVITE_FRIEND: 10,
    PARTICIPATE_POLL: 2,
    PARTICIPATE_MARATHON: 7,
    WRITE_REVIEW: 3
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
        user.sparks += sparks;
        db.activities.push({
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: sparks,
            description: description,
            created_at: new Date().toISOString()
        });
        return true;
    }
    return false;
}

// ==================== MIDDLEWARE ====================

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
        version: '7.0.0',
        database: 'In-Memory',
        users: db.users.length,
        items: db.shop_items.length
    });
});

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(join(__dirname, 'admin', 'index.html'));
});

// ==================== WEBAPP API ====================

// Получение данных пользователя
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        user.level = calculateLevel(user.sparks);
        user.available_buttons = user.available_buttons || [];
        res.json({ exists: true, user });
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
            available_buttons: []
        };
        db.users.push(newUser);
        
        res.json({ 
            exists: false, 
            user: newUser
        });
    }
});

// Регистрация пользователя
app.post('/api/users/register', (req, res) => {
    const { userId, userClass, characterId, tgUsername, tgFirstName } = req.body;
    
    console.log('📝 Регистрация пользователя:', { userId, userClass, characterId });
    
    if (!userId || !userClass || !characterId) {
        return res.status(400).json({ error: 'User ID, class and character are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !character) {
        return res.status(404).json({ error: 'User or character not found' });
    }
    
    const isNewUser = !user.is_registered;
    
    // Обновляем пользователя
    user.tg_username = tgUsername;
    user.tg_first_name = tgFirstName;
    user.class = userClass;
    user.character_id = characterId;
    user.character_name = character.character_name;
    user.is_registered = true;
    user.available_buttons = ['quiz', 'shop', 'activities', 'invite'];
    
    let message = 'Регистрация успешна!';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = 5;
        addSparks(userId, sparksAdded, 'registration', 'Регистрация');
        message = 'Регистрация успешна! +5✨';
    }
    
    res.json({ 
        success: true, 
        message: message,
        sparksAdded: sparksAdded
    });
});

// Получение классов
app.get('/api/webapp/classes', (req, res) => {
    const classes = [
        { id: 'Художники', name: '🎨 Художники', description: 'Творцы изобразительного искусства', icon: '🎨' },
        { id: 'Стилисты', name: '👗 Стилисты', description: 'Мастера создания образов', icon: '👗' },
        { id: 'Мастера', name: '🧵 Мастера', description: 'Ремесленники прикладного искусства', icon: '🧵' },
        { id: 'Историки', name: '🏛️ Историки искусства', description: 'Знатоки истории искусств', icon: '🏛️' }
    ];
    res.json(classes);
});

// Получение персонажей
app.get('/api/webapp/characters', (req, res) => {
    const grouped = {};
    db.characters
        .filter(char => char.is_active)
        .forEach(char => {
            if (!grouped[char.class]) grouped[char.class] = [];
            grouped[char.class].push({
                ...char,
                available_buttons: ['quiz', 'shop', 'activities', 'invite']
            });
        });
    
    res.json(grouped);
});

// Получение квизов
app.get('/api/webapp/quizzes', (req, res) => {
    const userId = req.query.userId;
    const quizzes = db.quizzes.filter(q => q.is_active);
    
    // Для упрощения считаем, что квизы не пройдены
    const quizzesWithStatus = quizzes.map(quiz => ({
        ...quiz,
        completed: false,
        can_retake: true
    }));
    
    res.json(quizzesWithStatus);
});

// Прохождение квиза
app.post('/api/webapp/quizzes/:quizId/submit', (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { userId, answers } = req.body;
    
    console.log(`📝 Прохождение квиза ${quizId} пользователем ${userId}`);
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
    }
    
    let correctAnswers = 0;
    quiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
            correctAnswers++;
        }
    });
    
    // Новая система начисления искр
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    // За каждый правильный ответ
    sparksEarned += correctAnswers * SPARKS_SYSTEM.QUIZ_PER_CORRECT_ANSWER;
    
    // Бонус за идеальное прохождение
    if (perfectScore) {
        sparksEarned += SPARKS_SYSTEM.QUIZ_PERFECT_BONUS;
    }
    
    // Начисляем искры
    if (sparksEarned > 0) {
        addSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title} (${correctAnswers}/${quiz.questions.length} правильных)`);
    }
    
    res.json({
        success: true,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
        sparksEarned,
        perfectScore,
        passed: correctAnswers > 0,
        message: perfectScore ? 
            `Идеально! 🎉 +${sparksEarned}✨ (${correctAnswers} правильных + бонус)` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨`
    });
});

// Магазин - получение товаров
app.get('/api/webapp/shop/items', (req, res) => {
    const items = db.shop_items.filter(item => item.is_active);
    res.json(items);
});

// Покупка товара
app.post('/api/webapp/shop/purchase', (req, res) => {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
        return res.status(400).json({ error: 'User ID and item ID are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const item = db.shop_items.find(i => i.id == itemId && i.is_active);
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    if (user.sparks < item.price) {
        return res.status(400).json({ error: 'Недостаточно искр' });
    }
    
    // Совершаем покупку
    user.sparks -= item.price;
    
    const purchase = {
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        price_paid: item.price,
        purchased_at: new Date().toISOString(),
        content_delivered: true
    };
    db.purchases.push(purchase);
    
    // Добавляем активность
    db.activities.push({
        id: Date.now(),
        user_id: userId,
        activity_type: 'purchase',
        sparks_earned: -item.price,
        description: `Покупка: ${item.title}`,
        created_at: new Date().toISOString()
    });
    
    res.json({
        success: true,
        message: `Покупка успешна! Куплено: ${item.title}`,
        remainingSparks: user.sparks,
        purchasedItem: {
            title: item.title,
            description: item.description,
            type: item.type,
            content: item.content_text || item.file_url,
            purchasedAt: new Date().toISOString()
        }
    });
});

// Получение купленных товаров пользователя
app.get('/api/webapp/users/:userId/purchases', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userPurchases = db.purchases
        .filter(p => p.user_id === userId)
        .map(purchase => {
            const item = db.shop_items.find(i => i.id === purchase.item_id);
            return {
                ...purchase,
                title: item?.title,
                description: item?.description,
                type: item?.type,
                content_text: item?.content_text,
                file_url: item?.file_url
            };
        });
    
    res.json({ purchases: userPurchases });
});

// Активности пользователя
app.get('/api/webapp/users/:userId/activities', (req, res) => {
    const userId = parseInt(req.params.userId);
    const userActivities = db.activities
        .filter(a => a.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);
    
    res.json({ activities: userActivities });
});

// Получение постов канала
app.get('/api/webapp/channel-posts', (req, res) => {
    const posts = db.channel_posts.filter(post => post.is_active);
    res.json({ posts });
});

// Написание отзыва к посту
app.post('/api/webapp/posts/:postId/review', (req, res) => {
    const { postId } = req.params;
    const { userId, reviewText, rating = 5 } = req.body;
    
    if (!userId || !reviewText) {
        return res.status(400).json({ error: 'User ID and review text are required' });
    }
    
    const post = db.channel_posts.find(p => p.post_id === postId);
    if (!post) {
        return res.status(404).json({ error: 'Post not found' });
    }
    
    // Проверяем не оставлял ли пользователь уже отзыв к этому посту
    const existingReview = db.post_reviews.find(r => 
        r.user_id == userId && r.post_id === postId
    );
    
    if (existingReview) {
        return res.status(400).json({ error: 'Вы уже оставляли отзыв к этому посту' });
    }
    
    // Сохраняем отзыв
    const review = {
        id: Date.now(),
        user_id: userId,
        post_id: postId,
        review_text: reviewText,
        rating: rating,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    db.post_reviews.push(review);
    
    // Начисляем искры за отзыв
    addSparks(userId, SPARKS_SYSTEM.WRITE_REVIEW, 'review', `Отзыв к посту`);
    
    res.json({
        success: true,
        message: 'Отзыв отправлен на модерацию! +3✨',
        sparksEarned: SPARKS_SYSTEM.WRITE_REVIEW
    });
});

// Ежедневный комментарий
app.post('/api/webapp/daily-comment', (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Для упрощения - всегда начисляем бонус
    addSparks(userId, SPARKS_SYSTEM.DAILY_COMMENT, 'daily_comment', 'Ежедневный комментарий');
    
    res.json({
        success: true,
        message: 'Бонус за комментарий получен! +1✨',
        sparksEarned: SPARKS_SYSTEM.DAILY_COMMENT
    });
});

// ==================== ADMIN API ====================

// Статистика
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const [
            usersResult,
            quizzesResult,
            charactersResult,
            shopItemsResult,
            sparksResult,
            adminsResult,
            postsResult,
            reviewsResult
        ] = await Promise.all([
            dbClient.query('SELECT COUNT(*) as count FROM users'),
            dbClient.query('SELECT COUNT(*) as count FROM quizzes WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM characters WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM shop_items WHERE is_active = TRUE'),
            dbClient.query('SELECT SUM(sparks) as total FROM users'),
            dbClient.query('SELECT COUNT(*) as count FROM admins'),
            dbClient.query('SELECT COUNT(*) as count FROM channel_posts WHERE is_active = TRUE'),
            dbClient.query('SELECT COUNT(*) as count FROM post_reviews WHERE status = $1', ['pending'])
        ]);

        res.json({
            totalUsers: parseInt(usersResult.rows[0].count),
            activeQuizzes: parseInt(quizzesResult.rows[0].count),
            activeCharacters: parseInt(charactersResult.rows[0].count),
            shopItems: parseInt(shopItemsResult.rows[0].count),
            totalSparks: parseFloat(sparksResult.rows[0].total) || 0,
            totalAdmins: parseInt(adminsResult.rows[0].count),
            totalPosts: parseInt(postsResult.rows[0].count),
            pendingReviews: parseInt(reviewsResult.rows[0].count),
            activeToday: parseInt(usersResult.rows[0].count),
            totalPosts: 0,
            pendingModeration: parseInt(reviewsResult.rows[0].count),
            registeredToday: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление магазином - создание товара
app.post('/api/admin/shop/items', requireAdmin, async (req, res) => {
    const { title, description, type, file_url, preview_url, price, content_text, is_active } = req.body;
    
    console.log('🛒 Создание товара:', title);
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }
    
    try {
        const result = await dbClient.query(
            `INSERT INTO shop_items (title, description, type, file_url, preview_url, price, content_text, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [title, description, type || 'video', file_url, preview_url, price, content_text, is_active !== false]
        );
        
        res.json({
            success: true,
            message: 'Товар успешно создан',
            itemId: result.rows[0].id
        });
    } catch (error) {
        console.error('❌ Error creating item:', error);
        res.status(500).json({ error: 'Error creating item' });
    }
});

// Управление постами канала
app.get('/api/admin/channel-posts', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT cp.*, a.username as admin_username,
                   (SELECT COUNT(*) FROM post_reviews pr WHERE pr.post_id = cp.post_id) as reviews_count
            FROM channel_posts cp
            LEFT JOIN admins a ON cp.admin_id = a.user_id
            ORDER BY cp.created_at DESC
        `);
        res.json({ posts: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/channel-posts', requireAdmin, async (req, res) => {
    const { post_id, title, content, image_url } = req.body;
    const adminId = req.admin.user_id;
    
    if (!post_id || !title) {
        return res.status(400).json({ error: 'Post ID and title are required' });
    }
    
    try {
        await dbClient.query(
            `INSERT INTO channel_posts (post_id, title, content, image_url, admin_id) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (post_id) DO UPDATE SET
             title = EXCLUDED.title, content = EXCLUDED.content, image_url = EXCLUDED.image_url`,
            [post_id, title, content, image_url, adminId]
        );
        
        res.json({
            success: true,
            message: 'Пост успешно сохранен'
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Модерация отзывов
app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
    const { status = 'pending' } = req.query;
    
    try {
        const result = await dbClient.query(`
            SELECT pr.*, u.tg_first_name, u.tg_username, cp.title as post_title
            FROM post_reviews pr
            JOIN users u ON pr.user_id = u.user_id
            JOIN channel_posts cp ON pr.post_id = cp.post_id
            WHERE pr.status = $1
            ORDER BY pr.created_at DESC
        `, [status]);
        
        res.json({ reviews: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/reviews/:reviewId/moderate', requireAdmin, async (req, res) => {
    const { reviewId } = req.params;
    const { status, admin_comment } = req.body;
    const moderatorId = req.admin.user_id;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        await dbClient.query(
            `UPDATE post_reviews 
             SET status = $1, admin_comment = $2, moderator_id = $3, moderated_at = CURRENT_TIMESTAMP 
             WHERE id = $4`,
            [status, admin_comment, moderatorId, reviewId]
        );
        
        res.json({
            success: true,
            message: `Отзыв ${status === 'approved' ? 'одобрен' : 'отклонен'}`
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление опросами
app.get('/api/admin/polls', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT p.*, a.username as creator_username,
                   (SELECT COUNT(*) FROM poll_participants pp WHERE pp.poll_id = p.id) as participants_count
            FROM polls p
            LEFT JOIN admins a ON p.created_by = a.user_id
            ORDER BY p.created_at DESC
        `);
        
        const polls = result.rows.map(poll => ({
            ...poll,
            options: JSON.parse(poll.options || '[]')
        }));
        
        res.json({ polls });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/polls', requireAdmin, async (req, res) => {
    const { title, description, options } = req.body;
    const createdBy = req.admin.user_id;
    
    if (!title || !options || !Array.isArray(options)) {
        return res.status(400).json({ error: 'Title and options array are required' });
    }
    
    try {
        const optionsJson = JSON.stringify(options);
        const result = await dbClient.query(
            `INSERT INTO polls (title, description, options, created_by) 
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [title, description, optionsJson, createdBy]
        );
        
        res.json({
            success: true,
            message: 'Опрос создан',
            pollId: result.rows[0].id
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Управление марафонами
app.get('/api/admin/marathons', requireAdmin, async (req, res) => {
    try {
        const result = await dbClient.query(`
            SELECT m.*, 
                   (SELECT COUNT(*) FROM marathon_participants mp WHERE mp.marathon_id = m.id) as participants_count
            FROM marathons m
            ORDER BY m.created_at DESC
        `);
        res.json({ marathons: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/marathons', requireAdmin, async (req, res) => {
    const { title, description, start_date, end_date, reward_sparks } = req.body;
    
    if (!title || !start_date || !end_date) {
        return res.status(400).json({ error: 'Title, start date and end date are required' });
    }
    
    try {
        const result = await dbClient.query(
            `INSERT INTO marathons (title, description, start_date, end_date, reward_sparks) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [title, description, start_date, end_date, reward_sparks || SPARKS_SYSTEM.PARTICIPATE_MARATHON]
        );
        
        res.json({
            success: true,
            message: 'Марафон создан',
            marathonId: result.rows[0].id
        });
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== TELEGRAM BOT ====================

let bot;
try {
    bot = new TelegramBot(process.env.BOT_TOKEN, { 
        polling: true,
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    });
    
    console.log('✅ Telegram Bot инициализирован с токеном:', process.env.BOT_TOKEN);
    
    // Обработчик команды /start
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        const name = msg.from.first_name || 'Друг';
        
        const welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерская Вдохновения**!

✨ Откройте личный кабинет чтобы:
• 🎯 Проходить квизы и получать искры
• 👥 Выбрать своего персонажа  
• 🛒 Покупать обучающие материалы
• 📊 Отслеживать свой прогресс
• 💬 Оставлять отзывы к постам
• 👥 Приглашать друзей

Нажмите кнопку ниже чтобы начать!`;
        
        const keyboard = {
            inline_keyboard: [[
                {
                    text: "📱 Открыть Личный Кабинет",
                    web_app: { url: process.env.APP_URL || `https://sergeynikishin555123123-lab-tg-inspirationn-bot-3c3e.twc1.net` }
                }
            ]]
        };

        bot.sendMessage(chatId, welcomeText, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        }).catch(err => {
            console.error('❌ Ошибка отправки сообщения:', err.message);
        });
    });

    // Обработчик команды /admin
    bot.onText(/\/admin/, (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        
        dbClient.query('SELECT * FROM admins WHERE user_id = $1', [userId])
            .then(result => {
                if (result.rows.length === 0) {
                    bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.').catch(console.error);
                    return;
                }
                
                const admin = result.rows[0];
                const adminUrl = `${process.env.APP_URL || 'https://sergeynikishin555123123-lab-tg-inspirationn-bot-3c3e.twc1.net'}/admin?userId=${userId}`;
                bot.sendMessage(chatId, 
                    `🔧 Панель администратора\n\nДоступ: ${admin.role}\n\n${adminUrl}`
                ).catch(console.error);
            })
            .catch(console.error);
    });

    // Обработчик ошибок бота
    bot.on('polling_error', (error) => {
        console.error('❌ Polling error:', error.message);
    });

    console.log('🤖 Бот готов к работе!');
    
} catch (error) {
    console.error('❌ Ошибка инициализации бота:', error.message);
    console.log('🚫 Бот отключен, но веб-приложение продолжает работать');
}

// ==================== SERVER START ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Mini App: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Admin Panel: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
    console.log(`🤖 Bot Token: ${process.env.BOT_TOKEN ? '✅ Настроен' : '❌ Отсутствует'}`);
    console.log(`🗄️ Database: PostgreSQL TimeWeb`);
    console.log(`✨ Новая система искр активирована`);
    console.log('✅ Все системы работают');
}).on('error', (err) => {
    console.error('❌ Server error:', err);
});
