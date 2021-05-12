// var express = require("express")
// var app = express()
// var http = require("http").Server(app)
// var io = require("socket.io")(http)

//클라이언트 처리
var bingo = {
  is_my_turn: Boolean,
  socket: null,

  //객체 초기화 함수. 소켓 이벤트 별로 콜백 함수 담당.
  //check_number, get_started, update_user, connect
  init: function(socket) {
    var self = this
    var user_cnt = 0

    this.is_my_turn = false

    socket = io()

    socket.on("check_number", function(data) {
      self.where_is_it(data.num)
      self.print_msg(`${data.username}님이 '${data.num}'을 선택했습니다.`)
    })

    socket.on("game_started", data => {
      console.log("enter the game_started")
      self.print_msg(data.username + " 님이 게임을 시작했습니다.")
      $("start_button").hide()
    })
    socket.on("update_user", (data, user_count) => {
      console.log(data)
      user_cnt = user_count
      self.update_userlist(data, socket)
    })

    socket.on("connect", () => {
      socket.emit("join", { username: $("#username").val() })
    })

    //빙고판 랜덤 생성 및 리스너 연결
    var numbers = []
    for (var i = 1; i <= 25; i++) numbers.push(i)
    numbers.sort((a, b) => {
      var temp = parseInt(Math.random() * 10)
      var isOddOrEven = temp % 2
      var isPosOrNeg = temp > 5 ? 1 : -1
      return isOddOrEven * isPosOrNeg
    })

    $("table.bingo-board td").each(function(i) {
      $(this).html(numbers[i])
      $(this).click(() => {
        //전역 변수 유저 수 체크
        if (user_cnt == 1) self.print_msg("<알림> 최소 2명부터 게임이 가능합니다.")
        else self.select_num(this, socket)
      })
    })
    $("#start_button").click(() => {
      if (user_cnt == 1) self.print_msg("<알림> 최소 2명부터 게임이 가능합니다.")
      else {
        //서버의 game_start 이벤트 실행. 클릭한 유저 이름 넘겨준다
        socket.emit("game_start", { username: $("#username").val() })
        self.print_msg("<알림> 게임을 시작했습니다.")
        $("#start_button").hide()
      }
    })
  },

  //객체 메소드 : select_num, where_is_it, check_num, update_userlist
  select_num: (obj, socket) => {
    //자신의 차례이고, 빙고 칸이 선택되지 않았을 때
    if (this.is_my_turn && !$(obj.attr("checked"))) {
      //서버 이벤트 함수에 유저 이름과 클릭한 숫자 전달
      //클릭한 숫자 css 속성 변경하는 check_num 호출
      socket.emit("select", { username: $("#username").val(), num: $(obj).text() })
      this.check_num(obj)
      this.is_my_turn = false
    } else {
      this.print_msg("<알림> 차례가 아닙니다!")
    }
  },

  //상대방이 클릭한 숫자를 입력으로 받아 css 상태를 바꾼다.
  where_is_it: num => {
    var self = this
    var obj = null
    //this는 빙고 칸 숫자
    $("table.bingo-board td").each(i => {
      if ($(this).text() == num) self.check_num(this)
    })
  },
  check_num: obj => {
    $(obj).css("text-decoration", "line-through")
    $(obj).css("color", "lightgray")
    $(obj).attr("checked", true)
  },

  //유저리스트 업데이트
  update_userlist: (data, this_socket) => {
    var self = this
    $("#list").empty()
    console.log(data)
    $.each(data, (key, value) => {
      var turn = "(-) "
      if (value.turn === true) {
        turn = "(*) "
        console.log(value.name)
        console.log($("#username").val())
        if (value.id == this_socket.id) self.is_my_turn = true
      }

      if (value.id == this_socket.id)
        $("#list").append("<font color='DodgerBlue'>" + turn + value.name + "<br></font>")
      else $("#list").append("<font color='black'>" + turn + value.name + "<br></font>")
    })
  },

  print_msg: function(msg) {
    $("#logs").append(msg + "<br />")
    //스크롤 아래로 내려가게
    $("#logs").scrollTop($("#logs")[0].scrollHeight)
  },
}

$(document).ready(() => {
  bingo.init()
})
