const NET_PADDING = 0.5;

let LAYER_COUNT = 5;
let NEURON_COUNT = 5;
let SYNAPTIC_PROB = 1;
let SCATTER = 0;
let STIMULATION = 5;
let MODEL = 'blob';
let BACKWARDS_CONNECTIONS = false;
let RECREATIONAL_TIME = 500;

let neuralNet = [];
let drawSynapses = [];

let selectedNeuron = null;
let selectedLayerDisplay = "null";
let selectedNeuronDisplay = "null";

// for dynamic chart
var xVal = 0;
var yVal = 0;

class Neuron {
  blinkFrames = 10;
  timeLastSpiked = 0;
  currentBlink = 0;
  layer = 0;
  index = 0;
  threshold = 60;
  potential = 10;
  currentMembranePotential = 30;
  RESTING_POTENTIAL = 30;
  x = 0
  y = 0
  diameter = 10
  synapses = [];
  c = color(255, 204, 0);
  constructor(){}
}

function clearNeuralNet(){neuralNet = [];}
function applyChanges(){clearNeuralNet();setupNeurons();setupSynapes();}

function setupDynamicChart(){
  var dps = [];
  var chart = new CanvasJS.Chart("chartContainer", {
    backgroundColor: "#222",
    axisY:{
      labelFontColor: "orange",
    },
    axisX:{
      title: "Test",
      labelFontColor: "orange",
    },
    data: [{
      type: "line",
      dataPoints: dps,
      lineColor: "red",
      markerType: "none",
    }]
  })
  var updateInterval = 50;
  // number of points visible at any point in time
  var dataLength = 800;

  var updateChart = function (count) {
    if(selectedNeuron == null){return;}
    count = count || 1;
    for (var j = 0; j < count; j++) {
      yVal = selectedNeuron.currentMembranePotential;
      dps.push({x: xVal,y: yVal});
      xVal+=0.1;
    }
    if (dps.length > dataLength) {dps.shift();}
    chart.render();
  }
  updateChart(dataLength);
  setInterval(function(){updateChart()}, updateInterval);
}

function setupCanvas(){
  // initiate canvas
  createCanvas(400, 400);
  // get canvas container
  let container = select('#canvas-container');
  // get canvas
  let canvas = select('main');
  container.child(canvas);
  resizeCanvas(container.width, container.height);

  // get slider values
  let layerSlider = select('#layerCount');
  layerSlider.elt.oninput = () =>{LAYER_COUNT = layerSlider.elt.value;applyChanges();}
  let neuronSlider = select('#neuronCount');
  neuronSlider.elt.oninput = () =>{NEURON_COUNT = neuronSlider.elt.value;applyChanges();}
  let scatterSlider = select('#scatterValue');
  scatterSlider.elt.oninput = () => {SCATTER = scatterSlider.elt.value;applyChanges();}
  let synapticSlider = select('#synapticProb');
  synapticSlider.elt.oninput = () => {SYNAPTIC_PROB = synapticSlider.elt.value;applyChanges();}
  let redraw = select('#redraw');
  redraw.elt.onclick = () => {applyChanges();}
  selectedLayerDisplay = select('#selectedLayer');
  selectedNeuronDisplay = select('#selectedNeuron');

  let stimulate = select('#stimulate');
  stimulate.elt.onclick = () => {
    if(selectedNeuron == null){return;}
    selectedNeuron.currentMembranePotential += STIMULATION;
    //yVal += STIMULATION;
  }

  setupDynamicChart();
}

function getRandomNumberBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function setupSynapes(){
  if(MODEL == 'layer'){
    // for every layer in net
    for(let i=0;i<neuralNet.length;i++){
      // ignore input-layer (first layer)
      if(i==0){continue;}
      // for every neuron
      neuralNet[i].forEach((neuron)=>{
        // iterate through neurons in previous layer
        neuralNet[i-1].forEach((pNeuron)=>{
          // if random value is bigger than synaptic probability
          if(Math.random() <= SYNAPTIC_PROB){
            // make a connection
            neuron.synapses.push(pNeuron);
          }
        });
        // if no connections where made, make at least one
        if(neuron.synapses.length == 0){
          let prLayer = neuralNet[i-1]
          let pNeuron = prLayer[getRandomNumberBetween(0, prLayer.length-1)];
          neuron.synapses.push(pNeuron);
        }
      });
    }
  } else if(MODEL == 'blob'){
    neuralNet.forEach((neuron)=>{
      neuralNet.forEach((dNeuron)=>{
        // return if connection was already made
        if(dNeuron.synapses.includes(neuron) && !BACKWARDS_CONNECTIONS){return;}
        // return if neuron inspects itself haha
        if(neuron == dNeuron){return;}
        // calculate distance from each neuron to each other neuron
        let xDist = Math.abs(neuron.x - dNeuron.x);
        let yDist = Math.abs(neuron.y - dNeuron.y);
        // absolute distance between the two neurons
        let absDist = Math.sqrt(xDist**2 + yDist**2);
        if(absDist*0.001 <= SYNAPTIC_PROB){neuron.synapses.push(dNeuron);}
      });
    });
  }
}

function setupNeurons(){
  if(MODEL == 'layer'){
    const distY = height/NEURON_COUNT;
    const distX = width/LAYER_COUNT;
    for(let c=1;c<=LAYER_COUNT;c++){
      let layer = [];
      for(let i=1;i<=NEURON_COUNT;i++){
        let neuron = new Neuron();
        neuron.layer = c;
        neuron.index = i;
        neuron.x = (c*distX - distX/2) + getRandomNumberBetween(-SCATTER, SCATTER);
        neuron.y = (i*distY - distY/2);
        let col = color(255, 204, c*25);
        neuron.c = col;
        layer.push(neuron);
      }
      neuralNet.push(layer);
    }
  }else if(MODEL == 'blob'){

    for(let i=1;i<=NEURON_COUNT**2;i++){
        let neuron = new Neuron();
        neuron.x = getRandomNumberBetween(0, width);
        neuron.y = getRandomNumberBetween(0, height);
        neuron.c = color(255, 204, 185);
        neuralNet.push(neuron);
    }

  }
}

function setup(){
  setupCanvas();
  setupNeurons();
  setupSynapes();
}

function onNeuronSelect(neuron){
  selectedNeuron = neuron;
  selectedNeuronDisplay.elt.innerHTML = neuron.index;
  selectedLayerDisplay.elt.innerHTML = neuron.layer;
}

function onThresholdCrossed(neuron){
  console.log(Date.now()-neuron.timeLastSpiked);
  // DONT SPIKE IF STILL IN RECREATIONAL TIME
  if(Date.now() - neuron.timeLastSpiked <= RECREATIONAL_TIME){
    return;
  } else {
    neuron.timeLastSpiked = Date.now();
  }
  neuron.currentBlink++;
  // draw signal
  let cir = circle(neuron.x, neuron.y, neuron.diameter+20);
  neuron.c = color(255,255,255);
  // reset to resting potential
  neuron.currentMembranePotential = neuron.RESTING_POTENTIAL;
  // propagate signal to connected neurons
  neuron.synapses.forEach((pNeuron)=>{
    pNeuron.currentMembranePotential += pNeuron.potential;
  });
}

function onHoverNeuron(neuron){
  // check if a neuron reached threshold
  if(neuron.currentMembranePotential >= neuron.threshold){onThresholdCrossed(neuron);}
  cir = circle(neuron.x, neuron.y, neuron.diameter);

  // check if neuron is in blinking stage and stay blinking if so
  if(neuron.currentBlink != 0 && neuron.currentBlink <= neuron.blinkFrames){
    cir = circle(neuron.x, neuron.y, neuron.diameter+20);
    neuron.currentBlink++;
  } else {
    neuron.currentBlink = 0;
  }

  if(
    mouseX > neuron.x-neuron.diameter &&
    mouseX < neuron.x + neuron.diameter &&
    mouseY > neuron.y-neuron.diameter &&
    mouseY < neuron.y + neuron.diameter
  ){
    cir = circle(neuron.x, neuron.y, neuron.diameter+20);
    if(mouseIsPressed){onNeuronSelect(neuron);}
  } else {cir.fill(neuron.c);}
  noStroke();
}

function draw(){
  background(50);

  if(MODEL == 'layer'){
    // draw neurons
    neuralNet.forEach((layer)=>{
      // draw neuron
      layer.forEach((neuron)=>{
        let cir = circle(neuron.x, neuron.y, neuron.diameter);
        onHoverNeuron(neuron);
        // draw synapes
        neuron.synapses.forEach((pNeuron)=>{
          stroke(color(neuron.c.levels[0], neuron.c.levels[1], neuron.c.levels[2], 60));
          line(pNeuron.x, pNeuron.y, neuron.x, neuron.y);
        });

      });
    });

  } else if(MODEL == 'blob'){
    neuralNet.forEach((neuron)=>{
      onHoverNeuron(neuron);
      neuron.synapses.forEach((pNeuron)=>{
        stroke(color(neuron.c.levels[0], neuron.c.levels[1], neuron.c.levels[2], 60));
        line(pNeuron.x, pNeuron.y, neuron.x, neuron.y);
      });
    });
  }
}
