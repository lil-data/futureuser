// wav
var y1 = [];
var y2 = [];

// conway
var s = 100;
var w;
var columns;
var rows;
var board;
var next;

function setup() {
  	// put setup code here
  	var myCanvas = createCanvas(1200,166);
  	myCanvas.parent('myContainer');

  	// wav setup
  	for (var i = 0; i < 1200; i++) {
  		y1[i] = 120;
  		y2[i] = 120;
  	};
  
  	// conway setup
  	setupConway();
}

function draw() {
	background(255);
	data();
	drawWav();
	conway();
}

function conway() {
	av.loadPixels();
	image(av,0,0);
	generate();
	var c = color(0,0,0);
  	for ( var i = 0; i < columns; i++) {
    	for ( var j = 0; j < rows; j++) {
      		if ((board[i][j] = 1)){
      			av.set(i+round(random(-1,1)),j+round(random(-1,1)),av.get(i,j));
      		}
    	}
  	}
	av.updatePixels();
}

function data() {
	for (var i = 0; i < width; i=i+4) {
	  	if(mouseX >= i && mouseX <= i+4)
	   	{
	       	if(mouseY >= 0 && mouseY <= 120)
	       	{
	         	y1[i] = 40+(mouseY/1.5);
	        	y2[i] = 160-(mouseY/3);
	       	};
	       	if(mouseY >= 120 && mouseY <= 200)
	       	{
	         	y1[i] = 40+(height-mouseY);
	        	y2[i] = 160-((height-mouseY)/2);
	       	};
	   	};
  	};
}

function drawWav() {
	for (var i = 0; i < width; i=i+4) {
	    if(y1[i] != 120)
	    {
	    	stroke(80);
	    	line(i, y1[i], i, 120);
	    	stroke(200);
	    	line(i, 120, i, y2[i]);
		};
  	};
}

function setupConway() {
  w = 1;
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

function mousePressed() {
  init();
}

function init() {
  av = loadImage("./img/avy100x.jpg");
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

function generate() {
	var neighbors = 0;
  // Loop through every spot in our 2D array and check spots neighbors
  for (var x = 1; x < columns - 1; x++) {
    for (var y = 1; y < rows - 1; y++) {
      // Add up all the states in a 3x3 surrounding grid
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
