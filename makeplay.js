socket.on('makePlay', ({ handCards, discardIndex }) => {
    const player = gameState.players.find(p => p.id === socket.id);
    console.log(`Player ${socket.id} attempting to make a play with hand cards:`, handCards, `and discard pile index: ${discardIndex}`);

    if (!player || !gameState.gameStarted) {
        console.log(`Play attempt failed: Game not started or player not found for socket ID ${socket.id}`);
        socket.emit('actionError', 'Cannot make a play at this time.');
        return;
    }

    // Include the selected discard pile card if applicable
    let cardsToValidate = [...handCards];
    if (typeof discardIndex === 'number') {
        const discardPileCard = gameState.discardPile[discardIndex];
        cardsToValidate.push(discardPileCard);
    }

    if (!isValidPlay(cardsToValidate)) {
        console.log(`Play attempt failed: Invalid play by player ${socket.id}`);
        socket.emit('playError', 'Invalid play');
        return;
    }

    // Process the valid play
    const successfullyPlayedCards = handCards.filter(card => {
        const index = player.hand.findIndex(c => c.value === card.value && c.suit === card.suit);
        return index !== -1;
    });

    // If a discard pile card was used, remove it from the pile
    if (typeof discardIndex === 'number') {
        gameState.discardPile.splice(discardIndex, 1);
        successfullyPlayedCards.push(cardsToValidate.pop()); // Add the discard pile card to successfully played cards
    }

    console.log(`Successfully played cards for player ${socket.id}:`, successfullyPlayedCards);

    if (successfullyPlayedCards.length > 0) {
        gameState.playerTables[socket.id] = gameState.playerTables[socket.id] || [];
        gameState.playerTables[socket.id].push(...successfullyPlayedCards);
        io.emit('updatePlayerTables', gameState.playerTables);
        console.log(`Updated play table for player ${socket.id}:`, gameState.playerTables[socket.id]);

        io.to(socket.id).emit('updateHand', player.hand); // Update the player with their new hand
        io.emit('updateDiscardPile', gameState.discardPile); // Update all clients with the new discard pile
        io.to(socket.id).emit('updatePlayerTable', gameState.playerTables[socket.id]); // Update the player with their play table
        io.emit('updateGameState', gameState); // Notify all clients with the updated game state
        console.log(`Game state updated after player ${socket.id}'s play`);
    } else {
        console.log(`Play attempt failed: No valid cards were played by player ${socket.id}`);
        socket.emit('playError', 'No valid cards were played');
    }
});
