'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Loader2, Calendar, Download, Clock, Lock, Globe,
  Play, ListVideo, Copy, Link as LinkIcon
} from 'lucide-react';
import { api, getVideosCached } from '@/lib/api';
import { Video } from '@/lib/types';

declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }
}

function ShareContent() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v');
  const showListParam = searchParams.get('list') === 'true';
  const videoRef = useRef<HTMLVideoElement>(null);

  const [video, setVideo] = useState<Video | null>(null);
  const [playlist, setPlaylist] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideoData = async () => {
      if (!videoId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const allVideos = await getVideosCached();
        const found = allVideos.find(v => v.id === videoId || v.alias === videoId);
        setVideo(found || null);
        
        if (found && showListParam) {
          let playlistVideos = [];
          if (found.series) {
            playlistVideos = allVideos
              .filter(v => v.series === found.series)
              .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
          } else {
            playlistVideos = allVideos.filter(v => v.folderId === found.folderId);
          }
          setPlaylist(playlistVideos);
        }
      } catch (error) {
        console.error('Failed to load video:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVideoData();
  }, [videoId, showListParam]);

  // Chromecast SDK 초기화 및 세션 이벤트 셋업
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializeCastApi = () => {
      try {
        const castContext = (window as any).cast?.framework?.CastContext?.getInstance();
        if (!castContext) return;
        
        castContext.setOptions({
          receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGINAL_SCOPE
        });

        const existingSession = castContext.getCurrentSession();
        if (existingSession && video) {
          loadMediaOnChromecast(existingSession);
        }

        castContext.addEventListener(
          (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          (event: any) => {
            if (event.sessionState === (window as any).cast.framework.SessionState.SESSION_STARTED) {
              const session = castContext.getCurrentSession();
              if (session && video) {
                loadMediaOnChromecast(session);
              }
            }
          }
        );
      } catch (err) {
        console.warn('Cast API initialization failed:', err);
      }
    };

    const loadMediaOnChromecast = (session: any) => {
      if (!video || video.type === 'youtube') return;
      try {
        const chromeMedia = (window as any).chrome?.cast?.media;
        if (!chromeMedia) return;

        const mediaInfo = new chromeMedia.MediaInfo(video.videoUrl, 'video/mp4');
        mediaInfo.metadata = new chromeMedia.GenericMediaMetadata();
        mediaInfo.metadata.metadataType = chromeMedia.MetadataType.GENERIC;
        mediaInfo.metadata.title = video.title;
        mediaInfo.metadata.subtitle = video.description || '';
        if (video.thumbnailUrl) {
          mediaInfo.metadata.images = [{ url: video.thumbnailUrl }];
        }

        const request = new chromeMedia.LoadRequest(mediaInfo);
        session.loadMedia(request).then(
          () => console.log('Chromecast media load successful'),
          (err: any) => console.error('Chromecast media load failed:', err)
        );
      } catch (err) {
        console.error('Error loading media to Chromecast:', err);
      }
    };

    if ((window as any).chrome && (window as any).chrome.cast && (window as any).chrome.cast.isAvailable) {
      initializeCastApi();
    }

    window.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        initializeCastApi();
      }
    };
  }, [video]);

  const handleDownload = () => {
    if (!video || video.type === 'youtube') return;
    const urlParts = video.videoUrl.split('/');
    const key = urlParts.slice(-2).join('/');
    const downloadUrl = `https://familytape-api.hyperbraingames.workers.dev/api/download?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(video.title)}.mp4`;
    window.open(downloadUrl, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('공유 링크가 클립보드에 복사되었습니다.');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#09090b] space-y-4">
        <h1 className="text-2xl font-black text-zinc-400">영상을 찾을 수 없습니다</h1>
        <p className="text-zinc-600 font-bold text-sm">올바른 공유 링크로 접속하였는지 확인해주세요.</p>
      </div>
    );
  }

  const hasPlaylist = showListParam && playlist.length > 1;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-32">
      
      {/* 상단 로고 헤더 */}
      <header className="h-20 flex items-center justify-between px-6 md:px-10 border-b border-zinc-900 bg-[#09090b] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="https://cdn-icons-png.flaticon.com/512/10521/10521743.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="text-2xl font-black text-blue-500 tracking-tight">Familytape Share</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:px-10 md:pt-8 md:pb-10 space-y-10">
        
        {/* 비디오 플레이어 */}
        <div className="bg-black rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video relative group ring-1 ring-white/10">
          {video.type === 'youtube' ? (
            <iframe 
              src={`${video.videoUrl}?autoplay=0&rel=0`}
              className="w-full h-full border-none"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video 
              ref={videoRef}
              src={video.videoUrl} 
              controls 
              playsInline
              className="w-full h-full relative z-10"
              poster={video.thumbnailUrl} 
            />
          )}
        </div>

        {/* 2/3 및 1/3 레이아웃 구성 (재생목록 유무 분기) */}
        <div className={`grid grid-cols-1 ${hasPlaylist ? 'lg:grid-cols-3' : 'max-w-4xl mx-auto'} gap-10`}>
          
          <div className={`${hasPlaylist ? 'lg:col-span-2' : ''} space-y-8`}>
            
            {/* 비디오 메타데이터 & 타이틀 */}
            <div className="bg-zinc-900/40 p-8 md:p-12 rounded-[2.5rem] border border-zinc-800 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-xs font-bold flex items-center gap-1.5">
                    <Calendar size={14} /> {video.uploadDate}
                  </span>
                  {video.series && (
                    <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-[10px] font-black rounded-lg border border-purple-800/50 uppercase">
                      {video.series}
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight break-words">{video.title}</h1>
                
                {video.description && (
                  <p className="text-zinc-400 font-medium text-base md:text-lg leading-relaxed whitespace-pre-wrap">{video.description}</p>
                )}

                {/* 제어 도구 (다운로드 & 공유 & 캐스팅) */}
                <div className="pt-6 border-t border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500"/> {video.duration || '00:00'}</span>
                      {video.fileSize && <span>•</span>}
                      {video.fileSize && <span>{video.fileSize}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 공유 복사 */}
                      <button 
                        onClick={copyLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                      >
                        <LinkIcon size={14} /> 링크 복사
                      </button>

                      {/* Chromecast TV 전송 */}
                      {video.type !== 'youtube' && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm cursor-pointer">
                          {React.createElement('google-cast-launcher', {
                            style: {
                              display: 'inline-block',
                              width: '14px',
                              height: '14px',
                              cursor: 'pointer',
                              opacity: 0.8
                            }
                          })}
                          <span>TV 전송</span>
                        </div>
                      )}

                      {/* 다운로드 */}
                      {video.type !== 'youtube' && (
                        <button 
                          onClick={handleDownload}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-black font-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        >
                          <Download size={14} /> 다운로드
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* 재생목록 사이드바 */}
          {hasPlaylist && (
            <div className="space-y-8">
              <div className="bg-zinc-900/40 rounded-[2.5rem] border border-zinc-800 overflow-hidden sticky top-28">
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black flex items-center gap-2 uppercase tracking-[0.2em] text-blue-500">
                      <ListVideo size={16} /> 재생목록
                    </h3>
                    <span className="text-[10px] font-black text-blue-500 bg-blue-900/30 px-3 py-1 rounded-full">
                      {playlist.findIndex(v => v.id === video.id) + 1} / {playlist.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {playlist.map((item) => {
                      const isActive = item.id === video.id;
                      const nextUrl = `/?v=${item.id}&list=true`;
                      return (
                        <a 
                          key={item.id}
                          href={nextUrl}
                          className={`flex gap-3 text-left w-full p-2 rounded-2xl transition-all group ${isActive ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'hover:bg-zinc-800/40'}`}
                        >
                          <div className={`relative w-24 shrink-0 aspect-video rounded-xl overflow-hidden border ${isActive ? 'border-blue-500' : 'border-zinc-800'}`}>
                            <img src={item.thumbnailUrl} alt="" className={`w-full h-full object-cover transition-all ${isActive ? 'brightness-50 scale-105' : 'group-hover:scale-105'}`} />
                            {isActive && (
                              <div className="absolute inset-0 flex items-center justify-center text-white">
                                <Play size={14} fill="white" />
                              </div>
                            )}
                            <div className="absolute bottom-1 right-1 px-1 bg-black/70 rounded text-[8px] font-black text-white">
                              {item.duration || '00:00'}
                            </div>
                          </div>
                          <div className="flex flex-col justify-center overflow-hidden">
                            <p className={`text-xs font-bold truncate leading-tight ${isActive ? 'text-blue-500' : 'text-zinc-300'}`}>
                              {item.title}
                            </p>
                            <p className="text-[10px] font-bold text-zinc-500 mt-1">{item.uploadDate}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    }>
      <ShareContent />
    </Suspense>
  );
}
