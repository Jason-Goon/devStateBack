socket.on('makePlay', ({ handCards, discardIndex }) => {
    const player = gameState.players.find(p => p.id === socket.id);
    console.log(`Player ${socket.id} attempting to make a play with hand cards:`, handCards, `and discard pile index: ${discardIndex}`);

    if (!player || !gameState.gameStarted) {
        console.log(`Play attempt failed: Game not started or player not found for socket ID ${socket.id}`);
        socket.emit('actionError', 'Cannot make a play at this time.');
        return;
    }

    // Prepare an array to collect cards for validation
    let cardsToValidate = [...handCards];
    if (typeof discardIndex === 'number' && discardIndex >= 0) {
        const discardPileCard = gameState.discardPile[discardIndex];
        cardsToValidate.push(discardPileCard);
    }

    if (!isValidPlay(cardsToValidate)) {
        console.log(`Play attempt failed: Invalid play by player ${socket.id}`);
        socket.emit('playError', 'Invalid play');
        return;
    }

    // Filter valid hand cards for play
    const successfullyPlayedCards = handCards.filter(card => {
        const index = player.hand.findIndex(c => c.value === card.value && c.suit === card.suit);
        return index !== -1;
    });

    // If a discard pile card was used, adjust the discard pile and player's hand accordingly
    if (typeof discardIndex === 'number' && discardIndex >= 0) {
        // Take all cards from the selected index upwards
        const cardsToTake = gameState.discardPile.splice(discardIndex);

        // Add the taken cards to the player's hand, excluding the first one (played card)
        player.hand = player.hand.concat(cardsToTake.slice(1));

        // Add only the played card to the play table
        successfullyPlayedCards.push(cardsToTake[0]);
    }

    console.log(`Successfully played cards for player ${socket.id}:`, successfullyPlayedCards);

    if (successfullyPlayedCards.length > 0) {
        // Update the player's table with the successfully played card(s)
        gameState.playerTables[socket.id] = gameState.playerTables[socket.id] || [];
        gameState.playerTables[socket.id].push(...successfullyPlayedCards);

        // Notify updates
        io.emit('updatePlayerTables', gameState.playerTables);
        io.to(socket.id).emit('updateHand', player.hand);
        io.emit('updateDiscardPile', gameState.discardPile);
        io.to(socket.id).emit('updatePlayerTable', gameState.playerTables[socket.id]);
        io.emit('updateGameState', gameState);
        console.log(`Game state updated after player ${socket.id}'s play`);
    } else {
        console.log(`Play attempt failed: No valid cards were played by player ${socket.id}`);
        socket.emit('playError', 'No valid cards were played');
    }
});
