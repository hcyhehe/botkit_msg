Strophe.addConnectionPlugin('flxhr', {
    init: function (conn) {
        // replace Strophe.Request._newXHR with new flXHR version
        // if flXHR is detected
        if (flensed && flensed.flXHR) {
            Strophe.Request.prototype._newXHR = function () {
                var xhr = new flensed.flXHR({
                    autoUpdatePlayer: true,
                    instancePooling: true,
                    noCacheHeader: false,
                    onerror: function () {
                        conn._changeConnectStatus(Strophe.Status.CONNFAIL,
                            "flXHR connection error");
                        conn._onDisconnectTimeout();
                    }
                });
                xhr.onreadystatechange = this.func.bind(null, this);

                return xhr;
            };
        } else {
            Strophe.error("flXHR plugin loaded, but flXHR not found." +
                "  Falling back to native XHR implementation.");
        }
    }
});