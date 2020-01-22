const Controller = require('egg').Controller;

class ChatController extends Controller {
    // 渲染模版
    async index() {
        await this.ctx.render('chat.tpl');
    }
}

module.exports = ChatController;