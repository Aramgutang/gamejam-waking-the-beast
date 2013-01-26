var level = 1;
var playing = true;
var progress_queue = {'happy': [], 'grumpy': []};
var cats = [];
var boxes = [];
var wheel_event = '';
var cattery, floor, looper, playarea, bars;

/*
A ferocious beast rests inside this box, growing increasingly restless. Soon
he will get agitated enough to leap out with his fangs drawn. Soothe the beast
by hovering your mouse over its box, and stroke it by rolling your scroll
wheel. When you are ready to unleash his fury on the vermin scuttering below,
click on the box to awake him from his slumber.
*/

/*** UTILITIES ***/

function random(min, max) {
	// Returns random number (not necessarily integer) between the limits
	return Math.random() * (max - min) + min;
}

function get_px(element, attribute) {
	// A helper function to return the numeric value in one of the elements
	// positioning style attributes, such as "left" or "bottom". Uses the
	// computed style, which is always in pixels.
	style = window.getComputedStyle(element);
	// Strip the "px" suffix and convert into a number
	value = style[attribute];
	// Since Chrome doesn't necessarily return pixels, deal with percentages
	// by looking at the parent's dimensions
	if(value[value.length-1] == '%') {
		position_map = {'left': 'width', 'bottom': 'height'};
		return Number(value.substring(0, value.length -1)) / 100
			* get_px(element.parentElement, position_map[attribute]);
	}
	return Number(value.substring(0, value.length - 2));
}

/*** BOXES ***/

function make_new_box() {
	// Randomise initial box position
	var y_offset = Math.floor(random(0, 3));
	var x_offset = random(10, 80);
	// Create the box and the heartbeat in the DOM
	var box_div = document.createElement('div');
	box_div.className = 'box';
	box_div.style.zIndex = 3 - y_offset;
	box_div.style.left = x_offset + '%';
	box_div.style.bottom = y_offset * 33.33 + '%';
	var heartbeat_div = document.createElement('div');
	heartbeat_div.className = 'heartbeat';
	cattery.appendChild(box_div);
	box_div.appendChild(heartbeat_div);
	// Create the box meta object for future reference
	var box = {
		'element': box_div,
		'x': x_offset,
		'y': y_offset,
		'heartbeat': 0.0,
		'heartbeat_increment': 0.07 * random(1, 10) * level,
		'heartbeat_div': heartbeat_div,
		'opacity': 4.0,
		'fading': false
	};
	boxes.push(box);
	// Assign event listeners
	box_div.onclick = function(){ launch_cat(box); };
}

function update_box(box, index, array) {
	// Fade out fading boxes
	if(box.fading) {		
		// We can't operate directly on element opacity because Chrome doesn't
		// like values outside the 0.0-1.0 range
		box.opacity -= 0.1;
		// Remove boxes that have faded away from the DOM and memory
		if(box.opacity <= 0.0) {
			boxes.splice(boxes.indexOf(box), 1);
			box.element.parentNode.removeChild(box.element);
			box = null;
		}
		else
			box.element.style.opacity = Math.min(box.opacity, 1.0);
	} else {
		box.heartbeat += 0.17;
		box.heartbeat_div.textContent = box.heartbeat.toFixed(2);
		if(box.heartbeat > 100)
			launch_cat(box);
	}
}

/*** HEARTBEATS ***/

function reduce_heartbeat(event) {
	console.log(event.target);
	boxes.forEach(function(box, index, array){
		if(box.heartbeat_div == event.target)
			box.heartbeat = Math.max(box.heartbeat - 1, 0);
	});
}

/*** CATS ***/

function launch_cat(box) {
	// Start the box removal process
	box.fading = true;
	box.element.onclick = null;
	// Create the cat in the DOM
	var cat_div = document.createElement('div');
	cat_div.className = 'cat';
	cat_div.style.left = get_px(box.element, 'left') + 37.5 + 80 + 'px';
	cat_div.style.bottom = get_px(box.element, 'bottom') 
		+ get_px(cattery, 'bottom') + 75 + 'px';
	playarea.appendChild(cat_div);
	// Create the cat meta object for future reference
	var cat = {
		'element': cat_div,
		'velocity': 40.0,
		'z_index': box.element.style.zIndex,
		'score': -1,
	};
	cats.push(cat);
}

function fly_cat(cat, index, array) {
	var old_bottom = get_px(cat.element, 'bottom');
	var old_velocity = cat.velocity;
	var position = get_px(cat.element, 'bottom');
	var floor_top = get_px(floor, 'bottom') + get_px(floor, 'height');
	var queue_bottom = get_px(document.getElementById('queue'), 'bottom');
	// Move the cat based on its current velocity and gravity
	position += cat.velocity / 3.0;
	cat.velocity -= 9.83 / 3.0;
	cat.element.style.bottom = position + 'px';
	// When the cat passes the peak of its trajectory, make sure it appears
	// on top of its box as it comes down
	if(old_velocity >= 0.0 && cat.velocity < 0)
		cat.element.style.zIndex = cat.z_index + 1;
	// When the cat has reached the floor, splay him out
	if(old_bottom > floor_top && position <= floor_top) {
		cat.element.className += " lying";
	}
	// When the cat passes the score queue, add its score to the queue and
	// start fading it out
	if(position < queue_bottom) {
		if(old_bottom >= queue_bottom)
			queue_catch(cat);
		cat.element.style.opacity = Math.max(Math.min(
				(position + 100) / (queue_bottom + 200), 1.0), 0,0);
		if(position <= -100) {
			cats.splice(cats.indexOf(cat), 1);
			cat.element.parentNode.removeChild(cat.element);
			cat = null;
		}
	}
}

/*** SCORES ***/

function update_scores(type) {
	// Unpause the progress bar growth animation for the duration dictated by
	// the queued stores. I know it's a strange way to approach the task, but
	// bear with me.
	var increment = progress_queue[type].pop();
	if(increment) {
		bars[type].style.animationPlayState = 'running';
		bars[type].style.webkitAnimationPlayState = 'running';
		window.setTimeout(
			function(){ update_scores(type); },
			// It takes level*10 points to fill up the bar. When moving, the
			// bar will always move at a speed where it would take 5 seconds
			// to fill up the whole bar.
			increment * (5100 /( level * 10)) // epsilon of 100ms
		);
	} else {
		bars[type].style.animationPlayState = 'paused';
		bars[type].style.webkitAnimationPlayState = 'paused';
	}
}

function queue_end(score_element) {
	// Queue the score that has just arrived to one of the cats, so that
	// update_scores can increment the progress bar as it pops off the scores.
	// Using a queue to avoid race conditions.
	score = Number(score_element.textContent);
	if(score < 0) {
		progress_queue['grumpy'].push(-score);
		update_scores('grumpy');
	} else {
		progress_queue['happy'].push(score);
		update_scores('happy');
	}
}

function queue_catch(cat) {
	// Start creating a div to hold the score that will be delivered to one
	// of the overseer cats
	var score_div = document.createElement('div');
	score_div.className = 'score';
	// Some variables to help with position calculations
	var play_width = get_px(playarea, 'width');
	var score_left = get_px(cat.element, 'left') + 25;
	var score_right = play_width - score_left - 15;
	var score_side, score_text;
	if(cat.score < 0) {
		// One for grumpycat, use the "left" property to move it left
		score_div.className += ' grumpy';
		score_text = cat.score;
		score_div.style.left = score_left + 'px';
		score_side = score_left / play_width * 3.0 + 's';
	} else {
		// One for happycat, use the "right" property
		score_div.className += ' happy';
		score_text = '+' + cat.score;
		score_div.style.right = score_right + 'px';
		score_side = score_right / play_width * 3.0 + 's';
	}
	// Set up score sliding animation and add it to the DOM
	score_div.style.animationDuration = score_side;
	score_div.style.webkitAnimationDuration = score_side;
	// The score will be added to the progress bar when the animation ends
	score_div.addEventListener('animationend', function(){ queue_end(score_div); });
	score_div.addEventListener('webkitAnimationEnd', function(){ queue_end(score_div); });
	// Put the score number as text inside the div
	score_div.appendChild(document.createTextNode(score_text));
	playarea.appendChild(score_div);
}

/*** LEVELS ***/

function victory() {
	console.log('Victory!');
	playing = false;
}

function game_over() {
	console.log('Game Over!');
	playing = false;
}

/*** CONTROLLERS ***/

function event_loop() {
	if(playing) {
		// The current level determines how many boxes appear at one time
		if(boxes.length < level)
			make_new_box();
		// Update heartbeats and fade out fading boxes
		boxes.forEach(update_box);
	}
	// Move any airborne cats through the air
	cats.forEach(fly_cat);
}

window.onload = function() {
	// Detect what kind of mouse wheel events the browser supports
    if (document.onmousewheel !== undefined)
        wheel_event = "mousewheel"; // Webkit + IE
    try {
        WheelEvent("wheel");
        wheel_event = "wheel"; // Firefox
    } catch (e) {}
	// Load elements against which things will be positioned into globals
	cattery = document.getElementById('cattery');
	floor = document.getElementById('floor');
	playarea = document.getElementById('playarea');
	bars = {
		'grumpy': document.getElementsByClassName('progress level grumpy')[0],
		'happy': document.getElementsByClassName('progress level happy')[0]
	};
	// Add event listeners
	bars.grumpy.addEventListener('animationend', game_over);
	bars.grumpy.addEventListener('webkitAnimationEnd', game_over);
	bars.happy.addEventListener('animationend', victory);
	bars.happy.addEventListener('webkitAnimationEnd', victory);
	document.addEventListener(wheel_event, reduce_heartbeat);
	// Enter event loop
	looper = window.setInterval(event_loop, 33);
};
