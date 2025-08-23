echo "starting backend server"
go run . &
echo "running tests"
go test
echo "ending server"
fuser -k 8080/tcp
