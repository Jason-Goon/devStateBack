import React, { useState, useEffect } from 'react';
import socket from './utils/socket';
import Hand from './Hand';
import DiscardPile from './DiscardPile';
import PlayerTable from './PlayerTable';
import PlayerInfoPanel from './PlayerInfoPanel';

const GameBoard = () => {
  const [playerTables, setPlayerTables] = useState({});
  const [hand, setHand] = useState([]);
  const [discardPileCards, setDiscardPileCards] = useState([]);
  const [playerTableCards, setPlayerTableCards] = useState([]);
  const [selectedCardIndices, setSelectedCardIndices] = useState([]);
  const [selectedDiscardIndices, setSelectedDiscardIndices] = useState([]);

  // This function handles the incoming play outcomes and updates the player tables accordingly
  const processPlayOutcome = (playOutcome) => {
    const { playerId, newPlay } = playOutcome;
    addPlayToPlayerTable(playerId, newPlay);
  };

  // This function updates the specific player's table with a new play
  const addPlayToPlayerTable = (playerId, newPlay) => {
    setPlayerTables(prevTables => {
      const updatedPlays = prevTables[playerId] ? [...prevTables[playerId], newPlay] : [newPlay];
      return { ...prevTables, [playerId]: updatedPlays };
    });
  };

  // This function handles updates to the player tables from the server
  const handleUpdatePlayerTables = (updatedPlayerTables) => {
    setPlayerTables(prevTables => {
      return { ...prevTables, ...updatedPlayerTables };
    });
  };

  const drawCardFromPack = () => {
    socket.emit('drawCard');
  };

  const placeCardOnDiscardPile = () => {
    if (selectedCardIndices.length === 1) {
      const selectedIndex = selectedCardIndices[0];
      const cardToDiscard = hand[selectedIndex];
      socket.emit('placeCardOnDiscardPile', cardToDiscard);
      setSelectedCardIndices([]);
    } else {
      alert("Please select exactly one card to discard.");
    }
  };

  const handleSelectCard = (index) => {
    setSelectedCardIndices(prevIndices => 
      prevIndices.includes(index) ? prevIndices.filter(i => i !== index) : [...prevIndices, index]
    );
  };

  const placeCardsOnPlayerTable = () => {
    const selectedHandCards = selectedCardIndices.map(index => hand[index]);
    // Adjust playData to include multiple discard indices
    const playData = {
      handCards: selectedHandCards,
      discardIndices: selectedDiscardIndices,
    };

    socket.emit('makePlay', playData);
    setSelectedCardIndices([]);
    setSelectedDiscardIndices([]);
  };

  const handleSelectDiscardCard = (index) => {
    // Toggle selection for multiple discard pile cards
    setSelectedDiscardIndices(prevIndices => {
      const indexPosition = prevIndices.indexOf(index);
      if (indexPosition === -1) {
        // If not already selected, add to selections
        return [...prevIndices, index];
      } else {
        // If already selected, remove from selections
        return prevIndices.filter(i => i !== index);
      }
    });
  };



  // Listening for updates from the server
  useEffect(() => {
    socket.on('dealCards', setHand);
    socket.on('updateHand', setHand);
    socket.on('updateDiscardPile', setDiscardPileCards);
    socket.on('updatePlayerTable', setPlayerTableCards);
    socket.on('updatePlayerTables', handleUpdatePlayerTables);
    socket.on('playOutcome', processPlayOutcome); // Assuming there's an event named 'playOutcome'

    return () => {
      socket.off('dealCards');
      socket.off('updateHand');
      socket.off('updateDiscardPile');
      socket.off('updatePlayerTable');
      socket.off('updatePlayerTables', handleUpdatePlayerTables);
      socket.off('playOutcome', processPlayOutcome);
    };
  }, [processPlayOutcome]);

  // Component's JSX and other logic...
  return (
    <div className="gameBoard">
      <PlayerInfoPanel playerTables={playerTables} />
      <DiscardPile
        cards={discardPileCards}
        onSelectCard={handleSelectDiscardCard}
        selectedIndices={selectedDiscardIndices}
        allowMultiSelect={true} // Adjust based on your game's rules
      />
      <PlayerTable cards={playerTableCards} />
      <button onClick={drawCardFromPack}>Draw Card from Pack</button>
      <button onClick={placeCardsOnPlayerTable}>Place Selected Cards on Player Table</button>
      <button onClick={placeCardOnDiscardPile}>Discard Selected Card</button>
      <Hand
        cards={hand}
        onSelectCard={handleSelectCard}
        selectedCardIndices={selectedCardIndices}
      />
    </div>
  );
};

export default GameBoard;
