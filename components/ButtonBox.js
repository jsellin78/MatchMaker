import React, { useState, useEffect } from 'react';
import './ButtonBox.css';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogActions';
import DialogActions from '@mui/material/DialogActions';

function ButtonBox({ showIntro, answers, onMultiple, onAnswer, onButtonClick, onReset, selectedDrinks, onSelectDrink, setShowIntro }) {
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [open, setOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInfo(true);
    }, 500);
    return () => clearTimeout(timer);
  });

  const columns = answers && (answers.length === 2 || answers.length === 4) ? 2 : 3;

  const toggleAnswer = (answer) => {
    setSelectedAnswers(prevSelected => {
      console.log("Current selected answers:", prevSelected);
      console.log("Answer to toggle:", answer);

      if (onMultiple) {
        if (prevSelected.includes(answer)) {
          return prevSelected.filter(item => item !== answer);
        } else if (prevSelected.length < 3) {
          return [...prevSelected, answer];
        } else {
          console.log("Maximum limit of 3 selections reached. Cannot select more.");
        }
      } else {
        if (prevSelected.includes(answer)) {
          return [];
        } else if (prevSelected.length === 0) {
          return [answer];
        } else {
          console.log("An answer is already selected. Deselect it before picking another.");
          return prevSelected;
        }
      }
      return prevSelected;
    });
  };

  const isAnswerSelected = (answer) => selectedAnswers.includes(answer);

  const handleSubmit = () => {
    if (onMultiple && selectedAnswers.length === 3) {
      setShowInfo(false);
      setTimeout(() => {
        onAnswer(selectedAnswers);
        setSelectedAnswers([]);
      }, 500);
    }
    else if (!onMultiple && selectedAnswers.length > 0) {
      setShowInfo(false);
      setTimeout(() => {
        onAnswer(selectedAnswers);
        setSelectedAnswers([]);
      }, 500);
    }
  };

  const handleResetClick = () => {
    setOpen(true);
  };

  const handleClose = (reset) => {
    setOpen(false);
    if (reset) {
      onReset();
    }
  };

  const handleDrinkSelection = (drink) => {
    console.log("Drink selected:", drink);

    const drinkKeyMap = {
      "beer": "isBeer",
      "white wine": "isWhiteWine",
      "red wine": "isRedWine",
    };

    const selectedDrinkKey = drinkKeyMap[drink.toLowerCase()];

    if (showIntro) {
      onSelectDrink(selectedDrinkKey);
      setShowIntro(false);
    } else {
      console.log("Cannot change drink selection; StartScreen is not showing.");
    }
    toggleAnswer(drink);
    onButtonClick(drink);
  };

  useEffect(() => {
    console.log("Selected drink states:", selectedDrinks);
  }, [selectedDrinks]);

  const getButtonStyle = (selectedDrinks) => {
    if (selectedDrinks.isBeer) {
      return { backgroundColor: '#D5BC94' };
    } else if (selectedDrinks.isWhiteWine) {
      return { backgroundColor: '#E9DFA8' };
    } else if (selectedDrinks.isRedWine) {
      return { backgroundColor: '#F8BDBD' };
    }
    return { backgroundColor: '#D5BC94' };
  };

  const getButtonHoverStyle = (selectedDrinks) => {
    if (selectedDrinks.isBeer) {
      return { backgroundColor: '#FFE2B2' };
    } else if (selectedDrinks.isWhiteWine) {
      return { backgroundColor: '#FCD28C' };
    } else if (selectedDrinks.isRedWine) {
      return { backgroundColor: '#EE5E54' };
    }
    return { backgroundColor: '#FFE2B2' };
  };

  return (
    <>
      {onButtonClick && (
        <Box className="recommend-button-wrapper">
          <Button
            variant="contained"
            color="inherit"
            size="large"
            onClick={() => handleDrinkSelection("Beer")}
            className="recommend-button"
          >
            Beer
          </Button>
          <Button
            variant="contained"
            color="inherit"
            size="large"
            onClick={() => handleDrinkSelection("White Wine")}
            className="recommend-button"
          >
            White Wine
          </Button>
          <Button
            variant="contained"
            color="inherit"
            size="large"
            onClick={() => handleDrinkSelection("Red Wine")}
            className="recommend-button"
          >
            Red Wine
          </Button>
        </Box>
      )}
      <div className={`choice-header ${showInfo ? 'show' : ''}`}>
        {onMultiple && !showIntro && (
          <p>Toggle <strong>three</strong> choices</p>
        )}
        {!onMultiple && !showIntro && (
          <p>Toggle <strong>one</strong> choice</p>
        )}
      </div>
      <Box className={`button-box ${showInfo ? 'show' : ''}`}
        style={{ gridTemplateColumns: `repeat(${columns}, 0.3fr)` }}
      >
        {answers && answers.map((answer, index) => (
          <Button
            variant="contained"
            color="inherit"
            key={index}
            onClick={() => {
              if (onMultiple && selectedAnswers.length >= 3 && !isAnswerSelected(answer)) {
                console.log("Cannot select more than 3 answers.");
                return;
              }
              if (!onMultiple && selectedAnswers.length > 0 && !isAnswerSelected(answer)) {
                console.log("Cannot select another answer without deselecting the first one.");
                return;
              }

              toggleAnswer(answer);
            }}
            className="answer-button"
            style={{
              backgroundColor: isAnswerSelected(answer)
                ? getButtonHoverStyle(selectedDrinks).backgroundColor
                : (onMultiple && selectedAnswers.length >= 3 && !isAnswerSelected(answer))
                  ? getButtonStyle(selectedDrinks).backgroundColor
                  : getButtonStyle(selectedDrinks).backgroundColor,
            }}
            onMouseEnter={e => {
              if (!isAnswerSelected(answer) && ((onMultiple && selectedAnswers.length < 3) || (selectedAnswers.length === 0))) {
                e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor;
              }
            }}
            onMouseLeave={e => {
              if (!isAnswerSelected(answer) && ((onMultiple && selectedAnswers.length < 3) || (selectedAnswers.length === 0))) {
                e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor;
              }
            }}
            onTouchStart={e => {
              if (!isAnswerSelected(answer) && ((onMultiple && selectedAnswers.length < 3) || (selectedAnswers.length === 0))) {
                e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor;
              }
            }}
            onTouchEnd={e => {
              if (!isAnswerSelected(answer) && ((onMultiple && selectedAnswers.length < 3) || (selectedAnswers.length === 0))) {
                e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor;
              }
            }}
          >
            {answer.charAt(0).toUpperCase() + answer.slice(1)}
          </Button>
        ))}
      </Box>
      <div className={`reset-button-container ${showInfo ? 'show' : ''}`}>
        {answers && answers.length > 0 && (
          <>
            <Box
              className="material-symbols-outlined icon reset-button"
              onClick={handleResetClick}
              style={{
                backgroundColor: getButtonStyle(selectedDrinks).backgroundColor,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor;
              }}
            >
              replay
            </Box>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              className={`submit-button ${(onMultiple && selectedAnswers.length === 3) || (!onMultiple && selectedAnswers.length === 1) ? 'active' : 'disabled'}`}
              style={{
                cursor: (onMultiple && selectedAnswers.length === 3) || (!onMultiple && selectedAnswers.length === 1) ? 'pointer' : 'not-allowed',
                borderRadius: '30px',
                backgroundColor: (onMultiple && selectedAnswers.length === 3) || (!onMultiple && selectedAnswers.length === 1)
                  ? getButtonHoverStyle(selectedDrinks).backgroundColor
                  : getButtonStyle(selectedDrinks).backgroundColor
              }}
              onMouseEnter={e => {
                if ((onMultiple && selectedAnswers.length === 3) || (!onMultiple && selectedAnswers.length === 1)) {
                  e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor;
                }
              }}
              onMouseLeave={e => {
                if ((onMultiple && selectedAnswers.length === 3) || (!onMultiple && selectedAnswers.length === 1)) {
                  e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor;
                } else {
                  e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor;
                }
              }}
              disabled={onMultiple ? selectedAnswers.length === 0 : selectedAnswers.length !== 1}
            >
              Answer the AI Bartender
            </Button>
          </>
        )}
      </div>

      {/* Modal for reset confirmation */}
      <Dialog open={open} onClose={() => handleClose(false)} PaperProps={{
        style: {
          maxWidth: '450px',
          width: 'auto',
          height: 'auto',
          padding: '30px',
          overflow: 'hidden',
          borderRadius: '15px',
          textAlign: 'center'
        },
      }}>
        <DialogTitle
          style={{
            display: 'flex',
            justifyContent: 'center', // Center horizontally
            alignItems: 'center', // Center vertically (in case of taller content)
            textAlign: 'center',
            margin: '0 0 15px 0',
          }}
        >
          <strong>Are you sure you want to start over?</strong>
        </DialogTitle>
        <DialogActions style={{ justifyContent: 'center' }}>
          <Button
            onClick={() => handleClose(true)}
            style={{
              backgroundColor: getButtonStyle(selectedDrinks).backgroundColor, // Set initial background color dynamically
              color: 'black',
              padding: '20px 20px',
              margin: '0 10px',
              cursor: 'pointer',
              borderRadius: '30px',
              transition: 'background-color 0.3s',
            }}
            className="styled-button"
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor; // Apply hover color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor; // Reset to default on leave
            }}
          >
            Yes, let's start over
          </Button>
          <Button
            onClick={() => handleClose(false)}
            style={{
              backgroundColor: getButtonStyle(selectedDrinks).backgroundColor, // Set initial background color dynamically
              color: 'black',
              padding: '20px 40px',
              margin: '0 10px',
              cursor: 'pointer',
              borderRadius: '30px',
              transition: 'background-color 0.3s',
            }}
            className="styled-button"
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor; // Apply hover color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor; // Reset to default on leave
            }}
          >
            No, I'm thirsty
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ButtonBox;
