var createError = require("http-errors")
var express = require("express")
var path = require("path")
var cookieParser = require("cookie-parser")
var logger = require("morgan")
var app = express()
var http = require("http").Server(app)
var io = require("socket.io")(http)

var indexRouter = require("./routes/index")
var usersRouter = require("./routes/users")
const { Socket } = require("dgram")

// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "jade")

app.use(logger("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

//app.use('/', indexRouter);

app.get("/", (req, res) => {
  res.render("main", { title: "온라인 빙고 게임", username: req.query.username })
})
app.use("/users", usersRouter)

//전역 변수
var users = {}
var user_count = 0
var turn_count = 0

//소켓 발생. 서버 쪽에서 처리하는 이벤트들
io.on("connection", socket => {
  console.log("user connected: ", socket.id)

  //1. 사용자가 접속 했을 때. 클라이언트에서 data를 넘겨줌
  socket.on("join", function(data) {
    //소켓의 사용자 이름 설정. 사용자, 유저 수 전역변수 변경
    var username = data.username
    socket.username = username
    users[user_count] = {}
    users[user_count].id = socket.id
    users[user_count].name = username
    users[user_count].turn = false
    user_count++

    //클라이언트에게 사용자 목록 업데이트해서 출력하라고 수행
    io.emit("update_users", users, user_count)
  })

  //클라이언트가 게임 시작 누르면 실행
  socket.on("game_start", function(data) {
    //클라이언트의 모든 사용자들에게 게임 시작을 알린다
    socket.broadcast.emit("game_started", data)

    //현재 턴 유저
    users[turn_count].turn = true

    //턴 값을 변경 했으니, 다시 사용자 목록 업데이트 한다
    io.emit("update_users", users)
  })

  //숫자를 선택할 때 발생하는 이벤트.
  socket.on("select", function(data) {
    //모든 사용자들의 빙고판을 업데이트?
    socket.broadcast.emit("check_number", data)

    //현재 사용자의 턴을 종료시킨다
    users[turn_count].turn = false
    turn_count++

    if (turn_count >= user_count) {
      turn_count = 0
    }
    //다음 사용자의 턴을 활성화
    users[turn_count].turn = true

    //왜 .sockets이 붙었을까..? 다시 사용자 목록 업데이트
    io.sockets.emit("update_users", users)
  })

  // 접속 종료
  socket.on("disconnect", function() {
    console.log("user disconnected : ", socket.id, socket.username)
    //사용자 객체 배열에서 종료한 사용자를 찾아 제거.. delete로 수행 가능
    for (var i = 0; i < user_count; i++) {
      if (users[i].id == socket.id) delete users[i]
    }

    user_count--
    //사용자 목록 업데이트
    io.emit("update_users", users, user_count)
  })
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render("error")
})

module.exports = app
