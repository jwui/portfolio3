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
      // console.log(userid, userpass);
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

//상점찾기 페이지(사용자)
app.get("/store", (req, res) => {
  db.collection("port3_store")
    .find({})
    .toArray((err, result) => {
      res.render("store", { storeData: result });
    });
});
