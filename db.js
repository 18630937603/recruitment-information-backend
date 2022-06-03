const {Sequelize, DataTypes} = require("sequelize");

// 从环境变量中读取数据库配置
const {MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = ""} = process.env;

const [host, port] = MYSQL_ADDRESS.split(":");

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
    host,
    port,
    dialect: "mysql" /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */,
});


// 用户
const User = sequelize.define("User", {
    nickname: DataTypes.STRING, // 微信昵称
    avatarURL: DataTypes.STRING, // 头像URL
    // currentType: DataTypes.INTEGER, // 0为求职者，1为招聘者
    wx_openid: {
        type: DataTypes.STRING,
        unique: true
    },
})

// 工作
const Job = sequelize.define("Job", {
    jobName: DataTypes.STRING, // 职位名称
    minSalary: DataTypes.INTEGER, // 最低工资，人民币
    maxSalary: DataTypes.INTEGER, // 最高工资，人民币
    city: DataTypes.STRING, // 所处城市
    companyName: DataTypes.STRING, // 所属公司名称，必填
    address: DataTypes.STRING, // 工作地详细地址
    educationalRequirements: DataTypes.STRING, // 学历要求
    jobRequirements: DataTypes.STRING, // 岗位要求
    jobIntroduction: DataTypes.STRING, // 岗位简介
    contact: DataTypes.STRING // 联系方式
})

// 求职意愿
const Intention = sequelize.define("Intention", {
    preferredJobType: DataTypes.STRING, // 期望的工作类型
    salaryExpectation: DataTypes.INTEGER,
    cityExpectation: DataTypes.STRING,
    description: DataTypes.STRING, // 描述
    bindResume: DataTypes.BOOLEAN // 是否绑定简历
})

// 简历
const Resume = sequelize.define("Resume", {
    name: DataTypes.STRING, // 真实姓名
    sex: DataTypes.INTEGER, // 0为男，1为女
    selfIntroduction: DataTypes.STRING, // 自我介绍
    educationalBackground: DataTypes.STRING, // 学历(本科、硕士等)
    graduatedFrom: DataTypes.STRING, // 毕业院校名称
    portraitURL: DataTypes.STRING, // 个人照片URL
    fileURL: DataTypes.STRING // 附件简历URL
})

User.hasMany(Job)
User.hasMany(Intention)
User.hasOne(Resume)
Job.belongsTo(User)
Intention.belongsTo(User)
Resume.belongsTo(User)


// 数据库初始化方法
async function init() {
    await sequelize.sync({alter: true})
}

// 导出初始化方法和模型
module.exports = {
    init,
    User,
    Job,
    Intention,
    Resume
};
