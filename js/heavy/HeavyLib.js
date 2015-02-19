(function(window) {

  var AudioContext = (window.AudioContext || window.webkitAudioContext);
  var WebAudioContext = new AudioContext();

  /* 
   @param {Object} options 
      @param options.blockSize {Number} audio processing blocksize
      @param options.audioCallback {Function} function callback on each processed block
      @param options.printHook {Function} function callback on Heavy context prints
      @param options.sendHook {Function} function callback on Heavy context message sends
   */
  var HeavyLib = function(options) {
    this.userAudioCallback = options.audioCallback;
    this.sendHook = Runtime.addFunction(options.sendHook);
    this.blockSize = (options.blockSize) ? options.blockSize : 2048;
    this.tempMessage = null;

    if (WebAudioContext) {
      // create temporary message for parameter inputs
      this.tempMessage = Module._malloc(_hv_msg_getByteSize(1));
      _hv_msg_init(this.tempMessage, 1, 0.0);

      // instantiate heavy context
      this.heavyContext = _hv_heavy_new(WebAudioContext.sampleRate);
      this.setPrintHook(options.printHook);

      // instiate ScriptProcessor node
      this.webAudioProcessor = WebAudioContext.createScriptProcessor(
        this.blockSize, 
        this.getNumInputChannels(), 
        this.getNumOutputChannels()
      );
      this.blockSize = this.webAudioProcessor.bufferSize;

      // allocate a temporary buffers (pointer size is 4 bytes in javascript)
      this.outBuffer = Module._malloc(this.getNumOutputChannels() * this.blockSize * 4);

      // attach process callback
      var that = this;
      this.webAudioProcessor.onaudioprocess = function(e) {
        var lengthInSamples = that.blockSize * that.getNumOutputChannels();

        var heapOutBytes = new Float32Array(Module.HEAPF32.buffer, that.outBuffer, lengthInSamples);
        _hv_heavy_process_inline(that.heavyContext, null, heapOutBytes.byteOffset, that.blockSize);
        var heapFloats = new Float32Array(heapOutBytes.buffer, heapOutBytes.byteOffset, lengthInSamples);

        for (var i = 0; i < that.getNumOutputChannels(); ++i) {
          var output = e.outputBuffer.getChannelData(i);

          for (var j = 0; j < that.blockSize; j++) {
            output[j] = heapFloats[j+(i*that.blockSize)];
          }
        }

        if (that.userAudioCallback) that.userAudioCallback(e.outputBuffer);
      };

    } else {
      console.error("WebAudioContext is null");
    }
  };

  HeavyLib.prototype.start = function() {
    if (this.heavyContext) { 
      this.webAudioProcessor.connect(WebAudioContext.destination);
    }
  }

  HeavyLib.prototype.stop = function() {
    if (this.heavyContext) {  
      this.webAudioProcessor.disconnect(WebAudioContext.destination);
    }
  }

  HeavyLib.prototype.getNumInputChannels = function() {
    return (this.heavyContext) ? _hv_getNumInputChannels(this.heavyContext) : -1;
  }

  HeavyLib.prototype.getNumOutputChannels = function() {
    return (this.heavyContext) ? _hv_getNumOutputChannels(this.heavyContext) : -1;
  }

  HeavyLib.prototype.setPrintHook = function(hook) {
    if (!this.heavyContext) console.error("Can't set Print Hook, no Heavy Context instantiated");

    if (hook) {
      // Converts Heavy print callback to a printable message
      var printHook = Runtime.addFunction(function(timeStamp, printName, msg, userData) {
          var m = (Pointer_stringify(printName) + ": " + Pointer_stringify(msg));
          hook(m);
        }
      );
      _hv_setPrintHook(this.heavyContext, printHook);
    }
  }

  HeavyLib.prototype.setSendHook = function(sendHook) {
    if (!this.heavyContext) console.error("Can't set Send Hook, no Heavy Context instantiated");
  }

  HeavyLib.prototype.sendBangToReceiver = function(receiverName) {
    if (this.heavyContext) {
      var r = allocate(intArrayFromString(receiverName), 'i8', ALLOC_STACK);
      _hv_vscheduleMessageForReceiver(this.heavyCtx, r, 0.0, "b");
    }
  }

  HeavyLib.prototype.sendFloatToReceiver = function(receiverName, floatValue) {
    if (this.heavyContext) {
      var r = allocate(intArrayFromString(receiverName), 'i8', ALLOC_STACK);
      _hv_msg_setFloat(this.tempMessage, 0, floatValue);
      _hv_scheduleMessageForReceiver(this.heavyContext, r, 0.0, this.tempMessage);
    }
  }

  HeavyLib.prototype.sendStringToReceiver = function(receiverName, message) {
    if (this.heavyContext) {
      var r = allocate(intArrayFromString(receiverName), 'i8', ALLOC_STACK);
      var m = allocate(intArrayFromString(message), 'i8', ALLOC_STACK);
      _hv_vscheduleMessageForReceiver(this.heavyCtx, r, 0.0, "s", m);
    }
  }

  window.HeavyLib = HeavyLib;

})(window);
