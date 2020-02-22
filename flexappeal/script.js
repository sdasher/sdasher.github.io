ScrollOut({
    threshold: .5
})

var rellax = new Rellax('.rellax');

const selectEl = function(element) {
    return document.querySelector(element)
};

let menuToggler = selectEl('.menu-toggle');
let body = selectEl('body');

menuToggler.addEventListener('click', function (){
    body.classList.toggle('open');
})

window.sr = ScrollReveal();

sr.reveal('.animate-left', {
    origin: 'left',
    duration: 1000,
    distance: '25rem',
    delay: 500
});

sr.reveal('.animate-right', {
    origin: 'right',
    duration: 1000,
    distance: '25rem',
    delay: 600
});