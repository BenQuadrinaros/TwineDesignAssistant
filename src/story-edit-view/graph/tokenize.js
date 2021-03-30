//We'll handle nesting in the tokenization step instead. since this algorithm is
// alot closer to what we would need to solve nesting already.
//To solve for nesting we're going need a modifed version of solving
// the balanced parenthesis problem https://medium.com/@paulrohan/parenthesis-matching-problem-in-javascript-the-hacking-school-hyd-7d7708278911
// Also this problem is pretty similiar to what we need https://www.geeksforgeeks.org/find-maximum-depth-nested-parenthesis-string/

//Anything without a module.export = is consider private

//Some html tags are self closing (known as singleton tags)
//this reutrn true if it is a singleton tag (i.e <img> vs <div></div>)
//or in other words the tag does not need a closing tag
function isSingleton(html){
	var doc = document.createElement('div');
	doc.innerHTML = html;
	return doc.innerHTML === html;
}

//This is the main function we export aka tokenize().
module.exports = (story) => {
	var passages = story.passages;
	var tokens = [];
	var count = 0; //We will use this to number the tokens so the that each token has a unique index

	//Parse the script in each passage and turn them into nodes
	passages.forEach(passage => {
		var script = passage.text;
		passage.tokens = [];

		//This pattern matchs any opening and closing tags for html, links, or a macro
		//For a more detailed explanation and visualization visit
		//regexr.com/5bjtm
		var patterns = new RegExp(/\<\s*[^!/=][^\!>]*|\<\s*[/][^\!>]*|\([\w\-]*:|\)|\(|\[|\]|\>/g); 
		//Split the script into an array of opening and closing tags this helps us deal with html tags
		//where we have to read by word and not by character
		const matches = script.matchAll(patterns);
		//these are all the patterns we will look for
		const lookupTags = [
			{open:new RegExp(/\([\w\-]+:/),close:new RegExp(/\)/),type:"Macro"},
			{open:new RegExp(/\<\s*[^!/=][^\!>]*/),close:new RegExp(/\>/),type:"Html"},
			{open:new RegExp(/\[/),close:new RegExp(/\]/),type:"PassageLinkOrBody"} //Note this is a special case
		];

		var previousEnd = 0;     //The position where the previous token ends
		var end = 0;             //The position where the current token ends
		var currentPattern = []; //We will use this as a stack that holds token patterns
		var skipOne = false;     //In case we need to ignore the next symbol
		var bodyIndex = [];      //To find the parent of bodies
        
		//Loop through all substrings that match either opening or closing tags
		for (const match of matches) {
			var selfClosing = false;
			count++;

			if(skipOne) {
				skipOne = false;
			}
			//Check if the match is has something other than whitespace
			else if(match[0].replace(/[\n\r\s.]+/g, '').length>0){
				//console.log("element " + match[0]);
				//search for the tag that matchs this closing or opening
				for(const tag of lookupTags){
					//check if the snippet of text matches the current tag
					if(tag.open.test(match[0])){
						var type = tag.type;
						let par = null;
						//console.log("is a "+type);
						// This deals with the edge case [[[Link -> Target]]] and its variations
						if(type == "PassageLinkOrBody"){
							var forwardCount = 1; //Keep count of how many consecutive braces (including the current one)
							var backwardCount = 0; //Count the number of consecutive braces that come before the current one

							//This loop counts the number of consecutive braces in the forward direction
							for(var i=match.index+1;i<script.length;i++){
								if(!(script[i] == "[" || /\s/.test(script[i]))){
									break;
								}
								if(script[i] == "[") {
									forwardCount++;
								}
							}
							console.log("index: " + match.index);
							//This loop counts the number of consecutive braces going backwards
							for(var i=match.index-1;i>=0;i--){
								if(!(script[i] == "[" || /\s/.test(script[i]))){
									break;
								}
								if(script[i] == "[") {
									backwardCount++;
								}
							}

							//console.log(forwardCount + " " + backwardCount);

							//Passagelinks are the only structure with 2 openning brackets
							if(forwardCount % 2 == 0){
								type="PassageLink";
								//console.log("link!");
							} else if(backwardCount > 0) {
								//If there are any braces behind the current one we can assume
								//this brace is part of a existing passagelink or body and not
								//the start of a new structure
								//console.log("braces behind");
								break;
							} else if(forwardCount % 2 == 1) {
								//console.log("body");
								//Otherwise its a body which are always a single [
								type="Body";
								par = passage.tokens[passage.tokens.length-1].index;
								//This handles a special [[[link]]] which is always a link in a body
							}
						}
						
                        
						var patternEntry = {
							type:type,
							close:tag.close,
							start:match.index,
							end: match.index+match[0].length,
							index: count,
							parent: par
						};
						//console.log("pattern entry " + JSON.stringify(patternEntry,null,4));

						//We put our pattern onto the the stack of patterns that we're looking for
						currentPattern.push(patternEntry);
						//Handle the special case like <img> or other singleton html tags
						if(tag.type == 'Html' && isSingleton(match[0])){
							selfClosing = true;
						}else{
							break;//We found our matching opening pattern so break out of the loop
						}
					}

					//Next we check for closing tags
					//If there's a unmatched opening tag in currentpattern and the current match is its closing tag
					if( currentPattern.length > 0 && 
						(currentPattern[currentPattern.length-1].close.test(match[0]) || selfClosing ) ){
						//console.log("matched here with " + match[0]);
						end = match.index + match[0].length;
						var token;

						//We take out the most recent pattern and use it as the base of our token
						token = currentPattern.pop();
						//console.log("successful match at " + token.index);
						//If this pattern is a passagelink we want to include one extra character
						//at the end for script
						if(token.type == "PassageLink"){
							end++;
							skipOne = true;
						}

						//In order to match a a nested node to its parent we can rely on the
						//fact that currentPattern stack will never contain tokens that are
						//neigbors. (i.e [(one:)(two:)] macros one and two will never been in the stack
						//at the same time) And the currentPattern stack will always maintain the nesting order. 
						var parent = null;

						if(token.parent) {
							parent = token.parent;
						} else if(currentPattern.length>0){
							parent = currentPattern[currentPattern.length-1].index;
						}

						//In this section we handle all the special cases of content tokens
						var content = null;
						var contentParent = parent;

						//This covers the case (one:)content(two:), where content is between two macros
						//Ben: Seems to be that almost every line is being routed through this condition
						if(token.start-previousEnd>1 && currentPattern.length==0){
							content = script.substring(previousEnd,token.start);
						}else if(currentPattern.length>0){
							//This covers the case [content (two:)], where content is between two opening tags
							if(token.start - currentPattern[currentPattern.length-1].start > 0 && currentPattern[currentPattern.length-1].end>token.start){
								var contentStart = currentPattern[currentPattern.length-1].start+1;
								if(token.type == "Body"){
									contentStart++;
								}
								content = script.substring(contentStart,token.start-1);
								//This covers the case [(two:)content], where content is between two closing tags
							}else if(end-previousEnd>0 && passage.tokens.length>0 && passage.tokens[passage.tokens.length-1].parent == token.index && currentPattern[currentPattern.length-1].end>token.start){
								content = script.substring(previousEnd+1,end -1);
								contentParent = token.index;
							}
							//console.log("content falls in category 2: " + content);
						} else {
							//console.log("content falls in no category : " + content);
						}

						//If we find plain content between special tokens we want to add them as a token
						if(content != null){
							passage.tokens.push({
								script: content, 
								type: "Content",
								depth: currentPattern.length,
								index: `c${token.index}`,
								parent:contentParent
							});
						}

						//Create and add the token to the list
						passage.tokens.push({
							script: script.substring(token.start,end), //cut the string from the script 
							type: token.type,
							depth: currentPattern.length,
							index: token.index,
							parent:parent
						});
                        
                        
						previousEnd = end;
						break;
					}

				}
			}
		}

		//Cover the case where there's content at the end a passage's script
		lastToken = script.substring(end,script.length-1);
		if(end<script.length-1 && lastToken.replace(/\s/g, '').length>0){
			passage.tokens.push({
				script: lastToken, 
				type: "Content",
				depth: currentPattern.length,
				index: `c${count}`
			});
		}

		//Filter out all whitespace tokens
		passage.tokens = passage.tokens.filter(token => token.script.trim() != '');
		//Next we'll take these tokens and turn them in passages
		tokens.push({
			"id": passage.id,
			"passage":passage.name,
			"tokens": passage.tokens
		})
	})

	return tokens;
};