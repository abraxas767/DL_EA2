let LAYER_COUNT = 5;
let NEURON_COUNT = 5;
let NET_PADDING = 0.5;
let SYNAPTIC_PROB = 1;
let SCATTER = 0;
let STIMULATION = 10;

let neuralNet = [];
let drawSynapses = [];

let selectedNeuron = null;
let selectedLayerDisplay = "null";
let selectedNeuronDisplay = "null";

// for dynamic chart
var xVal = 0;
var yVal = 0;

class Neuron {
  layer = 0;
  index = 0;
  x = 0
  y = 0
  diameter = 10
  synapses = [];
  c = color(255, 204, 0);
  constructor(){}
}

function clearNeuralNet(){neuralNet = [];}

function applyChanges(){
    clearNeuralNet();
    setupNeurons();
    setupSynapes();
}

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
  var updateInterval = 500;
  // number of points visible at any point in time
  var dataLength = 250;

  var updateChart = function (count) {
    count = count || 1;
    for (var j = 0; j < count; j++) {
      yVal = yVal;
      dps.push({x: xVal,y: yVal});
      xVal+=0.5;
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
  let stimulate = select('#stimulate');
  stimulate.elt.onclick = () => {yVal += STIMULATION;}
  selectedLayerDisplay = select('#selectedLayer');
  selectedNeuronDisplay = select('#selectedNeuron');

  setupDynamicChart();
}

function getRandomNumberBetween(min,max){
    return Math.floor(Math.random()*(max-min+1)+min);
}

function setupSynapes(){
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
}

function setupNeurons(){
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

function draw(){
  background(50);

  // draw neurons
  neuralNet.forEach((layer)=>{
    // draw neuron
    layer.forEach((neuron)=>{
      let cir = circle(neuron.x, neuron.y, neuron.diameter);

      if(
        mouseX > neuron.x-neuron.diameter &&
        mouseX < neuron.x + neuron.diameter &&
        mouseY > neuron.y-neuron.diameter &&
        mouseY < neuron.y + neuron.diameter
      ){
        let cir = circle(neuron.x, neuron.y, neuron.diameter+20);

        if(mouseIsPressed){onNeuronSelect(neuron);}

      } else {cir.fill(neuron.c);}
      noStroke();
      // draw synapes
      neuron.synapses.forEach((pNeuron)=>{
        stroke(color(neuron.c.levels[0], neuron.c.levels[1], neuron.c.levels[2], 60));
        line(pNeuron.x, pNeuron.y, neuron.x, neuron.y);
      });
    });
  })

}
