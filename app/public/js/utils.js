// 返回聊天中媒体文件的信息(可直接用于渲染).
function getMediaContent(con) {
    const TYPE = /type=\"([a-z]*)/gi.exec(con)[1];
    let res = '', filePath;

    switch (TYPE) {
        // 图片.
        case 'image':
            filePath = con.match(/(http[s]?:\/\/([\w-]+.)+([:\d+])?(\/[\w-\.\/\?%&=]*)?)/gi)[0].replace(/\"$/g, '');
            res = `<img style="max-width:470px;max-height:250px;" src="${filePath}">`;
            break;
        // 表情.
        case 'emoticon':
            filePath = /\[\/([a-z]*)/gi.exec(con)[1];
            res = `<img style="width:24px;height:24px" src="https://dev.fsll.tech:8443/file/v1/emo/d/e/EmojiOne/${filePath}/org">`;
            break;
    }

    return res;
};

// 获取聊天记录并渲染.
function getChatAndRender(params) {
    axios.post('/package/qtapi/getmsgs.qunar', {
        from: params.from,
        to: params.to,
        direction: '0',
        time: +new Date,
        domain: 'dev.fsll.tech',
        num: 40,
        fhost: 'dev.fsll.tech',
        thost: 'dev.fsll.tech',
        f: 't'
    }, {
        headers: {
            'x-csrf-token': $.cookie('csrfToken')
        }
    }).then(res => {
        if (res.data.ret) {
            let chatStr = ``;

            res.data.data.forEach(chat => {
                if(chat.body.msgType == 1) {
                    const { content } = chat.body;
                    let res;

                    // 如果不是纯文本消息.
                    if(content.startsWith('[obj')) {
                        res = getMediaContent(content);
                    }else {
                        res = content;
                    }

                    chatStr += `<div class="show-msg-item ${chat.from === contact[0].user ? 'member' : ''}">
                                    <p>${res}</p>
                                </div>`;
                }else {
                    // msgType不等于1消息处理.
                    // todo.
                }
            });

            $(params.chatBox).html(chatStr);

            keepScrollToBottom(params.chatBox);
        }
    });
};

// 将滚动条保持在底部.
function keepScrollToBottom(box) {
    let scrollHeight = $(box).prop('scrollHeight');
    $(box).animate({ scrollTop: scrollHeight }, 400);
};

// 创建uuid.
function createUUID() {
    let d = new Date().getTime();
    const uuid = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
    });
    return uuid.toUpperCase();
};

// 过滤字符串中的html标签.
function removeHTMLTag(str) {
    str = str.replace(/<\/?[^>]*>/g, ''); //去除HTML tag
    str = str.replace(/[ | ]*\n/g, '\n'); //去除行尾空白
    //str = str.replace(/\n[\s| | ]*\r/g,'\n'); //去除多余空行
    str = str.replace(/ /ig, ''); //去掉
    return str;
}