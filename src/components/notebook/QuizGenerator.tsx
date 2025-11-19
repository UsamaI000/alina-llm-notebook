import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, CheckCircle2, XCircle, RefreshCw, ArrowLeft, Loader2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizGeneratorProps {
  notebookId?: string;
  onBack: () => void;
}

const QuizGenerator = ({ notebookId, onBack }: QuizGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizData, setQuizData] = useState<Question[] | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  // Mock generation function - connect this to your n8n workflow later
  const handleGenerateQuiz = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setQuizData([
        {
          id: 1,
          text: "What is the primary advantage of using RAG (Retrieval-Augmented Generation) in LLMs?",
          options: [
            "It increases the model's training speed significantly.",
            "It reduces the need for GPU memory.",
            "It grounds the model's responses in specific, up-to-date external data.",
            "It allows the model to generate images from text."
          ],
          correctAnswer: 2,
          explanation: "RAG allows Large Language Models to access external knowledge bases, reducing hallucinations and providing accurate, context-specific information."
        },
        {
          id: 2,
          text: "Which component is responsible for converting text into numerical vectors?",
          options: [
            "The Tokenizer",
            "The Embedding Model",
            "The Context Window",
            "The Temperature Parameter"
          ],
          correctAnswer: 1,
          explanation: "Embedding models convert text into high-dimensional vectors (embeddings) that capture semantic meaning, allowing for similarity searches."
        },
        {
            id: 3,
            text: "In the context of this notebook, what does 'Audio Overview' generate?",
            options: [
              "A direct transcript of the uploaded files.",
              "A simulated deep-dive conversation between two AI hosts.",
              "A simple text summary read aloud.",
              "A translation of the documents."
            ],
            correctAnswer: 1,
            explanation: "The Audio Overview feature creates an engaging, podcast-style dialogue between two AI hosts discussing the key themes of your sources."
          }
      ]);
      setIsGenerating(false);
      setCurrentQuestion(0);
      setScore(0);
      setIsAnswerRevealed(false);
      setSelectedOption(null);
    }, 2000);
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswerRevealed) return;
    setSelectedOption(index);
    setIsAnswerRevealed(true);
    if (index === quizData![currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < quizData!.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
        // End of quiz
        toast({
            title: "Quiz Completed!",
            description: `You scored ${score} out of ${quizData!.length}`,
        });
    }
  };

  // 1. Empty State / Landing
  if (!quizData) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900">Quiz Generator</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
            <BrainCircuit className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Test your knowledge</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
            Generate an interactive quiz based on the sources in this notebook to reinforce your learning.
          </p>
          <Button 
            onClick={handleGenerateQuiz} 
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-xs"
          >
            {isGenerating ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...
                </>
            ) : (
                <>
                    <RefreshCw className="h-4 w-4 mr-2" /> Generate Quiz
                </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const question = quizData[currentQuestion];
  const isLastQuestion = currentQuestion === quizData.length - 1;

  // 2. Quiz Interface
  return (
    <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-gray-700">Question {currentQuestion + 1}/{quizData.length}</span>
            </div>
            <div className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Score: {score}
            </div>
        </div>

        {/* Question Area */}
        <ScrollArea className="flex-1 p-4">
            <div className="max-w-lg mx-auto space-y-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
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

                        let borderClass = "border-gray-200 hover:border-blue-300";
                        let bgClass = "bg-white hover:bg-blue-50/50";
                        let textClass = "text-gray-700";

                        if (showCorrect) {
                            borderClass = "border-emerald-500 ring-1 ring-emerald-500";
                            bgClass = "bg-emerald-50";
                            textClass = "text-emerald-800";
                        } else if (showIncorrect) {
                            borderClass = "border-red-300";
                            bgClass = "bg-red-50";
                            textClass = "text-red-800";
                        } else if (isSelected) {
                            borderClass = "border-blue-500";
                            bgClass = "bg-blue-50";
                        }

                        return (
                            <Card
                                key={index}
                                onClick={() => handleOptionSelect(index)}
                                className={`p-4 cursor-pointer transition-all relative overflow-hidden ${borderClass} ${bgClass}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 
                                        ${showCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 
                                          showIncorrect ? 'border-red-500 bg-red-500 text-white' : 
                                          isSelected ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}
                                    >
                                        {showCorrect && <CheckCircle2 className="h-3.5 w-3.5" />}
                                        {showIncorrect && <XCircle className="h-3.5 w-3.5" />}
                                        {!showCorrect && !showIncorrect && isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <span className={`text-sm ${textClass}`}>{option}</span>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {isAnswerRevealed && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                            <div className="flex items-start gap-2">
                                <BookOpen className="h-4 w-4 text-blue-600 mt-0.5" />
                                <div>
                                    <span className="font-medium text-blue-900 text-sm block mb-1">Explanation</span>
                                    <p className="text-sm text-blue-800 leading-relaxed">{question.explanation}</p>
                                </div>
                            </div>
                        </div>
                        
                        <Button onClick={handleNext} className="w-full bg-gray-900 hover:bg-gray-800">
                            {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
  );
};

export default QuizGenerator;