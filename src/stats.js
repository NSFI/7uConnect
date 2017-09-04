var DebugWebRTC = require('debugwebrtc');
var debug = require('debug')('QiyuConnect:Stats');
var debugwebrtc = null;

exports = module.exports = {
    startStats: function(peer) {
        if (!peer) {
            return;
        }

        debugwebrtc = new DebugWebRTC({
            peer: peer
        });

        debugwebrtc.on(DebugWebRTC.PARSERS.PARSER_CHECK_AUDIO_TRACKS, function(audio) {
            debug('audio data: %j', audio);
        });
        debugwebrtc.on(DebugWebRTC.PARSERS.PARSER_GET_CONNECTION, function(connection) {
            debug('connection data: %j', connection);
        });

        debugwebrtc.on(DebugWebRTC.PARSERS.PARSER_GET_STREAMS, function(stream) {
            debug('stream data: %j', stream);
        });

        debugwebrtc.on(DebugWebRTC.TYPES.TYPE_ALL, function(results) {
            require('debug')('QiyuConnect:Stats:ALL')('all data: %j', results);
        });

    },
    stopStats: function() {
        if (debugwebrtc) {
            debugwebrtc.destroy();
        }
    }
};