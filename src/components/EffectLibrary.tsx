import { useMemo, useState } from 'react';
import {
  AudioLines,
  Baby,
  Bot,
  Building2,
  Check,
  Cog,
  Cpu,
  Eye,
  Flame,
  Ghost,
  Headphones,
  Layers,
  Megaphone,
  Mic,
  Mountain,
  Orbit,
  Phone,
  Play,
  Radio,
  Rewind,
  Search,
  Skull,
  Sliders,
  Smile,
  Sparkles,
  Speaker,
  Square,
  Star,
  Terminal,
  Volume2,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  CATEGORY_TABS,
  CategoryFilter,
  EffectIconId,
  filterVoicePresets,
  getCategoryLabel,
  PresetId,
  VOICE_PRESETS,
  VoicePreset,
} from '../audio/presets';

interface EffectLibraryProps {
  activePreset: PresetId;
  previewingPresetId: PresetId | null;
  favoriteIds: PresetId[];
  recentIds: PresetId[];
  onPreviewPreset: (preset: VoicePreset) => void;
  onApplyPreset: (preset: VoicePreset) => void;
  onToggleFavorite: (presetId: PresetId) => void;
}

function renderEffectIcon(icon: EffectIconId, className: string) {
  switch (icon) {
    case 'baby':
      return <Baby className={className} aria-hidden="true" />;
    case 'wind':
      return <Wind className={className} aria-hidden="true" />;
    case 'skull':
      return <Skull className={className} aria-hidden="true" />;
    case 'mountain':
      return <Mountain className={className} aria-hidden="true" />;
    case 'smile':
      return <Smile className={className} aria-hidden="true" />;
    case 'sparkles':
      return <Sparkles className={className} aria-hidden="true" />;
    case 'bot':
      return <Bot className={className} aria-hidden="true" />;
    case 'cpu':
      return <Cpu className={className} aria-hidden="true" />;
    case 'terminal':
      return <Terminal className={className} aria-hidden="true" />;
    case 'zap':
      return <Zap className={className} aria-hidden="true" />;
    case 'orbit':
      return <Orbit className={className} aria-hidden="true" />;
    case 'cog':
      return <Cog className={className} aria-hidden="true" />;
    case 'flame':
      return <Flame className={className} aria-hidden="true" />;
    case 'ghost':
      return <Ghost className={className} aria-hidden="true" />;
    case 'eye':
      return <Eye className={className} aria-hidden="true" />;
    case 'waves':
      return <Waves className={className} aria-hidden="true" />;
    case 'phone':
      return <Phone className={className} aria-hidden="true" />;
    case 'radio':
      return <Radio className={className} aria-hidden="true" />;
    case 'sliders':
      return <Sliders className={className} aria-hidden="true" />;
    case 'mic':
      return <Mic className={className} aria-hidden="true" />;
    case 'layers':
      return <Layers className={className} aria-hidden="true" />;
    case 'megaphone':
      return <Megaphone className={className} aria-hidden="true" />;
    case 'speaker':
      return <Speaker className={className} aria-hidden="true" />;
    case 'rewind':
      return <Rewind className={className} aria-hidden="true" />;
    case 'building':
      return <Building2 className={className} aria-hidden="true" />;
    case 'headphones':
      return <Headphones className={className} aria-hidden="true" />;
    case 'audio-lines':
      return <AudioLines className={className} aria-hidden="true" />;
    case 'volume-2':
    default:
      return <Volume2 className={className} aria-hidden="true" />;
  }
}

export function EffectLibrary({
  activePreset,
  previewingPresetId,
  favoriteIds,
  recentIds,
  onPreviewPreset,
  onApplyPreset,
  onToggleFavorite,
}: EffectLibraryProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryFilter, number> = {
      all: VOICE_PRESETS.length,
      funny: 0,
      'robot-scifi': 0,
      cinematic: 0,
      'music-studio': 0,
      special: 0,
    };
    for (const preset of VOICE_PRESETS) {
      counts[preset.category] += 1;
    }
    return counts;
  }, []);

  const filteredPresets = useMemo(
    () =>
      filterVoicePresets(VOICE_PRESETS, {
        category: selectedCategory,
        query: searchQuery,
        favoritesOnly,
        favoriteIds: favoriteSet,
      }),
    [selectedCategory, searchQuery, favoritesOnly, favoriteSet]
  );

  const recentPresets = useMemo(
    () =>
      recentIds
        .map((id) => VOICE_PRESETS.find((p) => p.id === id))
        .filter((p): p is VoicePreset => Boolean(p)),
    [recentIds]
  );

  return (
    <div className="space-y-4">
      {/* Search & Favorites Row */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="effect-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${VOICE_PRESETS.length} voice effects...`}
            aria-label="Search voice effects"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear effect search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFavoritesOnly((prev) => !prev)}
          aria-pressed={favoritesOnly}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[38px] cursor-pointer ${
            favoritesOnly
              ? 'border-amber-400 bg-amber-50 text-amber-900'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              favoritesOnly ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <span>Favorites ({favoriteIds.length})</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="Effect categories"
        className="flex flex-wrap items-center gap-1.5"
      >
        {CATEGORY_TABS.map((tab) => {
          const isSelected = selectedCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono-num text-[11px] ${
                  isSelected ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {categoryCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Recently Used Effects Strip */}
      {recentPresets.length > 0 && (
        <div
          aria-label="Recently used effects"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
        >
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Recent:
          </span>
          {recentPresets.map((preset) => {
            const isCurrent = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isCurrent
                    ? 'border-blue-700 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950'
                }`}
              >
                {renderEffectIcon(preset.icon, 'h-3 w-3 text-blue-700')}
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Effects Grid */}
      {filteredPresets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-800">
            No matching voice effects found
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {favoritesOnly && favoriteIds.length === 0
              ? 'Star any effect card to add it to your Favorites list.'
              : 'Try clearing the search query or switching back to All Effects.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
              setFavoritesOnly(false);
            }}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          data-testid="effect-cards-grid"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {filteredPresets.map((preset) => {
            const isApplied = activePreset === preset.id;
            const isPreviewing = previewingPresetId === preset.id;
            const isFav = favoriteSet.has(preset.id);

            return (
              <article
                key={preset.id}
                data-testid={`effect-card-${preset.id}`}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-colors ${
                  isApplied
                    ? 'border-blue-700 bg-blue-50/45'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                          isApplied
                            ? 'border-blue-200 bg-blue-700 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {renderEffectIcon(preset.icon, 'h-4 w-4')}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-semibold truncate ${
                            isApplied ? 'text-blue-950' : 'text-slate-900'
                          }`}
                        >
                          {preset.name}
                        </h4>
                        <p className="font-mono-num text-[11px] text-slate-500">
                          {getCategoryLabel(preset.category)} ·{' '}
                          {preset.pitchSemitones > 0
                            ? `+${preset.pitchSemitones}`
                            : preset.pitchSemitones}{' '}
                          st · {preset.speed.toFixed(2)}x
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(preset.id)}
                      aria-pressed={isFav}
                      aria-label={
                        isFav
                          ? `Remove ${preset.name} from favorites`
                          : `Add ${preset.name} to favorites`
                      }
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-500 shrink-0 cursor-pointer"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          isFav
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-3.5 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => onPreviewPreset(preset)}
                    aria-label={
                      isPreviewing
                        ? `Stop preview for ${preset.name}`
                        : `Play preview for ${preset.name}`
                    }
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap cursor-pointer ${
                      isPreviewing
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    {isPreviewing ? (
                      <>
                        <Square
                          className="h-3 w-3 shrink-0 fill-current"
                          aria-hidden="true"
                        />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Play
                          className="h-3 w-3 shrink-0 fill-current"
                          aria-hidden="true"
                        />
                        <span>Play Preview</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    aria-pressed={isApplied}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors min-h-[36px] whitespace-nowrap cursor-pointer ${
                      isApplied
                        ? 'bg-blue-700 text-white'
                        : 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    {isApplied && (
                      <Check
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span>{isApplied ? 'Applied' : 'Apply Effect'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
