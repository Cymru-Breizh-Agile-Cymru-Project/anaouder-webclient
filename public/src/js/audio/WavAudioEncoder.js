(function(self) {
    var min = Math.min,
        max = Math.max;
  
    var setString = function(view, offset, str) {
      var len = str.length;
      for (var i = 0; i < len; ++i)
        view.setUint8(offset + i, str.charCodeAt(i));
    };
  
    var Encoder = function(sampleRate, numChannels) {
      this.sampleRate = sampleRate;
      this.numChannels = numChannels;
      this.numSamples = 0;
      this.dataViews = [];
    };
  
    Encoder.prototype.encode = function(buffer) {
      var len = buffer[0].length,
          nCh = this.numChannels,
          view = new DataView(new ArrayBuffer(len * nCh * 2)),
          offset = 0;
      for (var i = 0; i < len; ++i)
        for (var ch = 0; ch < nCh; ++ch) {
          var x = buffer[ch][i] * 0x7fff;
          view.setInt16(offset, x < 0 ? max(x, -0x8000) : min(x, 0x7fff), true);
          offset += 2;
        }
      this.dataViews.push(view);
      this.numSamples += len;
    };
  
    Encoder.prototype.finish = function(mimeType, doCleanup) {
      var dataSize = this.numChannels * this.numSamples * 2,
          view = new DataView(new ArrayBuffer(44));
      setString(view, 0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      setString(view, 8, 'WAVE');
      setString(view, 12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, this.numChannels, true);
      view.setUint32(24, this.sampleRate, true);
      view.setUint32(28, this.sampleRate * 4, true);
      view.setUint16(32, this.numChannels * 2, true);
      view.setUint16(34, 16, true);
      setString(view, 36, 'data');
      view.setUint32(40, dataSize, true);
      this.dataViews.unshift(view);
      var blob = new Blob(this.dataViews, { type: 'audio/wav' });
      if(doCleanup){
          this.cleanup();
      }
      return blob;
    };
  
    Encoder.prototype.cancel = Encoder.prototype.cleanup = function() {
      delete this.dataViews;
    };
  
    self.WavAudioEncoder = Encoder;
  })(self);
  