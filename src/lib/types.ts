export interface Video {
  id: string;
  title: string;
  description?: string;
  alias?: string;
  thumbnailUrl: string;
  videoUrl: string;
  uploadDate: string;
  createdAt: number; // 정밀 정렬을 위한 타임스탬프 추가
  folderId: string;
  isPrivate: boolean;
  fileSize?: string;
  duration?: string;
  type?: 'video' | 'youtube';
  series?: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Profile {
  id: string;
  nickname: string;
  avatarUrl: string;
  isPreset: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  nickname: string;
  status: 'pending' | 'done';
  createdAt: string;
}
