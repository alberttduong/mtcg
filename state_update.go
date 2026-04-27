package main

import "log"

// Flat version of Game State (no nested structs)
type StateUpdate struct {
	PlayerNumber *int `json:"playerNumber,omitempty"`
	Turn *int `json:"turn,omitempty"`

	Player0Hand *[]string `json:"player0hand,omitempty"`
	Player0Board *Board `json:"player0board,omitempty"`
	Player0Deck *int `json:"player0deck,omitempty"`

	Player1Hand *[]string `json:"player1hand,omitempty"`
	Player1Board *Board `json:"player1board,omitempty"`
	Player1Deck *int `json:"player1deck,omitempty"`

	Player2Hand *[]string `json:"player2hand,omitempty"`
	Player2Board *Board `json:"player2board,omitempty"`
	Player2Deck *int `json:"player2deck,omitempty"`

	Player3Hand *[]string `json:"player3hand,omitempty"`
	Player3Board *Board `json:"player3board,omitempty"`
	Player3Deck *int `json:"player3deck,omitempty"`

	Player4Hand *[]string `json:"player4hand,omitempty"`
	Player4Board *Board `json:"player4board,omitempty"`
	Player4Deck *int `json:"player4deck,omitempty"`

	NumPlayers *int `json:"numPlayers,omitempty"`
	Mana *int `json:"mana,omitempty"`
	MaxMana *int `json:"maxMana,omitempty"`
}

func flattenPlayer(game GameState, player int) (
	hand *[]string, board *Board, deck *int) {
	if player >= game.NumPlayers {
		return hand, board, deck
	}
	p := game.Players[player]
	length := len(p.Deck)
	return &p.Hand, &p.Board, &length

}

// Flattens entire nested object game state for React
func flatten(game GameState) StateUpdate {
	p0 := game.Players[0]
	p0d := len(p0.Deck)
	var p1h, p2h, p3h, p4h *[]string
	var p1b, p2b, p3b, p4b *Board
	var p1d, p2d, p3d, p4d *int	

	p1h, p1b, p1d = flattenPlayer(game, 1)
	p2h, p2b, p2d = flattenPlayer(game, 2)
	p3h, p3b, p3d = flattenPlayer(game, 3)
	p4h, p4b, p4d = flattenPlayer(game, 4)

	return StateUpdate{
		Player0Hand: &p0.Hand,
		Player0Board: &p0.Board,
		Player0Deck: &p0d,

		Player1Hand: p1h,
		Player1Board: p1b,
		Player1Deck: p1d,

		Player2Hand: p2h,
		Player2Board: p2b,
		Player2Deck: p2d,

		Player3Hand: p3h,
		Player3Board: p3b,
		Player3Deck: p3d,

		Player4Hand: p4h,
		Player4Board: p4b,
		Player4Deck: p4d,

		Turn: &game.Turn,
		NumPlayers: &game.NumPlayers,
		Mana: &game.Mana,
		MaxMana: &game.MaxMana,
	}
}

type playerUpdate struct {
	hand *[]string
	board *Board
	deck *int	
}

func (u StateUpdate) updatePlayer(player int, update playerUpdate) StateUpdate {
	var hand **[]string
	var board **Board
	var deck **int

	switch player {
	case 0:
		hand = &u.Player0Hand
		board = &u.Player0Board
		deck = &u.Player0Deck
	case 1:
		hand = &u.Player1Hand
		board = &u.Player1Board
		deck = &u.Player1Deck
	case 2:
		hand = &u.Player2Hand
		board = &u.Player2Board
		deck = &u.Player2Deck
	case 3:
		hand = &u.Player3Hand
		board = &u.Player3Board
		deck = &u.Player3Deck
	case 4:
		hand = &u.Player4Hand
		board = &u.Player4Board
		deck = &u.Player4Deck
	default:
		log.Fatalf("ERROR: tried to update player %d", player)
	}

	if update.hand != nil {
		*hand = update.hand
	}
	if update.board != nil {
		*board = update.board
	}
	if update.deck != nil {
		*deck = update.deck
	}

	return u
}

// Precondition: player is valid
func (u StateUpdate) updateHand(state GameState, player int) StateUpdate {
	newHand := []string{}
	for _, card := range state.Players[player].Hand {
		newHand = append(newHand, card)
	}

	return u.updatePlayer(player, playerUpdate{hand: &newHand})
}

func (u StateUpdate) updateDeck(state GameState, player int) StateUpdate {
	length := len(state.Players[player].Deck)
	return u.updatePlayer(player, playerUpdate{deck: &length})
}

func (u StateUpdate) updateBoard(state GameState, player int) StateUpdate {
	newb := Board{}
	for i, row := range state.Players[player].Board {
		for j, card := range row {
			newb[i][j] = card
		}
	}
	
	return u.updatePlayer(player, playerUpdate{board: &newb})
}

func (u StateUpdate) updateMana(state GameState) StateUpdate {
	mana := state.Mana
	u.Mana = &mana
	return u
}

func (u StateUpdate) updateTurn(turn int) StateUpdate {
	u.Turn = &turn
	return u
}
