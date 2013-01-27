var level = 1;
var playing = false;
var progress_queue = {'happy': [], 'grumpy': []};
var cats = [];
var boxes = [];
var mice = [];
var wheel_event = '';
var cattery, floor, looper, narrative, playarea, bars;

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
	var heartbeat_canvas = document.createElement('canvas');
	heartbeat_canvas.className = 'heartbeat';
	heartbeat_canvas.width = 80;
	heartbeat_canvas.height = 50;
	cattery.appendChild(box_div);
	box_div.appendChild(heartbeat_canvas);
	// Create the box meta object for future reference
	var box = {
		'element': box_div,
		'x': x_offset,
		'y': y_offset,
		'heartbeat': 0.0,
		'heartbeat_increment': 0.07 * random(1, 10) * level,
		'heartbeat_canvas': heartbeat_canvas,
		'pulse_position': -1,
		'last_beat_end': -10,
		'last_flat_length': 20,
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
		if(box.heartbeat > 100) {
			launch_cat(box);
			box.heartbeat = 0;
		}
	}
	if(box && playing)
		update_heartbeat(box);
}

/*** HEARTBEATS ***/

function draw_beat(context, position) {
	// Draws a heartbeat pulse line
	context.moveTo(position, 32);
	context.lineTo(position + 2, 36);
	context.lineTo(position + 4, 9);
	context.lineTo(position + 5, 46);
	context.lineTo(position + 8, 30);
	context.lineTo(position + 10, 32);
}

function update_heartbeat(box) {
	var position = box.pulse_position + 1;
	var context = box.heartbeat_canvas.getContext('2d');
	var flat_length = Math.floor(60.0 * ((100 - box.heartbeat) / 100.0));
	// Check if we're in the middle of a flat and the current heartrate allows
	// us to continue drawing it, or if the cat is out of the box, in which
	// case we continue drawing a flatline
	if (box.fading || position - box.last_beat_end < flat_length) {
		box.last_flat_length = flat_length;
		context.beginPath();
		context.moveTo(box.pulse_position, 32);
		context.lineTo(position, 32);
		context.stroke();
	// Check if we are in the middle of drawing a pulse
	} else if(!box.last_flat_length < (position - box.last_beat_end)) {
		var last_beat_start = box.last_beat_end + box.last_flat_length;
		// Clear what's drawn of the pulse
		context.clearRect(last_beat_start, 0, position - last_beat_start, 50);
		context.beginPath();
		context.moveTo(box.last_beat_start, 32);
		draw_beat(context, last_beat_start);
		// Check if the pulse ends at the current position
		if(last_beat_start + 10 <= position) {
			box.last_beat_end = last_beat_start + 10;
			box.last_flat_length = flat_length;
			context.lineTo(position, 32); // Just in case
		}
		context.stroke();
	// We're in the middle of a flat, and the current heartrate dictates that
	// we should start a new pulse
	} else {
		box.last_flat_length = position - box.last_beat_end;
		context.beginPath();
		draw_beat(context, position);
		context.stroke();
	}
	// Clear the next few columns of pixels to get that "rolling" effect
	context.clearRect(position + 1, 0, 10, 50);
	// If we're near the edge, warp the clearing around
	if(position + 10 >= 79)
		context.clearRect(0, 0, position - 79 + 10, 50);
	// Check if we've reached the edge
	if(position >= 79) {
		box.last_beat_end -= position + 1;
		position = -1;
	}
	box.pulse_position = position;
}

function reduce_heartbeat(event) {
	boxes.forEach(function(box, index, array){
		if(box.heartbeat_canvas == event.target)
			box.heartbeat = Math.max(box.heartbeat - 1, 0);
	});
}

/*** CATS ***/

function launch_cat(box) {
	narrative.style.display = 'none';
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
		'mice': [],
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
	var increment = cat.velocity / 3.0;
	position += increment;
	cat.mice.forEach(function(mouse){
		mouse.element.style.bottom = get_px(mouse.element, 'bottom') + increment + 'px';
	});
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
	mice.forEach(function(mouse){ if(!mouse.caught) catch_mouse(cat, mouse); });
	// When the cat passes the score queue, add its score to the queue and
	// start fading it out
	if(position < queue_bottom) {
		if(old_bottom >= queue_bottom) {
			while(cat.mice.length)
				mouse_escape(cat.mice.pop());
			queue_catch(cat);
		}
		cat.element.style.opacity = Math.max(Math.min(
				(position + 100) / (queue_bottom + 200), 1.0), 0,0);
		if(position <= -100) {
			cats.splice(cats.indexOf(cat), 1);
			cat.element.parentNode.removeChild(cat.element);
			cat = null;
		}
	}
}

function catch_mouse(cat, mouse) {
	// Determine whether the cat has interacted with the given mouse
	var mouse_width = get_px(mouse.element, 'width');
	var mouse_height = get_px(mouse.element, 'height');
	var mouse_corner_x = get_px(mouse.element, 'left') + get_px(floor, 'left')
		+ mouse_width + 80;
	var mouse_corner_y = get_px(mouse.element, 'bottom') + mouse_height + 75;
	
	var cat_width = get_px(cat.element, 'width');
	var cat_height = get_px(cat.element, 'height');
	var cat_corner_x = get_px(cat.element, 'left');
	var cat_corner_y = get_px(cat.element, 'bottom') - 10;
	
	if(cat_corner_x < mouse_corner_x 
			&& cat_corner_x + cat_width > mouse_corner_x - mouse_width
			&& cat_corner_y < mouse_corner_y
			&& cat_corner_y + cat_height * 0.75 > mouse_corner_y - mouse_height){
			// These mice are really lucky
//			&& !(
//				cat_corner_y < mouse_corner_y
//				&& cat_corner_x < mouse_corner_x - mouse_width
//			)) {
		// The mouse has been caught!
		if(mouse.waiter)
			window.clearInterval(mouse.waiter);
		mouse.element.style.animationPlayState = 'paused';
		mouse.element.style.webkitAnimationPlayState = 'paused';
		mouse.caught = true;
		cat.mice.push(mouse);
		if(cat.score == -1)
			cat.score = 1;
		else
			cat.score *= 2;
		
	} else if(cat_corner_x < mouse_corner_x
			&& cat_corner_x > mouse_corner_x - mouse_width
			&& cat_corner_y < mouse_corner_y
			&& cat_corner_y + cat_height > mouse_corner_y) {
		// The mouse had to stop to avoid the cat
		mouse.element.className = 'mouse upright';
		if(mouse.waiter)
			window.clearInterval(mouse.waiter);
		mouse.waiter = window.setInterval(function() {
			mouse.element.className = 'mouse';
			mouse.element.style.animationPlayState = 'running';
			mouse.element.style.webkitAnimationPlayState = 'running';
			mouse.waiter = null;
		}, 1000);
		mouse.element.style.animationPlayState = 'paused';
		mouse.element.style.webkitAnimationPlayState = 'paused';
	}
}

/*** MICE ***/

function mouse_continue(mouse) {
	// The mouse has finished waiting for the cat to fly by and may carry on
	// on its way
	mouse.element.className = 'mouse';
	mouse.element.style.animationPlayState = 'running';
	mouse.element.style.webkitAnimationPlayState = 'running';
}

function mouse_escape(mouse) {
	// The mouse reached the end of the floor; remove it from DOM and memory
	mice.splice(mice.indexOf(mouse), 1);
	mouse.element.parentNode.removeChild(mouse.element);
	mouse = null;
}

function spawn_mice() {
	if(mice.length < level * 3 && Math.floor(random(1,30)) == 2) {
		// Create the mouse DOM element
		var mouse_div = document.createElement('div');
		mouse_div.className = 'mouse';
		mouse_div.style.bottom = random(0.0, 75.0) + '%';
		var scurry_time = random(5.0, 10.0) + 's';
		mouse_div.style.animationDuration = scurry_time;
		mouse_div.style.webkitAnimationDuration = scurry_time;
		var mouse = {
			'element': mouse_div,
			'caught': false,
			'waiter': null
		};
		mice.push(mouse);
		mouse_div.addEventListener('animationend', function(){ mouse_escape(mouse); });
		mouse_div.addEventListener('webkitAnimationEnd', function(){ mouse_escape(mouse); });
		floor.appendChild(mouse_div);
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

function new_level() {
	bars['grumpy'].style.animationPlayState = 'paused';
	bars['grumpy'].style.animationName = 'happyprogress';
	bars['grumpy'].style.animationDuration = '5s';
	bars.grumpy.addEventListener('animationend', game_over);
	
	bars['happy'].style.animationPlayState = 'paused';
	bars['happy'].style.animationName = 'happyprogress';
	bars['happy'].style.animationDuration = '5s';
	bars.happy.addEventListener('animationend', victory);
	
	bars['grumpy'].style.webkitAanimationPlayState = 'paused';
	bars['grumpy'].style.webkitAnimationName = 'happyprogress';
	bars['grumpy'].style.webkitAnimationDuration = '5s';
	bars.grumpy.addEventListener('webkitAnimationEnd', game_over);
	
	bars['happy'].style.webkitAnimationPlayState = 'paused';
	bars['happy'].style.webkitAnimationName = 'happyprogress';
	bars['happy'].style.webkitAnimationDuration = '5s';
	bars.happy.addEventListener('webkitAnimationEnd', victory);
	
	narrative.style.display = 'none';
	playing = true;
}

function victory() {
	level += 1;
	playing = false;
	boxes.forEach(function(box){ box.fading = true; box.element.onclick = null; });
	narrative.textContent = 'Level ' + level;
	narrative.style.display = 'block';
	bars['happy'].style.animationPlayState = 'running';
	bars['happy'].style.animationName = 'happyreset';
	bars['happy'].style.animationDuration = '2s';
	bars['happy'].removeEventListener('animationend', victory);
	
	bars['grumpy'].style.animationPlayState = 'running';
	bars['grumpy'].style.animationName = 'grumpyreset';
	bars['grumpy'].style.animationDuration = '2s';
	bars['grumpy'].removeEventListener('animationend', game_over);
	bars['grumpy'].addEventListener('animationend', new_level);
	
	bars['happy'].style.webkitAnimationPlayState = 'running';
	bars['happy'].style.webkitAnimationName = 'happyreset';
	bars['happy'].style.webkitAnimationDuration = '2s';
	bars['happy'].removeEventListener('webkitAnimationend', victory);
	
	bars['grumpy'].style.webkitAnimationPlayState = 'running';
	bars['grumpy'].style.webkitAnimationName = 'grumpyreset';
	bars['grumpy'].style.webkitAnimationDuration = '2s';
	bars['grumpy'].removeEventListener('webkitAnimationend', game_over);
	bars['grumpy'].addEventListener('webkitAnimationend', new_level);
}

function game_over() {
	level = 1;
	playing = false;
	boxes.forEach(function(box){ box.fading = true; box.element.onclick = null; });
	narrative.textContent = 'Game Over';
	narrative.style.display = 'block';
}

/*** CONTROLLERS ***/

function event_loop() {
	if(playing) {
		// The current level determines how many boxes appear at one time
		if(boxes.length < level)
			make_new_box();
	}
	// Update heartbeats and fade out fading boxes
	boxes.forEach(update_box);
	// Spawn some vermin
	spawn_mice();
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
	narrative = document.getElementById('narrative');
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
	narrative.onclick = function(){ playing = true; narrative.style.display = 'none'; };
	// Enter event loop
	looper = window.setInterval(event_loop, 33);
};
