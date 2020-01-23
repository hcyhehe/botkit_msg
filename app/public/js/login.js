const BASE_WEBSOCKET_URL = 'wss://dev.fsll.tech:8443/websocket/';

// strophe连接xmpp服务器句柄 操作xml数据使用.
let connection;


let contact = [], // 联系人.
    chatType = 'single'; // 聊天类型.

// 消息uuid.
const UUID = createUUID();

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
                
                // 创建一个<message>元素并发送
                connection.send($msg(params).c('body', {
                    maType: 6,
                    msgType: 1,
                    id: UUID
                }).t(content).up()
                    .c('active', {
                        xmlns: 'http://jabber.org/protocol/chatstates'
                    }));

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
            $('.chat .user-list').delegate('li', 'click', function () {
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
                let body = msg.getElementsByTagName('body');
                let message = Strophe.getText(body[0]);
                let res;

                if (message.startsWith('[obj')) {
                    res = getMediaContent(message.replace(/&quot;/g, '"'));
                } else {
                    res = message;
                }

                // 追加对方发送的消息.（接收方）
                console.log('22222222:'+res)
                $('.show-msg').append(`<div class="show-msg-item member">
                                            <p>${res}</p>
                                        </div>`);

                // 滚动条保持在底部.
                keepScrollToBottom('.show-msg');

                // 必须返回true, 否则会导致message流只能接收一次.
                return true;
            }, null, 'message', 'chat', null, null);

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
                $('#msg').empty();
                connection = new Strophe.Connection(BASE_WEBSOCKET_URL);
                // connect params:
                // username: user + '@' + domain
                // password: 用户输入密码从后台获取密钥.
                connection.connect(`${user}@dev.fsll.tech`, data.data, status => {
                    onConnect(status, connection);
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
