package main

import (
	"testing"
	"net/http"
	"encoding/json"
	"bytes"
	"log"
	"os"
	"io"

	"database/sql"
	_ "github.com/mattn/go-sqlite3"	
)

var (
	client = &http.Client{}
	db *sql.DB
)

func TestPutDeck(t *testing.T) {
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

func TestSignup(t *testing.T) {
	userInfo := struct{
		Name string `json:"name"`
		Pass string `json:"password"`}{"user","1234"}
	data, _ := json.Marshal(userInfo)
	userBytes := bytes.NewReader(data)
	req, err := http.NewRequest(http.MethodPut, "http://localhost:8080/signup", userBytes)
	if err != nil {
		t.Error(err)
	}

	res, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 200 {
		t.Errorf("Expected status code 200 got %d", res.StatusCode)
	}
	
	var name string
	err = db.QueryRow(`SELECT (name) FROM users WHERE id=2;`).Scan(&name)
	if err != nil {
		t.Fatal(err)
	}
	if name != userInfo.Name {
		t.Errorf("expected %s got '%s'", userInfo.Name, name)
	}
}

func body(v any) io.Reader {
	data, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return bytes.NewReader(data)
}

func TestLogin(t *testing.T) {
	tests := map[Credentials]int{
		{"Bill","1234",""}: 200, 
		{"Bill", "123",""}: http.StatusUnauthorized,
		{"No Bill", "123",""}: http.StatusNotFound,
	}
	var token string

	for creds, expStatus := range tests {
		req, _ := http.NewRequest(http.MethodPut, "http://localhost:8080/login", body(creds))

		res, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		if res.StatusCode != expStatus {
			t.Errorf("Expected status code %d got %d", expStatus, res.StatusCode)
		}
		if res.StatusCode == 200 {
			b, _ := io.ReadAll(res.Body)
			token = string(b)
			if res.ContentLength == 0 {
				t.Errorf("Expected token on success")
			}
		}
	}

	u, err := verifyToken(token)
	if u != "Bill" || err != nil {
		t.Fatalf("Couldnt verify token")
	}
}

func TestMain(m *testing.M) {
	var err error

	db, err = sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	code := m.Run() 
	os.Exit(code)
}
