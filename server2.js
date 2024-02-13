const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 4000;
const MAX_PLAYERS = 4; 
const MIN_PLAYERS_REQUIRED = 1;

let gameState = {
  players: [],
  deck: [],
  gameStarted: false,
  discardPile: [],
  playerTables: {},
};

// Function definitions (e.g., generateDeck, shuffle, dealCardsToPlayers, initializeGame) go here
function generateDeck(includeJokers = true) {
  const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];
  let deck = [];

  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ value, suit });
    });
  });

  if (includeJokers) {
    // Adding three Jokers with unique identifiers for differentiation
    deck.push({ value: 'Joker', suit: 'None', identifier: 'Joker1' });
    deck.push({ value: 'Joker', suit: 'None', identifier: 'Joker2' });
    deck.push({ value: 'Joker', suit: 'None', identifier: 'Joker3' });
  }

  // Shuffle the deck before returning
  return shuffle(deck);
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap
  }
  return deck;
}
function dealCardsToPlayers() {
  const CARDS_PER_PLAYER = 7; // Adjust based on your game rules

  gameState.players.forEach(player => {
    player.hand = gameState.deck.splice(0, CARDS_PER_PLAYER); // Deal 7 cards to each player
    io.to(player.id).emit('updateHand', player.hand); // Notify each player of their new hand
  });

  // If needed, also handle the scenario where cards are placed on the table at the start
  // For example, flipping the first card of the remaining deck to start the discard pile
  if (gameState.deck.length > 0) {
    gameState.discardPile.push(gameState.deck.shift());
    io.emit('updateDiscardPile', gameState.discardPile); // Update all clients with the new discard pile state
  }
}

function validateContinuationPlay(card, playerTables) {
  for (const playerId in playerTables) {
    const plays = playerTables[playerId];
    for (const existingPlay of plays) {
      // Ensure existingPlay is treated as an array
      if (Array.isArray(existingPlay) && canExtendPlay(card, existingPlay)) {
        return true;
      }
    }
  }
  return false;
}

function canExtendPlay(card, existingPlay) {
  // Assuming existingPlay is an array of cards
  const extendedPlay = [...existingPlay, card];
  return isValidPlay(extendedPlay);
}


// Helper function to check if the cards form a valid three of a kind
function isThreeOfAKind(cards) {
  if (cards.length !== 3) return false;
  const firstCardValue = cards[0].value;
  return cards.every(card => card.value === firstCardValue);
}

// Helper function to check if the cards form a valid four of a kind
function isFourOfAKind(cards) {
  if (cards.length !== 4) return false;
  const firstCardValue = cards[0].value;
  return cards.every(card => card.value === firstCardValue);
}

// Helper function to check if the cards form a valid straight flush
function isStraightFlush(cards) {
  if (cards.length !== 4) return false;
  const suits = new Set(cards.map(card => card.suit));
  if (suits.size > 1) return false; // All cards must be of the same suit

  const values = cards.map(card => {
    if (card.value === 'Ace') return 14;
    if (card.value === 'King') return 13;
    if (card.value === 'Queen') return 12;
    if (card.value === 'Jack') return 11;
    return parseInt(card.value);
  }).sort((a, b) => a - b);

  for (let i = 0; i < values.length - 1; i++) {
    if (values[i + 1] - values[i] !== 1) return false;
  }

  return true;
}

// Assuming isValidPlay checks for either three of a kind, straight flush, or four of a kind
function isValidPlay(cards) {
  return isThreeOfAKind(cards) || isStraightFlush(cards) || isFourOfAKind(cards);
}


function reshuffleDiscardIntoDeck() {
  if (gameState.discardPile.length > 1) {
      // Keep the last card in the discard pile to start the new discard pile
      const cardToKeep = gameState.discardPile.pop();
      
      // Reshuffle the remaining discard pile into the deck
      gameState.deck = shuffle([...gameState.discardPile]);
      
      // Reset the discard pile with the last card
      gameState.discardPile = [cardToKeep];
      
      // Notify all clients about the new discard pile and deck reset
      io.emit('updateDiscardPile', gameState.discardPile);
      console.log('Deck was empty. Reshuffled discard pile into deck.');
  } else {
      console.log('Cannot reshuffle: Not enough cards in discard pile.');
  }
}

// Keep the generateDeck and shuffle functions here



io.on('connection', (socket) => {
  console.log(`New player connected: ${socket.id}`);

  socket.on('joinGame', (data) => {
    const playerName = typeof data === 'object' ? data.name : data; // Safeguard for both object and string

    if (!playerName || gameState.gameStarted) {
      socket.emit('joinError', 'Unable to join: Game has already started or name missing.');
      return;
    }

    const player = { id: socket.id, name: playerName, hand: [] };
    gameState.players.push(player);
    console.log(`${playerName} joined the game`);
    // Optionally, send updated gameState to all players
    io.emit('updateGameState', gameState);

    // Confirm joining to the player
    socket.emit('joinSuccess', { playerName });
  });

  socket.on('startGame', () => {
    if (!gameState.gameStarted && gameState.players.length >= MIN_PLAYERS_REQUIRED) {
      gameState.gameStarted = true;
      gameState.deck = generateDeck();
      dealCardsToPlayers();
      io.emit('gameStarted', gameState);
      console.log('Game started');
    } else {
      console.log('Not enough players to start the game');
      socket.emit('startGameError', 'Not enough players');
    }
  });

  socket.on('drawCard', () => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !gameState.gameStarted) {
        socket.emit('actionError', 'Cannot draw card at this time.');
        return;
    }

    // Check if the deck is empty before drawing
    if (gameState.deck.length === 0) {
        reshuffleDiscardIntoDeck();
    }

    // Check again in case reshuffle was not possible (should not happen if discard pile handling is correct)
    if (gameState.deck.length > 0) {
        const drawnCard = gameState.deck.shift();
        player.hand.push(drawnCard);
        io.to(socket.id).emit('updateHand', player.hand);
    } else {
        socket.emit('actionError', 'Deck is empty and cannot be reshuffled.');
    }
});

 
  socket.on('placeCardOnDiscardPile', (card) => {
    const player = gameState.players.find(p => p.id === socket.id);
    if (!player || !gameState.gameStarted) {
      socket.emit('actionError', 'Cannot discard cards at this time.');
      return;
    }
  
    const index = player.hand.findIndex(c => c.value === card.value && c.suit === card.suit);
    if (index === -1) {
      socket.emit('actionError', 'Card not in hand');
      return;
    }
  
    // Discard the card and notify all clients
    gameState.discardPile.push(player.hand.splice(index, 1)[0]);
    io.emit('updateDiscardPile', gameState.discardPile); // Notify all clients about the updated discard pile
    io.to(socket.id).emit('updateHand', player.hand); // Update the player with their new hand
  });
  
  
  
  socket.on('makePlay', ({ handCards, discardIndices = [] }) => {
    const player = gameState.players.find(p => p.id === socket.id);
    console.log(`Player ${socket.id} attempting to make a play with hand cards:`, handCards, `and discard pile indices:`, discardIndices);

    if (!player || !gameState.gameStarted) {
        console.log(`Play attempt failed: Game not started or player not found for socket ID ${socket.id}`);
        socket.emit('actionError', 'Cannot make a play at this time.');
        return;
    }

    // Start with the selected hand cards
    let cardsToValidate = [...handCards];

    // Prepare to add selected discard pile cards to validation set
    let cardsToAddFromDiscard = [];
    if (discardIndices.length > 0) {
        discardIndices.forEach(index => {
            if (index >= 0 && index < gameState.discardPile.length) {
                cardsToAddFromDiscard.push(gameState.discardPile[index]);
            }
        });
    }

    // Determine the range of cards to move from discard pile to player's hand
    const minDiscardIndex = Math.min(...discardIndices);
    if (minDiscardIndex >= 0) {
        const cardsToMove = gameState.discardPile.splice(minDiscardIndex);
        player.hand.push(...cardsToMove); // Add all taken cards to the player's hand
        // Filter out only the selected cards for play validation
        cardsToValidate.push(...cardsToAddFromDiscard);
    }

    if (!isValidPlay(cardsToValidate)) {
        console.log(`Play attempt failed: Invalid play by player ${socket.id}`);
        socket.emit('playError', 'Invalid play');
        return;
    }

    // Successfully played cards include hand cards and the selected discard pile cards
    const successfullyPlayedCards = [...handCards, ...cardsToAddFromDiscard];

    console.log(`Successfully played cards for player ${socket.id}:`, successfullyPlayedCards);

    if (successfullyPlayedCards.length > 0) {
        gameState.playerTables[socket.id] = gameState.playerTables[socket.id] || [];
        gameState.playerTables[socket.id].push(...successfullyPlayedCards);

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



  

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    // Disconnect logic
  });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Any initial setup if needed
});