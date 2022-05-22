const NET_PADDING = 0.5;
let stimulusDisplay = null;

let LAYER_COUNT = 5;
let NEURON_COUNT = 2;
let SYNAPTIC_PROB = 1;
let SCATTER = 0;
let STIMULATION = 5;
let MODEL = 'blob';
let BACKWARDS_CONNECTIONS = false;
let RECREATIONAL_TIME = 100;
let RANDOMIZE_POTENTIAL = false;

let neuralNet = [];
let drawSynapses = [];

let selectedNeuron = null;
let selectedLayerDisplay = "null";
let selectedNeuronDisplay = "null";
let selectedNeuronSynapses = null;

const WEIGHT_DECAY = 0.001;
const LEARNING_RATE = 0.06;
let POST_SYNAPTIC_IMPULSE = 0.08; // Ampere
const INITIAL_WEIGHT = 0.5;
let CONST_INPUT_CURRENT = 0 // Ampere pro sekunde

// for dynamic chart
var xVal = 0;
var yVal = 20;

let time = 0;
let framesPassed = 0;
let fps = 60;


let postSynapticImpulsDisplay = null;

class Neuron {
  // I = Q/t
  current = 0;
  // difference in electric potential between interior and
  // exterior of the membran
  RESTING_POTENTIAL = -0.07;
  currentMembranePotential = -0.07 // mV
  threshold = -0.055; // mV
  MEMBRANE_RESISTANCE = 1; // ohm
  // holds all postsynaptic cohnnections
  synapses = [];
  // holds correlating synaptic weights
  synapticWeights = [];
  // used to determine weither a neuron is in the process
  // of beeing stimulated
  impulses = [];
  stimulateDT = null;
  recreationalTimestamp = null;
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
  var updateInterval = 10;
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

  let currentStimulus = select('#currentStimulus');
  stimulusDisplay = currentStimulus;

  selectedNeuronSynapses = select("#synapses");

  // get slider values
  let layerSlider = select('#layerCount');
  layerSlider.elt.oninput = () =>{LAYER_COUNT = layerSlider.elt.value;applyChanges();}
  let neuronSlider = select('#neuronCount');
  neuronSlider.elt.oninput = () =>{NEURON_COUNT = neuronSlider.elt.value;applyChanges();}
  let postSynapticImpulsSlider = select('#postSynapticImpuls');
  postSynapticImpulsSlider.elt.oninput = () => {
    POST_SYNAPTIC_IMPULSE = postSynapticImpulsSlider.elt.value;
    postSynapticImpulsDisplay.elt.innerText = POST_SYNAPTIC_IMPULSE;
    applyChanges();
  }
  postSynapticImpulsDisplay = select('#amp');
  let synapticSlider = select('#synapticProb');
  synapticSlider.elt.oninput = () => {SYNAPTIC_PROB = synapticSlider.elt.value;applyChanges();}
  let redraw = select('#redraw');
  redraw.elt.onclick = () => {applyChanges();}
  selectedLayerDisplay = select('#selectedLayer');
  selectedNeuronDisplay = select('#selectedNeuron');


  let constantStimulation = select('#constant');
  constantStimulation.elt.onmousedown = () => {
    if(selectedNeuron == null){return;}
    CONST_INPUT_CURRENT = 0.04;
    selectedNeuron.stimulateDT = Date.now();
  }
  constantStimulation.elt.onmouseup = () => {
    if(selectedNeuron == null){return;}
    CONST_INPUT_CURRENT = 0;
    selectedNeuron.stimulateDT = null;
  }

  let stimulate = select('#stimulate');
  stimulate.elt.onclick = () => {
    if(selectedNeuron == null){return;}
    selectedNeuron.impulses.push({t: Date.now(), w: 1});
  }

  setupDynamicChart();
}

function getRandomNumberBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function setupSynapes(){
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
        neuron.synapticWeights.push(INITIAL_WEIGHT);
      }
    });
  });
}

function setupNeurons(){
  for(let i=1;i<=NEURON_COUNT;i++){
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

function setup(){
  time = Date.now();
  setupCanvas();
  setupNeurons();
  setupSynapes();
}

function onNeuronSelect(neuron){
  selectedNeuron = neuron;
  selectedNeuronDisplay.elt.innerHTML = neuron.index;
  selectedLayerDisplay.elt.innerHTML = neuron.layer;
}

function arrayRemove(arr, value) {
    return arr.filter(function(ele){
      return ele != value;
    });
}
function onThresholdCrossed(neuron){
  neuron.synapses.forEach((pNeuron, index) => {
    let weight = neuron.synapticWeights[index];
    pNeuron.impulses.push({t: Date.now(), w: weight});
  });

  neuron.recreationalTimestamp = Date.now();
  // reset to resting potential
  neuron.currentMembranePotential = neuron.RESTING_POTENTIAL;
  let cir = circle(neuron.x, neuron.y, neuron.diameter + 20);
}

function log_every(intervall, log){
  if(frameCount % intervall == 0){
    console.log(log);
  }
}

function onHoverNeuron(neuron){

  let preSynapticCurrent = 0;

  neuron.impulses.forEach((impuls)=> {
    if(Date.now() - impuls.t <= 100){
      preSynapticCurrent = (POST_SYNAPTIC_IMPULSE * neuron.MEMBRANE_RESISTANCE) / Math.floor(fps);
    } else if(Date.now() - impuls.t <= 0){
      neuron.impulses = arrayRemove(neuron.impulses, impuls);
    }
  });

  let tau = 0.8 / Math.floor(fps);

  let leaky_current = - tau * (neuron.currentMembranePotential - neuron.RESTING_POTENTIAL);

  let relCurrent = CONST_INPUT_CURRENT / (Math.floor(fps));

  let dia = 0;

  if(neuron.recreationalTimestamp == null){
    if(neuron == selectedNeuron){
      neuron.currentMembranePotential += relCurrent;
    }
    neuron.currentMembranePotential += leaky_current + preSynapticCurrent;
  } else if(Date.now() - neuron.recreationalTimestamp > RECREATIONAL_TIME){
    neuron.recreationalTimestamp = null;
  } else {
    dia = 0.1 * (Date.now() - neuron.recreationalTimestamp);
  }


  if(neuron.currentMembranePotential >= neuron.threshold){onThresholdCrossed(neuron);}


  if(neuron.synapticWeights.length != 0){

    neuron.synapses.forEach((pNeuron, index) =>{
      let synapticWeight = neuron.synapticWeights[index];
      let preSynapticActivity = (neuron.currentMembranePotential - neuron.RESTING_POTENTIAL) / (neuron.threshold - neuron.RESTING_POTENTIAL)
      let postSynapticActivity = (pNeuron.currentMembranePotential - pNeuron.RESTING_POTENTIAL) / (pNeuron.threshold - pNeuron.RESTING_POTENTIAL);

      let neuronalActivity = LEARNING_RATE * ((1 - neuron.synapticWeights[index]) * preSynapticActivity * postSynapticActivity);
      neuron.synapticWeights[index] += neuronalActivity - (WEIGHT_DECAY * neuron.synapticWeights[index])
    });

  }

  // STYLING ====================
  cir = circle(neuron.x, neuron.y, neuron.diameter + dia);

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

  if(frameRate() <= 10){
    fps = 60;
  } else {
    fps = frameRate();
  }

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
