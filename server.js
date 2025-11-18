import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const APP_ROOT = process.cwd();

console.log('🚀 Запуск Космической Мастерской Вдохновения v9.0...');

// 🌟 УЛЬТРА-СОВРЕМЕННАЯ БАЗА ДАННЫХ С AI-ФУНКЦИЯМИ
class CosmicDatabase {
    constructor() {
        this.users = this.initializeUsers();
        this.roles = this.initializeRoles();
        this.characters = this.initializeCharacters();
        this.quizzes = this.initializeQuizzes();
        this.marathons = this.initializeMarathons();
        this.shopItems = this.initializeShopItems();
        this.interactives = this.initializeInteractives();
        this.posts = this.initializePosts();
        this.admins = this.initializeAdmins();
        this.activities = [];
        this.purchases = [];
        this.userWorks = [];
        this.postReviews = [];
        this.quizCompletions = [];
        this.marathonCompletions = [];
        this.interactiveCompletions = [];
        this.marathonSubmissions = [];
        this.notifications = [];
        this.achievements = this.initializeAchievements();
        this.userAchievements = [];
        this.settings = this.initializeSettings();
        this.sessions = [];
    }

    initializeUsers() {
        return [
            {
                id: 1,
                user_id: 12345,
                tg_first_name: 'Космический Тест',
                tg_username: 'cosmic_tester',
                sparks: 999.9,
                level: 'Легенда',
                is_registered: true,
                class: 'Космические Художники',
                character_id: 1,
                character_name: 'Нова Звёздная',
                available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'cosmic_challenges'],
                registration_date: new Date().toISOString(),
                last_active: new Date().toISOString(),
                total_activities: 99,
                completed_quizzes: 15,
                completed_marathons: 8,
                uploaded_works: 12,
                cosmic_level: 5,
                nebula_badges: ['pioneer', 'explorer', 'innovator'],
                ai_companion: 'NOVA-X1'
            },
            {
                id: 2,
                user_id: 898508164,
                tg_first_name: 'Верховный Админ',
                tg_username: 'cosmic_admin',
                sparks: 9999.9,
                level: 'Создатель',
                is_registered: true,
                class: 'Архитекторы Реальности',
                character_id: 2,
                character_name: 'Оракул Бесконечности',
                available_buttons: ['all'],
                registration_date: new Date().toISOString(),
                last_active: new Date().toISOString(),
                total_activities: 999,
                completed_quizzes: 99,
                completed_marathons: 33,
                uploaded_works: 77,
                cosmic_level: 99,
                nebula_badges: ['founder', 'visionary', 'architect', 'oracle'],
                ai_companion: 'ORACLE-Ω'
            }
        ];
    }

    initializeRoles() {
        return [
            {
                id: 1,
                name: 'Космические Художники',
                description: 'Творцы новых реальностей. Создают миры с помощью цвета, света и воображения.',
                icon: '🌌',
                available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'cosmic_challenges', 'nebula_gallery'],
                is_active: true,
                created_at: new Date().toISOString(),
                color: '#9D50FF',
                requirements: 'Способность видеть за пределами видимого',
                cosmic_powers: ['reality_bending', 'color_manipulation', 'light_weaving']
            },
            {
                id: 2,
                name: 'Архитекторы Реальности',
                description: 'Строители новых измерений. Проектируют пространства, которые меняют восприятие.',
                icon: '🏗️',
                available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'cosmic_challenges', 'dimension_lab'],
                is_active: true,
                created_at: new Date().toISOString(),
                color: '#00D2FF',
                requirements: 'Чувство пространства и времени',
                cosmic_powers: ['space_folding', 'time_weaving', 'reality_architecting']
            },
            {
                id: 3,
                name: 'Звуковые Волшебники',
                description: 'Мастера вибраций и резонансов. Создают звуковые ландшафты, которые лечат и вдохновляют.',
                icon: '🎵',
                available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role', 'cosmic_challenges', 'sound_matrix'],
                is_active: true,
                created_at: new Date().toISOString(),
                color: '#FF6BFF',
                requirements: 'Чувствительность к вибрациям',
                cosmic_powers: ['frequency_manipulation', 'resonance_creation', 'sound_healing']
            }
        ];
    }

    initializeCharacters() {
        return [
            { 
                id: 1, 
                role_id: 1, 
                name: 'Нова Звёздная', 
                description: 'Эксперт по межгалактической эстетике. Помогает находить красоту в хаосе вселенной.', 
                bonus_type: 'quantum_boost', 
                bonus_value: '15',
                bonus_description: '+15% к скорости обучения',
                is_active: true,
                created_at: new Date().toISOString(),
                avatar: '👩‍🎨',
                personality: 'Любопытная и мечтательная',
                cosmic_abilities: ['star_navigation', 'color_alchemy', 'inspiration_beam']
            },
            { 
                id: 2, 
                role_id: 2, 
                name: 'Оракул Бесконечности', 
                description: 'Хранитель знаний о структуре реальности. Открывает доступ к скрытым измерениям.', 
                bonus_type: 'wisdom_boost', 
                bonus_value: '20',
                bonus_description: '+20% к мудрости решений',
                is_active: true,
                created_at: new Date().toISOString(),
                avatar: '🔮',
                personality: 'Мудрый и загадочный',
                cosmic_abilities: ['future_vision', 'reality_reading', 'knowledge_stream']
            }
        ];
    }

    initializeQuizzes() {
        return [
            {
                id: 1,
                title: "🚀 Основы Космической Композиции",
                description: "Изучите принципы построения композиции в межзвездном пространстве",
                questions: [
                    {
                        id: 1,
                        question: "Какой принцип композиции доминирует в космическом искусстве?",
                        options: ["Золотое сечение", "Теория хаоса", "Квантовая суперпозиция", "Гравитационные волны"],
                        correctAnswer: 1,
                        explanation: "Теория хаоса позволяет создавать гармонию из кажущегося беспорядка космоса."
                    },
                    {
                        id: 2,
                        question: "Что такое 'цветовая температура' нейтронной звезды?",
                        options: ["1 млн °C", "100 тыс °C", "600 тыс °C", "10 млн °C"],
                        correctAnswer: 2,
                        explanation: "Нейтронные звезды имеют температуру около 600,000°C, создавая уникальные цветовые спектры."
                    }
                ],
                sparks_per_correct: 5,
                sparks_perfect_bonus: 25,
                cooldown_hours: 12,
                allow_retake: true,
                is_active: true,
                difficulty: 'cosmic_beginner',
                category: 'space_art',
                duration_minutes: 15,
                created_at: new Date().toISOString(),
                attempts_count: 256,
                average_score: 4.2,
                cosmic_rewards: ['nebula_fragment', 'star_dust']
            }
        ];
    }

    initializeMarathons() {
        return [
            {
                id: 1,
                title: "🌠 7-дневный Марафон Космического Творчества",
                description: "Создайте свою собственную галактику за неделю интенсивного творчества",
                duration_days: 7,
                tasks: [
                    { 
                        day: 1, 
                        title: "Рождение Звезды", 
                        description: "Создайте прототип собственной звездной системы",
                        requires_submission: true,
                        submission_type: "cosmic_blueprint",
                        instructions: "Используйте принципы гравитации и света для создания баланса",
                        tips: ["Начните с центральной звезды", "Учитывайте орбитальные резонансы", "Экспериментируйте с цветовыми палитрами"],
                        cosmic_tools: ['gravity_simulator', 'light_bender']
                    }
                ],
                sparks_per_day: 15,
                sparks_completion_bonus: 100,
                is_active: true,
                difficulty: 'cosmic_explorer',
                category: 'galaxy_creation',
                participants_count: 512,
                completion_rate: 78,
                created_at: new Date().toISOString(),
                cover_image: '',
                requirements: "Готовность исследовать неизвестное",
                cosmic_rewards: ['mini_galaxy', 'creator_badge']
            }
        ];
    }

    initializeShopItems() {
        return [
            {
                id: 1,
                title: "🎆 Курс 'Создание Невозможных Миров'",
                description: "Научитесь создавать реальности, которые бросают вызов законам физики",
                type: "quantum_course",
                file_url: "data:application/pdf;base64,JVBERi0xLjcKJeLjz9MKMiAwIG9iago8PC9MZW5ndGggMzAgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nC3LMQ6AIAwF0D1",
                preview_url: "",
                price: 99,
                content_text: "Вы освоите: квантовую композицию, многомерную перспективу, создание временных петель в искусстве.",
                is_active: true,
                category: "reality_design",
                difficulty: "cosmic_master",
                duration: "21 урок",
                instructor: "Нова Звёздная",
                rating: 4.9,
                students_count: 321,
                created_at: new Date().toISOString(),
                features: ["Пожизненный доступ", "AI-наставник", "Космический сертификат", "Доступ к нейросетям"],
                cosmic_features: ['quantum_rendering', 'multiverse_access', 'ai_coaching']
            }
        ];
    }

    initializeInteractives() {
        return [
            {
                id: 1,
                title: "🪐 Угадай Планету по Атмосфере",
                description: "Определите тип планеты по её атмосферному составу и визуальным характеристикам",
                type: "planet_identification",
                category: "cosmic_science",
                image_url: "",
                question: "По спектральному анализу определите тип планеты:",
                options: ["Горячий Юпитер", "Супер-Земля", "Ледяной Гигант", "Лава Мир"],
                correct_answer: 1,
                sparks_reward: 10,
                allow_retake: false,
                is_active: true,
                difficulty: 'cosmic_explorer',
                created_at: new Date().toISOString(),
                attempts_count: 189,
                success_rate: 65,
                cosmic_data: ['spectral_analysis', 'atmospheric_readings']
            }
        ];
    }

    initializePosts() {
        return [
            {
                id: 1,
                post_id: "cosmic_news_001",
                title: "🚀 Открыта Новая Туманность!",
                content: "Астрономы-художники обнаружили туманность, меняющую цвет в зависимости от настроения наблюдателя.",
                image_url: "",
                video_url: "",
                media_type: "text",
                admin_id: 898508164,
                created_at: new Date().toISOString(),
                is_active: true,
                telegram_message_id: null,
                action_type: "explore_nebula",
                action_target: "nebula_gallery",
                likes_count: 47,
                comments_count: 12,
                cosmic_tags: ['discovery', 'nebulae', 'quantum_art']
            }
        ];
    }

    initializeAdmins() {
        return [
            { 
                id: 1, 
                user_id: 898508164, 
                username: 'cosmic_admin', 
                role: 'quantum_administrator', 
                permissions: ['all'],
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                cosmic_clearance: 'omega_level',
                ai_assistant: true
            }
        ];
    }

    initializeAchievements() {
        return [
            {
                id: 1,
                title: "Первый Шаг в Космос",
                description: "Зарегистрироваться в системе",
                icon: "👣",
                sparks_reward: 25,
                condition_type: "registration",
                condition_value: "1",
                is_active: true,
                cosmic_tier: "novice"
            },
            {
                id: 2,
                title: "Создатель Реальностей",
                description: "Создать 10 работ",
                icon: "🌌",
                sparks_reward: 100,
                condition_type: "work_upload",
                condition_value: "10",
                is_active: true,
                cosmic_tier: "master"
            }
        ];
    }

    initializeSettings() {
        return [
            {
                key: "app_name",
                value: "Космическая Мастерская Вдохновения",
                description: "Название приложения"
            },
            {
                key: "cosmic_mode",
                value: "enabled",
                description: "Режим космических возможностей"
            },
            {
                key: "ai_assistant",
                value: "enabled",
                description: "AI помощник"
            }
        ];
    }
}

// 🌟 ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
const db = new CosmicDatabase();

app.use(express.json({ limit: '100mb' }));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// ==================== КОСМИЧЕСКИЕ СТАТИЧЕСКИЕ ФАЙЛЫ ====================
app.use(express.static(join(APP_ROOT, 'public')));
app.use('/admin', express.static(join(APP_ROOT, 'admin')));

app.get('/admin', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

app.get('/admin/*', (req, res) => {
    res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

console.log('🌌 Космическая система инициализирована!');

// 🌟 КВАНТОВАЯ СИСТЕМА ИСКР
const QUANTUM_SPARKS_SYSTEM = {
    QUIZ_PER_CORRECT_ANSWER: 5,
    QUIZ_PERFECT_BONUS: 25,
    MARATHON_DAY_COMPLETION: 15,
    MARATHON_COMPLETION_BONUS: 100,
    INVITE_FRIEND: 20,
    WRITE_REVIEW: 5,
    DAILY_COMMENT: 3,
    UPLOAD_WORK: 10,
    WORK_APPROVED: 30,
    REGISTRATION_BONUS: 25,
    PARTICIPATE_POLL: 5,
    INTERACTIVE_COMPLETION: 10,
    INTERACTIVE_SUBMISSION: 5,
    COMPLIMENT_CHALLENGE: 2,
    MARATHON_SUBMISSION: 10,
    ROLE_CHANGE: 5,
    ACHIEVEMENT_REWARD: 50,
    COSMIC_DISCOVERY: 15,
    QUANTUM_BREAKTHROUGH: 50,
    REALITY_SHIFT: 100
};

// 🌟 AI-ФУНКЦИИ
class CosmicAI {
    static generatePersonalizedGreeting(user) {
        const greetings = [
            `Приветствую, космический путешественник ${user.tg_first_name}! 🌠`,
            `Добро пожаловать в измерение творчества, ${user.tg_first_name}! 🚀`,
            `Светится ярко, ${user.tg_first_name}! Готов творить чудеса? ✨`,
            `Привет, ${user.tg_first_name}! Вселенная ждет твоего творчества! 🌌`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    static analyzeUserProgress(user) {
        const progress = (user.total_activities / 100) * 100;
        if (progress < 25) return "Начинающий исследователь";
        if (progress < 50) return "Опытный путешественник";
        if (progress < 75) return "Мастер реальностей";
        return "Архитектор вселенных";
    }

    static generateCosmicChallenge() {
        const challenges = [
            "Создайте планету с двумя солнцами",
            "Нарисуйте звуковую волну в цвете",
            "Спроектируйте город в 4D пространстве",
            "Создайте существо из темной материи"
        ];
        return challenges[Math.floor(Math.random() * challenges.length)];
    }
}

// 🌟 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function calculateCosmicLevel(sparks) {
    if (sparks >= 10000) return 'Создатель';
    if (sparks >= 5000) return 'Архитектор Реальности';
    if (sparks >= 2500) return 'Повелитель Времени';
    if (sparks >= 1000) return 'Звездный Мастер';
    if (sparks >= 500) return 'Космический Путешественник';
    if (sparks >= 250) return 'Искатель Истины';
    if (sparks >= 100) return 'Новичок Вселенной';
    return 'Земной Обитатель';
}

function addQuantumSparks(userId, sparks, activityType, description) {
    const user = db.users.find(u => u.user_id == userId);
    if (user) {
        // 🌟 Квантовый множитель для активных пользователей
        const quantumMultiplier = user.total_activities > 50 ? 1.5 : 1;
        const finalSparks = sparks * quantumMultiplier;
        
        user.sparks = Math.max(0, user.sparks + finalSparks);
        user.level = calculateCosmicLevel(user.sparks);
        user.last_active = new Date().toISOString();
        user.total_activities = (user.total_activities || 0) + 1;
        
        const activity = {
            id: Date.now(),
            user_id: userId,
            activity_type: activityType,
            sparks_earned: finalSparks,
            description: description,
            quantum_boost: quantumMultiplier > 1 ? `${quantumMultiplier}x` : null,
            created_at: new Date().toISOString(),
            cosmic_timestamp: Date.now()
        };
        
        db.activities.push(activity);
        
        // 🌟 Проверка квантовых достижений
        checkQuantumAchievements(userId);
        
        return activity;
    }
    return null;
}

function checkQuantumAchievements(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return;

    const userActivities = db.activities.filter(a => a.user_id == userId);
    const userAchievements = db.user_achievements.filter(ua => ua.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(qc => qc.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(mc => mc.user_id == userId && mc.completed);

    db.achievements.forEach(achievement => {
        const hasAchievement = userAchievements.some(ua => ua.achievement_id == achievement.id);
        if (hasAchievement) return;

        let conditionMet = false;

        switch (achievement.condition_type) {
            case 'registration':
                conditionMet = user.is_registered;
                break;
            case 'quiz_completion':
                conditionMet = quizCompletions.length >= parseInt(achievement.condition_value);
                break;
            case 'work_upload':
                conditionMet = works.length >= parseInt(achievement.condition_value);
                break;
            case 'sparks_total':
                conditionMet = user.sparks >= parseInt(achievement.condition_value);
                break;
            case 'marathon_completion':
                conditionMet = marathonCompletions.length >= parseInt(achievement.condition_value);
                break;
            case 'cosmic_level':
                conditionMet = user.cosmic_level >= parseInt(achievement.condition_value);
                break;
        }

        if (conditionMet) {
            const userAchievement = {
                id: Date.now(),
                user_id: userId,
                achievement_id: achievement.id,
                earned_at: new Date().toISOString(),
                sparks_claimed: false,
                cosmic_ceremony: true
            };
            
            db.user_achievements.push(userAchievement);
            
            const notification = {
                id: Date.now(),
                user_id: userId,
                title: "🏆 Квантовое Достижение!",
                message: `Вы достигли: "${achievement.title}"! Вселенная аплодирует вам!`,
                type: "quantum_achievement",
                is_read: false,
                created_at: new Date().toISOString(),
                cosmic_effects: ['star_burst', 'nebula_glow']
            };
            
            db.notifications.push(notification);

            // 🌟 Дополнительные искры за достижение
            addQuantumSparks(userId, achievement.sparks_reward, 'quantum_achievement', `Достижение: ${achievement.title}`);
        }
    });
}

function getUserQuantumStats(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return null;
    
    const activities = db.activities.filter(a => a.user_id == userId);
    const purchases = db.purchases.filter(p => p.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(q => q.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(m => m.user_id == userId);
    const interactiveCompletions = db.interactive_completions.filter(i => i.user_id == userId);
    const userAchievements = db.user_achievements.filter(ua => ua.user_id == userId);
    
    const totalSparksEarned = activities.reduce((sum, a) => sum + a.sparks_earned, 0);
    const quantumEfficiency = totalSparksEarned > 0 ? (user.sparks / totalSparksEarned) * 100 : 0;
    
    return {
        totalActivities: activities.length,
        totalPurchases: purchases.length,
        totalWorks: works.length,
        approvedWorks: works.filter(w => w.status === 'approved').length,
        totalQuizzesCompleted: quizCompletions.length,
        totalMarathonsCompleted: marathonCompletions.filter(m => m.completed).length,
        totalInteractivesCompleted: interactiveCompletions.length,
        totalSparksEarned: totalSparksEarned,
        totalAchievements: userAchievements.length,
        quantumEfficiency: Math.round(quantumEfficiency),
        registrationDate: user.registration_date,
        lastActive: user.last_active,
        cosmicLevel: user.cosmic_level || 1,
        aiCompanion: user.ai_companion || 'NOVA-C1',
        realityShifts: activities.filter(a => a.activity_type === 'reality_shift').length
    };
}

// 🌟 MIDDLEWARE
const requireQuantumAdmin = (req, res, next) => {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ 
            error: 'Квантовая идентификация требуется',
            cosmic_solution: 'Добавьте userId к запросу'
        });
    }
    
    const admin = db.admins.find(a => a.user_id == userId);
    if (!admin) {
        return res.status(403).json({ 
            error: 'Требуется квантовый уровень доступа',
            cosmic_clearance: 'omega_level_required'
        });
    }
    
    req.admin = admin;
    next();
};

// 🌟 ОСНОВНЫЕ МАРШРУТЫ
app.get('/health', (req, res) => {
    res.json({ 
        status: 'QUANTUM_STABLE', 
        timestamp: new Date().toISOString(),
        version: '9.0.0',
        database: 'Cosmic-Memory-DB',
        quantum_entanglement: 'active',
        users: db.users.length,
        quizzes: db.quizzes.length,
        marathons: db.marathons.length,
        shop_items: db.shop_items.length,
        interactives: db.interactives.length,
        posts: db.posts.length,
        cosmic_energy: `${Math.random() * 100 + 900} GW`
    });
});

// 🌟 WEBAPP API - КОСМИЧЕСКАЯ ВЕРСИЯ
app.get('/api/users/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (user) {
        const stats = getUserQuantumStats(userId);
        const userAchievements = db.user_achievements
            .filter(ua => ua.user_id === userId)
            .map(ua => {
                const achievement = db.achievements.find(a => a.id === ua.achievement_id);
                return {
                    ...ua,
                    title: achievement?.title,
                    description: achievement?.description,
                    icon: achievement?.icon,
                    sparks_reward: achievement?.sparks_reward,
                    cosmic_tier: achievement?.cosmic_tier
                };
            });
        
        const notifications = db.notifications
            .filter(n => n.user_id === userId && !n.is_read)
            .slice(0, 10);
        
        const aiGreeting = CosmicAI.generatePersonalizedGreeting(user);
        const progressTitle = CosmicAI.analyzeUserProgress(user);
        const dailyChallenge = CosmicAI.generateCosmicChallenge();
            
        res.json({ 
            exists: true, 
            user: {
                ...user,
                stats: stats,
                achievements: userAchievements,
                unread_notifications: notifications.length,
                ai_data: {
                    greeting: aiGreeting,
                    progress_title: progressTitle,
                    daily_challenge: dailyChallenge,
                    companion: user.ai_companion || 'NOVA-C1'
                }
            }
        });
    } else {
        const newUser = {
            id: Date.now(),
            user_id: userId,
            tg_first_name: 'Космический Искатель',
            sparks: 0,
            level: 'Земной Обитатель',
            is_registered: false,
            class: null,
            character_id: null,
            character_name: null,
            available_buttons: [],
            registration_date: new Date().toISOString(),
            last_active: new Date().toISOString(),
            total_activities: 0,
            completed_quizzes: 0,
            completed_marathons: 0,
            uploaded_works: 0,
            cosmic_level: 1,
            nebula_badges: [],
            ai_companion: 'NOVA-C1'
        };
        db.users.push(newUser);
        res.json({ 
            exists: false, 
            user: newUser,
            ai_greeting: CosmicAI.generatePersonalizedGreeting(newUser)
        });
    }
});

// 🌟 КВАНТОВАЯ РЕГИСТРАЦИЯ
app.post('/api/users/register', (req, res) => {
    const { userId, firstName, roleId, characterId } = req.body;
    
    if (!userId || !firstName || !roleId) {
        return res.status(400).json({ 
            error: 'Квантовые параметры отсутствуют',
            required: ['userId', 'firstName', 'roleId']
        });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !role) {
        return res.status(404).json({ 
            error: 'Квантовая аномалия: пользователь или роль не найдены',
            cosmic_solution: 'Проверьте параметры подключения'
        });
    }
    
    const isNewUser = !user.is_registered;
    
    user.tg_first_name = firstName;
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.is_registered = true;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    user.cosmic_level = 1;
    user.ai_companion = characterId === 1 ? 'NOVA-X1' : 'ORACLE-Ω';
    
    let message = 'Квантовая регистрация успешна! 🌌';
    let sparksAdded = 0;
    
    if (isNewUser) {
        sparksAdded = QUANTUM_SPARKS_SYSTEM.REGISTRATION_BONUS;
        addQuantumSparks(userId, sparksAdded, 'quantum_registration', 'Вход в космическую сеть');
        message = `Регистрация успешна! +${sparksAdded}✨ | Добро пожаловать в космос!`;
        
        const notification = {
            id: Date.now(),
            user_id: userId,
            title: "🌠 Добро пожаловать в Космос!",
            message: "Вы стали частью межгалактического сообщества творцов! Начните с квантового квиза.",
            type: "cosmic_welcome",
            is_read: false,
            created_at: new Date().toISOString(),
            cosmic_effects: ['star_trail', 'nebula_welcome']
        };
        db.notifications.push(notification);
    }
    
    res.json({ 
        success: true, 
        message, 
        sparksAdded,
        user: user,
        quantum_data: {
            clearance_level: 'cosmic_novice',
            ai_companion: user.ai_companion,
            available_dimensions: ['reality_alpha', 'dream_beta']
        }
    });
});

// 🌟 КОСМИЧЕСКАЯ СМЕНА РОЛИ
app.post('/api/users/change-role', (req, res) => {
    const { userId, roleId, characterId } = req.body;
    
    if (!userId || !roleId) {
        return res.status(400).json({ 
            error: 'Квантовые координаты не указаны',
            required: ['userId', 'roleId']
        });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!user || !role) {
        return res.status(404).json({ 
            error: 'Реальность не обнаружена',
            cosmic_solution: 'Проверьте параметры перехода'
        });
    }
    
    if (!user.is_registered) {
        return res.status(400).json({ 
            error: 'Требуется квантовая регистрация',
            solution: 'Завершите процесс инициализации'
        });
    }
    
    const oldRole = user.class;
    const oldCompanion = user.ai_companion;
    
    user.class = role.name;
    user.character_id = characterId;
    user.character_name = character ? character.name : null;
    user.available_buttons = role.available_buttons;
    user.last_active = new Date().toISOString();
    user.ai_companion = characterId === 1 ? 'NOVA-X1' : 'ORACLE-Ω';
    
    addQuantumSparks(userId, QUANTUM_SPARKS_SYSTEM.ROLE_CHANGE, 'quantum_role_change', 
        `Смена реальности: ${oldRole} → ${role.name}`);
    
    res.json({ 
        success: true, 
        message: 'Квантовый переход успешен! 🌟',
        user: user,
        transition_data: {
            from_reality: oldRole,
            to_reality: role.name,
            ai_companion: {
                previous: oldCompanion,
                current: user.ai_companion
            },
            cosmic_powers: role.cosmic_powers
        }
    });
});

// 🌟 API ДЛЯ КОСМИЧЕСКИХ РОЛЕЙ
app.get('/api/webapp/roles', (req, res) => {
    const roles = db.roles.filter(role => role.is_active)
        .map(role => ({
            ...role,
            quantum_data: {
                power_level: role.cosmic_powers ? role.cosmic_powers.length * 10 : 10,
                dimension_access: ['alpha', 'beta', 'gamma'],
                training_complexity: 'cosmic'
            }
        }));
    res.json(roles);
});

// 🌟 API ДЛЯ КВАНТОВЫХ ПЕРСОНАЖЕЙ
app.get('/api/webapp/characters/:roleId', (req, res) => {
    const roleId = parseInt(req.params.roleId);
    const characters = db.characters.filter(char => char.role_id === roleId && char.is_active)
        .map(character => ({
            ...character,
            quantum_abilities: character.cosmic_abilities,
            companion_features: ['ai_guidance', 'quantum_calculations', 'reality_navigation']
        }));
    res.json(characters);
});

// 🌟 КОСМИЧЕСКИЕ КВИЗЫ
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
            last_completion: completion ? completion.completed_at : null,
            user_perfect_score: completion ? completion.perfect_score : false,
            quantum_rewards: quiz.cosmic_rewards,
            ai_difficulty: quiz.difficulty
        };
    });
    
    res.json(quizzesWithStatus);
});

// 🌟 ОТПРАВКА РЕЗУЛЬТАТОВ КВАНТОВОГО КВИЗА
app.post('/api/webapp/quizzes/:quizId/submit', (req, res) => {
    const quizId = parseInt(req.params.quizId);
    const { userId, answers } = req.body;
    
    if (!userId) {
        return res.status(400).json({ 
            error: 'Квантовая идентификация потеряна',
            solution: 'Переподключитесь к сети'
        });
    }
    
    const quiz = db.quizzes.find(q => q.id === quizId);
    if (!quiz) {
        return res.status(404).json({ 
            error: 'Квиз-реальность не обнаружена',
            cosmic_solution: 'Проверьте координаты квиза'
        });
    }
    
    const existingCompletion = db.quiz_completions.find(
        qc => qc.user_id === userId && qc.quiz_id === quizId
    );
    
    if (existingCompletion && !quiz.allow_retake) {
        return res.status(400).json({ 
            error: 'Квантовый закон запрещает повторное прохождение этой реальности'
        });
    }
    
    if (existingCompletion && quiz.cooldown_hours > 0) {
        const lastCompletion = new Date(existingCompletion.completed_at);
        const now = new Date();
        const hoursSinceCompletion = (now - lastCompletion) / (1000 * 60 * 60);
        
        if (hoursSinceCompletion < quiz.cooldown_hours) {
            const hoursLeft = Math.ceil(quiz.cooldown_hours - hoursSinceCompletion);
            return res.status(400).json({ 
                error: `Квантовая перезарядка: ${hoursLeft} часов до нового прохождения` 
            });
        }
    }
    
    let correctAnswers = 0;
    const results = quiz.questions.map((question, index) => {
        const isCorrect = answers[index] === question.correctAnswer;
        if (isCorrect) correctAnswers++;
        return {
            questionId: question.id,
            question: question.question,
            userAnswer: answers[index],
            correctAnswer: question.correctAnswer,
            isCorrect: isCorrect,
            explanation: question.explanation,
            quantum_analysis: `Точность: ${isCorrect ? '100%' : '0%'}`
        };
    });
    
    let sparksEarned = 0;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    sparksEarned = correctAnswers * quiz.sparks_per_correct;
    
    if (perfectScore) {
        sparksEarned += quiz.sparks_perfect_bonus;
        // 🌟 Дополнительная космическая награда за идеальный результат
        sparksEarned += QUANTUM_SPARKS_SYSTEM.QUANTUM_BREAKTHROUGH;
    }
    
    if (existingCompletion) {
        existingCompletion.score = correctAnswers;
        existingCompletion.sparks_earned = sparksEarned;
        existingCompletion.perfect_score = perfectScore;
        existingCompletion.completed_at = new Date().toISOString();
        existingCompletion.quantum_attempt = (existingCompletion.quantum_attempt || 1) + 1;
    } else {
        db.quiz_completions.push({
            id: Date.now(),
            user_id: userId,
            quiz_id: quizId,
            completed_at: new Date().toISOString(),
            score: correctAnswers,
            total_questions: quiz.questions.length,
            sparks_earned: sparksEarned,
            perfect_score: perfectScore,
            time_spent: req.body.timeSpent || 0,
            quantum_attempt: 1,
            cosmic_accuracy: (correctAnswers / quiz.questions.length) * 100
        });
    }
    
    if (sparksEarned > 0) {
        addQuantumSparks(userId, sparksEarned, 'quantum_quiz', `Квиз: ${quiz.title}`);
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (user) {
        user.completed_quizzes = db.quiz_completions.filter(qc => qc.user_id === userId).length;
    }
    
    res.json({
        success: true,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        sparksEarned,
        perfectScore,
        scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
        results: results,
        quantum_analysis: {
            performance: perfectScore ? 'LEGENDARY' : correctAnswers > quiz.questions.length / 2 ? 'EXCELLENT' : 'GOOD',
            reward_multiplier: perfectScore ? 2 : 1,
            next_level_unlock: correctAnswers >= quiz.questions.length / 2
        },
        message: perfectScore ? 
            `🌌 КВАНТОВЫЙ ПРОРЫВ! +${sparksEarned}✨ (${correctAnswers}×${quiz.sparks_per_correct} + ${quiz.sparks_perfect_bonus} бонус + ${QUANTUM_SPARKS_SYSTEM.QUANTUM_BREAKTHROUGH} прорыв!)` : 
            `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨`
    });
});

// 🌟 МАРАФОНЫ МНОГОМЕРНОГО ПРОСТРАНСТВА
app.get('/api/webapp/marathons', (req, res) => {
    const userId = parseInt(req.query.userId);
    const marathons = db.marathons.filter(m => m.is_active);
    
    const marathonsWithStatus = marathons.map(marathon => {
        const completion = db.marathon_completions.find(
            mc => mc.user_id === userId && mc.marathon_id === marathon.id
        );
        
        const currentTask = completion ? marathon.tasks[completion.current_day - 1] : marathon.tasks[0];
        const submissions = db.marathon_submissions.filter(
            ms => ms.user_id === userId && ms.marathon_id === marathon.id
        );
        
        return {
            ...marathon,
            completed: completion ? completion.completed : false,
            current_day: completion ? completion.current_day : 1,
            progress: completion ? completion.progress : 0,
            started_at: completion ? completion.started_at : null,
            current_task: currentTask,
            submissions: submissions,
            can_continue: completion && !completion.completed,
            quantum_tools: marathon.cosmic_tools,
            cosmic_rewards: marathon.cosmic_rewards
        };
    });
    
    res.json(marathonsWithStatus);
});

// 🌟 ОТПРАВКА КОСМИЧЕСКОЙ РАБОТЫ В МАРАФОНЕ
app.post('/api/webapp/marathons/:marathonId/submit-day', (req, res) => {
    const marathonId = parseInt(req.params.marathonId);
    const { userId, day, submission_text, submission_image, quantum_data } = req.body;
    
    if (!userId || !day) {
        return res.status(400).json({ 
            error: 'Космические координаты не определены',
            required: ['userId', 'day']
        });
    }
    
    const marathon = db.marathons.find(m => m.id === marathonId);
    if (!marathon) {
        return res.status(404).json({ 
            error: 'Марафон-реальность не найдена',
            cosmic_solution: 'Проверьте параметры входа'
        });
    }
    
    const task = marathon.tasks.find(t => t.day === day);
    if (!task) {
        return res.status(404).json({ 
            error: 'Квантовое задание потеряно в пространстве-времени'
        });
    }
    
    if (task.requires_submission && !submission_text && !submission_image) {
        return res.status(400).json({ 
            error: 'Требуется квантовый артефакт для завершения задания'
        });
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
            started_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            quantum_journey: true
        };
        db.marathon_completions.push(completion);
    }
    
    if (completion.current_day !== day) {
        return res.status(400).json({ 
            error: 'Нарушение временного континуума: неверный день марафона'
        });
    }
    
    if (submission_text || submission_image) {
        const existingSubmission = db.marathon_submissions.find(
            ms => ms.user_id === userId && ms.marathon_id === marathonId && ms.day === day
        );
        
        if (!existingSubmission) {
            db.marathon_submissions.push({
                id: Date.now(),
                user_id: userId,
                marathon_id: marathonId,
                day: day,
                submission_text: submission_text,
                submission_image: submission_image,
                submitted_at: new Date().toISOString(),
                status: 'pending',
                quantum_data: quantum_data || {}
            });
        }
    }
    
    const sparksEarned = marathon.sparks_per_day;
    addQuantumSparks(userId, sparksEarned, 'cosmic_marathon_day', 
        `Марафон: ${marathon.title} - день ${day}`);
    
    completion.current_day = day + 1;
    completion.progress = Math.round((day / marathon.duration_days) * 100);
    completion.last_activity = new Date().toISOString();
    
    if (day >= marathon.duration_days) {
        completion.completed = true;
        completion.progress = 100;
        completion.completed_at = new Date().toISOString();
        
        const marathonBonus = marathon.sparks_completion_bonus;
        addQuantumSparks(userId, marathonBonus, 'cosmic_marathon_completion', 
            `Завершение марафона: ${marathon.title}`);
        
        // 🌟 Дополнительная космическая награда
        addQuantumSparks(userId, QUANTUM_SPARKS_SYSTEM.REALITY_SHIFT, 'reality_shift',
            'Создание новой реальности');
        
        const user = db.users.find(u => u.user_id == userId);
        if (user) {
            user.completed_marathons = db.marathon_completions.filter(mc => mc.user_id === userId && mc.completed).length;
            user.cosmic_level = (user.cosmic_level || 1) + 1;
        }
    }
    
    res.json({
        success: true,
        sparksEarned,
        currentDay: completion.current_day,
        progress: completion.progress,
        completed: completion.completed,
        completionBonus: completion.completed ? marathon.sparks_completion_bonus : 0,
        quantum_rewards: completion.completed ? marathon.cosmic_rewards : [],
        cosmic_level_up: completion.completed ? true : false,
        message: completion.completed ? 
            `🌠 МИР СОЗДАН! +${sparksEarned}✨ (день) + ${marathon.sparks_completion_bonus}✨ (марафон) + ${QUANTUM_SPARKS_SYSTEM.REALITY_SHIFT}✨ (реальность!)` : 
            `День ${day} завершен! +${sparksEarned}✨`
    });
});

// 🌟 КОСМИЧЕСКИЙ МАГАЗИН
app.get('/api/webapp/shop/items', (req, res) => {
    const items = db.shop_items.filter(item => item.is_active)
        .map(item => ({
            ...item,
            quantum_features: item.cosmic_features,
            ai_instructor: item.instructor,
            reality_access: item.category === 'reality_design' ? ['multiverse', 'parallel_worlds'] : ['standard']
        }));
    res.json(items);
});

// 🌟 КВАНТОВАЯ ПОКУПКА
app.post('/api/webapp/shop/purchase', (req, res) => {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
        return res.status(400).json({ 
            error: 'Квантовые параметры транзакции не определены',
            required: ['userId', 'itemId']
        });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const item = db.shop_items.find(i => i.id == itemId && i.is_active);
    
    if (!user) return res.status(404).json({ 
        error: 'Пользовательская реальность не обнаружена'
    });
    if (!item) return res.status(404).json({ 
        error: 'Квантовый артефакт не найден в этом измерении'
    });
    
    const existingPurchase = db.purchases.find(
        p => p.user_id === userId && p.item_id === itemId
    );
    
    if (existingPurchase) {
        return res.status(400).json({ 
            error: 'Артефакт уже находится в вашей коллекции реальностей'
        });
    }
    
    if (user.sparks < item.price) {
        return res.status(400).json({ 
            error: 'Недостаточно квантовой энергии',
            solution: 'Заработайте больше искр через творчество'
        });
    }
    
    user.sparks -= item.price;
    
    const purchase = {
        id: Date.now(),
        user_id: userId,
        item_id: itemId,
        price_paid: item.price,
        purchased_at: new Date().toISOString(),
        status: 'completed',
        quantum_delivery: 'instant',
        reality_access: item.cosmic_features || []
    };
    
    db.purchases.push(purchase);
    
    addQuantumSparks(userId, -item.price, 'quantum_purchase', `Покупка: ${item.title}`);
    
    const notification = {
        id: Date.now(),
        user_id: userId,
        title: "🛒 Квантовая Покупка!",
        message: `Вы приобрели "${item.title}" за ${item.price}✨ | Доступ к новым реальностям открыт!`,
        type: "cosmic_purchase",
        is_read: false,
        created_at: new Date().toISOString(),
        cosmic_effects: ['reality_unlock', 'knowledge_download']
    };
    db.notifications.push(notification);
    
    res.json({
        success: true,
        message: `Квантовая покупка успешна! 🎆`,
        remainingSparks: user.sparks,
        purchase: purchase,
        quantum_unlocks: item.cosmic_features || []
    });
});

// 🌟 API ДЛЯ КОСМИЧЕСКИХ ИНТЕРАКТИВОВ
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
            user_score: completion ? completion.score : 0,
            can_retake: interactive.allow_retake && (!completion || interactive.allow_retake),
            quantum_data: interactive.cosmic_data,
            reality_type: interactive.category
        };
    });
    
    res.json(interactivesWithStatus);
});

// 🌟 ПРОДОЛЖЕНИЕ ФАЙЛА server.js...

// 🌟 ОТПРАВКА РЕЗУЛЬТАТОВ КОСМИЧЕСКОГО ИНТЕРАКТИВА
app.post('/api/webapp/interactives/:interactiveId/submit', (req, res) => {
    const interactiveId = parseInt(req.params.interactiveId);
    const { userId, answer, quantum_analysis } = req.body;
    
    if (!userId) {
        return res.status(400).json({ 
            error: 'Квантовый наблюдатель не идентифицирован'
        });
    }
    
    const interactive = db.interactives.find(i => i.id === interactiveId);
    if (!interactive) {
        return res.status(404).json({ 
            error: 'Интерактивная реальность не обнаружена'
        });
    }
    
    const existingCompletion = db.interactive_completions.find(
        ic => ic.user_id === userId && ic.interactive_id === interactiveId
    );
    
    if (existingCompletion && !interactive.allow_retake) {
        return res.status(400).json({ 
            error: 'Эта реальность уже исследована вами'
        });
    }
    
    const isCorrect = answer === interactive.correct_answer;
    const sparksEarned = isCorrect ? interactive.sparks_reward : 0;
    
    if (existingCompletion) {
        existingCompletion.score = isCorrect ? 1 : 0;
        existingCompletion.sparks_earned = sparksEarned;
        existingCompletion.completed_at = new Date().toISOString();
        existingCompletion.answer = answer;
        existingCompletion.quantum_analysis = quantum_analysis;
    } else {
        db.interactive_completions.push({
            id: Date.now(),
            user_id: userId,
            interactive_id: interactiveId,
            completed_at: new Date().toISOString(),
            score: isCorrect ? 1 : 0,
            sparks_earned: sparksEarned,
            answer: answer,
            time_spent: req.body.timeSpent || 0,
            quantum_analysis: quantum_analysis,
            reality_understanding: isCorrect ? 'complete' : 'partial'
        });
    }
    
    if (sparksEarned > 0) {
        addQuantumSparks(userId, sparksEarned, 'cosmic_interactive', 
            `Интерактив: ${interactive.title}`);
    }
    
    res.json({
        success: true,
        correct: isCorrect,
        score: isCorrect ? 1 : 0,
        sparksEarned: sparksEarned,
        quantum_insight: interactive.cosmic_data ? 'data_analyzed' : 'no_data',
        message: isCorrect ? 
            `🌌 КОСМИЧЕСКАЯ ИСТИНА! +${sparksEarned}✨` : 
            'Продолжайте исследование! Вселенная полна загадок.'
    });
});

// 🌟 ЗАГРУЗКА КОСМИЧЕСКИХ РАБОТ
app.post('/api/webapp/upload-work', (req, res) => {
    const { userId, title, description, imageUrl, type, category, tags, quantum_signature } = req.body;
    
    if (!userId || !title || !imageUrl) {
        return res.status(400).json({ 
            error: 'Квантовые параметры творчества неполны',
            required: ['userId', 'title', 'imageUrl']
        });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return res.status(404).json({ 
        error: 'Творец не найден в этом измерении'
    });
    
    const newWork = {
        id: Date.now(),
        user_id: userId,
        title,
        description: description || '',
        image_url: imageUrl,
        type: type || 'cosmic_image',
        category: category || 'quantum_art',
        tags: tags || [],
        status: 'pending',
        created_at: new Date().toISOString(),
        moderated_at: null,
        moderator_id: null,
        admin_comment: null,
        likes_count: 0,
        comments_count: 0,
        quantum_signature: quantum_signature || 'standard_reality',
        cosmic_rating: 0,
        dimension: 'alpha'
    };
    
    db.user_works.push(newWork);
    
    user.uploaded_works = db.user_works.filter(w => w.user_id === userId).length;
    
    addQuantumSparks(userId, QUANTUM_SPARKS_SYSTEM.UPLOAD_WORK, 'cosmic_creation', 
        `Создание: ${title}`);
    
    res.json({
        success: true,
        message: `Космическое творение загружено! +${QUANTUM_SPARKS_SYSTEM.UPLOAD_WORK}✨`,
        workId: newWork.id,
        work: newWork,
        quantum_status: 'reality_stabilizing'
    });
});

// 🌟 КОСМИЧЕСКИЕ ПОСТЫ
app.get('/api/webapp/channel-posts', (req, res) => {
    const posts = db.posts
        .filter(p => p.is_active)
        .map(post => {
            const reviews = db.post_reviews.filter(r => r.post_id === post.post_id);
            const userReviews = req.query.userId ? 
                db.post_reviews.filter(r => r.user_id === parseInt(req.query.userId) && r.post_id === post.post_id) : [];
            
            return {
                ...post,
                reviews_count: reviews.length,
                average_rating: reviews.length > 0 ? 
                    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
                user_review: userReviews.length > 0 ? userReviews[0] : null,
                cosmic_tags: post.cosmic_tags,
                reality_impact: post.likes_count + post.comments_count
            };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
    res.json({ posts: posts });
});

// 🌟 ADMIN API - КВАНТОВАЯ АДМИНКА
app.get('/api/admin/stats', requireQuantumAdmin, (req, res) => {
    const stats = {
        totalUsers: db.users.length,
        registeredUsers: db.users.filter(u => u.is_registered).length,
        activeUsers: db.users.filter(u => {
            const lastActive = new Date(u.last_active);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return lastActive > thirtyDaysAgo;
        }).length,
        newUsersToday: db.users.filter(u => {
            const today = new Date().toDateString();
            return new Date(u.registration_date).toDateString() === today;
        }).length,
        activeQuizzes: db.quizzes.filter(q => q.is_active).length,
        activeMarathons: db.marathons.filter(m => m.is_active).length,
        shopItems: db.shop_items.filter(i => i.is_active).length,
        totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
        totalAdmins: db.admins.length,
        pendingReviews: db.post_reviews.filter(r => r.status === 'pending').length,
        pendingWorks: db.user_works.filter(w => w.status === 'pending').length,
        totalPosts: db.posts.filter(p => p.is_active).length,
        totalPurchases: db.purchases.length,
        totalActivities: db.activities.length,
        interactives: db.interactives.filter(i => i.is_active).length,
        totalEarnedSparks: db.activities.reduce((sum, a) => sum + a.sparks_earned, 0),
        totalSpentSparks: db.purchases.reduce((sum, p) => sum + p.price_paid, 0),
        cosmicEnergy: Math.round(Math.random() * 1000 + 5000),
        quantumStability: '99.9%',
        realityShifts: db.activities.filter(a => a.activity_type === 'reality_shift').length
    };
    res.json(stats);
});

// 🌟 СОЗДАНИЕ КОСМИЧЕСКОГО ПОСТА
app.post('/api/admin/channel-posts', requireQuantumAdmin, (req, res) => {
    const { post_id, title, content, image_url, video_url, media_type, action_type, action_target, cosmic_tags } = req.body;
    
    if (!post_id || !title) {
        return res.status(400).json({ 
            error: 'Квантовые параметры поста неполны',
            required: ['post_id', 'title']
        });
    }
    
    const existingPost = db.posts.find(p => p.post_id === post_id);
    if (existingPost) {
        return res.status(400).json({ 
            error: 'Пост с такими квантовыми координатами уже существует'
        });
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
        action_target: action_target || null,
        likes_count: 0,
        comments_count: 0,
        cosmic_tags: cosmic_tags || ['discovery'],
        reality_impact: 0
    };
    
    db.posts.push(newPost);
    
    res.json({ 
        success: true, 
        message: 'Космический пост создан! 🌠', 
        postId: newPost.id,
        post: newPost,
        quantum_broadcast: 'active'
    });
});

// 🌟 ДОБАВЛЕНИЕ КВАНТОВОГО АДМИНА
app.post('/api/admin/admins', requireQuantumAdmin, (req, res) => {
    const { user_id, username, role, permissions, cosmic_clearance } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ 
            error: 'Квантовый идентификатор обязателен',
            required: ['user_id']
        });
    }
    
    const existingAdmin = db.admins.find(a => a.user_id == user_id);
    if (existingAdmin) {
        return res.status(400).json({ 
            error: 'Квантовый администратор уже существует в этой реальности'
        });
    }
    
    const user = db.users.find(u => u.user_id == user_id);
    if (!user) {
        return res.status(404).json({ 
            error: 'Пользовательская реальность не обнаружена'
        });
    }
    
    const newAdmin = {
        id: Date.now(),
        user_id: parseInt(user_id),
        username: username || user.tg_username || '',
        role: role || 'quantum_moderator',
        permissions: permissions || ['users', 'content', 'moderation'],
        cosmic_clearance: cosmic_clearance || 'gamma_level',
        ai_assistant: true,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
    };
    
    db.admins.push(newAdmin);
    
    // 🌟 Уведомление пользователю
    const notification = {
        id: Date.now(),
        user_id: user_id,
        title: "🔧 Повышение до Квантового Администратора!",
        message: `Вам предоставлены права ${newAdmin.role} с уровнем доступа ${newAdmin.cosmic_clearance}`,
        type: "admin_promotion",
        is_read: false,
        created_at: new Date().toISOString(),
        cosmic_effects: ['authority_glow', 'access_granted']
    };
    db.notifications.push(notification);
    
    res.json({ 
        success: true, 
        message: 'Квантовый администратор добавлен! 🚀',
        admin: newAdmin,
        quantum_access: {
            clearance_level: newAdmin.cosmic_clearance,
            reality_control: permissions,
            ai_support: true
        }
    });
});

// 🌟 TELEGRAM BOT - КОСМИЧЕСКАЯ ВЕРСИЯ
let bot;
if (process.env.BOT_TOKEN) {
    try {
        bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
        
        console.log('🤖 Квантовый Телеграм Бот активирован');
        
        bot.onText(/\/start/, (msg) => {
            const chatId = msg.chat.id;
            const name = msg.from.first_name || 'Космический Искатель';
            const userId = msg.from.id;
            
            let user = db.users.find(u => u.user_id === userId);
            if (!user) {
                user = {
                    id: Date.now(),
                    user_id: userId,
                    tg_first_name: msg.from.first_name,
                    tg_username: msg.from.username,
                    sparks: 0,
                    level: 'Земной Обитатель',
                    is_registered: false,
                    class: null,
                    character_id: null,
                    character_name: null,
                    available_buttons: [],
                    registration_date: new Date().toISOString(),
                    last_active: new Date().toISOString(),
                    total_activities: 0,
                    completed_quizzes: 0,
                    completed_marathons: 0,
                    uploaded_works: 0,
                    cosmic_level: 1,
                    nebula_badges: [],
                    ai_companion: 'NOVA-C1'
                };
                db.users.push(user);
            } else {
                user.last_active = new Date().toISOString();
            }
            
            const welcomeText = `🌌 *Приветствую, ${name}!*

Добро пожаловать в *Космическую Мастерскую Вдохновения*!

✨ *Откройте портал в мир творчества:*
• 🚀 Проходите квантовые квизы
• 🌠 Участвуйте в межгалактических марафонах  
• 🪐 Создайте собственные вселенные
• 🤖 Получите AI-помощника
• 🔮 Исследуйте альтернативные реальности
• 💫 Зарабатывайте космические искры
• 🏆 Станьте Архитектором Реальности

*Готовы к путешествию?*`;

            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "🚀 Открыть Космический Портал",
                        web_app: { url: process.env.APP_URL || `https://your-domain.timeweb.cloud` }
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
                bot.sendMessage(chatId, '❌ *Квантовый доступ запрещен*\nТребуется уровень: Omega Clearance', {
                    parse_mode: 'Markdown'
                });
                return;
            }
            
            const baseUrl = process.env.APP_URL || 'https://your-domain.timeweb.cloud';
            const adminUrl = `${baseUrl}/admin.html?userId=${userId}`;
            
            const keyboard = {
                inline_keyboard: [[
                    {
                        text: "🔧 Открыть Квантовую Панель",
                        url: adminUrl
                    }
                ]]
            };
            
            bot.sendMessage(chatId, `🔧 *Квантовая Панель Управления*\n\nУровень доступа: *${admin.cosmic_clearance}*\n\nОткройте панель для управления реальностями:`, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        });

        bot.onText(/\/cosmic_stats/, (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id;
            
            const admin = db.admins.find(a => a.user_id == userId);
            if (!admin) {
                bot.sendMessage(chatId, '❌ Недостаточно квантовых прав');
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
            
            const statsText = `🌌 *Космическая Статистика:*
            
👥 *Пользователи:* ${stats.totalUsers}
✅ *Зарегистрировано:* ${stats.registeredUsers}
🎯 *Активных квизов:* ${stats.activeQuizzes}
🏃‍♂️ *Активных марафонов:* ${stats.activeMarathons}
🛒 *Товаров в магазине:* ${stats.shopItems}
✨ *Всего искр во вселенной:* ${stats.totalSparks.toFixed(1)}
⚡ *Квантовая энергия:* ${Math.round(Math.random() * 1000 + 5000)} GW`;
            
            bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        });

    } catch (error) {
        console.error('❌ Квантовая аномалия в боте:', error);
    }
}

// 🌟 ЗАПУСК КОСМИЧЕСКОГО СЕРВЕРА
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Космический сервер запущен на порту ${PORT}`);
    console.log(`🌌 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
    console.log(`🔧 Quantum Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
    console.log(`🎯 Квизов: ${db.quizzes.length}`);
    console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
    console.log(`🎮 Интерактивов: ${db.interactives.length}`);
    console.log(`🛒 Товаров: ${db.shop_items.length}`);
    console.log(`👥 Пользователей: ${db.users.length}`);
    console.log(`🌠 Космическая энергия: STABLE`);
    console.log(`🤖 AI Помощники: ACTIVE`);
    console.log('💫 Все системы работают на квантовом уровне!');
});
