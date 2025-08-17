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

func execute(client *gserver.Client, server *gserver.Server, msg gserver.Msg) error {
	if gserver.ReceiveLobbyCommands(client, server, msg) {
		return nil
	}
	return nil
}

type Card struct {
	Name string `json:"name"`
}

var Cards = []Card{
	{
		Name: "Gunner",
	},
	{
		Name: "Sandy Fortress",
	},
}

type Err struct { msg string }
func (e Err) Error() string { return e.msg }

func validateDeck(deck string) error {
	var deckArray []int
	err := json.Unmarshal([]byte(deck), &deckArray)
	if err != nil {
		return err
	}
	for _, card := range deckArray {
		if card < 0 || card >= len(Cards) {
			return Err{fmt.Sprintf("Card (id: %d) doesn't exist", card)}
		}
	}
	return nil
}

func handlePutDeck(db *sql.DB, w http.ResponseWriter, r *http.Request) error {
	var body struct{Deck string}
	err := json.NewDecoder(r.Body).Decode(&body) 
	if err != nil {
		return err
	}

	err = validateDeck(body.Deck)
	if err != nil {
		return err
	}

	log.Printf("body.deck = %s", body.Deck)
	stmt, err := db.Prepare(`UPDATE users SET deck=? WHERE id=1;`)
	res, err := stmt.Exec(body.Deck)
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
    })

    handler := c.Handler(router)
	err = http.ListenAndServe(":8080", handler)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
