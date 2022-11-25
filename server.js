const express = require("express");
const MongoClient = require("mongodb").MongoClient;

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const multer = require("multer");

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
  res.render("admin_login"); // admin_login.ejs 파일로 응답
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
passport.deserializeUser(function (userId, done) {
  db.collection("port3_user").findOne(
    { userId: userId },
    function (err, result) {
      done(null, result);
    }
  );
});

//관리자 화면 로그인 유무 확인
app.post(
  "/admin",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  (req, res) => {
    res.redirect("/admin/store");
    console.log(req.user);
    //로그인 성공시 관리자 매장등록 페이지로 이동
  }
);

//로그인 실패시 fail경로
app.get("/fail", (req, res) => {
  res.send("로그인 실패");
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
      res.render("events", { eventData: result, userData: req.user });
    });
  //db안에 게시글 콜렉션 찾아서 데이터 전부 꺼내오고 ejs파일로 응답
});

//이벤트 작성 페이지 get 요청
app.get("/admin/eventinsert", function (req, res) {
  //이벤트 작성페이지 ejs 파일 응답
  res.render("eventupt", { userData: req.user });
});

//게시글 작성 후 데이터베이스에 넣는 작업 요청
app.post("/add", upload.single("filetest"), function (req, res) {
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
          brdid: result1.totalBoard + 1,
          brdtitle: req.body.title,
          brdcontext: req.body.context,
          fileName: fileUpload,
        },
        function (err, result2) {
          db.collection("port3_count").updateOne(
            { name: "이벤트등록" },
            { $inc: { totalBoard: 1 } },
            function (err, result3) {
              res.redirect("/admin/events" + (result1.totalBoard + 1)); //게시글 작성 후 게시글 목록경로 요청
            }
          );
        }
      );
    }
  );
});
