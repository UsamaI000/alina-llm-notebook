import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
    Edit, User, Loader2, AlertCircle, CheckCircle2, 
    Play, Sparkles, BrainCircuit, BookOpen, ArrowRight, 
    ChevronRight, Clock, Plus, MoreVertical, Trash2, Share2 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useNotes, Note } from '@/hooks/useNotes';
import { useAudioOverview } from '@/hooks/useAudioOverview';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import NoteEditor from './NoteEditor';
import AudioPlayer from './AudioPlayer';
import QuizGenerator from './QuizGenerator';
import QuizConfigDialog from './QuizConfigDialog';
import RenameQuizDialog from './RenameQuizDialog';
import { useQuizGeneration, Quiz } from '@/hooks/useQuizGeneration';
import { Citation } from '@/types/message';
import { useToast } from '@/hooks/use-toast'; // Import toast hook

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
  const { toast } = useToast(); // Initialize toast

  // --- Hooks & State ---
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  
  // Quiz State
  const [activeView, setActiveView] = useState<'main' | 'quiz'>('main');
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  
  // Rename Quiz State
  const [quizToRename, setQuizToRename] = useState<Quiz | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const [audioError, setAudioError] = useState(false);
  const [quickNoteContent, setQuickNoteContent] = useState('');
  
  const {
    notes, isLoading, createNote, updateNote, deleteNote, 
    isCreating, isUpdating, isDeleting
  } = useNotes(notebookId);
  
  const { notebooks } = useNotebooks();
  
  // Quiz Generation Hook
  const { 
    quizzes, 
    generateQuiz, 
    renameQuiz,
    deleteQuiz,
    isGenerating: isStartingQuiz 
  } = useQuizGeneration(notebookId);
  
  const {
    generateAudioOverview, refreshAudioUrl, autoRefreshIfExpired,
    generationStatus, checkAudioExpiry, isAutoRefreshing
  } = useAudioOverview(notebookId);

  const queryClient = useQueryClient();
  const notebook = notebooks?.find(n => n.id === notebookId);
  const hasValidAudio = notebook?.audio_overview_url && !checkAudioExpiry(notebook.audio_url_expires_at);
  const currentAudioStatus = generationStatus || notebook?.audio_overview_generation_status;

  // --- Effects ---
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
  }, [notebookId, notebook?.audio_overview_url]);

  // --- Handlers ---

  // Notes
  const handleEditNote = (note: Note) => { setEditingNote(note); setIsCreatingNote(false); };
  const handleSaveNote = (title: string, content: string) => {
    if (editingNote?.source_type === 'user') updateNote({ id: editingNote.id, title, content });
    else if (!editingNote) createNote({ title, content, source_type: 'user' });
    setEditingNote(null); setIsCreatingNote(false);
  };
  const handleQuickAddNote = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!quickNoteContent.trim()) return;
    const content = quickNoteContent;
    const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
    createNote({ title, content, source_type: 'user' });
    setQuickNoteContent('');
  };
  const handleDeleteNote = () => { if (editingNote) deleteNote(editingNote.id); setEditingNote(null); };
  const handleCancel = () => { setEditingNote(null); setIsCreatingNote(false); };

  // Audio
  const handleAudioRetry = () => { if (notebookId) generateAudioOverview(notebookId); setAudioError(false); };
  const handleAudioError = () => setAudioError(true);

  // Quiz Logic
  const handleCreateQuizClick = () => { setShowQuizConfig(true); };
  const handleGenerateQuiz = (count: number) => { generateQuiz(count); };
  const handleOpenQuiz = (quiz: Quiz) => { setSelectedQuiz(quiz); setActiveView('quiz'); };
  const handleBackFromQuiz = () => { setActiveView('main'); setSelectedQuiz(null); };

  // Quiz Actions (Rename, Delete, Share)
  const handleRenameClick = (e: React.MouseEvent, quiz: Quiz) => {
    e.stopPropagation();
    setQuizToRename(quiz);
    setShowRenameDialog(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, quiz: Quiz) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this quiz?')) {
        deleteQuiz(quiz.id);
    }
  };

  // UPDATED: Safe Share Function
  const handleShareClick = async (e: React.MouseEvent, quiz: Quiz) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent immediate menu close which can steal focus
    
    const scoreText = quiz.score 
        ? `I scored ${quiz.score}/${quiz.questions?.length} on this quiz in Alina!` 
        : 'Check out this quiz I generated with Alina!';
    
    try {
        // Method 1: Modern API (Works on HTTPS / Localhost)
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(scoreText);
        } 
        // Method 2: Fallback (Works everywhere else)
        else {
            const textArea = document.createElement("textarea");
            textArea.value = scoreText;
            
            // Make it invisible but part of the DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (!successful) throw new Error('Fallback copy failed');
        }

        toast({
            title: "Copied!",
            description: "Quiz result copied to clipboard.",
        });
    } catch (err) {
        console.error("Copy error:", err);
        toast({
            title: "Error",
            description: "Could not copy text. Please copy manually.",
            variant: "destructive",
        });
    }
  };

  const handleRenameConfirm = (newTitle: string) => {
    if (quizToRename) {
        renameQuiz({ quizId: quizToRename.id, title: newTitle });
    }
  };

  // --- Render Views ---

  // 1. Active Quiz View
  if (activeView === 'quiz' && selectedQuiz) {
    return (
      <div className="w-full bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden font-sans">
         <QuizGenerator notebookId={notebookId} existingQuiz={selectedQuiz} onBack={handleBackFromQuiz} />
      </div>
    );
  }

  // 2. Note Editing View
  if (editingNote || isCreatingNote) {
    return <div className="w-full bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
        <NoteEditor note={editingNote || undefined} onSave={handleSaveNote} onDelete={editingNote ? handleDeleteNote : undefined} onCancel={handleCancel} isLoading={isCreating || isUpdating || isDeleting} onCitationClick={onCitationClick} />
      </div>;
  }

  // 3. Main Studio View
  return (
    <div className="w-full bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden font-sans">
      
      <ScrollArea className="flex-1 h-full bg-gray-50/30">
        <div className="p-5 space-y-6 pb-20">
            
            {/* TITLE */}
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">Studio</h2>

            {/* ACTION CARDS GRID */}
            <div className="grid grid-cols-2 gap-3">
                {/* Audio Card */}
                <div 
                    onClick={hasValidAudio || currentAudioStatus === 'generating' ? undefined : () => generateAudioOverview(notebookId!)}
                    className={`col-span-1 relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-300 group
                        ${hasValidAudio 
                            ? 'bg-gradient-to-br from-gray-900 via-purple-950 to-violet-900 text-white shadow-md ring-1 ring-black/5' 
                            : 'bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md'
                        }`}
                >
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[100px]">
                        <div className="flex justify-between items-start">
                            <span className={`text-[10px] font-bold tracking-wider uppercase ${hasValidAudio ? 'text-purple-200' : 'text-purple-600'}`}>Audio</span>
                            {hasValidAudio ? <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" /></div> 
                            : <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><Play className="h-4 w-4 ml-0.5" /></div>}
                        </div>
                        <div>
                            <h3 className={`text-base font-bold leading-tight mb-1 ${hasValidAudio ? 'text-white' : 'text-gray-900'}`}>Deep Dive</h3>
                            <p className={`text-xs ${hasValidAudio ? 'text-purple-200/80' : 'text-gray-500'}`}>
                                {currentAudioStatus === 'generating' ? 'Generating...' : hasValidAudio ? 'Ready to play' : 'Generate'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quiz Card */}
                <div 
                    onClick={handleCreateQuizClick}
                    className="col-span-1 relative overflow-hidden rounded-xl p-4 cursor-pointer border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300 group"
                >
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-emerald-500 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[100px]">
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600">New</span>
                            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                {isStartingQuiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">Generate Quiz</h3>
                            <p className="text-xs text-gray-500">{isStartingQuiz ? 'Starting...' : 'Test knowledge'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* AUDIO PLAYER (Conditional) */}
            {hasValidAudio && !audioError && currentAudioStatus !== 'generating' && !isAutoRefreshing && (
                <AudioPlayer 
                    audioUrl={notebook!.audio_overview_url!} 
                    title="Deep Dive Conversation" 
                    notebookId={notebookId} 
                    expiresAt={notebook!.audio_url_expires_at} 
                    onError={handleAudioError} 
                    onRetry={handleAudioRetry} 
                />
            )}

            {/* QUIZZES LIST */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                    <BrainCircuit className="h-4 w-4 mr-2 text-gray-400" />
                    Your Quizzes
                </h3>
                
                {quizzes.length > 0 ? (
                    <div className="space-y-2">
                        {quizzes.map((quiz, index) => (
                            <div 
                                key={quiz.id} 
                                onClick={() => quiz.status === 'completed' && handleOpenQuiz(quiz)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all group relative overflow-hidden
                                    ${quiz.status === 'completed' ? 'bg-white border-gray-200 hover:border-emerald-300 cursor-pointer hover:shadow-sm' : 'bg-gray-50 border-gray-100 opacity-80'}
                                `}
                            >
                                <div className="flex items-center gap-3 z-10 flex-1 min-w-0">
                                    {/* Circular Index/Status Icon */}
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border shadow-sm flex-shrink-0
                                        ${quiz.status === 'completed' 
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' 
                                            : 'bg-gray-100 text-gray-400 border-gray-200'}
                                    `}>
                                        {quiz.status === 'generating' ? <Loader2 className="h-4 w-4 animate-spin" /> : (quizzes.length - index)}
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-medium text-gray-900 truncate pr-2">
                                            {quiz.status === 'generating' 
                                                ? 'Generating Quiz...' 
                                                : (quiz.title || `Quiz #${quizzes.length - index}`)}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[10px] text-gray-500 flex items-center">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
                                            </p>
                                            
                                            {/* Score Badge */}
                                            {quiz.score !== undefined && quiz.score !== null && (
                                                 <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    {quiz.score}/{quiz.questions?.length || 5}
                                                 </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Right Side Actions */}
                                <div className="flex items-center gap-1">
                                    {quiz.status === 'completed' && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-300 hover:text-gray-600 z-20 rounded-full">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem onClick={(e) => handleRenameClick(e, quiz)}>
                                                    <Edit className="h-4 w-4 mr-2" /> Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleShareClick(e, quiz)}>
                                                    <Share2 className="h-4 w-4 mr-2" /> Share Result
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => handleDeleteClick(e, quiz)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                    
                                    {quiz.status === 'completed' && (
                                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <p className="text-xs text-gray-500">No quizzes generated yet.</p>
                    </div>
                )}
            </div>

            {/* NOTES SECTION (Moved to Bottom) */}
            <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-gray-400" />
                        Notes
                    </h3>
                </div>

                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-6 text-gray-400 text-xs">Loading notes...</div>
                    ) : notes && notes.length > 0 ? (
                        notes.map(note => (
                            <div key={note.id} className="group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer relative" onClick={() => handleEditNote(note)}>
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
                                <p className="text-xs text-gray-500 line-clamp-2">{note.content.substring(0, 100)}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <p className="text-xs text-gray-500 mb-2">No notes yet.</p>
                            <p className="text-[10px] text-gray-400">Use the input below to add one.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
      </ScrollArea>

      {/* FIXED BOTTOM INPUT */}
      <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 z-10">
        <form onSubmit={handleQuickAddNote} className="relative flex items-center">
            <Input 
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                placeholder="Add a quick note..."
                className="pr-10 bg-gray-50 border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500 h-11 rounded-xl text-sm shadow-sm"
            />
            <Button type="submit" size="icon" disabled={!quickNoteContent.trim()} className="absolute right-1.5 h-8 w-8 rounded-lg bg-white text-gray-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm border border-gray-100 transition-all">
                <Plus className="h-4 w-4" />
            </Button>
        </form>
      </div>

      {/* Dialogs */}
      <QuizConfigDialog 
        open={showQuizConfig} 
        onOpenChange={setShowQuizConfig}
        onGenerate={handleGenerateQuiz}
        isGenerating={isStartingQuiz}
      />

      <RenameQuizDialog 
        open={showRenameDialog} 
        onOpenChange={setShowRenameDialog} 
        onConfirm={handleRenameConfirm}
        currentTitle={quizToRename?.title || (quizToRename ? `Quiz` : '')}
      />
    </div>
  );
};

export default StudioSidebar;