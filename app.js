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
var users = {}
var user_count = 0
var turn_count = 0

io.on("connection", socket => {
  console.log("user connected: ", socket.id)
  socket.on("join", function(data) {
    var username = data.username
    socket.username = username
    users[user_count] = {}
    users[user_count].id = socket.id
    users[user_count].name = username
    users[user_count].turn = false
    user_count++

    io.emit("update_users", users, user_count)
  })
  socket.on("game_start", function(data) {
    socket.broadcast.emit("game_started", data)
    users[turn_count].turn = true

    io.emit("update_users", users)
  })
  socket.on("select", function(data) {
    socket.broadcast.emit("check_number", data)

    users[turn_count].turn = false
    turn_count++

    if (turn_count >= user_count) {
      turn_count = 0
    }
    users[turn_count].turn = true

    io.sockets.emit("update_users", users)
  })

  socket.on("disconnect", function() {
    console.log("user disconnected : ", socket.id, socket.username)
    for (var i = 0; i < user_count; i++) {
      if (users[i].id == socket.id) delete users[i]
    }

    user_count--
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
