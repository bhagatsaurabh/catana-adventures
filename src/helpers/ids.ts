export const loadIds = () => {
  return {
    touchControls: document.querySelector('.touch-controls') as HTMLDivElement,
    joystick: document.querySelector('.touch-controls .left .joystick') as HTMLDivElement,
    joystickUp: document.querySelector('.left .joystick .up') as HTMLImageElement,
    joystickDown: document.querySelector('.left .joystick .down') as HTMLImageElement,
    joystickLeft: document.querySelector('.right .joystick .left') as HTMLImageElement,
    joystickRight: document.querySelector('.right .joystick .right') as HTMLImageElement,
    powerAttack: document.querySelector('.right .power-attack') as HTMLDivElement,
    fastAttack: document.querySelector('.right .fast-attack') as HTMLDivElement,
    bgMedia: document.querySelector('.background-media') as HTMLDivElement,
  };
};
