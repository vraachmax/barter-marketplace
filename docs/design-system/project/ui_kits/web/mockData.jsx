/* global React */

const MOCK_LISTINGS = [
  { id: 1,  title: 'Туфли для девочки 30 размер',          price: '550 ₽',       loc: 'Санкт-Петербург',       img: 'https://images.unsplash.com/photo-1596702775921-f14c9bf75bea?w=400&q=70&auto=format&fit=crop' },
  { id: 2,  title: 'Машиноместо, 14 м²',                   price: '1 150 000 ₽', loc: 'Санкт-Петербург, Озерки', img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&q=70&auto=format&fit=crop' },
  { id: 3,  title: 'Комбинезон для собак мелких пород',    price: '350 ₽',       loc: 'Санкт-Петербург',       img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=70&auto=format&fit=crop' },
  { id: 4,  title: 'Vento Retro, 2020, 4 456 км',          price: '60 000 ₽',    loc: 'Сестрорецк, р-н Курортный', img: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=70&auto=format&fit=crop' },
  { id: 5,  title: 'iPhone 14 Pro 256 ГБ Deep Purple',     price: '82 000 ₽',    loc: 'Москва, Басманный',    img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=70&auto=format&fit=crop', promo: 'ТОП' },
  { id: 6,  title: 'MacBook Air M2 2023, 16/512, Midnight',price: '89 900 ₽',    loc: 'Санкт-Петербург',       img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=70&auto=format&fit=crop', promo: 'XL' },
  { id: 7,  title: 'Велосипед горный Stels Navigator 26"', price: '15 500 ₽',   loc: 'Казань, Вахитовский',  img: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&q=70&auto=format&fit=crop' },
  { id: 8,  title: 'Диван-кровать «Еврокнижка», велюр',    price: '28 000 ₽',   loc: 'Москва, Кунцево',      img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=70&auto=format&fit=crop' },
  { id: 9,  title: 'PlayStation 5 Slim, 1 ТБ',             price: '58 000 ₽',   loc: 'Москва, Академический', img: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&q=70&auto=format&fit=crop' },
  { id: 10, title: 'Кроссовки Nike Air Max 90, 43 размер', price: '5 800 ₽',    loc: 'Краснодар, Западный',  img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=70&auto=format&fit=crop' },
  { id: 11, title: 'Коляска детская Cybex Balios S',       price: '22 000 ₽',   loc: 'Уфа, Октябрьский',     img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=70&auto=format&fit=crop' },
  { id: 12, title: 'Гитара акустическая Yamaha F310',      price: '7 900 ₽',    loc: 'Воронеж, Центральный', img: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&q=70&auto=format&fit=crop' },
];

window.MOCK_LISTINGS = MOCK_LISTINGS;
