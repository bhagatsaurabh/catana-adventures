let isFullscreen = false;

const fullscreenChangeListener = () => {
  isFullscreen = !!document.fullscreenElement;
  if (isFullscreen) {
    (screen.orientation as any).lock('landscape').catch((error: Error) => console.log(error));
  }
  // Resize game ?
};
const fullscreen = async () => {
  if (isFullscreen) return true;

  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch (error) {
    console.log(error);
  }
  return false;
};

fullscreenChangeListener();

export { isFullscreen, fullscreen };
