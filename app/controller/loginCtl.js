const Controller = require('egg').Controller
const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const createEncrypt = require('../createEncrypt.js')


class LoginController extends Controller {
    // 渲染模版
    async index() {
        await this.ctx.render('login.tpl');
    }

    // 输出密钥.
    async encrypt() {
        const paramsRule = {
            username: 'string',
            password: 'string'
        };

        const ctx = this.ctx;
        const body = ctx.request.body;

        // 如果参数校验未通过，将会抛出一个 status = 422 的异常
        ctx.validate(paramsRule, body);

        // 获取接口配置数据.
        let xmppSetData = await this.ctx.curl('https://dev.fsll.tech:8443/startalk_nav');
        xmppSetData = JSON.parse(xmppSetData.data.toString());
        //console.log(xmppSetData);

        // 获取fullkey.
        let FULLKEY = await this.ctx.curl(`${xmppSetData.baseaddess.javaurl}/qtapi/nck/rsa/get_public_key.do`);
        FULLKEY = JSON.parse(FULLKEY.data.toString());

        const encrypt = raw => (
            createEncrypt({
                key: FULLKEY.data.pub_key_fullkey,
                padding: 1
            }, raw).toString('base64')
        );

        if (xmppSetData.Login.loginType === 'password') {
            const uinfo = {
                p: body.password,
                a: 'testapp',
                u: body.username,
                d: dayjs().format('YYYY-MM-DD HH:mm:ss')
            };
            const encrypted = encrypt(new Buffer(JSON.stringify(uinfo)));
            
            ctx.body = {
                success: true,
                data: encrypted.toString('base64')
            };
            ctx.status = 200;
        }
    }


    async retjs(){
        let ctx = this.ctx
        let url = ctx.request.url
        let filePath = path.resolve(__dirname, '../') + '/public/js' + url
        console.log(filePath)
        ctx.type = 'js'
        ctx.body = fs.createReadStream(filePath)
    }
}

module.exports = LoginController;