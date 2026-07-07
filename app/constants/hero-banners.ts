import { apiUrl } from '@api/client';

export type HeroBannerAction =
  | { type: 'none' }
  | { type: 'product'; entityId: string }
  | { type: 'category'; entityId: string }
  | { type: 'collection'; entityId: string }
  | { type: 'phone'; phone: string }
  | { type: 'tab'; tab: 'Categories' | 'Collections' | 'Home' };

export type HeroBanner = {
  id: string;
  imageUrl: string;
  action: HeroBannerAction;
};

const bannerUrl = (filename: string) => `${apiUrl}/uploads/${filename}`;

export const HERO_BANNERS: HeroBanner[] = [
  {
    id: 'nunua-china',
    imageUrl: bannerUrl('banner-nunua-china.png'),
    action: { type: 'tab', tab: 'Categories' },
  },
  {
    id: 'safirishia',
    imageUrl: bannerUrl('banner-safirishia.png'),
    action: { type: 'tab', tab: 'Collections' },
  },
  {
    id: 'become-seller',
    imageUrl: bannerUrl('banner-become-seller.png'),
    action: { type: 'phone', phone: '+255758422100' },
  },
];
