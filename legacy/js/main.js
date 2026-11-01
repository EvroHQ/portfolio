// Grained //
var grained_options = {
	'animate': true,
	'patternWidth': 400,
	'patternHeight': 400,
	'grainOpacity': 0.15,
	'grainDensity': 2.5,
	'grainWidth': 1,
	'grainHeight': 1
}
grained('#container', grained_options);

// Cursor Follower //
let mouseCursor = document.querySelector(".cursor-follower");
let navLinks = document.querySelectorAll('.list__items, .mode, button, .resume__btn, .social__links svg, .email, .arrowdown');

window.addEventListener("mousemove", cursor);

function cursor(e) {
	mouseCursor.style.top = e.pageY + "px";
	mouseCursor.style.left = e.pageX + "px";
}

navLinks.forEach(link => {
	link.addEventListener('mouseleave', () => {
		mouseCursor.classList.remove("link-grow");
	});
	link.addEventListener('mouseover', () => {
		mouseCursor.classList.add("link-grow");
	});
});

// Big Heading TEXT Background Effect //
var tl = gsap.timeline({
	repeat: -1
});
tl.to("h2", 50, {
	backgroundPosition: "1000px 0"
});

// Dark Mode Toggle //
const darkMode = document.querySelector('html');

document.querySelector('.mode-toggle').addEventListener('click', function (e) {
	const isDark = e.target.value === 'dark';
	const isLight = e.target.value === 'light';

	if (isLight || isDark) {
		trans()
		darkMode.classList.toggle('mode-light', isDark);
		darkMode.classList.toggle('mode-dark', isLight);
	} else {
		trans()
		darkMode.classList.remove('light');
		darkMode.classList.remove('dark');

	}
});

let trans = () => {
	document.documentElement.classList.add('transition');
	window.setTimeout(() => {
		document.documentElement.classList.remove('transition');
	}, 1000)
}

// Particle JS //
particlesJS("particles-js", {
	"particles": {
		"number": {
			"value": 600,
			"density": {
				"enable": true,
				"value_area": 3551.164387345227
			}
		},
		"color": {
			"value": "#aaaaaa"
		},
		"shape": {
			"type": "circle",
			"stroke": {
				"width": 0,
				"color": "#000000"
			},
			"polygon": {
				"nb_sides": 5
			},
			"image": {
				"src": "img/github.svg",
				"width": 100,
				"height": 100
			}
		},
		"opacity": {
			"value": 1,
			"random": true,
			"anim": {
				"enable": true,
				"speed": 1,
				"opacity_min": 0,
				"sync": false
			}
		},
		"size": {
			"value": 2,
			"random": true,
			"anim": {
				"enable": false,
				"speed": 4,
				"size_min": 0.3,
				"sync": false
			}
		},
		"line_linked": {
			"enable": false,
			"distance": 150,
			"color": "#ffffff",
			"opacity": 0.4,
			"width": 1
		},
		"move": {
			"enable": true,
			"speed": 1,
			"direction": "none",
			"random": true,
			"straight": false,
			"out_mode": "out",
			"bounce": false,
			"attract": {
				"enable": false,
				"rotateX": 600,
				"rotateY": 600
			}
		}
	},
	"interactivity": {
		"detect_on": "canvas",
		"events": {
			"onhover": {
				"enable": true,
				"mode": "bubble"
			},
			"onclick": {
				"enable": true,
				"mode": "repulse"
			},
			"resize": true
		},
		"modes": {
			"grab": {
				"distance": 400,
				"line_linked": {
					"opacity": 1
				}
			},
			"bubble": {
				"distance": 100,
				"size": 0,
				"duration": 1.838161838161838,
				"opacity": 0,
				"speed": 3
			},
			"repulse": {
				"distance": 200,
				"duration": 0.4
			},
			"push": {
				"particles_nb": 4
			},
			"remove": {
				"particles_nb": 2
			}
		}
	},
	"retina_detect": true
});

// Typed //
const typed = new Typed(".auto-type", {
	strings: ["Christophe Kirkoussis."],
	typeSpeed: 80,
	backSpeed: 60,
	loop: true,
	autoInsertCss: true,
	startDelay: 2500,
	backDelay: 2500,
	showCursor: true,
	cursorChar: '|'
});