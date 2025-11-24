import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, existsSync, createReadStream, statSync } from 'fs';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createCanvas, loadImage } from 'canvas';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const APP_ROOT = process.cwd();

// ==================== КОНФИГУРАЦИЯ БЕЗОПАСНОСТИ ====================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Слишком много запросов с этого IP, попробуйте позже'
});
app.use(limiter);

// ==================== КОНФИГУРАЦИЯ MULTER ДЛЯ ЗАГРУЗКИ ФАЙЛОВ ====================

// Создаем директории для загрузок
const uploadDirs = ['uploads', 'uploads/images', 'uploads/videos', 'uploads/avatars', 'uploads/works', 'uploads/previews'];
uploadDirs.forEach(dir => {
  const dirPath = join(APP_ROOT, dir);
  if (!existsSync(dirPath)) {
    fs.mkdir(dirPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = join(APP_ROOT, 'uploads');
    
    if (file.fieldname === 'avatar') {
      uploadDir = join(APP_ROOT, 'uploads/avatars');
    } else if (file.fieldname === 'workImage') {
      uploadDir = join(APP_ROOT, 'uploads/works');
    } else if (file.fieldname === 'preview_image') {
      uploadDir = join(APP_ROOT, 'uploads/previews');
    } else if (file.mimetype.startsWith('video/')) {
      uploadDir = join(APP_ROOT, 'uploads/videos');
    } else if (file.mimetype.startsWith('image/')) {
      uploadDir = join(APP_ROOT, 'uploads/images');
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = file.originalname.split('.').pop();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `${file.fieldname}-${uniqueSuffix}.${fileExt}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/quicktime'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (allowedImageTypes.includes(file.mimetype) || 
      allowedVideoTypes.includes(file.mimetype) ||
      allowedDocumentTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}. Разрешены: изображения, видео, PDF, Word`), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10 // максимум 10 файлов
  },
  fileFilter: fileFilter
});

// ==================== ОПТИМИЗАЦИЯ МЕДИА-КОНТЕНТА ====================

class MediaOptimizer {
  static async optimizeImage(inputPath, outputPath, options = {}) {
    try {
      const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 80,
        format = 'jpeg'
      } = options;

      let sharpInstance = sharp(inputPath);
      
      // Получаем метаданные для определения ориентации
      const metadata = await sharpInstance.metadata();
      
      // Автоповорот по EXIF
      sharpInstance = sharpInstance.rotate();
      
      // Ресайз с сохранением пропорций
      sharpInstance = sharpInstance.resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
      
      // Конвертация в выбранный формат
      switch (format) {
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ compressionLevel: 9 - Math.floor(quality / 11.111) });
          break;
        default:
          sharpInstance = sharpInstance.jpeg({ 
            quality, 
            mozjpeg: true,
            chromaSubsampling: '4:4:4'
          });
      }
      
      await sharpInstance.toFile(outputPath);
      
      const stats = await fs.stat(outputPath);
      const originalStats = await fs.stat(inputPath);
      
      return {
        success: true,
        size: stats.size,
        originalSize: originalStats.size,
        compressionRatio: ((originalStats.size - stats.size) / originalStats.size * 100).toFixed(1),
        path: outputPath,
        dimensions: metadata
      };
    } catch (error) {
      console.error('Ошибка оптимизации изображения:', error);
      return { success: false, error: error.message };
    }
  }

  static async createThumbnail(inputPath, outputPath, size = 300) {
    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 70 })
        .toFile(outputPath);
      
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAspectRatio(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const gcd = (a, b) => b === 0 ? a : this.gcd(b, a % b);
      const divisor = this.gcd(metadata.width, metadata.height);
      return {
        ratio: `${metadata.width / divisor}:${metadata.height / divisor}`,
        width: metadata.width,
        height: metadata.height,
        orientation: metadata.width >= metadata.height ? 'landscape' : 'portrait'
      };
    } catch (error) {
      return { ratio: '16:9', width: 1920, height: 1080, orientation: 'landscape' };
    }
  }

  static gcd(a, b) {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  static async generateBlurHash(imagePath) {
    try {
      const image = await loadImage(imagePath);
      const canvas = createCanvas(32, 32);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, 32, 32);
      
      const imageData = ctx.getImageData(0, 0, 32, 32);
      return this.encodeBlurHash(imageData);
    } catch (error) {
      return null;
    }
  }

  static encodeBlurHash(imageData) {
    // Упрощенная реализация BlurHash
    const pixels = imageData.data;
    let hash = '';
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      hash += this.base83.encode(Math.floor((r + g + b) / 3));
    }
    return hash.substring(0, 20); // Ограничиваем длину хеша
  }
}

// ==================== СИСТЕМА АУТЕНТИФИКАЦИИ ====================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SALT_ROUNDS = 12;

class AuthService {
  static async hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static generateToken(payload, expiresIn = '30d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static generateAdminInviteCode() {
    return uuidv4().substring(0, 8).toUpperCase();
  }
}

// ==================== IN-MEMORY БАЗА ДАННЫХ ====================

let db = {
  users: [
    {
      id: 1,
      user_id: 12345,
      tg_first_name: 'Тестовый Пользователь',
      tg_username: 'test_user',
      sparks: 45.5,
      level: 'Искатель',
      is_registered: true,
      class: 'Художники',
      character_id: 1,
      character_name: 'Лука Цветной',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      registration_date: new Date().toISOString(),
      last_active: new Date().toISOString(),
      avatar_url: null,
      email: null,
      phone: null,
      settings: {
        notifications: true,
        email_notifications: false,
        theme: 'light',
        language: 'ru'
      },
      achievements: [],
      badges: [],
      streak: 0,
      last_daily_reward: null
    },
    {
      id: 2,
      user_id: 898508164,
      tg_first_name: 'Администратор',
      tg_username: 'admin',
      sparks: 250.0,
      level: 'Мастер',
      is_registered: true,
      class: 'Художники',
      character_id: 1,
      character_name: 'Лука Цветной',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      registration_date: new Date().toISOString(),
      last_active: new Date().toISOString(),
      avatar_url: null,
      email: 'admin@example.com',
      phone: null,
      settings: {
        notifications: true,
        email_notifications: true,
        theme: 'dark',
        language: 'ru'
      },
      achievements: ['first_quiz', 'marathon_completion', 'work_upload'],
      badges: ['early_adopter', 'quiz_master'],
      streak: 7,
      last_daily_reward: new Date().toISOString()
    }
  ],
  roles: [
    {
      id: 1,
      name: 'Художники',
      description: 'Творцы изобразительного искусства',
      icon: '🎨',
      color: '#FF6B6B',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      requirements: {
        min_level: 0,
        required_achievements: []
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Стилисты',
      description: 'Мастера создания образов',
      icon: '👗',
      color: '#4ECDC4',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      requirements: {
        min_level: 0,
        required_achievements: []
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Мастера',
      description: 'Ремесленники прикладного искусства',
      icon: '🧵',
      color: '#45B7D1',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      requirements: {
        min_level: 0,
        required_achievements: []
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      name: 'Историки',
      description: 'Знатоки истории искусств',
      icon: '🏛️',
      color: '#96CEB4',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      requirements: {
        min_level: 0,
        required_achievements: []
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      name: 'Фотографы',
      description: 'Мастера светописи и композиции',
      icon: '📷',
      color: '#FFEAA7',
      available_buttons: ['quiz', 'marathon', 'works', 'activities', 'posts', 'shop', 'invite', 'interactives', 'change_role'],
      requirements: {
        min_level: 0,
        required_achievements: []
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  characters: [
    { 
      id: 1, 
      role_id: 1, 
      name: 'Лука Цветной', 
      description: 'Рисует с детства, любит эксперименты с цветом', 
      avatar_url: '/uploads/characters/luka.jpg',
      bonus_type: 'percent_bonus', 
      bonus_value: '10',
      bonus_description: '+10% к наградам за квизы',
      personality: 'Энергичный и креативный',
      quotes: ['"Цвет - это эмоция!"', '"Не бойся экспериментировать!"'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 2, 
      role_id: 1, 
      name: 'Марина Кисть', 
      description: 'Строгая преподавательница академической живописи', 
      avatar_url: '/uploads/characters/marina.jpg',
      bonus_type: 'forgiveness', 
      bonus_value: '1',
      bonus_description: '1 дополнительная попытка в квизах',
      personality: 'Строгая но справедливая',
      quotes: ['"Основа - это техника!"', '"Практика делает мастера!"'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 3, 
      role_id: 2, 
      name: 'Эстелла Моде', 
      description: 'Бывший стилист, обучает восприятию образа', 
      avatar_url: '/uploads/characters/estella.jpg',
      bonus_type: 'percent_bonus', 
      bonus_value: '5',
      bonus_description: '+5% к наградам за все активности',
      personality: 'Элегантная и проницательная',
      quotes: ['"Стиль - это самовыражение!"', '"Детали создают образ!"'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 4, 
      role_id: 3, 
      name: 'Артем Резчик', 
      description: 'Мастер по дереву и керамике', 
      avatar_url: '/uploads/characters/artem.jpg',
      bonus_type: 'random_gift', 
      bonus_value: '1-3',
      bonus_description: 'Случайный бонус 1-3 искры ежедневно',
      personality: 'Терпеливый и внимательный к деталям',
      quotes: ['"Ремесло требует терпения!"', '"Каждая деталь важна!"'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 5, 
      role_id: 4, 
      name: 'София Хроник', 
      description: 'Искусствовед и историк культуры', 
      avatar_url: '/uploads/characters/sofia.jpg',
      bonus_type: 'secret_advice', 
      bonus_value: '2weeks',
      bonus_description: 'Секретные подсказки раз в 2 недели',
      personality: 'Мудрая и эрудированная',
      quotes: ['"История учит нас красоте!"', '"Каждая эпоха уникальна!"'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 6, 
      role_id: 5, 
      name: 'Виктор Объектив', 
      description: 'Профессиональный фотограф с 20-летним опытом', 
      avatar_url: '/uploads/characters/viktor.jpg',
      bonus_type: 'quality_bonus', 
      bonus_value: '15',
      bonus_description: '+15% к наградам за фотографии',
      personality: 'Техничный и творческий',
      quotes: ['"Свет - это всё!"', '"Поймай момент!"'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  quizzes: [
    {
      id: 1,
      title: "🎨 Основы живописи",
      description: "Проверьте свои знания основ живописи и цветоведения",
      category: "art_basics",
      difficulty: "beginner",
      estimated_time: 10,
      questions: [
        {
          id: 1,
          question: "Кто написал картину 'Мона Лиза'?",
          options: ["Винсент Ван Гог", "Леонардо да Винчи", "Пабло Пикассо", "Клод Моне"],
          correctAnswer: 1,
          explanation: "Мона Лиза (Джоконда) была написана Леонардо да Винчи в период 1503-1505 годов.",
          image_url: "/uploads/quizzes/mona-lisa.jpg",
          points: 2
        },
        {
          id: 2,
          question: "Какие цвета являются основными в цветовом круге?",
          options: ["Красный, синий, зеленый", "Красный, желтый, синий", "Фиолетовый, оранжевый, зеленый", "Черный, белый, серый"],
          correctAnswer: 1,
          explanation: "Основные цвета - красный, желтый и синий. Из них можно получить все остальные цвета.",
          points: 2
        },
        {
          id: 3,
          question: "Что такое акварель?",
          options: ["Масляная краска", "Водорастворимая краска", "Акриловая краска", "Темпера"],
          correctAnswer: 1,
          explanation: "Акварель - это водорастворимые краски на основе гуммиарабика.",
          points: 1
        },
        {
          id: 4,
          question: "Кто является автором 'Крика'?",
          options: ["Винсент Ван Гог", "Эдвард Мунк", "Сальвадор Дали", "Фрида Кало"],
          correctAnswer: 1,
          explanation: "Эдвард Мунк написал 'Крик' в 1893 году как часть цикла 'Фриз жизни'.",
          image_url: "/uploads/quizzes/scream.jpg",
          points: 2
        },
        {
          id: 5,
          question: "Что такое сфумато?",
          options: ["Техника резких контрастов", "Техника мягких переходов", "Техника точечного нанесения", "Техника ярких цветов"],
          correctAnswer: 1,
          explanation: "Сфумато - техника мягких, дымчатых переходов между цветами и тонами.",
          points: 3
        }
      ],
      sparks_per_correct: 1,
      sparks_perfect_bonus: 5,
      cooldown_hours: 24,
      allow_retake: true,
      is_active: true,
      featured: true,
      tags: ["живопись", "основы", "история"],
      created_by: 898508164,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "🏛️ История искусства",
      description: "Тест по истории мирового искусства от античности до современности",
      category: "art_history",
      difficulty: "intermediate",
      estimated_time: 15,
      questions: [
        {
          id: 1,
          question: "В какой стране возникло искусство эпохи Возрождения?",
          options: ["Франция", "Италия", "Испания", "Германия"],
          correctAnswer: 1,
          explanation: "Возрождение зародилось в Италии в XIV веке.",
          points: 2
        },
        {
          id: 2,
          question: "Кто является автором фрески 'Тайная вечеря'?",
          options: ["Микеланджело", "Рафаэль", "Леонардо да Винчи", "Боттичелли"],
          correctAnswer: 2,
          explanation: "Леонардо да Винчи создал 'Тайную вечерю' в миланском монастыре Санта-Мария-делле-Грацие.",
          image_url: "/uploads/quizzes/last-supper.jpg",
          points: 3
        },
        {
          id: 3,
          question: "Какой стиль характеризуется асимметрией и изогнутыми линиями?",
          options: ["Ренессанс", "Барокко", "Готика", "Классицизм"],
          correctAnswer: 1,
          explanation: "Барокко отличается динамичностью, асимметрией и сложными изогнутыми формами.",
          points: 2
        },
        {
          id: 4,
          question: "Кто основал движение импрессионистов?",
          options: ["Поль Сезанн", "Клод Моне", "Винсент Ван Гог", "Поль Гоген"],
          correctAnswer: 1,
          explanation: "Клод Моне считается отцом импрессионизма, особенно после его картины 'Впечатление. Восходящее солнце'.",
          points: 2
        },
        {
          id: 5,
          question: "В каком веке возник кубизм?",
          options: ["XVIII век", "XIX век", "XX век", "XXI век"],
          correctAnswer: 2,
          explanation: "Кубизм возник в начале XX века, основателями считаются Пабло Пикассо и Жорж Брак.",
          points: 1
        }
      ],
      sparks_per_correct: 2,
      sparks_perfect_bonus: 10,
      cooldown_hours: 48,
      allow_retake: true,
      is_active: true,
      featured: false,
      tags: ["история", "возрождение", "импрессионизм"],
      created_by: 898508164,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      title: "👗 История моды и стиля",
      description: "Проверьте свои знания в области моды и стиля разных эпох",
      category: "fashion",
      difficulty: "intermediate",
      estimated_time: 12,
      questions: [
        {
          id: 1,
          question: "В какой период были популярны кринолины?",
          options: ["XVIII век", "XIX век", "1920-е", "1950-е"],
          correctAnswer: 1,
          explanation: "Кринолины стали особенно популярны в викторианскую эпоху, в середине XIX века.",
          image_url: "/uploads/quizzes/crinoline.jpg",
          points: 2
        },
        {
          id: 2,
          question: "Кто создал маленькое черное платье?",
          options: ["Коко Шанель", "Кристиан Диор", "Ив Сен-Лоран", "Живанши"],
          correctAnswer: 0,
          explanation: "Коко Шанель популяризировала маленькое черное платье в 1920-х годах.",
          points: 3
        }
      ],
      sparks_per_correct: 2,
      sparks_perfect_bonus: 8,
      cooldown_hours: 24,
      allow_retake: true,
      is_active: true,
      featured: true,
      tags: ["мода", "стиль", "история"],
      created_by: 898508164,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  marathons: [
    {
      id: 1,
      title: "🏃‍♂️ Марафон акварели",
      description: "7-дневный интенсив по основам акварельной живописи для начинающих",
      category: "painting",
      difficulty: "beginner",
      duration_days: 7,
      cover_image: "/uploads/marathons/watercolor-cover.jpg",
      tasks: [
        { 
          day: 1, 
          title: "🎨 Основные техники", 
          description: "Изучите основные техники работы с акварелью: заливка, лессировка, алла прима",
          detailed_description: "В этом уроке вы познакомитесь с тремя основными техниками акварели:\n\n• Заливка - создание ровного фона\n• Лессировка - нанесение прозрачных слоев\n• Алла прима - работа в один слой\n\nПрактическое задание: создайте три небольших работы, используя каждую из техник.",
          requires_submission: true,
          submission_type: "image",
          resources: [
            {
              type: "video",
              title: "Видеоурок по техникам",
              url: "/uploads/marathons/watercolor-techniques.mp4",
              duration: "15:30"
            },
            {
              type: "pdf",
              title: "Памятка по материалам",
              url: "/uploads/marathons/materials-guide.pdf"
            }
          ],
          sparks_reward: 7
        },
        { 
          day: 2, 
          title: "🌈 Смешивание цветов", 
          description: "Практикуйтесь в смешивании цветов и создайте свою цветовую палитру",
          detailed_description: "Научитесь создавать нужные оттенки из ограниченного набора цветов. Изучите цветовой круг и принципы смешивания.\n\nЗадание: создайте палитру из 12 гармоничных цветов и загрузите фото.",
          requires_submission: true,
          submission_type: "image",
          resources: [
            {
              type: "image",
              title: "Пример цветового круга",
              url: "/uploads/marathons/color-wheel.jpg"
            }
          ],
          sparks_reward: 7
        },
        { 
          day: 3, 
          title: "💡 Работа со светом", 
          description: "Научитесь передавать свет и тень в акварели",
          detailed_description: "Освойте технику сохранения белых областей и создания световых эффектов.\n\nЗадание: нарисуйте простой предмет с ярко выраженным светотеневым контрастом.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 7
        },
        { 
          day: 4, 
          title: "🌄 Пейзаж акварелью", 
          description: "Создайте свой первый пейзаж с небом и водой",
          detailed_description: "Учимся писать небо, облака, воду и отражения. Техника мокрым по мокрому для фона.\n\nЗадание: нарисуйте пейзаж с небом и водной поверхностью.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 7
        },
        { 
          day: 5, 
          title: "👤 Портрет акварелью", 
          description: "Освойте технику портрета акварелью",
          detailed_description: "Основы построения лица, передача объема и характера.\n\nЗадание: нарисуйте портрет по фото или с натуры.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 7
        },
        { 
          day: 6, 
          title: "🍎 Натюрморт", 
          description: "Создайте композицию с натуры",
          detailed_description: "Компоновка предметов, передача фактур и объемов.\n\nЗадание: составьте и нарисуйте натюрморт из 3-5 предметов.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 7
        },
        { 
          day: 7, 
          title: "🎉 Финальная работа", 
          description: "Завершите марафон итоговой работой и поделитесь впечатлениями",
          detailed_description: "Создайте работу, используя все изученные техники. Напишите о своих успехах и открытиях за неделю.\n\nЗадание: итоговая работа + эссе о пройденном пути.",
          requires_submission: true,
          submission_type: "both",
          sparks_reward: 15
        }
      ],
      sparks_per_day: 7,
      completion_bonus: 50,
      is_active: true,
      featured: true,
      participants_count: 0,
      success_rate: 0,
      created_by: 898508164,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "👗 Марафон стиля",
      description: "5-дневный интенсив по созданию гармоничного образа и определению своего стиля",
      category: "style",
      difficulty: "beginner",
      duration_days: 5,
      cover_image: "/uploads/marathons/style-cover.jpg",
      tasks: [
        { 
          day: 1, 
          title: "🎨 Анализ цветотипа", 
          description: "Определите свой цветотип и подходящую цветовую палитру",
          detailed_description: "Узнайте, какие цвета подчеркивают вашу природную красоту. Теория времен года.\n\nЗадание: определите свой цветотип и опишите результаты.",
          requires_submission: true,
          submission_type: "text",
          sparks_reward: 5
        },
        { 
          day: 2, 
          title: "👚 Базовая капсула", 
          description: "Создайте базовый гардероб на все случаи жизни",
          detailed_description: "Составьте список must-have вещей для вашего стиля.\n\nЗадание: создайте план базового гардероба и загрузите фото своих базовых вещей.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 5
        },
        { 
          day: 3, 
          title: "💎 Акценты и аксессуары", 
          description: "Научитесь дополнять образ аксессуарами",
          detailed_description: "Как выбрать украшения, сумки, обувь и другие детали.\n\nЗадание: создайте 3 образа с разными аксессуарами.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 5
        },
        { 
          day: 4, 
          title: "🌟 Стилизация", 
          description: "Создайте несколько образов для разных мероприятий",
          detailed_description: "Подбор одежды для работы, свидания, встречи с друзьями.\n\nЗадание: создайте 3 образа для разных ситуаций.",
          requires_submission: true,
          submission_type: "image",
          sparks_reward: 5
        },
        { 
          day: 5, 
          title: "🏆 Итоговый образ", 
          description: "Подберите идеальный образ для важного мероприятия",
          detailed_description: "Создайте продуманный образ от начала до конца.\n\nЗадание: полный образ с описанием выбора каждого элемента.",
          requires_submission: true,
          submission_type: "both",
          sparks_reward: 10
        }
      ],
      sparks_per_day: 5,
      completion_bonus: 30,
      is_active: true,
      featured: true,
      participants_count: 0,
      success_rate: 0,
      created_by: 898508164,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  shop_items: [
    {
      id: 1,
      title: "🎨 Урок акварели для начинающих",
      description: "Полный видеоурок по основам акварельной живописи от профессионального художника",
      type: "video",
      category: "painting",
      file_url: "/uploads/shop/watercolor-course.mp4",
      preview_url: "/uploads/shop/watercolor-preview.jpg",
      thumbnail_url: "/uploads/shop/watercolor-thumb.jpg",
      price: 15,
      content_text: "В этом подробном уроке вы научитесь:\n\n• Основным техникам работы с акварелью\n• Смешиванию цветов и созданию палитры\n• Передаче света и тени\n• Созданию композиции\n• Работе с разными сюжетами\n\nПродолжительность: 2 часа 15 минут\nУровень: начинающий\nФормат: HD видео + материалы\n\nПосле покупки видео будет доступно в вашем личном кабинете.",
      aspect_ratio: "16:9",
      duration: "2:15:00",
      file_size: "1.2 GB",
      instructor: "Анна Художник",
      instructor_bio: "Профессиональный художник с 10-летним опытом, преподаватель живописи",
      rating: 4.8,
      reviews_count: 47,
      students_count: 215,
      is_active: true,
      featured: true,
      tags: ["акварель", "живопись", "для начинающих"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "📚 Основы композиции",
      description: "PDF руководство по основам композиции в живописи и фотографии",
      type: "pdf",
      category: "theory",
      file_url: "/uploads/shop/composition-guide.pdf",
      preview_url: "/uploads/shop/composition-preview.jpg",
      thumbnail_url: "/uploads/shop/composition-thumb.jpg",
      price: 10,
      content_text: "Подробное руководство по построению гармоничной композиции в художественных работах.\n\nТемы:\n• Золотое сечение и правило третей\n• Баланс и симметрия\n• Создание глубины и перспективы\n• Работа с цветом и контрастом\n• Композиционные схемы\n• Практические упражнения\n\nОбъем: 85 страниц\nФормат: PDF (можно распечатать)\nЯзык: русский",
      aspect_ratio: "A4",
      file_size: "15 MB",
      pages: 85,
      instructor: "Максим Композитор",
      instructor_bio: "Искусствовед, преподаватель композиции",
      rating: 4.6,
      reviews_count: 23,
      students_count: 89,
      is_active: true,
      featured: false,
      tags: ["композиция", "теория", "руководство"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      title: "👗 Гид по стилю",
      description: "Полное руководство по созданию гармоничного образа и определению своего стиля",
      type: "text",
      category: "style",
      file_url: "",
      preview_url: "/uploads/shop/style-guide-preview.jpg",
      thumbnail_url: "/uploads/shop/style-guide-thumb.jpg",
      price: 12,
      content_text: "Как определить свой цветотип, подобрать базовый гардероб, сочетать цвета и аксессуары. Практические советы от профессионального стилиста.\n\nРазделы:\n• Определение цветотипа (теория времен года)\n• Создание базового гардероба\n• Сочетание цветов и принтов\n• Выбор аксессуаров и обуви\n• Создание образов для разных мероприятий\n• Уход за одеждой\n\nДополнительно: чек-листы и рабочие тетради",
      aspect_ratio: "16:9",
      instructor: "Елена Стилист",
      instructor_bio: "Профессиональный стилист с 8-летним опытом",
      rating: 4.7,
      reviews_count: 34,
      students_count: 127,
      is_active: true,
      featured: true,
      tags: ["стиль", "мода", "гардероб"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      title: "🎬 Видео-урок по композиции",
      description: "Эксклюзивный видео-урок по основам композиции от профессионального художника",
      type: "embed",
      category: "painting",
      file_url: "",
      preview_url: "/uploads/shop/composition-video-preview.jpg",
      thumbnail_url: "/uploads/shop/composition-video-thumb.jpg",
      price: 20,
      content_text: "Профессиональный видео-урок по основам композиции в живописи. Вы научитесь правильно располагать элементы на холсте, создавать гармоничные композиции и направлять взгляд зрителя.\n\nТемы урока:\n• Золотое сечение в практике\n• Правило третей и его применение\n• Баланс и симметрия\n• Создание глубины пространства\n• Работа с акцентами и доминантами\n• Композиционные ошибки и как их избежать\n\nПродолжительность: 1 час 45 минут\nУровень: начинающий и продолжающий",
      embed_html: `<div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
        <iframe src="https://player.vimeo.com/video/1139315921?h=93d70dfee4&title=0&byline=0&portrait=0" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
      </div>
      <script src="https://player.vimeo.com/api/player.js"></script>`,
      aspect_ratio: "16:9",
      duration: "1:45:00",
      instructor: "Алексей Мастер",
      instructor_bio: "Художник-педагог с 15-летним опытом, член Союза художников",
      rating: 4.9,
      reviews_count: 56,
      students_count: 189,
      is_active: true,
      featured: true,
      tags: ["композиция", "видео", "профессиональный"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      title: "🧵 Основы вышивки для начинающих",
      description: "Полный курс по основам вышивки от простых стежков до сложных техник",
      type: "video",
      category: "crafts",
      file_url: "/uploads/shop/embroidery-course.mp4",
      preview_url: "/uploads/shop/embroidery-preview.jpg",
      thumbnail_url: "/uploads/shop/embroidery-thumb.jpg",
      price: 18,
      content_text: "Курс по основам вышивки, который подойдет даже тем, кто никогда не держал иголку в руках.\n\nСодержание:\n• Необходимые материалы и инструменты\n• Основные стежки (10+ видов)\n• Техники вышивки гладью и крестиком\n• Создание узоров и орнаментов\n• Работа с цветом и композицией\n• Завершение и оформление работы\n\nПродолжительность: 3 часа\nБонус: схемы для вышивки",
      aspect_ratio: "16:9",
      duration: "3:00:00",
      file_size: "2.1 GB",
      instructor: "Ольга Иголочка",
      instructor_bio: "Мастер вышивки с 12-летним опытом, автор курсов",
      rating: 4.8,
      reviews_count: 41,
      students_count: 156,
      is_active: true,
      featured: false,
      tags: ["вышивка", "рукоделие", "для начинающих"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 6,
      title: "📸 Основы фотографии",
      description: "Курс по основам фотографии для начинающих фотографов",
      type: "video",
      category: "photography",
      file_url: "/uploads/shop/photography-course.mp4",
      preview_url: "/uploads/shop/photography-preview.jpg",
      thumbnail_url: "/uploads/shop/photography-thumb.jpg",
      price: 25,
      content_text: "Комплексный курс по основам фотографии, который научит вас делать профессиональные снимки даже на смартфон.\n\nТемы курса:\n• Основы экспозиции (выдержка, диафрагма, ISO)\n• Композиция в фотографии\n• Работа со светом и тенью\n• Портретная и пейзажная съемка\n• Обработка фотографий\n• Создание портфолио\n\nПродолжительность: 4 часа 30 минут\nУровень: начинающий",
      aspect_ratio: "16:9",
      duration: "4:30:00",
      file_size: "3.2 GB",
      instructor: "Дмитрий Фотограф",
      instructor_bio: "Профессиональный фотограф с 10-летним опытом, преподаватель",
      rating: 4.9,
      reviews_count: 78,
      students_count: 342,
      is_active: true,
      featured: true,
      tags: ["фотография", "съемка", "обработка"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  activities: [],
  admins: [
    { 
      id: 1, 
      user_id: 898508164, 
      username: 'admin', 
      email: 'admin@inspiration-studio.ru',
      role: 'super_admin', 
      permissions: ['all'],
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 2, 
      user_id: 79156202620, 
      username: 'moderator1', 
      email: 'moderator1@inspiration-studio.ru',
      role: 'content_moderator', 
      permissions: ['content', 'users', 'reports'],
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { 
      id: 3, 
      user_id: 781959267, 
      username: 'moderator2', 
      email: 'moderator2@inspiration-studio.ru',
      role: 'support_moderator', 
      permissions: ['users', 'support', 'reports'],
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  purchases: [],
  channel_posts: [
    {
      id: 1,
      post_id: "post_art_basics",
      title: "🎨 Основы композиции в живописи",
      content: "Сегодня поговорим о фундаментальных принципах построения композиции — основе любого художественного произведения!\n\n**Что такое композиция?**\nЭто организация элементов в пространстве картины, которая создает гармонию и направляет взгляд зрителя.\n\n**Ключевые принципы:**\n• **Золотое сечение** - природная пропорция 1:1.618\n• **Правило третей** - деление на 9 равных частей\n• **Баланс** - равновесие визуальных масс\n• **Ритм** - повторение элементов\n• **Контраст** - игра противоположностей\n\n💡 **Практический совет:** Попробуйте использовать правило третей в своей следующей работе — размещайте ключевые элементы на пересечениях линий или вдоль них.\n\n🎯 **Упражнение:** Возьмите любую свою старую работу и проанализируйте ее композицию. Что можно улучшить?",
      image_url: "/uploads/posts/composition-basics.jpg",
      video_url: null,
      media_type: 'image',
      aspect_ratio: "16:9",
      admin_id: 898508164,
      is_active: true,
      featured: true,
      tags: ["композиция", "основы", "живопись"],
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      scheduled_for: null
    },
    {
      id: 2,
      post_id: "post_style_tips",
      title: "👗 5 советов по созданию стильного образа",
      content: "Стиль — это не следование трендам, а умение выражать свою индивидуальность через одежду!\n\n**5 ключевых советов:**\n\n1. **Определите свой цветотип**\n   Подберите цвета, которые гармонируют с вашей внешностью\n\n2. **Создайте базовую капсулу**\n   Качественные вещи нейтральных цветов — основа гардероба\n\n3. **Не бойтесь аксессуаров**\n   Украшения, сумки, шарфы — это детали, которые создают образ\n\n4. **Учитывайте мероприятие**\n   Дресс-код и уместность — важные составляющие стиля\n\n5. **Будьте уверены в себе!**\n   Самое главное украшение — ваша уверенность\n\n✨ **Помните:** Настоящий стиль — это когда одежда становится продолжением вашей личности, а не маской.\n\n🎯 **Задание:** Проанализируйте свой гардероб. Какие вещи действительно отражают ваш характер?",
      image_url: "/uploads/posts/style-tips.jpg",
      video_url: null,
      media_type: 'image',
      aspect_ratio: "4:3",
      admin_id: 898508164,
      is_active: true,
      featured: false,
      tags: ["стиль", "мода", "гардероб"],
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      scheduled_for: null
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
      difficulty: "medium",
      image_url: "/uploads/interactives/guess-era.jpg",
      thumbnail_url: "/uploads/interactives/guess-era-thumb.jpg",
      question: "Какой эпохе принадлежит этот фрагмент?",
      options: ["Ренессанс", "Барокко", "Импрессионизм", "Кубизм"],
      correct_answer: 0,
      explanation: "Это фрагмент работы эпохи Возрождения — обратите внимание на гармоничные пропорции и ясность композиции.",
      sparks_reward: 3,
      time_limit: 30,
      allow_retake: false,
      is_active: true,
      featured: true,
      attempts_count: 0,
      success_rate: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      title: "👗 Подбери образ для мероприятия",
      description: "Создай гармоничный образ для конкретного события",
      type: "style_match",
      category: "style",
      difficulty: "easy",
      image_url: "/uploads/interactives/style-match.jpg",
      thumbnail_url: "/uploads/interactives/style-match-thumb.jpg",
      question: "Какое сочетание цветов подойдет для деловой встречи?",
      options: ["Черный + белый + красный акцент", "Ярко-красный + зеленый", "Фиолетовый + оранжевый", "Розовый + голубой"],
      correct_answer: 0,
      explanation: "Для деловой встречи лучше выбрать сдержанные цвета с одним акцентным — это создает образ уверенного профессионала.",
      sparks_reward: 2,
      time_limit: 20,
      allow_retake: true,
      is_active: true,
      featured: false,
      attempts_count: 0,
      success_rate: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  interactive_completions: [],
  interactive_submissions: [],
  marathon_submissions: [],
  sparks_transactions: [],
  achievements: [
    {
      id: 1,
      name: "Первый шаг",
      description: "Завершите регистрацию в системе",
      icon: "🎯",
      type: "registration",
      requirement: 1,
      sparks_reward: 10,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Любознательный",
      description: "Пройдите свой первый квиз",
      icon: "🧠",
      type: "quiz",
      requirement: 1,
      sparks_reward: 15,
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      name: "Творец",
      description: "Загрузите первую работу",
      icon: "🎨",
      type: "work",
      requirement: 1,
      sparks_reward: 20,
      is_active: true,
      created_at: new Date().toISOString()
    }
  ],
  user_achievements: [],
  notifications: [],
  settings: {
    sparks_system: {
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
      ROLE_CHANGE: 0,
      DAILY_LOGIN: 1,
      WEEKLY_STREAK: 10,
      MONTHLY_CHALLENGE: 25
    },
    levels: {
      Ученик: 0,
      Искатель: 50,
      Знаток: 150,
      Мастер: 300,
      Наставник: 400
    },
    app_settings: {
      max_file_size: 100,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "pdf", "doc", "docx"],
      daily_reward_limit: 1,
      weekly_marathon_limit: 2,
      max_works_per_day: 5
    }
  }
};

// ==================== УСИЛЕННАЯ СИСТЕМА НАЧИСЛЕНИЯ ИСКР ====================

class SparksSystem {
  static getSettings() {
    return db.settings.sparks_system;
  }

  static calculateLevel(sparks) {
    const levels = db.settings.levels;
    if (sparks >= levels.Наставник) return 'Наставник';
    if (sparks >= levels.Мастер) return 'Мастер';
    if (sparks >= levels.Знаток) return 'Знаток';
    if (sparks >= levels.Искатель) return 'Искатель';
    return 'Ученик';
  }

  static async addSparks(userId, sparks, activityType, description, adminId = null, metadata = {}) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return null;

    const oldBalance = user.sparks;
    user.sparks = Math.max(0, user.sparks + sparks);
    user.level = this.calculateLevel(user.sparks);
    user.last_active = new Date().toISOString();

    // Обновляем streak
    await this.updateUserStreak(user);

    // Логируем активность
    const activity = {
      id: Date.now(),
      user_id: userId,
      activity_type: activityType,
      sparks_earned: sparks,
      description: description,
      admin_id: adminId,
      created_at: new Date().toISOString(),
      metadata: metadata
    };
    
    db.activities.push(activity);

    // Логируем транзакцию
    const transaction = {
      id: Date.now(),
      user_id: userId,
      admin_id: adminId,
      amount: sparks,
      type: activityType,
      description: description,
      old_balance: oldBalance,
      new_balance: user.sparks,
      created_at: new Date().toISOString(),
      metadata: metadata
    };
    
    db.sparks_transactions.push(transaction);

    // Проверяем достижения
    await this.checkAchievements(userId, activityType);

    return { activity, transaction };
  }

  static async updateUserStreak(user) {
    const today = new Date().toDateString();
    const lastActive = new Date(user.last_active).toDateString();
    
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActive === yesterday.toDateString()) {
        user.streak += 1;
        
        // Награда за серию
        if (user.streak % 7 === 0) {
          const weeklyBonus = db.settings.sparks_system.WEEKLY_STREAK;
          await this.addSparks(user.user_id, weeklyBonus, 'weekly_streak', `Еженедельная награда за ${user.streak} дней`);
        }
      } else {
        user.streak = 1;
      }
    }
  }

  static async checkAchievements(userId, activityType) {
    const user = db.users.find(u => u.user_id == userId);
    const userAchievements = db.user_achievements.filter(ua => ua.user_id == userId);
    const achievements = db.achievements.filter(a => a.is_active && a.type === activityType);

    for (const achievement of achievements) {
      const hasAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
      if (hasAchievement) continue;

      let conditionMet = false;
      const userActivities = db.activities.filter(a => a.user_id == userId && a.activity_type === activityType);

      switch (activityType) {
        case 'registration':
          conditionMet = user.is_registered;
          break;
        case 'quiz':
          conditionMet = userActivities.length >= achievement.requirement;
          break;
        case 'work':
          const userWorks = db.user_works.filter(w => w.user_id == userId);
          conditionMet = userWorks.length >= achievement.requirement;
          break;
        // Добавьте другие типы достижений
      }

      if (conditionMet) {
        db.user_achievements.push({
          id: Date.now(),
          user_id: userId,
          achievement_id: achievement.id,
          earned_at: new Date().toISOString(),
          sparks_awarded: achievement.sparks_reward
        });

        user.achievements.push(achievement.name);
        await this.addSparks(userId, achievement.sparks_reward, 'achievement', `Достижение: ${achievement.name}`);
      }
    }
  }

  static getUserStats(userId) {
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return null;
    
    const activities = db.activities.filter(a => a.user_id == userId);
    const purchases = db.purchases.filter(p => p.user_id == userId);
    const works = db.user_works.filter(w => w.user_id == userId);
    const quizCompletions = db.quiz_completions.filter(q => q.user_id == userId);
    const marathonCompletions = db.marathon_completions.filter(m => m.user_id == userId);
    const interactiveCompletions = db.interactive_completions.filter(i => i.user_id == userId);
    const userAchievements = db.user_achievements.filter(ua => ua.user_id == userId);
    
    return {
      totalActivities: activities.length,
      totalPurchases: purchases.length,
      totalWorks: works.length,
      approvedWorks: works.filter(w => w.status === 'approved').length,
      totalQuizzesCompleted: quizCompletions.length,
      totalMarathonsCompleted: marathonCompletions.filter(m => m.completed).length,
      totalInteractivesCompleted: interactiveCompletions.length,
      totalAchievements: userAchievements.length,
      totalSparksEarned: activities.reduce((sum, a) => sum + a.sparks_earned, 0),
      totalSparksSpent: purchases.reduce((sum, p) => sum + p.price_paid, 0),
      currentStreak: user.streak,
      joinDate: user.registration_date,
      levelProgress: this.calculateLevelProgress(user.sparks)
    };
  }

  static calculateLevelProgress(sparks) {
    const levels = db.settings.levels;
    const currentLevel = this.calculateLevel(sparks);
    const nextLevel = this.getNextLevel(currentLevel);
    
    if (!nextLevel) return 100; // Максимальный уровень
    
    const currentLevelMin = levels[currentLevel];
    const nextLevelMin = levels[nextLevel];
    const progress = ((sparks - currentLevelMin) / (nextLevelMin - currentLevelMin)) * 100;
    
    return Math.min(Math.max(progress, 0), 100);
  }

  static getNextLevel(currentLevel) {
    const levelOrder = ['Ученик', 'Искатель', 'Знаток', 'Мастер', 'Наставник'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    return levelOrder[currentIndex + 1] || null;
  }
}

// ==================== MIDDLEWARE ====================

const requireAdmin = (req, res, next) => {
  const userId = req.query.userId || req.body.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }
  
  const admin = db.admins.find(a => a.user_id == userId && a.is_active);
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  req.admin = admin;
  next();
};

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = AuthService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== CORS НАСТРОЙКИ ====================

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://web.telegram.org',
      'https://oauth.telegram.org',
      process.env.APP_URL || 'https://your-domain.timeweb.cloud'
    ];
    
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('CORS не разрешен для этого origin'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent', 'tgwebviewdata'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==================== СТАТИЧЕСКИЕ ФАЙЛЫ ====================

app.use('/uploads', express.static(join(APP_ROOT, 'uploads'), {
  maxAge: '30d',
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 дней
    } else if (path.match(/\.(mp4|pdf)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 дней
    }
  }
}));

app.use(express.static(join(APP_ROOT, 'public'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (path.match(/\.(js|css)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 час
    }
  }
}));

app.use('/admin', express.static(join(APP_ROOT, 'admin'), {
  maxAge: '1h',
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// ==================== ОСНОВНЫЕ МАРШРУТЫ ====================

app.get('/', (req, res) => {
  res.sendFile(join(APP_ROOT, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(join(APP_ROOT, 'admin', 'index.html'));
});

app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      users: db.users.length,
      quizzes: db.quizzes.length,
      marathons: db.marathons.length,
      shop_items: db.shop_items.length,
      interactives: db.interactives.length
    }
  };
  res.json(health);
});

// ==================== API МАРШРУТЫ ====================

// Пользователи
app.get('/api/users/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = db.users.find(u => u.user_id === userId);
  
  if (user) {
    const stats = SparksSystem.getUserStats(userId);
    res.json({ 
      success: true,
      user: {
        ...user,
        stats: stats
      }
    });
  } else {
    res.status(404).json({ success: false, error: 'User not found' });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const { userId, firstName, roleId, characterId } = req.body;
    
    if (!userId || !firstName || !roleId) {
      return res.status(400).json({ error: 'User ID, first name and role are required' });
    }
    
    let user = db.users.find(u => u.user_id == userId);
    const role = db.roles.find(r => r.id == roleId);
    const character = db.characters.find(c => c.id == characterId);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    const isNewUser = !user;
    
    if (!user) {
      user = {
        id: Date.now(),
        user_id: parseInt(userId),
        tg_first_name: firstName,
        tg_username: 'user_' + userId,
        sparks: 0,
        level: 'Ученик',
        is_registered: false,
        class: null,
        character_id: null,
        character_name: null,
        available_buttons: [],
        registration_date: new Date().toISOString(),
        last_active: new Date().toISOString(),
        avatar_url: null,
        email: null,
        phone: null,
        settings: {
          notifications: true,
          email_notifications: false,
          theme: 'light',
          language: 'ru'
        },
        achievements: [],
        badges: [],
        streak: 0,
        last_daily_reward: null
      };
      db.users.push(user);
    }
    
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
      sparksAdded = db.settings.sparks_system.REGISTRATION_BONUS;
      await SparksSystem.addSparks(userId, sparksAdded, 'registration', 'Регистрация');
      message = `Регистрация успешна! +${sparksAdded}✨`;
    }
    
    res.json({ 
      success: true, 
      message, 
      sparksAdded,
      user: user
    });
    
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// Загрузка аватара
app.post('/api/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    
    const user = db.users.find(u => u.user_id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Оптимизируем изображение
    const optimizedPath = req.file.path + '-optimized.jpg';
    const optimizationResult = await MediaOptimizer.optimizeImage(req.file.path, optimizedPath, {
      maxWidth: 300,
      maxHeight: 300,
      quality: 80,
      format: 'jpeg'
    });
    
    if (optimizationResult.success) {
      user.avatar_url = '/uploads/avatars/' + require('path').basename(optimizedPath);
      await fs.unlink(req.file.path);
    } else {
      user.avatar_url = '/uploads/avatars/' + req.file.filename;
    }
    
    // Создаем миниатюру
    const thumbnailPath = optimizedPath + '-thumb.jpg';
    await MediaOptimizer.createThumbnail(optimizedPath, thumbnailPath, 100);
    
    res.json({
      success: true,
      message: 'Аватар успешно обновлен',
      avatar_url: user.avatar_url
    });
    
  } catch (error) {
    console.error('Ошибка загрузки аватара:', error);
    res.status(500).json({ error: 'Ошибка загрузки аватара' });
  }
});

// Настройки пользователя
app.put('/api/users/:userId/settings', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { settings } = req.body;
    
    const user = db.users.find(u => u.user_id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (settings) {
      user.settings = { ...user.settings, ...settings };
      user.last_active = new Date().toISOString();
    }
    
    res.json({
      success: true,
      message: 'Настройки обновлены',
      settings: user.settings
    });
    
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
    res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

// Ежедневная награда
app.post('/api/users/:userId/daily-reward', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = db.users.find(u => u.user_id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const today = new Date().toDateString();
    const lastReward = user.last_daily_reward ? new Date(user.last_daily_reward).toDateString() : null;
    
    if (lastReward === today) {
      return res.status(400).json({ error: 'Ежедневная награда уже получена сегодня' });
    }
    
    const dailyReward = db.settings.sparks_system.DAILY_LOGIN;
    const result = await SparksSystem.addSparks(userId, dailyReward, 'daily_reward', 'Ежедневная награда');
    
    user.last_daily_reward = new Date().toISOString();
    
    res.json({
      success: true,
      message: `Ежедневная награда получена! +${dailyReward}✨`,
      sparksEarned: dailyReward,
      streak: user.streak
    });
    
  } catch (error) {
    console.error('Ошибка получения награды:', error);
    res.status(500).json({ error: 'Ошибка получения награды' });
  }
});

// Роли и персонажи
app.get('/api/webapp/roles', (req, res) => {
  const roles = db.roles.filter(role => role.is_active);
  res.json(roles);
});

app.get('/api/webapp/characters/:roleId', (req, res) => {
  const roleId = parseInt(req.params.roleId);
  const characters = db.characters.filter(char => 
    char.role_id === roleId && char.is_active
  );
  res.json(characters);
});

// Смена роли
app.post('/api/users/change-role', async (req, res) => {
  try {
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
    
    await SparksSystem.addSparks(userId, 0, 'role_change', `Смена роли: ${oldRole} → ${role.name}`);
    
    res.json({ 
      success: true, 
      message: 'Роль успешно изменена!',
      user: user
    });
    
  } catch (error) {
    console.error('Ошибка смены роли:', error);
    res.status(500).json({ error: 'Ошибка смены роли' });
  }
});

// Квизы
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

app.post('/api/webapp/quizzes/:quizId/submit', async (req, res) => {
  try {
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
    let totalPoints = 0;
    
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correctAnswers++;
        totalPoints += question.points || 1;
      }
    });
    
    const sparksEarned = correctAnswers * quiz.sparks_per_correct;
    const perfectScore = correctAnswers === quiz.questions.length;
    
    if (perfectScore) {
      sparksEarned += quiz.sparks_perfect_bonus;
    }
    
    if (existingCompletion) {
      existingCompletion.score = correctAnswers;
      existingCompletion.total_points = totalPoints;
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
        total_points: totalPoints,
        sparks_earned: sparksEarned,
        perfect_score: perfectScore,
        answers: answers
      });
    }
    
    if (sparksEarned > 0) {
      await SparksSystem.addSparks(userId, sparksEarned, 'quiz', `Квиз: ${quiz.title}`);
    }
    
    res.json({
      success: true,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      totalPoints,
      maxPoints: quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0),
      sparksEarned,
      perfectScore,
      scorePercentage: Math.round((correctAnswers / quiz.questions.length) * 100),
      message: perfectScore ? 
        `Идеально! 🎉 +${sparksEarned}✨` : 
        `Правильно: ${correctAnswers}/${quiz.questions.length}. +${sparksEarned}✨`
    });
    
  } catch (error) {
    console.error('Ошибка отправки квиза:', error);
    res.status(500).json({ error: 'Ошибка отправки квиза' });
  }
});

// Магазин
app.get('/api/webapp/shop/items', (req, res) => {
  const { category, difficulty, featured } = req.query;
  
  let items = db.shop_items.filter(item => item.is_active);
  
  if (category) {
    items = items.filter(item => item.category === category);
  }
  
  if (difficulty) {
    items = items.filter(item => item.difficulty === difficulty);
  }
  
  if (featured === 'true') {
    items = items.filter(item => item.featured);
  }
  
  // Добавляем информацию о покупке для пользователя
  const userId = parseInt(req.query.userId);
  if (userId) {
    items = items.map(item => {
      const purchased = db.purchases.find(p => p.user_id === userId && p.item_id === item.id);
      return {
        ...item,
        purchased: !!purchased,
        purchased_at: purchased ? purchased.purchased_at : null
      };
    });
  }
  
  res.json(items);
});

app.post('/api/webapp/shop/purchase', async (req, res) => {
  try {
    const { userId, itemId } = req.body;
    
    if (!userId || !itemId) {
      return res.status(400).json({ error: 'User ID and item ID are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    const item = db.shop_items.find(i => i.id == itemId && i.is_active);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    
    const existingPurchase = db.purchases.find(
      p => p.user_id === userId && p.item_id === itemId
    );
    
    if (existingPurchase) {
      return res.status(400).json({ error: 'Вы уже купили этот товар' });
    }
    
    if (user.sparks < item.price) {
      return res.status(400).json({ error: 'Недостаточно искр' });
    }
    
    user.sparks -= item.price;
    user.level = SparksSystem.calculateLevel(user.sparks);
    
    const purchase = {
      id: Date.now(),
      user_id: userId,
      item_id: itemId,
      price_paid: item.price,
      purchased_at: new Date().toISOString()
    };
    
    db.purchases.push(purchase);
    
    await SparksSystem.addSparks(userId, -item.price, 'purchase', `Покупка: ${item.title}`);
    
    res.json({
      success: true,
      message: `Покупка успешна! Куплено: ${item.title}`,
      remainingSparks: user.sparks,
      purchase: purchase
    });
    
  } catch (error) {
    console.error('Ошибка покупки:', error);
    res.status(500).json({ error: 'Ошибка покупки' });
  }
});

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
        file_url: item?.file_url,
        preview_url: item?.preview_url,
        content_text: item?.content_text,
        embed_html: item?.embed_html,
        aspect_ratio: item?.aspect_ratio,
        duration: item?.duration,
        instructor: item?.instructor
      };
    })
    .filter(purchase => purchase.title)
    .sort((a, b) => new Date(b.purchased_at) - new Date(a.purchased_at));
  
  res.json({ purchases: userPurchases });
});

// Работы пользователя
app.post('/api/webapp/upload-work', upload.single('workImage'), async (req, res) => {
  try {
    const { userId, title, description, type } = req.body;
    
    if (!userId || !title || !req.file) {
      return res.status(400).json({ error: 'User ID, title and image are required' });
    }
    
    const user = db.users.find(u => u.user_id == userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Оптимизируем изображение работы
    const optimizedPath = req.file.path + '-optimized.jpg';
    const optimizationResult = await MediaOptimizer.optimizeImage(req.file.path, optimizedPath, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 85,
      format: 'jpeg'
    });
    
    let imageUrl;
    if (optimizationResult.success) {
      imageUrl = '/uploads/works/' + require('path').basename(optimizedPath);
      await fs.unlink(req.file.path);
    } else {
      imageUrl = '/uploads/works/' + req.file.filename;
    }
    
    // Создаем миниатюру
    const thumbnailPath = optimizedPath + '-thumb.jpg';
    await MediaOptimizer.createThumbnail(optimizedPath, thumbnailPath, 400);
    
    // Получаем пропорции
    const aspectRatio = await MediaOptimizer.getAspectRatio(optimizedPath);
    
    const newWork = {
      id: Date.now(),
      user_id: userId,
      title,
      description: description || '',
      image_url: imageUrl,
      thumbnail_url: '/uploads/works/' + require('path').basename(thumbnailPath),
      type: type || 'image',
      status: 'pending',
      aspect_ratio: aspectRatio.ratio,
      created_at: new Date().toISOString(),
      moderated_at: null,
      moderator_id: null,
      admin_comment: null
    };
    
    db.user_works.push(newWork);
    
    await SparksSystem.addSparks(userId, db.settings.sparks_system.UPLOAD_WORK, 'upload_work', `Загрузка работы: ${title}`);
    
    res.json({
      success: true,
      message: `Работа успешно загружена! +${db.settings.sparks_system.UPLOAD_WORK}✨`,
      workId: newWork.id,
      work: newWork
    });
    
  } catch (error) {
    console.error('Ошибка загрузки работы:', error);
    res.status(500).json({ error: 'Ошибка загрузки работы' });
  }
});

app.get('/api/webapp/users/:userId/works', (req, res) => {
  const userId = parseInt(req.params.userId);
  const { status } = req.query;
  
  let userWorks = db.user_works.filter(w => w.user_id === userId);
  
  if (status) {
    userWorks = userWorks.filter(w => w.status === status);
  }
  
  userWorks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  res.json({ works: userWorks });
});

// Интерактивы
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
      can_retake: interactive.allow_retake && !completion
    };
  });
  
  res.json(interactivesWithStatus);
});

app.post('/api/webapp/interactives/:interactiveId/submit', async (req, res) => {
  try {
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
      return res.status(400).json({ error: 'Вы уже прошли этот интерактив' });
    }
    
    const isCorrect = answer === interactive.correct_answer;
    const sparksEarned = isCorrect ? interactive.sparks_reward : 0;
    
    if (existingCompletion) {
      existingCompletion.score = isCorrect ? 1 : 0;
      existingCompletion.sparks_earned = sparksEarned;
      existingCompletion.completed_at = new Date().toISOString();
      existingCompletion.answer = answer;
    } else {
      db.interactive_completions.push({
        id: Date.now(),
        user_id: userId,
        interactive_id: interactiveId,
        completed_at: new Date().toISOString(),
        score: isCorrect ? 1 : 0,
        sparks_earned: sparksEarned,
        answer: answer
      });
    }
    
    // Обновляем статистику интерактива
    interactive.attempts_count += 1;
    if (isCorrect) {
      interactive.success_rate = ((interactive.success_rate * (interactive.attempts_count - 1)) + 1) / interactive.attempts_count;
    }
    
    if (sparksEarned > 0) {
      await SparksSystem.addSparks(userId, sparksEarned, 'interactive', `Интерактив: ${interactive.title}`);
    }
    
    res.json({
      success: true,
      correct: isCorrect,
      score: isCorrect ? 1 : 0,
      sparksEarned: sparksEarned,
      explanation: interactive.explanation,
      message: isCorrect ? 
        `Правильно! +${sparksEarned}✨` : 
        'Попробуйте еще раз!'
    });
    
  } catch (error) {
    console.error('Ошибка отправки интерактива:', error);
    res.status(500).json({ error: 'Ошибка отправки интерактива' });
  }
});

// ==================== АДМИН API ====================

// Статистика
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const stats = {
    users: {
      total: db.users.length,
      registered: db.users.filter(u => u.is_registered).length,
      active_today: db.users.filter(u => {
        const today = new Date();
        const lastActive = new Date(u.last_active);
        return lastActive.toDateString() === today.toDateString();
      }).length,
      new_today: db.users.filter(u => {
        const today = new Date();
        const regDate = new Date(u.registration_date);
        return regDate.toDateString() === today.toDateString();
      }).length
    },
    content: {
      quizzes: db.quizzes.length,
      active_quizzes: db.quizzes.filter(q => q.is_active).length,
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
    },
    revenue: {
      total_sparks_spent: db.purchases.reduce((sum, p) => sum + p.price_paid, 0),
      popular_items: db.shop_items
        .map(item => {
          const purchases = db.purchases.filter(p => p.item_id === item.id);
          return {
            title: item.title,
            purchases: purchases.length,
            revenue: purchases.reduce((sum, p) => sum + p.price_paid, 0)
          };
        })
        .sort((a, b) => b.purchases - a.purchases)
        .slice(0, 5)
    }
  };
  
  res.json(stats);
});

// Управление пользователями
app.get('/api/admin/users-list', requireAdmin, (req, res) => {
  const { page = 1, limit = 50, search = '', role = '', sortBy = 'last_active', sortOrder = 'desc' } = req.query;
  
  let users = db.users.filter(u => u.is_registered);
  
  // Фильтрация
  if (search) {
    const searchLower = search.toLowerCase();
    users = users.filter(u => 
      u.tg_first_name?.toLowerCase().includes(searchLower) ||
      u.tg_username?.toLowerCase().includes(searchLower) ||
      u.class?.toLowerCase().includes(searchLower)
    );
  }
  
  if (role) {
    users = users.filter(u => u.class === role);
  }
  
  // Сортировка
  users.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'sparks':
        aValue = a.sparks;
        bValue = b.sparks;
        break;
      case 'registration_date':
        aValue = new Date(a.registration_date);
        bValue = new Date(b.registration_date);
        break;
      case 'last_active':
      default:
        aValue = new Date(a.last_active);
        bValue = new Date(b.last_active);
    }
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = users.slice(startIndex, endIndex);
  
  const usersWithStats = paginatedUsers.map(user => {
    const stats = SparksSystem.getUserStats(user.user_id);
    return {
      id: user.user_id,
      name: user.tg_first_name,
      username: user.tg_username,
      role: user.class,
      character: user.character_name,
      sparks: user.sparks,
      level: user.level,
      total_quizzes: stats.totalQuizzesCompleted,
      total_works: stats.totalWorks,
      total_marathons: stats.totalMarathonsCompleted,
      total_achievements: stats.totalAchievements,
      registration_date: user.registration_date,
      last_active: user.last_active,
      avatar_url: user.avatar_url,
      streak: user.streak
    };
  });
  
  res.json({
    users: usersWithStats,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(users.length / limit),
      totalUsers: users.length,
      hasNext: endIndex < users.length,
      hasPrev: startIndex > 0
    }
  });
});

// Ручное начисление искр
app.post('/api/admin/users/:userId/add-sparks', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { sparks, reason } = req.body;
    
    if (!sparks || !reason) {
      return res.status(400).json({ error: 'Количество искр и причина обязательны' });
    }
    
    const user = db.users.find(u => u.user_id === userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const sparksAmount = parseFloat(sparks);
    
    if (sparksAmount <= 0) {
      return res.status(400).json({ error: 'Количество искр должно быть положительным' });
    }
    
    const result = await SparksSystem.addSparks(
      userId, 
      sparksAmount, 
      'admin_bonus', 
      `Бонус от администратора: ${reason}`, 
      req.admin.user_id,
      { reason, manual: true }
    );
    
    res.json({
      success: true,
      message: `Пользователю ${user.tg_first_name} начислено ${sparksAmount}✨`,
      newBalance: user.sparks,
      activity: result.activity,
      transaction: result.transaction
    });
    
  } catch (error) {
    console.error('Ошибка начисления искр:', error);
    res.status(500).json({ error: 'Ошибка начисления искр' });
  }
});

// История транзакций искр
app.get('/api/admin/sparks-transactions', requireAdmin, (req, res) => {
  const { userId, page = 1, limit = 50, type = '' } = req.query;
  
  let transactions = db.sparks_transactions;
  
  if (userId) {
    transactions = transactions.filter(t => t.user_id == userId);
  }
  
  if (type) {
    transactions = transactions.filter(t => t.type === type);
  }
  
  transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  const startIndex = (page - 1) * limit;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + parseInt(limit));
  
  const transactionsWithUsers = paginatedTransactions.map(transaction => {
    const user = db.users.find(u => u.user_id === transaction.user_id);
    const admin = db.admins.find(a => a.user_id === transaction.admin_id);
    
    return {
      ...transaction,
      user_name: user?.tg_first_name,
      user_username: user?.tg_username,
      admin_name: admin?.username,
      user_avatar: user?.avatar_url
    };
  });
  
  res.json({
    transactions: transactionsWithUsers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(transactions.length / limit),
      totalTransactions: transactions.length
    }
  });
});

// Управление контентом магазина
app.get('/api/admin/shop/items', requireAdmin, (req, res) => {
  res.json(db.shop_items);
});

app.post('/api/admin/shop/items', requireAdmin, upload.fields([
  { name: 'preview_image', maxCount: 1 },
  { name: 'content_file', maxCount: 1 },
  { name: 'thumbnail_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      type, 
      price, 
      content_text, 
      embed_html, 
      aspect_ratio,
      category,
      difficulty,
      instructor,
      instructor_bio,
      duration,
      file_size,
      pages,
      tags
    } = req.body;
    
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }
    
    let preview_url = '';
    let thumbnail_url = '';
    let file_url = '';
    
    // Обрабатываем превью изображение
    if (req.files.preview_image) {
      const previewFile = req.files.preview_image[0];
      const optimizedPath = previewFile.path + '-optimized.jpg';
      await MediaOptimizer.optimizeImage(previewFile.path, optimizedPath, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 85
      });
      preview_url = '/uploads/previews/' + require('path').basename(optimizedPath);
      await fs.unlink(previewFile.path);
    }
    
    // Обрабатываем миниатюру
    if (req.files.thumbnail_image) {
      const thumbnailFile = req.files.thumbnail_image[0];
      const optimizedPath = thumbnailFile.path + '-optimized.jpg';
      await MediaOptimizer.optimizeImage(thumbnailFile.path, optimizedPath, {
        maxWidth: 400,
        maxHeight: 300,
        quality: 80
      });
      thumbnail_url = '/uploads/previews/' + require('path').basename(optimizedPath);
      await fs.unlink(thumbnailFile.path);
    }
    
    // Обрабатываем основной файл
    if (req.files.content_file) {
      const contentFile = req.files.content_file[0];
      file_url = '/uploads/shop/' + contentFile.filename;
    }
    
    const newItem = {
      id: Date.now(),
      title,
      description: description || '',
      type: type || 'video',
      file_url: file_url,
      preview_url: preview_url,
      thumbnail_url: thumbnail_url,
      price: parseFloat(price),
      content_text: content_text || '',
      embed_html: embed_html || '',
      aspect_ratio: aspect_ratio || '16:9',
      category: category || 'general',
      difficulty: difficulty || 'beginner',
      instructor: instructor || '',
      instructor_bio: instructor_bio || '',
      duration: duration || '',
      file_size: file_size || '',
      pages: pages ? parseInt(pages) : null,
      rating: 0,
      reviews_count: 0,
      students_count: 0,
      is_active: true,
      featured: false,
      tags: tags ? tags.split(',') : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    db.shop_items.push(newItem);
    
    res.json({ 
      success: true, 
      message: 'Товар успешно создан', 
      item: newItem
    });
    
  } catch (error) {
    console.error('Ошибка создания товара:', error);
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

app.put('/api/admin/shop/items/:itemId', requireAdmin, upload.fields([
  { name: 'preview_image', maxCount: 1 },
  { name: 'content_file', maxCount: 1 },
  { name: 'thumbnail_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const item = db.shop_items.find(i => i.id === itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const {
      title, description, type, price, content_text, embed_html, aspect_ratio,
      category, difficulty, instructor, instructor_bio, duration, file_size,
      pages, is_active, featured, tags
    } = req.body;
    
    if (title) item.title = title;
    if (description) item.description = description;
    if (type) item.type = type;
    if (price) item.price = parseFloat(price);
    if (content_text) item.content_text = content_text;
    if (embed_html !== undefined) item.embed_html = embed_html;
    if (aspect_ratio) item.aspect_ratio = aspect_ratio;
    if (category) item.category = category;
    if (difficulty) item.difficulty = difficulty;
    if (instructor) item.instructor = instructor;
    if (instructor_bio) item.instructor_bio = instructor_bio;
    if (duration) item.duration = duration;
    if (file_size) item.file_size = file_size;
    if (pages) item.pages = parseInt(pages);
    if (is_active !== undefined) item.is_active = is_active;
    if (featured !== undefined) item.featured = featured;
    if (tags) item.tags = tags.split(',');
    
    item.updated_at = new Date().toISOString();
    
    // Обновляем файлы если они загружены
    if (req.files.preview_image) {
      const previewFile = req.files.preview_image[0];
      const optimizedPath = previewFile.path + '-optimized.jpg';
      await MediaOptimizer.optimizeImage(previewFile.path, optimizedPath);
      item.preview_url = '/uploads/previews/' + require('path').basename(optimizedPath);
      await fs.unlink(previewFile.path);
    }
    
    if (req.files.thumbnail_image) {
      const thumbnailFile = req.files.thumbnail_image[0];
      const optimizedPath = thumbnailFile.path + '-optimized.jpg';
      await MediaOptimizer.optimizeImage(thumbnailFile.path, optimizedPath, {
        maxWidth: 400,
        maxHeight: 300
      });
      item.thumbnail_url = '/uploads/previews/' + require('path').basename(optimizedPath);
      await fs.unlink(thumbnailFile.path);
    }
    
    if (req.files.content_file) {
      const contentFile = req.files.content_file[0];
      item.file_url = '/uploads/shop/' + contentFile.filename;
    }
    
    res.json({ 
      success: true, 
      message: 'Товар успешно обновлен',
      item: item
    });
    
  } catch (error) {
    console.error('Ошибка обновления товара:', error);
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

app.delete('/api/admin/shop/items/:itemId', requireAdmin, (req, res) => {
  const itemId = parseInt(req.params.itemId);
  const itemIndex = db.shop_items.findIndex(i => i.id === itemId);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  const item = db.shop_items[itemIndex];
  const purchases = db.purchases.filter(p => p.item_id === itemId);
  
  if (purchases.length > 0) {
    return res.status(400).json({ 
      error: 'Нельзя удалить товар, у которого есть покупки. Вместо этого деактивируйте его.' 
    });
  }
  
  db.shop_items.splice(itemIndex, 1);
  res.json({ success: true, message: 'Товар удален' });
});

// Модерация работ
app.get('/api/admin/user-works', requireAdmin, (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  
  let works = db.user_works.filter(w => w.status === status);
  
  works.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  const startIndex = (page - 1) * limit;
  const paginatedWorks = works.slice(startIndex, startIndex + parseInt(limit));
  
  const worksWithUsers = paginatedWorks.map(work => {
    const user = db.users.find(u => u.user_id === work.user_id);
    const moderator = db.admins.find(a => a.user_id === work.moderator_id);
    
    return {
      ...work,
      user_name: user?.tg_first_name,
      user_username: user?.tg_username,
      user_avatar: user?.avatar_url,
      user_level: user?.level,
      moderator_name: moderator?.username
    };
  });
  
  res.json({
    works: worksWithUsers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(works.length / limit),
      totalWorks: works.length
    }
  });
});

app.post('/api/admin/user-works/:workId/moderate', requireAdmin, async (req, res) => {
  try {
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
      await SparksSystem.addSparks(
        work.user_id, 
        db.settings.sparks_system.WORK_APPROVED, 
        'work_approved', 
        `Работа одобрена: ${work.title}`
      );
    }
    
    res.json({ 
      success: true, 
      message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}`,
      work: work
    });
    
  } catch (error) {
    console.error('Ошибка модерации работы:', error);
    res.status(500).json({ error: 'Ошибка модерации работы' });
  }
});

// Экспорт данных
app.get('/api/admin/export/users-excel', requireAdmin, async (req, res) => {
  try {
    const users = db.users.filter(u => u.is_registered);
    
    const workbook = new ExcelJS.Workbook();
    
    // Лист с пользователями
    const usersWorksheet = workbook.addWorksheet('Пользователи');
    usersWorksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Имя', key: 'name', width: 20 },
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Роль', key: 'role', width: 15 },
      { header: 'Уровень', key: 'level', width: 12 },
      { header: 'Искры', key: 'sparks', width: 12 },
      { header: 'Квизов пройдено', key: 'quizzes', width: 15 },
      { header: 'Работ загружено', key: 'works', width: 15 },
      { header: 'Марафонов завершено', key: 'marathons', width: 18 },
      { header: 'Достижений', key: 'achievements', width: 12 },
      { header: 'Серия входов', key: 'streak', width: 12 },
      { header: 'Дата регистрации', key: 'registration_date', width: 15 },
      { header: 'Последняя активность', key: 'last_active', width: 15 }
    ];
    
    users.forEach(user => {
      const stats = SparksSystem.getUserStats(user.user_id);
      usersWorksheet.addRow({
        id: user.user_id,
        name: user.tg_first_name || '',
        username: user.tg_username || '',
        role: user.class || '',
        level: user.level || '',
        sparks: user.sparks.toFixed(1),
        quizzes: stats.totalQuizzesCompleted || 0,
        works: stats.totalWorks || 0,
        marathons: stats.totalMarathonsCompleted || 0,
        achievements: stats.totalAchievements || 0,
        streak: user.streak || 0,
        registration_date: new Date(user.registration_date).toLocaleDateString('ru-RU'),
        last_active: new Date(user.last_active).toLocaleDateString('ru-RU')
      });
    });
    
    // Лист с транзакциями
    const transactionsWorksheet = workbook.addWorksheet('Транзакции искр');
    transactionsWorksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Пользователь', key: 'user', width: 20 },
      { header: 'Тип', key: 'type', width: 15 },
      { header: 'Сумма', key: 'amount', width: 12 },
      { header: 'Описание', key: 'description', width: 30 },
      { header: 'Дата', key: 'date', width: 15 }
    ];
    
    db.sparks_transactions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach(transaction => {
        const user = db.users.find(u => u.user_id === transaction.user_id);
        transactionsWorksheet.addRow({
          id: transaction.id,
          user: user?.tg_first_name || 'Неизвестно',
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          date: new Date(transaction.created_at).toLocaleDateString('ru-RU')
        });
      });
    
    // Стили для заголовков
    [usersWorksheet, transactionsWorksheet].forEach(worksheet => {
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Ошибка экспорта Excel:', error);
    res.status(500).json({ error: 'Ошибка экспорта данных' });
  }
});

// ==================== TELEGRAM BOT ====================

let bot;
if (process.env.BOT_TOKEN) {
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
    
    console.log('✅ Telegram Bot инициализирован');
    
    // Команда /start
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const name = msg.from.first_name || 'Друг';
      const userId = msg.from.id;
      
      try {
        let user = db.users.find(u => u.user_id === userId);
        const isNewUser = !user;
        
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
            last_active: new Date().toISOString(),
            avatar_url: null,
            email: null,
            phone: null,
            settings: {
              notifications: true,
              email_notifications: false,
              theme: 'light',
              language: 'ru'
            },
            achievements: [],
            badges: [],
            streak: 0,
            last_daily_reward: null
          };
          db.users.push(user);
        } else {
          user.last_active = new Date().toISOString();
        }
        
        const welcomeText = `🎨 Привет, ${name}!

Добро пожаловать в **Мастерская Вдохновения** — платформу для творческих людей!

✨ В личном кабинете вас ждет:
• 🎯 Увлекательные квизы и искры за знания
• 🏃‍♂️ Тематические марафоны с практическими заданиями  
• 🖼️ Галерея для ваших работ с модерацией
• 🎮 Интерактивные задания и головоломки
• 🔄 Смена ролей и персонажей с уникальными бонусами
• 📊 Детальная статистика прогресса
• 🛒 Магазин обучающих материалов
• 🏆 Достижения и награды
• 💫 Ежедневные награды и серии входов

${isNewUser ? '🎁 *Новым пользователям +10 искр!*' : ''}

Нажмите кнопку ниже чтобы открыть личный кабинет и начать творческий путь!`;
        
        const keyboard = {
          inline_keyboard: [[
            {
              text: "📱 Открыть Личный Кабинет",
              web_app: { url: process.env.APP_URL || `https://your-domain.timeweb.cloud` }
            }
          ]]
        };

        await bot.sendMessage(chatId, welcomeText, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
        // Отправляем приветственное сообщение о возможностях
        setTimeout(async () => {
          const featuresText = `🌟 *Что вы можете делать в Мастерской Вдохновения?*

🎨 *Художники* - изучайте живопись, рисуйте и зарабатывайте искры
👗 *Стилисты* - создавайте образы и изучайте моду  
🧵 *Мастера* - осваивайте ремесла и рукоделие
🏛️ *Историки* - погружайтесь в историю искусств
📷 *Фотографы* - совершенствуйтесь в фотографии

Каждая роль открывает уникальные возможности и бонусы!`;
          
          await bot.sendMessage(chatId, featuresText, {
            parse_mode: 'Markdown'
          });
        }, 1000);
        
      } catch (error) {
        console.error('Ошибка обработки /start:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    });

    // Команда /admin
    bot.onText(/\/admin/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      try {
        const admin = db.admins.find(a => a.user_id == userId && a.is_active);
        if (!admin) {
          await bot.sendMessage(chatId, '❌ У вас нет прав доступа к админ панели.');
          return;
        }
        
        const adminUrl = `${process.env.APP_URL}/admin?userId=${userId}`;
        
        const keyboard = {
          inline_keyboard: [[
            {
              text: "🔧 Открыть Админ Панель",
              url: adminUrl
            }
          ]]
        };
        
        await bot.sendMessage(chatId, 
          `🔧 *Панель администратора*\n\n` +
          `Добро пожаловать, ${admin.username}!\n\n` +
          `Ваша роль: *${admin.role}*\n` +
          `Разрешения: ${admin.permissions.join(', ')}\n\n` +
          `Нажмите кнопку ниже чтобы открыть админ панель:`, 
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
      } catch (error) {
        console.error('Ошибка обработки /admin:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    });

    // Команда /stats
    bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      try {
        const admin = db.admins.find(a => a.user_id == userId);
        if (!admin) {
          await bot.sendMessage(chatId, '❌ У вас нет прав доступа.');
          return;
        }
        
        const stats = {
          totalUsers: db.users.length,
          registeredUsers: db.users.filter(u => u.is_registered).length,
          activeQuizzes: db.quizzes.filter(q => q.is_active).length,
          activeMarathons: db.marathons.filter(m => m.is_active).length,
          shopItems: db.shop_items.filter(i => i.is_active).length,
          totalSparks: db.users.reduce((sum, user) => sum + user.sparks, 0),
          totalPurchases: db.purchases.length
        };
        
        const statsText = `📊 *Статистика бота:*
        
👥 Пользователи: ${stats.totalUsers}
✅ Зарегистрировано: ${stats.registeredUsers}
🎯 Активных квизов: ${stats.activeQuizzes}
🏃‍♂️ Активных марафонов: ${stats.activeMarathons}
🛒 Товаров в магазине: ${stats.shopItems}
✨ Всего искр в системе: ${stats.totalSparks.toFixed(1)}
💰 Всего покупок: ${stats.totalPurchases}
        
🕐 Обновлено: ${new Date().toLocaleString('ru-RU')}`;
        
        await bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('Ошибка обработки /stats:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    });

    // Команда /profile
    bot.onText(/\/profile/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      try {
        const user = db.users.find(u => u.user_id === userId);
        if (!user) {
          await bot.sendMessage(chatId, 'Пожалуйста, сначала используйте /start для регистрации.');
          return;
        }
        
        const stats = SparksSystem.getUserStats(userId);
        const levelProgress = SparksSystem.calculateLevelProgress(user.sparks);
        
        const profileText = `👤 *Ваш профиль:*
        
🎨 Имя: ${user.tg_first_name}
📊 Уровень: ${user.level}
✨ Искры: ${user.sparks.toFixed(1)}
🎯 Роль: ${user.class || 'Не выбрана'}
🎭 Персонаж: ${user.character_name || 'Не выбран'}
        
📈 *Статистика:*
✅ Квизов пройдено: ${stats.totalQuizzesCompleted}
🖼️ Работ загружено: ${stats.totalWorks}
🏃‍♂️ Марафонов завершено: ${stats.totalMarathonsCompleted}
🎮 Интерактивов пройдено: ${stats.totalInteractivesCompleted}
🏆 Достижений: ${stats.totalAchievements}
🔥 Серия входов: ${user.streak} дней
        
📊 Прогресс до след. уровня: ${levelProgress.toFixed(1)}%`;
        
        const keyboard = {
          inline_keyboard: [[
            {
              text: "📱 Открыть Личный Кабинет",
              web_app: { url: process.env.APP_URL || `https://your-domain.timeweb.cloud` }
            }
          ]]
        };
        
        await bot.sendMessage(chatId, profileText, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
      } catch (error) {
        console.error('Ошибка обработки /profile:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка. Пожалуйста, попробуйте позже.');
      }
    });

    // Обработка callback queries
    bot.on('callback_query', async (callbackQuery) => {
      const msg = callbackQuery.message;
      const data = callbackQuery.data;
      
      try {
        if (data === 'get_daily_reward') {
          const userId = callbackQuery.from.id;
          const user = db.users.find(u => u.user_id === userId);
          
          if (!user) {
            await bot.answerCallbackQuery(callbackQuery.id, {
              text: 'Пожалуйста, сначала используйте /start'
            });
            return;
          }
          
          const today = new Date().toDateString();
          const lastReward = user.last_daily_reward ? new Date(user.last_daily_reward).toDateString() : null;
          
          if (lastReward === today) {
            await bot.answerCallbackQuery(callbackQuery.id, {
              text: 'Вы уже получали награду сегодня'
            });
            return;
          }
          
          const dailyReward = db.settings.sparks_system.DAILY_LOGIN;
          await SparksSystem.addSparks(userId, dailyReward, 'daily_reward', 'Ежедневная награда');
          user.last_daily_reward = new Date().toISOString();
          
          await bot.answerCallbackQuery(callbackQuery.id, {
            text: `🎁 Получено ${dailyReward} искр!`
          });
          
          await bot.editMessageText(
            `🎁 *Ежедневная награда получена!*\n\n+${dailyReward}✨ добавлены на ваш баланс.\n\nТекущая серия: ${user.streak} дней`,
            {
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              parse_mode: 'Markdown'
            }
          );
        }
      } catch (error) {
        console.error('Ошибка обработки callback:', error);
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Произошла ошибка'
        });
      }
    });

    // Обработка ошибок бота
    bot.on('error', (error) => {
      console.error('❌ Ошибка Telegram Bot:', error);
    });
    
    bot.on('polling_error', (error) => {
      console.error('❌ Ошибка polling Telegram Bot:', error);
    });

  } catch (error) {
    console.error('❌ Ошибка инициализации бота:', error);
  }
} else {
  console.log('⚠️ Telegram Bot отключен (BOT_TOKEN не установлен)');
}

// ==================== ОБРАБОТЧИКИ ОШИБОК ====================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Страница не найдена',
    path: req.originalUrl
  });
});

app.use((error, req, res, next) => {
  console.error('❌ Глобальная ошибка:', error);
  
  // Логируем детали ошибки
  console.log('Детали запроса:', {
    url: req.url,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    body: req.body
  });
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'Файл слишком большой. Максимальный размер: 100MB'
    });
  }
  
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: `Ошибка загрузки файла: ${error.message}`
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? error.message : 'Внутренняя ошибка сервера'
  });
});

// ==================== ЗАПУСК СЕРВЕРА ====================

const PORT = process.env.PORT || 3000;

// Функция для создания тестовых данных
async function initializeTestData() {
  console.log('📦 Инициализация тестовых данных...');
  
  // Создаем тестовые загрузочные директории
  const testDirs = [
    'uploads/characters',
    'uploads/quizzes', 
    'uploads/marathons',
    'uploads/shop',
    'uploads/posts',
    'uploads/interactives'
  ];
  
  for (const dir of testDirs) {
    const dirPath = join(APP_ROOT, dir);
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
  
  console.log('✅ Тестовые данные инициализированы');
}

app.listen(PORT, '0.0.0.0', async () => {
  await initializeTestData();
  
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 WebApp: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
  console.log(`🔧 Admin: ${process.env.APP_URL || `http://localhost:${PORT}`}/admin`);
  console.log(`🎯 Квизов: ${db.quizzes.length}`);
  console.log(`🏃‍♂️ Марафонов: ${db.marathons.length}`);
  console.log(`🎮 Интерактивов: ${db.interactives.length}`);
  console.log(`🛒 Товаров: ${db.shop_items.length}`);
  console.log(`👥 Пользователей: ${db.users.length}`);
  console.log(`👑 Админов: ${db.admins.length}`);
  console.log('✅ Все системы работают!');
  console.log('=== СИСТЕМА ГОТОВА К РАБОТЕ ===');
});
