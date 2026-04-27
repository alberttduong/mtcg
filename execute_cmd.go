package main

import (
	"github.com/alberttduong/gameserver"
	"database/sql"
	"fmt"
	"log"
)

// Should be in the gameserver package todo
type Executor struct {
	client *gameserver.Client
	db *sql.DB
}

type ExecMsg func (Executor, gameserver.Msg) gameserver.Msg
var mapping = map[string]ExecMsg{
	"set deck": Executor.execSetDeck,
	"start game": Executor.execStartGame,
	"end turn": Executor.execEndTurn,
	"play hand": Executor.execPlayHand,
	"attack": Executor.execAttack,
}

func (e Executor) executeCommand(msg gameserver.Msg) gameserver.Msg {
	execfunc, ok := mapping[msg.Msg]
	if !ok {
		return msg.ErrS("Invalid command")
	}

	return execfunc(e, msg)
}

func (e Executor) execSetDeck(msg gameserver.Msg) gameserver.Msg {
	if e.client.Lobby == nil {
		return msg.ErrS("Need to be in lobby to select your deck")
	}

	deckName := "deck1"
	err := gameserver.CheckBody(msg, "name", &deckName)

	var deckString string
	if deckName == "local" {
		err := gameserver.CheckBody(msg, "deck", &deckString)
		if err != nil {
			return msg.Err(err)
		}
	} else {
		// only deck 1

		var token string
		err := gameserver.CheckBody(msg, "token", &token)
		if err != nil {
			return msg.Err(err)
		}

		// set to the authenticated user's deck, from db
		username, err := verifyToken(token)
		if err != nil {
			return msg.ErrS("Must logged in to choose deck")
		}

		deckString, err = getDeckString(e.db, username)
		if err != nil {
			return msg.Err(err)
		}
	}

	deckMap, err := validateDeckString(deckString)
	if err != nil {
		return msg.Err(err)
	}

	e.client.Lobby.UpdatePrivateState(e.client, "deck", deckMap)

	e.client.Lobby.Broadcast(gameserver.Msg{
		StatusCode: 0,
		Msg: "player ready",
		Body: map[string]interface{}{
			"name": e.client.Name,
			"ready": true,
		},
	})

	gameserver.SendToClient(gameserver.Msg{
		StatusCode: 200,
		Msg: "set deck",
		Body: map[string]interface{}{
			"deck": deckString,
		}}, e.client)

	return msg.Success()
}

func (e Executor) execStartGame(msg gameserver.Msg) gameserver.Msg {
	lobby := e.client.Lobby
	if lobby == nil {
		return msg.ErrS("Need to be in lobby to start game")
	}

	if !lobby.IsLeader(e.client) {
		return msg.ErrS("Must be leader to start game")
	}
	started, ok := lobby.GetState("started")
	if ok && started.(bool) {
		return msg.ErrS("Game already started")
	}

	if lobby.NumMembers() > MAX_PLAYERS {
		return msg.ErrS(fmt.Sprintf("No more than %d players can play", MAX_PLAYERS))
	}
	
	lobby.AssignPlayers()
	np, ok := lobby.GetState("numPlayers")
	if !ok {
		return msg.ErrS("server error, expected numPlayers")
	}
	numPlayers := np.(int)

	playerDecks := []DeckMap{}

	for i := range numPlayers {
		p, ok := lobby.State[fmt.Sprintf("player%d", i+1)]
		if !ok {
			return msg.ErrS("Not all players ready")
		}
		c, ok := p.(*gameserver.Client)
		if !ok {
			return msg.ErrS("Server error: couldnt get client from state")
		}
		log.Printf("getting player %d deck ready %v", i+1, c)
		d, ok := lobby.GetPrivateState(c, "deck")
		if !ok {
			return msg.ErrS("Everyone must select their decks to start the game")
		}

		deck, ok := d.(DeckMap)
		if !ok {
			return msg.ErrS("Server error: couldnt convert deck from state")
		}
		playerDecks = append(playerDecks, deck)
	}

	newGame, _ := newGameState(numPlayers).initDecks(playerDecks)
	newGame, _ = newGame.drawCards().startTurn().clearUpdates()

	broadcastStartGame(lobby, newGame)
	
	lobby.UpdateState("game", newGame)
	lobby.UpdateState("started", true)

	return msg.Success()
}

func (e Executor) execEndTurn(msg gameserver.Msg) gameserver.Msg {
	if e.client.Lobby == nil {
		return msg.ErrS("Need to be in lobby to end your turn") // todo check these
	}

	s, _ := e.client.Lobby.GetState("game")
	game, _ := s.(GameState)

	ok := verifyTurn(&msg, game, e.client)
	if !ok {
		return msg.ErrS("Not your turn")
	}

	game, _ = game.endTurn() //1
	game = game.startTurn() //1
	game, updates := game.clearUpdates()

	e.client.Lobby.UpdateState("game", game)

	startBroadcast := msg
	startBroadcast.Msg = "update game"
	startBroadcast.StatusCode = 0
	startBroadcast.Body["updates"] = updates 
	
	e.client.Lobby.Broadcast(startBroadcast)

	return msg.Success()
}


func (e Executor) execPlayHand(msg gameserver.Msg) gameserver.Msg {
	var index, r, c int
	err := gameserver.CheckNumber(msg, "index", &index)
	err = gameserver.CheckNumber(msg, "r", &r)
	err = gameserver.CheckNumber(msg, "c", &c)
	if err != nil {
		return msg.Err(err)
	}

	s, _ := e.client.Lobby.GetState("game")
	game, _ := s.(GameState)

	ok := verifyTurn(&msg, game, e.client)
	if !ok {
		return msg
	}

	game, err = game.playFromHand(index, Pos{Row: r, Col: c})
	if err != nil {
		return msg.Err(err)
	}
	
	game, updates := game.clearUpdates()
	e.client.Lobby.UpdateState("game", game)

	updateMsg := msg
	updateMsg.Msg = "update game"
	updateMsg.StatusCode = 0
	updateMsg.Body["updates"] = updates 
	
	e.client.Lobby.Broadcast(updateMsg)

	return msg.Success()
}

func (e Executor) execAttack(msg gameserver.Msg) gameserver.Msg {
	var atkRow, atkCol, defRow, defCol, defPlayer int

	type Param struct {
		key string
		dest *int
	}

	params := []Param{
		{"atkRow", &atkRow},
		{"atkCol", &atkCol}, 
		{"defRow", &defRow}, 
		{"defCol", &defCol}, 
		{"defPlayer", &defPlayer},
	}

	for _, p := range params {
		err := gameserver.CheckNumber(msg, p.key, p.dest)
		if err != nil {
			return msg.Err(err)
		}
	}
	
	s, ok := e.client.Lobby.GetState("game")
	if !ok {
		return msg.ErrS("Server Error: no game state in client")
	}
	game := s.(GameState)

	ok = verifyTurn(&msg, game, e.client)
	if !ok {
		return msg
	}


	game, err := game.attack(Pos{atkRow, atkCol}, 
		Pos{defRow, defCol}, defPlayer)
	if err != nil {
		return msg.Err(err)
	}

	game, updates := game.clearUpdates()
	e.client.Lobby.UpdateState("game", game)

	updateMsg := msg
	updateMsg.Msg = "update game"
	updateMsg.StatusCode = 0
	updateMsg.Body["updates"] = updates 
	
	e.client.Lobby.Broadcast(updateMsg)
	return msg.Success()
}
