let ws_url
if(location.host.match('localhost') || location.host.match('127.0.0.1')){
    ws_url = 'ws://localhost:3000'
} else if (!location.host){
    ws_url = 'ws://localhost:3000'
} else {
    if(location.host.match(':')){
        ws_url = 'ws://'+location.host.split(':')[0]+':3000'
    } else {
        ws_url = 'ws://'+location.host+':3000'
    }
}
console.log('ws_url:'+ws_url)


// let socketIO
// function openSocketIO(){
//     socketIO = io('/', {transports: ['polling','websocket']})
//     socketIO.on('connect', function(){
//         console.log('socket.io connected, id:'+socketIO.id)
//     })
//     socketIO.on('disconnect', function(){
//         console.log('socket.io disconnected!')
//     })
// }
// openSocketIO()

socketIO = io('/', {transports: ['polling','websocket']})
socketIO.on('connect', function(){
    console.log('socket.io connected, id:'+socketIO.id)
})
socketIO.on('disconnect', function(){
    console.log('socket.io disconnected!')
})

let msgParams

let converter = new showdown.Converter()
converter.setOption('openLinksInNewWindow', true)

let ifBotkitUser = false

const BASE_WEBSOCKET_URL = 'wss://dev.fsll.tech:8443/websocket/';

// strophe连接xmpp服务器句柄 操作xml数据使用.
let connection;


let contact = [], // 联系人.
    chatType = 'single'; // 聊天类型.

// 消息uuid.
const UUID = createUUID();



var Botkit = {
    config: {
        //ws_url: (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host,
        ws_url: ws_url,
        reconnect_timeout: 3000,
        max_reconnect: 5,
        enable_history: false,
    },
    options: {
        use_sockets: true,
    },
    reconnect_count: 0,
    guid: null,
    current_user: null,
    on: function (event, handler) {
        console.log('Botkit on')
    },
    trigger: function (event, details) {
        var event = new CustomEvent(event, {
            detail: details
        });
        //this.message_window.dispatchEvent(event);
    },
    request: function (url, body) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var xmlhttp = new XMLHttpRequest();

            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                    if (xmlhttp.status == 200) {
                        var response = xmlhttp.responseText;
                        if (response !='') {
                            var message = null;
                            try {
                                message = JSON.parse(response);
                            } catch (err) {
                                reject(err);
                                return;
                            }
                            resolve(message);
                        } else {
                            resolve([]);
                        }
                    } else {
                        reject(new Error('status_' + xmlhttp.status));
                    }
                }
            };
            xmlhttp.open("POST", url, true);
            xmlhttp.setRequestHeader("Content-Type", "application/json");
            xmlhttp.send(JSON.stringify(body));
        });
    },
    send: function (text, e) {  //botkit发送消息
        var that = this;
        if (e) e.preventDefault();
        if (!text) {
            return;
        }
        var message = {
            type: 'outgoing',
            text: text
        };

        this.clearReplies();
        that.renderMessage(message);

        that.deliverMessage({
            type: 'message',
            text: text,
            user: this.guid,
            channel: this.options.use_sockets ? 'websocket' : 'webhook'
        });
        //this.input.value = '';

        this.trigger('sent', message);

        return false;
    },
    deliverMessage: function (message) {
        console.log('deliverMessage', message)
        if (this.options.use_sockets) {
            this.socket.send(JSON.stringify(message));
        } else {
            this.webhook(message);
        }
    },
    getHistory: function (guid) {
        var that = this;
        if (that.guid) {
            that.request('/botkit/history', {
                user: that.guid
            }).then(function (history) {
                if (history.success) {
                    that.trigger('history_loaded', history.history);
                } else {
                    that.trigger('history_error', new Error(history.error));
                }
            }).catch(function (err) {
                that.trigger('history_error', err);
            });
        }
    },
    webhook: function (message) {
        var that = this;
        that.request('/api/messages', message).then(function (messages) {
            messages.forEach((message) => {
                that.trigger(message.type, message);
            });
        }).catch(function (err) {
            that.trigger('webhook_error', err);
        });

    },
    connect: function (user) {
        var that = this;
        if (user && user.id) {
            Botkit.setCookie('botkit_guid', user.id, 1);
            user.timezone_offset = new Date().getTimezoneOffset();
            that.current_user = user;
            console.log('CONNECT WITH USER', user);
        }
        // connect to the chat server!
        if (that.options.use_sockets) {
            that.connectWebsocket(that.config.ws_url);
        } else {
            that.connectWebhook();
        }
    },
    connectWebhook: function () {
        var that = this;
        if (Botkit.getCookie('botkit_guid')) {
            that.guid = Botkit.getCookie('botkit_guid');
            connectEvent = 'welcome_back';
        } else {
            that.guid = that.generate_guid();
            Botkit.setCookie('botkit_guid', that.guid, 1);
        }

        if (this.options.enable_history) {
            that.getHistory();
        }

        // connect immediately
        that.trigger('connected', {});
        that.webhook({
            type: connectEvent,
            user: that.guid,
            channel: 'webhook',
        });

    },
    connectWebsocket: function (ws_url) {
        var that = this;
        // Create WebSocket connection.
        that.socket = new WebSocket(ws_url);

        var connectEvent = 'hello';
        if (Botkit.getCookie('botkit_guid')) {
            that.guid = Botkit.getCookie('botkit_guid');
            connectEvent = 'welcome_back';
        } else {
            that.guid = that.generate_guid();
            Botkit.setCookie('botkit_guid', that.guid, 1);
        }

        if (this.options.enable_history) {
            that.getHistory();
        }

        // Connection opened
        that.socket.addEventListener('open', function (event) {
            console.log('CONNECTED TO SOCKET');
            that.reconnect_count = 0;
            that.trigger('connected', event);
            that.deliverMessage({
                type: connectEvent,
                user: that.guid,
                channel: 'socket',
                user_profile: that.current_user ? that.current_user : null,
            })
        })

        that.socket.addEventListener('error', function (event) {
            console.error('ERROR', event)
        })

        that.socket.addEventListener('close', function (event) {
            console.log('SOCKET CLOSED!');
            that.trigger('disconnected', event);
            if (that.reconnect_count < that.config.max_reconnect) {
                setTimeout(function () {
                    console.log('RECONNECTING ATTEMPT ', ++that.reconnect_count);
                    that.connectWebsocket(that.config.ws_url);
                }, that.config.reconnect_timeout);
            } else {
                that.message_window.className = 'offline';
            }
        })

        // Listen for messages 这里监听服务端接收数据
        that.socket.addEventListener('message', function (event) {
            var message = null
            try {
                message = JSON.parse(event.data)
            } catch (err) {
                that.trigger('socket_error', err)
                return
            }
            message.sid = socketIO.id
            console.log('strophe listen', message)
            // that.trigger(message.type, message)
            // socketIO.emit('botkitToServer', message)  //服务端机器人回馈的消息，然后将其转发至socket.IO服务端
            
        })
    },
    clearReplies: function () {
        //this.replies.innerHTML = '';
    },
    quickReply: function (payload) {
        this.send(payload);
    },
    focus: function () {
        this.input.focus();
    },
    renderMessage: function (message) {
        console.log('renderMessage', message)
    },
    triggerScript: function (script, thread) {
        this.deliverMessage({
            type: 'trigger',
            user: this.guid,
            channel: 'socket',
            script: script,
            thread: thread
        });
    },
    identifyUser: function (user) {
        user.timezone_offset = new Date().getTimezoneOffset();
        this.guid = user.id;
        Botkit.setCookie('botkit_guid', user.id, 1);
        this.current_user = user;
        this.deliverMessage({
            type: 'identify',
            user: this.guid,
            channel: 'socket',
            user_profile: user,
        });
    },
    receiveCommand: function (event) {
        switch (event.data.name) {
            case 'trigger':
                console.log('TRIGGER', event.data.script, event.data.thread);
                Botkit.triggerScript(event.data.script, event.data.thread);
                break;
            case 'identify':
                console.log('IDENTIFY', event.data.user);
                Botkit.identifyUser(event.data.user);
                break;
            case 'connect':
                Botkit.connect(event.data.user);
                break;
            default:
                console.log('UNKNOWN COMMAND', event.data);
        }
    },
    sendEvent: function (event) {
        if (this.parent_window) {
            this.parent_window.postMessage(event, '*');
        }
    },
    setCookie: function (cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    },
    getCookie: function (cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },
    generate_guid: function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
               s4() + '-' + s4() + s4() + s4();
    },
    boot: function (user) {
        console.log('Booting up');
        var that = this;
        that.on('connected', function () {
            that.sendEvent({
                name: 'connected'
            });
        })

        that.on('disconnected', function () {
            that.message_window.className = 'disconnected';
            that.input.disabled = true;
        });

        that.on('webhook_error', function (err) {
            alert('Error sending message!');
            console.error('Webhook Error', err);
        });

        that.on('typing', function () {
            that.clearReplies();
            that.renderMessage({
                isTyping: true
            });
        });

        that.on('sent', function () {
            // do something after sending
        });

        that.on('message', function (message) {
            console.log('RECEIVED MESSAGE', message);
            that.renderMessage(message);
        });

        that.on('message', function (message) {
            if (message.goto_link) {
                window.location = message.goto_link;
            }
        });

        that.on('message', function (message) {
            that.clearReplies();
            if (message.quick_replies) {
                var list = document.createElement('ul');
                var elements = [];
                for (var r = 0; r < message.quick_replies.length; r++) {
                    (function (reply) {
                        var li = document.createElement('li');
                        var el = document.createElement('a');
                        el.innerHTML = reply.title;
                        el.href = '#';
                        el.onclick = function () {
                            that.quickReply(reply.payload);
                        }
                        li.appendChild(el);
                        list.appendChild(li);
                        elements.push(li);

                    })(message.quick_replies[r]);
                }

                that.replies.appendChild(list);
                if (message.disable_input) {
                    that.input.disabled = true;
                } else {
                    that.input.disabled = false;
                }
            } else {
                that.input.disabled = false;
            }
        });

        that.on('history_loaded', function (history) {
            if (history) {
                for (var m = 0; m < history.length; m++) {
                    that.renderMessage({
                        text: history[m].text,
                        type: history[m].type == 'message_received' ? 'outgoing' : 'incoming', // set appropriate CSS class
                    });
                }
            }
        });

        if (window.self !== window.top) {
            that.parent_window = window.parent;
            window.addEventListener("message", that.receiveCommand, false);
            that.sendEvent({
                type: 'event',
                name: 'booted'
            });
            console.log('Messenger booted in embedded mode');
        } else {
            console.log('Messenger booted in stand-alone mode');
            that.connect(user);
        }

        return that;
    }
}

// (function (){
//     Botkit.boot()
// })()
Botkit.boot()






// 聊天类型切换.
$('button.single-chat').click(function() {
    // contact = [];
    // chatType = 'single';
    // $(this).addClass('active');
    // $('.show-msg').empty();
    // $('.chat .send-to-tip').empty();
    // $('button.mut-chat').removeClass('active');
    // $('.chat .user-list >li').removeClass('active');
});

/** xmpp服务器连接状态 **/
// status contains:
// ERROR: 0,            错误
// CONNECTING: 1,       连接中
// CONNFAIL: 2,         连接失败
// AUTHENTICATING: 3,   认证中
// AUTHFAIL: 4,         认证失败
// CONNECTED: 5,        已连接
// DISCONNECTED: 6,     已断开连接
// DISCONNECTING: 7,    断开连接中
// ATTACHED: 8,         附加
// REDIRECT: 9,         重定向
// CONNTIMEOUT: 10      连接超时
function onConnect(status, connection) {
    switch (status) {
        case Strophe.Status.ERROR:
            console.log('错误');
            break;

        case Strophe.Status.CONNECTING:
            console.log('正在连接xmpp服务器');
            break;

        case Strophe.Status.AUTHENTICATING:
            console.log('正在登录');
            break;

        case Strophe.Status.AUTHFAIL:
            console.log('登录失败');
            break;

        case Strophe.Status.DISCONNECTING:
            console.log('正在断开连接');
            break;

        case Strophe.Status.CONNTIMEOUT:
            console.log('连接超时');
            break;

        case Strophe.Status.DISCONNECTED:
            console.log('连接断开');
            break;

        case Strophe.Status.CONNECTED:
            console.log('登录成功');

            const jid = connection.jid;
            const currentId = Strophe.getNodeFromJid(jid); // u
            const domain = Strophe.getDomainFromJid(jid); // d
            // t 当前时间戳
            // k md5(key + t)

            // 发送消息.
            $('.chat .send').click(function () {
                if (!contact.length) {
                    alert('请选择一个联系人或群');
                    return;
                }
                //console.log('contact', contact)

                let params = {
                    isHiddenMsg: '0',
                    from: currentId + '@' + domain,
                    type: chatType === 'single' ? 'chat' : 'groupchat'
                };

                if(chatType === 'single') {
                    params.to = contact[0].user + '@' + domain;
                }
                if (chatType === 'muc') {
                    params.to = contact[0].user;
                }

                // 获取聊天内容.
                const content = removeHTMLTag($('.chat .send-chat').html());
                console.log('发送方发送消息：', content)
                
                // 创建一个<message>元素并发送
                connection.send($msg(params).c('body', {
                    maType: 6,
                    msgType: 1,
                    id: UUID
                }).t(content).up().c('active', {
                    xmlns: 'http://jabber.org/protocol/chatstates'
                }))

                // 清空聊天输入框.
                $('.chat .send-chat').empty();

                // 追加最新消息.（发送方）
                if (chatType === 'single'){
                    $('.show-msg').append(`<div class="show-msg-item">
                                                <p>${content}</p>
                                            </div>`);
                }

                // 滚动条保持在底部.
                keepScrollToBottom('.show-msg');
            });

            // 用户列表点击(聊天).
            $('.chat .user-list').delegate('li', 'click', function (){
                chatType = 'single';

                // 单聊 只能选择一个联系人.
                if (chatType === 'single') {
                    $('.chat .user-list >li').removeClass('active');
                    $(this).addClass('active');
    
                    contact = [{
                        name: $(this).data('name'),
                        user: $(this).data('user')
                    }];

                    // 设置提示信息.
                    $('.chat .send-to-tip').html(`给${contact[0].name}发送信息`);

                    // 获取相关用户的聊天列表.
                    getChatAndRender({
                        from: currentId,
                        to: contact[0].user,
                        chatBox: '.show-msg'
                    });
                }

                // 群聊 多个联系人.
                // if (chatType === 'muc') {
                //     // 添加.
                //     if (!$(this).hasClass('active')) {
                //         $(this).addClass('active');
                //         contact.push({
                //             user: $(this).data('user'),
                //             name: $(this).data('name')
                //         });
                //     }else { // 移除.
                //         $(this).removeClass('active');
                //         contact = contact.filter(c => c.name !== $(this).data('name'));
                //     }

                //     let nameList = contact.map(c => c.name).join(',');

                //     // 设置提示信息.
                //     $('.chat .send-to-tip').html(`和${nameList}聊天&emsp;<button class="group-btn active" style="width: 60px;padding:2px 5px;">确定</button>`);
                //     $('button.group-btn').click(function() {
                //         const ID = createUUID();

                //         // 先创建群.
                //         const iq = $iq({
                //             id: ID,
                //             to: `${ID}@conference.${domain}`,
                //             type: 'set'
                //         }).c('query', { xmlns: 'http://jabber.org/protocol/create_muc' });
                //         connection.send(iq);

                //         // 监听创建结果.
                //         connection.addHandler(iq => {
                //             // 创建成功.
                //             if ($(iq).find('create_muc').attr('result') === 'success') {
                //                 // 更新群名片.

                //                 // 拉人.
                //                 // const uiq = $iq({
                //                 //     id: ID,
                //                 //     type: 'set',
                //                 //     to: `${ID}@conference.${domain}`
                //                 // }).c('query', {
                //                 //     xmlns: 'http://jabber.org/protocol/muc#invite_v2'
                //                 // });
                //                 // contact.forEach(c => {
                //                 //     uiq.c('invite', c.user).up();
                //                 // });
                //                 // connection.send(uiq);
                //             }else {
                //                 alert('创建群失败');
                //             }

                //         }, null, 'iq', 'result', ID);
                //     });
                // }
            });

            // 群点击(聊天).
            $('.chat .group-list').delegate('li', 'click', function() {
                chatType = 'muc';

                contact = [{
                    name: $(this).data('name'),
                    user: $(this).data('user')
                }];

                const groupParams = {
                    num: 20,
                    direction: 0,
                    domain: domain,
                    time: +new Date,
                    muc: $(this).data('user').split('@').shift()
                };
                
                axios.post('/package/qtapi/getmucmsgs.qunar', groupParams, {
                    headers: {
                        'x-csrf-token': $.cookie('csrfToken')
                    }
                }).then(res => {
                    if(res.data.ret) {
                        let chatStr = ``;

                        res.data.data.forEach(c => {
                            // 系统消息.
                            if (c.host === `conference.${domain}`) {
                                chatStr += `<b>${c.body.content}</b>`;
                            }

                            // 用户发送的消息.
                            if(c.host === domain) {
                                if (c.body.msgType == 1) {
                                    const { content } = c.body;
                                    let res;

                                    // 如果不是纯文本消息.
                                    if (content.startsWith('[obj')) {
                                        res = getMediaContent(content);
                                    } else {
                                        res = content;
                                    }

                                    if (c.nick.split('_').shift() === currentId) {
                                        chatStr += `<div class="show-msg-item">
                                            <p>${res}</p>
                                        </div>`;
                                    }else {
                                        chatStr += `<div class="show-msg-item member">
                                            <span style="display: block;font-size: 12px;color: #777;">${c.nick.split('_').shift()}</span>
                                            <p>${res}</p>
                                        </div>`;
                                    }
                                }
                            }
                        });

                        $('.show-msg').html(chatStr);
                        keepScrollToBottom('.show-msg');
                    }
                });
            });

            // 设置ckey.
            connection.addHandler(msg => {
                const key = msg.getAttribute('key_value');
                const t = `${new Date().getTime()}`;

                // 生成ckey.
                const ckey = window.btoa(`u=${currentId}&k=${$.md5(key + t).toUpperCase()}&d=${domain}&t=${t}`);

                // 将ckey写入cookie.
                document.cookie = `q_ckey=${ckey}; path=/;`;

                // 查询当前用户的会话列表.
                axios.post('/package/qtapi/getrbl.qunar', {
                    domain: domain,
                    user: currentId
                }, {
                    headers: {
                        'x-csrf-token': $.cookie('csrfToken')
                    }
                }).then(res => {
                    if (res.data.ret) {
                        // 渲染会话列表.
                        console.log('用户数据', res.data.data)
                        let list = res.data.data,
                            userStr = ``, groupStr = ``, mucList = [], singleList = [];
                        
                        list.forEach(chat => {
                            const CHAT_TYPE = $(chat.xmlBody).attr('type');

                            // 单聊收集列表.
                            if (CHAT_TYPE === 'chat') {
                                singleList.push(chat);
                            }

                            // 群聊收集列表.
                            if (CHAT_TYPE === 'groupchat') {
                                mucList.push(chat);
                            }
                        });

                        // 群聊和单聊都需要获取群名片或者用户名片
                        // 所以这里并行处理两种类型名片的获取.
                        const GET_CARD_INFO = (url, params) => {
                            return new Promise((resolve, reject) => {
                                axios.post(url, params, {
                                    headers: {
                                        'x-csrf-token': $.cookie('csrfToken')
                                    }
                                }).then(res => {
                                    resolve(res.data);
                                }).catch(err => {
                                    reject(err);
                                });
                            });
                        };

                        // 参数配置.
                        // 群参数.
                        let groupParams = [{
                            mucs: [],
                            domain: `conference.${domain}`
                        }], userParams = [{
                            users: [],
                            domain: domain
                        }];
                        mucList.forEach(s => {
                            groupParams[0].mucs.push({
                                version: 0,
                                muc_name: s.user
                            });
                        });
                        singleList.forEach(s => {
                            userParams[0].users.push({
                                version: 0,
                                user: s.user
                            });
                        });

                        const USER_CARD = GET_CARD_INFO(`/newapi/domain/get_vcard_info.qunar?u=${currentId}&k=${key}`, userParams);
                        const GROUP_CARD = GET_CARD_INFO(`/newapi/muc/get_muc_vcard.qunar?u=${currentId}&k=${key}`, groupParams);

                        Promise.all([USER_CARD, GROUP_CARD]).then(data => {
                            if(data[0].ret && data[1].ret) {
                                const USER_LIST = data[0].data[0].users;
                                const GROUP_LIST = data[1].data[0].mucs;

                                USER_LIST.forEach(u => {
                                    userStr += `<li data-user="${u.username}" data-name="${u.nickname}">
                                                <span>${u.nickname}</span>
                                            </li>`;
                                });

                                GROUP_LIST.forEach(g => {
                                    groupStr += `<li data-user="${g.MN}" data-name="${g.SN}">
                                                    <span>${g.SN}</span>
                                                </li>`;
                                });

                                $('.chat .user-list').html(userStr);
                                $('.chat .group-list').html(groupStr);

                                // reset.
                                userStr = groupStr = list = null;
                            }
                        });
                    }
                });

                // 隐藏登录.
                $('.login').hide();
                // 显示聊天.
                $('.chat').show();
            }, 'config:xmpp:time_key', 'presence', null, null, null);

            // 接收私聊消息.
            connection.addHandler(msg => {
                console.log('************************************************')
                console.log(msg)
                console.log('************************************************')
                let body = msg.getElementsByTagName('body')
                let message = Strophe.getText(body[0])
                let res

                if (message.startsWith('[obj')) {
                    res = getMediaContent(message.replace(/&quot;/g, '"'));
                } else {
                    res = message;
                }
                console.log('接收方接收到的消息：'+res)

                // 追加对方发送的消息.（接收方）
                $('.show-msg').append(`<div class="show-msg-item member">
                                            <p>${res}</p>
                                        </div>`);

                
                /**
                 * botkit自动发送消息流程
                 **/
                if(ifBotkitUser){  //1.先判断该账号是否为机器人账号
                    let to
                    if(msg.getAttribute('from').match('/')){
                        to = msg.getAttribute('from').split('/')[0]
                    } else {
                        to = msg.getAttribute('from')
                    }
                    msgParams = {
                        isHiddenMsg: '0',
                        from: currentId + '@' + domain,
                        type: 'chat',
                        to: to
                    }
                    Botkit.send(res)


                    // 监听自身 id 以实现 p2p 通讯
                    // socketIO.on(socketIO.id, data => {  //3.若监听到botkit回传的消息，则将其发送至xmpp服务器
                    //     console.log('#receive,', data)
                    //     let params = {
                    //         isHiddenMsg: '0',
                    //         from: currentId + '@' + domain,
                    //         type: 'chat',
                    //         to: to
                    //     }
                    //     console.log('params', params)
                    //     connection.send($msg(params).c('body', {  // 创建一个<message>元素并发送
                    //         maType: 6,
                    //         msgType: 1,
                    //         id: UUID
                    //     }).t(data.text).up().c('active', {
                    //         xmlns: 'http://jabber.org/protocol/chatstates'
                    //     }))
                    //     $('.show-msg').append(`<div class="show-msg-item">
                    //                                 <p>${data.text}</p>
                    //                             </div>`)
                        
                    //     // socketIO.close() //彻底关闭socket
                    //     // openSocketIO()
                    // })
                }
                

                // 滚动条保持在底部.
                keepScrollToBottom('.show-msg');

                // 必须返回true, 否则会导致message流只能接收一次.
                return true;
            }, null, 'message', 'chat', null, null)


            // 接收群聊消息.
            connection.addHandler(msg => {
                let sendId = $(msg).attr('sendjid');
                let body = msg.getElementsByTagName('body');
                let message = Strophe.getText(body[0]);
                let res;

                if (message.startsWith('[obj')) {
                    res = getMediaContent(message.replace(/&quot;/g, '"'));
                } else {
                    res = message;
                }

                // 追加消息.
                if (sendId === currentId + '@' + domain) {
                    $('.show-msg').append(`<div class="show-msg-item">
                                            <p>${res}</p>
                                        </div>`);
                } else {
                    $('.show-msg').append(`<div class="show-msg-item member">
                                            <span style="display: block;font-size: 12px;color: #777;">${sendId.split('@').shift()}</span>
                                            <p>${res}</p>
                                        </div>`);
                }

                // 滚动条保持在底部.
                keepScrollToBottom('.show-msg');

                // 必须返回true, 否则会导致message流只能接收一次.
                return true;
            }, null, 'message', 'groupchat', null, null);

            // 连接成功后要 发送一个 Presence协议，告诉服务器我可以正常收发消息了
            connection.send($pres().c('priority', {}, 5).c('c', {
                xmlns: 'http://jabber.org/protocol/caps',
                node: 'http://psi-im.org/caps',
                ver: 'caps-b75d8d2b25',
                ext: 'ca cs ep-notify-2 html'
            }));

            break;
    }

    return true;
};




//  登录.
function autoLogin(user, pwd) {
    $.ajax({
        type: 'post',
        url: '/notek/encrypt',
        headers: {
            'x-csrf-token': $.cookie('csrfToken')
        },
        data: {
            username: user,
            password: pwd
        },
        success: data => {
            if (data.success) {
                if(user=='test02'){  //指定一个机器人账号
                    ifBotkitUser = true
                    console.log(user, ifBotkitUser)
                }
                
                $('#msg').empty();
                connection = new Strophe.Connection(BASE_WEBSOCKET_URL);
                // connect params:
                // username: user + '@' + domain
                // password: 用户输入密码从后台获取密钥.
                connection.connect(`${user}@dev.fsll.tech`, data.data, status => {
                    console.log('登录状态', status)
                    onConnect(status, connection);  //这里调用onConnect函数
                });
            }
        }
    });
};

// 是否自动登录.
if ($.cookie('qt_user') && $.cookie('qt_pwd')) {
    autoLogin($.cookie('qt_user'), $.cookie('qt_pwd'));
} else {
    // click the button to start connecting to the xmpp server.
    document.querySelector('#connect').addEventListener('click', () => {
        const user = $('#username').val(),
            pwd = $('#pwd').val();

        if (!user || !pwd) {
            alert('必须输入用户名和密码');
            return;
        }

        // 登录过一次之后 记住用户名和密码 1天内有效.
        $.cookie('qt_pwd', pwd, { expires: 1 });
        $.cookie('qt_user', user, { expires: 1 });

        autoLogin(user, pwd);
    });
}
