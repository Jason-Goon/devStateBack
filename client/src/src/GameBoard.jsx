import React, { useState, useEffect } from 'react';
import socket from './utils/socket'; // Make sure this path matches your file structure
import Hand from './Hand';
import DiscardPile from './DiscardPile';
import PlayerTable from './PlayerTable';
import PlayerInfoPanel from './PlayerInfoPanel'; 
// Make sure this component is correctly imported

const GameBoard = () => {
  const [hand, setHand] = useState([]);
  const [discardPileCards, setDiscardPileCards] = useState([]);
  const [playerTableCards, setPlayerTableCards] = useState([]);
  const [selectedCardIndices, setSelectedCardIndices] = useState([]);
  const [playerTables, setPlayerTables] = useState([]);
  const [selectedDiscardIndices, setSelectedDiscardIndices] = useState([]);


  useEffect(() => {
    // Listening for card deals and updates
    socket.on('dealCards', setHand);
    socket.on('updateHand', setHand);
    // Listening for updates to the discard pile
    socket.on('updateDiscardPile', setDiscardPileCards);
    socket.on('updatePlayerTable', setPlayerTableCards);
    socket.on('updatePlayerTables', (updatedPlayerTables) => {
      setPlayerTables(updatedPlayerTables);
    });
    // Or handle player table updates at a higher level (e.g., in App.js) and pass down as props

    return () => {
      // Cleaning up event listeners on component unmount
      socket.off('dealCards');
      socket.off('updateHand');
      socket.off('updateDiscardPile');
      socket.off('updatePlayerTable');
      socket.off('updatePlayerTables');
      // If listening for player table updates, clean up here
    };
  }, []);


  const handleSelectDiscardCard = (index) => {
    setSelectedDiscardIndices(prevIndices => {
      const isSelected = prevIndices.includes(index);
      return isSelected ? prevIndices.filter(i => i !== index) : [...prevIndices, index];
    });
  };
  



  // Function to handle drawing a card from the pack
  const drawCardFromPack = () => {
    socket.emit('drawCard');
  };

  const handleSelectCard = (index) => {
    setSelectedCardIndices(prevIndices => {
      const isSelected = prevIndices.includes(index);
      return isSelected ? prevIndices.filter(i => i !== index) : [...prevIndices, index];
    });
  };

  const placeCardsOnPlayerTable = () => {
    // Map indices to actual card objects from hand
    const selectedHandCards = selectedCardIndices.map(index => hand[index]);
  
    // Prepare data structure for server indicating hand cards and discard pile selections
    const playData = {
      handCards: selectedHandCards,
      discardIndex: selectedDiscardIndices.length > 0 ? selectedDiscardIndices[0] : null // Assuming only one discard pile card can be selected
    };
  
    // Emitting the structured play data to the server
    socket.emit('makePlay', playData);
  
    // Reset selections
    setSelectedCardIndices([]);
    setSelectedDiscardIndices([]);
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

  // Helper function to validate if the selected cards make a valid play.
  // This should mirror the validation logic on the server side.
  function isValidPlay(selectedCards) {
    // Add your validation logic here based on the selectedCards.
    // For simplicity, let's assume any selection is valid.
    return true;
  }
  // Additional functions for handling gameplay actions like placing cards on the player table or discarding

  return (
    <div className="gameBoard">
      <PlayerInfoPanel playerTables={playerTables} />
  
      <DiscardPile
        cards={discardPileCards}
        onSelectCard={handleSelectDiscardCard}
        selectedIndices={selectedDiscardIndices}
      />

  
      <PlayerTable cards={playerTableCards} />
  
      <button onClick={drawCardFromPack}>Draw Card from Pack</button>
  
      {selectedCardIndices.length > 0 && (
        <button onClick={placeCardsOnPlayerTable}>Place Selected Cards on Player Table</button>
      )}
  
      {selectedCardIndices.length === 1 && (
        <button onClick={placeCardOnDiscardPile}>Discard Selected Card</button>
      )}
  
      <Hand
        cards={hand}
        onSelectCard={handleSelectCard}
        selectedCardIndices={selectedCardIndices}
      />
    </div>
  );  
  };

export default GameBoard;





