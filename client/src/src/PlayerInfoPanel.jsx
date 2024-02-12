import React from 'react';
import './PlayerInfoPanel.css'; // Adjust the CSS as needed

const PlayerInfoPanel = ({ playerTables = {} }) => { // Provide a default empty object
  return (
    <div className="playerInfoPanel">
      {Object.entries(playerTables).map(([playerId, playTable], index) => (
        <div key={playerId} className="playerInfo">
          <h4>Table {index + 1}</h4>
          <div className="playerTableCards">
            {playTable && playTable.map((card, cardIndex) => (
              <div key={cardIndex} className="card">
                {card.value} of {card.suit}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlayerInfoPanel;
