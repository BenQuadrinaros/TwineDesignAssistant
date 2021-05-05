/*
Draws connector lines between passages.
*/

const Vue = require('vue');
const d3 = require('d3');
const zoom = require('d3-zoom');
const dagre = require('dagre');
const dagreD3 = require('dagre-d3')
const linkParser = require('./link-parser');
const { map } = require('core-js/fn/array');
const tokenize = require('./tokenize');
const covertToNode = require('./translate');
const graphData = require('./graphData');
const passage = require('../../data/actions/passage');
require('./index.less');

var tokenStore = null;
var nodeStore = null;
var graphStore = null;
var drawStore = null;
var storyStore = null;
var renderer = new dagreD3.render();

module.exports = Vue.extend({
	template: require('./index.html'),

	props: {
        mode: null
    },
    
    ready() {
    },
    computed: {
        tokens: function() {
            //If tokens have not been generated
            if(tokenStore == null) { tokenStore = tokenize(this.$parent.$parent.story); }
            return JSON.stringify(tokenStore,null,4);
        },
        nodes: function() {
            //If nodes have not been generated
            if(nodeStore == null) {
                //If tokens have not been generated
                if(tokenStore == null) { tokenStore = tokenize(this.$parent.$parent.story); }
                nodeStore = covertToNode(tokenStore);
            }
            return JSON.stringify(nodeStore,null,4);
        },
        graph: function() {
            //If graph has not been generated
            if(graphStore == null) {
                //If nodes have not been generated
                if(nodeStore == null) {
                    //If tokens have not been generated
                    if(tokenStore == null) { tokenStore = tokenize(this.$parent.$parent.story); }
                    nodeStore = covertToNode(tokenStore);
                }
                graphStore = graphData(nodeStore,this.$parent.$parent.story);
            }
            return JSON.stringify(graphStore.edges,null,4);
        },
        draw: function() {
            console.log("checking draw",drawStore);
            //If the graph data has not been drawn
            if(drawStore == null) {
                //If graph has not been generated
                if(graphStore == null) {
                    //If nodes have not been generated
                    if(nodeStore == null) {
                        //If tokens have not been generated
                        if(tokenStore == null) { 
                            //See token.js for details this turns the story's script into individual tokens
                            //Each token represent a piece of content, html or a macro
                            tokenStore = tokenize(this.$parent.$parent.story); 
                        }
                        //Convert these tokens to nodes, node extract specific information from each token
                        //These details include a type category and most macros produce a value
                        nodeStore = covertToNode(tokenStore);
                    }
                    //This creates a graph data structure see graphData.js for more details. The graph contains
                    // a representation of every reach macro,content,html in a story and how they are related.
                    graphStore = graphData(nodeStore,this.$parent.$parent.story);
                }

                console.log("creating graph drawing");
                //Dagre-layout setup we let dagre handle figuring out the x and y positions for each node
                //We can replace this layout module with any other layout module 
                var g = new dagre.graphlib.Graph();
                // Set an object for the graph label
                g.setGraph({});
                // Default to assigning a new object as a label for each new edge.
                g.setDefaultEdgeLabel(function() { return {}; });

                //We loop through all our graph nodes and create a corresponding d3 node that matches
                graphStore.nodes.forEach(node => {
                g.setNode(node.index,{label: JSON.stringify(node,null,2)})
                });

                //Edges are connections between nodes. We loop through the edge list
                // for each node entry we create a set of edges (a-->b),
                // where a is the source or key and b is a node in it's list
                graphStore.edges.forEach((value,key) => {
                    for(const entry of value){
                        g.setEdge(key.index,entry.index);
                    }
                });
                drawStore = g;
            }

            //Here we target the html element with the id graph
            // this is the element we will draw our graph in
            var svg = d3.select("#graph"),
            svgGroup = svg.append("g");

            // Run the renderer. This is what draws the final graph.
            renderer(d3.select("#graph"), drawStore);

            //Set up the width,height, and coordinate system for the graph
            svg.attr('width', drawStore.graph().width + 40);
            svg.attr('height', drawStore.graph().height * 1.1 + 100);
            svg.attr('viewBox', `0 0 ${drawStore.graph().width} ${drawStore.graph().height}`);
            console.log("completed");
            drawStore = null;
            console.log("draw",drawStore);
        },
        drawStory: function(){
            console.log("checking story",storyStore);
            //If the story graph has not been drawn
            if(storyStore == null) {
                //If graph has not been generated
                if(graphStore == null) {
                    //If nodes have not been generated
                    if(nodeStore == null) {
                        //If tokens have not been generated
                        if(tokenStore == null) { 
                            //See token.js for details this turns the story's script into individual tokens
                            //Each token represent a piece of content, html or a macro
                            tokenStore = tokenize(this.$parent.$parent.story); 
                        }
                        //Convert these tokens to nodes, node extract specific information from each token
                        //These details include a type category and most macros produce a value
                        nodeStore = covertToNode(tokenStore);
                    }
                    //This creates a graph data structure see graphData.js for more details. The graph contains
                    // a representation of every reach macro,content,html in a story and how they are related.
                    graphStore = graphData(nodeStore,this.$parent.$parent.story);
                }

                console.log("creating story graph");
                //Dagre-layout setup we let dagre handle figuring out the x and y positions for each node
                //We can replace this layout module with any other layout module 
                var g = new dagre.graphlib.Graph();
                // Set an object for the graph label
                g.setGraph({});
                // Default to assigning a new object as a label for each new edge.
                g.setDefaultEdgeLabel(function() { return {}; });

                //We loop through all our graph nodes and create a corresponding d3 node that matches
                //Change node shape and color for each type 
                graphStore.nodes.forEach(node => {
                    let type = node.type.toLowerCase();
                    let nodeInfo = JSON.stringify(node,null,2);
                    nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                    let nodeMeta = nodeInfo.split('\n');
                    let maxLineLength = 0;
                    for(let i = 0; i < nodeMeta.length; i++) {
                        if(nodeMeta[i].length > maxLineLength) {
                            maxLineLength = nodeMeta[i].length;
                        }
                    }
                    //conditionals, set -> diamonds
                    if(type == "conditional" || type == "set") { g.setNode(node.index, {label: nodeInfo, shape: "diamond",
                        width: 6 * maxLineLength, height: 16 * nodeMeta.length}) }
                    //passageLinks -> ellipses
                    else if(type == "passagelink") { g.setNode(node.index, {label: nodeInfo, shape: "ellipse",
                        width: 7 * maxLineLength, height: 15 * nodeMeta.length}) }
                    //content -> colored rects
                    else if(type == "content") { g.setNode(node.index, {label: nodeInfo, shape: "rect"}) }
                    //Passage headings -> circles
                    else if(type == "passage") { g.setNode(node.index, {label: nodeInfo, shape: "circle"}) }
                    //default rect with no color
                    else { g.setNode(node.index, {label: nodeInfo}) }
                });

                //Edges are connections between nodes
                //We loop through the edge list
                //For each node entry we create a set of edges (a-->b)
                //Where a is the source or key
                //and b is a node in it's list
                graphStore.edges.forEach((value,key) => {
                    for(const entry of value){
                        g.setEdge(key.index,entry.index);
                    }
                });
                storyStore = g;
            }

            //Here we target the html element with the id graph
            //this is the element we will draw our graph in
            var svg = d3.select("#graph"),
            svgGroup = svg.append("g");

            // Run the renderer. This is what draws the final graph.
            renderer(d3.select("#graph"), storyStore);

            //Set up the width,height, and coordinate system for the graph
            svg.attr('width', storyStore.graph().width + 40);
            svg.attr('height', storyStore.graph().height * 1.1 + 100);
            svg.attr('viewBox', `0 0 ${storyStore.graph().width} ${storyStore.graph().height}`);
            console.log("completed");
            storyStore = null;
            console.log("story",storyStore);
        },
        drawStory2: function(){
            console.log("drawing story graph2");

            var story = this.$parent.$parent.story;
            //See token.js for details this turns the story's script into individual tokens
            //Each token represent a piece of content, html or a macro
            var tokens = tokenize(this.$parent.$parent.story);
            //Convert these tokens to nodes, node extract specific information from each token
            //These details include a type category and most macros produce a value
            var passages = covertToNode(tokens);
            //This creates a graph data structure see graphData.js for more details. The graph
            //contains a representation of every reach macro,content,html in a story and how they are 
            //related.
            var data = graphData(passages,story);

            //Dagre-layout setup we let dagre handle figuring out the x and y positions for each node
            //We can replace this layout module with any other layout module 
            var g = new dagre.graphlib.Graph();
            // Set an object for the graph label
            g.setGraph({});
            // Default to assigning a new object as a label for each new edge.
            g.setDefaultEdgeLabel(function() { return {}; });

            //We loop through all our graph nodes and create a corresponding d3 node that matches
            //Change node shape and color for each type 
            data.nodes.forEach(node => {

                //If this node is our addition, do not act upon
                console.log("index of " + node.index);
                delete node.depth;
                if(!(typeof node.index == "string" && node.index.indexOf("input ") == 0)) {

                    //Get some data for number of lines and longest line for shape generation
                    let nodeInfo = JSON.stringify(node,null,2);
                    nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                    let nodeMeta = nodeInfo.split('\n');
                    let maxLineLength = 0;
                    for(let i = 0; i < nodeMeta.length; i++) {
                        if(nodeMeta[i].length > maxLineLength) {
                            maxLineLength = nodeMeta[i].length;
                        }
                    }

                    //Create corresponding Story Graph nodes depending on function of this node
                    let type = node.type.toLowerCase();
                    console.log(" type " + type);
                    node.structure = "";
                    //Passage headings -> circles
                    if(type == "passage") { 
                        node.structure = "Passage";
                        nodeInfo = JSON.stringify(node,null,2);
                        nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                        g.setNode(node.index, {label: nodeInfo, shape: "circle"}); 
                    }
                    //PassageLinks are options to the player
                    if(type == "passagelink") {
                        //If this node also requires input to advance
                        if(node.input) {
                            //Add a new node below for the interaction
                            console.log(" double");
                            let temp = JSON.parse(JSON.stringify(node));
                            temp.index = "input " + temp.index;
                            console.log("  new index " + temp.index);
                            temp.parent = node.index;
                            delete temp.display;
                            data.nodes.push(temp);
                            console.log("  added in node");
                            
                            //Add this as a node in the graph
                            temp.structure = "Input";
                            nodeInfo = JSON.stringify(temp,null,2);
                            nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                            g.setNode(temp.index, {label: nodeInfo, shape: "ellipse",
                                width: 7 * maxLineLength, height: 15 * nodeMeta.length});

                            //Finally connect and inherit the edges
                            g.setEdge(node.index, temp.index);
                            console.log("  connecting " + node.index + " to " + temp.index);
                            data.edges.set(temp, data.edges.get(node));
                            console.log("  inherited edges");
                            data.edges.set(node, new Set([temp]));
                            console.log("  cleared duplicates");
                        }
                        node.structure = "Option";
                        delete node.target;
                        delete node.input;
                        nodeInfo = JSON.stringify(node,null,2);
                        nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                        g.setNode(node.index, {label: nodeInfo, shape: "diamond",
                            width: 6 * maxLineLength, height: 16 * nodeMeta.length});
                    }
                    //Any node with just input are required inputs to the player
                    else if(node.input) {
                        node.structure = "Input";
                        nodeInfo = JSON.stringify(node,null,2);
                        nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                        g.setNode(node.index, {label: nodeInfo, shape: "ellipse",
                            width: 7 * maxLineLength, height: 15 * nodeMeta.length});
                    }
                } else { console.log("skipping " + node.index); }
            });

            //Edges are connections between nodes, we loop through the edge list.
            //For each passage or passage link, we find all passage and passage links
            //  that are connected to this one.
            //Then, we create a set of edges (a-->b), where a is the parent and b are
            //  all children that fit the criteria.
            for(let key of data.edges.keys()) { 
                //Go through all nodes
                if(key.type.toLowerCase() == "passage" || key.type.toLowerCase() == "passagelink" || key.input) {
                    //Only look for edges if the node is passage or passagelink
                    let toSearch = new Set([]);
                    for(let entry of data.edges.get(key).keys()) {
                        toSearch.add(entry);
                    }
                    //Create a search set from all connected nodes
                    for(tempNode of toSearch.keys()) {
                        //If this node is a passage or passagelink
                        if(tempNode.type.toLowerCase() == "passagelink" || tempNode.type.toLowerCase() == "passage" ||
                            tempNode.input) {
                            //Add it to the edge list with its previous connection
                            g.setEdge(key.index, tempNode.index);
                        } else {
                            //Otherwise, add all its connections to the search set
                            if(data.edges.has(tempNode)) {
                                for(let entry of data.edges.get(tempNode).keys()) {
                                    toSearch.add(entry);
                                }
                            }
                        }
                    }
                }
            }

            //Here we target the html element with the id graph
            //this is the element we will draw our graph in
            var svg = d3.select("#graph"),
            svgGroup = svg.append("g");

            
            // Create the renderer
            var render = new dagreD3.render();

            // Run the renderer. This is what draws the final graph.
            render(d3.select("#graph"), g);

            //Set up the width,height, and coordinate system for the graph
            svg.attr('width', g.graph().width + 40);
            svg.attr('height', g.graph().height * 1.1 + 100);
            svg.attr('viewBox', `0 0 ${g.graph().width} ${g.graph().height}`);
        }
    },
	components: {
		
	}
});
