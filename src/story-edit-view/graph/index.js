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

function mappingConvertNode(graph, node) {
    //Create all part of the Interaction Unit
    if(node.type == "popup") { 
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Popup prompt\n"+node.display, shape: "rect"});
        // loop through options and assign an option, input, and feedback (if necessary)
        let i = 1;
        for(let option of node.options) {
            graph.setNode(node.index + " O"+i, {label: "Option: " + option, shape: "diamond"});
            graph.setNode(node.index + " I"+i, {label: "Input: " + node.input, shape: "circle"});
            i++;
        }
        if(node.target) { graph.setNode(node.index + " Fe", {label: "Feedback: Close dialogue box\n"
            +"Variable assignment, "+node.target, shape: "rect"}); }
        else { graph.setNode(node.index + " Fe", {label: "Feedback: close dialogue box", shape: "rect"}); }

        //Connect all the necessary edges
        graph.setEdge(node.index + " IP", node.index + " E");
        i = 1;
        for(let option of node.options) {
            graph.setEdge(node.index + " E", node.index + " O"+i);
            graph.setEdge(node.index + " O"+i, node.index + " I"+i);
            graph.setEdge(node.index + " I"+i, node.index + " Fe");
            i++;
        }
    } else if (node.type == "prompt") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Popup prompt\n"+node.display+"\nDefault message\n"
            + node.default, shape: "rect"});
        graph.setNode(node.index + " I0", {label: "Input: typing", shape: "circle"});
        // loop through options and assign an option, input, and feedback (if necessary)
        let i = 1;
        for(let option of node.options) {
            graph.setNode(node.index + " O"+i, {label: "Option: " + option, shape: "diamond"});
            graph.setNode(node.index + " I"+i, {label: "Input: " + node.input, shape: "circle"});
            i++;
        }
        if(node.target) { graph.setNode(node.index + " Fe", {label: "Feedback: Close dialogue box\n"
            +"Variable assignment, "+node.target, shape: "rect"}); }
        else { graph.setNode(node.index + " Fe", {label: "Feedback: close dialogue box", shape: "rect"}); }

        //Connect all the necessary edges
        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " I0");
        i = 1;
        for(let option of node.options) {
            graph.setEdge(node.index + " I0", node.index + " O"+i);
            graph.setEdge(node.index + " O"+i, node.index + " I"+i);
            graph.setEdge(node.index + " I"+i, node.index + " Fe");
            i++;
        }
    } else if(node.type == "content") {
        graph.setNode(node.index + " E", {label: "Event: \"" + node.script+'\"', shape: "rect"});
    } else if(node.type == "body") {
        graph.setNode(node.index + " Fe", {label: "Feedback: \"" + node.script+'\"', shape: "rect"});
    } else if (node.type.toLowerCase() == "passagelink") {
        if(node.display) {
            graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
            graph.setNode(node.index + " E", {label: "Event: Link text\n\"" + node.display+'\"', shape: "rect"});
            graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
            graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
            graph.setNode(node.index + " Fe", {label: "Feedback: Go to passage\n"+node.target, shape: "rect"});

            graph.setEdge(node.index + " IP", node.index + " E");
            graph.setEdge(node.index + " E", node.index + " O");
            graph.setEdge(node.index + " O", node.index + " I");
            graph.setEdge(node.index + " I", node.index + " Fe");
        } else {
            graph.setNode(node.index + " E", {label: "Event: Go to passage\n" + node.target, shape: "rect"});
        }
    } /*else if (node.type == "Passage") {
        // Remove passages since they are not visible to players
        graph.setNode(node.index + " E", {label: "Event: Passage\n" + node.name, shape: "rect"});
    }*/ else if (node.type == "variable management") {
        graph.setNode(node.index + " E", {label: "Event: Variable management\n" + node.target 
            + "\nbecomes\n" + node.value, shape: "rect"});
    } else if (node.type == "conditional") {
        graph.setNode(node.index + " Fo", {label: "Fork: Condition\n"+node.condition, shape: "diamond"});
        if(node.value) { 
            graph.setNode(node.index + " E", {label: "Event:\n"+node.value, shape: "rect"}); 
            graph.setEdge(node.index + " Fo", node.index + " E", {label: "true"});
        }
    } else if(node.type == "live") {
        //DOES THIS INVOLVE INPUT??
        if(node.value) {
            graph.setNode(node.index + " E", {label: "Event: live\nafter"+node.duration+"\nskippable increments of\n"+
                node.value, shape: "rect"});
        } else {
            graph.setNode(node.index + " E", {label: "Event: live\nafter"+node.duration, shape: "rect"});
        }
    } else if(node.type == "stop") {
        graph.setNode(node.index + " E", {label: "Event: Stops current live: events", shape: "rect"});
    } else if(node.type == "link-reveal") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Link text\n\"" + node.display+'\"', shape: "rect"});
        graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        graph.setNode(node.index + " Fe", {label: "Feedback: Reveal body text", shape: "rect"});

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
    } else if(node.type == "link-replace") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Link text\n\"" + node.display+'\"', shape: "rect"});
        graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        graph.setNode(node.index + " Fe", {label: "Feedback: Replace with body text", shape: "rect"});

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
    } else if(node.type == "link-repeat") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Link text\n" + node.display+'', shape: "rect"});
        graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        graph.setNode(node.index + " Fe", {label: "Feedback: Add body text or\nperform body function\nfor each interaction", shape: "rect"});

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
        // Since the interaction can be repeated unlimited number of times, 
        //  Feedback node connects to the Option node
        graph.setEdge(node.index + " Fe", node.index + " O");
    } else if(node.type == "link-rerun") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Link text\n" + node.display+'', shape: "rect"});
        graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        graph.setNode(node.index + " Fe", {label: "Feedback: Replace body text with\nnew result", shape: "rect"});

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
        // Since the interaction can be repeated unlimited number of times, 
        //  Feedback node connects to the Option node
        graph.setEdge(node.index + " Fe", node.index + " O");
    } else if(node.type == "link-cycle") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Link text\n\"" + node.display+'\"', shape: "rect"});
        let options = "\n";
        for(let opt of node.value) { options += opt + "\n"; }
        graph.setNode(node.index + " O", {label: "Options to cycle: " + options, shape: "diamond", height: 32*node.value.length});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        if(node.target) {
            let misc = "\n";
            if(node.loops) { misc += "Can repeat values"; }
            else { misc += "Cannot repeat values"; }
            graph.setNode(node.index + " Fe", {label: "Feedback: Cycle to next value\n"+node.target+" variable"+misc, shape: "rect"});
        } else {
            let misc = "\n";
            if(node.loops) { misc += "Can repeat values"; }
            else { misc += "Cannot repeat values"; }
            graph.setNode(node.index + " Fe", {label: "Feedback: Cycle to next value"+misc, shape: "rect"});
        }

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
        // Since the interaction is cyclical, Feedback node connects to the Option node
        graph.setEdge(node.index + " Fe", node.index + " O");
    } else if(node.type == "show") {
        if(node.input) {
            // Either used manually as a link
            graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
            graph.setNode(node.index + " E", {label: "Event: Link text\n\"" + node.display+'\"', shape: "rect"});
            graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
            graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
            graph.setNode(node.index + " Fe", {label: "Feedback: Reveal body\n"+node.target, shape: "rect"});

            graph.setEdge(node.index + " IP", node.index + " E");
            graph.setEdge(node.index + " E", node.index + " O");
            graph.setEdge(node.index + " O", node.index + " I");
            graph.setEdge(node.index + " I", node.index + " Fe");
        } else {
            // Or an automatic process
            graph.setNode(node.index + " E", {label: "Event: Reveal body\n"+node.target, shape: "rect"});
        }
    } else if(node.type == "enchant") {
        if(node.value) {
            if(node.target) {
                if(node.duration) {
                    graph.setNode(node.index + " E", {label: "Event: enchant"+node.target+"\n"+node.value+"\nfor"+
                        node.duration, shape: "rect"});
                } else {
                    graph.setNode(node.index + " E", {label: "Event: enchant"+node.target+"\n"+node.value, shape: "rect"});
                }
            } else {
                graph.setNode(node.index + " E", {label: "Event: enchant text\n"+node.value, shape: "rect"});
            }
        } else {
            graph.setNode(node.index + " E", {label: "Event: enchant text", shape: "rect"});
        }
    } else if(node.type == "print") {
        graph.setNode(node.index + " E", {label: "Event: Prints "+node.value+"\nin a readable format", shape: "rect"});
    } else if(node.type == "border") {
        graph.setNode(node.index + " E", {label: "Event: Creates a border of style\n"+node.value+"\naround body text",
            shape: "rect"});
    } else if(node.type == "border-modifier") {
        graph.setNode(node.index + " E", {label: "Event: Modifies border by\n"+node.value, shape: "rect"});
    } else if(node.type == "text-box") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        let pos = node.position[0] + ", ";
        if(node.position.length > 1) { pos += node.position[1] + " lines tall,"; }
        graph.setNode(node.index + " E", {label: "Event: Text box with format\n"+pos+"\n and starting text\n"+
            node.display, shape: "rect"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        if(node.target) {
            graph.setNode(node.index + " Fe", {label: "Feedback: Text box fills with\n player's typing\n"+node.target+
                " with inputted text", shape: "rect"});
        } else {
            graph.setNode(node.index + " Fe", {label: "Feedback: Text box fills with\n player's typing", shape: "rect"});
        }

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
    } else if(node.type == "force-text-box") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        let pos = node.position[0];
        if(node.position.length > 1) { pos += ", " + node.position[1] + " lines tall"; }
        graph.setNode(node.index + " E", {label: "Event: Text box with format\n"+pos, shape: "rect"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        if(node.target) {
            graph.setNode(node.index + " Fe", {label: "Feedback: Text box fills with\n"+node.display+"\n"+node.target+
                " with inputted text", shape: "rect"});
        } else {
            graph.setNode(node.index + " Fe", {label: "Feedback: Text box fills with\n"+node.display, shape: "rect"});
        }

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
    } else if(node.type == "checkbox") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Checkbox with text\n " + node.display, shape: "rect"});
        graph.setNode(node.index + " O", {label: "Option: Checkbox", shape: "diamond"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        graph.setNode(node.index + " Fe", {label: "Feedback: Toggle chackbox status and\n "+node.target, shape: "rect"});

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
    } else if(node.type == "fullscreen") {
        graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
        graph.setNode(node.index + " E", {label: "Event: Link text or checkbox with\n " + node.display, shape: "rect"});
        graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
        graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
        graph.setNode(node.index + " Fe", {label: "Feedback: Toggle fullscreen status", shape: "rect"});

        graph.setEdge(node.index + " IP", node.index + " E");
        graph.setEdge(node.index + " E", node.index + " O");
        graph.setEdge(node.index + " O", node.index + " I");
        graph.setEdge(node.index + " I", node.index + " Fe");
    }  else if(node.type == "meter") {
        let misc = "";
        if(node.display) { misc += "\n display parameters\n "+node.display; }
        graph.setNode(node.index + " E", {label: "Event: Displays a meter of\n "+node.target+"\n with max value of\n "+
            node.value+misc, shape: "rect"});
    } else if(node.type == "undo") {
        if(node.input) {
            // Either used manually as a link
            graph.setNode(node.index + " IP", {label: "Interaction Point: "+node.type, shape: "ellipse"});
            graph.setNode(node.index + " E", {label: "Event: "+node.input+" text\n\"" + node.display+'\"', shape: "rect"});
            graph.setNode(node.index + " O", {label: "Option: " + node.display, shape: "diamond"});
            graph.setNode(node.index + " I", {label: "Input: " + node.input, shape: "circle"});
            graph.setNode(node.index + " Fe", {label: "Feedback: Reverts to previous passage.\nAlso resets any changes since then",
                shape: "rect"});

            graph.setEdge(node.index + " IP", node.index + " E");
            graph.setEdge(node.index + " E", node.index + " O");
            graph.setEdge(node.index + " O", node.index + " I");
            graph.setEdge(node.index + " I", node.index + " Fe");
        } else {
            // Or an automatic process
            graph.setNode(node.index + " E", {label: "Event: Reverts to previous passage.\nAlso resets any changes since then",
                shape: "rect"});
        }
    } else if(node.type != "Passage") {
        console.log("I need to handle this case:",node.type);
    }

    return graph;
};

function mappingCreateEdges(graph, data) {
    // Edges are connections between nodes;
    // We loop through the edge list,
    //  for each node entry we create a set of edges (a-->b),
    //  where a is the source or key and b is a node in it's list
    //console.error(data.edges);
    data.edges.forEach((value,key) => {
        let tralse = true;
        //console.log("setting edges for",key);
        for(const entry of value){
            if(key.type == "Passage") {
                // Passages are excluded from the mapping layer since the player
                //  has no perception of them
                //console.log("children would be",data.edges.get(key));
                null;
            } else if(key.type == "conditional") {
                // Conditionals can create a branching structure
                //console.log("looking at",key,"and child", entry);
                let postfix = ""
                // First nodes are, in this order of appearence: Interaction Points, Events, or Forks
                if(entry.type == "Passage") { console.log("need to address this case"); }
                if(graph.hasNode(entry.index + " IP")) {
                    postfix = " IP";
                } else if(graph.hasNode(entry.index + " E")) {
                    postfix = " E";
                } else if(graph.hasNode(entry.index + " Fo")) {
                    postfix = " Fo";
                } else if(graph.hasNode(entry.index + " Fe")) {
                    postfix = " Fe";
                }
                if(postfix != "") {
                    // If a child node exists, link them together
                    if(key.condition.indexOf("if") > -1 && data.edges.get(key).size > 1) { 
                        // Only branching conditionals need boolean labels
                        graph.setEdge(key.index+" Fo",entry.index+postfix, {label: tralse});
                    } else {
                        // Otherwise they only evaluate when true
                        graph.setEdge(key.index+" Fo",entry.index+postfix);
                    }
                    tralse = false;
                }
            } else {
                // For everything else, we need to find the last node for the key
                //  and the first node for the entry
                let prefix = "";
                // Last nodes are, in this order of appearence: Feedback, Events, or Forks
                if(graph.hasNode(key.index + " Fe")) {
                    prefix = " Fe";
                } else if(graph.hasNode(key.index + " E")) {
                    prefix = " E";
                } else if(graph.hasNode(key.index + " Fo")) {
                    prefix = " Fo";
                }
                let postfix = "";
                if(entry.type == "Passage") {
                    // If a passage would be a child, instead link to its children
                    for(let trial of data.edges.keys()) {
                        // Manually looping through because comparison would break on JS built in iterate
                        if(trial.name == entry.name) {
                            for(let link of data.edges.get(trial)) {
                                // Go through each child and get their first nodes
                                // First nodes are, in this order of appearence: Interaction Points, Events, or Forks
                                if(graph.hasNode(link.index + " IP")) {
                                    postfix = " IP";
                                } else if(graph.hasNode(link.index + " E")) {
                                    postfix = " E";
                                } else if(graph.hasNode(link.index + " Fo")) {
                                    postfix = " Fo";
                                } else if(graph.hasNode(link.index + " Fe")) {
                                    postfix = " Fe";
                                }
                                //console.log("attempting to parent",key.index+prefix,graph.hasNode(key.index+prefix),key,
                                    //"to",link.index+postfix,graph.hasNode(link.index+postfix),link);
                                if(prefix != "" && postfix != "") {
                                    // If both nodes exist, link them together
                                    graph.setEdge(key.index+prefix,link.index+postfix);
                                }
                            }
                            break;
                        }
                    }
                } else {
                    // First nodes are, in this order of appearence: Interaction Points, Events, or Forks
                    if(graph.hasNode(entry.index + " IP")) {
                        postfix = " IP";
                    } else if(graph.hasNode(entry.index + " E")) {
                        postfix = " E";
                    } else if(graph.hasNode(entry.index + " Fo")) {
                        postfix = " Fo";
                    } else if(graph.hasNode(entry.index + " Fe")) {
                        postfix = " Fe";
                    }
                    //console.log("attempting to parent",key.index+prefix,graph.hasNode(key.index+prefix),key,
                        //"to",entry.index+postfix,graph.hasNode(entry.index+postfix),entry);
                    if(prefix != "" && postfix != "") {
                        // If both nodes exist, link them together
                        graph.setEdge(key.index+prefix,entry.index+postfix);
                    }
                }
            }
        }
    });
    return graph;
}


// ----------------- THESE ARE THE FUNCTIONS FOR BUTTON PRESSES -----------------
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
                    console.log(key,"edges from this node",data.edges.get(key));
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

            //We loop through all our graph nodes
            data.nodes.forEach(node => {
                //Create the proper mapping conversion node sequence
                g = mappingConvertNode(g, node);
            });

            g = mappingCreateEdges(g, data);
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
                //This makes seeing rendered errors bearable
                console.log("error of",error);
                console.log(g);
            }

            //Set up the width,height, and coordinate system for the graph
            svg.attr('width', g.graph().width + 40);
            svg.attr('height', g.graph().height * 1.1 + 100);
            svg.attr('viewBox', `0 0 ${g.graph().width} ${g.graph().height}`);
        }
    },
	components: {
		
	}
});
