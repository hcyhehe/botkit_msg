/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
var socketIO = io('http://localhost:3333')
socketIO.on('connect', function(){
    console.log('botkit.js socket.io connected!')
})
socketIO.on('disconnect', function(){
    console.log('botkit.js socket.io disconnected!')
})


var converter = new showdown.Converter();
converter.setOption('openLinksInNewWindow', true);


let ws_url
if(!location.host){
    ws_url = 'ws://localhost:3000'
} else {
    if(location.host.match(':')){
        ws_url = 'ws://'+location.host.split(':')[0]+':3000'
    } else {
        ws_url = 'ws://'+location.host+':3000'
    }
    console.log('ws_url:'+ws_url)
}


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
    send: function (text, e) {
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
            });
            //Botkit.send('菜单')  //发送开局快捷语言
        });

        that.socket.addEventListener('error', function (event) {
            console.error('ERROR', event);
        });

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
        });

        // Listen for messages 这里监听服务端接收数据
        that.socket.addEventListener('message', function (event) {
            var message = null;
            try {
                message = JSON.parse(event.data)
            } catch (err) {
                that.trigger('socket_error', err);
                return;
            }
            console.log('socket addEventListener', message)
            that.trigger(message.type, message);
            socketIO.emit('botkitToServer', message) //机器人回馈的消息，发送至socket.IO服务端
        });
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
            console.log('11111111')
            if (message.goto_link) {
                window.location = message.goto_link;
            }
        });

        that.on('message', function (message) {
            console.log('222222222')
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
};


(function (){
    Botkit.boot()
})()