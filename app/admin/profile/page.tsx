// AT THE VERY TOP OF app/admin/profile/page.tsx

"use client";
import { useState, useEffect, ChangeEvent, FormEvent, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FiPlusCircle, FiTrash2, FiMoreVertical } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useLocaleText } from '@/lib/use-locale-text';

// DND Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Import the new SocialIconInput component
import { SocialIconInput } from '@/components/admin/SocialIconInput';

// Simple inline AdminPageTitle component
const AdminPageTitle = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
  </div>
);

interface SocialLink {
  id: string; // Added for dnd-kit key
  name: string;
  url: string;
  icon: string;
  color?: string;
}

// Updated ProfileData interface with snake_case to match API and DB
interface ProfileData {
  site_title?: string | null;
  favicon_url?: string | null;
  nickname?: string | null;
  hero_title_line1?: string | null;
  hero_title_line2?: string | null;
  skill_icon_row1?: string | null;
  skill_icon_row2?: string | null;
  avatar_url?: string | null;
  introduction?: string | null;
  githubUsername?: string | null;
  github_token?: string | null;
  social_links?: SocialLink[] | null; // Keep SocialLink interface as is for array items
  mbti_type?: string | null; // MBTI 类型
  mbti_title?: string | null;
  mbti_image_url?: string | null; // MBTI 图片 URL
  mbti_traits?: string[] | null; // MBTI 个性特质（4 条）
  rss_url?: string | null;
  folo_url?: string | null; // Added for Folo link
  steam_user_id?: string | null;
  steam_api_key?: string | null;
  netease_user_id?: string | null;
  netease_music_u?: string | null;
  wegame_tgp_id?: string | null;
  wegame_cookie?: string | null;
  wakatime_api_key?: string | null;
}

// SortableItem for Social Links - Restoring this component definition
function SortableSocialLinkItem({ link, index, handleSocialLinkChange, removeSocialLink, t }: {
  link: SocialLink;
  index: number;
  handleSocialLinkChange: (index: number, field: keyof Omit<SocialLink, 'id'>, value: string) => void;
  removeSocialLink: (index: number) => void;
  t: (key: string, fallbackOrParams?: string | Record<string, unknown>, maybeParams?: Record<string, unknown>) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 border rounded-md bg-muted/50 w-full mb-2 touch-manipulation">
      <button type="button" {...attributes} {...listeners} className="p-1 cursor-grab touch-manipulation">
        <FiMoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </button>
      {/* Name Input */}
      <div className="flex flex-col w-full sm:flex-1">
        <Input
          type="text"
          value={link.name}
          onChange={(e) => handleSocialLinkChange(index, 'name', e.target.value)}
          placeholder={t('adminProfile.socialLinkNamePlaceholder', '例如：GitHub')}
          className="w-full"
        />
      </div>
      {/* URL Input */}
      <div className="flex flex-col w-full sm:flex-1">
        <Input
          type="url"
          value={link.url}
          onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
          placeholder={t('adminProfile.socialLinkUrlPlaceholder', '例如：https://github.com/user')}
          className="w-full"
        />
      </div>
      {/* Icon Input and Hint */}
      <div className="flex flex-col w-full sm:flex-[2]">
        <SocialIconInput
          value={link.icon}
          onChange={val => handleSocialLinkChange(index, 'icon', val)}
          previewColor={link.color}
        />
      </div>
      {/* Color Input */}
      <div className="flex flex-row items-center justify-end w-32 sm:w-40 gap-2">
        <span className="text-xs text-muted-foreground">{t('adminProfile.socialLinkColorLabel', '颜色')}</span>
        <Input
          type="color"
          value={link.color || '#000000'}
          onChange={e => handleSocialLinkChange(index, 'color', e.target.value)}
          className="w-8 h-8 p-0 border-none bg-transparent"
          style={{ minWidth: 32 }}
        />
      </div>
      {/* Delete Button */}
      <div className="flex-shrink-0 self-center mt-2 sm:mt-0 sm:ml-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeSocialLink(index)}
          aria-label={t('adminProfile.removeSocialLinkButton', '移除社交链接')}
        >
          <FiTrash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminProfilePage() {
  const { t } = useLocaleText();
  // Initialize state with snake_case keys and default empty/null values
  const [profile, setProfile] = useState<ProfileData>({ 
    site_title: 'HuoYu',
    favicon_url: '/images/avatar.png',
    nickname: '🔥Flamez',
    hero_title_line1: t('front.heroTitleLine1', '心中有火'),
    hero_title_line2: t('front.heroTitleLine2', '前方有光'),
    skill_icon_row1: 'html,css,js,nextjs,nodejs,java,php,py,fastapi,flask,wordpress,md,regex,pytorch',
    skill_icon_row2: 'mysql,postgres,mongodb,redis,kafka,rabbitmq,docker,linux,git,maven,vim,anaconda,ps,pr',
    avatar_url: '', 
    introduction: '', 
    github_token: '',
    social_links: [],
    mbti_type: '',
    mbti_title: '',
    mbti_image_url: '',
    mbti_traits: ['', '', '', ''],
    rss_url: '',
    folo_url: '',
    steam_user_id: '',
    steam_api_key: '',
    netease_user_id: '',
    netease_music_u: '',
    wegame_tgp_id: '',
    wegame_cookie: '',
    wakatime_api_key: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // DND Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Press and drag
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/profile');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})); // Catch if response is not JSON
          throw new Error(errorData.message || t('adminProfile.toastFetchError'));
        }
        const data: ProfileData = await response.json();
        // Set profile state using snake_case keys, handling potential nulls from API for form fields
        setProfile({
          ...data, // Spread all data first
          site_title: data.site_title || 'HuoYu',
          favicon_url: data.favicon_url || '/images/avatar.png',
          nickname: data.nickname || '🔥Flamez',
          hero_title_line1: data.hero_title_line1 || t('front.heroTitleLine1', '心中有火'),
          hero_title_line2: data.hero_title_line2 || t('front.heroTitleLine2', '前方有光'),
          skill_icon_row1: data.skill_icon_row1 || 'html,css,js,nextjs,nodejs,java,php,py,fastapi,flask,wordpress,md,regex,pytorch',
          skill_icon_row2: data.skill_icon_row2 || 'mysql,postgres,mongodb,redis,kafka,rabbitmq,docker,linux,git,maven,vim,anaconda,ps,pr',
          avatar_url: data.avatar_url || '',
          introduction: data.introduction || '',
          github_token: data.github_token || '',
          // Ensure each social link has an id for dnd-kit
          social_links: (data.social_links || []).map(link => ({ 
            ...link, 
            id: (link as any).id || crypto.randomUUID() // Add id if missing from fetched data
          })),
          mbti_type: data.mbti_type || '',
          mbti_title: data.mbti_title || '',
          mbti_image_url: data.mbti_image_url || '',
          mbti_traits: Array.isArray(data.mbti_traits) && data.mbti_traits.length === 4 ? data.mbti_traits : ['', '', '', ''],
          rss_url: data.rss_url || '',
          folo_url: data.folo_url || '',
          steam_user_id: data.steam_user_id || '',
          netease_user_id: data.netease_user_id || '',
          // steam_api_key and netease_music_u come from env, not profile data directly for saving
          steam_api_key: data.steam_api_key || '', // For display only
          netease_music_u: data.netease_music_u || '', // For display only
          wegame_tgp_id: data.wegame_tgp_id || '',
          wegame_cookie: data.wegame_cookie || '',
          wakatime_api_key: data.wakatime_api_key || '',
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('adminProfile.toastCouldNotLoad'));
        console.error("Fetch Profile Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [t]); // Add t to dependency array

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target; // name will be snake_case (e.g., "avatar_url")
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Updated handleSocialLinkChange - field type now Omit<SocialLink, 'id'>
  const handleSocialLinkChange = (index: number, field: keyof Omit<SocialLink, 'id'>, value: string) => {
    const updatedLinks = Array.isArray(profile.social_links) ? [...profile.social_links] : [];
    if (updatedLinks[index]) {
        // Create a new object for the specific link to ensure state updates correctly
        const updatedLink = { ...updatedLinks[index], [field]: value };
        updatedLinks[index] = updatedLink;
        setProfile(prev => ({ ...prev, social_links: updatedLinks }));
    }
  };

  const addSocialLink = () => {
    const currentLinks = Array.isArray(profile.social_links) ? profile.social_links : [];
    // Add new link with a unique id
    const newLink: SocialLink = { id: crypto.randomUUID(), name: '', url: '', icon: '', color: '' };
    const updatedLinks = [...currentLinks, newLink];
    setProfile(prev => ({ ...prev, social_links: updatedLinks }));
  };

  const removeSocialLink = (index: number) => {
    const currentLinks = Array.isArray(profile.social_links) ? [...profile.social_links] : [];
    const updatedLinks = currentLinks.filter((_, i) => i !== index);
    setProfile(prev => ({ ...prev, social_links: updatedLinks }));
  };

  const handleMbtiTraitChange = (index: number, value: string) => {
    setProfile(prev => ({
      ...prev,
      mbti_traits: prev.mbti_traits ? prev.mbti_traits.map((t, i) => i === index ? value : t) : ['', '', '', ''].map((t, i) => i === index ? value : t),
    }));
  };

  function handleDragEnd(event: DragEndEvent) {
    const {active, over} = event;
    if (over && active.id !== over.id && profile.social_links) {
      const oldIndex = profile.social_links.findIndex(link => link.id === active.id);
      const newIndex = profile.social_links.findIndex(link => link.id === over.id);
      setProfile(prev => ({
        ...prev,
        social_links: arrayMove(prev.social_links!, oldIndex, newIndex)
      }));
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    // Create a type for the payload to be sent to the backend, excluding the client-side 'id' for social_links
    interface SocialLinkPayload { name: string; url: string; icon: string; color?: string; }
    interface ProfilePayload extends Omit<ProfileData, 'social_links' | 'steam_api_key' | 'netease_music_u'> {
      social_links?: SocialLinkPayload[];
      // steam_api_key and netease_music_u are not sent from client for update, they are env vars handled by backend if needed
    }

    const payload: ProfilePayload = {
      site_title: profile.site_title || 'HuoYu',
      favicon_url: profile.favicon_url || '/images/avatar.png',
      avatar_url: profile.avatar_url || null,
      nickname: profile.nickname || '🔥Flamez',
      hero_title_line1: profile.hero_title_line1 || t('front.heroTitleLine1', '心中有火'),
      hero_title_line2: profile.hero_title_line2 || t('front.heroTitleLine2', '前方有光'),
      skill_icon_row1: profile.skill_icon_row1 || null,
      skill_icon_row2: profile.skill_icon_row2 || null,
      introduction: profile.introduction || null,
      github_token: profile.github_token || null,
      social_links: profile.social_links && profile.social_links.length > 0 
        ? profile.social_links.map(({ id, ...rest }) => rest) // Strip id before sending
        : [], 
      mbti_type: profile.mbti_type || '',
      mbti_title: profile.mbti_title || '',
      mbti_image_url: profile.mbti_image_url || '',
      mbti_traits: Array.isArray(profile.mbti_traits) ? profile.mbti_traits.map(t => t || '') : ['', '', '', ''],
      rss_url: profile.rss_url || null,
      folo_url: profile.folo_url || null,
      steam_user_id: profile.steam_user_id || null,
      netease_user_id: profile.netease_user_id || null,
      wegame_tgp_id: profile.wegame_tgp_id || null,
      wegame_cookie: profile.wegame_cookie || null,
      wakatime_api_key: profile.wakatime_api_key || null,
    };

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t('adminProfile.toastSaveError') }));
        throw new Error(errorData.message || t('adminProfile.toastSaveError'));
      }
      toast.success(t('adminProfile.toastProfileUpdated'));
      const fetchResponse = await fetch('/api/admin/profile'); // Re-fetch after save
      if (fetchResponse.ok) {
        const updatedData: ProfileData = await fetchResponse.json();
        setProfile({
          ...updatedData,
          site_title: updatedData.site_title || 'HuoYu',
          favicon_url: updatedData.favicon_url || '/images/avatar.png',
          nickname: updatedData.nickname || '🔥Flamez',
          hero_title_line1: updatedData.hero_title_line1 || t('front.heroTitleLine1', '心中有火'),
          hero_title_line2: updatedData.hero_title_line2 || t('front.heroTitleLine2', '前方有光'),
          skill_icon_row1: updatedData.skill_icon_row1 || 'html,css,js,nextjs,nodejs,java,php,py,fastapi,flask,wordpress,md,regex,pytorch',
          skill_icon_row2: updatedData.skill_icon_row2 || 'mysql,postgres,mongodb,redis,kafka,rabbitmq,docker,linux,git,maven,vim,anaconda,ps,pr',
          social_links: (updatedData.social_links || []).map(link => ({ ...link, id: (link as any).id || crypto.randomUUID() }) ),
          steam_api_key: updatedData.steam_api_key || '', // For display
          netease_user_id: updatedData.netease_user_id || '',
          netease_music_u: updatedData.netease_music_u || '', // For display
          wegame_tgp_id: updatedData.wegame_tgp_id || '',
          wegame_cookie: updatedData.wegame_cookie || '',
          wakatime_api_key: updatedData.wakatime_api_key || '',
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('adminProfile.toastCouldNotSave'));
      console.error("Submit Profile Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">{t('adminProfile.loadingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminPageTitle title={t('adminProfile.title')} description={t('adminProfile.description')} />
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-8 max-w-5xl">
        <section className="zero-admin-surface rounded-lg p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('adminProfile.siteSectionTitle', '站点信息')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('adminProfile.siteSectionDescription', '控制浏览器标签页标题和 favicon 图标。')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="site_title" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.siteTitleLabel', '站点标题')}</label>
              <Input
                type="text"
                name="site_title"
                id="site_title"
                value={profile.site_title || ''}
                onChange={handleInputChange}
                placeholder={t('adminProfile.siteTitlePlaceholder', 'HuoYu')}
              />
            </div>
            <div>
              <label htmlFor="favicon_url" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.faviconUrlLabel', 'Favicon URL')}</label>
              <Input
                type="text"
                name="favicon_url"
                id="favicon_url"
                value={profile.favicon_url || ''}
                onChange={handleInputChange}
                placeholder={t('adminProfile.faviconUrlPlaceholder', '/images/avatar.png')}
              />
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('adminProfile.faviconUrlHelpPrefix', '支持站内路径或完整图片地址，例如 ')}<code className="rounded bg-muted px-1">/images/avatar.png</code>{t('adminProfile.faviconUrlHelpMiddle', '、')}<code className="rounded bg-muted px-1">/favicon.ico</code>{t('adminProfile.faviconUrlHelpSuffix', '。')}
              </p>
            </div>
          </div>
        </section>

        <section className="zero-admin-surface rounded-lg p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">{t('adminProfile.heroSectionTitle', '首页首屏信息')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('adminProfile.heroSectionDescription', '控制个人主页首屏的昵称、标题和技能图标。')}</p>
          </div>
          <div className="mb-4">
            <label htmlFor="nickname" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.nicknameLabel', '昵称')}</label>
            <Input
              type="text"
              name="nickname"
              id="nickname"
              value={profile.nickname || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.nicknamePlaceholder', '🔥Flamez')}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="hero_title_line1" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.heroTitleLine1Label', '第一行')}</label>
              <Input
                type="text"
                name="hero_title_line1"
                id="hero_title_line1"
                value={profile.hero_title_line1 || ''}
                onChange={handleInputChange}
                placeholder={t('front.heroTitleLine1', '心中有火')}
              />
            </div>
            <div>
              <label htmlFor="hero_title_line2" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.heroTitleLine2Label', '第二行')}</label>
              <Input
                type="text"
                name="hero_title_line2"
                id="hero_title_line2"
                value={profile.hero_title_line2 || ''}
                onChange={handleInputChange}
                placeholder={t('front.heroTitleLine2', '前方有光')}
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="skill_icon_row1" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.skillIconRow1Label', '技能图标第一行')}</label>
              <Input
                type="text"
                name="skill_icon_row1"
                id="skill_icon_row1"
                value={profile.skill_icon_row1 || ''}
                onChange={handleInputChange}
                placeholder={t('adminProfile.skillIconRow1Placeholder', 'html,css,js,nextjs,nodejs,java,php,py,fastapi,flask,wordpress,md,regex,pytorch')}
              />
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('adminProfile.skillIconHelpPrefix', '到 ')}<a href="https://github.com/tandpfun/skill-icons#readme" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2">skill-icons README</a>{t('adminProfile.skillIconHelpMiddle', ' 查看可用图标名，只填写 URL 里 ')}<code className="rounded bg-muted px-1">i=</code>{t('adminProfile.skillIconHelpSuffix', ' 后面的内容，多个用英文逗号分隔。')}
              </p>
            </div>
            <div>
              <label htmlFor="skill_icon_row2" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.skillIconRow2Label', '技能图标第二行')}</label>
              <Input
                type="text"
                name="skill_icon_row2"
                id="skill_icon_row2"
                value={profile.skill_icon_row2 || ''}
                onChange={handleInputChange}
                placeholder={t('adminProfile.skillIconRow2Placeholder', 'mysql,postgres,mongodb,redis,kafka,rabbitmq,docker,linux,git,maven,vim,anaconda,ps,pr')}
              />
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('adminProfile.skillIconExamplePrefix', '例如 ')}<code className="rounded bg-muted px-1">docker,linux,git</code>{t('adminProfile.skillIconExampleMiddle', ' 会生成 ')}<code className="rounded bg-muted px-1">https://skillicons.dev/icons?i=docker,linux,git</code>{t('adminProfile.skillIconExampleSuffix', '。')}
              </p>
            </div>
          </div>
        </section>

        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.avatarUrlLabel')}</label>
          <Input 
            type="url" 
            name="avatar_url" 
            id="avatar_url" 
            value={profile.avatar_url || ''} 
            onChange={handleInputChange} 
            placeholder={t('adminProfile.avatarUrlPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="introduction" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.introductionOptionalLabel')}</label>
          <Textarea 
            name="introduction" 
            id="introduction" 
            value={profile.introduction || ''} 
            onChange={handleInputChange} 
            rows={4}
            placeholder={t('adminProfile.introductionPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="github_token" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.githubTokenLabel', 'GitHub Token')}</label>
          <Input
            type="password"
            name="github_token"
            id="github_token"
            value={profile.github_token || ''}
            onChange={handleInputChange}
            placeholder={t('adminProfile.githubTokenPlaceholder', '用于同步本人 GitHub 仓库，需要 repo/read:user 权限')}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.githubTokenHelpEnv', '请配置到 .env.local 的 GITHUB_TOKEN，后台只读取环境变量，不写入站点配置。')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.githubTokenHelpGenerate', '请先在 GitHub Settings > Developer settings > Personal access tokens 生成后再粘贴。')}</p>
        </div>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold text-foreground mb-2">{t('adminProfile.socialLinksLabel')}</legend>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={profile.social_links?.map(link => link.id) || []} strategy={verticalListSortingStrategy}>
              {(profile.social_links || []).map((link, index) => (
                <SortableSocialLinkItem
                  key={link.id}
                  link={link}
                  index={index}
                  handleSocialLinkChange={handleSocialLinkChange}
                  removeSocialLink={removeSocialLink}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" onClick={addSocialLink} className="admin-secondary-button mt-2">
            <FiPlusCircle className="h-4 w-4 mr-2" /> {t('adminProfile.addSocialLinkButton')}
          </Button>
        </fieldset>

        {/* MBTI configuration */}
        <fieldset className="space-y-4 border rounded-md p-4 bg-muted/50">
          <legend className="text-lg font-semibold text-foreground mb-2">{t('adminProfile.mbtiSectionTitle')}</legend>
          <div>
            <label htmlFor="mbti_type" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.mbtiTypeLabel')}</label>
            <Input
              type="text"
              name="mbti_type"
              id="mbti_type"
              value={profile.mbti_type || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.mbtiTypePlaceholder', '例如：INFJ-T、ENFP')}
              className="w-40"
            />
          </div>
          <div>
            <label htmlFor="mbti_title" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.mbtiTitleLabel')}</label>
            <Input
              type="text"
              name="mbti_title"
              id="mbti_title"
              value={profile.mbti_title || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.mbtiTitlePlaceholder', '例如：提倡者')}
              className="w-60"
            />
          </div>
          <div>
            <label htmlFor="mbti_image_url" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.mbtiImageUrlLabel')}</label>
            <Input
              type="url"
              name="mbti_image_url"
              id="mbti_image_url"
              value={profile.mbti_image_url || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.mbtiImageUrlPlaceholder', '粘贴 MBTI 相关图片链接')}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.mbtiImageUrlHelp', '如果使用图床或外部站点图片，请先生成可公开访问的直链后再粘贴。')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.mbtiTraitsLabel')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {profile.mbti_traits && profile.mbti_traits.map((trait, idx) => (
                <Input
                  key={idx}
                  type="text"
                  value={trait}
                  onChange={e => handleMbtiTraitChange(idx, e.target.value)}
                  placeholder={t('adminProfile.mbtiTraitPlaceholder', '特质 {{index}}', { index: idx + 1 })}
                  className="w-full"
                  maxLength={32}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.mbtiTraitsDescription')}</p>
          </div>
        </fieldset>

        {/* RSS / Steam / Netease Music configuration */}
        <fieldset className="space-y-4 border rounded-md p-4 bg-muted/50">
          <legend className="text-lg font-semibold text-foreground mb-2">{t('adminProfile.mediaStatsTitle')}</legend>
          <div>
            <label htmlFor="rss_url" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.rssUrlLabel')}</label>
            <Input
              type="url"
              name="rss_url"
              id="rss_url"
              value={profile.rss_url || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.rssUrlPlaceholder', '例如：https://yourblog.com/rss.xml')}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="folo_url" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.foloUrlLabel')}</label>
            <Input
              type="url"
              name="folo_url"
              id="folo_url"
              value={profile.folo_url || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.foloUrlPlaceholder', '例如：https://app.follow.is/share/feeds/your_feed_id')}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.foloUrlHelp', '请先在 Follow/Folo 页面生成分享链接，再粘贴到这里。')}</p>
          </div>
          <div>
            <label htmlFor="steam_user_id" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.steamUserIdLabel')}</label>
            <Input
              type="text"
              name="steam_user_id"
              id="steam_user_id"
              value={profile.steam_user_id || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.steamUserIdPlaceholder', '例如：7656119...')}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="steam_api_key" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.steamApiKeyLabel')}</label>
            <Input
              type="text"
              name="steam_api_key"
              id="steam_api_key"
              value={profile.steam_api_key || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.steamApiKeyPlaceholder', '你的 Steam Web API Key')}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.steamApiKeyHelp', '请配置到 .env.local 的 STEAM_API_KEY，避免把密钥写进仓库。')}</p>
          </div>
          <div>
            <label htmlFor="netease_user_id" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.neteaseUserIdLabel')}</label>
            <Input
              type="text"
              name="netease_user_id"
              id="netease_user_id"
              value={profile.netease_user_id || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.neteaseUserIdPlaceholder', '例如：12345678')}
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="netease_music_u" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.neteaseMusicULabel')}</label>
            <Input
              type="text"
              name="netease_music_u"
              id="netease_music_u"
              value={profile.netease_music_u || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.neteaseMusicUPlaceholder', '你的网易云 MUSIC_U Cookie')}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">{t('adminProfile.neteaseMusicUHelp', '请配置到 .env.local 的 NETEASE_MUSIC_U，避免把 Cookie 写进仓库。')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <div>
              <label htmlFor="wegame_tgp_id" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.wegameTgpIdLabel', 'WeGame TGP ID')}</label>
              <Input
                type="text"
                name="wegame_tgp_id"
                id="wegame_tgp_id"
                value={profile.wegame_tgp_id || ''}
                onChange={handleInputChange}
                placeholder={t('adminProfile.wegameTgpIdPlaceholder', '例如：290717074')}
                className="w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminProfile.wegameHelpPrefix', '登录')}
                <a
                  href="https://www.wegame.com.cn/"
                  target="_blank"
                  rel="noreferrer"
                  className="mx-1 font-bold underline underline-offset-2"
                >
                  WeGame
                </a>
                {t('adminProfile.wegameTgpIdHelpSuffix', '，F12 查看 Cookie 中的 tgp_id，并配置到 .env.local 的 WEGAME_TGP_ID。')}
              </p>
            </div>
            <div>
              <label htmlFor="wegame_cookie" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.wegameCookieLabel', 'WeGame Cookie')}</label>
              <Textarea
                name="wegame_cookie"
                id="wegame_cookie"
                value={profile.wegame_cookie || ''}
                onChange={handleInputChange}
                placeholder={t('adminProfile.wegameCookiePlaceholder', '粘贴 GetAllGameInfo 请求里的完整 Cookie')}
                className="min-h-24 w-full"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('adminProfile.wegameHelpPrefix', '登录')}
                <a
                  href="https://www.wegame.com.cn/"
                  target="_blank"
                  rel="noreferrer"
                  className="mx-1 font-bold underline underline-offset-2"
                >
                  WeGame
                </a>
                {t('adminProfile.wegameCookieHelpSuffix', '，F12 查看 Cookie 中的 tgp_id，并复制完整 Cookie 配置到 .env.local 的 WEGAME_COOKIE。')}
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="wakatime_api_key" className="block text-sm font-medium text-foreground mb-1">{t('adminProfile.wakatimeApiKeyLabel', 'WakaTime API Key')}</label>
            <Input
              type="password"
              name="wakatime_api_key"
              id="wakatime_api_key"
              value={profile.wakatime_api_key || ''}
              onChange={handleInputChange}
              placeholder={t('adminProfile.wakatimeApiKeyPlaceholder', '粘贴 WakaTime Settings 里的 API Key')}
              className="w-full"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('adminProfile.wakatimeHelpPrefix', '到 ')}<a href="https://wakatime.com/settings/api-key" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-2">WakaTime API Key</a>{t('adminProfile.wakatimeHelpSuffix', ' 页面复制 API Key，并配置到 .env.local 的 WAKATIME_API_KEY。')}
            </p>
          </div>
        </fieldset>

        <div className="mt-8">
          <Button type="submit" disabled={saving || loading} className="px-6">
            {saving ? (
              <><AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />{t('adminProfile.savingProfileButton')}</>
            ) : (
              t('adminProfile.saveProfileButton')
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
