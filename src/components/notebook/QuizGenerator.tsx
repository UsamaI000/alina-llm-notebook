import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, ArrowLeft, BookOpen, ArrowRight, AlertTriangle, Trophy } from 'lucide-react'; // Added Trophy icon
import { useToast } from '@/hooks/use-toast';
import { useQuizGeneration, Quiz } from '@/hooks/useQuizGeneration';

interface QuizGeneratorProps {
  notebookId?: string;
  existingQuiz?: Quiz;
  onBack: () => void;
}

const QuizGenerator = ({ notebookId, existingQuiz, onBack }: QuizGeneratorProps) => {
  const { toast } = useToast();
  // Get the saveScore function from the hook
  const { saveScore } = useQuizGeneration(notebookId);
  
  const quizData = existingQuiz?.questions;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsAnswerRevealed(false);
    setSelectedOption(null);
  }, [existingQuiz]);

  const handleOptionSelect = (key: string, correctAnswer: string) => {
    if (isAnswerRevealed) return;
    setSelectedOption(key);
    setIsAnswerRevealed(true);
    if (String(key).toLowerCase() === String(correctAnswer).toLowerCase()) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (!quizData) return;
    
    if (currentQuestionIndex < quizData.length - 1) {
      // Go to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
        // --- FINISH QUIZ LOGIC ---
        
        // 1. Save to Database
        if (existingQuiz?.id) {
            saveScore({ quizId: existingQuiz.id, score: score });
        }

        // 2. Show Success Toast
        toast({
            title: "Quiz Completed!",
            description: `Score saved: ${score} / ${quizData.length}`,
        });

        // 3. Return to Studio Sidebar
        onBack();
    }
  };

  if (!quizData || quizData.length === 0) return <div className="p-10 text-center">Error loading quiz data.</div>;

  const rawQuestion = quizData[currentQuestionIndex] as any;
  const questionText = rawQuestion.question || rawQuestion.text || "Question text missing";
  const correctAnswer = rawQuestion.correct_answer || rawQuestion.correctAnswer || "";
  const explanation = rawQuestion.explanation || "No explanation provided.";
  const options = rawQuestion.options || {};

  if (!options || (typeof options !== 'object')) return <div>Error loading options</div>;

  const optionsList = Array.isArray(options) 
    ? options.map((val, idx) => ({ key: String(idx), value: val })) 
    : Object.entries(options).map(([key, value]) => ({ key, value: String(value) }));

  const isLastQuestion = currentQuestionIndex === quizData.length - 1;
  const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
                <span className="font-medium text-gray-700 text-sm">Question {currentQuestionIndex + 1} of {quizData.length}</span>
            </div>
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">Score: {score}</div>
        </div>
        <div className="w-full bg-gray-100 h-1"><div className="bg-emerald-500 h-1 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div></div>
        <ScrollArea className="flex-1 p-4">
            <div className="max-w-lg mx-auto space-y-6 pb-10 mt-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">{questionText}</h3>
                </div>
                <div className="space-y-3">
                    {optionsList.map(({ key, value }) => {
                        const isSelected = selectedOption === key;
                        const isCorrect = String(key).toLowerCase() === String(correctAnswer).toLowerCase();
                        const showCorrect = isAnswerRevealed && isCorrect;
                        const showIncorrect = isAnswerRevealed && isSelected && !isCorrect;
                        let borderClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30";
                        let bgClass = "bg-white";
                        let icon = <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium text-gray-500">{key}</div>;
                        
                        if (showCorrect) { borderClass = "border-emerald-500 ring-1 ring-emerald-500"; bgClass = "bg-emerald-50"; icon = <CheckCircle2 className="h-6 w-6 text-emerald-600" />; }
                        else if (showIncorrect) { borderClass = "border-red-300 bg-red-50"; bgClass = "bg-red-50"; icon = <XCircle className="h-6 w-6 text-red-500" />; }
                        else if (isSelected) { borderClass = "border-blue-500 ring-1 ring-blue-500"; bgClass = "bg-blue-50"; icon = <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center text-xs font-bold text-blue-600">{key}</div>; }

                        return (
                            <Card key={key} onClick={() => handleOptionSelect(key, correctAnswer)} className={`p-4 cursor-pointer transition-all duration-200 relative overflow-hidden ${borderClass} ${bgClass}`}>
                                <div className="flex items-start gap-3"><div className="mt-0.5 flex-shrink-0">{icon}</div><span className="text-sm text-gray-700 leading-relaxed">{value}</span></div>
                            </Card>
                        );
                    })}
                </div>
                {isAnswerRevealed && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 p-1.5 rounded-md"><BookOpen className="h-4 w-4 text-blue-600" /></div>
                                <div><span className="font-semibold text-blue-900 text-sm block mb-1">Explanation</span><p className="text-sm text-blue-800 leading-relaxed">{explanation}</p></div>
                            </div>
                        </div>
                        <Button onClick={handleNext} className="w-full h-12 text-base bg-gray-900 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl">
                            {isLastQuestion ? (
                                <>Finish Quiz <Trophy className="ml-2 h-4 w-4 text-yellow-500" /></>
                            ) : (
                                <>Next Question <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
  );
};

export default QuizGenerator;