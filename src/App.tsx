import { useState, useEffect, ReactNode, type ChangeEvent } from 'react';
import { connectInstagram, readInstagramOAuthResultFromUrl, startInstagramLogin } from './lib/instagramApi';
import { createBlobUpload, loadMusicforgeData, saveMusicforgeData, type MusicforgeData } from './lib/musicforgeApi';
import {
  fetchYouTubeComments,
  publishInstagram,
  replyYouTubeComment,
  uploadYouTube,
  uploadYouTubeDirect,
  type YouTubeCommentThread,
} from './lib/platformApi';

// ============================================
// MUSICFORGE - Social Media Promotion Console
// For Musicians • Album Covers • Videos • Analytics
// ============================================

type Tab = 'dashboard' | 'album' | 'video' | 'post' | 'analytics' | 'keywords' | 'coach' | 'accounts' | 'library';
type Platform = 'youtube' | 'instagram' | 'tiktok' | 'twitter';
type Toast = { message: string; type: 'success' | 'error' };
type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type AlbumCover = {
  id: number;
  title: string;
  gradient: string;
  style: string;
  genre: string;
  mood: string;
};

type VideoConcept = {
  id: number;
  title: string;
  script: string;
  thumbnail: string;
  topic: string;
  style: string;
};

type SocialPost = {
  id: number;
  caption: string;
  hashtags: string[];
  platforms: Platform[];
  postedAt: string;
};

type KeywordSet = {
  id: number;
  query: string;
  tags: string[];
};

type ChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

type ConnectedAccount = {
  id: number;
  platform: Platform;
  username: string;
  profileUrl: string;
  status: 'linked' | 'connected' | 'expired';
  connectedAt: string;
  source?: 'manual' | 'oauth' | 'token';
  accountId?: string;
  channelId?: string;
  thumbnailUrl?: string;
  accessToken?: string;
  expiresAt?: string;
  scopes?: string[];
  accountType?: string;
  stats?: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
    mediaCount?: string;
  };
  recentVideos?: Array<{
    id: string;
    title: string;
    publishedAt?: string;
    thumbnailUrl?: string;
    videoUrl: string;
  }>;
  recentMedia?: Array<{
    id: string;
    title: string;
    publishedAt?: string;
    thumbnailUrl?: string;
    postUrl: string;
    mediaType?: string;
  }>;
};

type UploadedVideoAsset = {
  type: 'uploaded_video';
  id: number;
  savedAt: string;
  title: string;
  fileName: string;
  videoUrl: string;
  blobPath?: string;
  thumbnailUrl?: string;
  source: 'upload';
};

type Asset = (
  | ({ type: 'cover'; savedAt: string } & AlbumCover)
  | ({ type: 'video'; savedAt: string } & VideoConcept)
  | UploadedVideoAsset
);

type AutomationVideo = {
  id: string;
  title: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  videoUrl: string;
  source: 'youtube' | 'upload';
  sourceLabel: string;
};

// Theme icons as simple SVG
const Icons = {
  dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  album: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v6m0 0l-3-3m3 3l3-3M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  video: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  post: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>,
  analytics: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  keywords: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  coach: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  library: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  cloud: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>,
  cloudOff: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
  user: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  sparkles: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  play: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  save: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  send: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  copy: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  refresh: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  close: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  image: () => <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  music: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
};

// Platform configs
const platforms: Record<Platform, { name: string; color: string; gradient: string }> = {
  youtube: { name: 'YouTube', color: 'red', gradient: 'from-red-600 to-red-800' },
  instagram: { name: 'Instagram', color: 'pink', gradient: 'from-pink-500 to-purple-600' },
  tiktok: { name: 'TikTok', color: 'cyan', gradient: 'from-cyan-400 to-pink-500' },
  twitter: { name: 'X (Twitter)', color: 'gray', gradient: 'from-gray-700 to-black' },
};

// Genre presets for album cover
const genrePresets: Record<string, { colors: string[]; fonts: string[]; styles: string[] }> = {
  hiphop: { colors: ['#FF6B35', '#1A1A2E', '#FFD700', '#FF1744'], fonts: ['Impact', 'Arial Black'], styles: ['bold', 'urban', 'edgy'] },
  pop: { colors: ['#FF69B4', '#FFB6C1', '#FF1493', '#FFFFFF'], fonts: ['Poppins', 'Montserrat'], styles: ['bright', 'modern', 'clean'] },
  rock: { colors: ['#8B0000', '#000000', '#FFD700', '#C0C0C0'], fonts: ['Impact', 'Rockwell'], styles: ['gritty', 'dark', 'intense'] },
  edm: { colors: ['#00FFFF', '#FF00FF', '#7B68EE', '#000000'], fonts: ['Montserrat', 'Poppins'], styles: ['neon', 'glowing', 'electric'] },
  rnb: { colors: ['#4B0082', '#9400D3', '#FFB6C1', '#000000'], fonts: ['Georgia', 'Times New Roman'], styles: ['smooth', 'elegant', 'moody'] },
  country: { colors: ['#8B4513', '#DEB887', '#FFFFFF', '#2F4F4F'], fonts: ['Georgia', 'Courier New'], styles: ['rustic', 'warm', 'classic'] },
  jazz: { colors: ['#2F4F4F', '#DAA520', '#000000', '#F5F5DC'], fonts: ['Times New Roman', 'Georgia'], styles: ['vintage', 'sophisticated', 'moody'] },
  lofi: { colors: ['#FFA07A', '#87CEEB', '#DDA0DD', '#F0E68C'], fonts: ['Comic Sans MS', 'Patrick Hand'], styles: ['chill', 'relaxed', 'pastel'] },
};

// AI Coach responses
const aiResponses: Record<string, string[]> = {
  viral: ["Use trending sounds within 48 hours of them becoming popular", "Post at peak times: 12pm and 7pm local time", "First 3 seconds must hook - no intros!", "Ask questions in captions to boost comments", "Duet/stitch with other creators in your niche"],
  cover: ["Keep it simple - artist name + album title only", "Use high contrast colors for visibility in small sizes", "Test how it looks as a tiny square thumbnail", "Make it recognizable even when blurred", "Use photography over illustrations for personal albums"],
  hashtags: ["Mix 3 large (1M+ posts), 3 medium (100K-1M), 3 niche (<100K)", "Don't exceed 15 hashtags per post", "Put hashtags in first comment, not caption", "Rotate hashtags weekly - Instagram flags repeats", "Include 1-2 location tags for local discovery"],
  youtube: ["Title must have keyword in first 5 words", "Upload consistently - even 1x/week beats sporadic bursts", "End screens matter more than thumbnails for retention", "Reply to every comment in first hour", "Shorts + Long form = algorithm crossover boost"],
  instagram: ["Reels get 3x more reach than static posts", "Carousel posts get 2x more saves", "Stories keep you visible when posting dips", "Link in bio only - no links in posts", "User-generated content is your cheapest growth hack"],
  tiktok: ["Post 3-5 times daily when starting out", "Hook + Value + Pattern interrupt = viral formula", "Sound selection is 80% of virality", "Duet stitches with bigger accounts daily", "Trending audio + original twist = best strategy"],
  default: ["Focus on one platform first - master it before spreading", "Consistency beats virality - post even when no one sees it", "Engage with your community more than you post", "Your bio should answer: Who are you + What do you offer + Call to action", "Track metrics weekly - adjust based on what works"]
};

// Quick actions for AI Coach
const quickQuestions = [
  { key: 'viral', label: '🎯 How to go viral?' },
  { key: 'cover', label: '🎨 Best album cover tips?' },
  { key: 'hashtags', label: '#️⃣ Hashtag strategy?' },
  { key: 'youtube', label: '📺 YouTube growth?' },
  { key: 'instagram', label: '📸 Instagram tips?' },
  { key: 'tiktok', label: '🎵 TikTok strategy?' },
];

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
].join(' ');

let googleIdentityScriptPromise: Promise<void> | null = null;

// Local storage helpers
const STORAGE_KEY = 'musicforge_data';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${key}`);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key: string, value: any) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function isActiveYouTubeConnection(account?: ConnectedAccount) {
  return !!account && account.platform === 'youtube' && !!account.accessToken && !!account.expiresAt && new Date(account.expiresAt).getTime() > Date.now();
}

function getConnectedAccountStatus(account: ConnectedAccount) {
  if (account.platform === 'youtube' && account.expiresAt && new Date(account.expiresAt).getTime() <= Date.now()) {
    return 'expired' as const;
  }

  return account.status;
}

function formatMetric(value?: string | number) {
  if (value === undefined || value === null || value === '') {
    return '--';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat('en-US', {
    notation: numericValue >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(numericValue);
}

function buildHashtagsFromText(text: string) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);

  const uniqueWords = Array.from(new Set(words)).slice(0, 5);
  return [...uniqueWords.map((word) => `#${word}`), '#youtube', '#music', '#newvideo'];
}

function generatePromoCaption(title: string, videoUrl: string, sourceLabel: string) {
  return [
    `New ${sourceLabel.toLowerCase()} drop: ${title}`,
    '',
    `Tap in here: ${videoUrl}`,
    '',
    'If you want more behind-the-scenes or breakdown content, tell me what you want next.',
  ].join('\n');
}

function generateVideoDescription(title: string, videoUrl: string, sourceLabel: string) {
  return [
    `${title}`,
    '',
    `This ${sourceLabel.toLowerCase()} is part of the MusicForge content workflow.`,
    `Watch here: ${videoUrl}`,
    '',
    'Highlights:',
    '- short-form teaser angle',
    '- repurpose-ready promo hooks',
    '- keyword and hashtag expansion potential',
    '',
    'Follow for more music content and rollout ideas.',
  ].join('\n');
}

function generateFollowUpScript(title: string) {
  return [
    `Start with the strongest moment from "${title}" immediately.`,
    'Explain one concrete lesson, detail, or story from the video.',
    'Add a visual pattern interrupt halfway through.',
    'Close by directing viewers to the full version and asking for feedback.',
  ].join('\n\n');
}

function loadGoogleIdentityScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not available.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [toast, setToast] = useState<Toast | null>(null);
  const [remoteSyncStatus, setRemoteSyncStatus] = useState<'offline' | 'syncing' | 'synced' | 'error'>('syncing');
  const [hasHydratedRemote, setHasHydratedRemote] = useState(false);
  
  const [albumCovers, setAlbumCovers] = useState<AlbumCover[]>(() => loadFromStorage('albumCovers', []));
  const [videoConcepts, setVideoConcepts] = useState<VideoConcept[]>(() => loadFromStorage('videoConcepts', []));
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>(() => loadFromStorage('socialPosts', []));
  const [keywords, setKeywords] = useState<KeywordSet[]>(() => loadFromStorage('keywords', []));
  const [aiChat, setAiChat] = useState<ChatMessage[]>(() => loadFromStorage('aiChat', []));
  const [assets, setAssets] = useState<Asset[]>(() => loadFromStorage('assets', []));
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(() => loadFromStorage('connectedAccounts', []));

  // Album cover generator state
  const [coverTitle, setCoverTitle] = useState('');
  const [coverGenre, setCoverGenre] = useState('hiphop');
  const [coverMood, setCoverMood] = useState('energetic');
  const [generatedCover, setGeneratedCover] = useState<{ title: string; gradient: string; style: string } | null>(null);

  // Video concept generator state
  const [videoTopic, setVideoTopic] = useState('');
  const [videoStyle, setVideoStyle] = useState('vlog');
  const [generatedConcept, setGeneratedConcept] = useState<{ title: string; script: string; thumbnail: string } | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Post scheduler state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [selectedYouTubeVideoId, setSelectedYouTubeVideoId] = useState('');

  // Keywords state
  const [keywordInput, setKeywordInput] = useState('');
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([]);

  // AI Coach state
  const [coachInput, setCoachInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [accountPlatform, setAccountPlatform] = useState<Platform>('tiktok');
  const [accountUsername, setAccountUsername] = useState('');
  const [accountUrl, setAccountUrl] = useState('');
  const [instagramAccessToken, setInstagramAccessToken] = useState('');
  const [instagramConnectBusy, setInstagramConnectBusy] = useState(false);
  const [youtubeConnectBusy, setYoutubeConnectBusy] = useState(false);
  const [instagramPublishMode, setInstagramPublishMode] = useState<'image' | 'reel'>('image');
  const [instagramPublishUrl, setInstagramPublishUrl] = useState('');
  const [instagramPublishBusy, setInstagramPublishBusy] = useState(false);
  const [youtubeUploadUrl, setYouTubeUploadUrl] = useState('');
  const [youtubeUploadFile, setYouTubeUploadFile] = useState<File | null>(null);
  const [youtubeUploadTitle, setYouTubeUploadTitle] = useState('');
  const [youtubeUploadDescription, setYouTubeUploadDescription] = useState('');
  const [youtubePrivacyStatus, setYouTubePrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('private');
  const [youtubeUploadBusy, setYouTubeUploadBusy] = useState(false);
  const [youtubeCommentVideoId, setYouTubeCommentVideoId] = useState('');
  const [youtubeCommentsBusy, setYouTubeCommentsBusy] = useState(false);
  const [youtubeCommentThreads, setYouTubeCommentThreads] = useState<YouTubeCommentThread[]>([]);
  const [youtubeReplyDrafts, setYouTubeReplyDrafts] = useState<Record<string, string>>({});

  const youtubeAccount = connectedAccounts.find((account) => account.platform === 'youtube');
  const instagramAccount = connectedAccounts.find((account) => account.platform === 'instagram' && account.status === 'connected');
  const youtubeStatus = youtubeAccount ? getConnectedAccountStatus(youtubeAccount) : null;
  const youtubeVideos = youtubeAccount?.recentVideos || [];
  const uploadedVideos: AutomationVideo[] = assets
    .filter((asset): asset is UploadedVideoAsset => asset.type === 'uploaded_video')
    .map((asset) => ({
      id: String(asset.id),
      title: asset.title,
      publishedAt: asset.savedAt,
      thumbnailUrl: asset.thumbnailUrl,
      videoUrl: asset.videoUrl,
      source: 'upload',
      sourceLabel: 'Upload',
    }));
  const automationVideos: AutomationVideo[] = [
    ...youtubeVideos.map((video) => ({ ...video, source: 'youtube' as const, sourceLabel: 'YouTube' })),
    ...uploadedVideos,
  ];
  const selectedAutomationVideo = automationVideos.find((video) => video.id === selectedYouTubeVideoId) || null;
  const dashboardStatCards = [
    { label: 'Saved Posts', value: formatMetric(socialPosts.length), detail: `${socialPosts.length} created`, icon: Icons.post },
    { label: 'YouTube Views', value: formatMetric(youtubeAccount?.stats?.viewCount), detail: youtubeAccount ? 'Channel lifetime' : 'Connect YouTube', icon: Icons.analytics },
    { label: 'Subscribers', value: formatMetric(youtubeAccount?.stats?.subscriberCount), detail: youtubeAccount ? 'Current channel' : 'Connect YouTube', icon: Icons.sparkles },
    { label: 'Library Assets', value: formatMetric(assets.length), detail: `${assets.length} saved`, icon: Icons.library },
  ];
  const analyticsCards = [
    { label: 'Subscribers', value: formatMetric(youtubeAccount?.stats?.subscriberCount), detail: youtubeAccount ? 'YouTube channel' : 'No channel connected', icon: Icons.sparkles },
    { label: 'Total Views', value: formatMetric(youtubeAccount?.stats?.viewCount), detail: youtubeAccount ? 'Lifetime views' : 'No channel connected', icon: Icons.analytics },
    { label: 'Video Count', value: formatMetric(youtubeAccount?.stats?.videoCount), detail: youtubeAccount ? 'Published videos' : 'No channel connected', icon: Icons.video },
    { label: 'Recent Uploads', value: formatMetric(youtubeVideos.length), detail: youtubeAccount ? 'Imported from YouTube' : 'Connect YouTube', icon: Icons.play },
  ];

  useEffect(() => {
    if (!selectedAutomationVideo) {
      return;
    }

    if (!youtubeUploadTitle) {
      setYouTubeUploadTitle(selectedAutomationVideo.title);
    }

    const canReuseUrl = /^https?:\/\//i.test(selectedAutomationVideo.videoUrl) && !selectedAutomationVideo.videoUrl.includes('youtube.com/watch');
    if (canReuseUrl && !youtubeUploadUrl) {
      setYouTubeUploadUrl(selectedAutomationVideo.videoUrl);
    }
  }, [selectedAutomationVideo, youtubeUploadTitle, youtubeUploadUrl]);

  useEffect(() => {
    const oauth = readInstagramOAuthResultFromUrl();

    if (oauth.error) {
      showToast(oauth.error, 'error');
      return;
    }

    if (!oauth.data) {
      return;
    }

    const instagram = oauth.data;
    const newAccount: ConnectedAccount = {
      id: Date.now(),
      platform: 'instagram',
      username: `@${instagram.profile.username}`,
      profileUrl: `https://www.instagram.com/${instagram.profile.username}/`,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      source: 'oauth',
      accountId: instagram.profile.id,
      thumbnailUrl: instagram.profile.profile_picture_url,
      accessToken: instagram.accessToken,
      accountType: instagram.profile.account_type,
      stats: {
        mediaCount: instagram.profile.media_count ? String(instagram.profile.media_count) : undefined,
      },
      recentMedia: instagram.media.map((item) => ({
        id: item.id,
        title: item.caption?.split('\n')[0]?.slice(0, 80) || 'Instagram post',
        publishedAt: item.timestamp,
        thumbnailUrl: item.thumbnail_url || item.media_url,
        postUrl: item.permalink || `https://www.instagram.com/${instagram.profile.username}/`,
        mediaType: item.media_type,
      })),
    };

    setConnectedAccounts((prev) => {
      const withoutInstagram = prev.filter((account) => !(account.platform === 'instagram' && (account.accountId === instagram.profile.id || account.source === 'oauth')));
      return [newAccount, ...withoutInstagram];
    });
    showToast(`Connected Instagram: @${instagram.profile.username}`);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateRemoteData = async () => {
      try {
        setRemoteSyncStatus('syncing');
        const remoteData = await loadMusicforgeData();

        if (cancelled) {
          return;
        }

        if (remoteData) {
          setAlbumCovers(remoteData.album_covers as AlbumCover[]);
          setVideoConcepts(remoteData.video_concepts as VideoConcept[]);
          setSocialPosts(remoteData.social_posts as SocialPost[]);
          setKeywords(remoteData.keywords as KeywordSet[]);
          setAiChat(remoteData.ai_chat as ChatMessage[]);
          setAssets(remoteData.assets as Asset[]);
          setConnectedAccounts(remoteData.connected_accounts as ConnectedAccount[]);
          setRemoteSyncStatus('synced');
        } else {
          setRemoteSyncStatus('offline');
        }
      } catch {
        if (!cancelled) {
          setRemoteSyncStatus('error');
        }
      } finally {
        if (!cancelled) {
          setHasHydratedRemote(true);
        }
      }
    };

    void hydrateRemoteData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save all data to localStorage
  useEffect(() => {
    saveToStorage('albumCovers', albumCovers);
  }, [albumCovers]);

  useEffect(() => {
    saveToStorage('videoConcepts', videoConcepts);
  }, [videoConcepts]);

  useEffect(() => {
    saveToStorage('socialPosts', socialPosts);
  }, [socialPosts]);

  useEffect(() => {
    saveToStorage('keywords', keywords);
  }, [keywords]);

  useEffect(() => {
    saveToStorage('aiChat', aiChat);
  }, [aiChat]);

  useEffect(() => {
    saveToStorage('assets', assets);
  }, [assets]);

  useEffect(() => {
    saveToStorage('connectedAccounts', connectedAccounts);
  }, [connectedAccounts]);

  useEffect(() => {
    if (!hasHydratedRemote) {
      return;
    }

    const payload: MusicforgeData = {
      album_covers: albumCovers,
      video_concepts: videoConcepts,
      social_posts: socialPosts,
      keywords,
      ai_chat: aiChat,
      assets,
      connected_accounts: connectedAccounts,
    };

    let cancelled = false;

    const persistRemoteData = async () => {
      try {
        setRemoteSyncStatus('syncing');
        await saveMusicforgeData(payload);
        if (!cancelled) {
          setRemoteSyncStatus('synced');
        }
      } catch {
        if (!cancelled) {
          setRemoteSyncStatus('error');
        }
      }
    };

    void persistRemoteData();

    return () => {
      cancelled = true;
    };
  }, [hasHydratedRemote, albumCovers, videoConcepts, socialPosts, keywords, aiChat, assets, connectedAccounts]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Toggle platform selection
  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Generate album cover
  const generateAlbumCover = () => {
    if (!coverTitle.trim()) {
      showToast('Please enter an album title', 'error');
      return;
    }
    const preset = genrePresets[coverGenre] || genrePresets.hiphop;
    const gradient = preset.colors.slice(0, 2).join(', ');
    const style = preset.styles[Math.floor(Math.random() * preset.styles.length)];
    setGeneratedCover({ title: coverTitle, gradient, style });
    showToast('Album cover generated!');
  };

  // Save album cover
  const saveAlbumCover = () => {
    if (!generatedCover) return;
    const newCover = { ...generatedCover, genre: coverGenre, mood: coverMood, id: Date.now() };
    setAlbumCovers(prev => [newCover, ...prev]);
    setAssets(prev => [{ type: 'cover', ...newCover, savedAt: new Date().toISOString() }, ...prev]);
    showToast('Cover saved to library!');
  };

  // Generate video concept
  const generateVideoConcept = () => {
    if (!videoTopic.trim()) {
      showToast('Please enter a video topic', 'error');
      return;
    }
    const scripts = [
      `Hook viewers in first 3 seconds with "${videoTopic}" reveal`,
      `Jump cut to key moments throughout the video`,
      `End with a call-to-action to follow for more content`,
      `Add trending audio overlay for algorithm boost`,
      `Include text overlays for key points`,
    ];
    const thumbnails = ['dramatic close-up', 'colorful collage', 'text-focused', 'action shot', 'behind-the-scenes'];
    setGeneratedConcept({
      title: `My Journey: ${videoTopic}`,
      script: scripts.join('\n\n'),
      thumbnail: thumbnails[Math.floor(Math.random() * thumbnails.length)]
    });
    showToast('Video concept generated!');
  };

  // Save video concept
  const saveVideoConcept = () => {
    if (!generatedConcept) return;
    const newConcept = { ...generatedConcept, topic: videoTopic, style: videoStyle, id: Date.now() };
    setVideoConcepts(prev => [newConcept, ...prev]);
    setAssets(prev => [{ type: 'video', ...newConcept, savedAt: new Date().toISOString() }, ...prev]);
    showToast('Concept saved to library!');
  };

  // Post to social media
  const postToSocial = () => {
    if (selectedPlatforms.length === 0) {
      showToast('Please select at least one platform', 'error');
      return;
    }
    if (!postCaption.trim()) {
      showToast('Please write a caption', 'error');
      return;
    }
    
    const newPost = {
      caption: postCaption,
      hashtags: postHashtags.split(' ').filter(h => h.startsWith('#')),
      platforms: selectedPlatforms,
      id: Date.now(),
      postedAt: new Date().toISOString()
    };
    setSocialPosts(prev => [newPost, ...prev]);
    showToast(`Posted to ${selectedPlatforms.length} platform(s)!`);
    setPostCaption('');
    setPostHashtags('');
    setSelectedPlatforms([]);
  };

  // Generate keywords
  const generateKeywords = () => {
    if (!keywordInput.trim()) {
      showToast('Please enter a genre or track name', 'error');
      return;
    }
    const musicKeywords = [
      `#${keywordInput.replace(/\s+/g, '')}`,
      `#${keywordInput.split(' ')[0]}Music`,
      '#NewMusicFriday',
      '#MusicVideo',
      '#IndieArtist',
      '#Unsigned',
      '#BedroomProducer',
      '#LoFiBeats',
      '#MusicProducer',
      '#SongWriter',
      '#OriginalMusic',
      '#HearThis',
      '#MusicIsLife',
    ];
    const shuffled = musicKeywords.sort(() => Math.random() - 0.5);
    setGeneratedKeywords(shuffled.slice(0, 12));
    setKeywords(prev => [{ query: keywordInput, tags: shuffled, id: Date.now() }, ...prev]);
    showToast('Keywords generated!');
  };

  // Copy keywords
  const copyKeywords = () => {
    navigator.clipboard.writeText(generatedKeywords.join(' '));
    showToast('Keywords copied!');
  };

  // Send AI Coach message
  const sendToCoach = () => {
    if (!coachInput.trim()) return;
    
    const userMessage = { role: 'user' as const, content: coachInput };
    setAiChat(prev => [...prev, { ...userMessage, id: Date.now() }]);
    setCoachInput('');
    
    // Simulate AI typing
    setIsTyping(true);
    setTimeout(() => {
      const responses = aiResponses.default;
      const response = responses[Math.floor(Math.random() * responses.length)];
      setAiChat(prev => [...prev, { role: 'assistant' as const, content: response, id: Date.now() }]);
      setIsTyping(false);
    }, 1500);
  };

  // Quick question to AI Coach
  const askQuickQuestion = (key: string) => {
    const response = aiResponses[key]?.[0] || aiResponses.default[0];
    setAiChat(prev => [
      ...prev,
      { role: 'user' as const, content: `Tell me about ${key}`, id: Date.now() },
      { role: 'assistant' as const, content: response, id: Date.now() + 1 }
    ]);
  };

  // Clear AI chat
  const clearChat = () => {
    setAiChat([]);
    showToast('Chat cleared');
  };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      showToast('Choose a video file', 'error');
      event.target.value = '';
      return;
    }

    try {
      setUploadingVideo(true);
      const upload = await createBlobUpload({
        container: 'promo',
        folder: 'videos',
        fileName: file.name,
        contentType: file.type || 'video/mp4',
      });

      const uploadResponse = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'Content-Type': file.type || 'video/mp4',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        const message = await uploadResponse.text();
        throw new Error(message || 'Video upload failed');
      }

      const newVideoAsset: UploadedVideoAsset = {
        type: 'uploaded_video',
        id: Date.now(),
        savedAt: new Date().toISOString(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        videoUrl: upload.blobUrl,
        blobPath: upload.blobPath,
        source: 'upload',
      };

      setAssets((prev) => [newVideoAsset, ...prev]);
      setSelectedYouTubeVideoId(String(newVideoAsset.id));
      setVideoTopic(newVideoAsset.title);
      showToast('Video uploaded to library');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload video';
      showToast(message, 'error');
    } finally {
      setUploadingVideo(false);
      event.target.value = '';
    }
  };

  const connectYouTubeAccount = async () => {
    if (!googleClientId) {
      showToast('Add VITE_GOOGLE_CLIENT_ID to .env first', 'error');
      return;
    }

    try {
      setYoutubeConnectBusy(true);
      await loadGoogleIdentityScript();
      const existingYouTubeConnection = connectedAccounts.find((account) => account.platform === 'youtube');

      const tokenResponse = await new Promise<GoogleTokenResponse>((resolve, reject) => {
        const tokenClient = window.google?.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: YOUTUBE_SCOPES,
          callback: resolve,
          error_callback: () => reject(new Error('Google sign-in was cancelled or blocked.')),
        });

        if (!tokenClient) {
          reject(new Error('Google Identity Services did not initialize.'));
          return;
        }

        tokenClient.requestAccessToken({ prompt: isActiveYouTubeConnection(existingYouTubeConnection) ? '' : 'consent' });
      });

      if (tokenResponse.error || !tokenResponse.access_token) {
        throw new Error(tokenResponse.error_description || tokenResponse.error || 'Google did not return an access token.');
      }

      const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true', {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      if (!channelResponse.ok) {
        throw new Error('Connected Google account does not appear to have an accessible YouTube channel.');
      }

      const channelData = await channelResponse.json() as {
        items?: Array<{
          id: string;
          snippet?: {
            title?: string;
            customUrl?: string;
            thumbnails?: {
              default?: { url?: string };
              high?: { url?: string };
            };
          };
          statistics?: {
            subscriberCount?: string;
            videoCount?: string;
            viewCount?: string;
          };
          contentDetails?: {
            relatedPlaylists?: {
              uploads?: string;
            };
          };
        }>;
      };

      const channel = channelData.items?.[0];
      if (!channel?.id || !channel.snippet?.title) {
        throw new Error('No YouTube channel was returned for this Google account.');
      }

      let recentVideos: ConnectedAccount['recentVideos'] = [];
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

      if (uploadsPlaylistId) {
        const playlistResponse = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=6&playlistId=${encodeURIComponent(uploadsPlaylistId)}`, {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        if (playlistResponse.ok) {
          const playlistData = await playlistResponse.json() as {
            items?: Array<{
              snippet?: {
                title?: string;
                publishedAt?: string;
                resourceId?: { videoId?: string };
                thumbnails?: {
                  medium?: { url?: string };
                  high?: { url?: string };
                };
              };
            }>;
          };

          recentVideos = (playlistData.items || [])
            .map((item) => {
              const videoId = item.snippet?.resourceId?.videoId;
              if (!videoId || !item.snippet?.title) {
                return null;
              }

              return {
                id: videoId,
                title: item.snippet.title,
                publishedAt: item.snippet.publishedAt,
                thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              };
            })
            .filter((video): video is NonNullable<typeof video> => !!video);
        }
      }

      const username = channel.snippet.customUrl || channel.snippet.title;
      const profileUrl = `https://www.youtube.com/channel/${channel.id}`;
      const expiresAt = new Date(Date.now() + (tokenResponse.expires_in ?? 3600) * 1000).toISOString();

      const newAccount: ConnectedAccount = {
        id: Date.now(),
        platform: 'youtube',
        username,
        profileUrl,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        source: 'oauth',
        channelId: channel.id,
        thumbnailUrl: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
        accessToken: tokenResponse.access_token,
        expiresAt,
        scopes: YOUTUBE_SCOPES.split(' '),
        stats: {
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
        },
        recentVideos,
      };

      setConnectedAccounts((prev) => {
        const withoutYoutube = prev.filter((account) => !(account.platform === 'youtube' && (account.channelId === channel.id || account.source === 'oauth')));
        return [newAccount, ...withoutYoutube];
      });

      showToast(`Connected YouTube channel: ${channel.snippet.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect YouTube.';
      showToast(message, 'error');
    } finally {
      setYoutubeConnectBusy(false);
    }
  };

  const connectInstagramAccount = async (tokenOverride?: string) => {
    const accessToken = tokenOverride || instagramAccessToken.trim();

    if (!accessToken) {
      showToast('Paste an Instagram access token first', 'error');
      return;
    }

    try {
      setInstagramConnectBusy(true);
      const instagram = await connectInstagram(accessToken);
      const newAccount: ConnectedAccount = {
        id: Date.now(),
        platform: 'instagram',
        username: `@${instagram.profile.username}`,
        profileUrl: `https://www.instagram.com/${instagram.profile.username}/`,
        status: 'connected',
        connectedAt: new Date().toISOString(),
        source: 'token',
        accountId: instagram.profile.id,
        accountType: instagram.profile.account_type,
        accessToken,
        stats: {
          mediaCount: instagram.profile.media_count ? String(instagram.profile.media_count) : undefined,
        },
        recentMedia: instagram.media.map((item) => ({
          id: item.id,
          title: item.caption?.split('\n')[0]?.slice(0, 80) || 'Instagram post',
          publishedAt: item.timestamp,
          thumbnailUrl: item.thumbnail_url || item.media_url,
          postUrl: item.permalink || `https://www.instagram.com/${instagram.profile.username}/`,
          mediaType: item.media_type,
        })),
      };

      setConnectedAccounts((prev) => {
        const withoutInstagram = prev.filter((account) => !(account.platform === 'instagram' && (account.accountId === instagram.profile.id || account.source === 'token')));
        return [newAccount, ...withoutInstagram];
      });

      setInstagramAccessToken('');
      showToast(`Connected Instagram: @${instagram.profile.username}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect Instagram.';
      showToast(message, 'error');
    } finally {
      setInstagramConnectBusy(false);
    }
  };

  const connectAccount = () => {
    if (!accountUsername.trim()) {
      showToast('Enter a username or channel handle', 'error');
      return;
    }

    const trimmedUrl = accountUrl.trim();
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      showToast('Profile URL must start with http:// or https://', 'error');
      return;
    }

    const exists = connectedAccounts.some(
      (account) => account.platform === accountPlatform && account.username.toLowerCase() === accountUsername.trim().toLowerCase()
    );

    if (exists) {
      showToast('That account is already linked', 'error');
      return;
    }

    const newAccount: ConnectedAccount = {
      id: Date.now(),
      platform: accountPlatform,
      username: accountUsername.trim(),
      profileUrl: trimmedUrl,
      status: 'linked',
      connectedAt: new Date().toISOString(),
      source: 'manual',
    };

    setConnectedAccounts((prev) => [newAccount, ...prev]);
    setAccountUsername('');
    setAccountUrl('');
    showToast(`${platforms[accountPlatform].name} profile linked`);
  };

  const publishToInstagram = async () => {
    if (!instagramAccount?.accountId || !instagramAccount.accessToken) {
      showToast('Connect Instagram first', 'error');
      return;
    }

    if (!instagramPublishUrl.trim()) {
      showToast(`Paste a public ${instagramPublishMode === 'image' ? 'image' : 'video'} URL first`, 'error');
      return;
    }

    try {
      setInstagramPublishBusy(true);
      const caption = [postCaption.trim(), postHashtags.trim()].filter(Boolean).join('\n\n');
      await publishInstagram({
        igUserId: instagramAccount.accountId,
        accessToken: instagramAccount.accessToken,
        caption,
        mediaType: instagramPublishMode,
        imageUrl: instagramPublishMode === 'image' ? instagramPublishUrl.trim() : undefined,
        videoUrl: instagramPublishMode === 'reel' ? instagramPublishUrl.trim() : undefined,
      });
      showToast('Instagram publish request sent');
      const newPost = {
        caption,
        hashtags: postHashtags.split(' ').filter(h => h.startsWith('#')),
        platforms: ['instagram'] as Platform[],
        id: Date.now(),
        postedAt: new Date().toISOString(),
      };
      setSocialPosts(prev => [newPost, ...prev]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish to Instagram.';
      showToast(message, 'error');
    } finally {
      setInstagramPublishBusy(false);
    }
  };

  const uploadToYouTube = async () => {
    if (!youtubeAccount?.accessToken) {
      showToast('Connect YouTube first', 'error');
      return;
    }

    if (!youtubeUploadFile && !youtubeUploadUrl.trim()) {
      showToast('Choose a video file or paste a public video URL first', 'error');
      return;
    }

    try {
      setYouTubeUploadBusy(true);
      const commonInput = {
        accessToken: youtubeAccount.accessToken,
        title: youtubeUploadTitle.trim() || youtubeUploadFile?.name.replace(/\.[^/.]+$/, '') || 'MusicForge Upload',
        description: youtubeUploadDescription.trim() || postCaption.trim(),
        tags: postHashtags.split(' ').filter(h => h.startsWith('#')).map((tag) => tag.replace(/^#/, '')),
        privacyStatus: youtubePrivacyStatus,
      };

      if (youtubeUploadFile) {
        await uploadYouTubeDirect({
          ...commonInput,
          file: youtubeUploadFile,
        });
      } else {
        await uploadYouTube({
          ...commonInput,
          videoUrl: youtubeUploadUrl.trim(),
        });
      }

      const newPost = {
        caption: youtubeUploadDescription.trim() || postCaption.trim() || youtubeUploadTitle.trim(),
        hashtags: postHashtags.split(' ').filter(h => h.startsWith('#')),
        platforms: ['youtube'] as Platform[],
        id: Date.now(),
        postedAt: new Date().toISOString(),
      };
      setSocialPosts(prev => [newPost, ...prev]);
      setYouTubeUploadFile(null);
      showToast('YouTube upload started');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload to YouTube.';
      showToast(message, 'error');
    } finally {
      setYouTubeUploadBusy(false);
    }
  };

  const loadYouTubeComments = async () => {
    if (!youtubeAccount?.accessToken) {
      showToast('Connect YouTube first', 'error');
      return;
    }

    if (!youtubeCommentVideoId.trim()) {
      showToast('Enter a YouTube video ID first', 'error');
      return;
    }

    try {
      setYouTubeCommentsBusy(true);
      const result = await fetchYouTubeComments({
        accessToken: youtubeAccount.accessToken,
        videoId: youtubeCommentVideoId.trim(),
      });
      setYouTubeCommentThreads(result.items || []);
      showToast('YouTube comments loaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load YouTube comments.';
      showToast(message, 'error');
    } finally {
      setYouTubeCommentsBusy(false);
    }
  };

  const sendYouTubeReply = async (parentId?: string) => {
    if (!youtubeAccount?.accessToken || !parentId) {
      showToast('YouTube reply could not be sent', 'error');
      return;
    }

    const text = youtubeReplyDrafts[parentId]?.trim();
    if (!text) {
      showToast('Write a reply first', 'error');
      return;
    }

    try {
      await replyYouTubeComment({
        accessToken: youtubeAccount.accessToken,
        parentId,
        text,
      });
      setYouTubeReplyDrafts((prev) => ({ ...prev, [parentId]: '' }));
      showToast('YouTube reply sent');
      await loadYouTubeComments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send YouTube reply.';
      showToast(message, 'error');
    }
  };

  const removeConnectedAccount = (id: number) => {
    setConnectedAccounts((prev) => prev.filter((account) => account.id !== id));
    showToast('Account removed');
  };

  const useYouTubeVideoForPost = (videoId: string) => {
    const video = automationVideos.find((entry) => entry.id === videoId);
    if (!video) {
      showToast('Choose a valid video source first', 'error');
      return;
    }

    setSelectedYouTubeVideoId(video.id);
    setPostCaption(generatePromoCaption(video.title, video.videoUrl, video.sourceLabel));
    setPostHashtags(buildHashtagsFromText(video.title).join(' '));
    setSelectedPlatforms((prev) => (prev.includes('youtube') ? prev : ['youtube', ...prev]));
    showToast(`Post draft filled from ${video.sourceLabel}`);
  };

  const useYouTubeVideoForKeywords = (videoId: string) => {
    const video = automationVideos.find((entry) => entry.id === videoId);
    if (!video) {
      showToast('Choose a valid video source first', 'error');
      return;
    }

    const tags = buildHashtagsFromText(video.title);
    setSelectedYouTubeVideoId(video.id);
    setKeywordInput(video.title);
    setGeneratedKeywords(tags);
    setKeywords((prev) => [{ query: video.title, tags, id: Date.now() }, ...prev]);
    showToast(`Keywords generated from ${video.sourceLabel}`);
  };

  const automatePostDraftsFromYouTube = () => {
    if (automationVideos.length === 0) {
      showToast('Upload a video or connect YouTube first', 'error');
      return;
    }

    const drafts = automationVideos.slice(0, 3).map((video, index) => ({
      id: Date.now() + index,
      caption: generatePromoCaption(video.title, video.videoUrl, video.sourceLabel),
      hashtags: buildHashtagsFromText(video.title),
      platforms: ['youtube', 'instagram', 'twitter'] as Platform[],
      postedAt: new Date().toISOString(),
    }));

    setSocialPosts((prev) => [...drafts, ...prev]);
    showToast(`Created ${drafts.length} social post drafts`);
  };

  const automateKeywordsFromYouTube = () => {
    if (automationVideos.length === 0) {
      showToast('Upload a video or connect YouTube first', 'error');
      return;
    }

    const sets = automationVideos.slice(0, 5).map((video, index) => ({
      id: Date.now() + index,
      query: video.title,
      tags: buildHashtagsFromText(video.title),
    }));

    setKeywords((prev) => [...sets, ...prev]);
    setGeneratedKeywords(sets[0]?.tags || []);
    setKeywordInput(sets[0]?.query || '');
    showToast(`Generated ${sets.length} keyword sets`);
  };

  const automateVideoConceptsFromYouTube = () => {
    if (automationVideos.length === 0) {
      showToast('Upload a video or connect YouTube first', 'error');
      return;
    }

    const concepts = automationVideos.slice(0, 3).map((video, index) => ({
      id: Date.now() + index,
      title: `Expand: ${video.title}`,
      topic: video.title,
      style: 'shorts',
      script: generateFollowUpScript(video.title),
      thumbnail: 'text-focused',
    }));

    setVideoConcepts((prev) => [...concepts, ...prev]);
    setGeneratedConcept(concepts[0] || null);
    setVideoTopic(concepts[0]?.topic || '');
    setVideoStyle(concepts[0]?.style || 'shorts');
    showToast(`Created ${concepts.length} video concepts`);
  };

  const applyAutomationCopyToPost = () => {
    if (!selectedAutomationVideo) {
      showToast('Choose a video source first', 'error');
      return;
    }

    setPostCaption(generatePromoCaption(selectedAutomationVideo.title, selectedAutomationVideo.videoUrl, selectedAutomationVideo.sourceLabel));
    setPostHashtags(buildHashtagsFromText(selectedAutomationVideo.title).join(' '));
    showToast('Caption and hashtags regenerated');
  };

  const applyAutomationCopyToConcept = () => {
    if (!selectedAutomationVideo) {
      showToast('Choose a video source first', 'error');
      return;
    }

    setVideoTopic(selectedAutomationVideo.title);
    setVideoStyle('shorts');
    setGeneratedConcept({
      title: `Follow-up: ${selectedAutomationVideo.title}`,
      script: `${generateFollowUpScript(selectedAutomationVideo.title)}\n\nDescription:\n${generateVideoDescription(selectedAutomationVideo.title, selectedAutomationVideo.videoUrl, selectedAutomationVideo.sourceLabel)}`,
      thumbnail: 'text-focused',
    });
    showToast('Video concept copy generated');
  };

  // Navigation items
  const navItems: { id: Tab; label: string; icon: () => ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
    { id: 'album', label: 'Album Cover', icon: Icons.album },
    { id: 'video', label: 'Video Ideas', icon: Icons.video },
    { id: 'post', label: 'Post Now', icon: Icons.post },
    { id: 'analytics', label: 'Analytics', icon: Icons.analytics },
    { id: 'keywords', label: 'Keywords', icon: Icons.keywords },
    { id: 'coach', label: 'AI Coach', icon: Icons.coach },
    { id: 'accounts', label: 'Accounts', icon: Icons.user },
    { id: 'library', label: 'Library', icon: Icons.library },
  ];

  // Tab content components
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Welcome to MusicForge</h2>
              <p className="text-gray-400">Your all-in-one social media promotion console for musicians.</p>
            </div>

            {youtubeAccount && (
              <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {youtubeAccount.thumbnailUrl && (
                      <img src={youtubeAccount.thumbnailUrl} alt={youtubeAccount.username} className="w-14 h-14 rounded-full object-cover border border-red-500/20" />
                    )}
                    <div>
                      <p className="text-white font-semibold">{youtubeAccount.username}</p>
                      <p className="text-sm text-red-200">
                        YouTube {youtubeStatus} with {formatMetric(youtubeAccount.stats?.subscriberCount)} subscribers and {formatMetric(youtubeAccount.stats?.viewCount)} views
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="text-sm text-red-300 hover:text-red-200 underline"
                  >
                    Manage Connection
                  </button>
                </div>
              </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardStatCards.map((stat, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-sm">{stat.label}</span>
                    <stat.icon />
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-gray-400 text-sm mt-1">{stat.detail}</div>
                </div>
              ))}
            </div>

            {/* Recent Posts */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Posts</h3>
              {socialPosts.length === 0 ? (
                <p className="text-gray-500 text-sm">No posts yet. Create your first post!</p>
              ) : (
                <div className="space-y-3">
                  {socialPosts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                      <div className="flex gap-1">
                        {post.platforms.map((p: Platform) => (
                          <span key={p} className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">{platforms[p]?.name}</span>
                        ))}
                      </div>
                      <span className="text-gray-400 text-sm truncate flex-1">{post.caption?.slice(0, 50)}...</span>
                      <span className="text-gray-500 text-xs">{new Date(post.postedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => setActiveTab('album')} className="bg-gradient-to-br from-pink-600 to-purple-600 p-5 rounded-xl text-white font-semibold hover:opacity-90 transition">
                🎨 Generate Cover
              </button>
              <button onClick={() => setActiveTab('video')} className="bg-gradient-to-br from-cyan-600 to-blue-600 p-5 rounded-xl text-white font-semibold hover:opacity-90 transition">
                🎬 Video Idea
              </button>
              <button onClick={() => setActiveTab('post')} className="bg-gradient-to-br from-green-600 to-emerald-600 p-5 rounded-xl text-white font-semibold hover:opacity-90 transition">
                📤 Post Now
              </button>
              <button onClick={() => setActiveTab('keywords')} className="bg-gradient-to-br from-orange-600 to-red-600 p-5 rounded-xl text-white font-semibold hover:opacity-90 transition">
                #️⃣ Keywords
              </button>
            </div>

            {youtubeVideos.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Latest YouTube Uploads</h3>
                  <button onClick={() => setActiveTab('accounts')} className="text-sm text-red-300 hover:text-red-200 underline">
                    Refresh In Accounts
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {youtubeVideos.slice(0, 3).map((video) => (
                    <a
                      key={video.id}
                      href={video.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-700/30 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition"
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                          <Icons.video />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                        {video.publishedAt && (
                          <p className="text-gray-500 text-xs mt-1">{new Date(video.publishedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {youtubeVideos.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">Automation</h3>
                  <p className="text-sm text-gray-400">Create drafts from your recent YouTube uploads with one click.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={automatePostDraftsFromYouTube}
                    className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
                  >
                    <p className="font-semibold">Create Post Drafts</p>
                    <p className="text-sm text-green-100 mt-1">Generate social captions and hashtags from recent uploads.</p>
                  </button>
                  <button
                    onClick={automateVideoConceptsFromYouTube}
                    className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
                  >
                    <p className="font-semibold">Create Video Ideas</p>
                    <p className="text-sm text-cyan-100 mt-1">Turn uploads into follow-up shorts and breakdown concepts.</p>
                  </button>
                  <button
                    onClick={automateKeywordsFromYouTube}
                    className="bg-gradient-to-br from-orange-600 to-red-700 text-white rounded-xl p-4 text-left hover:opacity-90 transition"
                  >
                    <p className="font-semibold">Create Keyword Sets</p>
                    <p className="text-sm text-orange-100 mt-1">Build reusable hashtag packs from imported titles.</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'album':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Album Cover Generator</h2>
              <p className="text-gray-400">Create eye-catching album art for your music.</p>
            </div>

            {/* Controls */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Album Title</label>
                <input
                  type="text"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                  placeholder="Enter your album title"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Genre</label>
                  <select
                    value={coverGenre}
                    onChange={(e) => setCoverGenre(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="hiphop">Hip Hop</option>
                    <option value="pop">Pop</option>
                    <option value="rock">Rock</option>
                    <option value="edm">EDM</option>
                    <option value="rnb">R&B</option>
                    <option value="country">Country</option>
                    <option value="jazz">Jazz</option>
                    <option value="lofi">Lo-Fi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Mood</label>
                  <select
                    value={coverMood}
                    onChange={(e) => setCoverMood(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="energetic">Energetic</option>
                    <option value="chill">Chill</option>
                    <option value="dark">Dark</option>
                    <option value="bright">Bright</option>
                    <option value="moody">Moody</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={generateAlbumCover} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                  <Icons.sparkles /> Generate Cover
                </button>
                {generatedCover && (
                  <button onClick={saveAlbumCover} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                    <Icons.save /> Save
                  </button>
                )}
              </div>
            </div>

            {/* Preview */}
            {generatedCover && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
                <div 
                  className="w-full aspect-square max-w-sm mx-auto rounded-xl flex items-center justify-center p-8"
                  style={{ background: `linear-gradient(135deg, ${generatedCover.gradient})` }}
                >
                  <div className="text-center">
                    <Icons.music />
                    <h4 className="text-white text-2xl font-bold mt-4 drop-shadow-lg">{generatedCover.title}</h4>
                    <p className="text-white/80 text-sm mt-2 uppercase tracking-widest">{generatedCover.style}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Covers */}
            {albumCovers.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Recently Generated</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {albumCovers.slice(0, 4).map((cover) => (
                    <div key={cover.id} className="rounded-lg overflow-hidden">
                      <div 
                        className="w-full aspect-square"
                        style={{ background: `linear-gradient(135deg, ${cover.gradient})` }}
                      />
                      <p className="text-gray-400 text-sm mt-2 truncate">{cover.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Video Concept Generator</h2>
              <p className="text-gray-400">Get video ideas and scripts for your music content.</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Upload Your Video</h3>
                  <p className="text-sm text-gray-400">Bring a video into MusicForge so automation can build posts, keywords, and concepts from it.</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-cyan-600/20 text-cyan-300 border border-cyan-500/20">
                  {uploadedVideos.length} uploaded
                </span>
              </div>

              <label className="block">
                <span className="sr-only">Upload video</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                  className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-cyan-700"
                />
              </label>

              <p className="text-xs text-gray-500">
                Uploaded files stay available in the current browser session and are used to generate drafts, keywords, and concepts.
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Video Topic</label>
                <input
                  type="text"
                  value={videoTopic}
                  onChange={(e) => setVideoTopic(e.target.value)}
                  placeholder="e.g., How I made my latest track"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Video Style</label>
                <select
                  value={videoStyle}
                  onChange={(e) => setVideoStyle(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="vlog">Behind the Scenes Vlog</option>
                  <option value="tutorial">Tutorial / How-To</option>
                  <option value="lyric">Lyric Video</option>
                  <option value="react">Reaction Video</option>
                  <option value="shorts">YouTube Shorts</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button onClick={generateVideoConcept} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                  <Icons.sparkles /> Generate Concept
                </button>
                {generatedConcept && (
                  <button onClick={saveVideoConcept} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                    <Icons.save /> Save
                  </button>
                )}
              </div>
            </div>

            {generatedConcept && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
                <h3 className="text-lg font-semibold text-white">Generated Concept</h3>
                
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Title:</span>
                  <h4 className="text-white text-xl font-bold">{generatedConcept.title}</h4>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Script Outline:</span>
                  <p className="text-gray-300 whitespace-pre-line mt-2">{generatedConcept.script}</p>
                </div>

                <div className="bg-gray-700/30 rounded-lg p-4">
                  <span className="text-gray-400 text-sm">Thumbnail Style:</span>
                  <p className="text-white capitalize">{generatedConcept.thumbnail}</p>
                </div>
              </div>
            )}

            {videoConcepts.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Saved Concepts</h3>
                <div className="space-y-3">
                  {videoConcepts.slice(0, 5).map((concept) => (
                    <div key={concept.id} className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="text-white font-medium">{concept.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{concept.script?.slice(0, 100)}...</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'post':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">YouTube Publishing</h2>
              <p className="text-gray-400">Prepare uploads, descriptions, and follow-up content for your YouTube channel.</p>
            </div>

            {automationVideos.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Use Video As Source</h3>
                    <p className="text-sm text-gray-400">Pick an uploaded or imported video to prefill this post.</p>
                  </div>
                  {selectedAutomationVideo && (
                    <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/20">
                      Selected: {selectedAutomationVideo.title}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {automationVideos.slice(0, 6).map((video) => (
                    <button
                      key={video.id}
                      onClick={() => useYouTubeVideoForPost(video.id)}
                      className={`text-left rounded-xl overflow-hidden border transition ${
                        selectedYouTubeVideoId === video.id ? 'border-red-500 bg-red-500/10' : 'border-gray-700 bg-gray-700/30 hover:border-gray-600'
                      }`}
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                          <Icons.video />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-1 rounded border ${video.source === 'youtube' ? 'bg-red-600/20 text-red-300 border-red-500/20' : 'bg-cyan-600/20 text-cyan-300 border-cyan-500/20'}`}>{video.sourceLabel}</span>
                        </div>
                        <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                        {video.publishedAt && (
                          <p className="text-gray-500 text-xs mt-1">{new Date(video.publishedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={applyAutomationCopyToConcept}
                  disabled={!selectedAutomationVideo}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Generate Follow-Up Concept From Selected Video
                </button>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-xl p-6 border border-red-500/20 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Draft Copy</h3>
                  <p className="text-sm text-gray-400">Build a description, hashtags, and reusable promo copy for YouTube-first publishing.</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/20">YouTube First</span>
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Connected Platforms</label>
                <div className="flex flex-wrap gap-3">
                  {(['youtube', 'instagram'] as Platform[]).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        selectedPlatforms.includes(platform)
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {platforms[platform].name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Caption</label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Write your post caption..."
                  rows={4}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Hashtags (space separated)</label>
                <input
                  type="text"
                  value={postHashtags}
                  onChange={(e) => setPostHashtags(e.target.value)}
                  placeholder="#music #newtrack #indieartist"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>

              <button onClick={postToSocial} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                <Icons.send /> Save Draft
              </button>
            </div>

            {youtubeAccount && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-red-500/20 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Upload To YouTube</h3>
                    <p className="text-sm text-gray-400">This is the main publishing action in MusicForge right now.</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/20">
                    {youtubeAccount.username}
                  </span>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Upload Video File</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setYouTubeUploadFile(file);
                      if (file && !youtubeUploadTitle) {
                        setYouTubeUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-3 file:font-semibold file:text-white hover:file:bg-red-700"
                  />
                  {youtubeUploadFile && (
                    <p className="text-xs text-gray-500 mt-2">Selected file: {youtubeUploadFile.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Or Public Video URL</label>
                  <input
                    type="url"
                    value={youtubeUploadUrl}
                    onChange={(e) => setYouTubeUploadUrl(e.target.value)}
                    placeholder="https://...video.mp4"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={youtubeUploadTitle}
                      onChange={(e) => setYouTubeUploadTitle(e.target.value)}
                      placeholder="YouTube title"
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Privacy</label>
                    <select
                      value={youtubePrivacyStatus}
                      onChange={(e) => setYouTubePrivacyStatus(e.target.value as 'private' | 'unlisted' | 'public')}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="private">Private</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={youtubeUploadDescription}
                    onChange={(e) => setYouTubeUploadDescription(e.target.value)}
                    rows={4}
                    placeholder="YouTube description"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <button
                  onClick={() => {
                    setYouTubeUploadFile(null);
                    if (selectedAutomationVideo?.videoUrl && /^https?:\/\//i.test(selectedAutomationVideo.videoUrl) && !selectedAutomationVideo.videoUrl.includes('youtube.com/watch')) {
                      setYouTubeUploadUrl(selectedAutomationVideo.videoUrl);
                    }
                    if (selectedAutomationVideo?.title) {
                      setYouTubeUploadTitle(selectedAutomationVideo.title);
                    }
                  }}
                  className="text-sm text-red-300 hover:text-red-200 underline text-left"
                >
                  Use selected uploaded video when available
                </button>

                <button
                  onClick={() => void uploadToYouTube()}
                  disabled={youtubeUploadBusy}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {youtubeUploadBusy ? 'Uploading To YouTube...' : 'Upload To YouTube'}
                </button>
              </div>
            )}

            {instagramAccount && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-pink-500/20 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Optional Instagram Publish</h3>
                  <p className="text-sm text-gray-400">Instagram remains available as a secondary workflow, but YouTube is the primary path in this app.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Media Type</label>
                    <select
                      value={instagramPublishMode}
                      onChange={(e) => setInstagramPublishMode(e.target.value as 'image' | 'reel')}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                    >
                      <option value="image">Image Post</option>
                      <option value="reel">Reel / Video</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Public Media URL</label>
                    <input
                      type="url"
                      value={instagramPublishUrl}
                      onChange={(e) => setInstagramPublishUrl(e.target.value)}
                      placeholder={instagramPublishMode === 'image' ? 'https://...image.jpg' : 'https://...video.mp4'}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => void publishToInstagram()}
                  disabled={instagramPublishBusy}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {instagramPublishBusy ? 'Publishing To Instagram...' : 'Publish To Instagram'}
                </button>
              </div>
            )}

            {socialPosts.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Post History</h3>
                <div className="space-y-3">
                  {socialPosts.slice(0, 10).map((post) => (
                    <div key={post.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex gap-2 mb-2">
                        {post.platforms.map((p: Platform) => (
                          <span key={p} className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">{platforms[p]?.name}</span>
                        ))}
                      </div>
                      <p className="text-gray-300 text-sm">{post.caption}</p>
                      <p className="text-gray-500 text-xs mt-2">{new Date(post.postedAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">YouTube Command Center</h2>
              <p className="text-gray-400">Track uploads, audience signals, and comment activity from your YouTube channel.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analyticsCards.map((stat, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-400 text-sm">{stat.label}</span>
                    <stat.icon />
                  </div>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-gray-400 text-sm mt-1">{stat.detail}</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Focus</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">YouTube</span>
                    <span className="text-gray-400">{youtubeVideos.length > 0 ? '100%' : '65%'}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-600 to-red-800 rounded-full" style={{ width: youtubeVideos.length > 0 ? '100%' : '65%' }} />
                  </div>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4">
                  <p className="text-white font-medium">Primary workflow</p>
                  <p className="text-sm text-gray-400 mt-1">Uploads, metadata drafting, and comment replies are centered on YouTube first. Other platforms are secondary.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">YouTube Snapshot</h3>
              {!youtubeAccount ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Connect YouTube in Accounts to unlock real channel data here.</p>
                </div>
              ) : youtubeVideos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Channel connected, but no recent uploads were returned yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {youtubeVideos.slice(0, 5).map((video) => (
                    <a
                      key={video.id}
                      href={video.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-700 hover:border-gray-600 transition"
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="w-24 h-14 rounded object-cover" />
                      ) : (
                        <div className="w-24 h-14 rounded bg-gray-700 flex items-center justify-center">
                          <Icons.video />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{video.title}</p>
                        {video.publishedAt && (
                          <p className="text-gray-500 text-xs mt-1">Published {new Date(video.publishedAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-red-500/20 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">YouTube Comments</h3>
                    <p className="text-sm text-gray-400">Load recent comments for a video and reply from the app.</p>
                  </div>
                  <button
                    onClick={() => void loadYouTubeComments()}
                    disabled={!youtubeAccount || youtubeCommentsBusy}
                    className="text-red-300 hover:text-red-200 disabled:opacity-50 text-sm flex items-center gap-1"
                  >
                    <Icons.refresh /> {youtubeCommentsBusy ? 'Loading...' : 'Load'}
                  </button>
                </div>

                <input
                  type="text"
                  value={youtubeCommentVideoId}
                  onChange={(e) => setYouTubeCommentVideoId(e.target.value)}
                  placeholder="YouTube video ID"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />

                {!youtubeAccount ? (
                  <p className="text-sm text-gray-500">Connect YouTube to load comments.</p>
                ) : youtubeCommentThreads.length === 0 ? (
                  <p className="text-sm text-gray-500">No YouTube comments loaded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {youtubeCommentThreads.map((thread) => {
                      const topComment = thread.snippet?.topLevelComment;
                      const topCommentId = topComment?.id;
                      return (
                        <div key={thread.id} className="rounded-lg border border-gray-700 bg-gray-900/40 p-4 space-y-3">
                          <div>
                            <p className="text-white font-medium">{topComment?.snippet?.authorDisplayName || 'Viewer'}</p>
                            <p className="text-sm text-gray-200 mt-1">{topComment?.snippet?.textDisplay || '(no text)'}</p>
                            {topComment?.snippet?.publishedAt && (
                              <p className="text-xs text-gray-500 mt-1">{new Date(topComment.snippet.publishedAt).toLocaleString()}</p>
                            )}
                          </div>

                          {(thread.replies?.comments || []).length > 0 && (
                            <div className="space-y-2">
                              {thread.replies?.comments?.map((reply) => (
                                <div key={reply.id} className="ml-4 rounded-lg bg-gray-800/80 border border-gray-700 p-3">
                                  <p className="text-xs text-red-300">{reply.snippet?.authorDisplayName || 'Reply'}</p>
                                  <p className="text-sm text-gray-200 mt-1">{reply.snippet?.textDisplay || '(no text)'}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={topCommentId ? (youtubeReplyDrafts[topCommentId] || '') : ''}
                              onChange={(e) => {
                                if (!topCommentId) return;
                                setYouTubeReplyDrafts((prev) => ({ ...prev, [topCommentId]: e.target.value }));
                              }}
                              placeholder="Reply to this comment"
                              className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                            />
                            <button
                              onClick={() => void sendYouTubeReply(topCommentId)}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'keywords':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Keyword Research</h2>
              <p className="text-gray-400">Find trending hashtags and keywords for your music.</p>
            </div>

            {automationVideos.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Generate From Video Title</h3>
                    <p className="text-sm text-gray-400">Turn uploaded or imported videos into ready-made keyword sets.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {automationVideos.slice(0, 6).map((video) => (
                    <button
                      key={video.id}
                      onClick={() => useYouTubeVideoForKeywords(video.id)}
                      className={`text-left rounded-xl overflow-hidden border transition ${
                        selectedYouTubeVideoId === video.id ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-700/30 hover:border-gray-600'
                      }`}
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                          <Icons.video />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-1 rounded border ${video.source === 'youtube' ? 'bg-red-600/20 text-red-300 border-red-500/20' : 'bg-cyan-600/20 text-cyan-300 border-cyan-500/20'}`}>{video.sourceLabel}</span>
                        </div>
                        <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                        <p className="text-gray-500 text-xs mt-1">Use title for tags</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={applyAutomationCopyToPost}
                  disabled={!selectedAutomationVideo}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Regenerate Caption From Selected Video
                </button>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Enter Genre or Track Name</label>
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="e.g., Hip Hop, Lo-Fi, My New Single"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <button onClick={generateKeywords} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2">
                <Icons.sparkles /> Generate Keywords
              </button>
            </div>

            {generatedKeywords.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Keywords</h3>
                  <button onClick={copyKeywords} className="text-orange-400 hover:text-orange-300 flex items-center gap-1 text-sm">
                    <Icons.copy /> Copy All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {generatedKeywords.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm border border-orange-500/30">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">Saved Keyword Sets</h3>
                <div className="space-y-4">
                  {keywords.slice(0, 5).map((kw) => (
                    <div key={kw.id} className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-gray-300 text-sm font-medium mb-2">#{kw.query}</p>
                      <div className="flex flex-wrap gap-1">
                        {kw.tags.slice(0, 6).map((tag: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-600 text-gray-400 rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'coach':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">AI Music Coach</h2>
              <p className="text-gray-400">Get expert advice on promoting your music.</p>
            </div>

            {/* Quick Questions */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Questions</h3>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => askQuickQuestion(q.key)}
                    className="px-3 py-2 bg-violet-600/20 text-violet-400 rounded-lg text-sm hover:bg-violet-600/30 transition"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Chat</h3>
                {aiChat.length > 0 && (
                  <button onClick={clearChat} className="text-gray-500 hover:text-gray-400 text-sm flex items-center gap-1">
                    <Icons.trash /> Clear
                  </button>
                )}
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                {aiChat.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Ask me anything about music promotion!</p>
                ) : (
                  aiChat.map((msg, i: number) => (
                    <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-xl ${
                        msg.role === 'user' 
                          ? 'bg-violet-600 text-white rounded-br-none' 
                          : 'bg-gray-700 text-gray-300 rounded-bl-none'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 text-gray-300 px-4 py-3 rounded-xl rounded-bl-none">
                      <p className="text-sm italic">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={coachInput}
                  onChange={(e) => setCoachInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendToCoach()}
                  placeholder="Ask about hashtags, viral tips, YouTube growth..."
                  className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                <button 
                  onClick={sendToCoach} 
                  disabled={!coachInput.trim() || isTyping}
                  className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition"
                >
                  <Icons.send />
                </button>
              </div>
            </div>
          </div>
        );

      case 'library':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Asset Library</h2>
              <p className="text-gray-400">All your saved album covers, video concepts, and connected YouTube content.</p>
            </div>

            {assets.length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl p-12 border border-gray-700/50 text-center">
                <Icons.library />
                <p className="text-gray-400 mt-4">Your saved assets will appear here</p>
                <p className="text-gray-500 text-sm mt-2">Generate album covers or video concepts to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50">
                    {asset.type === 'cover' && (
                      <div 
                        className="w-full aspect-square"
                        style={{ background: `linear-gradient(135deg, ${asset.gradient})` }}
                      >
                        <div className="w-full h-full flex items-center justify-center text-white p-4">
                          <div className="text-center">
                            <Icons.music />
                            <p className="text-sm font-medium mt-2 truncate">{asset.title}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {asset.type === 'video' && (
                      <div className="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <Icons.video />
                      </div>
                    )}
                    {asset.type === 'uploaded_video' && (
                      asset.videoUrl ? (
                        <video className="w-full aspect-video bg-black" controls preload="metadata" src={asset.videoUrl} />
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                          <Icons.video />
                        </div>
                      )
                    )}
                    <div className="p-3">
                      <p className="text-gray-300 text-sm capitalize">{asset.type.replace('_', ' ')}</p>
                      {'title' in asset && <p className="text-white text-sm mt-1 truncate">{asset.title}</p>}
                      <p className="text-gray-500 text-xs mt-1">{new Date(asset.savedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {youtubeAccount && youtubeVideos.length > 0 && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">YouTube Content</h3>
                    <p className="text-sm text-gray-400">Imported from {youtubeAccount.username}</p>
                  </div>
                  <button onClick={() => setActiveTab('accounts')} className="text-sm text-red-300 hover:text-red-200 underline">
                    Refresh In Accounts
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {youtubeVideos.map((video) => (
                    <a
                      key={video.id}
                      href={video.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-700/30 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition"
                    >
                      {video.thumbnailUrl ? (
                        <img src={video.thumbnailUrl} alt={video.title} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                          <Icons.video />
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/20">YouTube</span>
                          {video.publishedAt && (
                            <span className="text-xs text-gray-500">{new Date(video.publishedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <p className="text-white text-sm font-medium line-clamp-2">{video.title}</p>
                        <p className="text-gray-500 text-xs">Video ID: {video.id}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Your Stats</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-pink-400">{albumCovers.length}</p>
                  <p className="text-gray-400 text-sm">Album Covers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400">{videoConcepts.length}</p>
                  <p className="text-gray-400 text-sm">Video Concepts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{socialPosts.length}</p>
                  <p className="text-gray-400 text-sm">Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{youtubeVideos.length}</p>
                  <p className="text-gray-400 text-sm">YT Imports</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'accounts':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Accounts</h2>
              <p className="text-gray-400">Connect the channels MusicForge uses to publish, import content, and manage audience activity.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
                <h3 className="text-lg font-semibold text-white">Workspace Status</h3>
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <Icons.save />
                    <span>Data saves locally in this browser.</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    There is no separate MusicForge login now. This app opens directly and stores data in your single personal workspace.
                  </p>
                  <p className="text-xs text-gray-500">
                    YouTube is the primary platform in this workspace. Instagram remains optional and secondary.
                  </p>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-red-500/20 space-y-4">
                <h3 className="text-lg font-semibold text-white">Primary Channel: YouTube</h3>

                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">Google OAuth + YouTube channel lookup</p>
                      <p className="text-sm text-gray-400">Requests YouTube access for channel data, comments, replies, and uploads.</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-red-600/20 text-red-300 border border-red-500/20">YouTube</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Required env var: <code>VITE_GOOGLE_CLIENT_ID</code>. The app asks for upload and comment permissions too, so reconnect if Google refreshes the token.
                  </p>
                  <button
                    onClick={() => void connectYouTubeAccount()}
                    disabled={youtubeConnectBusy}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    {youtubeConnectBusy ? 'Connecting YouTube...' : 'Connect Google / YouTube'}
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-700/50">
                  <h4 className="text-base font-semibold text-white mb-3">Optional: Instagram</h4>
                </div>

                <div className="rounded-lg border border-pink-500/20 bg-pink-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">Instagram login + account sync</p>
                      <p className="text-sm text-gray-400">Use Meta login to connect your professional Instagram account from inside the app.</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-pink-600/20 text-pink-300 border border-pink-500/20">Instagram</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Preferred flow: start the local API server, then use the login button below. The token box is a manual fallback.
                  </p>
                  <button
                    onClick={startInstagramLogin}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    Log In With Instagram
                  </button>
                  <textarea
                    value={instagramAccessToken}
                    onChange={(e) => setInstagramAccessToken(e.target.value)}
                    placeholder="Manual Instagram access token fallback"
                    rows={4}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    onClick={() => void connectInstagramAccount()}
                    disabled={instagramConnectBusy}
                    className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    {instagramConnectBusy ? 'Connecting Instagram...' : 'Connect Instagram'}
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-700/50">
                  <h4 className="text-base font-semibold text-white mb-3">Manual Links For Other Platforms</h4>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Platform</label>
                  <select
                    value={accountPlatform}
                    onChange={(e) => setAccountPlatform(e.target.value as Platform)}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-violet-500"
                  >
                    {(['tiktok', 'twitter'] as Platform[]).map((platform) => (
                      <option key={platform} value={platform}>{platforms[platform].name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Username or Handle</label>
                  <input
                    type="text"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    placeholder="@artistname"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Public Profile URL</label>
                  <input
                    type="url"
                    value={accountUrl}
                    onChange={(e) => setAccountUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <button
                  onClick={connectAccount}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  Link Profile
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Linked Profiles</h3>
                <span className="text-sm text-gray-400">{connectedAccounts.length} linked</span>
              </div>

              {connectedAccounts.length === 0 ? (
                <p className="text-gray-500 text-sm">No profiles linked yet.</p>
              ) : (
                <div className="space-y-3">
                  {connectedAccounts.map((account) => (
                    <div key={account.id} className="bg-gray-700/30 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">{platforms[account.platform].name}</span>
                          <span className={`text-xs px-2 py-1 rounded border uppercase tracking-wide ${
                            getConnectedAccountStatus(account) === 'connected'
                              ? 'bg-green-600/20 text-green-400 border-green-600/30'
                              : getConnectedAccountStatus(account) === 'expired'
                                ? 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30'
                                : 'bg-blue-600/20 text-blue-300 border-blue-600/30'
                          }`}>{getConnectedAccountStatus(account)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {account.thumbnailUrl && (
                            <img src={account.thumbnailUrl} alt={account.username} className="w-10 h-10 rounded-full object-cover border border-gray-600" />
                          )}
                          <div>
                            <p className="text-white font-medium">{account.username}</p>
                            {account.channelId && (
                              <p className="text-gray-500 text-xs">Channel ID: {account.channelId}</p>
                            )}
                            {!account.channelId && account.accountId && (
                              <p className="text-gray-500 text-xs">Account ID: {account.accountId}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs">Linked {new Date(account.connectedAt).toLocaleString()}</p>
                        {account.expiresAt && (
                          <p className="text-gray-500 text-xs">
                            Token {new Date(account.expiresAt).getTime() > Date.now() ? 'expires' : 'expired'} {new Date(account.expiresAt).toLocaleString()}
                          </p>
                        )}
                        {account.stats && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {account.stats.subscriberCount && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-600">
                                {account.stats.subscriberCount} subscribers
                              </span>
                            )}
                            {account.stats.videoCount && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-600">
                                {account.stats.videoCount} videos
                              </span>
                            )}
                            {account.stats.viewCount && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-600">
                                {account.stats.viewCount} views
                              </span>
                            )}
                            {account.stats.mediaCount && (
                              <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-600">
                                {account.stats.mediaCount} media
                              </span>
                            )}
                          </div>
                        )}
                        {account.profileUrl && (
                          <a href={account.profileUrl} target="_blank" rel="noreferrer" className="text-violet-400 text-sm underline break-all">
                            {account.profileUrl}
                          </a>
                        )}
                        {account.recentVideos && account.recentVideos.length > 0 && (
                          <div className="pt-3 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Recent Uploads</p>
                            <div className="grid gap-2">
                              {account.recentVideos.map((video) => (
                                <a
                                  key={video.id}
                                  href={video.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-3 rounded-lg bg-gray-800/70 border border-gray-700 px-3 py-2 hover:border-gray-600 transition"
                                >
                                  {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-12 rounded object-cover" />
                                  ) : (
                                    <div className="w-20 h-12 rounded bg-gray-700 flex items-center justify-center">
                                      <Icons.video />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{video.title}</p>
                                    {video.publishedAt && (
                                      <p className="text-xs text-gray-500">{new Date(video.publishedAt).toLocaleDateString()}</p>
                                    )}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {account.recentMedia && account.recentMedia.length > 0 && (
                          <div className="pt-3 space-y-2">
                            <p className="text-xs uppercase tracking-wide text-gray-500">Recent Instagram Media</p>
                            <div className="grid gap-2">
                              {account.recentMedia.map((media) => (
                                <a
                                  key={media.id}
                                  href={media.postUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-3 rounded-lg bg-gray-800/70 border border-gray-700 px-3 py-2 hover:border-gray-600 transition"
                                >
                                  {media.thumbnailUrl ? (
                                    <img src={media.thumbnailUrl} alt={media.title} className="w-20 h-12 rounded object-cover" />
                                  ) : (
                                    <div className="w-20 h-12 rounded bg-gray-700 flex items-center justify-center">
                                      <Icons.image />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{media.title}</p>
                                    <p className="text-xs text-gray-500">
                                      {[media.mediaType, media.publishedAt ? new Date(media.publishedAt).toLocaleDateString() : null].filter(Boolean).join(' • ')}
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        {account.platform === 'youtube' && (
                          <button
                            onClick={() => void connectYouTubeAccount()}
                            disabled={youtubeConnectBusy}
                            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 disabled:opacity-60"
                          >
                            <Icons.refresh /> Refresh
                          </button>
                        )}
                        {account.platform === 'instagram' && (
                          <button
                            onClick={() => void connectInstagramAccount(account.accessToken)}
                            disabled={instagramConnectBusy}
                            className="text-pink-400 hover:text-pink-300 text-sm flex items-center gap-1 disabled:opacity-60"
                          >
                            <Icons.refresh /> Refresh
                          </button>
                        )}
                        <button
                          onClick={() => removeConnectedAccount(account.id)}
                          className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                        >
                          <Icons.trash /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className={`border-b px-4 py-2 text-center ${
        remoteSyncStatus === 'synced'
          ? 'bg-green-600/20 border-green-600/30'
          : remoteSyncStatus === 'error'
            ? 'bg-red-600/20 border-red-600/30'
            : remoteSyncStatus === 'syncing'
              ? 'bg-blue-600/20 border-blue-600/30'
              : 'bg-yellow-600/20 border-yellow-600/30'
      }`}>
        <p className={`text-sm ${
          remoteSyncStatus === 'synced'
            ? 'text-green-400'
            : remoteSyncStatus === 'error'
              ? 'text-red-400'
              : remoteSyncStatus === 'syncing'
                ? 'text-blue-300'
                : 'text-yellow-400'
        }`}>
          {remoteSyncStatus === 'synced'
            ? 'App data is synced to PostgreSQL.'
            : remoteSyncStatus === 'syncing'
              ? 'Syncing app data...'
              : remoteSyncStatus === 'error'
                ? 'Remote sync is unavailable. Using local browser data.'
                : 'Remote sync is not available yet. Using local browser data.'}
        </p>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-800/50 border-r border-gray-700/50 p-4 z-50">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Icons.music />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
              MUSICFORGE
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  activeTab === item.id
                    ? 'bg-pink-600/20 text-pink-400'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                }`}
              >
                <item.icon />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          {renderTabContent()}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-pulse ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <Icons.check /> : <Icons.close />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
