import React, { useEffect, useState } from 'react';
import './DialogBox.css';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import Typewriter from 'typewriter-effect';

function DialogBox({ dialogHistory, showSummary, userAnswers, selectedDrinks, children, onReset, isTyping }) {
  const [showModal, setShowModal] = useState(false);
  const [imageRecommendedUrl, setimageRecommendedUrl] = useState('');
  const [imageRecommendedIconUrl, setimageRecommendedIconUrl] = useState('');
  const [imageSystemUrl, setimageSystemUrl] = useState('');
  const [imageSystemIconUrl, setimageSystemIconUrl] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showModalEffect, setShowModalEffect] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  let drink;
  let systemBolagetDrink;

  if (showSummary) {
    drink = dialogHistory.find(dialog => dialog.type === 'drink')?.content;
    systemBolagetDrink = dialogHistory.find(dialog => dialog.type === 'systembolaget_drink')?.content;
    console.log("Recommended Data:", drink);
    console.log("SystemBolaget Data:", systemBolagetDrink);
  }

  useEffect(() => {
    if (showModal && drink && systemBolagetDrink) {
      const fetchImages = async () => {
        try {
          const drinkRecommendedName = drink.Image_name;
          const iconRecommendedName = drink.Image_Icon;
          const drinkSystemName = systemBolagetDrink.Image_name;
          const iconSystemName = systemBolagetDrink.Image_Icon;

          const imageRecommendedUrls = [];
          const imageRecommendedIconUrls = [];
          const imageSystemUrls = [];
          const imageSystemIconUrls = [];
          const defaultImageUrl = '';

          if (drinkRecommendedName) {
            const fetchedimageRecommendedUrl = `/api/images/${encodeURIComponent(drinkRecommendedName)}`;
            imageRecommendedUrls.push(fetchedimageRecommendedUrl);
          }

          if (iconRecommendedName) {
            const fetchedRecommendedIconUrl = `/api/images/${encodeURIComponent(iconRecommendedName)}`;
            imageRecommendedIconUrls.push(fetchedRecommendedIconUrl);
          }

          if (drinkSystemName) {
            const fetchedimageSystemUrl = `/api/images/${encodeURIComponent(drinkSystemName)}`;
            imageSystemUrls.push(fetchedimageSystemUrl);
          }

          if (iconSystemName) {
            const fetchedSystemIconUrl = `/api/images/${encodeURIComponent(iconSystemName)}`;
            imageSystemIconUrls.push(fetchedSystemIconUrl);
          }


          const responsesRecommended = await Promise.all(imageRecommendedUrls.map(url => fetch(url).catch(() => null)));
          const responsesRecommendedIcon = await Promise.all(imageRecommendedIconUrls.map(url => fetch(url).catch(() => null)));
          const responsesSystem = await Promise.all(imageSystemUrls.map(url => fetch(url).catch(() => null)));
          const responsesSystemIcon = await Promise.all(imageSystemIconUrls.map(url => fetch(url).catch(() => null)));

          const imageRecommendedBlobs = await Promise.all(responsesRecommended.map(response =>
            response && response.ok ? response.blob() : null
          ));
          const imageRecommendedIconBlobs = await Promise.all(responsesRecommendedIcon.map(response =>
            response && response.ok ? response.blob() : null
          ));
          const imageSystemBlobs = await Promise.all(responsesSystem.map(response =>
            response && response.ok ? response.blob() : null
          ));
          const imageSystemIconBlobs = await Promise.all(responsesSystemIcon.map(response =>
            response && response.ok ? response.blob() : null
          ));

          const objectRecommendedUrls = imageRecommendedBlobs.map(blob => (blob ? URL.createObjectURL(blob) : defaultImageUrl));
          const objectRecommendedIconUrls = imageRecommendedIconBlobs.map(blob => (blob ? URL.createObjectURL(blob) : defaultImageUrl));
          const objectSystemUrls = imageSystemBlobs.map(blob => (blob ? URL.createObjectURL(blob) : defaultImageUrl));
          const objectSystemIconUrls = imageSystemIconBlobs.map(blob => (blob ? URL.createObjectURL(blob) : defaultImageUrl));

          if (drinkRecommendedName) setimageRecommendedUrl(objectRecommendedUrls[0]);
          if (iconRecommendedName) setimageRecommendedIconUrl(objectRecommendedIconUrls[0]);
          if (drinkSystemName) setimageSystemUrl(objectSystemUrls[0]);
          if (iconSystemName) setimageSystemIconUrl(objectSystemIconUrls[0]);
        } catch (error) {
          console.error('Error fetching images:', error);
        }
        setDataReady(true);
      };
      fetchImages();
    }
  }, [showModal, drink, systemBolagetDrink]);

  useEffect(() => {
    if (showModal && dataReady) {
      setShowModalEffect(true);
      const timer = setTimeout(() => {
        setShowInfo(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShowInfo(false);
      setShowModalEffect(false);
    }
  }, [showModal, dataReady]);

  useEffect(() => {
    if (showModal) {
      setDataReady(false);
    } else {
      setShowInfo(false);
      setDataReady(false);
    }
  }, [showModal]);

  const handleCloseWithEffect = () => {
    setShowModalEffect(false);
    setTimeout(() => {
      handleCloseModal();
    }, 1000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowModalEffect(false);
    setShowInfo(false);
    setDataReady(false);
    onReset();
  };

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
    <div className="dialog-box">
      <div className="dialog-box-content">
        {children}
        {dialogHistory
          .filter(dialog => dialog.type !== 'drink' && dialog.type !== 'systembolaget_drink') // Filter out 'drink' type
          .map((dialog, index) => {
            // Check if the current dialog is the last one and is a response
            const isLastResponse = dialog.type === 'response' && index === dialogHistory.length - 1;

            return (
              <div key={index} className={dialog.type}>
                {/* If the dialog is a question, display it without typewriter */}
                {dialog.type === 'question' ? (
                  <div>{dialog.content}</div>
                ) : (
                  // Handle responses
                  <div>
                    {/* Use Typewriter for the last response or normal display for others */}
                    {isLastResponse || dialog.type === 'response' ? (
                      <Typewriter
                        onInit={(typewriter) => {
                          // Define maximum character limit (250 characters for two lines)
                          const maxCharacters = 500;

                          // Check if the content exceeds the character limit
                          let truncatedContent = dialog.content;
                          if (dialog.content.length > maxCharacters) {
                            truncatedContent = dialog.content.substring(0, maxCharacters) + '...';
                          }

                          // Start typing the truncated content
                          typewriter
                            .typeString(truncatedContent)
                            .callFunction(() => {
                              // Introduce a short delay before opening the modal
                              if (isLastResponse) {
                                setTimeout(() => {
                                  setShowModal(true); // Show the modal after a brief pause
                                }, 1000); // Adjust the delay time (in milliseconds) as needed
                              }
                            })
                            .start(); // Start typing without any deletion or looping
                        }}
                        options={{
                          delay: 1,  // Set to 1ms per character for fast typing
                          cursor: '|',
                        }}
                      />
                    ) : (
                      // For non-last responses, display normally
                      <div>{dialog.content}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

        {/* Typing indicator (show if typing) */}
        {isTyping && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {showSummary && (
          <Dialog
            className={`modal ${showModalEffect ? 'show' : ''}`}
            open={showModal}
            onClose={() => setShowModal(false)}
            PaperProps={{
              style: {
                background: '#F2F2F0',
                minWidth: '98vw',
                minHeight: '98vh',
                borderRadius: '15px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                overflow: 'hidden',
              },
            }}
          >
            <div className="results-container">
              <div className="left-result">
                <div className="left-result-upper">
                  <DialogContent className="icon-left-image">
                    {/* TestExpo */}
                    <p className={`testexpo-info ${showInfo ? 'show' : ''}`}>
                      Best match available at Sogeti Quarterly Mingle
                    </p>
                    {drink && imageRecommendedIconUrl && (
                      <img
                        src={imageRecommendedIconUrl}
                        alt="Selected Icon"
                        className={`result-left-icon ${showInfo ? 'show' : ''}`}
                      />
                    )}
                  </DialogContent>
                  <DialogContent className="drink-left-image">
                    {drink && imageRecommendedUrl && (
                      <img
                        src={imageRecommendedUrl}
                        alt="Selected Drink"
                        className={`result-left-image ${showInfo ? 'show' : ''}`}
                      />
                    )}
                  </DialogContent>
                  <div className="left-filler" />
                </div>
                <DialogContent className="drink-information-left">
                  {drink && (
                    <>
                      <p className="title"><strong>{drink.Style_Name}</strong></p>
                      <span className="description">{drink.description}</span>
                      <div className="info-row-left">
                        <div className="flavor-profile">
                          {drink.flavor_profile && drink.flavor_profile.split(',').map((flavor, index) => (
                            <span key={index} className="flavor-item">{flavor.trim()}</span>
                          ))}
                        </div>
                        <span className="alcohol-content">{drink.alcohol_content}%</span>
                      </div>
                    </>
                  )}
                </DialogContent>
              </div>
              <div className="right-result">
                <div className="right-result-upper">
                  <div className="right-filler" />
                  <DialogContent className="drink-right-image">
                    {systemBolagetDrink && imageSystemUrl && (
                      <img
                        src={imageSystemUrl}
                        alt="Selected Drink"
                        className={`result-right-image ${showInfo ? 'show' : ''}`}
                      />
                    )}
                  </DialogContent>
                  <DialogContent className="icon-right-image">
                    {/* Systembolaget */}
                    <p className={`systembolaget-info ${showInfo ? 'show' : ''}`}>
                      Best match available at Systembolaget
                    </p>
                    {systemBolagetDrink && imageSystemIconUrl && (
                      <img
                        src={imageSystemIconUrl}
                        alt="Selected Icon"
                        className={`result-right-icon ${showInfo ? 'show' : ''}`}
                      />
                    )}
                  </DialogContent>
                </div>
                <DialogContent className="drink-information-right">
                  {systemBolagetDrink && (
                    <>
                      <p className="title"><strong>{systemBolagetDrink.Style_Name}</strong></p>
                      <span className="description">{systemBolagetDrink.description}</span>
                      <div className="info-row-right">
                        <div className="flavor-profile">
                          {systemBolagetDrink.flavor_profile && systemBolagetDrink.flavor_profile.split(',').map((flavor, index) => (
                            <span key={index} className="flavor-item">{flavor.trim()}</span>
                          ))}
                        </div>
                        <span className="alcohol-content">{systemBolagetDrink.alcohol_content}%</span>
                      </div>
                    </>
                  )}
                </DialogContent>
              </div>
            </div>

            <DialogActions style={{ justifyContent: 'center', width: '100%', padding: '0' }}>
              <Button
                className="start-over"
                variant="contained"
                onClick={handleCloseWithEffect}
                style={{
                  fontSize: '18px',
                  padding: '5px 40px',
                  borderRadius: '30px',
                  backgroundColor: getButtonStyle(selectedDrinks).backgroundColor,
                  color: 'black',
                  marginBottom: '20px',
                  textTransform: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = getButtonHoverStyle(selectedDrinks).backgroundColor;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = getButtonStyle(selectedDrinks).backgroundColor;
                }}
              >
                Cheers!
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </div>
    </div>
  );
}

export default DialogBox;
