// var hvy;
var s;
var w;
var columns;
var rows;
var board;
var next;
var tX = 197.5,tY = 33.5;
var track = [tX,tY];

function setup() {
  var myCanvas = createCanvas(windowWidth*0.7,166);
  myCanvas.parent('processing');
  // frameRate(20);
  noLoop();
  av = loadImage("./img/avy162x.jpg");
  av.loadPixels();

  w = 1;
  s = 162;
  // Calculate columns and rows
  columns = floor(s/w);
  rows = floor(s/w);
  // Wacky way to make a 2D array is JS
  board = new Array(columns);
  for (var i = 0; i < columns; i++) {
    board[i] = new Array(rows);
  } 
  // Going to use multiple 2D arrays and swap them
  next = new Array(columns);
  for (i = 0; i < columns; i++) {
    next[i] = new Array(rows);
  }
  init();
}

function draw() {
  clear();
  background(255,0);
  // conway();
  scope();
  // button();

  var text = document.getElementById("fly").innerHTML;
  console.log(text);
  if(text == "grow"){
    document.getElementById("gif").src="./img/grow.gif";
  }
  if(text == "fly"){
    document.getElementById("gif").src="./img/fly.gif";    
  }
}

function button(){
  var centre = [197.5,33.5];
  fill(255);
  ellipse(centre[0],centre[1],35,35);
  fill(0);
  ellipse(track[0],track[1],7,7);
}

function surveil() {
  var xC = map(mouseX*sqrt(1-0.5*pow(mouseY,2)),0,900,0,35);
  var yC = map(mouseY*sqrt(1-0.5*pow(mouseX,2)),0,900,0,35);
  track[0] = xC;
  track[1] = yC;
  print(mouseX*sqrt(mouseY));
  // track[1] = map(mouseY,0,height,16,40);
}

function conway(){
  av.loadPixels();
  image(av,2,2);
  generate();
  var f = hvyFreq/50;
  for ( var i = 0; i < columns;i++) {
    for ( var j = 0; j < rows;j++) {
      if ((board[i][j] == 1)){
        av.set(i+round(random(-f,f)),j+round(random(-f,f)),av.get(i,j));
      }
    }
  }
  av.updatePixels();
}

function scope(){
  var offset = s+13;
  
  noStroke();
  fill(245,245,245,255);
  rect(offset, 60, width, 140);
  stroke(51);

  for (var i = 0; i < windowWidth-offset-15; i+=3) {
    line(i+offset, 112-hvyL[i]*45, i+offset,112);
  };
  
  noStroke();
  fill(255,80);
  rect(offset, 112, width, 140);
}

// reset board when mouse is pressed
function mouseMoved() {
  if(mouseX < 162 && mouseY < 162) {
    init();
  }
  // surveil();
}

// Fill board randomly
function init() {
  av = loadImage("./img/avy162x.jpg");
  for (var i = 0; i < columns; i++) {
    for (var j = 0; j < rows; j++) {
      // Lining the edges with 0s
      if (i == 0 || j == 0 || i == columns-1 || j == rows-1) board[i][j] = 0;
      // Filling the rest randomly
      else board[i][j] = floor(random(2));
      next[i][j] = 0;
    }
  }
}

// The process of creating the new generation
function generate() {

  // Loop through every spot in our 2D array and check spots neighbors
  for (var x = 1; x < columns - 1; x++) {
    for (var y = 1; y < rows - 1; y++) {
      // Add up all the states in a 3x3 surrounding grid
      var neighbors = 0;
      for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
          neighbors += board[x+i][y+j];
        }
      }

      // A little trick to subtract the current cell's state since
      // we added it in the above loop
      neighbors -= board[x][y];
      // Rules of Life
      if      ((board[x][y] == 1) && (neighbors <  2)) next[x][y] = 0;           // Loneliness
      else if ((board[x][y] == 1) && (neighbors >  3)) next[x][y] = 0;           // Overpopulation
      else if ((board[x][y] == 0) && (neighbors == 3)) next[x][y] = 1;           // Reproduction
      else                                             next[x][y] = board[x][y]; // Stasis
    }
  }

  // Swap!
  var temp = board;
  board = next;
  next = temp;
}

function windowResized() {
  resizeCanvas(windowWidth*0.7, 166);
}
