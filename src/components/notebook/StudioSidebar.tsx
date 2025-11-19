import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Edit, User, Loader2, AlertCircle, CheckCircle2, RefreshCw, Play, Sparkles, BrainCircuit, BookOpen, ArrowRight } from 'lucide-react';
import { useNotes, Note } from '@/hooks/useNotes';
import { useAudioOverview } from '@/hooks/useAudioOverview';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useQueryClient } from '@tanstack/react-query';
import NoteEditor from './NoteEditor';
import AudioPlayer from './AudioPlayer';
import QuizGenerator from './QuizGenerator';
import { Citation } from '@/types/message';

interface StudioSidebarProps {
  notebookId?: string;
  isExpanded?: boolean;
  onCitationClick?: (citation: Citation) => void;
}

const StudioSidebar = ({
  notebookId: propNotebookId,
  isExpanded,
  onCitationClick
}: StudioSidebarProps) => {
  const params = useParams();
  const notebookId = propNotebookId || params.notebookId || params.id;
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'quiz'>('main');
  const [audioError, setAudioError] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState('');
  
  const {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
    isDeleting
  } = useNotes(notebookId);
  
  const {
    notebooks
  } = useNotebooks();
  
  const {
    generateAudioOverview,
    refreshAudioUrl,
    autoRefreshIfExpired,
    isGenerating,
    isAutoRefreshing,
    generationStatus,
    checkAudioExpiry
  } = useAudioOverview(notebookId);

  const queryClient = useQueryClient();
  const notebook = notebooks?.find(n => n.id === notebookId);
  const hasValidAudio = notebook?.audio_overview_url && !checkAudioExpiry(notebook.audio_url_expires_at);
  const currentStatus = generationStatus || notebook?.audio_overview_generation_status;

  useEffect(() => {
    if (!notebookId) {
      console.error("StudioSidebar: No notebookId found in props or URL parameters!");
    } else {
      console.log("StudioSidebar: Using notebookId:", notebookId);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId || !notebook?.audio_overview_url) return;
    const checkAndRefresh = async () => {
      if (checkAudioExpiry(notebook.audio_url_expires_at)) {
        await autoRefreshIfExpired(notebookId, notebook.audio_url_expires_at);
      }
    };
    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [notebookId, notebook?.audio_overview_url, notebook?.audio_url_expires_at, autoRefreshIfExpired, checkAudioExpiry]);

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsCreatingNote(false);
  };

  const handleSaveNote = (title: string, content: string) => {
    if (editingNote?.source_type === 'user') {
        updateNote({ id: editingNote.id, title, content });
    } else if (!editingNote) {
      createNote({ title, content, source_type: 'user' });
    }
    setEditingNote(null);
    setIsCreatingNote(false);
  };

  const handleQuickAddNote = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!quickNoteContent.trim()) return;

    const content = quickNoteContent;
    const title = content.length > 30 ? content.substring(0, 30) + "..." : content;

    createNote({
        title: title,
        content: content,
        source_type: 'user'
    });
    setQuickNoteContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleQuickAddNote();
    }
  };

  const handleDeleteNote = () => {
    if (editingNote) {
      deleteNote(editingNote.id);
      setEditingNote(null);
    }
  };

  const handleCancel = () => {
    setEditingNote(null);
    setIsCreatingNote(false);
  };

  const handleGenerateAudio = () => {
    if (notebookId) {
      generateAudioOverview(notebookId);
      setAudioError(false);
    }
  };

  const handleQuizClick = () => setActiveView('quiz');
  const handleBackFromQuiz = () => setActiveView('main');
  const handleAudioError = () => setAudioError(true);
  const handleAudioRetry = () => handleGenerateAudio();
  const handleAudioDeleted = () => {
    if (notebookId) queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    setAudioError(false);
  };
  const handleUrlRefresh = (notebookId: string) => refreshAudioUrl(notebookId);

  const isEditingMode = editingNote || isCreatingNote;

  const getPreviewText = (note: Note) => {
    if (note.source_type === 'ai_response' && note.extracted_text) return note.extracted_text;
    if (note.source_type === 'ai_response') {
        try {
            const parsed = JSON.parse(note.content);
            if (parsed.segments?.[0]) return parsed.segments[0].text;
        } catch (e) { /* ignore */ }
    }
    return note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content;
  };

  if (activeView === 'quiz') {
    return (
      <div className="w-full bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden font-sans">
         <QuizGenerator notebookId={notebookId} onBack={handleBackFromQuiz} />
      </div>
    );
  }

  if (isEditingMode) {
    return <div className="w-full bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
        <NoteEditor note={editingNote || undefined} onSave={handleSaveNote} onDelete={editingNote ? handleDeleteNote : undefined} onCancel={handleCancel} isLoading={isCreating || isUpdating || isDeleting} onCitationClick={onCitationClick} />
      </div>;
  }

  return (
    <div className="w-full bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden font-sans">
      {/* Top Section: Header, Cards, Player */}
      <div className="p-5 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            Studio
        </h2>
        
        {/* Beautiful Cards Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Card 1: Audio Overview */}
          <div 
            onClick={hasValidAudio || currentStatus === 'generating' ? undefined : handleGenerateAudio}
            className={`col-span-1 relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-300 group
                ${hasValidAudio 
                    ? 'bg-gradient-to-br from-gray-900 via-purple-950 to-violet-900 text-white shadow-md ring-1 ring-black/5' 
                    : 'bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
          >
            {hasValidAudio && (
                <>
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute right-2 bottom-3 flex gap-0.5 items-end h-6 opacity-40">
                         {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${Math.random() * 10 + 5}px`, animationDelay: `${i * 0.1}s` }}></div>
                         ))}
                    </div>
                </>
            )}
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold tracking-wider uppercase ${hasValidAudio ? 'text-purple-200' : 'text-purple-600'}`}>
                        Audio
                    </span>
                    {hasValidAudio ? (
                        <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                        </div>
                    ) : (
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${hasValidAudio ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-100'}`}>
                             {isGenerating || currentStatus === 'generating' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                             ) : (
                                <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                             )}
                        </div>
                    )}
                </div>
                <div>
                    <h3 className={`text-base font-bold leading-tight mb-1 ${hasValidAudio ? 'text-white' : 'text-gray-900'}`}>
                        Deep Dive
                    </h3>
                    <p className={`text-xs ${hasValidAudio ? 'text-purple-200/80' : 'text-gray-500'}`}>
                        {isGenerating || currentStatus === 'generating' ? 'Generating...' : hasValidAudio ? 'Ready to play' : 'Generate conversation'}
                    </p>
                </div>
            </div>
          </div>

          {/* Card 2: Quiz */}
          <div 
            onClick={handleQuizClick}
            className="col-span-1 relative overflow-hidden rounded-xl p-4 cursor-pointer border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300 group"
          >
             <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-emerald-500 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity"></div>
             <div className="relative z-10 flex flex-col h-full justify-between min-h-[100px]">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600">Study</span>
                    <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                        <BrainCircuit className="h-4 w-4" />
                    </div>
                </div>
                <div>
                    <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">Quiz</h3>
                    <p className="text-xs text-gray-500">Test your knowledge</p>
                </div>
            </div>
          </div>
        </div>

        {/* Audio Player Status */}
        <div className="mb-1">
            {(audioError || currentStatus === 'failed') && (
                 <div className="p-3 rounded-lg border border-red-100 bg-red-50 mb-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs text-red-600 font-medium">Generation Failed</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={handleAudioRetry} className="h-6 w-6 text-red-600 hover:bg-red-100">
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                 </div>
            )}
            {hasValidAudio && !audioError && currentStatus !== 'generating' && !isAutoRefreshing && (
                <div className="mb-4">
                    <AudioPlayer 
                    audioUrl={notebook.audio_overview_url} 
                    title="Deep Dive Conversation" 
                    notebookId={notebookId} 
                    expiresAt={notebook.audio_url_expires_at} 
                    onError={handleAudioError} 
                    onRetry={handleAudioRetry} 
                    onDeleted={handleAudioDeleted}
                    onUrlRefresh={handleUrlRefresh}
                    />
                </div>
            )}
            {isAutoRefreshing && (
              <div className="flex items-center justify-center p-3 bg-blue-50 rounded-lg border border-blue-100/50 mb-4">
                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin mr-2" />
                <span className="text-xs font-medium text-blue-600">Refreshing audio url...</span>
              </div>
            )}
        </div>
        
        <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                Notes
            </h3>
        </div>
      </div>

      {/* Saved Notes Scroll Area */}
      <ScrollArea className="flex-1 h-full bg-gray-50/30">
        <div className="p-4 space-y-3 pb-4">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
                <p className="text-xs">Loading notes...</p>
             </div>
          ) : notes && notes.length > 0 ? (
              notes.map(note => (
                <div key={note.id} className="group bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer relative" onClick={() => handleEditNote(note)}>
                  <div className="flex items-start justify-between mb-2">
                     <div className="flex items-center space-x-2">
                        {note.source_type === 'ai_response' ? (
                            <div className="p-1 rounded bg-blue-50 text-blue-600"><Sparkles className="h-3 w-3" /></div>
                        ) : (
                            <div className="p-1 rounded bg-gray-100 text-gray-600"><User className="h-3 w-3" /></div>
                        )}
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                          {note.source_type === 'ai_response' ? 'AI Generated' : 'User Note'}
                        </span>
                     </div>
                     <span className="text-[10px] text-gray-400">{new Date(note.updated_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{note.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                    {getPreviewText(note)}
                  </p>
                </div>
              ))
           ) : (
            <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-xl mx-2">
              <p className="text-xs text-gray-500 mb-1">No notes yet</p>
              <p className="text-[10px] text-gray-400">
                Use the input below to create one.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Fixed Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 z-10">
        <form onSubmit={handleQuickAddNote} className="relative flex items-center">
            <Input 
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a note..."
                className="pr-10 bg-gray-50 border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500 h-11 rounded-xl text-sm"
                disabled={isCreating}
            />
            <Button 
                type="submit" 
                size="icon" 
                disabled={!quickNoteContent.trim() || isCreating}
                className="absolute right-1.5 h-8 w-8 rounded-lg bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-100 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-500"
            >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            </Button>
        </form>
      </div>
    </div>
  );
};

export default StudioSidebar;