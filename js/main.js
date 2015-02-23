var hvyL = [], hvyR = [];
var hvyBuffer = [hvyL,hvyR];
var hvyFreq = 100;
var options = {};
options.blockSize = 2048 * 2;
options.audioCallback = hvAudioCallback;
options.printHook = hvPrintHook;
options.sendHook = hvSendHook;
heavy = new HeavyLib(options);
var socket = io('https://zocket.herokuapp.com/');

function hvAudioCallback(buffer) {
  hvyL = buffer.getChannelData(0);
  hvyR = buffer.getChannelData(1);
  hvyBuffer = [hvyL,hvyR];
}

function hvPrintHook(message) {
    console.log(message);
}

function hvSendHook(message) {
    console.log(message);
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
                        console.log("user change, broadcasting and sending", k, 1);
                        e.style.backgroundColor = "rgb(235, 77, 276)";
                        socket.emit("change", k, 1);
                        heavy.sendFloatToReceiver(k, 1);
                    } else {
                        e.innerHTML = ops[0];
                        e.style.backgroundColor = "rgb(145, 191, 255)";
                        console.log("user change, broadcasting and sending", k, 0);
                        socket.emit("change", k, 0);
                        heavy.sendFloatToReceiver(k, 0);
                    }
                });
            })();
        }
    }
}
var st ="The user of the future will {fly|fly|grow} her own computer. She will own and control her own identity and her own data. She will even host her own apps. She will not be part of someone else's Big Data. She will be her own Little Data. Unless she's a really severe geek, she will pay some service to store and execute her ship - but she can move it anywhere else, anytime, for the cost of the bandwidth. So called \"{size|big|lil} data\" is a cringeworthy buzzword birthed from the loins of Silicon Valley and corporate board rooms. Yet the constellation of technologies to which it refers also presents a singular problem for contemporary theorists and practitioners across all fields. To paraphrase Deleuze: we ask endlessly whether algorithmic data analytics systems are {morality|good|evil}, are novel or merely digital hype, but we rarely do we ask what an \“algorithm\” can do. However, the transformations taking place are {speed|fast|slow}-paced and often too little debated or contested in the mainstream media and legislature, with disruptive technical and social innovations taking root and expanding rapidly before we have time to digest the implications or consider the need for oversight. In its technocratic utopianism, data analytics systems render multidimensional processes into numbers subject to mining, dependent upon a logic of smoothness in order to function. This necessarily reduces the {complexity|complex|simple} social world into terms of calculation and irruption that can only be understood by machines. Both software and cities are complex, open systems. Using software to run and manage city services and infrastructures exposes them to {glitch|viruses|glitches}, crashes, and security hacks. \'I used to think my job was all about arrests. Chasing bad guys. Now I see my work differently. We analyze crime data, spot patterns, and figure out where to send patrols. It’s helped some US cities cut {crime|serious|silly} crime by up to 30% by stopping it before it happens. Let’s build a smarter planet.\' As city systems become more complicated, interconnected, and dependent on software, producing stable, robust and {paranoia|secure|paranoid} devices and infrastructures will become more of a challenge. Collectively what all of these examples demonstrate is that the everyday practices we enact, and the places in which we live, are now {depth|deeply|shallowly} augmented, monitored and regulated by dense assemblages of data-enabled infrastructures and technologies on behalf of a small number of entities.";
var extracted = extract(st);

makehtml(extracted);


socket.on('change', function(key, value){
    var el = document.getElementById(key)
    el.innerHTML = extracted[key][value];
    console.log("network change, sending", key, value);
    if(value == 1){
        el.style.backgroundColor = "rgb(235, 77, 276)";
    } else {
        el.style.backgroundColor = "rgb(145, 191, 255)";
    }
    heavy.sendFloatToReceiver(key, value);
});

socket.on('init', function(worldstate){

    for(var key in worldstate) {
        var e = document.getElementById(key);
        var index = extracted[key].indexOf(worldstate[key]);
        console.log("network init, sending", key, index);
        heavy.sendFloatToReceiver(key, index);
        if(index == 1){
            e.style.backgroundColor = "rgb(235, 77, 276)";
        } else {
            e.style.backgroundColor = "rgb(145, 191, 255)";
        }
        e.innerHTML = worldstate[key];

    }
});

window.onload = function(){

    setTimeout(function(){
        heavy.start();
    }, 500);

    render();
};