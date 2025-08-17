import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Title from './components/Title';
import ButtonBox from './components/ButtonBox';
import DialogBox from './components/DialogBox';
import StartScreen from './components/StartScreen';
import Logo from './components/Logo';
import './App.css';

const API_BASE_URL = '/api';
const HOST_KEY = '/api/reset';

const axiosInstance = axios.create({
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
  }
});

function App() {
  const [selectedBackground, setSelectedBackground] = useState("intro-background");
  const [userId, setUserId] = useState(null);
  const [questionData, setQuestionData] = useState(null);
  const [dialogHistory, setDialogHistory] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isFirstAnswer, setIsFirstAnswer] = useState(true);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [isMultipleQuestion, setIsMultipleQuestion] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [canAnswer, setCanAnswer] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDrinks, setSelectedDrinks] = useState({ isBeer: false, isWhiteWine: false, isRedWine: false });
  const [fade, setFade] = useState(false);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    const startSession = async () => {
      try {
        const response = await axiosInstance.get(`${API_BASE_URL}/start?code=${HOST_KEY}`);
        setUserId(response.data.user_id);
        console.log("User ID:", response.data.user_id);
      } catch (error) {
        console.error('Error starting session:', error);
      }
    };
    startSession();
  }, []);

  const fetchQuestion = useCallback(async () => {
    if (fetchInProgressRef.current || !userId) return;
    fetchInProgressRef.current = true;

    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/question?code=${HOST_KEY}`, {
        params: { user_id: userId },
      });
      console.log("GET Response:", response.data);
      if (response.data) {
        setQuestionData(response.data);
        setIsLastQuestion(response.data.last);
        setIsMultipleQuestion(response.data.multiple);
        setDialogHistory(prev => {
          if (prev.length === 0 || prev[prev.length - 1].content !== response.data.question) {
            return [...prev, { type: 'question', content: response.data.question }];
          }
          return prev;
        });
        setTimeout(() => setCanAnswer(true), 500);
      }
    } catch (error) {
      console.error("Error fetching question:", error.message);
    } finally {
      fetchInProgressRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (userId && !isResetting && showIntro) {
      fetchQuestion();
    }
  }, [fetchQuestion, userId, isResetting, showIntro]);

  const startApp = (selectedAnswer) => {
    setFade(true);
    setShowIntro(false);
    setDialogHistory([]);
    setUserAnswers([]);
    setIsFirstAnswer(true);
    handleAnswer([selectedAnswer]);
    setTimeout(() => {
      setSelectedBackground(`${selectedAnswer.toLowerCase().replace(/\s+/g, '-')}-background`);
      setFade(false);
    }, 1000);
  };

  const handleAnswer = async (selectedAnswers) => {
    setCanAnswer(false);
    try {
      const answerString = selectedAnswers.join(', ');
      if (!isFirstAnswer) {
        setDialogHistory(prev => [...prev, { type: 'answer', content: answerString }]);
      }
      setIsTyping(true);

      const response = await axiosInstance.post(`${API_BASE_URL}/answer?code=${HOST_KEY}`, {
        user_id: userId,
        answer: answerString
      });
      console.log("POST Response:", response.data);

      if (response.data) {
        let typingDelay;
        const ai_response = response.data.response;
        const drinkData = response.data.drink;
        const systemBolagetData = response.data.systembolaget_drink;

        setTimeout(() => {
          if (drinkData && systemBolagetData) {
            // const hardcoded_response = "Thank you, I will take all your answers into consideration and provide you with one recommendation available here at <strong>Sogeti Stockholm Quarterly Mingle Q3</strong> and one that you can find at <strong>Systembolaget</strong>.";
            setDialogHistory(prev => [
              ...prev,
              { type: 'response', content: ai_response },
              ...(drinkData ? [{ type: 'drink', content: drinkData }] : []),
              ...(systemBolagetData ? [{ type: 'systembolaget_drink', content: systemBolagetData }] : []),
            ]);
            typingDelay = ai_response.length * 25;
          } else {
            setDialogHistory(prev => [
              ...prev,
              { type: 'response', content: ai_response },
            ]);
            typingDelay = ai_response.length * 30;
          }

          // const typingDelay = response.data.response.length < 200 ? response.data.response.length * 25 : response.data.response.length * 2;

          setIsTyping(false);

          setTimeout(() => {
            if (isLastQuestion) {
              setShowSummary(true);
            } else {
              fetchQuestion();
            }
          }, typingDelay);
        }, 100);

        setUserAnswers(prev => [...prev, ...selectedAnswers]);
      }
    } catch (error) {
      console.error("Error sending answer:", error.message);
    } finally {
      setIsFirstAnswer(false);
    }
  };

  const updateSelectedDrinks = (drinkType) => {
    setSelectedDrinks((prev) => {
      const newState = {
        ...prev,
        [drinkType]: true,
      };
      // console.log("SELECTED DRINKS AFTER SET:", newState);
      return newState;
    });
  };

  const resetApp = async () => {
    setFade(true);
    setTimeout(() => {
      setSelectedBackground("intro-background");
      setFade(false);
    }, 1000);
    setIsResetting(true);
    setDialogHistory([]);
    setUserAnswers([]);
    setIsLastQuestion(false);
    setShowSummary(false);
    setCanAnswer(false);
    setQuestionData(null);
    setIsFirstAnswer(true);
    setSelectedDrinks({ isBeer: false, isWhiteWine: false, isRedWine: false });

    try {
      await axiosInstance.post(`${API_BASE_URL}/reset?code=${HOST_KEY}`, { user_id: userId });
      setShowIntro(true);
      setIsResetting(false);
    } catch (error) {
      console.error("Error resetting app:", error.message);
      setIsResetting(false);
    }
  };

  return (
    <div className="app">
      <div className="portrait-message">
        {/* Message shown when in portrait mode */}
        <p>Please rotate your device to landscape mode or use full screen on your computer to use the app.</p>
      </div>
      <div className="small-screen-message">
        {/* Message shown when screen size is too small */}
        <p>Please use a bigger screen on your computer to use the app.</p>
      </div>
      <div className="left-panel">
        <div className={`background ${selectedBackground} ${fade ? 'fade-out' : ''}`}></div>
        <Title onReset={resetApp} />
        <div className="button-box-container">
          {showIntro ? (
            <ButtonBox onButtonClick={startApp} selectedDrinks={selectedDrinks} onSelectDrink={updateSelectedDrinks} showIntro={showIntro} setShowIntro={setShowIntro} />
          ) : !showSummary && canAnswer && (
            <ButtonBox
              answers={questionData?.answers}
              onAnswer={handleAnswer}
              onMultiple={isMultipleQuestion}
              onReset={resetApp}
              selectedDrinks={selectedDrinks}
              showIntro={showIntro}
              setShowIntro={setShowIntro}
            />
          )}
        </div>
        <Logo />
      </div>
      <div className="right-panel">
        <DialogBox
          dialogHistory={showIntro ? [] : dialogHistory}
          showSummary={showSummary}
          userAnswers={userAnswers}
          selectedDrinks={selectedDrinks}
          isTyping={isTyping}
          onReset={resetApp}
        >
          {showIntro && <StartScreen />}
        </DialogBox>
      </div>
    </div>
  );
}

export default App;
