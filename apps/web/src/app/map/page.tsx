import type { Metadata } from 'next';
import { MapPageClient } from './map-client';

export const metadata: Metadata = {
  title: 'Карта объявлений',
  description: 'Все объявления Barter на интерактивной карте. Найдите товары и услуги рядом с вами.',
};

export default function MapPage() {
  return <MapPageClient />;
}
