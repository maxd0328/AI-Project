
window.addEventListener('scroll', function() {
    let parallaxBg = document.querySelector('.background');
    let scrolled = window.pageYOffset;
    parallaxBg.style.transform = 'translate3d(0, ' + scrolled * 0.5 + 'px, 0)';
});

function smoothScroll(target) {
    document.querySelector(target).scrollIntoView({
        behavior: 'smooth'
    });
}
