const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const {init: initDB, User, Job, User_Job_Favourite} = require("./db");
const axios = require("axios");
const {nanoid} = require('nanoid')

const router = new Router();

const AppId = "wx874904c38445429a"


// 登录和自动注册
router.get("/api/login", async (ctx) => {
    // 获取微信 Open ID
    const openid = ctx.request.headers["x-wx-openid"]
    const user = await User.findOne({
        where: {
            wx_openid: openid
        }
    })
    if (user === null) {  // 如果是第一次登录则自动注册
        const newUser = await User.create({
            nickname: "微信用户" + nanoid(),
            avatarURL: "https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132",
            wx_openid: openid
        })
        console.log("用户" + openid + "已注册")
        ctx.body = {
            code: 0,
            msg: `${openid}已注册并登录成功！`,
            data: {
                id: newUser.id,
                nickname: newUser.nickname,
                avatarURL: newUser.avatarURL,
            }
        };
    } else {
        ctx.body = {
            code: 0,
            msg: `${openid}已登录成功！`,
            data: {
                id: user.id,
                nickname: user.nickname,
                avatarURL: user.avatarURL,
            }
        }
    }
});

router.post("/api/jobsList", async ctx => {
    const {startIndex, endIndex} = ctx.request.body
    const jobs = await Job.findAll({
        raw: true,
        attributes: {
            exclude: ['publishedBy', 'updatedAt']
        }
    })
    const selectedJobs = jobs.slice(startIndex, endIndex + 1)
    // console.log(selectedJobs)
    ctx.body = {
        code: 0,
        msg: `${startIndex}到${startIndex + selectedJobs.length}jobs查询成功`,
        data: selectedJobs
    }
})

router.post("/api/jobDetail", async ctx => {
    const {jobId} = ctx.request.body
    const job = await Job.findByPk(jobId, {
        attributes: {
            exclude: ['updatedAt']
        }
    })
    const publisher = await job.getPublisher({
        raw: true,
        attributes: ['nickname', 'avatarURL']
    })
    const userId = findIdByOpenId(ctx.request.headers["x-wx-openid"])
    const isFavourite = await User_Job_Favourite.findOne({
        where: {
            UserId: userId,
            JobId: job.id
        }
    })
    ctx.body = {
        code: 0,
        msg: `User${openid}search job${jobId}详情成功`,
        data: {
            ...job.toJSON(),
            publisher,
            favourite: Boolean(isFavourite)
        }
    }
})

router.post("/api/intentionsList", async ctx => {

})

router.post("/api/addJob", async ctx => {
    const userId = findIdByOpenId(ctx.request.headers["x-wx-openid"])
    const jobFormData = ctx.request.body

    const obj = {
        ...jobFormData,
        publishedBy: userId
    }
    console.log(obj)

    const newJob = await Job.create(obj)
    ctx.body = {
        code: 0,
        msg: `职位${newJob.jobName}ByUser${user.id}添加成功`
    }
})

router.post("/api/addIntention", async ctx => {

})

const app = new Koa();
app
    .use(logger())
    .use(bodyParser())
    .use(router.routes())
    .use(router.allowedMethods());

const port = process.env.PORT || 80;

async function bootstrap() {
    await initDB();
    app.listen(port, () => {
        console.log("启动成功", port);
    });
}

bootstrap();

// 更新计数
// router.post("/api/count", async (ctx) => {
//   const { request } = ctx;
//   const { action } = request.body;
//   if (action === "inc") {
//     await Counter.create();
//   } else if (action === "clear") {
//     await Counter.destroy({
//       truncate: true,
//     });
//   }
//
//   ctx.body = {
//     code: 0,
//     data: await Counter.count(),
//   };
// });

async function findIdByOpenId(openid) {
    const user = await User.findOne({
        where: {
            wx_openid: openid
        },
        attributes: ['id']
    })
    return user.id
}