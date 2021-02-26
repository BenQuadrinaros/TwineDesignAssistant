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

module.exports = Vue.extend({
	template: require('./index.html'),

	props: {
        mode: null
    },
    
    ready() {
    },
    computed: {
        tokens: function(){
            var tokens = tokenize(this.$parent.$parent.story);
            return JSON.stringify(tokens,null,4);
        },
        nodes: function(){
            var tokens = tokenize(this.$parent.$parent.story);
            console.log("tokens");
            var passages = covertToNode(tokens);
            return JSON.stringify(passages,null,4);
        },
        graph: function(){
            var story = this.$parent.$parent.story;
            var tokens = tokenize(this.$parent.$parent.story);
            var passages = covertToNode(tokens);
            var data = graphData(passages,story);
            return JSON.stringify(data.edges,null,4);
        },
        draw: function(){
            console.log("drawing graph data");
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
            data.nodes.forEach(node => {
               g.setNode(node.index,{label: JSON.stringify(node,null,2)})
            });

            //Edges are connections between nodes
            //We loop through the edge list
            //For each node entry we create a set of edges (a-->b)
            //Where a is the source or key
            //and b is a node in it's list
            data.edges.forEach((value,key) => {
                for(const entry of value){
                    g.setEdge(key.index,entry.index);
                }
            });

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
            console.log("completed");
        },
        drawStory: function(){
            console.log("drawing story graph");

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
            data.edges.forEach((value,key) => {
                for(const entry of value){
                    g.setEdge(key.index,entry.index);
                }
            });

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
                //passageLinks -> ellipses
                if(type == "passagelink" || node.input) { g.setNode(node.index, {label: nodeInfo, shape: "ellipse",
                    width: 7 * maxLineLength, height: 15 * nodeMeta.length}) }
                //Passage headings -> circles
                else if(type == "passage") { g.setNode(node.index, {label: nodeInfo, shape: "circle"}) }
            });

            //Edges are connections between nodes
            //We loop through the edge list
            //For each passage or passage link,
            //we find all passage and passage links
            //that are connected to this one
            //Then, we create a set of edges (a-->b)
            //Where a is the source and b are all targets
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
