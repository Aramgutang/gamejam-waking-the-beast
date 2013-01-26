var level = 1;
var cats = [];
var boxes = [];
var cattery, looper, playarea;

function random(min, max) {
	return Math.random() * (max - min) + min;
}

function get_px(element, attribute) {
	style = window.getComputedStyle(element);
	return Number(style[attribute].substring(0, style[attribute].length - 2));
}

function make_new_box() {
	var y_offset = Math.floor(random(0, 3));
	var x_offset = random(10, 80);
	var box_div = document.createElement('div');
	var heartbeat_div = document.createElement('div');
	box_div.className = 'box';
	box_div.style.zIndex = 3 - y_offset;
	box_div.style.left = x_offset + '%';
	box_div.style.bottom = y_offset * 33.33 + '%';
	cattery.appendChild(box_div);
	box_div.appendChild(heartbeat_div);
	var box = {
		'element': box_div,
		'x': x_offset,
		'y': y_offset,
		'heartbeat': 0.0,
		'heartbeat_div': heartbeat_div,
		'fading': false,
	};
	boxes.push(box);
	box_div.onclick = function(){ launch_cat(box); };
}

function launch_cat(box) {
	var cat_div = document.createElement('div');
	cat_div.className = 'cat';
	cat_div.style.left = get_px(box.element, 'left') + 80 + 50 + 'px';
	cat_div.style.bottom = get_px(box.element, 'bottom') + get_px(cattery, 'bottom') + 75 + 'px';
	playarea.appendChild(cat_div);
	var cat = {
		'element': cat_div,
		'velocity': 40.0,
		'z_index': box.element.style.zIndex,
	};
	cats.push(cat);
	box.fading = true;
	box.element.onclick = null;
}

function fly_cat(cat, index, array) {
	var old_velocity = cat.velocity;
	var position = get_px(cat.element, 'bottom');
	position += cat.velocity / 3.0;
	cat.velocity -= 9.83 / 3.0;
	cat.element.style.bottom = position + 'px';
	if(old_velocity >= 0.0 && cat.velocity < 0)
		cat.element.style.zIndex = cat.z_index + 1;
}

function update_box(box, index, array) {
	if(box.fading) {		
		if(!box.element.style.opacity)
			box.element.style.opacity = 4.0;
		else
			box.element.style.opacity -= 0.1;
	}
	if(box.element.style.opacity < 0) {
		boxes.splice(boxes.indexOf(box), 1);
		box.element.parentNode.removeChild(box.element);
		box = null;
	}
}

function event_loop() {
	if(boxes.length < level)
		make_new_box();
	cats.forEach(fly_cat);
	boxes.forEach(update_box);
}

window.onload = function() {
	cattery = document.getElementById('cattery');
	playarea = document.getElementById('playarea');
	looper = window.setInterval(event_loop, 33);
};