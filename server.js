const express = require("express");
const MongoClient = require("mongodb").MongoClient;

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const multer = require("multer");
const moment = require("moment-timezone");

const app = express();
const port = process.env.PORT || 5000;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({ secret: "secret", resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

MongoClient.connect(
  "mongodb+srv://admin:Qwe3834poi^(@testdb.d3uk0xi.mongodb.net/?retryWrites=true&w=majority",
  function (err, result) {
    //에러가 발생했을경우 메세지 출력(선택사항)
    if (err) {
      return console.log(err);
    }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("testdb");

    //db연결이 제대로 됐다면 서버실행
    app.listen(port, function () {
      console.log("서버연결 성공");
    });
  }
);

app.get("/", function (req, res) {
  res.render("index", { userData: req.user }); //로그인시 회원정보데이터 ejs 파일로 전달
});

app.get("/login", (req, res) => {
  res.render("login"); // login.ejs 파일로 응답
});

//로그인 페이지에서 입력한 아이디 비밀번호 검증 처리 요청
app.post(
  "/loginresult",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  //실패시 /fail 경로로 요청
  function (req, res) {
    if (req.user.userId == "admin") {
      res.redirect("/admin/store");
      //관리자 아이디로 로그인 성공시 관리자 매장등록 페이지로 이동
    } else {
      //그렇지 않은 경우 메인페이지로 이동
      res.render("index", { userData: req.user });
    }
  }
);

app.get("/fail", function (req, res) {
  res.send(
    "<script>  alert('아이디나 비밀번호가 잘못되었습니다. 다시 입력해주세요.'); location.href = '/login';</script>"
  );
});

//  /loginresult 경로 요청시 passport.autenticate() 함수구간이 아이디 비번 로그인 검증구간
passport.use(
  new LocalStrategy(
    {
      usernameField: "userId",
      passwordField: "userPass",
      session: true,
      passReqToCallback: false,
    },
    function (id, pass, done) {
      db.collection("port3_user").findOne(
        { userId: id },
        function (err, result) {
          if (err) return done(err);
          if (!result)
            return done(null, false, {
              message: "존재하지않는 아이디 입니다.",
            });
          if (pass == result.userPass) {
            return done(null, result);
          } else {
            return done(null, false, { message: "비번이 틀렸습니다" });
          }
        }
      );
    }
  )
);

//처음 로그인 했을 시 해당 사용자의 아이디를 기반으로 세션을 생성함
//  req.user
passport.serializeUser(function (user, done) {
  done(null, user.userId); //서버에다가 세션만들어줘 -> 사용자 웹브라우저에서는 쿠키를 만들어줘
});

// 로그인을 한 후 다른 페이지들을 접근할 시 생성된 세션에 있는 회원정보 데이터를 보내주는 처리
// 그전에 데이터베이스 있는 아이디와 세션에 있는 회원정보중에 아이디랑 매칭되는지 찾아주는 작업
passport.deserializeUser(function (id, done) {
  db.collection("port3_user").findOne({ userId: id }, function (err, result) {
    done(null, result);
  });
});

//로그인 실패시 fail경로
app.get("/fail", (req, res) => {
  res.send("로그인 실패");
});

app.get("/userjoin", (req, res) => {
  res.render("userjoin");
});

//회원가입 페이지에서 입력한 내용들을 데이터베이스에 저장
app.post("/memberjoin", function (req, res) {
  db.collection("port3_user").findOne(
    { userId: req.body.username },
    function (err, result) {
      if (result) {
        res.send(
          "<script>alert('이미 가입된 이메일입니다'); location.href='/join'; </script>"
        );
      } else {
        db.collection("port3_count").findOne(
          { name: "회원정보" },
          function (err, result) {
            db.collection("port3_user").insertOne(
              {
                userId: req.body.username,
                userPass: req.body.userpass,
              },
              function (err, result) {
                db.collection("port3_count").updateOne(
                  { name: "회원정보" },
                  { $inc: { joinCount: 1 } },
                  function (err, result) {
                    res.redirect("/login");
                    //res.render("login"); ejs파일 응답하는걸로 처리가능
                  }
                );
              }
            );
          }
        );
      }
    }
  );
});

//파일첨부
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/upload");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      (file.originalname = Buffer.from(file.originalname, "latin1").toString(
        "utf8"
      ))
    );
  },
});
const upload = multer({ storage: storage });

//로그아웃 경로 get 요청
app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    // 요청 -> 세션제거
    res.clearCookie("connect.sid"); // 응답 -> 본인접속 웹브라우저 쿠키 제거
    res.redirect("/"); // 메인페이지 이동
  });
});

//관리자 매장등록 화면 페이지
app.get("/admin/store", (req, res) => {
  db.collection("port3_store")
    .find({})
    .toArray((err, result) => {
      res.render("admin_store", {
        storeData: result,
        userData: req.user,
      });
    });
});

//매장등록페이지에서 전송한 값 데이터베이스에 삽입
app.post("/addstore", (req, res) => {
  db.collection("port3_count").findOne({ name: "매장등록" }, (err, result1) => {
    db.collection("port3_store").insertOne(
      {
        num: result1.storeCount + 1,
        name: req.body.name,
        sido: req.body.city1,
        sigugun: req.body.city2,
        address: req.body.detail,
        delivery: req.body.delivery,
        hours: req.body.hours,
        phone: req.body.phone,
        coord: req.body.coord,
      },
      (err, result) => {
        db.collection("port3_count").updateOne(
          { name: "매장등록" },
          { $inc: { storeCount: 1 } },
          (err, result) => {
            res.redirect("/admin/store"); //매장등록 페이지로 이동
          }
        );
      }
    );
  });
});

//매장 수정화면 페이지 get 요청
app.get("/storeupt/:no", function (req, res) {
  //db안에 해당 게시글번호에 맞는 데이터를 꺼내오고 ejs파일로 응답
  db.collection("port3_store").findOne(
    { num: Number(req.params.no) },
    function (err, result) {
      res.render("admin_storeupt", {
        storeData: result,
        userData: req.user,
      });
    }
  );
  //input, textarea에다가 작성내용 미리 보여줌
});

//매장 수정사항 db에 적용하는 구간
app.post("/updatestore", function (req, res) {
  db.collection("port3_store").updateOne(
    { num: Number(req.body.num) },
    {
      $set: {
        name: req.body.name,
        sido: req.body.sido,
        sigugun: req.body.sigugun,
        address: req.body.address,
        delivery: req.body.delivery,
        hours: req.body.hours,
        phone: req.body.phone,
        coord: req.body.coord,
      },
    },
    //해당 게시글 상세화면 페이지로 이동
    function (err, result) {
      res.redirect("/admin/store");
    }
  );
});

//관리자 매장 삭제처리 get 요청
app.get("/deletestore/:no", function (req, res) {
  //db안에 해당 매장 번호에 맞는 데이터만 삭제 처리
  db.collection("port3_store").deleteOne(
    { num: Number(req.params.no) },
    function (err, result) {
      //매장 목록페이지로 이동
      res.redirect("/admin/store");
    }
  );
});

app.get("/store", async (req, res) => {
  //사용자가 게시판에 접속시 몇번 페이징 번호로 접속했는지 확인
  let pageNum = req.query.page == null ? 1 : Number(req.query.page);
  //한 페이지당 보여줄 데이터 갯수
  let perPage = 5;
  //블록당 보여줄 페이징 번호 갯수
  let blockCount = 3;
  //현재 페이지 블록 구하는 구간
  let blockNum = Math.ceil(pageNum / blockCount);
  //블록안에 있는 페이징의 시작번호 값
  let blockStart = (blockNum - 1) * blockCount + 1;
  //블록안에 있는 페이징의 끝번호 값
  let blockEnd = blockStart + blockCount - 1;
  //데이터베이스 콜렉션에 있는 전체 객체의 갯수값 가져오는 명령어
  let totalData = await db.collection("port3_store").countDocuments({});
  //전체 데이터값을 통해서 전체 페이징 번호를 계산
  let paging = Math.ceil(totalData / perPage);
  //블록에서 마지막 번호가 페이징의 끝번호보다 크다면, 페이징의 끝번호를 강제로 부여
  if (blockEnd > paging) {
    blockEnd = paging;
  }

  //블록의 총 갯수 계산
  let totalBlock = Math.ceil(paging / blockCount);
  //데이터베이스에서 꺼내오는 데이터의 순번값을 결정
  //데이터베이스 콜렉션에서 데이터를 perPage 갯수만큼 맞춰서 가져오기
  let startFrom = (pageNum - 1) * perPage;
  //sort({정렬할 프로퍼티명:1}) 오름차순 -1은 내림차순
  //조건문을 이용해서 입력한 검색어가 있는 경우는 aggregate({}).sort().skip().limit()
  db.collection("port3_store")
    .find({})
    .sort({ number: -1 })
    .skip(startFrom)
    .limit(perPage)
    .toArray((err, result) => {
      res.render("store", {
        userData: req.user,
        storeData: result,
        paging: paging,
        pageNum: pageNum,
        blockStart: blockStart,
        blockEnd: blockEnd,
        blockNum: blockNum,
        totalBlock: totalBlock,
      });
    });
});

//이벤트 목록 get 요청
app.get("/admin/events", function (req, res) {
  db.collection("port3_events")
    .find()
    .toArray(function (err, result) {
      res.render("admin_events", { eventData: result, userData: req.user });
    });
  //db안에 게시글 콜렉션 찾아서 데이터 전부 꺼내오고 ejs파일로 응답
});

//게시글 작성 후 데이터베이스에 넣는 작업 요청
app.post("/addevent", upload.single("filetest"), function (req, res) {
  console.log(req.file);
  if (req.file) {
    fileUpload = req.file.originalname;
  } else {
    fileUpload = null;
  }

  db.collection("port3_count").findOne(
    { name: "이벤트등록" },
    function (err, result1) {
      db.collection("port3_events").insertOne(
        {
          num: result1.eventCount + 1,
          name: req.body.name,
          content: req.body.content,
          thumbnail: fileUpload,
          date: moment().tz("Asia/Seoul").format("YYYY-MM-DD"),
        },
        function (err, result2) {
          db.collection("port3_count").updateOne(
            { name: "이벤트등록" },
            { $inc: { eventCount: 1 } },
            function (err, result3) {
              res.redirect("/admin/events");
            }
          );
        }
      );
    }
  );
});

//관리자 이벤트 삭제처리 get 요청
app.get("/deleteevent/:no", function (req, res) {
  //db안에 해당 매장 번호에 맞는 데이터만 삭제 처리
  db.collection("port3_events").deleteOne(
    { num: Number(req.params.no) },
    function (err, result) {
      //매장 목록페이지로 이동
      res.redirect("/admin/events");
    }
  );
});

//이벤트 수정화면 페이지 get 요청
app.get("/eventsupt/:no", function (req, res) {
  //db안에 해당 게시글번호에 맞는 데이터를 꺼내오고 ejs파일로 응답
  db.collection("port3_events").findOne(
    { num: Number(req.params.no) },
    function (err, result) {
      res.render("admin_eventsupt", {
        eventData: result,
        userData: req.user,
      });
    }
  );
  //input, textarea에다가 작성내용 미리 보여줌
});

//이벤트 수정사항 db에 적용하는 구간
app.post("/updateevent", upload.single("filetest"), function (req, res) {
  if (req.file) {
    fileUpload = req.file.originalname;
  } else {
    fileUpload = req.body.fileOrigin;
  }
  db.collection("port3_events").updateOne(
    { num: Number(req.body.num) },
    {
      $set: {
        name: req.body.name,
        content: req.body.content,
        thumbnail: fileUpload,
      },
    },
    //이벤트 페이지로 이동
    function (err, result) {
      res.redirect("/admin/events");
    }
  );
});

//사용자 이벤트 목록 요청
app.get("/events", (req, res) => {
  db.collection("port3_events")
    .find()
    .toArray(function (err, result) {
      res.render("events", {
        eventData: result,
        userData: req.user,
      });
    });
});

//이벤트 상세화면 get 요청  /:변수명  작명가능
//db안에 해당 게시글번호에 맞는 데이터만 꺼내오고 ejs파일로 응답
app.get("/eventdetail/:no", function (req, res) {
  db.collection("port3_events").findOne(
    { num: Number(req.params.no) },
    function (err, result) {
      res.render("eventdetail", {
        eventData: result,
        userData: req.user,
      });
    }
  );
});

//사용자 메뉴 목록 요청
app.get("/menus", (req, res) => {
  db.collection("port3_menus")
    .find()
    .toArray(function (err, result) {
      res.render("menus", {
        menuData: result,
        userData: req.user,
      });
    });
});

//메뉴 상세화면 get 요청  /:변수명  작명가능
//db안에 해당 게시글번호에 맞는 데이터만 꺼내오고 ejs파일로 응답
app.get("/menudetail/:no", function (req, res) {
  db.collection("port3_menus").findOne(
    { num: Number(req.params.no) },
    (err, result1) => {
      db.collection("port3_menus")
        .find({
          name: { $in: [...result1.recom] },
        })
        .toArray((err, result2) => {
          res.send({ menuData: result1, recomData: result2 });
        });
    }
  );
});

//관리자 메뉴 목록 get 요청
app.get("/admin/menus", function (req, res) {
  db.collection("port3_menus")
    .find()
    .toArray(function (err, result) {
      res.render("admin_menus", { menuData: result, userData: req.user });
    });
  //db안에 게시글 콜렉션 찾아서 데이터 전부 꺼내오고 ejs파일로 응답
});

//메뉴 작성 후 데이터베이스에 넣는 작업 요청
app.post("/addmenu", upload.single("filetest"), function (req, res) {
  console.log(req.file);
  if (req.file) {
    fileUpload = req.file.originalname;
  } else {
    fileUpload = null;
  }

  db.collection("port3_count").findOne(
    { name: "메뉴등록" },
    function (err, result1) {
      db.collection("port3_menus").insertOne(
        {
          num: result1.menuCount + 1,
          name: req.body.name,
          content: req.body.content,
          thumbnail: fileUpload,
          recom: req.body.recom,
        },
        function (err, result2) {
          db.collection("port3_count").updateOne(
            { name: "메뉴등록" },
            { $inc: { menuCount: 1 } },
            function (err, result3) {
              res.redirect("/admin/menus");
            }
          );
        }
      );
    }
  );
});

//관리자 메뉴 삭제처리 get 요청
app.get("/deletemenu/:no", function (req, res) {
  //db안에 해당 매장 번호에 맞는 데이터만 삭제 처리
  db.collection("port3_menus").deleteOne(
    { num: Number(req.params.no) },
    function (err, result) {
      //매장 목록페이지로 이동
      res.redirect("/admin/menus");
    }
  );
});

//메뉴 수정화면 페이지 get 요청
app.get("/menuupt/:no", function (req, res) {
  //db안에 해당 게시글번호에 맞는 데이터를 꺼내오고 ejs파일로 응답
  db.collection("port3_menus").findOne(
    { num: Number(req.params.no) },
    function (err, result) {
      res.render("admin_menusupt", {
        menuData: result,
        userData: req.user,
      });
    }
  );
  //input, textarea에다가 작성내용 미리 보여줌
});

//메뉴 수정사항 db에 적용하는 구간
app.post("/updatemenu", upload.single("filetest"), function (req, res) {
  if (req.file) {
    fileUpload = req.file.originalname;
  } else {
    fileUpload = req.body.fileOrigin;
  }
  db.collection("port3_menus").updateOne(
    { num: Number(req.body.num) },
    {
      $set: {
        name: req.body.name,
        content: req.body.content,
        thumbnail: fileUpload,
        recom: req.body.recom,
      },
    },
    //메뉴 페이지로 이동
    function (err, result) {
      res.redirect("/admin/menus");
    }
  );
});

//관리자 공지사항 목록 get 요청
app.get("/admin/notice", function (req, res) {
  db.collection("port3_notice")
    .find()
    .toArray(function (err, result) {
      res.render("admin_notice", { noticeData: result, userData: req.user });
    });
  //db안에 게시글 콜렉션 찾아서 데이터 전부 꺼내오고 ejs파일로 응답
});

//공지사항 작성 후 데이터베이스에 넣는 작업 요청
app.post("/addnotice", upload.single("filetest"), function (req, res) {
  console.log(req.file);
  if (req.file) {
    fileUpload = req.file.originalname;
  } else {
    fileUpload = null;
  }
  db.collection("port3_count").findOne(
    { name: "공지등록" },
    function (err, result1) {
      db.collection("port3_notice").insertOne(
        {
          num: result1.noticeCount + 1,
          name: req.body.name,
          content: req.body.content,
          views: 0,
          user: req.user.userId,
          thumbnail: fileUpload,
          date: moment().tz("Asia/Seoul").format("YYYY-MM-DD"),
        },
        function (err, result2) {
          db.collection("port3_count").updateOne(
            { name: "공지등록" },
            { $inc: { noticeCount: 1 } },
            function (err, result3) {
              res.redirect("/admin/notice");
            }
          );
        }
      );
    }
  );
});

//관리자 공지사항 삭제처리 get 요청
app.get("/deletenotice/:no", function (req, res) {
  //db안에 해당 매장 번호에 맞는 데이터만 삭제 처리
  db.collection("port3_notice").deleteOne(
    { num: Number(req.params.no) },
    function (err, result) {
      //매장 목록페이지로 이동
      res.redirect("/admin/notice");
    }
  );
});

//공지사항 수정화면 페이지 get 요청
app.get("/noticeupt/:no", function (req, res) {
  //db안에 해당 게시글번호에 맞는 데이터를 꺼내오고 ejs파일로 응답
  db.collection("port3_notice").findOne(
    { num: Number(req.params.no) },
    function (err, result) {
      res.render("admin_noticeupt", {
        noticeData: result,
        userData: req.user,
      });
    }
  );
  //input, textarea에다가 작성내용 미리 보여줌
});

//공지사항 수정사항 db에 적용하는 구간
app.post("/updatenotice", upload.single("filetest"), function (req, res) {
  if (req.file) {
    fileUpload = req.file.originalname;
  } else {
    fileUpload = req.body.fileOrigin;
  }
  db.collection("port3_notice").updateOne(
    { num: Number(req.body.num) },
    {
      $set: {
        name: req.body.name,
        content: req.body.content,
        thumbnail: fileUpload,
      },
    },
    //공지사항 페이지로 이동
    function (err, result) {
      res.redirect("/admin/notice");
    }
  );
});

app.get("/notice", async (req, res) => {
  //사용자가 게시판에 접속시 몇번 페이징 번호로 접속했는지 확인
  let pageNum = req.query.page == null ? 1 : Number(req.query.page);
  //한 페이지당 보여줄 데이터 갯수
  let perPage = 5;
  //블록당 보여줄 페이징 번호 갯수
  let blockCount = 3;
  //현재 페이지 블록 구하는 구간
  let blockNum = Math.ceil(pageNum / blockCount);
  //블록안에 있는 페이징의 시작번호 값
  let blockStart = (blockNum - 1) * blockCount + 1;
  //블록안에 있는 페이징의 끝번호 값
  let blockEnd = blockStart + blockCount - 1;
  //데이터베이스 콜렉션에 있는 전체 객체의 갯수값 가져오는 명령어
  let totalData = await db.collection("port3_notice").countDocuments({});
  //전체 데이터값을 통해서 전체 페이징 번호를 계산
  let paging = Math.ceil(totalData / perPage);
  //블록에서 마지막 번호가 페이징의 끝번호보다 크다면, 페이징의 끝번호를 강제로 부여
  if (blockEnd > paging) {
    blockEnd = paging;
  }
  //블록의 총 갯수 계산
  let totalBlock = Math.ceil(paging / blockCount);
  //데이터베이스에서 꺼내오는 데이터의 순번값을 결정
  //데이터베이스 콜렉션에서 데이터를 perPage 갯수만큼 맞춰서 가져오기
  let startFrom = (pageNum - 1) * perPage;
  //sort({정렬할 프로퍼티명:1}) 오름차순 -1은 내림차순
  //조건문을 이용해서 입력한 검색어가 있는 경우는 aggregate({}).sort().skip().limit()

  db.collection("port3_notice")
    .find({})
    .sort({ _id: -1 })
    .skip(startFrom)
    .limit(perPage)
    .toArray((err, result) => {
      res.render("notice", {
        noticeData: result,
        paging: paging,
        pageNum: pageNum,
        blockStart: blockStart,
        blockEnd: blockEnd,
        blockNum: blockNum,
        totalBlock: totalBlock,
        userData: req.user,
        name: null,
      });
    });

  //공지사항으로 검색시 (사용자)
  app.get("/search/noticename", async (req, res) => {
    //query: <-- notice.ejs 파일에서 입력한 input text -> req.query.name
    //path: <-- db notice 콜렉션에서 어떤 항목명으로 찾을건지 name
    let noticeSearch = [
      {
        $search: {
          index: "notice_search",
          text: {
            query: req.query.name,
            path: "name",
          },
        },
      },
    ];

    let pageNum = req.query.page == null ? 1 : Number(req.query.page);
    let perPage = 10;
    let blockCount = 1;
    let blockNum = Math.ceil(pageNum / blockCount);
    let blockStart = (blockNum - 1) * blockCount + 1;
    let blockEnd = blockStart + blockCount - 1;
    let totalData = await db.collection("port3_notice").countDocuments({});
    let paging = Math.ceil(totalData / perPage);
    if (blockEnd > paging) {
      blockEnd = paging;
    }
    let totalBlock = Math.ceil(paging / blockCount);
    let startFrom = (pageNum - 1) * perPage;
    //검색어 입력시
    if (req.query.name !== "") {
      db.collection("port3_notice")
        .aggregate(noticeSearch)
        .sort({ _id: -1 })
        .toArray((err, result) => {
          res.render("notice", {
            noticeData: result,
            paging: paging,
            pageNum: pageNum,
            blockStart: blockStart,
            blockEnd: blockEnd,
            blockNum: blockNum,
            totalBlock: totalBlock,
            userData: req.user,
            name: req.query.name,
          });
        });
    }
    //검색어 미입력시
    else {
      res.redirect("/notice");
    }
  });
});

//공지사항 상세화면 get 요청  /:변수명  작명가능
//db안에 해당 게시글번호에 맞는 데이터만 꺼내오고 ejs파일로 응답
app.get("/noticedetail/:no", function (req, res) {
  db.collection("port3_notice").updateOne(
    { num: Number(req.params.no) },
    { $inc: { views: 1 } },
    function (err, result1) {
      db.collection("port3_notice").findOne(
        { num: Number(req.params.no) },
        function (err, result) {
          res.render("noticedetail", {
            noticeData: result,
            userData: req.user,
          });
        }
      );
    }
  );
});

//고객의소리 목록 get 요청
app.get("/qnalist", function (req, res) {
  db.collection("port3_qna")
    .find()
    .toArray(function (err, result) {
      res.render("qnalist", { qnaData: result, userData: req.user });
    });
  //db안에 게시글 콜렉션 찾아서 데이터 전부 꺼내오고 ejs파일로 응답
});

//고객의소리 게시글 작성 페이지 get 요청
app.get("/qnainsert", function (req, res) {
  //게시글 작성페이지 ejs 파일 응답
  res.render("qnainsert", { userData: req.user });
});

//고객의소리 게시글 작성 후 데이터베이스에 넣는 작업 요청
app.post("/qnaadd", function (req, res) {
  //moment 사용해서 현재시간 추가
  db.collection("port3_count").findOne(
    { name: "문의등록" },
    function (err, result) {
      db.collection("port3_qna").insertOne(
        {
          num: result.qnaCount + 1,
          title: req.body.title,
          context: req.body.context,
          author: req.user.userId,
          date: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
        },
        function (err, result) {
          db.collection("port3_count").updateOne(
            { name: "문의등록" },
            { $inc: { qnaCount: 1 } },
            function (err, result) {
              res.redirect("/qnalist"); //게시글 작성 후 게시글 목록경로 요청
            }
          );
        }
      );
    }
  );
});

//고객의소리 게시글 상세화면 get 요청  /:변수명  작명가능
//db안에 해당 게시글번호에 맞는 데이터만 꺼내오고 ejs파일로 응답
app.get("/qnadetail/:no", function (req, res) {
  db.collection("port3_qna").findOne(
    { num: Number(req.params.no) },
    function (err, result1) {
      //게시글 갖고오고 -> 해당 게시글 번호에 맞는 댓글만 갖고오자
      db.collection("port3_comment")
        .find({ comPrd: result1.num })
        .toArray(function (err, result2) {
          //사용자에게 응답 -> 게시글에 관련된 데이터 / 로그인하고 있는 유저정보 / 댓글에 관련된 데이터
          res.render("qnadetail", {
            userData: req.user,
            qnaData: result1,
            commentData: result2,
          });
        });
    }
  );
});

//고객의소리 댓글 작성후 db에 추가하는 요청
app.post("/addcomment", function (req, res) {
  //몇번 댓글인지 번호부여하기 위한
  db.collection("port3_count").findOne(
    { name: "댓글등록" },
    function (err, result1) {
      //해당 게시글의 번호값도 함께 부여! port3_qna
      db.collection("port3_qna").findOne(
        { num: Number(req.body.comId) },
        function (err, result2) {
          //port3_comment 콜렉션에 댓글을 집어넣자!
          db.collection("port3_comment").insertOne(
            {
              comNo: result1.commentCount + 1,
              comPrd: result2.num,
              comContext: req.body.comment_text,
              comAuthor: req.user.userId,
              comDate: moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
            },
            function (err, result) {
              db.collection("port3_count").updateOne(
                { name: "댓글등록" },
                { $inc: { commentCount: 1 } },
                function (err, result) {
                  res.redirect("/qnadetail/" + req.body.comId);
                  //상세페이지에서 댓글입력시 보내준 게시글 번호로 -> 상세페이지 이동하도록 요청
                }
              );
            }
          );
        }
      );
    }
  );
});

//고객의소리 게시글 삭제처리 get 요청
app.get("/deleteqna/:no", function (req, res) {
  //db안에 해당 매장 번호에 맞는 데이터만 삭제 처리
  db.collection("port3_qna").deleteOne(
    { num: Number(req.params.no) },
    function (err, result) {
      //매장 목록페이지로 이동
      res.redirect("/qnalist");
    }
  );
});

//고객의소리 댓글 삭제처리 get 요청
app.get("/deletecomment/:no", function (req, res) {
  //해당댓글의 게시글(부모)번호값을 찾아온 후 댓글을
  //삭제하고 난 다음에는 해당 상세페이지로 다시 이동(게시글번호값)!
  db.collection("port3_comment").findOne(
    { comNo: Number(req.params.no) },
    function (err, result1) {
      db.collection("port3_comment").deleteOne(
        { comNo: Number(req.params.no) },
        function (err, result2) {
          //댓글 삭제후 findOne으로 찾아온 comPrd <--- 게시글(부모)의 번호로 경로 요청
          res.redirect("/qnadetail/" + result1.comPrd);
        }
      );
    }
  );
});

//고객의소리 댓글 수정처리 post요청
app.post("/updatecomment", function (req, res) {
  db.collection("port3_comment").findOne(
    { comNo: Number(req.body.comNo) },
    function (err, result1) {
      db.collection("port3_comment").updateOne(
        { comNo: Number(req.body.comNo) },
        { $set: { comContext: req.body.comContext } },
        function (err, result) {
          res.redirect("/qnadetail/" + result1.comPrd);
        }
      );
    }
  );
});

//마이페이지(회원정보수정) 페이지 요청 경로
app.get("/mypage", function (req, res) {
  res.render("mypage", { userData: req.user });
});

//마이페이지에서 수정한 데이터를 db에 수정반영처리
app.post("/myupdate", function (req, res) {
  //회원정보 콜렉션에 접근해서 해당 아이디에 맞는
  //비번/닉네임/이메일주소/전화번호 수정한걸 변경처리 updateOne

  //원래는 mypage.ejs파일에서 원래 비밀번호 입력창과 / 변경할 비밀번호 입력창
  //조건문으로 db에 있는 비밀번호와 mypage에서 입력한 원래비밀번호가 일치하면

  //db에 있는 로그인한 유저의 비밀번호값은 findOne으로 찾아와서
  //if(mypage에서 입력한 비번과 db에 있는 비밀번호가 똑같다면)
  db.collection("port3_user").findOne(
    { userId: req.user.userId },
    function (err, result1) {
      {
        db.collection("port3_user").findOne(
          { userPass: req.user.userPass },
          function (err, result2) {
            if (req.body.passorigin == result2.userPass) {
              db.collection("port3_user").updateOne(
                { userId: req.user.userId },
                {
                  $set: {
                    userPass: req.body.userPass,
                  },
                },
                function (err, result3) {
                  res.send(
                    "<script>alert('회원정보 수정완료'); location.href='/';</script>"
                  );
                }
              );
            } else {
              res.send(
                "<script>alert('현재 비밀번호를 잘못 입력하셨습니다'); location.href='/mypage';</script>"
              );
            }
          }
        );
      }
    }
  );
});
