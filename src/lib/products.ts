export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  rating: number;
  soldCount: number;
  isNew: boolean;
  description: string;
  inStock: boolean;
}

export const productCategories = [
  { id: 'all', label: 'همه' },
  { id: 'audio', label: 'صوتی' },
  { id: 'wearable', label: 'پوشیدنی' },
  { id: 'mobile', label: 'موبایل' },
  { id: 'accessory', label: 'لوازم جانبی' },
  { id: 'drone', label: 'پهپاد' },
];

export const products: Product[] = [
  {
    id: 'p1',
    name: 'هدفون بی‌سیم نسل جدید',
    category: 'audio',
    price: 4_800_000,
    imageUrl: 'https://images.pexels.com/photos/30981655/pexels-photo-30981655.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    rating: 4.8,
    soldCount: 1240,
    isNew: false,
    description: 'هدفون بی‌سیم با کیفیت صدای فوق‌العاده، حذف نویز فعال و باتری ۳۰ ساعته. مناسب برای موسیقی، تماس و تمرین. طراحی ارگونومیک و سبک با کیف نقاله.',
    inStock: true,
  },
  {
    id: 'p2',
    name: 'ساعت هوشمند ورزشی',
    category: 'wearable',
    price: 6_200_000,
    imageUrl: 'https://images.pexels.com/photos/10357015/pexels-photo-10357015.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    rating: 4.6,
    soldCount: 890,
    isNew: false,
    description: 'ساعت هوشمند با نمایشگر AMOLED، اندازه‌گیری ضربان قلب، اکسیژن خون و خواب. مقاوم در برابر آب تا ۵۰ متر. باتری ۷ روزه و بیش از ۱۰۰ حالت ورزشی.',
    inStock: true,
  },
  {
    id: 'p3',
    name: 'گوشی هوشمند پرچمدار',
    category: 'mobile',
    price: 28_500_000,
    imageUrl: 'https://images.pexels.com/photos/11494897/pexels-photo-11494897.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    rating: 4.9,
    soldCount: 2100,
    isNew: false,
    description: 'گوشی پرچمدار با نمایشگر ۶.۷ اینچی ۱۲۰ هرتز، پردازنده نسل جدید، دوربین سه‌گانه ۱۰۸ مگاپیکسل و باتری ۵۰۰۰ میلی‌آمپر با شارژ سریع ۶۷ وات.',
    inStock: true,
  },
  {
    id: 'p4',
    name: 'کیبورد مکانیکی RGB',
    category: 'accessory',
    price: 3_400_000,
    imageUrl: 'https://images.pexels.com/photos/5380584/pexels-photo-5380584.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    rating: 4.7,
    soldCount: 560,
    isNew: true,
    description: 'کیبورد مکانیکی با سوییچ قابل تعویض هات‌سواپ، نورپردازی RGB قابل تنظیم، بدنه آلومینیومی و کابل جداگانه. مناسب برای گیمینگ و تایپ حرفه‌ای.',
    inStock: true,
  },
  {
    id: 'p5',
    name: 'اسپیکر قابل‌حمل بلوتوثی',
    category: 'audio',
    price: 2_100_000,
    imageUrl: 'https://images.pexels.com/photos/13650608/pexels-photo-13650608.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    rating: 4.5,
    soldCount: 720,
    isNew: true,
    description: 'اسپیکر بلوتوثی قابل‌حمل با صدای ۳۶۰ درجه، ضد آب IPX7، باتری ۲۰ ساعته و اتصال همزمان دو دستگاه. طراحی فشرده و سبک مناسب سفر و فضای باز.',
    inStock: true,
  },
  {
    id: 'p6',
    name: 'پهپاد حرفه‌ای ۴K',
    category: 'drone',
    price: 15_900_000,
    imageUrl: 'https://images.pexels.com/photos/12975477/pexels-photo-12975477.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    rating: 4.8,
    soldCount: 340,
    isNew: true,
    description: 'پهپاد حرفه‌ای با دوربین ۴K ۶۰ فریم بر ثانیه، گیمبال ۳ محوره، زمان پرواز ۳۵ دقیقه و برد انتقال تصویر ۸ کیلومتر. دارای سیستم جلوگیری از برخورد و بازگشت خودکار.',
    inStock: false,
  },
];

export function getProductById(id: string | undefined): Product | undefined {
  return products.find((p) => p.id === id);
}
