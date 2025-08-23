package main

const (
	CASTLE_HEALTH = 10
	BOARD_COLS = 5
	BOARD_ROWS = 2
	DECK_SIZE = 30
	HAND_SIZE= 30
)

type DeckMap map[string]int

type Card struct {
	Hp int `json:"hp,omitempty"`
	Atk int `json:"atk,omitempty"`
}

var Cards = map[string]Card {
	"Gunner": {Hp: 1, Atk: 2},
	"Blaster": {Hp: 2, Atk: 3},
	"Sandy Fortress": {Hp: 4},
}

type BoardCard struct {
	Name string `json:"name,omitempty"`
	Hp int `json:"hp,omitempty"`
	Atk int `json:"atk,omitempty"`
}
type Board [BOARD_ROWS][BOARD_COLS]BoardCard

type Player struct {
	Board [BOARD_ROWS][BOARD_COLS]BoardCard `json:"board,omitempty"`
	CastleHealth int `json:"castleHealth,omitempty"`
	Deck []string `json:"deck,omitempty"`
	Hand []string `json:"hand,omitempty"`
}

type PlayerUpdate struct {
	Board *[BOARD_ROWS][BOARD_COLS]BoardCard `json:"board"`
}

type Animation struct {
	Name string `json:"name"`
	Player int `json:"player"`
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
}

// Flat
type StateUpdate struct {
	PlayerNumber *int `json:"playerNumber,omitempty"`
	Turn *int `json:"turn,omitempty"`
	Player0Hand *[]string `json:"player0hand,omitempty"`
	Player1Hand *[]string `json:"player1hand,omitempty"`
	NumPlayers *int `json:"numPlayers,omitempty"`
}

// Flattens entire nested object game state for React
func flatten(game GameState) StateUpdate {
	return StateUpdate{
		Player0Hand: &game.Players[0].Hand,
		Player1Hand: &game.Players[1].Hand,
		Turn: &game.Turn,
		NumPlayers: &game.NumPlayers,
	}
}

func newPlayer() Player {
	return Player{
		Board: [2][5]BoardCard{},
		CastleHealth: CASTLE_HEALTH,
		Deck: make([]string, 0, DECK_SIZE),
		Hand: make([]string, 0, HAND_SIZE),
	}
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

func (state GameState) draw(player int) (GameState, error) {
	deck := state.Players[player].Deck;
	if len(deck) == 0 {
		return state, Err{"No more cards in deck"}	
	}
	hand := state.Players[player].Hand
	hand = append(hand, deck[len(deck)-1])
	state.Players[player].Deck = deck[:len(deck)-1]
	state.Players[player].Hand = hand
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

// Precondition: player is valid
func updateHand(state GameState, player int) StateUpdate {
	u := StateUpdate{}
	newHand := &state.Players[player].Hand
	switch player {
	case 0:
		u.Player0Hand = newHand
	case 1:
		u.Player1Hand = newHand
	default:
		panic("No player")
	}
	return u
}

func (state GameState) startTurn() GameState {
	var err error
	state, err = state.draw(state.Turn)
	if err == nil {
		state.Updates = append(state.Updates, GameStateUpdate{
			Anim: Animation{
				Name: "draw",
				Player: state.Turn,
			},
			NewState: updateHand(state, state.Turn),
		}) 
	}
	return state
}

func (state GameState) playFromHand(index int, pos Pos) (GameState, error) {
	player := state.Players[state.Turn]
	if index < 0 || index >= len(player.Hand) {
		return state, Err{"Index out of bounds"}
	}
	// todo check pos
	state.Players[state.Turn].Board[pos.Row][pos.Col] = newBoardCard(player.Hand[index])
	state.Players[state.Turn].Hand = remove(player.Hand, index)
	return state, nil
}

func (state GameState) attack(atkr Pos, dfr Pos, player int) (GameState, error) {
	// todo error check
	attacker := state.Players[state.Turn].Board[atkr.Row][atkr.Col]
	state.Players[player].Board[dfr.Row][dfr.Col].Hp -= attacker.Atk
	return state, nil
}

func (state GameState) endTurn() (GameState, error) {
	state.Turn = (state.Turn + 1) % state.NumPlayers
	state.Updates = append(state.Updates, GameStateUpdate{
		NewState: StateUpdate{Turn: &state.Turn},
	})
	return state, nil
}
