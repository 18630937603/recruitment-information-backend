const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const {init: initDB, User, Job, User_Job_Favourite, Intention} = require("./db");
const axios = require("axios");
const {nanoid} = require('nanoid')

const router = new Router();

const APPID = "wx874904c38445429a"

// api about user
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
            // nickname: "微信用户" + nanoid(),
            nickname: "微信用户",
            avatarURL: "https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132",
            wx_openid: openid
        })
        console.log("用户" + JSON.stringify(newUser) + "已注册")
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
        console.log("用户" + openid + "已登录")
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
router.post("/api/editProfile", async ctx => {
    const newProfile = ctx.request.body
    const user = await User.findOne({
        where: {
            wx_openid: ctx.request.headers["x-wx-openid"]
        }
    })
    await user.update(newProfile)
    ctx.body = {
        code: 0,
        msg: `${JSON.stringify(newProfile)}已更新User`
    }
})

// api about jobs
router.post("/api/jobsList", async ctx => {
    const {startIndex, endIndex} = ctx.request.body
    const jobs = await Job.findAll({
        raw: true,
        attributes: {
            exclude: ['publishedBy', 'updatedAt']
        }
    })
    const selectedJobs = jobs.slice(startIndex, endIndex + 1)
    ctx.body = {
        code: 0,
        msg: `${startIndex}到${startIndex + selectedJobs.length}jobs查询成功`,
        data: selectedJobs
    }
    console.log(`${startIndex}到${startIndex + selectedJobs.length}jobs查询成功`)
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
    const userId = await findIdByOpenId(ctx.request.headers["x-wx-openid"])
    const isFavourite = await User_Job_Favourite.findOne({
        where: {
            UserId: userId,
            JobId: job.id
        }
    })
    ctx.body = {
        code: 0,
        msg: `User${userId}search job${jobId}详情成功`,
        data: {
            ...job.toJSON(),
            publisher,
            favourite: Boolean(isFavourite)
        }
    }
})
router.post("/api/addJob", async ctx => {
    const userId = await findIdByOpenId(ctx.request.headers["x-wx-openid"])
    const formData = ctx.request.body
    const result = await Job.create({
        ...formData,
        publishedBy: userId
    })
    ctx.body = {
        code: 0,
        msg: `职位${result.jobName}添加成功`
    }
})
router.post("/api/removeJob",async ctx => {
    const {jobId} = ctx.response.body
    const job = await Job.findByPk(jobId)
    if(job) {
        await job.destroy()
        ctx.body = {
            err: 0,
            msg: `job${jobId}删除成功！`
        }
    }else {
        ctx.body = {
            err: 1,
            msg: `查无此job！`
        }
    }
})
router.post("/api/publishedJobsList", async ctx => {
    const user = await User.findOne({
        where: {
            wx_openid: ctx.request.headers["x-wx-openid"]
        }
    })
    const publishedJobs = await user.getPublishedJobs({
        raw: true,
        attributes: {
            exclude: ['publishedBy', 'updatedAt']
        }
    })
    ctx.body = {
        code: 0,
        msg: `发布的工作查询成功!`,
        data: publishedJobs
    }
})


// api about intentions
router.post("/api/intentionsList", async ctx => {
    const {startIndex, endIndex} = ctx.request.body
    const intentions = await Intention.findAll({
        attributes: {
            exclude: ['updatedAt']
        }
    })
    const selectedIntentions = intentions.slice(startIndex, endIndex + 1)
    let result = []
    for (let intentionInstance of selectedIntentions) {
        const user = await intentionInstance.getPublisher({
            raw: true,
            attributes: ['nickname', 'avatarURL']
        })
        result.push({
            ...intentionInstance.toJSON(),
            user
        })
    }

    ctx.body = {
        code: 0,
        msg: `${startIndex}到${startIndex + result.length}intentions查询成功`,
        data: result
    }
    console.log(`${startIndex}到${startIndex + result.length}intentions查询成功`)
})
router.post("/api/addIntention", async ctx => {
    const userId = await findIdByOpenId(ctx.request.headers["x-wx-openid"])
    const formData = ctx.request.body
    const result = await Intention.create({
        ...formData,
        publishedBy: userId
    })
    ctx.body = {
        code: 0,
        msg: `意向发布成功`
    }
})

// api about favourite
router.post("/api/favourite", async ctx => {
    const user = await User.findOne({
        where: {
            wx_openid: ctx.request.headers["x-wx-openid"]
        }
    })
    const {op, jobId} = ctx.request.body
    if (op === "add") {
        await user.addFavJob(+jobId)
        ctx.body = {
            code: 0,
            msg: `用户${user.id}将job${jobId}添加到收藏成功`
        }
    } else if (op === "remove") {
        await user.removeFavJob(+jobId)
        ctx.body = {
            code: 0,
            msg: `用户${user.id}将job${jobId}取消收藏成功`
        }
    }
})
router.post("/api/favJobsList", async ctx => {
    const {startIndex, endIndex} = ctx.request.body
    const user = await User.findOne({
        where: {
            wx_openid: ctx.request.headers["x-wx-openid"]
        }
    })
    const favJobs = await user.getFavJob({
        raw: true,
        attributes: {
            exclude: ['publishedBy', 'updatedAt']
        }
    })
    const selectedFavJobs = favJobs.slice(startIndex, endIndex + 1)
    ctx.body = {
        code: 0,
        msg: `${startIndex}到${startIndex + selectedFavJobs.length}favJobs查询成功!`,
        data: selectedFavJobs
    }
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


async function findIdByOpenId(openid) {
    const user = await User.findOne({
        where: {
            wx_openid: openid
        },
        attributes: ['id']
    })
    return user.id
}