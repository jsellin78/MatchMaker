import React from 'react';
// import robotImage from './images/ai-match-maker.png';
import halloweenImage from './images/ai-halloween-robot.png';
// import titleImage from './images/Logo.png';
import haloweenLogo from './images/halloween-logo.png';
import './Title.css';

function Title({ onReset }) {  return (
    <div className="title">
      <div className="header">
        <img className="title-image" src={haloweenLogo} alt="TITLE" />
        {/* <img className="title-image" onClick={onReset} src={titleImage} alt="TITLE" /> */}
      </div>
      <img className="robot-image" src={halloweenImage} alt="AI" />
    </div>
  );
}

export default Title;