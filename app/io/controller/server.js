'use strict'

module.exports = app => {
  class Controller extends app.Controller {
    async botkitToServer(){
        const message = this.ctx.args[0]
        console.log('botkitToServer:', message)
        this.ctx.socket.emit('serverToLogin', message)
    }
  }
  return Controller
}

