package main

import (
)

const (
	CASTLE_HEALTH = 10
	BOARD_COLS = 5
	BOARD_ROWS = 2
	DECK_SIZE = 30
	HAND_SIZE = 30
)


type DeckMap map[string]int

type Card struct {
	Hp int `json:"hp,omitempty"`
	Atk int `json:"atk,omitempty"`
	Cost int
}

// Deck: 30, ~7x Unique Cards (4 each)
// Goal: 35 Cards (7/35)
var Cards = map[string]Card {
	"Sand Castle": {Hp: 10}, // Sand Castle
	"Bubble Blower": {Hp: 2, Atk: 3}, // Fighters
	"Splashy": {Hp: 2, Atk: 3},
	"Gunner": {Hp: 1, Atk: 2},
	"Bucket Boy": {Hp: 2, Atk: 3},
	"Ballooner": {Hp: 2, Atk: 3},
	"Launcher": {Hp: 2, Atk: 3},
	"Blaster": {Hp: 2, Atk: 3},
	"Builder": {Hp: 2, Atk: 3},
	"Shoveller": {Hp: 2, Atk: 3},
	"Sculptor": {Hp: 2, Atk: 3}, // 1 cost
	"Shieldbearer": {Hp: 2, Atk: 3},
	"Catapulter": {Hp: 2, Atk: 3},
	"Cannoneer": {Hp: 2, Atk: 3},
	"Surfer": {Hp: 2, Atk: 3},
	"Balloon Pitcher": {Hp: 2, Atk: 3},
	"Castle Crusher": {Hp: 2, Atk: 3}, // 2 cost
	"Super Soaker": {Hp: 2, Atk: 3},
	"Super Squirter": {Hp: 2, Atk: 3},
	"Shark": {Hp: 2, Atk: 3}, // 3 cost
	"Sand Monster": {Hp: 2, Atk: 3},
	"Little Castle": {Hp: 2, Atk: 3}, // Sand
	"Sand Wall": {Hp: 2, Atk: 3},
	"Sculpture": {Hp: 2, Atk: 3},
	"Buried Friend": {Hp: 2, Atk: 3},
	"Battlements": {Hp: 2, Atk: 3},
	"Moat": {Hp: 2, Atk: 3},
	"Twisted Tower": {Hp: 2, Atk: 3},
	"Tank": {Hp: 2, Atk: 3},
	"Sandy Fortress": {Hp: 4},
}

type BoardCard struct {
	Name string `json:"name,omitempty"`
	Hp int `json:"hp,omitempty"`
	Atk int `json:"atk,omitempty"`
}

type Board [BOARD_ROWS][BOARD_COLS]BoardCard

type Player struct {
	Board Board `json:"board,omitempty"`
	CastleHealth int `json:"castleHealth,omitempty"`
	Deck []string `json:"deck,omitempty"`
	Hand []string `json:"hand,omitempty"`
	lost bool
}

type PlayerUpdate struct {
	Board *[BOARD_ROWS][BOARD_COLS]BoardCard `json:"board"`
}

type Animation struct {
	Name string `json:"name"`
	Player int `json:"player"`
	Pos1 []int `json:"pos1,omitempty"`
	Pos2 []int `json:"pos2,omitempty"`
}

func (anim Animation) IsZero() bool {
	return anim.Name == ""
}

type GameStateUpdate struct {
	Anim Animation `json:"anim,omitzero"`
	NewState StateUpdate `json:"newState,omitempty"`
}

type GameState struct {
	PlayerNumber int `json:"playerNumber"`
	Players []Player	 `json:"players"`
	Turn int `json:"turn"`
	NumPlayers int `json:"numPlayers"`
	Updates []GameStateUpdate
	Mana int `json:"mana"`
	maxMana int
}

// Flat version of Game State (no nested structs)
type StateUpdate struct {
	PlayerNumber *int `json:"playerNumber,omitempty"`
	Turn *int `json:"turn,omitempty"`
	Player0Hand *[]string `json:"player0hand,omitempty"`
	Player1Hand *[]string `json:"player1hand,omitempty"`
	Player0Board *Board `json:"player0board,omitempty"`
	Player1Board *Board `json:"player1board,omitempty"`
	Player0Deck *int `json:"player0deck,omitempty"`
	Player1Deck *int `json:"player1deck,omitempty"`
	NumPlayers *int `json:"numPlayers,omitempty"`
	Mana *int `json:"mana,omitempty"`
}

// Flattens entire nested object game state for React
func flatten(game GameState) StateUpdate {
	p0 := game.Players[0]
	p1 := game.Players[1]
	p0d := len(p0.Deck)
	p1d := len(p1.Deck)
	return StateUpdate{
		Player0Hand: &game.Players[0].Hand,
		Player1Hand: &game.Players[1].Hand,
		Player0Board: &game.Players[0].Board,
		Player1Board: &game.Players[1].Board,
		Player0Deck: &p0d,
		Player1Deck: &p1d,
		Turn: &game.Turn,
		NumPlayers: &game.NumPlayers,
		Mana: &game.Mana,
	}
}

func newPlayer() Player {
	p := Player{
		Board: Board{},
		CastleHealth: CASTLE_HEALTH,
		Deck: make([]string, 0, DECK_SIZE),
		Hand: make([]string, 0, HAND_SIZE),
	}
	p.Board[1][2] = newBoardCard("Sand Castle")
	return p
}

type Pos struct {
	Row int
	Col int
}

func remove(slice []string, s int) []string{
    return append(slice[:s], slice[s+1:]...)
}

func newBoardCard(name string) BoardCard {
	c := Cards[name]
	return BoardCard{
		Name: name,
		Hp: c.Hp,
		Atk: c.Atk,
	}
}



func newGameState(numPlayers int) GameState {
	state := GameState{
		Players: make([]Player, numPlayers),
		NumPlayers: numPlayers,
		Updates: []GameStateUpdate{},
		Turn: 0,
	}
	for i := range state.Players {
		state.Players[i] = newPlayer()
	}
	return state
}

func (state GameState) clearUpdates() (GameState, []GameStateUpdate) {
	updates := state.Updates
	state.Updates = []GameStateUpdate{}
	return state, updates
}

// Precondition: decks are valid
func (state GameState) initDecks(playerDecks map[int]DeckMap) (newState GameState, err error) {
	for p, deck := range playerDecks {
		if p < 0 || p >= state.NumPlayers {
			return newState, Err{"Player # out of range"}
		}

		for card, amount:= range deck {
			for range amount {
				state.Players[p].Deck = append(state.Players[p].Deck, card)
			}
		}
	}
	return state, nil
}

func (u StateUpdate) updateDeck(state GameState, player int) StateUpdate {
	length := len(state.Players[player].Deck)
	switch player {
	case 0:
		u.Player0Deck = &length
	case 1:
		u.Player1Deck = &length
	default:
		panic("")
	}
	return u
}

func (state GameState) draw(player int) (GameState, error) {
	deck := state.Players[player].Deck;
	if len(deck) == 0 {
		return state, Err{"No more cards in deck"}	
	}
	hand := state.Players[player].Hand
	hand = append(hand, deck[len(deck)-1])
	state.Players[player].Deck = deck[:len(deck)-1]
	state.Players[player].Hand = hand
	state.update(GameStateUpdate{
		NewState: SU().updateDeck(state, player),
	})
	return state, nil
}

func (state GameState) drawCards() GameState {
	for i := range state.Players {
		for range 7 {
			var err error
			state, err = state.draw(i)
			if err != nil {
				break
			}
		}
	}
	return state
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

// Precondition: player is valid
func (u StateUpdate) updateHand(state GameState, player int) StateUpdate {
	newHand := []string{}
	for _, card := range state.Players[player].Hand {
		newHand = append(newHand, card)
	}

	switch player {
	case 0:
		u.Player0Hand = &newHand
	case 1:
		u.Player1Hand = &newHand
	default:
		panic("No player")
	}
	return u
}

func (u StateUpdate) updateBoard(state GameState, player int) StateUpdate {
	newb := Board{}

	for i, row := range state.Players[player].Board {
		for j, card := range row {
			newb[i][j] = card
		}
	}

	switch player {
	case 0:
		u.Player0Board = &newb
	case 1:
		u.Player1Board = &newb
	default:
		panic("No player")
	}
	return u
}

func (state GameState) startTurn() GameState {
	var err error
	if state.Turn % state.NumPlayers == 0 {
		state.maxMana += 1
	}
	state.Mana = state.maxMana

	state, err = state.draw(state.Turn)
	if err == nil {
		state.Updates = append(state.Updates, GameStateUpdate{
			Anim: Animation{
				Name: "draw",
				Player: state.Turn,
			},
			NewState: SU().updateHand(state, state.Turn),
		}) 
	}

	state.update(GameStateUpdate{
		Anim: Animation{ Name: "gain mana"},
		NewState: SU().updateMana(state)}) 

	return state
}

func (state *GameState) update(u GameStateUpdate) {
	state.Updates = append(state.Updates, u)
}

func validPos(pos Pos, board Board) error {
	if pos.Col < 0 || pos.Col >= BOARD_COLS {
		return Err{"Col out of bounds"}
	}
	if pos.Row < 0 || pos.Row >= BOARD_ROWS {
		return Err{"Row out of bounds"}
	}
	return nil 
}

func SU() StateUpdate {
	return StateUpdate{}
}

func (state GameState) playFromHand(index int, pos Pos) (GameState, error) {
	player := state.Players[state.Turn]
	if index < 0 || index >= len(player.Hand) {
		return state, Err{"Index out of bounds"}
	}
	err := validPos(pos, player.Board)
	if err != nil {
		return state, err
	}

	state.Players[state.Turn].Board[pos.Row][pos.Col] = newBoardCard(player.Hand[index])

	state.Players[state.Turn].Hand = remove(player.Hand, index)

	ns := SU().updateHand(state, state.Turn).updateBoard(state, state.Turn)
	state.update(GameStateUpdate{
		Anim: Animation{Name: "hand to board"},	
		NewState: ns,
	})

	return state, nil
}

// doesnt check case where all players have lost somehow
func (state GameState) getWinner() int {
	playersIn := 0
	winner := -1
	
	for p, player := range state.Players {
		if !player.lost {
			playersIn += 1
			if playersIn > 1 {
				return -1
			}
			winner = p
		}
	}

	return winner
}

func (state GameState) attack(atkr Pos, dfr Pos, player int) (GameState, error) {
	// todo error check
	attacker := state.Players[state.Turn].Board[atkr.Row][atkr.Col]
	defender := &(state.Players[player].Board[dfr.Row][dfr.Col])

	defender.Hp -= attacker.Atk
	if (defender.Hp <= 0) {
		defender.Hp = 0
	}

	state.update(GameStateUpdate{
		Animation{
			Name: "attack",
			Pos1: []int{atkr.Row, atkr.Col, state.Turn},
			Pos2: []int{dfr.Row, dfr.Col, player},
		},
		SU().updateBoard(state, player),
	})

	if (defender.Hp == 0) {
		if defender.Name == "Sand Castle" {
			state.Players[player].lost = true
		}

		*defender = BoardCard{}

		state.update(GameStateUpdate{
			Animation{
				Name: "death",
				Pos1: []int{dfr.Row, dfr.Col, player},
			},
			SU().updateBoard(state, player),
		})
	}

	if winner := state.getWinner(); winner != -1 {
		state.update(GameStateUpdate{
			Animation{
				Name: "win",
				Player: winner,
			},
			SU(),
		})

	}

	return state, nil
}

func (state GameState) endTurn() (GameState, error) {
	state.Turn = (state.Turn + 1) % state.NumPlayers
	state.update(GameStateUpdate{NewState: SU().updateTurn(state.Turn)})
	return state, nil
}
