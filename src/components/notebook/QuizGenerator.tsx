import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, CheckCircle2, XCircle, RefreshCw, ArrowLeft, Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Import the new hook
import { useQuizGeneration } from '@/hooks/useQuizGeneration';

interface QuizGeneratorProps {
  notebookId?: string;
  onBack: () => void;
}

const QuizGenerator = ({ notebookId, onBack }: QuizGeneratorProps) => {
  // Connect to real backend logic
  const { 
    generateQuiz, 
    isGenerating, 
    quizData, 
    generationStatus 
  } = useQuizGeneration(notebookId);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  // Reset quiz state when new data arrives
  useEffect(() => {
    if (quizData) {
      setCurrentQuestion(0);
      setScore(0);
      setIsAnswerRevealed(false);
      setSelectedOption(null);
    }
  }, [quizData]);

  const handleOptionSelect = (index: number) => {
    if (isAnswerRevealed || !quizData) return;
    setSelectedOption(index);
    setIsAnswerRevealed(true);
    if (index === quizData[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (!quizData) return;
    
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
        toast({
            title: "Quiz Completed!",
            description: `You scored ${score} out of ${quizData.length}`,
        });
    }
  };

  // --- View: Loading State ---
  if (isGenerating || generationStatus === 'generating') {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900">Generating Quiz...</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <div className="relative">
             <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
             <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4 relative z-10" />
           </div>
           <h3 className="text-lg font-medium text-gray-900 mb-2">Designing your quiz</h3>
           <p className="text-gray-500 text-sm max-w-xs">
             Alina is analyzing your documents to create relevant questions...
           </p>
        </div>
      </div>
    );
  }

  // --- View: Empty State (Start) ---
  if (!quizData || quizData.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900">Quiz Generator</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <BrainCircuit className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Test your knowledge</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
            Generate an interactive quiz based on the sources in this notebook to reinforce your learning.
          </p>
          <Button 
            onClick={() => generateQuiz()} 
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-xs h-11 text-sm shadow-emerald-200 shadow-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Generate Quiz
          </Button>
        </div>
      </div>
    );
  }

  // --- View: Active Quiz ---
  const question = quizData[currentQuestion];
  const isLastQuestion = currentQuestion === quizData.length - 1;
  const progress = ((currentQuestion + 1) / quizData.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-gray-700 text-sm">Question {currentQuestion + 1} of {quizData.length}</span>
            </div>
            <div className="flex items-center gap-3">
                 <Button variant="ghost" size="sm" onClick={() => generateQuiz()} className="h-8 text-xs text-gray-500 hover:text-emerald-600">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> New
                 </Button>
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                    Score: {score}
                </div>
            </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1">
            <div className="bg-emerald-500 h-1 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Question Area */}
        <ScrollArea className="flex-1 p-4">
            <div className="max-w-lg mx-auto space-y-6 pb-10 mt-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                        {question.text}
                    </h3>
                </div>

                <div className="space-y-3">
                    {question.options.map((option, index) => {
                        const isSelected = selectedOption === index;
                        const isCorrect = index === question.correctAnswer;
                        const showCorrect = isAnswerRevealed && isCorrect;
                        const showIncorrect = isAnswerRevealed && isSelected && !isCorrect;

                        let borderClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30";
                        let bgClass = "bg-white";
                        let textClass = "text-gray-700";
                        let icon = <div className="w-4 h-4 rounded-full border border-gray-300" />;

                        if (showCorrect) {
                            borderClass = "border-emerald-500 ring-1 ring-emerald-500";
                            bgClass = "bg-emerald-50";
                            textClass = "text-emerald-900 font-medium";
                            icon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
                        } else if (showIncorrect) {
                            borderClass = "border-red-300 bg-red-50";
                            bgClass = "bg-red-50";
                            textClass = "text-red-900";
                            icon = <XCircle className="h-5 w-5 text-red-500" />;
                        } else if (isSelected) {
                            borderClass = "border-blue-500 ring-1 ring-blue-500";
                            bgClass = "bg-blue-50";
                            textClass = "text-blue-900";
                            icon = <div className="w-4 h-4 rounded-full border-4 border-blue-500 bg-white" />;
                        }

                        return (
                            <Card
                                key={index}
                                onClick={() => handleOptionSelect(index)}
                                className={`p-4 cursor-pointer transition-all duration-200 relative overflow-hidden ${borderClass} ${bgClass}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex-shrink-0">
                                        {icon}
                                    </div>
                                    <span className={`text-sm leading-relaxed ${textClass}`}>{option}</span>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {isAnswerRevealed && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 p-1.5 rounded-md">
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <span className="font-semibold text-blue-900 text-sm block mb-1">Explanation</span>
                                    <p className="text-sm text-blue-800 leading-relaxed">{question.explanation}</p>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleNext} 
                            className="w-full h-12 text-base bg-gray-900 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                        >
                            {isLastQuestion ? 'Finish Quiz' : 'Next Question'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
  );
};

export default QuizGenerator;