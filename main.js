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

// Input current: I = Q/t -> charge / time
const INPUT_CHARGE = 500; // C -> coulomb
const IMPULS_TIME = 200; // ms -> milliseconds
const INPUT_U = 1.5// in volt
const INPUT_CURRENT = 0.008;
const WEIGHT_DECAY = 0.0001;
const LEARNING_RATE = 0.05;
const INITIAL_WEIGHT = 1;
let CONST_INPUT_CURRENT = 0 // Ampere pro sekunde

// for dynamic chart
var xVal = 0;
var yVal = 20;

let time = 0;
let framesPassed = 0;
let fps = 60;

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

  selectedNeuronSynapses = select("#synapses");

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


  let constantStimulation = select('#constant');
  constantStimulation.elt.onmousedown = () => {
    if(selectedNeuron == null){return;}
    CONST_INPUT_CURRENT = 0.02;
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
    selectedNeuron.currentMembranePotential += INPUT_CURRENT;
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
          neuron.synapticWeights.push(INITIAL_WEIGHT);
        }
      });
      console.log(neuron.synapticWeights);
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

function onThresholdCrossed(neuron){

  neuron.synapses.forEach((pNeuron, index) => {
    let weight = neuron.synapticWeights[index];
    pNeuron.currentMembranePotential += (INPUT_CURRENT * weight);
  });

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

  // I = R / u

  let tau = 1 / Math.floor(fps);

  let leaky_current = - tau * (neuron.currentMembranePotential - neuron.RESTING_POTENTIAL);

  let relCurrent = CONST_INPUT_CURRENT / (Math.floor(fps));

  if(neuron == selectedNeuron){
    neuron.currentMembranePotential += relCurrent;
  }

  neuron.currentMembranePotential += leaky_current;

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

  // for(let s=0;s<neuron.synapses.length;s++){
  //   if(Date.now() - neuron.synapses[s].stimulateDT >= IMPULS_TIME && neuron.synapses[s] != selectedNeuron){
  //     neuron.synapses[s].stimulateDT = null;
  //   }
  // }

  // integrate leaky model
  //if(neuron.currentMembranePotential > neuron.RESTING_POTENTIAL){}

  // STYLING ====================
  cir = circle(neuron.x, neuron.y, neuron.diameter);

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
