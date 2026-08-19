import { BadgeCheck, Crown, Lock, LucideIcon, Smartphone } from "lucide-react";

interface Slogan {
    line1: string;
    line2: string;
    subtitle: string;
}

interface Feature {
    Icon: LucideIcon;
    title: string;
    text: string;
}

const MASSAGE_SLOGAN: Slogan = {
    line1: 'Пространство особенного',
    line2: 'отдыха',
    subtitle:
        'Премиальные массажные программы, приватная атмосфера и внимательные мастера, которые помогут отвлечься от повседневных забот и полностью посвятить время себе.',
};

const MASSAGE_FEATURES: Feature[] = [
    {
        Icon: Lock,
        title: 'Приватность',
        text: 'Мы обеспечиваем конфиденциальность и спокойную атмосферу на протяжении всего визита.',
    },
    {
        Icon: BadgeCheck,
        title: 'Проверенные мастера',
        text: 'Каждый мастер проходит предварительный отбор и обучение стандартам обслуживания салона.',
    },
    {
        Icon: Crown,
        title: 'Индивидуальный подход',
        text: 'Программа подбирается с учётом ваших пожеланий, настроения и желаемого формата отдыха.',
    },
    {
        Icon: Smartphone,
        title: 'Премиальная атмосфера',
        text: 'Стильные интерьеры, приглушенный свет, приятные ароматы и внимание к каждой детали.',
    },
];

const DEFAULT_SLOGAN: Slogan = {
  line1: 'Элитное',
  line2: 'сопровождение',
  subtitle: 'Приватная платформа с верифицированными моделями премиум-класса',
};

const FEATURES: Feature[] = [
  {
    Icon: Lock,
    title: 'Приватность',
    text: 'Полная анонимность и конфиденциальность всех взаимодействий на платформе.',
  },
  {
    Icon: BadgeCheck,
    title: 'Верификация',
    text: 'Каждая модель проходит тщательную проверку подлинности и качества.',
  },
  {
    Icon: Crown,
    title: 'Элитный сервис',
    text: 'Высочайший уровень обслуживания и индивидуальный подход к каждому клиенту.',
  },
  {
    Icon: Smartphone,
    title: 'Удобная платформа',
    text: 'Современный интерфейс с мгновенной связью и защищённым бронированием.',
  },
];

const PROD_IMAGE_ESCORT = '/images/hero-escort.webp';
const PROD_IMAGE_MESSAGE = '/images/hero-massage.jpg';

export { MASSAGE_SLOGAN, MASSAGE_FEATURES, DEFAULT_SLOGAN, FEATURES, PROD_IMAGE_ESCORT as PROD_IMAGES_ESCORT, PROD_IMAGE_MESSAGE as PROD_IMAGES_MESSAGE };