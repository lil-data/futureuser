var hvyL = [], hvyR = [];
var hvyBuffer = [hvyL,hvyR];
var hvyFreq = 100;
var heavy;
var socket = io('https://zocket.herokuapp.com/');

function hvAudioCallback(buffer) {
  hvyL = buffer.getChannelData(0);
  hvyR = buffer.getChannelData(1);
  hvyBuffer = [hvyL,hvyR];
}

function hvPrintHook(message) {

}

function hvSendHook(message) {

}

//function setProcessingOn(value) {
//  if (value == "ON") {
//    heavy.stop();
//    document.querySelector("#dsp_tgl").value = "OFF";
//  }
//  else {
//    heavy.start();
//    document.querySelector("#dsp_tgl").value = "ON";
//  }
//}

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

function render(){
    draw();
    window.requestAnimationFrame(render);
}


function extract(string){
    var reg = /{(.*?)}/g;
    var object = {};
    var matches = string.match(reg);
    for (var i=0; i < matches.length; i++) {
        var stuff = matches[i].split("|");
        stuff[stuff.length -1] = stuff[stuff.length - 1].replace("}", "");
        stuff[0] = stuff[0].replace("{", "");
        object[stuff[0]] = stuff.splice(1);
    }
    return object;
}

function makehtml(json){
    for (var key in json) {
        if (json.hasOwnProperty(key)) {
            var el = document.getElementById(key);
            el.innerHTML = json[key][0];
            el.className = el.className + "clickable";
            (function(){
                var k = key;
                var e = el;
                e.addEventListener("click", function(){
                    var ops = json[k];
                    var currentState = e.innerHTML;
                    if(currentState === ops[0]){
                        e.innerHTML = ops[1];
                        socket.emit("change", k, 1);
                    } else {
                        e.innerHTML = ops[0];
                        socket.emit("change", k, 0);
                    }


                });
            })();
        }
    }
}
var st = "The {adj|problem|silliness} with {size|little|big} {type|data|info|knowledge} is that {who|technology is|we are|I am} {act|moving|changing} too {speed|slow|fast} to {help|help|protect|save} {whom|ourselves|myself} from the {moral|interests|evilness} of {society|corporations|individuals|governments}, which {demean|trivialise|infantilise|disturb|confuse} the meaning of privacy in their pursuit of {safety|safety|profit}."
var extracted = extract(st);

makehtml(extracted);


socket.on('change', function(key, value){
    document.getElementById(key).innerHTML = extracted[key][value];
});

socket.on('init', function(worldstate){
    for(var key in worldstate) {
        document.getElementById(key).innerHTML = worldstate[key];
    }
});

window.onload = function(){
    heavy = new HeavyLib({
        blockSize : 2048 * 2,
        audioCallback : hvAudioCallback,
        printHook : hvPrintHook,
        sendHook : hvSendHook
    });
    setTimeout(function(){
        heavy.start();
    }, 1000);
    render();
};