const { Botkit, BotkitConversation } = require('botkit')
const { WebAdapter } = require('botbuilder-adapter-web')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const dbAdapter = new FileSync('db.json')
const db = low(dbAdapter)
const adapter = new WebAdapter()
const controller = new Botkit({
  adapter,
  // ...other options
})
const app = require('express')()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

io.on('connection', function(socket){
  console.log('socket.io connected')
  socket.on('msg',function (data) {
    console.log(data)
    socket.emit('msg', data)//对用户自己的
    //socket.broadcast.emit('showMsg', {userSay,userName})//广播的
  })
})
http.listen(3333, function(){
  console.log('socket.io listening on *:3333')
})


class AppBootHook {
  constructor(app) {
    this.app = app
    this.app.db = db
    this.app.BotkitConversation = BotkitConversation
    this.app.bkController = controller
    this.app.DIALOG_ID_start = 'dialogID_1'
    this.app.DIALOG_ID_HOMEWORK = 'dialogID_2'
    this.app.DIALOG_ID_LESSON_FIND = 'dialogID_3'
    this.app.DIALOG_ID_LESSON_ADDONE = 'dialogID_4'
  }
  
  async serverDidReady() {
    // this.app.listen(8090, ()=>{})
    console.log('node server已启动，开始接受外部请求')
  }
}


module.exports = AppBootHook
