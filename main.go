package main

import (
	"fmt"
	"net/http"
	"log"
	
	"github.com/gorilla/websocket"
	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"gserver"
	"io"
	"encoding/json"

	"database/sql"
	_ "github.com/mattn/go-sqlite3"	
)

func serveHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		log.Println(r.URL)
		return
	}
	//w.WriteHeader(200)
	io.WriteString(w, `{"alive": true}`)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool { return true },
}

func statePerPlayer(player int, master StateUpdate, lobby *gserver.Lobby) StateUpdate {
	// todo remove player 0
	master.PlayerNumber = &player

	return master 
}

func broadcastStartGame(lobby *gserver.Lobby, master GameState) {
	msg := gserver.Msg{
		StatusCode: 0,
		Msg: "start game",
		Body: make(map[string]interface{}),
	}

	np, ok := lobby.GetState("numPlayers")
	if !ok {
		panic("No numplayers set")
	}
	numPlayers, ok := np.(int)
	if !ok {
		panic("num players isnt an int")
	}
	for i := range numPlayers {
		p := i+1

		c, ok := lobby.GetState(fmt.Sprintf("player%d",p))
		if !ok {
			panic("player not found")
		}
		client, ok := c.(*gserver.Client)
		if !ok {
			panic("client wrong type")
		}
		state := flatten(master)
		state.PlayerNumber = &i
		msg.Body["state"] = state
		gserver.SendToClient(msg, client)
	}
}

func broadcastStatesToClients(lobby *gserver.Lobby, master StateUpdate) {
	update := gserver.Msg{
		StatusCode: 0,
		Msg: "update game",
		Body: make(map[string]interface{}),
	}

	np, ok := lobby.GetState("numPlayers")
	if !ok {
		panic("No numplayers set")
	}
	numPlayers, ok := np.(int)
	if !ok {
		panic("num players isnt an int")
	}
	for i := range numPlayers {
		p := i+1

		c, ok := lobby.GetState(fmt.Sprintf("player%d",p))
		if !ok {
			panic("player not found")
		}
		client, ok := c.(*gserver.Client)
		if !ok {
			panic("client wrong type")
		}
		update.Body["updates"] = statePerPlayer(i, master, lobby)
		gserver.SendToClient(update, client)
	}
}

func execute(client *gserver.Client, server *gserver.Server, msg gserver.Msg) error {
	if gserver.ReceiveLobbyCommands(client, server, msg) {
		return nil
	}
	response := gserver.MakeResponse(msg)
	switch msg.Msg {
	case "start game":
		if client.Lobby == nil {
			response.Error("Need to be in lobby to start game")
			break
		}
		started, ok := client.Lobby.GetState("started")

		if ok && started.(bool) {
			response.Error("Game already started")
			break
		}
		// todo check if there are enough players
		playerDecks := map[int]DeckMap{
			0: { "Gunner": 10 },
			1: { "Blaster": 10 },
		}

		newGame, _ := newGameState(2).initDecks(playerDecks)
		newGame = newGame.drawCards()

		lobby := client.Lobby
		lobby.AssignPlayers()
		client.Lobby.UpdateState("game", newGame)
		client.Lobby.UpdateState("started", true)

		broadcastStartGame(lobby, newGame)
	case "end turn":
		s, _ := client.Lobby.GetState("game")
		game := s.(GameState)
		game, _ = game.endTurn() //1
		game = game.startTurn() //1
		game, updates := game.clearUpdates()


		client.Lobby.UpdateState("game", game)

		startBroadcast := msg
		startBroadcast.Msg = "update game"
		startBroadcast.StatusCode = 0
		startBroadcast.Body["updates"] = updates 
		
		client.Lobby.Broadcast(startBroadcast)
	default:
		return nil
	}
	gserver.SendToClient(response, client)
	return nil
}

type Err struct { msg string }
func (e Err) Error() string { return e.msg }

func validateDeck(deckMap DeckMap) error {
	for name, amount := range deckMap {
		if amount <= 0 {
			return Err{"Amount must be > 0"}
		}
		if _, ok := Cards[name]; !ok {
			return Err{fmt.Sprintf("Card %s doesn't exist", name)}
		}
	}
	return nil
}

func handlePutDeck(db *sql.DB, w http.ResponseWriter, r *http.Request) error {
	var deck DeckMap
	err := json.NewDecoder(r.Body).Decode(&deck) 
	if err != nil {
		return err
	}

	err = validateDeck(deck)
	if err != nil {
		return err
	}

	jd, _ := json.Marshal(deck)
	jsonDeck := string(jd)

	log.Printf("body = %s", jsonDeck)
	stmt, err := db.Prepare(`UPDATE users SET deck=? WHERE id=1;`)
	res, err := stmt.Exec(jsonDeck)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return Err{"No rows affected"}
	}
	w.WriteHeader(http.StatusOK)
	return nil
}

func main() {
	server := gserver.InitServer()

	db, err := sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	router := mux.NewRouter()
	router.HandleFunc("/", serveHome)
	router.HandleFunc("/cards", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		bytes, _ := json.Marshal(Cards)	
		log.Printf("%s", bytes)
		w.Write(bytes)
	})
	router.HandleFunc("/deck", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		if r.Method == http.MethodGet {
			var deck string
			err = db.QueryRow(`SELECT (deck) FROM users WHERE id=1;`).Scan(&deck)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				log.Println(err)
				return
			}
			io.WriteString(w, deck)
		} else if r.Method == http.MethodPut {
			err := handlePutDeck(db, w, r)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				log.Println(err)
				return
			}
		}
	})
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		log.Printf("client connected")
		if err != nil {
			log.Println(err)
			return
		}
		go gserver.HandleWSClient(conn, server, execute)
	})

	c := cors.New(cors.Options{
        AllowedOrigins: []string{"http://localhost:5173"},
        AllowCredentials: true,
		AllowedMethods: []string{"GET", "PUT"},
    })

    handler := c.Handler(router)
	err = http.ListenAndServe(":8080", handler)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
