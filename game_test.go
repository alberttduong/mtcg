package main

import (
	"testing"
	"fmt"
	"encoding/json"
)

func pprint(state GameState) {
	bytes, _ := json.MarshalIndent(state, "", " ")
	fmt.Printf("%s", bytes)
}

func TestGame(t *testing.T) {
	playerDecks := map[int]DeckMap{
		0: { "Gunner": 8 },
		1: { "Blaster": 4 },
	}

	// INIT DECKS
	state, err := newGameState(2).initDecks(playerDecks)
	if err != nil {
		t.Error(err)
	}
	if a := len(state.Players[0].Deck); a != 8 {
		t.Errorf("Wrong deck size: exp 8, ac %d", a)
	}
	if a := len(state.Players[1].Deck); a != 4 {
		t.Errorf("Wrong deck size: exp 4, ac %d", a)
	}

	state = state.drawCards()

	// PLAYER 0 PLAY FROM HAND, AND CHECK GSUPDATES
	state = state.startTurn()
	if len(state.Updates) == 0 {
		t.Error("Expected a gsupdate")
	}

	if state.Mana != 1 {
		t.Errorf("expected 1 mana, got %d", state.Mana)
	}
	if state.maxMana != 1 {
		t.Errorf("expected 1 maxmana, got %d", state.Mana)
	}

	state, err = state.playFromHand(0, Pos{0,0})
	if err != nil {
		t.Error(err)
	}

	if a := state.Players[0].Board[0][0].Name; a != "Gunner" {
		t.Errorf("Expected Gunner at 0,0, got %s", a)
	}

	// PLAYER 1 PLAY AND ATTACK
	state, _ = state.endTurn()
	state = state.startTurn()
	state, _ = state.playFromHand(0, Pos{0,0})
	state, _ = state.attack(Pos{0,0}, Pos{0,0}, 0)
	//fmt.Println(state.Updates)
	state, _ = state.endTurn()
	state = state.startTurn()

	if state.maxMana != 2 {
		t.Errorf("expected 2 maxmana, got %d", state.Mana)
	}

	if state.Mana != 2 {
		t.Errorf("expected 2 mana, got %d", state.Mana)
	}

	state.Players[1].lost = true
	println(state.getWinner())
}
