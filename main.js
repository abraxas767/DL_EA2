const NET_PADDING = 0.5;
let stimulusDisplay = null;

let LAYER_COUNT = 5;
let NEURON_COUNT = 5;
let SYNAPTIC_PROB = 1;
let SCATTER = 0;
let STIMULATION = 5;
let MODEL = 'blob';
let BACKWARDS_CONNECTIONS = false;
let RECREATIONAL_TIME = 200;
let RANDOMIZE_POTENTIAL = false;

let neuralNet = [];
let drawSynapses = [];

let selectedNeuron = null;
let selectedLayerDisplay = "null";
let selectedNeuronDisplay = "null";

// Input current: I = Q/t -> charge / time
const INPUT_CHARGE = 0.5; // C -> coulomb
const IMPULS_TIME = 100; // ms -> milliseconds

// for dynamic chart
var xVal = 0;
var yVal = 20;

class Neuron {
  // I = Q/t
  current = 0;
  // difference in electric potential between interior and
  // exterior of the membran
  RESTING_POTENTIAL = -70;
  currentMembranePotential = -70 // mV
  threshold = -55; // mV
  RESISTANCE = 1; // ohm
  // holds all postsynaptic connections
  synapses = [];
  // holds correlating synaptic weights
  synapticWeights = [];
  // used to determine weither a neuron is in the process
  // of beeing stimulated
  stimulateDT = null;
  dt = 0;
  blinkFrames = 10;
  timeLastSpiked = 0;
  currentBlink = 0;
  layer = 0;
  index = 0;
  potential = 10;
  x = 0
  y = 0
  diameter = 10
  c = color(255, 204, 0);
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
  var updateInterval = 5;
  // number of points visible at any point in time
  var dataLength = 1500;

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

  let currentStimulus = select('#currentStimulus');
  stimulusDisplay = currentStimulus;

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
  stimulate.elt.onmousedown = () => {
    if(selectedNeuron == null){return;}
    selectedNeuron.stimulateDT = Date.now();
  }
  stimulate.elt.onmouseup = () => {
    if(selectedNeuron == null){return;}
    selectedNeuron.stimulateDT = null;
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
        // We dont want the chance for connection to be 100% even for close by neurons
        let probScalar = 1 + Math.random();
        if(absDist*0.001 * probScalar <= SYNAPTIC_PROB){
          neuron.synapses.push(dNeuron);
          neuron.synapticWeights.push(1);
        }
      });
    });
  }
}

function setupNeurons(){

  // LAYER ARCHITECTURE
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

  // BLOB ARCHITECTURE
  } else if(MODEL == 'blob'){
    for(let i=1;i<=NEURON_COUNT**2;i++){
        let neuron = new Neuron();
        neuron.x = getRandomNumberBetween(0, width);
        neuron.y = getRandomNumberBetween(0, height);
        neuron.c = color(255, 204, 185);
        if(RANDOMIZE_POTENTIAL){
          neuron.potential = getRandomNumberBetween(5, 60);
        }
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
  //neuron.stimulateDT = Date.now();
  // check if neuron is still in recreational time and skip if so
  // else save current time as spike time
  if(Date.now() - neuron.timeLastSpiked >= RECREATIONAL_TIME){
    neuron.timeLastSpiked = Date.now();
  }

  // STYLING ====================
  neuron.currentBlink++;
  // draw signal
  let cir = circle(neuron.x, neuron.y, neuron.diameter+20);
  neuron.c = color(255,255,255);
  // STYLING ====================

  // reset to resting potential
  neuron.currentMembranePotential = neuron.RESTING_POTENTIAL;
  neuron.current = 0;
  // eqv. tell all synapses to start firing
  neuron.synapses.forEach((pNeuron)=>{
    pNeuron.stimulateDT = Date.now();
  });
}

function onHoverNeuron(neuron){
  neuron.current = 0;

  // check if an input neuron is stimulated
  my_if: if(neuron.stimulateDT){

    // prevent stimulus if still in recreational-time
    if(Date.now() - neuron.timeLastSpiked <= RECREATIONAL_TIME){break my_if;}
    // to achieve the current I on our membrane we have to
    // implement Q and t -> INPUT_CHARGE and IMPULS_TIME.
    // To get a somehow accurate depiction of time we devide
    // the current framerate (frames per second) with the desired
    // time (in milliseconds) an electric impuls should produce
    // --> we get the current I
    // --> I = Q/t
    neuron.current += (INPUT_CHARGE / (frameRate() / IMPULS_TIME));
  }
  // Voltage in mV
  // U = I * R -> current * resistance
  neuron.currentMembranePotential += neuron.current * neuron.RESISTANCE;

  for(let s=0;s<neuron.synapses.length;s++){
    if(Date.now() - neuron.synapses[s].stimulateDT >= IMPULS_TIME && neuron.synapses[s] != selectedNeuron){
      neuron.synapses[s].stimulateDT = null;
    }
  }





  // integrate leaky model
  //if(neuron.currentMembranePotential > neuron.RESTING_POTENTIAL){}

  // check if a neuron reached threshold
  if(neuron.currentMembranePotential >= neuron.threshold){onThresholdCrossed(neuron);}


  // STYLING ====================
  cir = circle(neuron.x, neuron.y, neuron.diameter);
  // check if neuron is in blinking stage and stay blinking if so
  if(neuron.currentBlink != 0 && neuron.currentBlink <= neuron.blinkFrames){
    cir = circle(neuron.x, neuron.y, neuron.diameter+20);
    neuron.c = color(255, 255, 255);
    neuron.currentBlink++;
  } else {
    neuron.c = color(255, 204, 185);
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
  // STYLING ====================

}

function draw(){
  background(50);

  if(selectedNeuron && stimulusDisplay){
    stimulusDisplay.elt.innerHTML = selectedNeuron.current.toFixed(3);
  }

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
