var hvyL = [];
// hvyR = [];
// var hvyBuffer = [hvyL,hvyR];
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
  // hvyR = buffer.getChannelData(1);
  // hvyBuffer = [hvyL,hvyR];
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
        document.getElementById("textarea").style.display="inline";
    }, 1500);

    var check = false;
    (function(a,b){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);

    console.log(check);
    if(check){
        document.getElementById("container").style.display="none";
        document.getElementById("mobile").style.display="inline";
    }

    render();
};