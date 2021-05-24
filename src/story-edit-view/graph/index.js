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
                //console.log("adding node",node);
                g.setNode(node.index,{label: JSON.stringify(node,null,2)})
            });

            //Edges are connections between nodes
            //We loop through the edge list
            //For each node entry we create a set of edges (a-->b)
            //Where a is the source or key
            //and b is a node in it's list
            data.edges.forEach((value,key) => {
                for(const entry of value){
                    //console.log("setting edge",key,"to",entry);
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
                /*
                let type = node.type.toLowerCase();
                let nodeInfo = JSON.stringify(node,null,2);
                nodeInfo = nodeInfo.substring(1, nodeInfo.length - 1);
                let nodeMeta = nodeInfo.split('\n');
                let maxLineLength = 0;
                for(let i = 0; i < nodeMeta.length; i++) {
                    if(nodeMeta[i].length > maxLineLength) {
                        maxLineLength = nodeMeta[i].length;
                    }
                console.log("node info",nodeInfo);
                }*/
                if(node.type == "popup") { 
                    //Create all part of the Interaction Unit
                    g.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
                    g.setNode(node.index + " E", {label: "Event: Popup prompt\n"+node.display, shape: "rect"});
                    // loop through options and assign an option, input, and feedback (if necessary)
                    let i = 1;
                    for(let option of node.options) {
                        g.setNode(node.index + " O"+i, {label: "Option: " + option, shape: "diamond"});
                        g.setNode(node.index + " I"+i, {label: "Input: " + node.input, shape: "circle"});
                        i++;
                    }
                    if(node.target) { g.setNode(node.index + " Fe", {label: "Feedback: Close dialogue box\n"
                        +"Variable assignment, "+node.target, shape: "rect"}); }
                    else { g.setNode(node.index + " Fe", {label: "Feedback: close dialogue box", shape: "rect"}); }

                    //Connect all the necessary edges
                    g.setEdge(node.index + " IP", node.index + " E");
                    i = 1;
                    for(let option of node.options) {
                        g.setEdge(node.index + " E", node.index + " O"+i);
                        g.setEdge(node.index + " O"+i, node.index + " I"+i);
                        g.setEdge(node.index + " I"+i, node.index + " Fe");
                        i++;
                    }
                } else if (node.type == "prompt") {
                    g.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
                    g.setNode(node.index + " E", {label: "Event: Popup prompt\n"+node.display+"\nDefault message\n"
                        + node.default, shape: "rect"});
                    g.setNode(node.index + " I0", {label: "Input: typing", shape: "circle"});
                    // loop through options and assign an option, input, and feedback (if necessary)
                    let i = 1;
                    for(let option of node.options) {
                        g.setNode(node.index + " O"+i, {label: "Option: " + option, shape: "diamond"});
                        g.setNode(node.index + " I"+i, {label: "Input: " + node.input, shape: "circle"});
                        i++;
                    }
                    if(node.target) { g.setNode(node.index + " Fe", {label: "Feedback: Close dialogue box\n"
                        +"Variable assignment, "+node.target, shape: "rect"}); }
                    else { g.setNode(node.index + " Fe", {label: "Feedback: close dialogue box", shape: "rect"}); }

                    //Connect all the necessary edges
                    g.setEdge(node.index + " IP", node.index + " E");
                    g.setEdge(node.index + " E", node.index + " I0");
                    i = 1;
                    for(let option of node.options) {
                        g.setEdge(node.index + " I0", node.index + " O"+i);
                        g.setEdge(node.index + " O"+i, node.index + " I"+i);
                        g.setEdge(node.index + " I"+i, node.index + " Fe");
                        i++;
                    }
                } else if(node.type == "content" || node.type == "body") {
                    g.setNode(node.index + " E", {label: "Event: \"" + node.script+'\"', shape: "rect"});
                } else if (node.type.toLowerCase() == "passagelink") {
                    if(node.display) {
                        g.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
                        g.setNode(node.index + " E", {label: "Event: Link text\n\"" + node.display+'\"', shape: "rect"});
                        g.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
                        g.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
                        g.setNode(node.index + " Fe", {label: "Feedback: Go to passage\n"+node.target, shape: "rect"});

                        g.setEdge(node.index + " IP", node.index + " E");
                        g.setEdge(node.index + " E", node.index + " O");
                        g.setEdge(node.index + " O", node.index + " I");
                        g.setEdge(node.index + " I", node.index + " Fe");
                    } else {
                        g.setNode(node.index + " E", {label: "Event: Go to passage\n" + node.target, shape: "rect"});
                    }
                } else if (node.type == "Passage") {
                    g.setNode(node.index + " E", {label: "Event: Passage\n" + node.name, shape: "rect"});
                } else if (node.type == "variable management") {
                    g.setNode(node.index + " E", {label: "Event: Variable management\n" + node.target 
                        + "\nbecomes\n" + node.value, shape: "rect"});
                } else if (node.type == "conditional") {
                    g.setNode(node.index + " Fo", {label: "Fork: Condition\n"+node.condition, shape: "diamond"});
                    if(node.value) { 
                        g.setNode(node.index + " E", {label: "Event:\n"+node.value, shape: "rect"}); 
                        g.setEdge(node.index + " Fo", node.index + " E", {label: "true"});
                    }
                }
            });

            //Edges are connections between nodes
            //We loop through the edge list
            //For each node entry we create a set of edges (a-->b)
            //Where a is the source or key
            //and b is a node in it's list
            data.edges.forEach((value,key) => {
                let tralse = true;
                //console.log("setting edges for",key);
                for(const entry of value){
                    if(key.type == "conditional") {
                        //console.log("looking at",key,"and child", entry);
                        if(key.value) { 
                            let postfix = ""
                            if(g.hasNode(entry.index + " IP")) {
                                postfix = " IP";
                            } else if(g.hasNode(entry.index + " E")) {
                                postfix = " E";
                            } else if(g.hasNode(entry.index + " Fo")) {
                                postfix = " Fo";
                            }
                            if(postfix != "") {
                                g.setEdge(key.index+" Fo",entry.index+postfix);
                            }
                        } else {
                            let postfix = ""
                            if(g.hasNode(entry.index + " IP")) {
                                postfix = " IP";
                            } else if(g.hasNode(entry.index + " E")) {
                                postfix = " E";
                            } else if(g.hasNode(entry.index + " Fo")) {
                                postfix = " Fo";
                            }
                            if(postfix != "") {
                                g.setEdge(key.index+" Fo",entry.index+postfix, {label: tralse});
                                tralse = false;
                            }
                        }
                    } else {
                        let prefix = "";
                        if(g.hasNode(key.index + " Fe")) {
                            prefix = " Fe";
                        } else if(g.hasNode(key.index + " E")) {
                            prefix = " E";
                        } else if(g.hasNode(entry.index + " Fo")) {
                            prefix = " Fo";
                        }
                        let postfix = ""
                        if(g.hasNode(entry.index + " IP")) {
                            postfix = " IP";
                        } else if(g.hasNode(entry.index + " E")) {
                            postfix = " E";
                        } else if(g.hasNode(entry.index + " Fo")) {
                            postfix = " Fo";
                        }

                        //console.log("attempting to parent",key.index+prefix,g.hasNode(key.index+prefix),key,
                        //    "to",entry.index+postfix,g.hasNode(entry.index+postfix),entry)
                        if(prefix != "" && postfix != "") {
                            g.setEdge(key.index+prefix,entry.index+postfix);
                        }
                    }
                }
            });
            console.log("finished");

            //Here we target the html element with the id graph
            //this is the element we will draw our graph in
            var svg = d3.select("#graph"),
            svgGroup = svg.append("g");


            try {
                // Create the renderer
                var render = new dagreD3.render();

                // Run the renderer. This is what draws the final graph.
                render(d3.select("#graph"), g);
            } catch(error){
                //This makes seeing errors bearable
                console.log("error of",error);
                console.log(g);
            }

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
