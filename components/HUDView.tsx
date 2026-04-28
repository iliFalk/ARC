
import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, RefreshCw, ExternalLink, Settings as SettingsIcon, Newspaper, Terminal, Plus, Trash2, X, Sunrise, Sunset, Wind, Navigation, MapPin, Search, Loader2, Copy, Check, Clock, ChevronRight } from 'lucide-react';
import { WeatherData, NewsItem, NewsSourceConfig, AppSettings, TutorCommand } from '../types';
import { generateTutorExplanation } from '../services/geminiService';

// --- WEATHER WIDGET ---

interface LocationConfig {
  lat: number;
  lon: number;
  name: string;
  isAuto: boolean;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

const getWeatherIcon = (code: number, isDay: boolean, className: string = "w-8 h-8") => {
  if (code <= 1) return <Sun className={`${className} ${isDay ? 'text-yellow-500' : 'text-blue-300'}`} />;
  if (code <= 3) return <Cloud className={`${className} text-gray-400`} />;
  if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
  if (code <= 77) return <CloudSnow className={`${className} text-blue-200`} />;
  if (code <= 99) return <CloudLightning className={`${className} text-yellow-600`} />;
  return <Sun className={`${className} text-yellow-500`} />;
};

const getWeatherLabel = (code: number): string => {
  if (code === 0) return "Clear Sky";
  if (code === 1) return "Mainly Clear";
  if (code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
};

const WeatherWidget: React.FC = () => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Location State
  const [location, setLocation] = useState<LocationConfig>(() => {
    const saved = localStorage.getItem('weather_location');
    return saved ? JSON.parse(saved) : { lat: 51.5074, lon: -0.1278, name: 'London', isAuto: true };
  });
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearchingAPI, setIsSearchingAPI] = useState(false);

  useEffect(() => {
    localStorage.setItem('weather_location', JSON.stringify(location));
  }, [location]);

  // Fetch Weather Logic
  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const currentRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&timezone=auto`
      );
      const currentJson = await currentRes.json();
      
      const years = [1, 2, 3, 4, 5];
      const historicalPromises = years.map(yearOffset => {
        const date = new Date(now);
        date.setFullYear(now.getFullYear() - yearOffset);
        const dateStr = date.toISOString().split('T')[0];
        return fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_mean&timezone=auto`
        ).then(r => r.json());
      });

      const historicalResults = await Promise.all(historicalPromises);
      const validTemps = historicalResults
        .map(res => res.daily?.temperature_2m_mean?.[0])
        .filter(t => t !== undefined && t !== null);
      
      const avgTemp = validTemps.length > 0 
        ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length 
        : currentJson.current_weather.temperature;

      if (currentJson.current_weather) {
        setData({
          temperature: currentJson.current_weather.temperature,
          historicalAvgTemp: Math.round(avgTemp * 10) / 10,
          weatherCode: currentJson.current_weather.weathercode,
          isDay: currentJson.current_weather.is_day === 1,
          windSpeed: currentJson.current_weather.windspeed,
          windDirection: currentJson.current_weather.winddirection,
          sunrise: currentJson.daily.sunrise[0].split('T')[1],
          sunset: currentJson.daily.sunset[0].split('T')[1]
        });
      }
    } catch (e) {
      console.error("Weather fetch failed", e);
      setError('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    if (location.isAuto && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
             fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => fetchWeather(location.lat, location.lon)
      );
    } else {
      fetchWeather(location.lat, location.lon);
    }
  }, [location]);

  // City Search Logic
  const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearchingAPI(true);
      try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
          const data = await res.json();
          if (data.results) {
              setSearchResults(data.results);
          } else {
              setSearchResults([]);
          }
      } catch (e) {
          console.error("Geocoding failed", e);
      } finally {
          setIsSearchingAPI(false);
      }
  };

  const selectCity = (city: GeocodingResult) => {
      setLocation({
          lat: city.latitude,
          lon: city.longitude,
          name: city.name,
          isAuto: false
      });
      setIsSearching(false);
      setSearchQuery('');
      setSearchResults([]);
  };

  const useCurrentLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
              setLocation({
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                  name: 'Current Location',
                  isAuto: true
              });
              setIsSearching(false);
          });
      }
  };

  if (loading && !data) return (
    <div className="bg-white border border-border rounded-xl p-3 shadow-sm h-[140px] animate-pulse flex items-center justify-center">
       <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !data) return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex flex-col items-center justify-center text-xs text-red-600 font-bold h-[140px]">
      <p>{error || 'No Data'}</p>
      <button onClick={() => window.location.reload()} className="mt-1 underline">Retry</button>
    </div>
  );

  const isWarmer = data.temperature >= data.historicalAvgTemp;
  const themeClass = isWarmer 
    ? "from-orange-50/90 to-white border-orange-200" 
    : "from-blue-50/90 to-white border-blue-200";
  
  const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const conditionLabel = getWeatherLabel(data.weatherCode);

  // --- SEARCH VIEW ---
  if (isSearching) {
      return (
          <div className="bg-white border border-border rounded-xl p-3 shadow-sm h-[140px] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 mb-2 shrink-0">
                  <div className="relative flex-1">
                      <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-500" />
                      <input 
                          type="text" 
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          placeholder="Search city..."
                          className="w-full pl-7 pr-2 py-1 bg-gray-200 text-black placeholder:text-gray-600 border border-transparent rounded-md text-xs font-bold focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                      />
                  </div>
                  <button onClick={() => setIsSearching(false)} className="p-1 hover:bg-muted rounded-md text-muted-foreground">
                      <X className="w-4 h-4" />
                  </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                  <button 
                      onClick={useCurrentLocation}
                      className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-primary flex items-center gap-1.5 hover:bg-muted/50 rounded"
                  >
                      <Navigation className="w-3 h-3" /> Use Current Location
                  </button>
                  
                  {isSearchingAPI ? (
                      <div className="py-2 text-center text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin inline mr-1"/> Searching...</div>
                  ) : (
                      searchResults.map(city => (
                          <button
                              key={city.id}
                              onClick={() => selectCity(city)}
                              className="w-full text-left px-2 py-1.5 hover:bg-muted rounded group"
                          >
                              <div className="text-xs font-bold text-foreground">{city.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                  {[city.admin1, city.country].filter(Boolean).join(', ')}
                              </div>
                          </button>
                      ))
                  )}
              </div>
          </div>
      );
  }

  // --- COMPACT VIEW (ENHANCED) ---
  return (
    <div className={`relative bg-gradient-to-br ${themeClass} border rounded-xl p-3 shadow-sm transition-all duration-500 overflow-hidden h-[140px] flex flex-col`}>
       
       {/* Top Row: Location & Date */}
       <div className="flex justify-between items-start mb-2 relative z-10 shrink-0">
          <div className="flex flex-col">
             <div className="flex items-center gap-1.5 text-foreground group cursor-pointer" onClick={() => setIsSearching(true)}>
                 <MapPin className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                 <span className="text-xs font-black truncate max-w-[120px] group-hover:underline decoration-wavy decoration-primary/30">{location.name}</span>
             </div>
             <span className="text-[10px] text-muted-foreground font-semibold ml-4.5 tracking-wide">{formattedDate}</span>
          </div>
          <button 
            onClick={() => setIsSearching(true)}
            className="text-[9px] bg-white/50 hover:bg-white border border-black/5 rounded-full px-2 py-0.5 font-bold text-foreground/60 hover:text-foreground transition-all"
          >
            Edit
          </button>
       </div>

       {/* Middle Row: Main Metrics */}
       <div className="flex-1 flex items-center justify-between px-1">
          {/* Left: Condition & Icon */}
          <div className="flex items-center gap-3">
              <div className="p-2 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 ring-1 ring-black/5">
                  {getWeatherIcon(data.weatherCode, data.isDay, "w-8 h-8")}
              </div>
              <div className="flex flex-col justify-center">
                  <span className="text-sm font-bold text-foreground/90 leading-tight">{conditionLabel}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                     <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${isWarmer ? 'text-orange-700 bg-orange-100/50 border-orange-200' : 'text-blue-700 bg-blue-100/50 border-blue-200'}`}>
                        {isWarmer ? 'WARMER' : 'COLDER'}
                     </span>
                  </div>
              </div>
          </div>

          {/* Right: Big Temp */}
          <div className="flex flex-col items-end">
              <span className="text-4xl font-black text-foreground tracking-tighter leading-none shadow-orange-100 drop-shadow-sm">{Math.round(data.temperature)}°</span>
              <span className="text-[9px] font-medium text-muted-foreground mt-1">vs {data.historicalAvgTemp}° avg</span>
          </div>
       </div>

       {/* Bottom Row: Compact Metrics */}
       <div className="grid grid-cols-3 gap-2 border-t border-black/5 pt-2 shrink-0 mt-auto bg-white/30 -mx-3 px-3 pb-0.5">
           <div className="flex items-center justify-center gap-1.5">
               <Wind className="w-3 h-3 text-muted-foreground" />
               <span className="text-[10px] font-bold text-foreground">{data.windSpeed} <span className="text-[8px] font-normal opacity-70">km/h</span></span>
           </div>
           <div className="flex items-center justify-center gap-1.5 border-l border-black/5">
               <Sunrise className="w-3 h-3 text-muted-foreground" />
               <span className="text-[10px] font-bold text-foreground">{data.sunrise}</span>
           </div>
           <div className="flex items-center justify-center gap-1.5 border-l border-black/5">
               <Sunset className="w-3 h-3 text-muted-foreground" />
               <span className="text-[10px] font-bold text-foreground">{data.sunset}</span>
           </div>
       </div>

    </div>
  );
};

// --- AI TUTOR (COMMAND DISCOVERY) ---

const CURATED_COMMANDS = [
  'ipconfig', 'tracert', 'netstat', 'nslookup', 'tasklist', 'taskkill',
  'sfc', 'dism', 'chkdsk', 'robocopy', 'systeminfo', 'getmac', 'arp',
  'shutdown', 'driverquery', 'schtasks', 'cipher', 'assoc',
  'net share', 'net use', 'net user', 'sc', 'reg', 'powercfg', 'bitsadmin',
  'gpupdate', 'whoami', 'icacls', 'attrib', 'diskpart', 'mountvol'
];

const AITutor: React.FC<{ settings: AppSettings }> = ({ settings }) => {
  const [command, setCommand] = useState<TutorCommand | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchRandomExplanation = async () => {
    if (loading) return;
    setLoading(true);
    setCopied(false);
    try {
      const randomCmd = CURATED_COMMANDS[Math.floor(Math.random() * CURATED_COMMANDS.length)];
      const result = await generateTutorExplanation(randomCmd, settings);
      setCommand(result);
    } catch (e) {
      console.error("Tutor Error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
      if (command) {
          navigator.clipboard.writeText(command.example);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  useEffect(() => {
    fetchRandomExplanation();
  }, []);

  return (
    <div className="bg-[#09090b] rounded-xl shadow-sm border border-neutral-800 overflow-hidden flex flex-col relative group transition-all hover:border-neutral-700 h-[140px]">
       
       <div className="p-3 flex flex-col h-full">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-2 shrink-0">
             <div className="flex items-center gap-1.5 text-neutral-400">
                <Terminal className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold tracking-widest uppercase">Sysadmin Tip</span>
             </div>
             <button 
                onClick={fetchRandomExplanation}
                disabled={loading}
                className="text-neutral-500 hover:text-neutral-200 transition-colors disabled:opacity-30 p-1 hover:bg-neutral-800 rounded-md"
                title="Next Tip"
             >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
             </button>
          </div>

          {/* Content */}
          {loading ? (
             <div className="space-y-2.5 opacity-40 flex-1">
                <div className="h-5 w-24 bg-neutral-800 rounded animate-pulse" />
                <div className="h-3 w-full bg-neutral-800/50 rounded animate-pulse" />
                <div className="h-8 w-full bg-neutral-800/30 rounded animate-pulse mt-1" />
             </div>
          ) : command ? (
             <div className="animate-in fade-in duration-300 flex-1 flex flex-col min-h-0">
                 {/* Command + Definition */}
                 <div className="flex-1 flex flex-col justify-center min-h-0 mb-1">
                    <div className="flex items-baseline gap-2 mb-1 shrink-0">
                        <span className="text-lg font-black text-green-400 font-mono tracking-tight leading-none">{command.term}</span>
                    </div>
                    <p className="text-xs text-neutral-400 font-medium leading-relaxed line-clamp-2">
                        {command.definition}
                    </p>
                 </div>

                 {/* Code Block */}
                 <div className="bg-black/40 rounded-lg border border-white/5 p-2 flex items-center justify-between group/code relative hover:border-white/10 transition-colors shrink-0">
                    <code className="text-cyan-400 text-[10px] font-mono truncate mr-2 flex-1">
                       {command.example}
                    </code>
                    <button 
                        onClick={handleCopy}
                        className="text-neutral-500 hover:text-white transition-colors p-1"
                        title="Copy Command"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                 </div>
             </div>
          ) : (
            <div className="text-center py-4 text-xs text-neutral-600 flex-1 flex items-center justify-center">Failed to load</div>
          )}
       </div>
    </div>
  );
};

// --- NEWS FEED ---

interface NewsFeedProps {
    settings: AppSettings;
    onUpdateNewsSources: (sources: NewsSourceConfig[]) => void;
}

// Helper to clean HTML text from RSS feeds
const stripHtml = (html: string) => {
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

// Helper for relative time
const timeAgo = (date: number) => {
  const seconds = Math.floor((new Date().getTime() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
};

const NewsFeed: React.FC<NewsFeedProps> = ({ settings, onUpdateNewsSources }) => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newSource, setNewSource] = useState({ name: '', url: '', type: 'rss' as 'rss' | 'reddit-json' });

    const sources = settings.newsSources || [];

    const fetchNews = async () => {
        if (loading) return;
        setLoading(true);
        let allNews: NewsItem[] = [];

        try {
            const promises = sources.filter(s => s.enabled).map(async (source) => {
                try {
                    if (source.type === 'rss') {
                         const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`);
                         const json = await res.json();
                         if (json.status !== 'ok') return [];
                         return json.items.slice(0, 5).map((item: any) => ({
                             id: item.guid || item.link,
                             title: item.title,
                             summary: stripHtml(item.description || item.content || '').substring(0, 150),
                             url: item.link,
                             source: source.name,
                             publishedAt: new Date(item.pubDate).getTime()
                         }));
                    } else if (source.type === 'hn-api') {
                        const res = await fetch(source.url);
                        const ids = await res.json();
                        const top5 = ids.slice(0, 5);
                        const stories = await Promise.all(top5.map(async (id: number) => {
                            const sRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                            const sJson = await sRes.json();
                            return {
                                id: sJson.id.toString(),
                                title: sJson.title,
                                summary: sJson.text ? stripHtml(sJson.text).substring(0, 150) : undefined,
                                url: sJson.url || `https://news.ycombinator.com/item?id=${sJson.id}`,
                                source: 'HackerNews',
                                publishedAt: sJson.time * 1000,
                                comments: sJson.descendants
                            };
                        }));
                        return stories;
                    } else if (source.type === 'reddit-json') {
                         const res = await fetch(source.url);
                         const json = await res.json();
                         return json.data.children.slice(0, 5).map((item: any) => ({
                            id: item.data.id,
                            title: item.data.title,
                            summary: item.data.selftext ? item.data.selftext.substring(0, 150) : (item.data.url && item.data.url.match(/\.(jpeg|jpg|gif|png)$/) ? 'Attached Image' : ''),
                            url: `https://reddit.com${item.data.permalink}`,
                            source: source.name,
                            publishedAt: item.data.created_utc * 1000
                         }));
                    }
                    return [];
                } catch (e) {
                    console.error(`Error fetching source: ${source.name}`, e);
                    return [];
                }
            });

            const results = await Promise.all(promises);
            allNews = results.flat().sort((a, b) => b.publishedAt - a.publishedAt);
        } catch (e) {
            console.error("News Fetch Error", e);
        } finally {
            setNews(allNews);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [sources]);

    const toggleSource = (id: string) => {
        const updated = sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
        onUpdateNewsSources(updated);
    };

    const removeSource = (id: string) => {
        const updated = sources.filter(s => s.id !== id);
        onUpdateNewsSources(updated);
    };

    const handleAddSource = () => {
        if (!newSource.name || !newSource.url) return;
        
        const sourceToAdd: NewsSourceConfig = {
            id: Date.now().toString(),
            name: newSource.name,
            url: newSource.url,
            type: newSource.type as any,
            enabled: true
        };

        onUpdateNewsSources([...sources, sourceToAdd]);
        setNewSource({ name: '', url: '', type: 'rss' });
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-black text-white rounded-md shadow-sm">
                        <Newspaper className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-black text-zinc-700 uppercase tracking-tight">
                        Latest Headlines
                    </h3>
                </div>
                <div className="flex gap-1">
                    <button onClick={fetchNews} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Sources">
                        <SettingsIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {showSettings && (
                <div className="mb-4 bg-white p-3 rounded-xl border border-border shadow-md animate-in slide-in-from-top-2 overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[10px] font-black uppercase text-neutral-500 tracking-wide">Sources</h4>
                        {!isAdding && (
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="text-[9px] font-bold text-primary flex items-center gap-1 hover:opacity-70 transition-opacity"
                            >
                                <Plus className="w-3 h-3" /> ADD NEW
                            </button>
                        )}
                    </div>

                    {isAdding ? (
                        <div className="space-y-2 mb-4 p-3 bg-muted/20 rounded-lg border border-border/50 animate-in fade-in zoom-in-95">
                            <input 
                                type="text" 
                                placeholder="Source Name (e.g. ArsTechnica)" 
                                value={newSource.name}
                                onChange={e => setNewSource(prev => ({...prev, name: e.target.value}))}
                                className="w-full text-xs p-2 bg-white border border-border rounded focus:outline-none focus:border-primary font-medium"
                            />
                            <input 
                                type="text" 
                                placeholder="RSS or Reddit URL" 
                                value={newSource.url}
                                onChange={e => setNewSource(prev => ({...prev, url: e.target.value}))}
                                className="w-full text-xs p-2 bg-white border border-border rounded focus:outline-none focus:border-primary font-medium"
                            />
                            <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-600 px-1">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" checked={newSource.type === 'rss'} onChange={() => setNewSource(prev => ({...prev, type: 'rss'}))} className="accent-primary" /> RSS
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer ml-2">
                                    <input type="radio" checked={newSource.type === 'reddit-json'} onChange={() => setNewSource(prev => ({...prev, type: 'reddit-json'}))} className="accent-primary" /> Reddit JSON
                                </label>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={handleAddSource} className="flex-1 bg-primary text-white text-[10px] font-black py-1.5 rounded shadow-sm hover:opacity-90 transition-opacity">SAVE</button>
                                <button onClick={() => setIsAdding(false)} className="px-3 bg-muted text-foreground text-[10px] font-bold py-1.5 rounded hover:bg-muted/80 transition-colors">CANCEL</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 mb-2 max-h-[120px] overflow-y-auto scrollbar-hide">
                            {sources.map(s => (
                                <div key={s.id} className="group flex items-center justify-between text-xs font-bold text-neutral-800 hover:bg-neutral-50 p-2 rounded-md transition-colors border border-transparent">
                                    <div className="flex items-center gap-2 truncate">
                                        <input 
                                            type="checkbox" 
                                            checked={s.enabled} 
                                            onChange={() => toggleSource(s.id)} 
                                            className="accent-neutral-900 w-3.5 h-3.5 cursor-pointer shrink-0"
                                        />
                                        <span className="truncate">{s.name}</span>
                                    </div>
                                    <button 
                                        onClick={() => removeSource(s.id)}
                                        className="p-1 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3 pr-1 pb-4">
                {loading && news.length === 0 ? (
                    <div className="space-y-3">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl border border-black/5" />
                        ))}
                    </div>
                ) : (
                    news.map(item => (
                        <a 
                            key={`${item.source}-${item.id}`} 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group flex flex-col bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Decorative accent on hover */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-black scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300" />
                            
                            <div className="flex-1">
                                {/* Headline */}
                                <h4 className="text-[13px] font-black text-zinc-900 leading-snug mb-2 group-hover:text-primary transition-colors">
                                    {item.title}
                                </h4>

                                {/* Summary */}
                                {item.summary && (
                                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed line-clamp-3 mb-2">
                                        {item.summary}
                                    </p>
                                )}
                            </div>

                            {/* Footer: Date & Source */}
                            <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                                    {item.source}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400">
                                    <Clock className="w-3 h-3 opacity-70" />
                                    {timeAgo(item.publishedAt)}
                                </div>
                            </div>
                            
                            {/* Hover Action */}
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 pointer-events-none">
                                <div className="bg-black text-white p-1 rounded-full shadow-sm">
                                    <ChevronRight className="w-3 h-3" />
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
};

// --- MAIN HUD VIEW ---

interface HUDViewProps {
    settings: AppSettings;
    onUpdateNewsSources: (sources: NewsSourceConfig[]) => void;
}

export const HUDView: React.FC<HUDViewProps> = ({ settings, onUpdateNewsSources }) => {
    return (
        <div className="h-full flex flex-col bg-neutral-50 p-4 gap-6 overflow-y-auto">
            <div className="animate-in slide-in-from-top-1 duration-300">
                <WeatherWidget />
            </div>

            <div className="animate-in slide-in-from-top-2 duration-300 delay-100">
                <AITutor settings={settings} />
            </div>

            <div className="animate-in slide-in-from-top-3 duration-300 delay-200">
                <NewsFeed settings={settings} onUpdateNewsSources={onUpdateNewsSources} />
            </div>
        </div>
    );
};
