import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Play, Pause, RotateCcw, Volume2, Download, MoreVertical, Trash2, Loader2, RefreshCw, AlertTriangle, Disc } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  notebookId?: string;
  expiresAt?: string | null;
  onError?: () => void;
  onDeleted?: () => void;
  onRetry?: () => void;
  onUrlRefresh?: (notebookId: string) => void;
}

const AudioPlayer = ({ 
  audioUrl, 
  title = "Deep Dive Conversation", 
  notebookId,
  expiresAt,
  onError,
  onDeleted,
  onRetry,
  onUrlRefresh
}: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryInProgress, setAutoRetryInProgress] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Check if audio is expired
  const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : false;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      setDuration(audio.duration);
      setLoading(false);
      setAudioError(null);
      setRetryCount(0);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = async (e: Event) => {
      console.error('Audio error:', e);
      setLoading(false);
      setIsPlaying(false);
      
      if ((isExpired || audioError?.includes('403') || audioError?.includes('expired')) && 
          notebookId && onUrlRefresh && retryCount < 2 && !autoRetryInProgress) {
        setAutoRetryInProgress(true);
        setRetryCount(prev => prev + 1);
        onUrlRefresh(notebookId);
        return;
      }

      if (retryCount < 2 && !autoRetryInProgress) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          audio.load();
        }, 1000 * (retryCount + 1));
      } else {
        setAudioError('Failed to load audio');
        setAutoRetryInProgress(false);
        onError?.();
      }
    };

    const handleCanPlay = () => {
      setLoading(false);
      setAudioError(null);
      setRetryCount(0);
      setAutoRetryInProgress(false);
    };

    const handleLoadStart = () => {
      if (autoRetryInProgress) setLoading(true);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onError, isExpired, retryCount, notebookId, onUrlRefresh, audioError, autoRetryInProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio && autoRetryInProgress) {
      audio.load();
    }
  }, [audioUrl, autoRetryInProgress]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;

    if (isPlaying) {
      audio.pause();
    } else {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Play failed:', error);
          setAudioError('Playback failed');
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    const time = value[0];
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = value[0];
    audio.volume = vol;
    setVolume(vol);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio || audioError) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const retryLoad = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setLoading(true);
    setAudioError(null);
    setRetryCount(0);
    setAutoRetryInProgress(false);
    audio.load();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const downloadAudio = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error('Failed to fetch audio file');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast({ title: "Download Started", description: "Your audio file is being downloaded." });
    } catch (error) {
      toast({ title: "Download Failed", description: "Failed to download audio.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteAudio = async () => {
    if (!notebookId) return;
    setIsDeleting(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      try {
        const { data: files } = await supabase.storage.from('audio').list(notebookId);
        if (files && files.length > 0) {
          const filePaths = files.map(file => `${notebookId}/${file.name}`);
          await supabase.storage.from('audio').remove(filePaths);
        }
      } catch (e) { console.error(e); }

      const { error } = await supabase.from('notebooks').update({
        audio_overview_url: null,
        audio_url_expires_at: null,
        audio_overview_generation_status: null
      }).eq('id', notebookId);

      if (error) throw error;
      toast({ title: "Audio Deleted", description: "Audio overview deleted successfully." });
      onDeleted?.();
    } catch (error) {
      toast({ title: "Delete Failed", description: "Could not delete audio.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-lg relative bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 text-white border border-white/10">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlaying ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-500/50' : 'bg-white/10 text-white/60'}`}>
              <Disc className={`h-5 w-5 ${isPlaying ? 'animate-spin-slow' : ''}`} />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white tracking-wide">Deep Dive</h4>
              <p className="text-xs text-purple-200/60">Audio Overview</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-gray-200">
              <DropdownMenuItem onClick={downloadAudio} disabled={isDownloading} className="focus:bg-white/10 focus:text-white cursor-pointer">
                {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={deleteAudio} className="text-red-400 focus:text-red-300 focus:bg-red-900/20 cursor-pointer" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Visualizer Bars (Simulated) */}
        <div className="h-12 flex items-center justify-center gap-1 mb-6 px-4 opacity-80">
            {[...Array(20)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-1 rounded-full bg-gradient-to-t from-purple-400 to-blue-400 transition-all duration-300 ease-in-out ${isPlaying ? 'animate-pulse' : 'h-1'}`}
                    style={{ 
                        height: isPlaying ? `${Math.max(15, Math.random() * 100)}%` : '4px',
                        animationDelay: `${i * 0.05}s` 
                    }}
                ></div>
            ))}
        </div>

        {/* Error Display */}
        {audioError && !autoRetryInProgress && (
          <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-center">
            <p className="text-xs text-red-300 mb-2">{audioError}</p>
            <Button size="sm" variant="outline" onClick={onRetry || retryLoad} className="h-6 text-xs border-red-400/30 text-red-300 hover:bg-red-500/20">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&_[role=slider]]:bg-white [&_[role=slider]]:border-transparent [&_[role=slider]]:w-3 [&_[role=slider]]:h-3 [&_[role=slider]]:focus:ring-purple-500/50"
            disabled={loading || !!audioError}
          />
          <div className="flex justify-between text-[10px] font-medium text-white/40 uppercase tracking-wider">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={restart}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-full w-8 h-8"
            disabled={loading || !!audioError}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={togglePlayPause}
            disabled={loading || !!audioError}
            className="w-14 h-14 rounded-full bg-white text-purple-950 hover:bg-purple-50 hover:scale-105 transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-purple-900" />
            ) : isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-1" />
            )}
          </Button>

          {/* Volume Control (Compact) */}
          <div className="group flex items-center w-24 space-x-2">
            <Volume2 className="h-4 w-4 text-white/60" />
            <Slider
              value={[volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="flex-1 [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&_[role=slider]]:bg-white [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;