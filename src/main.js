import './style.css';
import { gsap } from 'gsap';

document.addEventListener('DOMContentLoaded', () => {
  const timeline = gsap.timeline({ defaults: { duration: 0.6, ease: 'power2.out' } });

  timeline
    .from('h1', { y: -40, opacity: 0 })
    .from('p', { y: -20, opacity: 0 }, '-=0.3')
    .from('.box', {
      scale: 0,
      opacity: 0,
      stagger: 0.15
    })
    .from(
      '#replay',
      {
        y: 20,
        opacity: 0
      },
      '-=0.2'
    );

  const replayButton = document.querySelector('#replay');
  replayButton.addEventListener('click', () => {
    timeline.restart();
  });
});
