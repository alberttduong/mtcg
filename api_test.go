package main

import (
	"testing"
	"net/http"
	"encoding/json"
	"bytes"
	"log"
	"os"

	"github.com/profclems/go-dotenv"
	"database/sql"
	_ "github.com/mattn/go-sqlite3"	
	"github.com/golang-jwt/jwt/v5"
)

var (
	client = &http.Client{}
)

func TestAuth(t *testing.T) {
	deck := map[string]int{
		"Gunner": 6,
	}

	data, err := json.Marshal(deck)
	deckReader := bytes.NewReader(data)
	req, err := http.NewRequest(http.MethodPut, "http://localhost:8080/deck", deckReader)
	if err != nil {
		t.Fatalf("%s", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("%s", err)
	}
	if c := resp.StatusCode; c != 200 {
		t.Errorf("status code = %d", c)
	}
}

func TestGetDeck(t *testing.T) {
	err := dotenv.Load()
	  if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	  }

	key := []byte(dotenv.GetString("JWT_KEY"))
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, 
		jwt.MapClaims{"sub": "Bill"})
	s, err := token.SignedString(key)
	if err != nil {
		t.Error(err)
	}
	
	parsedT, err := jwt.Parse(s, func(token *jwt.Token) (any, error) {
		return key, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	
	if claims, ok := parsedT.Claims.(jwt.MapClaims); ok {
		if claims["sub"] != "Bill" {
			t.Errorf("Wrong user")
		}
	} else {
		t.Errorf("unable to validate JWT")
	}
}

func TestMain(m *testing.M) {
	db, err := sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	code := m.Run() 
	os.Exit(code)
}
