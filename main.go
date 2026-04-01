package main

import (
	"fmt"
	"net/http"
	"log"
	"golang.org/x/crypto/bcrypt"
	
	"github.com/gorilla/websocket"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/profclems/go-dotenv"

	"gserver"
	"io"
	"encoding/json"

	"database/sql"
	_ "github.com/mattn/go-sqlite3"	
)

var key []byte

func init() {
	err := dotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}
	key = []byte(dotenv.GetString("JWT_KEY"))
}

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

func verifyTurn(response *gserver.Msg, game GameState, client *gserver.Client) (bool) {
	if client.Lobby == nil {
		log.Printf("Error: Expected client to be in a lobby")
		response.Error("Server error verifying turns")
		return false 
	}

	p, ok := client.Lobby.GetPrivateState(client, "player")
	if !ok {
		log.Printf("Error: Lobby private state does not have player number")
		response.Error("Server error verifying turns")
		return false
	}

	playerNumber, ok := p.(int)
	if !ok {
		log.Printf("Error: Couldn't convert lobbystate to int player number")
		response.Error("Server error verifying turns")
		return false
	}

	if game.Turn == playerNumber {
		return true
	}
	response.Error("It is not your turn")
	return false
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

func broadcastUpdates(lobby *gserver.Lobby, updates []GameStateUpdate) {
	body := map[string]interface{}{"updates": updates}
	lobby.Broadcast(gserver.Msg{
		Msg: "update game",
		StatusCode: 0,
		Body: body,
	})
}

func execute(client *gserver.Client, server *gserver.Server, msg gserver.Msg) error {
	if gserver.ReceiveLobbyCommands(client, server, msg) {
		return nil
	}
	if gserver.ReceiveChatCommands(client, server, msg) {
		return nil
	}

	lobby := client.Lobby

	response := gserver.MakeResponse(msg)

SwitchCommand:
	switch msg.Msg {
	case "set deck":
		if lobby == nil {
			response.Error("Need to be in lobby to select your deck")
			break
		}

		d, ok := msg.Body["deck"]
		if !ok {
			response.Error("Expected deck in body")
			break
		}

		deckName, ok := msg.Body["deckName"]
		if !ok {
			log.Printf("Expected deck name in body. Continuing")
		}

		deck, ok := d.(map[string]any)
		if !ok {
			response.Error("Couldn't parse deck in body")
			break
		}
		deckMap := map[string]int{}
		for k, v := range deck {
			f, ok := v.(float64)
			if !ok {
				response.Error("Couldn't parse deck in body")
				break SwitchCommand
			}

			deckMap[k] = int(f)
		}

		err := validateDeck(deckMap)
		if err != nil {
			response.Error(fmt.Sprintf("Deck error: %s", err.Error()))
			break
		}

		lobby.UpdatePrivateState(client, "deck", deckMap)
		lobby.Broadcast(gserver.Msg{
			StatusCode: 0,
			Msg: "set deck",
			Body: map[string]interface{}{
				"name": client.Name,
				"ready": true,
			},
		})
		response.Body["deckName"] = deckName
	case "start game":
		if lobby == nil {
			response.Error("Need to be in lobby to start game")
			break
		}

		if !lobby.IsLeader(client) {
			response.Error("Must be leader to start game")
			break
		}
		started, ok := client.Lobby.GetState("started")

		if ok && started.(bool) {
			response.Error("Game already started")
			break
		}

		lobby.AssignPlayers()
		np, ok := lobby.GetState("numPlayers")
		if !ok {
			response.Error("server error, expected numPlayers")
			break
		}
		numPlayers := np.(int)

		playerDecks := []DeckMap{}

		for i := range numPlayers {
			p, ok := lobby.State[fmt.Sprintf("player%d", i+1)]
			if !ok {
				response.Error("Not all players ready")
				break SwitchCommand
			}
			c, ok := p.(*gserver.Client)
			if !ok {
				response.Error("Server error: couldnt get client from state")
				break SwitchCommand
			}
			d, ok := lobby.GetPrivateState(c, "deck")
			if !ok {
				response.Error("Everyone must select their decks to start the game")
				break SwitchCommand
			}
			deck, ok := d.(map[string]int)
			if !ok {
				response.Error("Server error: couldnt convert deck from state")
				break SwitchCommand
			}
			playerDecks = append(playerDecks, deck)
		}

		newGame, _ := newGameState(numPlayers).initDecks(playerDecks)
		newGame, _ = newGame.drawCards().startTurn().clearUpdates()

		broadcastStartGame(lobby, newGame)
		
		client.Lobby.UpdateState("game", newGame)
		client.Lobby.UpdateState("started", true)
	case "end turn":
		s, _ := client.Lobby.GetState("game")
		game, _ := s.(GameState)

		ok := verifyTurn(&response, game, client)
		if !ok {
			break
		}

		game, _ = game.endTurn() //1
		game = game.startTurn() //1
		game, updates := game.clearUpdates()


		client.Lobby.UpdateState("game", game)

		startBroadcast := msg
		startBroadcast.Msg = "update game"
		startBroadcast.StatusCode = 0
		startBroadcast.Body["updates"] = updates 
		
		client.Lobby.Broadcast(startBroadcast)
	case "play hand":
		var index, r, c int
		err := gserver.CheckNumber(msg, "index", &index)
		err = gserver.CheckNumber(msg, "r", &r)
		err = gserver.CheckNumber(msg, "c", &c)
		if err != nil {
			response.Error(err.Error())
			break
		}

		s, _ := client.Lobby.GetState("game")
		game, _ := s.(GameState)

		ok := verifyTurn(&response, game, client)
		if !ok {
			break
		}

		game, err = game.playFromHand(index, Pos{Row: r, Col: c})
		if err != nil {
			response.Error(err.Error())
			break
		}

		
		game, updates := game.clearUpdates()
		client.Lobby.UpdateState("game", game)

		updateMsg := msg
		updateMsg.Msg = "update game"
		updateMsg.StatusCode = 0
		updateMsg.Body["updates"] = updates 
		
		client.Lobby.Broadcast(updateMsg)
	case "attack":
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
			err := gserver.CheckNumber(msg, p.key, p.dest)
			if err != nil {
				response.Error(err.Error())
				break SwitchCommand
			}
		}
		
		s, ok := client.Lobby.GetState("game")
		if !ok {
			response.Error("err in getting the game")
			break
		}
		game := s.(GameState)

		ok = verifyTurn(&response, game, client)
		if !ok {
			break
		}


		game, err := game.attack(Pos{atkRow, atkCol}, 
			Pos{defRow, defCol}, defPlayer)
		if err != nil {
			response.Error(err.Error())
			break
		}

		game, updates := game.clearUpdates()
		client.Lobby.UpdateState("game", game)

		updateMsg := msg
		updateMsg.Msg = "update game"
		updateMsg.StatusCode = 0
		updateMsg.Body["updates"] = updates 
		
		client.Lobby.Broadcast(updateMsg)
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

type Credentials struct {
	Name string `json:"name"`
	Password string `json:"password"`
	Token string `json:"token"`
}

func verifyToken(token string) (user string, err error) {
	parsedT, err := jwt.Parse(token, 
		func(token *jwt.Token) (any, error) {
			return []byte(dotenv.GetString("JWT_KEY")), nil
		}, 
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return user, err
	}
	
	if claims, ok := parsedT.Claims.(jwt.MapClaims); ok {
		return claims.GetSubject()
	}
	return user, Err{"unable to parse claims"}
}

func createToken(user string) (token []byte, err error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, 
		jwt.MapClaims{"sub": user})
	s, err := t.SignedString(key)
	return []byte(s), err
}

func handleLogin(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var userInfo Credentials
	err := json.NewDecoder(r.Body).Decode(&userInfo) 
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	stmt, err := db.Prepare(`SELECT (password) FROM users WHERE name = ?;`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var password []byte
	err = stmt.QueryRow(userInfo.Name).Scan(&password)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("User not found"))
		return
	}

	err = bcrypt.CompareHashAndPassword(password, []byte(userInfo.Password))
	if err != nil && len(password) > 6 {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Incorrect password"))
		return
	}

	token, err := createToken(userInfo.Name)
	w.Write(token)
}


func handleSignup(db *sql.DB, w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodPut {
		return Err{"Expected PUT method"}
	}

	var userInfo Credentials
	err := json.NewDecoder(r.Body).Decode(&userInfo) 
	if err != nil {
		return err
	}

	if userInfo.Name == "" || userInfo.Password == "" {
		return Err{"Must provide name and password"}
	}
		
	stmt, err := db.Prepare(`INSERT INTO users (name, password) VALUES (?, ?)`)
	if err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(userInfo.Password), bcrypt.MinCost)
	if err != nil {
		return err
	}

	res, err := stmt.Exec(userInfo.Name, hashedPassword)
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
	token, err := createToken(userInfo.Name)
	w.Write(token)
	return nil
}

func handlePutDeck(db *sql.DB, w http.ResponseWriter, r *http.Request, username string) error {
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
	stmt, err := db.Prepare(`UPDATE users SET deck=? WHERE name=?`)
	res, err := stmt.Exec(jsonDeck, username)
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
	router.HandleFunc("/testcxn", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
	})
	router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		handleLogin(db, w, r)
	})
	router.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		err := handleSignup(db, w, r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			log.Println(err)
		}
	})
	router.HandleFunc("/cards", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		bytes, _ := json.Marshal(Cards)	
		log.Printf("%s", bytes)
		w.Write(bytes)
	})
	router.HandleFunc("/deck", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		token, ok := r.Header["Authorization"]
		if !ok || len(token) == 0 {
			http.Error(w, "Authorization header not found or empty", http.StatusBadRequest)
			log.Printf("Authorization header not found or empty")
			return
		}

		username, err := verifyToken(token[0])
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		if r.Method == http.MethodGet {
			var deck string
			err = db.QueryRow(`SELECT (deck) FROM users WHERE name=?`, username).Scan(&deck)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				log.Println(err)
				return
			}
			io.WriteString(w, deck)
		} else if r.Method == http.MethodPut {
			err := handlePutDeck(db, w, r, username)
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
		AllowedHeaders: []string{"*"},
		AllowedMethods: []string{"GET", "PUT"},
    })

    handler := c.Handler(router)
	err = http.ListenAndServe(":8080", handler)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
