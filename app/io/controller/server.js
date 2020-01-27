'use strict'

module.exports = app => {
  class Controller extends app.Controller {
    async botkitToServer(){
      let sid = this.ctx.socket.id  //发送消息方的id
      const message = this.ctx.args[0]
      console.log('botkitToServer:', message, sid)
      //this.ctx.socket.emit('serverToLogin', message)
      this.ctx.socket.emit(sid, message)
    }
  }
  return Controller
}

