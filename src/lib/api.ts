import { Video, Profile, TodoItem } from './types';

const API_BASE_URL = 'https://familytape-api.hyperbraingames.workers.dev';

async function safeFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type');
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API Error (${res.status}):`, errorText);
    throw new Error(errorText || '서버 응답 오류');
  }

  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  
  return await res.text();
}

export const api = {
  getVideos: async (): Promise<Video[]> => {
    try {
      const data = await safeFetch(`${API_BASE_URL}/api/videos`, { cache: 'no-store' });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  getFolders: async () => {
    const data = await api.getSetting('folders');
    return data ? JSON.parse(data) : null;
  },

  getSetting: async (key: string): Promise<string | null> => {
    try {
      const data = await safeFetch(`${API_BASE_URL}/api/settings?key=${key}`);
      return data?.value || null;
    } catch (e) {
      return null;
    }
  }
};

let videoCache: Video[] | null = null;
let videoCacheTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

export const getVideosCached = async (): Promise<Video[]> => {
  const now = Date.now();
  if (videoCache && now - videoCacheTime < CACHE_TTL) {
    return videoCache;
  }
  const data = await api.getVideos();
  videoCache = data;
  videoCacheTime = now;
  return data;
};
