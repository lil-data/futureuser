var hvyL = [], hvyR = [];
      var hvyBuffer = [hvyL,hvyR];
   		var hvyFreq = 100;

function hvAudioCallback(buffer) {
  hvyL = buffer.getChannelData(0);
  hvyR = buffer.getChannelData(1);
  hvyBuffer = [hvyL,hvyR];
  // console.log(hvyBuffer);
}

function hvPrintHook(message) {
  // console.log(message);
  // hvyFreq = message.replace( /^\D+/g, '');
  // console.log(message);
}

function hvSendHook(message) {
  // console.log(message);
}

function setProcessingOn(value) {
  if (value == "ON") {
    heavy.stop();
    document.querySelector("#dsp_tgl").value = "OFF";
  }
  else {
    heavy.start();
    document.querySelector("#dsp_tgl").value = "ON";
  }
}

function updateParamOne(value) {
  document.querySelector("#paramDisplay-1").value = value;
  heavy.sendFloatToReceiver("#param-1", value);
  hvyFreq = value*200;
  // console.log(hvyFreq);
}

function updateParamTwo(value) {
  document.querySelector("#paramDisplay-2").value = value;
  heavy.sendFloatToReceiver("#param-2", value);
}

function updateParamThree(value) {
  document.querySelector("#paramDisplay-3").value = value;
  heavy.sendFloatToReceiver("#param-3", value);
}

function updateParamFour(value) {
  document.querySelector("#paramDisplay-4").value = value;
  heavy.sendFloatToReceiver("#param-4", value);
}

heavy = new HeavyLib({ 
  blockSize : 2048, 
  audioCallback : hvAudioCallback,
  printHook : hvPrintHook, 
  sendHook : hvSendHook
});